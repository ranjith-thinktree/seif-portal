import React, { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import apiClient from "../../api/client";
import { toast } from "react-toastify";
import RefurbishmentResponseModal from "./RefurbishmentResponseModal";
import RefurbishmentGuideModal from "../../components/refurbishment/modals/RefurbishmentGuideModal";

/**
 * RefurbishmentDetailCard Component
 * Displays refurbishment notification details including RQ-XXXXX number,
 * partner info, center info, and admin-selected packages
 *
 * @param {Object} notification - The refurbishment notification object
 * @param {Function} onDismiss - Callback when X button is clicked
 */
const RefurbishmentDetailCard = ({ notification, onDismiss }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const fetchRefurbishmentDetails = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(
          `/notifications/${notification.id}/refurbishment-details`,
        );
        setDetails(response.data.data);
      } catch (error) {
        console.error("Error fetching refurbishment details:", error);
        toast.error("Failed to load refurbishment details");
      } finally {
        setLoading(false);
      }
    };

    fetchRefurbishmentDetails();
  }, [notification.id]);

  if (loading) {
    return (
      <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="text-center text-gray-500">
          <p>Unable to load refurbishment details</p>
        </div>
      </Card>
    );
  }

  // Format date
  const formattedDate = new Date(details.date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <Card className="p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Header with RQ number and close button */}
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Refurbishment Request ({details.request_number})
          </h2>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Request Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Partner
            </label>
            <p className="text-base text-gray-900">{details.partner_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Subject
            </label>
            <p className="text-base text-gray-900">{details.subject}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Center
            </label>
            <p className="text-base text-gray-900">{details.center_name}</p>
            <p className="text-sm text-gray-500">{details.center_location}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Date
            </label>
            <p className="text-base text-gray-900">{formattedDate}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Description
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">
              {details.description}
            </p>
          </div>
        </div>

        {/* Summary of selected packages */}
        {details.courses && details.courses.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-600 mb-3">
              Selected Packages Summary
            </label>
            <div className="space-y-2">
              {details.courses.map((course) => (
                <div
                  key={course.course_id}
                  className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                >
                  <span className="font-medium text-gray-900">
                    {course.course_name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {course.packages.length} package
                    {course.packages.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={onDismiss} className="px-6 py-2">
            Close
          </Button>

          {!details.partner_responded && (
            <Button
              onClick={() => setShowGuide(true)}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue
            </Button>
          )}

          {details.partner_responded && (
            <div className="flex items-center text-green-600">
              <svg
                className="h-5 w-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Response Submitted</span>
            </div>
          )}
        </div>
      </Card>

      {/* Guide Modal — shown before Response Modal */}
      <RefurbishmentGuideModal
        isOpen={showGuide}
        onStart={() => {
          setShowGuide(false);
          setShowResponseModal(true);
        }}
        onClose={() => setShowGuide(false)}
      />

      {/* Response Modal */}
      {showResponseModal && (
        <RefurbishmentResponseModal
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          details={details}
          notificationId={notification.id}
        />
      )}
    </>
  );
};

export default RefurbishmentDetailCard;
