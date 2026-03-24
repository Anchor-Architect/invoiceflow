"use client";

import { useState } from "react";
import { InvoiceData, ValidationResult } from "@/lib/validation";

const TYPE_OPTIONS = [
  "Samson goods/services",
  "Grab",
  "Youtube",
  "Promotional video",
  "Popup store",
  "Other",
];

export interface ReviewCardData {
  fileId: string;
  filename: string;
  invoiceData: InvoiceData;
  validation: ValidationResult;
  invoiceType: "purchase" | "sales";
}

interface ReviewCardProps {
  data: ReviewCardData;
  onConfirm: (
    fileId: string,
    shortDescription: string,
    typeOfServices: string
  ) => void;
  confirming?: boolean;
  confirmed?: boolean;
}

function ValidationBadge({ result }: { result: ValidationResult }) {
  if (result.badge === "pass") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Pass
      </span>
    );
  }
  if (result.badge === "warning") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      Fail
    </span>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

export default function ReviewCard({ data, onConfirm, confirming, confirmed }: ReviewCardProps) {
  const aiSuggestion = TYPE_OPTIONS.includes(data.invoiceData.type_suggestion)
    ? data.invoiceData.type_suggestion
    : "Other";

  const [shortDesc, setShortDesc] = useState(data.invoiceData.short_description_suggestion || "");
  const [typeOfServices, setTypeOfServices] = useState(aiSuggestion);

  const { invoiceData: inv, validation } = data;
  const canConfirm = validation.passed;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition ${confirmed ? "border-green-300" : "border-gray-200"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700 truncate">{data.filename}</span>
        </div>
        <ValidationBadge result={validation} />
      </div>

      <div className="p-4 space-y-4">
        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Serial</span>
            <p className="text-gray-800 font-medium">{inv.invoice_serial}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Number</span>
            <p className="text-gray-800 font-medium">{inv.invoice_number}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Date</span>
            <p className="text-gray-800">{inv.issued_date}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              {data.invoiceType === "purchase" ? "Seller" : "Buyer"}
            </span>
            <p className="text-gray-800 truncate" title={data.invoiceType === "purchase" ? inv.seller_name : inv.buyer_name}>
              {data.invoiceType === "purchase" ? inv.seller_name : inv.buyer_name}
            </p>
          </div>
        </div>

        {/* Financials table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs text-gray-500 font-medium px-2 py-1.5 rounded-tl border border-gray-200">Field</th>
              <th className="text-right text-xs text-gray-500 font-medium px-2 py-1.5 rounded-tr border border-gray-200">Amount (VND)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1.5 border border-gray-200 text-gray-600">Total excl. VAT</td>
              <td className="px-2 py-1.5 border border-gray-200 text-right font-mono">{fmt(inv.total_excl_vat)}</td>
            </tr>
            <tr>
              <td className="px-2 py-1.5 border border-gray-200 text-gray-600">VAT ({(inv.vat_rate * 100).toFixed(0)}%)</td>
              <td className="px-2 py-1.5 border border-gray-200 text-right font-mono">{fmt(inv.vat_amount)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-2 py-1.5 border border-gray-200 font-semibold text-gray-800">Total incl. VAT</td>
              <td className="px-2 py-1.5 border border-gray-200 text-right font-mono font-semibold text-gray-800">{fmt(inv.total_incl_vat)}</td>
            </tr>
          </tbody>
        </table>

        {/* Validation failures */}
        {!validation.passed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Validation Issues</p>
            {Object.values(validation.checks).map((check, i) =>
              !check.passed ? (
                <div key={i} className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-700">
                    {check.message}
                    {"difference" in check && check.difference !== undefined && (
                      <span className="font-medium"> — diff: {fmt(check.difference)} VND</span>
                    )}
                  </p>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              disabled={confirmed}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">
                Type of Services/Goods
              </label>
              {/* Show Claude's suggestion if user has changed the value */}
              {aiSuggestion && typeOfServices !== aiSuggestion && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.6 3.6 0 01-1.037 2.4H8.654a3.6 3.6 0 01-1.037-2.4l-.347-.347z" />
                  </svg>
                  AI: {aiSuggestion}
                </span>
              )}
              {/* Show "AI matched" when current selection matches suggestion */}
              {aiSuggestion && typeOfServices === aiSuggestion && !confirmed && (
                <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.6 3.6 0 01-1.037 2.4H8.654a3.6 3.6 0 01-1.037-2.4l-.347-.347z" />
                  </svg>
                  AI suggested
                </span>
              )}
            </div>
            <select
              value={typeOfServices}
              onChange={(e) => setTypeOfServices(e.target.value)}
              disabled={confirmed}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 bg-white"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {/* Quick-apply button when suggestion differs from selection */}
            {aiSuggestion && typeOfServices !== aiSuggestion && !confirmed && (
              <button
                type="button"
                onClick={() => setTypeOfServices(aiSuggestion)}
                className="mt-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline transition"
              >
                → Apply AI suggestion: <span className="font-medium">{aiSuggestion}</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(data.fileId, shortDesc, typeOfServices)}
          disabled={!canConfirm || confirming || confirmed}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
            confirmed
              ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
              : canConfirm
              ? "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {confirmed ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Written to Sheet
            </span>
          ) : confirming ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Writing...
            </span>
          ) : !canConfirm ? (
            "Cannot write — validation failed"
          ) : (
            "Confirm & Write to Sheet"
          )}
        </button>
      </div>
    </div>
  );
}
