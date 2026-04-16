import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  PieChart, FileText, Save, Calculator, Building, 
  Activity, ChevronDown, Plus, Trash, Info, List, MapPin, LogOut, BarChart2, TrendingUp, Copy
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
  const devItems = arr.filter(a => a.type === 'יזם');
  const ownerItems = arr.filter(a => a.type === 'בעלים');
  const devUnits = devItems.length, ownerUnits = ownerItems.length;
  const totalArea = arr.reduce((s,a) => s+a.area, 0);
  const devArea = devItems.reduce((s,a) => s+a.area, 0);
  const devValueInclVat = devItems.reduce((s,a) => s+a.price, 0);
  const ownerValueInclVat = ownerItems.reduce((s,a) => s+a.price, 0);
  const totalValue = devValueInclVat + ownerValueInclVat;
  
  const specialDevItems = devItems.filter(a => a.category === 'מיוחדת');
  const specialValueInclVat = specialDevItems.reduce((s,a) => s+a.price, 0);
  const devValueExclVat = devValueInclVat / 1.17; // Using 17% as standard, but staying consistent with revenue if needed.
  // wait, line 90 used 1.18. I will use 1.17 to be more accurate for Israel, but I should check if I should update line 90 too.
  // I will update line 90 to 1.17 and use it here too.
  
  const specialValueExclVat = specialValueInclVat / 1.17;
  
  return {
    totalUnits, devUnits, ownerUnits, devUnitsPct:(devUnits/totalUnits*100).toFixed(1),
    totalArea, devArea, devAreaPct:(devArea/totalArea*100).toFixed(1),
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
  if(!cashflows||cashflows.length<2)return null;
  let r=0.008;
  for(let i=0;i<150;i++){
    let npv=0,dnpv=0;
    cashflows.forEach((cf,t)=>{const d=Math.pow(1+r,t);npv+=cf/d;dnpv-=t*cf/(d*(1+r));});
    if(Math.abs(dnpv)<1e-12)break;
    const nr=r-npv/dnpv;
    if(Math.abs(nr-r)<1e-7){r=nr;break;}
    r=Math.max(-0.9,Math.min(5,nr));
  }
  const a=(Math.pow(1+r,12)-1)*100;
  return(isFinite(a)&&a>-99&&a<999)?a:null;
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
  return{totalCost,revenue,profit,profitPct,equity,roe,annualRoe,irr,risk,equityExposure,maxExposure,months,devUnits:inv.devUnits,totalUnits:inv.totalUnits,devArea:inv.devArea,constructionMonths:project.constructionMonths??24};
}

