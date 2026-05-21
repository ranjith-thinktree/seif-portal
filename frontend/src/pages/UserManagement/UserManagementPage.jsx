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
  DialogDescription,
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
  MoreHorizontal,
  Eye,
  Pencil,
  KeyRound,
  Mail,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  UserCheck,
  UserX,
  Copy,
  CheckCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  getUsers,
  getUserFilterOptions,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetUserPassword,
  resendUserCredentials,
} from "../../services/user.service";
import { toast } from "react-toastify";
import { useAuth } from "../../hooks";
import { ROLE_LABELS, ROLES } from "../../constants/roles";

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
  const [table, setTable] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState(null);
  const [copied, setCopied] = useState(false);

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
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "all", label: "All Users", role: null },
      { id: "admins", label: "Admins", role: "ADMIN" },
      { id: "partners", label: "Partners", role: "PARTNER" },
      { id: "essci", label: "ESSCI", role: "ESSCI" },
      { id: "readonly", label: "SEIF Readonly", role: "SEIF_READONLY" },
      {
        id: "readonly-download",
        label: "SEIF Readonly + Download",
        role: ROLES.SEIF_READONLY_DOWNLOAD,
      },
    ];

    // Only Super Admins can see the Super Admins tab
    if (isSuperAdmin) {
      baseTabs.push({
        id: "superadmin",
        label: "Super Admins",
        role: "SUPER_ADMIN",
      });
    }

    return baseTabs;
  }, [isSuperAdmin]);

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
          params.role = tab.role;
        }
      }

      // Remove empty filters
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === null) && delete params[key],
      );

      const response = await getUsers(params);

      setUsers(response.data.users || []);
      setPagination({
        page: response.data.page || 1,
        limit: response.data.limit || 10,
        total: response.data.total || 0,
        totalPages:
          Math.ceil((response.data.total || 0) / (response.data.limit || 10)) ||
          1,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
      setUsers([]);
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
  }, [fetchUsers]);

  // Handle search with debounce — only resets page when searchTerm changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);

    return () => clearTimeout(timer);
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
        partner_id: null,
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
        partner_id: null,
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
  // targetUser can be passed directly to avoid React async state race condition
  const handleStatusChange = async (newStatus, targetUser = null) => {
    const userToUpdate = targetUser || selectedUser;
    if (!userToUpdate) return;

    // Prevent self-deactivation
    if (userToUpdate.id === currentUserId && newStatus !== "active") {
      toast.error("You cannot deactivate your own account");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUserStatus(userToUpdate.id, newStatus);
      toast.success(
        `User ${newStatus === "active" ? "activated" : newStatus} successfully`,
      );
      setShowStatusModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update user status",
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
      // Store result to display in modal (password + email)
      setResetPasswordResult(response.data);
      toast.success("Password reset successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy temp password to clipboard
  const handleCopyPassword = () => {
    if (!resetPasswordResult?.temporaryPassword) return;
    navigator.clipboard
      .writeText(resetPasswordResult.temporaryPassword)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  const handleResendCredentials = async (targetUser) => {
    if (!targetUser) return;

    setIsSubmitting(true);
    try {
      const response = await resendUserCredentials(targetUser.id);
      const result = response.data || {};

      if (result.warning && result.temporaryPassword) {
        setSelectedUser(targetUser);
        setResetPasswordResult({ temporaryPassword: result.temporaryPassword });
        setShowResetPasswordModal(true);
        toast.warning(result.warning);
      } else {
        toast.success(`New credentials emailed to ${targetUser.email}`);
      }
    } catch (error) {
      console.error("Error resending credentials:", error);
      toast.error(
        error.response?.data?.message || "Failed to resend credentials",
      );
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
            SEIF_READONLY_DOWNLOAD: "bg-slate-100 text-slate-800",
          };
          return (
            <Badge className={roleColors[row.original.role] || ""}>
              {ROLE_LABELS[row.original.role] || row.original.role}
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
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => openViewModal(user)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>

                {canManageUsers && (
                  <>
                    {user.role !== "PARTNER" && (
                      <DropdownMenuItem onClick={() => openEditModal(user)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedUser(user);
                        setResetPasswordResult(null);
                        setCopied(false);
                        setShowResetPasswordModal(true);
                      }}
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      Reset Password
                    </DropdownMenuItem>

                    {user.role === "PARTNER" && (
                      <DropdownMenuItem
                        onClick={() => handleResendCredentials(user)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send New Credentials
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    {user.status === "active" && !isSelf && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          setShowStatusModal(true);
                        }}
                        className="text-orange-600 focus:text-orange-600"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    )}

                    {user.status !== "active" && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user);
                          handleStatusChange("active", user);
                        }}
                        className="text-green-600 focus:text-green-600"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Activate
                      </DropdownMenuItem>
                    )}

                    {isSuperAdmin && !isSelf && user.role !== "PARTNER" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canManageUsers, isSuperAdmin, currentUserId],
  );

  // Sort handler
  const handleSortChange = useCallback((field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Sort options
  const sortOptions = [
    { label: "Name", value: "full_name" },
    { label: "Email", value: "email" },
    { label: "Role", value: "role" },
    { label: "Status", value: "status" },
    { label: "Created Date", value: "created_at" },
  ];

  // Filter configuration for AdvancedSearchBar (filterGroups format)
  const filterGroups = [
    {
      key: "role",
      label: "Role",
      options: (filterOptions?.roles || []).map((role) => ({
        value: role,
        label: role,
      })),
    },
    {
      key: "status",
      label: "Status",
      options: (filterOptions?.statuses || []).map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
      })),
    },
    {
      key: "partner_id",
      label: "Partner",
      options: (filterOptions?.partners || []).map((partner) => ({
        value: partner.id,
        label: partner.name,
      })),
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
              <Plus className="h-5 w-5" />
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
          value={searchTerm}
          onChange={(val) => {
            setSearchTerm(val);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          activeFilters={activeFilters}
          onFilterChange={(key, value) => {
            setActiveFilters((prev) => ({ ...prev, [key]: value }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          onClearFilters={() => {
            setActiveFilters({ role: "", status: "", partner_id: "" });
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          filterGroups={filterGroups}
          placeholder="Search by name or email..."
          table={table}
          storageKey="user-management"
          sortOptions={sortOptions}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {/* Table */}
        <EnhancedDataTable
          columns={columns}
          data={users}
          pagination={pagination}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(limit) =>
            setPagination((prev) => ({ ...prev, limit, page: 1 }))
          }
          isLoading={isLoading}
          storageKey="user-management"
          onTableReady={setTable}
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
              <DialogDescription>
                {showCreateModal
                  ? "Create a new system user and assign their access role."
                  : "Update the selected user details and access settings."}
              </DialogDescription>
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
                    <SelectItem value="ESSCI">ESSCI</SelectItem>
                    <SelectItem value="SEIF_READONLY">SEIF Readonly</SelectItem>
                    <SelectItem value={ROLES.SEIF_READONLY_DOWNLOAD}>
                      SEIF Readonly + Download
                    </SelectItem>
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
              <DialogDescription>
                Review the selected user account information and access details.
              </DialogDescription>
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
              <DialogDescription>
                Choose a new status for the selected user account.
              </DialogDescription>
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
        <Dialog
          open={showResetPasswordModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowResetPasswordModal(false);
              setSelectedUser(null);
              setResetPasswordResult(null);
              setCopied(false);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Generate a new temporary password for the selected user.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* User info — always visible */}
              <div className="bg-gray-50 rounded-md border border-gray-200 divide-y divide-gray-200">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Username
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {selectedUser?.full_name}
                  </span>
                </div>
                {selectedUser?.partner_name && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Partner
                    </span>
                    <span className="text-sm text-gray-700">
                      {selectedUser.partner_name}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Email
                  </span>
                  <span className="text-sm text-gray-700">
                    {selectedUser?.email}
                  </span>
                </div>
              </div>

              {!resetPasswordResult ? (
                // Confirmation state
                <>
                  <p className="text-sm text-gray-500">
                    A new temporary password will be generated. The user will be
                    required to change it on next login.
                  </p>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowResetPasswordModal(false);
                        setSelectedUser(null);
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResetPassword}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Resetting..." : "Reset Password"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                // Result state — show generated password
                <>
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Password reset successfully
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temporary Password
                    </label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                      <code className="flex-1 text-base font-mono tracking-wider text-gray-900 select-all">
                        {resetPasswordResult.temporaryPassword}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={handleCopyPassword}
                        title="Copy password"
                      >
                        {copied ? (
                          <CheckCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-600 mt-1">
                        Copied to clipboard!
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Share this password with the user securely. They will be
                    prompted to change it on next login.
                  </p>

                  <DialogFooter>
                    <Button
                      onClick={() => {
                        setShowResetPasswordModal(false);
                        setSelectedUser(null);
                        setResetPasswordResult(null);
                        setCopied(false);
                      }}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default UserManagementPage;
