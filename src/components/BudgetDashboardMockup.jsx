import React from 'react';
import { Calculator, Settings, TrendingUp, Target, Plus, Download, AlertCircle } from 'lucide-react';

export default function BudgetDashboardMockup({ budgetData = [], projectStats = {} }) {
  // Mock data if not provided
  const mockBudget = [
    {
      section: 'קרקע + ייזום',
      items: [
        { name: 'מס רכישה', price: '6%', quantity: 1, total: 4212000 },
        { name: 'היטל השבחה', price: 'אומדן', quantity: 1, total: 2000000 },
        { name: 'דיור חלופי', price: 6000, quantity: 1008, total: 6048000 },
      ]
    },
    {
      section: 'בנייה ישירה',
      items: [
        { name: 'שטח עילי - עד 10 קומות', price: 6000, quantity: 10560, total: 63360000 },
        { name: 'מרתפים', price: 3478, quantity: 4400, total: 15303200 },
      ]
    }
  ];

  const sections = budgetData.length ? budgetData : mockBudget;
  
  const formatMoney = (val) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-canvas text-fg-primary font-heebo p-4" dir="rtl">
      {/* Top Header / Toolbar */}
      <header className="flex items-center justify-between mb-4 bg-surface border border-border px-4 py-2 rounded-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-surface-elevated border border-border flex items-center justify-center rounded">
            <Calculator size={16} className="text-emerald" />
          </div>
          <h1 className="font-heebo font-semibold text-lg tracking-tight">ניהול תקציב וריווחיות - ProjectCheck</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-surface-elevated border border-border hover:border-border-active text-fg-primary px-3 py-1.5 rounded text-xs font-semibold transition-colors">
            <Download size={14} /> ייצוא נתונים
          </button>
          <button className="flex items-center gap-2 bg-fg-primary text-canvas px-3 py-1.5 rounded text-xs font-semibold hover:bg-fg-muted transition-colors">
            שמירת שינויים
          </button>
        </div>
      </header>

      {/* 16-Column Asymmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-16 gap-3 mx-auto max-w-[1600px] h-[calc(100vh-6rem)]">
        
        {/* Left Pane (3/16): Global Parameters */}
        <aside className="col-span-1 lg:col-span-3 bg-surface border border-border rounded-md flex flex-col p-4">
          <h2 className="font-heebo font-medium text-sm text-fg-muted mb-4 tracking-tight uppercase">פרמטרי פרויקט</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">אחוז הון עצמי</label>
              <div className="relative">
                <input type="text" defaultValue="30" className="w-full bg-surface-elevated border border-border rounded px-3 py-1.5 text-sm font-geist text-fg-primary focus:outline-none focus:border-border-active" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs font-geist">%</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">עלות מימון שנתית</label>
              <div className="relative">
                <input type="text" defaultValue="7.0" className="w-full bg-surface-elevated border border-border rounded px-3 py-1.5 text-sm font-geist text-fg-primary focus:outline-none focus:border-border-active" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs font-geist">%</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">חודשי ביצוע</label>
              <input type="text" defaultValue="24" className="w-full bg-surface-elevated border border-border rounded px-3 py-1.5 text-sm font-geist text-fg-primary focus:outline-none focus:border-border-active" />
            </div>
          </div>
        </aside>

        {/* Center Pane (9/16): Pro Forma Grid (Budget) */}
        <main className="col-span-1 lg:col-span-9 bg-surface border border-border rounded-md flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
            <h2 className="font-heebo font-medium text-sm text-fg-primary tracking-tight">גיליון תקציב (Pro Forma)</h2>
            <button className="text-fg-muted hover:text-fg-primary"><Settings size={14} /></button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 bg-surface border-b border-border z-10">
                <tr className="text-[10px] font-semibold text-fg-muted uppercase tracking-wider">
                  <th className="py-2 px-4 font-normal">סעיף הוצאה</th>
                  <th className="py-2 px-4 font-normal text-left">עלות יחידה</th>
                  <th className="py-2 px-4 font-normal text-left">כמות</th>
                  <th className="py-2 px-4 font-normal text-left">סה"כ</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {sections.map((sec, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="bg-surface-elevated border-y border-border">
                      <td colSpan="4" className="py-1.5 px-4 font-heebo font-medium text-fg-primary tracking-tight text-[13px]">{sec.section}</td>
                    </tr>
                    {sec.items.map((item, i) => (
                      <tr key={i} className={`border-b border-border/50 hover:bg-surface-elevated transition-colors ${i % 2 === 0 ? 'bg-surface' : 'bg-[#141417]'}`}>
                        <td className="py-1.5 px-4 text-fg-muted">{item.name}</td>
                        <td className="py-1.5 px-4 font-geist text-left text-fg-muted">{typeof item.price === 'number' ? formatMoney(item.price) : item.price}</td>
                        <td className="py-1.5 px-4 font-geist text-left text-fg-muted">{item.quantity}</td>
                        <td className="py-1.5 px-4 font-geist text-left text-fg-primary">{formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer Summary */}
          <div className="border-t border-border bg-surface-elevated p-3 flex justify-between items-center">
            <span className="font-heebo text-sm text-fg-muted">סה"כ תקציב פרויקט:</span>
            <span className="font-geist text-lg text-fg-primary font-semibold">{formatMoney(115000000)}</span>
          </div>
        </main>

        {/* Right Pane (4/16): Telemetry & KPIs */}
        <aside className="col-span-1 lg:col-span-4 bg-surface border border-border rounded-md flex flex-col overflow-hidden">
          <div className="border-b border-border bg-surface px-4 py-2">
            <h2 className="font-heebo font-medium text-sm text-fg-primary tracking-tight">טלמטריה וריווחיות</h2>
          </div>
          
          <div className="p-4 flex flex-col gap-3 overflow-auto">
            {/* KPI Card 1: Profitability */}
            <div className="bg-surface-elevated border border-border rounded-md p-3 border-r-2 border-r-emerald">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">שיעור רווחיות (Profit Margin)</span>
                <TrendingUp size={12} className="text-emerald" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-geist text-2xl font-semibold text-fg-primary">18.4%</span>
              </div>
              <div className="mt-2 text-xs text-fg-muted flex justify-between border-t border-border/50 pt-1.5">
                <span>יעד: 15.0%</span>
                <span className="text-emerald font-geist">+3.4%</span>
              </div>
            </div>

            {/* KPI Card 2: IRR */}
            <div className="bg-surface-elevated border border-border rounded-md p-3 border-r-2 border-r-emerald">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">שיעור תשואה פנימי (IRR)</span>
                <Target size={12} className="text-emerald" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-geist text-2xl font-semibold text-fg-primary">22.1%</span>
              </div>
            </div>

            {/* KPI Card 3: ROE */}
            <div className="bg-surface-elevated border border-border rounded-md p-3 border-r-2 border-r-accent">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">תשואה להון (ROE)</span>
                <Activity size={12} className="text-accent" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-geist text-2xl font-semibold text-fg-primary">45.0%</span>
              </div>
              <div className="mt-2 text-xs text-fg-muted flex justify-between border-t border-border/50 pt-1.5">
                <span>חשיפה מקסימלית:</span>
                <span className="font-geist">{formatMoney(25000000)}</span>
              </div>
            </div>
            
            {/* Risk Alert */}
            <div className="mt-2 bg-surface-elevated border border-border rounded-md p-3 border-r-2 border-r-rose flex gap-3 items-start">
              <AlertCircle size={14} className="text-rose shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-fg-primary font-semibold mb-1">התרעת רגישות</h4>
                <p className="text-xs text-fg-muted leading-relaxed">
                  עלייה של 5% בעלויות הבנייה תוריד את הרווחיות אל מתחת ליעד המינימום (14.2%).
                </p>
              </div>
            </div>

          </div>
        </aside>
        
      </div>
    </div>
  );
}
