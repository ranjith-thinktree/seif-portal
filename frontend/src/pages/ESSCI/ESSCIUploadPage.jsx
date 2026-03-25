import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import { toast } from "react-toastify";
import {
  ArrowUpTrayIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  essciGetPartners,
  essciGetCenters,
  essciGetBatches,
  essciUploadCertificatePDF,
} from "../../services/certification.service";
import { ROUTES } from "../../constants";

const ESSCIUploadPage = () => {
  const navigate = useNavigate();

  const [partners, setPartners] = useState([]);
  const [centers, setCenters] = useState([]);
  const [batches, setBatches] = useState([]);

  const [partnerId, setPartnerId] = useState("");
  const [centerId, setCenterId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [certUploadId, setCertUploadId] = useState(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Load partners on mount
  useEffect(() => {
    essciGetPartners()
      .then((res) => setPartners(res.data || []))
      .catch(() => toast.error("Failed to load partners"));
  }, []);

  // Load centers when partner changes
  useEffect(() => {
    if (!partnerId) {
      setCenters([]);
      setCenterId("");
      return;
    }
    essciGetCenters(partnerId)
      .then((res) => setCenters(res.data || []))
      .catch(() => toast.error("Failed to load centers"));
    setCenterId("");
    setBatchId("");
    setBatches([]);
  }, [partnerId]);

  // Load batches when center changes
  useEffect(() => {
    if (!centerId || !partnerId) {
      setBatches([]);
      setBatchId("");
      return;
    }
    essciGetBatches(centerId, partnerId)
      .then((res) => setBatches(res.data || []))
      .catch(() => toast.error("Failed to load batches"));
    setBatchId("");
  }, [centerId, partnerId]);

  // Remember certificationUploadId when batch is selected
  const handleBatchChange = (e) => {
    const selected = batches.find((b) => b.id === e.target.value);
    setBatchId(e.target.value);
    setCertUploadId(selected?.certification_upload_id || null);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      toast.error("Only PDF, JPG, or PNG files are allowed.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50 MB.");
      return;
    }
    setPdfFile(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partnerId || !centerId || !batchId) {
      toast.error("Please select Partner, Center, and Batch.");
      return;
    }
    if (!pdfFile) {
      toast.error("Please attach the certificate PDF.");
      return;
    }

    setUploading(true);
    try {
      await essciUploadCertificatePDF(
        pdfFile,
        partnerId,
        centerId,
        batchId,
        certUploadId,
      );
      setSuccess(true);
      toast.success("Certificate PDF uploaded and sent for admin review!");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setPartnerId("");
    setCenterId("");
    setBatchId("");
    setCertUploadId(null);
    setPdfFile(null);
    setSuccess(false);
    setCenters([]);
    setBatches([]);
  };

  if (success) {
    return (
      <MainLayout>
        <div className="p-6 max-w-lg mx-auto mt-20 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Upload Successful!
          </h2>
          <p className="text-gray-500 mb-6">
            The certificate PDF has been submitted for admin review. The partner
            will be notified once it&apos;s approved.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-5 py-2 bg-[#009530] text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Upload Another
            </button>
            <button
              onClick={() => navigate(ROUTES.ESSCI_DATA)}
              className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Go to Data
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Upload Certificates
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Select the partner, center, and batch, then upload the certificate
              PDF.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Upload area */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">
                Certificate PDF
              </h2>

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors select-none ${
                  isDragging
                    ? "border-green-500 bg-green-50"
                    : pdfFile
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {pdfFile ? (
                  <div>
                    <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-gray-800">{pdfFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatBytes(pdfFile.size)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                      className="mt-3 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
                    >
                      <XCircleIcon className="w-4 h-4" /> Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">
                      Drag &amp; drop the certificate PDF here
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      Accepted: PDF, JPG, PNG — Max 50 MB
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full mt-6 py-3 bg-[#009530] text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Uploading…
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-5 h-5" /> Upload
                  </>
                )}
              </button>
            </div>

            {/* Right: Instructions + Dropdowns */}
            <div className="space-y-4">
              {/* Dropdowns */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-semibold text-gray-800 mb-2">
                  Batch Details
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partner Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select partner…</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Center Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={centerId}
                    onChange={(e) => setCenterId(e.target.value)}
                    disabled={!partnerId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Select center…</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.center_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch ID <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchId}
                    onChange={handleBatchChange}
                    disabled={!centerId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Select batch…</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number}
                      </option>
                    ))}
                  </select>
                  {centerId && batches.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No approved certification data found for this center.
                    </p>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">
                  Instructions
                </h2>
                <ol className="space-y-3">
                  {[
                    "Select the partner, center, and batch for which you are uploading certificates.",
                    "Upload a single PDF containing all certificates for the selected batch.",
                    "Only batches with admin-approved student data are available.",
                    "After upload, admin will review and approve. The partner will then be notified to download.",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                      <span className="flex-shrink-0 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ESSCIUploadPage;
