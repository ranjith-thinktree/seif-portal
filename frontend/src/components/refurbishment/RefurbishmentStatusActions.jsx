import React, { useState } from "react";
import { Button } from "../../ui/button";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";
import CompletionModal from "../modals/CompletionModal";

/**
 * RefurbishmentStatusActions
 * Shows status-specific action buttons for refurbishment requests
 *
 * Props:
 * - request: object - Refurbishment request details
 * - onActionComplete: function - Callback after status update
 */
const RefurbishmentStatusActions = ({ request, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  if (!request) return null;

  const { id: requestId, status } = request;

  // Handle "Start Refurbishment" button click
  const handleStartRefurbishment = async () => {
    if (!window.confirm("Are you sure you want to start refurbishment work?")) {
      return;
    }

    setLoading(true);
    try {
      await refurbishmentService.startRefurbishment(requestId);
      toast.success("Refurbishment work started");
      onActionComplete?.();
    } catch (error) {
      console.error("Error starting refurbishment:", error);
      toast.error(
        error.response?.data?.message || "Failed to start refurbishment",
      );
    } finally {
      setLoading(false);
    }
  };

  // Render based on status
  switch (status) {
    case "submitted":
      // Handled by AdminRefurbishmentReviewModal (Approve/Reject)
      return (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
            Awaiting Review
          </span>
        </div>
      );

    case "approved":
      // Show "Start Refurbishment" button
      return (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
            Approved
          </span>
          <Button
            onClick={handleStartRefurbishment}
            disabled={loading}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Starting..." : "Start Refurbishment"}
          </Button>
        </div>
      );

    case "refurbishment_started":
      // Show "Mark as Complete" button (opens CompletionModal)
      return (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
            Work In Progress
          </span>
          <Button
            onClick={() => setCompletionModalOpen(true)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            Mark as Complete
          </Button>

          <CompletionModal
            open={completionModalOpen}
            onOpenChange={setCompletionModalOpen}
            requestId={requestId}
            request={request}
            onComplete={() => {
              toast.success("Refurbishment marked as completed");
              onActionComplete?.();
              setCompletionModalOpen(false);
            }}
          />
        </div>
      );

    case "completed":
      // Show completion info
      return (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
            ✓ Completed
          </span>
          {request.completed_at && (
            <span className="text-sm text-gray-600">
              on {new Date(request.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      );

    case "rejected":
      // Show rejected badge
      return (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
            ✗ Rejected
          </span>
          {request.rejection_reason && (
            <span className="text-sm text-gray-600 max-w-md truncate">
              Reason: {request.rejection_reason}
            </span>
          )}
        </div>
      );

    default:
      return (
        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm">
          Unknown Status
        </span>
      );
  }
};

export default RefurbishmentStatusActions;
