import React from "react";
import { MainLayout } from "../../components/layout";
import CertificationFilesPanel from "../../components/certification/CertificationFilesPanel";

const CertificationFilesPage = () => {
  return (
    <MainLayout>
      <div className="p-4 sm:p-5 max-w-7xl mx-auto">
        <CertificationFilesPanel />
      </div>
    </MainLayout>
  );
};

export default CertificationFilesPage;
