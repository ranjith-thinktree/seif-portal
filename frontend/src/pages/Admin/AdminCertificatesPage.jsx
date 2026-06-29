import React, { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import ESSCIRequestsTab from "../../components/essci/ESSCIRequestsTab";
import ESSCICertificationRequestDetailModal from "../../components/essci/ESSCICertificationRequestDetailModal";
import useCertificationRequestsTab from "../../hooks/certification/useCertificationRequestsTab";
import {
  adminGetCertificationRequests,
  getCertificationUploadDetails,
} from "../../services/certification.service";

const AdminCertificatesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadIdFromUrl = searchParams.get("uploadId");

  const fetchRequests = useCallback(
    () => adminGetCertificationRequests(1, 1000),
    [],
  );

  const {
    table,
    loading,
    selectedYear,
    setSelectedYear,
    filterOptions,
    detailUploadId,
    detailOpen,
    openDetail,
    closeDetail,
    openDetailById,
    handleExport,
    refreshRequests,
    storageKey,
  } = useCertificationRequestsTab({
    fetchRequests,
    storageKey: "admin-certification-requests",
    exportFilePrefix: "admin-certification-requests",
    showPartnerFilter: true,
  });

  useEffect(() => {
    if (uploadIdFromUrl) {
      openDetailById(uploadIdFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [uploadIdFromUrl, openDetailById, setSearchParams]);

  const detailIndex = table.data.findIndex((r) => r.id === detailUploadId);

  const fetchDetail = useCallback(async (uploadId) => {
    return getCertificationUploadDetails(uploadId);
  }, []);

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <ESSCIRequestsTab
          table={table}
          loading={loading}
          onViewRequest={openDetail}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          filterOptions={filterOptions}
          onExport={handleExport}
          title="Certificates"
          subtitle="All partner certification requests and their current status"
          showPartnerColumn
          storageKey={storageKey}
          emptyMessage="No certification requests found."
        />

        <ESSCICertificationRequestDetailModal
          uploadId={detailUploadId}
          open={detailOpen}
          onClose={closeDetail}
          onRefresh={refreshRequests}
          listIndex={detailIndex >= 0 ? detailIndex : 0}
          fetchDetail={fetchDetail}
          readOnly
        />
      </div>
    </MainLayout>
  );
};

export default AdminCertificatesPage;
