import React, { useState, useRef } from "react";

import {

  ArrowPathIcon,

  ArrowUpTrayIcon,

  XMarkIcon,

} from "@heroicons/react/24/outline";

import { essciUploadCertificatePDF } from "../../services/certification.service";



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

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState(null);

  const certRef = useRef(null);



  if (!row) return null;



  const handleSubmit = async () => {

    if (certificateFiles.length === 0) {

      setError("Upload at least one certificate document.");

      return;

    }

    if (

      registered === "" ||

      attended === "" ||

      passed === "" ||

      failed === ""

    ) {

      setError("Please fill in registered, attended, passed, and failed counts.");

      return;

    }

    if (!row.essci_step1_at) {

      setError("Complete Step 1 (initial response) on the Requests page first.");

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

            <h3 className="text-sm font-medium text-gray-700 mb-3">

              Assessment Numbers *

            </h3>

            <div className="grid grid-cols-2 gap-3">

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

            <h3 className="text-sm font-medium text-gray-700 mb-2">

              Certificate Documents *

            </h3>

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

                  ZIP, PDF, or other supported formats

                </p>

              )}

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

            disabled={uploading}

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

