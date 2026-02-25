/**
 * PDF Export System - Formatting Utilities
 * StitchFlow Textile Manufacturing ERP
 *
 * Standalone formatters specific to PDF output.
 * These wrap the existing app formatters with PDF-safe defaults.
 */

import {
  formatDate as appFormatDate,
  formatCurrency as appFormatCurrency,
  formatWeight,
  formatCost,
  formatPercentage,
  safeDivide,
} from '../../utils/formatters';

// ─────────────────────────────────────────────
// DATE FORMATTERS
// ─────────────────────────────────────────────

/**
 * Format date for PDF display
 * @param {string|Date} date
 * @param {string} format - 'DD/MM/YYYY' | 'long' | 'short'
 * @returns {string}
 */
export function pdfDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '—';
  try {
    return appFormatDate(date, format);
  } catch {
    return '—';
  }
}

/**
 * Format date with day name for headers
 * @param {string|Date} date
 * @returns {string} e.g. "Monday, 15 January 2024"
 */
export function pdfDateLong(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format datetime for PDF
 * @param {string|Date} date
 * @returns {string} e.g. "15/01/2024 14:30"
 */
export function pdfDateTime(date) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    const dateStr = appFormatDate(date, 'DD/MM/YYYY');
    const hours   = String(d.getHours()).padStart(2, '0');
    const mins    = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hours}:${mins}`;
  } catch {
    return '—';
  }
}

/**
 * Format date range
 * @param {Date} from
 * @param {Date} to
 * @returns {string} "01/01/2024 – 31/01/2024"
 */
export function pdfDateRange(from, to) {
  return `${pdfDate(from)} – ${pdfDate(to)}`;
}

// ─────────────────────────────────────────────
// CURRENCY & NUMBER FORMATTERS
// ─────────────────────────────────────────────

/**
 * Normalize currency symbol to PDF-safe version.
 * jsPDF's built-in Helvetica uses Latin-1 encoding which does NOT support ₹ (U+20B9).
 * It renders as ¹ (superscript 1). We substitute with "Rs." for clean PDF output.
 * @param {string} symbol
 * @returns {string}
 */
function _pdfSafeSymbol(symbol) {
  if (!symbol) return 'Rs. ';
  // Replace ₹ (Unicode Rupee Sign U+20B9) with Rs.
  if (symbol === '₹' || symbol === '\u20B9') return 'Rs. ';
  // Replace $ £ € etc — these ARE in Latin-1, keep them but add trailing space
  return `${symbol} `;
}

/**
 * Format currency value for PDF
 * @param {number} value
 * @param {string} symbol
 * @param {number} decimals
 * @returns {string}
 */
export function pdfCurrency(value, symbol = '₹', decimals = 2) {
  const safeSymbol = _pdfSafeSymbol(symbol);
  if (value === null || value === undefined || isNaN(value)) {
    return `${safeSymbol}0.00`;
  }
  const num = Number(value);
  // Indian number formatting
  return `${safeSymbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format large currency with Indian comma system
 * e.g. 1500000 → Rs. 15,00,000.00
 */
export function pdfCurrencyFull(value, symbol = '₹') {
  return pdfCurrency(value, symbol, 2);
}

/**
 * Format weight for PDF (uses existing formatWeight logic)
 * @param {number} value
 * @param {number} precision
 * @param {string} unit
 * @returns {string}
 */
export function pdfWeight(value, precision = 4, unit = 'kg') {
  if (value === null || value === undefined || isNaN(value)) {
    return `0.${'0'.repeat(precision)} ${unit}`;
  }
  const formatted = formatWeight(value, precision);
  return `${formatted} ${unit}`;
}

/**
 * Format weight as plain number (no unit) for table cells
 */
export function pdfWeightPlain(value, precision = 4) {
  if (value === null || value === undefined || isNaN(value)) {
    return `0.${'0'.repeat(precision)}`;
  }
  return formatWeight(value, precision).toFixed(precision);
}

/**
 * Format cost for PDF
 */
export function pdfCostPlain(value, precision = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return formatCost(value, precision).toFixed(precision);
}

/**
 * Format percentage
 */
export function pdfPercent(value, precision = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  return `${Number(value).toFixed(precision)}%`;
}

/**
 * Format plain number
 */
export function pdfNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format integer count
 */
export function pdfCount(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Math.round(Number(value)).toLocaleString('en-IN');
}

// ─────────────────────────────────────────────
// STRING FORMATTERS
// ─────────────────────────────────────────────

/**
 * Capitalize first letter of each word
 */
export function pdfTitleCase(str) {
  if (!str) return '—';
  return String(str)
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Safe string - returns em dash for empty/null
 */
export function pdfSafe(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

/**
 * Uppercase string
 */
export function pdfUpper(str) {
  if (!str) return '—';
  return String(str).toUpperCase();
}

/**
 * Format status label - replaces underscores, title case
 */
export function pdfStatus(status) {
  if (!status) return '—';
  return String(status)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Truncate long text for table cells
 */
export function pdfTruncate(str, maxLen = 30) {
  if (!str) return '—';
  const s = String(str);
  return s.length > maxLen ? s.slice(0, maxLen - 3) + '...' : s;
}

/**
 * Format address lines into a single multiline string
 */
export function pdfAddress(address) {
  if (!address) return '—';
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.pincode,
    address.country,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}

/**
 * Format phone number
 */
export function pdfPhone(phone) {
  if (!phone) return '—';
  // Indian format: +91-XXXXX-XXXXX
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return String(phone);
}

// ─────────────────────────────────────────────
// TEXTILE-SPECIFIC FORMATTERS
// ─────────────────────────────────────────────

/**
 * Format reed count (e.g. "120 Reed")
 */
export function pdfReed(value) {
  if (!value && value !== 0) return '—';
  return `${value} Reed`;
}

/**
 * Format ends/picks per inch
 */
export function pdfEPI(value) {
  if (!value && value !== 0) return '—';
  return `${value} EPI`;
}

/**
 * Format yarn count
 */
export function pdfYarnCount(count, unit = 's') {
  if (!count && count !== 0) return '—';
  return `${count}${unit}`;
}

/**
 * Format meters
 */
export function pdfMeters(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${Number(value).toFixed(decimals)} m`;
}

/**
 * Generate document print timestamp
 */
export function pdfGeneratedAt() {
  const now = new Date();
  return `Generated on ${pdfDate(now)} at ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}