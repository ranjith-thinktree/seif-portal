import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import apiClient from "../../api/client";
import { useSelector } from "react-redux";
import { MainLayout } from "../../components/layout";
import {
  QuestionMarkCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpTrayIcon,
  PlayCircleIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const SECTIONS = [
  "general",
  "upload",
  "review",
  "reports",
  "administration",
  "other",
];

/**
 * HelpPage — User Manual with tutorial videos
 * - All roles: view videos organised by section
 * - Admin/Super Admin: upload and manage videos
 */
const HelpPage = () => {
  const user = useSelector((s) => s.auth?.user);
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("all");
  const [playingId, setPlayingId] = useState(null);

  // Admin-only state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchTutorials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/tutorials");
      setTutorials(res.data.data || []);
    } catch {
      toast.error("Failed to load tutorials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tutorial video?")) return;
    try {
      await apiClient.delete(`/tutorials/${id}`);
      toast.success("Tutorial deleted");
      setTutorials((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Failed to delete tutorial");
    }
  };

  // Group by section
  const sections = ["all", ...new Set(tutorials.map((t) => t.section))];
  const filtered =
    activeSection === "all"
      ? tutorials
      : tutorials.filter((t) => t.section === activeSection);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <QuestionMarkCircleIcon className="w-6 h-6 text-[#009530]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Help & User Manual
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Tutorial videos to guide you through the portal
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditTarget(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#009530] hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Tutorial
            </button>
          )}
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full border whitespace-nowrap transition-colors ${
                activeSection === sec
                  ? "bg-[#009530] border-[#009530] text-white"
                  : "border-gray-300 text-gray-600 hover:border-[#009530] hover:text-[#009530]"
              }`}
            >
              {sec.charAt(0).toUpperCase() + sec.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <ArrowPathIcon className="w-8 h-8 text-[#009530] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <PlayCircleIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No tutorial videos yet</p>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditTarget(null);
                  setShowAddModal(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#009530] text-white text-sm rounded-lg"
              >
                <PlusIcon className="w-4 h-4" /> Add First Tutorial
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tutorial) => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                isAdmin={isAdmin}
                isPlaying={playingId === tutorial.id}
                onPlay={() =>
                  setPlayingId(playingId === tutorial.id ? null : tutorial.id)
                }
                onEdit={() => {
                  setEditTarget(tutorial);
                  setShowAddModal(true);
                }}
                onDelete={() => handleDelete(tutorial.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <TutorialFormModal
          tutorial={editTarget}
          onClose={() => {
            setShowAddModal(false);
            setEditTarget(null);
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditTarget(null);
            fetchTutorials();
          }}
        />
      )}
    </MainLayout>
  );
};

/**
 * Individual tutorial video card
 */
const TutorialCard = ({
  tutorial,
  isAdmin,
  isPlaying,
  onPlay,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Video player area */}
      <div className="bg-gray-900 aspect-video relative flex items-center justify-center">
        {isPlaying ? (
          <video
            className="w-full h-full object-contain"
            src={tutorial.stream_url || tutorial.video_url}
            controls
            autoPlay
          />
        ) : (
          <button
            onClick={onPlay}
            className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <PlayCircleIcon className="w-16 h-16" />
            <span className="text-xs font-medium">Click to play</span>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
              {tutorial.title}
            </h3>
            {tutorial.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {tutorial.description}
              </p>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-[#009530] hover:bg-green-50 rounded-lg transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-50 text-[#009530] text-xs rounded-full font-medium">
            {tutorial.section}
          </span>
          {tutorial.created_by_name && (
            <span className="text-xs text-gray-400">
              by {tutorial.created_by_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Add/Edit tutorial form modal with S3 upload support
 */
const TutorialFormModal = ({ tutorial, onClose, onSaved }) => {
  const isEdit = !!tutorial;
  const [form, setForm] = useState({
    title: tutorial?.title || "",
    description: tutorial?.description || "",
    section: tutorial?.section || "general",
    order_index: tutorial?.order_index ?? 0,
    role_audience: tutorial?.role_audience || null,
  });
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setVideoFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("Title is required");
      return;
    }
    if (!isEdit && !videoFile) {
      toast.error("Please select a video file");
      return;
    }

    setSaving(true);
    try {
      let videoUrl = tutorial?.video_url || "";
      let s3Key = tutorial?.s3_key || null;

      // Upload video file to S3 if new file selected
      if (videoFile) {
        setUploading(true);
        setUploadProgress(0);

        const urlRes = await apiClient.post("/tutorials/upload-url", {
          fileName: videoFile.name,
          contentType: videoFile.type,
        });
        const { uploadUrl, fileUrl, s3Key: newKey } = urlRes.data.data;

        // Upload directly to S3
        await axios.put(uploadUrl, videoFile, {
          headers: { "Content-Type": videoFile.type },
          onUploadProgress: (e) => {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          },
        });

        videoUrl = fileUrl;
        s3Key = newKey;
        setUploading(false);
      }

      const payload = { ...form, video_url: videoUrl, s3_key: s3Key };

      if (isEdit) {
        await apiClient.put(`/tutorials/${tutorial.id}`, payload);
        toast.success("Tutorial updated");
      } else {
        await apiClient.post("/tutorials", payload);
        toast.success("Tutorial added");
      }

      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save tutorial");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? "Edit Tutorial" : "Add Tutorial Video"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530]"
              placeholder="e.g. How to upload student data"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530] resize-none"
              placeholder="Brief description of what this video covers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Section
              </label>
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530]"
              >
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Order
              </label>
              <input
                type="number"
                min={0}
                value={form.order_index}
                onChange={(e) =>
                  setForm({
                    ...form,
                    order_index: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009530]"
              />
            </div>
          </div>

          {/* Video file upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Video File {isEdit ? "(leave empty to keep existing)" : "*"}
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                videoFile
                  ? "border-[#009530] bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <ArrowUpTrayIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              {videoFile ? (
                <p className="text-sm font-medium text-gray-700">
                  {videoFile.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Click to select video (MP4, WebM, MOV)
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {uploading && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-[#009530] h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-[#009530] hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              {saving || uploading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  {uploading ? "Uploading…" : "Saving…"}
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  {isEdit ? "Save Changes" : "Add Tutorial"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HelpPage;
