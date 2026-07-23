"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { StreamData } from "@/components/view-stream-client";

interface FlowRateGaugeProps {
  stream: StreamData;
}

/**
 * Flow Rate Gauge — animated SVG semi-circle gauge showing stream flow rate
 * with color shift based on rate intensity. Moon-theme aesthetic.
 */
export function FlowRateGauge({ stream }: FlowRateGaugeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [animatedVal, setAnimatedVal] = useState(0);

  const isActive = stream.status === "active";
  const ratePerDay = stream.ratePerSecond * 86400;

  // Normalize rate to 0-1 for gauge — realistic max ~1000/day
  const normalizedRate = Math.min(ratePerDay / 500, 1);
  const gaugeAngle = normalizedRate * 180; // 0-180 degrees

  // Gauge color based on rate intensity
  const hue = 180 - normalizedRate * 60; // 180 (cyan) → 120 (green)
  const gaugeColor = `hsl(${hue}, 80%, 55%)`;

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setAnimatedVal(normalizedRate), 100);
      return () => clearTimeout(timer);
    }
  }, [isInView, normalizedRate]);

  // SVG arc path calculation
  const radius = 80;
  const strokeWidth = 12;
  const center = radius + strokeWidth;
  const size = center * 2;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number,
  ) => {
    const rad = ((angleDeg - 180) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ");
  };

  const bgArc = describeArc(center, center, radius, 0, 180);
  const valueArc = describeArc(center, center, radius, 0, animatedVal * 180);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="font-body text-[10px] uppercase tracking-widest text-white/35">
          Flow Rate
        </p>
        {isActive && (
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
        )}
      </div>

      {/* SVG Gauge */}
      <div className="flex justify-center">
        <svg width={size} height={size * 0.55} viewBox={`0 0 ${size} ${size * 0.55}`}>
          {/* Background arc */}
          <path
            d={bgArc}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.path
            d={valueArc}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: animatedVal }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 6px ${gaugeColor})`,
            }}
          />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const angle = tick * 180;
            const inner = polarToCartesian(center, center, radius - 14, angle);
            const outer = polarToCartesian(center, center, radius - 6, angle);
            return (
              <line
                key={tick}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>

      {/* Rate value display */}
      <div className="mt-1 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <p className="font-ticker text-2xl font-bold text-white">
            {ratePerDay.toFixed(2)}
          </p>
          <p className="font-body text-[11px] text-white/40">
            {stream.token}/day
          </p>
        </motion.div>
        <p className="mt-1 font-body text-[10px] text-white/25">
          {stream.ratePerSecond.toFixed(6)} {stream.token}/sec
        </p>
      </div>
    </motion.div>
  );
}