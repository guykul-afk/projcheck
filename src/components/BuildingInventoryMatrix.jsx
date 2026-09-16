import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Layers, Eye, Edit3, Check, X, Tag, DollarSign, Home } from 'lucide-react';
import { computeInventoryStats } from '../utils/financialCalculations';

export default function BuildingInventoryMatrix({ project, onUpdateInventory }) {
  const inventory = project.inventoryData || [];
  const [heatmapMode, setHeatmapMode] = useState('ownership'); // 'ownership' | 'priceSqm' | 'category'
  const [selectedAptId, setSelectedAptId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const stats = useMemo(() => {
    return computeInventoryStats(inventory, project);
  }, [inventory, project]);

  // Group units by floor, descending order (top floors at top)
  const floorGroups = useMemo(() => {
    const groups = {};
    inventory.forEach((apt) => {
      const f = apt.floor ?? 1;
      if (!groups[f]) groups[f] = [];
      groups[f].push(apt);
    });
    // Sort floors descending
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map(floor => ({
        floor,
        units: groups[floor].sort((a, b) => a.id - b.id)
      }));
  }, [inventory]);

  // Price/sqm min/max for heatmap scaling
  const priceSqmStats = useMemo(() => {
    const valid = inventory
      .map(a => (a.area > 0 && a.price > 0 ? a.price / a.area : null))
      .filter(Boolean);
    if (!valid.length) return { min: 25000, max: 50000 };
    return {
      min: Math.min(...valid),
      max: Math.max(...valid)
    };
  }, [inventory]);

  const getHeatmapStyle = (apt) => {
    if (heatmapMode === 'ownership') {
      const isDev = (apt.type === 'יזם' || (apt.contractorSharePct ?? 0) > 0);
      if (isDev) {
        return {
          border: '1px solid #10b98180',
          bg: '#10b98115',
          tag: 'יזם',
          tagColor: '#10b981'
        };
      }
      return {
        border: '1px solid #71717a60',
        bg: '#27272a30',
        tag: 'בעלים',
        tagColor: '#a1a1aa'
      };
    }

    if (heatmapMode === 'priceSqm') {
      const pSqm = apt.area > 0 ? apt.price / apt.area : 0;
      if (pSqm === 0) {
        return { border: '1px solid #27272a', bg: '#18181b', tag: '0 ₪/מ"ר', tagColor: '#71717a' };
      }
      const range = priceSqmStats.max - priceSqmStats.min || 1;
      const ratio = Math.max(0, Math.min(1, (pSqm - priceSqmStats.min) / range));
      
      // Interpolate from deep slate to vibrant emerald
      const border = ratio > 0.6 ? '#10b981' : (ratio > 0.3 ? '#38bdf8' : '#64748b');
      const bg = ratio > 0.6 ? '#10b98125' : (ratio > 0.3 ? '#38bdf820' : '#64748b15');
      return {
        border: `1px solid ${border}`,
        bg,
        tag: `${Math.round(pSqm).toLocaleString()} ₪/מ"ר`,
        tagColor: border
      };
    }

    if (heatmapMode === 'category') {
      const isSpecial = apt.category === 'מיוחדת' || apt.category === 'פנטהאוז' || apt.category === 'גן';
      if (isSpecial) {
        return {
          border: '1px solid #f59e0b',
          bg: '#f59e0b20',
          tag: apt.category || 'מיוחדת',
          tagColor: '#f59e0b'
        };
      }
      return {
        border: '1px solid #27272a',
        bg: '#18181b',
        tag: 'טיפוסית',
        tagColor: '#a1a1aa'
      };
    }

    return { border: '1px solid #27272a', bg: '#18181b', tag: '', tagColor: '#fafafa' };
  };

  const handleSelectApt = (apt) => {
    setSelectedAptId(apt.id);
    setEditForm({ ...apt });
  };

  const handleSaveEdit = () => {
    if (!editForm || !onUpdateInventory) return;
    const updated = inventory.map(item => item.id === editForm.id ? { ...editForm } : item);
    onUpdateInventory(updated);
    setSelectedAptId(null);
    setEditForm(null);
  };

  const formatILS = (val) => `₪${Math.round(val || 0).toLocaleString('he-IL')}`;

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded p-5 space-y-6 text-[#fafafa]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="text-[#38bdf8]" size={20} />
            <h3 className="text-lg font-bold tracking-tight text-[#fafafa]">
              תאום דיגיטלי מרחבי למלאי הדירות (Spatial Building Matrix)
            </h3>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            תצוגה מרחבית קומה-אחר-קומה עם מפות חום ועריכה מהירה (Inline HUD)
          </p>
        </div>

        {/* Heatmap Layer Toggles */}
        <div className="flex items-center gap-1.5 bg-[#09090b] p-1 rounded border border-[#27272a]">
          <span className="text-[11px] text-[#71717a] px-2">שכבת חום:</span>
          <button
            onClick={() => setHeatmapMode('ownership')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              heatmapMode === 'ownership' ? 'bg-[#27272a] text-[#fafafa] font-bold' : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            בעלות (יזם / בעלים)
          </button>
          <button
            onClick={() => setHeatmapMode('priceSqm')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              heatmapMode === 'priceSqm' ? 'bg-[#27272a] text-[#fafafa] font-bold' : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            מחיר למ"ר (שווי שוק)
          </button>
          <button
            onClick={() => setHeatmapMode('category')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              heatmapMode === 'category' ? 'bg-[#27272a] text-[#fafafa] font-bold' : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            קטגוריה (טיפוסית / מיוחדת)
          </button>
        </div>
      </div>

      {/* Building Overview Quick Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">סך יחידות בבניין</div>
          <div className="text-lg font-mono font-bold text-[#fafafa] mt-1">
            {stats.totalUnits} דירות
          </div>
          <div className="text-[10px] text-[#10b981] mt-0.5">
            יזם: {stats.devUnits} ({stats.devUnitsPct}%) | בעלים: {stats.ownerUnits}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">שווי מכירות יזם (ללא מע"מ)</div>
          <div className="text-lg font-mono font-bold text-[#10b981] mt-1">
            {formatILS(stats.devValueExclVat)}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5">
            כולל מע"מ: {formatILS(stats.devValueInclVat)}
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">ממוצע למ"ר דירות יזם</div>
          <div className="text-lg font-mono font-bold text-[#38bdf8] mt-1">
            ₪{Math.round(stats.avgPricePerSqm).toLocaleString()}
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5">
            שטח ממוצע לדירה: {Math.round(stats.avgAptArea)} מ"ר
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-3 rounded">
          <div className="text-[11px] text-[#a1a1aa]">דירות מיוחדות (פנטהאוז/גן)</div>
          <div className="text-lg font-mono font-bold text-[#f59e0b] mt-1">
            {stats.specialValuePct}%
          </div>
          <div className="text-[10px] text-[#a1a1aa] mt-0.5">
            משווי היזם הכולל
          </div>
        </div>
      </div>

      {/* Main Building Layout Matrix & Edit HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Floor Grid (8 cols or full) */}
        <div className={selectedAptId ? 'lg:col-span-8 space-y-3' : 'lg:col-span-12 space-y-3'}>
          {floorGroups.map(({ floor, units }) => (
            <div
              key={floor}
              className="bg-[#09090b] border border-[#27272a] p-3 rounded flex flex-col md:flex-row items-stretch md:items-center gap-3"
            >
              {/* Floor Badge */}
              <div className="w-16 h-12 flex flex-col items-center justify-center bg-[#18181b] border border-[#27272a] rounded shrink-0">
                <span className="text-[10px] text-[#a1a1aa]">קומה</span>
                <span className="text-base font-bold font-mono text-[#fafafa]">{floor}</span>
              </div>

              {/* Apartments on Floor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 flex-1">
                {units.map((apt) => {
                  const style = getHeatmapStyle(apt);
                  const isSelected = selectedAptId === apt.id;
                  const priceSqm = apt.area > 0 ? Math.round(apt.price / apt.area) : 0;

                  return (
                    <motion.div
                      key={apt.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectApt(apt)}
                      style={{
                        border: isSelected ? '2px solid #38bdf8' : style.border,
                        backgroundColor: style.bg
                      }}
                      className="p-2.5 rounded cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between select-none"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[#fafafa]">
                            #{apt.id}
                          </span>
                          <span className="text-[11px] text-[#a1a1aa]">
                            {apt.rooms} חד׳
                          </span>
                        </div>
                        <span
                          style={{ color: style.tagColor }}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#09090b80]"
                        >
                          {style.tag}
                        </span>
                      </div>

                      <div className="mt-2 space-y-0.5 font-mono">
                        <div className="text-xs text-[#fafafa] font-bold">
                          {apt.price > 0 ? formatILS(apt.price) : 'ללא מחיר'}
                        </div>
                        <div className="text-[10px] text-[#a1a1aa] flex justify-between">
                          <span>{apt.area} מ"ר {apt.balcony ? `(+${apt.balcony})` : ''}</span>
                          {priceSqm > 0 && <span>₪{priceSqm.toLocaleString()}/מ"ר</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Inline Quick Editor (HUD) */}
        <AnimatePresence>
          {selectedAptId && editForm && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-4 bg-[#09090b] border border-[#38bdf8] p-4 rounded space-y-4 h-fit sticky top-4"
            >
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-[#38bdf8]" />
                  <span className="font-bold text-sm text-[#fafafa]">
                    עריכת יחידה דיגיטלית #{editForm.id}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAptId(null)}
                  className="text-[#a1a1aa] hover:text-[#fafafa] p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">שיווק ובעלות:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: 'יזם', contractorSharePct: 100 })}
                      className={`py-1.5 rounded font-medium border text-center transition-colors ${
                        editForm.type === 'יזם'
                          ? 'bg-[#10b98120] border-[#10b981] text-[#10b981]'
                          : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                      }`}
                    >
                      יזם (מכירה)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: 'בעלים', contractorSharePct: 0 })}
                      className={`py-1.5 rounded font-medium border text-center transition-colors ${
                        editForm.type === 'בעלים'
                          ? 'bg-[#27272a] border-[#71717a] text-[#fafafa]'
                          : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                      }`}
                    >
                      בעלי קרקע
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#a1a1aa] mb-1">קומה:</label>
                    <input
                      type="number"
                      value={editForm.floor ?? 1}
                      onChange={(e) => setEditForm({ ...editForm, floor: Number(e.target.value) })}
                      className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-[#fafafa] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#a1a1aa] mb-1">חדרים:</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.rooms ?? 3}
                      onChange={(e) => setEditForm({ ...editForm, rooms: Number(e.target.value) })}
                      className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-[#fafafa] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#a1a1aa] mb-1">שטח עיקרי (מ"ר):</label>
                    <input
                      type="number"
                      value={editForm.area ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, area: Number(e.target.value) })}
                      className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-[#fafafa] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#a1a1aa] mb-1">מרפסת (מ"ר):</label>
                    <input
                      type="number"
                      value={editForm.balcony ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, balcony: Number(e.target.value) })}
                      className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-[#fafafa] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#a1a1aa] mb-1">מחיר מכירה כולל מע"מ (₪):</label>
                  <input
                    type="number"
                    step="10000"
                    value={editForm.price ?? 0}
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-[#fafafa] font-mono font-bold text-sm"
                  />
                  {editForm.area > 0 && editForm.price > 0 && (
                    <div className="text-[11px] font-mono text-[#38bdf8] mt-1">
                      ₪{Math.round(editForm.price / editForm.area).toLocaleString()}/מ"ר
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#a1a1aa] mb-1">קטגוריה:</label>
                  <select
                    value={editForm.category ?? 'טיפוסית'}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-[#18181b] border border-[#27272a] p-2 rounded text-[#fafafa]"
                  >
                    <option value="טיפוסית">טיפוסית</option>
                    <option value="מיוחדת">מיוחדת</option>
                    <option value="פנטהאוז">פנטהאוז</option>
                    <option value="גן">גן</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded font-bold text-xs bg-[#10b981] hover:bg-[#059669] text-[#09090b] transition-colors"
                >
                  <Check size={14} />
                  שמור שינוי במלאי
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAptId(null)}
                  className="px-3 py-2 rounded text-xs bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
