import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
  Image as ImageIcon,
  FileText,
  Ruler,
  ChevronRight,
  Download,
} from "lucide-react";
import refurbishmentService from "../../../services/refurbishment.service";
import { resolvePartnerFileUrl } from "../../../utils/refurbishmentUtils";

// ── helpers ─────────────────────────────────────────────────────────────────
function safeParseImages(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  submitted: {
    label: "Submitted",
    Icon: Clock,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    iconCls: "text-blue-500",
  },
  approved: {
    label: "Approved",
    Icon: CheckCircle2,
    cls: "bg-green-50 text-green-700 border-green-200",
    iconCls: "text-green-500",
  },
  rejected: {
    label: "Rejected",
    Icon: XCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
    iconCls: "text-red-500",
  },
  material_procurement: {
    label: "Material Procurement",
    Icon: CheckCircle2,
    cls: "bg-teal-50 text-teal-700 border-teal-200",
    iconCls: "text-teal-500",
  },
  installation_in_progress: {
    label: "Installation In Progress",
    Icon: CheckCircle2,
    cls: "bg-purple-50 text-purple-700 border-purple-200",
    iconCls: "text-purple-500",
  },
  refurbishment_started: {
    label: "In Progress",
    Icon: Clock,
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
    iconCls: "text-yellow-500",
  },
  sent_back: {
    label: "Sent Back",
    Icon: AlertCircle,
    cls: "bg-amber-50 text-amber-800 border-amber-200",
    iconCls: "text-amber-500",
  },
  completed: {
    label: "Completed",
    Icon: CheckCircle2,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconCls: "text-emerald-500",
  },
};

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const cfg = STATUS[status] || {
    label: status,
    Icon: AlertCircle,
    cls: "bg-gray-50 text-gray-700 border-gray-200",
    iconCls: "text-gray-500",
  };
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <Icon className={`w-3 h-3 ${cfg.iconCls}`} />
      {cfg.label}
    </span>
  );
}

