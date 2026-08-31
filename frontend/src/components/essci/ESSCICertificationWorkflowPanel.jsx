import React, { useState, useRef, useEffect } from "react";
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { FileText } from "lucide-react";
import { toast } from "react-toastify";
import {
  downloadCertificationArchivedFile,
  essciUploadCertificatePDF,
} from "../../services/certification.service";
import {
  formatCertificationDate,
  toCertificationDateInput,
  CERTIFICATION_REQUEST_JOURNEY_STEPS,
  getCertificationSubmittedByLabel,
  hasDownloadableCertificationFiles,
} from "../../utils/certificationUtils";
import { parseEssciResultSummaryFile } from "../../utils/essciResultSummaryParser";
import { downloadFile } from "../../services/data.service";
import RefurbishmentDatePicker from "../refurbishment/RefurbishmentDatePicker";
import {
  isPartnerImageFile,
  resolvePartnerFileUrl,
} from "../../utils/refurbishmentUtils";

const WORKFLOW_STEPS = CERTIFICATION_REQUEST_JOURNEY_STEPS;

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
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

function DownloadFileButton({ url, archiveFileId, name, label = "Download" }) {
  const resolvedUrl = resolvePartnerFileUrl(url);
  const fileName = name || "download";
  const [downloading, setDownloading] = useState(false);

  if (!archiveFileId && !resolvedUrl) return null;

  const handleClick = async (event) => {
    if (!archiveFileId) return;
    event.preventDefault();
    setDownloading(true);
    try {
      const blob = await downloadCertificationArchivedFile(archiveFileId);
      downloadFile(blob, fileName);
    } catch (error) {
      toast.error(error.response?.data?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (archiveFileId) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors disabled:opacity-60"
      >
        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
        {downloading ? "Downloading…" : label}
      </button>
    );
  }

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
  const archiveFileId = file?.archiveFileId || null;
  const resolvedUrl = archiveFileId ? null : resolvePartnerFileUrl(file?.url);
  const isImage = !archiveFileId && isPartnerImageFile({ url: file?.url, name: fileName });

  if (!archiveFileId && !resolvedUrl) return null;

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
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              View
            </a>
          )}
          <DownloadFileButton
            url={file.url}
            archiveFileId={archiveFileId}
            name={fileName}
          />
        </div>
      </div>
    </div>
  );
}

