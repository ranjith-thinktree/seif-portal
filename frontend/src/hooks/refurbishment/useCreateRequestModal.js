import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import refurbishmentService from "../../services/refurbishment.service";

export default function useCreateRequestModal({
  setActiveTab,
  refurbishmentRefresh,
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    partnerId: "",
    centerId: "",
    reason: "",
    description: "",
    packages: [],
  });

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!createFormData.partnerId || !createFormData.centerId) {
      toast.error("Please select partner and center");
      return;
    }
    if (!createFormData.reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    if (createFormData.packages.length === 0) {
      toast.error("Please select at least one package");
      return;
    }

    try {
      const transformedData = {
        ...createFormData,
        packages: createFormData.packages.map((packageId) => ({
          packageId,
          quantity: 1,
          notes: null,
        })),
      };

      const response =
        await refurbishmentService.createRequest(transformedData);
      if (response.success) {
        toast.success("Request created successfully!");
        setShowCreateModal(false);
        setCreateFormData({
          partnerId: "",
          centerId: "",
          reason: "",
          description: "",
          packages: [],
        });
        refurbishmentRefresh.activeRequests();
        setActiveTab("requests");
      }
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Failed to create request");
    }
  };

  const handleCreatePackagesChange = useCallback((packageIds) => {
    setCreateFormData((prev) => ({
      ...prev,
      packages: packageIds,
    }));
  }, []);

  return {
    showCreateModal,
    setShowCreateModal,
    createFormData,
    setCreateFormData,
    handleCreateRequest,
    handleCreatePackagesChange,
  };
}
