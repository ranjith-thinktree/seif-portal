import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";
import {
  resolvePartnerFileUrl,
  getRefurbishmentStatusLabel,
  getRefurbishmentStatusBadgeClass,
  isPartnerImageFile,
} from "../../../utils/refurbishmentUtils";

const REJECTION_REASONS = [
  "Budget constraints",
  "Incomplete documentation",
  "Not eligible for this cycle",
  "Items already covered",
  "Other",
];

const PartnerUploadTile = ({ item, showDownload = true }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [activeSrc, setActiveSrc] = useState("");
  const rawUrl = item?.url || item?.file_url;
  const resolvedUrl = resolvePartnerFileUrl(rawUrl);
  const name = item?.name || item?.file_name || "Upload";

  const fallbackSrc = React.useMemo(() => {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      try {
        const parsed = new URL(rawUrl);
        if (parsed.pathname.startsWith("/uploads/")) {
          return parsed.pathname;
        }
      } catch {
        return "";
      }
    }
    return "";
  }, [rawUrl]);

  React.useEffect(() => {
    setImageFailed(false);
    setActiveSrc(resolvedUrl || fallbackSrc);
  }, [resolvedUrl, fallbackSrc]);

  if (!activeSrc && !resolvedUrl) return null;

  const displaySrc = activeSrc || resolvedUrl;
  const showImage =
    isPartnerImageFile({ ...item, url: displaySrc }) && !imageFailed;

  const handleImageError = () => {
    if (fallbackSrc && displaySrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
      return;
    }
    setImageFailed(true);
  };

  return (
    <div className="w-[148px] border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-green-300 hover:shadow-sm transition-all">
      <a
        href={displaySrc}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={`Open ${name}`}
      >
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {showImage ? (
            <img
              src={displaySrc}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={handleImageError}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 p-3 text-gray-400">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-[10px] font-medium">File</span>
            </div>
          )}
        </div>
      </a>
      <div className="px-2.5 py-2 border-t border-gray-100 space-y-1.5">
        <p className="text-[10px] text-gray-600 truncate" title={name}>
          {name}
        </p>
        {showDownload && (
          <a
            href={displaySrc}
            download={name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 hover:text-green-800"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </a>
        )}
      </div>
    </div>
  );
};

/**
 * AdminRefurbishmentReviewModal
 * Figma-matched layout:
 *  - Course pill tabs
 *  - Left: partner packages + admin-added + inline add-more expander
 *  - Right: request info card
 *  - Reject opens a separate "Refurbishment remark" modal
 */
