import React, { useState } from "react";
import { MainLayout } from "../components/layout";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import OrganizationCentersPage from "./OrganizationManagement/OrganizationCentersPage";
import OrganizationTrainersPage from "./OrganizationManagement/OrganizationTrainersPage";

/**
 * Partner Organization Management Page
 * Partner-specific view with tabs for Centers and Trainers management
 * Partners can:
 * - View their centers (read-only)
 * - Manage their trainers (create, edit, delete soft)
 * - Cannot change trainer partner/center assignments
 */
const PartnerOrganizationManagementPage = () => {
  const [activeTab, setActiveTab] = useState("centers");

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Organization Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your training centers and trainers
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="centers" className="text-base">
              Centers
            </TabsTrigger>
            <TabsTrigger value="trainers" className="text-base">
              Trainers
            </TabsTrigger>
          </TabsList>

          {/* Centers Tab Content - Read Only */}
          <TabsContent value="centers" className="mt-6">
            <OrganizationCentersPage embedded={true} readOnly={true} />
          </TabsContent>

          {/* Trainers Tab Content - Full CRUD */}
          <TabsContent value="trainers" className="mt-6">
            <OrganizationTrainersPage embedded={true} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PartnerOrganizationManagementPage;
