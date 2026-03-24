export interface InvoiceData {
  invoice_serial: string;
  invoice_number: string;
  issued_date: string;
  seller_name: string;
  buyer_name: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  total_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_incl_vat: number;
  short_description_suggestion: string;
  type_suggestion: string;
  confidence: number;
}

export interface ValidationResult {
  passed: boolean;
  badge: "pass" | "warning" | "fail";
  checks: {
    v1: { passed: boolean; message: string; difference?: number };
    v2: { passed: boolean; message: string; difference?: number };
    v3: { passed: boolean; message: string };
  };
}

export function validateInvoice(data: InvoiceData): ValidationResult {
  const v1Diff = Math.abs(data.total_excl_vat * data.vat_rate - data.vat_amount);
  const v1Passed = v1Diff <= 1;

  const v2Diff = Math.abs(data.total_excl_vat + data.vat_amount - data.total_incl_vat);
  const v2Passed = v2Diff <= 1;

  const v3Passed = data.confidence >= 0.7;

  const allPassed = v1Passed && v2Passed && v3Passed;

  return {
    passed: allPassed,
    badge: allPassed ? "pass" : "fail",
    checks: {
      v1: {
        passed: v1Passed,
        message: "VAT calculation (excl_vat × rate = vat_amount)",
        difference: v1Passed ? undefined : Math.round(v1Diff),
      },
      v2: {
        passed: v2Passed,
        message: "Total check (excl_vat + vat_amount = total_incl_vat)",
        difference: v2Passed ? undefined : Math.round(v2Diff),
      },
      v3: {
        passed: v3Passed,
        message: `Confidence score (${(data.confidence * 100).toFixed(0)}% ≥ 70%)`,
      },
    },
  };
}
