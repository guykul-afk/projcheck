import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, FileText, Save, Calculator, Building, 
  Activity, ChevronDown, Plus, Trash, Info, List, MapPin 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_BUDGET = [
  { id: 1, section: 'קרקע + ייזום', color: '#3b82f6', items: [
    { id: '1-1', name: 'מס רכישה', targets: '6%', quantity: 70200000, total: 4212000, type: 'percent' },
    { id: '1-2', name: 'היטל השבחה', targets: 'אומדן', quantity: 0, total: 2000000, type: 'lump' },
    { id: '1-3', name: 'דיור חלופי לבעלי הדירות', targets: 6000, quantity: 1008, total: 6048000, type: 'per_unit' },
    { id: '1-4', name: 'הובלה', targets: 4000, quantity: 28, total: 224000, type: 'per_unit' },
  ]},
  { id: 2, section: "פרק ב' - כלליות", color: '#10b981', items: [
    { id: '2-1', name: 'תכנון וייעוץ', targets: 30000, quantity: 82, total: 2460000, type: 'per_unit' },
    { id: '2-2', name: 'פיקוח מטעם הדיירים', targets: 10000, quantity: 40, total: 400000, type: 'per_unit' },
    { id: '2-3', name: 'שיווק', targets: '2.00%', quantity: 168480000, total: 3369600, type: 'percent' },
    { id: '2-4', name: 'אגרות והיטלים לשטח עילי', targets: 464, quantity: 10560, total: 4899840, type: 'per_sqm' },
    { id: '2-5', name: 'אגרות והיטלים לשטח תת קרקעי', targets: 336, quantity: 4400, total: 1478400, type: 'per_sqm' },
    { id: '2-6', name: 'חב\' חשמל - מגורים', targets: 3750, quantity: 82, total: 307500, type: 'per_unit' },
    { id: '2-7', name: 'תקורה, ניהול ופיקוח', targets: '4.00%', quantity: 84393200, total: 3375728, type: 'percent' },
    { id: '2-8', name: 'פרסום שיווק', targets: '2.00%', quantity: 144000000, total: 2880000, type: 'percent' },
    { id: '2-9', name: 'בלתי צפוי מראש', targets: '5.00%', quantity: 0, total: 0, type: 'percent' },
  ]},
  { id: 3, section: "פרק ג' - בנייה ישירה", color: '#f59e0b', items: [
    { id: '3-1', name: 'הריסה ופינוי', targets: 460, quantity: 3500, total: 1610000, type: 'per_sqm' },
    { id: '3-2', name: 'פיתוח חצר', targets: 500, quantity: 2000, total: 1000000, type: 'per_sqm' },
    { id: '3-3', name: 'מרתפים', targets: 3478, quantity: 4400, total: 15303200, type: 'per_sqm' },
    { id: '3-4', name: 'שטח עילי -מרקמי עד 10 קומות', targets: 6000, quantity: 10560, total: 63360000, type: 'per_sqm' },
    { id: '3-5', name: 'מרפסות', targets: 2500, quantity: 1008, total: 2520000, type: 'per_sqm' },
    { id: '3-6', name: 'מרפסות גג', targets: 1500, quantity: 400, total: 600000, type: 'per_sqm' },
  ]}
];

const INITIAL_INVENTORY = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  floor: Math.floor(i / 2) + 1,
  type: i < 6 ? 'יזם' : 'בעלים',
  rooms: (i % 3) + 3,
  area: 95 + (i * 5),
  price: i < 6 ? (3500000 + (i * 100000)) : 0
}));

