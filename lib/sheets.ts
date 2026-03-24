import { google } from "googleapis";
import { InvoiceData } from "./validation";

function parsePrivateKey(raw: string): string {
  // 1. Replace literal \n with actual newlines
  let key = raw.replace(/\\n/g, "\n");

  // 2. If the key doesn't have PEM headers, add them
  if (!key.includes("-----BEGIN")) {
    key = `-----BEGIN PRIVATE KEY-----\n${key.trim()}\n-----END PRIVATE KEY-----\n`;
  }

  // 3. Ensure proper line length (64 chars) inside the PEM block
  //    This handles cases where the key body has no newlines at all
  const headerMatch = key.match(/(-----BEGIN [^-]+-----)([\s\S]+?)(-----END [^-]+-----)/);
  if (headerMatch) {
    const header = headerMatch[1];
    const body = headerMatch[2].replace(/\s+/g, "");
    const footer = headerMatch[3];
    const wrapped = body.match(/.{1,64}/g)!.join("\n");
    key = `${header}\n${wrapped}\n${footer}\n`;
  }

  return key;
}

function getAuth() {
  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY || "");
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export type InvoiceType = "purchase" | "sales";

function getSheetName(type: InvoiceType): string {
  return type === "purchase" ? "Purchase" : "Sales";
}

// Normalize any date format to dd/mm/yyyy string
// Handles: dd/mm/yyyy, yyyy-mm-dd, mm/dd/yyyy, etc.
function normalizeDateToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return dateStr;

  // Already dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  // yyyy-mm-dd (ISO format)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  // Try parsing as a JS Date as last resort
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return dateStr;
}

function getQuarter(dateStr: string): number {
  // dateStr format: dd/mm/yyyy
  const parts = dateStr.split("/");
  if (parts.length < 2) return 1;
  const month = parseInt(parts[1], 10);
  return Math.ceil(month / 3);
}

export async function getLastRow(
  type: InvoiceType
): Promise<number> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetName = getSheetName(type);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A:A`,
  });

  const rows = response.data.values || [];
  return rows.length;
}

export async function checkFilenameExists(
  filename: string,
  type: InvoiceType
): Promise<{ exists: boolean; row?: number }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetName = getSheetName(type);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!C:C`,
  });

  const rows = response.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === filename) {
      return { exists: true, row: i + 1 };
    }
  }
  return { exists: false };
}

export async function appendInvoiceRow(
  data: InvoiceData,
  filename: string,
  shortDescription: string,
  typeOfServices: string,
  type: InvoiceType,
  overwriteRow?: number
): Promise<{ rowNumber: number }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetName = getSheetName(type);

  const lastRow = await getLastRow(type);
  const rowNumber = overwriteRow ?? lastRow + 1;

  const providerOrCustomer =
    type === "purchase" ? data.seller_name : data.buyer_name;
  const normalizedDate = normalizeDateToDDMMYYYY(data.issued_date);
  const quarter = getQuarter(normalizedDate);

  const rowData = [
    rowNumber - 1,             // A: No (row number, minus header)
    shortDescription,          // B: Short description
    filename,                  // C: Invoice's name
    `'${normalizedDate}`,      // D: Issued Day — leading ' forces text, prevents serial number conversion
    quarter,                   // E: Quarter
    providerOrCustomer,        // F: Provider / Customer name
    typeOfServices,            // G: Type of services/goods
    data.vat_rate,             // H: Percentage
    data.total_excl_vat,       // I: Total excluded VAT
    data.vat_amount,           // J: VAT amount
    `=I${rowNumber}+J${rowNumber}`, // K: formula
  ];

  if (overwriteRow) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A${rowNumber}:K${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowData] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:K`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [rowData] },
    });
  }

  return { rowNumber };
}
