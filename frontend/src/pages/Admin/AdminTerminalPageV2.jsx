import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import apiClient from "../../api/client";
import MainLayout from "../../components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  ArrowPathIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerIcon,
  CircleStackIcon,
  ClockIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

/**
 * Admin Terminal Page V2
 * Modern redesign with Shadcn UI components, sidebar and header layout
 */
const AdminTerminalPageV2 = () => {
  const [logs, setLogs] = useState({ error: [], output: [], combined: [] });
  const [systemInfo, setSystemInfo] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState(100);
  const [errorSummary, setErrorSummary] = useState([]);
  const terminalRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/admin/logs?lines=${lines}&type=all`
      );
      if (response.data.success) {
        setLogs(response.data.data);
        analyzeErrors(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Analyze errors and create summary
  const analyzeErrors = (logsData) => {
    const errorLines = logsData.error || [];
    const errorPatterns = {};

    errorLines.forEach((line) => {
      if (line.includes("ECONNREFUSED")) {
        errorPatterns["Database Connection Refused"] =
          (errorPatterns["Database Connection Refused"] || 0) + 1;
      } else if (line.includes("ER_")) {
        errorPatterns["MySQL Error"] = (errorPatterns["MySQL Error"] || 0) + 1;
      } else if (line.includes("404") || line.includes("Not Found")) {
        errorPatterns["404 Not Found"] =
          (errorPatterns["404 Not Found"] || 0) + 1;
      } else if (line.includes("500") || line.includes("Internal Server")) {
        errorPatterns["500 Server Error"] =
          (errorPatterns["500 Server Error"] || 0) + 1;
      } else if (line.includes("TypeError")) {
        errorPatterns["Type Error"] = (errorPatterns["Type Error"] || 0) + 1;
      } else if (line.includes("ReferenceError")) {
        errorPatterns["Reference Error"] =
          (errorPatterns["Reference Error"] || 0) + 1;
      } else if (line.includes("ETIMEDOUT")) {
        errorPatterns["Request Timeout"] =
          (errorPatterns["Request Timeout"] || 0) + 1;
      } else {
        errorPatterns["Other Errors"] =
          (errorPatterns["Other Errors"] || 0) + 1;
      }
    });

    const summary = Object.entries(errorPatterns)
      .map(([type, count]) => ({
        type,
        count,
        severity: count > 10 ? "critical" : count > 5 ? "high" : "medium",
      }))
      .sort((a, b) => b.count - a.count);

    setErrorSummary(summary);
  };

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    try {
      setDiagnosticsLoading(true);
      const response = await apiClient.get("/admin/diagnostics");
      if (response.data.success) {
        setDiagnostics(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch diagnostics:", error);
      // Don't show error state for 401 (token refresh in progress)
      // Only show error for actual failures (network errors, 500, etc.)
      if (error.response?.status === 401) {
        console.log("⏳ Authentication in progress, will retry automatically");
        return; // Don't set error state, keep previous state or loading
      }
      
      setDiagnostics({
        deployment: {
          status: "error",
          message: "Unable to fetch deployment info",
          version: error.response?.status 
            ? `HTTP ${error.response.status}`
            : "Connection Error",
        },
        database: {
          connected: false,
          message: error.response?.data?.message || error.message || "Connection failed",
        },
        api: {
          healthy: false,
          endpoint: error.response?.status 
            ? `HTTP ${error.response.status} Error` 
            : "Network Error",
        },
      });
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  // Fetch system info
  const fetchSystemInfo = async () => {
    try {
      const response = await apiClient.get("/admin/system-info");
      if (response.data.success) {
        setSystemInfo(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch system info:", error);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (
      window.confirm(
        "Are you sure you want to clear all logs? This action cannot be undone."
      )
    ) {
      try {
        await apiClient.post("/admin/logs/clear");
        setLogs({ error: [], output: [], combined: [] });
      } catch (error) {
        console.error("Failed to clear logs:", error);
      }
    }
  };

  // Refresh all data
  const handleRefresh = () => {
    fetchLogs();
    fetchSystemInfo();
    fetchDiagnostics();
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchSystemInfo();
        fetchDiagnostics();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, lines]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    fetchSystemInfo();
    fetchDiagnostics();
  }, [lines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Check if user is SUPER_ADMIN
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <XCircleIcon className="h-6 w-6" />
                Access Denied
              </CardTitle>
              <CardDescription>
                This page is only accessible to SUPER_ADMIN users.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const formatUptime = (seconds) => {
    if (!seconds) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "N/A";
    const mb = (bytes / 1024 / 1024).toFixed(2);
    return `${mb} MB`;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusBadge = (connected) => {
    return connected ? (
      <Badge className="bg-green-500 hover:bg-green-600">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircleIcon className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              System Terminal
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor system health, logs, and diagnostics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <ArrowPathIcon
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="health" className="gap-2">
              <ChartBarIcon className="h-4 w-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Error Analysis
            </TabsTrigger>
          </TabsList>

          {/* System Health Tab */}
          <TabsContent value="health" className="space-y-6 mt-6">
            {/* Quick Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Deployment Status */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Deployment
                  </CardTitle>
                  <ServerIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {diagnosticsLoading && !diagnostics ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {diagnostics?.deployment?.version || "Unknown"}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {diagnostics?.deployment?.message || diagnostics?.deployment?.name || "No info available"}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Database Status */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Database
                  </CardTitle>
                  <CircleStackIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {diagnosticsLoading && !diagnostics ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(diagnostics?.database?.connected)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {diagnostics?.database?.message || 
                         (diagnostics?.database?.connected ? "Connected" : "Status unknown")}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* API Health */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    API Health
                  </CardTitle>
                  <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {diagnosticsLoading && !diagnostics ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(diagnostics?.api?.healthy)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {diagnostics?.api?.endpoint || "Endpoint unknown"}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* System Info */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Uptime
                  </CardTitle>
                  <CpuChipIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatUptime(systemInfo?.uptime)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Node {systemInfo?.nodeVersion || "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Diagnostics */}
            {diagnostics && (
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Diagnostics</CardTitle>
                  <CardDescription>
                    Complete system health information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Deployment Info */}
                    <div className="border-b pb-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <ServerIcon className="h-4 w-4" />
                        Deployment Information
                      </h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Version:
                          </span>
                          <span className="font-mono">
                            {diagnostics.deployment?.version}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Environment:</span>
                          <span className="font-mono">
                            {diagnostics.deployment?.environment || diagnostics.deployment?.status || "N/A"}
                          </span>
                        </div>
                        {diagnostics.deployment?.nodeVersion && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Node Version:</span>
                            <span className="font-mono">
                              {diagnostics.deployment.nodeVersion}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Database Info */}
                    <div className="border-b pb-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <CircleStackIcon className="h-4 w-4" />
                        Database Information
                      </h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Connection:
                          </span>
                          {getStatusBadge(diagnostics.database?.connected)}
                        </div>
                        {diagnostics.database?.counts && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Partners:
                              </span>
                              <span className="font-mono">
                                {diagnostics.database.counts.partners}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Centers:
                              </span>
                              <span className="font-mono">
                                {diagnostics.database.counts.centers}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Students:
                              </span>
                              <span className="font-mono">
                                {diagnostics.database.counts.students}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* System Info */}
                    {systemInfo && (
                      <div className="border-b pb-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <CpuChipIcon className="h-4 w-4" />
                          System Information
                        </h4>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Platform:
                            </span>
                            <span className="font-mono">
                              {systemInfo.platform}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Memory:
                            </span>
                            <span className="font-mono">
                              {formatBytes(systemInfo.memory?.used)} /{" "}
                              {formatBytes(systemInfo.memory?.total)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              CPU Usage:
                            </span>
                            <span className="font-mono">
                              {systemInfo.cpuUsage?.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PM2 Info */}
                    {diagnostics.pm2 && diagnostics.pm2.status !== 'unavailable' && (
                      <div className="border-b pb-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <ServerIcon className="h-4 w-4" />
                          PM2 Process
                        </h4>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={diagnostics.pm2.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}>
                              {diagnostics.pm2.status}
                            </Badge>
                          </div>
                          {diagnostics.pm2.uptime && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Uptime:</span>
                              <span className="font-mono">{formatUptime(diagnostics.pm2.uptime)}</span>
                            </div>
                          )}
                          {diagnostics.pm2.restarts !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Restarts:</span>
                              <span className="font-mono">{diagnostics.pm2.restarts}</span>
                            </div>
                          )}
                          {diagnostics.pm2.memory && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Memory:</span>
                              <span className="font-mono">{diagnostics.pm2.memory}</span>
                            </div>
                          )}
                          {diagnostics.pm2.cpu && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CPU:</span>
                              <span className="font-mono">{diagnostics.pm2.cpu}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Critical Issues */}
                    {diagnostics.criticalIssues && diagnostics.criticalIssues.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          Critical Issues
                        </h4>
                        <div className="space-y-3">
                          {diagnostics.criticalIssues.map((issue, index) => (
                            <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                              <p className="font-medium text-sm text-red-900">{issue.title}</p>
                              <p className="text-xs text-red-700 mt-1">{issue.description}</p>
                              {issue.solution && (
                                <p className="text-xs text-red-600 mt-2">
                                  <strong>Solution:</strong> {issue.solution}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Application Logs</CardTitle>
                    <CardDescription>
                      View error, output, and combined logs
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={lines}
                      onChange={(e) => setLines(Number(e.target.value))}
                      className="px-3 py-2 border rounded-md text-sm"
                    >
                      <option value={50}>50 lines</option>
                      <option value={100}>100 lines</option>
                      <option value={200}>200 lines</option>
                      <option value={500}>500 lines</option>
                    </select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearLogs}
                    >
                      Clear Logs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="error" className="w-full">
                  <TabsList>
                    <TabsTrigger value="error">
                      Errors ({logs.error.length})
                    </TabsTrigger>
                    <TabsTrigger value="output">
                      Output ({logs.output.length})
                    </TabsTrigger>
                    <TabsTrigger value="combined">
                      Combined ({logs.combined.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="error" className="mt-4">
                    <div
                      ref={terminalRef}
                      className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-[500px] overflow-y-auto"
                    >
                      {logs.error.length === 0 ? (
                        <div className="text-gray-500">No error logs found</div>
                      ) : (
                        logs.error.map((line, idx) => (
                          <div key={idx} className="mb-1">
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="output" className="mt-4">
                    <div
                      className="bg-black text-blue-400 p-4 rounded-lg font-mono text-sm h-[500px] overflow-y-auto"
                    >
                      {logs.output.length === 0 ? (
                        <div className="text-gray-500">No output logs found</div>
                      ) : (
                        logs.output.map((line, idx) => (
                          <div key={idx} className="mb-1">
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="combined" className="mt-4">
                    <div
                      className="bg-black text-white p-4 rounded-lg font-mono text-sm h-[500px] overflow-y-auto"
                    >
                      {logs.combined.length === 0 ? (
                        <div className="text-gray-500">No logs found</div>
                      ) : (
                        logs.combined.map((line, idx) => (
                          <div key={idx} className="mb-1">
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Error Analysis Tab */}
          <TabsContent value="errors" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Pattern Analysis</CardTitle>
                <CardDescription>
                  Categorized error summary from logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorSummary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircleIcon className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>No errors detected in recent logs</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {errorSummary.map((error, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="font-medium">{error.type}</p>
                            <p className="text-sm text-muted-foreground">
                              Occurred {error.count} time
                              {error.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <span className="text-2xl font-bold text-muted-foreground">
                            {error.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminTerminalPageV2;
