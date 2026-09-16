// ─── Monte Carlo Engine & Probability Distribution for ProjectCheck ───
import { computeProjectKPIs } from './financialCalculations';

export function randomNormal(mean, stdDev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

export function runMonteCarlo(project, config) {
  const { iterations = 1000, costVol = 8, revVol = 12, interestVol = 2 } = config;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const costMult = Math.max(0.6, randomNormal(1, costVol / 100));
    const revMult = Math.max(0.5, randomNormal(1, revVol / 100));
    const interestDelta = randomNormal(0, interestVol);

    const perturbedProject = {
      ...project,
      financingPercent: Math.max(0, (project.financingPercent ?? 7) + interestDelta),
      budgetData: (project.budgetData || []).map(sec => ({
        ...sec,
        items: (sec.items || []).map(item => ({
          ...item,
          total: (item.total || 0) * costMult
        }))
      })),
      inventoryData: (project.inventoryData || []).map(apt => ({
        ...apt,
        price: (apt.price || 0) * revMult
      }))
    };

    const kpis = computeProjectKPIs(perturbedProject);
    results.push({
      profit: kpis.profit,
      roe: kpis.roe,
      irr: kpis.irr || 0,
      totalCost: kpis.totalCost,
      revenue: kpis.revenue
    });
  }

  const profits = results.map(r => r.profit).sort((a, b) => a - b);
  const irrs = results.map(r => r.irr).sort((a, b) => a - b);
  const meanProfit = profits.reduce((a, b) => a + b, 0) / iterations;
  const p5 = profits[Math.floor(iterations * 0.05)] || 0;
  const p25 = profits[Math.floor(iterations * 0.25)] || 0;
  const p50 = profits[Math.floor(iterations * 0.50)] || 0;
  const p75 = profits[Math.floor(iterations * 0.75)] || 0;
  const p95 = profits[Math.floor(iterations * 0.95)] || 0;
  const probLoss = (profits.filter(p => p < 0).length / iterations) * 100;
  
  // Value at Risk (VaR 95%): difference between mean profit and P5
  const valueAtRisk95 = Math.max(0, meanProfit - p5);

  // Generate 25-bin histogram for smooth visual rendering
  const minProfit = profits[0];
  const maxProfit = profits[profits.length - 1];
  const binCount = 30;
  const binWidth = (maxProfit - minProfit) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const x0 = minProfit + (i * binWidth);
    const x1 = x0 + binWidth;
    return {
      binIndex: i,
      x0,
      x1,
      mid: (x0 + x1) / 2,
      count: 0,
      isLoss: (x0 + x1) / 2 < 0
    };
  });

  profits.forEach(p => {
    let idx = Math.floor((p - minProfit) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  });

  const maxBinCount = Math.max(1, ...bins.map(b => b.count));
  const normalizedBins = bins.map(b => ({
    ...b,
    density: b.count / maxBinCount,
    pct: (b.count / iterations) * 100
  }));

  return {
    raw: results,
    stats: {
      meanProfit,
      p5,
      p25,
      p50,
      p75,
      p95,
      probLoss,
      valueAtRisk95,
      minProfit,
      maxProfit,
      medianIrr: irrs[Math.floor(iterations * 0.5)] || 0
    },
    bins: normalizedBins,
    config
  };
}
