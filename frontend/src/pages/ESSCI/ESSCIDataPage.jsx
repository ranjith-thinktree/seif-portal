import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOffice2Icon,
  AcademicCapIcon,
  UserGroupIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  essciGetData,
  essciUploadCertificatePDF,
} from "../../services/certification.service";
import { ROUTES } from "../../constants";

const STATUS_STYLES = {
  Done: "bg-green-100 text-green-800 border border-green-200",
  Ongoing: "bg-blue-100 text-blue-800 border border-blue-200",
  "Under review": "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value ?? "—"}</p>
    </div>
  </div>
);

/* ── Upload Modal ─────────────────────────────────────────────── */
const UploadModal = ({ row, onClose, onSuccess }) => {
  const [attended, setAttended] = useState("");
  const [passed, setPassed] = useState("");
  const [failed, setFailed] = useState("");
  const [absent, setAbsent] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [studentListDoc, setStudentListDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const zipRef = useRef(null);
  const slRef = useRef(null);

  const handleSubmit = async () => {
    if (!zipFile || !studentListDoc) {
      setError(
        "Both the ZIP archive and the student list document are required.",
      );
      return;
    }
    if (attended === "" || passed === "" || failed === "" || absent === "") {
      setError("Please fill in all attendance numbers.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await essciUploadCertificatePDF(
        row.partner_id,
        row.center_id,
        row.batch_id,
        row.id,
        parseInt(attended, 10),
        parseInt(passed, 10),
        parseInt(failed, 10),
        parseInt(absent, 10),
        zipFile,
        studentListDoc,
      );
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || "Upload failed. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Upload Certificates</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {row.center_name} — Batch {row.batch_number || row.batch_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Attendance Numbers */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Attendance Numbers *
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Attended", value: attended, setter: setAttended },
                { label: "Passed", value: passed, setter: setPassed },
                { label: "Failed", value: failed, setter: setFailed },
                { label: "Absent", value: absent, setter: setAbsent },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ZIP File */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Certificate ZIP Archive *
            </h3>
            <div
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"
              onClick={() => zipRef.current?.click()}
            >
              <input
                ref={zipRef}
                type="file"
                accept=".zip,.tar,.gz,.rar,.7z,.bz2,.tgz,.tbz2"
                className="hidden"
                onChange={(e) => setZipFile(e.target.files[0] || null)}
              />
              <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              {zipFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {zipFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZipFile(null);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 mt-0.5"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  ZIP / TAR / RAR / 7z &mdash; click to select
                </p>
              )}
            </div>
          </div>

          {/* Student List Document */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Student List Document *
            </h3>
            <div
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"
              onClick={() => slRef.current?.click()}
            >
              <input
                ref={slRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setStudentListDoc(e.target.files[0] || null)}
              />
              <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              {studentListDoc ? (
                <div>
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {studentListDoc.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentListDoc(null);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 mt-0.5"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  PDF, Word, CSV, XLSX — click to select
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="px-5 py-2 text-sm bg-[#009530] text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-4 h-4" /> Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ────────────────────────────────────────────────── */

const ESSCIDataPage = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Upload modal state
  const [uploadRow, setUploadRow] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await essciGetData({
        page,
        limit,
        search: search || undefined,
        filter,
      });
      if (res.success) {
        setRows(res.data.rows || []);
        setStats(res.data.stats || null);
        setTotal(res.data.total || 0);
      }
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleUploadSuccess = () => {
    setUploadRow(null);
    setUploadSuccess("Certificate files uploaded successfully.");
    fetchData();
    setTimeout(() => setUploadSuccess(null), 5000);
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Centers &amp; Student Details
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            An overview of your program&apos;s performance
          </p>
        </div>

        {uploadSuccess && (
          <div className="mb-4 bg-green-50 border border-green-400 rounded-lg p-3 text-sm text-green-700">
            {uploadSuccess}
          </div>
        )}

        {/* Top action bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-[#009530] rounded-lg hover:bg-green-700 transition-colors"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              New uploads:{" "}
              {rows.filter((r) => r.derived_status === "Ongoing").length}
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              Total Centers: {stats?.total_centers ?? "—"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Partners"
            value={stats?.total_partners}
            icon={BuildingOffice2Icon}
            color="bg-green-500"
          />
          <StatCard
            label="Centers"
            value={stats?.total_centers}
            icon={BuildingOffice2Icon}
            color="bg-blue-500"
          />
          <StatCard
            label="Eligible Students"
            value={stats?.total_students}
            icon={AcademicCapIcon}
            color="bg-purple-500"
          />
          <StatCard
            label="Female Trainees"
            value={stats?.female_trainees}
            icon={UserGroupIcon}
            color="bg-pink-500"
          />
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Center or Center ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#009530] text-white text-sm rounded-lg hover:bg-green-700"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filters:</span>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All</option>
                <option value="done">Done</option>
                <option value="ongoing">Ongoing</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {error && (
            <div className="p-4 text-red-600 text-sm bg-red-50 border-b border-red-200">
              {error}
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-12">
                  S.NO.
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  PARTNER NAME
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  CENTER
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  BATCH
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  ATTENDANCE
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  STATUS
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No certification data found.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {row.partner_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.center_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.batch_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.trainees_attended != null ? (
                        <span className="text-xs">
                          A:{row.trainees_attended} P:{row.trainees_passed} F:
                          {row.trainees_failed} Ab:{row.trainees_absent}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Not uploaded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[row.derived_status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {row.derived_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate(`${ROUTES.ESSCI_DATA}/${row.id}`)
                          }
                          className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          View more
                        </button>
                        <button
                          onClick={() => setUploadRow(row)}
                          className="px-3 py-1 text-xs bg-[#009530] text-white rounded-full hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <ArrowUpTrayIcon className="w-3 h-3" />
                          Upload
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
              <span>
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} results
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 border rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeftIcon className="w-4 h-4 inline" /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Next <ChevronRightIcon className="w-4 h-4 inline" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {uploadRow && (
        <UploadModal
          row={uploadRow}
          onClose={() => setUploadRow(null)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </MainLayout>
  );
};

export default ESSCIDataPage;
