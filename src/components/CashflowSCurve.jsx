import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, DollarSign, TrendingDown, Clock, ShieldAlert, ArrowRight, RefreshCw, Sliders } from 'lucide-react';
import { computeProjectKPIs } from '../utils/financialCalculations';

export default function CashflowSCurve({ project, onApplyChanges }) {
  // Interactive Simulation Controls
  const [presaleStartMonth, setPresaleStartMonth] = useState(1);
  const [p2080Percent, setP2080Percent] = useState(project.p2080Percent ?? 50);
  const [constructionMonths, setConstructionMonths] = useState(project.constructionMonths ?? 24);
  const [financingPercent, setFinancingPercent] = useState(project.financingPercent ?? 7);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);

  // Recompute KPIs with dynamic parameters in 0ms
  const simKPIs = useMemo(() => {
    return computeProjectKPIs(project, {
      presaleStartMonth,
      p2080Percent,
      constructionMonths,
      financingPercent
    });
  }, [project, presaleStartMonth, p2080Percent, constructionMonths, financingPercent]);

  // Baseline KPIs for comparison
  const baseKPIs = useMemo(() => {
    return computeProjectKPIs(project);
  }, [project]);

  const deltaProfit = simKPIs.profit - baseKPIs.profit;
  const deltaFinancing = simKPIs.financing - baseKPIs.financing;
  const deltaMaxExposure = simKPIs.maxExposure - baseKPIs.maxExposure;

  // Chart Dimensions
  const width = 800;
  const height = 320;
  const padding = { top: 30, right: 30, bottom: 40, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const totalPoints = simKPIs.equityExposure.length;
  const maxExpVal = Math.max(1, simKPIs.maxExposure * 1.15, ...simKPIs.cumCosts);

  // SVG Coordinates Helpers
  const getX = (index) => padding.left + (index / (totalPoints - 1 || 1)) * chartW;
  const getY = (val) => padding.top + chartH - (Math.max(0, val) / maxExpVal) * chartH;

  // Generate Path Strings
  const exposurePoints = simKPIs.equityExposure.map((val, i) => `${getX(i)},${getY(val)}`);
  const exposureAreaPath = `M ${getX(0)},${getY(0)} ` + 
    simKPIs.equityExposure.map((val, i) => `L ${getX(i)},${getY(val)}`).join(' ') + 
    ` L ${getX(totalPoints - 1)},${getY(0)} Z`;

  const costLinePath = simKPIs.cumCosts.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(val)}`).join(' ');
  const revLinePath = simKPIs.cumRevs.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(val)}`).join(' ');

  // Peak exposure index
  const peakIndex = simKPIs.equityExposure.indexOf(simKPIs.maxExposure);

  const formatILS = (val) => `₪${Math.round(val || 0).toLocaleString('he-IL')}`;

  const resetToBaseline = () => {
    setPresaleStartMonth(1);
    setP2080Percent(project.p2080Percent ?? 50);
    setConstructionMonths(project.constructionMonths ?? 24);
    setFinancingPercent(project.financingPercent ?? 7);
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded p-5 space-y-6 text-[#fafafa]">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
            <h3 className="text-lg font-bold tracking-tight text-[#fafafa]">
              סימולטור עקומת תזרים וחשיפת אשראי (S-Curve & Debt Exposure)
            </h3>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            הזז את צירי הזמן והפרמטרים לבחינה חיה של "בור האשראי", עלויות המימון וההשפעה על ה-IRR
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetToBaseline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] transition-colors"
          >
            <RefreshCw size={14} />
            איפוס לבסיס
          </button>
          {onApplyChanges && (
            <button
              onClick={() => onApplyChanges({
                p2080Percent,
                constructionMonths,
                financingPercent
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#09090b] transition-colors"
            >
              החל שינויים בפרויקט
            </button>
          )}
        </div>
      </div>

      {/* Real-time Impact KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">שיא חשיפת אשראי (Peak Debt)</div>
          <div className="text-lg font-mono font-bold text-[#e11d48] mt-1">
            {formatILS(simKPIs.maxExposure)}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${deltaMaxExposure > 0 ? 'text-[#e11d48]' : 'text-[#10b981]'}`}>
            {deltaMaxExposure !== 0 && (deltaMaxExposure > 0 ? `+${formatILS(deltaMaxExposure)} חשיפה` : `${formatILS(deltaMaxExposure)} שיפור`)}
            {deltaMaxExposure === 0 && 'זהה לבסיס'}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">עלויות מימון וערבויות</div>
          <div className="text-lg font-mono font-bold text-[#f59e0b] mt-1">
            {formatILS(simKPIs.financing)}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${deltaFinancing > 0 ? 'text-[#e11d48]' : 'text-[#10b981]'}`}>
            {deltaFinancing !== 0 && (deltaFinancing > 0 ? `+${formatILS(deltaFinancing)} נטל ריבית` : `${formatILS(deltaFinancing)} חיסכון`)}
            {deltaFinancing === 0 && 'זהה לבסיס'}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">תשואה פנימית (IRR שנתי)</div>
          <div className="text-lg font-mono font-bold text-[#10b981] mt-1">
            {simKPIs.irr != null ? `${simKPIs.irr.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-[10px] font-mono text-[#a1a1aa] mt-0.5">
            בסיס: {baseKPIs.irr != null ? `${baseKPIs.irr.toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">רווח יזמי נקי</div>
          <div className={`text-lg font-mono font-bold mt-1 ${simKPIs.profit >= 0 ? 'text-[#10b981]' : 'text-[#e11d48]'}`}>
            {formatILS(simKPIs.profit)}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${deltaProfit >= 0 ? 'text-[#10b981]' : 'text-[#e11d48]'}`}>
            {deltaProfit !== 0 && (deltaProfit > 0 ? `+${formatILS(deltaProfit)}` : `${formatILS(deltaProfit)}`)}
            {deltaProfit === 0 && 'ללא שינוי'}
          </div>
        </div>
      </div>

      {/* Main SVG Graph */}
      <div className="bg-[#09090b] border border-[#27272a] rounded p-3 relative overflow-hidden">
        {/* Graph Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs mb-2 px-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-[#e11d48] opacity-30 border border-[#e11d48] rounded-sm"></span>
              <span className="text-[#fafafa] font-medium">בור חשיפת הון / אשראי</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#f59e0b]"></span>
              <span className="text-[#a1a1aa]">הוצאות מצטברות</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#10b981]"></span>
              <span className="text-[#a1a1aa]">תקבולים מצטברים</span>
            </span>
          </div>

          {peakIndex >= 0 && (
            <div className="text-[11px] font-mono text-[#e11d48] bg-[#e11d4815] px-2 py-0.5 rounded border border-[#e11d4840]">
              שיא חשיפה בחודש {peakIndex}: {formatILS(simKPIs.maxExposure)}
            </div>
          )}
        </div>

        {/* SVG Canvas */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[650px] select-none"
          >
            <defs>
              <linearGradient id="exposureGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d48" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + chartH * (1 - ratio);
              const val = maxExpVal * ratio;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#27272a"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 4}
                    fill="#71717a"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    ₪{(val / 1000000).toFixed(1)}M
                  </text>
                </g>
              );
            })}

            {/* X Axis Months */}
            {Array.from({ length: totalPoints }).map((_, i) => {
              if (i % 4 !== 0 && i !== totalPoints - 1) return null;
              const x = getX(i);
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={padding.top + chartH}
                    x2={x}
                    y2={padding.top + chartH + 5}
                    stroke="#52525b"
                  />
                  <text
                    x={x}
                    y={padding.top + chartH + 18}
                    fill="#a1a1aa"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    ח׳ {i}
                  </text>
                </g>
              );
            })}

            {/* Area & Lines */}
            <path d={exposureAreaPath} fill="url(#exposureGradient)" />
            <path d={costLinePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
            <path d={revLinePath} fill="none" stroke="#10b981" strokeWidth="2" />
            <path
              d={simKPIs.equityExposure.map((val, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(val)}`).join(' ')}
              fill="none"
              stroke="#e11d48"
              strokeWidth="2.5"
            />

            {/* Pre-sale Marker */}
            {presaleStartMonth < totalPoints && (
              <g>
                <line
                  x1={getX(presaleStartMonth)}
                  y1={padding.top}
                  x2={getX(presaleStartMonth)}
                  y2={padding.top + chartH}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <text
                  x={getX(presaleStartMonth)}
                  y={padding.top - 6}
                  fill="#38bdf8"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  תחילת שיווק (ח׳ {presaleStartMonth})
                </text>
              </g>
            )}

            {/* Peak Debt Point */}
            {peakIndex >= 0 && (
              <circle
                cx={getX(peakIndex)}
                cy={getY(simKPIs.maxExposure)}
                r="5"
                fill="#e11d48"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}

            {/* Interactive hover overlay */}
            {Array.from({ length: totalPoints }).map((_, i) => {
              const x = getX(i);
              const barW = chartW / totalPoints;
              return (
                <rect
                  key={i}
                  x={x - barW / 2}
                  y={padding.top}
                  width={barW}
                  height={chartH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredMonthIndex(i)}
                  onMouseLeave={() => setHoveredMonthIndex(null)}
                />
              );
            })}

            {/* Hover Guide Line */}
            {hoveredMonthIndex != null && (
              <g>
                <line
                  x1={getX(hoveredMonthIndex)}
                  y1={padding.top}
                  x2={getX(hoveredMonthIndex)}
                  y2={padding.top + chartH}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={getX(hoveredMonthIndex)}
                  cy={getY(simKPIs.equityExposure[hoveredMonthIndex])}
                  r="4"
                  fill="#fafafa"
                  stroke="#e11d48"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Hover Info Tooltip */}
        {hoveredMonthIndex != null && (
          <div className="absolute top-4 left-4 bg-[#18181b] border border-[#3f3f46] p-2.5 rounded shadow-xl text-xs font-mono z-10 space-y-1">
            <div className="font-bold text-[#fafafa] border-b border-[#27272a] pb-1">
              חודש {hoveredMonthIndex}
            </div>
            <div className="flex justify-between gap-4 text-[#e11d48]">
              <span>חשיפת אשראי:</span>
              <span>{formatILS(simKPIs.equityExposure[hoveredMonthIndex])}</span>
            </div>
            <div className="flex justify-between gap-4 text-[#f59e0b]">
              <span>הוצאה מצטברת:</span>
              <span>{formatILS(simKPIs.cumCosts[hoveredMonthIndex])}</span>
            </div>
            <div className="flex justify-between gap-4 text-[#10b981]">
              <span>תקבול מצטבר:</span>
              <span>{formatILS(simKPIs.cumRevs[hoveredMonthIndex])}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Sliders Console */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#09090b] border border-[#27272a] p-4 rounded">
        {/* Slider 1: Presale Month */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa] flex items-center gap-1.5">
              <Calendar size={13} className="text-[#38bdf8]" />
              מועד תחילת מכירות (Pre-sale):
            </span>
            <span className="font-mono font-bold text-[#38bdf8]">
              חודש {presaleStartMonth}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max={Math.min(18, constructionMonths - 2)}
            step="1"
            value={presaleStartMonth}
            onChange={(e) => setPresaleStartMonth(Number(e.target.value))}
            className="w-full accent-[#38bdf8] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#71717a]">
            <span>הקדמה (חודש 1)</span>
            <span>דחייה עד חודש {Math.min(18, constructionMonths - 2)}</span>
          </div>
        </div>

        {/* Slider 2: 20/80 Proportion */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa] flex items-center gap-1.5">
              <DollarSign size={13} className="text-[#10b981]" />
              חלק מכירות במבצע 20/80 (דחיית תשלום למסירה):
            </span>
            <span className="font-mono font-bold text-[#10b981]">
              {p2080Percent}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={p2080Percent}
            onChange={(e) => setP2080Percent(Number(e.target.value))}
            className="w-full accent-[#10b981] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#71717a]">
            <span>0% (תשלומים שוטפים)</span>
            <span>100% (כולם 20/80)</span>
          </div>
        </div>

        {/* Slider 3: Construction Duration */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa] flex items-center gap-1.5">
              <Clock size={13} className="text-[#f59e0b]" />
              משך ביצוע ובנייה:
            </span>
            <span className="font-mono font-bold text-[#f59e0b]">
              {constructionMonths} חודשים
            </span>
          </div>
          <input
            type="range"
            min="12"
            max="48"
            step="1"
            value={constructionMonths}
            onChange={(e) => setConstructionMonths(Number(e.target.value))}
            className="w-full accent-[#f59e0b] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#71717a]">
            <span>בנייה מואצת (12 ח׳)</span>
            <span>עיכוב מתמשך (48 ח׳)</span>
          </div>
        </div>

        {/* Slider 4: Financing Rate */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#a1a1aa] flex items-center gap-1.5">
              <ShieldAlert size={13} className="text-[#e11d48]" />
              ריבית ועמלות מימון ליווי:
            </span>
            <span className="font-mono font-bold text-[#e11d48]">
              {financingPercent}%
            </span>
          </div>
          <input
            type="range"
            min="3"
            max="15"
            step="0.5"
            value={financingPercent}
            onChange={(e) => setFinancingPercent(Number(e.target.value))}
            className="w-full accent-[#e11d48] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#71717a]">
            <span>ריבית שפל (3%)</span>
            <span>ריבית סטרס (15%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
