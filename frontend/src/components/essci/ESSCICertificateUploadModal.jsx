import React, { useState, useRef, useEffect } from "react";

import {

  ArrowPathIcon,

  ArrowUpTrayIcon,

  XMarkIcon,

} from "@heroicons/react/24/outline";

import { essciUploadCertificatePDF } from "../../services/certification.service";
import RefurbishmentDatePicker from "../refurbishment/RefurbishmentDatePicker";
import {
  formatCertificationDate,
  toCertificationDateInput,
} from "../../utils/certificationUtils";
import { parseEssciResultSummaryFile } from "../../utils/essciResultSummaryParser";



/**

 * Legacy ESSCI certificate upload modal (admin ESSCI data page).

 * Prefer ESSCICertificationWorkflowPanel on the Requests detail view.

 */

const ESSCICertificateUploadModal = ({ row, onClose, onSuccess }) => {

  const [registered, setRegistered] = useState("");

  const [attended, setAttended] = useState("");

  const [passed, setPassed] = useState("");

  const [failed, setFailed] = useState("");

  const [certificateFiles, setCertificateFiles] = useState([]);

  const [studentResultFile, setStudentResultFile] = useState(null);

  const [assessmentDate, setAssessmentDate] = useState("");

  const [parsingStudentSheet, setParsingStudentSheet] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState(null);

  const certRef = useRef(null);

  const studentSheetRef = useRef(null);

  useEffect(() => {
    setAssessmentDate(toCertificationDateInput(row?.assessment_date));
  }, [row?.id, row?.assessment_date]);

  if (!row) return null;

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
    setError(null);
    try {
      const totals = await parseEssciResultSummaryFile(file);
      setRegistered(String(totals.registered));
      setAttended(String(totals.attended));
      setPassed(String(totals.passed));
      setFailed(String(totals.failed));
    } catch (err) {
      setStudentResultFile(null);
      setError(
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

  const canSubmit =
    Boolean(assessmentDate) &&
    assessmentNumbersReady &&
    certificateFiles.length > 0 &&
    Boolean(studentResultFile) &&
    !parsingStudentSheet &&
    !uploading &&
    row?.status === "approved";

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("Please complete all required fields before submitting.");
      return;
    }

    setUploading(true);

    setError(null);

    try {

      const res = await essciUploadCertificatePDF(

        row.partner_id,

        row.center_id,

        row.batch_id || "",

        row.id,

        parseInt(registered, 10),

        parseInt(attended, 10),

        parseInt(passed, 10),

        parseInt(failed, 10),

        certificateFiles,

        studentResultFile,

        assessmentDate,

      );

      if (res.success) {

        onSuccess?.();

      } else {

        setError(res.message || "Upload failed. Please try again.");

      }

    } catch (err) {

      setError(

        err.response?.data?.message || "Upload failed. Please try again.",

      );

    } finally {

      setUploading(false);

    }

  };



  return (

    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">

          <div>

            <h2 className="font-semibold text-gray-900">Upload Certificates</h2>

            <p className="text-xs text-gray-500 mt-0.5">

              {row.center_name} — Batch {row.batch_number || row.batch_id}

            </p>

          </div>

          <button

            type="button"

            onClick={onClose}

            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"

          >

            <XMarkIcon className="w-5 h-5 text-gray-500" />

          </button>

        </div>



        <div className="px-6 py-5 space-y-5">

          {error && (

            <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">

              {error}

            </div>

          )}



          <div>

            <h3 className="text-sm font-medium text-gray-700 mb-2">

              Confirm Assessment Date *

            </h3>

            <p className="text-xs text-gray-500 mb-2">

              Partner submitted {formatCertificationDate(row.assessment_date)} —

              confirm or update before uploading.

            </p>

            <RefurbishmentDatePicker

              value={assessmentDate}

              onChange={setAssessmentDate}

              placeholder="Select assessment date"

            />

          </div>



          <div>

            <h3 className="text-sm font-medium text-gray-700 mb-2">

              Assessment Numbers *

            </h3>

            <p className="text-xs text-gray-500 mb-2">

              Loaded automatically from the uploaded result sheet.

            </p>

            <div className="grid grid-cols-2 gap-3">

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

              <h3 className="text-sm font-medium text-gray-700 mb-2">

                Certificates (ZIP / PDF) *

              </h3>

              <div

                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"

                onClick={() => certRef.current?.click()}

              >

                <input

                  ref={certRef}

                  type="file"

                  multiple

                  accept=".zip,.tar,.gz,.rar,.7z,.pdf"

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

                    ZIP archive or PDF — one or more files

                  </p>

                )}

              </div>

            </div>



            <div>

              <h3 className="text-sm font-medium text-gray-700 mb-2">

                Student Result Sheet (Excel) *

              </h3>

              <div

                className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors border-gray-300"

                onClick={() => studentSheetRef.current?.click()}

              >

                <input

                  ref={studentSheetRef}

                  type="file"

                  accept=".xlsx,.xls,.xlsm,.csv"

                  className="hidden"

                  onChange={(e) =>

                    handleStudentResultFileChange(e.target.files?.[0] || null)

                  }

                />

                <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />

                {studentResultFile ? (

                  <p className="text-sm text-gray-700 truncate">{studentResultFile.name}</p>

                ) : parsingStudentSheet ? (

                  <p className="text-sm text-gray-500">Reading assessment numbers…</p>

                ) : (

                  <p className="text-sm text-gray-500">

                    Result sheet (.xlsx, .xls, .xlsm, .csv)

                  </p>

                )}

              </div>

            </div>

          </div>

        </div>



        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">

          <button

            type="button"

            onClick={onClose}

            disabled={uploading}

            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"

          >

            Cancel

          </button>

          <button

            type="button"

            onClick={handleSubmit}

            disabled={!canSubmit}

            className="px-5 py-2 text-sm bg-[#009530] text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2"

          >

            {uploading ? (

              <>

                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Uploading…

              </>

            ) : (

              <>

                <ArrowUpTrayIcon className="w-4 h-4" /> Submit

              </>

            )}

          </button>

        </div>

      </div>

    </div>

  );

};



export default ESSCICertificateUploadModal;

