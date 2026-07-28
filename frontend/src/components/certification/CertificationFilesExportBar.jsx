import React from "react";
import { ArchiveBoxIcon, ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

const CertificationFilesExportBar = ({
  visible = false,
  modeLabel = "",
  certificateCount = 0,
  resultSheetCount = 0,
  selectedCount = 0,
  onClearSelection,
  onExportZip,
  onExportExcel,
  canExportZip = false,
  canExportExcel = false,
  exportingZip = false,
  exportingExcel = false,
}) => {
  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50/40 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{modeLabel}</p>
        <Badge variant="secondary" className="font-normal text-[11px] px-2 py-0.5">
          {selectedCount > 0 ? `${selectedCount} selected` : "All filtered"}
        </Badge>
        <Badge variant="outline" className="font-normal text-[11px] px-2 py-0.5 bg-white">
          {certificateCount} cert
        </Badge>
        <Badge variant="outline" className="font-normal text-[11px] px-2 py-0.5 bg-white">
          {resultSheetCount} sheet
        </Badge>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {selectedCount > 0 && (
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onClearSelection}>
            <XMarkIcon className="h-4 w-4" />
            Clear
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 bg-white"
          disabled={!canExportZip || exportingZip}
          onClick={onExportZip}
        >
          <ArchiveBoxIcon className="h-4 w-4" />
          {exportingZip ? "Preparing…" : "Download ZIP"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={!canExportExcel || exportingExcel}
          onClick={onExportExcel}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {exportingExcel ? "Preparing…" : "Download Excel"}
        </Button>
      </div>
    </div>
  );
};

export default CertificationFilesExportBar;
