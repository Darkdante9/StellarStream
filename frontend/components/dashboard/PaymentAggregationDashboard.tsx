"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

interface PaymentAggregationSummary {
  totalAmountUsd: string;
  transactionCount: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

interface PaymentAggregationPoint {
  label: string;
  count: number;
  totalAmountUsd: string;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

interface PaymentBreakdownItem {
  recipient?: string;
  asset?: string;
  status?: string;
  category?: string;
  region?: string;
  count: number;
  totalAmountUsd: string;
}

interface PaymentAggregationData {
  summary: PaymentAggregationSummary;
  timeSeries: PaymentAggregationPoint[];
  byRecipient: PaymentBreakdownItem[];
  byAsset: PaymentBreakdownItem[];
  byStatus: PaymentBreakdownItem[];
  byCategory: PaymentBreakdownItem[];
  byGeography: PaymentBreakdownItem[];
}

function formatUsd(amount: string) {
  const numeric = Number(amount || 0);
  if (Number.isNaN(numeric)) return "$0";
  if (numeric >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(2)}M`;
  if (numeric >= 1_000) return `$${(numeric / 1_000).toFixed(1)}K`;
  return `$${numeric.toFixed(2)}`;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-white/50">{title}</h3>
      {children}
    </div>
  );
}

export function PaymentAggregationDashboard() {
  const [data, setData] = useState<PaymentAggregationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"day" | "week" | "month">("month");
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    let isMounted = true;
    const loadData = () => {
      setLoading(true);
      fetch(`/api/v1/analytics/payment-aggregations?range=${range}`)
        .then((response) => response.json())
        .then((json) => {
          if (isMounted) {
            setData(json.data);
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setData(null);
            setLoading(false);
          }
        });
    };

    loadData();
    const intervalId = window.setInterval(loadData, 30_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [range]);

  const handleExport = () => {
    if (!data) return;

    const rows = [
      ["section", "label", "value", "count"],
      ["summary", "total_amount_usd", data.summary.totalAmountUsd, data.summary.transactionCount.toString()],
      ["summary", "transaction_count", data.summary.transactionCount.toString(), ""],
      ["summary", "completed_count", data.summary.completedCount.toString(), ""],
      ["summary", "pending_count", data.summary.pendingCount.toString(), ""],
      ["summary", "failed_count", data.summary.failedCount.toString(), ""],
      ...data.timeSeries.map((item) => ["time_series", item.label, item.totalAmountUsd, item.count.toString()]),
      ...data.byRecipient.map((item) => ["recipient", item.recipient ?? "", item.totalAmountUsd, item.count.toString()]),
      ...data.byAsset.map((item) => ["asset", item.asset ?? "", item.totalAmountUsd, item.count.toString()]),
      ...data.byStatus.map((item) => ["status", item.status ?? "", item.totalAmountUsd, item.count.toString()]),
      ...data.byCategory.map((item) => ["category", item.category ?? "", item.totalAmountUsd, item.count.toString()]),
      ...data.byGeography.map((item) => ["geography", item.region ?? "", item.totalAmountUsd, item.count.toString()]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-aggregations-${range}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const summaryItems = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { label: "Total value", value: formatUsd(data.summary.totalAmountUsd) },
      { label: "Transactions", value: data.summary.transactionCount.toString() },
      { label: "Completed", value: data.summary.completedCount.toString() },
      { label: "Pending", value: data.summary.pendingCount.toString() },
      { label: "Failed", value: data.summary.failedCount.toString() },
    ];
  }, [data]);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/60">Loading payment aggregates…</div>;
  }

  if (!data) {
    return <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-6 text-sm text-red-400/70">Unable to load payment aggregates.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Payment Analytics</p>
          <h2 className="text-2xl font-semibold text-white">Aggregated payment view</h2>
          <p className="mt-1 text-xs text-white/40">Live updates every 30 seconds • Last refreshed {lastUpdated}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["day", "week", "month"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setRange(option)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${range === option ? "bg-cyan-500/20 text-cyan-300" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"}`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
          <button
            onClick={handleExport}
            className="rounded-full bg-white/[0.08] px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/[0.14]"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Time series">
          <div className="space-y-2">
            {data.timeSeries.map((point) => (
              <div key={point.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/[0.12] px-3 py-2">
                <span className="text-sm text-white/70">{point.label}</span>
                <div className="text-right text-sm text-white/80">
                  <div>{formatUsd(point.totalAmountUsd)}</div>
                  <div className="text-xs text-white/45">{point.count} tx • {point.completedCount} completed</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="By recipient">
          <div className="space-y-2">
            {data.byRecipient.map((entry) => (
              <div key={entry.recipient} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/[0.12] px-3 py-2">
                <span className="truncate text-sm text-white/70">{entry.recipient}</span>
                <span className="text-sm text-white/80">{formatUsd(entry.totalAmountUsd)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="By asset">
          <div className="space-y-2">
            {data.byAsset.map((entry) => (
              <div key={entry.asset} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/[0.12] px-3 py-2">
                <span className="text-sm text-white/70">{entry.asset}</span>
                <span className="text-sm text-white/80">{formatUsd(entry.totalAmountUsd)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="By status">
          <div className="space-y-2">
            {data.byStatus.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/[0.12] px-3 py-2">
                <span className="text-sm text-white/70">{entry.status}</span>
                <span className="text-sm text-white/80">{entry.count} • {formatUsd(entry.totalAmountUsd)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="By category">
          <div className="space-y-2">
            {data.byCategory.map((entry) => (
              <div key={entry.category} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/[0.12] px-3 py-2">
                <span className="text-sm text-white/70">{entry.category}</span>
                <span className="text-sm text-white/80">{formatUsd(entry.totalAmountUsd)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Geographic distribution">
          <div className="space-y-2">
            {data.byGeography.map((entry) => (
              <div key={entry.region} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/[0.12] px-3 py-2">
                <span className="text-sm text-white/70">{entry.region}</span>
                <span className="text-sm text-white/80">{entry.count} • {formatUsd(entry.totalAmountUsd)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
