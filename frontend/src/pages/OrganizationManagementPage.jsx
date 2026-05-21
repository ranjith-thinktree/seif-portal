import React, { useState } from "react";
import { MainLayout } from "../components/layout";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import OrganizationPartnersPage from "./OrganizationManagement/OrganizationPartnersPage";
import OrganizationCentersPage from "./OrganizationManagement/OrganizationCentersPage";
import OrganizationTrainersPage from "./OrganizationManagement/OrganizationTrainersPage";

/**
 * Organization Management Page
 * Single page with tabs for Partners, Centers, and Trainers management
 * Shows APPROVED entities with detailed information
 * Different from Data page which shows PENDING/UPLOADED data for review
 */
const OrganizationManagementPage = () => {
  const [activeTab, setActiveTab] = useState("partners");

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Organization Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage approved partner organizations, training centers, and
            trainers
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="partners" className="text-base">
              Partners
            </TabsTrigger>
            <TabsTrigger value="centers" className="text-base">
              Centers
            </TabsTrigger>
            <TabsTrigger value="trainers" className="text-base">
              Trainers
            </TabsTrigger>
          </TabsList>

          {/* Partners Tab Content */}
          <TabsContent value="partners" className="mt-6">
            <OrganizationPartnersPage embedded={true} />
          </TabsContent>

          {/* Centers Tab Content */}
          <TabsContent value="centers" className="mt-6">
            <OrganizationCentersPage embedded={true} />
          </TabsContent>

          {/* Trainers Tab Content */}
          <TabsContent value="trainers" className="mt-6">
            <OrganizationTrainersPage embedded={true} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default OrganizationManagementPage;
