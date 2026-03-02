import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";

const REJECTION_REASONS = [
  "Budget constraints",
  "Incomplete documentation",
  "Not eligible for this cycle",
  "Items already covered",
  "Other",
];

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

  // Upgradation packages management
  const [upgradationPackages, setUpgradationPackages] = useState([]);
  const [adminUpgradationSelected, setAdminUpgradationSelected] = useState(
    new Set(),
  );
  const [upgradationPkgLoading, setUpgradationPkgLoading] = useState(false);
  const [upgradationSaving, setUpgradationSaving] = useState(false);

  // Toggle inline add-packages panel
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
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
      // Pre-populate admin upgradation selections from initial response
      const preSelected = (
        details?.upgradation?.admin_selected_packages || []
      ).map((p) => p.package_id);
      if (preSelected.length > 0) {
        setAdminUpgradationSelected(new Set(preSelected));
      }
    } catch (err) {
      console.error("Error loading request:", err);
      toast.error(
        err.response?.data?.message || "Failed to load request details",
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [requestId, onOpenChange]);

  // Fetch upgradation packages for this request (lazy – only when upgradation tab opened)
  const fetchUpgradationPackages = useCallback(async () => {
    if (!requestId) return;
    setUpgradationPkgLoading(true);
    try {
      const res =
        await refurbishmentService.getUpgradationPackagesForRequest(requestId);
      const data = res.data || {};
      setUpgradationPackages(data.available_packages || []);
      setAdminUpgradationSelected(new Set(data.admin_selected_ids || []));
    } catch (err) {
      console.error("Error loading upgradation packages:", err);
      toast.error("Failed to load upgradation packages");
    } finally {
      setUpgradationPkgLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (open && requestId) {
      fetchDetails();
    } else {
      setRequestDetails(null);
      setAllPackages([]);
      setActiveCourseIdx(0);
      setActiveReviewTab("courses");
      setAdminAdded({});
      setPartnerRemoved({});
      setShowAddPanel(false);
      setRejectOpen(false);
      setRejectReason("");
      setRejectRemark("");
      setUpgradationPackages([]);
      setAdminUpgradationSelected(new Set());
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

  // Reset add panel on course tab change
  useEffect(() => {
    setShowAddPanel(false);
  }, [activeCourseIdx]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const parseImages = (str) => {
    if (!str || str === "null") return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
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

      await refurbishmentService.approveRefurbishmentRequest(requestId, "", {
        adminAddedPackages,
        removedPackageIds,
      });
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
      await refurbishmentService.rejectRefurbishmentRequest(
        requestId,
        fullReason,
      );
      toast.success("Request rejected");
      setRejectOpen(false);
      onOpenChange(false);
      try {
        onActionComplete?.();
      } catch (cbErr) {
        console.error("onActionComplete error:", cbErr);
      }
    } catch (err) {
      console.error("Error rejecting:", err);
      toast.error(err.response?.data?.message || "Failed to reject request");
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

  // ── Upgradation package toggle & save ────────────────────────────────────
  const toggleUpgradationPackage = (packageId) => {
    setAdminUpgradationSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };

  const handleSaveUpgradationPackages = async () => {
    setUpgradationSaving(true);
    try {
      await refurbishmentService.saveAdminUpgradationPackages(requestId, {
        packageIds: Array.from(adminUpgradationSelected),
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

  if (!requestDetails) return null;

  const {
    request,
    partner_packages_by_course = [],
    partner_images = [],
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
  const statusColors = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
  };
  const statusBadgeCls =
    statusColors[request.status] || "bg-gray-100 text-gray-700";

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
              </div>

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
                      onClick={() => setActiveReviewTab("upgradation")}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeReviewTab === "upgradation"
                          ? "bg-purple-100 text-purple-800"
                          : "text-gray-500 hover:text-purple-700"
                      }`}
                    >
                      Upgradation
                    </button>
                  )}
                </div>
              </div>

              {/* ── Upgradation Tab Content ─────────────────────────────── */}
              {activeReviewTab === "upgradation" && (
                <div className="flex-1 overflow-y-auto px-8 pb-6 space-y-6">
                  {/* ── Room Details ──────────────────────────────────────── */}
                  {upgradation.rooms.length === 0 ? (
                    <div className="border border-dashed border-purple-200 rounded-xl py-10 text-center text-sm text-gray-400">
                      No upgradation room details submitted.
                    </div>
                  ) : (
                    upgradation.rooms.map((room, idx) => (
                      <div
                        key={room.id || idx}
                        className="border border-purple-200 rounded-xl p-5 bg-purple-50/30"
                      >
                        <h3 className="text-sm font-semibold text-purple-700 mb-3">
                          Room {idx + 1}: {room.room_name || "Training Room"}
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                              Length (ft)
                            </p>
                            <p className="text-sm font-medium text-gray-800">
                              {room.length_feet ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                              Breadth (ft)
                            </p>
                            <p className="text-sm font-medium text-gray-800">
                              {room.breadth_feet ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                              Height (ft)
                            </p>
                            <p className="text-sm font-medium text-gray-800">
                              {room.height_feet ?? "—"}
                            </p>
                          </div>
                        </div>
                        {room.justification && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                              Justification
                            </p>
                            <p className="text-sm text-gray-700 italic">
                              "{room.justification}"
                            </p>
                          </div>
                        )}
                        {room.photos && room.photos.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                              Room Photos
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {room.photos.map((photo, pIdx) => (
                                <a
                                  key={pIdx}
                                  href={photo.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={photo.file_url}
                                    alt={photo.file_name || "Room photo"}
                                    className="w-20 h-20 object-cover rounded-lg border border-purple-200 hover:opacity-80"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* ── Partner's Selected Packages (rich cards with images) ── */}
                  {upgradation.selected_packages.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                        Partner Selected Upgradation Packages (
                        {upgradation.selected_packages.length})
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        {upgradation.selected_packages.map((pkg, idx) => {
                          const imgs = pkg.images
                            ? Array.isArray(pkg.images)
                              ? pkg.images
                              : parseImages(pkg.images)
                            : [];
                          return (
                            <div
                              key={pkg.package_id || pkg.id || idx}
                              className="border border-purple-200 rounded-xl bg-white overflow-hidden flex gap-0"
                            >
                              {/* Package image */}
                              {imgs.length > 0 ? (
                                <div className="w-28 h-28 flex-shrink-0">
                                  <img
                                    src={imgs[0]}
                                    alt={pkg.package_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-28 h-28 flex-shrink-0 bg-purple-50 flex items-center justify-center">
                                  <span className="text-3xl">📦</span>
                                </div>
                              )}
                              {/* Package info */}
                              <div className="flex-1 p-4 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                                    Partner Selected
                                  </span>
                                  {pkg.course_names && (
                                    <span className="text-[10px] text-gray-400">
                                      {pkg.course_names}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-bold text-purple-700">
                                  {pkg.package_name}
                                </p>
                                {pkg.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {pkg.description}
                                  </p>
                                )}
                                {imgs.length > 1 && (
                                  <div className="flex gap-1 mt-2">
                                    {imgs.slice(1, 4).map((imgUrl, i) => (
                                      <a
                                        key={i}
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <img
                                          src={imgUrl}
                                          alt=""
                                          className="w-10 h-10 object-cover rounded border border-purple-100 hover:opacity-70"
                                          onError={(e) => {
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      </a>
                                    ))}
                                    {imgs.length > 4 && (
                                      <div className="w-10 h-10 rounded border border-purple-100 bg-purple-50 flex items-center justify-center text-xs text-purple-600 font-semibold">
                                        +{imgs.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {upgradation.selected_packages.length === 0 &&
                    upgradation.rooms.length > 0 && (
                      <p className="text-sm text-gray-400 italic">
                        No upgradation packages selected by partner.
                      </p>
                    )}

                  {/* ── Admin Package Management ─────────────────────────── */}
                  <div className="border-t border-purple-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                          Admin Package Review
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Select / approve upgradation packages for this request
                        </p>
                      </div>
                      {isActionable && (
                        <button
                          onClick={handleSaveUpgradationPackages}
                          disabled={upgradationSaving}
                          className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                          {upgradationSaving ? "Saving…" : "Save Selections"}
                        </button>
                      )}
                    </div>

                    {upgradationPkgLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                      </div>
                    ) : upgradationPackages.length === 0 ? (
                      <div className="border border-dashed border-purple-200 rounded-xl py-6 text-center text-sm text-gray-400">
                        No upgradation packages available for this center's
                        courses.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {upgradationPackages.map((pkg) => {
                          const imgs = pkg.images
                            ? Array.isArray(pkg.images)
                              ? pkg.images
                              : parseImages(pkg.images)
                            : [];
                          const isSelected = adminUpgradationSelected.has(
                            pkg.id,
                          );
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              onClick={() =>
                                isActionable && toggleUpgradationPackage(pkg.id)
                              }
                              disabled={!isActionable}
                              className={`w-full text-left border rounded-xl overflow-hidden flex gap-0 transition-all ${
                                isSelected
                                  ? "border-purple-500 ring-2 ring-purple-200 bg-purple-50/60"
                                  : "border-gray-200 bg-white hover:border-purple-300"
                              } ${!isActionable ? "opacity-70 cursor-default" : "cursor-pointer"}`}
                            >
                              {/* Package image */}
                              {imgs.length > 0 ? (
                                <div className="w-24 h-24 flex-shrink-0">
                                  <img
                                    src={imgs[0]}
                                    alt={pkg.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-24 h-24 flex-shrink-0 bg-purple-50 flex items-center justify-center">
                                  <span className="text-2xl">📦</span>
                                </div>
                              )}
                              {/* Package info */}
                              <div className="flex-1 p-3 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  {isSelected && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white">
                                      ✓ Admin Selected
                                    </span>
                                  )}
                                  {pkg.course_names && (
                                    <span className="text-[10px] text-gray-400 truncate">
                                      {pkg.course_names}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-sm font-semibold ${isSelected ? "text-purple-700" : "text-gray-800"}`}
                                >
                                  {pkg.name}
                                </p>
                                {pkg.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {pkg.description}
                                  </p>
                                )}
                              </div>
                              {/* Checkbox indicator */}
                              <div className="flex items-center pr-4">
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "bg-purple-600 border-purple-600"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="text-white text-xs font-bold">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Split body */}
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
                      const imgs = parseImages(pkg.images);
                      const imgUrl = imgs[0] || null;
                      const code = `PKG-${String(i + 1).padStart(2, "00")}`;
                      const isRemoved = partnerRemovedSet.has(pkg.package_id);
                      return (
                        <div
                          key={pkg.package_id || i}
                          className={`border rounded-xl p-4 flex justify-between gap-3 transition-all ${
                            isRemoved
                              ? "border-red-200 bg-red-50/60 opacity-70"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
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
                            </div>
                            <p
                              className={`text-sm font-bold ${isRemoved ? "text-red-400 line-through" : "text-green-600"}`}
                            >
                              {pkg.package_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {pkg.description}
                            </p>
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
                            {isActionable && (
                              <button
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
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Admin-added packages */}
                    {adminAddedObjs.map((pkg, i) => {
                      const imgs = parseImages(pkg.images);
                      const imgUrl = imgs[0] || null;
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
                            <button
                              onClick={() =>
                                toggleAdminPackage(activeCourseId, pkg.id)
                              }
                              className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Toggle add-packages button */}
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
                          const imgs = parseImages(pkg.images);
                          const imgUrl = imgs[0] || null;
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
                  </div>

                  {/* ── Right: Request info ───────────────────────────────────── */}
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700">
                          {request.status || "pending"}
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

                    {partner_images.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                          Files Uploaded:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {partner_images.map((f) => (
                            <a
                              key={f.id}
                              href={f.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg
                                className="w-3 h-3 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                              </svg>
                              {f.file_name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                      onClick={() => setRejectOpen(true)}
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
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${statusBadgeCls}`}
                    >
                      This request has already been {request.status}
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
              Refurbishment remark
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
                Reason of rejection
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
            placeholder="Remark"
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400"
          />

          {/* Submit */}
          <button
            onClick={handleRejectSubmit}
            disabled={rejectLoading || !rejectReason}
            className="w-full py-4 rounded-xl bg-gray-400 hover:bg-gray-500 disabled:opacity-60 text-white text-base font-medium transition-colors"
          >
            {rejectLoading ? "Submitting..." : "Submit"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminRefurbishmentReviewModal;
