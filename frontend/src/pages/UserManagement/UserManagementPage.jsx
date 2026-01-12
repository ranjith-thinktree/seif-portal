import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MainLayout } from "../../components/layout";
import EnhancedDataTable, {
  StatusBadge,
} from "../../components/common/EnhancedDataTable";
import AdvancedSearchBar from "../../components/common/AdvancedSearchBar";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  getUsers,
  getUserFilterOptions,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetUserPassword,
} from "../../services/user.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";

/**
 * User Management Page
 * Manages all system users with CRUD operations, password reset, and role-based access
 * Access: SUPER_ADMIN, ADMIN only
 */
const UserManagementPage = () => {
  const { role, userId: currentUserId } = useAuth();

  // Access control
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN";
  const canManageUsers = isSuperAdmin || isAdmin;

  // State management
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilters, setActiveFilters] = useState({
    role: "",
    status: "",
    partner_id: "",
  });
  const [filterOptions, setFilterOptions] = useState({
    roles: [],
    statuses: [],
    partners: [],
  });
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    mobile_number: "",
    role: "",
    partner_id: "",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState({});

  // Tab configuration
  const tabs = [
    { id: "all", label: "All Users", role: null },
    { id: "admins", label: "Admins", role: ["ADMIN", "SUPER_ADMIN"] },
    { id: "partners", label: "Partners", role: "PARTNER" },
    { id: "essci", label: "ESSCI", role: "ESSCI" },
    { id: "readonly", label: "SEIF Readonly", role: "SEIF_READONLY" },
    { id: "superadmin", label: "Super Admins", role: "SUPER_ADMIN" },
  ];

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await getUserFilterOptions();
        setFilterOptions(response.data);
      } catch (error) {
        console.error("Error fetching filter options:", error);
        toast.error("Failed to load filter options");
      }
    };
    fetchFilterOptions();
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...activeFilters,
      };

      // Apply tab filter
      if (activeTab !== "all") {
        const tab = tabs.find((t) => t.id === activeTab);
        if (tab?.role) {
          if (Array.isArray(tab.role)) {
            // For admins tab, we need to filter on backend
            // For now, fetch all and filter client-side
            params.role = tab.role[0]; // Simplified - backend needs enhancement for OR queries
          } else {
            params.role = tab.role;
          }
        }
      }

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key]
      );

      const response = await getUsers(params);

      // Client-side filter for admins tab (temporary until backend supports OR)
      let filteredUsers = response.data.users;
      if (activeTab === "admins") {
        filteredUsers = filteredUsers.filter(
          (u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN"
        );
      }

      setUsers(filteredUsers);
      setPagination(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
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
    activeTab,
    tabs,
  ]);

  // Fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.limit,
    activeFilters,
    sortBy,
    sortOrder,
    activeTab,
  ]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Form validation
  const validateForm = (data, isEdit = false) => {
    const errors = {};

    if (!data.email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Invalid email format";
    }

    if (!isEdit && !data.password) {
      errors.password = "Password is required";
    } else if (!isEdit && data.password && data.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!data.full_name || data.full_name.trim() === "") {
      errors.full_name = "Full name is required";
    }

    if (!data.role) {
      errors.role = "Role is required";
    }

    if (data.role === "PARTNER" && !data.partner_id) {
      errors.partner_id = "Partner is required for PARTNER role";
    }

    if (data.mobile_number && !/^\+?[\d\s-()]+$/.test(data.mobile_number)) {
      errors.mobile_number = "Invalid mobile number format";
    }

    return errors;
  };

  // Handle create user
  const handleCreateUser = async () => {
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Sanitize data
      const userData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        mobile_number: formData.mobile_number?.trim() || null,
        role: formData.role,
        partner_id: formData.role === "PARTNER" ? formData.partner_id : null,
        status: formData.status,
      };

      await createUser(userData);
      toast.success("User created successfully");
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error.response?.data?.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    const errors = validateForm(formData, true);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = {
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        mobile_number: formData.mobile_number?.trim() || null,
        role: formData.role,
        partner_id: formData.role === "PARTNER" ? formData.partner_id : null,
        status: formData.status,
      };

      await updateUser(selectedUser.id, userData);
      toast.success("User updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Prevent self-deletion
    if (selectedUser.id === currentUserId) {
      toast.error("You cannot delete your own account");
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteUser(selectedUser.id);
      toast.success("User deleted successfully");
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!selectedUser) return;

    // Prevent self-deactivation
    if (selectedUser.id === currentUserId && newStatus !== "active") {
      toast.error("You cannot deactivate your own account");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserStatus(selectedUser.id, newStatus);
      toast.success(
        `User ${newStatus === "active" ? "activated" : newStatus} successfully`
      );
      setShowStatusModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update user status"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await resetUserPassword(selectedUser.id);
      toast.success("Password reset successfully");

      // Show temporary password (only in development)
      if (response.data.temporaryPassword) {
        toast.info(`Temporary Password: ${response.data.temporaryPassword}`, {
          autoClose: false,
        });
      }

      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
      mobile_number: "",
      role: "",
      partner_id: "",
      status: "active",
    });
    setFormErrors({});
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "", // Don't show existing password
      full_name: user.full_name,
      mobile_number: user.mobile_number || "",
      role: user.role,
      partner_id: user.partner_id || "",
      status: user.status,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Open view modal
  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        id: "full_name",
        accessorKey: "full_name",
        header: "Full Name",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">
            {row.original.full_name}
          </div>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="text-gray-600">{row.original.email}</div>
        ),
      },
      {
        id: "mobile_number",
        accessorKey: "mobile_number",
        header: "Mobile",
        cell: ({ row }) => (
          <div className="text-gray-600">
            {row.original.mobile_number || "-"}
          </div>
        ),
      },
      {
        id: "role",
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const roleColors = {
            SUPER_ADMIN: "bg-purple-100 text-purple-800",
            ADMIN: "bg-blue-100 text-blue-800",
            PARTNER: "bg-green-100 text-green-800",
            ESSCI: "bg-yellow-100 text-yellow-800",
            SEIF_READONLY: "bg-gray-100 text-gray-800",
          };
          return (
            <Badge className={roleColors[row.original.role] || ""}>
              {row.original.role}
            </Badge>
          );
        },
      },
      {
        id: "partner_name",
        accessorKey: "partner_name",
        header: "Partner",
        cell: ({ row }) => (
          <div className="text-gray-600">
            {row.original.partner_name || "-"}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const statusConfig = {
            active: { variant: "success", label: "Active" },
            inactive: { variant: "secondary", label: "Inactive" },
            suspended: { variant: "error", label: "Suspended" },
          };
          const config =
            statusConfig[row.original.status] || statusConfig.inactive;
          return <StatusBadge variant={config.variant} label={config.label} />;
        },
      },
      {
        id: "last_login_at",
        accessorKey: "last_login_at",
        header: "Last Login",
        cell: ({ row }) => {
          if (!row.original.last_login_at)
            return <span className="text-gray-400">Never</span>;
          const date = new Date(row.original.last_login_at);
          return (
            <div className="text-gray-600 text-sm">
              {date.toLocaleDateString()}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === currentUserId;

          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openViewModal(user)}
                title="View Details"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>

              {canManageUsers && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(user)}
                    title="Edit User"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowResetPasswordModal(true);
                    }}
                    title="Reset Password"
                  >
                    <KeyIcon className="h-4 w-4" />
                  </Button>

                  {user.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowStatusModal(true);
                      }}
                      title="Change Status"
                      disabled={isSelf}
                    >
                      <XCircleIcon className="h-4 w-4 text-orange-600" />
                    </Button>
                  )}

                  {user.status !== "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        handleStatusChange("active");
                      }}
                      title="Activate User"
                    >
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    </Button>
                  )}

                  {isSuperAdmin && !isSelf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      title="Delete User"
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [canManageUsers, isSuperAdmin, currentUserId]
  );

  // Filter configuration for AdvancedSearchBar
  const filters = [
    {
      key: "role",
      label: "Role",
      type: "select",
      options: filterOptions.roles.map((role) => ({
        value: role,
        label: role,
      })),
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: filterOptions.statuses.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
      })),
    },
    {
      key: "partner_id",
      label: "Partner",
      type: "select",
      options: filterOptions.partners.map((partner) => ({
        value: partner.id,
        label: partner.name,
      })),
      condition: (filters) => filters.role === "PARTNER",
    },
  ];

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage system users, roles, and permissions
            </p>
          </div>

          {canManageUsers && (
            <Button
              onClick={openCreateModal}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create User
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filters */}
        <AdvancedSearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => {
            setActiveFilters((prev) => ({ ...prev, [key]: value }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          onClearFilters={() => {
            setActiveFilters({ role: "", status: "", partner_id: "" });
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          filters={filters}
          placeholder="Search by name or email..."
        />

        {/* Table */}
        <EnhancedDataTable
          columns={columns}
          data={users}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onRowsPerPageChange={(limit) =>
            setPagination((prev) => ({ ...prev, limit, page: 1 }))
          }
          isLoading={isLoading}
          onSortChange={(field, order) => {
            setSortBy(field);
            setSortOrder(order);
          }}
        />

        {/* Create/Edit User Modal */}
        <Dialog
          open={showCreateModal || showEditModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {showCreateModal ? "Create New User" : "Edit User"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {showCreateModal && (
                <div className="col-span-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password *
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={formErrors.password ? "border-red-500" : ""}
                  />
                  {formErrors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.password}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    User will be required to change password on first login
                  </p>
                </div>
              )}

              <div className="col-span-2">
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name *
                </label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className={formErrors.full_name ? "border-red-500" : ""}
                />
                {formErrors.full_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.full_name}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <label
                  htmlFor="mobile_number"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mobile Number
                </label>
                <Input
                  id="mobile_number"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile_number: e.target.value })
                  }
                  className={formErrors.mobile_number ? "border-red-500" : ""}
                  placeholder="+91-XXXXXXXXXX"
                />
                {formErrors.mobile_number && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.mobile_number}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Role *
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger
                    className={formErrors.role ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="ESSCI">ESSCI</SelectItem>
                    <SelectItem value="SEIF_READONLY">SEIF Readonly</SelectItem>
                    {isSuperAdmin && (
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.role && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.role}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "PARTNER" && (
                <div className="col-span-2">
                  <label
                    htmlFor="partner_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Partner Organization *
                  </label>
                  <Select
                    value={formData.partner_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, partner_id: value })
                    }
                  >
                    <SelectTrigger
                      className={formErrors.partner_id ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.partners.map((partner) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.partner_id && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.partner_id}
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={showCreateModal ? handleCreateUser : handleEditUser}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : showCreateModal
                  ? "Create User"
                  : "Update User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View User Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Full Name
                    </label>
                    <p className="font-medium">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Email
                    </label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Mobile Number
                    </label>
                    <p className="font-medium">
                      {selectedUser.mobile_number || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Role
                    </label>
                    <p className="font-medium">{selectedUser.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Partner
                    </label>
                    <p className="font-medium">
                      {selectedUser.partner_name || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Status
                    </label>
                    <p className="font-medium capitalize">
                      {selectedUser.status}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Last Login
                    </label>
                    <p className="font-medium">
                      {selectedUser.last_login_at
                        ? new Date(selectedUser.last_login_at).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Created At
                    </label>
                    <p className="font-medium">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteUser}
          title="Delete User"
          message={`Are you sure you want to delete ${selectedUser?.full_name}? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="destructive"
          isLoading={isSubmitting}
        />

        {/* Status Change Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Select new status for {selectedUser?.full_name}:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("inactive")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Inactive
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("suspended")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Suspended
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <ConfirmationModal
          isOpen={showResetPasswordModal}
          onClose={() => setShowResetPasswordModal(false)}
          onConfirm={handleResetPassword}
          title="Reset Password"
          message={`Are you sure you want to reset the password for ${selectedUser?.full_name}? A temporary password will be generated and user will be required to change it on next login.`}
          confirmText="Reset Password"
          isLoading={isSubmitting}
        />
      </div>
    </MainLayout>
  );
};

export default UserManagementPage;
