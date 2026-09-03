import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  LockClosedIcon,
  TableCellsIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import {
  getPortalSettings,
  updateInstruction,
  updateTemplate,
} from "../../services/certification.service";
import KpiSettingsPanel from "./KpiSettingsPanel";
import DashboardDataEditor from "./DashboardDataEditor";
import PerformanceRatingSettingsPanel from "./PerformanceRatingSettingsPanel";
import EmailTemplatesPanel from "./EmailTemplatesPanel";

const INSTRUCTION_KEYS = [
  {
    key: "student_data_instructions",
    label: "Student Data Upload",
    description:
      "Instructions shown to partners on the Student Data upload tab",
  },
  {
    key: "employment_instructions",
    label: "Employment Data Upload",
    description:
      "Instructions shown to partners on the Employment Data upload tab",
  },
  {
    key: "certification_instructions",
    label: "Certification Data Upload",
    description:
      "Instructions shown to partners on the Certification upload tab",
  },
];

const TEMPLATE_KEYS = [
  {
    key: "student_data_template_url",
    label: "Student Data Template",
    description: "Excel template (.xlsx) for student data uploads",
  },
  {
    key: "employment_template_url",
    label: "Employment Data Template",
    description: "Excel template (.xlsx) for employment data uploads",
  },
  {
    key: "certification_template_url",
    label: "Certification Data Template",
    description: "Excel template (.xlsx) for certification data uploads",
  },
];

/* ── Instruction Row ──────────────────────────────────────────── */
const InstructionRow = ({ config, settings, onSaved }) => {
  const current = settings[config.key] || {};
  const [value, setValue] = useState(current.value || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(settings[config.key]?.value || "");
  }, [settings, config.key]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateInstruction(config.key, value);
      if (res.success) {
        setSaved(true);
        onSaved();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.message || "Save failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">
            {config.label}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <DocumentTextIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <XCircleIcon className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
            Instructions saved successfully.
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical transition"
          placeholder="Enter instructions for partners…"
        />

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#009530] text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Template Row ─────────────────────────────────────────────── */
const TemplateRow = ({ config, settings, onSaved }) => {
  const current = settings[config.key] || {};
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const handleReplace = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateTemplate(config.key, file);
      if (res.success) {
        setSaved(true);
        setFile(null);
        onSaved();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.message || "Upload failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">
            {config.label}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
        </div>
        <DocumentArrowDownIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <XCircleIcon className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
            Template replaced successfully.
          </div>
        )}

        {/* Current file display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <DocumentArrowDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">
              {current.file_name || "No template uploaded yet"}
            </span>
          </div>
          {current.file_url && (
            <a
              href={current.file_url}
              download
              className="text-xs text-green-600 hover:text-green-800 font-medium flex-shrink-0 ml-2 flex items-center gap-1"
            >
              <ArrowUpTrayIcon className="w-3 h-3 rotate-180" />
              Download
            </a>
          )}
        </div>

        {/* File picker & upload */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            {file ? (
              <span className="text-gray-800 font-medium truncate max-w-[180px]">
                {file.name}
              </span>
            ) : (
              "Choose .xlsx file"
            )}
          </button>
          {file && (
            <>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear
              </button>
              <button
                onClick={handleReplace}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#009530] text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Replace Template
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ────────────────────────────────────────────────── */
const SettingsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("instructions");
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPortalSettings();
      if (res.success) {
        setSettings(res.data || {});
      }
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const tabs = [
    {
      id: "instructions",
      label: "Upload Instructions",
      icon: DocumentTextIcon,
    },
    {
      id: "templates",
      label: "Template Files",
      icon: DocumentArrowDownIcon,
    },
    {
      id: "email-notifications",
      label: "Email Notifications",
      icon: EnvelopeIcon,
    },
    {
      id: "kpi",
      label: "KPI Cards",
      icon: ChartBarIcon,
    },
    {
      id: "dashboard-data",
      label: "Dashboard Data",
      icon: TableCellsIcon,
    },
    {
      id: "performance-ratings",
      label: "Performance Ratings",
      icon: ChartBarIcon,
    },
  ];

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="p-6 max-w-2xl mx-auto text-center mt-20">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <LockClosedIcon className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Access Restricted
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Only Admins can manage portal settings.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* ── Page Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Cog6ToothIcon className="w-6 h-6 text-[#009530]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Portal Settings
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage upload instructions, template files and KPI card
                configuration
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-3 mb-6 border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1 px-2 py-3 text-sm font-medium transition-colors relative ${
                activeTab === id
                  ? "text-[#009530] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#009530]"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading settings…</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-700">
            <XCircleIcon className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        ) : activeTab === "instructions" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-5">
              These instructions are shown to partners in the upload pages. Keep
              them clear and concise.
            </p>
            {INSTRUCTION_KEYS.map((config) => (
              <InstructionRow
                key={config.key}
                config={config}
                settings={settings}
                onSaved={fetchSettings}
              />
            ))}
          </div>
        ) : activeTab === "templates" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-5">
              Upload the standard Excel templates that partners download before
              submitting data.
            </p>
            {TEMPLATE_KEYS.map((config) => (
              <TemplateRow
                key={config.key}
                config={config}
                settings={settings}
                onSaved={fetchSettings}
              />
            ))}
          </div>
        ) : activeTab === "email-notifications" ? (
          <EmailTemplatesPanel />
        ) : activeTab === "kpi" ? (
          <KpiSettingsPanel />
        ) : activeTab === "performance-ratings" ? (
          <PerformanceRatingSettingsPanel />
        ) : (
          <DashboardDataEditor />
        )}
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
