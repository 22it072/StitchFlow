/**
 * PDF Export System - Document Header
 * StitchFlow Textile Manufacturing ERP
 *
 * Renders the professional company header block
 * at the top of every PDF document.
 *
 * Header Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │  [LOGO/ICON]  COMPANY NAME            [DOC TYPE]     │
 * │               Address · Phone · GST  [DOC NUMBER]   │
 * │                                       [DATE]         │
 * ├──────────────────────────────────────────────────────┤
 * │  Document Title                    Status Badge      │
 * └──────────────────────────────────────────────────────┘
 */

import { COLORS, FONTS, SPACING, STATUS_COLORS, DOC_TYPES } from './pdfStyles';
import { pdfDate, pdfSafe } from './pdfFormatters';

// ─────────────────────────────────────────────
// MAIN HEADER RENDERER
// ─────────────────────────────────────────────

/**
 * Draw the full document header
 *
 * @param {PDFEngine} engine   - PDFEngine instance
 * @param {object}    config   - Header configuration
 * @param {object}    config.company       - Company data
 * @param {string}    config.docType       - Key from DOC_TYPES
 * @param {string}    config.docNumber     - e.g. "EST-2024-001"
 * @param {string}    config.docDate       - ISO date string
 * @param {string}    config.title         - Main document title
 * @param {string}    config.status        - Status string
 * @param {string}    config.statusLabel   - Override status display text
 * @param {string}    config.subtitle      - Below title subtitle
 *
 * @returns {number} Total header height (sets engine.headerHeight)
 */
export function drawHeader(engine, config = {}) {
  const {
    company     = {},
    docType     = 'ESTIMATE',
    docNumber   = '',
    docDate     = new Date(),
    title       = 'Document',
    status      = '',
    statusLabel = '',
    subtitle    = '',
  } = config;

  const docTypeDef    = DOC_TYPES[docType] || DOC_TYPES.ESTIMATE;
  const accentColor   = docTypeDef.accentColor;
  const x             = engine.marginL;
  const pageW         = engine.pageW;
  const marginR       = engine.marginR;
  const contentW      = engine.contentW;

  // ── Band 1: Company Info + Doc Meta ──────────
  const band1H = 26;
  const band1Y = engine.marginT;

  // Dark background
  engine.rect(x, band1Y, contentW, band1H, COLORS.headerBg);

  // Accent top stripe
  engine.rect(x, band1Y, contentW, 2, accentColor);

  // ── Company Logo / Icon Box ──────────────────
  const iconBoxSize = 18;
  const iconBoxX    = x + 3;
  const iconBoxY    = band1Y + 4;

  // Icon background (slightly lighter than header)
  engine.rect(iconBoxX, iconBoxY, iconBoxSize, iconBoxSize, accentColor, null, 2);

  // Company initials / doc type icon
  const initials = _getCompanyInitials(company.name);
  engine.text(
    initials,
    iconBoxX + iconBoxSize / 2,
    iconBoxY + iconBoxSize / 2 + 3,
    { size: FONTS.size.sectionTitle, style: 'bold', color: COLORS.white, align: 'center' }
  );

  // ── Company Name & Details ───────────────────
  const companyTextX = iconBoxX + iconBoxSize + 4;
  const companyTextW = contentW * 0.5;

  // Company name
  engine.text(
    pdfSafe(company.name, 'StitchFlow').toUpperCase(),
    companyTextX,
    band1Y + 10,
    { size: FONTS.size.bodyLarge, style: 'bold', color: COLORS.white }
  );

  // Company meta line 1 — address
  const addressLine = _buildAddressLine(company);
  engine.text(
    addressLine,
    companyTextX,
    band1Y + 16,
    { size: FONTS.size.label, color: COLORS.gray400 }
  );

  // Company meta line 2 — phone, GST
  const contactLine = _buildContactLine(company);
  engine.text(
    contactLine,
    companyTextX,
    band1Y + 21,
    { size: FONTS.size.label, color: COLORS.gray400 }
  );

  // ── Right Column: Doc Type + Number + Date ───
  const rightColX = x + contentW - 2;

  // Doc type label
  engine.text(
    docTypeDef.label,
    rightColX,
    band1Y + 8,
    { size: FONTS.size.label, style: 'bold', color: accentColor, align: 'right' }
  );

  // Doc number
  if (docNumber) {
    engine.text(
      String(docNumber),
      rightColX,
      band1Y + 14,
      { size: FONTS.size.bodyLarge, style: 'bold', color: COLORS.white, align: 'right' }
    );
  }

  // Doc date
  engine.text(
    pdfDate(docDate),
    rightColX,
    band1Y + 20,
    { size: FONTS.size.label, color: COLORS.gray400, align: 'right' }
  );

  // ── Band 2: Title + Status ───────────────────
  const band2H = 11;
  const band2Y = band1Y + band1H;

  engine.rect(x, band2Y, contentW, band2H, COLORS.gray100);

  // Left accent bar
  engine.rect(x, band2Y, 3, band2H, accentColor);

  // Document title
  engine.text(
    String(title),
    x + 6,
    band2Y + 7,
    { size: FONTS.size.sectionTitle, style: 'bold', color: COLORS.gray900 }
  );

  // Subtitle
  if (subtitle) {
    engine.text(
      subtitle,
      x + 6 + engine.textWidth(String(title), FONTS.size.sectionTitle, 'bold') + 3,
      band2Y + 7,
      { size: FONTS.size.bodySmall, color: COLORS.gray500 }
    );
  }

  // Status badge (right side of title band)
  if (status) {
    const statusDef = _resolveStatus(status);
    const badgeLabel = statusLabel || status;
    
    // Calculate badge width matching badge() method exactly
    const text = String(badgeLabel).toUpperCase(); // Badge method converts to uppercase
    const padH = SPACING.badgePadH;
    const tW = engine.textWidth(text, FONTS.size.badge, 'bold');
    const badgeW = tW + padH * 2;
    
    // Draw badge at correct position with extra margin (only once)
    const badgeX = x + contentW - badgeW - 4; // Increased margin from 2 to 4
    engine.badge(badgeLabel, statusDef, badgeX, band2Y + 7);
  }

  // Bottom separator
  engine.setStroke(accentColor);
  engine.doc.setLineWidth(0.5);
  engine.doc.line(x, band2Y + band2H, x + contentW, band2Y + band2H);

  // Update engine
  const totalHeaderH = band1H + band2H;
  engine.headerHeight = engine.marginT + totalHeaderH;
  engine.y = engine.headerHeight + 5;

  return totalHeaderH;
}

