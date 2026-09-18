import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  PieChart, FileText, Save, Calculator, Building, 
  Activity, ChevronDown, ChevronUp, Plus, Trash, Info, HelpCircle, List, MapPin, LogOut, BarChart2, TrendingUp, Copy, Layers,
  Zap, ShieldAlert, Loader, PlayCircle, Database, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Sliders, GitCompare, Check,
  CheckCircle2, Sparkles, FolderKanban, ChevronLeft, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { MARKET_TRANSACTIONS } from './data/marketData';
import { MarketDataService } from './services/MarketDataService';
import CashflowSCurve from './components/CashflowSCurve';
import MonteCarloFanChart from './components/MonteCarloFanChart';
import BuildingInventoryMatrix from './components/BuildingInventoryMatrix';
import ScenarioComparator from './components/ScenarioComparator';

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
  isCombinationDeal: false,
  combinationLandownerPct: 40,
});

// ─── Project color palette (Modern Teal/Blue/Neutral) ───
const PROJ_COLORS = ['#264653', '#58A6FF', '#3E4A3D', '#F4A261', '#E76F51', '#6B7280', '#2A9D8F', '#8E9AAF'];

// Israel Real Estate Market Volatility Presets (Realistic approximations)
const VOL_PRESETS = {
  '1y': { label: '1Y - שנה (קצר)', revVol: 12, costVol: 8, interestVol: 2.0 },
  '5y': { label: '5Y - 5 שנים (מוניטרי)', revVol: 8, costVol: 5, interestVol: 1.5 },
  '10y': { label: '10Y - 10 שנים (ממוצע)', revVol: 6, costVol: 4, interestVol: 1.2 }
};

