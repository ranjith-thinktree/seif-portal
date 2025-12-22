import React from "react";
import { Button } from "../ui/button";
import { TrashIcon } from "@heroicons/react/24/outline";

/**
 * Bulk Delete Button Component
 * Displays a button that shows the count of selected items
 * and triggers bulk delete confirmation
 */
const BulkDeleteButton = ({
  selectedCount = 0,
  onDelete,
  disabled = false,
  loading = false,
  className = "",
}) => {
  if (selectedCount === 0) {
    return null; // Don't show button if nothing is selected
  }

  return (
    <Button
      variant="destructive"
      onClick={onDelete}
      disabled={disabled || loading}
      className={`flex items-center gap-2 ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Deleting...</span>
        </>
      ) : (
        <>
          <TrashIcon className="h-4 w-4" />
          <span>Delete Selected ({selectedCount})</span>
        </>
      )}
    </Button>
  );
};

export default BulkDeleteButton;
