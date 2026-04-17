import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  PieChart, FileText, Save, Calculator, Building, 
  Activity, ChevronDown, Plus, Trash, Info, List, MapPin, LogOut, BarChart2, TrendingUp, Copy, Layers,
  Zap, ShieldAlert, Loader
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

const INITIAL_BUDGET = [
  { id: 1, section: 'קרקע + ייזום', color: '#264653', items: [ // Deep Teal
    { id: '1-1', name: 'מס רכישה', price: '6%', quantity: 0, total: 4212000, type: 'percent' },
    { id: '1-2', name: 'היטל השבחה', price: 'אומדן', quantity: 0, total: 2000000, type: 'lump' },
    { id: '1-3', name: 'דיור חלופי לבעלי הדירות', price: 6000, quantity: 1008, total: 6048000, type: 'per_unit' },
    { id: '1-4', name: 'הובלה', price: 4000, quantity: 28, total: 224000, type: 'per_unit' },
    { id: '2-4', name: 'אגרות והיטלים לשטח עילי', price: 464, quantity: 10560, total: 4899840, type: 'per_sqm' },
    { id: '2-5', name: 'אגרות והיטלים לשטח תת קרקעי', price: 336, quantity: 4400, total: 1478400, type: 'per_sqm' },
    { id: '2-6', name: 'חב\' חשמל - מגורים', price: 3750, quantity: 82, total: 307500, type: 'per_unit' },
    { id: '2-2', name: 'פיקוח מטעם הדיירים', price: 10000, quantity: 40, total: 400000, type: 'per_unit' },
    { id: '1-5', name: 'הוצאות ארגון דיירים', price: 0, quantity: 0, total: 0, type: 'per_unit' },
  ]},
  { id: 2, section: "פרק ב' - כלליות", color: '#58A6FF', items: [ // Electric Blue
    { id: '2-1', name: 'תכנון וייעוץ', price: 30000, quantity: 82, total: 2460000, type: 'per_unit' },
    { id: '2-3', name: 'משפטיות', price: '2.00%', quantity: 168480000, total: 3369600, type: 'percent' },
    { id: '2-8', name: 'שיווק', price: '2.00%', quantity: 168480000, total: 3369600, type: 'percent' },
    { id: '2-7', name: 'תקורה, ניהול ופיקוח', price: '4.00%', quantity: 84393200, total: 3375728, type: 'percent' },
    { id: '2-12', name: 'פיקוח הנדסי', price: 0, quantity: 0, total: 0, type: 'per_unit' },
    { id: '2-13', name: 'פיקוח מטעם גוף מממן', price: 0, quantity: 0, total: 0, type: 'per_unit' },
    { id: '2-9', name: 'בלתי צפוי מראש', price: '5.00%', quantity: 0, total: 0, type: 'percent' },
    { id: '2-11', name: 'קרן אחזקה', price: 0, quantity: 0, total: 0, type: 'per_unit' },
  ]},
  { id: 3, section: "פרק ג' - בנייה ישירה", color: '#6B7280', items: [ // Neutral Gray
    { id: '3-1', name: 'הריסה ופינוי', price: 460, quantity: 3500, total: 1610000, type: 'per_sqm' },
    { id: '3-2', name: 'פיתוח חצר', price: 500, quantity: 2000, total: 1000000, type: 'per_sqm' },
    { id: '3-3', name: 'מרתפים', price: 3478, quantity: 4400, total: 15303200, type: 'per_sqm' },
    { id: '3-4', name: 'שטח עילי -מרקמי עד 10 קומות', price: 6000, quantity: 10560, total: 63360000, type: 'per_sqm' },
    { id: '3-5', name: 'מרפסות', price: 2500, quantity: 1008, total: 2520000, type: 'per_sqm' },
    { id: '3-6', name: 'מרפסות גג', price: 1500, quantity: 400, total: 600000, type: 'per_sqm' },
    { id: '3-7', name: 'קומת עמודים מפולשת', price: 0, quantity: 0, total: 0, type: 'per_sqm' },
    { id: '3-8', name: 'מטלה ציבורית', price: 0, quantity: 0, total: 0, type: 'per_sqm' },
  ]}
];

const INITIAL_INVENTORY = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  floor: Math.floor(i / 2) + 1,
  type: i < 6 ? 'יזם' : 'בעלים',
  contractorSharePct: i < 6 ? 100 : 0,
  category: 'טיפוסית',
  rooms: (i % 3) + 3,
  area: 95 + (i * i * 2), // Slightly more varied areas
  balcony: 12,
  price: i < 6 ? (3500000 + (i * 100000)) : 0
}));

const createDefaultProject = (id = 'p1', name = 'פרויקט חדש') => ({
  id,
  name,
  address: '',
  marketSqmPrice: 0,
  startDate: '',
  budgetData: INITIAL_BUDGET,
  inventoryData: INITIAL_INVENTORY,
  equityPercent: 30,
  constructionMonths: 24,
  p2080Percent: 50,
  financingPercent: 7,
  salesData: [],
  includeInPortfolio: true,
});

// ─── Project color palette (Modern Teal/Blue/Neutral) ───
const PROJ_COLORS = ['#264653', '#58A6FF', '#3E4A3D', '#F4A261', '#E76F51', '#6B7280', '#2A9D8F', '#8E9AAF'];

// ─── Pure: inventory stats ───
function computeInventoryStats(inventoryData) {
  const arr = inventoryData || [];
  const totalUnits = arr.length;
  if (totalUnits === 0) return { totalUnits:0, devUnits:0, ownerUnits:0, devUnitsPct:'0.0', totalArea:0, devArea:0, devAreaPct:'0.0', devValueInclVat:0, devValueExclVat:0, devValuePct:0, ownerValueInclVat:0, totalProjectValue:0, avgPricePerSqm:0 };
  
  const devUnits = arr.reduce((s, a) => s + (a.contractorSharePct || (a.type === 'יזם' ? 100 : 0)) / 100, 0);
  const ownerUnits = totalUnits - devUnits;
  
  const totalArea = arr.reduce((s, a) => s + a.area, 0);
  const devArea = arr.reduce((s, a) => {
    const share = a.contractorSharePct !== undefined ? a.contractorSharePct : (a.type === 'יזם' ? 100 : 0);
    return s + (a.area * share / 100);
  }, 0);
  
  const devValueInclVat = arr.reduce((s, a) => {
    const share = a.contractorSharePct !== undefined ? a.contractorSharePct : (a.type === 'יזם' ? 100 : 0);
    return s + (a.price * share / 100);
  }, 0);
  
  const ownerValueInclVat = arr.reduce((s, a) => {
    const share = a.contractorSharePct !== undefined ? a.contractorSharePct : (a.type === 'יזם' ? 100 : 0);
    return s + (a.price * (100 - share) / 100);
  }, 0);
  
  const totalValue = arr.reduce((s, a) => s + a.price, 0);
  
  const specialValueInclVat = arr.reduce((s, a) => {
    if (a.category !== 'מיוחדת') return s;
    const share = a.contractorSharePct !== undefined ? a.contractorSharePct : (a.type === 'יזם' ? 100 : 0);
    return s + (a.price * share / 100);
  }, 0);
  
  const devValueExclVat = devValueInclVat / 1.17;
  const specialValueExclVat = specialValueInclVat / 1.17;
  
  return {
    totalUnits, devUnits, ownerUnits, devUnitsPct:(devUnits/totalUnits*100).toFixed(1),
    totalArea, devArea, devAreaPct:(totalArea > 0 ? (devArea/totalArea*100).toFixed(1) : 0),
    devValueInclVat, devValueExclVat,
    specialValueExclVat,
    specialValuePct: devValueExclVat > 0 ? (specialValueExclVat / devValueExclVat * 100).toFixed(1) : 0,
    devValuePct: totalValue>0 ? (devValueInclVat/totalValue*100).toFixed(1) : 0,
    ownerValueInclVat, totalProjectValue: totalValue,
    avgPricePerSqm: devArea>0 ? devValueInclVat/devArea : 0
  };
}

// ─── Pure: budget stats ───
function computeBudgetStats(budgetData, invStats, constructionMonths, financingPercent) {
  const { totalUnits, ownerUnits, devValueInclVat } = invStats;
  const proc = (budgetData||[]).map(sec => ({
    ...sec,
    items: sec.items.map(item => {
      let total=item.total, qty=Number(item.quantity)||0, pv=parseFloat(item.price)||0;
      if(item.id==='1-1'||item.id==='1-2'){/* manual */}
      else if(item.id==='1-3'){qty=(constructionMonths+4)*ownerUnits;total=pv*qty;}
      else if(item.id==='1-4'||item.id==='1-5'){total=pv*qty;}
      else if(item.id==='2-1'){qty=totalUnits;total=pv*qty;}
      else if(item.id==='2-2'){qty=constructionMonths+3;total=pv*qty;}
      else if(item.id==='2-3'){const p=parseFloat(item.price)/100||0;qty=devValueInclVat;total=p*qty;}
      else if(item.id==='2-8'){const p=parseFloat(item.price)/100||0;qty=devValueInclVat;total=p*qty;}
      else if(item.id==='2-4'||item.id==='2-5'){total=pv*qty;}
      else if(item.id==='2-6'){qty=totalUnits;total=pv*qty;}
      else if(item.id==='2-11'||item.id==='2-12'||item.id==='2-13'){if(item.id==='2-12'||item.id==='2-13')qty=constructionMonths+6;total=pv*qty;}
      else if(item.id.startsWith('3-')){total=pv*qty;}
      return {...item, quantity:qty, total};
    })
  }));
  const baseSum=(excl)=>proc.reduce((a,s)=>a+s.items.reduce((b,i)=>!excl.includes(i.id)?b+i.total:b,0),0);
  const final = proc.map(sec=>({
    ...sec,
    items: sec.items.map(item=>{
      if(item.id==='2-7'||item.id==='2-12'||item.id==='2-13'){const q=constructionMonths+6;return{...item,quantity:q,total:(parseFloat(item.price)||0)*q};}
      if(item.id==='2-9'){const p=parseFloat(item.price)/100||0,s=baseSum(['2-9']);return{...item,quantity:s,total:p*s};}
      return item;
    })
  }));
  const sections=final.map(sec=>({name:sec.section,total:sec.items.reduce((a,i)=>a+i.total,0),color:sec.color}));
  const sumExcl=sections.reduce((a,s)=>a+s.total,0);
  const financing=Math.round(sumExcl*(financingPercent/100));
  sections.push({name:'מימון וערבויות',total:financing,color:'#8E9AAF'}); // Soft Steel Blue
  const grandTotal=sumExcl+financing;
  const allItems=final.flatMap(sec=>sec.items.map(i=>({...i,section:sec.section})));
  allItems.push({id:'fin',name:'מימון וערבויות',total:financing,section:'מימון'});
  return{sections,grandTotal,sortedItems:[...allItems].sort((a,b)=>b.total-a.total),finalSections:final,financing};
}

// ─── Pure: build monthly IRR cashflows + equity exposure curve ───
function buildMonthlyData(project, budStats, invStats) {
  const months=project.constructionMonths||24;
  const equityAmt=budStats.grandTotal*((project.equityPercent??30)/100);
  const p2080=project.p2080Percent??50;
  const salesData=project.salesData||[];
  let fixedM1=0,constrT=0,linT=0;
  budStats.finalSections.forEach(sec=>sec.items.forEach(item=>{
    const n=item.name.toLowerCase();
    if(n.includes('רכישה')||n.includes('השבחה')||n.includes('קרקע')||n.includes('אגרות')||n.includes('היטלים'))fixedM1+=item.total;
    else if(item.id.startsWith('3-'))constrT+=item.total;
    else linT+=item.total;
  }));
  linT+=budStats.financing||0;
  const p1E=Math.max(1,Math.floor(months*0.25)),p2E=Math.max(p1E+1,Math.floor(months*0.75));
  const cByM=Array(months+2).fill(0);
  for(let m=1;m<=months;m++){
    if(m<=p1E)cByM[m]=(constrT*0.15)/p1E;
    else if(m<=p2E)cByM[m]=(constrT*0.70)/(p2E-p1E);
    else cByM[m]=(constrT*0.15)/((months-p2E)||1);
  }
  const linMo=linT/months;
  const devU=invStats.devUnits||0,avgPx=invStats.devValueExclVat/(devU||1);
  const n2080=Math.round(devU*p2080/100);
  let alloc=0;
  const revByM=Array(months+2).fill(0);
  salesData.forEach((units,i)=>{
    if(units<=0)return;
    const sm=(i*2)+1,c2=Math.min(units,Math.max(0,n2080-alloc)),cL=units-c2;
    if(c2>0){const v=c2*avgPx;revByM[sm]+=v*0.2;revByM[months+1]+=v*0.8;alloc+=c2;}
    if(cL>0){const v=cL*avgPx,rem=(months+1)-sm,ins=v/5;for(let m=0;m<5;m++){const off=rem>0?(m*(rem/5)):0;revByM[Math.min(months+1,Math.round(sm+off))]+=ins;}}
  });
  const irrCF=[-equityAmt];
  const equityExp=[0];
  let cumC=equityAmt,cumR=equityAmt;
  for(let m=1;m<=months+1;m++){
    let cost=0;
    if(m===1)cost+=fixedM1;
    if(m<=months)cost+=(cByM[m]||0)+linMo;
    const rev=revByM[m]||0;
    irrCF.push(rev-cost);
    cumC+=cost;cumR+=rev;
    equityExp.push(Math.max(0,cumC-cumR));
  }
  return{irrCF,equityExposure:equityExp,maxExposure:Math.max(...equityExp),months};
}

