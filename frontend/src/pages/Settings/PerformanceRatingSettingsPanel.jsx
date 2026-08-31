import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  createPerformanceRatingSetting,
  deletePerformanceRatingSetting,
  getPerformanceRatingSettings,
  updatePerformanceRatingSetting,
} from "../../services/certification.service";

const EMPTY_FORM = { minScore: "", maxScore: "", stars: 1, rating: 1 };

const PerformanceRatingSettingsPanel = () => {
  const [settings, setSettings] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await getPerformanceRatingSettings());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rating settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        minScore: Number(form.minScore),
        maxScore: form.maxScore === "" ? null : Number(form.maxScore),
        stars: Number(form.stars),
        rating: Number(form.rating),
      };
      if (editingId) {
        await updatePerformanceRatingSetting(editingId, payload);
      } else {
        await createPerformanceRatingSetting(payload);
      }
      resetForm();
      await loadSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save rating setting.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (setting) => {
    setEditingId(setting.id);
    setForm({
      minScore: setting.minScore,
      maxScore: setting.maxScore ?? "",
      stars: setting.stars,
      rating: setting.rating,
    });
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this performance rating range?")) return;
    setError(null);
    try {
      await deletePerformanceRatingSetting(id);
      if (editingId === id) resetForm();
      await loadSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete rating setting.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
        Configure score ranges and their star/rating values. These settings are
        saved for future reporting use; reporting calculations are not changed here.
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <XCircleIcon className="w-4 h-4" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircleIcon className="w-4 h-4" />
          Rating setting saved successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          {editingId ? "Edit rating range" : "Add rating range"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-sm text-gray-600">
            Minimum score
            <input
              required
              type="number"
              min="0"
              value={form.minScore}
              onChange={(e) => setForm({ ...form, minScore: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Maximum score
            <input
              type="number"
              min="0"
              placeholder="Above / no limit"
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Stars
            <input
              required
              type="number"
              min="1"
              max="5"
              value={form.stars}
              onChange={(e) => setForm({ ...form, stars: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Rating
            <input
              required
              type="number"
              min="1"
              max="5"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm border rounded-lg">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#009530] text-white rounded-lg disabled:opacity-60"
          >
            <PlusIcon className="w-4 h-4" />
            {saving ? "Saving..." : editingId ? "Update range" : "Add range"}
          </button>
        </div>
      </form>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading rating settings...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3">Score range</th>
                <th className="text-center px-4 py-3">Stars</th>
                <th className="text-center px-4 py-3">Rating</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settings.map((setting) => (
                <tr key={setting.id}>
                  <td className="px-4 py-3">
                    {setting.minScore} - {setting.maxScore ?? "above"}
                  </td>
                  <td className="px-4 py-3 text-center">{"★".repeat(setting.stars)}</td>
                  <td className="px-4 py-3 text-center">Rating {setting.rating}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(setting)} className="p-1.5 text-gray-500 hover:text-green-700">
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(setting.id)} className="p-1.5 text-gray-500 hover:text-red-700">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PerformanceRatingSettingsPanel;
