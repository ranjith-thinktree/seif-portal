import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import apiClient from '../../api/client';

const AdminTerminalPage = () => {
  const [logs, setLogs] = useState({ error: [], output: [], combined: [] });
  const [systemInfo, setSystemInfo] = useState(null);
  const [selectedTab, setSelectedTab] = useState('error');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState(100);
  const terminalRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/logs?lines=${lines}&type=all`);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch system info
  const fetchSystemInfo = async () => {
    try {
      const response = await apiClient.get('/admin/system-info');
      if (response.data.success) {
        setSystemInfo(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      try {
        await apiClient.post('/admin/logs/clear');
        setLogs({ error: [], output: [], combined: [] });
        alert('Logs cleared successfully');
      } catch (error) {
        console.error('Failed to clear logs:', error);
        alert('Failed to clear logs');
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
      }, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, lines]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
    fetchSystemInfo();
  }, [lines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, selectedTab]);

  // Check if user is SUPER_ADMIN
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to SUPER_ADMIN users.</p>
        </div>
      </div>
    );
  }

  const getCurrentLogs = () => {
    switch (selectedTab) {
      case 'error':
        return logs.error;
      case 'output':
        return logs.output;
      case 'combined':
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🖥️ Admin Terminal</h1>
          <p className="text-gray-600">Real-time application logs and system monitoring</p>
        </div>

        {/* System Info */}
        {systemInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">System Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Node Version</p>
                <p className="text-lg font-semibold text-blue-600">{systemInfo.node_version}</p>
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
                  {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">CPU Cores</p>
                <p className="text-lg font-semibold text-yellow-600">{systemInfo.cpu.cores}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Environment</p>
                <p className="text-lg font-semibold text-red-600">{systemInfo.environment}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Process ID</p>
                <p className="text-lg font-semibold text-indigo-600">{systemInfo.pid}</p>
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
                onClick={() => setSelectedTab('error')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Error Logs ({logs.error.length})
              </button>
              <button
                onClick={() => setSelectedTab('output')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === 'output'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Output Logs ({logs.output.length})
              </button>
              <button
                onClick={() => setSelectedTab('combined')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedTab === 'combined'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Combined ({logs.combined.length})
              </button>
            </div>

            <div className="flex-1"></div>

            {/* Lines Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Lines:</label>
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
              <span className="text-sm font-medium text-gray-700">Auto Refresh (5s)</span>
            </label>

            {/* Action Buttons */}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
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
            style={{ backgroundColor: '#0d1117' }}
          >
            {getCurrentLogs().length === 0 ? (
              <p className="text-gray-500">No logs available. Click Refresh to fetch logs.</p>
            ) : (
              getCurrentLogs().map((line, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    line.includes('error') || line.includes('Error')
                      ? 'text-red-400'
                      : line.includes('warning') || line.includes('Warning')
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  <span className="text-gray-600">{index + 1} | </span>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Last updated: {logs.timestamp ? new Date(logs.timestamp).toLocaleString() : 'Never'}</p>
          <p className="mt-1">
            ⚠️ This terminal shows application logs from the backend server. Use it to debug issues
            in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminTerminalPage;
