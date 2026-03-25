import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import { toast } from "react-toastify";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  essciGetBatchDetail,
  essciUploadCertificatePDF,
} from "../../services/certification.service";
import { ROUTES } from "../../constants";

const ESSCIBatchDetailPage = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const [studPage, setStudPage] = useState(1);
  const studLimit = 10;

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await essciGetBatchDetail(uploadId);
      if (res.success) setDetail(res.data);
      else setError("Upload not found.");
    } catch {
      setError("Failed to load batch details.");
    } finally {
      setLoading(false);
    }
  }, [uploadId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      toast.error("Only PDF or image files are allowed.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50 MB.");
      return;
    }
    setPdfFile(file);
  };

  const handleUpload = async () => {
    if (!pdfFile) {
      toast.error("Please select a PDF file.");
      return;
    }
    setUploading(true);
    try {
      await essciUploadCertificatePDF(
        pdfFile,
        detail.partner_id,
        detail.center_id,
        detail.batch_id,
        detail.id,
      );
      toast.success("Certificate PDF uploaded for admin review!");
      setUploadDone(true);
      fetchDetail();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const pagedStudents = () => {
    if (!detail?.students) return [];
    const start = (studPage - 1) * studLimit;
    return detail.students.slice(start, start + studLimit);
  };
  const totalStudPages = detail
    ? Math.ceil((detail.students?.length || 0) / studLimit)
    : 1;

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(ROUTES.ESSCI_DATA)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Back to Data
        </button>

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />{" "}
            Loading…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {detail && (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {detail.center_name || "Batch Detail"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {detail.partner_name} — Batch: {detail.batch_number}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student table (2/3) */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">
                    Students ({detail.students?.length || 0})
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Course
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Marks
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedStudents().map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400">
                          {(studPage - 1) * studLimit + i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {s.trainee_name}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {s.course_name || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {s.marks ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.status === "pass"
                                ? "bg-green-100 text-green-700"
                                : s.status === "fail"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {s.status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!detail.students || detail.students.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-gray-400"
                        >
                          No student records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {totalStudPages > 1 && (
                  <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Page {studPage} of {totalStudPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        disabled={studPage === 1}
                        onClick={() => setStudPage((p) => p - 1)}
                        className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        <ChevronLeftIcon className="w-3 h-3" />
                      </button>
                      <button
                        disabled={studPage >= totalStudPages}
                        onClick={() => setStudPage((p) => p + 1)}
                        className="px-2 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        <ChevronRightIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right panel: PDF upload (1/3) */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <ArrowUpTrayIcon className="w-4 h-4 text-green-600" />
                    Upload Certificate PDF
                  </h2>

                  {uploadDone ? (
                    <div className="text-center py-4">
                      <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">
                        Uploaded!
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Pending admin review.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-gray-50 transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        {pdfFile ? (
                          <div>
                            <CheckCircleIcon className="w-7 h-7 text-green-500 mx-auto mb-1" />
                            <p className="text-sm font-medium text-gray-700">
                              {pdfFile.name}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <ArrowUpTrayIcon className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">
                              Click to select PDF
                            </p>
                          </div>
                        )}
                      </label>

                      {pdfFile && (
                        <button
                          onClick={() => setPdfFile(null)}
                          className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <XCircleIcon className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}

                      <button
                        onClick={handleUpload}
                        disabled={uploading || !pdfFile}
                        className="w-full mt-4 py-2.5 bg-[#009530] text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        {uploading ? "Uploading…" : "Submit for Review"}
                      </button>
                    </>
                  )}
                </div>

                {/* Validation doc link */}
                {detail.validation_doc_url && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h2 className="font-semibold text-gray-800 mb-3 text-sm">
                      Validation Document
                    </h2>
                    <a
                      href={detail.validation_doc_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      {detail.validation_doc_name || "View Document"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ESSCIBatchDetailPage;
