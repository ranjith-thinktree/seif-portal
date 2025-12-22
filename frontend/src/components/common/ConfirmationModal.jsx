import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

/**
 * Confirmation Modal Component for Bulk Delete
 * Shows warning, preview of items to delete, and delete results
 */
const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  message,
  itemCount = 0,
  items = [],
  loading = false,
  results = null, // { success: [], failed: [], summary: {} }
  itemType = "items", // "partners", "centers", "batches", "students", "uploads"
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading && onClose) {
      onClose();
    }
  };

  // Render results if available
  if (results) {
    const hasErrors = results.summary.failed > 0;
    const hasSuccess = results.summary.successful > 0;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {hasSuccess && !hasErrors && (
                <>
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <span>Deletion Complete</span>
                </>
              )}
              {hasErrors && !hasSuccess && (
                <>
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                  <span>Deletion Failed</span>
                </>
              )}
              {hasSuccess && hasErrors && (
                <>
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                  <span>Partial Success</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.summary.total}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.summary.successful}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results.summary.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            {/* Successful Deletions */}
            {results.success.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  Successfully Deleted ({results.success.length})
                </h4>
                <div className="bg-green-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <ul className="space-y-1 text-sm">
                    {results.success.map((item, index) => (
                      <li key={index} className="text-gray-700">
                        • {item.readable_id || item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Failed Deletions */}
            {results.failed.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5" />
                  Failed to Delete ({results.failed.length})
                </h4>
                <div className="bg-red-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-3 text-sm">
                    {results.failed.map((item, index) => (
                      <li key={index} className="text-gray-700">
                        <div className="font-medium">
                          {item.readable_id || item.name}
                        </div>
                        <div className="text-red-600 text-xs mt-1">
                          Reason: {item.reason}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render confirmation screen
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-4">
            {message ||
              `Are you sure you want to delete ${itemCount} ${itemType}?`}
          </DialogDescription>
        </DialogHeader>

        {/* Warning Alert */}
        <Alert variant="destructive" className="my-4">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            This action cannot be undone. Items will be permanently deleted.
          </AlertDescription>
        </Alert>

        {/* Items Preview */}
        {items.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-gray-700">
              Items to be deleted:
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <ul className="space-y-1 text-sm">
                {items.map((item, index) => (
                  <li key={index} className="text-gray-700">
                    • {item.name || item.readable_id || item.id}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span>
                  Delete {itemCount} {itemType}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
