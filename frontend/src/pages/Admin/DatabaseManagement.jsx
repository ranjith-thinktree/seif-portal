import React, { useState } from "react";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { getDatabaseStats, resetDatabase } from "../../services/admin.service";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";

const DatabaseManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const [confirmText, setConfirmText] = useState("");
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingReset, setIsLoadingReset] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);

  // Check if user is super admin
  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" &&
    user?.full_name === "Super Admin" &&
    user?.email === "superadmin@seif.org";

  // Add log to terminal
  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalOutput((prev) => [
      ...prev,
      {
        timestamp,
        type, // 'info', 'success', 'error', 'warning'
        message,
        data,
      },
    ]);
  };

  // Clear terminal
  const clearTerminal = () => {
    setTerminalOutput([]);
  };

  // Handle Get Stats
  const handleGetStats = async () => {
    if (!isSuperAdmin) {
      toast.error("Access denied. Only Super Admin can access this feature.");
      return;
    }

    setIsLoadingStats(true);
    clearTerminal();
    addLog("info", "> Fetching database statistics...");

    try {
      const response = await getDatabaseStats();
      addLog("success", "✓ Statistics fetched successfully");
      addLog("info", "Database Statistics:", response.data);
    } catch (error) {
      addLog(
        "error",
        `✗ Error: ${error.message || "Failed to fetch statistics"}`
      );
      toast.error(error.message || "Failed to fetch statistics");
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle Reset Database
  const handleResetDatabase = async () => {
    if (!isSuperAdmin) {
      toast.error("Access denied. Only Super Admin can reset the database.");
      return;
    }

    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setIsLoadingReset(true);
    clearTerminal();
    addLog("warning", "> Starting database reset...");
    addLog(
      "warning",
      "⚠ WARNING: This will delete all data except users, courses, and partners"
    );

    try {
      const response = await resetDatabase();

      addLog("info", "> Reset operation completed");
      addLog("success", "✓ Database reset successful");

      if (response.data) {
        addLog("info", `> Truncated ${response.data.totalTruncated} tables`);

        if (response.data.statsBefore) {
          addLog("info", "Statistics Before Reset:", response.data.statsBefore);
        }

        if (response.data.statsAfter) {
          addLog(
            "success",
            "Statistics After Reset:",
            response.data.statsAfter
          );
        }

        if (
          response.data.truncatedTables &&
          response.data.truncatedTables.length > 0
        ) {
          addLog(
            "info",
            `Truncated Tables (${response.data.truncatedTables.length}):`,
            response.data.truncatedTables.join(", ")
          );
        }

        if (response.data.preserved && response.data.preserved.length > 0) {
          addLog(
            "success",
            "Preserved Tables:",
            response.data.preserved.join(", ")
          );
        }
      }

      toast.success("Database reset completed successfully");
      setConfirmText("");
    } catch (error) {
      addLog("error", `✗ Reset failed: ${error.message || "Unknown error"}`);
      toast.error(error.message || "Failed to reset database");
    } finally {
      setIsLoadingReset(false);
    }
  };

  // Render terminal output
  const renderTerminalLine = (log, index) => {
    const typeColors = {
      info: "text-blue-400",
      success: "text-green-400",
      error: "text-red-400",
      warning: "text-yellow-400",
    };

    return (
      <div key={index} className="font-mono text-sm mb-2">
        <span className="text-gray-500">[{log.timestamp}]</span>{" "}
        <span className={typeColors[log.type] || "text-gray-300"}>
          {log.message}
        </span>
        {log.data && (
          <pre className="ml-6 mt-1 text-xs text-gray-400 overflow-x-auto">
            {typeof log.data === "object"
              ? JSON.stringify(log.data, null, 2)
              : log.data}
          </pre>
        )}
      </div>
    );
  };

  if (!isSuperAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              Only Super Admin can access this page.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Warning */}
        <div className="mb-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-[16px]">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-semibold">
                  Danger Zone - Super Admin Only
                </h3>
                <p className="text-red-700 text-sm mt-1">
                  These operations can permanently delete data. Use with extreme
                  caution. Only users, courses, and partners will be preserved.
                </p>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Database Management
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage database operations
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Database Operations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Get Statistics */}
            <div className="border border-gray-200 rounded-[16px] p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Check Statistics
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                View current row counts for all tables. This is a read-only
                operation.
              </p>
              <Button
                onClick={handleGetStats}
                disabled={isLoadingStats || isLoadingReset}
                className="w-full bg-blue-600 hover:bg-blue-700 rounded-[40px]"
              >
                {isLoadingStats ? "Loading..." : "Get Statistics"}
              </Button>
            </div>

            {/* Reset Database */}
            <div className="border border-red-300 rounded-[16px] p-4 bg-red-50">
              <h3 className="font-semibold text-red-900 mb-2">
                Reset Database
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Permanently delete all data except users, courses, and partners.
                This cannot be undone.
              </p>
              <Input
                type="text"
                placeholder='Type "DELETE" to confirm'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mb-3 rounded-[16px]"
                disabled={isLoadingStats || isLoadingReset}
              />
              <Button
                onClick={handleResetDatabase}
                disabled={
                  confirmText !== "DELETE" || isLoadingStats || isLoadingReset
                }
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-[40px]"
              >
                {isLoadingReset ? "Resetting..." : "Reset Database"}
              </Button>
            </div>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-gray-900 rounded-[16px] shadow-lg border border-gray-700 overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-4 text-gray-400 text-sm font-mono">
                Terminal Output
              </span>
            </div>
            <button
              onClick={clearTerminal}
              className="text-gray-400 hover:text-gray-200 text-xs"
            >
              Clear
            </button>
          </div>
          <div className="p-4 h-96 overflow-y-auto bg-gray-900">
            {terminalOutput.length === 0 ? (
              <div className="text-gray-500 font-mono text-sm">
                Waiting for operations... Run "Get Statistics" or "Reset
                Database" to see output here.
              </div>
            ) : (
              terminalOutput.map((log, index) => renderTerminalLine(log, index))
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-[16px] p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Information</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              <strong>Get Statistics:</strong> Safe operation to view current
              database state
            </li>
            <li>
              <strong>Reset Database:</strong> Deletes all operational data
              (centers, students, uploads, notifications, etc.)
            </li>
            <li>
              <strong>Preserved:</strong> Users, Courses, Partners,
              Refurbishment Packages
            </li>
            <li>
              <strong>Use Case:</strong> Clean slate for testing or after demo
              sessions
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
};

export default DatabaseManagement;
