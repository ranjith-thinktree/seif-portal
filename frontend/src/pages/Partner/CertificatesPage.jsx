import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  DocumentArrowDownIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { MainLayout } from "../../components/layout";
import { getPartnerCertificates } from "../../services/certification.service";

const STATUS_BADGES = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

const CertificatesPage = () => {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPartnerCertificates(page, limit);
      if (res.success) {
        setCerts(res.data?.pdfs || []);
        setTotalPages(Math.ceil((res.data?.total || 0) / limit) || 1);
      }
    } catch {
      setError("Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCerts();
  }, [fetchCerts]);

  const filtered = certs.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.center_name?.toLowerCase().includes(q) ||
      c.batch_number?.toLowerCase().includes(q) ||
      c.partner_name?.toLowerCase().includes(q)
    );
  });

  const handleDownload = (cert) => {
    if (!cert.file_url) {
      toast.error("File not available.");
      return;
    }
    const link = document.createElement("a");
    link.href = cert.file_url;
    link.download = cert.file_name || "certificate.pdf";
    link.target = "_blank";
    link.click();
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Download approved certificate PDFs for your batches.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-5">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by center, batch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center text-gray-400">
              <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
              Loading certificates…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No certificates yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Certificates will appear here once ESSCI uploads and admin
                approves them.
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Center
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Batch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Upload Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((cert, i) => (
                    <tr
                      key={cert.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {cert.center_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {cert.batch_number || cert.batch_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {cert.created_at
                          ? new Date(cert.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            STATUS_BADGES[cert.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {cert.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cert.status === "approved" ? (
                          <button
                            onClick={() => handleDownload(cert)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#009530] text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                            Download
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {cert.status === "rejected"
                              ? "Rejected"
                              : "Pending approval"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronLeftIcon className="w-3.5 h-3.5" /> Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CertificatesPage;
