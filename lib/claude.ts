import Anthropic from "@anthropic-ai/sdk";
import { InvoiceData } from "./validation";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert at reading Vietnamese VAT invoices (Hóa đơn GTGT). Extract the following fields and return ONLY a valid JSON object with no additional text:
{
  "invoice_serial": "string",
  "invoice_number": "string",
  "issued_date": "string (dd/mm/yyyy)",
  "seller_name": "string",
  "buyer_name": "string",
  "items": [{ "description": "string", "quantity": 0, "unit_price": 0, "amount": 0 }],
  "total_excl_vat": 0,
  "vat_rate": 0,
  "vat_amount": 0,
  "total_incl_vat": 0,
  "short_description_suggestion": "string (concise English summary of main item)",
  "type_suggestion": "string (one of: Samson goods/services, Grab, Youtube, Promotional video, Popup store, Other)",
  "confidence": 0
}`;

export async function extractInvoiceData(
  pdfBase64: string
): Promise<InvoiceData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    },
    {
      type: "text",
      text: "Extract all invoice data from this Vietnamese VAT invoice and return the JSON object only.",
    },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonText = textContent.text.trim();
  const cleaned = jsonText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  const data = JSON.parse(cleaned) as InvoiceData;
  return data;
}
