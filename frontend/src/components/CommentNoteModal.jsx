import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

/**
 * CommentNoteModal - Excel-like modal for adding/editing comments and notes
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {string} type - 'comment' or 'note'
 * @param {string} fieldName - Cell field name
 * @param {string} studentName - Student name for context
 * @param {object} existingData - Existing comment/note data { id, content }
 * @param {function} onSave - Save handler (content, type)
 * @param {function} onDelete - Delete handler (commentId)
 * @param {boolean} readOnly - Read-only mode for partners
 */
const CommentNoteModal = ({
  isOpen,
  onClose,
  type = "comment",
  fieldName = "",
  studentName = "",
  existingData = null,
  onSave,
  onDelete,
  readOnly = false,
}) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && existingData) {
      setContent(existingData.content || "");
    } else {
      setContent("");
    }
  }, [isOpen, existingData]);

  const handleSave = async () => {
    if (content.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(content.trim());
      setContent("");
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingData?.id) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this ${type}?`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(existingData.id);
      setContent("");
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
    if (e.key === "Enter" && e.ctrlKey && !readOnly) {
      handleSave();
    }
  };

  if (!isOpen) return null;

  const isComment = type === "comment";
  const Icon = isComment ? ChatBubbleLeftIcon : DocumentTextIcon;
  const title = isComment ? "Comment" : "Note";
  const color = isComment ? "red" : "orange";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-${color}-50`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 text-${color}-600`} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {existingData ? `Edit ${title}` : `Add ${title}`}
              </h2>
              <p className="text-sm text-gray-600">
                {studentName} - {fieldName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={readOnly}
            placeholder={
              readOnly
                ? `This ${type} is read-only`
                : `Enter your ${type} here...${
                    existingData ? "" : " (Ctrl+Enter to save)"
                  }`
            }
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            autoFocus={!readOnly}
          />

          {!readOnly && (
            <div className="mt-2 text-xs text-gray-500">
              {isComment
                ? "💡 Comments are great for collaboration and feedback"
                : "📝 Notes are perfect for quick reminders and annotations"}
            </div>
          )}

          {readOnly && (
            <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ℹ️ You have read-only access. Contact admin to modify this {type}.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            {existingData && !readOnly && (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting || isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {readOnly ? "Close" : "Cancel"}
            </button>

            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={
                  content.trim().length === 0 || isSubmitting || isDeleting
                }
                className={`px-4 py-2 text-sm font-medium text-white bg-${color}-600 rounded-lg hover:bg-${color}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? "Saving..." : existingData ? "Update" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentNoteModal;
