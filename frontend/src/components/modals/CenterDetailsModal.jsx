import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StatusBadge } from "../common/DataTable";
import {
  CheckIcon,
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

/**
 * CenterDetailsModal Component
 * Displays full details of a center for admin review
 */
const CenterDetailsModal = ({
  isOpen,
  onClose,
  center,
  onApprove,
  onReject,
}) => {
  if (!center) return null;

  const isPending = center.approval_status === "pending";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Center Details
          </DialogTitle>
          <DialogDescription>
            Review complete information about this center
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold">{center.center_name}</h3>
                <p className="text-sm text-gray-600">
                  Partner: {center.partner_name}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={center.approval_status} />
              <StatusBadge status={center.status} />
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">
                Basic Information
              </h4>

              <div className="space-y-3">
                <InfoRow
                  icon={<BuildingOfficeIcon className="h-5 w-5" />}
                  label="Center Type"
                  value={center.center_type}
                />
                <InfoRow
                  icon={<UserIcon className="h-5 w-5" />}
                  label="Coordinator Name"
                  value={center.coordinator_name || "N/A"}
                />
                <InfoRow
                  icon={<PhoneIcon className="h-5 w-5" />}
                  label="Coordinator Phone"
                  value={center.coordinator_phone || "N/A"}
                />
                <InfoRow
                  icon={<EnvelopeIcon className="h-5 w-5" />}
                  label="Coordinator Email"
                  value={center.coordinator_email || "N/A"}
                />
                <InfoRow
                  icon={<CalendarIcon className="h-5 w-5" />}
                  label="Year of Establishment"
                  value={center.year_of_establishment || "N/A"}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">
                Location Details
              </h4>

              <div className="space-y-3">
                <InfoRow
                  icon={<MapPinIcon className="h-5 w-5" />}
                  label="Address"
                  value={center.address || "N/A"}
                />
                <InfoRow
                  icon={<MapPinIcon className="h-5 w-5" />}
                  label="City"
                  value={center.city}
                />
                <InfoRow
                  icon={<MapPinIcon className="h-5 w-5" />}
                  label="State"
                  value={center.state}
                />
                <InfoRow
                  icon={<MapPinIcon className="h-5 w-5" />}
                  label="Region"
                  value={center.region || "N/A"}
                />
                <InfoRow
                  icon={<MapPinIcon className="h-5 w-5" />}
                  label="Pincode"
                  value={center.pincode || "N/A"}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">
              Additional Information
            </h4>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <InfoRow
                  label="Total Batches"
                  value={center.total_batches || 0}
                />
                <InfoRow
                  label="Total Students"
                  value={center.total_students || 0}
                />
                <InfoRow
                  label="Male Students"
                  value={center.total_male_students || 0}
                />
              </div>
              <div className="space-y-3">
                <InfoRow
                  label="Female Students"
                  value={center.total_female_students || 0}
                />
                <InfoRow
                  label="Created At"
                  value={new Date(center.created_at).toLocaleString("en-GB")}
                />
                {center.updated_at && (
                  <InfoRow
                    label="Last Updated"
                    value={new Date(center.updated_at).toLocaleString("en-GB")}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Rejection Details (if rejected) */}
          {center.approval_status === "rejected" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-900 mb-2">
                Rejection Details
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Reason:</span>{" "}
                  {center.rejection_reason || "N/A"}
                </p>
                {center.rejection_remarks && (
                  <p className="text-sm text-red-800">
                    <span className="font-medium">Remarks:</span>{" "}
                    {center.rejection_remarks}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isPending && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={onReject}
                className="flex items-center gap-2"
              >
                <XMarkIcon className="h-4 w-4" />
                Reject Center
              </Button>
              <Button
                onClick={onApprove}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckIcon className="h-4 w-4" />
                Approve Center
              </Button>
            </div>
          )}

          {!isPending && (
            <div className="flex items-center justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * InfoRow Component - Display label and value
 */
const InfoRow = ({ icon, label, value }) => {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="text-gray-500 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default CenterDetailsModal;
