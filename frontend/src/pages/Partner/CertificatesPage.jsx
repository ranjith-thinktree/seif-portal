import React, { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import ESSCIRequestsTab from "../../components/essci/ESSCIRequestsTab";
import ESSCICertificationRequestDetailModal from "../../components/essci/ESSCICertificationRequestDetailModal";
import useCertificationRequestsTab from "../../hooks/certification/useCertificationRequestsTab";
import {
  getCertificationUploadDetails,
  getPartnerCertificationRequests,
} from "../../services/certification.service";

const CertificatesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadIdFromUrl = searchParams.get("uploadId");

  const fetchRequests = useCallback(
    () => getPartnerCertificationRequests(1, 1000),
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
    storageKey: "partner-certification-requests",
    exportFilePrefix: "partner-certification-requests",
    showPartnerFilter: false,
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
          subtitle="Track your certification requests and current status"
          showPartnerColumn={false}
          storageKey={storageKey}
          emptyMessage="No certification requests yet. Submit certification data from the Upload page."
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

export default CertificatesPage;
