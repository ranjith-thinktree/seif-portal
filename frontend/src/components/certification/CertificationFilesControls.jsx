import React from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { MultiSelect } from "../ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../../utils/cn";
import {
  CERTIFICATION_ARCHIVE_MONTH_OPTIONS,
  CERTIFICATION_ARCHIVE_YEAR_OPTIONS,
  CERTIFICATION_DATE_TYPE_OPTIONS,
  CERTIFICATION_TRAINEE_METRIC_OPTIONS,
  countActiveCertificationArchiveFilters,
  describeCertificationArchiveFilters,
} from "../../utils/certificationArchiveUtils";

const CertificationFilesControls = ({
  filters,
  appliedFilters,
  onFilterChange,
  onApply,
  onReset,
  loading = false,
}) => {
  const draftCount = countActiveCertificationArchiveFilters(filters);
  const appliedLabels = describeCertificationArchiveFilters(appliedFilters);

  const toggleTraineeMetric = (metric, checked) => {
    const current = filters.traineeMetrics || [];
    const next = checked
      ? [...new Set([...current, metric])]
      : current.filter((item) => item !== metric);
    onFilterChange("traineeMetrics", next);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100">
        <FunnelIcon className="h-4 w-4 text-primary-600" />
        <h2 className="text-sm font-semibold text-slate-900">Report filters</h2>
        {appliedLabels.map((label) => (
          <Badge
            key={label}
            variant="secondary"
            className="font-normal text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700"
          >
            {label}
          </Badge>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-3"
            onClick={onReset}
            disabled={loading}
          >
            Reset
          </Button>
          <Button type="button" size="sm" className="h-8 px-3" onClick={onApply} disabled={loading}>
            Apply{draftCount > 0 ? ` (${draftCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Date types</Label>
          <MultiSelect
            options={CERTIFICATION_DATE_TYPE_OPTIONS}
            selected={filters.dateTypes || []}
            onChange={(value) => onFilterChange("dateTypes", value)}
            placeholder="Any date type"
            searchPlaceholder="Search…"
            maxDisplay={1}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Months</Label>
          <MultiSelect
            options={CERTIFICATION_ARCHIVE_MONTH_OPTIONS}
            selected={filters.months || []}
            onChange={(value) => onFilterChange("months", value)}
            placeholder="Any month"
            searchPlaceholder="Search…"
            maxDisplay={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Year</Label>
          <Select
            value={filters.year || undefined}
            onValueChange={(value) => onFilterChange("year", value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Any year" />
            </SelectTrigger>
            <SelectContent>
              {CERTIFICATION_ARCHIVE_YEAR_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-500">Trainee results</Label>
          <div className="flex flex-wrap gap-1.5 min-h-9 items-center">
            {CERTIFICATION_TRAINEE_METRIC_OPTIONS.map((item) => {
              const checked = (filters.traineeMetrics || []).includes(item.value);
              return (
                <label
                  key={item.value}
                  htmlFor={`trainee-metric-${item.value}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors",
                    checked
                      ? "border-primary-300 bg-primary-50 text-primary-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Checkbox
                    id={`trainee-metric-${item.value}`}
                    className="h-3.5 w-3.5"
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleTraineeMetric(item.value, Boolean(value))
                    }
                  />
                  {item.label}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CertificationFilesControls;
