import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import Spinner from "../common/Spinner";
import { cn } from "../../utils/cn";
import { formatCertificationDate } from "../../utils/certificationUtils";
import TraineeResultsCell from "./TraineeResultsCell";

const FileRow = ({ file, checked, onToggle, onDownload, downloading }) => {
  const Icon = file.fileType === "certificate" ? DocumentTextIcon : TableCellsIcon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2",
        checked && "border-primary-300 bg-primary-50/60",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onToggle(file.id, Boolean(value))}
        aria-label={`Select ${file.fileName}`}
      />
      <Icon className="h-4 w-4 shrink-0 text-primary-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{file.fileName}</p>
        <p className="text-xs text-slate-500">
          {file.fileType === "certificate" ? "Certificate" : "Result sheet"}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-slate-500"
        disabled={downloading}
        onClick={() => onDownload(file)}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

const CertificationFilesListView = ({
  rows = [],
  loading = false,
  searchTerm = "",
  selectedFileIds = [],
  onToggleFile,
  onToggleFiles,
  onDownloadFile,
  downloadingFileId = null,
  requestsExpanded = true,
  visibleTraineeMetrics,
}) => {
  const selectedSet = useMemo(() => new Set(selectedFileIds), [selectedFileIds]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.partner_name,
        row.center_name,
        row.batch_number,
        row.upload_id,
        row.storage_month,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, searchTerm]);

  const [collapsed, setCollapsed] = useState(() => new Set());

  useEffect(() => {
    const ids = filteredRows.map((row) => row.upload_id);
    if (requestsExpanded) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(ids));
    }
  }, [requestsExpanded, filteredRows]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!filteredRows.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
        No archived records match the current filters or search.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="max-h-[62vh] overflow-y-auto divide-y divide-slate-100">
        {filteredRows.map((row) => {
          const files = row.files || [];
          const expanded = !collapsed.has(row.upload_id);
          const selectedCount = files.filter((f) => selectedSet.has(f.id)).length;
          const allSelected = files.length > 0 && selectedCount === files.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <div key={row.upload_id}>
              <div className="flex items-start gap-2.5 px-3 py-3 hover:bg-slate-50/80">
                <button
                  type="button"
                  className="mt-0.5 rounded-md p-1 text-slate-400 hover:bg-slate-100"
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(row.upload_id)) next.delete(row.upload_id);
                      else next.add(row.upload_id);
                      return next;
                    })
                  }
                >
                  <ChevronDownIcon
                    className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")}
                  />
                </button>
                <Checkbox
                  className="mt-1"
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  disabled={!files.length}
                  onCheckedChange={(checked) =>
                    onToggleFiles(
                      files.map((f) => f.id),
                      Boolean(checked),
                    )
                  }
                />
                <div className="min-w-0 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-x-4 gap-y-2">
                  <div className="lg:col-span-4 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {row.partner_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {row.center_name || "—"} · Batch {row.batch_number || "—"}
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Assessment</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">
                      {formatCertificationDate(row.assessment_date)}
                    </p>
                    {row.storage_month && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[11px] px-1.5 py-0 font-normal bg-white"
                      >
                        {row.storage_month}
                      </Badge>
                    )}
                  </div>
                  <div className="lg:col-span-4 flex items-center">
                    <TraineeResultsCell
                      row={row}
                      compact
                      visibleMetrics={visibleTraineeMetrics}
                    />
                  </div>
                  <div className="lg:col-span-2 flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal bg-white">
                      {files.filter((f) => f.fileType === "certificate").length} cert
                    </Badge>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal bg-white">
                      {files.filter((f) => f.fileType === "result_sheet").length} sheet
                    </Badge>
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                        {selectedCount} sel
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="space-y-2 bg-slate-50/70 px-3 py-2.5 pl-12">
                  {!files.length ? (
                    <p className="text-xs text-slate-500 py-1">No files archived.</p>
                  ) : (
                    files.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        checked={selectedSet.has(file.id)}
                        onToggle={onToggleFile}
                        onDownload={onDownloadFile}
                        downloading={downloadingFileId === file.id}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CertificationFilesListView;