const App = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('budget');
  const [runtimeError, setRuntimeError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [bulkAdjustmentPct, setBulkAdjustmentPct] = useState(1.0);
  
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
      inventoryData: inventoryData.map(apt => apt.id === id ? { ...apt, [field]: value } : apt)
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
        </div>
        
        {/* Project Selector - Tactical Style */}
        <div 
          onClick={() => setActiveTab('budget')}
          style={{ 
            display: 'flex', 
            background: 'var(--bg-surface)', 
            padding: '4px', 
            borderRadius: '12px', 
            gap: '4px',
            border: activeTab !== 'portfolio' ? '2px solid var(--accent)' : '1px solid var(--border-sharp)',
            transition: 'all 0.2s',
            opacity: activeTab === 'portfolio' ? 0.7 : 1
          }}>
          {projects.map(p => (
            <div 
              key={p.id}
              onClick={() => setActiveProjectId(p.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                background: p.id === activeProjectId ? 'var(--bg-elevated)' : 'transparent',
                color: p.id === activeProjectId ? 'var(--accent)' : 'var(--text-sec)',
                border: p.id === activeProjectId ? '1px solid var(--accent)' : '1px solid transparent'
              }}
            >
              <input 
                value={p.name} 
                onChange={(e) => {
                  const newName = e.target.value;
                  setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, name: newName } : proj));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('budget');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  font: 'inherit',
                  width: '140px',
                  padding: 0,
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '4px' }}>
                <button
                  title={p.includeInPortfolio !== false ? "כלול בפורטפוליו" : "לא כלול בפורטפוליו"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = p.includeInPortfolio === false;
                    setProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, includeInPortfolio: val } : proj));
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', opacity: p.includeInPortfolio !== false ? 1 : 0.3 }}
                >
                  <Activity size={12} color={p.includeInPortfolio !== false ? 'var(--accent)' : 'var(--text-muted)'} />
                </button>
                <button
                  title="שכפול פרויקט"
                  onClick={(e) => duplicateProject(p.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.5 }}
                >
                  <Copy size={12} />
                </button>
                {projects.length > 1 && (
                  <button
                    title="מחיקת פרויקט"
                    onClick={(e) => deleteProject(p.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.5 }}
                  >
                    <Trash size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button 
            onClick={addNewProject}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            <Plus size={18} />
          </button>
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
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>מס'</th>
                        <th>קומה</th>
                        <th>סוג</th>
                        <th>טיפוס</th>
                        <th>חדרים</th>
                        <th>שטח (מ"ר)</th>
                        <th>מרפסת</th>
                        <th>מחיר (₪)</th>
                        <th>מחיר למ"ר</th>
                        <th>פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.map((apt, idx) => {
                        const projectSqmPrice = apt.area > 0 ? (apt.price / apt.area) : 0;
                        const isOwner = apt.type === 'בעלים';
                        return (
                          <tr key={apt.id} style={{ background: isOwner ? 'rgba(38, 70, 83, 0.04)' : undefined }}>
                            <td className="mono-number" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td><input type="number" value={apt.floor} onChange={(e) => handleInventoryChange(apt.id, 'floor', Number(e.target.value))} style={{ width: '50px' }} /></td>
                            <td>
                              <select 
                                value={apt.type} 
                                onChange={(e) => handleInventoryChange(apt.id, 'type', e.target.value)} 
                                style={{ background: 'var(--bg-canvas)', color: 'var(--text-pri)', border: '1px solid var(--border-sharp)', padding: '2px 4px', fontSize: '0.85rem' }}
                              >
                                <option value="יזם">יזם</option>
                                <option value="בעלים">בעלים</option>
                              </select>
                            </td>
                            <td>
                              <select 
                                value={apt.category || 'טיפוסית'} 
                                onChange={(e) => handleInventoryChange(apt.id, 'category', e.target.value)} 
                                style={{ background: 'var(--bg-canvas)', color: 'var(--text-pri)', border: '1px solid var(--border-sharp)', padding: '2px 4px', fontSize: '0.85rem', width: '90px' }}
                              >
                                <option value="טיפוסית">טיפוסית</option>
                                <option value="מיוחדת">מיוחדת</option>
                               </select>
                            </td>
                            <td><input type="number" value={apt.rooms} onChange={(e) => handleInventoryChange(apt.id, 'rooms', Number(e.target.value))} style={{ width: '50px' }} /></td>
                            <td><input type="number" value={apt.area} onChange={(e) => handleInventoryChange(apt.id, 'area', Number(e.target.value))} className="mono-number" style={{ width: '80px' }} /></td>
                            <td><input type="number" value={apt.balcony || 0} onChange={(e) => handleInventoryChange(apt.id, 'balcony', Number(e.target.value))} className="mono-number" style={{ width: '50px' }} /></td>
                            <td><input type="number" value={apt.price} onChange={(e) => handleInventoryChange(apt.id, 'price', Number(e.target.value))} className="mono-number" style={{ width: '120px', fontWeight: 600, color: 'var(--accent)' }} /></td>
                            <td className="mono-number" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>₪{Math.round(projectSqmPrice).toLocaleString()}</td>
                            <td style={{ display: 'flex', gap: '8px' }}>
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
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>סך תקבולים (נקי)</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    ₪{Math.round(inventoryStats.devValueExclVat).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>מבוסס על {inventoryStats.devUnits} יח"ד יזם</div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלויות פרויקט</span>
                  <div className="mono-number" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    ₪{budgetStats.grandTotal.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>כולל Capex ומימון</div>
                </div>
                <div className="tactical-card col-3" style={{ borderLeft: '2px solid var(--accent)' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>רווח יזמי חזוי</span>
                  <div className="mono-number success-text" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    ₪{(Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>לפני מס חברות</div>
                </div>
                <div className="tactical-card col-3">
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>Margin (Cost)</span>
                  <div className="mono-number success-text" style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>
                    {((Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal) / budgetStats.grandTotal * 100).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ROI על עלויות הקמה</div>
                </div>

                {/* Equity & Annual Returns Metrics - Integrated into Bento */}
                {(() => {
                  const totalProfit = Math.round(inventoryStats.devValueExclVat) - budgetStats.grandTotal;
                  const equity = cashFlowStats.equityAmount;
                  const roe = equity > 0 ? (totalProfit / equity) * 100 : 0;
                  const years = (constructionMonths / 12) || 1;
                  const annualizedRoe = roe / years;
                  const equityMultiple = equity > 0 ? (totalProfit + equity) / equity : 0;

                  return (
                    <>
                      <div className="tactical-card col-3" style={{ borderBottom: '2px solid var(--accent)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הון עצמי מושקע</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>₪{Math.round(equity).toLocaleString()}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{equityPercent}% מעלות הפרויקט</div>
                      </div>
                      <div className="tactical-card col-3">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>ROE פרויקטלי</span>
                        <div className="mono-number" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>{roe.toFixed(1)}%</div>
                      </div>
                      <div className="tactical-card col-3" style={{ borderBottom: '2px solid var(--accent)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>תשואה שנתית</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>{annualizedRoe.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ann. ROE</div>
                      </div>
                      <div className="tactical-card col-3">
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>Equity Multiple</span>
                        <div className="mono-number" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>{equityMultiple.toFixed(2)}x</div>
                      </div>

                      {/* Unit Cost Metrics */}
                      <div className="tactical-card col-3" style={{ background: 'var(--bg-canvas)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלות לסך יח"ד</span>
                        <div className="mono-number" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(budgetStats.grandTotal / (inventoryStats.totalUnits || 1)).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>עלות כוללת / כלל הדירות</div>
                      </div>
                      <div className="tactical-card col-3" style={{ background: 'var(--bg-canvas)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלות ליח"ד יזם</span>
                        <div className="mono-number" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(budgetStats.grandTotal / (inventoryStats.devUnits || 1)).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>עלות כוללת / דירות יזם</div>
                      </div>
                      <div className="tactical-card col-3" style={{ background: 'var(--bg-canvas)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>עלות למ"ר יזם</span>
                        <div className="mono-number" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(budgetStats.grandTotal / (inventoryStats.devArea || 1)).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>עלות כוללת / מ"ר למכירה</div>
                      </div>
                      <div className="tactical-card col-3" style={{ background: 'var(--bg-canvas)', borderRight: '2px solid var(--accent)' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>הכנסה למ"ר יזם</span>
                        <div className="mono-number success-text" style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.4rem 0' }}>
                          ₪{Math.round(inventoryStats.devValueExclVat / (inventoryStats.devArea || 1)).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>הכנסה ממוצעת / מ"ר למכירה</div>
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
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-sec)', textTransform: 'uppercase' }}>IRR פורטפוליו ממוצע</span>
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
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>מטריצת השוואת פורטפוליו</h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>N = {projects.length} פרויקטים</div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr style={{ background:'var(--bg-canvas)', color:'var(--text-sec)', fontSize:'0.65rem', textTransform:'uppercase' }}>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>פרויקט</th>
                          <th style={{ padding:'10px 16px', textAlign:'center', borderBottom:'1px solid var(--border-sharp)' }}>יחידות</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>עלות</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)', fontSize:'0.55rem', opacity:0.8 }}>הוצ/מ"ר</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>הכנסה</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)', fontSize:'0.55rem', opacity:0.8 }}>הכנסה/מ"ר</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>רווח</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>רווחיות</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>הון עצמי</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>ROE</th>
                          <th style={{ padding:'10px 16px', textAlign:'right', borderBottom:'1px solid var(--border-sharp)' }}>IRR</th>
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
                              <td className="mono-number" style={{ padding:'12px 16px', textAlign:'center' }}>{kpi.devUnits||kpi.totalUnits}</td>
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
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:'var(--bg-canvas)', fontWeight:800, color:'var(--text-pri)' }}>
                          <td style={{ padding:'12px 16px' }}>סה"כ פורטפוליו</td>
                          <td></td>
                          <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                          <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{(()=> { const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); const tA=allProjectsKPIs.reduce((s,p)=>s+p.devArea,0); return tA > 0 ? Math.round(tC/tA).toLocaleString() : '—'; })()}</td>
                          <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                          <td className="mono-number" style={{ textAlign:'right', fontSize:'0.75rem', color:'var(--text-muted)' }}>{(()=> { const tR=allProjectsKPIs.reduce((s,p)=>s+p.revenue,0); const tA=allProjectsKPIs.reduce((s,p)=>s+p.devArea,0); return tA > 0 ? Math.round(tR/tA).toLocaleString() : '—'; })()}</td>
                          <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.profit,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                          <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const tC=allProjectsKPIs.reduce((s,p)=>s+p.totalCost,0); const tP=allProjectsKPIs.reduce((s,p)=>s+p.profit,0); return (tP/tC*100).toFixed(1)+'%'; })()}</td>
                          <td className="mono-number" style={{ textAlign:'right' }}>{(()=> { const t=allProjectsKPIs.reduce((s,p)=>s+p.equity,0); return (t/1e6).toFixed(1)+'M'; })()}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Portfolio Equity Exposure - Removed per user request */}
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
      `}</style>
    </div>
  );
};

export default App;