// ─── Pure: Newton-Raphson IRR (monthly cashflows → annualized %) ───
function calculateIRR(cashflows) {
  if (!cashflows || cashflows.length < 2) return null;
  // Ensure at least one positive and one negative cashflow
  let hasPositive = false;
  let hasNegative = false;
  for (const val of cashflows) {
    if (val > 0) hasPositive = true;
    if (val < 0) hasNegative = true;
    if (hasPositive && hasNegative) break;
  }
  if (!hasPositive || !hasNegative) return null;

  let r = 0.1; // Better starting guess for annualized IRRs
  const maxIterations = 200;
  const precision = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + r, t);
      npv += cashflows[t] / denom;
      dnpv -= (t * cashflows[t]) / Math.pow(1 + r, t + 1);
    }
    
    if (Math.abs(dnpv) < 1e-12) break;
    const nextR = r - npv / dnpv;
    if (Math.abs(nextR - r) < precision) {
      r = nextR;
      const annualized = (Math.pow(1 + r, 12) - 1) * 100;
      return (isFinite(annualized) && annualized > -99 && annualized < 1000) ? annualized : null;
    }
    r = nextR;
    // Safety bounds
    if (r <= -1) r = -0.999999;
    if (r > 10) r = 10;
  }
  
  const finalAnnualized = (Math.pow(1 + r, 12) - 1) * 100;
  return (isFinite(finalAnnualized) && finalAnnualized > -99 && finalAnnualized < 1000) ? finalAnnualized : null;
}

// ─── Pure: risk level from KPIs (Sage & Burnt Red) ───
function getProjectRisk(profitPct,annualRoe,irr){
  if(profitPct>25&&annualRoe>15&&(irr==null||irr>20))return{level:'green',color:'#3E4A3D',bg:'#e2e8e2',label:'בריא',icon:'🟢'};
  if(profitPct>15&&annualRoe>10&&(irr==null||irr>12))return{level:'yellow',color:'#F4A261',bg:'#fef3c7',label:'גבולי',icon:'🟡'};
  return{level:'red',color:'#E76F51',bg:'#fdecec',label:'בעייתי',icon:'🔴'};
}

// ─── Pure: compute all KPIs for one project ───
function computeProjectKPIs(project) {
  const inv=computeInventoryStats(project.inventoryData);
  const bud=computeBudgetStats(project.budgetData,inv,project.constructionMonths??24,project.financingPercent??7);
  const totalCost=bud.grandTotal,revenue=inv.devValueExclVat,profit=revenue-totalCost;
  const profitPct=totalCost>0?(profit/totalCost)*100:0;
  const equity=totalCost*((project.equityPercent??30)/100);
  const roe=equity>0?(profit/equity)*100:0;
  const years=(project.constructionMonths??24)/12||1;
  const annualRoe=roe/years;
  const {irrCF,equityExposure,maxExposure,months}=buildMonthlyData(project,bud,inv);
  const irr=calculateIRR(irrCF);
  const risk=getProjectRisk(profitPct,annualRoe,irr);

  const ag = bud.finalSections.flatMap(s => s.items).find(i => i.id === '3-4')?.quantity || 0;
  const ug = bud.finalSections.flatMap(s => s.items).find(i => i.id === '3-3')?.quantity || 0;
  const planning = {
    ag,
    ug,
    taa: inv.totalArea || 0,
    daa: inv.devArea || 0,
    totalEffAG: ag > 0 ? (inv.totalArea / ag) : 0,
    devEffAG: ag > 0 ? (inv.devArea / ag) : 0,
    totalEffTotal: (ag + ug) > 0 ? (inv.totalArea / (ag + ug)) : 0,
    devEffTotal: (ag + ug) > 0 ? (inv.devArea / (ag + ug)) : 0
  };

  return{totalCost,revenue,profit,profitPct,equity,roe,annualRoe,irr,risk,equityExposure,maxExposure,months,devUnits:inv.devUnits,totalUnits:inv.totalUnits,devArea:inv.devArea,constructionMonths:project.constructionMonths??24,planning};
}

// ─── Pure: Monte Carlo Simulation Helpers ───
function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

function runMonteCarlo(project, config) {
  const { iterations, costVol, revVol, interestVol } = config;
  const results = [];
  
  // Cache base values to speed up calculation
  // We can simulate by perturbing the final stats directly if we make some assumptions,
  // but for IRR accuracy we'll re-run the full logic.
  
  for (let i = 0; i < iterations; i++) {
    const costMult = randomNormal(1, costVol / 100);
    const revMult = randomNormal(1, revVol / 100);
    const interestDelta = randomNormal(0, interestVol); // interestVol is in absolute percent (e.g. 1% deviation)

    const perturbedProject = {
      ...project,
      financingPercent: Math.max(0, (project.financingPercent ?? 7) + interestDelta),
      // To speed up, we don't map deep arrays if we can avoid it.
      // But computeProjectKPIs expects these arrays.
      budgetData: project.budgetData.map(sec => ({
        ...sec,
        items: sec.items.map(item => ({ ...item, total: item.total * costMult }))
      })),
      inventoryData: project.inventoryData.map(apt => ({
        ...apt,
        price: apt.price * revMult
      }))
    };

    const kpis = computeProjectKPIs(perturbedProject);
    results.push({
      profit: kpis.profit,
      roe: kpis.roe,
      irr: kpis.irr || 0
    });
  }

  // Calculate stats
  const profits = results.map(r => r.profit).sort((a, b) => a - b);
  const meanProfit = profits.reduce((a, b) => a + b, 0) / iterations;
  const p5 = profits[Math.floor(iterations * 0.05)];
  const p50 = profits[Math.floor(iterations * 0.5)];
  const p95 = profits[Math.floor(iterations * 0.95)];
  const probLoss = (profits.filter(p => p < 0).length / iterations) * 100;
  
  return {
    raw: results,
    stats: { meanProfit, p5, p50, p95, probLoss },
    config
  };
}

