/**
 * CRITICAL: Weight Formatting Function (String/Math-based, NO division)
 * 
 * Converts large numeric weight into normalized format:
 * - One digit before decimal point
 * - 3-4 decimal precision
 * 
 * Examples:
 * 56726.535 → 5.6726
 * 836.6272 → 8.366
 */
export function formatWeight(value, precision = 4) {
  // Handle edge cases
  if (value === 0 || value === null || value === undefined || isNaN(value)) {
    return 0;
  }

  const absValue = Math.abs(value);
  
  // Convert to string to manipulate digits
  let numStr = absValue.toPrecision(precision + 1);
  
  // Remove scientific notation if present
  if (numStr.includes('e')) {
    numStr = absValue.toLocaleString('fullwide', { 
      useGrouping: false, 
      maximumFractionDigits: 20 
    });
  }
  
  // Remove all non-digit characters
  const digits = numStr.replace(/[^0-9]/g, '');
  
  if (digits.length === 0) return 0;
  
  // Find first significant (non-zero) digit
  let firstSigIndex = 0;
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] !== '0') {
      firstSigIndex = i;
      break;
    }
  }
  
  // Extract significant digits starting from first significant digit
  const sigDigits = digits.slice(firstSigIndex);
  
  if (sigDigits.length === 0) return 0;
  
  // Build formatted number: X.XXXX format
  const firstDigit = sigDigits[0];
  const decimalPart = sigDigits.slice(1, precision + 1).padEnd(precision, '0');
  
  const formattedStr = `${firstDigit}.${decimalPart}`;
  let formatted = parseFloat(formattedStr);
  
  // Apply sign
  if (value < 0) {
    formatted = -formatted;
  }
  
  return Number(formatted.toFixed(precision));
}

/**
 * CRITICAL: Cost Formatting Function (String/Math-based, NO division)
 * 
 * Converts large cost values to textile costing format:
 * - One digit before decimal point
 * - 2 decimal places
 * 
 * Example:
 * 405.2356 → 4.05
 */
export function formatCost(value, precision = 2) {
  // Handle edge cases
  if (value === 0 || value === null || value === undefined || isNaN(value)) {
    return 0;
  }

  const absValue = Math.abs(value);
  
  // Convert to string with full precision
  let numStr = absValue.toPrecision(precision + 1);
  
  // Remove scientific notation if present
  if (numStr.includes('e')) {
    numStr = absValue.toLocaleString('fullwide', { 
      useGrouping: false, 
      maximumFractionDigits: 20 
    });
  }
  
  // Extract all digits
  const digits = numStr.replace(/[^0-9]/g, '');
  
  if (digits.length === 0) return 0;
  
  // Find first significant digit
  let firstSigIndex = 0;
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] !== '0') {
      firstSigIndex = i;
      break;
    }
  }
  
  // Extract significant digits
  const sigDigits = digits.slice(firstSigIndex);
  
  if (sigDigits.length === 0) return 0;
  
  // Build formatted number: X.XX format
  const firstDigit = sigDigits[0];
  const decimalPart = sigDigits.slice(1, precision + 1).padEnd(precision, '0');
  
  const formattedStr = `${firstDigit}.${decimalPart}`;
  let formatted = parseFloat(formattedStr);
  
  // Apply sign
  if (value < 0) {
    formatted = -formatted;
  }
  
  return Number(formatted.toFixed(precision));
}

/**
 * Format currency for display
 */
export function formatCurrency(value, symbol = '₹') {
  if (value === null || value === undefined || isNaN(value)) {
    return `${symbol}0.00`;
  }
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Format date
 */
export function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format relative time
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const past = new Date(date);
  
  if (isNaN(past.getTime())) return '';
  
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay < 7) return `${diffDay} days ago`;
  
  return formatDate(date);
}

/**
 * Format percentage
 */
export function formatPercentage(value, precision = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  return `${Number(value).toFixed(precision)}%`;
}

/**
 * Safe division to avoid NaN/Infinity
 */
export function safeDivide(numerator, denominator) {
  if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
    return 0;
  }
  return numerator / denominator;
}