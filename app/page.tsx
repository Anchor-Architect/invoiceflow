"use client";

import { useState, useRef, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import FileUploadZone from "@/components/FileUploadZone";
import FileList, { FileEntry, FileStatus } from "@/components/FileList";
import ProgressBar from "@/components/ProgressBar";
import ReviewCard, { ReviewCardData } from "@/components/ReviewCard";
import SheetsLog, { LogEntry } from "@/components/SheetsLog";
import SessionSummary from "@/components/SessionSummary";

type InvoiceType = "purchase" | "sales";

interface ConfirmState {
  [fileId: string]: { confirming: boolean; confirmed: boolean };
}

let idCounter = 0;
function uid() {
  return `f${++idCounter}_${Date.now()}`;
}

export default function MainPage() {
  const { data: session } = useSession();

  // Upload panel state
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("purchase");
  const [processing, setProcessing] = useState(false);
  const cancelRef = useRef(false);

  // Results state
  const [reviewCards, setReviewCards] = useState<ReviewCardData[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({});
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [sessionDone, setSessionDone] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Duplicate modal state
  const [dupModal, setDupModal] = useState<{
    fileId: string;
    filename: string;
    existingRow: number;
    shortDescription: string;
    typeOfServices: string;
    invoiceType: InvoiceType;
    resolve: (overwrite: boolean) => void;
  } | null>(null);

  const addLog = useCallback((entry: Omit<LogEntry, "id" | "timestamp">) => {
    setLogEntries((prev) => [
      ...prev,
      { ...entry, id: uid(), timestamp: new Date() },
    ]);
  }, []);

  function handleFilesAdded(newFiles: File[]) {
    const remaining = 20 - files.length;
    const toAdd = newFiles.slice(0, remaining);
    setFiles((prev) => [
      ...prev,
      ...toAdd.map((f) => ({
        id: uid(),
        file: f,
        status: "pending" as FileStatus,
        progress: 0,
      })),
    ]);
  }

  function handleRemoveFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function startFakeProgress(id: string, from: number, to: number, durationMs: number) {
    const steps = 20;
    const interval = durationMs / steps;
    const increment = (to - from) / steps;
    let current = from;
    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        clearInterval(timer);
        return;
      }
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: Math.round(current) } : f))
      );
    }, interval);
    return timer;
  }

  async function processFile(entry: FileEntry): Promise<boolean> {
    if (cancelRef.current) return false;

    setFiles((prev) =>
      prev.map((f) => (f.id === entry.id ? { ...f, status: "processing" as FileStatus, progress: 0 } : f))
    );

    await new Promise((r) => setTimeout(r, 300));
    setFiles((prev) =>
      prev.map((f) => (f.id === entry.id ? { ...f, progress: 10 } : f))
    );

    const fakeTimer = startFakeProgress(entry.id, 10, 68, 8000);

    let invoiceData, validation;
    try {
      const formData = new FormData();
      formData.append("file", entry.file);

      const res = await fetch("/api/process-invoice", {
        method: "POST",
        body: formData,
      });

      clearInterval(fakeTimer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Processing failed");
      }

      const data = await res.json();
      invoiceData = data.invoiceData;
      validation = data.validation;
    } catch (err) {
      clearInterval(fakeTimer);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "error" as FileStatus, progress: 0, error: msg } : f
        )
      );
      addLog({ type: "error", message: `Failed: ${entry.file.name} — ${msg}` });
      setErrorCount((c) => c + 1);
      return false;
    }

    setFiles((prev) =>
      prev.map((f) => (f.id === entry.id ? { ...f, progress: 85 } : f))
    );

    setReviewCards((prev) => [
      ...prev,
      {
        fileId: entry.id,
        filename: entry.file.name,
        invoiceData,
        validation,
        invoiceType,
      },
    ]);
    setConfirmState((prev) => ({
      ...prev,
      [entry.id]: { confirming: false, confirmed: false },
    }));

    return true;
  }

  async function handleStartProcessing() {
    cancelRef.current = false;
    setProcessing(true);
    setSessionDone(false);
    setSuccessCount(0);
    setErrorCount(0);
    setSkippedCount(0);
    setReviewCards([]);
    setLogEntries([]);
    setConfirmState({});

    const pending = files.filter((f) => f.status === "pending");
    for (const entry of pending) {
      if (cancelRef.current) break;
      await processFile(entry);
      if (!cancelRef.current) await new Promise((r) => setTimeout(r, 1500));
    }

    setProcessing(false);
    setSessionDone(true);
  }

  function handleCancel() {
    cancelRef.current = true;
  }

  async function handleConfirm(
    fileId: string,
    shortDescription: string,
    typeOfServices: string
  ) {
    setConfirmState((prev) => ({
      ...prev,
      [fileId]: { confirming: true, confirmed: false },
    }));

    const card = reviewCards.find((c) => c.fileId === fileId);
    if (!card) return;

    const filename = card.filename;

    async function doWrite(overwrite: boolean): Promise<void> {
      const res = await fetch("/api/write-to-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceData: card!.invoiceData,
          filename,
          shortDescription,
          typeOfServices,
          invoiceType: card!.invoiceType,
          forceOverwrite: overwrite,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        const overwriteChosen = await new Promise<boolean>((resolve) => {
          setDupModal({
            fileId,
            filename,
            existingRow: data.existingRow,
            shortDescription,
            typeOfServices,
            invoiceType: card!.invoiceType,
            resolve,
          });
        });
        setDupModal(null);
        if (!overwriteChosen) {
          addLog({ type: "skip", message: `Skipped: ${filename} — already exists at row ${data.existingRow}` });
          setSkippedCount((c) => c + 1);
          setConfirmState((prev) => ({
            ...prev,
            [fileId]: { confirming: false, confirmed: true },
          }));
          return;
        }
        await doWrite(true);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        const msg = err.error || "Write failed";
        addLog({ type: "error", message: `Error: ${filename} — ${msg}` });
        setErrorCount((c) => c + 1);
        setConfirmState((prev) => ({
          ...prev,
          [fileId]: { confirming: false, confirmed: false },
        }));
        return;
      }

      const data = await res.json();
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "done" as FileStatus, progress: 100 } : f
        )
      );
      addLog({
        type: "success",
        message: `Row ${data.rowNumber} added — ${filename}`,
      });
      setSuccessCount((c) => c + 1);
      setConfirmState((prev) => ({
        ...prev,
        [fileId]: { confirming: false, confirmed: true },
      }));
    }

    try {
      await doWrite(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addLog({ type: "error", message: `Error: ${filename} — ${msg}` });
      setErrorCount((c) => c + 1);
      setConfirmState((prev) => ({
        ...prev,
        [fileId]: { confirming: false, confirmed: false },
      }));
    }
  }

  const completedCount = files.filter((f) => f.status === "done" || f.status === "error").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const hasFiles = files.length > 0;
  const showResults = reviewCards.length > 0 || logEntries.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">InvoiceFlow</h1>
              <p className="text-xs text-gray-400 -mt-0.5">Samson Production</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT PANEL */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Upload Invoices</h2>

              <FileUploadZone onFilesAdded={handleFilesAdded} disabled={processing} />

              {/* Invoice type toggle */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Invoice Type</p>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
                  {(["purchase", "sales"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => !processing && setInvoiceType(t)}
                      disabled={processing}
                      className={`px-5 py-2 text-sm font-medium transition capitalize ${
                        invoiceType === t
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50"
                      } ${processing ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <FileList files={files} onRemove={processing ? undefined : handleRemoveFile} />

              {processing && (
                <ProgressBar
                  completed={completedCount}
                  total={files.length}
                />
              )}

              {hasFiles && (
                <div className="flex gap-2 pt-1">
                  {!processing ? (
                    <button
                      onClick={handleStartProcessing}
                      disabled={pendingCount === 0}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg text-sm transition"
                    >
                      Start Processing ({pendingCount} file{pendingCount !== 1 ? "s" : ""})
                    </button>
                  ) : (
                    <button
                      onClick={handleCancel}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium py-2.5 rounded-lg text-sm transition"
                    >
                      Cancel
                    </button>
                  )}
                  {!processing && (
                    <button
                      onClick={() => setFiles([])}
                      className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="space-y-4">
            {!showResults && !sessionDone && (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Results will appear here as files are processed</p>
              </div>
            )}

            {reviewCards.map((card) => (
              <ReviewCard
                key={card.fileId}
                data={card}
                onConfirm={handleConfirm}
                confirming={confirmState[card.fileId]?.confirming}
                confirmed={confirmState[card.fileId]?.confirmed}
              />
            ))}

            {logEntries.length > 0 && <SheetsLog entries={logEntries} />}

            {sessionDone && (
              <SessionSummary
                success={successCount}
                error={errorCount}
                skipped={skippedCount}
                logEntries={logEntries}
              />
            )}
          </div>
        </div>
      </main>

      {/* Duplicate modal */}
      {dupModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Duplicate File</h3>
                <p className="text-xs text-gray-500">Already in sheet</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              <span className="font-medium">{dupModal.filename}</span> already exists at row {dupModal.existingRow}. What would you like to do?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => dupModal.resolve(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
              >
                Skip
              </button>
              <button
                onClick={() => dupModal.resolve(true)}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm text-white font-medium transition"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
