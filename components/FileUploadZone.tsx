"use client";

import { useRef, useState } from "react";

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileUploadZone({ onFilesAdded, disabled }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const pdfs = Array.from(files).filter((f) => f.type === "application/pdf");
    if (pdfs.length > 0) onFilesAdded(pdfs);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
        ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40"}
        ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Drag & drop PDF files here
          </p>
          <p className="text-xs text-gray-500 mt-1">or click to browse · max 20 files per batch</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          disabled={disabled}
          className="mt-1 px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
        >
          Select files
        </button>
      </div>
    </div>
  );
}
