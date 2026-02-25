/**
 * PDF Export System - Public Entry Point
 * StitchFlow Textile Manufacturing ERP
 *
 * Import everything you need from this single file.
 *
 * Usage:
 *   import { PDFEngine, drawHeader, drawFooters, COLORS, DOC_TYPES } from '../services/pdfExport';
 */

// Core Engine
export { PDFEngine } from './pdfEngine';

// Header & Footer
export { drawHeader, drawContinuationHeader }  from './pdfHeader';
export { drawFooters, drawSignatureBlock }      from './pdfFooter';
// Add to existing exports
export { generateProductionEntryPDF } from './templates/productionEntryTemplate';
// Add to existing exports in index.js
export { generatePartyPDF } from './templates/partyTemplate';
// Styles & Constants
export {
  COLORS,
  FONTS,
  SPACING,
  PAGE,
  DOC_TYPES,
  STATUS_COLORS,
  TABLE_STYLES,
  WATERMARK,
  SIGNATURE,
} from './pdfStyles';

// Formatters
export {
  pdfDate,
  pdfDateLong,
  pdfDateTime,
  pdfDateRange,
  pdfCurrency,
  pdfCurrencyFull,
  pdfWeight,
  pdfWeightPlain,
  pdfCostPlain,
  pdfPercent,
  pdfNumber,
  pdfCount,
  pdfTitleCase,
  pdfSafe,
  pdfUpper,
  pdfStatus,
  pdfTruncate,
  pdfAddress,
  pdfPhone,
  pdfReed,
  pdfEPI,
  pdfYarnCount,
  pdfMeters,
  pdfGeneratedAt,
} from './pdfFormatters';