// ─── Pure: inventory stats ───
function computeInventoryStats(inventoryData, project) {
  const arr = inventoryData || [];
  const totalUnits = arr.length;
  if (totalUnits === 0) return { totalUnits:0, devUnits:0, ownerUnits:0, devUnitsPct:'0.0', totalArea:0, devArea:0, devAreaPct:'0.0', devValueInclVat:0, devValueExclVat:0, devValuePct:0, ownerValueInclVat:0, totalProjectValue:0, avgPricePerSqm:0, isCombinationDeal:false, combinationLandownerPct:40, combinationDevPct:60 };
  
  const isComb = Boolean(project?.isCombinationDeal);
  const landownerPct = Number(project?.combinationLandownerPct ?? 40);
  const devPct = Math.max(0, Math.min(100, 100 - landownerPct));
  const getShare = (a) => isComb ? devPct : (a.contractorSharePct !== undefined ? a.contractorSharePct : (a.type === 'יזם' ? 100 : 0));

  const devUnits = arr.reduce((s, a) => s + (getShare(a) / 100), 0);
  const ownerUnits = totalUnits - devUnits;
  
  const totalArea = arr.reduce((s, a) => s + a.area, 0);
  const devArea = arr.reduce((s, a) => {
    const share = getShare(a);
    return s + (a.area * share / 100);
  }, 0);
  
  const devValueInclVat = arr.reduce((s, a) => {
    const share = getShare(a);
    return s + (a.price * share / 100);
  }, 0);
  
  const ownerValueInclVat = arr.reduce((s, a) => {
    const share = getShare(a);
    return s + (a.price * (100 - share) / 100);
  }, 0);
  
  const totalValue = arr.reduce((s, a) => s + a.price, 0);
  
  const specialValueInclVat = arr.reduce((s, a) => {
    if (a.category !== 'מיוחדת') return s;
    const share = getShare(a);
    return s + (a.price * share / 100);
  }, 0);

  const specialArea = arr.reduce((s, a) => (a.category === 'מיוחדת' ? s + a.area : s), 0);
  
  const devValueExclVat = devValueInclVat / 1.17;
  const specialValueExclVat = specialValueInclVat / 1.17;

  // New metrics
  const avgAptArea = totalArea / totalUnits;
  const specialAreaPctTotal = totalArea > 0 ? (specialArea / totalArea * 100).toFixed(1) : 0;
  
  const roomGroups = arr.reduce((acc, a) => {
    const r = a.rooms || 0;
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const roomSplit = Object.keys(roomGroups).map(r => {
    const segmentUnits = arr.filter(a => a.rooms === Number(r));
    const segmentArea = segmentUnits.reduce((s, a) => s + a.area, 0);
    const segmentValue = segmentUnits.reduce((s, a) => s + a.price, 0);
    return {
      rooms: r,
      count: roomGroups[r],
      pct: (roomGroups[r] / totalUnits * 100).toFixed(1),
      avgPrice: segmentArea > 0 ? (segmentValue / segmentArea) : 0
    };
  }).sort((a,b) => a.rooms - b.rooms);
  
  return {
    totalUnits, devUnits, ownerUnits, devUnitsPct:(devUnits/totalUnits*100).toFixed(1),
    totalArea, devArea, devAreaPct:(totalArea > 0 ? (devArea/totalArea*100).toFixed(1) : 0),
    avgAptArea, specialAreaPctTotal, roomSplit,
    devValueInclVat, devValueExclVat,
    specialValueExclVat,
    specialValuePct: devValueExclVat > 0 ? (specialValueExclVat / devValueExclVat * 100).toFixed(1) : 0,
    devValuePct: totalValue>0 ? (devValueInclVat/totalValue*100).toFixed(1) : 0,
    ownerValueInclVat, totalProjectValue: totalValue,
    avgPricePerSqm: devArea>0 ? devValueInclVat/devArea : 0,
    totalAvgPricePerSqm: totalArea > 0 ? totalValue / totalArea : 0
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
    const n=(item && item.name) ? item.name.toLowerCase() : '';
    if(n.includes('רכישה')||n.includes('השבחה')||n.includes('קרקע')||n.includes('אגרות')||n.includes('היטלים'))fixedM1+=item.total;
    else if(item && item.id && item.id.startsWith('3-'))constrT+=item.total;
    else linT+=(item ? item.total : 0);
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
  const inv=computeInventoryStats(project.inventoryData, project);
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
    devEffTotal: (ag + ug) > 0 ? (inv.devArea / (ag + ug)) : 0,
    ugToAgRatio: ag > 0 ? (ug / ag) : 0
  };

  const fixedCost = bud.finalSections[0].items.reduce((a,i)=>a+i.total,0);
  const variableCost = Math.max(0, totalCost - (fixedCost + (bud.financing || 0)));
  const financing = bud.financing || 0;

  return{totalCost,fixedCost,variableCost,financing,revenue,profit,profitPct,equity,roe,annualRoe,irr,risk,equityExposure,maxExposure,months,devUnits:inv.devUnits,totalUnits:inv.totalUnits,devArea:inv.devArea,totalArea:inv.totalArea,totalAvgPricePerSqm:inv.totalAvgPricePerSqm,constructionMonths:project.constructionMonths??24,financingPercent:project.financingPercent??7,planning};
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

const EXPLANATIONS = {
  'name': {
    title: 'שם הפרויקט',
    desc: 'שם המודל/הפרויקט בפורטפוליו.',
    formula: 'עריכת טקסט חופשית'
  },
  'totalUnits': {
    title: "יחידות (יזם)",
    desc: 'סך כל יחידות הדיור בפרויקט, ובסוגריים מספר היחידות המשויכות לשיווק היזם.',
    formula: 'סך יחידות במלאי (סכום אחוזי השותפות של היזם לכל דירה)'
  },
  'totalCost': {
    title: 'עלות פרויקט',
    desc: 'סך כל עלויות הפרויקט כולל רכישת קרקע, עלויות בנייה ישירות, עלויות עקיפות ועלויות מימון וערבויות.',
    formula: 'עלויות בסיס + סך תקציב מימון (עלויות בסיס כפול אחוז המימון של הפרויקט)'
  },
  'costPerSqm': {
    title: 'עלות למ"ר דירות יזם',
    desc: 'היחס בין סך העלות של הפרויקט לשטח הדירות הנקי המשויך ליזם.',
    formula: 'סך עלות פרויקט / שטח דירות יזם (מ"ר נטו)'
  },
  'revenue': {
    title: 'הכנסה',
    desc: 'סך ההכנסות הצפויות ליזם ממכירת חלקו בדירות במלאי, ללא מע"מ (מחושב לפי הפחתת מע"מ של 17%).',
    formula: 'סך שווי מכירות יזם כולל מע"מ / 1.17'
  },
  'revPerSqm': {
    title: 'הכנסה למ"ר דירות יזם',
    desc: 'היחס בין סך הכנסות היזם (ללא מע"מ) לשטח הדירות הנקי של היזם.',
    formula: 'סך הכנסות יזם ללא מע"מ / שטח דירות יזם (מ"ר נטו)'
  },
  'totalAvgPricePerSqm': {
    title: 'מחיר ממוצע למ"ר',
    desc: 'ממוצע מחיר המכירה למ"ר כולל מע"מ עבור כלל יחידות הדיור בפרויקט.',
    formula: 'סך שווי כלל הדירות (יזם ובעלים) / סך שטח הדירות במלאי'
  },
  'profit': {
    title: 'רווח',
    desc: 'הרווח הנקי הצפוי ליזם מהפרויקט (ללא מע"מ).',
    formula: 'הכנסות יזם (ללא מע"מ) - סך עלות פרויקט'
  },
  'profitPct': {
    title: 'רווחיות',
    desc: 'אחוז הרווח של היזם ביחס לעלויות הכוללות של הפרויקט. יעד הרווחיות המקובל בשוק הוא מעל 15%-20%.',
    formula: '(רווח / סך עלות פרויקט) * 100'
  },
  'equity': {
    title: 'הון עצמי',
    desc: 'סכום ההון העצמי הנדרש להשקעה בפרויקט בהתאם לאחוז שהוגדר מתוך עלויות הפרויקט.',
    formula: 'סך עלות פרויקט * אחוז הון עצמי מוגדר (ברירת מחדל: 30%)'
  },
  'annualRoe': {
    title: 'תשואה שנתית על ההון (Annualized ROE)',
    desc: 'ממוצע התשואה השנתית של ההון העצמי שהושקע לאורך כל תקופת הבנייה והפיתוח.',
    formula: '((רווח / הון עצמי) * 100) / (חודשי בנייה / 12)'
  },
  'irr': {
    title: 'שיעור תשואה פנימי (IRR)',
    desc: 'שיעור התשואה הפנימי השנתי של הפרויקט. המדד המרכזי שבוחן את רווחיות ההשקעה לאורך זמן, הלוקח בחשבון את עיתוי זרימת המזומנים (השקעות לעומת תקבולים מרוכשים).',
    formula: 'מחושב באמצעות אלגוריתם Newton-Raphson על תזרים המזומנים החודשי המתוכנן של הפרויקט'
  },
  'planning.ag': {
    title: 'שטח עילי (מ"ר)',
    desc: 'סך שטח הבנייה העילי ברוטו המתוכנן בפרויקט (מתוך סעיף 3-4 בבנייה הישירה בתקציב).',
    formula: 'כמות מוגדרת בסעיף שטח עילי'
  },
  'planning.ug': {
    title: 'שטח תת-קרקעי (מ"ר)',
    desc: 'סך שטח הבנייה התת-קרקעי ברוטו המתוכנן בפרויקט (מתוך סעיף 3-3 בבנייה הישירה בתקציב).',
    formula: 'כמות מוגדרת בסעיף מרתפים/תת-קרקעי'
  },
  'planning.ugToAgRatio': {
    title: 'יחס תת-קרקעי/עילי',
    desc: 'היחס באחוזים בין שטח הבנייה התת-קרקעי לבין שטח הבנייה העילי. מסייע להעריך את מורכבות ועלות הבנייה.',
    formula: '(שטח תת-קרקעי / שטח עילי) * 100'
  },
  'planning.taa': {
    title: 'שטח דירות נטו',
    desc: 'סך כל השטח הנקי (נטו) של כלל הדירות במלאי הפרויקט (דירות יזם ודירות בעלים).',
    formula: 'סכום שטחי הדירות במלאי'
  },
  'planning.daa': {
    title: 'שטח דירות יזם נטו',
    desc: 'סך השטח הנקי (נטו) של הדירות המשווקות על ידי היזם.',
    formula: 'סכום שטחי הדירות במלאי המוכפל בחלק היזם בכל דירה'
  },
  'planning.totalEffAG': {
    title: 'יעילות שטח עילי (נטו/ברוטו עילי)',
    desc: 'יחס היעילות בין שטח הדירות הנקי לבין שטח הבנייה העילי ברוטו. מעיד על ניצול השטח בבניין העילי.',
    formula: '(שטח דירות נטו / שטח עילי ברוטו) * 100'
  },
  'planning.devEffAG': {
    title: 'יעילות יזם לשטח עילי',
    desc: 'היחס בין שטח הדירות של היזם לבין שטח הבנייה העילי ברוטו.',
    formula: '(שטח דירות יזם נטו / שטח עילי ברוטו) * 100'
  },
  'planning.totalEffTotal': {
    title: 'יעילות פרויקט כוללת (נטו/ברוטו כולל)',
    desc: 'יחס היעילות הכולל של הפרויקט – סך שטח הדירות הנקי חלקי סך כל שטח הבנייה (עילי ותת-קרקעי ברוטו).',
    formula: '(שטח דירות נטו / (שטח עילי + שטח תת-קרקעי ברוטו)) * 100'
  },
  'planning.devEffTotal': {
    title: 'יעילות יזם כוללת',
    desc: 'היחס בין שטח הדירות של היזם לבין סך כל שטח הבנייה ברוטו (עילי ותת-קרקעי).',
    formula: '(שטח דירות יזם נטו / (שטח עילי + שטח תת-קרקעי ברוטו)) * 100'
  }
};

const WORKSPACES = [
  {
    id: 'financial',
    label: 'מודל פיננסי',
    icon: Calculator,
    tabs: [
      { id: 'budget', label: 'תקציב והוצאות', icon: Calculator },
      { id: 'profit', label: 'דו"ח רווחיות', icon: Activity },
      { id: 'planning', label: 'נתוני תכנון', icon: FileText }
    ]
  },
  {
    id: 'inventory_hub',
    label: 'מלאי ומרחב',
    icon: Building,
    tabs: [
      { id: 'inventory', label: 'טבלת מלאי', icon: Building },
      { id: 'matrix', label: 'תיאום מרחבי', icon: Layers }
    ]
  },
  {
    id: 'cashflow_risk',
    label: 'תזרים וסיכונים',
    icon: TrendingUp,
    tabs: [
      { id: 'cashflow', label: 'תזרים חודשי', icon: TrendingUp },
      { id: 'scurve', label: 'עקומת S וחשיפה', icon: Sliders },
      { id: 'montecarlo', label: 'מניפת סיכונים', icon: Zap }
    ]
  },
  {
    id: 'strategy',
    label: 'אסטרטגיה ופורטפוליו',
    icon: GitCompare,
    tabs: [
      { id: 'compare', label: 'השוואת תרחישים', icon: GitCompare },
      { id: 'portfolio', label: 'תיק פרויקטים', icon: List }
    ]
  }
];

const App = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('budget');
  const [portfolioCompareMode, setPortfolioCompareMode] = useState('financial');
  const [runtimeError, setRuntimeError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [bulkAdjustmentPct, setBulkAdjustmentPct] = useState(1.0);
  const [toastMessage, setToastMessage] = useState(null);
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all' | 'dev' | 'owner' | 'special'

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);
  
  // Owner <-> Developer Sqm Balancing state
  const [ownerSqmDelta, setOwnerSqmDelta] = useState(5);
  const [ownerSqmMode, setOwnerSqmMode] = useState('per_unit'); // 'per_unit' | 'total'
  const [devTransferRatio, setDevTransferRatio] = useState(80); // percentage (e.g. 80%)
  const [balanceDirectionMode, setBalanceDirectionMode] = useState('tradeoff'); // 'tradeoff' | 'parallel'
  const [updateDevPricesWithSqm, setUpdateDevPricesWithSqm] = useState(true);
  const [isSqmBalanceOpen, setIsSqmBalanceOpen] = useState(true);
  const [sqmBalanceFeedback, setSqmBalanceFeedback] = useState(null);

  const [mcConfig, setMcConfig] = useState({ iterations: 1000, costVol: 8, revVol: 12, interestVol: 2, preset: '1y' });
  const [mcResults, setMcResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [portfolioMcResults, setPortfolioMcResults] = useState(null);
  const [isPortfolioSimulating, setIsPortfolioSimulating] = useState(false);
  
  // Sorting States
  const [portfolioSort, setPortfolioSort] = useState({ key: 'profit', direction: 'desc' });
  const [inventorySort, setInventorySort] = useState({ key: null, direction: 'desc' });
  const [marketSort, setMarketSort] = useState({ key: 'date', direction: 'desc' });
  const [explanationModal, setExplanationModal] = useState(null);

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

  // Market Analysis State (EPHEMERAL UI)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisResult = activeProject?.analysisResult;

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

  const handleManualSave = useCallback(() => {
    saveToFirestore(projects, activeProjectId, activeTab);
    showToast('הנתונים סונכרנו בהצלחה לענן');
  }, [saveToFirestore, projects, activeProjectId, activeTab, showToast]);

  // Global keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  // Workspace Navigation Helpers
  const currentWorkspace = useMemo(() => {
    return WORKSPACES.find(ws => ws.tabs.some(t => t.id === activeTab)) || WORKSPACES[0];
  }, [activeTab]);

  const handleWorkspaceSelect = (wsId) => {
    const targetWs = WORKSPACES.find(w => w.id === wsId);
    if (!targetWs) return;
    if (!targetWs.tabs.some(t => t.id === activeTab)) {
      setActiveTab(targetWs.tabs[0].id);
    }
  };

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

  const inventoryStats = useMemo(() => computeInventoryStats(inventoryData, activeProject), [inventoryData, activeProject]);

  // Filtered & Sorted Inventory Data
  const sortedInventoryData = useMemo(() => {
    let list = inventoryData;
    if (inventoryFilter === 'dev') {
      list = list.filter(a => a.type === 'יזם' || (a.contractorSharePct ?? 0) > 0);
    } else if (inventoryFilter === 'owner') {
      list = list.filter(a => a.type === 'בעלים' || (a.contractorSharePct ?? (a.type === 'יזם' ? 100 : 0)) === 0);
    } else if (inventoryFilter === 'special') {
      list = list.filter(a => a.category === 'מיוחדת');
    }

    if (!inventorySort.key) return list;
    return [...list].sort((a, b) => {
      let vA = inventorySort.key === 'sqmPrice' ? (a.area > 0 ? a.price / a.area : 0) : a[inventorySort.key];
      let vB = inventorySort.key === 'sqmPrice' ? (b.area > 0 ? b.price / b.area : 0) : b[inventorySort.key];
      
      // Numeric conversion if possible
      const nA = parseFloat(vA);
      const nB = parseFloat(vB);
      if (!isNaN(nA) && !isNaN(nB)) {
        vA = nA; vB = nB;
      } else {
        if (typeof vA === 'string') vA = vA.toLowerCase();
        if (typeof vB === 'string') vB = vB.toLowerCase();
      }
      
      if (vA === vB) return 0;
      const res = vA < vB ? -1 : 1;
      return inventorySort.direction === 'asc' ? res : -res;
    });
  }, [inventoryData, inventorySort, inventoryFilter]);

  // Sqm Balancing Preview calculations
  const sqmBalanceStats = useMemo(() => {
    const ownerUnits = inventoryData.filter(a => a.type === 'בעלים' || (a.contractorSharePct ?? (a.type === 'יזם' ? 100 : 0)) === 0);
    const devUnits = inventoryData.filter(a => a.type === 'יזם' || (a.contractorSharePct ?? 0) > 0);
    const delta = Math.abs(Number(ownerSqmDelta) || 0);
    const perOwnerDelta = ownerUnits.length > 0 ? (ownerSqmMode === 'per_unit' ? delta : (delta / ownerUnits.length)) : 0;
    const totalOwnerDelta = perOwnerDelta * ownerUnits.length;
    const ratio = Math.max(0, Number(devTransferRatio) || 0) / 100;
    const totalDevDelta = totalOwnerDelta * ratio;
    const perDevDelta = devUnits.length > 0 ? (totalDevDelta / devUnits.length) : 0;

    return {
      ownerUnitsCount: ownerUnits.length,
      devUnitsCount: devUnits.length,
      perOwnerDelta,
      totalOwnerDelta,
      ratio,
      totalDevDelta,
      perDevDelta
    };
  }, [inventoryData, ownerSqmDelta, ownerSqmMode, devTransferRatio]);

  // Project Reordering Logic
  const moveProject = (index, direction) => {
    const newProjects = [...projects];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newProjects.length) return;
    
    // Swap in the original array
    [newProjects[index], newProjects[targetIndex]] = [newProjects[targetIndex], newProjects[index]];
    setProjects(newProjects);
    
    // Clear sort to see manual order immediately
    setPortfolioSort({ key: null, direction: 'desc' });
  };

  // Market Analysis Logic (High Fidelity - Integration with State/Research)
  const runMarketAnalysis = async () => {
    if (!projectAddress) return;
    setIsAnalyzing(true);
    
    // UI steps for the progress animation
    const steps = [
      "מפענח מרכיבי כתובת...",
      "מתחבר למאגר רשות המיסים...",
      "שולף עסקאות נדל\"ן בזמן אמת...",
      "מנתח מגמות שוק ורמות מחיר...",
      "מחשב פער שוק ומהירות מכירות..."
    ];
    
    // Start analyzing indicator
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
      }
    }, 800);

    try {
      // Step 1: Parse address
      const addressInfo = MarketDataService.parseAddress(projectAddress);
      
      // Step 2 & 3: Fetch from API
      const records = await MarketDataService.fetchTransactions(addressInfo);
      
      // Step 4: Process statistics
      const results = MarketDataService.processResults(records, addressInfo.houseNumber);
      
      // Artificial delay to let the user see the progress steps if API is too fast
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(interval);

      if (results) {
        const marketPrice = results.medianSqm;
        const avgProjectSqm = inventoryStats.avgPricePerSqm;
        const gap = ((avgProjectSqm - marketPrice) / marketPrice) * 100;
        
        let speed = "בינוני";
        if (gap < -8) speed = "מהיר מאוד";
        else if (gap < -2) speed = "מהיר";
        else if (gap > 12) speed = "איטי מאוד";
        else if (gap > 5) speed = "איטי";

        // Enrich with static pipeline data if available (fallback/augmentation)
        const staticData = MARKET_TRANSACTIONS[projectAddress];
        
        updateProject({
          marketSqmPrice: marketPrice,
          analysisResult: {
            neighborhood: results.neighborhood,
            speed,
            gap: gap.toFixed(1),
            lastScan: new Date().toLocaleDateString('he-IL'),
            isRealData: true,
            transactions: results.transactions,
            comparables: results.transactions, // Added for UI compatibility
            pipelineProjects: staticData?.pipeline || []
          }
        });
      } else {
        // Fallback to heuristics if no records found
        throw new Error("No records found for this address");
      }
    } catch (error) {
      console.error("Analysis Failed:", error);
      // Fallback logic
      const realData = MARKET_TRANSACTIONS[projectAddress];
      let marketPrice = 28000;
      let neighborhood = "אזור כללי";
      if (projectAddress.includes("גבעתיים")) { marketPrice = 48000; neighborhood = "גבעתיים (מרכז)"; }
      else if (projectAddress.includes("תל אביב")) { marketPrice = 65000; neighborhood = "תל אביב (מרכז)"; }
      
      if (realData) {
        marketPrice = realData.medianSqm;
        neighborhood = realData.neighborhood;
      }

      updateProject({
        marketSqmPrice: marketPrice,
        analysisResult: {
          neighborhood: neighborhood,
          speed: realData ? realData.speed : "ממוצע",
          gap: realData ? realData.gap : "0.0",
          lastScan: new Date().toLocaleDateString('he-IL'),
          isRealData: false,
          transactions: realData ? realData.comparables : [],
          comparables: realData ? realData.comparables : [], // Added for fallback consistency
          pipelineProjects: realData ? realData.pipeline : []
        }
      });
    } finally {
      setIsAnalyzing(false);
      clearInterval(interval);
    }
  };

  const sortedMarketTransactions = useMemo(() => {
    const list = analysisResult?.transactions || analysisResult?.comparables || [];
    if (!marketSort.key) return list;
    return [...list].sort((a, b) => {
      let vA = a[marketSort.key];
      let vB = b[marketSort.key];
      
      // Special Date Handling (DD.MM.YYYY)
      if (marketSort.key === 'date' && typeof vA === 'string' && vA.includes('.')) {
        const [d1, m1, y1] = vA.split('.').map(Number);
        const [d2, m2, y2] = vB.split('.').map(Number);
        vA = new Date(y1 || 0, (m1 || 1)-1, d1 || 1).getTime();
        vB = new Date(y2 || 0, (m2 || 1)-1, d2 || 1).getTime();
      } else {
        const nA = parseFloat(vA);
        const nB = parseFloat(vB);
        if (!isNaN(nA) && !isNaN(nB)) { vA = nA; vB = nB; }
      }
      
      if (vA === vB) return 0;
      const res = vA < vB ? -1 : 1;
      return marketSort.direction === 'asc' ? res : -res;
    });
  }, [analysisResult, marketSort]);

  const budgetStats = useMemo(() =>
    computeBudgetStats(budgetData, inventoryStats, constructionMonths, financingPercent),
    [budgetData, inventoryStats, constructionMonths, financingPercent]
  );

  // Portfolio: KPIs for all projects (for portfolio tab)
  const allProjectsKPIs = useMemo(() => {
    let list = projects
      .filter(p => p.includeInPortfolio !== false)
      .map((p, i) => {
        const kpis = computeProjectKPIs(p);
        const ag = p.budgetData[2]?.items?.find(item => item.id === '3-4')?.quantity || 0;
        const ug = p.budgetData[2]?.items?.find(item => item.id === '3-3')?.quantity || 0;
        const inv = computeInventoryStats(p.inventoryData, p);
        
        return { 
          ...kpis, 
          id: p.id, 
          name: p.name, 
          colorIdx: i,
          costPerSqm: kpis.devArea > 0 ? (kpis.totalCost / kpis.devArea) : 0,
          revPerSqm: kpis.devArea > 0 ? (kpis.revenue / kpis.devArea) : 0,
          // Add Planning data for sorting
          planning: {
            ag,
            ug,
            taa: inv.totalArea,
            daa: inv.devArea,
            totalEffAG: ag > 0 ? (inv.totalArea / ag) : 0,
            devEffAG: ag > 0 ? (inv.devArea / ag) : 0,
            totalEffTotal: (ag + ug) > 0 ? (inv.totalArea / (ag + ug)) : 0,
            devEffTotal: (ag + ug) > 0 ? (inv.devArea / (ag + ug)) : 0,
            ugToAgRatio: ag > 0 ? (ug / ag) : 0
          }
        };
      });

    if (portfolioSort.key) {
      list.sort((a, b) => {
        let vA, vB;
        if (portfolioSort.key === 'name') {
          vA = a.name; vB = b.name;
        } else if (portfolioSort.key.includes('.')) {
          const [k1, k2] = portfolioSort.key.split('.');
          vA = a[k1][k2]; vB = b[k1][k2];
        } else {
          vA = a[portfolioSort.key]; vB = b[portfolioSort.key];
        }
        
        if (vA === vB) return 0;
        const res = vA < vB ? -1 : 1;
        return portfolioSort.direction === 'asc' ? res : -res;
      });
    }
    return list;
  }, [projects, portfolioSort]);

  const portfolioSensitivityData = useMemo(() => {
    const revSteps = [-10, -5, 0, 5, 10];
    const costSteps = [-10, -5, 0, 5, 10];
    const portKPIs = allProjectsKPIs;
    
    return revSteps.map(revPct => {
      const revMult = (1 + revPct / 100);
      return costSteps.map(costPct => {
        const costMult = (1 + costPct / 100);
        let totalProfit = 0;
        portKPIs.forEach(kpi => {
          const pRev = kpi.revenue * revMult;
          // Fixed cost (Land + Initial) doesn't change with construction cost slippage.
          // Financing is included in variable part here for simplification but kept distinct from fixed land cost.
          const pCost = (kpi.fixedCost || 0) + ((kpi.variableCost + (kpi.financing || 0)) * costMult);
          totalProfit += (pRev - pCost);
        });
        return totalProfit / 1e6; // Convert to Millions for the matrix display
      });
    });
  }, [allProjectsKPIs]);

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
        const name = item?.name?.toLowerCase() || '';
        
        // 1. Fixed Month 1 (Land, Taxes, Betterment)
        const isFixed = name.includes('רכישה') || 
                        name.includes('השבחה') || 
                        name.includes('קרקע') ||
                        name.includes('אגרות') ||
                        name.includes('היטלים');
        
        if (isFixed) {
          fixedMonth1 += (item?.total || 0);
        } 
        // 2. Direct Construction (S-Curve) - Section 3 items
        else if (item?.id?.startsWith('3-')) {
          constructionTotal += (item?.total || 0);
        }
        // 3. Linear (Management, Legal, Marketing, Others)
        else {
          linearTotal += (item?.total || 0);
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
      devEfficiencyTotal: (ag + ug) > 0 ? (daa / (ag + ug)) : 0,
      ugToAgRatio: ag > 0 ? (ug / ag) : 0
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

  const applyOwnerDevSqmBalance = (isIncreaseOwner) => {
    const ownerUnits = inventoryData.filter(a => a.type === 'בעלים' || (a.contractorSharePct ?? (a.type === 'יזם' ? 100 : 0)) === 0);
    const devUnits = inventoryData.filter(a => a.type === 'יזם' || (a.contractorSharePct ?? 0) > 0);

    if (ownerUnits.length === 0) {
      alert('לא נמצאו דירות בעלים במלאי הפרויקט.');
      return;
    }
    if (devUnits.length === 0) {
      alert('לא נמצאו דירות יזם במלאי הפרויקט לחלוקת השטחים.');
      return;
    }

    const delta = Math.abs(Number(ownerSqmDelta) || 0);
    if (delta === 0) {
      alert('נא להזין מספר מטרים תקין גדול מ-0 לשינוי.');
      return;
    }

    const perOwnerDelta = ownerSqmMode === 'per_unit' ? delta : (delta / ownerUnits.length);
    const totalOwnerDelta = perOwnerDelta * ownerUnits.length;
    const ratio = Math.max(0, Number(devTransferRatio) || 0) / 100;
    const totalDevDelta = totalOwnerDelta * ratio;
    const perDevDelta = totalDevDelta / devUnits.length;

    // Direction calculation
    const ownerChangeSign = isIncreaseOwner ? 1 : -1;
    const devChangeSign = balanceDirectionMode === 'tradeoff' 
      ? (isIncreaseOwner ? -1 : 1) 
      : (isIncreaseOwner ? 1 : -1);

    // Validate that no apartment ends up with <= 0 sqm
    const invalidOwner = ownerUnits.some(a => (a.area + (ownerChangeSign * perOwnerDelta)) <= 0);
    const invalidDev = devUnits.some(a => (a.area + (devChangeSign * perDevDelta)) <= 0);

    if (invalidOwner || invalidDev) {
      alert('שגיאה: השינוי המבוקש גורם לשטח של אחת או יותר מהדירות להיות קטן מ-1 מ"ר. הפעולה בוטלה.');
      return;
    }

    const updated = inventoryData.map(apt => {
      const isOwner = apt.type === 'בעלים' || (apt.contractorSharePct ?? (apt.type === 'יזם' ? 100 : 0)) === 0;
      const isDev = apt.type === 'יזם' || (apt.contractorSharePct ?? 0) > 0;

      if (isOwner) {
        const newArea = Math.max(1, Math.round((apt.area + (ownerChangeSign * perOwnerDelta)) * 10) / 10);
        return {
          ...apt,
          area: newArea
        };
      } else if (isDev) {
        const newArea = Math.max(1, Math.round((apt.area + (devChangeSign * perDevDelta)) * 10) / 10);
        let newPrice = apt.price;
        if (updateDevPricesWithSqm && apt.area > 0 && apt.price > 0) {
          const sqmPrice = apt.price / apt.area;
          newPrice = Math.round(sqmPrice * newArea);
        }
        return {
          ...apt,
          area: newArea,
          price: newPrice
        };
      }
      return apt;
    });

    updateProject({ inventoryData: updated });

    // User feedback
    const actionText = isIncreaseOwner 
      ? `התווספו ${perOwnerDelta.toFixed(1)} מ"ר לכל דירת בעלים`
      : `הופחתו ${perOwnerDelta.toFixed(1)} מ"ר מכל דירת בעלים`;
    const devText = devChangeSign > 0
      ? `והתווספו ${perDevDelta.toFixed(1)} מ"ר לכל דירת יזם (${totalDevDelta.toFixed(1)} מ"ר סה"כ, יחס ${(ratio * 100).toFixed(0)}%)`
      : `וקוזזו ${perDevDelta.toFixed(1)} מ"ר מכל דירת יזם (${totalDevDelta.toFixed(1)} מ"ר סה"כ, יחס ${(ratio * 100).toFixed(0)}%)`;

    setSqmBalanceFeedback(`${actionText} ${devText}`);
    setTimeout(() => setSqmBalanceFeedback(null), 6000);
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
        const { iterations, preset } = mcConfig;
        const config = VOL_PRESETS[preset] || VOL_PRESETS['1y'];
        const { costVol, revVol, interestVol } = config;
        const results = [];
        const portProjectsKPIs = allProjectsKPIs;
        
        for (let i = 0; i < iterations; i++) {
          const costMult = randomNormal(1, costVol / 100);
          const revMult = randomNormal(1, revVol / 100);
          const interestDelta = randomNormal(0, interestVol);

          let totalProfit = 0;
          let totalCost = 0;
          let totalRevenue = 0;

          portProjectsKPIs.forEach(kpi => {
            const pRev = kpi.revenue * revMult;
            
            // 1. Variable construction/mgmt costs shift
            const pVar = (kpi.variableCost || 0) * costMult;
            
            // 2. Financing shifts with interest changes + cost changes
            const fPct = kpi.financingPercent || 7;
            const newFPct = Math.max(0, fPct + interestDelta);
            // Current financing is roughly proportional to construction costs
            const baseFinancing = kpi.financing || 0;
            const pFinancing = (baseFinancing * costMult) * (newFPct / fPct);
            
            // 3. Fixed costs stay same
            const pFixed = (kpi.fixedCost || 0);

            const pCost = pFixed + pVar + pFinancing;

            totalProfit += (pRev - pCost);
            totalCost += pCost;
            totalRevenue += pRev;
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
          stats: { mean: meanProfit, p5, p50, p95, probLoss },
          config: { ...mcConfig, ...config }
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

  // Helper: Reusable Sortable Table Header
  const SortHeader = ({ label, sortKey, currentSort, onSort, align = 'right', style = {}, tooltip = null }) => {
    const isActive = currentSort.key === sortKey;
    return (
      <th 
        onClick={() => onSort(sortKey)}
        style={{ 
          padding:'10px 16px', 
          textAlign: align, 
          borderBottom:'1px solid var(--border-sharp)',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'color 0.2s',
          position: 'relative',
          ...style
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'), gap: '4px' }}>
          <span>{label}</span>
          {tooltip && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setExplanationModal(sortKey);
              }}
              title="הסבר על החישוב"
              style={{ 
                background: 'none', 
                border: 'none', 
                padding: '2px', 
                cursor: 'pointer', 
                display: 'inline-flex', 
                alignItems: 'center', 
                color: 'var(--accent)', 
                opacity: 0.8,
                transition: 'opacity 0.2s, transform 0.2s',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <HelpCircle size={12} />
            </button>
          )}
          {isActive ? (
            currentSort.direction === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />
          ) : (
            <ArrowUpDown size={10} style={{ opacity: 0.3 }} />
          )}
        </div>
      </th>
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
        padding: '1.25rem 0',
        borderBottom: '1px solid var(--border-sharp)',
        marginBottom: '1.5rem',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>
        {/* Right Section: Brand & Breadcrumb */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-pri)', margin: 0 }}>
              ProjectCheck
            </h1>
            <span style={{ 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              letterSpacing: '0.05em', 
              padding: '2px 6px', 
              borderRadius: 'var(--radius-sharp)', 
              background: 'var(--accent-subtle)', 
              color: 'var(--accent)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              TACTICAL CONSOLE
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>{activeProject?.name || 'פרויקט'}</span>
            <ChevronLeft size={12} style={{ opacity: 0.5 }} />
            <span style={{ color: 'var(--text-muted)' }}>{currentWorkspace?.label}</span>
            <ChevronLeft size={12} style={{ opacity: 0.5 }} />
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
              {currentWorkspace?.tabs.find(t => t.id === activeTab)?.label || ''}
            </span>
          </div>
        </div>
        
        {/* Center Section: Project Selector */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            background: 'var(--bg-surface)', 
            padding: '6px 14px', 
            borderRadius: 'var(--radius-tactical)', 
            gap: '12px',
            border: '1px solid var(--border-sharp)',
            boxShadow: 'var(--shadow-premium)'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Project Name Editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>שם פרויקט:</span>
              <input
                value={activeProject?.name || ''}
                onChange={(e) => updateProject({ name: e.target.value })}
                placeholder="הזן שם פרויקט..."
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-sharp)',
                  borderRadius: 'var(--radius-sharp)',
                  padding: '4px 8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-pri)',
                  width: '180px',
                  textAlign: 'right'
                }}
              />
            </div>

            <div style={{ width: '1px', height: '18px', background: 'var(--border-sharp)' }} />

            {/* Project Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>החלף פרויקט:</span>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={activeProjectId}
                  onChange={(e) => {
                    setActiveProjectId(e.target.value);
                  }}
                  style={{
                    padding: '5px 28px 5px 10px',
                    borderRadius: 'var(--radius-sharp)',
                    border: '1px solid var(--border-sharp)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-pri)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    appearance: 'none',
                    cursor: 'pointer',
                    minWidth: '160px',
                    outline: 'none',
                    textAlign: 'right'
                  }}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', left: '8px', pointerEvents: 'none', opacity: 0.6 }} />
              </div>
            </div>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-sharp)' }} />

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              title={activeProject?.includeInPortfolio !== false ? "כלול בפורטפוליו" : "לא כלול בפורטפוליו"}
              onClick={() => {
                const val = activeProject?.includeInPortfolio === false;
                updateProject({ includeInPortfolio: val });
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', transition: 'all 0.2s', opacity: activeProject?.includeInPortfolio !== false ? 1 : 0.4 }}
            >
              <Activity size={16} color={activeProject?.includeInPortfolio !== false ? 'var(--accent)' : 'var(--text-muted)'} />
            </button>
            <button
              title="שכפול פרויקט"
              onClick={(e) => duplicateProject(activeProjectId, e)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.6, color: 'var(--text-sec)' }}
            >
              <Copy size={16} />
            </button>
            {projects.length > 1 && (
              <button
                title="מחיקת פרויקט"
                onClick={(e) => deleteProject(activeProjectId, e)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.6, color: 'var(--danger)' }}
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
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: '1px dashed var(--accent)',
                background: 'var(--accent-subtle)',
                cursor: 'pointer',
                color: 'var(--accent)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Left Section: Cloud Sync, Save & Logout */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isSaving ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--brand-sky)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: 10, height: 10, border: '2px solid var(--border-sharp)', borderTop: '2px solid var(--brand-sky)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              מסנכרן לענן...
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={14} color="var(--accent)" />
              <span>סונכרן לענן</span>
              <kbd style={{ fontSize: '0.65rem', background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-sharp)', color: 'var(--text-sec)' }}>Ctrl+S</kbd>
            </span>
          )}
          <button
            onClick={handleManualSave}
            className="primary"
          >
            <Save size={15} /> שמירה
          </button>
          <button
            onClick={logout}
            title={`התנתקות מ-${user?.email}`}
            style={{
              padding: '0.55rem 0.9rem', 
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
            <LogOut size={15} /> יציאה
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </header>

      {/* Workspaces Navigation Segmented Hub */}
      <div className="workspace-hub">
        {WORKSPACES.map(ws => {
          const WsIcon = ws.icon;
          const isActive = currentWorkspace?.id === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => handleWorkspaceSelect(ws.id)}
              className={`workspace-btn ${isActive ? 'active' : ''}`}
            >
              <WsIcon size={16} />
              <span>{ws.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-views Pills for the Active Workspace */}
      <div className="subviews-bar">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '6px' }}>תצוגה:</span>
        {currentWorkspace?.tabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`subview-pill ${isActive ? 'active' : ''}`}
            >
              <TabIcon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>סה"כ תקציב משוער</h3>
                        <div className="mono-number" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)' }}>
                          ₪{budgetStats.grandTotal.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div className="tactical-card" style={{ padding: '0.6rem 0.9rem', background: 'var(--bg-canvas)', minWidth: '125px' }}>
                          <h4 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>סך עלות ליח"ד</h4>
                          <div className="mono-number" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-pri)' }}>
                            ₪{Math.round(inventoryStats.totalUnits > 0 ? budgetStats.grandTotal / inventoryStats.totalUnits : 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {inventoryStats.totalUnits} יח"ד כולל
                          </div>
                        </div>
                        <div className="tactical-card" style={{ padding: '0.6rem 0.9rem', background: 'var(--bg-canvas)', minWidth: '135px' }}>
                          <h4 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>עלות למ"ר בנוי עילי</h4>
                          <div className="mono-number" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-pri)' }}>
                            ₪{Math.round(planningStats.aboveGroundArea > 0 ? budgetStats.grandTotal / planningStats.aboveGroundArea : 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {planningStats.aboveGroundArea.toLocaleString()} מ"ר עילי
                          </div>
                        </div>
                        <div className="tactical-card" style={{ padding: '0.6rem 0.9rem', background: 'var(--bg-canvas)', minWidth: '115px' }}>
                          <h4 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>מימון וערבויות</h4>
                          <div className="mono-number" style={{ fontSize: '1.05rem', fontWeight: 600, color: '#8E9AAF' }}>₪{budgetStats.financing.toLocaleString()}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {financingPercent}% מהעלויות
                          </div>
                        </div>
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
                    <tr style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-sharp)', fontSize: '0.85rem' }}>
                      <td colSpan="2" style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>סך עלות ליח"ד: </span>
                        <strong className="mono-number" style={{ color: 'var(--accent)', margin: '0 6px' }}>
                          ₪{Math.round(inventoryStats.totalUnits > 0 ? budgetStats.grandTotal / inventoryStats.totalUnits : 0).toLocaleString()}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({inventoryStats.totalUnits} יח' סה"כ)</span>
                      </td>
                      <td colSpan="2" style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>
                        <span style={{ color: 'var(--text-sec)', fontWeight: 600 }}>סך עלות למ"ר בנוי עילי: </span>
                        <strong className="mono-number" style={{ color: 'var(--accent)', margin: '0 6px' }}>
                          ₪{Math.round(planningStats.aboveGroundArea > 0 ? budgetStats.grandTotal / planningStats.aboveGroundArea : 0).toLocaleString()}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({planningStats.aboveGroundArea.toLocaleString()} מ"ר עילי)</span>
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
                      onChange={(e) => updateProject({ address: e.target.value })}
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
                    opacity: (isAnalyzing || !projectAddress) ? 0.5 : 1,
                    minWidth: '160px'
                  }}
                >
                  {isAnalyzing ? 'סורק נתונים...' : 'בצע ניתוח שוק'}
                </button>
              </div>

              {/* Market Analysis Results - Real Data Intelligence */}
              {analysisResult && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="tactical-card" 
                  style={{ borderRight: `4px solid var(--accent)`, background: 'white', padding: '2rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--border-sharp)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'var(--secondary)', color: 'white', padding: '10px', borderRadius: '8px' }}>
                        <ShieldAlert size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           דוח אימות שוק (Official Tax Data)
                           {analysisResult.isRealData && <span style={{ padding: '2px 8px', background: 'var(--success)', color: 'white', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>VERIFIED</span>}
                         </h3>
                         <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מקור: מאגר עסקאות נדל"ן (מיסוי מקרקעין) | עדכון: {analysisResult.lastScan}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                       <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>מחיר יעד למ"ר</div>
                       <div className="mono-number" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>₪{marketSqmPrice.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bento-grid" style={{ marginBottom: '2rem' }}>
                     <div className="tactical-card col-4" style={{ background: 'var(--bg-canvas)', border: 'none' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-sec)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <MapPin size={14} /> שכונה / אזור
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{analysisResult.neighborhood}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '5px' }}>{analysisResult.isRealData ? 'זיהוי ודאי לפי גוש/חלקה' : 'זיהוי לפי שם עיר'}</div>
                     </div>
                     <div className="tactical-card col-4" style={{ background: 'var(--bg-canvas)', border: 'none' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-sec)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <Layers size={14} /> עסקאות אמת שנסרקו
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>{(analysisResult?.transactions?.length || analysisResult?.comparables?.length || 0)} עסקאות</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '5px' }}>מתוך מאגר רשות המיסים</div>
                     </div>
                     <div className="tactical-card col-4" style={{ background: 'var(--bg-canvas)', border: 'none' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-sec)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <Zap size={14} /> פער שוק (Target vs Market)
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: parseFloat(analysisResult.gap) > 0 ? 'var(--danger)' : 'var(--success)' }}>{analysisResult.gap}%</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '5px' }}>מהירות מכירה צפויה: {analysisResult.speed}</div>
                     </div>
                   </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <List size={16} /> עסקאות אמת אחרונות (500 מ')
                      </h4>
                       <div className="table-container" style={{ marginTop: 0, border: 'none', boxShadow: 'none' }}>
                        <table style={{ background: 'transparent' }}>
                          <thead>
                            <tr>
                              <SortHeader label="כתובת" sortKey="address" currentSort={marketSort} onSort={(k) => setMarketSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="right" />
                              <SortHeader label={"₪/מ\"ר"} sortKey="price" currentSort={marketSort} onSort={(k) => setMarketSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} />
                              <SortHeader label="תאריך" sortKey="date" currentSort={marketSort} onSort={(k) => setMarketSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} />
                            </tr>
                          </thead>
                          <tbody>
                             {sortedMarketTransactions.map((comp, idx) => (
                              <tr key={idx}>
                                <td>{comp.address || (comp.street ? `${comp.street} ${comp.houseNumber || ''}`.trim() : '-')}</td>
                                <td className="mono-number" style={{ fontWeight: 600 }}>
                                  ₪{Number(comp.price || comp.sqmPrice || 0).toLocaleString()}
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.date || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <Layers size={16} /> צנרת תכנון ומתחרים באזור
                      </h4>
                      <div className="table-container" style={{ marginTop: 0, border: 'none', boxShadow: 'none' }}>
                        <table style={{ background: 'transparent' }}>
                          <thead>
                            <tr>
                              <th>פרויקט / סטטוס</th>
                              <th>יח"ד</th>
                              <th>מרחק</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(analysisResult.pipelineProjects && analysisResult.pipelineProjects.length > 0) ? (
                              analysisResult.pipelineProjects.map((p, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.status}</div>
                                  </td>
                                  <td className="mono-number">{p.units}</td>
                                  <td style={{ fontSize: '0.75rem' }}>{p.distance}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '0.8rem' }}>
                                  לא נמצאו פרויקטים מתחרים בצנרת התכנון עבור אזור זה
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                     <a href="https://nadlan.gov.il" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>צפייה במפה הממשלתית ←</a>
                     <a href="https://www.madlan.co.il" target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>בדיקת רמות מחיר במדלן ←</a>
                  </div>
                </motion.div>
              )}

              {/* Inventory Summary KPI Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* Card 1: סה"כ יח"ד */}
                <div className="tactical-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', fontWeight: 700, textTransform: 'uppercase' }}>סה"כ יח"ד</span>
                  <div className="mono-number" style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.35rem 0' }}>
                    {inventoryStats.totalUnits} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>דירות</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    יזם: <strong className="mono-number" style={{ color: 'var(--accent)' }}>{inventoryStats.devUnits.toFixed(1)}</strong> | בעלים: <strong className="mono-number">{inventoryStats.ownerUnits.toFixed(1)}</strong>
                  </div>
                </div>

                {/* Card 2: שטח כולל וממוצע */}
                <div className="tactical-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', fontWeight: 700, textTransform: 'uppercase' }}>שטח כולל</span>
                  <div className="mono-number" style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.35rem 0' }}>
                    {Math.round(inventoryStats.totalArea).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>מ"ר</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ממוצע לדירה: <strong className="mono-number">{inventoryStats.avgAptArea.toFixed(1)}</strong> מ"ר
                  </div>
                </div>

                {/* Card 3: שווי מכירות יזם */}
                <div className="tactical-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', fontWeight: 700, textTransform: 'uppercase' }}>שווי יזם נקי (ללא מע"מ)</span>
                  <div className="mono-number" style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.35rem 0', color: 'var(--success)' }}>
                    ₪{Math.round(inventoryStats.devValueExclVat).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    כולל מע"מ: <strong className="mono-number">₪{Math.round(inventoryStats.devValueInclVat).toLocaleString()}</strong>
                  </div>
                </div>

                {/* Card 4: מחיר ממוצע למ"ר */}
                <div className="tactical-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', fontWeight: 700, textTransform: 'uppercase' }}>מחיר ממוצע למ"ר</span>
                  <div className="mono-number" style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.35rem 0', color: 'var(--accent)' }}>
                    ₪{Math.round(inventoryStats.avgPricePerSqm).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>כולל מע"מ (דירות יזם)</div>
                </div>

                {/* Card 5: דירות מיוחדות */}
                <div className="tactical-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', fontWeight: 700, textTransform: 'uppercase' }}>דירות מיוחדות</span>
                  <div className="mono-number" style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.35rem 0', color: '#F4A261' }}>
                    {inventoryStats.specialAreaPctTotal}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    שווי: <strong className="mono-number">{inventoryStats.specialValuePct}%</strong> משווי יזם
                  </div>
                </div>

                {/* Card 6: תמהיל חדרים */}
                <div className="tactical-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', fontWeight: 700, textTransform: 'uppercase' }}>תמהיל חדרים</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '0.35rem 0' }}>
                    {inventoryStats.roomSplit.map(group => (
                      <span key={group.rooms} style={{ fontSize: '0.65rem', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-sharp)', fontWeight: 600 }}>
                        {group.rooms} ח': <strong className="mono-number">{group.count}</strong> ({group.pct}%)
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>לפי סך החדרים בפרויקט</div>
                </div>
              </div>

              {/* Combination Deal Control Card */}
              <div className="tactical-card" style={{
                padding: '0.9rem 1.25rem',
                background: activeProject?.isCombinationDeal ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                border: activeProject?.isCombinationDeal ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-sharp)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: activeProject?.isCombinationDeal ? 'var(--success)' : 'var(--text-pri)' }}>
                    <input 
                      type="checkbox" 
                      checked={Boolean(activeProject?.isCombinationDeal)}
                      onChange={(e) => updateProject({ isCombinationDeal: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                    />
                    <span>עסקת קומבינציה</span>
                  </label>

                  {activeProject?.isCombinationDeal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-canvas)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-sharp)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', fontWeight: 600 }}>אחוז בעלי הקרקע:</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.5"
                          value={activeProject?.combinationLandownerPct ?? 40} 
                          onChange={(e) => updateProject({ combinationLandownerPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                          style={{ width: '55px', padding: '2px 4px', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: '4px', color: '#F4A261' }}
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)', fontWeight: 600 }}>אחוז היזם (מחושב):</span>
                        <span className="mono-number" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--success)' }}>
                          {(100 - (activeProject?.combinationLandownerPct ?? 40)).toFixed(1)}%
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                        <span>יזם: <strong className="mono-number" style={{ color: 'var(--text-pri)' }}>{inventoryStats.devUnits.toFixed(1)}</strong> יח' ({Math.round(inventoryStats.devArea).toLocaleString()} מ"ר)</span>
                        <span>בעלים: <strong className="mono-number" style={{ color: 'var(--text-pri)' }}>{inventoryStats.ownerUnits.toFixed(1)}</strong> יח' ({Math.round(inventoryStats.totalArea - inventoryStats.devArea).toLocaleString()} מ"ר)</span>
                      </div>
                    </div>
                  )}
                </div>

                {activeProject?.isCombinationDeal && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>
                    * אחוז היזם מוחל אוטומטית על כלל שורות המלאי וחישובי הרווחיות
                  </span>
                )}
              </div>

              <div className="table-container" style={{ marginTop: 0 }}>
                {/* Management Toolbar */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border-sharp)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-pri)', margin: 0 }}>
                      ניהול מלאי ופעולות רוחביות
                    </h3>

                    {/* Quick Filter Chips */}
                    <div className="filter-chips-row">
                      <button
                        onClick={() => setInventoryFilter('all')}
                        className={`filter-chip ${inventoryFilter === 'all' ? 'active' : ''}`}
                      >
                        כל הדירות ({inventoryData.length})
                      </button>
                      <button
                        onClick={() => setInventoryFilter('dev')}
                        className={`filter-chip ${inventoryFilter === 'dev' ? 'active' : ''}`}
                      >
                        יזם ({Math.round(inventoryStats.devUnits)})
                      </button>
                      <button
                        onClick={() => setInventoryFilter('owner')}
                        className={`filter-chip ${inventoryFilter === 'owner' ? 'active' : ''}`}
                      >
                        בעלים ({Math.round(inventoryStats.ownerUnits)})
                      </button>
                      <button
                        onClick={() => setInventoryFilter('special')}
                        className={`filter-chip ${inventoryFilter === 'special' ? 'active' : ''}`}
                      >
                        מיוחדות
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'var(--bg-canvas)', borderRadius: '4px', border: '1px dashed var(--accent)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)' }}>עדכון מחירים (%):</span>
                      <input 
                        type="number" 
                        step="0.1"
                        value={bulkAdjustmentPct} 
                        onChange={(e) => setBulkAdjustmentPct(parseFloat(e.target.value) || 0)} 
                        style={{ width: '60px', padding: '2px 6px', fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-sharp)', borderRadius: '4px', color: 'var(--text-pri)', textAlign: 'center' }}
                      />
                      <button 
                        onClick={() => applyBulkPriceAdjustment(true)}
                        style={{ padding: '3px 10px', fontSize: '0.75rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                      >
                        <Plus size={12} /> העלה
                      </button>
                      <button 
                        onClick={() => applyBulkPriceAdjustment(false)}
                        style={{ padding: '3px 10px', fontSize: '0.75rem', background: '#E76F51', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                      >
                        <Trash size={12} /> הורד
                      </button>
                    </div>

                    <button
                      onClick={() => setIsSqmBalanceOpen(prev => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        background: isSqmBalanceOpen ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-canvas)',
                        border: isSqmBalanceOpen ? '1px solid #38bdf8' : '1px solid var(--border-sharp)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: isSqmBalanceOpen ? '#0284c7' : 'var(--text-pri)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <ArrowUpDown size={14} />
                      <span>כלי איזון מ"ר (בעלים ↔ יזם: {devTransferRatio}%)</span>
                      {isSqmBalanceOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  <button 
                    onClick={() => updateProject({ inventoryData: [...inventoryData, { id: Date.now(), floor: 1, type: 'יזם', category: 'טיפוסית', rooms: 3, area: 100, balcony: 12, price: 0 }] })} 
                    style={{ 
                      background: 'var(--accent)', 
                      color: 'white', 
                      border: 'none',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '5px 14px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> הוסף דירה
                  </button>
                </div>

                {/* Owner <-> Developer Sqm Balancing Panel (Theme-Aware & High Contrast) */}
                {isSqmBalanceOpen && (
                  <div style={{
                    padding: '1.25rem 1.5rem',
                    background: 'var(--bg-surface)',
                    borderBottom: '2px solid var(--border-sharp)',
                    borderLeft: '4px solid var(--accent)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {/* Header of Panel */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ArrowUpDown size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-pri)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>איזון והעברת מ"ר (דירות בעלים ⟷ דירות יזם)</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 800 }}>
                              יחס חלוקה {devTransferRatio}%
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            הוספה או הפחתה של מ"ר מדירות הבעלים (כולן), כאשר סך המטרים מתחלק בכלל דירות היזם לפי היחס המוגדר
                          </div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-sec)', background: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-sharp)', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={updateDevPricesWithSqm}
                          onChange={(e) => setUpdateDevPricesWithSqm(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                        <span>עדכן מחיר מכירה כולל של דירות היזם לפי ₪/מ"ר נוכחי</span>
                      </label>
                    </div>

                    {/* Controls Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                      {/* 1. Delta Sqm */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-canvas)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sec)' }}>שינוי שטח בעלים:</span>
                        <input
                          type="number"
                          min="0.1"
                          step="0.5"
                          value={ownerSqmDelta}
                          onChange={(e) => setOwnerSqmDelta(parseFloat(e.target.value) || 0)}
                          style={{ width: '60px', padding: '3px 6px', fontSize: '0.9rem', fontWeight: 800, textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: '4px', color: 'var(--text-pri)' }}
                        />
                        <select
                          value={ownerSqmMode}
                          onChange={(e) => setOwnerSqmMode(e.target.value)}
                          style={{ fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-sharp)', borderRadius: '4px', color: 'var(--text-pri)', padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          <option value="per_unit">מ"ר לכל דירת בעלים</option>
                          <option value="total">סה"כ מ"ר לכלל הבעלים</option>
                        </select>
                      </div>

                      {/* 2. Transfer ratio */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-canvas)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sec)' }}>יחס חלוקה ליזם:</span>
                        <input
                          type="number"
                          min="0"
                          max="200"
                          step="1"
                          value={devTransferRatio}
                          onChange={(e) => setDevTransferRatio(parseFloat(e.target.value) || 0)}
                          style={{ width: '55px', padding: '3px 6px', fontSize: '0.9rem', fontWeight: 800, textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid #10b981', borderRadius: '4px', color: '#10b981' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>%</span>
                      </div>

                      {/* 3. Mode selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-canvas)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sec)' }}>אופן החישוב:</span>
                        <select
                          value={balanceDirectionMode}
                          onChange={(e) => setBalanceDirectionMode(e.target.value)}
                          style={{ fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-sharp)', borderRadius: '4px', color: 'var(--text-pri)', cursor: 'pointer', padding: '3px 8px', fontWeight: 600 }}
                        >
                          <option value="tradeoff">קיזוז שטחים (הורדה מבעלים מוסיפה ליזם ולהיפך)</option>
                          <option value="parallel">התאמה מקבילה (באותו כיוון לשניהם)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Preview Strip & Action Buttons */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'var(--bg-canvas)',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-sharp)'
                    }}>
                      {/* Live calculation info */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-sec)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>דירות בעלים ({sqmBalanceStats.ownerUnitsCount}):</span>{' '}
                          <strong style={{ color: 'var(--text-pri)' }}>{sqmBalanceStats.perOwnerDelta.toFixed(1)} מ"ר/דירה</strong>{' '}
                          <span style={{ color: 'var(--text-muted)' }}>(סה"כ {sqmBalanceStats.totalOwnerDelta.toFixed(1)} מ"ר)</span>
                        </div>
                        <span style={{ color: 'var(--accent)', fontWeight: 800 }}>⟵ {devTransferRatio}% ⟶</span>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>דירות יזם ({sqmBalanceStats.devUnitsCount}):</span>{' '}
                          <strong style={{ color: 'var(--success)' }}>{sqmBalanceStats.perDevDelta.toFixed(1)} מ"ר/דירה</strong>{' '}
                          <span style={{ color: 'var(--text-muted)' }}>(סה"כ {sqmBalanceStats.totalDevDelta.toFixed(1)} מ"ר יחולקו שווה בשווה)</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => applyOwnerDevSqmBalance(false)}
                          disabled={sqmBalanceStats.ownerUnitsCount === 0 || sqmBalanceStats.devUnitsCount === 0}
                          title={balanceDirectionMode === 'tradeoff' ? 'מפחית מ"ר מכל דירות הבעלים ומוסיף לדירות היזם' : 'מפחית מ"ר מכל הדירות'}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: '#E76F51',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: (sqmBalanceStats.ownerUnitsCount === 0 || sqmBalanceStats.devUnitsCount === 0) ? 'not-allowed' : 'pointer',
                            opacity: (sqmBalanceStats.ownerUnitsCount === 0 || sqmBalanceStats.devUnitsCount === 0) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(231, 111, 81, 0.2)'
                          }}
                        >
                          <ArrowDown size={15} />
                          {balanceDirectionMode === 'tradeoff' ? 'הורד מבעלים (והעבר ליזם)' : 'הורד מבעלים ומיזם'}
                        </button>
                        <button
                          onClick={() => applyOwnerDevSqmBalance(true)}
                          disabled={sqmBalanceStats.ownerUnitsCount === 0 || sqmBalanceStats.devUnitsCount === 0}
                          title={balanceDirectionMode === 'tradeoff' ? 'מוסיף מ"ר לכל דירות הבעלים ומקזז מדירות היזם' : 'מוסיף מ"ר לכל הדירות'}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: (sqmBalanceStats.ownerUnitsCount === 0 || sqmBalanceStats.devUnitsCount === 0) ? 'not-allowed' : 'pointer',
                            opacity: (sqmBalanceStats.ownerUnitsCount === 0 || sqmBalanceStats.devUnitsCount === 0) ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(88, 166, 255, 0.2)'
                          }}
                        >
                          <ArrowUp size={15} />
                          {balanceDirectionMode === 'tradeoff' ? 'העלה לבעלים (וקזז מיזם)' : 'העלה לבעלים וליזם'}
                        </button>
                      </div>
                    </div>

                    {/* Feedback banner */}
                    {sqmBalanceFeedback && (
                      <div style={{
                        padding: '8px 14px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        borderRadius: '4px',
                        color: '#10b981',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <Check size={16} />
                        <span>{sqmBalanceFeedback}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ overflowX: 'auto', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-sharp)', border: '1px solid var(--border-sharp)' }}>
                  <table style={{ width: 'max-content', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border-sharp)' }}>
                        <th style={{ width: '35px', padding: '12px 4px', textAlign: 'center' }}>מס'</th>
                        <SortHeader label="קומה" sortKey="floor" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '45px' }} />
                        <SortHeader label="סוג" sortKey="type" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '65px' }} />
                        <SortHeader label="חלק %" sortKey="contractorSharePct" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '90px' }} />
                        <SortHeader label="טיפוס" sortKey="category" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '85px' }} />
                        <SortHeader label="חדרים" sortKey="rooms" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '45px' }} />
                        <SortHeader label="שטח" sortKey="area" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '75px' }} />
                        <SortHeader label="מרפסת" sortKey="balcony" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '80px', color: 'var(--accent)', fontWeight: 800 }} />
                        <th style={{ width: '95px', padding: '12px 4px', textAlign: 'center' }}>שטח קבלן</th>
                        <SortHeader label="מחיר (₪)" sortKey="price" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '120px' }} />
                                <SortHeader label={'מחיר למ"ר'} sortKey="sqmPrice" currentSort={inventorySort} onSort={(k) => setInventorySort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" style={{ width: '110px' }} />
                        <th style={{ width: '140px', padding: '12px 4px', textAlign: 'center' }}>שווי קבלן</th>
                        <th style={{ width: '65px', padding: '12px 4px', textAlign: 'center' }}>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInventoryData.map((apt, idx) => {
                        const isComb = Boolean(activeProject?.isCombinationDeal);
                        const combDevPct = Math.max(0, Math.min(100, 100 - (Number(activeProject?.combinationLandownerPct) || 0)));
                        const effectiveShare = isComb ? combDevPct : (apt.contractorSharePct !== undefined ? apt.contractorSharePct : (apt.type === 'יזם' ? 100 : 0));
                        const projectSqmPrice = apt.area > 0 ? Math.round(apt.price / apt.area) : 0;
                        const isOwner = isComb ? (combDevPct === 0) : (apt.type === 'בעלים');
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
                              {isComb ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }} title="נגזר אוטומטית מעסקת הקומבינציה">
                                  <span className="mono-number" style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem' }}>
                                    {combDevPct.toFixed(1)}
                                  </span>
                                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>%</span>
                                </div>
                              ) : (
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
                              )}
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
                              {Math.round(apt.area * effectiveShare / 100).toLocaleString()}
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
                            <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                              <input 
                                type="number" 
                                value={projectSqmPrice} 
                                onChange={(e) => {
                                  const newSqm = Number(e.target.value) || 0;
                                  handleInventoryChange(apt.id, 'price', Math.round(newSqm * (apt.area || 0)));
                                }} 
                                className="compact-input mono-number" 
                                style={{ width: '100%', fontWeight: 600, color: 'var(--accent)', textAlign: 'center', border: '1px solid transparent', background: 'transparent' }} 
                                title={'מחיר למ"ר (שינוי כאן מעדכן את המחיר הכולל)'}
                              />
                            </td>
                            <td className="mono-number" style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', padding: '6px 4px' }}>
                              ₪{Math.round(apt.price * effectiveShare / 100).toLocaleString()}
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
              {/* Combination Deal Sensitivity Slider */}
              <div className="tactical-card" style={{ padding: '1.25rem 1.5rem', background: activeProject?.isCombinationDeal ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-elevated)', border: activeProject?.isCombinationDeal ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-sharp)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: activeProject?.isCombinationDeal ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-canvas)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-sharp)', display: 'flex' }}>
                      <Layers size={20} color={activeProject?.isCombinationDeal ? 'var(--success)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        עסקת קומבינציה — סליידר רגישות אחוזים
                        {activeProject?.isCombinationDeal && (
                          <span style={{ padding: '2px 8px', background: 'var(--success)', color: 'var(--bg-canvas)', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800 }}>
                            פעיל
                          </span>
                        )}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        כוונון מיידי של אחוז בעלי הקרקע והיזם — כל חישובי המלאי, שווי המכירות, הרווח וה-IRR מתעדכנים אוטומטית
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => updateProject({ isCombinationDeal: !activeProject?.isCombinationDeal })}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sharp)',
                      border: activeProject?.isCombinationDeal ? '1px solid var(--success)' : '1px solid var(--border-sharp)',
                      background: activeProject?.isCombinationDeal ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-canvas)',
                      color: activeProject?.isCombinationDeal ? 'var(--success)' : 'var(--text-sec)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {activeProject?.isCombinationDeal ? '✓ עסקת קומבינציה פעילה' : '+ הפעל עסקת קומבינציה'}
                  </button>
                </div>

                {/* Slider Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-sec)', fontWeight: 600 }}>אחוז בעלי הקרקע (קומבינציה):</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.5"
                        value={activeProject?.combinationLandownerPct ?? 40} 
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                          updateProject({ isCombinationDeal: true, combinationLandownerPct: val });
                        }}
                        style={{ width: '60px', padding: '3px 8px', fontSize: '0.9rem', fontWeight: 800, textAlign: 'center', background: 'var(--bg-canvas)', border: '1px solid var(--accent)', borderRadius: '4px', color: '#F4A261' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-sec)', fontWeight: 600 }}>אחוז היזם הנגזר:</span>
                      <span className="mono-number" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
                        {(100 - (activeProject?.combinationLandownerPct ?? 40)).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="0.5"
                      value={activeProject?.combinationLandownerPct ?? 40}
                      onChange={(e) => {
                        updateProject({ isCombinationDeal: true, combinationLandownerPct: Number(e.target.value) });
                      }}
                      style={{
                        width: '100%',
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                        height: '6px'
                      }}
                    />
                  </div>

                  {/* Visual Split Bar */}
                  <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--border-sharp)', marginTop: '2px' }}>
                    <div 
                      style={{ 
                        width: `${100 - (activeProject?.combinationLandownerPct ?? 40)}%`, 
                        background: 'var(--success)', 
                        transition: 'width 0.05s ease' 
                      }} 
                      title={`יזם: ${(100 - (activeProject?.combinationLandownerPct ?? 40)).toFixed(1)}%`}
                    />
                    <div 
                      style={{ 
                        width: `${activeProject?.combinationLandownerPct ?? 40}%`, 
                        background: '#F4A261', 
                        transition: 'width 0.05s ease' 
                      }} 
                      title={`בעלי קרקע: ${(activeProject?.combinationLandownerPct ?? 40).toFixed(1)}%`}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>◄ חלק יזם: {(100 - (activeProject?.combinationLandownerPct ?? 40)).toFixed(1)}% ({inventoryStats.devUnits.toFixed(1)} יח' | {Math.round(inventoryStats.devArea).toLocaleString()} מ"ר | שווי נטו: ₪{Math.round(inventoryStats.devValueExclVat).toLocaleString()})</span>
                    <span style={{ color: '#F4A261', fontWeight: 600 }}>חלק בעלי קרקע: {(activeProject?.combinationLandownerPct ?? 40).toFixed(1)}% ({inventoryStats.ownerUnits.toFixed(1)} יח' | {Math.round(inventoryStats.totalArea - inventoryStats.devArea).toLocaleString()} מ"ר | שווי: ₪{Math.round(inventoryStats.ownerValueInclVat).toLocaleString()}) ►</span>
                  </div>
                </div>
              </div>

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
                    
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem' }}>
                      {Object.entries(VOL_PRESETS).map(([key, p]) => (
                        <button 
                          key={key}
                          onClick={() => setMcConfig({ ...mcConfig, ...p })}
                          style={{ 
                            flex: 1, 
                            fontSize: '0.6rem', 
                            padding: '4px', 
                            background: 'var(--bg-canvas)', 
                            border: '1px solid var(--border-sharp)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--text-sec)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.borderColor = 'var(--accent)'}
                          onMouseLeave={(e) => e.target.style.borderColor = 'var(--border-sharp)'}
                        >
                          {p?.id?.toUpperCase() || key.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>עלויות בניה (מדד תשומות)</label>
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
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מחירי מכירה (מדד מחירי דיור)</label>
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
                    
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: '4px', fontSize: '0.65rem', border: '1px dashed var(--border-sharp)' }}>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>ממוצעי סטיות תקן (Israel):</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4px' }}>
                        <span style={{ fontWeight: 700 }}>10 שנים:</span> <span>דיור ~6%, תשומות ~4%</span>
                        <span style={{ fontWeight: 700 }}>5 שנים:</span> <span>דיור ~8%, תשומות ~5%</span>
                        <span style={{ fontWeight: 700 }}>1 שנה:</span> <span>דיור ~12%, תשומות ~8%</span>
                      </div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
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
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>יחס תת-קרקעי לשטח עילי</span>
                      <div className="mono-number" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{(planningStats.ugToAgRatio * 100).toFixed(1)}%</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>יחס מרתפים/על-קרקע</div>
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
                    ) : activeTab === 'matrix' ? (
              <BuildingInventoryMatrix
                project={activeProject}
                onUpdateInventory={(newInventory) => updateProject({ inventoryData: newInventory })}
              />
                    ) : activeTab === 'scurve' ? (
              <CashflowSCurve
                project={activeProject}
                onApplyChanges={(changes) => updateProject(changes)}
              />
                    ) : activeTab === 'montecarlo' ? (
              <MonteCarloFanChart
                project={activeProject}
              />
                    ) : activeTab === 'compare' ? (
              <ScenarioComparator
                projects={projects}
                activeProjectId={activeProjectId}
                onForkScenario={(newProject) => {
                  setProjects(prev => [...prev, newProject]);
                  setActiveProjectId(newProject.id);
                }}
              />
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
                            data-tooltip="שיעור התשואה הפנימי הממוצע של כלל הפרויקטים (Internal Rate of Return). המדד המרכזי שבוחן את רווחיות הפורטפוליו לאורך זמן."
                          >
                            IRR ממוצע <Info size={10} />
                          </span>
                          <div className="mono-number accent-text" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0' }}>{avgIRR ? avgIRR.toFixed(1) + '%' : 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>שקלול תשואה ממוצעת לפרויקטים.</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Portfolio Table */}
                <div className="tactical-card" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding:'16px', borderBottom:'1px solid var(--border-sharp)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h3 style={{ fontSize:'0.85rem', fontWeight:700, margin:0 }}>השוואת פרויקטים בפורטפוליו</h3>
                    <div className="segmented-control">
                      <button 
                        className={portfolioCompareMode === 'financial' ? 'active' : ''} 
                        onClick={() => setPortfolioCompareMode('financial')}
                      >פיננסי</button>
                      <button 
                        className={portfolioCompareMode === 'planning' ? 'active' : ''} 
                        onClick={() => setPortfolioCompareMode('planning')}
                      >תכנוני</button>
                    </div>
                  </div>
                  
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'var(--bg-card)', fontSize:'0.65rem', color:'var(--text-sec)', textTransform:'uppercase' }}>
                        <th style={{ width: '40px', borderBottom:'1px solid var(--border-sharp)' }}></th>
                        {portfolioCompareMode === 'financial' ? (
                          <>
                            <SortHeader label="פרויקט" sortKey="name" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="right" tooltip="שם הפרויקט בפורטפוליו" />
                            <SortHeader label="יח' (יזם)" sortKey="totalUnits" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="center" tooltip='סה"כ יחידות דיור בפרויקט (מתוכן יחידות לשיווק יזם)' />
                            <SortHeader label="עלות" sortKey="totalCost" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="סך תקציב הפרויקט כולל עלויות בנייה, קרקע, עקיפות ומימון" />
                            <SortHeader label={"הוצ/מ\"ר"} sortKey="costPerSqm" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} style={{ fontSize:'0.55rem', opacity:0.8 }} tooltip='עלות פרויקט כוללת מחולקת בשטח דירות יזם' />
                            <SortHeader label="הכנסה" sortKey="revenue" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip='סך הכנסות יזם משוערות ממכירת דירות, ללא מע"מ' />
                            <SortHeader label={"הכנסה/מ\"ר"} sortKey="revPerSqm" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} style={{ fontSize:'0.55rem', opacity:0.8 }} tooltip='הכנסות יזם ללא מע"מ מחולקות בשטח דירות יזם' />
                            <SortHeader label={"מחיר ממוצע/מ\"ר"} sortKey="totalAvgPricePerSqm" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} style={{ fontSize:'0.55rem', color: 'var(--accent)' }} tooltip='מחיר ממוצע למ"ר כולל מע"מ לכלל הדירות בפרויקט' />
                            <SortHeader label="רווח" sortKey="profit" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip='סך הכנסות יזם פחות סך עלויות פרויקט (ללא מע"מ)' />
                            <SortHeader label="רווחיות" sortKey="profitPct" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="אחוז הרווח ביחס לסך עלות הפרויקט (יעד מומלץ: מעל 20%)" />
                            <SortHeader label="הון עצמי" sortKey="equity" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="הון עצמי נדרש לפרויקט לפי אחוז ההון שהוגדר מתוך העלות" />
                            <SortHeader label="ROE" sortKey="annualRoe" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="תשואה שנתית על ההון העצמי ביחס למשך שנות הבנייה" />
                            <SortHeader label="IRR" sortKey="irr" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="שיעור התשואה הפנימי (Internal Rate of Return) המשקלל את עיתוי תזרימי המזומנים" />
                          </>
                        ) : (
                          <>
                            <SortHeader label="פרויקט" sortKey="name" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} align="right" tooltip="שם הפרויקט בפורטפוליו" />
                            <SortHeader label={"שטח עילי (מ\"ר)"} sortKey="planning.ag" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip='סך שטח בנייה עילית ברוטו (מתוך סעיף 3-4 בתקציב)' />
                            <SortHeader label="תת-קרקעי" sortKey="planning.ug" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip='סך שטח בנייה תת-קרקעית ברוטו (מתוך סעיף 3-3 בתקציב)' />
                            <SortHeader label="יחס תת-קרקעי/עילי" sortKey="planning.ugToAgRatio" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="היחס באחוזים בין שטח תת-קרקעי לשטח עילי" />
                            <SortHeader label="שטח דירות" sortKey="planning.taa" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="סך השטח הנקי (נטו) של כלל הדירות במלאי" />
                            <SortHeader label="שטח יזם" sortKey="planning.daa" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="סך שטח נטו של דירות לשיווק יזם" />
                            <SortHeader label="יעילות עילי" sortKey="planning.totalEffAG" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="יחס נטו/ברוטו עילי: שטח דירות חלקי שטח עילי" />
                            <SortHeader label="יעילות יזם/עילי" sortKey="planning.devEffAG" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="שטח דירות יזם חלקי שטח עילי" />
                            <SortHeader label="יעילות פרויקט" sortKey="planning.totalEffTotal" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="יחס נטו/ברוטו כולל: שטח דירות חלקי סך שטח הבנייה (עילי ותת-קרקעי)" />
                            <SortHeader label="יעילות יזם" sortKey="planning.devEffTotal" currentSort={portfolioSort} onSort={(k) => setPortfolioSort(p => ({ key: k, direction: p.key === k && p.direction === 'desc' ? 'asc' : 'desc' }))} tooltip="שטח דירות יזם חלקי סך שטח הבנייה (עילי ותת-קרקעי)" />
                          </>
                        )}
                      </tr>
                    </thead>
                      <tbody className="tactical-table">
                        {allProjectsKPIs.map((kpi,i)=>{
                          const col = PROJ_COLORS[kpi.colorIdx % PROJ_COLORS.length];
                          const projectIdx = projects.findIndex(p => p.id === kpi.id);
                          const fmtM = v => { 
                            const m = Math.abs(v)/1e6; 
                            const s = v < 0 ? '-' : ''; 
                            return s + (m >= 10 ? m.toFixed(1) : m.toFixed(2)) + 'M'; 
                          };
                          return (
                            <tr key={kpi.id} onClick={()=>{ setActiveProjectId(kpi.id); setActiveTab('budget'); }} style={{ cursor:'pointer' }}>
                              <td style={{ padding:'8px 4px', width: '40px' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', opacity: portfolioSort.key ? 0.2 : 1 }}>
                                  <button 
                                    onClick={() => moveProject(projectIdx, -1)}
                                    disabled={projectIdx === 0 || !!portfolioSort.key}
                                    style={{ background:'none', border:'none', padding:0, cursor: (projectIdx === 0 || !!portfolioSort.key) ? 'not-allowed' : 'pointer', display:'flex', color:'var(--text-sec)' }}
                                    title={portfolioSort.key ? "ביטול המיון מאפשר סידור ידני" : "הזז למעלה"}
                                  ><ChevronUp size={14} /></button>
                                  <button 
                                    onClick={() => moveProject(projectIdx, 1)}
                                    disabled={projectIdx === projects.length - 1 || !!portfolioSort.key}
                                    style={{ background:'none', border:'none', padding:0, cursor: (projectIdx === projects.length - 1 || !!portfolioSort.key) ? 'not-allowed' : 'pointer', display:'flex', color:'var(--text-sec)' }}
                                    title={portfolioSort.key ? "ביטול המיון מאפשר סידור ידני" : "הזז למטה"}
                                  ><ChevronDown size={14} /></button>
                                </div>
                              </td>
                              <td style={{ padding:'12px 16px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                  <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:col }}/>
                                  <input 
                                    value={kpi.name}
                                    onChange={(e) => {
                                      const newName = e.target.value;
                                      setProjects(prev => prev.map(p => p.id === kpi.id ? { ...p, name: newName } : p));
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      borderBottom: '1px solid transparent',
                                      fontWeight: 700,
                                      color: 'var(--text-pri)',
                                      fontSize: '0.85rem',
                                      textAlign: 'right',
                                      outline: 'none',
                                      width: '100%',
                                      padding: '2px 0',
                                      cursor: 'text'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.borderBottom = '1px solid var(--accent)';
                                      e.target.style.background = 'var(--bg-canvas)';
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.borderBottom = '1px solid transparent';
                                      e.target.style.background = 'transparent';
                                    }}
                                  />
                                </div>
                              </td>
                              {portfolioCompareMode === 'financial' ? (
                                <>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'center' }}>{kpi.totalUnits} ({Math.round(kpi.devUnits)})</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{fmtM(kpi.totalCost)}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{kpi.devArea > 0 ? Math.round(kpi.totalCost / kpi.devArea).toLocaleString() : '—'}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', color:'var(--accent)' }}>{fmtM(kpi.revenue)}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{kpi.devArea > 0 ? Math.round(kpi.revenue / kpi.devArea).toLocaleString() : '—'}</td>
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right', fontSize:'0.75rem', color:'var(--accent)', fontWeight: 600 }}>{kpi.totalAvgPricePerSqm > 0 ? Math.round(kpi.totalAvgPricePerSqm).toLocaleString() : '—'}</td>
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
                                  <td className="mono-number" style={{ padding:'12px 16px', textAlign:'right' }}>{(kpi.planning.ugToAgRatio * 100).toFixed(1)}%</td>
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
                          <td></td>
                          <td style={{ padding:'12px 16px' }}>סה"כ פורטפוליו</td>
                          {portfolioCompareMode === 'financial' ? (
                            <>
                              <td></td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{(()=> { const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); const tA=allProjectsKPIs.reduce((s,p)=>s+p.devArea,0); return tA > 0 ? Math.round(tC/tA).toLocaleString() : '—'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{(()=> { const tR=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0); const tA=allProjectsKPIs.reduce((s,p)=>s+p.devArea,0); return tA > 0 ? Math.round(tR/tA).toLocaleString() : '—'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--accent)' }}>{(()=> { 
                                const tV=allProjectsKPIs.reduce((s,p)=>s+(p.totalAvgPricePerSqm * p.totalArea),0); 
                                const tA=allProjectsKPIs.reduce((s,p)=>s+p.totalArea,0); 
                                return tA > 0 ? Math.round(tV/tA).toLocaleString() : '—'; 
                              })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.profit,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); const tP=allProjectsKPIs.reduce((s,p)=>s+p.profit,0); return (tP/tC*100).toFixed(1)+'%'; })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.equity,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                              <td colSpan={2}></td>
                            </>
                          ) : (
                            <>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); return t.toLocaleString(); })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.planning.ug,0); return t.toLocaleString(); })()}</td>
                              <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { 
                                const tAG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ag,0); 
                                const tUG=allProjectsKPIs.reduce((s,p)=>s+p.planning.ug,0); 
                                return tAG > 0 ? (tUG/tAG*100).toFixed(1)+'%' : '—'; 
                              })()}</td>
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

                {/* Portfolio Risk & Sensitivity Analysis */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                  
                  {/* Portfolio Sensitivity Matrix */}
                  <div className="tactical-card" style={{ padding: '1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={16} color="var(--primary)" />
                        מטריצת רגישות פורטפוליו
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>השפעת שינויים גלובליים על הרווחיות הכוללת (מיליוני ש"ח)</p>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>שינוי בהכנסה \ בעלות</th>
                            {[-10, -5, 0, 5, 10].map(v => (
                              <th key={v} style={{ padding: '8px', fontSize: '0.65rem', fontWeight: 700, textAlign: 'center' }}>{v > 0 ? '+' : ''}{v}%</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[-10, -5, 0, 5, 10].map(revShift => (
                            <tr key={revShift}>
                              <td style={{ padding: '8px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-sec)', textAlign: 'right' }}>{revShift > 0 ? '+' : ''}{revShift}% הכנסות</td>
                              {[-10, -5, 0, 5, 10].map(costShift => {
                                const totalProfit = allProjectsKPIs.reduce((sum, p) => {
                                  const baseIncome = p.revenue || 0;
                                  const baseCost = p.totalCost || 0;
                                  const shiftedIncome = baseIncome * (1 + revShift / 100);
                                  const shiftedCost = baseCost * (1 + costShift / 100);
                                  return sum + (shiftedIncome - shiftedCost);
                                }, 0);
                                const valM = totalProfit / 1e6;
                                return (
                                  <td key={costShift} style={{ 
                                    padding: '10px 4px', 
                                    textAlign: 'center', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 700,
                                    borderRadius: '4px',
                                    background: valM < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                    color: valM < 0 ? 'var(--danger)' : 'var(--accent)',
                                    border: '1px solid var(--border-sharp)'
                                  }}>
                                    {valM.toFixed(1)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Portfolio Monte Carlo */}
                  <div className="tactical-card" style={{ padding: '1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <PlayCircle size={16} color="var(--primary)" />
                          סימולציית מונטה קרלו (Portfolio)
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>ניתוח הסתברותי של ביצועי הפורטפוליו</p>
                      </div>
                      <button 
                        onClick={() => runPortfolioSimulation()}
                        style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        הפעל סימולציה
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem', background: 'var(--bg-canvas)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-sharp)' }}>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>בחירת תקופת סטיית תקן</label>
                        <select 
                          value={mcConfig.preset} 
                          onChange={(e) => {
                            const newPreset = e.target.value;
                            const params = VOL_PRESETS[newPreset];
                            setMcConfig(prev => ({ 
                              ...prev, 
                              preset: newPreset,
                              costVol: params.costVol,
                              revVol: params.revVol,
                              interestVol: params.interestVol
                            }));
                          }}
                          style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-sharp)', borderRadius: '4px', padding: '4px', fontSize: '0.7rem' }}
                        >
                          {Object.entries(VOL_PRESETS).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>מספר הרצות</label>
                        <input 
                          type="number" 
                          value={mcConfig.iterations}
                          onChange={(e) => setMcConfig(prev => ({ ...prev, iterations: parseInt(e.target.value) }))}
                          style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-sharp)', borderRadius: '4px', padding: '4px', fontSize: '0.7rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>רמת ביטחון</label>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px' }}>95% Confidence</div>
                      </div>
                    </div>

                    {portfolioMcResults && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                          <div style={{ background: 'var(--bg-canvas)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-sharp)' }}>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>תוחלת רווח (Mean)</span>
                            <div className="mono-number" style={{ fontSize: '1rem', fontWeight: 800, marginTop: '4px' }}>₪{(portfolioMcResults.stats.mean/1e6).toFixed(1)}M</div>
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

      {/* Explanation Modal */}
      <AnimatePresence>
        {explanationModal && (() => {
          const info = EXPLANATIONS[explanationModal];
          if (!info) return null;
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExplanationModal(null)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'var(--bg-elevated, #1e293b)',
                  border: '1px solid var(--border-sharp, #334155)',
                  borderRadius: '12px',
                  width: '100%',
                  maxWidth: '500px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                  padding: '24px',
                  direction: 'rtl',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-sharp, #334155)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-pri, #f8fafc)' }}>
                    {info.title}
                  </h3>
                  <button 
                    onClick={() => setExplanationModal(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #94a3b8)',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-pri)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    ✕
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent, #38bdf8)', textTransform: 'uppercase', marginBottom: '6px' }}>הסבר ומטרה</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-sec, #cbd5e1)', lineHeight: 1.5, margin: 0 }}>
                      {info.desc}
                    </p>
                  </div>
                  
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent, #38bdf8)', textTransform: 'uppercase', marginBottom: '6px' }}>נוסחת חישוב</h4>
                    <div style={{ 
                      background: 'var(--bg-canvas, #0f172a)', 
                      padding: '12px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--border-sharp, #1e293b)',
                      fontFamily: 'monospace, sans-serif',
                      fontSize: '0.85rem',
                      color: 'var(--text-pri, #f8fafc)',
                      lineHeight: 1.4
                    }}>
                      {info.formula}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setExplanationModal(null)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--primary, #38bdf8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'filter 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                  >
                    הבנתי, תודה
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast-box">
            <CheckCircle size={16} color="var(--accent)" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
