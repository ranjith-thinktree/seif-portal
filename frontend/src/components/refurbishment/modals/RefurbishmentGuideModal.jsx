import React, { useState } from "react";
import { Dialog, DialogContent, DialogOverlay } from "../../ui/dialog";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import apiClient from "../../../api/client";
import { toast } from "react-toastify";

const STEPS = [
  {
    number: 1,
    icon: ClipboardDocumentListIcon,
    title: "Select Packages & Justify",
    description:
      "Browse through the admin-curated packages for your center. Select all that apply and optionally provide a brief justification or attach supporting photos for each package.",
    color: "green",
  },
  {
    number: 2,
    icon: CheckCircleIcon,
    title: "Upgradation Request (Optional)",
    description:
      "Indicate whether you require any infrastructure or equipment upgradation. If yes, you will select from the available upgradation packages.",
    color: "blue",
  },
  {
    number: 3,
    icon: PhotoIcon,
    title: "Upload Documents",
    description:
      "Attach the completed refurbishment template (mandatory) and the upgradation template (if applicable) along with any other supporting documents.",
    color: "purple",
  },
  {
    number: 4,
    icon: PaperAirplaneIcon,
    title: "Review & Submit",
    description:
      "Preview all your selections on a summary screen. Once satisfied, submit your request. The SEIF admin team will review and respond.",
    color: "orange",
  },
];

const COLOR_MAP = {
  green: {
    circle: "bg-green-100 text-green-700",
    border: "border-green-200",
    bg: "bg-green-50",
    text: "text-green-700",
  },
  blue: {
    circle: "bg-blue-100 text-blue-700",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
  },
  purple: {
    circle: "bg-purple-100 text-purple-700",
    border: "border-purple-200",
    bg: "bg-purple-50",
    text: "text-purple-700",
  },
  orange: {
    circle: "bg-orange-100 text-orange-700",
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-700",
  },
};

const downloadTemplate = async (name, filename) => {
  try {
    const response = await apiClient.get(`/templates/${name}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error(`Failed to download ${filename}. Please try again.`);
  }
};

const RefurbishmentGuideModal = ({ isOpen, onStart, onClose }) => {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (name, filename) => {
    setDownloading(name);
    await downloadTemplate(name, filename);
    setDownloading(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="fixed inset-0 bg-black/50 z-50" />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-green-600 px-8 py-6 relative flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <DocumentTextIcon className="h-7 w-7 text-white" />
              <h2 className="text-xl font-bold text-white">
                Refurbishment Request Guide
              </h2>
            </div>
            <p className="text-green-100 text-sm mt-1">
              Please read through this guide before submitting your request.
            </p>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
            {/* Steps */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                How It Works — 4 Steps
              </h3>
              <div className="space-y-3">
                {STEPS.map((step) => {
                  const colors = COLOR_MAP[step.color];
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.number}
                      className={`flex gap-4 p-4 rounded-xl border ${colors.border} ${colors.bg}`}
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colors.circle}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${colors.text} mb-0.5`}
                        >
                          Step {step.number}: {step.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Templates Section */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                <ArrowDownTrayIcon className="h-4 w-4 text-gray-500" />
                Required Templates
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Download, fill in, and upload these templates with your request.
                The refurbishment template is{" "}
                <span className="font-semibold text-red-600">mandatory</span>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Refurbishment Template */}
                <div className="bg-white border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Refurbishment Template
                      </p>
                      <p className="text-xs text-red-600 font-medium">
                        Mandatory
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    List centers, courses, packages, equipment condition, and
                    reason for refurbishment.
                  </p>
                  <button
                    onClick={() =>
                      handleDownload(
                        "refurbishment",
                        "SEIF_Refurbishment_Template.csv",
                      )
                    }
                    disabled={downloading === "refurbishment"}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    {downloading === "refurbishment"
                      ? "Downloading…"
                      : "Download CSV"}
                  </button>
                </div>

                {/* Upgradation Template */}
                <div className="bg-white border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DocumentTextIcon className="h-4 w-4 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Upgradation Template
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        If applicable
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Describe rooms/areas, required equipment, quantities, costs,
                    and proposed improvements.
                  </p>
                  <button
                    onClick={() =>
                      handleDownload(
                        "upgradation",
                        "SEIF_Upgradation_Template.csv",
                      )
                    }
                    disabled={downloading === "upgradation"}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    {downloading === "upgradation"
                      ? "Downloading…"
                      : "Download CSV"}
                  </button>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Important: </span>
                Fill in the downloaded templates with accurate data and upload
                them on the document upload step. Incomplete or missing
                templates may delay processing of your request.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 bg-white flex-shrink-0 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onStart}
              className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors shadow-sm"
            >
              Start Request →
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default RefurbishmentGuideModal;
