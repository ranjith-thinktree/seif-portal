import React from "react";
import {
  DocumentArrowDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

/**
 * Upload Instructions Component
 * Right-side panel with upload instructions
 */
const UploadInstructions = ({
  onDownloadTemplate,
  disabled = false,
  disabledMessage = "",
}) => {
  return (
    <div className="bg-white rounded-lg shadow-card p-8 h-full">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-foreground ">
          How to upload data
        </h3>
        <p className="mt-2 text-primary-600 text-sm font-medium">
          ✨ Multiple formats supported: CSV, XLSX, XLS, XLSM
        </p>
      </div>
      <div className="space-y-8">
        {/* Step 1 */}
        <div className="flex justify-between items-center border border-[#E7E7E7] py-2 px-6 rounded-2xl">
          <div className="flex items-center gap-3">
            {/* i want the number inside the rounder circle bg */}
            <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center">
              1.
            </span>
            <p className="text-base font-semibold text-foreground pt-0.5">
              Download the Template (Recommended)
            </p>
          </div>
          <div className="relative group">
            <button
              onClick={onDownloadTemplate}
              disabled={disabled}
              className={`px-6 py-2.5 rounded-md transition-colors text-sm font-medium shadow-sm ${
                disabled
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#1F2937] text-white hover:bg-[#374151]"
              }`}
              title={disabled ? disabledMessage : ""}
            >
              Download template
            </button>
            {disabled && disabledMessage && (
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                {disabledMessage}
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="border border-[#E7E7E7] py-2 px-6 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center">
              2.
            </span>
            <p className="text-base font-semibold text-foreground pt-0.5">
              Fill in your data (keep any format: CSV, Excel)
              <span className="block mt-2 text-sm font-normal text-muted-foreground">
                Rename file as: Partnername_CenterID_BatchID
              </span>
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="border border-[#E7E7E7] py-2 px-6 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center">
              3.
            </span>
            <p className="text-base font-semibold text-foreground pt-0.5">
              Upload your file - We accept all formats!
              <span className="block mt-2 text-sm font-normal text-muted-foreground">
                ✓ CSV (.csv) ✓ Excel (.xlsx, .xls, .xlsm)
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadInstructions;
