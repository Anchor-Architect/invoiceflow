"use client";

import { LogEntry } from "./SheetsLog";

interface SessionSummaryProps {
  success: number;
  error: number;
  skipped: number;
  logEntries: LogEntry[];
}

export default function SessionSummary({ success, error, skipped, logEntries }: SessionSummaryProps) {
  function exportCSV() {
    const rows = [
      ["Type", "Message", "Time"],
      ...logEntries.map((e) => [
        e.type,
        e.message,
        e.timestamp.toLocaleString("en-GB"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoiceflow-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Session Summary</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{success}</p>
            <p className="text-xs text-green-700 mt-0.5 font-medium">Success</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{error}</p>
            <p className="text-xs text-red-700 mt-0.5 font-medium">Error</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{skipped}</p>
            <p className="text-xs text-amber-700 mt-0.5 font-medium">Skipped</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export log as CSV
        </button>
      </div>
    </div>
  );
}