const App = () => {
  console.log('App component rendering...');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'budget');
  const [runtimeError, setRuntimeError] = useState(null);
  
  // Cash Flow Settings
  const [equityPercent, setEquityPercent] = useState(() => Number(localStorage.getItem('equityPercent')) || 30);
  const [constructionMonths, setConstructionMonths] = useState(() => Number(localStorage.getItem('constructionMonths')) || 24);
  const [salesData, setSalesData] = useState(() => JSON.parse(localStorage.getItem('salesData')) || []);
  const [p2080Percent, setP2080Percent] = useState(() => Number(localStorage.getItem('p2080Percent')) || 50);

  const [budgetData, setBudgetData] = useState(() => JSON.parse(localStorage.getItem('budgetData')) || INITIAL_BUDGET);
  const [inventoryData, setInventoryData] = useState(() => JSON.parse(localStorage.getItem('inventoryData')) || INITIAL_INVENTORY);
  
  // Market Analysis State
  const [projectAddress, setProjectAddress] = useState(() => localStorage.getItem('projectAddress') || '');
  const [marketSqmPrice, setMarketSqmPrice] = useState(() => Number(localStorage.getItem('marketSqmPrice')) || 0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('equityPercent', equityPercent);
    localStorage.setItem('constructionMonths', constructionMonths);
    localStorage.setItem('p2080Percent', p2080Percent);
    localStorage.setItem('salesData', JSON.stringify(salesData));
    localStorage.setItem('budgetData', JSON.stringify(budgetData));
    localStorage.setItem('inventoryData', JSON.stringify(inventoryData));
    localStorage.setItem('projectAddress', projectAddress);
    localStorage.setItem('marketSqmPrice', marketSqmPrice);
  }, [activeTab, equityPercent, constructionMonths, p2080Percent, salesData, budgetData, inventoryData, projectAddress, marketSqmPrice]);

  // Initialize/Sync salesData when months change
  useEffect(() => {
    const intervals = Math.ceil(constructionMonths / 2);
    setSalesData(prev => {
      if (prev.length === intervals) return prev;
      const newData = Array(intervals).fill(0);
      prev.forEach((val, i) => { if(i < intervals) newData[i] = val; });
      return newData;
    });
  }, [constructionMonths]);

  useEffect(() => {
    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.error('Window Error:', msg, error);
      setRuntimeError(`Error: ${msg}`);
      return false;
    };
  }, []);

  // Inventory Stats (needed before budgetStats for marketing formula)
  const inventoryStats = useMemo(() => {
    const totalUnits = inventoryData.length;
    const devUnits = inventoryData.filter(a => a.type === 'יזם').length;
    const ownerUnits = inventoryData.filter(a => a.type === 'בעלים').length; // Added
    const totalArea = inventoryData.reduce((acc, a) => acc + a.area, 0);
    const devArea = inventoryData.filter(a => a.type === 'יזם').reduce((acc, a) => acc + a.area, 0);
    const devValueInclVat = inventoryData.filter(a => a.type === 'יזם').reduce((acc, a) => acc + a.price, 0);
    const ownerValueInclVat = inventoryData.filter(a => a.type === 'בעלים').reduce((acc, a) => acc + a.price, 0);
    const totalValue = devValueInclVat + ownerValueInclVat;

    return {
      totalUnits, devUnits, ownerUnits, devUnitsPct: (devUnits/totalUnits*100).toFixed(1),
      totalArea, devArea, devAreaPct: (devArea/totalArea*100).toFixed(1),
      devValueInclVat, devValueExclVat: devValueInclVat / 1.18,
      devValuePct: totalValue > 0 ? (devValueInclVat/totalValue*100).toFixed(1) : 0,
      ownerValueInclVat,
      totalProjectValue: totalValue,
      avgPricePerSqm: devArea > 0 ? (devValueInclVat / devArea) : 0
    };
  }, [inventoryData]);

  // Market Analysis Logic
  const runMarketAnalysis = () => {
    if (!projectAddress) return;
    setIsAnalyzing(true);
    
    // Simulate API call to Nadlan/Madlan
    setTimeout(() => {
      // Deterministic "random" price based on address string length for demo
      const basePrice = 25000 + (projectAddress.length % 20) * 500;
      setMarketSqmPrice(basePrice);
      
      const avgProjectSqm = inventoryStats.avgPricePerSqm;
      const gap = ((avgProjectSqm - basePrice) / basePrice) * 100;
      
      let speed = "בינוני";
      if (gap < -5) speed = "מהיר מאוד";
      else if (gap < 0) speed = "מהיר";
      else if (gap > 10) speed = "איטי מאוד";
      else if (gap > 5) speed = "איטי";
      
      setAnalysisResult({
        speed,
        gap: gap.toFixed(1),
        comparables: [
          { date: '01/2024', price: basePrice * 0.98, dist: '150m' },
          { date: '11/2023', price: basePrice * 1.02, dist: '300m' },
          { date: '08/2023', price: basePrice * 0.95, dist: '450m' }
        ]
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  // Budget Calculations & Sorting
  const budgetStats = useMemo(() => {
    // Phase 1: Calculate basic totals and specific formulas
    const processedSections = budgetData.map(sec => {
      const items = sec.items.map(item => {
        let total = item.total;
        
        // Betterment Levy (היטל השבחה)
        if (item.id === '1-2') {
          total = Number(item.quantity) || 0;
        }
        // Alternative Housing (דיור חלופי)
        else if (item.id === '1-3') {
          total = (Number(item.targets) || 0) * inventoryStats.ownerUnits * (constructionMonths + 3);
        }
        // Moving (הובלה)
        else if (item.id === '1-4') {
          total = inventoryStats.ownerUnits * 2 * (Number(item.targets) || 0);
        }
        // Marketing (שיווק)
        else if (item.id === '2-3') {
          const pct = parseFloat(item.targets) / 100 || 0;
          total = pct * inventoryStats.devValueInclVat;
        }
        
        return { ...item, total };
      });
      return { ...sec, items };
    });

    // Phase 2: Unforeseen (בלתי צפוי מראש) - based on Sect 2 & 3
    const subtotalBasic = processedSections.reduce((acc, s) => acc + s.items.reduce((sum, i) => i.id !== '2-9' ? sum + i.total : sum, 0), 0);
    const directAndGeneralTotal = processedSections.filter(s => s.id === 2 || s.id === 3).reduce((acc, s) => acc + s.items.reduce((sum, i) => i.id !== '2-9' ? sum + i.total : sum, 0), 0);
    
    const finalSections = processedSections.map(sec => {
      if (sec.id === 2) {
        const items = sec.items.map(item => {
          if (item.id === '2-9') {
            const pct = parseFloat(item.targets) / 100 || 0;
            return { ...item, total: pct * directAndGeneralTotal };
          }
          return item;
        });
        return { ...sec, items };
      }
      return sec;
    });

    const sections = finalSections.map(sec => ({
      name: sec.section,
      total: sec.items.reduce((acc, item) => acc + item.total, 0),
      color: sec.color
    }));
    
    // Phase 3: Financing (מימון וערבויות) - % of final total (Algebraic solution: F = p * (Sum + F) => F = p*Sum / (1-p))
    const sumExclFinancing = sections.reduce((acc, s) => acc+s.total, 0);
    const finPctValue = 0.07; // Default 7% or should be dynamic? User said "חישוב כאחוז מתוך סך העלות"
    const financing = Math.round((sumExclFinancing * finPctValue) / (1 - finPctValue));
    
    sections.push({ name: 'מימון וערבויות', total: financing, color: '#6366f1' });
    const grandTotal = sumExclFinancing + financing;
    
    // All items for sorting
    const allItems = finalSections.flatMap(sec => sec.items.map(item => ({ ...item, section: sec.section })));
    allItems.push({ id: 'fin', name: 'מימון וערבויות', total: financing, section: 'מימון' });
    const sortedItems = [...allItems].sort((a, b) => b.total - a.total);

    return { sections, grandTotal, sortedItems, finalSections };
  }, [budgetData, inventoryStats, constructionMonths]);

  // Cash Flow Calculations
  const cashFlowStats = useMemo(() => {
    const totalCosts = budgetStats.grandTotal;
    const equityAmount = (totalCosts * equityPercent) / 100;
    const months = constructionMonths;
    
    // Identify Month 1 Items
    let month1Costs = 0;
    let restOfCosts = 0;

    budgetData.forEach(section => {
      section.items.forEach(item => {
        const name = item.name.toLowerCase();
        const isMonth1 = name.includes('רכישה') || 
                         name.includes('השבחה') || 
                         name.includes('תכנון') || 
                         name.includes('אגרות');
        
        if (isMonth1) {
          month1Costs += item.total;
        } else if (name.includes('הובלה')) {
          month1Costs += item.total * 0.5;
          restOfCosts += item.total * 0.5;
        } else {
          restOfCosts += item.total;
        }
      });
    });

    // Add Financing to rest (or distribute it)
    restOfCosts += (budgetStats.grandTotal - budgetStats.sections.reduce((acc, s) => acc + (s.name !== 'מימון וערבויות' ? s.total : 0), 0) - month1Costs);
    // Actually simpler: 
    const totalMonth1 = month1Costs;
    const totalRest = totalCosts - totalMonth1;
    
    const monthlyRest = totalRest / months;
    
    const data = Array.from({ length: months + 1 }, (_, i) => {
      const month = i + 1;
      let cost = 0;
      if (month === 1) {
        cost = totalMonth1;
      } else {
        cost = monthlyRest;
      }
      return { month, cost };
    });

    let cum = 0;
    const finalData = data.map(d => {
      cum += d.cost;
      return { ...d, cumulative: cum };
    });

    // --- REVENUE CALCULATION ---
    const avgDevPrice = inventoryStats.devValueExclVat / (inventoryStats.devUnits || 1);
    const revenueByMonth = Array(months + 2).fill(0); // Month 1 to End+1

    const totalDevUnits = inventoryStats.devUnits || 0;
    const n2080UnitsGoal = Math.round(totalDevUnits * p2080Percent / 100);
    let unitsAllocatedAs2080 = 0;

    salesData.forEach((units, i) => {
      if (units <= 0) return;
      
      const saleMonth = (i * 2) + 1; // 1, 3, 5...
      let unitsInPeriod = units;

      // Allocate 20/80 priority
      const canBe2080 = Math.min(unitsInPeriod, Math.max(0, n2080UnitsGoal - unitsAllocatedAs2080));
      const mustBeLinear = unitsInPeriod - canBe2080;

      // 20/80 Logic
      if (canBe2080 > 0) {
        const val2080 = canBe2080 * avgDevPrice;
        revenueByMonth[saleMonth] += val2080 * 0.2;
        revenueByMonth[months + 1] += val2080 * 0.8;
        unitsAllocatedAs2080 += canBe2080;
      }

      // Linear Logic (5 installments spread over remaining time)
      if (mustBeLinear > 0) {
        const valLinear = mustBeLinear * avgDevPrice;
        const remainingTime = (months + 1) - saleMonth;
        const installment = valLinear / 5;
        
        for (let m = 0; m < 5; m++) {
          // Spread 5 payments at equal intervals from saleMonth to project end
          const offset = remainingTime > 0 ? (m * (remainingTime / 5)) : 0;
          const targetMonth = Math.min(months + 1, Math.round(saleMonth + offset));
          revenueByMonth[targetMonth] += installment;
        }
      }
    });

    let revCum = 0;
    const combinedData = finalData.map(d => {
      const revenue = revenueByMonth[d.month] || 0;
      revCum += revenue;
      return { 
        ...d, 
        revenue, 
        revCumulative: revCum,
        netFlow: revCum - d.cumulative // Cumulative Balance
      };
    });

    return { 
      data: combinedData, 
      totalMonth1, 
      totalRest, 
      equityAmount, 
      avgDevPrice,
      totalRevenueProjected: revCum 
    };
  }, [budgetStats, budgetData, equityPercent, constructionMonths, salesData, p2080Percent, inventoryStats]);

  const handleBudgetChange = (sectionId, itemId, field, value) => {
    setBudgetData(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item => {
            if (item.id === itemId) {
              return { ...item, [field]: value };
            }
            return item;
          })
        };
      }
      return section;
    }));
  };

  const handleInventoryChange = (id, field, value) => {
    setInventoryData(prev => prev.map(apt => apt.id === id ? { ...apt, [field]: value } : apt));
  };

  // Simple SVG Pie Chart Component
  const SimplePieChart = ({ data, total }) => {
    if (!total || total === 0) return <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '50%' }}>-</div>;
    
    let cumulativePercent = 0;
    
    function getCoordinatesForPercent(percent) {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    }

    return (
      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '150px', height: '150px' }}>
        {data.map((slice, i) => {
          const percent = slice.total / total;
          if (percent === 0) return null;
          
          const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
          cumulativePercent += percent;
          const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
          
          const largeArcFlag = percent > 0.5 ? 1 : 0;
          const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L 0 0`,
          ].join(' ');
          return <path key={i} d={pathData} fill={slice.color} />;
        })}
      </svg>
    );
  };

  if (runtimeError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <h2>קרתה שגיאה בהרצת האפליקציה</h2>
        <p>{runtimeError}</p>
        <button onClick={() => window.location.reload()}>טען מחדש</button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '10px' }}>
            <PieChart size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>ProjectCheck</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>מערכת ניתוח התכנות פיננסית</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="tab" style={{ background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> דוח מלא
          </button>
          <button className="tab active" style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
            <Save size={18} /> שמירה
          </button>
        </div>
      </header>

      <div className="tabs">
        <div className={`tab ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}>
          <Calculator size={18} style={{ marginLeft: '8px' }} /> תקציב פרויקט
        </div>
        <div className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
          <Building size={18} style={{ marginLeft: '8px' }} /> מלאי דירות
        </div>
        <div className={`tab ${activeTab === 'profit' ? 'active' : ''}`} onClick={() => setActiveTab('profit')}>
          <Activity size={18} style={{ marginLeft: '8px' }} /> ניתוח ריווחיות
        </div>
        <div className={`tab ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')}>
          <Calculator size={18} style={{ marginLeft: '8px' }} /> תזרים
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {activeTab === 'budget' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Budget Dashboard */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '2rem',
                background: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>התפלגות הוצאות</h3>
                  <SimplePieChart data={budgetStats.sections} total={budgetStats.grandTotal} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginTop: '1rem' }}>
                    {budgetStats.sections.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color }}></div>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name} ({(s.total/budgetStats.grandTotal*100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <List size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1rem' }}>סעיפי הוצאה מהיקר לזול</h3>
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', paddingLeft: '1rem' }}>
                    {budgetStats.sortedItems.map((item, i) => (
                      <div key={i} style={{ 
                        display: 'flex', justifyContent: 'space-between', padding: '0.75rem', 
                        background: i % 2 === 0 ? '#f8fafc' : 'white', borderRadius: '6px', marginBottom: '4px'
                      }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', width: '20px' }}>{i + 1}.</span>
                          <span style={{ fontWeight: 500 }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 700, color: i < 3 ? '#ef4444' : 'inherit' }}>{item.total.toLocaleString()} ₪</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{((item.total/budgetStats.grandTotal)*100).toFixed(1)}% מהתקציב</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Table */}
              <div className="table-container" style={{ marginTop: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>תיאור הסעיף</th>
                      <th>בסיס / מטרה (₪ / %)</th>
                      <th>כמות / בסיס</th>
                      <th style={{ textAlign: 'left' }}>סה"כ (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetStats.finalSections.map((section) => (
                      <React.Fragment key={section.id}>
                        <tr className="section-header">
                          <td colSpan="4" style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>{section.section}</td>
                        </tr>
                        {section.items.map((item) => (
                          <tr key={item.id}>
                            <td style={{ paddingRight: '2rem' }}>{item.name}</td>
                            <td><input type="text" value={item.targets} onChange={(e) => handleBudgetChange(section.id, item.id, 'targets', isNaN(e.target.value) || e.target.value === '' ? e.target.value : Number(e.target.value))} className="input-field" /></td>
                            <td><input type="number" value={item.quantity} onChange={(e) => handleBudgetChange(section.id, item.id, 'quantity', Number(e.target.value))} className="input-field" /></td>
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{item.total.toLocaleString()} ₪</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                          <td colSpan="3">סה"כ {section.section}</td>
                          <td style={{ textAlign: 'left' }}>{section.items.reduce((s, i) => s + i.total, 0).toLocaleString()} ₪</td>
                        </tr>
                      </React.Fragment>
                    ))}
                    <tr className="section-header"><td colSpan="4" style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>מימון</td></tr>
                    <tr><td>מימון וערבויות (7%)</td><td>7%</td><td>-</td><td style={{ textAlign: 'left', fontWeight: 600 }}>{budgetStats.grandTotal - (budgetStats.grandTotal / 1.07)} ₪</td></tr>
                    <tr className="total-row" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                      <td colSpan="3" style={{ padding: '1.5rem 1rem' }}>סה"כ עלות הקמה ומימון</td>
                      <td style={{ textAlign: 'left', padding: '1.5rem 1rem' }}>{budgetStats.grandTotal.toLocaleString()} ₪</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'profit' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Profit Summary Dashboard */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
                background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div className="stat-card">
                  <span className="stat-label">סך תקבולים (ללא מע"מ)</span>
                  <div className="stat-value">{Math.round(inventoryStats.devValueExclVat).toLocaleString()} ₪</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '5px', color: 'var(--text-muted)' }}>
                    מבוסס על {inventoryStats.devUnits} דירות יזם
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">סך עלויות (כולל מימון)</span>
                  <div className="stat-value">{budgetStats.grandTotal.toLocaleString()} ₪</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '5px', color: 'var(--text-muted)' }}>
                    מעלות הקמה ומימון
                  </div>
                </div>
                <div className="stat-card" style={{ borderRight: '3px solid #10b981' }}>
                  <span className="stat-label">רווח יזמי (ללא מע"מ)</span>
                  <div className="stat-value" style={{ color: '#10b981' }}>
                    {(Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal).toLocaleString()} ₪
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">אחוז רווח מעלות</span>
                  <div className="stat-value">
                    {((Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal) / budgetStats.grandTotal * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Sensitivity Matrix */}
              <div className="table-container" style={{ marginTop: 0, padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                  <Activity size={24} color="var(--primary)" />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>ניתוח רגישות רווח (₪)</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>השפעת שינוי בעלויות ובתקבולים על הרווח היזמי</p>
                  </div>
                </div>
                
                <div style={{ position: 'relative', padding: '20px' }}>
                  {/* Matrix Headers */}
                  <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <ChevronDown size={14} style={{ verticalAlign: 'middle', marginLeft: '5px' }} />
                    שינוי בסך עלות הפרויקט (%)
                  </div>
                  
                  <div style={{ display: 'flex' }}>
                    {/* Y-Axis Label */}
                    <div style={{ 
                      writingMode: 'vertical-rl', 
                      transform: 'rotate(180deg)', 
                      textAlign: 'center', 
                      paddingLeft: '15px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem'
                    }}>
                      שינוי בסך התקבולים (%)
                    </div>

                    <div style={{ flex: 1, overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
                        <thead>
                          <tr>
                            <th style={{ background: 'transparent', border: 'none' }}></th>
                            {[-0.1, -0.05, 0, 0.05, 0.1].map(pct => (
                              <th key={pct} style={{ 
                                padding: '10px', 
                                background: '#f1f5f9', 
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                textAlign: 'center'
                              }}>
                                {(pct * 100).toFixed(0)}%
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[0.1, 0.05, 0, -0.05, -0.1].map(revPct => (
                            <tr key={revPct}>
                              <td style={{ 
                                padding: '10px', 
                                background: '#f1f5f9', 
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                textAlign: 'center'
                              }}>
                                {(revPct * 100).toFixed(0)}%
                              </td>
                              {[-0.1, -0.05, 0, 0.05, 0.1].map(costPct => {
                                const sRev = inventoryStats.devValueExclVat * (1 + revPct);
                                const sCost = budgetStats.grandTotal * (1 + costPct);
                                const sProfit = Math.round(sRev - sCost);
                                const isPositive = sProfit > 0;
                                return (
                                  <td key={costPct} style={{ 
                                    padding: '12px', 
                                    textAlign: 'center',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    background: isPositive ? `rgba(16, 185, 129, ${Math.min(0.1 + Math.abs(sProfit/10000000), 0.3)})` : `rgba(239, 68, 68, ${Math.min(0.1 + Math.abs(sProfit/10000000), 0.3)})`,
                                    color: isPositive ? '#065f46' : '#991b1b',
                                    border: revPct === 0 && costPct === 0 ? '2px solid var(--primary)' : 'none'
                                  }}>
                                    {sProfit.toLocaleString()}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'cashflow' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Cash Flow Dashboard */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
                background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div className="stat-card">
                  <span className="stat-label">הון עצמי נדרש ({equityPercent}%)</span>
                  <div className="stat-value">{Math.round(cashFlowStats.equityAmount).toLocaleString()} ₪</div>
                  <div style={{ marginTop: '10px' }}>
                    <input type="range" min="0" max="100" value={equityPercent} onChange={(e) => setEquityPercent(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">זמן בנייה (חודשים)</span>
                  <div className="stat-value">{constructionMonths} <span className="stat-sub">חודשים</span></div>
                  <div style={{ marginTop: '10px' }}>
                    <input type="number" value={constructionMonths} onChange={(e) => setConstructionMonths(Number(e.target.value))} className="input-field" />
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">מימון נדרש</span>
                  <div className="stat-value">{(budgetStats.grandTotal - cashFlowStats.equityAmount).toLocaleString()} ₪</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(100 - equityPercent)}% מסך הפרויקט</div>
                </div>
              </div>

              {/* Sales Inputs */}
              <div className="table-container" style={{ marginTop: 0, padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>ניהול מכירות חזויות</h3>
                  <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>שווי ממוצע לדירה: </span>
                    <span style={{ fontWeight: 700 }}>{Math.round(cashFlowStats.avgDevPrice).toLocaleString()} ₪</span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 600 }}>פירוט מכירות דוח-חודשי (מספר יח"ד):</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {salesData.map((units, i) => (
                        <div key={i} style={{ width: '80px' }}>
                          <div style={{ fontSize: '10px', marginBottom: '4px', color: 'var(--text-muted)' }}>חודשים {i*2+1}-{i*2+2}</div>
                          <input 
                            type="number" 
                            value={units} 
                            onChange={(e) => {
                              const newData = [...salesData];
                              newData[i] = Number(e.target.value);
                              setSalesData(newData);
                            }} 
                            className="input-field" 
                            min="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 600 }}>תנאי תשלום 20/80 (% מהדירות):</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={p2080Percent} 
                        onChange={(e) => setP2080Percent(Number(e.target.value))} 
                        style={{ flex: 1 }} 
                      />
                      <span style={{ fontWeight: 700, width: '40px' }}>{p2080Percent}%</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                      יתר הדירות ({100-p2080Percent}%) נמכרות בפריסה ליניארית (5 תשלומים).
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Flow Chart */}
              <div className="table-container" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ margin: 0 }}>תזרים מזומנים: חודשי ומצטבר</h3>
                  <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                      <span>הוצאה חודשית</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '12px', background: '#34d399', borderRadius: '2px' }}></div>
                      <span>הכנסה חודשית</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '2px', background: '#f59e0b' }}></div>
                      <span>מאזן מצטבר</span>
                    </div>
                  </div>
                </div>

                <div dir="ltr" style={{ height: '400px', width: '100%', position: 'relative', marginTop: '1rem' }}>
                  {/* Y-Axis Labels (Left - Monthly) */}
                  <div style={{ position: 'absolute', left: '-40px', top: 0, bottom: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>Max</span><span>Min</span>
                  </div>

                  <svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="none" style={{ display: 'block' }}>
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map(p => (
                      <line key={p} x1="0" y1={400 - (p * 360)} x2="1000" y2={400 - (p * 360)} stroke="#e2e8f0" strokeDasharray="4" />
                    ))}

                    {/* Bars (Monthly Expenses & Revenues) */}
                    {cashFlowStats.data.map((d, i) => {
                      const maxAbs = Math.max(...cashFlowStats.data.map(x => Math.max(x.cost, x.revenue)));
                      const barContainerWidth = 1000 / cashFlowStats.data.length;
                      const barWidth = barContainerWidth * 0.4;
                      const xBase = i * barContainerWidth;
                      
                      const expenseHeight = (d.cost / maxAbs) * 280;
                      const revenueHeight = (d.revenue / maxAbs) * 280;

                      return (
                        <g key={`bar-group-${i}`}>
                          {/* Expense Bar */}
                          <rect 
                            x={xBase + barContainerWidth * 0.05} 
                            y={340 - expenseHeight} 
                            width={barWidth} 
                            height={expenseHeight} 
                            fill={i === 0 ? 'var(--primary)' : '#94a3b8'} 
                            opacity="0.8"
                          >
                            <title>חודש {d.month} | הוצאה: {Math.round(d.cost).toLocaleString()} ₪</title>
                          </rect>
                          
                          {/* Revenue Bar */}
                          <rect 
                            x={xBase + barContainerWidth * 0.5} 
                            y={340 - revenueHeight} 
                            width={barWidth} 
                            height={revenueHeight} 
                            fill="#34d399" 
                            opacity="1"
                          >
                            <title>חודש {d.month} | הכנסה: {Math.round(d.revenue).toLocaleString()} ₪</title>
                          </rect>

                          {/* Labels */}
                          {d.cost > 0 && (
                            <text x={xBase + barContainerWidth * 0.25} y={335 - expenseHeight} textAnchor="middle" fontSize="8" fill="#475569">
                              {Math.round(d.cost / 1000)}k
                            </text>
                          )}
                          {d.revenue > 0 && (
                            <text x={xBase + barContainerWidth * 0.75} y={335 - revenueHeight} textAnchor="middle" fontSize="8" fill="#059669">
                              {Math.round(d.revenue / 1000)}k
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Line (Net Cumulative Balance) */}
                    <path
                      d={cashFlowStats.data.map((d, i) => {
                        const netBal = d.revCumulative - d.cumulative;
                        // For the line, we use a fixed scale or calculate dynamic
                        const maxExpTotal = cashFlowStats.data[cashFlowStats.data.length - 1].cumulative;
                        const maxRevTotal = cashFlowStats.data[cashFlowStats.data.length - 1].revCumulative;
                        const maxNet = Math.max(maxExpTotal, maxRevTotal);
                        
                        const x = (i * (1000 / cashFlowStats.data.length)) + (1000 / cashFlowStats.data.length / 2);
                        // Center is 340, we want to show positive balance going up? 
                        // Actually let's just show cumulative cash required (Negative is deficit)
                        // But user typically wants to see the cumulative balance.
                        // Let's use 340 as '0' if we want, but usually it's easier to just show another cumulative line.
                        // Let's show "Net Project Balance"
                        const netY = 340 - ( (d.revCumulative - d.cumulative) / maxNet ) * 300;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${netY}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                    
                    {/* Line Points */}
                    {cashFlowStats.data.map((d, i) => {
                      const maxExpTotal = cashFlowStats.data[cashFlowStats.data.length - 1].cumulative;
                      const maxRevTotal = cashFlowStats.data[cashFlowStats.data.length - 1].revCumulative;
                      const maxNet = Math.max(maxExpTotal, maxRevTotal);
                      const x = (i * (1000 / cashFlowStats.data.length)) + (1000 / cashFlowStats.data.length / 2);
                      const netY = 340 - ( (d.revCumulative - d.cumulative) / maxNet ) * 300;
                      return (
                        <circle key={`dot-${i}`} cx={x} cy={netY} r="4" fill="#f59e0b">
                          <title>יתרה מצטברת (חודש {d.month}): {Math.round(d.revCumulative - d.cumulative).toLocaleString()} ₪</title>
                        </circle>
                      );
                    })}

                    {/* X-Axis Labels */}
                    {cashFlowStats.data.map((d, i) => {
                      const x = (i * (1000 / cashFlowStats.data.length)) + (1000 / cashFlowStats.data.length / 2);
                      return (
                        <text key={`text-${i}`} x={x} y="390" textAnchor="middle" fontSize="12" fill="var(--text-muted)">
                          {d.month}
                        </text>
                      );
                    })}
                  </svg>
                  
                  {/* Legend Overlay for Month 1 */}
                  <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '10px', fontWeight: 700, color: 'var(--primary)', background: 'white', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    Land & Pre-calc (M1)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Address Entry Section */}
              <div style={{ 
                background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', 
                display: 'flex', gap: '1rem', alignItems: 'flex-end', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>כתובת הפרויקט (לבדיקת מחירי שוק):</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="לדוגמה: הרצל 15, תל אביב" 
                      value={projectAddress} 
                      onChange={(e) => setProjectAddress(e.target.value)}
                      className="input-field"
                      style={{ paddingRight: '35px' }}
                    />
                    <MapPin size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <button 
                  onClick={runMarketAnalysis} 
                  disabled={isAnalyzing || !projectAddress}
                  className="tab active" 
                  style={{ height: '42px', padding: '0 2rem', opacity: (!projectAddress || isAnalyzing) ? 0.5 : 1 }}
                >
                  {isAnalyzing ? 'בודק...' : 'בצע ניתוח שוק'}
                </button>
              </div>

              {/* Inventory Summary Dashboard */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
                background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}>
                <div className="stat-card">
                  <span className="stat-label">סה"כ יח"ד</span>
                  <div className="stat-value">{inventoryStats.totalUnits} <span className="stat-sub">יח"ד</span></div>
                  <div style={{ fontSize: '0.8rem', marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>יזם: {inventoryStats.devUnits} ({inventoryStats.devUnitsPct}%)</span>
                    <span>בעלים: {inventoryStats.totalUnits - inventoryStats.devUnits} ({(100-inventoryStats.devUnitsPct).toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">סה"כ מ"ר דירות</span>
                  <div className="stat-value">{inventoryStats.totalArea.toLocaleString()} <span className="stat-sub">מ"ר</span></div>
                  <div style={{ fontSize: '0.8rem', marginTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>יזם: {inventoryStats.devArea.toLocaleString()} ({inventoryStats.devAreaPct}%)</span>
                    <span>בעלים: {(inventoryStats.totalArea - inventoryStats.devArea).toLocaleString()} ({(100-inventoryStats.devAreaPct).toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">שווי יזם</span>
                  <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{inventoryStats.devValueInclVat.toLocaleString()} ₪</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '5px' }}>{Math.round(inventoryStats.devValueExclVat).toLocaleString()} ₪ <span className="stat-sub">ללא מע"מ</span></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inventoryStats.devValuePct}% מסך שווי פרויקט</div>
                </div>
                <div className="stat-card">
                  <span className="stat-label">שווי בעלים</span>
                  <div className="stat-value">{inventoryStats.ownerValueInclVat.toLocaleString()} ₪</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '10px', color: 'var(--text-muted)' }}><Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> שווי אומדני כולל מע"מ</div>
                </div>
                {marketSqmPrice > 0 && (
                  <div className="stat-card" style={{ borderRight: '3px solid #6366f1', background: '#f5f7ff' }}>
                    <span className="stat-label">מחיר שוק למ"ר (אומדן)</span>
                    <div className="stat-value" style={{ color: '#6366f1' }}>{Math.round(marketSqmPrice).toLocaleString()} ₪</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                      פער מחיר: <span style={{ color: analysisResult?.gap > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{analysisResult?.gap}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Inventory Table */}
              <div className="table-container" style={{ marginTop: 0 }}>
                <div style={{ padding: '1rem', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem' }}>פירוט מלאי יחידות דיור</h3>
                  <button onClick={() => setInventoryData([...inventoryData, { id: Date.now(), floor: 1, type: 'יזם', rooms: 3, area: 100, price: 0 }])} className="tab" style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 15px' }}>
                    <Plus size={16} /> הוסף דירה
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>מס'</th>
                        <th>קומה</th>
                        <th>סוג</th>
                        <th>חדרים</th>
                        <th>שטח (מ"ר)</th>
                        <th>מחיר (₪)</th>
                        <th>מחיר למ"ר</th>
                        {marketSqmPrice > 0 && <th>מחיר שוק</th>}
                        {marketSqmPrice > 0 && <th>פער</th>}
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.map((apt, idx) => {
                        const projectSqmPrice = apt.area > 0 ? (apt.price / apt.area) : 0;
                        const gap = marketSqmPrice > 0 ? ((projectSqmPrice - marketSqmPrice) / marketSqmPrice * 100) : 0;
                        
                        return (
                          <tr key={apt.id}>
                            <td>{idx + 1}</td>
                            <td><input type="number" value={apt.floor} onChange={(e) => handleInventoryChange(apt.id, 'floor', Number(e.target.value))} className="input-field small" /></td>
                            <td><select value={apt.type} onChange={(e) => handleInventoryChange(apt.id, 'type', e.target.value)} className="input-field select"><option value="יזם">יזם</option><option value="בעלים">בעלים</option></select></td>
                            <td><input type="number" value={apt.rooms} onChange={(e) => handleInventoryChange(apt.id, 'rooms', Number(e.target.value))} className="input-field small" /></td>
                            <td><input type="number" value={apt.area} onChange={(e) => handleInventoryChange(apt.id, 'area', Number(e.target.value))} className="input-field mid" /></td>
                            <td><input type="number" value={apt.price} onChange={(e) => handleInventoryChange(apt.id, 'price', Number(e.target.value))} className="input-field mid" style={{ fontWeight: 600 }} title='מחיר כולל מע"מ' /></td>
                            <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{Math.round(projectSqmPrice).toLocaleString()} ₪</td>
                            {marketSqmPrice > 0 && (
                              <td style={{ color: '#6366f1', fontWeight: 600 }}>{Math.round(marketSqmPrice).toLocaleString()} ₪</td>
                            )}
                            {marketSqmPrice > 0 && (
                              <td style={{ 
                                color: gap > 5 ? '#ef4444' : gap < -5 ? '#10b981' : '#f59e0b',
                                fontWeight: 700
                              }}>
                                {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                              </td>
                            )}
                            <td><button onClick={() => setInventoryData(inventoryData.filter(a => a.id !== apt.id))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash size={16} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {analysisResult && (
                <div style={{ 
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '2rem', borderRadius: '12px', border: '1px solid #cbd5e1'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                      <Activity size={20} color="var(--primary)" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>תובנות AI: קצב ספיגה</h3>
                    </div>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px' }}>קצב מכירות חזוי:</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>{analysisResult.speed}</div>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#475569', margin: 0 }}>
                        {parseFloat(analysisResult.gap) > 5 
                          ? `התמחור הנוכחי גבוה ב-${analysisResult.gap}% ממחירי השוק בסביבה. מומלץ לשקול מבצעי "פרי-סייל" או הטבות מימון (כמו 20/80) כדי לשמר קצב מכירות תקין.`
                          : parseFloat(analysisResult.gap) < -5 
                          ? `התמחור הנוכחי אגרסיבי ונמוך מהשוק. ניתן לשקול העלאת מחירים הדרגתית כדי למקסם רווחיות, קצב הספיגה צפוי להיות גבוה מאוד.`
                          : `התמחור מאוזן ותואם את מחירי השוק. ניתן להמשיך באסטרטגיית המכירה הנוכחית.`}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                      <List size={20} color="var(--primary)" />
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>עסקאות דומות בסביבה (לאחרונה)</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {analysisResult.comparables.map((comp, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{comp.price.toLocaleString()} ₪/מ"ר</span>
                            <span style={{ color: 'var(--text-muted)' }}>מרחק: {comp.dist}</span>
                            <span style={{ color: 'var(--text-muted)' }}>תאריך: {comp.date}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', marginTop: '5px' }}>
                        * מקור הנתונים: רשות המסים ומאגרי נדל"ן מסחריים (סימולציה)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>המערכת מספקת הערכה בלבד ואינה מהווה תחליף לייעוץ כלכלי מקצועי.</p>
      </footer>

      <style>{`
        .input-field { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-family: inherit; }
        .input-field.small { width: 50px; }
        .input-field.mid { width: 100px; }
        .input-field.select { padding-right: 25px; cursor: pointer; }
        .stat-card { border-right: 3px solid #e2e8f0; padding-right: 1rem; }
        .stat-card:first-child { border-right: 3px solid var(--primary); }
        .stat-label { font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 5px; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stat-sub { font-size: 0.85rem; font-weight: 400; color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default App;
