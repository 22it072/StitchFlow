import { formatWeight, formatCost } from './formatters';

/**
 * Calculate Warp Net Weight (WITHOUT wastage)
 * Formula: (Tar × Denier) / 9
 */
export function calculateWarpNetWeight(tar, denier) {
  return (tar * denier) / 9;
}

/**
 * Calculate Warp Raw Weight (WITH wastage)
 * Formula: (Tar × Denier × Wastage) / 9
 */
export function calculateWarpRawWeight(tar, denier, wastagePercent) {
  const wastageMultiplier = 1 + (wastagePercent / 100);
  return (tar * denier * wastageMultiplier) / 9;
}

/**
 * Calculate Weft Net Weight (WITHOUT wastage)
 * Formula: (Peek × Panna × Denier) / 9
 */
export function calculateWeftNetWeight(peek, panna, denier) {
  return (peek * panna * denier) / 9;
}

/**
 * Calculate Weft Raw Weight (WITH wastage)
 * Formula: (Peek × Panna × Denier × Wastage) / 9
 */
export function calculateWeftRawWeight(peek, panna, denier, wastagePercent) {
  const wastageMultiplier = 1 + (wastagePercent / 100);
  return (peek * panna * denier * wastageMultiplier) / 9;
}

/**
 * Calculate Raw Cost
 * Formula: Formatted Weight × (Yarn Price + GST Amount)
 */
export function calculateRawCost(formattedWeight, yarnPrice, gstPercentage) {
  const gstAmount = (yarnPrice * gstPercentage) / 100;
  const priceWithGst = yarnPrice + gstAmount;
  return formattedWeight * priceWithGst;
}

/**
 * Perform complete estimate calculation
 */
export function calculateEstimate(inputs, weightPrecision = 4, costPrecision = 2) {
  const {
    warp,
    weft,
    weft2Enabled,
    weft2,
    otherCostPerMeter,
  } = inputs;

  const results = {
    warp: {},
    weft: {},
    weft2: null,
    totals: {},
    wastage: {}, // NEW: Wastage section
  };

  // === WARP CALCULATIONS ===
  // Net Weight (without wastage)
  results.warp.netWeight = calculateWarpNetWeight(warp.tar, warp.denier);
  results.warp.formattedNetWeight = formatWeight(results.warp.netWeight, weightPrecision);
  
  // Raw Weight (with wastage)
  results.warp.rawWeight = calculateWarpRawWeight(warp.tar, warp.denier, warp.wastage);
  results.warp.formattedWeight = formatWeight(results.warp.rawWeight, weightPrecision);
  
  // Cost calculation (uses weight WITH wastage)
  results.warp.rawCost = calculateRawCost(
    results.warp.formattedWeight,
    warp.yarnPrice,
    warp.yarnGst
  );
  results.warp.formattedCost = formatCost(results.warp.rawCost, costPrecision);

  // === WEFT CALCULATIONS ===
  // Net Weight (without wastage)
  results.weft.netWeight = calculateWeftNetWeight(weft.peek, weft.panna, weft.denier);
  results.weft.formattedNetWeight = formatWeight(results.weft.netWeight, weightPrecision);
  
  // Raw Weight (with wastage)
  results.weft.rawWeight = calculateWeftRawWeight(
    weft.peek,
    weft.panna,
    weft.denier,
    weft.wastage
  );
  results.weft.formattedWeight = formatWeight(results.weft.rawWeight, weightPrecision);
  
  // Cost calculation
  results.weft.rawCost = calculateRawCost(
    results.weft.formattedWeight,
    weft.yarnPrice,
    weft.yarnGst
  );
  results.weft.formattedCost = formatCost(results.weft.rawCost, costPrecision);

  // === WEFT-2 CALCULATIONS ===
  if (weft2Enabled && weft2) {
    results.weft2 = {};
    
    // Net Weight (without wastage)
    results.weft2.netWeight = calculateWeftNetWeight(weft2.peek, weft2.panna, weft2.denier);
    results.weft2.formattedNetWeight = formatWeight(results.weft2.netWeight, weightPrecision);
    
    // Raw Weight (with wastage)
    results.weft2.rawWeight = calculateWeftRawWeight(
      weft2.peek,
      weft2.panna,
      weft2.denier,
      weft2.wastage
    );
    results.weft2.formattedWeight = formatWeight(results.weft2.rawWeight, weightPrecision);
    
    // Cost calculation
    results.weft2.rawCost = calculateRawCost(
      results.weft2.formattedWeight,
      weft2.yarnPrice,
      weft2.yarnGst
    );
    results.weft2.formattedCost = formatCost(results.weft2.rawCost, costPrecision);
  }

  // === WASTAGE CALCULATIONS ===
  results.wastage.warp = results.warp.formattedWeight - results.warp.formattedNetWeight;
  results.wastage.weft = results.weft.formattedWeight - results.weft.formattedNetWeight;
  results.wastage.weft2 = weft2Enabled && results.weft2 
    ? results.weft2.formattedWeight - results.weft2.formattedNetWeight 
    : 0;
  results.wastage.total = results.wastage.warp + results.wastage.weft + results.wastage.weft2;

  // === TOTAL CALCULATIONS ===
  // Total Net Weight (without wastage)
  results.totals.totalNetWeight = 
    results.warp.formattedNetWeight + 
    results.weft.formattedNetWeight + 
    (results.weft2 ? results.weft2.formattedNetWeight : 0);

  // Total Weight (with wastage)
  results.totals.totalWeight = 
    results.warp.formattedWeight + 
    results.weft.formattedWeight + 
    (results.weft2 ? results.weft2.formattedWeight : 0);

  // Total Cost
  results.totals.totalCost = 
    results.warp.formattedCost + 
    results.weft.formattedCost + 
    (results.weft2 ? results.weft2.formattedCost : 0) + 
    (otherCostPerMeter || 0);

  // Round totals
  results.totals.totalNetWeight = Number(results.totals.totalNetWeight.toFixed(weightPrecision));
  results.totals.totalWeight = Number(results.totals.totalWeight.toFixed(weightPrecision));
  results.totals.totalCost = Number(results.totals.totalCost.toFixed(costPrecision));
  results.wastage.total = Number(results.wastage.total.toFixed(weightPrecision));

  return results;
}