// ─────────────────────────────────────────────
// CONTINUATION PAGE HEADER (compact)
// ─────────────────────────────────────────────

/**
 * Compact header for page 2+ (continuation pages)
 */
export function drawContinuationHeader(engine, config = {}) {
  const {
    company   = {},
    docType   = 'ESTIMATE',
    docNumber = '',
    title     = '',
  } = config;

  const docTypeDef  = DOC_TYPES[docType] || DOC_TYPES.ESTIMATE;
  const accentColor = docTypeDef.accentColor;
  const x           = engine.marginL;
  const contentW    = engine.contentW;
  const headerH     = 10;
  const y           = engine.marginT;

  // Background
  engine.rect(x, y, contentW, headerH, COLORS.headerBg);

  // Accent left bar
  engine.rect(x, y, 3, headerH, accentColor);

  // Company name
  engine.text(
    pdfSafe(company.name, 'StitchFlow').toUpperCase(),
    x + 5,
    y + 6.5,
    { size: FONTS.size.bodySmall, style: 'bold', color: COLORS.white }
  );

  // Doc info right-aligned
  engine.text(
    `${docTypeDef.label}  |  ${docNumber}`,
    x + contentW - 2,
    y + 6.5,
    { size: FONTS.size.bodySmall, color: COLORS.gray400, align: 'right' }
  );

  // Bottom rule
  engine.setStroke(accentColor);
  engine.doc.setLineWidth(0.4);
  engine.doc.line(x, y + headerH, x + contentW, y + headerH);

  engine.headerHeight = engine.marginT + headerH;
  engine.y = engine.headerHeight + 4;

  return headerH;
}

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

function _getCompanyInitials(name) {
  if (!name) return 'SF';
  const words = String(name).trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function _buildAddressLine(company) {
  const parts = [];
  if (company.address)     parts.push(company.address);
  if (company.city)        parts.push(company.city);
  if (company.state)       parts.push(company.state);
  if (company.pincode)     parts.push(company.pincode);
  return parts.length > 0 ? parts.join(', ') : 'Textile Manufacturing';
}

function _buildContactLine(company) {
  const parts = [];
  if (company.phone)  parts.push(`Ph: ${company.phone}`);
  if (company.email)  parts.push(company.email);
  if (company.gst)    parts.push(`GST: ${company.gst}`);
  if (company.pan)    parts.push(`PAN: ${company.pan}`);
  return parts.length > 0 ? parts.join('  ·  ') : '';
}

function _resolveStatus(status) {
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  return STATUS_COLORS[key] || STATUS_COLORS.default;
}