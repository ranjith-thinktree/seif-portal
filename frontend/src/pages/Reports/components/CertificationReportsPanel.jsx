import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import StatCard from "../../../components/common/StatCard";
import TraineeResultsCell from "../../../components/certification/TraineeResultsCell";
import { listCertificationFileArchive } from "../../../services/certification.service";
import { buildCertificationArchiveApiParams } from "../../../utils/certificationArchiveUtils";
import {
  buildCertificationReportFilters,
  defaultCertificationPeriodState,
  describeCertificationReportPeriodFull,
} from "../../../utils/certificationReportPeriodUtils";
import { formatCertificationDate } from "../../../utils/certificationUtils";
import { CARD_CLASS } from "../reports.constants";
import { fmt, sparkline, Skeleton } from "../reports.helpers";
import CertificationReportsCharts from "./CertificationReportsCharts";

const CertificationReportsPanel = ({
  period: periodProp = null,
  headerActions = null,
}) => {
  const period = useMemo(
    () => periodProp || defaultCertificationPeriodState(),
    [periodProp],
  );
  const [rows, setRows] = useState([]);
  const [kpis, setKpis] = useState({
    centers: 0,
    batches: 0,
    registered: 0,
    attended: 0,
    passed: 0,
  });
  const [loading, setLoading] = useState(true);

  const activeFilters = useMemo(
    () => buildCertificationReportFilters(period),
    [period],
  );

  const periodLabelFull = useMemo(
    () => describeCertificationReportPeriodFull(period),
    [period],
  );

  const loadData = useCallback(async (filters) => {
    setLoading(true);
    try {
      const response = await listCertificationFileArchive(
        buildCertificationArchiveApiParams(filters),
      );
      const data = response?.data || {};
      setRows(data.rows || []);
      setKpis({
        centers: Number(data.kpis?.centers) || 0,
        batches: Number(data.kpis?.batches) || 0,
        registered: Number(data.kpis?.registered) || 0,
        attended: Number(data.kpis?.attended) || 0,
        passed: Number(data.kpis?.passed) || 0,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load certification report",
      );
      setRows([]);
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
    loadData(activeFilters);
  }, [activeFilters, loadData]);

  const kpiCards = [
    { title: "Centers", value: kpis.centers },
    { title: "Batches", value: kpis.batches },
    { title: "Registered", value: kpis.registered },
    { title: "Attended", value: kpis.attended },
    { title: "Passed", value: kpis.passed },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Certification
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Assessment date · {periodLabelFull}
          </p>
        </div>
        {headerActions}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[16px] border border-[#A5A5A5] p-3 min-h-[120px]"
            >
              <Skeleton h="h-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
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

      <CertificationReportsCharts
        loading={loading}
        rows={rows}
        kpis={kpis}
        mode={period.mode}
        periodLabel={periodLabelFull}
      />

      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Certification requests
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
                <th className="px-4 py-2.5 font-medium">Partner</th>
                <th className="px-4 py-2.5 font-medium">Center</th>
                <th className="px-4 py-2.5 font-medium">Batch</th>
                <th className="px-4 py-2.5 font-medium">Assessment</th>
                <th className="px-4 py-2.5 font-medium">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-gray-500">
                      No certification requests
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      No archived results for {periodLabelFull}. Try another
                      report period.
                    </p>
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.upload_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-gray-800">
                      {row.partner_name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {row.center_name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {row.batch_number || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {formatCertificationDate(row.assessment_date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <TraineeResultsCell row={row} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default CertificationReportsPanel;