const AdminRefurbishmentReviewModal = ({
  open,
  onOpenChange,
  requestId,
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [allPackages, setAllPackages] = useState([]);

  // Active course pill tab
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);

  // Top-level review tab: 'courses' | 'upgradation'
  const [activeReviewTab, setActiveReviewTab] = useState("courses");

  // Admin-added packages: { [courseId]: Set<packageId> }
  const [adminAdded, setAdminAdded] = useState({});

  // Partner packages removed by admin: { [courseId]: Set<packageId> }
  const [partnerRemoved, setPartnerRemoved] = useState({});

  // Upgradation packages management (mirrors course package review UX)
  const [upgradationPackages, setUpgradationPackages] = useState([]);
  const [adminUpgradationAdded, setAdminUpgradationAdded] = useState(new Set());
  const [partnerUpgradationRemoved, setPartnerUpgradationRemoved] = useState(
    new Set(),
  );
  const [showUpgradationAddPanel, setShowUpgradationAddPanel] = useState(false);
  const [upgradationPkgLoading, setUpgradationPkgLoading] = useState(false);
  const [upgradationSaving, setUpgradationSaving] = useState(false);

  // Selected package for detail panel (courseId:packageId)
  const [selectedPartnerPackageKey, setSelectedPartnerPackageKey] =
    useState(null);
  const [selectedUpgradationPackageId, setSelectedUpgradationPackageId] =
    useState(null);

  // Toggle inline add-packages panel
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [remarkMode, setRemarkMode] = useState("reject");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveSuccess, setApproveSuccess] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, pkgRes] = await Promise.all([
        refurbishmentService.getRefurbishmentRequestForReview(requestId),
        refurbishmentService.getPackages({ category: "refurbishment" }),
      ]);
      const details = reqRes.data;
      setRequestDetails(details);
      setAllPackages(pkgRes.data?.packages || []);
    } catch (err) {
      console.error("Error loading request:", err);
      setFetchError(
        err.response?.data?.message || "Failed to load request details",
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  // Fetch upgradation packages for this request (lazy – only when upgradation tab opened)
  const fetchUpgradationPackages = useCallback(async () => {
    if (!requestId) return;
    setUpgradationPkgLoading(true);
    try {
      const res =
        await refurbishmentService.getUpgradationPackagesForRequest(requestId);
      const data = res.data || {};
      setUpgradationPackages(data.available_packages || []);
      const partnerIds = new Set(
        (requestDetails?.upgradation?.selected_packages || []).map(
          (p) => p.package_id,
        ),
      );
      const adminIds = data.admin_selected_ids || [];
      setAdminUpgradationAdded(
        new Set(adminIds.filter((id) => !partnerIds.has(id))),
      );
      setPartnerUpgradationRemoved(new Set());
    } catch (err) {
      console.error("Error loading upgradation packages:", err);
      toast.error("Failed to load upgradation packages");
    } finally {
      setUpgradationPkgLoading(false);
    }
  }, [requestId, requestDetails?.upgradation?.selected_packages]);

  useEffect(() => {
    if (open && requestId) {
      setFetchError(null);
      fetchDetails();
    } else {
      setRequestDetails(null);
      setAllPackages([]);
      setFetchError(null);
      setActiveCourseIdx(0);
      setActiveReviewTab("courses");
      setAdminAdded({});
      setPartnerRemoved({});
      setShowAddPanel(false);
      setRejectOpen(false);
      setRemarkMode("reject");
      setRejectReason("");
      setRejectRemark("");
      setUpgradationPackages([]);
      setAdminUpgradationAdded(new Set());
      setPartnerUpgradationRemoved(new Set());
      setShowUpgradationAddPanel(false);
      setSelectedPartnerPackageKey(null);
      setSelectedUpgradationPackageId(null);
    }
  }, [open, requestId, fetchDetails]);

  // Lazy-load upgradation packages when admin switches to upgradation tab
  useEffect(() => {
    if (
      activeReviewTab === "upgradation" &&
      upgradationPackages.length === 0 &&
      requestId
    ) {
      fetchUpgradationPackages();
    }
  }, [
    activeReviewTab,
    upgradationPackages.length,
    requestId,
    fetchUpgradationPackages,
  ]);

  // Reset add panels on tab change
  useEffect(() => {
    setShowAddPanel(false);
    setShowUpgradationAddPanel(false);
    setSelectedPartnerPackageKey(null);
  }, [activeCourseIdx, activeReviewTab]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const parseImages = (str) => {
    if (!str || str === "null") return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  const getMediaUrl = (item) => {
    if (!item) return null;
    if (typeof item === "string") return resolvePartnerFileUrl(item);
    return resolvePartnerFileUrl(item.url || item.file_url || null);
  };

  const normalizeGalleryItems = (images) =>
    (images || [])
      .map((img, idx) => {
        if (typeof img === "string") {
          const url = resolvePartnerFileUrl(img);
          if (!url) return null;
          return { url, name: `Image ${idx + 1}` };
        }
        const rawUrl = img?.url || img?.file_url;
        const url = resolvePartnerFileUrl(rawUrl);
        if (!url) return null;
        return {
          id: img.id,
          url,
          name: img.name || img.file_name || `Image ${idx + 1}`,
          type: img.type || img.file_mime_type,
        };
      })
      .filter(Boolean);

  const getCatalogImageUrl = (pkg) => {
    if (!pkg?.images) return null;
    const imgs = Array.isArray(pkg.images)
      ? pkg.images
      : parseImages(pkg.images);
    const raw = imgs[0];
    if (!raw) return null;
    if (typeof raw === "string") return raw;
    return raw.url || raw.file_url || null;
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const fmtDateTime = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  // ── Approve ─────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setLoading(true);
    try {
      // Collect admin-added packages across ALL courses
      const adminAddedPackages = [];
      Object.entries(adminAdded).forEach(([courseId, pkgSet]) => {
        pkgSet.forEach((pkgId) =>
          adminAddedPackages.push({ packageId: pkgId, courseId }),
        );
      });

      // Collect partner-removed packages across ALL courses
      const removedPackageIds = [];
      Object.entries(partnerRemoved).forEach(([courseId, pkgSet]) => {
        pkgSet.forEach((pkgId) =>
          removedPackageIds.push({ packageId: pkgId, courseId }),
        );
      });

      const modifications = {
        adminAddedPackages,
        removedPackageIds,
      };

      if (requestDetails?.upgradation?.is_requested) {
        const partnerUpgradationIds = (
          requestDetails?.upgradation?.selected_packages || []
        )
          .map((p) => p.package_id)
          .filter((id) => !partnerUpgradationRemoved.has(id));
        modifications.finalUpgradationPackageIds = [
          ...new Set([
            ...partnerUpgradationIds,
            ...Array.from(adminUpgradationAdded),
          ]),
        ];
      }

      await refurbishmentService.approveRefurbishmentRequest(
        requestId,
        null,
        modifications,
      );
      // Show in-dialog success screen; callback fires when user closes
      setApproveSuccess(true);
    } catch (err) {
      console.error("Error approving:", err);
      toast.error(err.response?.data?.message || "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSuccessClose = () => {
    onOpenChange(false);
    try {
      onActionComplete?.();
    } catch (cbErr) {
      console.error("onActionComplete error:", cbErr);
    }
  };

  // ── Reject submit (from remark modal) ───────────────────────────────────
  const handleRejectSubmit = async () => {
    if (!rejectReason) {
      toast.error("Please select a reason");
      return;
    }
    setRejectLoading(true);
    try {
      const fullReason = rejectRemark
        ? `${rejectReason}: ${rejectRemark}`
        : rejectReason;
      if (remarkMode === "send_back") {
        await refurbishmentService.sendBackRefurbishmentRequest(
          requestId,
          fullReason,
        );
        toast.success("Request sent back to partner");
      } else {
        await refurbishmentService.rejectRefurbishmentRequest(
          requestId,
          fullReason,
        );
        toast.success("Request rejected");
      }
      setRejectOpen(false);
      onOpenChange(false);
      try {
        onActionComplete?.();
      } catch (cbErr) {
        console.error("onActionComplete error:", cbErr);
      }
    } catch (err) {
      console.error(
        remarkMode === "send_back" ? "Error sending back:" : "Error rejecting:",
        err,
      );
      toast.error(
        err.response?.data?.message ||
          (remarkMode === "send_back"
            ? "Failed to send request back"
            : "Failed to reject request"),
      );
    } finally {
      setRejectLoading(false);
    }
  };

  // ── Partner package removal toggle (admin can remove partner-selected packages) ────
  const togglePartnerPackageRemoval = (courseId, packageId) => {
    setPartnerRemoved((prev) => {
      const current = new Set(prev[courseId] || []);
      if (current.has(packageId)) current.delete(packageId);
      else current.add(packageId);
      return { ...prev, [courseId]: new Set(current) };
    });
  };

  // ── Admin package toggle ─────────────────────────────────────────────────
  const toggleAdminPackage = (courseId, packageId) => {
    setAdminAdded((prev) => {
      const current = new Set(prev[courseId] || []);
      if (current.has(packageId)) current.delete(packageId);
      else current.add(packageId);
      return { ...prev, [courseId]: new Set(current) };
    });
  };

  const toggleUpgradationAdminPackage = (packageId) => {
    setAdminUpgradationAdded((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };

  const togglePartnerUpgradationRemoval = (packageId) => {
    setPartnerUpgradationRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };

  const handleSaveUpgradationPackages = async () => {
    setUpgradationSaving(true);
    try {
      const partnerIds = (requestDetails?.upgradation?.selected_packages || [])
        .map((p) => p.package_id)
        .filter((id) => !partnerUpgradationRemoved.has(id));
      const packageIds = [
        ...new Set([...partnerIds, ...Array.from(adminUpgradationAdded)]),
      ];
      await refurbishmentService.saveAdminUpgradationPackages(requestId, {
        packageIds,
      });
      toast.success("Upgradation package selections saved");
    } catch (err) {
      console.error("Error saving upgradation packages:", err);
      toast.error(
        err.response?.data?.message || "Failed to save upgradation packages",
      );
    } finally {
      setUpgradationSaving(false);
    }
  };

  if (loading && !requestDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl" aria-describedby={undefined}>
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (fetchError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Error</DialogTitle>
          <div className="flex flex-col items-center justify-center gap-4 py-10 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <svg
                className="h-7 w-7 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                Request Not Found
              </p>
              <p className="text-sm text-gray-500 mt-1">{fetchError}</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="mt-2 px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!requestDetails) return null;

  const {
    request,
    partner_packages_by_course = [],
    status_timeline = null,
    completion_summary = null,
    upgradation = {
      is_requested: false,
      rooms: [],
      selected_packages: [],
      admin_selected_packages: [],
    },
  } = requestDetails;

  const courseTabs = partner_packages_by_course;
  const activeCourse = courseTabs[activeCourseIdx];
  const activeCourseId = activeCourse?.course_id;

  // Only allow actions on submitted requests
  const isActionable = request.status === "submitted";
  const statusBadgeCls = getRefurbishmentStatusBadgeClass(request.status);

  // Partner package IDs for the active course
  const partnerPkgIds = new Set(
    (activeCourse?.packages || []).map((p) => p.package_id),
  );

  // Admin-added Set for active course
  const adminAddedSet = adminAdded[activeCourseId] || new Set();

  // Partner packages removed by admin for active course
  const partnerRemovedSet = partnerRemoved[activeCourseId] || new Set();

  // All packages for the active course.
  // Prefer packages explicitly linked to this course via courseIds; if the
  // package_courses table is empty or has no entries for this course, fall
  // back to showing every active package so the panel is never blank.
  const courseLinked = allPackages.filter(
    (p) => Array.isArray(p.courseIds) && p.courseIds.includes(activeCourseId),
  );
  const coursePackages = courseLinked.length > 0 ? courseLinked : allPackages;

  // Packages available to add (not already partner-selected)
  const addablePackages = coursePackages.filter(
    (p) => !partnerPkgIds.has(p.id),
  );

  // Admin-added package objects – look up from full allPackages list so
  // toggled items are always found even if courseIds filtered them out
  const adminAddedObjs = allPackages.filter((p) => adminAddedSet.has(p.id));

  const totalCount =
    (activeCourse?.packages?.length || 0) -
    partnerRemovedSet.size +
    adminAddedObjs.length;

  const partnerUpgradationPkgIds = new Set(
    (upgradation.selected_packages || []).map((p) => p.package_id),
  );
  const adminUpgradationAddedObjs = upgradationPackages.filter((p) =>
    adminUpgradationAdded.has(p.id),
  );
  const readonlyAdminUpgradationObjs = (
    upgradation.admin_selected_packages || []
  ).filter((p) => !partnerUpgradationPkgIds.has(p.package_id));
  const displayedAdminUpgradationObjs = isActionable
    ? adminUpgradationAddedObjs
    : readonlyAdminUpgradationObjs.length > 0
      ? readonlyAdminUpgradationObjs
      : adminUpgradationAddedObjs;
  const addableUpgradationPackages = upgradationPackages.filter(
    (p) => !partnerUpgradationPkgIds.has(p.id),
  );
  const upgradationTotalCount =
    (upgradation.selected_packages?.length || 0) -
    partnerUpgradationRemoved.size +
    displayedAdminUpgradationObjs.length;

  const selectedPartnerPackage = (() => {
    if (!selectedPartnerPackageKey) return null;
    const [courseId, packageId] = selectedPartnerPackageKey.split(":");
    const course = courseTabs.find((c) => c.course_id === courseId);
    return (
      course?.packages?.find((p) => p.package_id === packageId) || null
    );
  })();

  const selectedPartnerPackageCourseName = selectedPartnerPackageKey
    ? courseTabs.find(
        (c) => c.course_id === selectedPartnerPackageKey.split(":")[0],
      )?.course_name
    : null;

  const selectedUpgradationPackage = selectedUpgradationPackageId
    ? (upgradation.selected_packages || []).find(
        (p) => p.package_id === selectedUpgradationPackageId,
      )
    : null;

  const renderPartnerUploadGrid = (
    images,
    emptyLabel = "No partner uploads.",
    showDownload = true,
  ) => {
    const items = normalizeGalleryItems(images);
    if (!items.length) {
      return (
        <p className="text-sm text-gray-400 italic bg-gray-50 rounded-lg px-3 py-2">
          {emptyLabel}
        </p>
      );
    }
    return (
      <div className="flex flex-wrap gap-3">
        {items.map((item, idx) => (
          <PartnerUploadTile
            key={item.id || `${item.url}-${idx}`}
            item={item}
            showDownload={showDownload}
          />
        ))}
      </div>
    );
  };

  const renderImageGallery = (images, emptyLabel, showDownload = false) =>
    renderPartnerUploadGrid(images, emptyLabel, showDownload);

  const renderPackageDetailPanel = (pkg, { courseName, onClear, badge }) => {
    const catalogImgs = parseImages(pkg.images);
    const partnerUploads = pkg.partner_uploaded_images || [];
    return (
      <div className="flex-1 border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto scrollbar-subtle min-h-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              {courseName ? `${courseName} · ` : ""}Package review
            </p>
            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              {pkg.package_name || pkg.name}
            </h3>
            {badge && <div className="mt-1">{badge}</div>}
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 whitespace-nowrap"
            >
              ← Request overview
            </button>
          )}
        </div>

        {pkg.description && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Description
            </p>
            <p className="text-sm text-gray-600">{pkg.description}</p>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Partner justification
          </p>
          <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 min-h-[72px] text-sm text-gray-700">
            {pkg.justification?.trim()
              ? pkg.justification
              : "No justification provided."}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Partner uploaded images
            {partnerUploads.length > 0 && ` (${partnerUploads.length})`}
          </p>
          {renderPartnerUploadGrid(partnerUploads, "No partner uploads.")}
        </div>

        {catalogImgs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Package reference images
            </p>
            {renderImageGallery(
              catalogImgs.map((url, i) => ({
                url: getMediaUrl(url),
                name: `Reference ${i + 1}`,
              })),
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSummaryTab = () => {
    const hasPackageContent =
      courseTabs.some((c) => (c.packages || []).length > 0) ||
      (upgradation.is_requested &&
        ((upgradation.rooms || []).length > 0 ||
          (upgradation.selected_packages || []).length > 0));

    return (
      <div className="flex-1 overflow-y-auto px-8 pb-6 space-y-6 scrollbar-subtle min-h-0">
        {courseTabs.map((course) => (
          <section key={course.course_id} className="space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              {course.course_name}
            </p>
            {(course.packages || []).map((pkg, i) => (
              <div
                key={pkg.package_id || i}
                className="border border-gray-200 rounded-xl p-4 bg-white space-y-3"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {pkg.package_name}
                  </p>
                  {pkg.justification?.trim() && (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">
                      {pkg.justification.trim()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Partner uploads
                    {(pkg.partner_uploaded_images?.length || 0) > 0 &&
                      ` (${pkg.partner_uploaded_images.length})`}
                  </p>
                  {renderPartnerUploadGrid(
                    pkg.partner_uploaded_images || [],
                    "No partner uploads for this package.",
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}

        {upgradation.is_requested && (
          <section className="space-y-4 border-t border-gray-100 pt-6">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-widest">
              Upgradation
            </p>

            {(upgradation.rooms || []).map((room, idx) => (
              <div
                key={room.id || idx}
                className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3"
              >
                <p className="text-sm font-semibold text-gray-800">
                  Room {idx + 1}
                  {room.room_name ? ` · ${room.room_name}` : ""}
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs block">Length (ft)</span>
                    {room.length_feet ?? "—"}
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Breadth (ft)</span>
                    {room.breadth_feet ?? "—"}
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">Area (sq ft)</span>
                    {room.area_sqft ??
                      (Number(room.length_feet) > 0 && Number(room.breadth_feet) > 0
                        ? Number(room.length_feet) * Number(room.breadth_feet)
                        : "—")}
                  </div>
                </div>
                {room.justification && (
                  <p className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2">
                    {room.justification}
                  </p>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Partner room photos
                    {(room.photos?.length || 0) > 0 && ` (${room.photos.length})`}
                  </p>
                  {renderPartnerUploadGrid(
                    room.photos || [],
                    "No room photos uploaded.",
                  )}
                </div>
              </div>
            ))}

            {(upgradation.selected_packages || []).map((pkg, i) => (
              <div
                key={pkg.package_id || i}
                className="border border-gray-200 rounded-xl p-4 bg-white space-y-3"
              >
                <p className="text-sm font-bold text-gray-900">{pkg.package_name}</p>
                {pkg.justification?.trim() && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                    {pkg.justification.trim()}
                  </p>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Partner uploads
                    {(pkg.partner_uploaded_images?.length || 0) > 0 &&
                      ` (${pkg.partner_uploaded_images.length})`}
                  </p>
                  {renderPartnerUploadGrid(
                    pkg.partner_uploaded_images || [],
                    "No partner uploads for this package.",
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {!hasPackageContent && (
          <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center text-sm text-gray-400">
            No partner package uploads found for this request.
          </div>
        )}
      </div>
    );
  };

  const renderRequestInfoPanel = () => (
    <div className="flex-1 border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto scrollbar-subtle">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Date Submitted:
          </p>
          <p className="text-sm font-medium text-gray-800">
            {fmtDate(request.created_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Center Name:
          </p>
          <p className="text-sm font-medium text-gray-800">
            {request.center_name || "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Partner Name:
          </p>
          <p className="text-sm font-medium text-gray-800">
            {request.partner_name || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Status:
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusBadgeCls}`}
          >
            {getRefurbishmentStatusLabel(request.status)}
          </span>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Description
        </p>
        <div className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-gray-50 min-h-[60px]">
          {request.justification ||
            request.description ||
            "No description provided."}
        </div>
      </div>

      <p className="text-[10px] text-gray-400">
        Click a package on the left to view partner justification and uploaded
        images. Open Summary to see all package submissions at once.
      </p>
    </div>
  );

  const renderStatusTimelinePanel = () => {
    const events = status_timeline?.events || [];
    if (events.length === 0) return null;

    return (
      <div className="mx-8 mb-4 border border-gray-200 rounded-2xl p-5 bg-gray-50/60">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">Status Timeline</p>
          {status_timeline?.current_status_label && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRefurbishmentStatusBadgeClass(status_timeline.current_status)}`}
            >
              Current: {status_timeline.current_status_label}
            </span>
          )}
        </div>
        <div className="space-y-0">
          {events.map((event, idx) => (
            <div key={`${event.key}-${idx}`} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    event.is_current ? "bg-green-600 ring-4 ring-green-100" : "bg-gray-300"
                  }`}
                />
                {idx < events.length - 1 && (
                  <div className="w-px flex-1 min-h-[20px] bg-gray-200 mt-1" />
                )}
              </div>
              <div className={`pb-4 min-w-0 ${idx === events.length - 1 ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{event.label}</p>
                  <span className="text-xs text-gray-400">
                    {fmtDateTime(event.occurred_at)}
                  </span>
                </div>
                {event.detail && (
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed">
                    {event.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCompletionSummaryPanel = () => {
    if (
      !completion_summary?.admin &&
      !completion_summary?.partner &&
      !completion_summary?.completion_notified_at
    ) {
      return null;
    }

    return (
      <div className="mx-8 mb-4 border border-green-200 rounded-2xl p-5 bg-green-50/40">
        <p className="text-sm font-semibold text-gray-900 mb-4">Completion Summary</p>

        {completion_summary.completion_notified_at && (
          <div className="mb-4 text-xs text-gray-600">
            Partner notified for completion on{" "}
            <span className="font-medium text-gray-800">
              {fmtDateTime(completion_summary.completion_notified_at)}
            </span>
          </div>
        )}

        {completion_summary.partner && (
          <div className="mb-4 rounded-xl border border-white bg-white/80 p-4">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
              Partner Completion
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Submitted {fmtDateTime(completion_summary.partner.submitted_at)}
            </p>
            {completion_summary.partner.description && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {completion_summary.partner.description}
              </p>
            )}
            {completion_summary.partner.files?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {completion_summary.partner.files.map((file, idx) => (
                  <PartnerUploadTile key={file.id || idx} item={file} />
                ))}
              </div>
            )}
          </div>
        )}

        {completion_summary.admin && (
          <div className="rounded-xl border border-white bg-white/80 p-4">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
              Admin Completion
            </p>
            <p className="text-xs text-gray-500 mb-2">
              Marked complete {fmtDateTime(completion_summary.admin.completed_at)}
              {completion_summary.admin.completed_by_name
                ? ` by ${completion_summary.admin.completed_by_name}`
                : ""}
            </p>
            {completion_summary.admin.statement && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {completion_summary.admin.statement}
              </p>
            )}
            {completion_summary.admin.files?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {completion_summary.admin.files.map((file, idx) => (
                  <PartnerUploadTile key={file.id || idx} item={file} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── Main Review Modal ─────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-5xl w-full p-0 overflow-hidden rounded-2xl bg-white flex flex-col max-h-[92vh]"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Refurbishment Review</DialogTitle>

          {/* ── Approve Success Screen ───────────────────────────────────── */}
          {approveSuccess ? (
            <div className="flex flex-col items-center justify-center gap-6 py-20 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-green-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Request Approved!
                </h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
                  The partner has been notified and the refurbishment request
                  has been approved successfully.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleApproveSuccessClose}
                  className="px-8 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-8 pt-8 pb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Refurbishment Request – {request.partner_name || "Partner"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {request.center_name || "—"}
                </p>
              </div>

              {!isActionable && renderStatusTimelinePanel()}
              {!isActionable && renderCompletionSummaryPanel()}

              {/* Course pill tabs */}
              <div className="px-8 pb-4">
                <div className="inline-flex border border-gray-200 rounded-full p-1 bg-white gap-1">
                  {courseTabs.length === 0 && (
                    <span className="px-4 py-1.5 text-sm text-gray-400">
                      No courses
                    </span>
                  )}
                  {courseTabs.map((course, idx) => (
                    <button
                      key={course.course_id}
                      onClick={() => {
                        setActiveCourseIdx(idx);
                        setActiveReviewTab("courses");
                      }}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeReviewTab === "courses" && idx === activeCourseIdx
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {course.course_name}
                    </button>
                  ))}
                  {upgradation.is_requested && (
                    <button
                      onClick={() => {
                        setActiveReviewTab("upgradation");
                        setSelectedPartnerPackageKey(null);
                      }}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeReviewTab === "upgradation"
                          ? "bg-purple-100 text-purple-800"
                          : "text-gray-500 hover:text-purple-700"
                      }`}
                    >
                      Upgradation
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveReviewTab("summary");
                      setSelectedPartnerPackageKey(null);
                      setSelectedUpgradationPackageId(null);
                    }}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeReviewTab === "summary"
                        ? "bg-green-100 text-green-800"
                        : "text-gray-500 hover:text-green-700"
                    }`}
                  >
                    Summary
                  </button>
                </div>
              </div>

              {activeReviewTab === "summary" && renderSummaryTab()}

              {/* ── Upgradation Tab Content ─────────────────────────────── */}
              {activeReviewTab === "upgradation" && (
                <div className="flex gap-5 px-8 pb-6 flex-1 min-h-0 overflow-hidden">
                  <div className="w-[52%] flex flex-col gap-4 overflow-y-auto scrollbar-subtle">
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                        Room dimensions
                      </p>
                      {upgradation.rooms.length === 0 ? (
                        <div className="border border-dashed border-gray-200 rounded-xl py-6 text-center text-sm text-gray-400">
                          No upgradation room details submitted.
                        </div>
                      ) : (
                        upgradation.rooms.map((room, idx) => (
                          <div
                            key={room.id || idx}
                            className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3"
                          >
                            <p className="text-sm font-semibold text-gray-800">
                              Room {idx + 1}
                              {room.room_name ? `: ${room.room_name}` : ""}
                            </p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">
                                  Length (ft)
                                </span>
                                <span className="font-medium text-gray-800">
                                  {room.length_feet ?? "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">
                                  Breadth (ft)
                                </span>
                                <span className="font-medium text-gray-800">
                                  {room.breadth_feet ?? "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block mb-0.5">
                                  Area (sq ft)
                                </span>
                                <span className="font-medium text-gray-800">
                                  {room.area_sqft ??
                                    (Number(room.length_feet) > 0 &&
                                    Number(room.breadth_feet) > 0
                                      ? Number(room.length_feet) *
                                        Number(room.breadth_feet)
                                      : "—")}
                                </span>
                              </div>
                            </div>
                            {room.justification && (
                              <p className="text-sm text-gray-700 italic">
                                {room.justification}
                              </p>
                            )}
                            {room.photos?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                  Room photos
                                </p>
                                {renderPartnerUploadGrid(
                                  room.photos,
                                  "No room photos uploaded.",
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                          Package Selected
                          {upgradationTotalCount > 0 &&
                            ` (${upgradationTotalCount})`}
                        </p>
                        {isActionable && (
                          <button
                            onClick={handleSaveUpgradationPackages}
                            disabled={upgradationSaving}
                            className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {upgradationSaving ? "Saving…" : "Save Selections"}
                          </button>
                        )}
                      </div>

                      {upgradationPkgLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                        </div>
                      ) : (
                        <>
                          {upgradationTotalCount === 0 &&
                            !showUpgradationAddPanel && (
                              <div className="border border-dashed border-gray-200 rounded-xl py-10 text-center text-sm text-gray-400">
                                No upgradation packages selected
                              </div>
                            )}

                          {(upgradation.selected_packages || []).map(
                            (pkg, i) => {
                              const imgUrl = getCatalogImageUrl(pkg);
                              const uploadCount =
                                pkg.partner_uploaded_images?.length || 0;
                              const code = `PKG-${String(i + 1).padStart(2, "0")}`;
                              const isRemoved = partnerUpgradationRemoved.has(
                                pkg.package_id,
                              );
                              const isSelected =
                                selectedUpgradationPackageId === pkg.package_id;
                              return (
                                <div
                                  key={pkg.package_id || i}
                                  className={`border rounded-xl overflow-hidden transition-all ${
                                    isRemoved
                                      ? "border-red-200 bg-red-50/60 opacity-70"
                                      : isSelected
                                        ? "border-green-500 ring-2 ring-green-200 bg-green-50/30"
                                        : "border-gray-200 bg-white"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedUpgradationPackageId(
                                        pkg.package_id,
                                      )
                                    }
                                    className="w-full text-left p-4 flex justify-between gap-3"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <p
                                          className={`text-[11px] text-gray-400 ${isRemoved ? "line-through" : ""}`}
                                        >
                                          PKG ID:{" "}
                                          <span className="font-semibold text-gray-700">
                                            {code}
                                          </span>
                                        </p>
                                        {isRemoved ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">
                                            Removed by Admin
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                                            Partner Selected
                                          </span>
                                        )}
                                        {uploadCount > 0 && !isRemoved && (
                                          <span className="text-[10px] text-gray-400">
                                            {uploadCount} image
                                            {uploadCount !== 1 ? "s" : ""}
                                          </span>
                                        )}
                                      </div>
                                      <p
                                        className={`text-sm font-bold ${isRemoved ? "text-red-400 line-through" : "text-green-600"}`}
                                      >
                                        {pkg.package_name}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {pkg.description}
                                      </p>
                                      {pkg.justification?.trim() && !isRemoved && (
                                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">
                                          "{pkg.justification.trim()}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                      {imgUrl && !isRemoved && (
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                          <img
                                            src={imgUrl}
                                            alt={pkg.package_name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      <span className="text-[10px] text-green-600 font-medium">
                                        View details →
                                      </span>
                                    </div>
                                  </button>
                                  {isActionable && (
                                    <div className="px-4 pb-3 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          togglePartnerUpgradationRemoval(
                                            pkg.package_id,
                                          )
                                        }
                                        className={`text-[10px] font-medium transition-colors ${
                                          isRemoved
                                            ? "text-green-600 hover:text-green-800"
                                            : "text-red-400 hover:text-red-600"
                                        }`}
                                      >
                                        {isRemoved ? "↩ Restore" : "✕ Remove"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}

                          {displayedAdminUpgradationObjs.map((pkg, i) => {
                            const imgUrl = getCatalogImageUrl(pkg);
                            const code = `PKG-${String((upgradation.selected_packages?.length || 0) + i + 1).padStart(2, "0")}`;
                            const pkgId = pkg.id || pkg.package_id;
                            const pkgName = pkg.name || pkg.package_name;
                            return (
                              <div
                                key={pkgId}
                                className="border border-blue-200 rounded-xl p-4 bg-blue-50 flex justify-between gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[11px] text-gray-400">
                                      PKG ID:{" "}
                                      <span className="font-semibold text-gray-700">
                                        {code}
                                      </span>
                                    </p>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                                      Admin Added
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-blue-600">
                                    {pkgName}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {pkg.description}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  {imgUrl && (
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                      <img
                                        src={imgUrl}
                                        alt={pkgName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  {isActionable && (
                                    <button
                                      onClick={() =>
                                        toggleUpgradationAdminPackage(pkgId)
                                      }
                                      className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {isActionable && (
                            <>
                              <button
                                onClick={() =>
                                  setShowUpgradationAddPanel((v) => !v)
                                }
                                className={`w-full border border-dashed rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                  showUpgradationAddPanel
                                    ? "border-green-400 text-green-600 bg-green-50"
                                    : "border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600"
                                }`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={
                                      showUpgradationAddPanel
                                        ? "M20 12H4"
                                        : "M12 4v16m8-8H4"
                                    }
                                  />
                                </svg>
                                {showUpgradationAddPanel
                                  ? "Hide packages"
                                  : "Add other package"}
                              </button>

                              {showUpgradationAddPanel && (
                                <div className="flex flex-col gap-2 pt-1">
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                                    Available to add
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Upgradation and lab packages for this center
                                  </p>
                                  {addableUpgradationPackages.length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                                      No additional packages available to add
                                    </p>
                                  )}
                                  {addableUpgradationPackages.map((pkg) => {
                                    const imgUrl = getCatalogImageUrl(pkg);
                                    const isAdded = adminUpgradationAdded.has(
                                      pkg.id,
                                    );
                                    const isLabPackage =
                                      pkg.category === "refurbishment";
                                    return (
                                      <button
                                        key={pkg.id}
                                        onClick={() =>
                                          toggleUpgradationAdminPackage(pkg.id)
                                        }
                                        className={`w-full text-left border rounded-xl p-4 flex justify-between gap-3 transition-all ${
                                          isAdded
                                            ? "border-blue-400 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                                        }`}
                                      >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                          <div
                                            className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                              isAdded
                                                ? "bg-blue-600 border-blue-600"
                                                : "border-gray-300 bg-white"
                                            }`}
                                          >
                                            {isAdded && (
                                              <svg
                                                className="w-2.5 h-2.5 text-white"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={3}
                                                  d="M5 13l4 4L19 7"
                                                />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-sm font-semibold text-gray-800">
                                                {pkg.name || pkg.package_name}
                                              </p>
                                              <span
                                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                  isLabPackage
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-purple-100 text-purple-700"
                                                }`}
                                              >
                                                {isLabPackage ? "Lab" : "Upgradation"}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                              {pkg.description}
                                            </p>
                                          </div>
                                        </div>
                                        {imgUrl && (
                                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                            <img
                                              src={imgUrl}
                                              alt={pkg.name}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                    {selectedUpgradationPackage
                      ? renderPackageDetailPanel(selectedUpgradationPackage, {
                          courseName: "Upgradation",
                          onClear: () => setSelectedUpgradationPackageId(null),
                          badge: (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                              Partner Selected
                            </span>
                          ),
                        })
                      : renderRequestInfoPanel()}
                </div>
              )}

              {activeReviewTab === "courses" && (
                <div className="flex gap-5 px-8 pb-6 flex-1 min-h-0 overflow-hidden">
                  {/* ── Left: Package list ─────────────────────────────────────── */}
                  <div className="w-[52%] flex flex-col gap-3 overflow-y-auto scrollbar-subtle">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                      Package Selected{totalCount > 0 && ` (${totalCount})`}
                    </p>

                    {totalCount === 0 && !showAddPanel && (
                      <div className="border border-dashed border-gray-200 rounded-xl py-10 text-center text-sm text-gray-400">
                        No packages selected for this course
                      </div>
                    )}

                    {/* Partner-selected packages */}
                    {(activeCourse?.packages || []).map((pkg, i) => {
                      const imgUrl = getCatalogImageUrl(pkg);
                      const uploadCount = pkg.partner_uploaded_images?.length || 0;
                      const code = `PKG-${String(i + 1).padStart(2, "00")}`;
                      const isRemoved = partnerRemovedSet.has(pkg.package_id);
                      const pkgKey = `${activeCourseId}:${pkg.package_id}`;
                      const isSelected = selectedPartnerPackageKey === pkgKey;
                      return (
                        <div
                          key={pkg.package_id || i}
                          className={`border rounded-xl overflow-hidden transition-all ${
                            isRemoved
                              ? "border-red-200 bg-red-50/60 opacity-70"
                              : isSelected
                                ? "border-green-500 ring-2 ring-green-200 bg-green-50/30"
                                : "border-gray-200 bg-white"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedPartnerPackageKey(pkgKey)}
                            className="w-full text-left p-4 flex justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <p
                                  className={`text-[11px] text-gray-400 ${isRemoved ? "line-through" : ""}`}
                                >
                                  PKG ID:{" "}
                                  <span className="font-semibold text-gray-700">
                                    {code}
                                  </span>
                                </p>
                                {isRemoved ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">
                                    Removed by Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                                    Partner Selected
                                  </span>
                                )}
                                {uploadCount > 0 && !isRemoved && (
                                  <span className="text-[10px] text-gray-400">
                                    {uploadCount} image{uploadCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-sm font-bold ${isRemoved ? "text-red-400 line-through" : "text-green-600"}`}
                              >
                                {pkg.package_name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {pkg.description}
                              </p>
                              {pkg.justification?.trim() && !isRemoved && (
                                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">
                                  "{pkg.justification.trim()}"
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              {imgUrl && !isRemoved && (
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                  <img
                                    src={imgUrl}
                                    alt={pkg.package_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <span className="text-[10px] text-green-600 font-medium">
                                View details →
                              </span>
                            </div>
                          </button>
                          {isActionable && (
                            <div className="px-4 pb-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  togglePartnerPackageRemoval(
                                    activeCourseId,
                                    pkg.package_id,
                                  )
                                }
                                className={`text-[10px] font-medium transition-colors ${
                                  isRemoved
                                    ? "text-green-600 hover:text-green-800"
                                    : "text-red-400 hover:text-red-600"
                                }`}
                              >
                                {isRemoved ? "↩ Restore" : "✕ Remove"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Admin-added packages */}
                    {adminAddedObjs.map((pkg, i) => {
                      const imgUrl = getCatalogImageUrl(pkg);
                      const code = `PKG-${String((activeCourse?.packages?.length || 0) + i + 1).padStart(2, "0")}`;
                      return (
                        <div
                          key={pkg.id}
                          className="border border-blue-200 rounded-xl p-4 bg-blue-50 flex justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-[11px] text-gray-400">
                                PKG ID:{" "}
                                <span className="font-semibold text-gray-700">
                                  {code}
                                </span>
                              </p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                                Admin Added
                              </span>
                            </div>
                            <p className="text-sm font-bold text-blue-600">
                              {pkg.name || pkg.package_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {pkg.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {imgUrl && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                <img
                                  src={imgUrl}
                                  alt={pkg.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {isActionable && (
                              <button
                                onClick={() =>
                                  toggleAdminPackage(activeCourseId, pkg.id)
                                }
                                className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isActionable && (
                      <>
                        <button
                          onClick={() => setShowAddPanel((v) => !v)}
                          className={`w-full border border-dashed rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            showAddPanel
                              ? "border-green-400 text-green-600 bg-green-50"
                              : "border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600"
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={showAddPanel ? "M20 12H4" : "M12 4v16m8-8H4"}
                            />
                          </svg>
                          {showAddPanel ? "Hide packages" : "Add other package"}
                        </button>

                        {/* Inline add-packages panel */}
                        {showAddPanel && (
                      <div className="flex flex-col gap-2 pt-1">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                          Available to Add
                        </p>

                        {addablePackages.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                            No additional packages available for this course
                          </p>
                        )}

                        {addablePackages.map((pkg) => {
                          const imgUrl = getCatalogImageUrl(pkg);
                          const isAdded = adminAddedSet.has(pkg.id);
                          return (
                            <button
                              key={pkg.id}
                              onClick={() =>
                                toggleAdminPackage(activeCourseId, pkg.id)
                              }
                              className={`w-full text-left border rounded-xl p-4 flex justify-between gap-3 transition-all ${
                                isAdded
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {/* Checkbox visual */}
                                <div
                                  className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                    isAdded
                                      ? "bg-blue-600 border-blue-600"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {isAdded && (
                                    <svg
                                      className="w-2.5 h-2.5 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {pkg.name || pkg.package_name}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                    {pkg.description}
                                  </p>
                                </div>
                              </div>
                              {imgUrl && (
                                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                  <img
                                    src={imgUrl}
                                    alt={pkg.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                        )}
                      </>
                    )}
                  </div>

                  {selectedPartnerPackage
                    ? renderPackageDetailPanel(selectedPartnerPackage, {
                        courseName: activeCourse?.course_name,
                        onClear: () => setSelectedPartnerPackageKey(null),
                        badge: (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                            Partner Selected
                          </span>
                        ),
                      })
                    : renderRequestInfoPanel()}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-4 px-8 py-4 border-t border-gray-100">
                {isActionable ? (
                  <>
                    <button
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                      className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setRemarkMode("send_back");
                        setRejectReason("");
                        setRejectRemark("");
                        setRejectOpen(true);
                      }}
                      disabled={loading}
                      className="text-sm text-gray-600 hover:text-amber-600 font-medium transition-colors"
                    >
                      Send Back
                    </button>
                    <button
                      onClick={() => {
                        setRemarkMode("reject");
                        setRejectReason("");
                        setRejectRemark("");
                        setRejectOpen(true);
                      }}
                      disabled={loading}
                      className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={loading}
                      className="px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {loading ? "Approving..." : "Approve"}
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadgeCls}`}
                    >
                      Status: {getRefurbishmentStatusLabel(request.status)}
                    </span>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="px-7 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Remark Modal ──────────────────────────────────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent
          className="max-w-sm w-full rounded-2xl bg-white p-8 flex flex-col gap-5"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Refurbishment Remark</DialogTitle>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {remarkMode === "send_back"
                ? "Send back with remarks"
                : "Refurbishment remark"}
            </h2>
            {request?.center_name && (
              <p className="text-sm text-gray-500 mt-1">
                {request.center_name}
              </p>
            )}
          </div>

          {/* Reason dropdown */}
          <div className="relative">
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={`w-full appearance-none border border-gray-200 rounded-xl px-4 py-3.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 pr-10 ${
                rejectReason ? "text-gray-900" : "text-gray-400"
              }`}
            >
              <option value="" disabled>
                {remarkMode === "send_back"
                  ? "Reason for send back"
                  : "Reason of rejection"}
              </option>
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Remark textarea */}
          <textarea
            value={rejectRemark}
            onChange={(e) => setRejectRemark(e.target.value)}
            placeholder={
              remarkMode === "send_back"
                ? "Remarks and justification"
                : "Remark"
            }
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400"
          />

          {/* Submit */}
          <button
            onClick={handleRejectSubmit}
            disabled={rejectLoading || !rejectReason}
            className="w-full py-4 rounded-xl bg-gray-400 hover:bg-gray-500 disabled:opacity-60 text-white text-base font-medium transition-colors"
          >
            {rejectLoading
              ? "Submitting..."
              : remarkMode === "send_back"
                ? "Send Back"
                : "Submit"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminRefurbishmentReviewModal;
