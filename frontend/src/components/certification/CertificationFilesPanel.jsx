import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Squares2X2Icon, TableCellsIcon } from "@heroicons/react/24/outline";
import AdvancedSearchBar from "../common/AdvancedSearchBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import CertificationFilesExportBar from "./CertificationFilesExportBar";
import CertificationFilesFolderView from "./CertificationFilesFolderView";
import CertificationFilesListView from "./CertificationFilesListView";
import { downloadFile } from "../../services/data.service";
import {
  downloadCertificationArchivedFile,
  exportCertificationArchiveExcel,
  exportCertificationArchiveZip,
  listCertificationFileArchive,
} from "../../services/certification.service";
import {
  CERTIFICATION_ARCHIVE_MONTH_OPTIONS,
  CERTIFICATION_ARCHIVE_YEAR_OPTIONS,
  CERTIFICATION_DATE_TYPE_OPTIONS,
  CERTIFICATION_TRAINEE_METRIC_OPTIONS,
  buildCertificationArchiveApiParams,
  collectArchiveFilesFromRows,
  describeCertificationArchiveFilters,
  emptyCertificationArchiveFilters,
  getCertificationFilterActionMode,
  hasActiveCertificationArchiveFilters,
  partitionSelectedArchiveFiles,
  summarizeCertificationArchiveRows,
} from "../../utils/certificationArchiveUtils";

const CertificationFilesPanel = () => {
  const [filters, setFilters] = useState(emptyCertificationArchiveFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyCertificationArchiveFilters);
  const [viewMode, setViewMode] = useState("folder");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState({
    centers: 0,
    batches: 0,
    registered: 0,
    attended: 0,
    passed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestsExpanded, setRequestsExpanded] = useState(true);

  const filtersActive = hasActiveCertificationArchiveFilters(appliedFilters);
  const filterActionMode = getCertificationFilterActionMode(filters, appliedFilters);
  const appliedLabels = describeCertificationArchiveFilters(appliedFilters);
  const allFiles = useMemo(() => collectArchiveFilesFromRows(rows), [rows]);
  const fileSummary = useMemo(() => summarizeCertificationArchiveRows(rows), [rows]);
  const selection = useMemo(
    () => partitionSelectedArchiveFiles(allFiles, selectedFileIds),
    [allFiles, selectedFileIds],
  );

  const showExportBar = filtersActive || selectedFileIds.length > 0;
  const selectionMode = selectedFileIds.length > 0;
  const exportCertificateCount = selectionMode
    ? selection.certificates.length
    : fileSummary.certificates;
  const exportResultSheetCount = selectionMode
    ? selection.resultSheets.length
    : fileSummary.resultSheets;
  const canExportZip = selectionMode
    ? selection.certificates.length > 0
    : filtersActive && fileSummary.certificates > 0;
  const canExportExcel = selectionMode
    ? selection.resultSheets.length > 0
    : filtersActive && fileSummary.resultSheets > 0;

  const filterGroups = useMemo(
    () => [
      {
        label: "Date types",
        key: "dateTypes",
        options: CERTIFICATION_DATE_TYPE_OPTIONS,
        multi: true,
      },
      {
        label: "Months",
        key: "months",
        options: CERTIFICATION_ARCHIVE_MONTH_OPTIONS,
        multi: true,
      },
      {
        label: "Years",
        key: "years",
        options: CERTIFICATION_ARCHIVE_YEAR_OPTIONS,
        multi: true,
      },
      {
        label: "Trainee results",
        key: "traineeMetrics",
        options: CERTIFICATION_TRAINEE_METRIC_OPTIONS,
        multi: true,
      },
    ],
    [],
  );

  const loadData = useCallback(async (activeFilters) => {
    setLoading(true);
    try {
      const response = await listCertificationFileArchive(
        buildCertificationArchiveApiParams(activeFilters),
      );
      const data = response?.data || {};
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setKpis({
        centers: Number(data.kpis?.centers) || 0,
        batches: Number(data.kpis?.batches) || 0,
        registered: Number(data.kpis?.registered) || 0,
        attended: Number(data.kpis?.attended) || 0,
        passed: Number(data.kpis?.passed) || 0,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load archived files");
      setRows([]);
      setTotal(0);
      setKpis({
        centers: 0,
        batches: 0,
        registered: 0,
        attended: 0,
        passed: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(appliedFilters);
  }, [appliedFilters, loadData]);

  useEffect(() => {
    const validIds = new Set(allFiles.map((file) => file.id));
    setSelectedFileIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [allFiles]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => setAppliedFilters({ ...filters });

  const handleReset = () => {
    const cleared = emptyCertificationArchiveFilters();
    setFilters(cleared);
    setAppliedFilters(cleared);
    setSelectedFileIds([]);
    setSearchTerm("");
  };

  const handleFilterAction = () => {
    if (filterActionMode === "reset") handleReset();
    else handleApply();
  };

  const handleClearDraftFilters = () => {
    setFilters(emptyCertificationArchiveFilters());
  };

  const handleToggleFile = (fileId, checked) => {
    setSelectedFileIds((prev) => {
      if (checked) return prev.includes(fileId) ? prev : [...prev, fileId];
      return prev.filter((id) => id !== fileId);
    });
  };

  const handleToggleFiles = (fileIds, checked) => {
    setSelectedFileIds((prev) => {
      const set = new Set(prev);
      fileIds.forEach((id) => {
        if (checked) set.add(id);
        else set.delete(id);
      });
      return [...set];
    });
  };

  const clearSelection = () => setSelectedFileIds([]);

  const handleDownloadFile = async (file) => {
    setDownloadingFileId(file.id);
    try {
      const blob = await downloadCertificationArchivedFile(file.id);
      downloadFile(blob, file.fileName);
    } catch (error) {
      toast.error(error.response?.data?.message || "Download failed");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const buildExportPayload = (fileIds) => {
    if (fileIds?.length) return { fileIds };
    return buildCertificationArchiveApiParams(appliedFilters);
  };

  const handleExportZip = async () => {
    if (!canExportZip) {
      toast.warn("Select certificate files or apply filters that include certificates");
      return;
    }
    setExportingZip(true);
    try {
      const payload = buildExportPayload(
        selectionMode ? selection.certificates.map((file) => file.id) : null,
      );
      const blob = await exportCertificationArchiveZip(payload);
      downloadFile(blob, `certificates_export_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (error) {
      toast.error(error.response?.data?.message || "ZIP export failed");
    } finally {
      setExportingZip(false);
    }
  };

  const handleExportExcel = async () => {
    if (!canExportExcel) {
      toast.warn("Select result sheet files or apply filters that include result sheets");
      return;
    }
    setExportingExcel(true);
    try {
      const payload = buildExportPayload(
        selectionMode ? selection.resultSheets.map((file) => file.id) : null,
      );
      const blob = await exportCertificationArchiveExcel(payload);
      downloadFile(
        blob,
        `certification_results_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Excel export failed");
    } finally {
      setExportingExcel(false);
    }
  };

  const modeLabel = selectionMode
    ? "Export selected files"
    : "Export all files matching applied filters";

  const applyDisabled =
    filterActionMode === "apply" && !hasActiveCertificationArchiveFilters(filters) && !filtersActive;

  const visibleRows = useMemo(() => {
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

  const visibleFileIds = useMemo(
    () => visibleRows.flatMap((row) => (row.files || []).map((file) => file.id)),
    [visibleRows],
  );

  const allVisibleSelected =
    visibleFileIds.length > 0 && visibleFileIds.every((id) => selectedFileIds.includes(id));
  const someVisibleSelected =
    visibleFileIds.some((id) => selectedFileIds.includes(id)) && !allVisibleSelected;

  const sharedViewProps = {
    rows,
    loading,
    searchTerm,
    selectedFileIds,
    onToggleFile: handleToggleFile,
    onToggleFiles: handleToggleFiles,
    onDownloadFile: handleDownloadFile,
    downloadingFileId,
    requestsExpanded,
    visibleTraineeMetrics: appliedFilters.traineeMetrics || [],
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Certification Files & Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter, select files across requests, then download ZIP or Excel.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
          <button
            type="button"
            aria-pressed={viewMode === "folder"}
            onClick={() => setViewMode("folder")}
            className={
              viewMode === "folder"
                ? "inline-flex h-8 items-center gap-2 rounded-md bg-[#009530] px-3 text-sm font-medium text-white shadow-sm"
                : "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900"
            }
          >
            <Squares2X2Icon className="h-4 w-4" />
            By month
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={
              viewMode === "list"
                ? "inline-flex h-8 items-center gap-2 rounded-md bg-[#009530] px-3 text-sm font-medium text-white shadow-sm"
                : "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900"
            }
          >
            <TableCellsIcon className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Centers", value: kpis.centers },
          { label: "Batches", value: kpis.batches },
          { label: "Registered", value: kpis.registered },
          { label: "Attended", value: kpis.attended },
          { label: "Passed", value: kpis.passed },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {loading ? "…" : kpi.value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>
      {filtersActive && (
        <p className="text-xs text-slate-500 -mt-2 px-0.5">
          KPIs reflect currently applied filters ({total} request
          {total === 1 ? "" : "s"}).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[260px] flex-1">
          <AdvancedSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search partner, center, batch, or request ID…"
            filterGroups={filterGroups}
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearDraftFilters}
            sortOptions={[]}
            actions={[
              {
                label: filterActionMode === "reset" ? "Reset" : "Apply",
                onClick: handleFilterAction,
                variant: filterActionMode === "reset" ? "outline" : "default",
                disabled: loading || applyDisabled,
              },
            ]}
          />
        </div>
        <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 cursor-pointer whitespace-nowrap">
          <Checkbox
            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
            disabled={!visibleFileIds.length || loading}
            onCheckedChange={(checked) => handleToggleFiles(visibleFileIds, Boolean(checked))}
          />
          Select all{visibleFileIds.length ? ` (${visibleFileIds.length})` : ""}
        </label>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => setRequestsExpanded((prev) => !prev)}
          disabled={loading || !visibleRows.length}
        >
          {requestsExpanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {appliedLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-xs text-slate-500">Applied:</span>
          {appliedLabels.map((label) => (
            <Badge key={label} variant="secondary" className="font-normal text-[11px] px-2 py-0.5">
              {label}
            </Badge>
          ))}
        </div>
      )}

      <CertificationFilesExportBar
        visible={showExportBar}
        modeLabel={modeLabel}
        certificateCount={exportCertificateCount}
        resultSheetCount={exportResultSheetCount}
        selectedCount={selectedFileIds.length}
        onClearSelection={clearSelection}
        onExportZip={handleExportZip}
        onExportExcel={handleExportExcel}
        canExportZip={canExportZip}
        canExportExcel={canExportExcel}
        exportingZip={exportingZip}
        exportingExcel={exportingExcel}
      />

      {viewMode === "folder" ? (
        <CertificationFilesFolderView {...sharedViewProps} />
      ) : (
        <CertificationFilesListView {...sharedViewProps} />
      )}
    </div>
  );
};

export default CertificationFilesPanel;
