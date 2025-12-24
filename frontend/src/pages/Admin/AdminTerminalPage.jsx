import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import apiClient from "../../api/client";

const AdminTerminalPage = () => {
  const [logs, setLogs] = useState({ error: [], output: [], combined: [] });
  const [systemInfo, setSystemInfo] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [selectedTab, setSelectedTab] = useState("error");
  const [selectedView, setSelectedView] = useState("logs"); // logs, diagnostics, deployment
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
    
    errorLines.forEach(line => {
      // Extract error types
      if (line.includes('ECONNREFUSED')) {
        errorPatterns['Database Connection Refused'] = (errorPatterns['Database Connection Refused'] || 0) + 1;
      } else if (line.includes('ER_')) {
        errorPatterns['MySQL Error'] = (errorPatterns['MySQL Error'] || 0) + 1;
      } else if (line.includes('404') || line.includes('Not Found')) {
        errorPatterns['404 Not Found'] = (errorPatterns['404 Not Found'] || 0) + 1;
      } else if (line.includes('500') || line.includes('Internal Server')) {
        errorPatterns['500 Server Error'] = (errorPatterns['500 Server Error'] || 0) + 1;
      } else if (line.includes('TypeError')) {
        errorPatterns['Type Error'] = (errorPatterns['Type Error'] || 0) + 1;
      } else if (line.includes('ReferenceError')) {
        errorPatterns['Reference Error'] = (errorPatterns['Reference Error'] || 0) + 1;
      } else if (line.includes('ETIMEDOUT')) {
        errorPatterns['Request Timeout'] = (errorPatterns['Request Timeout'] || 0) + 1;
      } else {
        errorPatterns['Other Errors'] = (errorPatterns['Other Errors'] || 0) + 1;
      }
    });

    const summary = Object.entries(errorPatterns).map(([type, count]) => ({
      type,
      count,
      severity: count > 10 ? 'critical' : count > 5 ? 'high' : 'medium'
    })).sort((a, b) => b.count - a.count);

    setErrorSummary(summary);
  };

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    try {
      const response = await apiClient.get("/admin/diagnostics");
      if (response.data.success) {
        setDiagnostics(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch diagnostics:", error);
      // Set fallback diagnostics
      setDiagnostics({
        deployment: {
          status: 'unknown',
          message: 'Unable to fetch deployment info',
        },
        database: {
          status: 'unknown',
          message: 'Unable to test connection'
        },
        api: {
          status: 'unknown',
          message: 'Unable to test API'
        }
      });
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
        alert("Logs cleared successfully");
      } catch (error) {
        console.error("Failed to clear logs:", error);
        alert("Failed to clear logs");
      }
    }
  };

  // Clear terminal display only (not server logs)
  const handleClearTerminal = () => {
    setLogs({ error: [], output: [], combined: [] });
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
        fetchSystemInfo();
        fetchDiagnostics();
      }, 5000); // Refresh every 5 seconds
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
  }, [logs, selectedTab]);

  // Check if user is SUPER_ADMIN
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            This page is only accessible to SUPER_ADMIN users.
          </p>
        </div>
      </div>
    );
  }

  const getCurrentLogs = () => {
    switch (selectedTab) {
      case "error":
        return logs.error;
      case "output":
        return logs.output;
      case "combined":
        return logs.combined;
      default:
        return [];
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🖥️ System Diagnostics & Monitoring
          </h1>
          <p className="text-gray-600">
            Comprehensive system monitoring, deployment tracking, and error analysis
          </p>
        </div>

        {/* View Selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView("diagnostics")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                selectedView === "diagnostics"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              📊 System Health
            </button>
            <button
              onClick={() => setSelectedView("logs")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                selectedView === "logs"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              📝 Logs & Errors
            </button>
            <button
              onClick={() => setSelectedView("errors")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                selectedView === "errors"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              ⚠️ Error Analysis ({errorSummary.length})
            </button>
          </div>
        </div>

        </div>

        {/* Diagnostics View */}
        {selectedView === "diagnostics" && diagnostics && (
          <div className="space-y-6">
            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`p-6 rounded-lg shadow-md ${
                diagnostics.database?.connected ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Database</p>
                    <p className={`text-2xl font-bold ${
                      diagnostics.database?.connected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {diagnostics.database?.connected ? '✅ Connected' : '❌ Disconnected'}
                    </p>
                    {diagnostics.database?.responseTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        {diagnostics.database.responseTime}ms
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-lg shadow-md ${
                diagnostics.api?.healthy ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">API Status</p>
                    <p className={`text-2xl font-bold ${
                      diagnostics.api?.healthy ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {diagnostics.api?.healthy ? '✅ Healthy' : '⚠️ Issues'}
                    </p>
                    {diagnostics.api?.endpoint && (
                      <p className="text-xs text-gray-500 mt-1">
                        {diagnostics.api.endpoint}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg shadow-md bg-blue-50 border-2 border-blue-200">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Deployment</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {diagnostics.deployment?.version || 'Unknown'}
                  </p>
                  {diagnostics.deployment?.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(diagnostics.deployment.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-lg shadow-md bg-purple-50 border-2 border-purple-200">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Active Errors</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {logs.error?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last {lines} lines
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Diagnostics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                🔍 Detailed System Diagnostics
              </h2>
              <div className="space-y-4">
                {/* Database Info */}
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Database Connection</h3>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-700">
                      <span className="font-medium">Status:</span>{" "}
                      <span className={diagnostics.database?.connected ? 'text-green-600' : 'text-red-600'}>
                        {diagnostics.database?.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </p>
                    {diagnostics.database?.host && (
                      <p className="text-gray-700">
                        <span className="font-medium">Host:</span> {diagnostics.database.host}
                      </p>
                    )}
                    {diagnostics.database?.database && (
                      <p className="text-gray-700">
                        <span className="font-medium">Database:</span> {diagnostics.database.database}
                      </p>
                    )}
                    {diagnostics.database?.responseTime && (
                      <p className="text-gray-700">
                        <span className="font-medium">Response Time:</span> {diagnostics.database.responseTime}ms
                      </p>
                    )}
                    {diagnostics.database?.counts && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Partners</p>
                          <p className="font-semibold text-blue-600">{diagnostics.database.counts.partners}</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Centers</p>
                          <p className="font-semibold text-green-600">{diagnostics.database.counts.centers}</p>
                        </div>
                        <div className="bg-purple-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Students</p>
                          <p className="font-semibold text-purple-600">{diagnostics.database.counts.students}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* File Verification */}
                {diagnostics.files && (
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <h3 className="font-semibold text-gray-900 mb-2">Deployed Files Verification</h3>
                    <div className="text-sm space-y-2">
                      {Object.entries(diagnostics.files).map(([fileName, hash]) => (
                        <div key={fileName} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="font-medium text-gray-700">{fileName}:</span>
                          <span className="font-mono text-xs text-gray-600">{hash}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PM2 Status */}
                {diagnostics.pm2 && (
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <h3 className="font-semibold text-gray-900 mb-2">PM2 Process Status</h3>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-700">
                        <span className="font-medium">Name:</span> {diagnostics.pm2.name || 'N/A'}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Status:</span>{" "}
                        <span className={diagnostics.pm2.status === 'online' ? 'text-green-600' : 'text-red-600'}>
                          {diagnostics.pm2.status || 'Unknown'}
                        </span>
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Uptime:</span> {diagnostics.pm2.uptime || 'N/A'}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Restarts:</span> {diagnostics.pm2.restarts || 0}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Memory:</span> {diagnostics.pm2.memory || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Test Results */}
                {diagnostics.tests && (
                  <div className="border-l-4 border-yellow-500 pl-4 py-2">
                    <h3 className="font-semibold text-gray-900 mb-2">API Endpoint Tests</h3>
                    <div className="space-y-2">
                      {diagnostics.tests.map((test, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <span className={test.passed ? 'text-green-600' : 'text-red-600'}>
                              {test.passed ? '✅' : '❌'}
                            </span>
                            <span className="font-medium text-gray-700">{test.endpoint}</span>
                          </div>
                          <span className="text-sm text-gray-600">{test.responseTime}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Critical Issues Alert */}
            {diagnostics.criticalIssues && diagnostics.criticalIssues.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
                  🚨 Critical Issues Detected
                </h2>
                <div className="space-y-2">
                  {diagnostics.criticalIssues.map((issue, idx) => (
                    <div key={idx} className="bg-white p-4 rounded border-l-4 border-red-500">
                      <p className="font-semibold text-red-700">{issue.title}</p>
                      <p className="text-sm text-gray-700 mt-1">{issue.description}</p>
                      {issue.solution && (
                        <p className="text-sm text-blue-600 mt-2">
                          💡 <span className="font-medium">Solution:</span> {issue.solution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Analysis View */}
        {selectedView === "errors" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                📈 Error Pattern Analysis
              </h2>
              
              {errorSummary.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-green-600 text-lg font-semibold">✅ No errors detected!</p>
                  <p className="text-gray-600 mt-2">Your application is running smoothly.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {errorSummary.map((error, idx) => (
                    <div key={idx} className={`border-l-4 p-4 rounded-r-lg ${
                      error.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      error.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      'border-yellow-500 bg-yellow-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{error.type}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Occurred {error.count} time{error.count > 1 ? 's' : ''} in the last {lines} log lines
                          </p>
                        </div>
                        <div className={`px-4 py-2 rounded-full font-semibold ${
                          error.severity === 'critical' ? 'bg-red-200 text-red-800' :
                          error.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {error.severity.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Common Solutions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                💡 Common Error Solutions
              </h2>
              <div className="space-y-3 text-sm">
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-900">Database Connection Refused (ECONNREFUSED)</p>
                  <p className="text-gray-700 mt-1">→ Check if MySQL is running and credentials are correct</p>
                </div>
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-900">MySQL Errors (ER_*)</p>
                  <p className="text-gray-700 mt-1">→ Check SQL syntax and database schema migrations</p>
                </div>
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-900">Type/Reference Errors</p>
                  <p className="text-gray-700 mt-1">→ Check for undefined variables or incorrect data types</p>
                </div>
                <div className="bg-white p-3 rounded">
                  <p className="font-semibold text-gray-900">Request Timeouts (ETIMEDOUT)</p>
                  <p className="text-gray-700 mt-1">→ Check network connectivity and increase timeout limits</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs View */}
        {selectedView === "logs" && (
          <div className="space-y-6">
            {/* System Info */}
        {systemInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">System Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Node Version</p>
                <p className="text-lg font-semibold text-blue-600">
                  {systemInfo.node_version}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatUptime(systemInfo.uptime)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="text-lg font-semibold text-purple-600">
                  {systemInfo.memory.usagePercent}%
                </p>
                <p className="text-xs text-gray-500">
                  {formatBytes(systemInfo.memory.used)} /{" "}
                  {formatBytes(systemInfo.memory.total)}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">CPU Cores</p>
                <p className="text-lg font-semibold text-yellow-600">
                  {systemInfo.cpu.cores}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Environment</p>
                <p className="text-lg font-semibold text-red-600">
                  {systemInfo.environment}
                </p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Process ID</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {systemInfo.pid}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Terminal Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Tab Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTab("error")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === "error"
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Error Logs ({logs.error.length})
              </button>
              <button
                onClick={() => setSelectedTab("output")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === "output"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Output Logs ({logs.output.length})
              </button>
              <button
                onClick={() => setSelectedTab("combined")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === "combined"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Combined ({logs.combined.length})
              </button>
            </div>

            <div className="flex-1"></div>

            {/* Lines Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Lines:
              </label>
              <select
                value={lines}
                onChange={(e) => setLines(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </div>

            {/* Auto Refresh Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Auto Refresh (5s)
              </span>
            </label>

            {/* Action Buttons */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? "Loading..." : "🔄 Refresh"}
            </button>

            <button
              onClick={handleClearTerminal}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              🗑️ Clear Display
            </button>

            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              ⚠️ Clear Server Logs
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-4 text-gray-300 text-sm font-medium">
              {selectedTab.toUpperCase()} LOGS - {new Date().toLocaleString()}
            </span>
          </div>
          <div
            ref={terminalRef}
            className="p-4 h-[600px] overflow-y-auto font-mono text-sm text-green-400"
            style={{ backgroundColor: "#0d1117" }}
          >
            {getCurrentLogs().length === 0 ? (
              <p className="text-gray-500">
                No logs available. Click Refresh to fetch logs.
              </p>
            ) : (
              getCurrentLogs().map((line, index) => {
                // Enhanced error detection
                const isError = line.match(
                  /error|Error|ERROR|Failed|failed|Exception|errno|sqlMessage/i
                );
                const isWarning = line.match(/warning|Warning|WARN/i);
                const isSuccess = line.match(
                  /success|Success|✅|connected|started/i
                );
                const isInfo = line.match(/INFO|info|🔵|📡|🚀/);

                return (
                  <div
                    key={index}
                    className={`mb-1 ${
                      isError
                        ? "text-red-400 bg-red-900/20 px-2 py-0.5 rounded"
                        : isWarning
                        ? "text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded"
                        : isSuccess
                        ? "text-green-400"
                        : isInfo
                        ? "text-blue-400"
                        : "text-gray-300"
                    }`}
                  >
                    <span className="text-gray-600">{index + 1} | </span>
                    {isError && (
                      <span className="text-red-500 font-bold">❌ </span>
                    )}
                    {isWarning && (
                      <span className="text-yellow-500 font-bold">⚠️ </span>
                    )}
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            Last updated:{" "}
            {logs.timestamp
              ? new Date(logs.timestamp).toLocaleString()
              : "Never"}
          </p>
          <p className="mt-1">
            ⚠️ This dashboard shows real-time application diagnostics, logs, and error analysis.
          </p>
          <p className="mt-1">
            🔄 Auto-refresh: {autoRefresh ? 'Enabled (5s)' : 'Disabled'} | 
            📊 Monitoring {lines} log lines
          </p>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTerminalPage;
