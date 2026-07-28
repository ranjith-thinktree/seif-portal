import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import StatCard from "../../../components/common/StatCard";
import { Badge } from "../../../components/ui/badge";
import refurbishmentService from "../../../services/refurbishment.service";
import {
  getRefurbishmentDisplayStatus,
  REFURBISHMENT_STATUS_BADGE_CLASSES,
} from "../../../utils/refurbishmentUtils";
import { summarizeRefurbishmentRequests } from "../../../utils/refurbishmentReportUtils";
import {
  buildRefurbishmentPastRequestParams,
  defaultRefurbishmentPeriodState,
  describeRefurbishmentReportPeriodFull,
  resolveRefurbishmentPeriodBounds,
} from "../../../utils/refurbishmentReportPeriodUtils";
import { formatCertificationDate } from "../../../utils/certificationUtils";
import { CARD_CLASS } from "../reports.constants";
import { fmt, sparkline, Skeleton } from "../reports.helpers";
import RefurbishmentReportsCharts from "./RefurbishmentReportsCharts";

const RefurbishmentReportsPanel = ({
  period: periodProp = null,
  headerActions = null,
}) => {
  const period = useMemo(
    () => periodProp || defaultRefurbishmentPeriodState(),
    [periodProp],
  );
  const [rows, setRows] = useState([]);
  const [readyToComplete, setReadyToComplete] = useState(0);
  const [refurbishedCount, setRefurbishedCount] = useState(0);
  const [dashboard, setDashboard] = useState({
    eligible: 0,
    allCenters: 0,
    recentlyRefurbished: 0,
  });
  const [loading, setLoading] = useState(true);

  const summary = useMemo(() => summarizeRefurbishmentRequests(rows), [rows]);
  const periodLabelFull = useMemo(
    () => describeRefurbishmentReportPeriodFull(period),
    [period],
  );

  const loadData = useCallback(async (activePeriod) => {
    setLoading(true);
    try {
      const bounds = resolveRefurbishmentPeriodBounds(activePeriod);
      const pastParams = buildRefurbishmentPastRequestParams(activePeriod);

      const statsPromise =
        activePeriod.mode === "calendar_year" && bounds.year
          ? refurbishmentService.getYearStats(bounds.year)
          : refurbishmentService.getPeriodStats({
              fromDate: bounds.fromDate,
              toDate: bounds.toDate,
            });

      const [dashRes, statsRes, pastRes] = await Promise.all([
        refurbishmentService.getDashboardSummary({
          recentlyRefurbishedWithin: 12,
        }),
        statsPromise,
        refurbishmentService.getPastRequests(pastParams),
      ]);

      const dash = dashRes?.data || {};
      setDashboard({
        eligible: Number(dash.eligibleCenters?.totalCount) || 0,
        allCenters: Number(dash.allCentersSummary?.totalCount) || 0,
        recentlyRefurbished: Number(dash.recentlyRefurbished?.totalCount) || 0,
      });

      setRefurbishedCount(
        Number(
          statsRes?.data?.totalRefurbished ?? statsRes?.totalRefurbished,
        ) || 0,
      );

      const pastData = pastRes?.data;
      const requests = Array.isArray(pastData)
        ? pastData
        : pastData?.requests || [];
      setRows(requests);
      setReadyToComplete(Number(pastData?.readyToCompleteCount) || 0);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load refurbishment report",
      );
      setRows([]);
      setReadyToComplete(0);
      setRefurbishedCount(0);
      setDashboard({ eligible: 0, allCenters: 0, recentlyRefurbished: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const kpiCards = [
    { title: "Eligible centers (current)", value: dashboard.eligible },
    { title: "All centers (current)", value: dashboard.allCenters },
    { title: "Refurbished", value: refurbishedCount },
    { title: "Requests", value: summary.requests },
    { title: "Completed", value: summary.completed },
    { title: "Ready to complete", value: readyToComplete },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Refurbishment
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Request updated date · {periodLabelFull}
          </p>
        </div>
        {headerActions}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[16px] border border-[#A5A5A5] p-3 min-h-[120px]"
            >
              <Skeleton h="h-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {kpiCards.map((c) => (
            <StatCard
              key={c.title}
              title={c.title}
              value={fmt(c.value)}
              trend="up"
              graphData={sparkline(c.value)}
            />
          ))}
        </div>
      )}

      <RefurbishmentReportsCharts
        loading={loading}
        rows={rows}
        yearLabel={periodLabelFull}
      />

      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Refurbishment requests
            </h3>
            {!loading && (
              <p className="text-xs text-gray-500 mt-0.5">{periodLabelFull}</p>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {loading
              ? "…"
              : `${rows.length} request${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Request</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Center</th>
                <th className="px-4 py-2.5 font-medium">Partner</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-gray-500">
                      No refurbishment requests
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      No requests found for {periodLabelFull}. Try another
                      report period.
                    </p>
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => {
                  const display = getRefurbishmentDisplayStatus(row);
                  const badgeClass =
                    REFURBISHMENT_STATUS_BADGE_CLASSES[display.badgeKey] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <tr
                      key={row.id || row.requestId}
                      className="hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-2.5 text-gray-800 font-medium whitespace-nowrap">
                        {row.requestId || row.id || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {row.request_type || row.type || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {row.center_name || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {row.organization_name || row.partner_name || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${badgeClass}`}
                        >
                          {display.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {formatCertificationDate(
                          row.updated_at || row.completed_at,
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default RefurbishmentReportsPanel;