function WorkflowStepper({ steps, activeViewStep, isStepDone, onStepClick }) {
  const stepCircle = (num, { active, done }) => (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm shrink-0 transition-colors ${
        done
          ? active
            ? "bg-green-600 text-white border-green-600"
            : "bg-green-100 text-green-600 border-green-500"
          : active
            ? "bg-gray-200 text-gray-500 border-gray-400"
            : "bg-gray-100 text-gray-400 border-gray-300"
      }`}
    >
      {done && !active ? <CheckCircleIcon className="w-4 h-4" /> : num}
    </div>
  );

  return (
    <div className="px-1 pt-1 pb-3 border-b border-gray-100">
      <div className="flex items-start w-full">
        {steps.map((step, idx) => {
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
                  className={`text-[11px] font-medium text-center leading-tight max-w-[132px] ${
                    done
                      ? active
                        ? "text-gray-900 font-semibold"
                        : "text-green-600"
                      : active
                        ? "text-gray-600 font-semibold"
                        : "text-gray-400"
                  }`}
                >
                  {step.short}
                </span>
              </button>
              {idx < steps.length - 1 && renderFlowConnector(done)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

const CompletedBadge = () => (
  <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
    Completed
  </span>
);

const PendingBadge = () => (
  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
    Pending
  </span>
);

function CertificateUploadHistory({ details }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-bold text-gray-900">Certificate Upload History</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
        <DetailField
          label="Request submitted by"
          value={getCertificationSubmittedByLabel(details)}
        />
        <DetailField
          label="Request Received Date"
          value={formatCertificationDate(details?.created_at)}
        />
        <DetailField
          label="Certificate Uploaded Date"
          value={formatCertificationDate(details?.pdf?.created_at)}
        />
      </div>
    </div>
  );
}

function SectionHeading({ title, badge }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {badge}
    </div>
  );
}

function FileUploadDropzone({
  inputRef,
  files,
  onFilesChange,
  accept,
  emptyLabel,
  multiple = false,
}) {
  const list = multiple ? files : files ? [files].filter(Boolean) : [];

  return (
    <div
      className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files || []);
          onFilesChange(multiple ? selected : selected[0] || null);
          e.target.value = "";
        }}
      />
      <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
      {list.length > 0 ? (
        <ul className="text-sm text-gray-700 space-y-1">
          {list.map((f) => (
            <li key={f.name} className="truncate">
              {f.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      )}
    </div>
  );
}

export default function ESSCICertificationWorkflowPanel({
  details,
  onSuccess,
  readOnly = false,
  initialStep,
}) {
  const certificatesDone = hasDownloadableCertificationFiles(details);
  const adminAccepted = details?.status === "approved";
  const canEditCertificates =
    !readOnly &&
    details?.status === "approved" &&
    (!details?.pdf || details?.pdf?.status === "rejected");

  /** Step 1 received; Step 2 admin accepted; Step 3 ESSCI uploaded */
  const defaultViewStep = certificatesDone
    ? 2
    : canEditCertificates
      ? 2
      : adminAccepted
        ? 1
        : 0;

  const resolveInitialStep = () => {
    if (typeof initialStep === "number") return initialStep;
    return defaultViewStep;
  };

  const [activeViewStep, setActiveViewStep] = useState(resolveInitialStep);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof initialStep === "number") {
      setActiveViewStep(initialStep);
      return;
    }
    // ESSCI/Partner View: no certs yet → Step 1; certs uploaded → Step 2
    setActiveViewStep(defaultViewStep);
  }, [details?.id, details?.pdf?.id, details?.pdf?.status, defaultViewStep, initialStep]);

  const [registered, setRegistered] = useState("");
  const [attended, setAttended] = useState("");
  const [passed, setPassed] = useState("");
  const [failed, setFailed] = useState("");
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [studentResultFile, setStudentResultFile] = useState(null);
  const [assessmentDate, setAssessmentDate] = useState("");
  const [parsingStudentSheet, setParsingStudentSheet] = useState(false);
  const certRef = useRef(null);
  const studentSheetRef = useRef(null);

  useEffect(() => {
    setAssessmentDate(toCertificationDateInput(details?.assessment_date));
  }, [details?.id, details?.assessment_date]);

  const isStepDone = (idx) => {
    if (idx === 0) return true;
    if (idx === 1) return adminAccepted;
    return certificatesDone;
  };

  const handleStudentResultFileChange = async (file) => {
    setStudentResultFile(file);
    if (!file) {
      setRegistered("");
      setAttended("");
      setPassed("");
      setFailed("");
      return;
    }

    setRegistered("");
    setAttended("");
    setPassed("");
    setFailed("");
    setParsingStudentSheet(true);
    try {
      const totals = await parseEssciResultSummaryFile(file);
      setRegistered(String(totals.registered));
      setAttended(String(totals.attended));
      setPassed(String(totals.passed));
      setFailed(String(totals.failed));
      toast.success("Assessment numbers loaded from the result sheet.");
    } catch (err) {
      setStudentResultFile(null);
      toast.warn(
        err.message ||
          "Could not read assessment numbers from the sheet. Please upload a valid result summary file with the required columns.",
      );
    } finally {
      setParsingStudentSheet(false);
    }
  };

  const assessmentNumbersReady =
    registered !== "" &&
    attended !== "" &&
    passed !== "" &&
    failed !== "";

  const canSubmitCertificates =
    Boolean(assessmentDate) &&
    assessmentNumbersReady &&
    certificateFiles.length > 0 &&
    Boolean(studentResultFile) &&
    !parsingStudentSheet &&
    !submitting;

  const handleSubmitCertificates = async () => {
    if (!canSubmitCertificates) {
      toast.error("Please complete all required fields before submitting.");
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
        studentResultFile,
        assessmentDate,
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

  const renderReceivedStep = () => (
    <div className="space-y-3">
      <SectionHeading title="Request Received" badge={<CompletedBadge />} />
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
      <CertificateUploadHistory details={details} />
    </div>
  );

  const renderAcceptedStep = () => {
    const accepted = details?.status === "approved";
    const rejected = details?.status === "rejected";
    return (
      <div className="space-y-3">
        <SectionHeading
          title="Request Accepted by Admin & Sent to ESSCI"
          badge={
            accepted ? (
              <CompletedBadge />
            ) : rejected ? (
              <PendingBadge />
            ) : (
              <PendingBadge />
            )
          }
        />
        {accepted ? (
          <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-3">
            <p className="text-sm text-green-800">
              Admin has accepted this request and sent it to ESSCI for certificate processing.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <DetailField
                label="Accepted Date"
                value={formatCertificationDate(details?.reviewed_at)}
              />
              <DetailField label="Partner" value={details?.partner_name} />
              <DetailField
                label="Batch"
                value={details?.batch_number || details?.other_batch_number}
              />
            </div>
            {details?.remarks ? (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Admin remarks: </span>
                {details.remarks}
              </p>
            ) : null}
          </div>
        ) : rejected ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            This request was not accepted by admin.
            {details?.rejection_reason || details?.remarks
              ? ` ${details.rejection_reason || details.remarks}`
              : ""}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Waiting for admin to accept this request. After acceptance it will be sent to ESSCI.
          </div>
        )}
      </div>
    );
  };

  const renderCertificatesReadOnly = () => {
    const pdf = details.pdf;
    if (!pdf) return null;
    const archived = Array.isArray(pdf.archived_files) ? pdf.archived_files : [];
    const archivedCerts = archived
      .filter((f) => f.file_type === "certificate")
      .map((f) => ({
        archiveFileId: f.id,
        name: f.original_name,
      }));
    const archivedSheet = archived.find((f) => f.file_type === "result_sheet");

    const certificateDocs = archivedCerts.length
      ? archivedCerts
      : pdf.certification_files?.length
        ? pdf.certification_files
        : [
            pdf.zip_file_url && { url: pdf.zip_file_url, name: pdf.zip_file_name },
          ].filter(Boolean);
    const studentSheet = archivedSheet
      ? { archiveFileId: archivedSheet.id, name: archivedSheet.original_name }
      : pdf.student_list_url
        ? { url: pdf.student_list_url, name: pdf.student_list_name }
        : null;

    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Submitted {formatCertificationDate(pdf.created_at)}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Assessment Date</p>
            <p className="font-medium">
              {formatCertificationDate(details?.assessment_date)}
            </p>
          </div>
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
        {certificateDocs.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Certificates (ZIP / PDF)
            </p>
            <div className="flex flex-wrap gap-3">
              {certificateDocs.map((f, i) => (
                <CertificationFileCard
                  key={f.archiveFileId || `${f.url}-${i}`}
                  file={f}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}
        {studentSheet && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Student Result Sheet
            </p>
            <div className="flex flex-wrap gap-3">
              <CertificationFileCard file={studentSheet} index={0} />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCertificatesStep = () => (
    <div className="space-y-3">
      <SectionHeading
        title="Certificate Uploaded by ESSCI"
        badge={certificatesDone ? <CompletedBadge /> : <PendingBadge />}
      />

      {!certificatesDone && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Certificate is awaiting upload from the ESSCI team.
        </div>
      )}

      <CertificateUploadHistory details={details} />

      {certificatesDone ? (
        renderCertificatesReadOnly()
      ) : canEditCertificates ? (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Confirm Assessment Date *
            </h4>
            <p className="text-xs text-gray-500 mb-2">
              Partner submitted{" "}
              {formatCertificationDate(details?.assessment_date)} — confirm or
              update before uploading certificates.
            </p>
            <RefurbishmentDatePicker
              value={assessmentDate}
              onChange={setAssessmentDate}
              placeholder="Select assessment date"
              className="max-w-xs"
            />
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Assessment Numbers *
            </h4>
            <p className="text-xs text-gray-500 mb-2">
              Loaded automatically from the uploaded result sheet.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Registered", value: registered },
                { label: "Attended", value: attended },
                { label: "Passed", value: passed },
                { label: "Failed", value: failed },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={value}
                    placeholder="—"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-default"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Certificates (ZIP / PDF) *
              </h4>
              <FileUploadDropzone
                inputRef={certRef}
                files={certificateFiles}
                onFilesChange={setCertificateFiles}
                accept=".zip,.tar,.gz,.rar,.7z,.pdf"
                emptyLabel="Upload certificate ZIP archive or PDF — one or more files"
                multiple
              />
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Student Result Sheet (Excel) *
              </h4>
              <FileUploadDropzone
                inputRef={studentSheetRef}
                files={studentResultFile}
                onFilesChange={handleStudentResultFileChange}
                accept=".xlsx,.xls,.xlsm,.csv"
                emptyLabel={
                  parsingStudentSheet
                    ? "Reading assessment numbers from sheet…"
                    : "Upload result sheet (.xlsx, .xls, .xlsm, .csv)"
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitCertificates}
            disabled={!canSubmitCertificates}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#009530] text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
          >
            {submitting || parsingStudentSheet ? (
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
    if (activeViewStep === 0) return renderReceivedStep();
    if (activeViewStep === 1) return renderAcceptedStep();
    return renderCertificatesStep();
  };

  return (
    <div className="px-6 py-2">
      <WorkflowStepper
        steps={WORKFLOW_STEPS}
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
          onClick={() =>
            setActiveViewStep((s) => Math.min(WORKFLOW_STEPS.length - 1, s + 1))
          }
          disabled={activeViewStep === WORKFLOW_STEPS.length - 1}
          className="px-5 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
