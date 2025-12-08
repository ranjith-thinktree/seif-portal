import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

/**
 * Main Layout Component
 * Wraps pages with sidebar and header
 * Dynamic sidebar width based on content
 */
const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Dynamic width */}
      <Sidebar />

      {/* Main Content - Takes remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background-secondary">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
