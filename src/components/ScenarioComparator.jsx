import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, Copy, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { computeProjectKPIs } from '../utils/financialCalculations';

export default function ScenarioComparator({ projects, activeProjectId, onForkScenario }) {
  const [projectAId, setProjectAId] = useState(activeProjectId);
  const [projectBId, setProjectBId] = useState(() => {
    const other = projects.find(p => p.id !== activeProjectId);
    return other ? other.id : activeProjectId;
  });

  const projA = useMemo(() => projects.find(p => p.id === projectAId) || projects[0], [projects, projectAId]);
  const projB = useMemo(() => projects.find(p => p.id === projectBId) || projects[0], [projects, projectBId]);

  const kpisA = useMemo(() => computeProjectKPIs(projA), [projA]);
  const kpisB = useMemo(() => computeProjectKPIs(projB), [projB]);

  const formatILS = (val) => `₪${Math.round(val || 0).toLocaleString('he-IL')}`;

  const renderDelta = (valA, valB, isHigherBetter = true, isPercent = false, suffix = '') => {
    const delta = valB - valA;
    if (Math.abs(delta) < 0.001) {
      return <span className="text-[#71717a] font-mono text-xs">זהה (0{suffix})</span>;
    }

    const isGood = isHigherBetter ? delta > 0 : delta < 0;
    const color = isGood ? 'text-[#06b6d4]' : 'text-[#e11d48]';
    const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
    const prefix = delta > 0 ? '+' : '';

    const displayDelta = isPercent
      ? `${prefix}${delta.toFixed(1)}%`
      : `${prefix}${formatILS(delta)}${suffix}`;

    return (
      <span className={`flex items-center gap-0.5 font-mono text-xs font-bold ${color}`}>
        <Icon size={13} />
        {displayDelta}
      </span>
    );
  };

  const handleCreateStressedFork = () => {
    if (!onForkScenario) return;
    const stressed = {
      ...JSON.parse(JSON.stringify(projA)),
      id: `p_stress_${Date.now()}`,
      name: `${projA.name} [תרחיש סטרס ועיכוב]`,
      constructionMonths: (projA.constructionMonths ?? 24) + 6,
      financingPercent: (projA.financingPercent ?? 7) + 2.5,
      budgetData: (projA.budgetData || []).map(sec => ({
        ...sec,
        items: (sec.items || []).map(item => ({
          ...item,
          total: Math.round((item.total || 0) * 1.08)
        }))
      }))
    };
    onForkScenario(stressed);
    setProjectBId(stressed.id);
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded p-5 space-y-6 text-[#fafafa]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="text-[#f59e0b]" size={20} />
            <h3 className="text-lg font-bold tracking-tight text-[#fafafa]">
              השוואת תרחישים זה לצד זה (Scenario Forking & Live Diff)
            </h3>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            השוואת ביצועים פיננסיים, פערי תשואה ודלתא בחשיפת האשראי בין שתי חלופות
          </p>
        </div>

        <button
          onClick={handleCreateStressedFork}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] border border-[#3f3f46] transition-colors"
        >
          <Copy size={14} className="text-[#f59e0b]" />
          שכפל לתרחיש סטרס (עיכוב 6 חודשים + 8% עלויות)
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded space-y-1">
          <label className="text-[11px] text-[#38bdf8] font-bold">תרחיש בסיס (חלופה א׳):</label>
          <select
            value={projectAId}
            onChange={(e) => setProjectAId(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-sm text-[#fafafa]"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded space-y-1">
          <label className="text-[11px] text-[#f59e0b] font-bold">תרחיש השוואה (חלופה ב׳):</label>
          <select
            value={projectBId}
            onChange={(e) => setProjectBId(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-sm text-[#fafafa]"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto border border-[#27272a] rounded">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-[#09090b] border-b border-[#27272a] text-[#a1a1aa]">
              <th className="p-3 font-semibold">מדד כלכלי</th>
              <th className="p-3 font-semibold text-[#38bdf8]">{projA.name}</th>
              <th className="p-3 font-semibold text-[#f59e0b]">{projB.name}</th>
              <th className="p-3 font-semibold">פער (חלופה ב׳ מול א׳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a] font-mono">
            {/* Row: Profit */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa] font-bold">רווח יזמי נקי (ללא מע"מ)</td>
              <td className="p-3 text-[#06b6d4] font-bold">{formatILS(kpisA.profit)}</td>
              <td className="p-3 text-[#06b6d4] font-bold">{formatILS(kpisB.profit)}</td>
              <td className="p-3">{renderDelta(kpisA.profit, kpisB.profit, true)}</td>
            </tr>

            {/* Row: Profit % */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa]">רווחיות יזמית (%)</td>
              <td className="p-3 text-[#fafafa]">{kpisA.profitPct.toFixed(1)}%</td>
              <td className="p-3 text-[#fafafa]">{kpisB.profitPct.toFixed(1)}%</td>
              <td className="p-3">{renderDelta(kpisA.profitPct, kpisB.profitPct, true, true)}</td>
            </tr>

            {/* Row: IRR */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa] font-bold">תשואה פנימית (IRR שנתי)</td>
              <td className="p-3 text-[#38bdf8] font-bold">{kpisA.irr != null ? `${kpisA.irr.toFixed(1)}%` : 'N/A'}</td>
              <td className="p-3 text-[#38bdf8] font-bold">{kpisB.irr != null ? `${kpisB.irr.toFixed(1)}%` : 'N/A'}</td>
              <td className="p-3">
                {kpisA.irr != null && kpisB.irr != null
                  ? renderDelta(kpisA.irr, kpisB.irr, true, true)
                  : <span className="text-[#71717a]">N/A</span>}
              </td>
            </tr>

            {/* Row: ROE */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa]">תשואה שנתית על ההון (Annual ROE)</td>
              <td className="p-3 text-[#fafafa]">{kpisA.annualRoe.toFixed(1)}%</td>
              <td className="p-3 text-[#fafafa]">{kpisB.annualRoe.toFixed(1)}%</td>
              <td className="p-3">{renderDelta(kpisA.annualRoe, kpisB.annualRoe, true, true)}</td>
            </tr>

            {/* Row: Peak Debt */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa]">שיא חשיפת אשראי (Peak Debt)</td>
              <td className="p-3 text-[#e11d48]">{formatILS(kpisA.maxExposure)}</td>
              <td className="p-3 text-[#e11d48]">{formatILS(kpisB.maxExposure)}</td>
              <td className="p-3">{renderDelta(kpisA.maxExposure, kpisB.maxExposure, false)}</td>
            </tr>

            {/* Row: Total Cost */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa]">עלות פרויקט כוללת</td>
              <td className="p-3 text-[#fafafa]">{formatILS(kpisA.totalCost)}</td>
              <td className="p-3 text-[#fafafa]">{formatILS(kpisB.totalCost)}</td>
              <td className="p-3">{renderDelta(kpisA.totalCost, kpisB.totalCost, false)}</td>
            </tr>

            {/* Row: Financing */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa]">עלויות מימון וערבויות</td>
              <td className="p-3 text-[#f59e0b]">{formatILS(kpisA.financing)}</td>
              <td className="p-3 text-[#f59e0b]">{formatILS(kpisB.financing)}</td>
              <td className="p-3">{renderDelta(kpisA.financing, kpisB.financing, false)}</td>
            </tr>

            {/* Row: Construction Months */}
            <tr className="hover:bg-[#27272a40] transition-colors">
              <td className="p-3 font-heebo text-[#fafafa]">חודשי בנייה וביצוע</td>
              <td className="p-3 text-[#fafafa]">{projA.constructionMonths ?? 24} חודשים</td>
              <td className="p-3 text-[#fafafa]">{projB.constructionMonths ?? 24} חודשים</td>
              <td className="p-3">
                {renderDelta(projA.constructionMonths ?? 24, projB.constructionMonths ?? 24, false, false, ' חודשים')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
