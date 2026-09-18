import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ShieldCheck, TrendingUp, Zap, HelpCircle, RefreshCw } from 'lucide-react';
import { runMonteCarlo } from '../utils/monteCarloEngine';

const PRESETS = {
  calm: { label: 'שוק יציב (1Y)', costVol: 5, revVol: 7, interestVol: 1.0 },
  normal: { label: 'שוק ממוצע (5Y)', costVol: 8, revVol: 12, interestVol: 2.0 },
  crisis: { label: 'תרחיש משבר ואינפלציה', costVol: 16, revVol: 18, interestVol: 3.5 }
};

export default function MonteCarloFanChart({ project }) {
  const [iterations, setIterations] = useState(1000);
  const [costVol, setCostVol] = useState(8);
  const [revVol, setRevVol] = useState(12);
  const [interestVol, setInterestVol] = useState(2.0);
  const [selectedPreset, setSelectedPreset] = useState('normal');
  const [hoveredBin, setHoveredBin] = useState(null);

  // Run simulation
  const simulation = useMemo(() => {
    return runMonteCarlo(project, {
      iterations,
      costVol,
      revVol,
      interestVol
    });
  }, [project, iterations, costVol, revVol, interestVol]);

  const { stats, bins } = simulation;

  const applyPreset = (key) => {
    setSelectedPreset(key);
    const p = PRESETS[key];
    if (p) {
      setCostVol(p.costVol);
      setRevVol(p.revVol);
      setInterestVol(p.interestVol);
    }
  };

  const formatILS = (val) => `₪${Math.round(val || 0).toLocaleString('he-IL')}`;

  // Chart Dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 45, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minX = stats.minProfit;
  const maxX = stats.maxProfit;
  const rangeX = maxX - minX || 1;

  const getX = (val) => padding.left + ((val - minX) / rangeX) * chartW;
  const getY = (density) => padding.top + chartH - (density * chartH);

  // Zero-profit coordinate (Break-even line)
  const zeroX = getX(0);

  // Smooth path for density envelope
  const densityPoints = bins.map((b, i) => {
    const x = getX(b.mid);
    const y = getY(b.density);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded p-5 space-y-6 text-[#fafafa]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-[#06b6d4]" size={20} />
            <h3 className="text-lg font-bold tracking-tight text-[#fafafa]">
              מניפת סיכונים והתפלגות רווח (Monte Carlo Fan Chart)
            </h3>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            הדמיה סטוכסטית של {iterations.toLocaleString()} תרחישים לבחינת רגישות לשינויי עלויות, מחירי דיור וריבית
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 bg-[#09090b] p-1 rounded border border-[#27272a]">
          {Object.entries(PRESETS).map(([key, item]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                selectedPreset === key
                  ? 'bg-[#27272a] text-[#fafafa] font-bold'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="flex items-center justify-between text-[11px] text-[#a1a1aa]">
            <span>הסתברות להפסד (P-Loss)</span>
            <AlertTriangle size={13} className={stats.probLoss > 5 ? 'text-[#e11d48]' : 'text-[#06b6d4]'} />
          </div>
          <div className={`text-xl font-mono font-bold mt-1 ${stats.probLoss > 5 ? 'text-[#e11d48]' : 'text-[#06b6d4]'}`}>
            {stats.probLoss.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5">
            {stats.probLoss === 0 ? 'פרויקט מוגן לחלוטין' : `${Math.round(iterations * stats.probLoss / 100)} תרחישי הפסד מתוך ${iterations}`}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">תרחיש פסימי (P5 - Worst 5%)</div>
          <div className={`text-xl font-mono font-bold mt-1 ${stats.p5 >= 0 ? 'text-[#f59e0b]' : 'text-[#e11d48]'}`}>
            {formatILS(stats.p5)}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5 font-mono">
            VaR 95%: {formatILS(stats.valueAtRisk95)}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">חציון רווח צפוי (P50)</div>
          <div className="text-xl font-mono font-bold text-[#06b6d4] mt-1">
            {formatILS(stats.p50)}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5 font-mono">
            IRR חציוני: {stats.medianIrr.toFixed(1)}%
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">תרחיש אופטימי (P95 - Top 5%)</div>
          <div className="text-xl font-mono font-bold text-[#38bdf8] mt-1">
            {formatILS(stats.p95)}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5 font-mono">
            תוחלת רווח: {formatILS(stats.meanProfit)}
          </div>
        </div>
      </div>

      {/* SVG Distribution Chart */}
      <div className="bg-[#09090b] border border-[#27272a] rounded p-3 relative overflow-hidden">
        {/* Chart Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs mb-2 px-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#e11d48] opacity-70 rounded-xs"></span>
              <span className="text-[#a1a1aa]">טווח הפסד (Profit &lt; 0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#06b6d4] opacity-70 rounded-xs"></span>
              <span className="text-[#a1a1aa]">טווח רווח</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#38bdf8]"></span>
              <span className="text-[#a1a1aa]">צפיפות הסתברות (PDF)</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-[#a1a1aa]">
            טווח רווח: {formatILS(stats.minProfit)} עד {formatILS(stats.maxProfit)}
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[650px] select-none">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + chartH * (1 - ratio);
              return (
                <line
                  key={i}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#27272a"
                  strokeDasharray="2 2"
                />
              );
            })}

            {/* Bars */}
            {bins.map((b, i) => {
              const barX = getX(b.x0);
              const barW = Math.max(1, (chartW / bins.length) - 1.5);
              const barH = b.density * chartH;
              const barY = padding.top + chartH - barH;
              const fillColor = b.isLoss ? '#e11d48' : '#06b6d4';

              return (
                <g key={i}>
                  <rect
                    x={barX}
                    y={barY}
                    width={barW}
                    height={barH}
                    fill={fillColor}
                    opacity={hoveredBin === i ? 0.9 : 0.65}
                    rx="1"
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredBin(i)}
                    onMouseLeave={() => setHoveredBin(null)}
                  />
                </g>
              );
            })}

            {/* Density Curve Line */}
            <path
              d={densityPoints}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
            />

            {/* Zero Line (Break-even boundary) */}
            {zeroX >= padding.left && zeroX <= width - padding.right && (
              <g>
                <line
                  x1={zeroX}
                  y1={padding.top}
                  x2={zeroX}
                  y2={padding.top + chartH}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={zeroX}
                  y={padding.top - 8}
                  fill="#fafafa"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  איפוס (₪0)
                </text>
              </g>
            )}

            {/* P5 Marker */}
            {getX(stats.p5) >= padding.left && (
              <g>
                <line
                  x1={getX(stats.p5)}
                  y1={padding.top + 10}
                  x2={getX(stats.p5)}
                  y2={padding.top + chartH}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x={getX(stats.p5)}
                  y={padding.top + chartH + 30}
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  P5 ({formatILS(stats.p5)})
                </text>
              </g>
            )}

            {/* P50 Marker */}
            {getX(stats.p50) <= width - padding.right && (
              <g>
                <line
                  x1={getX(stats.p50)}
                  y1={padding.top}
                  x2={getX(stats.p50)}
                  y2={padding.top + chartH}
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <text
                  x={getX(stats.p50)}
                  y={padding.top - 8}
                  fill="#06b6d4"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  חציון P50
                </text>
              </g>
            )}

            {/* P95 Marker */}
            {getX(stats.p95) <= width - padding.right && (
              <g>
                <line
                  x1={getX(stats.p95)}
                  y1={padding.top + 10}
                  x2={getX(stats.p95)}
                  y2={padding.top + chartH}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x={getX(stats.p95)}
                  y={padding.top + chartH + 30}
                  fill="#38bdf8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  P95 ({formatILS(stats.p95)})
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Hovered Bin Details */}
        {hoveredBin !== null && bins[hoveredBin] && (
          <div className="absolute top-4 left-4 bg-[#18181b] border border-[#3f3f46] p-2.5 rounded shadow-xl text-xs font-mono z-10">
            <div className="text-[#fafafa] font-bold">
              טווח: {formatILS(bins[hoveredBin].x0)} - {formatILS(bins[hoveredBin].x1)}
            </div>
            <div className="text-[#a1a1aa] mt-1">
              כמות איטרציות: {bins[hoveredBin].count} ({bins[hoveredBin].pct.toFixed(1)}%)
            </div>
          </div>
        )}
      </div>

      {/* Volatility Sliders & Stress Console */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#09090b] border border-[#27272a] p-4 rounded">
        {/* Cost Volatility */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa]">תנודתיות עלויות בנייה (Cost Vol):</span>
            <span className="font-mono font-bold text-[#f59e0b]">±{costVol}%</span>
          </div>
          <input
            type="range"
            min="2"
            max="25"
            step="1"
            value={costVol}
            onChange={(e) => {
              setCostVol(Number(e.target.value));
              setSelectedPreset('custom');
            }}
            className="w-full accent-[#f59e0b] cursor-pointer"
          />
          <div className="text-[10px] text-[#71717a]">
            רגישות לחומרי גלם, עבודה והתייקרויות קבלניות
          </div>
        </div>

        {/* Revenue Volatility */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa]">תנודתיות מחירי מכירה (Revenue Vol):</span>
            <span className="font-mono font-bold text-[#06b6d4]">±{revVol}%</span>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            step="1"
            value={revVol}
            onChange={(e) => {
              setRevVol(Number(e.target.value));
              setSelectedPreset('custom');
            }}
            className="w-full accent-[#06b6d4] cursor-pointer"
          />
          <div className="text-[10px] text-[#71717a]">
            רגישות למחירי שוק הדיור וקצב סגירת עסקאות
          </div>
        </div>

        {/* Interest Rate Volatility */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa]">תנודתיות ריבית ליווי (Interest Shift):</span>
            <span className="font-mono font-bold text-[#e11d48]">±{interestVol}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="6"
            step="0.5"
            value={interestVol}
            onChange={(e) => {
              setInterestVol(Number(e.target.value));
              setSelectedPreset('custom');
            }}
            className="w-full accent-[#e11d48] cursor-pointer"
          />
          <div className="text-[10px] text-[#71717a]">
            רגישות לשינויי ריבית בנק ישראל ומרווחי מימון
          </div>
        </div>
      </div>
    </div>
  );
}
