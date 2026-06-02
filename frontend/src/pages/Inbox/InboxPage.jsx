import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useNotifications } from "../../hooks/useNotifications";
import {
  markAsRead,
  markAllAsRead as markAllAsReadAPI,
  deleteNotification as deleteNotificationAPI,
  getGroupedNotifications,
  getUploadCenterDetails,
} from "../../services/notification.service";
import { getEmploymentUploadAttachments } from "../../services/employment.service";
import { toast } from "react-toastify";
import NotificationDetailCard from "./NotificationDetailCard";
import RefurbishmentDetailCard from "./RefurbishmentDetailCard";
import RefurbishmentStatusCard from "./RefurbishmentStatusCard";
import PartnerPastRequestsTab from "./PartnerPastRequestsTab";

/**
 * Format date helper
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

/**
 * Alert Type Badge Component
 */
const AlertTypeBadge = ({ alertType }) => {
  const styles = {
    info: "bg-blue-100 text-blue-700 border-blue-200",
    success: "bg-primary-100 text-primary-700 border-primary-200",
    warning: "bg-secondary-100 text-secondary-700 border-secondary-200",
    error: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Badge
      variant="outline"
      className={`${styles[alertType] || styles.info} text-xs px-2 py-0.5`}
    >
      {alertType.toUpperCase()}
    </Badge>
  );
};

/**
 * Notification Item Component
 */
