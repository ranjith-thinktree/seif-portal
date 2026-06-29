import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogTitle } from "../../ui/dialog";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import refurbishmentService from "../../../services/refurbishment.service";
import apiClient from "../../../api/client";
import {
  getRefurbishmentStatusLabel,
  REFURBISHMENT_WORKFLOW_STEPS,
  REFURBISHMENT_STATUS_DATE_FIELDS,
  REFURBISHMENT_STATUS_LABELS,
  PARTNER_ACK_STEP_IDX,
  INSTALLATION_STEP_IDX,
  normalizeWorkflowStatus,
  resolvePartnerFileUrl,
  toDateInputValue,
  todayDateInputValue,
  formatTimeSinceRefurbishment,
} from "../../../utils/refurbishmentUtils";
import RefurbishmentDatePicker from "../RefurbishmentDatePicker";

const TRANSITIONS = {
  approved: [
    {
      value: "material_procurement",
      label: REFURBISHMENT_STATUS_LABELS.material_procurement,
    },
  ],
  material_procurement: [
    { value: "installation_in_progress", label: "Installation In Progress" },
  ],
  installation_in_progress: [],
  refurbishment_started: [
    {
      value: "material_procurement",
      label: REFURBISHMENT_STATUS_LABELS.material_procurement,
    },
    { value: "installation_in_progress", label: "Installation In Progress" },
  ],
};

const COMPLETABLE_STATUSES = [
  "approved",
  "material_procurement",
  "installation_in_progress",
  "refurbishment_started",
];

const COMPLETION_STEP_IDX = PARTNER_ACK_STEP_IDX;

const EMPTY_STEP_DATES = {
  approved: "",
  material_procurement: "",
  installation_in_progress: "",
  completed: "",
};

const getStepDateKey = (stepKey) => {
  if (stepKey === "partner_acknowledgment") return "completed";
  return REFURBISHMENT_STATUS_DATE_FIELDS[stepKey] ? stepKey : null;
};

const buildStepDatesFromPayload = (statusDates = {}) => ({
  approved: toDateInputValue(statusDates.approved_at),
  material_procurement: toDateInputValue(statusDates.material_procurement_at),
  installation_in_progress: toDateInputValue(statusDates.installation_in_progress_at),
  completed: toDateInputValue(statusDates.completed_at),
});

const fmtDateTime = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const getStatusWorkflowIndex = (status) => {
  const normalized = normalizeWorkflowStatus(status);
  if (normalized === "completed") return PARTNER_ACK_STEP_IDX;
  const idx = REFURBISHMENT_WORKFLOW_STEPS.findIndex(
    (s) => s.key === normalized,
  );
  return idx >= 0 ? idx : 0;
};

const getInitialViewStep = (status, completionSummary) => {
  if (normalizeWorkflowStatus(status) === "completed" || status === "rejected") {
    return 0;
  }
  if (completionSummary?.partner?.submitted_at) return PARTNER_ACK_STEP_IDX;
  if (completionSummary?.completion_notified_at) return PARTNER_ACK_STEP_IDX;
  return getStatusWorkflowIndex(status);
};

const renderFlowConnector = (completed) => (
  <div className="flex-1 mx-1 min-w-[12px]">
    <div
      className={`border-t-2 border-dotted ${completed ? "border-green-400" : "border-gray-300"}`}
    />
  </div>
);

