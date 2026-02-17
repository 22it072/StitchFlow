// frontend/src/utils/productionCalculations.js
/**
 * Production Planning Calculation Utilities (Client-Side)
 * Mirror of backend calculations for real-time preview
 * 
 * CORE FORMULAS:
 * Raw Picks per Day = RPM × 60 × WorkingHours × Machines × (Efficiency / 100)
 * Raw Production (meters/day) = Raw Picks per Day ÷ (Pick × 39.37)
 */

// Conversion constant: inches to meters
export const INCHES_TO_METERS = 39.37;

/**
 * Calculate raw picks per day
 * @param {number} rpm - Loom speed
 * @param {number} workingHours - Hours per day
 * @param {number} machines - Number of looms
 * @param {number} efficiency - Efficiency percentage (0-100)
 * @returns {number} Raw picks per day
 */
export const calculateRawPicks = (rpm, workingHours, machines, efficiency) => {
  if (rpm <= 0 || workingHours <= 0 || machines < 1 || efficiency < 0 || efficiency > 100) {
    return 0;
  }
  return rpm * 60 * workingHours * machines * (efficiency / 100);
};

/**
 * Calculate raw production in meters per day
 * @param {number} rawPicksPerDay - Total picks per day
 * @param {number} pick - Picks per inch (PPI)
 * @returns {number} Raw production in meters
 */
export const calculateRawProduction = (rawPicksPerDay, pick) => {
  if (rawPicksPerDay <= 0 || pick <= 0) {
    return 0;
  }
  return rawPicksPerDay / (pick * INCHES_TO_METERS);
};

/**
 * Format production value using mathematical normalization
 * Converts to textile-industry format with one digit before decimal
 * 
 * @param {number} value - Raw production value
 * @returns {Object} Formatted value with scale info
 */
export const formatProduction = (value) => {
  if (!value || value <= 0) {
    return { formatted: 0, scale: 1, magnitude: 0, original: 0 };
  }
  
  // Mathematical normalization using logarithm
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const scale = Math.pow(10, magnitude);
  const normalized = value / scale;
  
  // Determine precision based on magnitude
  let precision;
  if (magnitude >= 4) {
    precision = 4;
  } else if (magnitude >= 2) {
    precision = 3;
  } else {
    precision = 2;
  }
  
  const formatted = Number(normalized.toFixed(precision));
  
  return {
    formatted,
    scale,
    magnitude,
    original: value
  };
};

/**
 * Validate production inputs
 * @param {Object} params - Input parameters
 * @returns {Object} Validation result
 */
export const validateProductionInputs = (params) => {
  const { rpm, pick, efficiency, machines, workingHours } = params;
  const errors = [];
  
  if (!rpm || rpm <= 0) {
    errors.push('RPM must be greater than 0');
  }
  if (!pick || pick <= 0) {
    errors.push('Pick (PPI) must be greater than 0');
  }
  if (efficiency === undefined || efficiency === null || efficiency < 0 || efficiency > 100) {
    errors.push('Efficiency must be between 0 and 100');
  }
  if (!machines || machines < 1) {
    errors.push('At least 1 machine is required');
  }
  if (!workingHours || workingHours <= 0 || workingHours > 24) {
    errors.push('Working hours must be between 0 and 24');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate complete production data
 * @param {Object} params - Loom parameters
 * @returns {Object|null} Production calculations or null if invalid
 */
export const calculateProduction = (params) => {
  const { 
    rpm, 
    pick, 
    efficiency, 
    machines, 
    workingHours, 
    workingDaysPerMonth = 26 
  } = params;
  
  const validation = validateProductionInputs(params);
  if (!validation.isValid) {
    return null;
  }
  
  // Step 1: Calculate raw picks per day
  const rawPicksPerDay = calculateRawPicks(rpm, workingHours, machines, efficiency);
  
  // Step 2: Calculate raw production in meters
  const rawProductionMeters = calculateRawProduction(rawPicksPerDay, pick);
  
  // Step 3: Format daily production
  const dailyFormatted = formatProduction(rawProductionMeters);
  
  // Step 4: Calculate and format monthly production
  const rawMonthlyProduction = rawProductionMeters * workingDaysPerMonth;
  const monthlyFormatted = formatProduction(rawMonthlyProduction);
  
  return {
    daily: {
      rawPicksPerDay,
      rawProductionMeters,
      ...dailyFormatted
    },
    monthly: {
      rawProduction: rawMonthlyProduction,
      ...monthlyFormatted,
      workingDays: workingDaysPerMonth
    },
    inputs: params
  };
};

/**
 * Format large numbers with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return num.toLocaleString('en-IN');
};

/**
 * Get production quality rating based on efficiency
 * @param {number} efficiency - Efficiency percentage
 * @returns {Object} Rating info
 */
export const getEfficiencyRating = (efficiency) => {
  if (efficiency >= 90) return { rating: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
  if (efficiency >= 80) return { rating: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (efficiency >= 70) return { rating: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  if (efficiency >= 60) return { rating: 'Below Average', color: 'text-orange-600', bg: 'bg-orange-50' };
  return { rating: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
};