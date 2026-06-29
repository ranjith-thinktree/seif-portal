import React, { useState, useRef, useEffect } from "react";
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { FileText } from "lucide-react";
import { toast } from "react-toastify";
import {
  essciSubmitStep1,
  essciUploadCertificatePDF,
} from "../../services/certification.service";
import { formatCertificationDate } from "../../utils/certificationUtils";
import {
  isPartnerImageFile,
  resolvePartnerFileUrl,
} from "../../utils/refurbishmentUtils";

const STEPS = [
  { key: "submitted", short: "Submitted" },
  { key: "initial_response", short: "Initial Response" },
  { key: "certificates", short: "Certificates" },
];

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function ReadOnlyPasswordValue({ value }) {
  const [visible, setVisible] = useState(false);

  if (!value) {
    return <p className="text-gray-800">—</p>;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-gray-800 font-mono text-sm truncate">
        {visible ? value : "•".repeat(Math.min(value.length, 12))}
      </span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="shrink-0 p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        title={visible ? "Hide password" : "Show password"}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeSlashIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function PasswordInputField({ label, value, onChange, required = false }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
          title={showPassword ? "Hide password" : "Show password"}
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

const renderFlowConnector = (completed) => (
  <div className="flex-1 mx-2 min-w-[16px]">
    <div
      className={`border-t-2 border-dotted ${completed ? "border-green-400" : "border-gray-300"}`}
    />
  </div>
);

function DownloadFileButton({ url, name, label = "Download" }) {
  const resolvedUrl = resolvePartnerFileUrl(url);
  const fileName = name || "download";

  if (!resolvedUrl) return null;

  return (
    <a
      href={resolvedUrl}
      download={fileName}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
    >
      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}

function CertificationFileCard({ file, index = 0 }) {
  const fileName = file?.name || `Document ${index + 1}`;
  const resolvedUrl = resolvePartnerFileUrl(file?.url);
  const isImage = isPartnerImageFile({ url: file?.url, name: fileName });

  if (!resolvedUrl) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 min-w-[220px]">
      {isImage ? (
        <img
          src={resolvedUrl}
          alt={fileName}
          className="w-12 h-12 object-contain rounded-md border border-gray-100 bg-gray-50 shrink-0"
        />
      ) : (
        <span className="flex items-center justify-center w-12 h-12 rounded-md border border-gray-100 bg-gray-50 shrink-0">
          <FileText className="w-5 h-5 text-gray-500" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
        <div className="flex items-center gap-2 mt-1">
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            View
          </a>
          <DownloadFileButton url={file.url} name={fileName} />
        </div>
      </div>
    </div>
  );
}

function WorkflowStepper({ activeViewStep, isStepDone, onStepClick }) {
  const stepCircle = (num, { active, done }) => (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm shrink-0 transition-colors ${
        active
          ? "bg-green-600 text-white border-green-600"
          : done
            ? "bg-green-100 text-green-600 border-green-500"
            : "bg-white text-gray-400 border-gray-300"
      }`}
    >
      {done && !active ? <CheckCircleIcon className="w-4 h-4" /> : num}
    </div>
  );

  return (
    <div className="px-1 pt-1 pb-3 border-b border-gray-100">
      <div className="flex items-center w-full">
        {STEPS.map((step, idx) => {
          const done = isStepDone(idx);
          const active = activeViewStep === idx;
          return (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                className="flex flex-col items-center gap-1.5 min-w-0 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg px-0.5"
                aria-current={active ? "step" : undefined}
              >
                {stepCircle(idx + 1, { active, done })}
                <span
                  className={`text-[11px] font-medium text-center leading-tight max-w-[96px] ${
                    active
                      ? "text-gray-900 font-semibold"
                      : done
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.short}
                </span>
              </button>
              {idx < STEPS.length - 1 && renderFlowConnector(done)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function FileDropZone({ label, hint, accept, file, onSelect, onClear, inputRef }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
      <div
        className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onSelect(e.target.files[0] || null)}
        />
        <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
        {file ? (
          <div>
            <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-red-500 hover:text-red-700 mt-0.5"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{hint}</p>
        )}
      </div>
    </div>
  );
}

const CompletedBadge = () => (
  <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
    Completed
  </span>
);

const CurrentBadge = () => (
  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
    Current step
  </span>
);

function SectionHeading({ title, badge }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {badge}
    </div>
  );
}

export default function ESSCICertificationWorkflowPanel({
  details,
  onSuccess,
  readOnly = false,
}) {
  const step1Done = Boolean(details?.essci_step1_at);
  const step2Done = details?.pdf?.status === "approved";
  const canEditStep1 =
    !readOnly && !step1Done && details?.status === "approved";
  const canEditStep2 =
    !readOnly &&
    step1Done &&
    details?.status === "approved" &&
    (!details?.pdf || details?.pdf?.status === "rejected");

  const currentActionable = !step1Done ? 1 : !step2Done ? 2 : 2;

  const [activeViewStep, setActiveViewStep] = useState(currentActionable);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next = !details?.essci_step1_at
      ? 1
      : details?.pdf?.status === "approved"
        ? 2
        : 2;
    setActiveViewStep(next);
  }, [details?.id, details?.essci_step1_at, details?.pdf?.status]);

  const [responseLink, setResponseLink] = useState("");
  const [responseId, setResponseId] = useState("");
  const [responsePassword, setResponsePassword] = useState("");
  const [qrCodeFile, setQrCodeFile] = useState(null);
  const qrRef = useRef(null);

  const [registered, setRegistered] = useState("");
  const [attended, setAttended] = useState("");
  const [passed, setPassed] = useState("");
  const [failed, setFailed] = useState("");
  const [certificateFiles, setCertificateFiles] = useState([]);
  const certRef = useRef(null);

  const isStepDone = (idx) => {
    if (idx === 0) return true;
    if (idx === 1) return step1Done;
    return step2Done;
  };

  const handleSubmitStep1 = async () => {
    if (!responseLink.trim() || !responseId.trim() || !responsePassword.trim()) {
      toast.error("Link, ID, and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await essciSubmitStep1({
        uploadId: details.id,
        responseLink: responseLink.trim(),
        responseId: responseId.trim(),
        responsePassword: responsePassword.trim(),
        qrCodeFile,
      });
      if (res.success) {
        toast.success(res.message || "Initial response submitted.");
        onSuccess?.();
        setActiveViewStep(2);
      } else {
        toast.error(res.message || "Submit failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitStep2 = async () => {
    if (
      registered === "" ||
      attended === "" ||
      passed === "" ||
      failed === ""
    ) {
      toast.error("Please fill in registered, attended, passed, and failed counts.");
      return;
    }
    if (certificateFiles.length === 0) {
      toast.error("Upload at least one certificate document.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await essciUploadCertificatePDF(
        details.partner_id,
        details.center_id,
        details.batch_id || "",
        details.id,
        parseInt(registered, 10),
        parseInt(attended, 10),
        parseInt(passed, 10),
        parseInt(failed, 10),
        certificateFiles,
      );
      if (res.success) {
        toast.success(res.message || "Certificates submitted.");
        onSuccess?.();
      } else {
        toast.error(res.message || "Upload failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSubmittedStep = () => (
    <div className="space-y-3">
      <SectionHeading title="Certification Data Submitted" badge={<CompletedBadge />} />

      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <DetailField label="Partner" value={details?.partner_name} />
          <DetailField label="Center" value={details?.center_name} />
          <DetailField
            label="Batch"
            value={details?.batch_number || details?.other_batch_number}
          />
          <DetailField
            label="Batch Start"
            value={formatCertificationDate(details?.batch_start_date)}
          />
          <DetailField
            label="Batch End"
            value={formatCertificationDate(details?.batch_end_date)}
          />
          <DetailField
            label="Assessment"
            value={formatCertificationDate(details?.assessment_date)}
          />
          <DetailField label="Spoke Name" value={details?.spoke_name} />
          <DetailField label="Spoke Email" value={details?.spoke_email} />
          <DetailField label="Spoke Mobile" value={details?.spoke_mobile} />
          {details?.students?.length > 0 && (
            <DetailField label="Trainees" value={String(details.students.length)} />
          )}
        </div>
      </div>
    </div>
  );

  const renderStep1ReadOnly = () => (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Submitted {formatCertificationDate(details.essci_step1_at)}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Link</p>
          <p className="text-gray-800 break-all">
            {details.essci_response_link || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">ID</p>
          <p className="text-gray-800">{details.essci_response_id || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Password</p>
          <ReadOnlyPasswordValue value={details.essci_response_password} />
        </div>
        {details.essci_qr_code_url && (() => {
          const qrName = details.essci_qr_code_name || "QR code";
          const qrSrc = resolvePartnerFileUrl(details.essci_qr_code_url);
          const isQrImage = isPartnerImageFile({
            url: details.essci_qr_code_url,
            name: qrName,
          });

          return (
            <div className={isQrImage ? "sm:col-span-2" : ""}>
              <p className="text-xs text-gray-500 mb-1">QR Code</p>
              <div className="flex flex-col items-start gap-2">
                {isQrImage && (
                  <a
                    href={qrSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={qrSrc}
                      alt={qrName}
                      className="w-28 h-28 object-contain rounded-lg border border-gray-200 bg-white p-1 hover:border-green-400 transition-colors"
                    />
                  </a>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {!isQrImage && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <FileText className="w-4 h-4" />
                      {qrName}
                    </span>
                  )}
                  {isQrImage && (
                    <span className="text-xs text-gray-600">{qrName}</span>
                  )}
                  <DownloadFileButton
                    url={details.essci_qr_code_url}
                    name={qrName}
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        Details were shared with the center spoke person
        {details.spoke_email ? ` (${details.spoke_email})` : ""}.
      </p>
    </div>
  );

  const renderStep2ReadOnly = () => {
    const pdf = details.pdf;
    if (!pdf) return null;
    const files = pdf.certification_files?.length
      ? pdf.certification_files
      : [
          pdf.zip_file_url && { url: pdf.zip_file_url, name: pdf.zip_file_name },
          pdf.student_list_url && {
            url: pdf.student_list_url,
            name: pdf.student_list_name,
          },
        ].filter(Boolean);

    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Submitted {formatCertificationDate(pdf.created_at)}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Registered</p>
            <p className="font-medium">{pdf.trainees_registered ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Attended</p>
            <p className="font-medium">{pdf.trainees_attended ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Passed</p>
            <p className="font-medium">{pdf.trainees_passed ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Failed</p>
            <p className="font-medium">{pdf.trainees_failed ?? "—"}</p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-1">
            {files.map((f, i) => (
              <CertificationFileCard key={`${f.url}-${i}`} file={f} index={i} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderInitialResponseStep = () => (
    <div className="space-y-3">
      <SectionHeading
        title={
          step1Done
            ? "ESSCI Initial Response Submitted"
            : "Awaiting ESSCI Initial Response"
        }
        badge={step1Done ? <CompletedBadge /> : canEditStep1 ? <CurrentBadge /> : null}
      />

      {step1Done ? (
        renderStep1ReadOnly()
      ) : canEditStep1 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                Assessment Link *
              </label>
              <input
                type="url"
                value={responseLink}
                onChange={(e) => setResponseLink(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID *</label>
              <input
                type="text"
                value={responseId}
                onChange={(e) => setResponseId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <PasswordInputField
                label="Password"
                value={responsePassword}
                onChange={(e) => setResponsePassword(e.target.value)}
                required
              />
            </div>
          </div>
          <FileDropZone
            label="QR Code"
            hint="PNG, JPG, WEBP, or PDF — click to select"
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            file={qrCodeFile}
            onSelect={setQrCodeFile}
            onClear={() => setQrCodeFile(null)}
            inputRef={qrRef}
          />
          <button
            type="button"
            onClick={handleSubmitStep1}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#009530] text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit & Share with Spoke Person"
            )}
          </button>
        </div>
      ) : details?.status === "approved" ? (
        <p className="text-sm text-gray-500">
          Awaiting ESSCI initial response. Assessment access details will appear
          here once shared.
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          This request is not ready for ESSCI processing.
        </p>
      )}
    </div>
  );

  const renderCertificatesStep = () => (
    <div className="space-y-3">
      <SectionHeading
        title={
          step2Done
            ? "Certificates Ready"
            : details?.pdf && details?.pdf?.status !== "rejected"
              ? "Certificates Under Review"
              : "Awaiting Assessment & Certificates"
        }
        badge={step2Done ? <CompletedBadge /> : canEditStep2 ? <CurrentBadge /> : null}
      />

      {!step1Done ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Complete the ESSCI initial response before entering assessment results
          and uploading certificates.
        </div>
      ) : step2Done || (details.pdf && details.pdf.status !== "rejected") ? (
        renderStep2ReadOnly()
      ) : canEditStep2 ? (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Assessment Numbers *
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Registered", value: registered, setter: setRegistered },
                { label: "Attended", value: attended, setter: setAttended },
                { label: "Passed", value: passed, setter: setPassed },
                { label: "Failed", value: failed, setter: setFailed },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Final Certification Documents *
            </h4>
            <div
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"
              onClick={() => certRef.current?.click()}
            >
              <input
                ref={certRef}
                type="file"
                multiple
                accept=".zip,.tar,.gz,.rar,.7z,.pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) =>
                  setCertificateFiles(Array.from(e.target.files || []))
                }
              />
              <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              {certificateFiles.length > 0 ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  {certificateFiles.map((f) => (
                    <li key={f.name} className="truncate">
                      {f.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  ZIP, PDF, or other supported formats — select one or more
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitStep2}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#009530] text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-4 h-4" /> Submit Certificates
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );

  const renderStepContent = () => {
    if (activeViewStep === 0) return renderSubmittedStep();
    if (activeViewStep === 1) return renderInitialResponseStep();
    return renderCertificatesStep();
  };

  return (
    <div className="px-6 py-2">
      <WorkflowStepper
        activeViewStep={activeViewStep}
        isStepDone={isStepDone}
        onStepClick={setActiveViewStep}
      />
      <div className="pt-4">{renderStepContent()}</div>
      <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setActiveViewStep((s) => Math.max(0, s - 1))}
          disabled={activeViewStep === 0}
          className="px-5 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setActiveViewStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={activeViewStep === STEPS.length - 1}
          className="px-5 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