function WorkflowFlowStepper({
  activeViewStep,
  statusWorkflowIdx,
  isCompleted,
  hasStatusTransitions,
  canComplete,
  ackSubmitted,
  onStepClick,
}) {
  const isStepDone = (idx, step) => {
    if (isCompleted) return idx <= PARTNER_ACK_STEP_IDX;
    if (step.key === "partner_acknowledgment") {
      return Boolean(ackSubmitted);
    }
    if (idx < statusWorkflowIdx) return true;
    if (idx === statusWorkflowIdx && !hasStatusTransitions && canComplete) {
      return true;
    }
    return false;
  };

  const stepCircle = (num, { active, done }) => (
    <div
      className={`flex items-center justify-center w-9 h-9 rounded-full border-2 font-semibold text-sm shrink-0 transition-colors ${
        active
          ? "bg-green-600 text-white border-green-600"
          : done
            ? "bg-green-100 text-green-600 border-green-500"
            : "bg-white text-gray-400 border-gray-300"
      }`}
    >
      {done && !active ? <CheckCircleIcon className="w-5 h-5" /> : num}
    </div>
  );

  const shortLabel = (step) => {
    if (step.key === "material_procurement") return "Proc. Completed";
    if (step.key === "installation_in_progress") return "Installation";
    if (step.key === "partner_acknowledgment") return "Acknowledgement";
    return step.label;
  };

  return (
    <div className="px-6 pt-5 pb-4 border-b border-gray-100">
      <div className="flex items-center w-full">
        {REFURBISHMENT_WORKFLOW_STEPS.map((step, idx) => {
          const done = isStepDone(idx, step);
          const active = activeViewStep === idx;

          return (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                className="flex flex-col items-center gap-1.5 min-w-0 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg px-0.5"
                aria-label={`Go to step ${step.step}: ${step.label}`}
                aria-current={active ? "step" : undefined}
              >
                {stepCircle(step.step, { active, done })}
                <span
                  className={`text-[10px] font-medium text-center leading-tight max-w-[68px] ${
                    active
                      ? "text-gray-900 font-semibold"
                      : done
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {shortLabel(step)}
                </span>
              </button>
              {idx < REFURBISHMENT_WORKFLOW_STEPS.length - 1 &&
                renderFlowConnector(isStepDone(idx, step))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * AdminStatusChangeModal
 * Flow UI: horizontal steps 1–5 with Back/Next navigation and step-specific content.
 */
export default function AdminStatusChangeModal({
  request,
  onClose,
  onSuccess,
  onRefresh,
}) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [statement, setStatement] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [statusTimeline, setStatusTimeline] = useState(null);
  const [completionSummary, setCompletionSummary] = useState(null);
  const [stepDates, setStepDates] = useState(EMPTY_STEP_DATES);
  const [rejectionSummary, setRejectionSummary] = useState(null);
  const [savingStepDate, setSavingStepDate] = useState(false);
  const [activeViewStep, setActiveViewStep] = useState(0);
  const [requestingAcknowledgment, setRequestingAcknowledgment] = useState(false);

  const requestId = request?.id || request?.request_id;
  const isHistoricalRecord = Boolean(
    request?.isHistoricalRecord ||
      (!requestId && request?.last_refurbishment_date),
  );
  const normalizedStatus = request
    ? normalizeWorkflowStatus(request.status)
    : null;
  const isCompleted = normalizedStatus === "completed" || isHistoricalRecord;
  const isRejected = request?.status === "rejected";
  const isReadOnlyHistory = isCompleted || isRejected;
  const statusWorkflowIdx = request
    ? getStatusWorkflowIndex(request.status)
    : 0;
  const options = TRANSITIONS[request?.status] || [];
  const hasStatusTransitions = options.length > 0;
  const canComplete =
    COMPLETABLE_STATUSES.includes(request?.status) && !isRejected;
  const atInstallationFinalStep =
    canComplete &&
    !hasStatusTransitions &&
    statusWorkflowIdx === INSTALLATION_STEP_IDX;

  useEffect(() => {
    if (!request) return;

    if (isHistoricalRecord) {
      setTimelineLoading(false);
      setStatusTimeline(null);
      setCompletionSummary(null);
      setSelectedStatus("");
      setStatement("");
      setFiles([]);
      setDone(false);
      setStepDates(EMPTY_STEP_DATES);
      setRejectionSummary(null);
      setActiveViewStep(0);
      return;
    }

    if (!requestId) return;

    let cancelled = false;
    setTimelineLoading(true);
    setStatusTimeline(null);
    setCompletionSummary(null);
    setSelectedStatus("");
    setStatement("");
    setFiles([]);
    setDone(false);
    setStepDates(EMPTY_STEP_DATES);
    setRejectionSummary(null);
    setActiveViewStep(getInitialViewStep(request.status));

    refurbishmentService
      .getRefurbishmentRequestForReview(requestId)
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data || {};
        setStatusTimeline(payload.status_timeline || null);
        setCompletionSummary(payload.completion_summary || null);
        setRejectionSummary(payload.rejection_summary || null);
        setStepDates(
          buildStepDatesFromPayload(
            payload.status_dates || {
              approved_at: payload.request?.approved_at,
              material_procurement_at: payload.request?.material_procurement_at,
              installation_in_progress_at:
                payload.request?.installation_in_progress_at,
              completed_at: payload.request?.completed_at,
            },
          ),
        );
        setActiveViewStep(
          getInitialViewStep(request.status, payload.completion_summary || null),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setStatusTimeline(null);
          setCompletionSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setTimelineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, request?.status, request?.isHistoricalRecord, request?.last_refurbishment_date]);

  if (!request) return null;

  const centerName = request.center_name || request.centerName || "";
  const timelineEvents = statusTimeline?.events || [];
  const ackRequested = Boolean(completionSummary?.completion_notified_at);
  const ackSubmitted = Boolean(completionSummary?.partner?.submitted_at);
  const ackPending = ackRequested && !ackSubmitted;
  const activeStepDef = REFURBISHMENT_WORKFLOW_STEPS[activeViewStep];

  const findEvent = (stepKey) =>
    timelineEvents.find(
      (event) => event.key === stepKey || event.status === stepKey,
    );

  const isStepDateEditable = (stepKey, progress) => {
    if (isCompleted || isRejected) return false;
    const dateKey = getStepDateKey(stepKey);
    if (!dateKey) return false;
    if (stepKey === "partner_acknowledgment") return canComplete;
    if (stepKey === "completed") return false;
    if (progress.current && hasStatusTransitions) return true;
    if (
      stepKey === "installation_in_progress" &&
      atInstallationFinalStep &&
      activeViewStep === INSTALLATION_STEP_IDX
    ) {
      return true;
    }
    return false;
  };

  const updateStepDate = (dateKey, value) => {
    setStepDates((prev) => ({ ...prev, [dateKey]: value }));
  };

  const renderStepDateControl = (stepKey, progress, event) => {
    const dateKey = getStepDateKey(stepKey);
    if (!dateKey) return null;

    const editable = isStepDateEditable(stepKey, progress);
    const value = stepDates[dateKey] || "";

    if (editable) {
      return (
        <div>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Step completion date
          </label>
          <RefurbishmentDatePicker
            value={value || todayDateInputValue()}
            onChange={(iso) => updateStepDate(dateKey, iso)}
          />
        </div>
      );
    }

    const storedDate =
      value || (event?.occurred_at ? toDateInputValue(event.occurred_at) : "");
    return (
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
          When
        </p>
        <p className="text-sm text-gray-800">
          {storedDate
            ? fmtDateTime(storedDate)
            : progress.pending
              ? "Not started yet"
              : "Not recorded"}
        </p>
      </div>
    );
  };

  const getStepProgress = (stepIdx) => {
    const stepDef = REFURBISHMENT_WORKFLOW_STEPS[stepIdx];
    if (isCompleted) {
      return { done: true, current: false, pending: false };
    }
    if (stepDef?.key === "partner_acknowledgment") {
      return {
        done: Boolean(ackSubmitted) || isCompleted,
        current:
          atInstallationFinalStep ||
          ackPending ||
          ackSubmitted ||
          activeViewStep === PARTNER_ACK_STEP_IDX,
        pending: !atInstallationFinalStep && !ackPending && !ackSubmitted && !isCompleted,
      };
    }
    if (stepDef?.key === "completed") {
      return { done: false, current: false, pending: true };
    }
    if (atInstallationFinalStep) {
      if (stepIdx < statusWorkflowIdx) {
        return { done: true, current: false, pending: false };
      }
      if (stepIdx === statusWorkflowIdx) {
        return { done: false, current: true, pending: false };
      }
      return { done: false, current: false, pending: stepIdx > statusWorkflowIdx };
    }
    return {
      done: stepIdx < statusWorkflowIdx,
      current: stepIdx === statusWorkflowIdx && hasStatusTransitions,
      pending: stepIdx > statusWorkflowIdx,
    };
  };

  const reloadReviewPayload = async () => {
    const res = await refurbishmentService.getRefurbishmentRequestForReview(
      requestId,
    );
    const payload = res?.data || {};
    setStatusTimeline(payload.status_timeline || null);
    setCompletionSummary(payload.completion_summary || null);
    setRejectionSummary(payload.rejection_summary || null);
    setStepDates(
      buildStepDatesFromPayload(
        payload.status_dates || {
          approved_at: payload.request?.approved_at,
          material_procurement_at: payload.request?.material_procurement_at,
          installation_in_progress_at:
            payload.request?.installation_in_progress_at,
          completed_at: payload.request?.completed_at,
        },
      ),
    );
  };

  const handleSaveStepDate = async (stepKey) => {
    const dateKey = getStepDateKey(stepKey);
    if (!dateKey || !(stepDates[dateKey] || todayDateInputValue())) {
      toast.error("Please select a date for this step");
      return;
    }
    setSavingStepDate(true);
    try {
      await refurbishmentService.saveWorkflowStepDate(
        requestId,
        stepKey,
        stepDates[dateKey] || todayDateInputValue(),
      );
      toast.success("Step date saved");
      if (stepKey === "installation_in_progress") {
        await reloadReviewPayload();
        setActiveViewStep(PARTNER_ACK_STEP_IDX);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save step date");
    } finally {
      setSavingStepDate(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status");
      return;
    }
    const currentStepKey = REFURBISHMENT_WORKFLOW_STEPS[statusWorkflowIdx]?.key;
    const dateKey = getStepDateKey(currentStepKey);
    if (!dateKey || !(stepDates[dateKey] || todayDateInputValue())) {
      toast.error("Please select a completion date for this step");
      return;
    }
    setSaving(true);
    try {
      await refurbishmentService.updateRequestStatus(requestId, selectedStatus, {
        status_date: stepDates[dateKey] || todayDateInputValue(),
      });
      toast.success("Status updated successfully");
      if (selectedStatus === "installation_in_progress") {
        await reloadReviewPayload();
        setActiveViewStep(PARTNER_ACK_STEP_IDX);
      } else {
        onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    const newFiles = [];
    for (const file of selected) {
      if (files.length + newFiles.length >= 10) {
        toast.error("Maximum 10 files allowed");
        break;
      }
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast.error(`${file.name}: only images and PDFs allowed`);
        continue;
      }
      newFiles.push({
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
        type: isImage ? "image" : "document",
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFiles((prev) => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const uploadFile = async (item) => {
    const res = await apiClient.post("/admin/refurbishment/upload-url", {
      fileName: item.file.name,
      fileType: item.file.type,
      folder: "refurbishment-admin-completion",
    });
    const presigned = res.data?.data || {};

    let fileUrl;
    if (presigned.storageType === "local") {
      const formData = new FormData();
      formData.append("file", item.file);
      const uploadRes = await apiClient.post(
        "/admin/refurbishment/upload-local",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      fileUrl = uploadRes.data?.data?.fileUrl;
    } else {
      const putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: item.file,
        headers: { "Content-Type": item.file.type },
      });
      if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
      fileUrl = presigned.fileUrl;
    }

    if (!fileUrl) throw new Error("Upload did not return a file URL");

    return {
      url: fileUrl,
      name: item.file.name,
      type: item.file.type,
      size: item.file.size,
    };
  };

  const handleSubmitCompletion = async () => {
    const trimmedStatement = statement.trim();
    if (!(stepDates.completed || todayDateInputValue())) {
      toast.error("Please select a completion date");
      return;
    }
    setSubmitting(true);
    try {
      const completionImages = [];
      for (const item of files) {
        const uploaded = await uploadFile(item);
        completionImages.push(uploaded);
      }
      await refurbishmentService.completeRefurbishment(requestId, {
        completion_statement: trimmedStatement || undefined,
        completion_date: stepDates.completed || todayDateInputValue(),
        completion_images:
          completionImages.length > 0 ? completionImages : undefined,
        approved_at: stepDates.approved || undefined,
        material_procurement_at: stepDates.material_procurement || undefined,
        installation_in_progress_at:
          stepDates.installation_in_progress || undefined,
      });
      setDone(true);
    } catch (err) {
      console.error("Error completing request:", err);
      toast.error(err.response?.data?.message || "Failed to complete request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPartnerAcknowledgment = async () => {
    setRequestingAcknowledgment(true);
    try {
      const res = await refurbishmentService.requestPartnerAcknowledgment(requestId);
      const notifiedAt =
        res?.data?.completion_notified_at || res?.completion_notified_at;
      if (notifiedAt) {
        setCompletionSummary((prev) => ({
          ...(prev || {}),
          completion_notified_at: notifiedAt,
        }));
      }
      toast.success("Partner acknowledgment request sent");
      await reloadReviewPayload();
      await onRefresh?.();
    } catch (err) {
      console.error("Error requesting partner acknowledgment:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to send partner acknowledgment request",
      );
    } finally {
      setRequestingAcknowledgment(false);
    }
  };

  const renderAcknowledgmentCompletionStep = () => {
    if (ackPending) {
      return (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-4 space-y-2">
          <p className="text-sm font-semibold text-purple-900">
            Waiting for partner acknowledgment
          </p>
          <p className="text-sm text-purple-800 leading-relaxed">
            The partner has been notified by email and in-app alert. They can
            submit their acknowledgment statement and files from Past Requests.
            You will be notified once they respond, then you can confirm
            completion here.
          </p>
          <p className="text-xs text-purple-700">
            Requested{" "}
            {fmtDateTime(completionSummary?.completion_notified_at) || "recently"}
          </p>
        </div>
      );
    }

    if (ackSubmitted && !isCompleted) {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm font-semibold text-green-900">
              Partner acknowledgment received
            </p>
            <p className="text-xs text-green-800 mt-1">
              Review the partner&apos;s submission below, then add your
              completion details and confirm.
            </p>
          </div>
          {renderPartnerCompletionSection(true)}
          {renderCompletionForm()}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-gray-900">
            Choose how to complete this request
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
            <li>
              <strong>Complete</strong> — mark completed now with your
              statement and files.
            </li>
            <li>
              <strong>Request Partner Acknowledgment</strong> — ask the partner
              to submit their acknowledgment first; you complete after they
              respond.
            </li>
          </ul>
        </div>
        {renderCompletionForm()}
      </div>
    );
  };

  const renderCompletionForm = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Completion Date{" "}
          <span className="text-gray-400 font-normal">(required)</span>
        </label>
        <RefurbishmentDatePicker
          value={stepDates.completed || todayDateInputValue()}
          onChange={(iso) => updateStepDate("completed", iso)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Completion Statement{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={4}
          placeholder="Describe the refurbishment work completed, key changes, and current status of the center…"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Completion Photos / Documents{" "}
          <span className="text-gray-400 font-normal">(optional, max 10)</span>
        </label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
        >
          <ArrowUpTrayIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Click to upload images or PDFs
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {files.map((item, idx) => (
              <div
                key={idx}
                className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
              >
                {item.type === "image" ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 flex flex-col items-center justify-center gap-1">
                    <DocumentIcon className="h-8 w-8 text-gray-400" />
                    <span className="text-[10px] text-gray-500 px-2 text-center line-clamp-2">
                      {item.file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFileGrid = (files, emptyLabel = "No files uploaded") => {
    if (!files?.length) {
      return emptyLabel ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : null;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {files.map((file, idx) => {
          const url = resolvePartnerFileUrl(file.file_url || file.url);
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(
            file.file_name || file.name || url,
          );
          return (
            <a
              key={file.id || idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-green-300 transition-colors"
            >
              {isImage ? (
                <img
                  src={url}
                  alt={file.file_name || file.name || "Uploaded file"}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex flex-col items-center justify-center gap-1 px-2">
                  <DocumentIcon className="h-8 w-8 text-gray-400" />
                  <span className="text-[10px] text-gray-500 text-center line-clamp-2">
                    {file.file_name || file.name || "Document"}
                  </span>
                </div>
              )}
            </a>
          );
        })}
      </div>
    );
  };

  const renderPartnerCompletionSection = (expanded = false) => {
    const partner = completionSummary?.partner;
    if (!partner) return null;

    return (
      <div
        className={`${expanded ? "rounded-xl border border-purple-200 bg-purple-50/60 p-4" : "pt-3 border-t border-gray-200"} space-y-3`}
      >
        <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-widest mb-1">
          Partner acknowledgment
        </p>
        <p className="text-sm text-gray-700">
          Submitted {fmtDateTime(partner.submitted_at)}
        </p>
        {partner.description && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {partner.description}
          </p>
        )}
        {partner.consent_text && (
          <div className="rounded-lg border border-purple-200 bg-white/80 px-3 py-2">
            <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-widest mb-1">
              Partner consent
            </p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
              {partner.consent_text}
            </p>
            {partner.consent_at && (
              <p className="text-[11px] text-gray-500 mt-2">
                Consented {fmtDateTime(partner.consent_at)}
              </p>
            )}
          </div>
        )}
        {partner.files?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Partner files
            </p>
            {renderFileGrid(partner.files, null)}
          </div>
        )}
      </div>
    );
  };

  const renderReadOnlyCompletion = () => {
    const admin = completionSummary?.admin;
    if (!admin) {
      return (
        <p className="text-sm text-gray-500">
          No completion details recorded yet.
        </p>
      );
    }

    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            When
          </p>
          <p className="text-sm text-gray-800">
            {fmtDateTime(admin.completed_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Completion statement
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {admin.statement || "No statement provided."}
          </p>
        </div>
        {admin.files?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Admin completion documents
            </p>
            {renderFileGrid(admin.files, null)}
          </div>
        )}
        {renderPartnerCompletionSection()}
      </div>
    );
  };

  const renderRejectionView = () => {
    const rejectedEvent = findEvent("rejected");
    const submittedEvent = findEvent("submitted");
    const summary = rejectionSummary || {};
    const reason =
      summary.reason ||
      rejectedEvent?.detail ||
      request.rejection_reason ||
      "No reason provided.";
    const rejectedAt =
      summary.rejected_at || rejectedEvent?.occurred_at || request.rejected_at;
    const rejectedBy = summary.rejected_by_name;

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
            Request Rejected
          </p>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              When
            </p>
            <p className="text-sm text-gray-800">
              {rejectedAt ? fmtDateTime(rejectedAt) : "Date not recorded"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Reason for rejection
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {reason}
            </p>
          </div>
        </div>

        {submittedEvent && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Originally submitted
            </p>
            <p className="text-sm text-gray-700">
              {fmtDateTime(submittedEvent.occurred_at) || "Date not recorded"}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderStepBadge = (progress) => (
    <>
      {progress.current && !isCompleted && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          Current step
        </span>
      )}
      {progress.done && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
          Completed
        </span>
      )}
      {progress.pending && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          Upcoming
        </span>
      )}
    </>
  );

  const renderHistoricalContent = () => {
    const frequency = request.refurbishment_frequency_months;
    const monthsSince = request.months_since_last_refurbishment;

    const detailRow = (label, value) => (
      <div key={label}>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
          {label}
        </p>
        <p className="text-sm text-gray-800">{value ?? "-"}</p>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Completed Refurbishment
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {detailRow(
              "Last Refurbished",
              fmtDateTime(request.last_refurbishment_date),
            )}
            {detailRow(
              "Months Since Refurbishment",
              formatTimeSinceRefurbishment(
                request.last_refurbishment_date,
                monthsSince,
              ),
            )}
            {detailRow(
              "Refurbishment Cycle",
              frequency ? `${frequency} months` : "-",
            )}
            {detailRow(
              "Year of Establishment",
              request.year_of_establishment,
            )}
            {detailRow("Partner", request.partner_name)}
            {detailRow("City", request.city)}
            {detailRow("State", request.state)}
            {detailRow("Region", request.region)}
            {detailRow("Center Type", request.center_type)}
          </div>
        </div>
        <p className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs text-blue-700">
          This refurbishment was recorded from historical data. Step-by-step
          workflow details are not available for this center.
        </p>
      </div>
    );
  };

  const renderStepContent = () => {
    if (isHistoricalRecord) {
      return renderHistoricalContent();
    }

    if (timelineLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          Loading step details…
        </div>
      );
    }

    if (isRejected) {
      return renderRejectionView();
    }

    if (!activeStepDef) return null;

    if (activeStepDef.key === "partner_acknowledgment") {
      const progress = getStepProgress(activeViewStep);
      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-bold text-gray-900">
                Step {activeStepDef.step}:{" "}
                {ackPending
                  ? activeStepDef.pendingLabel || "Partner Acknowledgement Pending"
                  : activeStepDef.label}
              </h3>
              {renderStepBadge(progress)}
            </div>
            <p className="text-sm text-gray-500">{activeStepDef.description}</p>
          </div>

          {isCompleted
            ? renderReadOnlyCompletion()
            : canComplete
              ? renderAcknowledgmentCompletionStep()
              : (
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                  <p className="text-sm text-gray-600">
                    Complete Installation In Progress before requesting partner
                    acknowledgment.
                  </p>
                </div>
              )}
        </div>
      );
    }

    const event = findEvent(activeStepDef.key);
    const completedEvent = findEvent("completed");
    const progress = getStepProgress(activeViewStep);

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold text-gray-900">
              Step {activeStepDef.step}: {activeStepDef.label}
            </h3>
            {renderStepBadge(progress)}
          </div>
          <p className="text-sm text-gray-500">{activeStepDef.description}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
          {renderStepDateControl(activeStepDef.key, progress, event)}

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              What happened
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {event?.detail ||
                (activeStepDef.key === "completed" &&
                  (completedEvent?.detail ||
                    (isCompleted
                      ? "Request was marked as completed."
                      : "This step is recorded after you confirm completion in Step 4."))) ||
                (progress.pending
                  ? "This step has not been reached yet."
                  : progress.current
                    ? `Request is currently at ${getRefurbishmentStatusLabel(request.status)}.`
                    : "This step was completed as part of the refurbishment workflow.")}
            </p>
          </div>

          {activeStepDef.key === "completed" && renderPartnerCompletionSection()}
        </div>

        {progress.current &&
          !isCompleted &&
          hasStatusTransitions &&
          activeViewStep === statusWorkflowIdx && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance to next step
              </label>
              <div className="space-y-2">
                {options.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                      selectedStatus === opt.value
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={selectedStatus === opt.value}
                      onChange={() => setSelectedStatus(opt.value)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

        {activeStepDef.key === "installation_in_progress" &&
          atInstallationFinalStep &&
          !isCompleted &&
          activeViewStep === INSTALLATION_STEP_IDX && (
            <div className="space-y-3">
              <div className="border border-emerald-200 rounded-xl px-4 py-3 bg-emerald-50">
                <p className="text-xs text-emerald-700 font-medium">
                  Installation is in progress. Save the step date below, then
                  continue to Step 5 to submit your completion statement and
                  documents.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewStep(COMPLETION_STEP_IDX)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                Continue to Partner Acknowledgement (Step 4)
              </button>
            </div>
          )}

        {activeStepDef.key === "completed" &&
          canComplete &&
          !isCompleted &&
          !hasStatusTransitions && (
            <div className="border border-emerald-200 rounded-xl px-4 py-3 bg-emerald-50">
              <p className="text-xs text-emerald-700 font-medium">
                This step is recorded once you confirm completion in Step 5.
              </p>
            </div>
          )}
      </div>
    );
  };

  const renderFlowFooter = ({
    onBack,
    onNext,
    backDisabled,
    nextDisabled,
    extraActions,
  }) => (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-7 pb-7 pt-4 border-t border-gray-100">
      <button
        type="button"
        onClick={onClose}
        disabled={saving || submitting || savingStepDate}
        className="px-5 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        {isCompleted ? "Close" : "Cancel"}
      </button>
      {!isRejected && (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={backDisabled || saving || submitting}
          className="px-5 py-2.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || saving || submitting}
          className="px-5 py-2.5 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Next
        </button>
        {extraActions}
      </div>
      )}
    </div>
  );

  if (done) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onSuccess();
        }}
      >
        <DialogTitle className="sr-only">Completed</DialogTitle>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onSuccess} />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-10 flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Marked as Completed!
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                The refurbishment request has been completed and the partner has
                been notified.
              </p>
            </div>
            <button
              onClick={onSuccess}
              className="mt-2 w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  const showSave =
    activeViewStep === statusWorkflowIdx &&
    !isReadOnlyHistory &&
    hasStatusTransitions;
  const showSaveInstallationStep =
    atInstallationFinalStep &&
    activeViewStep === INSTALLATION_STEP_IDX &&
    !isReadOnlyHistory;
  const showConfirmCompletion =
    atInstallationFinalStep &&
    activeViewStep === COMPLETION_STEP_IDX &&
    !isReadOnlyHistory;

  const modalTitle = isRejected
    ? "Request Rejection Details"
    : isCompleted
      ? "Request Status History"
      : "Update Request Status";

  const historicalSubtitle = isHistoricalRecord
    ? "Recorded refurbishment details from historical data"
    : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle className="sr-only">{modalTitle}</DialogTitle>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between px-7 pt-7 pb-2 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{modalTitle}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {centerName}
                {historicalSubtitle && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    {historicalSubtitle}
                  </span>
                )}
                {isCompleted && !isHistoricalRecord && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Review each step to see what happened and when
                  </span>
                )}
                {isRejected && (
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Review why this request was rejected
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {!isRejected && !isHistoricalRecord && (
            <WorkflowFlowStepper
              activeViewStep={activeViewStep}
              statusWorkflowIdx={statusWorkflowIdx}
              isCompleted={isCompleted}
              hasStatusTransitions={hasStatusTransitions}
              canComplete={canComplete}
              ackSubmitted={ackSubmitted}
              onStepClick={setActiveViewStep}
            />
          )}

          <div className="px-7 py-6 flex-1 min-h-[260px] overflow-y-auto">
            {renderStepContent()}
          </div>

          {!isRejected && !isHistoricalRecord &&
            renderFlowFooter({
            onBack: () => setActiveViewStep((s) => Math.max(0, s - 1)),
            onNext: () =>
              setActiveViewStep((s) =>
                Math.min(COMPLETION_STEP_IDX, s + 1),
              ),
            backDisabled: activeViewStep === 0,
            nextDisabled: activeViewStep === COMPLETION_STEP_IDX,
            extraActions: (
              <>
                {showSaveInstallationStep && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveStepDate("installation_in_progress")
                    }
                    disabled={savingStepDate || saving || submitting}
                    className="px-6 py-2.5 rounded-full border border-green-600 text-green-700 hover:bg-green-50 text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {savingStepDate ? "Saving…" : "Save Step Date"}
                  </button>
                )}
                {showSave && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !selectedStatus}
                    className="px-7 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                )}
                {showConfirmCompletion && !ackPending && (
                  <>
                    {!ackRequested && (
                      <button
                        type="button"
                        onClick={handleRequestPartnerAcknowledgment}
                        disabled={
                          requestingAcknowledgment || submitting || saving
                        }
                        className="px-5 py-2.5 rounded-full border border-purple-300 text-purple-700 hover:bg-purple-50 text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        {requestingAcknowledgment
                          ? "Sending…"
                          : "Request Partner Acknowledgment"}
                      </button>
                    )}
                    {!ackRequested && (
                      <button
                        type="button"
                        onClick={handleSubmitCompletion}
                        disabled={submitting || saving}
                        className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        {submitting ? "Submitting…" : "Complete"}
                      </button>
                    )}
                    {ackSubmitted && (
                      <button
                        type="button"
                        onClick={handleSubmitCompletion}
                        disabled={submitting || saving}
                        className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        {submitting ? "Submitting…" : "Confirm Completion"}
                      </button>
                    )}
                  </>
                )}
              </>
            ),
          })}

          {isHistoricalRecord && (
            <div className="flex justify-end px-7 pb-7 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {isRejected && (
            <div className="flex justify-end px-7 pb-7 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