const App = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('budget');
  const [portfolioCompareMode, setPortfolioCompareMode] = useState('financial');
  const [runtimeError, setRuntimeError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [bulkAdjustmentPct, setBulkAdjustmentPct] = useState(1.0);
  
  const [mcConfig, setMcConfig] = useState({ iterations: 1000, costVol: 5, revVol: 10, interestVol: 1 });
  const [mcResults, setMcResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [portfolioMcResults, setPortfolioMcResults] = useState(null);
  const [isPortfolioSimulating, setIsPortfolioSimulating] = useState(false);

  // Projects State
  const [projects, setProjects] = useState([createDefaultProject('p1', 'פרויקט ראשון')]);
  const [activeProjectId, setActiveProjectId] = useState('p1');

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  // Derived Project State (for convenience) - Safe checks
  const budgetData = activeProject?.budgetData || INITIAL_BUDGET;
  const inventoryData = activeProject?.inventoryData || [];
  const equityPercent = activeProject?.equityPercent ?? 30;
  const constructionMonths = activeProject?.constructionMonths ?? 24;
  const salesData = activeProject?.salesData || [];
  const p2080Percent = activeProject?.p2080Percent ?? 50;
  const projectAddress = activeProject?.address || '';
  const marketSqmPrice = activeProject?.marketSqmPrice || 0;
  const financingPercent = activeProject?.financingPercent ?? 7;
  const startDate = activeProject?.startDate || '';

  // Market Analysis State (Ephemeral)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // --- Firestore: Load on mount ---
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'data', 'app');
    getDoc(docRef).then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.projects) setProjects(data.projects);
        if (data.activeProjectId) setActiveProjectId(data.activeProjectId);
        if (data.activeTab) setActiveTab(data.activeTab);
      } else {
        // Fallback to restored data from last test version
        import('./RestoredData.json').then(module => {
           const restored = module.default;
           if (restored.projects) setProjects(restored.projects);
           if (restored.activeProjectId) setActiveProjectId(restored.activeProjectId);
           if (restored.activeTab) setActiveTab(restored.activeTab);
        }).catch(err => {
           console.error('Failed to load restored data:', err);
        });
      }
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [user]);

  // --- Firestore: Save helper (called explicitly + on state changes) ---
  const saveToFirestore = useCallback((updatedProjects, updatedActiveId, updatedTab) => {
    if (!user) return;
    setIsSaving(true);
    const docRef = doc(db, 'users', user.uid, 'data', 'app');
    setDoc(docRef, {
      projects: updatedProjects,
      activeProjectId: updatedActiveId,
      activeTab: updatedTab,
      updatedAt: new Date().toISOString()
    }).catch(console.error).finally(() => setIsSaving(false));
  }, [user]);

  // Auto-save whenever state changes (debounced via useEffect)
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      saveToFirestore(projects, activeProjectId, activeTab);
    }, 1500); // debounce 1.5s
    return () => clearTimeout(timer);
  }, [projects, activeProjectId, activeTab, isLoading, saveToFirestore]);

  const updateProject = (updates) => {
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId ? { ...p, ...updates } : p
    ));
  };

  // Data Migration
  useEffect(() => {
    if (isLoading) return;
    let modified = false;
    const newProjects = projects.map(p => {
      let pMod = false;
      let allItems = p.budgetData.flatMap(s => s.items.map(i => {
        let iMod = false;
        let newItem = { ...i };
        // targets -> price
        if (newItem.targets !== undefined && newItem.price === undefined) {
          newItem.price = newItem.targets;
          delete newItem.targets;
          iMod = true;
        }
        // Rename שיווק (2-3) to משפטיות
        if (newItem.id === '2-3' && newItem.name === 'שיווק') {
          newItem.name = 'משפטיות';
          iMod = true;
        }
        if (iMod) pMod = true;
        return newItem;
      }));

      // Added items migration
      const missingItems = [
        { id: '2-8', name: 'שיווק', price: '2.00%', quantity: 0, total: 0, type: 'percent' },
        { id: '1-5', name: 'הוצאות ארגון דיירים', price: 0, quantity: 0, total: 0, type: 'per_unit' },
        { id: '2-11', name: 'קרן אחזקה', price: 0, quantity: 0, total: 0, type: 'per_unit' },
        { id: '2-12', name: 'פיקוח הנדסי', price: 0, quantity: 0, total: 0, type: 'per_unit' },
        { id: '2-13', name: 'פיקוח מטעם גוף מממן', price: 0, quantity: 0, total: 0, type: 'per_unit' },
        { id: '3-7', name: 'קומת עמודים מפולשת', price: 0, quantity: 0, total: 0, type: 'per_sqm' },
        { id: '3-8', name: 'מטלה ציבורית', price: 0, quantity: 0, total: 0, type: 'per_sqm' },
      ];
      
      missingItems.forEach(mi => {
        if (!allItems.some(i => i.id === mi.id)) {
          allItems.push(mi);
          pMod = true;
        }
      });

      // Check sectioning
      const idsToMove = ['2-4', '2-5', '2-6', '2-2'];
      const sect1Ids = p.budgetData[0].items.map(i => i.id);
      const shouldMove = allItems.some(i => idsToMove.includes(i.id) && !sect1Ids.includes(i.id));

      if (pMod || shouldMove) {
        modified = true;
        const s1 = allItems.filter(i => i.id.startsWith('1-') || idsToMove.includes(i.id));
        const s2 = allItems.filter(i => i.id.startsWith('2-') && !idsToMove.includes(i.id));
        const s3 = allItems.filter(i => i.id.startsWith('3-'));
        return {
          ...p,
          budgetData: [
            { ...p.budgetData[0], items: s1 },
            { ...p.budgetData[1], items: s2 },
            { ...p.budgetData[2], items: s3 }
          ]
        };
      }
      return p;
    });
    if (modified) setProjects(newProjects);
  }, [projects, isLoading]);

  // Initialize/Sync salesData when months change
  useEffect(() => {
    const intervals = Math.ceil(constructionMonths / 2);
    if (salesData.length === intervals) return;
    
    const newData = Array(intervals).fill(0);
    salesData.forEach((val, i) => { if(i < intervals) newData[i] = val; });
    updateProject({ salesData: newData });
  }, [constructionMonths]);

  useEffect(() => {
    window.onerror = (msg, url, lineNo, columnNo, error) => {
      console.error('Window Error:', msg, error);
      setRuntimeError(`Error: ${msg}`);
      return false;
    };
  }, []);

  const inventoryStats = useMemo(() => computeInventoryStats(inventoryData), [inventoryData]);

  // Market Analysis Logic
  const runMarketAnalysis = () => {
    if (!projectAddress) return;
    setIsAnalyzing(true);
    
    // Simulate API call to Nadlan/Madlan
    setTimeout(() => {
      // Deterministic "random" price based on address string length for demo
      const basePrice = 25000 + (projectAddress.length % 20) * 500;
      updateProject({ marketSqmPrice: basePrice });
      
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

  const budgetStats = useMemo(() =>
    computeBudgetStats(budgetData, inventoryStats, constructionMonths, financingPercent),
    [budgetData, inventoryStats, constructionMonths, financingPercent]
  );

  // Portfolio: KPIs for all projects (for portfolio tab)
  const allProjectsKPIs = useMemo(() =>
    projects
      .filter(p => p.includeInPortfolio !== false)
      .map((p, i) => ({ ...computeProjectKPIs(p), id: p.id, name: p.name, colorIdx: i })),
    [projects]
  );

  const portfolioSensitivityData = useMemo(() => {
    const revSteps = [-10, -5, 0, 5, 10];
    const costSteps = [-10, -5, 0, 5, 10];
    const portProjects = projects.filter(p => p.includeInPortfolio !== false);
    
    return revSteps.map(revPct => {
      return costSteps.map(costPct => {
        let totalProfit = 0;
        portProjects.forEach(project => {
          const perturbed = {
            ...project,
            budgetData: project.budgetData.map(sec => ({
              ...sec,
              items: sec.items.map(item => ({ ...item, total: item.total * (1 + costPct / 100) }))
            })),
            inventoryData: project.inventoryData.map(apt => ({
              ...apt,
              price: apt.price * (1 + revPct / 100)
            }))
          };
          const kpis = computeProjectKPIs(perturbed);
          totalProfit += kpis.profit;
        });
        return totalProfit;
      });
    });
  }, [projects]);

  // Cash Flow Calculations
  const cashFlowStats = useMemo(() => {
    if (!budgetStats?.finalSections) {
      return { data: [], totalMonth1: 0, totalRest: 0, equityAmount: 0, avgDevPrice: 0, totalRevenueProjected: 0 };
    }

    const months = constructionMonths;
    const currentEquityAmount = (budgetStats.grandTotal * equityPercent) / 100;

    let fixedMonth1 = 0;
    let constructionTotal = 0;
    let linearTotal = 0;

    budgetStats.finalSections.forEach(section => {
      section.items.forEach(item => {
        const name = item.name.toLowerCase();
        
        // 1. Fixed Month 1 (Land, Taxes, Betterment)
        const isFixed = name.includes('רכישה') || 
                        name.includes('השבחה') || 
                        name.includes('קרקע') ||
                        name.includes('אגרות') ||
                        name.includes('היטלים');
        
        if (isFixed) {
          fixedMonth1 += item.total;
        } 
        // 2. Direct Construction (S-Curve) - Section 3 items
        else if (item.id.startsWith('3-')) {
          constructionTotal += item.total;
        }
        // 3. Linear (Management, Legal, Marketing, Others)
        else {
          linearTotal += item.total;
        }
      });
    });

    // Add Financing to linear total
    linearTotal += (budgetStats.financing || 0);

    // Calculate S-Curve weights
    // Phase 1 (0-25% of time): 15% weight
    // Phase 2 (25-75% of time): 70% weight
    // Phase 3 (75-100% of time): 15% weight
    const p1End = Math.max(1, Math.floor(months * 0.25));
    const p2End = Math.max(p1End + 1, Math.floor(months * 0.75));
    
    const p1Count = p1End;
    const p2Count = p2End - p1End;
    const p3Count = months - p2End;

    const constructionByMonth = Array(months + 1).fill(0);
    for (let m = 1; m <= months; m++) {
      if (m <= p1End) {
        constructionByMonth[m] = (constructionTotal * 0.15) / p1Count;
      } else if (m <= p2End) {
        constructionByMonth[m] = (constructionTotal * 0.70) / p2Count;
      } else {
        constructionByMonth[m] = (constructionTotal * 0.15) / (p3Count || 1);
      }
    }

    const linearMonthly = linearTotal / months;

    const data = Array.from({ length: months + 1 }, (_, i) => {
      const month = i + 1;
      let cost = 0;
      
      // Fixed items ONLY in Month 1
      if (month === 1) cost += fixedMonth1;
      
      // S-Curve Construction
      cost += constructionByMonth[month] || 0;
      
      // Linear items
      cost += linearMonthly;

      return { month, cost };
    });

    let cum = 0;
    const processedCosts = data.map(d => {
      cum += d.cost;
      return { ...d, cumulative: cum };
    });

    // --- REVENUE CALCULATION ---
    const avgDevPrice = inventoryStats.devValueExclVat / (inventoryStats.devUnits || 1);
    const revenueByMonth = Array(months + 2).fill(0);

    const totalDevUnits = inventoryStats.devUnits || 0;
    const n2080UnitsGoal = Math.round(totalDevUnits * p2080Percent / 100);
    let unitsAllocatedAs2080 = 0;

    salesData.forEach((units, i) => {
      if (units <= 0) return;
      const saleMonth = (i * 2) + 1;
      let unitsInPeriod = units;

      const canBe2080 = Math.min(unitsInPeriod, Math.max(0, n2080UnitsGoal - unitsAllocatedAs2080));
      const mustBeLinear = unitsInPeriod - canBe2080;

      if (canBe2080 > 0) {
        const val2080 = canBe2080 * avgDevPrice;
        revenueByMonth[saleMonth] += val2080 * 0.2;
        revenueByMonth[months + 1] += val2080 * 0.8;
        unitsAllocatedAs2080 += canBe2080;
      }

      if (mustBeLinear > 0) {
        const valLinear = mustBeLinear * avgDevPrice;
        const remainingTime = (months + 1) - saleMonth;
        const installment = valLinear / 5;
        for (let m = 0; m < 5; m++) {
          const offset = remainingTime > 0 ? (m * (remainingTime / 5)) : 0;
          const targetMonth = Math.min(months + 1, Math.round(saleMonth + offset));
          revenueByMonth[targetMonth] += installment;
        }
      }
    });

    let revCum = currentEquityAmount;
    const combinedData = processedCosts.map(d => {
      const revenue = revenueByMonth[d.month] || 0;
      const equity = d.month === 1 ? currentEquityAmount : 0;
      revCum += revenue;
      return { 
        ...d, 
        revenue, 
        equity,
        revCumulative: revCum,
        netFlow: revCum - d.cumulative
      };
    });

    return { 
      data: combinedData, 
      totalMonth1: fixedMonth1 + constructionByMonth[1] + linearMonthly, 
      equityAmount: currentEquityAmount, 
      avgDevPrice,
      totalRevenueProjected: revCum 
    };
  }, [budgetStats, budgetData, equityPercent, constructionMonths, salesData, p2080Percent, inventoryStats]);
  
  const planningStats = useMemo(() => {
    const ag = budgetStats.finalSections.flatMap(s => s.items).find(i => i.id === '3-4')?.quantity || 0;
    const ug = budgetStats.finalSections.flatMap(s => s.items).find(i => i.id === '3-3')?.quantity || 0;
    const taa = inventoryStats.totalArea || 0;
    const daa = inventoryStats.devArea || 0;
    
    return {
      aboveGroundArea: ag,
      undergroundArea: ug,
      totalApartmentArea: taa,
      devApartmentArea: daa,
      totalEfficiencyAG: ag > 0 ? (taa / ag) : 0,
      devEfficiencyAG: ag > 0 ? (daa / ag) : 0,
      totalEfficiencyTotal: (ag + ug) > 0 ? (taa / (ag + ug)) : 0,
      devEfficiencyTotal: (ag + ug) > 0 ? (daa / (ag + ug)) : 0
    };
  }, [budgetStats, inventoryStats]);

  const handleBudgetChange = (sectionId, itemId, field, value) => {
    updateProject({
      budgetData: budgetData.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            items: section.items.map(item => {
              if (item.id === itemId) return { ...item, [field]: value };
              return item;
            })
          };
        }
        return section;
      })
    });
  };

  const handleInventoryChange = (id, field, value) => {
    updateProject({
      inventoryData: inventoryData.map(apt => {
        if (apt.id === id) {
          let updates = { [field]: value };
          if (field === 'type') {
            updates.contractorSharePct = value === 'יזם' ? 100 : 0;
          } else if (field === 'contractorSharePct') {
            if (value === 100) updates.type = 'יזם';
            else if (value === 0) updates.type = 'בעלים';
            // otherwise keep existing type or maybe add a "Partial" type? 
            // Better to just let the percentage drive everything.
          }
          return { ...apt, ...updates };
        }
        return apt;
      })
    });
  };

  const applyBulkPriceAdjustment = (isIncrease) => {
    const multiplier = isIncrease ? (1 + bulkAdjustmentPct / 100) : (1 - bulkAdjustmentPct / 100);
    const updated = inventoryData.map(apt => ({
      ...apt,
      price: Math.round(apt.price * multiplier)
    }));
    updateProject({ inventoryData: updated });
  };

  const addNewProject = () => {
    const newId = `p${Date.now()}`;
    const newProj = createDefaultProject(newId, `פרויקט ${projects.length + 1}`);
    setProjects([...projects, newProj]);
    setActiveProjectId(newId);
  };

  const deleteProject = (id, e) => {
    e.stopPropagation();
    if (projects.length === 1) return;
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      setActiveProjectId(newProjects[0].id);
    }
  };

  const runProjectSimulation = () => {
    setIsSimulating(true);
    // Use setTimeout to ensure UI doesn't block immediately and allows loader to show
    setTimeout(() => {
      const results = runMonteCarlo(activeProject, mcConfig);
      setMcResults(results);
      setIsSimulating(false);
    }, 50);
  };

  const runPortfolioSimulation = () => {
    setIsPortfolioSimulating(true);
    setTimeout(() => {
      try {
        const { iterations, costVol, revVol, interestVol } = mcConfig;
        const results = [];
        const portProjects = projects.filter(p => p.includeInPortfolio !== false);
        
        for (let i = 0; i < iterations; i++) {
          const costMult = randomNormal(1, costVol / 100);
          const revMult = randomNormal(1, revVol / 100);
          const interestDelta = randomNormal(0, interestVol);

          let totalProfit = 0;
          let totalCost = 0;
          let totalRevenue = 0;

          portProjects.forEach(project => {
            const perturbedProject = {
              ...project,
              financingPercent: Math.max(0, (project.financingPercent ?? 7) + interestDelta),
              budgetData: project.budgetData.map(sec => ({
                ...sec,
                items: sec.items.map(item => ({ ...item, total: item.total * costMult }))
              })),
              inventoryData: project.inventoryData.map(apt => ({
                ...apt,
                price: apt.price * revMult
              }))
            };
            const kpis = computeProjectKPIs(perturbedProject);
            totalProfit += kpis.profit;
            totalCost += kpis.totalCost;
            totalRevenue += kpis.revenue;
          });

          results.push({ profit: totalProfit, cost: totalCost, revenue: totalRevenue });
        }

        const profits = results.map(r => r.profit).sort((a, b) => a - b);
        const meanProfit = profits.reduce((a, b) => a + b, 0) / iterations;
        const p5 = profits[Math.floor(iterations * 0.05)];
        const p50 = profits[Math.floor(iterations * 0.5)];
        const p95 = profits[Math.floor(iterations * 0.95)];
        const probLoss = (profits.filter(p => p < 0).length / iterations) * 100;

        setPortfolioMcResults({
          raw: results,
          stats: { meanProfit, p5, p50, p95, probLoss },
          config: mcConfig
        });
      } catch (err) {
        console.error("Portfolio simulation failed", err);
      } finally {
        setIsPortfolioSimulating(false);
      }
    }, 50);
  };

  const duplicateProject = (id, e) => {
    e.stopPropagation();
    const source = projects.find(p => p.id === id);
    if (!source) return;
    const newId = `p${Date.now()}`;
    const newProj = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `${source.name} (עותק)`
    };
    setProjects([...projects, newProj]);
    setActiveProjectId(newId);
  };

  // Simple SVG Pie Chart Component
  const SimplePieChart = ({ data, total }) => {
    if (!total || total === 0) return <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', borderRadius: '50%', border: '1px solid var(--border-sharp)' }}>-</div>;
    
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
    <div className="container hardware-accelerated" style={{ paddingBottom: '5rem' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '2rem 0',
        borderBottom: '1px solid var(--border-sharp)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button
            onClick={() => setActiveTab('portfolio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius-sharp)',
              border: activeTab === 'portfolio' ? '2px solid var(--accent)' : '1px solid var(--border-sharp)',
              background: activeTab === 'portfolio' ? 'var(--bg-elevated)' : 'var(--bg-surface)',
              color: activeTab === 'portfolio' ? 'var(--accent)' : 'var(--text-sec)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <List size={18} /> פורטפוליו
          </button>
          
          <button
            onClick={() => {
              import('./RestoredData.json').then(module => {
                const restored = module.default;
                if (restored.projects) setProjects(restored.projects);
                if (restored.activeProjectId) setActiveProjectId(restored.activeProjectId);
                if (restored.activeTab) setActiveTab(restored.activeTab);
                alert('הנתונים שוחזרו בהצלחה!');
              }).catch(err => alert('שגיאה בשחזור הנתונים: ' + err.message));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius-sharp)',
              border: '1px solid var(--accent)',
              background: 'rgba(88, 166, 255, 0.1)',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Calculator size={16} /> שחזר נתונים מגרסה קודמת
          </button>
        </div>
        
        {/* Project Selector - Dropdown Style */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            background: 'var(--bg-surface)', 
            padding: '8px 16px', 
            borderRadius: 'var(--radius-sharp)', 
            gap: '12px',
            border: activeTab !== 'portfolio' ? '2px solid var(--accent)' : '1px solid var(--border-sharp)',
            transition: 'all 0.2s',
            boxShadow: 'var(--shadow-sm)'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>פרויקט:</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={activeProjectId}
                onChange={(e) => {
                  setActiveProjectId(e.target.value);
                  if (activeTab === 'portfolio') setActiveTab('budget');
                }}
                style={{
                  padding: '6px 32px 6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-sharp)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-pri)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  appearance: 'none',
                  cursor: 'pointer',
                  minWidth: '200px',
                  outline: 'none',
                  textAlign: 'right'
                }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', left: '8px', pointerEvents: 'none', opacity: 0.5 }} />
            </div>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-sharp)' }} />

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              title={activeProject?.includeInPortfolio !== false ? "כלול בפורטפוליו" : "לא כלול בפורטפוליו"}
              onClick={() => {
                const val = activeProject?.includeInPortfolio === false;
                updateProject({ includeInPortfolio: val });
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'transform 0.2s', transform: activeProject?.includeInPortfolio !== false ? 'scale(1.1)' : 'scale(1)' }}
            >
              <Activity size={16} color={activeProject?.includeInPortfolio !== false ? 'var(--accent)' : 'var(--text-muted)'} />
            </button>
            <button
              title="שכפול פרויקט"
              onClick={(e) => duplicateProject(activeProjectId, e)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.6 }}
            >
              <Copy size={16} />
            </button>
            {projects.length > 1 && (
              <button
                title="מחיקת פרויקט"
                onClick={(e) => deleteProject(activeProjectId, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.6 }}
              >
                <Trash size={16} />
              </button>
            )}
            <button 
              onClick={addNewProject}
              title="הוספת פרויקט חדש"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px dashed var(--border-sharp)',
                background: 'var(--bg-canvas)',
                cursor: 'pointer',
                color: 'var(--accent)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isSaving && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, border: '2px solid var(--border-sharp)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              מסנכרן...
            </span>
          )}
          <button
            onClick={() => saveToFirestore(projects, activeProjectId, activeTab)}
            className="tab active"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'var(--accent)', 
              color: 'var(--bg-canvas)',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius-sharp)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Save size={16} /> שמירה
          </button>
          <button
            onClick={logout}
            title={`התנתקות מ-${user?.email}`}
            style={{
              padding: '0.6rem 1rem', 
              borderRadius: 'var(--radius-sharp)', 
              border: '1px solid var(--border-sharp)',
              background: 'var(--bg-surface)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              gap: '6px', 
              fontSize: '0.8rem', 
              color: 'var(--text-sec)', 
              transition: 'all 0.2s'
            }}
          >
            <LogOut size={16} /> יציאה
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </header>

      {activeTab !== 'portfolio' && (
        <div className="tabs" style={{ marginBottom: '2.5rem' }}>
          <div className={`tab ${activeTab === 'budget' ? 'active' : ''}`} onClick={() => setActiveTab('budget')}>
            <Calculator size={14} style={{ marginLeft: '8px' }} /> תקציב
          </div>
          <div className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <Building size={14} style={{ marginLeft: '8px' }} /> מלאי
          </div>
          <div className={`tab ${activeTab === 'profit' ? 'active' : ''}`} onClick={() => setActiveTab('profit')}>
            <Activity size={14} style={{ marginLeft: '8px' }} /> רווחיות
          </div>
          <div className={`tab ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')}>
            <TrendingUp size={14} style={{ marginLeft: '8px' }} /> תזרים
          </div>
          <div className={`tab ${activeTab === 'planning' ? 'active' : ''}`} onClick={() => setActiveTab('planning')}>
            <Layers size={14} style={{ marginLeft: '8px' }} /> נתוני תכנון
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {activeTab === 'budget' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Budget Bento Dashboard */}
              <div className="bento-grid">
                <div className="tactical-card col-4" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '1.5rem',
                  justifyContent: 'center'
                }}>
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

                  <div style={{ borderRight: '1px solid var(--border-sharp)', paddingRight: '2rem' }} className="col-8">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                      <div>
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>סה"כ תקציב משוער</h3>
                        <div className="mono-number" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                          ₪{budgetStats.grandTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="tactical-card" style={{ padding: '0.75rem 1rem', background: 'var(--bg-canvas)' }}>
                        <h4 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>מימון וערבויות</h4>
                        <div className="mono-number" style={{ fontSize: '1rem', fontWeight: 600 }}>₪{budgetStats.financing.toLocaleString()}</div>
                      </div>
                    </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <List size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1rem' }}>סעיפי הוצאה מהיקר לזול</h3>
                  </div>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', paddingLeft: '0.5rem' }}>
                    {budgetStats.sortedItems.map((item, i) => (
                      <div key={i} className="tactical-card" style={{ 
                        display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', 
                        marginBottom: '4px', background: 'var(--bg-canvas)' 
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', width: '18px' }}>{i + 1}.</span>
                          <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{item.name}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className="mono-number" style={{ fontWeight: 700, color: i < 3 ? 'var(--danger)' : 'var(--text-pri)' }}>
                            ₪{item.total.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{((item.total/budgetStats.grandTotal)*100).toFixed(1)}%</span>
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
                      <th>מחיר</th>
                      <th>כמות</th>
                      <th style={{ textAlign: 'left' }}>סה"כ (₪)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetStats.finalSections.map((section) => (
                      <React.Fragment key={section.id}>
                        <tr className="section-header">
                          <td colSpan="4" style={{ padding: '0.75rem 1rem', fontSize: '1rem' }}>{section.section}</td>
                        </tr>
                        {section.items.map((item) => {
                          const isAutoQuantity = ['1-3', '2-1', '2-2', '2-6', '2-3', '2-8', '2-7', '2-9', '2-12', '2-13', 'fin'].includes(item.id);
                          const isManualTotal = item.id === '1-1' || item.id === '1-2';
                          
                          return (
                            <tr key={item.id}>
                              <td style={{ paddingRight: '1rem', color: 'var(--text-sec)' }}>{item.name}</td>
                              <td>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  <input 
                                    type="text" 
                                    value={item.price} 
                                    onChange={(e) => handleBudgetChange(section.id, item.id, 'price', isNaN(e.target.value) || e.target.value === '' ? e.target.value : Number(e.target.value))} 
                                    style={{ paddingLeft: (item.id === '2-3' || item.id === '2-8' || item.id === '2-9') ? '1.5rem' : '0.5rem' }}
                                  />
                                  {(item.id === '2-3' || item.id === '2-8' || item.id === '2-9') && (
                                    <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {isAutoQuantity ? (
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className="mono-number" style={{ fontSize: '0.85rem' }}>
                                      ₪{Math.round(item.quantity || 0).toLocaleString()}
                                    </span>
                                    {(item.id === '2-3' || item.id === '2-8') && (
                                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>בסיס: מלאי יזם</span>
                                    )}
                                    {item.id === '2-9' && (
                                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>בסיס: כלל הסעיפים</span>
                                    )}
                                  </div>
                                ) : (
                                  <input 
                                    type="number" 
                                    step="any"
                                    value={item.quantity || 0} 
                                    onChange={(e) => handleBudgetChange(section.id, item.id, 'quantity', Number(e.target.value))} 
                                    className="mono-number"
                                  />
                                )}
                              </td>
                              <td style={{ textAlign: 'left' }} className="mono-number">
                                {isManualTotal ? (
                                  <input 
                                    type="number" 
                                    value={item.total} 
                                    onChange={(e) => handleBudgetChange(section.id, item.id, 'total', Number(e.target.value))} 
                                    style={{ width: '140px', textAlign: 'left', fontWeight: 700, color: 'var(--accent)' }}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 700 }}>
                                    ₪{Math.round(item.total).toLocaleString()}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: 'var(--bg-canvas)', fontWeight: 600 }}>
                          <td colSpan="3" style={{ color: 'var(--text-sec)', fontSize: '0.8rem' }}>סה"כ {section.section}</td>
                          <td style={{ textAlign: 'left' }} className="mono-number success-text">
                            ₪{section.items.reduce((s, i) => s + i.total, 0).toLocaleString()}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                    <tr className="section-header"><td colSpan="4" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>השקעות ומימון</td></tr>
                    <tr>
                      <td style={{ color: 'var(--text-sec)' }}>מימון וערבויות ({financingPercent}%)</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            step="0.5"
                            value={financingPercent} 
                            onChange={(e) => updateProject({ financingPercent: Number(e.target.value) })}
                            style={{ width: '60px' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                        </div>
                      </td>
                      <td>-</td>
                      <td style={{ textAlign: 'left' }} className="mono-number">
                        ₪{budgetStats.financing.toLocaleString()}
                      </td>
                    </tr>
                    <tr style={{ background: 'var(--accent)', color: 'var(--bg-canvas)', fontWeight: 800, fontSize: '1.2rem' }}>
                      <td colSpan="3" style={{ padding: '1.2rem 1rem' }}>סה"כ עלות פרויקט (כולל מימון)</td>
                      <td style={{ textAlign: 'left', padding: '1.2rem 1rem' }} className="mono-number">
                        ₪{budgetStats.grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'inventory' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Address Entry - Tactical */}
              <div className="tactical-card" style={{ 
                display: 'flex', gap: '1.5rem', alignItems: 'flex-end', background: 'var(--bg-canvas)'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sec)', textTransform: 'uppercase' }}>כתובת הפרויקט (ניתוח שוק)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="לדוגמה: הרצל 15, תל אביב..." 
                      value={projectAddress} 
                      onChange={(e) => setProjectAddress(e.target.value)}
                      style={{ paddingRight: '40px', width: '100%', fontSize: '1rem' }}
                    />
                    <MapPin size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                  </div>
                </div>
                <button 
                  onClick={runMarketAnalysis} 
                  disabled={isAnalyzing || !projectAddress}
                  style={{ 
                    height: '42px', 
                    padding: '0 1.5rem', 
                    background: 'var(--accent)', 
                    color: 'var(--bg-canvas)',
                    border: 'none',
                    borderRadius: 'var(--radius-sharp)',
                    fontWeight: 700,
                    cursor: (isAnalyzing || !projectAddress) ? 'not-allowed' : 'pointer',
                    opacity: (isAnalyzing || !projectAddress) ? 0.5 : 1
                  }}
                >
                  {isAnalyzing ? 'סורק נתונים...' : 'בצע ניתוח שוק'}
                </button>
              </div>

              <div className="bento-grid">
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>סה"כ יח"ד</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{inventoryStats.totalUnits}</div>
                  <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-sec)' }}>
                    <span>יזם: {inventoryStats.devUnits} ({inventoryStats.devUnitsPct}%)</span>
                    <span>בעלים: {inventoryStats.ownerUnits}</span>
                  </div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>שטח דירות (מ"ר)</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{inventoryStats.totalArea.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-sec)' }}>
                    <span>יזם: {inventoryStats.devArea.toLocaleString()} ({inventoryStats.devAreaPct}%)</span>
                  </div>
                </div>
                <div className="tactical-card col-3" style={{ borderLeft: '2px solid var(--accent)' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>שווי יזם (ללא מע"מ)</span>
                  <div className="mono-number success-text" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    ₪{Math.round(inventoryStats.devValueExclVat).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inventoryStats.devValuePct}% מסך שווי הפרויקט</div>
                </div>
                <div className="tactical-card col-3" style={{ borderLeft: '2px solid #F4A261' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>שווי דירות מיוחדות (נקי)</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0', color: '#F4A261' }}>
                    ₪{Math.round(inventoryStats.specialValueExclVat).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inventoryStats.specialValuePct}% ממלאי יזם (ללא מע"מ)</div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>מחיר ממוצע למ"ר</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    ₪{Math.round(inventoryStats.avgPricePerSqm).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>כולל מע"מ (דירות יזם)</div>
                </div>
              </div>

              <div className="table-container" style={{ marginTop: 0 }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-sharp)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ניהול מלאי</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(88, 166, 255, 0.05)', borderRadius: '4px', border: '1px dashed var(--accent)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)' }}>עדכון מחירים (%):</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={bulkAdjustmentPct} 
                        onChange={(e) => setBulkAdjustmentPct(parseFloat(e.target.value) || 0)} 
                        style={{ width: '60px', padding: '2px 6px', fontSize: '0.8rem', background: 'var(--bg-canvas)', border: '1px solid var(--border-sharp)', borderRadius: '4px' }}
                      />
                      <button 
                        onClick={() => applyBulkPriceAdjustment(true)}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={12} /> העלה
                      </button>
                      <button 
                        onClick={() => applyBulkPriceAdjustment(false)}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', background: '#E76F51', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash size={12} /> הורד
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => updateProject({ inventoryData: [...inventoryData, { id: Date.now(), floor: 1, type: 'יזם', category: 'טיפוסית', rooms: 3, area: 100, balcony: 12, price: 0 }] })} 
                    style={{ 
                      background: 'var(--bg-canvas)', 
                      color: 'var(--accent)', 
                      border: '1px solid var(--accent)',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '4px 12px',
                      borderRadius: '2px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> הוסף דירה
                  </button>
                </div>
                <div style={{ overflowX: 'auto', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border-sharp)' }}>
                  <table style={{ width: 'max-content', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border-sharp)' }}>
                        <th style={{ width: '35px', padding: '12px 4px', textAlign: 'center' }}>מס'</th>
                        <th style={{ width: '45px', padding: '12px 4px', textAlign: 'center' }}>קומה</th>
                        <th style={{ width: '65px', padding: '12px 4px', textAlign: 'center' }}>סוג</th>
                        <th style={{ width: '90px', padding: '12px 4px', textAlign: 'center' }}>חלק %</th>
                        <th style={{ width: '85px', padding: '12px 4px', textAlign: 'center' }}>טיפוס</th>
                        <th style={{ width: '45px', padding: '12px 4px', textAlign: 'center' }}>חדרים</th>
                        <th style={{ width: '75px', padding: '12px 4px', textAlign: 'center' }}>שטח</th>
                        <th style={{ width: '80px', padding: '12px 4px', textAlign: 'center', color: 'var(--accent)', fontWeight: 800 }}>מרפסת</th>
                        <th style={{ width: '95px', padding: '12px 4px', textAlign: 'center' }}>שטח קבלן</th>
                        <th style={{ width: '120px', padding: '12px 4px', textAlign: 'center' }}>מחיר (₪)</th>
                        <th style={{ width: '140px', padding: '12px 4px', textAlign: 'center' }}>שווי קבלן</th>
                        <th style={{ width: '65px', padding: '12px 4px', textAlign: 'center' }}>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.map((apt, idx) => {
                        const projectSqmPrice = apt.area > 0 ? (apt.price / apt.area) : 0;
                        const isOwner = apt.type === 'בעלים';
                        return (
                          <tr key={apt.id} style={{ background: isOwner ? 'rgba(38, 70, 83, 0.04)' : undefined }}>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }} className="mono-number">{idx + 1}</td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <input 
                                type="number" 
                                value={apt.floor} 
                                onChange={(e) => handleInventoryChange(apt.id, 'floor', Number(e.target.value))} 
                                className="compact-input" 
                                style={{ width: '100%', textAlign: 'center', border: '1px solid transparent', background: 'transparent' }} 
                              />
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <select 
                                value={apt.type} 
                                onChange={(e) => handleInventoryChange(apt.id, 'type', e.target.value)} 
                                className="compact-input"
                                style={{ background: 'transparent', color: 'var(--text-pri)', border: '1px solid transparent', width: '100%', cursor: 'pointer' }}
                              >
                                <option value="יזם">יזם</option>
                                <option value="בעלים">בעלים</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                <input 
                                  type="number" 
                                  value={apt.contractorSharePct !== undefined ? apt.contractorSharePct : (apt.type === 'יזם' ? 100 : 0)} 
                                  onChange={(e) => handleInventoryChange(apt.id, 'contractorSharePct', Number(e.target.value))} 
                                  className="compact-input mono-number"
                                  style={{ width: '55px', textAlign: 'center', fontWeight: 600, color: 'var(--accent)', border: '1px solid transparent', background: 'transparent', appearance: 'none', MozAppearance: 'textfield' }} 
                                  min="0" max="100"
                                />
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>%</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <select 
                                value={apt.category || 'טיפוסית'} 
                                onChange={(e) => handleInventoryChange(apt.id, 'category', e.target.value)} 
                                className="compact-input"
                                style={{ background: 'transparent', color: 'var(--text-pri)', border: '1px solid transparent', width: '100%', cursor: 'pointer' }}
                              >
                                <option value="טיפוסית">טיפוסית</option>
                                <option value="מיוחדת">מיוחדת</option>
                               </select>
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <input 
                                type="number" 
                                value={apt.rooms} 
                                onChange={(e) => handleInventoryChange(apt.id, 'rooms', Number(e.target.value))} 
                                className="compact-input" 
                                style={{ width: '100%', textAlign: 'center', border: '1px solid transparent', background: 'transparent' }} 
                              />
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <input 
                                type="number" 
                                value={apt.area} 
                                onChange={(e) => handleInventoryChange(apt.id, 'area', Number(e.target.value))} 
                                className="compact-input mono-number" 
                                style={{ width: '100%', textAlign: 'center', border: '1px solid transparent', background: 'transparent', fontWeight: 500 }} 
                              />
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <input 
                                type="number" 
                                value={apt.balcony || 0} 
                                onChange={(e) => handleInventoryChange(apt.id, 'balcony', Number(e.target.value))} 
                                className="compact-input mono-number" 
                                style={{ 
                                  width: '100%', 
                                  textAlign: 'center', 
                                  border: '1px solid var(--accent)', 
                                  background: 'var(--bg-surface)',
                                  fontWeight: 700,
                                  color: 'var(--accent)',
                                  boxShadow: '0 0 5px rgba(88, 166, 255, 0.1)'
                                }} 
                              />
                            </td>
                            <td className="mono-number" style={{ fontSize: '0.8rem', color: 'var(--text-sec)', textAlign: 'center', padding: '6px 4px' }}>
                              {Math.round(apt.area * (apt.contractorSharePct !== undefined ? apt.contractorSharePct : (apt.type === 'יזם' ? 100 : 0)) / 100).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <input 
                                type="number" 
                                value={apt.price} 
                                onChange={(e) => handleInventoryChange(apt.id, 'price', Number(e.target.value))} 
                                className="compact-input mono-number" 
                                style={{ width: '100%', fontWeight: 600, color: 'var(--text-pri)', textAlign: 'center', border: '1px solid transparent', background: 'transparent' }} 
                              />
                            </td>
                            <td className="mono-number" style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', padding: '6px 4px' }}>
                              ₪{Math.round(apt.price * (apt.contractorSharePct !== undefined ? apt.contractorSharePct : (apt.type === 'יזם' ? 100 : 0)) / 100).toLocaleString()}
                            </td>
                            <td style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => {
                                  const newApt = { ...apt, id: Date.now() + idx };
                                  const newInventoryData = [...inventoryData];
                                  newInventoryData.splice(idx + 1, 0, newApt);
                                  updateProject({ inventoryData: newInventoryData });
                                }} 
                                title="שכפל"
                                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <Copy size={14} />
                              </button>
                              <button 
                                onClick={() => updateProject({ inventoryData: inventoryData.filter(a => a.id !== apt.id) })} 
                                title="מחק"
                                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <Trash size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'profit' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="bento-grid">
                {(() => {
                  const totalProfit = Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal;
                  const equity = cashFlowStats.equityAmount;
                  const roe = equity > 0 ? (totalProfit / equity) * 100 : 0;
                  const years = (constructionMonths / 12) || 1;
                  const annualizedRoe = roe / years;
                  const equityMultiple = equity > 0 ? (totalProfit + equity) / equity : 0;
                  const equityPercent = budgetStats.grandTotal > 0 ? Math.round((equity / budgetStats.grandTotal) * 100) : 0;

                  return (
                    <>
                      {/* Row 1: Core Profit & Foundation */}
                      <div className="tactical-card col-3">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>Margin (Cost)</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          {((totalProfit / (budgetStats.grandTotal || 1)) * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ROI על עלויות הקמה</div>
                      </div>
                      <div className="tactical-card col-3">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הון עצמי (Equity)</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>₪{Math.round(equity).toLocaleString()}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{equityPercent}% מעלות הפרויקט</div>
                      </div>
                      <div className="tactical-card col-3" style={{ borderBottom: '2px solid var(--accent)' }}>
                        <span 
                          style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase', cursor: 'help' }}
                          data-tooltip="שיעור התשואה הפנימי (Internal Rate of Return) - המדד המדויק ביותר לרווחיות הפרויקט הלוקח בחשבון את עיתוי זרימת המזומנים (Cash Flow Timing)."
                        >
                          IRR פרויקטלי <Info size={10} />
                        </span>
                        <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          {cashFlowStats.irr ? `${cashFlowStats.irr.toFixed(1)}%` : '—'}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Internal Rate of Return</div>
                      </div>
                      <div className="tactical-card col-3">
                        <span 
                          style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase', cursor: 'help' }}
                          data-tooltip="תשואה על ההון העצמי (Return on Equity) - היחס בין הרווח הנקי המצטבר לבין ההון העצמי שהושקע בפועל (ROI)."
                        >
                          ROE פרויקטלי <Info size={10} />
                        </span>
                        <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>{roe.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Return on Equity</div>
                      </div>

                      {/* Row 2: Performance Multiples & Unit Costs */}
                      <div className="tactical-card col-3">
                        <span 
                          style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase', cursor: 'help' }}
                          data-tooltip="תשואה שנתית (Annualized ROE) - ממוצע התשואה השנתית של ההון העצמי לאורך תקופת הבנייה. מאפשר השוואה לאפיקי השקעה אלטרנטיביים."
                        >
                          תשואה שנתית <Info size={10} />
                        </span>
                        <div className="mono-number success-text" style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.4rem 0' }}>{annualizedRoe.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Annualized ROE</div>
                      </div>
                      <div className="tactical-card col-3">
                        <span 
                          style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase', cursor: 'help' }}
                          data-tooltip="מכפיל הון (Equity Multiple) - היחס בין סך המזומן שמוחזר (קרן + רווח) לבין ההון שהושקע. (למשל: 1.5x אומר שהרווחת 50% על הכסף)."
                        >
                          Equity Multiple <Info size={10} />
                        </span>
                        <div className="mono-number" style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.4rem 0' }}>{equityMultiple.toFixed(2)}x</div>
                      </div>
                      <div className="tactical-card col-3">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלות ליח"ד יזם</span>
                        <div className="mono-number" style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(budgetStats.grandTotal / (inventoryStats.devUnits || 1)).toLocaleString()}
                        </div>
                      </div>
                      <div className="tactical-card col-3">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלות לסך יח"ד</span>
                        <div className="mono-number" style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(budgetStats.grandTotal / (inventoryStats.totalUnits || 1)).toLocaleString()}
                        </div>
                      </div>

                      {/* Row 3: Sqm Metrics */}
                      <div className="tactical-card col-4" style={{ background: 'var(--bg-canvas)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלות למ"ר יזם</span>
                        <div className="mono-number" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(budgetStats.grandTotal / (inventoryStats.devArea || 1)).toLocaleString()}
                        </div>
                      </div>
                      <div className="tactical-card col-4" style={{ background: 'var(--bg-canvas)', borderRight: '2px solid var(--accent)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הכנסה למ"ר יזם</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(inventoryStats.devValueExclVat / (inventoryStats.devArea || 1)).toLocaleString()}
                        </div>
                      </div>
                      <div className="tactical-card col-4" style={{ background: 'var(--bg-canvas)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>רווח למ"ר יזם</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(totalProfit / (inventoryStats.devArea || 1)).toLocaleString()}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="table-container" style={{ marginTop: 0 }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-sharp)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Activity size={18} color="var(--accent)" />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>מטריצת רגישות רווח (₪)</h3>
                </div>
                <div style={{ overflowX: 'auto', padding: '1rem' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: '4px' }}>
                    <thead>
                      <tr>
                        <th style={{ background: 'transparent', border: 'none' }}></th>
                        {[-0.1, -0.05, 0, 0.05, 0.1].map(pct => (
                          <th key={pct} style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sharp)', fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-sec)' }}>{(pct * 100).toFixed(0)}% הוצאות</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[0.1, 0.05, 0, -0.05, -0.1].map(revPct => (
                        <tr key={revPct}>
                          <td style={{ padding: '8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sharp)', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center', color: 'var(--text-sec)' }}>{(revPct * 100).toFixed(0)}% הכנסות</td>
                          {[-0.1, -0.05, 0, 0.05, 0.1].map(costPct => {
                            const pRev = inventoryStats.devValueExclVat * (1 + revPct);
                            const pCost = budgetStats.grandTotal * (1 + costPct);
                            const pProfit = Math.round(pRev - pCost);
                            return (
                              <td key={costPct} className="mono-number" style={{ 
                                padding: '10px', textAlign: 'center', borderRadius: 'var(--radius-sharp)', fontSize: '0.8rem', fontWeight: 700,
                                background: pProfit > 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                color: pProfit > 0 ? 'var(--accent)' : 'var(--danger)',
                                border: revPct === 0 && costPct === 0 ? '1px solid var(--accent)' : '1px solid var(--border-sharp)'
                              }}>{pProfit.toLocaleString()}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monte Carlo Simulation Section */}
              <div className="table-container" style={{ marginTop: '1.5rem', border: '1px solid var(--border-sharp)', background: 'var(--bg-surface)' }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-sharp)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ניתוח רגישות רב-משתנית (Monte Carlo)</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={runProjectSimulation}
                      disabled={isSimulating}
                      className="primary"
                      style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
                    >
                      {isSimulating ? 'מחשב תרחישים...' : 'הרץ סימולציה (1,000 תרחישים)'}
                    </button>
                  </div>
                </div>

                <div className="bento-grid" style={{ padding: '1.5rem' }}>
                  {/* MC Controls */}
                  <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid var(--border-sharp)', paddingLeft: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.5rem' }}>הגדרת וולטיליות (סטיית תקן)</h4>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>עלויות בניה</label>
                        <span className="mono-number" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{mcConfig.costVol}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="20" step="0.5" 
                        value={mcConfig.costVol} 
                        onChange={(e) => setMcConfig({...mcConfig, costVol: parseFloat(e.target.value)})}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מחיר מכירה ממוצע</label>
                        <span className="mono-number" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{mcConfig.revVol}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="30" step="0.5" 
                        value={mcConfig.revVol} 
                        onChange={(e) => setMcConfig({...mcConfig, revVol: parseFloat(e.target.value)})}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ריבית מימון (סטייה ב-%)</label>
                        <span className="mono-number" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{mcConfig.interestVol}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="5" step="0.1" 
                        value={mcConfig.interestVol} 
                        onChange={(e) => setMcConfig({...mcConfig, interestVol: parseFloat(e.target.value)})}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>

                  {/* MC Results Visuals */}
                  <div className="col-8">
                    {!mcResults ? (
                      <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sharp)', border: '1px dashed var(--border-sharp)', color: 'var(--text-muted)' }}>
                        <BarChart2 size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p style={{ fontSize: '0.85rem' }}>לחץ על "הרץ סימולציה" כדי לראות את התפלגות הרווחיות</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Histogram SVG */}
                        <div style={{ background: 'var(--bg-canvas)', padding: '1rem', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border-sharp)' }}>
                          <h4 style={{ fontSize: '0.7rem', color: 'var(--text-sec)', marginBottom: '1rem', textAlign: 'center' }}>התפלגות רווח יזמי חזוי (₪)</h4>
                          <div style={{ height: '140px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                            {(() => {
                              const profits = mcResults.raw.map(r => r.profit);
                              const min = Math.min(...profits);
                              const max = Math.max(...profits);
                              const binCount = 40;
                              const binWidth = (max - min) / binCount;
                              const bins = Array(binCount).fill(0);
                              
                              profits.forEach(p => {
                                const binIdx = Math.min(binCount - 1, Math.floor((p - min) / binWidth));
                                bins[binIdx]++;
                              });
                              
                              const maxBin = Math.max(...bins);
                              const currentProfit = Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal;

                              return bins.map((count, i) => {
                                const binCenter = min + (i + 0.5) * binWidth;
                                const height = (count / maxBin) * 100;
                                const isPositive = binCenter > 0;
                                const isBaseline = Math.abs(binCenter - currentProfit) < binWidth;

                                return (
                                  <div 
                                    key={i} 
                                    title={`רווח: ₪${Math.round(binCenter).toLocaleString()}\nשכיחות: ${count}`}
                                    style={{ 
                                      flex: 1, 
                                      height: `${height}%`, 
                                      background: isBaseline ? 'var(--accent)' : (isPositive ? 'var(--success)' : 'var(--danger)'),
                                      opacity: isBaseline ? 1 : 0.6,
                                      borderRadius: '1px 1px 0 0'
                                    }} 
                                  />
                                );
                              });
                            })()}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                            <span className="mono-number">₪{Math.round(Math.min(...mcResults.raw.map(r=>r.profit))).toLocaleString()}</span>
                            <span className="mono-number">₪{Math.round(Math.max(...mcResults.raw.map(r=>r.profit))).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Summary Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                          <div className="tactical-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>רווח ממוצע (Mean)</span>
                            <div className="mono-number" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-pri)' }}>
                              ₪{Math.round(mcResults.stats.meanProfit).toLocaleString()}
                            </div>
                          </div>
                          <div className="tactical-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>הסתברות להפסד</span>
                            <div className="mono-number" style={{ fontSize: '0.9rem', fontWeight: 700, color: mcResults.stats.probLoss > 10 ? 'var(--danger)' : 'var(--success)' }}>
                              {mcResults.stats.probLoss.toFixed(1)}%
                            </div>
                          </div>
                          <div className="tactical-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Worst Case (P5)</span>
                            <div className="mono-number" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)' }}>
                              ₪{Math.round(mcResults.stats.p5).toLocaleString()}
                            </div>
                          </div>
                          <div className="tactical-card" style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Median (P50)</span>
                            <div className="mono-number" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                              ₪{Math.round(mcResults.stats.p50).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'cashflow' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Cash Flow Dashboard - Bento Grid */}
              <div className="bento-grid">
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הון עצמי נדרש ({equityPercent}%)</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.4rem 0' }}>
                    ₪{Math.round(cashFlowStats.equityAmount).toLocaleString()}
                  </div>
                  <div style={{ marginTop: '0.8rem' }}>
                    <input type="range" min="0" max="100" value={equityPercent} onChange={(e) => updateProject({ equityPercent: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--accent)' }} />
                  </div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>זמן בנייה (חודשים)</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.4rem 0' }}>
                    {constructionMonths} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>חודשים</span>
                  </div>
                  <div style={{ marginTop: '0.8rem' }}>
                    <input type="number" value={constructionMonths} onChange={(e) => updateProject({ constructionMonths: Number(e.target.value) })} style={{ width: '100%', background: 'var(--bg-canvas)' }} />
                  </div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>מימון נדרש</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.4rem 0' }}>
                    ₪{(budgetStats.grandTotal - cashFlowStats.equityAmount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(100 - equityPercent)}% מימון חיצוני</div>
                </div>
                <div className="tactical-card col-3" style={{ borderLeft: '2px solid var(--accent)' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>📅 תאריך התחלה צפוי</span>
                  <div style={{ marginTop: '0.8rem' }}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => updateProject({ startDate: e.target.value })}
                      style={{ 
                        background: 'var(--bg-canvas)', 
                        color: 'var(--text-pri)', 
                        border: '1px solid var(--border-sharp)',
                        width: '100%',
                        padding: '4px 8px',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  {startDate && (() => {
                    const end = new Date(startDate);
                    end.setMonth(end.getMonth() + constructionMonths);
                    return <div className="success-text" style={{ fontSize: '0.7rem', marginTop: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>🏁 יעד: {end.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</div>;
                  })()}
                </div>
              </div>

              {/* Sales Inputs - Tactical Card */}
              <div className="table-container" style={{ marginTop: 0 }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-sharp)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ניהול מכירות</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ 
                      background: 'var(--bg-canvas)', 
                      padding: '2px 10px', 
                      borderRadius: '2px', 
                      border: '1px solid var(--border-sharp)',
                      color: inventoryStats.devUnits - salesData.reduce((s,v)=>s+v,0) >= 0 ? 'var(--accent)' : 'var(--danger)',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      ממתין: {inventoryStats.devUnits - salesData.reduce((s,v)=>s+v,0)} יח"ד
                    </div>
                    <div style={{ background: 'var(--bg-canvas)', padding: '2px 10px', borderRadius: '2px', border: '1px solid var(--border-sharp)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      ערך ממוצע: <span className="mono-number" style={{ color: 'var(--text-pri)' }}>₪{Math.round(cashFlowStats.avgDevPrice).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-sec)' }}>פירוט מכירות חודשי (יחידות):</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {salesData.map((units, i) => (
                          <div key={i} style={{ width: '70px' }}>
                            <div className="mono-number" style={{ fontSize: '10px', marginBottom: '4px', color: 'var(--text-muted)' }}>M{i*2+1}-{i*2+2}</div>
                            <input 
                              type="number" 
                              value={units} 
                              onChange={(e) => {
                                const totalAssignedExcludingCurrent = salesData.reduce((s, v, idx) => idx === i ? s : s + v, 0);
                                const remaining = inventoryStats.devUnits - totalAssignedExcludingCurrent;
                                const newVal = Math.max(0, Math.min(Number(e.target.value), remaining));
                                const newData = [...salesData];
                                newData[i] = newVal;
                                updateProject({ salesData: newData });
                              }} 
                              style={{ width: '100%', background: 'var(--bg-canvas)', padding: '2px 6px', fontSize: '0.85rem' }}
                              min="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-sec)' }}>תנאי תשלום 20/80 (% יח"ד):</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={p2080Percent} 
                          onChange={(e) => updateProject({ p2080Percent: Number(e.target.value) })} 
                          style={{ flex: 1, accentColor: 'var(--accent)' }} 
                        />
                        <span className="mono-number" style={{ fontWeight: 700, width: '45px' }}>{p2080Percent}%</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        יתרה ({100-p2080Percent}%) מחולקת ל-5 תשלומים שווים.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Flow Charts - Tactical */}
              <div className="table-container" style={{ marginTop: 0 }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-sharp)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>דינמיקת תזרים מזומנים</h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.7rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '1px' }}></div>
                      <span style={{ color: 'var(--text-sec)' }}>הוצאות</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '1px' }}></div>
                      <span style={{ color: 'var(--text-sec)' }}>הכנסות</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '12px', height: '3px', background: 'var(--warning)', borderRadius: '1px' }}></div>
                      <span style={{ color: 'var(--text-sec)' }}>יתרת מזומן מצטברת</span>
                    </div>
                  </div>
                </div>

                <div 
                  style={{ background: 'var(--bg-canvas)', padding: '2rem 1rem', borderRadius: '0', position: 'relative' }}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <div dir="ltr" style={{ height: '350px', width: '100%', position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="-80 0 1080 350" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Scales and Constants */}
                      {(() => {
                        const chartHeight = 280;
                        const topPadding = 30;
                        const bottomPadding = 40;
                        const totalHeight = 350;
                        
                        const maxMonthly = Math.max(...cashFlowStats.data.map(d => Math.max(d.cost, d.revenue, d.equity || 0)), 1);
                        const balances = cashFlowStats.data.map(d => d.revCumulative - d.cumulative);
                        const minBalActual = Math.min(...balances, 0);
                        const maxBalActual = Math.max(...balances, 1);
                        
                        // Use a symmetric range for the balance line so 0 is in the middle
                        const maxAbsBal = Math.max(Math.abs(minBalActual), Math.abs(maxBalActual));
                        const minBal = -maxAbsBal;
                        const maxBal = maxAbsBal;
                        const balRange = maxBal - minBal || 1;
                        
                        const getBalY = (val) => {
                          const p = (val - minBal) / balRange;
                          return (topPadding + 20) + (chartHeight - 40) * (1 - p);
                        };

                        const zeroY = getBalY(0); // Now dynamically matches the balance "zero"
                        const getMonthY = (val) => (val / maxMonthly) * 110; // Monthly bars height
                        
                        const barContainerWidth = 1000 / cashFlowStats.data.length;
                        const barWidth = barContainerWidth * 0.35;

                        // Helper for Y axis labels
                        const formatYLabel = (val) => {
                          const absVal = Math.abs(val);
                          if (absVal >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                          if (absVal >= 1000) return (val / 1000).toFixed(0) + 'k';
                          return val.toString();
                        };

                        return (
                          <>
                            <defs>
                              <linearGradient id="negGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {/* Negative Zone Highlight */}
                            <rect 
                              x="0" y={getBalY(0)} 
                              width="1000" height={getBalY(minBal) - getBalY(0)} 
                              className="negative-zone"
                            />
                            
                            {/* Y Axis Line */}
                            <line 
                              x1="0" y1={topPadding} 
                              x2="0" y2={totalHeight - bottomPadding} 
                              stroke="#cbd5e1" strokeWidth="1" 
                            />

                            {/* Grid Lines and Y Axis Labels */}
                            {[0, 0.25, 0.5, 0.75, 1].map(p => {
                              const val = minBal + p * balRange;
                              const y = getBalY(val);
                              return (
                                <g key={p}>
                                  <line 
                                    x1="0" y1={y} 
                                    x2="1000" y2={y} 
                                    stroke="#e2e8f0" strokeDasharray="4" 
                                  />
                                  <text 
                                    x="-10" y={y + 4} 
                                    textAnchor="end" 
                                    className="chart-axis-label" 
                                    style={{ fontSize: '11px', fill: '#64748b' }}
                                  >
                                    {formatYLabel(val)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Monthly Flow Zero Line */}
                            <line 
                              x1="0" y1={zeroY} 
                              x2="1000" y2={zeroY} 
                              stroke="#64748b" strokeWidth="1" strokeOpacity="0.3" 
                            />

                            {/* Data Points */}
                            {cashFlowStats.data.map((d, i) => {
                              const xBase = i * barContainerWidth;
                              const currentBalance = d.revCumulative - d.cumulative;
                              const isHovered = hoveredMonth === i;

                              return (
                                <g 
                                  key={`mo-${i}`} 
                                  onMouseEnter={() => setHoveredMonth(i)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {/* Interaction Area */}
                                  <rect 
                                    x={xBase} y="0" 
                                    width={barContainerWidth} height="350" 
                                    fill={isHovered ? "rgba(59, 130, 246, 0.03)" : "transparent"} 
                                  />

                                  {/* Expense Bar (Down from Zero) */}
                                  <rect 
                                    x={xBase + barContainerWidth * 0.1} 
                                    y={zeroY} 
                                    width={barWidth} 
                                    height={getMonthY(d.cost)} 
                                    fill="var(--danger)"
                                    rx="2"
                                  />

                                  {/* Income Bar (Up from Zero) */}
                                  <rect 
                                    x={xBase + barContainerWidth * 0.1 + barWidth + 2} 
                                    y={zeroY - getMonthY(d.revenue)} 
                                    width={barWidth} 
                                    height={getMonthY(d.revenue)} 
                                    fill="var(--success)"
                                    rx="2"
                                  />

                                  {/* Equity Injection Bar (Up from Zero, Month 1 only) */}
                                  {d.equity > 0 && (
                                    <rect 
                                      x={xBase + barContainerWidth * 0.1 + (barWidth + 2) * 2} 
                                      y={zeroY - getMonthY(d.equity)} 
                                      width={barWidth} 
                                      height={getMonthY(d.equity)} 
                                      fill="var(--accent)"
                                      rx="2"
                                    />
                                  )}

                                  {/* Month Label */}
                                  <text 
                                    x={xBase + barContainerWidth/2} y={totalHeight - 10} 
                                    textAnchor="middle" 
                                    className="chart-axis-label"
                                    style={{ fontWeight: isHovered ? 700 : 400 }}
                                  >
                                    חודש {d.month}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Cumulative Balance Path */}
                            <path
                              d={cashFlowStats.data.map((d, i) => {
                                const x = (i * barContainerWidth) + (barContainerWidth / 2);
                                const y = getBalY(d.revCumulative - d.cumulative);
                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ')}
                              className="balance-line"
                            />

                            {/* Balance Dots */}
                            {cashFlowStats.data.map((d, i) => {
                              const x = (i * barContainerWidth) + (barContainerWidth / 2);
                              const balance = d.revCumulative - d.cumulative;
                              const y = getBalY(balance);
                              return (
                                <circle 
                                  key={`dot-${i}`} 
                                  cx={x} cy={y} 
                                  r={hoveredMonth === i ? "6" : "4"} 
                                  fill={balance < 0 ? "var(--danger)" : "var(--accent)"} 
                                  stroke="white" 
                                  strokeWidth="2" 
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Tooltip Overlay */}
                    {hoveredMonth !== null && cashFlowStats.data[hoveredMonth] && (() => {
                      const d = cashFlowStats.data[hoveredMonth];
                      const balance = d.revCumulative - d.cumulative;
                      const barContainerWidth = 1000 / cashFlowStats.data.length;
                      // Calculate position based on percentage width of container
                      const leftPos = (hoveredMonth * barContainerWidth) / 10; 
                      
                      return (
                        <div 
                          className="chart-tooltip" 
                          style={{ 
                            left: `${Math.min(leftPos, 80)}%`, 
                            top: '20px',
                            opacity: 1
                          }}
                        >
                          <div style={{ fontWeight: 700, borderBottom: '1px solid #e2e8f0', marginBottom: '8px', paddingBottom: '4px' }}>
                            חודש {d.month}
                          </div>
                          <div className="chart-tooltip-row">
                            <span className="chart-tooltip-label">הוצאה חודשית:</span>
                            <span className="chart-tooltip-value">{Math.round(d.cost).toLocaleString()} ₪</span>
                          </div>
                          {d.equity > 0 && (
                            <div className="chart-tooltip-row">
                              <span className="chart-tooltip-label">הזרמת הון עצמי:</span>
                              <span className="chart-tooltip-value" style={{ color: '#3b82f6' }}>{Math.round(d.equity).toLocaleString()} ₪</span>
                            </div>
                          )}
                          <div className="chart-tooltip-row">
                            <span className="chart-tooltip-label">הכנסה חודשית:</span>
                            <span className="chart-tooltip-value" style={{ color: '#059669' }}>{Math.round(d.revenue).toLocaleString()} ₪</span>
                          </div>
                          <div className="chart-tooltip-row" style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                            <span className="chart-tooltip-label">מאזן מצטבר:</span>
                            <span className="chart-tooltip-value" style={{ color: balance < 0 ? '#ef4444' : '#f59e0b' }}>
                              {Math.round(balance).toLocaleString()} ₪
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="bento-grid" style={{ marginTop: '0' }}>
                     <div className="tactical-card col-4">
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>חשיפה מקסימלית (חודש {cashFlowStats.data.reduce((max, d, i, arr) => (arr[i].revCumulative - arr[i].cumulative) < (arr[max].revCumulative - arr[max].cumulative) ? i : max, 0) + 1})</span>
                      <div className="mono-number danger-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>
                        ₪{Math.abs(Math.min(...cashFlowStats.data.map(d => d.revCumulative - d.cumulative))).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מסגרת הון חוזר מקסימלית נדרשת.</div>
                    </div>
                    <div className="tactical-card col-4">
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>החזר הון עצמי</span>
                      <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>
                        ₪{(cashFlowStats.data[cashFlowStats.data.length - 1].revCumulative - cashFlowStats.data[cashFlowStats.data.length - 1].cumulative).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>תזרים מזומנים נקי לאחר סיום הבנייה.</div>
                    </div>
                    <div className="tactical-card col-4">
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>קצב הזרמת הון חודשי</span>
                      <div className="mono-number" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>
                        ₪{Math.round(cashFlowStats.equityAmount / constructionMonths).toLocaleString()}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/לחודש</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>קצב פריסה ממוצע נדרש.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'planning' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="bento-grid">
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>סה"כ שטח עילי</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{planningStats.aboveGroundArea.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מתוך תקציב (סעיף 3-4)</div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>סה"כ שטח תת קרקעי</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{planningStats.undergroundArea.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מתוך תקציב (סעיף 3-3)</div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>סה"כ שטחי דירות</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{planningStats.totalApartmentArea.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>סיכום כלל הדירות (נטו)</div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>שטחי דירות יזם</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{planningStats.devApartmentArea.toLocaleString()}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>סיכום דירות יזם בלבד (נטו)</div>
                </div>

                <div className="tactical-card col-6" style={{ borderLeft: '3px solid var(--accent)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-sec)' }}>יחס שטחים לשטח עילי (Gross vs Net)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>יחס סה"כ דירות לשטח עילי</span>
                      <div className="mono-number" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{(planningStats.totalEfficiencyAG * 100).toFixed(1)}%</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>יעילות פרויקטאלית כוללת</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>יחס דירות יזם לשטח עילי</span>
                      <div className="mono-number" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{(planningStats.devEfficiencyAG * 100).toFixed(1)}%</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>אחוז שגשוג (שטח מכיר) מעל הקרקע</div>
                    </div>
                  </div>
                </div>

                <div className="tactical-card col-6" style={{ borderLeft: '3px solid var(--success)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-sec)' }}>יחס שטחים לסה"כ שטח בניה</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>יחס סה"כ דירות לכלל הבניה</span>
                      <div className="mono-number" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{(planningStats.totalEfficiencyTotal * 100).toFixed(1)}%</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>יחס נטו/ברוטו כולל פרויקט</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>יחס דירות יזם לכלל הבניה</span>
                      <div className="mono-number" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{(planningStats.devEfficiencyTotal * 100).toFixed(1)}%</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>ניצולת מכירה מכלל המעטפת</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'portfolio' ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
                {/* Portfolio Summary Dashboard */}
                <div className="bento-grid">
                  {(() => {
                    const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0);
                    const tR=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0);
                    const tP=allProjectsKPIs.reduce((s,p)=>s+p.profit,0);
                    const tE=allProjectsKPIs.reduce((s,p)=>s+p.equity,0);
                    const avgPct=tC>0?(tP/tC*100):0;
                    const validIRR=allProjectsKPIs.filter(p=>p.irr!=null);
                    const avgIRR=validIRR.length>0?validIRR.reduce((s,p)=>s+p.irr,0)/validIRR.length:null;
                    
                    const fmtM = v => {
                      const m = Math.abs(v)/1e6;
                      const s = v < 0 ? '-' : '';
                      return s + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + 'M';
                    };

                    return (
                      <>
                        <div className="tactical-card col-3">
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>חשיפת פורטפוליו</span>
                          <div className="mono-number" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>₪{fmtM(tC)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>תחזית מצטברת עבור {projects.length} מודלים פעילים.</div>
                        </div>
                        <div className="tactical-card col-3" style={{ borderLeft: '2px solid var(--accent)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>רווח משוער</span>
                          <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>₪{fmtM(tP)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>יעד רווחיות ממוצע של {avgPct.toFixed(1)}%.</div>
                        </div>
                        <div className="tactical-card col-3">
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הון עצמי מושקע</span>
                          <div className="mono-number" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>₪{fmtM(tE)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(tE/tC*100).toFixed(0)}% מינוף פורטפוליו.</div>
                        </div>
                        <div className="tactical-card col-3">
                          <span 
                            style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}
                            data-tooltip="שיעור התשואה הפנימי הממוצע של כלל הפרויקטים (Internal Rate of Return). המדד המרכזי שבוחן את רווחיות הפורטפוליו לאורך זמן וביחס לסיכון."
                          >
                            IRR פורטפוליו <Info size={10} />
                          </span>
                          <div className="mono-number success-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>{avgIRR ? avgIRR.toFixed(1)+'%' : 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>יעד מנהלים: {'>'}18%.</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Project Comparison Console */}
                <div className="table-container">
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-sharp)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>מטריצת השוואת פורטפוליו</h3>
                      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-canvas)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                        <button 
                          onClick={() => setPortfolioCompareMode('financial')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            background: portfolioCompareMode === 'financial' ? 'var(--accent)' : 'transparent',
                            color: portfolioCompareMode === 'financial' ? '#fff' : 'var(--text-sec)',
                            transition: 'all 0.2s'
                          }}
                        >
                          כלכלי
                        </button>
                        <button 
                          onClick={() => setPortfolioCompareMode('planning')}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            background: portfolioCompareMode === 'planning' ? 'var(--accent)' : 'transparent',
                            color: portfolioCompareMode === 'planning' ? '#fff' : 'var(--text-sec)',
                            transition: 'all 0.2s'
                          }}
                        >
                          תכנוני
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>N = {projects.length} פרויקטים</div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'var(--bg-canvas)', color:'var(--text-sec)', fontSize:'0.65rem', textTransform:'uppercase' }}>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>פרויקט</th>
                          {portfolioCompareMode === 'financial' ? (
                            <>
                              <th style={{ padding:'10px 16px', textAlign:'center', borderBottom:'1px solid var(--border-sharp)' }}>יח' (יזם)</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>עלות</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)', fontSize:'0.55rem', opacity:0.8 }}>הוצ/מ"ר</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>הכנסה</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)', fontSize:'0.55rem', opacity:0.8 }}>הכנסה/מ"ר</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>רווח</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>רווחיות</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>הון עצמי</th>
                              <th 
                                style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}
                                data-tooltip="ROE (Return on Equity): היחס בין הרווח הנקי להון העצמי שהושקע."
                              >
                                ROE <Info size={10} />
                              </th>
                              <th 
                                style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}
                                data-tooltip="IRR (Internal Rate of Return): שיעור התשואה השנתי הממוצע של הפרויקט בהתבסס על תזרימי המזומנים."
                              >
                                IRR <Info size={10} />
                              </th>
                            </>
                          ) : (
                            <>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>שטח עילי (מ"ר)</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>תת-קרקעי</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>שטח דירות</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>שטח יזם</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>יעילות עילי</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>יעילות יזם/עילי</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>יעילות פרויקט</th>
                              <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>יעילות יזם</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="tactical-table">
                        {allProjectsKPIs.map((kpi,i)=>{
                          const col = PROJ_COLORS[kpi.colorIdx % PROJ_COLORS.length];
                          const fmtM = v => { 
                            const m = Math.abs(v)/1e6; 
                            const s = v < 0 ? '-' : ''; 
                            return s + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + 'M'; 
                          };
                          return (
                            <tr key={kpi.id} onClick={()=>{ setActiveProjectId(kpi.id); setActiveTab('budget'); }} style={{ cursor:'pointer' }}>
                              <td style={{ padding:'12px 16px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                  <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:col }}/>
                                  <span style={{ fontWeight: 700 }}>{kpi.name}</span>
                                </div>
                              </td>
                              {portfolioCompareMode === 'financial' ? (
                                <>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'center' }}>{kpi.totalUnits} ({Math.round(kpi.devUnits)})</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{fmtM(kpi.totalCost)}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{kpi.devArea > 0 ? Math.round(kpi.totalCost / kpi.devArea).toLocaleString() : '—'}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', color:'var(--accent)' }}>{fmtM(kpi.revenue)}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{kpi.devArea > 0 ? Math.round(kpi.revenue / kpi.devArea).toLocaleString() : '—'}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontWeight:700, color: kpi.profit >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{fmtM(kpi.profit)}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', background: kpi.profitPct >= 20 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: kpi.profitPct >= 20 ? 'var(--accent)' : 'var(--danger)' }}>
                                      {kpi.profitPct.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{fmtM(kpi.equity)}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontWeight: 700 }}>{kpi.annualRoe.toFixed(1)}%</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', color: 'var(--accent)', fontWeight: 800 }}>{kpi.irr != null ? kpi.irr.toFixed(1) + '%' : '—'}</td>
                                </>
                              ) : (
                                <>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{kpi.planning.ag.toLocaleString()}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{kpi.planning.ug.toLocaleString()}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{kpi.planning.taa.toLocaleString()}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', color:'var(--accent)' }}>{kpi.planning.daa.toLocaleString()}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{(kpi.planning.totalEffAG * 100).toFixed(1)}%</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontWeight:700, color:'var(--accent)' }}>{(kpi.planning.devEffAG * 100).toFixed(1)}%</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{(kpi.planning.totalEffTotal * 100).toFixed(1)}%</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontWeight:700 }}>{(kpi.planning.devEffTotal * 100).toFixed(1)}%</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:'var(--bg-canvas)', fontWeight:800, color:'var(--text-pri)' }}>
                          <td style={{ padding:'12px 16px' }}>סה"כ פורטפוליו</td>
                          {portfolioCompareMode === 'financial' ? (
                            <>
                              <td></td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{(()=> { const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); const tA=allProjectsKPIs.reduce((s,p)=>s+p.devArea,0); return tA > 0 ? Math.round(tC/tA).toLocaleString() : '—'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{(()=> { const tR=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0); const tA=allProjectsKPIs.reduce((s,p)=>s+p.devArea,0); return tA > 0 ? Math.round(tR/tA).toLocaleString() : '—'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.profit,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); const tP=allProjectsKPIs.reduce((s,p)=>s+p.profit,0); return (tP/tC*100).toFixed(1)+'%'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.equity,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td colSpan={2}></td>
                            </>
                          ) : (
                            <>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); return t.toLocaleString(); })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.planning.ug,0); return t.toLocaleString(); })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.planning.taa,0); return t.toLocaleString(); })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.planning.daa,0); return t.toLocaleString(); })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { 
                                const tAG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); 
                                const tTAA=allProjectsKPIs.reduce((s,p)=>s+p.planning.taa,0); 
                                return tAG > 0 ? (tTAA/tAG*100).toFixed(1)+'%' : '—'; 
                              })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { 
                                const tAG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); 
                                const tDAA=allProjectsKPIs.reduce((s,p)=>s+p.planning.daa,0); 
                                return tAG > 0 ? (tDAA/tAG*100).toFixed(1)+'%' : '—'; 
                              })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { 
                                const tAG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); 
                                const tUG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ug,0); 
                                const tTAA=allProjectsKPIs.reduce((s,p)=>s+p.planning.taa,0); 
                                return (tAG+tUG) > 0 ? (tTAA/(tAG+tUG)*100).toFixed(1)+'%' : '—'; 
                              })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { 
                                const tAG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); 
                                const tUG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ug,0); 
                                const tDAA=allProjectsKPIs.reduce((s,p)=>s+p.planning.daa,0); 
                                return (tAG+tUG) > 0 ? (tDAA/(tAG+tUG)*100).toFixed(1)+'%' : '—'; 
                              })()}</td>
                            </>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Portfolio Risk & Sensitivity Analysis */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginTop: '1rem' }}>
                  {/* Portfolio Sensitivity Matrix Row */}
                  <div className="tactical-card" style={{ padding: '1.5rem', background: 'var(--bg-elevated)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>מטריצת רגישות פורטפוליו (Aggregated)</h3>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>השפעת שינויי שוק גלובליים על הרווח הכולל (מיליוני ש"ח)</p>
                      </div>
                      <div style={{ fontSize: '0.65rem', background:'var(--bg-canvas)', padding:'4px 8px', borderRadius:'4px', border:'1px solid var(--border-sharp)', display:'flex', gap:'8px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}><div style={{ width:8, height:8, background:'var(--accent)', borderRadius:2 }}/> רווח</div>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}><div style={{ width:8, height:8, background:'var(--danger)', borderRadius:2 }}/> הפסד</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', textAlign: 'center' }}>
                      {/* Matrix Header (Columns - Cost) */}
                      <div />
                      {[-10, -5, 0, 5, 10].map(c => (
                        <div key={c} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-sec)', paddingBottom: '8px' }}>
                          עלות {c > 0 ? '+' : ''}{c}%
                        </div>
                      ))}

                      {/* Matrix Rows (Revenue) */}
                      {[-10, -5, 0, 5, 10].map((r, rIdx) => (
                        <React.Fragment key={rIdx}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                            הכנסה {r > 0 ? '+' : ''}{r}%
                          </div>
                          {portfolioSensitivityData[rIdx].map((profit, cIdx) => {
                            const valM = profit / 1e6;
                            const isLoss = valM < 0;
                            const baseProfit = portfolioSensitivityData[2][2];
                            const ratio = profit / (Math.abs(baseProfit) || 1);
                            const opacity = Math.min(1, Math.max(0.1, Math.abs(ratio) * 0.5));
                            
                            return (
                              <div 
                                key={cIdx} 
                                style={{ 
                                  background: isLoss ? `rgba(239, 68, 68, ${opacity})` : `rgba(16, 185, 129, ${opacity})`,
                                  color: '#fff',
                                  padding: '12px 4px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  border: r === 0 && ([-10, -5, 0, 5, 10])[cIdx] === 0 ? '2px solid #fff' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative'
                                }}
                              >
                                {valM.toFixed(1)}M
                                {r === 0 && ([-10, -5, 0, 5, 10])[cIdx] === 0 && (
                                  <div style={{ position:'absolute', top:-12, fontSize:'0.5rem', fontWeight:400, color:'var(--text-muted)' }}>PROJECTED</div>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Monte Carlo Simulation UI */}
                  <div className="tactical-card" style={{ padding: '1.5rem', background: 'var(--bg-elevated)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>סימולציית מונטה-קרלו (פורטפוליו)</h3>
                      <button 
                        onClick={runPortfolioSimulation}
                        disabled={isPortfolioSimulating}
                        className="tactical-button"
                        style={{ padding: '6px 14px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}
                      >
                        {isPortfolioSimulating ? <Loader size={12} className="spin" /> : <Zap size={12} />}
                        {isPortfolioSimulating ? 'מעבד...' : 'הרץ סימולציה (1,000 תרחישים)'}
                      </button>
                    </div>

                    {!portfolioMcResults ? (
                      <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-sharp)', borderRadius: '8px', background: 'var(--bg-canvas)' }}>
                        <ShieldAlert size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)' }}>טרם הורצה סימולציה עבור הפורטפוליו המצטבר.</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>הרץ סימולציה לבדיקת התפלגות רווחים בשינויי שוק קורלטיביים.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                          <div style={{ background: 'var(--bg-canvas)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>תוחלת רווח (Mean)</span>
                            <div className="mono-number" style={{ fontSize: '1rem', fontWeight: 800, marginTop: '4px', color:'var(--accent)' }}>₪{(portfolioMcResults.stats.meanProfit/1e6).toFixed(1)}M</div>
                          </div>
                          <div style={{ background: 'var(--bg-canvas)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>סיכון קצה (P5)</span>
                            <div className="mono-number" style={{ fontSize: '1rem', fontWeight: 800, marginTop: '4px', color:'var(--danger)' }}>₪{(portfolioMcResults.stats.p5/1e6).toFixed(1)}M</div>
                          </div>
                          <div style={{ background: 'var(--bg-canvas)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>חציון (P50)</span>
                            <div className="mono-number" style={{ fontSize: '1rem', fontWeight: 800, marginTop: '4px' }}>₪{(portfolioMcResults.stats.p50/1e6).toFixed(1)}M</div>
                          </div>
                          <div style={{ background: 'var(--bg-canvas)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הסתברות להפסד</span>
                            <div className="mono-number" style={{ fontSize: '1rem', fontWeight: 800, marginTop: '4px', color: portfolioMcResults.stats.probLoss > 5 ? 'var(--danger)' : 'var(--text-pri)' }}>{portfolioMcResults.stats.probLoss.toFixed(1)}%</div>
                          </div>
                        </div>

                        <div style={{ height: '140px', background: 'var(--bg-canvas)', borderRadius: '8px', border: '1px solid var(--border-sharp)', display: 'flex', alignItems: 'flex-end', padding: '10px 15px', gap: '3px', position: 'relative' }}>
                          {(() => {
                            const numBins = 30;
                            const profits = portfolioMcResults.raw.map(r => r.profit);
                            const min = Math.min(...profits);
                            const max = Math.max(...profits);
                            const range = max - min;
                            const bins = Array(numBins).fill(0);
                            
                            profits.forEach(p => {
                              const bIdx = Math.min(numBins - 1, Math.floor(((p - min) / (range || 1)) * numBins));
                              bins[bIdx]++;
                            });
                            
                            const maxCount = Math.max(...bins) || 1;
                            
                            return bins.map((count, i) => {
                              const binValue = min + (i / numBins) * range;
                              const height = (count / maxCount) * 100;
                              return (
                                <div 
                                  key={i} 
                                  style={{ 
                                    flex: 1, 
                                    height: `${height}%`, 
                                    background: binValue < 0 ? 'var(--danger)' : 'var(--accent)',
                                    opacity: 0.6 + (height / 250),
                                    borderRadius: '1px 1px 0 0'
                                  }} 
                                />
                              );
                            });
                          })()}
                          <div style={{ position:'absolute', top: 10, left: 15, fontSize: '0.6rem', color: 'var(--text-sec)', fontWeight: 700 }}>התפלגות רווח מוערכת (Portfolio NPV)</div>
                        </div>
                        
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          <Info size={10} style={{ verticalAlign:'middle', marginLeft: '4px' }}/>
                          הסימולציה מניחה מתאם שוק מלא בין הפרויקטים (Correlated Macro Risks).
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          ) : null}
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
        
        [data-tooltip] { position: relative; cursor: help; display: inline-flex; align-items: center; gap: 4px; }
        [data-tooltip]::before {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 14px;
          background: #1e293b;
          color: #f8fafc;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: normal;
          width: 220px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          pointer-events: none;
          text-align: right;
          line-height: 1.5;
          font-weight: 400;
        }
        [data-tooltip]:hover::before {
          opacity: 1;
          visibility: visible;
          bottom: 150%;
        }
      `}</style>
    </div>
  );
};

export default App;
