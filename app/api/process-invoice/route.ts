import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pdfToBase64Image } from "@/lib/pdf-to-image";
import { extractInvoiceData } from "@/lib/claude";
import { validateInvoice } from "@/lib/validation";

// Rate limit tracker (in-memory, per-process)
let lastCallTime = 0;
const MIN_DELAY_MS = 1500;

async function withRateLimit() {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
  }
  lastCallTime = Date.now();
}

async function callClaudeWithRetry(base64: string, retries = 2): Promise<ReturnType<typeof extractInvoiceData>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await withRateLimit();
      return await extractInvoiceData(base64);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 429 && attempt < retries) {
        // Wait 60s then retry
        await new Promise((r) => setTimeout(r, 60000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert PDF to image
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = await pdfToBase64Image(buffer);

    // Call Claude with retry logic
    const invoiceData = await callClaudeWithRetry(base64Image);

    // Normalize vat_rate: Claude sometimes returns 8 instead of 0.08
    if (invoiceData.vat_rate > 1) {
      invoiceData.vat_rate = invoiceData.vat_rate / 100;
    }

    // Validate
    const validation = validateInvoice(invoiceData);

    return NextResponse.json({ invoiceData, validation });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("process-invoice error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 120;
