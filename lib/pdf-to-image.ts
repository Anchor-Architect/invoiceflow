import { fromBuffer } from "pdf2pic";
import os from "os";
import fs from "fs";
import path from "path";

export async function pdfToBase64Image(pdfBuffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir();
  const saveFilename = `invoice_${Date.now()}`;

  const options = {
    density: 150,
    saveFilename,
    savePath: tmpDir,
    format: "png",
    width: 1200,
    height: 1700,
  };

  const convert = fromBuffer(pdfBuffer, options);

  // Use "buffer" responseType — more reliable than "base64"
  const result = await convert(1, { responseType: "buffer" });

  // Clean up any saved file
  const savedPath = path.join(tmpDir, `${saveFilename}.1.png`);
  try { fs.unlinkSync(savedPath); } catch { /* ignore */ }

  if (!result || !result.buffer || result.buffer.length === 0) {
    // Fallback: try reading the saved file directly
    const savedPath = path.join(tmpDir, `${saveFilename}.1.png`);
    if (fs.existsSync(savedPath)) {
      const fileBuffer = fs.readFileSync(savedPath);
      try { fs.unlinkSync(savedPath); } catch { /* ignore */ }
      if (fileBuffer.length > 0) return fileBuffer.toString("base64");
    }
    throw new Error(
      "Failed to convert PDF to image. The PDF may be corrupted, password-protected, or GraphicsMagick/Ghostscript is not installed correctly."
    );
  }

  return result.buffer.toString("base64");
}
