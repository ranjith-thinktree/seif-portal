import React, { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

const SettingsTab = ({ settings, loading = false, saving = false, onSave }) => {
  const [form, setForm] = useState({
    defaultCustomMessage: "",
    firstCycleYears: 5,
    repeatCycleYears: 3,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      defaultCustomMessage: settings.defaultCustomMessage || "",
      firstCycleYears: settings.firstCycleYears || 5,
      repeatCycleYears: settings.repeatCycleYears || 3,
    });
  }, [settings]);

  const handleSave = () => {
    if (!onSave) return;
    onSave({
      defaultCustomMessage: form.defaultCustomMessage,
      firstCycleYears: Number(form.firstCycleYears),
      repeatCycleYears: Number(form.repeatCycleYears),
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Refurbishment Settings
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure default custom message and eligibility cycle criteria.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Custom Message
        </label>
        <Textarea
          value={form.defaultCustomMessage}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              defaultCustomMessage: e.target.value,
            }))
          }
          rows={5}
          disabled={loading || saving}
          placeholder="Enter default custom message"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            New Center Cycle (Years)
          </label>
          <Input
            type="number"
            min={1}
            max={30}
            value={form.firstCycleYears}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, firstCycleYears: e.target.value }))
            }
            disabled={loading || saving}
          />
          <p className="text-xs text-gray-500">
            Current rule for first refurbishment eligibility.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Repeat Cycle (Years)
          </label>
          <Input
            type="number"
            min={1}
            max={30}
            value={form.repeatCycleYears}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, repeatCycleYears: e.target.value }))
            }
            disabled={loading || saving}
          />
          <p className="text-xs text-gray-500">
            Current rule for second and later refurbishment cycles.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsTab;
