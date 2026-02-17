const { formatWeight } = require('./formatters');

/**
 * Calculate beam weight using industry formula
 * Formula: (Tar × Denier × Total Length) / 9000
 * 
 * @param {number} tar - Number of ends
 * @param {number} denier - Yarn denier
 * @param {number} totalLength - Total length in meters
 * @returns {Object} { raw, formatted }
 */
function calculateBeamWeight(tar, denier, totalLength) {
  if (!tar || !denier || !totalLength) {
    return { raw: 0, formatted: 0 };
  }
  
  const rawWeight = (tar * denier * totalLength) / 9000;
  const formattedWeight = formatWeight(rawWeight, 4);
  
  return {
    raw: rawWeight,
    formatted: formattedWeight,
  };
}

/**
 * Update beam remaining length after production
 * 
 * @param {number} currentRemaining - Current remaining length
 * @param {number} metersProduced - Meters produced in this entry
 * @returns {number} New remaining length
 */
function updateRemainingLength(currentRemaining, metersProduced) {
  const newRemaining = Math.max(0, currentRemaining - metersProduced);
  return Number(newRemaining.toFixed(2));
}

/**
 * Calculate loom efficiency
 * Formula: ((Total Hours - Stoppage Hours) / Total Hours) × 100
 * 
 * @param {number} totalHours - Total shift hours
 * @param {number} stoppageHours - Downtime hours
 * @returns {number} Efficiency percentage
 */
function calculateEfficiency(totalHours, stoppageHours) {
  if (totalHours <= 0) return 0;
  
  const efficiency = ((totalHours - stoppageHours) / totalHours) * 100;
  return Number(Math.min(100, Math.max(0, efficiency)).toFixed(2));
}

/**
 * Calculate meters per hour
 * Formula: Meters Produced / Total Hours
 * 
 * @param {number} metersProduced - Total meters produced
 * @param {number} totalHours - Total hours worked
 * @returns {number} Meters per hour
 */
function calculateMetersPerHour(metersProduced, totalHours) {
  if (totalHours <= 0) return 0;
  
  const mph = metersProduced / totalHours;
  return Number(mph.toFixed(2));
}

/**
 * Calculate actual pick rate
 * Formula: (Meters Produced × Panna × 39.37) / Width
 * 
 * @param {number} metersProduced - Meters produced
 * @param {number} panna - Panna count
 * @param {number} width - Fabric width in inches
 * @returns {number} Actual picks
 */
function calculateActualPicks(metersProduced, panna, width) {
  if (!metersProduced || !panna || !width) return 0;
  
  const picks = (metersProduced * panna * 39.37) / width;
  return Number(picks.toFixed(0));
}

/**
 * Calculate production variance
 * Formula: Actual Meters - Target Meters
 * 
 * @param {number} actualMeters - Actual production
 * @param {number} targetMeters - Target production
 * @returns {Object} { variance, percentage }
 */
function calculateVariance(actualMeters, targetMeters) {
  if (!targetMeters) {
    return { variance: 0, percentage: 0 };
  }
  
  const variance = actualMeters - targetMeters;
  const percentage = (variance / targetMeters) * 100;
  
  return {
    variance: Number(variance.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
  };
}

/**
 * Calculate loom utilization
 * Formula: (Active Hours / Total Available Hours) × 100
 * 
 * @param {number} activeHours - Hours loom was running
 * @param {number} availableHours - Total available hours in period
 * @returns {number} Utilization percentage
 */
function calculateUtilization(activeHours, availableHours) {
  if (availableHours <= 0) return 0;
  
  const utilization = (activeHours / availableHours) * 100;
  return Number(Math.min(100, Math.max(0, utilization)).toFixed(2));
}

/**
 * Calculate total downtime
 * 
 * @param {Array} productionEntries - Array of production entries
 * @returns {number} Total downtime hours
 */
function calculateDowntime(productionEntries) {
  if (!productionEntries || productionEntries.length === 0) return 0;
  
  const totalDowntime = productionEntries.reduce((sum, entry) => {
    return sum + (entry.loomStoppageTime || 0);
  }, 0);
  
  return Number(totalDowntime.toFixed(2));
}

/**
 * Calculate defect rate
 * Formula: (Total Defects / Total Meters) × 100
 * 
 * @param {number} totalDefects - Total defect count
 * @param {number} totalMeters - Total meters produced
 * @returns {number} Defect rate percentage
 */
function calculateDefectRate(totalDefects, totalMeters) {
  if (totalMeters <= 0) return 0;
  
  const rate = (totalDefects / totalMeters) * 100;
  return Number(rate.toFixed(4));
}

/**
 * Generate production summary for analytics
 * 
 * @param {Array} productionEntries - Array of production entries
 * @returns {Object} Summary statistics
 */
function generateProductionSummary(productionEntries) {
  if (!productionEntries || productionEntries.length === 0) {
    return {
      totalEntries: 0,
      totalMeters: 0,
      totalHours: 0,
      avgEfficiency: 0,
      avgMetersPerHour: 0,
      totalDefects: 0,
      totalDowntime: 0,
    };
  }
  
  const summary = productionEntries.reduce((acc, entry) => {
    acc.totalMeters += entry.metersProduced || 0;
    acc.totalHours += entry.totalHours || 0;
    acc.totalEfficiency += entry.efficiency || 0;
    acc.totalDefects += entry.defects?.count || 0;
    acc.totalDowntime += entry.loomStoppageTime || 0;
    return acc;
  }, {
    totalMeters: 0,
    totalHours: 0,
    totalEfficiency: 0,
    totalDefects: 0,
    totalDowntime: 0,
  });
  
  const count = productionEntries.length;
  
  return {
    totalEntries: count,
    totalMeters: Number(summary.totalMeters.toFixed(2)),
    totalHours: Number(summary.totalHours.toFixed(2)),
    avgEfficiency: Number((summary.totalEfficiency / count).toFixed(2)),
    avgMetersPerHour: summary.totalHours > 0 
      ? Number((summary.totalMeters / summary.totalHours).toFixed(2)) 
      : 0,
    totalDefects: summary.totalDefects,
    totalDowntime: Number(summary.totalDowntime.toFixed(2)),
  };
}

/**
 * Get loom performance metrics
 * 
 * @param {Object} loom - Loom document
 * @param {Array} productionEntries - Production entries for this loom
 * @returns {Object} Performance metrics
 */
function getLoomPerformance(loom, productionEntries) {
  const summary = generateProductionSummary(productionEntries);
  
  return {
    loomNumber: loom.loomNumber,
    status: loom.status,
    totalRunningHours: loom.totalRunningHours,
    recentProduction: summary,
    utilizationRate: loom.totalRunningHours > 0 
      ? calculateUtilization(summary.totalHours, loom.totalRunningHours) 
      : 0,
    defectRate: calculateDefectRate(summary.totalDefects, summary.totalMeters),
  };
}

module.exports = {
  calculateBeamWeight,
  updateRemainingLength,
  calculateEfficiency,
  calculateMetersPerHour,
  calculateActualPicks,
  calculateVariance,
  calculateUtilization,
  calculateDowntime,
  calculateDefectRate,
  generateProductionSummary,
  getLoomPerformance,
};