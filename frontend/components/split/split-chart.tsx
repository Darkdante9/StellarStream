"use client";

import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { motion } from "framer-motion";

interface Recipient {
  id: string;
  address: string;
  amount?: string;
  share: number;
  label?: string;
}

interface SplitChartProps {
  recipients: Recipient[];
  animated?: boolean;
  className?: string;
}

const NEBULA_COLORS = [
  { id: "split-cyan", colors: ["#00f5ff", "#00d4e6"] },
  { id: "split-violet", colors: ["#8a00ff", "#b84dff"] },
  { id: "split-pink", colors: ["#ff3b5c", "#ff6b88"] },
  { id: "split-amber", colors: ["#ffb300", "#ffd54f"] },
  { id: "split-emerald", colors: ["#00e676", "#69f0ae"] },
  { id: "split-blue", colors: ["#448aff", "#82b1ff"] },
  { id: "split-orange", colors: ["#ff6d00", "#ffab40"] },
  { id: "split-teal", colors: ["#1de9b6", "#64ffda"] },
];

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function SplitChart({ recipients, animated = true, className = "" }: SplitChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalShare = useMemo(
    () => recipients.reduce((sum, r) => sum + (r.share || 0), 0),
    [recipients]
  );

  const chartData = useMemo(
    () =>
      recipients.map((r, i) => ({
        name: r.label || truncateAddress(r.address),
        address: r.address,
        share: r.share || 0,
        percentage: totalShare > 0 ? ((r.share / totalShare) * 100) : 0,
        color: NEBULA_COLORS[i % NEBULA_COLORS.length],
      })),
    [recipients, totalShare]
  );

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: "drop-shadow(0 0 12px rgba(0, 245, 255, 0.5))" }}
        />
      </g>
    );
  };

  const activeItem = activeIndex !== null ? chartData[activeIndex] : null;

  if (recipients.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 ${className}`}>
        <p className="text-sm text-white/40">No recipients to chart</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.95 } : undefined}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={animated ? { duration: 0.5, ease: "easeOut" } : undefined}
      className={className}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {NEBULA_COLORS.map((g) => (
            <linearGradient key={g.id} id={g.id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={g.colors[0]} stopOpacity={0.85} />
              <stop offset="100%" stopColor={g.colors[1]} stopOpacity={0.6} />
            </linearGradient>
          ))}
        </defs>
      </svg>

      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="share"
              isAnimationActive={animated}
              animationDuration={800}
              animationEasing="ease-out"
              onMouseEnter={(_: any, index: number) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              activeShape={renderActiveShape}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#${entry.color.id})`}
                  style={{
                    filter: "drop-shadow(0 0 6px rgba(0, 245, 255, 0.2))",
                    opacity: activeIndex === null || activeIndex === index ? 1 : 0.4,
                    transition: "opacity 0.3s ease",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              {activeItem ? activeItem.name : "Total"}
            </p>
            <p className="font-mono text-2xl font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(0,245,255,0.3)]">
              {activeItem ? `${activeItem.percentage.toFixed(1)}%` : `${totalShare.toFixed(1)}%`}
            </p>
            {activeItem && (
              <p className="mt-1 font-mono text-[11px] text-white/50">{truncateAddress(activeItem.address)}</p>
            )}
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap justify-center gap-2"
        role="list"
        aria-label="Recipient distribution"
      >
        {chartData.map((item, index) => (
          <button
            key={item.address}
            role="listitem"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all ${
              activeIndex === index
                ? "border-cyan-400/40 bg-cyan-400/10"
                : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, ${item.color.colors[0]}, ${item.color.colors[1]})`,
              }}
            />
            <span className="text-white/80">{item.name}</span>
            <span className="font-mono text-white/40">{item.percentage.toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
