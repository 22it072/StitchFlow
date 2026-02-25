/**
 * PDF Export System - Document Footer
 * StitchFlow Textile Manufacturing ERP
 *
 * Renders the footer on every page of a PDF document.
 *
 * Footer Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │  StitchFlow ERP · Generated on DD/MM/YYYY HH:MM      │
 * │  [Signature Block]                  Page X of Y      │
 * └──────────────────────────────────────────────────────┘
 */

import { COLORS, FONTS, SPACING, SIGNATURE, DOC_TYPES } from './pdfStyles';
import { pdfGeneratedAt, pdfSafe } from './pdfFormatters';

// ─────────────────────────────────────────────
// FOOTER RENDERER
// ─────────────────────────────────────────────

/**
 * Draw footer on ALL pages of the document
 *
 * Call this AFTER all content is written so page count is final.
 *
 * @param {PDFEngine} engine
 * @param {object}    config
 * @param {object}    config.company       - Company info
 * @param {string}    config.docType       - DOC_TYPES key
 * @param {string}    config.docNumber     - Document number
 * @param {Array}     config.signatures    - [{ label, name? }] max 3
 * @param {string}    config.note          - Optional footer note
 * @param {boolean}   config.showTerms     - Show T&C line
 * @param {string}    config.terms         - Custom terms text
 */
export function drawFooters(engine, config = {}) {
  const {
    company    = {},
    docType    = 'ESTIMATE',
    docNumber  = '',
    signatures = [],
    note       = '',
    showTerms  = false,
    terms      = '',
  } = config;

  const docTypeDef  = DOC_TYPES[docType] || DOC_TYPES.ESTIMATE;
  const accentColor = docTypeDef.accentColor;
  const totalPages  = engine.pageCount;

  // Iterate all pages
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    engine.doc.setPage(pageNum);
    _drawSingleFooter(engine, {
      company,
      docTypeDef,
      accentColor,
      docNumber,
      signatures,
      note,
      showTerms,
      terms,
      pageNum,
      totalPages,
    });
  }

  // Reset to last page
  engine.doc.setPage(totalPages);
}

// ─────────────────────────────────────────────
// SIGNATURE PAGE BLOCK (Last page only)
// ─────────────────────────────────────────────

/**
 * Draw signature blocks above footer (call before drawFooters)
 * @param {PDFEngine} engine
 * @param {Array}     signatures - [{ label, name? }]
 * @param {Array}     accentColor
 */
export function drawSignatureBlock(engine, signatures = [], accentColor = COLORS.primary) {
  if (!signatures || signatures.length === 0) return;

  const blockH    = 20;
  const sigCount  = Math.min(signatures.length, 3);
  const colW      = engine.contentW / sigCount;

  engine.checkPageBreak(blockH + 8);
  engine.gap(4);

  const y = engine.y;

  // Top rule
  engine.setStroke(COLORS.gray300);
  engine.doc.setLineWidth(0.3);
  engine.doc.line(engine.marginL, y, engine.marginL + engine.contentW, y);

  engine.gap(2);

  signatures.slice(0, 3).forEach((sig, i) => {
    const x    = engine.marginL + i * colW;
    const lineY = y + blockH - 4;

    // Name (if pre-filled)
    if (sig.name) {
      engine.text(
        sig.name,
        x + colW / 2,
        lineY - 4,
        {
          size:  FONTS.size.bodySmall,
          style: 'bold',
          color: COLORS.gray800,
          align: 'center',
        }
      );
    }

    // Signature line
    engine.setStroke(COLORS.gray400);
    engine.doc.setLineWidth(0.4);
    engine.doc.line(
      x + (colW - SIGNATURE.lineWidth) / 2,
      lineY,
      x + (colW + SIGNATURE.lineWidth) / 2,
      lineY
    );

    // Label below line
    engine.text(
      String(sig.label || 'Authorized Signatory'),
      x + colW / 2,
      lineY + 4,
      {
        size:  SIGNATURE.labelSize,
        color: SIGNATURE.labelColor,
        align: 'center',
      }
    );
  });

  engine.y = y + blockH + 4;
}

// ─────────────────────────────────────────────
// PRIVATE: Single Page Footer
// ─────────────────────────────────────────────

function _drawSingleFooter(engine, config) {
  const {
    company,
    docTypeDef,
    accentColor,
    docNumber,
    note,
    showTerms,
    terms,
    pageNum,
    totalPages,
  } = config;

  const x       = engine.marginL;
  const pageH   = engine.pageH;
  const marginB = engine.marginB;
  const contentW = engine.contentW;

  // Footer top Y
  const footerY  = pageH - marginB;
  const footerH  = marginB - 2;

  // Top divider with accent color
  engine.setStroke(accentColor);
  engine.doc.setLineWidth(0.6);
  engine.doc.line(x, footerY, x + contentW, footerY);

  // Thin secondary line
  engine.setStroke(COLORS.gray300);
  engine.doc.setLineWidth(0.2);
  engine.doc.line(x, footerY + 0.8, x + contentW, footerY + 0.8);

  // ── Left: Generated info ─────────────────────
  engine.text(
    pdfGeneratedAt(),
    x,
    footerY + 5,
    { size: FONTS.size.footer, color: COLORS.footerText }
  );

  // Company & system credit
  engine.text(
    `${pdfSafe(company.name, 'StitchFlow')}  ·  Powered by StitchFlow ERP`,
    x,
    footerY + 9.5,
    { size: FONTS.size.footer - 0.5, color: COLORS.gray400 }
  );

  // ── Center: Note or Terms ────────────────────
  if (note || (showTerms && terms)) {
    const centerX = x + contentW / 2;
    const displayText = note || terms;

    engine.text(
      displayText,
      centerX,
      footerY + 5,
      { size: FONTS.size.footer, color: COLORS.gray500, align: 'center' }
    );
  }

  // ── Right: Page Number ───────────────────────
  const rightX = x + contentW;

  // Page number box
  const pageText  = `Page ${pageNum}`;
  const totalText = ` of ${totalPages}`;
  const boxW      = 22;
  const boxH      = 8;
  const boxX      = rightX - boxW;
  const boxY      = footerY + 2;

  engine.rect(boxX, boxY, boxW, boxH, COLORS.gray100, COLORS.gray300, 1);

  engine.text(
    `${pageText}${totalText}`,
    boxX + boxW / 2,
    boxY + 5.5,
    { size: FONTS.size.pageNumber, style: 'bold', color: COLORS.gray700, align: 'center' }
  );

  // Doc number above page box
  if (docNumber) {
    engine.text(
      String(docNumber),
      rightX,
      footerY + 13,
      { size: FONTS.size.footer - 0.5, color: COLORS.gray400, align: 'right' }
    );
  }
}