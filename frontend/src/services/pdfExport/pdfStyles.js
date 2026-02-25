/**
 * PDF Export System - Global Styles & Theme Constants
 * StitchFlow Textile Manufacturing ERP
 * 
 * Single source of truth for all PDF visual constants.
 * Any style change here reflects across ALL PDF documents.
 */

// ─────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────
export const COLORS = {
  // Brand Colors
  primary:        [37, 99, 235],    // Blue-600
  primaryDark:    [29, 78, 216],    // Blue-700
  primaryLight:   [219, 234, 254],  // Blue-100

  // Accent
  accent:         [79, 70, 229],    // Indigo-600
  accentLight:    [224, 231, 255],  // Indigo-100

  // Neutrals
  black:          [0, 0, 0],
  white:          [255, 255, 255],
  gray900:        [17, 24, 39],
  gray800:        [31, 41, 55],
  gray700:        [55, 65, 81],
  gray600:        [75, 85, 99],
  gray500:        [107, 114, 128],
  gray400:        [156, 163, 175],
  gray300:        [209, 213, 219],
  gray200:        [229, 231, 235],
  gray100:        [243, 244, 246],
  gray50:         [249, 250, 251],

  // Semantic Colors
  success:        [22, 163, 74],    // Green-600
  successLight:   [220, 252, 231],  // Green-100
  warning:        [217, 119, 6],    // Amber-600
  warningLight:   [254, 243, 199],  // Amber-100
  danger:         [220, 38, 38],    // Red-600
  dangerLight:    [254, 226, 226],  // Red-100
  info:           [8, 145, 178],    // Cyan-600
  infoLight:      [207, 250, 254],  // Cyan-100

  // Table Specific
  tableHeaderBg:  [37, 99, 235],    // Primary blue
  tableHeaderText:[255, 255, 255],
  tableRowAlt:    [248, 250, 252],  // Very light blue-gray
  tableRowNormal: [255, 255, 255],
  tableBorder:    [226, 232, 240],

  // Section Header
  sectionBg:      [241, 245, 249],  // Slate-100
  sectionBorder:  [148, 163, 184],  // Slate-400

  // Document
  pageBg:         [255, 255, 255],
  headerBg:       [15, 23, 42],     // Slate-900 - premium dark header
  headerText:     [255, 255, 255],
  footerBg:       [248, 250, 252],
  footerBorder:   [226, 232, 240],
  footerText:     [100, 116, 139],  // Slate-500
};

// ─────────────────────────────────────────────
// TYPOGRAPHY SCALE
// ─────────────────────────────────────────────
export const FONTS = {
  family: {
    normal:  'helvetica',
    bold:    'helvetica',
    italic:  'helvetica',
  },
  style: {
    normal:     'normal',
    bold:       'bold',
    italic:     'italic',
    boldItalic: 'bolditalic',
  },
  size: {
    // Document Title
    docTitle:     22,
    docSubtitle:  11,

    // Section
    sectionTitle: 11,
    sectionSub:   9,

    // Body
    bodyLarge:    10,
    body:         9,
    bodySmall:    8,

    // Table
    tableHeader:  8.5,
    tableBody:    8,
    tableSmall:   7.5,

    // Meta / Labels
    label:        7.5,
    value:        8.5,
    caption:      7,

    // Footer
    footer:       7.5,
    pageNumber:   8,

    // Badge / Tag
    badge:        7,
  },
};

// ─────────────────────────────────────────────
// SPACING & LAYOUT
// ─────────────────────────────────────────────
export const SPACING = {
  // Page Margins (mm)
  pageMarginLeft:   14,
  pageMarginRight:  14,
  pageMarginTop:    12,
  pageMarginBottom: 18,

  // Content Width = A4(210) - margins
  contentWidth:     182,    // 210 - 14 - 14

  // Header
  headerHeight:     42,
  headerPadding:    8,

  // Footer
  footerHeight:     14,

  // Section
  sectionTitleH:    8,
  sectionGap:       5,
  afterSection:     4,

  // Info Block (key-value grid)
  infoBlockColW:    85,     // Two columns
  infoLabelW:       38,
  infoValueW:       47,
  infoRowH:         5.5,
  infoGap:          2,

  // Summary Box
  summaryBoxPad:    5,
  summaryRowH:      6,

  // Table
  tableCellPadH:    2.5,    // horizontal padding
  tableCellPadV:    2,      // vertical padding
  tableRowH:        7,
  tableHeaderH:     8,

  // Misc
  dividerH:         0.3,
  badgePadH:        3,
  badgePadV:        1.5,
  cornerRadius:     2,
};

// ─────────────────────────────────────────────
// PAGE CONFIGURATION
// ─────────────────────────────────────────────
export const PAGE = {
  format:      'a4',
  orientation: 'portrait',
  unit:        'mm',
  width:       210,
  height:      297,

  // Computed safe area
  safeLeft:    SPACING.pageMarginLeft,
  safeTop:     SPACING.pageMarginTop,
  safeRight:   210 - SPACING.pageMarginRight,
  safeBottom:  297 - SPACING.pageMarginBottom,
  safeWidth:   182,
};

