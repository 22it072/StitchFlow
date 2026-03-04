/**
 * Calculate Warp Net Weight (WITHOUT wastage)
 * Formula: (Tar × Denier) / 90000
 */
export function calculateWarpNetWeight(tar, denier) {
  return (tar * denier) / 90000;
}

/**
 * Calculate Warp Raw Weight (WITH wastage)
 * Formula: (Tar × Denier × WastageMultiplier) / 90000
 */
export function calculateWarpRawWeight(tar, denier, wastagePercent) {
  const wastageMultiplier = 1 + (wastagePercent / 100);
  return (tar * denier * wastageMultiplier) / 90000;
}

/**
 * Calculate Weft Net Weight (WITHOUT wastage)
 * Formula: (Peek × Panna × Denier) / 90000
 */
export function calculateWeftNetWeight(peek, panna, denier) {
  return (peek * panna * denier) / 90000;
}

/**
 * Calculate Weft Raw Weight (WITH wastage)
 * Formula: (Peek × Panna × Denier × WastageMultiplier) / 90000
 */
export function calculateWeftRawWeight(peek, panna, denier, wastagePercent) {
  const wastageMultiplier = 1 + (wastagePercent / 100);
  return (peek * panna * denier * wastageMultiplier) / 90000;
}

/**
 * Calculate Raw Cost
 * Formula: Weight × (Yarn Price + GST Amount)
 */
export function calculateRawCost(weight, yarnPrice, gstPercentage) {
  const gstAmount = (yarnPrice * gstPercentage) / 100;
  const priceWithGst = yarnPrice + gstAmount;
  return (weight * priceWithGst) / 100;
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
    wastage: {},
  };

  // === WARP CALCULATIONS ===
  // Net Weight (without wastage)
  results.warp.netWeight          = calculateWarpNetWeight(warp.tar, warp.denier);
  results.warp.formattedNetWeight = Number(results.warp.netWeight.toFixed(weightPrecision));

  // Raw Weight (with wastage)
  results.warp.rawWeight    = calculateWarpRawWeight(warp.tar, warp.denier, warp.wastage);
  results.warp.formattedWeight = Number(results.warp.rawWeight.toFixed(weightPrecision));

  // Cost (uses weight WITH wastage)
  results.warp.rawCost       = calculateRawCost(results.warp.formattedWeight, warp.yarnPrice, warp.yarnGst);
  results.warp.formattedCost = Number(results.warp.rawCost.toFixed(costPrecision));

  // === WEFT CALCULATIONS ===
  results.weft.netWeight          = calculateWeftNetWeight(weft.peek, weft.panna, weft.denier);
  results.weft.formattedNetWeight = Number(results.weft.netWeight.toFixed(weightPrecision));

  results.weft.rawWeight       = calculateWeftRawWeight(weft.peek, weft.panna, weft.denier, weft.wastage);
  results.weft.formattedWeight = Number(results.weft.rawWeight.toFixed(weightPrecision));

  results.weft.rawCost       = calculateRawCost(results.weft.formattedWeight, weft.yarnPrice, weft.yarnGst);
  results.weft.formattedCost = Number(results.weft.rawCost.toFixed(costPrecision));

  // === WEFT-2 CALCULATIONS ===
  if (weft2Enabled && weft2) {
    results.weft2 = {};

    results.weft2.netWeight          = calculateWeftNetWeight(weft2.peek, weft2.panna, weft2.denier);
    results.weft2.formattedNetWeight = Number(results.weft2.netWeight.toFixed(weightPrecision));

    results.weft2.rawWeight       = calculateWeftRawWeight(weft2.peek, weft2.panna, weft2.denier, weft2.wastage);
    results.weft2.formattedWeight = Number(results.weft2.rawWeight.toFixed(weightPrecision));

    results.weft2.rawCost       = calculateRawCost(results.weft2.formattedWeight, weft2.yarnPrice, weft2.yarnGst);
    results.weft2.formattedCost = Number(results.weft2.rawCost.toFixed(costPrecision));
  }

  // === WASTAGE CALCULATIONS ===
  results.wastage.warp  = results.warp.formattedWeight  - results.warp.formattedNetWeight;
  results.wastage.weft  = results.weft.formattedWeight  - results.weft.formattedNetWeight;
  results.wastage.weft2 = weft2Enabled && results.weft2
    ? results.weft2.formattedWeight - results.weft2.formattedNetWeight
    : 0;
  results.wastage.total = Number(
    (results.wastage.warp + results.wastage.weft + results.wastage.weft2).toFixed(weightPrecision)
  );

  // === TOTAL CALCULATIONS ===
  results.totals.totalNetWeight = Number((
    results.warp.formattedNetWeight +
    results.weft.formattedNetWeight +
    (results.weft2 ? results.weft2.formattedNetWeight : 0)
  ).toFixed(weightPrecision));

  results.totals.totalWeight = Number((
    results.warp.formattedWeight +
    results.weft.formattedWeight +
    (results.weft2 ? results.weft2.formattedWeight : 0)
  ).toFixed(weightPrecision));

  results.totals.totalCost = Number((
    results.warp.formattedCost +
    results.weft.formattedCost +
    (results.weft2 ? results.weft2.formattedCost : 0) +
    (otherCostPerMeter || 0)
  ).toFixed(costPrecision));

  return results;
}