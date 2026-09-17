import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowPathIcon,
  EnvelopeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  getEmailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  testEmailTemplate,
} from "../../services/certification.service";

const EmailTemplatesPanel = () => {
  const { user } = useSelector((state) => state.auth);
  const [templates, setTemplates] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testEmail, setTestEmail] = useState(user?.email || "");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEmailTemplates();
      setTemplates(data);
      const nextKey = selectedKey || data[0]?.key;
      const current = data.find((item) => item.key === nextKey) || data[0];
      if (current) {
        setSelectedKey(current.key);
        setSubject(current.subject);
        setBody(current.body);
      }
    } catch {
      setError("Failed to load email templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => templates.find((item) => item.key === selectedKey),
    [templates, selectedKey],
  );

  const categories = useMemo(
    () => [...new Set(templates.map((item) => item.category))],
    [templates],
  );

  const handleSelect = (key) => {
    const current = templates.find((item) => item.key === key);
    if (!current) return;
    setSelectedKey(key);
    setSubject(current.subject);
    setBody(current.body);
    setMessage("");
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateEmailTemplate(selectedKey, { subject, body });
      setTemplates((prev) =>
        prev.map((item) => (item.key === selectedKey ? updated : item)),
      );
      setMessage("Draft saved. Future emails will use this wording.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await resetEmailTemplate(selectedKey);
      setTemplates((prev) =>
        prev.map((item) => (item.key === selectedKey ? updated : item)),
      );
      setSubject(updated.subject);
      setBody(updated.body);
      setMessage("Restored the original draft.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restore draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const result = await testEmailTemplate(selectedKey, testEmail);
      setMessage(result.message || `Test email sent to ${testEmail}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Test email failed. Check SMTP settings and restart the backend.",
      );
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
        Loading email drafts…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-medium text-gray-700">
          Notification drafts
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-50">
                {category}
              </div>
              {templates
                .filter((item) => item.category === category)
                .map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSelect(item.key)}
                    className={`w-full text-left px-4 py-3 text-sm border-b hover:bg-gray-50 ${
                      item.key === selectedKey
                        ? "bg-green-50 text-[#009530]"
                        : "text-gray-700"
                    }`}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      To {item.audience}
                      {item.isCustomized ? " · edited" : ""}
                    </div>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            {message}
          </div>
        )}

        {selected && (
          <>
            <p className="text-sm text-gray-500">
              Edit the draft below. Placeholders such as{" "}
              <code>{"{{partnerName}}"}</code>, <code>{"{{centerName}}"}</code>,{" "}
              <code>{"{{date}}"}</code> are filled automatically. Mail is sent
              from the noreply address.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[320px] font-mono"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#009530] text-white text-sm rounded-lg disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2 border text-sm rounded-lg"
              >
                Restore default
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <input
                  className="border rounded-lg px-3 py-2 text-sm w-56"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.com"
                />
                <button
                  onClick={handleTest}
                  disabled={testing || !testEmail}
                  className="px-4 py-2 border text-sm rounded-lg inline-flex items-center gap-2"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  {testing ? "Sending…" : "Send test"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesPanel;
