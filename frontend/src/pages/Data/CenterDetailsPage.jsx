import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import DataTable, { StatusBadge } from "../../components/common/DataTable";
import BatchForm from "../../components/forms/BatchForm";
import { RejectionModal } from "../../components/common";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  getCenterById,
  createBatch,
  updateBatch,
  deleteBatch,
} from "../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

const CenterDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);
  const canCreate = ["ADMIN", "SUPER_ADMIN", "PARTNER"].includes(role);

  const [center, setCenter] = useState(null);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch center details
  const fetchCenter = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getCenterById(id);
      setCenter(response.data.data);
      setBatches(response.data.data.batches || []);
    } catch (error) {
      console.error("Error fetching center:", error);
      toast.error("Failed to load center details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCenter();
  }, [fetchCenter]);

  // Handle create batch
  const handleCreateBatch = async (formData) => {
    setIsSubmitting(true);
    try {
      await createBatch(formData);
      toast.success("Batch created successfully");
      setShowBatchForm(false);
      fetchCenter();
    } catch (error) {
      console.error("Error creating batch:", error);
      toast.error(error.response?.data?.message || "Failed to create batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update batch
  const handleUpdateBatch = async (formData) => {
    setIsSubmitting(true);
    try {
      await updateBatch(editingBatch.id, formData);
      toast.success("Batch updated successfully");
      setShowBatchForm(false);
      setEditingBatch(null);
      fetchCenter();
    } catch (error) {
      console.error("Error updating batch:", error);
      toast.error(error.response?.data?.message || "Failed to update batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete batch
  const handleDeleteBatch = (batchId) => {
    const batch = center?.batches?.find((b) => b.id === batchId);
    setSelectedBatch(batch);
    setShowDeleteModal(true);
  };

  const confirmDeleteBatch = async () => {
    if (!selectedBatch) return;

    setIsDeleting(true);
    try {
      await deleteBatch(selectedBatch.id);
      toast.success("Batch deleted successfully");
      setShowDeleteModal(false);
      setSelectedBatch(null);
      fetchCenter();
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast.error(error.response?.data?.message || "Failed to delete batch");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit click
  const handleEditClick = (e, batch) => {
    e.stopPropagation();
    setEditingBatch(batch);
    setShowBatchForm(true);
  };

  // Handle row click - navigate to students with batch filter
  const handleRowClick = (batch) => {
    navigate(`/data/students?batch_id=${batch.id}`);
  };

  // Batch table columns
  const columns = [
    {
      header: "Batch Number",
      accessor: "batch_number",
      width: "20%",
    },
    {
      header: "Start Date",
      accessor: "batch_start_date",
      render: (row) =>
        row.batch_start_date
          ? new Date(row.batch_start_date).toLocaleDateString()
          : "-",
    },
    {
      header: "Complete Date",
      accessor: "batch_complete_date",
      render: (row) =>
        row.batch_complete_date
          ? new Date(row.batch_complete_date).toLocaleDateString()
          : "-",
    },
    {
      header: "Total Students",
      accessor: "total_students",
      render: (row) => (
        <Badge variant="outline">{row.total_students || 0}</Badge>
      ),
    },
    {
      header: "Male",
      accessor: "male_students",
      render: (row) => row.male_students || 0,
    },
    {
      header: "Female",
      accessor: "female_students",
      render: (row) => row.female_students || 0,
    },
    {
      header: "Enrolled",
      accessor: "enrolled_students",
      render: (row) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {row.enrolled_students || 0}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessor: "actions",
      width: "10%",
      render: (row) => (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {(isAdmin || role === "PARTNER") && (
            <button
              onClick={(e) => handleEditClick(e, row)}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBatch(row.id);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!center) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Center not found
            </h2>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {center.center_name}
              </h1>
              <p className="text-gray-600 mt-1">
                {center.partner_name} • {center.city}, {center.state}
              </p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowBatchForm(true)}
              className="px-8 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create Batch
            </button>
          )}
        </div>

        {/* Center Details Card */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Center Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Center Type</p>
              <p className="font-medium">{center.center_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Region</p>
              <p className="font-medium">{center.region}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <StatusBadge status={center.status} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approval Status</p>
              <StatusBadge status={center.approval_status} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Year Established</p>
              <p className="font-medium">
                {center.year_of_establishment || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Seating Capacity</p>
              <p className="font-medium">{center.seating_capacity || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Person</p>
              <p className="font-medium">{center.contact_person_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Mobile</p>
              <p className="font-medium">
                {center.contact_person_mobile || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact Email</p>
              <p className="font-medium">
                {center.contact_person_email || "-"}
              </p>
            </div>
            <div className="md:col-span-3">
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">
                {center.address ? `${center.address}, ` : ""}
                {center.city}, {center.state} {center.pincode}
              </p>
            </div>
          </div>
        </Card>

        {/* Batches Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Batches ({batches.length})
          </h2>
          <DataTable
            columns={columns}
            data={batches}
            onRowClick={handleRowClick}
            isLoading={false}
            emptyMessage="No batches found for this center"
            showExport={false}
          />
        </div>

        {/* Batch Form Modal */}
        {showBatchForm && (
          <BatchForm
            batch={editingBatch}
            onSubmit={editingBatch ? handleUpdateBatch : handleCreateBatch}
            onCancel={() => {
              setShowBatchForm(false);
              setEditingBatch(null);
            }}
            isLoading={isSubmitting}
            centerId={center.id}
            partnerId={center.partner_id}
          />
        )}

        {/* Delete Confirmation Modal */}
        <RejectionModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedBatch(null);
          }}
          title={`Delete Batch: ${selectedBatch?.batch_number || ""}`}
          description="Are you sure you want to delete this batch? This action cannot be undone and will affect all associated student records."
          onSubmit={confirmDeleteBatch}
          isLoading={isDeleting}
          reasonLabel="Reason for Deletion"
          remarksLabel="Additional Notes"
          reasonPlaceholder="Please provide a reason for deleting this batch..."
          remarksPlaceholder="Any additional notes..."
          minReasonLength={10}
        />
      </div>
    </MainLayout>
  );
};

export default CenterDetailsPage;