// ── Image/attachment thumbnail ───────────────────────────────────────────────
function AttachmentItem({ item }) {
  const isImage = item.type?.startsWith("image/");
  const src = resolvePartnerFileUrl(item.url);
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col items-center gap-1.5 w-20"
      title={item.name}
    >
      {isImage ? (
        <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group-hover:border-green-400 transition-colors">
          <img
            src={src}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-xl border border-gray-200 group-hover:border-green-400 transition-colors flex flex-col items-center justify-center gap-1 bg-gray-50">
          <FileText className="w-7 h-7 text-gray-400" />
          <Download className="w-3 h-3 text-gray-400" />
        </div>
      )}
      <span className="text-[10px] text-gray-500 truncate w-full text-center">
        {item.name || "File"}
      </span>
    </a>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function PartnerPastRequestDetailModal({
  request,
  onClose,
  onSubmitCompletion,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs: courses + optional upgradation tab
  const [activeTab, setActiveTab] = useState(0);
  // Selected package to show detail panel
  const [selectedPkg, setSelectedPkg] = useState(null);

  useEffect(() => {
    if (!request?.request_id) return;
    setLoading(true);
    setError(null);
    setDetails(null);
    setActiveTab(0);
    setSelectedPkg(null);
    (async () => {
      try {
        const res = await refurbishmentService.getPartnerRequestDetails(
          request.request_id,
        );
        const data =
          res?.success &&
          res.data &&
          typeof res.data === "object" &&
          Array.isArray(res.data.courses)
            ? res.data
            : res?.success &&
                res.message &&
                typeof res.message === "object" &&
                Array.isArray(res.message.courses)
              ? res.message
              : null;
        if (!data) {
          setError("Failed to load request details");
          return;
        }
        setDetails(data);
        // Default-select first package of first course
        if (data?.courses?.[0]?.packages?.[0]) {
          setSelectedPkg(data.courses[0].packages[0]);
        }
      } catch (err) {
        setError(
          err?.response?.data?.message || "Failed to load request details",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [request?.request_id]);

  // Build tabs
  const tabs = details
    ? [
        ...details.courses.map((c, i) => ({ label: c.course_name, idx: i })),
        ...(details.upgradation_requested
          ? [
              {
                label: "Upgradation",
                idx: details.courses.length,
                isUpgradation: true,
              },
            ]
          : []),
      ]
    : [];

  const activeCourse = details?.courses?.[activeTab];
  const isUpgradationTab =
    details &&
    activeTab === details.courses.length &&
    details.upgradation_requested;

  // When course tab changes, select first package of that course
  useEffect(() => {
    const course = details?.courses?.[activeTab];
    setSelectedPkg(course?.packages?.[0] ?? null);
  }, [activeTab, details]);

  const req = details?.request ?? request;
  const showCompletion =
    req?.completion_notified_at &&
    req?.status !== "completed" &&
    req?.status !== "rejected" &&
    !req?.partner_completed_at;
  const requestIdLabel =
    request?.requestId ||
    (req?.request_number ? `#${req.request_number}` : null) ||
    (request?.request_id
      ? `REQ-${new Date(request.created_at || req?.created_at).getFullYear()}-${request.request_id.slice(0, 8).toUpperCase()}`
      : null);

  if (!request) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-7 py-5 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-gray-900 truncate">
              {req?.center_name || "Request Details"}
            </p>
            <div className="flex items-center justify-between gap-3 mt-1.5">
              <p className="text-xs text-gray-400 truncate min-w-0">
                {requestIdLabel || "—"}
                {requestIdLabel ? " · " : ""}
                Submitted {fmt(req?.created_at || request?.created_at)}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={req?.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 text-sm text-gray-600 underline"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {req?.has_admin_modifications && (
                <div className="mx-6 mt-5 px-5 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  <span className="font-semibold">Admin Note:</span> The admin
                  has curated the package list for this request.
                </div>
              )}

              {/* Admin remarks / rejection reason banner */}
              {(req?.admin_remarks || req?.rejection_reason) && (
                <div
                  className={`mx-6 mt-5 px-5 py-3.5 rounded-2xl border text-sm ${
                    req?.status === "rejected"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <span className="font-semibold">
                    {req?.status === "rejected"
                      ? "Rejection Reason: "
                      : "Admin Remarks: "}
                  </span>
                  {req?.rejection_reason || req?.admin_remarks}
                </div>
              )}

              {showCompletion && onSubmitCompletion && (
                <div className="mx-6 mt-5 px-5 py-4 rounded-2xl bg-purple-50 border border-purple-200">
                  <p className="text-sm text-purple-800 font-semibold mb-2">
                    Refurbishment Complete — Confirmation Required
                  </p>
                  <button
                    onClick={() => onSubmitCompletion(request)}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Submit Completion
                  </button>
                </div>
              )}

              {/* Tab strip */}
              {tabs.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap px-6 pt-5 pb-2 shrink-0">
                  {tabs.map((tab) => (
                    <button
                      key={tab.idx}
                      onClick={() => setActiveTab(tab.idx)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        activeTab === tab.idx
                          ? tab.isUpgradation
                            ? "bg-purple-600 text-white shadow-sm"
                            : "bg-green-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tab.isUpgradation ? (
                        <span className="flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5" />
                          Upgradation
                        </span>
                      ) : (
                        tab.label
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Course view: two-panel layout ── */}
              {!isUpgradationTab && activeCourse && (
                <div className="flex flex-1 min-h-0 overflow-hidden mx-6 mb-6 mt-3 gap-4">
                  {/* Left: package list */}
                  <div className="w-56 shrink-0 overflow-y-auto space-y-2 pr-1">
                    {activeCourse.packages.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">
                        No packages selected for this course.
                      </p>
                    ) : (
                      activeCourse.packages
                        .filter((pkg) => !pkg.removed_by_admin)
                        .map((pkg) => (
                          <button
                            key={pkg.package_id}
                            onClick={() => setSelectedPkg(pkg)}
                            className={`w-full text-left px-4 py-3 rounded-2xl border transition-all text-sm ${
                              selectedPkg?.package_id === pkg.package_id
                                ? "border-green-500 bg-green-50 text-green-800 font-semibold shadow-sm"
                                : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate leading-snug">
                                {pkg.package_name}
                              </span>
                              {selectedPkg?.package_id === pkg.package_id && (
                                <ChevronRight className="w-4 h-4 shrink-0 text-green-600" />
                              )}
                            </div>
                            {pkg.added_by_admin && (
                              <span className="text-[10px] text-blue-600 font-normal">
                                ✦ Admin added
                              </span>
                            )}
                          </button>
                        ))
                    )}
                  </div>

                  {/* Right: detail panel */}
                  {selectedPkg ? (
                    <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/60 p-5 space-y-6">
                      {/* Package name + description */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-5 h-5 text-green-600 shrink-0" />
                          <h3 className="text-base font-bold text-gray-900">
                            {selectedPkg.package_name}
                          </h3>
                        </div>
                        {selectedPkg.description && (
                          <p className="text-sm text-gray-500 leading-relaxed ml-7">
                            {selectedPkg.description}
                          </p>
                        )}
                      </div>

                      {/* Justification */}
                      {selectedPkg.justification && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Your Justification
                          </p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {selectedPkg.justification}
                          </p>
                        </div>
                      )}

                      {/* Standard package images */}
                      {(() => {
                        const imgs = safeParseImages(selectedPkg.images);
                        return imgs.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Reference Images
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {imgs.map((url, i) => {
                                const src = resolvePartnerFileUrl(
                                  typeof url === "string" ? url : url?.url,
                                );
                                return (
                                  <a
                                    key={i}
                                    href={src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 hover:border-green-400 transition-colors"
                                  >
                                    <img
                                      src={src}
                                      alt={`ref-${i}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Partner uploaded images for this course */}
                      {activeCourse.uploaded_images?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Your Uploaded Photos
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {activeCourse.uploaded_images.map((img, i) => (
                              <AttachmentItem key={i} item={img} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                      Select a package to view details
                    </div>
                  )}
                </div>
              )}

              {/* ── Upgradation tab ── */}
              {isUpgradationTab && details.upgradation && (
                <div className="mx-6 mb-6 mt-3 space-y-5">
                  {/* Rooms */}
                  {details.upgradation.rooms?.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-green-600" />
                        Room Dimensions
                      </h3>
                      {details.upgradation.rooms.map((room, i) => (
                        <div
                          key={room.id || i}
                          className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
                        >
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Room {i + 1}
                          </p>
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            {[
                              ["Length", room.length_feet],
                              ["Breadth", room.breadth_feet],
                              [
                                "Area",
                                room.area_sqft ??
                                  (Number(room.length_feet) > 0 &&
                                  Number(room.breadth_feet) > 0
                                    ? Number(room.length_feet) *
                                      Number(room.breadth_feet)
                                    : null),
                              ],
                            ].map(([label, val]) => (
                              <div key={label} className="text-center">
                                <p className="text-xs text-gray-400 mb-0.5">
                                  {label}
                                </p>
                                <p className="text-base font-bold text-gray-800">
                                  {val ?? "—"}
                                  <span className="text-xs font-normal text-gray-400 ml-1">
                                    {label === "Area" ? "sq ft" : "ft"}
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                          {room.justification && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">
                                Justification
                              </p>
                              <p className="text-sm text-gray-700">
                                {room.justification}
                              </p>
                            </div>
                          )}
                          {/* Room photos */}
                          {room.photos?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">
                                Photos
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {room.photos.map((p, j) => (
                                  <AttachmentItem
                                    key={j}
                                    item={{
                                      url: p.file_url,
                                      name: p.file_name,
                                      type: "image/",
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No room details provided.
                    </p>
                  )}

                  {/* Selected upgradation packages */}
                  {details.upgradation.selected_packages?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-green-600" />
                        Selected Upgradation Packages
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {details.upgradation.selected_packages.map((pkg) => (
                          <div
                            key={pkg.package_id}
                            className="bg-white border border-green-200 rounded-xl p-4"
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {pkg.package_name}
                            </p>
                            {pkg.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {pkg.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Documents section ── */}
              {(details?.refurbishment_document ||
                details?.upgradation_document) && (
                <div className="mx-6 mb-6 mt-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-green-600" />
                    Attached Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {details.refurbishment_document && (
                      <a
                        href={resolvePartnerFileUrl(
                          details.refurbishment_document.url,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-green-400 rounded-xl p-4 transition-colors group"
                      >
                        <FileText className="w-8 h-8 text-green-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {details.refurbishment_document.name ||
                              "Refurbishment Document"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Refurbishment Doc
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-gray-400 ml-auto group-hover:text-green-600 transition-colors" />
                      </a>
                    )}
                    {details.upgradation_document && (
                      <a
                        href={resolvePartnerFileUrl(
                          details.upgradation_document.url,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-green-400 rounded-xl p-4 transition-colors group"
                      >
                        <FileText className="w-8 h-8 text-purple-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {details.upgradation_document.name ||
                              "Upgradation Document"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Upgradation Doc
                          </p>
                        </div>
                        <Download className="w-4 h-4 text-gray-400 ml-auto group-hover:text-purple-500 transition-colors" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state when no packages found */}
              {details &&
                details.courses.length === 0 &&
                !details.upgradation_requested && (
                  <div className="py-16 text-center">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      No package selection data found for this request.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-7 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
