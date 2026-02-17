// backend/utils/productionCalculations.js
/**
 * Production Planning Calculation Utilities
 * Industry-correct textile formulas with function-based formatting
 * 
 * CORE FORMULAS:
 * Raw Picks per Day = RPM × 60 × WorkingHours × Machines × (Efficiency / 100)
 * Raw Production (meters/day) = Raw Picks per Day ÷ (Pick × 39.37)
 */

// Conversion constant: inches to meters
const INCHES_TO_METERS = 39.37;

/**
 * Calculate raw picks per day
 * Formula: RPM × 60 × WorkingHours × Machines × (Efficiency / 100)
 * 
 * @param {number} rpm - Loom speed (revolutions per minute)
 * @param {number} workingHours - Working hours per day
 * @param {number} machines - Number of looms
 * @param {number} efficiency - Machine efficiency percentage (0-100)
 * @returns {number} Raw picks per day
 */
const calculateRawPicks = (rpm, workingHours, machines, efficiency) => {
  if (rpm <= 0 || workingHours <= 0 || machines < 1 || efficiency < 0 || efficiency > 100) {
    throw new Error('Invalid parameters for picks calculation');
  }
  
  const rawPicks = rpm * 60 * workingHours * machines * (efficiency / 100);
  return rawPicks;
};

/**
 * Calculate raw production in meters per day
 * Formula: Raw Picks per Day ÷ (Pick × 39.37)
 * 
 * @param {number} rawPicksPerDay - Total raw picks per day
 * @param {number} pick - Picks per inch (PPI)
 * @returns {number} Raw production in meters per day
 */
const calculateRawProduction = (rawPicksPerDay, pick) => {
  if (rawPicksPerDay <= 0 || pick <= 0) {
    throw new Error('Invalid parameters for production calculation');
  }
  
  const rawProduction = rawPicksPerDay / (pick * INCHES_TO_METERS);
  return rawProduction;
};

/**
 * Format production value to textile-industry standard
 * Converts large meter values to normalized form with one digit before decimal
 * Uses mathematical normalization (NOT hardcoded division)
 * 
 * @param {number} value - Raw production value in meters
 * @returns {Object} Formatted value with scale information
 * 
 * Examples:
 * 230.712 → { formatted: 2.307, scale: 100, magnitude: 2 }
 * 768.924 → { formatted: 7.689, scale: 100, magnitude: 2 }
 * 12543.62 → { formatted: 1.2543, scale: 10000, magnitude: 4 }
 */
const formatProduction = (value) => {
  if (!value || value <= 0) {
    return { formatted: 0, scale: 1, magnitude: 0, original: 0 };
  }
  
  // Find the order of magnitude using logarithm (mathematical normalization)
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  
  // Calculate the scale factor to normalize to one digit before decimal
  const scale = Math.pow(10, magnitude);
  
  // Normalize the value
  const normalized = value / scale;
  
  // Determine precision based on magnitude
  // Higher magnitude = more decimal places needed for accuracy
  let precision;
  if (magnitude >= 4) {
    precision = 4;
  } else if (magnitude >= 2) {
    precision = 3;
  } else {
    precision = 2;
  }
  
  // Round to specified precision
  const formatted = Number(normalized.toFixed(precision));
  
  return {
    formatted,
    scale,
    magnitude,
    original: value
  };
};

/**
 * Validate production input parameters
 * @param {Object} params - Input parameters
 * @returns {Object} Validation result with isValid and errors
 */
const validateProductionInputs = (params) => {
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
 * Calculate complete production data from loom parameters
 * @param {Object} params - Loom parameters
 * @returns {Object} Complete production calculations
 */
const calculateProduction = (params) => {
  const { rpm, pick, efficiency, machines, workingHours, workingDaysPerMonth = 26 } = params;
  
  // Validate inputs first
  const validation = validateProductionInputs(params);
  if (!validation.isValid) {
    const error = new Error('Validation failed');
    error.validationErrors = validation.errors;
    throw error;
  }
  
  // Step 1: Calculate raw picks per day
  const rawPicksPerDay = calculateRawPicks(rpm, workingHours, machines, efficiency);
  
  // Step 2: Calculate raw production in meters
  const rawProductionMeters = calculateRawProduction(rawPicksPerDay, pick);
  
  // Step 3: Format daily production using mathematical normalization
  const dailyFormatted = formatProduction(rawProductionMeters);
  
  // Step 4: Calculate monthly production
  const rawMonthlyProduction = rawProductionMeters * workingDaysPerMonth;
  const monthlyFormatted = formatProduction(rawMonthlyProduction);
  
  return {
    inputs: {
      rpm,
      pick,
      efficiency,
      machines,
      workingHours,
      workingDaysPerMonth
    },
    daily: {
      rawPicksPerDay,
      rawProductionMeters,
      formattedProduction: dailyFormatted.formatted,
      formattedScale: dailyFormatted.scale,
      magnitude: dailyFormatted.magnitude
    },
    monthly: {
      rawProduction: rawMonthlyProduction,
      formattedProduction: monthlyFormatted.formatted,
      formattedScale: monthlyFormatted.scale,
      workingDays: workingDaysPerMonth
    },
    formulas: {
      rawPicksFormula: `${rpm} × 60 × ${workingHours} × ${machines} × (${efficiency} / 100) = ${rawPicksPerDay.toFixed(2)}`,
      rawProductionFormula: `${rawPicksPerDay.toFixed(2)} ÷ (${pick} × 39.37) = ${rawProductionMeters.toFixed(4)} meters`
    }
  };
};

/**
 * Get production breakdown for detailed view
 * @param {Object} production - Production document
 * @returns {Object} Detailed breakdown
 */
const getProductionBreakdown = (production) => {
  const { loomParams, calculations } = production;
  
  return {
    summary: {
      quality: production.qualityName,
      dailyProduction: `${calculations.formattedProduction} (×${calculations.formattedScale} = ${calculations.rawProductionMeters.toFixed(2)} m)`,
      monthlyProduction: calculations.monthlyProduction ? 
        `${calculations.monthlyProduction.formatted} (${calculations.monthlyProduction.workingDays} working days)` : 'N/A'
    },
    loomSettings: {
      'RPM': loomParams.rpm,
      'Pick (PPI)': loomParams.pick,
      'Efficiency': `${loomParams.efficiency}%`,
      'Machines': loomParams.machines,
      'Working Hours': `${loomParams.workingHours} hrs/day`
    },
    calculationSteps: {
      step1: {
        name: 'Raw Picks per Day',
        formula: 'RPM × 60 × Working Hours × Machines × (Efficiency / 100)',
        calculation: `${loomParams.rpm} × 60 × ${loomParams.workingHours} × ${loomParams.machines} × (${loomParams.efficiency} / 100)`,
        result: calculations.rawPicksPerDay.toLocaleString()
      },
      step2: {
        name: 'Raw Production (meters)',
        formula: 'Raw Picks ÷ (Pick × 39.37)',
        calculation: `${calculations.rawPicksPerDay.toLocaleString()} ÷ (${loomParams.pick} × 39.37)`,
        result: `${calculations.rawProductionMeters.toFixed(4)} meters/day`
      },
      step3: {
        name: 'Formatted Production',
        formula: 'Mathematical normalization using log₁₀',
        result: `${calculations.formattedProduction} (scale: ×${calculations.formattedScale})`
      }
    }
  };
};

module.exports = {
  INCHES_TO_METERS,
  calculateRawPicks,
  calculateRawProduction,
  formatProduction,
  calculateProduction,
  validateProductionInputs,
  getProductionBreakdown
};