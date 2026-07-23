"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

const TREASURY_DATA = [
  { name: "Development", value: 4500000 },
  { name: "Community Grants", value: 2800000 },
  { name: "Liquidity", value: 1500000 },
  { name: "Operations", value: 1200000 },
];

const MONTHLY_SPEND = [
  { month: "Jan", amount: 120000 },
  { month: "Feb", amount: 180000 },
  { month: "Mar", amount: 150000 },
  { month: "Apr", amount: 250000 },
  { month: "May", amount: 190000 },
  { month: "Jun", amount: 210000 },
];

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

function formatCurrency(val: number) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${val}`;
}

export function TreasuryStats() {
  const [activeTab, setActiveTab] = useState<"allocation" | "spend">("allocation");

  const totalValue = TREASURY_DATA.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-heading text-2xl text-white">Treasury Stats</h2>
          <p className="text-sm text-white/50 mt-1">Real-time overview of DAO funds</p>
        </div>
        <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("allocation")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "allocation"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            Allocation
          </button>
          <button
            onClick={() => setActiveTab("spend")}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "spend"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/80"
            }`}
          >
            Monthly Spend
          </button>
        </div>
      </div>

      <div className="h-[250px] w-full">
        {activeTab === "allocation" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={TREASURY_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {TREASURY_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                itemStyle={{ color: "#fff" }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Amount",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_SPEND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                contentStyle={{
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
              />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {activeTab === "allocation" && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TREASURY_DATA.map((item, i) => (
            <div key={item.name} className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-[10px] uppercase tracking-wider text-white/50">{item.name}</span>
              </div>
              <span className="font-heading text-sm text-white">
                {((item.value / totalValue) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}