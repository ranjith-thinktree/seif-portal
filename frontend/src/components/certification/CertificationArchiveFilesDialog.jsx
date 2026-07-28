import React, { useMemo } from "react";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { cn } from "../../utils/cn";
import { formatCertificationDate } from "../../utils/certificationUtils";

const CertificationArchiveFilesDialog = ({
  open,
  onClose,
  row,
  selectedFileIds = [],
  onToggleFile,
  onToggleFiles,
  onDownload,
  downloadingFileId = null,
}) => {
  const selectedSet = useMemo(() => new Set(selectedFileIds), [selectedFileIds]);
  if (!row) return null;

  const certificateFiles = (row.files || []).filter((f) => f.fileType === "certificate");
  const resultSheets = (row.files || []).filter((f) => f.fileType === "result_sheet");
  const allFiles = row.files || [];
  const allSelected = allFiles.length > 0 && allFiles.every((file) => selectedSet.has(file.id));

  const renderFileList = (files, typeLabel, Icon) => {
    if (!files.length) {
      return <p className="text-sm text-muted-foreground">No {typeLabel.toLowerCase()} archived.</p>;
    }

    return (
      <ul className="space-y-2">
        {files.map((file) => {
          const checked = selectedSet.has(file.id);
          return (
            <li
              key={file.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5",
                checked && "border-primary-200 bg-primary-50/40",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggleFile?.(file.id, Boolean(value))}
                aria-label={`Select ${file.fileName}`}
              />
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Icon className="h-5 w-5 shrink-0 text-primary-500 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                  <p className="text-xs text-muted-foreground">{typeLabel}</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={downloadingFileId === file.id}
                onClick={() => onDownload(file)}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloadingFileId === file.id ? "Downloading…" : "Download"}
              </Button>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Archived files</DialogTitle>
          <DialogDescription>
            {row.partner_name} · {row.center_name || "—"} · Batch {row.batch_number || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Assessment date</p>
            <p className="font-medium">{formatCertificationDate(row.assessment_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Archive month</p>
            <p className="font-medium">{row.storage_month || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Partner request</p>
            <p className="font-medium">{formatCertificationDate(row.partner_request_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Batch period</p>
            <p className="font-medium">
              {formatCertificationDate(row.batch_start_date)} –{" "}
              {formatCertificationDate(row.batch_end_date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{row.registered ?? 0} registered</Badge>
            <Badge variant="outline">{row.attended ?? 0} attended</Badge>
            <Badge variant="outline">{row.passed ?? 0} passed</Badge>
            <Badge variant="outline">{row.failed ?? 0} failed</Badge>
          </div>
          {allFiles.length > 0 && (
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) =>
                  onToggleFiles?.(
                    allFiles.map((file) => file.id),
                    Boolean(checked),
                  )
                }
              />
              Select all
            </label>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Certificates</h4>
            {renderFileList(certificateFiles, "Certificate", DocumentTextIcon)}
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Result sheets</h4>
            {renderFileList(resultSheets, "Result sheet", TableCellsIcon)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificationArchiveFilesDialog;