const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  onSelect,
  isSelected,
  canDelete = true,
}) => {
  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    if (notification.is_read) return;

    try {
      await onMarkAsRead(notification.id);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(notification);
    }
  };

  return (
    <div
      className={`p-4 border-b border-border hover:bg-accent transition-colors cursor-pointer ${
        !notification.is_read ? "bg-primary-50/30" : ""
      } ${isSelected ? "bg-gray-100" : ""}`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Notification Icon */}
        <div className="relative flex-shrink-0">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center ${
              notification.alert_type === "success"
                ? "bg-primary-100"
                : notification.alert_type === "error"
                  ? "bg-destructive/10"
                  : notification.alert_type === "warning"
                    ? "bg-secondary-100"
                    : "bg-blue-100"
            }`}
          >
            <BellIcon
              className={`h-5 w-5 ${
                notification.alert_type === "success"
                  ? "text-primary-600"
                  : notification.alert_type === "error"
                    ? "text-destructive"
                    : notification.alert_type === "warning"
                      ? "text-secondary-600"
                      : "text-blue-600"
              }`}
            />
          </div>
          {!notification.is_read && (
            <Badge className="absolute -top-1 -right-1 bg-[#FF4B4A] text-white text-[10px] px-1.5 py-0 h-4 rounded-full border-2 border-white hover:bg-[#FF4B4A]">
              New
            </Badge>
          )}
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-sm">
              {notification.total_centers !== undefined ? (
                <>
                  Data Upload: {notification.total_centers} center
                  {notification.total_centers !== 1 ? "s" : ""}{" "}
                  {notification.total_centers > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({notification.approved_centers} approved,{" "}
                      {notification.rejected_centers} rejected,{" "}
                      {notification.pending_centers} pending)
                    </span>
                  )}
                  {notification.version && notification.version > 1 && (
                    <Badge className="ml-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0 h-5 rounded-full">
                      v{notification.version}
                    </Badge>
                  )}
                </>
              ) : (
                notification.title
              )}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {notification.aggregated_status === "partial_approved" ? (
                <Badge
                  variant="outline"
                  className="text-xs px-3 py-1 rounded-[40px] border-[#F59E0B] text-[#F59E0B]"
                  style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
                >
                  PARTIAL APPROVED
                </Badge>
              ) : (
                <AlertTypeBadge alertType={notification.alert_type} />
              )}
              {!notification.is_read && (
                <div className="h-2 w-2 bg-primary-500 rounded-full"></div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            {notification.message}
          </p>

          {notification.remark && (
            <p className="text-xs text-muted-foreground italic mb-2">
              Note: {notification.remark}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatDate(notification.created_at)}
            </span>

            <div className="flex items-center gap-2">
              {!notification.is_read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-7 px-2 text-xs"
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Mark as read
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Inbox Page Component
 */
const InboxPage = () => {
  const { user } = useSelector((state) => state.auth);
  const isPartner = user?.role === "PARTNER";
  const isReadOnly = ["SEIF_READONLY", "SEIF_READONLY_DOWNLOAD"].includes(
    user?.role,
  );

  const {
    socket,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    removeNotification,
  } = useNotifications();
  const [activeTab, setActiveTab] = useState("alerts");
  const [notifications, setNotifications] = useState([]);

  // For partners, hide refurbishment eligibility notifications that the
  // partner has already responded to — those requests now live in Past Requests.
  const displayedNotifications = isPartner
    ? notifications.filter(
        (n) => !(n.alert_type === "refurbishment" && n.partner_responded),
      )
    : notifications;
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [centerDetails, setCenterDetails] = useState(null);
  const [employmentAttachments, setEmploymentAttachments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  /**
   * Fetch notifications (grouped by upload)
   */
  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 20,
          search: searchQuery.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sortBy: sortBy,
        };

        const response = await getGroupedNotifications(params);
        setNotifications(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, statusFilter, sortBy],
  );

  /**
   * Handle mark as read
   */
  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      markNotificationAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif,
        ),
      );

      toast.success("Notification marked as read");
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadAPI();
      markAllNotificationsAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true })),
      );

      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  /**
   * Handle delete notification
   */
  const handleDelete = async (notificationId) => {
    try {
      await deleteNotificationAPI(notificationId);
      removeNotification(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId),
      );

      // Clear selection if deleted notification was selected
      if (selectedNotification?.id === notificationId) {
        setSelectedNotification(null);
        setCsvData(null);
      }

      toast.success("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  /**
   * Handle notification selection
   * Fetch center details for grouped notification
   */
  const handleSelectNotification = async (notification) => {
    setSelectedNotification(notification);
    setCenterDetails(null);
    setCsvData(null);
    setEmploymentAttachments([]);

    // Fetch center details for this upload (student data uploads only, not employment)
    if (
      notification.upload_id &&
      notification.related_entity_type !== "tot_upload" &&
      notification.related_entity_type !== "employment_upload" &&
      notification.notification_type !== "employment"
    ) {
      try {
        const response = await getUploadCenterDetails(notification.upload_id);
        setCenterDetails(response.data);
      } catch (error) {
        console.error("Failed to fetch center details:", error);
        toast.error("Failed to load center details");
      }
    }

    // Fetch attachments for employment upload notifications
    const isEmploymentNotif =
      notification.related_entity_type === "employment_upload" ||
      notification.notification_type === "employment";
    if (isEmploymentNotif && notification.upload_id) {
      try {
        const res = await getEmploymentUploadAttachments(
          notification.upload_id,
        );
        setEmploymentAttachments(res.data?.attachments || []);
      } catch (error) {
        console.error("Failed to fetch employment attachments:", error);
        // Non-fatal — just show empty list
      }
    }
  };

  /**
   * Handle dismiss detail card
   */
  const handleDismissDetail = () => {
    setSelectedNotification(null);
    setCsvData(null);
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    fetchNotifications(newPage);
  };

  /**
   * Fetch notifications when tab or filters change
   */
  useEffect(() => {
    if (activeTab === "alerts") {
      fetchNotifications(1);
    }
  }, [activeTab, statusFilter, sortBy, fetchNotifications]);

  /**
   * Real-time: re-fetch the alerts list whenever a new notification
   * arrives via WebSocket so the list stays in sync without a page refresh.
   */
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      // Always refresh — even if alerts tab isn't active right now,
      // the data will be fresh when the user switches back.
      fetchNotifications(1);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, fetchNotifications]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your notifications and requests
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid w-full mb-6 bg-transparent border-b border-gray-300 rounded-none p-0 ${isPartner ? "max-w-xl grid-cols-3" : "max-w-md grid-cols-2"}`}
          >
            <TabsTrigger
              value="alerts"
              className="relative bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#009530] data-[state=active]:border-b-2 data-[state=active]:border-[#009530] text-gray-500 rounded-none pb-3"
            >
              Alerts
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 min-w-[20px] rounded-full bg-[#fe5c73] hover:bg-[#fe5c73]"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#009530] data-[state=active]:border-b-2 data-[state=active]:border-[#009530] text-gray-500 rounded-none pb-3"
            >
              Requests
            </TabsTrigger>
            {isPartner && (
              <TabsTrigger
                value="past-requests"
                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#009530] data-[state=active]:border-b-2 data-[state=active]:border-[#009530] text-gray-500 rounded-none pb-3"
              >
                Past Requests
              </TabsTrigger>
            )}
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {/* Search and Actions Bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      fetchNotifications(1);
                    }
                  }}
                  className="pl-10 rounded-[16px]"
                />
              </div>

              {/* Filter by Status */}
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[180px] rounded-[16px]">
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial_approved">
                    Partial Approved
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger className="w-[180px] rounded-[16px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="rounded-[40px]"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            </div>

            {/* Notifications List - Split Layout when notification is selected */}
            <div
              className={selectedNotification ? "grid grid-cols-2 gap-6" : ""}
            >
              {/* Left side - Notifications List */}
              <div className="bg-white rounded-[16px] border border-border overflow-hidden">
                <style>{`
                  .notification-scroll::-webkit-scrollbar {
                    width: 1px;
                  }
                  .notification-scroll::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .notification-scroll::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 10px;
                  }
                `}</style>
                <div
                  className="notification-scroll max-h-[450px] overflow-y-auto p-4"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#d1d5db transparent",
                  }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                      <span className="ml-3 text-muted-foreground">
                        Loading notifications...
                      </span>
                    </div>
                  ) : displayedNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <BellIcon className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-base mb-2">
                        No notifications
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You're all caught up! No new alerts.
                      </p>
                    </div>
                  ) : (
                    <>
                      {displayedNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={handleDelete}
                          onSelect={handleSelectNotification}
                          isSelected={
                            selectedNotification?.id === notification.id
                          }
                          canDelete={!isReadOnly}
                        />
                      ))}
                    </>
                  )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-border bg-background-secondary">
                    <div className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}{" "}
                      of {pagination.total} notifications
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center px-3 text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right side - Notification Detail Card */}
              {selectedNotification && (
                <div className="h-[450px]">
                  {selectedNotification.alert_type === "refurbishment" ? (
                    <RefurbishmentDetailCard
                      notification={selectedNotification}
                      onDismiss={handleDismissDetail}
                    />
                  ) : selectedNotification.alert_type?.startsWith(
                      "refurbishment",
                    ) ? (
                    <RefurbishmentStatusCard
                      notification={selectedNotification}
                      onDismiss={handleDismissDetail}
                    />
                  ) : (
                    <NotificationDetailCard
                      notification={selectedNotification}
                      csvData={csvData}
                      centerDetails={centerDetails}
                      employmentAttachments={employmentAttachments}
                      onReview={() => {
                        // Navigation is handled in the component
                      }}
                      onDismiss={handleDismissDetail}
                    />
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <div className="bg-white rounded-lg border border-border p-8">
              <div className="text-center">
                <XMarkIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Requests Feature Coming Soon
                </h3>
                <p className="text-muted-foreground">
                  This feature is under development and will be available soon.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Past Requests Tab - Partners only */}
          {isPartner && (
            <TabsContent value="past-requests">
              <PartnerPastRequestsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default InboxPage;
