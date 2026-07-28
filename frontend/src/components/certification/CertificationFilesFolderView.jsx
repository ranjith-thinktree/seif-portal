import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  FolderIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import Spinner from "../common/Spinner";
import { cn } from "../../utils/cn";
import {
  getRequestFolderLabel,
  groupCertificationRowsByMonth,
} from "../../utils/certificationArchiveUtils";
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

const RequestBlock = ({
  row,
  expanded,
  onToggleExpanded,
  selectedSet,
  onToggleFile,
  onToggleFiles,
  onDownloadFile,
  downloadingFileId,
  visibleTraineeMetrics,
}) => {
  const files = row.files || [];
  const selectedCount = files.filter((f) => selectedSet.has(f.id)).length;
  const allSelected = files.length > 0 && selectedCount === files.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50/80">
        <button
          type="button"
          className="mt-0.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={onToggleExpanded}
          aria-label={expanded ? "Collapse request" : "Expand request"}
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
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onToggleExpanded}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {getRequestFolderLabel(row)}
            </span>
            <span className="text-xs text-slate-500">
              Assessment {formatCertificationDate(row.assessment_date)}
            </span>
            {selectedCount > 0 && (
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                {selectedCount}/{files.length} selected
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal bg-white">
              {files.filter((f) => f.fileType === "certificate").length} cert
            </Badge>
            <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal bg-white">
              {files.filter((f) => f.fileType === "result_sheet").length} sheet
            </Badge>
            <TraineeResultsCell
              row={row}
              compact
              visibleMetrics={visibleTraineeMetrics}
            />
          </div>
        </button>
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
};

const CertificationFilesFolderView = ({
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
  const groupedMonths = useMemo(() => groupCertificationRowsByMonth(rows), [rows]);

  const filteredMonths = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groupedMonths;

    return groupedMonths
      .map(({ month, rows: monthRows }) => ({
        month,
        rows: monthRows.filter((row) => {
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
        }),
      }))
      .filter((group) => group.rows.length > 0);
  }, [groupedMonths, searchTerm]);

  const allRequestIds = useMemo(
    () => filteredMonths.flatMap((group) => group.rows.map((row) => row.upload_id)),
    [filteredMonths],
  );

  const [collapsedMonths, setCollapsedMonths] = useState(() => new Set());
  const [collapsedRequests, setCollapsedRequests] = useState(() => new Set());

  useEffect(() => {
    if (requestsExpanded) {
      setCollapsedRequests(new Set());
    } else {
      setCollapsedRequests(new Set(allRequestIds));
    }
  }, [requestsExpanded, allRequestIds]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16 flex justify-center">
        <Spinner />
      </div>
    );
  }

  if (!filteredMonths.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
        No archived folders match the current filters or search.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="max-h-[62vh] overflow-y-auto">
        {filteredMonths.map(({ month, rows: monthRows }) => {
          const monthCollapsed = collapsedMonths.has(month);
          const monthFileIds = monthRows.flatMap((row) => (row.files || []).map((f) => f.id));
          const monthSelected = monthFileIds.filter((id) => selectedSet.has(id)).length;

          return (
            <section key={month} className="border-b border-slate-100 last:border-b-0">
              <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-slate-100 bg-[#f8fafc] px-3 py-2">
                <button
                  type="button"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
                  onClick={() =>
                    setCollapsedMonths((prev) => {
                      const next = new Set(prev);
                      if (next.has(month)) next.delete(month);
                      else next.add(month);
                      return next;
                    })
                  }
                >
                  <ChevronDownIcon
                    className={cn("h-4 w-4 transition-transform", monthCollapsed && "-rotate-90")}
                  />
                </button>
                <FolderIcon className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-900">{month}</span>
                <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-normal bg-white">
                  {monthRows.length} request(s)
                </Badge>
                {monthSelected > 0 && (
                  <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                    {monthSelected} selected
                  </Badge>
                )}
                <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <Checkbox
                    checked={
                      monthFileIds.length > 0 && monthFileIds.every((id) => selectedSet.has(id))
                        ? true
                        : monthSelected > 0
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(checked) => onToggleFiles(monthFileIds, Boolean(checked))}
                  />
                  Select month
                </label>
              </div>

              {!monthCollapsed &&
                monthRows.map((row) => (
                  <RequestBlock
                    key={row.upload_id}
                    row={row}
                    expanded={!collapsedRequests.has(row.upload_id)}
                    onToggleExpanded={() =>
                      setCollapsedRequests((prev) => {
                        const next = new Set(prev);
                        if (next.has(row.upload_id)) next.delete(row.upload_id);
                        else next.add(row.upload_id);
                        return next;
                      })
                    }
                    selectedSet={selectedSet}
                    onToggleFile={onToggleFile}
                    onToggleFiles={onToggleFiles}
                    onDownloadFile={onDownloadFile}
                    downloadingFileId={downloadingFileId}
                    visibleTraineeMetrics={visibleTraineeMetrics}
                  />
                ))}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default CertificationFilesFolderView;
