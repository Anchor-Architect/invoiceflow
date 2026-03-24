"use client";

export type FileStatus = "pending" | "processing" | "done" | "error";

export interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

interface FileListProps {
  files: FileEntry[];
  onRemove?: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "pending") {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
    );
  }
  if (status === "processing") {
    return (
      <svg className="animate-spin w-5 h-5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  if (status === "done") {
    return (
      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
}

export default function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {files.map((entry) => (
        <div key={entry.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
          <StatusIcon status={entry.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{entry.file.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400">{formatSize(entry.file.size)}</p>
              {entry.status === "processing" && entry.progress > 0 && (
                <p className="text-xs text-blue-500">{entry.progress}%</p>
              )}
              {entry.status === "error" && entry.error && (
                <p className="text-xs text-red-500 truncate">{entry.error}</p>
              )}
            </div>
          </div>
          {entry.status === "pending" && onRemove && (
            <button
              onClick={() => onRemove(entry.id)}
              className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
