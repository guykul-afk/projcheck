// ─── Pure Financial Calculation Engines for ProjectCheck ───

export function computeInventoryStats(inventoryData, project) {
  const arr = inventoryData || [];
  const totalUnits = arr.length;
  if (totalUnits === 0) {
    return {
      totalUnits: 0,
      devUnits: 0,
      ownerUnits: 0,
      devUnitsPct: '0.0',
      totalArea: 0,
      devArea: 0,
      devAreaPct: '0.0',
      devValueInclVat: 0,
      devValueExclVat: 0,
      devValuePct: 0,
      ownerValueInclVat: 0,
      totalProjectValue: 0,
      avgPricePerSqm: 0,
      isCombinationDeal: false,
      combinationLandownerPct: 40,
      combinationDevPct: 60
    };
  }
  
  const isComb = Boolean(project?.isCombinationDeal);
  const landownerPct = Number(project?.combinationLandownerPct ?? 40);
  const devPct = Math.max(0, Math.min(100, 100 - landownerPct));
  const getShare = (a) => isComb ? devPct : (a.contractorSharePct !== undefined ? a.contractorSharePct : (a.type === 'יזם' ? 100 : 0));

  const devUnits = arr.reduce((s, a) => s + (getShare(a) / 100), 0);
  const ownerUnits = totalUnits - devUnits;
  
  const totalArea = arr.reduce((s, a) => s + (a.area || 0), 0);
  const devArea = arr.reduce((s, a) => {
    const share = getShare(a);
    return s + ((a.area || 0) * share / 100);
  }, 0);
  
  const devValueInclVat = arr.reduce((s, a) => {
    const share = getShare(a);
    return s + ((a.price || 0) * share / 100);
  }, 0);
  
  const ownerValueInclVat = arr.reduce((s, a) => {
    const share = getShare(a);
    return s + ((a.price || 0) * (100 - share) / 100);
  }, 0);
  
  const totalValue = arr.reduce((s, a) => s + (a.price || 0), 0);
  
  const specialValueInclVat = arr.reduce((s, a) => {
    if (a.category !== 'מיוחדת') return s;
    const share = getShare(a);
    return s + ((a.price || 0) * share / 100);
  }, 0);

  const specialArea = arr.reduce((s, a) => (a.category === 'מיוחדת' ? s + (a.area || 0) : s), 0);
  
  const devValueExclVat = devValueInclVat / 1.17;
  const specialValueExclVat = specialValueInclVat / 1.17;

  const avgAptArea = totalUnits > 0 ? (totalArea / totalUnits) : 0;
  const specialAreaPctTotal = totalArea > 0 ? (specialArea / totalArea * 100).toFixed(1) : 0;
  
  const roomGroups = arr.reduce((acc, a) => {
    const r = a.rooms || 0;
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const roomSplit = Object.keys(roomGroups).map(r => {
    const segmentUnits = arr.filter(a => a.rooms === Number(r));
    const segmentArea = segmentUnits.reduce((s, a) => s + (a.area || 0), 0);
    const segmentValue = segmentUnits.reduce((s, a) => s + (a.price || 0), 0);
    return {
      rooms: r,
      count: roomGroups[r],
      pct: (roomGroups[r] / totalUnits * 100).toFixed(1),
      avgPrice: segmentArea > 0 ? (segmentValue / segmentArea) : 0
    };
  }).sort((a,b) => a.rooms - b.rooms);
  
  return {
    totalUnits,
    devUnits,
    ownerUnits,
    devUnitsPct: totalUnits > 0 ? (devUnits / totalUnits * 100).toFixed(1) : '0.0',
    totalArea,
    devArea,
    devAreaPct: totalArea > 0 ? (devArea / totalArea * 100).toFixed(1) : '0.0',
    avgAptArea,
    specialAreaPctTotal,
    roomSplit,
    devValueInclVat,
    devValueExclVat,
    specialValueExclVat,
    specialValuePct: devValueExclVat > 0 ? (specialValueExclVat / devValueExclVat * 100).toFixed(1) : 0,
    devValuePct: totalValue > 0 ? (devValueInclVat / totalValue * 100).toFixed(1) : 0,
    ownerValueInclVat,
    totalProjectValue: totalValue,
    avgPricePerSqm: devArea > 0 ? devValueInclVat / devArea : 0,
    totalAvgPricePerSqm: totalArea > 0 ? totalValue / totalArea : 0
  };
}

export function computeBudgetStats(budgetData, invStats, constructionMonths, financingPercent) {
  const { totalUnits = 0, ownerUnits = 0, devValueInclVat = 0 } = invStats || {};
  const cMonths = Number(constructionMonths) || 24;
  const fPct = Number(financingPercent) || 7;

  const proc = (budgetData || []).map(sec => ({
    ...sec,
    items: (sec.items || []).map(item => {
      let total = item.total, qty = Number(item.quantity) || 0, pv = parseFloat(item.price) || 0;
      if (item.id === '1-1' || item.id === '1-2') { /* manual */ }
      else if (item.id === '1-3') { qty = (cMonths + 4) * ownerUnits; total = pv * qty; }
      else if (item.id === '1-4' || item.id === '1-5') { total = pv * qty; }
      else if (item.id === '2-1') { qty = totalUnits; total = pv * qty; }
      else if (item.id === '2-2') { qty = cMonths + 3; total = pv * qty; }
      else if (item.id === '2-3') { const p = parseFloat(item.price) / 100 || 0; qty = devValueInclVat; total = p * qty; }
      else if (item.id === '2-8') { const p = parseFloat(item.price) / 100 || 0; qty = devValueInclVat; total = p * qty; }
      else if (item.id === '2-4' || item.id === '2-5') { total = pv * qty; }
      else if (item.id === '2-6') { qty = totalUnits; total = pv * qty; }
      else if (item.id === '2-11' || item.id === '2-12' || item.id === '2-13') {
        if (item.id === '2-12' || item.id === '2-13') qty = cMonths + 6;
        total = pv * qty;
      }
      else if (item.id.startsWith('3-')) { total = pv * qty; }
      return { ...item, quantity: qty, total };
    })
  }));

  const baseSum = (excl) => proc.reduce((a, s) => a + s.items.reduce((b, i) => !excl.includes(i.id) ? b + i.total : b, 0), 0);
  const final = proc.map(sec => ({
    ...sec,
    items: sec.items.map(item => {
      if (item.id === '2-7' || item.id === '2-12' || item.id === '2-13') {
        const q = cMonths + 6;
        return { ...item, quantity: q, total: (parseFloat(item.price) || 0) * q };
      }
      if (item.id === '2-9') {
        const p = parseFloat(item.price) / 100 || 0;
        const s = baseSum(['2-9']);
        return { ...item, quantity: s, total: p * s };
      }
      return item;
    })
  }));

  const sections = final.map(sec => ({
    name: sec.section,
    total: sec.items.reduce((a, i) => a + (i.total || 0), 0),
    color: sec.color
  }));

  const sumExcl = sections.reduce((a, s) => a + s.total, 0);
  const financing = Math.round(sumExcl * (fPct / 100));
  sections.push({ name: 'מימון וערבויות', total: financing, color: '#8E9AAF' });
  const grandTotal = sumExcl + financing;
  const allItems = final.flatMap(sec => sec.items.map(i => ({ ...i, section: sec.section })));
  allItems.push({ id: 'fin', name: 'מימון וערבויות', total: financing, section: 'מימון' });

  return {
    sections,
    grandTotal,
    sortedItems: [...allItems].sort((a, b) => (b.total || 0) - (a.total || 0)),
    finalSections: final,
    financing
  };
}

export function buildMonthlyData(project, budStats, invStats, options = {}) {
  const months = options.constructionMonths ?? project.constructionMonths ?? 24;
  const equityAmt = budStats.grandTotal * ((options.equityPercent ?? project.equityPercent ?? 30) / 100);
  const p2080 = options.p2080Percent ?? project.p2080Percent ?? 50;
  const presaleStartMonth = Math.max(1, options.presaleStartMonth ?? 1);
  const salesData = options.salesData ?? project.salesData ?? [];

  let fixedM1 = 0, constrT = 0, linT = 0;
  budStats.finalSections.forEach(sec => sec.items.forEach(item => {
    const n = (item && item.name) ? item.name.toLowerCase() : '';
    if (n.includes('רכישה') || n.includes('השבחה') || n.includes('קרקע') || n.includes('אגרות') || n.includes('היטלים')) {
      fixedM1 += (item.total || 0);
    } else if (item && item.id && item.id.startsWith('3-')) {
      constrT += (item.total || 0);
    } else {
      linT += (item ? (item.total || 0) : 0);
    }
  }));
  linT += (budStats.financing || 0);

  const p1E = Math.max(1, Math.floor(months * 0.25));
  const p2E = Math.max(p1E + 1, Math.floor(months * 0.75));
  const cByM = Array(months + 2).fill(0);

  for (let m = 1; m <= months; m++) {
    if (m <= p1E) cByM[m] = (constrT * 0.15) / p1E;
    else if (m <= p2E) cByM[m] = (constrT * 0.70) / (p2E - p1E);
    else cByM[m] = (constrT * 0.15) / ((months - p2E) || 1);
  }

  const linMo = linT / months;
  const devU = invStats.devUnits || 0;
  const avgPx = invStats.devValueExclVat / (devU || 1);
  const n2080 = Math.round(devU * p2080 / 100);
  let alloc = 0;
  const revByM = Array(months + 2).fill(0);

  salesData.forEach((units, i) => {
    if (units <= 0) return;
    const sm = Math.max(1, (i * 2) + presaleStartMonth);
    const c2 = Math.min(units, Math.max(0, n2080 - alloc));
    const cL = units - c2;

    if (c2 > 0) {
      const v = c2 * avgPx;
      const mIdx = Math.min(months + 1, sm);
      revByM[mIdx] += v * 0.2;
      revByM[months + 1] += v * 0.8;
      alloc += c2;
    }
    if (cL > 0) {
      const v = cL * avgPx;
      const rem = (months + 1) - sm;
      const ins = v / 5;
      for (let m = 0; m < 5; m++) {
        const off = rem > 0 ? (m * (rem / 5)) : 0;
        const targetMonth = Math.min(months + 1, Math.round(sm + off));
        revByM[targetMonth] += ins;
      }
    }
  });

  const irrCF = [-equityAmt];
  const equityExp = [0];
  const cumCosts = [equityAmt];
  const cumRevs = [equityAmt];
  let cumC = equityAmt;
  let cumR = equityAmt;

  for (let m = 1; m <= months + 1; m++) {
    let cost = 0;
    if (m === 1) cost += fixedM1;
    if (m <= months) cost += (cByM[m] || 0) + linMo;
    const rev = revByM[m] || 0;
    irrCF.push(rev - cost);
    cumC += cost;
    cumR += rev;
    cumCosts.push(cumC);
    cumRevs.push(cumR);
    equityExp.push(Math.max(0, cumC - cumR));
  }

  return {
    irrCF,
    equityExposure: equityExp,
    cumCosts,
    cumRevs,
    costByMonth: cByM,
    revByMonth: revByM,
    maxExposure: Math.max(...equityExp),
    months
  };
}

export function calculateIRR(cashflows) {
  if (!cashflows || cashflows.length < 2) return null;
  let hasPositive = false;
  let hasNegative = false;
  for (const val of cashflows) {
    if (val > 0) hasPositive = true;
    if (val < 0) hasNegative = true;
    if (hasPositive && hasNegative) break;
  }
  if (!hasPositive || !hasNegative) return null;

  let r = 0.1;
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
    if (r <= -1) r = -0.999999;
    if (r > 10) r = 10;
  }
  
  const finalAnnualized = (Math.pow(1 + r, 12) - 1) * 100;
  return (isFinite(finalAnnualized) && finalAnnualized > -99 && finalAnnualized < 1000) ? finalAnnualized : null;
}

export function getProjectRisk(profitPct, annualRoe, irr) {
  if (profitPct > 25 && annualRoe > 15 && (irr == null || irr > 20)) {
    return { level: 'green', color: '#10b981', bg: '#064e3b20', label: 'בריא', icon: '🟢' };
  }
  if (profitPct > 15 && annualRoe > 10 && (irr == null || irr > 12)) {
    return { level: 'yellow', color: '#f59e0b', bg: '#78350f20', label: 'גבולי', icon: '🟡' };
  }
  return { level: 'red', color: '#e11d48', bg: '#88133720', label: 'בעייתי', icon: '🔴' };
}

export function computeProjectKPIs(project, overrideOptions = {}) {
  const inv = computeInventoryStats(project.inventoryData, project);
  const bud = computeBudgetStats(
    project.budgetData,
    inv,
    overrideOptions.constructionMonths ?? project.constructionMonths ?? 24,
    overrideOptions.financingPercent ?? project.financingPercent ?? 7
  );
  
  const totalCost = bud.grandTotal;
  const revenue = inv.devValueExclVat;
  const profit = revenue - totalCost;
  const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const equity = totalCost * ((overrideOptions.equityPercent ?? project.equityPercent ?? 30) / 100);
  const roe = equity > 0 ? (profit / equity) * 100 : 0;
  const years = (overrideOptions.constructionMonths ?? project.constructionMonths ?? 24) / 12 || 1;
  const annualRoe = roe / years;
  
  const monthlyData = buildMonthlyData(project, bud, inv, overrideOptions);
  const irr = calculateIRR(monthlyData.irrCF);
  const risk = getProjectRisk(profitPct, annualRoe, irr);

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

  const fixedCost = bud.finalSections[0]?.items.reduce((a, i) => a + (i.total || 0), 0) || 0;
  const variableCost = Math.max(0, totalCost - (fixedCost + (bud.financing || 0)));
  const financing = bud.financing || 0;

  return {
    totalCost,
    fixedCost,
    variableCost,
    financing,
    revenue,
    profit,
    profitPct,
    equity,
    roe,
    annualRoe,
    irr,
    risk,
    equityExposure: monthlyData.equityExposure,
    maxExposure: monthlyData.maxExposure,
    cumCosts: monthlyData.cumCosts,
    cumRevs: monthlyData.cumRevs,
    costByMonth: monthlyData.costByMonth,
    revByMonth: monthlyData.revByMonth,
    months: monthlyData.months,
    devUnits: inv.devUnits,
    totalUnits: inv.totalUnits,
    devArea: inv.devArea,
    totalArea: inv.totalArea,
    totalAvgPricePerSqm: inv.totalAvgPricePerSqm,
    constructionMonths: overrideOptions.constructionMonths ?? project.constructionMonths ?? 24,
    financingPercent: overrideOptions.financingPercent ?? project.financingPercent ?? 7,
    planning
  };
}
