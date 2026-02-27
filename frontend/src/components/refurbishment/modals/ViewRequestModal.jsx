import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * ViewRequestModal - Modal for viewing request details
 * Displays request information, status, timeline, and actions
 */
const ViewRequestModal = ({
  isOpen = false,
  onClose,
  request = null,
  onApprove,
  onReject,
  formatDate,
  loading = false,
}) => {
  /**
   * Get status badge styling and display text
   */
  const statusConfig = useMemo(() => {
    if (!request)
      return { text: "Unknown", className: "bg-gray-100 text-gray-800" };

    const statusMap = {
      pending: { text: "Pending", className: "bg-yellow-100 text-yellow-800" },
      partner_submitted: {
        text: "Partner Submitted",
        className: "bg-blue-100 text-blue-800",
      },
      in_review: {
        text: "In Review",
        className: "bg-purple-100 text-purple-800",
      },
      approved: { text: "Approved", className: "bg-green-100 text-green-800" },
      rejected: { text: "Rejected", className: "bg-red-100 text-red-800" },
      completed: {
        text: "Completed",
        className: "bg-green-100 text-green-800",
      },
    };

    return (
      statusMap[request.status] || {
        text: request.status,
        className: "bg-gray-100 text-gray-800",
      }
    );
  }, [request]);

  /**
   * Format request ID as REQ-YYYY-NNN
   */
  const formatRequestId = useMemo(() => {
    if (!request || !request.created_at) return "N/A";
    const year = new Date(request.created_at).getFullYear();
    const sequence = String(request.id).slice(-3).padStart(3, "0");
    return `REQ-${year}-${sequence}`;
  }, [request]);

  /**
   * Check if actions should be shown
   */
  const canShowActions = useMemo(() => {
    if (!request) return false;
    return ["pending", "partner_submitted", "in_review"].includes(
      request.status,
    );
  }, [request]);

  if (!request) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-gray-500">
            No request data available
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{formatRequestId}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {request.refurbishment_type ||
                      request.type ||
                      "Standard Request"}
                  </p>
                </div>
                <Badge className={statusConfig.className}>
                  {statusConfig.text}
                </Badge>
              </div>

              <Separator className="my-4" />

              {/* Request Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Center Name
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {request.center_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Partner</p>
                  <p className="text-sm font-semibold mt-1">
                    {request.partner_name || request.organization_name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Created Date
                  </p>
                  <p className="text-sm mt-1">
                    {formatDate
                      ? formatDate(request.created_at)
                      : new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Last Updated
                  </p>
                  <p className="text-sm mt-1">
                    {formatDate
                      ? formatDate(request.updated_at || request.created_at)
                      : new Date(
                          request.updated_at || request.created_at,
                        ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reason & Description */}
          {(request.reason || request.description) && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                {request.reason && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Reason
                    </p>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                )}
                {request.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-700">
                      {request.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Information (if reviewed) */}
          {(request.reviewed_by || request.reviewed_at) && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h4 className="font-semibold text-sm">Review Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  {request.reviewed_by && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Reviewed By
                      </p>
                      <p className="text-sm mt-1">{request.reviewed_by}</p>
                    </div>
                  )}
                  {request.reviewed_at && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Reviewed Date
                      </p>
                      <p className="text-sm mt-1">
                        {formatDate
                          ? formatDate(request.reviewed_at)
                          : new Date(request.reviewed_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {request.remarks && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Admin Remarks
                    </p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {request.remarks}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rejection Information (if rejected) */}
          {request.status === "rejected" && request.rejection_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <h4 className="font-semibold text-sm text-red-800 mb-2">
                  Rejection Reason
                </h4>
                <p className="text-sm text-red-700">
                  {request.rejection_reason}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timeline / History */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-sm mb-3">Timeline</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Request Created</p>
                    <p className="text-xs text-gray-600">
                      {formatDate
                        ? formatDate(request.created_at)
                        : new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {request.reviewed_at && (
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        request.status === "approved"
                          ? "bg-green-500"
                          : request.status === "rejected"
                            ? "bg-red-500"
                            : "bg-gray-400"
                      }`}
                    ></div>
                    <div>
                      <p className="text-sm font-medium">
                        {request.status === "approved"
                          ? "Approved"
                          : request.status === "rejected"
                            ? "Rejected"
                            : "Reviewed"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate
                          ? formatDate(request.reviewed_at)
                          : new Date(request.reviewed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {request.completed_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-gray-600">
                        {formatDate
                          ? formatDate(request.completed_at)
                          : new Date(request.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          {canShowActions && (
            <>
              {onReject && (
                <Button
                  variant="outline"
                  onClick={() => onReject(request)}
                  disabled={loading}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reject
                </Button>
              )}
              {onApprove && (
                <Button
                  onClick={() => onApprove(request)}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Processing..." : "Approve"}
                </Button>
              )}
            </>
          )}
          <Button
            variant={canShowActions ? "secondary" : "default"}
            onClick={onClose}
            disabled={loading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRequestModal;
