import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  appendInvoiceRow,
  checkFilenameExists,
  InvoiceType,
} from "@/lib/sheets";
import { InvoiceData } from "@/lib/validation";

interface WriteRequest {
  invoiceData: InvoiceData;
  filename: string;
  shortDescription: string;
  typeOfServices: string;
  invoiceType: InvoiceType;
  forceOverwrite?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: WriteRequest = await req.json();
    const {
      invoiceData,
      filename,
      shortDescription,
      typeOfServices,
      invoiceType,
      forceOverwrite = false,
    } = body;

    // Check for duplicate filename
    const { exists, row } = await checkFilenameExists(filename, invoiceType);

    if (exists && !forceOverwrite) {
      return NextResponse.json(
        {
          duplicate: true,
          existingRow: row,
          message: `"${filename}" already exists in the sheet at row ${row}.`,
        },
        { status: 409 }
      );
    }

    const { rowNumber } = await appendInvoiceRow(
      invoiceData,
      filename,
      shortDescription,
      typeOfServices,
      invoiceType,
      exists && forceOverwrite ? row : undefined
    );

    return NextResponse.json({ success: true, rowNumber });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Write failed";
    console.error("write-to-sheet error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
