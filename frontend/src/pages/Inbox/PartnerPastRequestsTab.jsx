import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
  Ruler,
  FileText,
  Download,
  ChevronRight,
  X as XIcon,
} from "lucide-react";
import refurbishmentService from "../../services/refurbishment.service";
import PartnerCompletionModal from "../../components/refurbishment/modals/PartnerCompletionModal";

// â”€â”€ Status config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS = {
  submitted: { label: "Submitted", Icon: Clock, cls: "bg-blue-50 text-blue-700 border-blue-200", dotCls: "bg-blue-500" },
  approved: { label: "Approved", Icon: CheckCircle2, cls: "bg-green-50 text-green-700 border-green-200", dotCls: "bg-green-500" },
  rejected: { label: "Rejected", Icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200", dotCls: "bg-red-500" },
  material_procurement: { label: "Material Procurement", Icon: CheckCircle2, cls: "bg-teal-50 text-teal-700 border-teal-200", dotCls: "bg-teal-500" },
  installation_in_progress: { label: "Installation In Progress", Icon: CheckCircle2, cls: "bg-purple-50 text-purple-700 border-purple-200", dotCls: "bg-purple-500" },
  refurbishment_started: { label: "In Progress", Icon: Clock, cls: "bg-yellow-50 text-yellow-700 border-yellow-200", dotCls: "bg-yellow-400" },
  completed: { label: "Completed", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dotCls: "bg-emerald-500" },
};

function StatusBadge({ status }) {
  const cfg = STATUS[status] || { label: status, Icon: AlertCircle, cls: "bg-gray-50 text-gray-700 border-gray-200", dotCls: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
      {cfg.label}
    </span>
  );
}

