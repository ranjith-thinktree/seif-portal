import React from "react";
import {
  DocumentArrowDownIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

/**
 * Upload Instructions Component
 * Right-side panel with upload instructions
 */
const UploadInstructions = ({ onDownloadTemplate }) => {
  return (
    <div className="bg-white rounded-lg shadow-card p-8 h-full">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-foreground ">
          How to upload data
        </h3>
        <p className="mt-2">
          Follow these instructions step by step to uplaod data
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
              Download the CSV Template
            </p>
          </div>
          <div className="ml-7">
            <button
              onClick={onDownloadTemplate}
              className="px-6 py-2.5 bg-[#1F2937] text-white rounded-md hover:bg-[#374151] transition-colors text-sm font-medium shadow-sm"
            >
              Download template
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="border border-[#E7E7E7] py-2 px-6 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 text-lg font-bold text-foreground bg-[#e6f4ea] p-2 rounded-full flex items-center justify-center">
              2.
            </span>
            <p className="text-base font-semibold text-foreground pt-0.5">
              Update the data and rename the file as:{" "}
              <span className="block mt-2 text-sm font-normal text-muted-foreground">
                Partnername_CenterID_BatchID
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
              Save the file and upload
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadInstructions;
