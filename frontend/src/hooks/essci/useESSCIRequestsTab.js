import { useCallback } from "react";
import useCertificationRequestsTab from "../../hooks/certification/useCertificationRequestsTab";
import { essciGetData } from "../../services/certification.service";

export default function useESSCIRequestsTab() {
  const fetchRequests = useCallback(async () => {
    return essciGetData({ page: 1, limit: 1000 });
  }, []);

  return useCertificationRequestsTab({
    fetchRequests,
    storageKey: "essci-certification-requests",
    exportFilePrefix: "essci-certification-requests",
    showPartnerFilter: true,
  });
}
