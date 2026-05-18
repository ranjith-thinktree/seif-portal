import React, { useState, useEffect, useCallback } from "react";
import AdvancedSearchBar from "../../../components/common/AdvancedSearchBar";
import EnhancedDataTable from "../../../components/common/EnhancedDataTable";
import { ActionDropdown } from "../../../components/common";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { SearchableSelect } from "../../../components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { PlusIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useAuth } from "../../../hooks";
import {
  getCenters,
  getCourses,
  getMyCenters,
} from "../../../services/data.service";
import {
  createTotTrainer,
  getTotDocumentUrl,
  getTotTrainerFilterOptions,
  getTotTrainers,
} from "../../../services/tot.service";

const defaultFormState = {
  targetPartnerId: "",
  training_partner: "",
  center_id: "",
  training_centre_name: "",
  trainer_name: "",
  course_name: "",
  qualification: "",
  date_of_joining: "",
  mobile_no: "",
  email: "",
};

const TotListTab = () => {
  const { role, partnerId } = useAuth();
  const canCreate = ["ADMIN", "SUPER_ADMIN", "PARTNER"].includes(role);
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(role);

  const [table, setTable] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [activeFilters, setActiveFilters] = useState({
    partner_id: [],
    training_centre_name: [],
    course_name: [],
    document_status: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    partners: [],
    centers: [],
    courses: [],
    documentStatuses: [],
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [formData, setFormData] = useState(defaultFormState);
  const [centerOptions, setCenterOptions] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [formFiles, setFormFiles] = useState({
    resume: null,
    qualificationCertificate: null,
    idProof: null,
  });

  const partnerSelectOptions = (filterOptions.partners || []).map(
    (partner) => ({
      value: partner.value,
      label: partner.label,
    }),
  );

  const centerSelectOptions = centerOptions.map((center) => ({
    value: center.id,
    label: center.center_name,
  }));

  const courseSelectOptions = courseOptions.map((course) => ({
    value: course.course_name,
    label: course.course_name,
  }));

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await getTotTrainerFilterOptions();
      setFilterOptions(response.data || {});
    } catch (error) {
      console.error("Error fetching TOT filter options:", error);
      toast.error("Failed to load TOT filter options");
    }
  }, []);

  const fetchTrainers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTotTrainers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        partner_id: activeFilters.partner_id,
        training_centre_name: activeFilters.training_centre_name,
        course_name: activeFilters.course_name,
        document_status: activeFilters.document_status,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setTrainers(response.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error("Error fetching TOT trainers:", error);
      toast.error("Failed to load TOT data");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    activeFilters,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const fetchCourseOptions = useCallback(async () => {
    try {
      const response = await getCourses();
      const list = response.data || response || [];
      setCourseOptions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourseOptions([]);
    }
  }, []);

  const fetchCenterOptions = useCallback(
    async (selectedPartnerId) => {
      try {
        if (isAdmin) {
          if (!selectedPartnerId) {
            setCenterOptions([]);
            return;
          }

          const response = await getCenters({
            partner_id: [selectedPartnerId],
            limit: 1000,
            approval_status: "approved",
          });
          setCenterOptions(response.data || []);
          return;
        }

        const response = await getMyCenters({
          limit: 1000,
          approval_status: "approved",
        });
        setCenterOptions(response.data || []);
      } catch (error) {
        console.error("Error fetching centers:", error);
        setCenterOptions([]);
      }
    },
    [isAdmin],
  );

  useEffect(() => {
    fetchCourseOptions();
  }, [fetchCourseOptions]);

  useEffect(() => {
    if (!showAddModal) return;

    if (isAdmin) {
      fetchCenterOptions(formData.targetPartnerId);
    } else if (partnerId) {
      fetchCenterOptions(partnerId);
    }
  }, [
    showAddModal,
    isAdmin,
    partnerId,
    formData.targetPartnerId,
    fetchCenterOptions,
  ]);

  useEffect(() => {
    fetchTrainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, activeFilters, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchTrainers();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      partner_id: [],
      training_centre_name: [],
      course_name: [],
      document_status: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newLimit) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const openAddModal = () => {
    setFormData(defaultFormState);
    setCenterOptions([]);
    setFormFiles({
      resume: null,
      qualificationCertificate: null,
      idProof: null,
    });
    setShowAddModal(true);
  };

  const handleCreateTrainer = async (e) => {
    e.preventDefault();

    if (!formData.trainer_name?.trim() || !formData.course_name?.trim()) {
      toast.error("Trainer name and course name are required");
      return;
    }

    if (!formData.center_id) {
      toast.error("Please select a center");
      return;
    }

    if (isAdmin && !formData.targetPartnerId) {
      toast.error("Please select a partner");
      return;
    }

    try {
      setSaving(true);
      await createTotTrainer({
        ...formData,
        resume: formFiles.resume,
        qualificationCertificate: formFiles.qualificationCertificate,
        idProof: formFiles.idProof,
      });

      toast.success("Trainer added successfully");
      setShowAddModal(false);
      fetchTrainers();
      fetchFilterOptions();
    } catch (error) {
      console.error("Error adding trainer:", error);
      toast.error(error.response?.data?.message || "Failed to add trainer");
    } finally {
      setSaving(false);
    }
  };

  const getDocumentStatus = (trainer) => {
    const count = Number(trainer.document_count || 0);
    if (count >= 3) return { label: "Complete", variant: "success" };
    if (count > 0) return { label: "Partial", variant: "warning" };
    return { label: "Missing", variant: "secondary" };
  };

  const filterGroups = [
    {
      label: "Partner",
      key: "partner_id",
      options: filterOptions.partners || [],
      multi: true,
    },
    {
      label: "Center",
      key: "training_centre_name",
      options: filterOptions.centers || [],
      multi: true,
    },
    {
      label: "Course",
      key: "course_name",
      options: filterOptions.courses || [],
      multi: true,
    },
    {
      label: "Document Status",
      key: "document_status",
      options: filterOptions.documentStatuses || [],
    },
  ];

  const sortOptions = [
    { label: "Trainer Name", value: "trainer_name" },
    { label: "Partner", value: "partner_name" },
    { label: "Center", value: "training_centre_name" },
    { label: "Course", value: "course_name" },
    { label: "Date of Joining", value: "date_of_joining" },
    { label: "Created Date", value: "created_at" },
  ];

  const columns = [
    {
      id: "trainer_name",
      accessorKey: "trainer_name",
      header: "Trainer Name",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.trainer_name || "N/A"}</div>
      ),
      size: 220,
      enableHiding: false,
    },
    {
      id: "course_name",
      accessorKey: "course_name",
      header: "Course",
      cell: ({ row }) => row.original.course_name || "N/A",
      size: 220,
    },
    {
      id: "partner_name",
      accessorKey: "partner_name",
      header: "Partner",
      cell: ({ row }) => row.original.partner_name || "N/A",
      size: 220,
    },
    {
      id: "training_centre_name",
      accessorKey: "training_centre_name",
      header: "Center",
      cell: ({ row }) => row.original.training_centre_name || "N/A",
      size: 220,
    },
    {
      id: "qualification",
      accessorKey: "qualification",
      header: "Qualification",
      cell: ({ row }) => row.original.qualification || "N/A",
      size: 180,
    },
    {
      id: "date_of_joining",
      accessorKey: "date_of_joining",
      header: "Date of Joining",
      cell: ({ row }) =>
        row.original.date_of_joining
          ? new Date(row.original.date_of_joining).toLocaleDateString()
          : "N/A",
      size: 140,
    },
    {
      id: "mobile_no",
      accessorKey: "mobile_no",
      header: "Mobile",
      cell: ({ row }) => row.original.mobile_no || "N/A",
      size: 140,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "N/A",
      size: 240,
    },
    {
      id: "document_status",
      header: "Documents",
      cell: ({ row }) => {
        const status = getDocumentStatus(row.original);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
      size: 130,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const trainer = row.original;

        const actions = [
          {
            label: "View Resume",
            icon: DocumentTextIcon,
            onClick: () =>
              window.open(getTotDocumentUrl(trainer.resume_file_url), "_blank"),
            show: !!trainer.resume_file_url,
            divider: true,
          },
          {
            label: "View Qualification",
            icon: DocumentTextIcon,
            onClick: () =>
              window.open(
                getTotDocumentUrl(trainer.qualification_certificate_url),
                "_blank",
              ),
            show: !!trainer.qualification_certificate_url,
            divider: true,
          },
          {
            label: "View ID Proof",
            icon: DocumentTextIcon,
            onClick: () =>
              window.open(
                getTotDocumentUrl(trainer.id_proof_file_url),
                "_blank",
              ),
            show: !!trainer.id_proof_file_url,
          },
        ];

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex justify-center"
          >
            <ActionDropdown actions={actions} align="right" size="sm" />
          </div>
        );
      },
      size: 180,
      minSize: 150,
      maxSize: 250,
      enableHiding: false,
      enableResizing: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TOT Trainers</h1>
          <p className="text-gray-600 mt-1">
            Manage approved TOT trainer data with partner-wise and center-wise
            filters
          </p>
        </div>
        {canCreate && (
          <Button onClick={openAddModal} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Trainer
          </Button>
        )}
      </div>

      <AdvancedSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search trainer, partner, center, course, mobile..."
        table={table}
        storageKey="tot-trainers"
        filterGroups={filterGroups}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        sortOptions={sortOptions}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      <EnhancedDataTable
        columns={columns}
        data={trainers}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={loading}
        emptyMessage="No TOT trainer data found"
        showSerialNumber={true}
        storageKey="tot-trainers"
        onTableReady={setTable}
      />

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Individual Trainer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTrainer} className="space-y-4">
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Partner *</label>
                <SearchableSelect
                  options={partnerSelectOptions}
                  value={formData.targetPartnerId}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetPartnerId: value,
                      center_id: "",
                      training_centre_name: "",
                    }))
                  }
                  placeholder="Select partner"
                  searchPlaceholder="Search partner..."
                  emptyMessage="No partner found."
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Trainer Name *</label>
                <Input
                  value={formData.trainer_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trainer_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Course Name *</label>
                <SearchableSelect
                  options={courseSelectOptions}
                  value={formData.course_name}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, course_name: value }))
                  }
                  placeholder="Select course"
                  searchPlaceholder="Search course..."
                  emptyMessage="No course found."
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Training Partner</label>
                <Input
                  value={formData.training_partner}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      training_partner: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Training Center *</label>
                <SearchableSelect
                  options={centerSelectOptions}
                  value={formData.center_id}
                  onChange={(value) =>
                    setFormData((prev) => {
                      const selectedCenter = centerOptions.find(
                        (center) => center.id === value,
                      );

                      return {
                        ...prev,
                        center_id: value,
                        training_centre_name: selectedCenter?.center_name || "",
                      };
                    })
                  }
                  placeholder={
                    isAdmin && !formData.targetPartnerId
                      ? "Select partner first"
                      : "Select center"
                  }
                  searchPlaceholder="Search center..."
                  emptyMessage="No center found."
                  disabled={
                    isAdmin
                      ? !formData.targetPartnerId
                      : !centerSelectOptions.length
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Qualification</label>
                <Input
                  value={formData.qualification}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      qualification: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Date of Joining</label>
                <Input
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date_of_joining: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Mobile Number</label>
                <Input
                  value={formData.mobile_no}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      mobile_no: e.target.value,
                    }))
                  }
                  placeholder="10 digit mobile"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Resume</label>
                <Input
                  type="file"
                  onChange={(e) =>
                    setFormFiles((prev) => ({
                      ...prev,
                      resume: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Qualification Certificate
                </label>
                <Input
                  type="file"
                  onChange={(e) =>
                    setFormFiles((prev) => ({
                      ...prev,
                      qualificationCertificate: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">ID Proof</label>
                <Input
                  type="file"
                  onChange={(e) =>
                    setFormFiles((prev) => ({
                      ...prev,
                      idProof: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Trainer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TotListTab;
