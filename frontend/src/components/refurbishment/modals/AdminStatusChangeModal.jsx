import React, { useState, useRef } from "react";
import { Dialog, DialogTitle } from "../../ui/dialog";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";
import apiClient from "../../../api/client";

// Maps each status to which next statuses are allowed
const TRANSITIONS = {
  approved: [{ value: "material_procurement", label: "Material Procurement" }],
  material_procurement: [
    { value: "installation_in_progress", label: "Installation In Progress" },
  ],
  installation_in_progress: [], // must use Mark Completed
  refurbishment_started: [
    { value: "material_procurement", label: "Material Procurement" },
    { value: "installation_in_progress", label: "Installation In Progress" },
  ],
};

const STATUS_LABELS = {
  approved: "Approved",
  material_procurement: "Material Procurement",
  installation_in_progress: "Installation In Progress",
  refurbishment_started: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
};

const COMPLETABLE_STATUSES = [
  "approved",
  "material_procurement",
  "installation_in_progress",
  "refurbishment_started",
];

/**
 * AdminStatusChangeModal
 *
 * Two views:
 *  1. Default — radio options to advance status + "Mark Completed" button
 *  2. Completion form — statement textarea + file/image uploads
 *     Shown when admin clicks "Mark Completed"
 */
export default function AdminStatusChangeModal({
  request,
  onClose,
  onSuccess,
}) {
  // ── Status advance state ──────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Completion form state ─────────────────────────────────────────────
  const [completionMode, setCompletionMode] = useState(false);
  const [statement, setStatement] = useState("");
  const [files, setFiles] = useState([]); // { file, preview, type }
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  if (!request) return null;

  const requestId = request.id || request.request_id;
  const centerName = request.center_name || request.centerName || "";
  const options = TRANSITIONS[request.status] || [];
  const canComplete = COMPLETABLE_STATUSES.includes(request.status);

  // ── Advance status ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }
    setSaving(true);
    try {
      await refurbishmentService.updateRequestStatus(requestId, selectedStatus);
      toast.success("Status updated successfully");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  // ── File helpers ──────────────────────────────────────────────────────
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

  const uploadFile = async (item) => {
    const { data: presigned } = await apiClient.post("/upload/presigned-url", {
      fileName: item.file.name,
      fileType: item.file.type,
      folder: "refurbishment-admin-completion",
    });
    await fetch(presigned.uploadUrl, {
      method: "PUT",
      body: item.file,
      headers: { "Content-Type": item.file.type },
    });
    return { url: presigned.fileUrl, name: item.file.name, type: item.type };
  };

  // ── Submit completion ─────────────────────────────────────────────────
  const handleSubmitCompletion = async () => {
    if (!statement.trim() && files.length === 0) {
      toast.error(
        "Please add a completion statement or upload at least one file",
      );
      return;
    }
    setSubmitting(true);
    try {
      const fileUrls = [];
      for (const item of files) {
        const uploaded = await uploadFile(item);
        fileUrls.push(uploaded);
      }
      await refurbishmentService.completeRefurbishment(requestId, {
        completion_statement:
          statement.trim() || "Marked as completed by admin",
        fileUrls,
      });
      setDone(true);
    } catch (err) {
      console.error("Error completing request:", err);
      toast.error(err.response?.data?.message || "Failed to complete request");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────
  if (done) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onSuccess();
        }}
      >
        <DialogTitle className="sr-only">Completed</DialogTitle>
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
                Marked as Completed!
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                The refurbishment request has been completed and the partner has
                been notified.
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

  // ── Completion form view ──────────────────────────────────────────────
  if (completionMode) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogTitle className="sr-only">Mark as Completed</DialogTitle>
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
                  Mark as Completed
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{centerName}</p>
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
              {/* Completion statement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Statement{" "}
                  <span className="text-gray-400 font-normal">(required)</span>
                </label>
                <textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  rows={4}
                  placeholder="Describe the refurbishment work completed, key changes, and current status of the center…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Photos / Documents{" "}
                  <span className="text-gray-400 font-normal">
                    (optional, max 10)
                  </span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Click to upload images or PDFs
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG, PDF — max 10 files
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Preview grid */}
                {files.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {files.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                      >
                        {item.type === "image" ? (
                          <img
                            src={item.preview}
                            alt={item.file.name}
                            className="w-full h-24 object-cover"
                          />
                        ) : (
                          <div className="w-full h-24 flex flex-col items-center justify-center gap-1">
                            <DocumentIcon className="h-8 w-8 text-gray-400" />
                            <span className="text-[10px] text-gray-500 px-2 text-center line-clamp-2">
                              {item.file.name}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
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
                onClick={() => setCompletionMode(false)}
                disabled={submitting}
                className="px-6 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Back
              </button>
              <button
                onClick={handleSubmitCompletion}
                disabled={
                  submitting || (!statement.trim() && files.length === 0)
                }
                className="px-7 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Confirm Completion"}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }

  // ── Default status-change view ────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle className="sr-only">Update Request Status</DialogTitle>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Update Request Status
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{centerName}</p>
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
            {/* Current status */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-xs font-medium text-gray-500">
                Current status:
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {STATUS_LABELS[request.status] || request.status}
              </span>
            </div>

            {options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advance to
                </label>
                <div className="space-y-2">
                  {options.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        selectedStatus === opt.value
                          ? "border-green-400 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={selectedStatus === opt.value}
                        onChange={() => setSelectedStatus(opt.value)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-800">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {canComplete && (
              <div className="border border-emerald-200 rounded-xl px-4 py-3 bg-emerald-50">
                <p className="text-xs text-emerald-700 font-medium mb-1">
                  Ready to complete?
                </p>
                <p className="text-xs text-emerald-600">
                  Clicking "Mark Completed" will ask for a completion statement
                  and evidence uploads.
                </p>
              </div>
            )}

            {options.length === 0 && !canComplete && (
              <p className="text-sm text-gray-500 text-center py-4">
                No further status transitions available.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-7 pb-7 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            {canComplete && (
              <button
                onClick={() => setCompletionMode(true)}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                Mark Completed
              </button>
            )}
            {options.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving || !selectedStatus}
                className="px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
