import React, { useState } from "react";
import { useAuth } from "../../../hooks";
import CentersPage from "../CentersPage";
import CenterForm from "../../../components/forms/CenterForm";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createCenter } from "../../../services/data.service";
import { toast } from "react-toastify";

/**
 * Center List Tab for Data Management
 * Reuses existing CentersPage component with multi-select partner filter
 * Partners can create centers directly from this tab
 */
const CenterListTab = () => {
  const { role, user } = useAuth();
  const isPartner = role === "PARTNER";

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handle create center
  const handleCreateCenter = async (formData) => {
    setIsSubmitting(true);
    try {
      // Auto-assign partner_id for partner users
      const dataToSubmit = {
        ...formData,
        partner_id: user.partner_id, // Auto-assign from logged-in user
        approval_status: "pending", // New centers need admin approval
      };

      await createCenter(dataToSubmit);
      toast.success("Center created successfully! Awaiting admin approval.");
      setShowForm(false);
      setRefreshTrigger((prev) => prev + 1); // Trigger refresh of centers list
    } catch (error) {
      console.error("Error creating center:", error);
      toast.error(error.response?.data?.message || "Failed to create center");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Partner Create Center Button */}
      {isPartner && !showForm && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="px-8 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Create Center
          </button>
        </div>
      )}

      {/* Center Creation Form */}
      {showForm && (
        <CenterForm
          center={null}
          onSubmit={handleCreateCenter}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
          preselectedPartnerId={user.partner_id}
        />
      )}

      {/* Centers List */}
      {!showForm && <CentersPage embedded={true} key={refreshTrigger} />}
    </div>
  );
};

export default CenterListTab;
