import React, { useState, useRef } from "react";
import { Dialog } from "../../ui/dialog";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";
import apiClient from "../../../api/client";

/**
 * PartnerCompletionModal
 * Allows partners to submit completion evidence (description + images + PDFs)
 * after receiving the 2-month refurbishment completion notification.
 */
export default function PartnerCompletionModal({
  request,
  onClose,
  onSuccess,
}) {
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]); // { file: File, preview?: string, type: 'image' | 'document' }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  if (!request) return null;

  // ── File handling ───────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    const newFiles = [];
    for (const file of selected) {
      if (files.length + newFiles.length >= 10) {
        toast.error("Maximum 10 files allowed");
        break;
      }
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast.error(`${file.name}: only images and PDFs allowed`);
        continue;
      }
      newFiles.push({
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
        type: isImage ? "image" : "document",
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  // ── Upload to S3 via presigned URL ──────────────────────────────────────
  const uploadFile = async (item) => {
    // Request a presigned upload URL from backend
    const { data: presigned } = await apiClient.post("/upload/presigned-url", {
      fileName: item.file.name,
      fileType: item.file.type,
      folder: "refurbishment-completion",
    });
    // Upload directly to S3
    await fetch(presigned.uploadUrl, {
      method: "PUT",
      body: item.file,
      headers: { "Content-Type": item.file.type },
    });
    return { url: presigned.fileUrl, name: item.file.name, type: item.type };
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!description.trim() && files.length === 0) {
      toast.error("Please add a description or upload at least one file");
      return;
    }
    setSubmitting(true);
    try {
      // Upload all files to S3
      const fileUrls = [];
      for (const item of files) {
        const uploaded = await uploadFile(item);
        fileUrls.push(uploaded);
      }

      await refurbishmentService.submitPartnerCompletion(request.request_id, {
        description: description.trim(),
        fileUrls,
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting completion:", err);
      toast.error(
        err.response?.data?.message || "Failed to submit completion report",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onSuccess();
        }}
      >
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onSuccess} />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-10 flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Report Submitted!
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Your completion report has been received.
                <br />
                The admin will review and update the status.
              </p>
            </div>
            <button
              onClick={onSuccess}
              className="mt-2 w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Submit Completion Report
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {request.center_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-7 py-6 space-y-5">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description{" "}
                <span className="text-gray-400 font-normal">(required)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the completed refurbishment work…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-200 resize-none placeholder-gray-400"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos & Documents{" "}
                <span className="text-gray-400 font-normal">
                  (max 10 files)
                </span>
              </label>

              {/* Drop zone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-7 flex flex-col items-center gap-2 text-gray-400 hover:border-green-300 hover:bg-green-50/30 transition-all"
              >
                <ArrowUpTrayIcon className="h-7 w-7" />
                <span className="text-sm font-medium">
                  Click to upload images or PDFs
                </span>
                <span className="text-xs">JPG, PNG, PDF · max 10MB each</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Preview grid */}
              {files.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {files.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-gray-100 bg-gray-50"
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square flex flex-col items-center justify-center gap-1 px-2">
                          <DocumentIcon className="h-7 w-7 text-red-400" />
                          <span className="text-xs text-gray-500 text-center truncate w-full">
                            {item.file.name}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-3.5 w-3.5 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 pb-7 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