function safeParse(raw) {
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

function fmtDate(d) {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "â€”";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const LIMIT = 20;

// â”€â”€ Request detail inline panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RequestDetailPanel({ request, onClose, onSubmitCompletion }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPkg, setSelectedPkg] = useState(null);

  useEffect(() => {
    if (!request?.request_id) return;
    setLoading(true); setError(null); setDetails(null); setActiveTab(0); setSelectedPkg(null);
    refurbishmentService.getPartnerRequestDetails(request.request_id)
      .then((res) => {
        const data = res?.data ?? res;
        setDetails(data);
        if (data?.courses?.[0]?.packages?.[0]) setSelectedPkg(data.courses[0].packages[0]);
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load details"))
      .finally(() => setLoading(false));
  }, [request?.request_id]);

  const tabs = details ? [
    ...details.courses.map((c, i) => ({ label: c.course_name, idx: i })),
    ...(details.upgradation_requested ? [{ label: "Upgradation", idx: details.courses.length, isUpgradation: true }] : []),
  ] : [];

  const activeCourse = details?.courses?.[activeTab];
  const isUpgradationTab = details && activeTab === details.courses.length && details.upgradation_requested;

  useEffect(() => {
    const course = details?.courses?.[activeTab];
    setSelectedPkg(course?.packages?.[0] ?? null);
  }, [activeTab, details]);

  const req = details?.request ?? request;
  const showCompletion = req?.completion_notified_at && req?.status !== "completed" && req?.status !== "rejected" && !req?.partner_completed_at;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-base font-bold text-gray-900 truncate">{req?.center_name || "Request Details"}</h3>
            <StatusBadge status={req?.status} />
          </div>
          <p className="text-xs text-gray-400">Submitted {fmtDateTime(req?.created_at || request?.created_at)}</p>
        </div>
        <button onClick={onClose} className="ml-2 shrink-0 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Admin curated notice */}
            {req?.has_admin_modifications && (
              <div className="mx-4 mt-4 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <span className="font-semibold">Admin Note:</span> The admin has curated the package list for this request.
              </div>
            )}
            {/* Admin remarks / rejection */}
            {(req?.admin_remarks || req?.rejection_reason) && (
              <div className={`mx-4 mt-4 px-4 py-3 rounded-xl border text-xs ${req?.status === "rejected" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                <span className="font-semibold">{req?.status === "rejected" ? "Rejection Reason: " : "Admin Remarks: "}</span>
                {req?.rejection_reason || req?.admin_remarks}
              </div>
            )}
            {/* Completion CTA */}
            {showCompletion && (
              <div className="mx-4 mt-2 px-4 py-3 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-800 font-semibold mb-2">Refurbishment Complete â€” Confirmation Required</p>
                <button onClick={() => onSubmitCompletion(request)} className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors">
                  Submit Completion
                </button>
              </div>
            )}
            {/* Course tabs */}
            {tabs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1 shrink-0">
                {tabs.map((tab) => (
                  <button key={tab.idx} onClick={() => setActiveTab(tab.idx)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === tab.idx ? (tab.isUpgradation ? "bg-purple-600 text-white" : "bg-green-600 text-white") : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {tab.isUpgradation ? <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> Upgradation</span> : tab.label}
                  </button>
                ))}
              </div>
            )}
            {/* Course two-panel */}
            {!isUpgradationTab && activeCourse && (
              <div className="flex min-h-[200px] gap-3 mx-4 mb-3">
                {/* Left: package list */}
                <div className="w-44 shrink-0 space-y-1.5 overflow-y-auto">
                  {activeCourse.packages.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No packages for this course.</p>
                  ) : activeCourse.packages.filter((p) => !p.removed_by_admin).map((pkg) => (
                    <button key={pkg.package_id} onClick={() => setSelectedPkg(pkg)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-xs ${selectedPkg?.package_id === pkg.package_id ? "border-green-500 bg-green-50 text-green-800 font-semibold" : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate leading-snug">{pkg.package_name}</span>
                        {selectedPkg?.package_id === pkg.package_id && <ChevronRight className="w-3 h-3 shrink-0 text-green-600" />}
                      </div>
                      {pkg.added_by_admin && <span className="text-[10px] text-blue-600 font-normal">âœ¦ Admin added</span>}
                    </button>
                  ))}
                </div>
                {/* Right: package detail */}
                {selectedPkg ? (
                  <div className="flex-1 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-green-600 shrink-0" />
                        <h4 className="text-sm font-bold text-gray-900">{selectedPkg.package_name}</h4>
                      </div>
                      {selectedPkg.description && <p className="text-xs text-gray-500 leading-relaxed ml-6">{selectedPkg.description}</p>}
                    </div>
                    {selectedPkg.justification && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Your Justification</p>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedPkg.justification}</p>
                      </div>
                    )}
                    {(() => { const imgs = safeParse(selectedPkg.images); return imgs.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Reference Images</p>
                        <div className="flex flex-wrap gap-2">
                          {imgs.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-green-400 transition-colors">
                              <img src={url} alt={`ref-${i}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null; })()}
                    {activeCourse.uploaded_images?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Uploaded Photos</p>
                        <div className="flex flex-wrap gap-2">
                          {activeCourse.uploaded_images.map((img, i) => (
                            <a key={i} href={img.url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-green-400 transition-colors" title={img.name}>
                              <img src={img.url} alt={img.name} className="w-full h-full object-cover" onError={(e) => (e.target.style.display = "none")} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">Select a package to view details</div>
                )}
              </div>
            )}
            {/* Upgradation tab */}
            {isUpgradationTab && details.upgradation && (
              <div className="mx-4 mb-4 mt-2 space-y-4">
                {details.upgradation.rooms?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-green-600" /> Room Dimensions</h4>
                    {details.upgradation.rooms.map((room, i) => (
                      <div key={room.id || i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Room {i + 1}</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[["Length", room.length_feet], ["Breadth", room.breadth_feet], ["Height", room.height_feet]].map(([label, val]) => (
                            <div key={label} className="text-center">
                              <p className="text-[10px] text-gray-400">{label}</p>
                              <p className="text-sm font-bold text-gray-800">{val ?? "â€”"} <span className="text-[10px] font-normal text-gray-400">ft</span></p>
                            </div>
                          ))}
                        </div>
                        {room.justification && <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">{room.justification}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {details.upgradation.selected_packages?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-2"><Package className="w-3.5 h-3.5 text-green-600" /> Upgradation Packages</h4>
                    <div className="space-y-2">
                      {details.upgradation.selected_packages.map((pkg) => (
                        <div key={pkg.package_id} className="bg-white border border-purple-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-900">{pkg.package_name}</p>
                          {pkg.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{pkg.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Documents */}
            {(details?.refurbishment_document || details?.upgradation_document) && (
              <div className="mx-4 mb-4">
                <h4 className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mb-2"><FileText className="w-3.5 h-3.5 text-green-600" /> Attached Documents</h4>
                <div className="space-y-2">
                  {details.refurbishment_document && (
                    <a href={details.refurbishment_document.url || "#"} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-green-400 rounded-xl p-3 transition-colors group">
                      <FileText className="w-6 h-6 text-green-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 truncate">{details.refurbishment_document.name || "Refurbishment Document"}</p>
                        <p className="text-[10px] text-gray-400">Refurbishment Doc</p>
                      </div>
                      <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600" />
                    </a>
                  )}
                  {details.upgradation_document && (
                    <a href={details.upgradation_document.url || "#"} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-purple-400 rounded-xl p-3 transition-colors group">
                      <FileText className="w-6 h-6 text-purple-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 truncate">{details.upgradation_document.name || "Upgradation Document"}</p>
                        <p className="text-[10px] text-gray-400">Upgradation Doc</p>
                      </div>
                      <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-500" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {details && details.courses.length === 0 && !details.upgradation_requested && (
              <div className="py-14 text-center">
                <Package className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">No package selection data found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Main Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function PartnerPastRequestsTab() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [completionRequest, setCompletionRequest] = useState(null);

  const fetchRequests = useCallback(async (pageNum = 1) => {
    setLoading(true); setError(null);
    try {
      const offset = (pageNum - 1) * LIMIT;
      const data = await refurbishmentService.getPartnerPastRequests({ limit: LIMIT, offset });
      const list = data?.data?.requests || data?.requests || [];
      const count = data?.data?.total ?? data?.total ?? 0;
      setRequests(list); setTotal(count);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load past requests");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(page); }, [fetchRequests, page]);

  const totalPages = Math.ceil(total / LIMIT);

  const displayRequests = requests.filter((req) => {
    const matchSearch = !searchTerm || req.center_name?.toLowerCase().includes(searchTerm.toLowerCase()) || req.request_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || req.status === statusFilter.toLowerCase().replace(/ /g, "_");
    return matchSearch && matchStatus;
  });

  const handleSelectRequest = (req) =>
    setSelectedRequest((prev) => prev?.request_id === req.request_id ? null : req);

  return (
    <div className="flex gap-4 min-h-0 h-full">
      {/* â”€â”€ Left: list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`flex flex-col gap-3 transition-all duration-300 ${selectedRequest ? "w-[48%]" : "w-full"}`}>
        {/* Search + filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by center or request IDâ€¦"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer">
            {["All", "Submitted", "Approved", "Rejected", "Completed"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Request cards */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-green-600" />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500 text-sm">{error}</div>
          ) : displayRequests.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="w-9 h-9 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No past requests found.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {displayRequests.map((req) => {
                const isSelected = selectedRequest?.request_id === req.request_id;
                const showCompletion = req.completion_notified_at && req.status !== "completed" && req.status !== "rejected" && !req.partner_completed_at;
                return (
                  <button key={req.request_id} onClick={() => handleSelectRequest(req)}
                    className={`w-full text-left px-5 py-4 transition-colors ${isSelected ? "bg-green-50 border-l-2 border-l-green-500" : "hover:bg-gray-50/80 border-l-2 border-l-transparent"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{req.center_name || "â€”"}</p>
                          <StatusBadge status={req.status} />
                          {showCompletion && (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Action Needed</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="capitalize">{req.type?.replace(/_/g, " ") || "Refurbishment"}</span>
                          <span>Â·</span>
                          <span>{fmtDate(req.updated_at)}</span>
                          <span>Â·</span>
                          <span className="font-mono">{req.request_id?.slice(0, 8)}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${isSelected ? "text-green-600" : "text-gray-300"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>{total} request{total !== 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">Previous</button>
              <span className="px-2 py-1.5">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Right: detail panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedRequest && (
        <div className="flex-1 min-w-0 overflow-hidden">
          <RequestDetailPanel
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onSubmitCompletion={(req) => setCompletionRequest(req)}
          />
        </div>
      )}

      {/* Completion modal */}
      {completionRequest && (
        <PartnerCompletionModal
          request={completionRequest}
          onClose={() => setCompletionRequest(null)}
          onSuccess={() => { setCompletionRequest(null); fetchRequests(page); }}
        />
      )}
    </div>
  );
}
