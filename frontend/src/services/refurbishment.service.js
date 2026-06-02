import api from "../api/client";

/**
 * Refurbishment Service
 * Handles all refurbishment-related API calls for admin dashboard
 */
const refurbishmentService = {
  /**
   * Get all centers eligible for refurbishment
   * @param {Object} params - Query parameters { limit, offset }
   * @returns {Promise<Object>} - { success, data: { centers, pagination, totalCount } }
   */
  getEligibleCenters: async (params = {}) => {
    try {
      const { limit = 10, offset = 0 } = params;
      const response = await api.get("/admin/refurbishment/eligible-centers", {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching eligible centers:", error);
      throw error;
    }
  },

  /**
   * Get all active centers with eligibility status
   * @param {Object} params - Query parameters { limit, offset, region }
   * @returns {Promise<Object>} - { success, data: Array of centers with calculated eligibility }
   */
  getAllCenters: async (params = {}) => {
    try {
      const { limit = 50, offset = 0, region } = params;

      // Use correct /all-centers endpoint
      const response = await api.get("/admin/refurbishment/all-centers", {
        params: { limit, offset },
      });

      if (response.data?.success) {
        let centers = response.data.data?.centers || [];

        // Calculate years since establishment for display
        const currentYear = new Date().getFullYear();
        centers = centers.map((center) => {
          const establishedYear = center.year_of_establishment || 0;
          const yearsSinceEstablishment = currentYear - establishedYear;

          // Use backend's is_eligible flag and add display tiers
          let refurbishmentEligibility = "Not eligible";
          let refurbishmentCount = 0;

          if (yearsSinceEstablishment >= 14) {
            refurbishmentEligibility = "4th Refurbishment";
            refurbishmentCount = 4;
          } else if (yearsSinceEstablishment >= 11) {
            refurbishmentEligibility = "3rd Refurbishment";
            refurbishmentCount = 3;
          } else if (yearsSinceEstablishment >= 8) {
            refurbishmentEligibility = "2nd Refurbishment";
            refurbishmentCount = 2;
          } else if (yearsSinceEstablishment >= 5) {
            refurbishmentEligibility = "1st Refurbishment";
            refurbishmentCount = 1;
          }

          return {
            ...center,
            years_since_establishment: yearsSinceEstablishment,
            refurbishment_eligibility: refurbishmentEligibility,
            refurbishment_count: refurbishmentCount,
          };
        });

        // Filter by region if provided
        if (region) {
          centers = centers.filter((c) => c.region === region);
        }

        // Return with pagination info from backend
        return {
          success: true,
          data: {
            centers,
            totalCount: response.data.data?.totalCount || centers.length,
            eligibleCount: response.data.data?.eligibleCount || 0,
            ineligibleCount: response.data.data?.ineligibleCount || 0,
            pagination: response.data.data?.pagination || {},
          },
        };
      }

      return { success: false, data: { centers: [], totalCount: 0 } };
    } catch (error) {
      console.error("Error fetching all centers:", error);
      // Return empty data instead of throwing to prevent UI crashes
      return { success: false, data: { centers: [], totalCount: 0 }, error };
    }
  },

  /**
   * Get recently refurbished centers
   * @param {Object} params - Query parameters { limit, offset, within }
   * @returns {Promise<Object>} - { success, data: { centers, pagination, totalCount } }
   */
  getRecentlyRefurbished: async (params = {}) => {
    try {
      const { limit = 10, offset = 0, within = 12 } = params;
      const response = await api.get(
        "/admin/refurbishment/recently-refurbished",
        {
          params: { limit, offset, within },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching recently refurbished centers:", error);
      throw error;
    }
  },

  /**
   * Get last refurbished centers (Overview Tab - Card 2)
   * @param {Object} params - Query parameters { year, limit, offset }
   * @returns {Promise<Object>} - { success, data: Array of centers }
   */
  getLastRefurbished: async (params = {}) => {
    try {
      const { year, limit = 50, offset = 0 } = params;

      // Use correct /recently-refurbished endpoint with proper validation
      const response = await api.get(
        "/admin/refurbishment/recently-refurbished",
        {
          params: {
            limit: Math.min(limit, 100), // Respect backend limit (max 100)
            offset,
            within: 36, // Get centers refurbished in last 36 months
          },
        },
      );

      if (response.data?.success) {
        let centers = response.data.data?.centers || [];

        // Filter by year if provided (client-side filter for year)
        if (year) {
          centers = centers.filter((center) => {
            const refurbYear = new Date(
              center.last_refurbishment_date,
            ).getFullYear();
            return refurbYear === parseInt(year);
          });
        }

        return {
          success: true,
          data: centers,
          totalCount: response.data.data?.totalCount || centers.length,
        };
      }

      return { success: true, data: [], totalCount: 0 };
    } catch (error) {
      console.error("Error fetching last refurbished centers:", error);
      return { success: true, data: [], totalCount: 0 }; // Return empty array instead of throwing
    }
  },

  /**
   * Get dashboard summary with aggregated statistics
   * @param {Object} params - Query parameters { recentlyRefurbishedWithin }
   * @returns {Promise<Object>} - { success, data: { eligibleCenters, recentlyRefurbished, allCentersSummary } }
   * - eligibleCenters: { centers: [], totalCount: number }
   * - recentlyRefurbished: { centers: [], totalCount: number, withinMonths: number }
   * - allCentersSummary: { totalCount: number, eligibleCount: number, ineligibleCount: number }
   */
  getDashboardSummary: async (params = {}) => {
    try {
      const { recentlyRefurbishedWithin = 12 } = params;
      const response = await api.get("/admin/refurbishment/dashboard", {
        params: { recentlyRefurbishedWithin },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw error;
    }
  },

  /**
   * Get eligibility details for a specific center
   * @param {string} centerId - Center UUID
   * @returns {Promise<Object>} - { success, data: { centerDetails, eligibilityDetails } }
   */
  getCenterEligibility: async (centerId) => {
    try {
      const response = await api.get(
        `/admin/refurbishment/centers/${centerId}/eligibility`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching center eligibility:", error);
      throw error;
    }
  },

  // ============================================
  // NEW APIS (Phase 100 - Jan 2026)
  // ============================================

  /**
   * Get year statistics for summary cards
   * @param {number} year - Year (2020-2024)
   * @returns {Promise<Object>} - { success, data: { year, totalRefurbished } }
   */
  getYearStats: async (year) => {
    try {
      const response = await api.get(`/admin/refurbishment/stats/year/${year}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching year stats:", error);
      throw error;
    }
  },

  /**
   * Get all refurbishment packages for modal
   * @returns {Promise<Object>} - { success, data: Array of packages }
   */
  getPackages: async (params = {}) => {
    try {
      const { category } = params;
      const queryParams = {};
      if (category) queryParams.category = category;
      const response = await api.get("/admin/refurbishment/packages", {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching packages:", error);
      throw error;
    }
  },

  /**
   * Get alert/notification history (Tab 3)
   * @param {Object} params - { limit, offset }
   * @returns {Promise<Object>} - { success, data: { alerts, pagination } }
   */
  getAlerts: async (params = {}) => {
    try {
      const { limit = 50, offset = 0 } = params;
      const response = await api.get("/admin/refurbishment/alerts", {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching alerts:", error);
      throw error;
    }
  },

  /**
   * Get count of unread refurbishment alerts for admin sidebar badge
   * @returns {Promise<number>} - unread count
   */
  getAlertsUnreadCount: async () => {
    try {
      const response = await api.get("/admin/refurbishment/alerts", {
        params: { status: "unread", limit: 1, offset: 0 },
      });
      return response.data?.data?.totalCount || 0;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Get active refurbishment requests (Tab 4)
   * @param {Object} params - { limit, offset }
   * @returns {Promise<Object>} - { success, data: { requests, pagination } }
   */
  getActiveRequests: async (params = {}) => {
    try {
      const { limit = 50, offset = 0 } = params;
      const response = await api.get("/admin/refurbishment/requests", {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching active requests:", error);
      throw error;
    }
  },

  /**
   * Get past refurbishment requests (Tab 5)
   * @param {Object} params - { year, limit, offset }
   * @returns {Promise<Object>} - { success, data: { requests, pagination } }
   */
  getPastRequests: async (params = {}) => {
    try {
      const {
        year = new Date().getFullYear(),
        limit = 50,
        offset = 0,
      } = params;
      const response = await api.get("/admin/refurbishment/past-requests", {
        params: { year, limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching past requests:", error);
      throw error;
    }
  },

  /**
   * Send notification to partner (Bell icon action)
   * @param {Object} data - { centerId, partnerId, message }
   * @returns {Promise<Object>} - { success, message }
   */
  notifyPartner: async (data) => {
    try {
      const response = await api.post("/admin/refurbishment/notify", data);
      return response.data;
    } catch (error) {
      console.error("Error notifying partner:", error);
      throw error;
    }
  },

  /**
   * Create new refurbishment request with packages
   * @param {Object} data - { partnerId, centerId, reason, description, packages: [{ packageId, quantity }] }
   * @returns {Promise<Object>} - { success, data: { requestId } }
   */
  createRequest: async (data) => {
    try {
      const response = await api.post(
        "/admin/refurbishment/create-request",
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Error creating request:", error);
      throw error;
    }
  },

  /**
   * Export eligible centers to CSV
   * @param {Object} params - Query parameters (filters, sort, search)
   * @returns {Promise<Blob>} - CSV file blob
   */
  exportEligibleCenters: async (params = {}) => {
    try {
      const response = await api.get(
        "/admin/refurbishment/eligible-centers/export",
        {
          params,
          responseType: "blob",
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error exporting eligible centers:", error);
      throw error;
    }
  },

  /**
   * Export active requests to CSV
   * @param {Object} params - Query parameters (filters, sort, search)
   * @returns {Promise<Blob>} - CSV file blob
   */
  exportActiveRequests: async (params = {}) => {
    try {
      const response = await api.get(
        "/admin/refurbishment/active-requests/export",
        {
          params,
          responseType: "blob",
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error exporting active requests:", error);
      throw error;
    }
  },

  /**
   * Export past requests to CSV
   * @param {Object} params - Query parameters (filters, sort, search, year)
   * @returns {Promise<Blob>} - CSV file blob
   */
  exportPastRequests: async (params = {}) => {
    try {
      const response = await api.get(
        "/admin/refurbishment/past-requests/export",
        {
          params,
          responseType: "blob",
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error exporting past requests:", error);
      throw error;
    }
  },

  // ===== SCHEDULED NOTIFICATIONS API =====

  /**
   * Create a scheduled refurbishment notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>} - Created notification
   */
  createScheduledNotification: async (data) => {
    try {
      const response = await api.post(
        "/admin/refurbishment/schedule-notification",
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Error creating scheduled notification:", error);
      throw error;
    }
  },

  /**
   * Get all scheduled notifications with filters
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - List of scheduled notifications
   */
  getScheduledNotifications: async (params = {}) => {
    try {
      const response = await api.get(
        "/admin/refurbishment/scheduled-notifications",
        {
          params,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching scheduled notifications:", error);
      throw error;
    }
  },

  /**
   * Get a single scheduled notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} - Notification details
   */
  getScheduledNotificationById: async (id) => {
    try {
      const response = await api.get(
        `/admin/refurbishment/scheduled-notifications/${id}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching scheduled notification:", error);
      throw error;
    }
  },

  /**
   * Update a scheduled notification
   * @param {string} id - Notification ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated notification
   */
  updateScheduledNotification: async (id, updates) => {
    try {
      const response = await api.patch(
        `/admin/refurbishment/scheduled-notifications/${id}`,
        updates,
      );
      return response.data;
    } catch (error) {
      console.error("Error updating scheduled notification:", error);
      throw error;
    }
  },

  /**
   * Toggle auto-send ON/OFF for a scheduled notification
   * @param {string} id - Notification ID
   * @param {boolean} enabled - True to enable, false to pause
   * @returns {Promise<Object>} - Updated notification
   */
  toggleAutoSend: async (id, enabled) => {
    try {
      const response = await api.patch(
        `/admin/refurbishment/scheduled-notifications/${id}/toggle`,
        {
          enabled,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error toggling auto-send:", error);
      throw error;
    }
  },

  /**
   * Cancel a scheduled notification
   * @param {string} id - Notification ID
   * @param {boolean} hardDelete - True to permanently delete
   * @returns {Promise<Object>} - Cancelled notification
   */
  cancelScheduledNotification: async (id, hardDelete = false) => {
    try {
      const response = await api.delete(
        `/admin/refurbishment/scheduled-notifications/${id}`,
        {
          params: { hardDelete },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error cancelling scheduled notification:", error);
      throw error;
    }
  },

  /**
   * Get execution history for a scheduled notification
   * @param {string} id - Notification ID
   * @param {number} limit - Max number of records
   * @returns {Promise<Object>} - Execution history
   */
  getExecutionHistory: async (id, limit = 50) => {
    try {
      const response = await api.get(
        `/admin/refurbishment/scheduled-notifications/${id}/history`,
        {
          params: { limit },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching execution history:", error);
      throw error;
    }
  },

  // ===== PACKAGES MANAGEMENT API =====

  /**
   * Create a new refurbishment package
   * @param {FormData} data - Package data with images
   * @returns {Promise<Object>} - Created package
   */
  createPackage: async (data) => {
    try {
      const response = await api.post("/admin/refurbishment/packages", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating package:", error);
      throw error;
    }
  },

  /**
   * Update a refurbishment package
   * @param {string} id - Package ID
   * @param {FormData} updates - Fields to update with images
   * @returns {Promise<Object>} - Updated package
   */
  updatePackage: async (id, updates) => {
    try {
      const response = await api.put(
        `/admin/refurbishment/packages/${id}`,
        updates,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error updating package:", error);
      throw error;
    }
  },

  /**
   * Delete a refurbishment package
   * @param {string} id - Package ID
   * @returns {Promise<Object>} - Deletion result
   */
  deletePackage: async (id) => {
    try {
      const response = await api.delete(`/admin/refurbishment/packages/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting package:", error);
      throw error;
    }
  },

  /* ==================== ADMIN WORKFLOW API METHODS ==================== */

  /**
   * Get refurbishment request details for admin review
   * @param {string} requestId - Refurbishment request UUID
   * @returns {Promise<Object>} - Complete request details with partner selections, images, etc.
   */
  getRefurbishmentRequestForReview: async (requestId) => {
    try {
      const response = await api.get(
        `/admin/refurbishment/requests/${requestId}/review`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching refurbishment request for review:", error);
      throw error;
    }
  },

  /**
   * Get all pending review requests (for badge count)
   * @param {Object} params - Query parameters { status, limit, offset }
   * @returns {Promise<Object>} - List of pending requests with total count
   */
  getPendingReviewRequests: async (params = {}) => {
    try {
      const { status = "submitted", limit = 50, offset = 0 } = params;
      const response = await api.get(
        "/admin/refurbishment/requests/pending-review",
        {
          params: { status, limit, offset },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching pending review requests:", error);
      throw error;
    }
  },

  /**
   * Admin adds additional packages to refurbishment request
   * @param {string} requestId - Refurbishment request UUID
   * @param {Array} selectedPackages - Array of {course_id, package_id, quantity}
   * @returns {Promise<Object>} - Success response
   */
  addAdminPackages: async (requestId, selectedPackages) => {
    try {
      const response = await api.post(
        `/admin/refurbishment/requests/${requestId}/admin-packages`,
        {
          selectedPackages,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error adding admin packages:", error);
      throw error;
    }
  },

  /**
   * Get available upgradation packages for a request's center (course-filtered)
   * plus the current admin selections.
   * @param {string} requestId - Refurbishment request UUID
   * @returns {Promise<Object>} - { available_packages, admin_selected_ids }
   */
  getUpgradationPackagesForRequest: async (requestId) => {
    try {
      const response = await api.get(
        `/admin/refurbishment/requests/${requestId}/upgradation-packages`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching upgradation packages for request:", error);
      throw error;
    }
  },

  /**
   * Save admin's upgradation package selections for a request.
   * @param {string} requestId  - Refurbishment request UUID
   * @param {Object} data       - { packageIds: string[], notes?: Record<string,string> }
   * @returns {Promise<Object>} - { success, packages_saved }
   */
  saveAdminUpgradationPackages: async (requestId, data) => {
    try {
      const response = await api.post(
        `/admin/refurbishment/requests/${requestId}/upgradation-packages`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Error saving admin upgradation packages:", error);
      throw error;
    }
  },

  /**
   * Admin approves refurbishment request
   * @param {string} requestId - Refurbishment request UUID
   * @param {string} adminRemarks - Optional remarks
   * @param {Object} modifications - Optional package modifications { adminAddedPackages, removedPackageIds }
   * @returns {Promise<Object>} - Success response
   */
  approveRefurbishmentRequest: async (
    requestId,
    adminRemarks = null,
    modifications = {},
  ) => {
    try {
      const response = await api.put(
        `/admin/refurbishment/requests/${requestId}/approve`,
        {
          adminRemarks,
          adminAddedPackages: modifications.adminAddedPackages || [],
          removedPackageIds: modifications.removedPackageIds || [],
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error approving refurbishment request:", error);
      throw error;
    }
  },

  /**
   * Admin rejects refurbishment request
   * @param {string} requestId - Refurbishment request UUID
   * @param {string} rejectionReason - Reason for rejection (REQUIRED)
   * @returns {Promise<Object>} - Success response
   */
  rejectRefurbishmentRequest: async (requestId, rejectionReason) => {
    try {
      const response = await api.put(
        `/admin/refurbishment/requests/${requestId}/reject`,
        {
          rejectionReason,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error rejecting refurbishment request:", error);
      throw error;
    }
  },

  /**
   * Admin starts refurbishment work
   * @param {string} requestId - Refurbishment request UUID
   * @returns {Promise<Object>} - Success response
   */
  startRefurbishment: async (requestId) => {
    try {
      const response = await api.put(
        `/admin/refurbishment/requests/${requestId}/start`,
      );
      return response.data;
    } catch (error) {
      console.error("Error starting refurbishment:", error);
      throw error;
    }
  },

  /**
   * Upload completion images to S3
   * @param {string} requestId - Refurbishment request UUID
   * @param {FormData} formData - FormData object with 'images' field containing image files
   * @returns {Promise<Object>} - { success, data: { images, count } }
   */
  uploadCompletionImages: async (requestId, formData) => {
    try {
      const response = await api.post(
        `/admin/refurbishment/requests/${requestId}/upload-completion-images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error uploading completion images:", error);
      throw error;
    }
  },

  /**
   * Admin marks refurbishment as completed
   * @param {string} requestId - Refurbishment request UUID
   * @param {Object} completionData - { completion_statement, completion_date, completion_images }
   * @returns {Promise<Object>} - Success response
   */
  completeRefurbishment: async (requestId, completionData) => {
    try {
      const response = await api.put(
        `/admin/refurbishment/requests/${requestId}/complete`,
        completionData,
      );
      return response.data;
    } catch (error) {
      console.error("Error completing refurbishment:", error);
      throw error;
    }
  },

  /**
   * Admin advances lifecycle status (approved → material_procurement → installation_in_progress)
   * @param {string} requestId
   * @param {string} status - new status
   */
  updateRequestStatus: async (requestId, status) => {
    try {
      const response = await api.patch(
        `/admin/refurbishment/requests/${requestId}/status`,
        { status },
      );
      return response.data;
    } catch (error) {
      console.error("Error updating refurbishment status:", error);
      throw error;
    }
  },

  /**
   * Get partner's past (actioned) refurbishment requests
   * @param {{ limit?: number, offset?: number }} params
   */
  getPartnerPastRequests: async (params = {}) => {
    try {
      const { limit = 20, offset = 0 } = params;
      const response = await api.get("/partner/refurbishment/past-requests", {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching partner past requests:", error);
      throw error;
    }
  },

  /**
   * Partner submits completion evidence after 2-month notification
   * @param {string} requestId
   * @param {{ description: string, fileUrls: Array }} data
   */
  submitPartnerCompletion: async (requestId, data) => {
    try {
      const response = await api.post(
        `/partner/refurbishment/requests/${requestId}/partner-completion`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error("Error submitting partner completion:", error);
      throw error;
    }
  },

  /**
   * Get full details of a partner's submitted refurbishment request
   * Returns partner-selected packages, justifications, uploaded images and upgradation details
   * @param {string} requestId - refurbishment_requests.id (UUID)
   */
  getPartnerRequestDetails: async (requestId) => {
    try {
      const response = await api.get(
        `/partner/refurbishment/requests/${requestId}/details`,
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching partner request details:", error);
      throw error;
    }
  },

  /**
   * Get partner's own active requests list
   * @param {{ limit?: number, offset?: number, status?: string }} params
   */
  getPartnerRequests: async (params = {}) => {
    try {
      const { limit = 10, offset = 0, status } = params;
      const response = await api.get("/partner/refurbishment/requests", {
        params: { limit, offset, ...(status && { status }) },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching partner requests:", error);
      throw error;
    }
  },

  /**
   * Get a presigned PUT URL for direct S3 upload from the browser.
   * @param {{ fileName: string, fileType: string, folder?: string }} params
   * @returns {{ uploadUrl: string, fileUrl: string, key: string }}
   */
  generateUploadUrl: async ({ fileName, fileType, folder }) => {
    try {
      const response = await api.post("/partner/refurbishment/upload-url", {
        fileName,
        fileType,
        folder,
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error("Error generating upload URL:", error);
      throw error;
    }
  },
};

export default refurbishmentService;