// ─────────────────────────────────────────────
// DOCUMENT TYPE CONFIGS
// Defines accent color & label per document type
// ─────────────────────────────────────────────
export const DOC_TYPES = {
  ESTIMATE: {
    key:        'ESTIMATE',
    label:      'ESTIMATE',
    accentColor: [37, 99, 235],       // Blue
    badgeColor:  [219, 234, 254],
    badgeText:   [29, 78, 216],
    icon:        'EST',
  },
  PRODUCTION: {
    key:        'PRODUCTION',
    label:      'PRODUCTION RECORD',
    accentColor: [22, 163, 74],       // Green
    badgeColor:  [220, 252, 231],
    badgeText:   [21, 128, 61],
    icon:        'PRD',
  },
  PRODUCTION_ENTRY: {
    key:        'PRODUCTION_ENTRY',
    label:      'PRODUCTION ENTRY',
    accentColor: [79, 70, 229],       // Indigo
    badgeColor:  [224, 231, 255],
    badgeText:   [67, 56, 202],
    icon:        'ENT',
  },
  CHALLAN: {
    key:        'CHALLAN',
    label:      'DELIVERY CHALLAN',
    accentColor: [217, 119, 6],       // Amber
    badgeColor:  [254, 243, 199],
    badgeText:   [180, 83, 9],
    icon:        'DCH',
  },
  PARTY: {
    key:        'PARTY',
    label:      'PARTY PROFILE',
    accentColor: [8, 145, 178],       // Cyan
    badgeColor:  [207, 250, 254],
    badgeText:   [14, 116, 144],
    icon:        'PTY',
  },
};

// ─────────────────────────────────────────────
// STATUS → COLOR MAPPING
// ─────────────────────────────────────────────
export const STATUS_COLORS = {
  // Universal
  active:       { bg: [220, 252, 231], text: [22, 163, 74],  border: [134, 239, 172] },
  inactive:     { bg: [243, 244, 246], text: [107, 114, 128], border: [209, 213, 219] },
  pending:      { bg: [254, 243, 199], text: [217, 119, 6],  border: [252, 211, 77]  },
  completed:    { bg: [220, 252, 231], text: [22, 163, 74],  border: [134, 239, 172] },
  cancelled:    { bg: [254, 226, 226], text: [220, 38, 38],  border: [252, 165, 165] },
  draft:        { bg: [243, 244, 246], text: [107, 114, 128], border: [209, 213, 219] },
  approved:     { bg: [220, 252, 231], text: [22, 163, 74],  border: [134, 239, 172] },
  rejected:     { bg: [254, 226, 226], text: [220, 38, 38],  border: [252, 165, 165] },

  // Production specific
  in_progress:  { bg: [219, 234, 254], text: [37, 99, 235], border: [147, 197, 253]  },
  on_hold:      { bg: [254, 243, 199], text: [217, 119, 6], border: [252, 211, 77]   },

  // Challan specific
  delivered:    { bg: [220, 252, 231], text: [22, 163, 74],  border: [134, 239, 172] },
  in_transit:   { bg: [219, 234, 254], text: [37, 99, 235], border: [147, 197, 253]  },

  // Default fallback
  default:      { bg: [243, 244, 246], text: [55, 65, 81],  border: [209, 213, 219]  },
};

// ─────────────────────────────────────────────
// AUTOTABLE DEFAULT STYLES
// ─────────────────────────────────────────────
export const TABLE_STYLES = {
  default: {
    styles: {
      font:           'helvetica',
      fontSize:        FONTS.size.tableBody,
      cellPadding:    { top: 2, right: 3, bottom: 2, left: 3 },
      lineColor:       COLORS.tableBorder,
      lineWidth:       0.2,
      textColor:       COLORS.gray800,
      overflow:        'linebreak',
      minCellHeight:   6,
    },
    headStyles: {
      fillColor:       COLORS.tableHeaderBg,
      textColor:       COLORS.tableHeaderText,
      fontStyle:       'bold',
      fontSize:        FONTS.size.tableHeader,
      halign:          'center',
      cellPadding:    { top: 3, right: 3, bottom: 3, left: 3 },
      minCellHeight:   8,
    },
    alternateRowStyles: {
      fillColor:       COLORS.tableRowAlt,
    },
    bodyStyles: {
      fillColor:       COLORS.tableRowNormal,
    },
    columnStyles: {},
    tableLineColor:   COLORS.tableBorder,
    tableLineWidth:   0.3,
  },
};

// ─────────────────────────────────────────────
// WATERMARK CONFIG
// ─────────────────────────────────────────────
export const WATERMARK = {
  enabled:   false,         // Set true for COPY / DRAFT watermarks
  text:      'COPY',
  fontSize:  60,
  color:     [200, 200, 200],
  opacity:   0.08,
  angle:     45,
};

// ─────────────────────────────────────────────
// SIGNATURE BLOCK CONFIG
// ─────────────────────────────────────────────
export const SIGNATURE = {
  lineWidth:    40,         // mm
  lineColor:    COLORS.gray400,
  labelSize:    FONTS.size.caption,
  labelColor:   COLORS.gray500,
};