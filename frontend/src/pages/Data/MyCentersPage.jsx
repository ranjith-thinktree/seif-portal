import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import DataTable, { StatusBadge } from "../../components/common/DataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import CenterForm from "../../components/forms/CenterForm";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  PlusIcon,
  PencilIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  getMyCenters,
  createCenter,
  updateCenter,
  exportCenters,
  downloadCSV,
  getCenterFilterOptions,
} from "../../services/data.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

const MyCentersPage = () => {
  const navigate = useNavigate();
  const { role, partnerId } = useAuth();

  const isPartner = role === "PARTNER";

  const [centers, setCenters] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    region: "",
    city: "",
    state: "",
    center_type: "",
    year_of_establishment: "",
    status: "",
    approval_status: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    regions: [],
    cities: [],
    states: [],
    centerTypes: [],
    years: [],
    statuses: [],
    approvalStatuses: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showForm, setShowForm] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await getCenterFilterOptions();
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch my centers
  const fetchCenters = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...activeFilters, // Spread all active filters
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
      );

      const response = await getMyCenters(params);
      setCenters(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching centers:", error);
      toast.error("Failed to load centers");
    } finally {
      setIsLoading(false);
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
    fetchCenters();
  }, [fetchCenters]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchCenters();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchCenters, pagination.page]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Handle clear all filters
  const handleClearFilters = () => {
    setActiveFilters({
      region: "",
      city: "",
      state: "",
      center_type: "",
      year_of_establishment: "",
      status: "",
      approval_status: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle create center
  const handleCreateCenter = async (formData) => {
    setIsSubmitting(true);
    try {
      await createCenter(formData);
      toast.success("Center created successfully. Pending admin approval.");
      setShowForm(false);
      fetchCenters();
    } catch (error) {
      console.error("Error creating center:", error);
      toast.error(error.response?.data?.message || "Failed to create center");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update center
  const handleUpdateCenter = async (formData) => {
    setIsSubmitting(true);
    try {
      await updateCenter(editingCenter.id, formData);
      toast.success("Center updated successfully");
      setShowForm(false);
      setEditingCenter(null);
      fetchCenters();
    } catch (error) {
      console.error("Error updating center:", error);
      toast.error(error.response?.data?.message || "Failed to update center");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = {
        search: searchTerm,
        ...activeFilters,
      };

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
      );

      const blob = await exportCenters(params);
      downloadCSV(blob, `my_centers_${new Date().getTime()}.csv`);
      toast.success("Centers exported successfully");
    } catch (error) {
      console.error("Error exporting centers:", error);
      toast.error("Failed to export centers");
    }
  };

  // Handle row click
  const handleRowClick = (center) => {
    navigate(`/data/centers/${center.id}/students`, {
      state: { centerName: center.center_name },
    });
  };

  // Handle edit click
  const handleEditClick = (e, center) => {
    e.stopPropagation();
    setEditingCenter(center);
    setShowForm(true);
  };

  // Table columns - Show ALL center data
  const columns = [
    {
      header: "Center Name",
      accessor: "center_name",
      width: "20%",
    },
    {
      header: "Type",
      accessor: "center_type",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.center_type}
        </Badge>
      ),
    },
    {
      header: "Batches",
      accessor: "total_batches",
      render: (row) => (
        <Badge variant="outline">{row.total_batches || 0}</Badge>
      ),
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
      accessor: "total_male_students",
      render: (row) => (
        <Badge variant="outline">{row.total_male_students || 0}</Badge>
      ),
    },
    {
      header: "Female",
      accessor: "total_female_students",
      render: (row) => (
        <Badge variant="outline">{row.total_female_students || 0}</Badge>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Approval",
      accessor: "approval_status",
      render: (row) => <StatusBadge status={row.approval_status} />,
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
          <button
            onClick={(e) => handleEditClick(e, row)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Centers</h1>
            <p className="text-gray-600 mt-1">Manage your training centers</p>
          </div>
          {isPartner && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-8 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create Center
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <CenterForm
            center={editingCenter}
            onSubmit={editingCenter ? handleUpdateCenter : handleCreateCenter}
            onCancel={() => {
              setShowForm(false);
              setEditingCenter(null);
            }}
            isLoading={isSubmitting}
            preselectedPartnerId={partnerId}
          />
        )}

        {/* Search with Filters and Export */}
        {!showForm && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <AdvancedSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search centers by name, city, state..."
                filterGroups={[
                  {
                    label: "Region",
                    key: "region",
                    options: filterOptions.regions,
                  },
                  {
                    label: "City",
                    key: "city",
                    options: filterOptions.cities,
                  },
                  {
                    label: "State",
                    key: "state",
                    options: filterOptions.states,
                  },
                  {
                    label: "Center Type",
                    key: "center_type",
                    options: filterOptions.centerTypes,
                  },
                  {
                    label: "Establishment Year",
                    key: "year_of_establishment",
                    options: filterOptions.years,
                  },
                  {
                    label: "Status",
                    key: "status",
                    options: filterOptions.statuses,
                  },
                  ...(filterOptions.approvalStatuses.length > 0
                    ? [
                        {
                          label: "Approval Status",
                          key: "approval_status",
                          options: filterOptions.approvalStatuses,
                        },
                      ]
                    : []),
                ]}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                sortOptions={[
                  { label: "Center Name", value: "center_name" },
                  { label: "City", value: "city" },
                  { label: "Region", value: "region" },
                  {
                    label: "Establishment Year",
                    value: "year_of_establishment",
                  },
                  { label: "Status", value: "status" },
                  { label: "Created Date", value: "created_at" },
                ]}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-2 shrink-0"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Export CSV
            </Button>
          </div>
        )}

        {/* Table */}
        {!showForm && (
          <DataTable
            columns={columns}
            data={centers}
            pagination={pagination}
            onPageChange={handlePageChange}
            onRowClick={handleRowClick}
            isLoading={isLoading}
            emptyMessage="No centers found"
          />
        )}
      </div>
    </MainLayout>
  );
};

export default MyCentersPage;
