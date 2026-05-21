import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import OverviewTab from "./tabs/OverviewTab";
import PartnerListTab from "./tabs/PartnerListTab";
import CenterListTab from "./tabs/CenterListTab";
import BatchListTab from "./tabs/BatchListTab";
import StudentListTab from "./tabs/StudentListTab";
import TotListTab from "./tabs/TotListTab";
import EmploymentListTab from "./tabs/EmploymentListTab";

/**
 * Data Management Page
 * Unified interface for viewing Partners, Centers, Batches, and Students
 * with role-based access control
 */
const DataManagementPage = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("overview");

  // Set active tab from navigation state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Role-based tab visibility
  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ESSCI" ||
    user?.role === "SEIF_READONLY" ||
    user?.role === "SEIF_READONLY_DOWNLOAD";

  const tabs = [
    { id: "overview", label: "Overview", visible: true },
    { id: "partners", label: "Partner List", visible: isAdmin },
    { id: "centers", label: "Center List", visible: true },
    { id: "batches", label: "Batch List", visible: true },
    { id: "students", label: "Students List", visible: true },
    { id: "tot", label: "TOT", visible: true },
    { id: "employment", label: "Employment", visible: true },
  ];

  const visibleTabs = tabs.filter((tab) => tab.visible);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Data</h1>
          <p className="text-gray-600">
            Comprehensive view of all partners, centers, batches, and students
            data. Use the tabs below to navigate between different sections.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1" aria-label="Tabs">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                px-6 py-3 text-sm font-medium transition-colors duration-200
                border-b-2 whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
                }
              `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "partners" && isAdmin && <PartnerListTab />}
          {activeTab === "centers" && <CenterListTab />}
          {activeTab === "batches" && <BatchListTab />}
          {activeTab === "students" && <StudentListTab />}
          {activeTab === "tot" && <TotListTab />}
          {activeTab === "employment" && <EmploymentListTab />}
        </div>
      </div>
    </MainLayout>
  );
};

export default DataManagementPage;
