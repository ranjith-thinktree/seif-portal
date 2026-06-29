import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "../../components/layout";
import ESSCIRequestsTab from "../../components/essci/ESSCIRequestsTab";
import ESSCICertificationRequestDetailModal from "../../components/essci/ESSCICertificationRequestDetailModal";
import useESSCIRequestsTab from "../../hooks/essci/useESSCIRequestsTab";

const ESSCIRequestsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadIdFromUrl = searchParams.get("uploadId");

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
  } = useESSCIRequestsTab();

  useEffect(() => {
    if (uploadIdFromUrl) {
      openDetailById(uploadIdFromUrl);
      setSearchParams({}, { replace: true });
    }
  }, [uploadIdFromUrl, openDetailById, setSearchParams]);

  const detailIndex = table.data.findIndex((r) => r.id === detailUploadId);

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
        />

        <ESSCICertificationRequestDetailModal
          uploadId={detailUploadId}
          open={detailOpen}
          onClose={closeDetail}
          onRefresh={refreshRequests}
          listIndex={detailIndex >= 0 ? detailIndex : 0}
        />
      </div>
    </MainLayout>
  );
};

export default ESSCIRequestsPage;
