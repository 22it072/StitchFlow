/**
 * PDF Export System - Core Engine
 * StitchFlow Textile Manufacturing ERP
 */

import jsPDF     from 'jspdf';
import autoTable from 'jspdf-autotable';   // ← correct import
import {
  COLORS,
  FONTS,
  SPACING,
  PAGE,
  TABLE_STYLES,
  WATERMARK,
} from './pdfStyles';
import { pdfGeneratedAt } from './pdfFormatters';

export class PDFEngine {
  constructor(options = {}) {
    this.orientation = options.orientation || PAGE.orientation;
    this.title       = options.title  || 'StitchFlow Document';
    this.author      = options.author || 'StitchFlow ERP';

    this.doc = new jsPDF({
      orientation: this.orientation,
      unit:        PAGE.unit,
      format:      PAGE.format,
    });

    this.doc.setProperties({
      title:   this.title,
      author:  this.author,
      creator: 'StitchFlow ERP',
      subject: 'Textile Manufacturing Document',
    });

    this.y         = SPACING.pageMarginTop;
    this.pageW     = this.orientation === 'portrait' ? PAGE.width  : PAGE.height;
    this.pageH     = this.orientation === 'portrait' ? PAGE.height : PAGE.width;
    this.contentW  = this.pageW - SPACING.pageMarginLeft - SPACING.pageMarginRight;
    this.marginL   = SPACING.pageMarginLeft;
    this.marginR   = SPACING.pageMarginRight;
    this.marginT   = SPACING.pageMarginTop;
    this.marginB   = SPACING.pageMarginBottom;

    this.currentPage  = 1;
    this.headerHeight = 0;
    this._sections    = [];
  }

  // ─────────────────────────────────────────────
  // PAGE MANAGEMENT
  // ─────────────────────────────────────────────

  addPage(headerFn = null) {
    this.doc.addPage();
    this.currentPage++;
    this.y = this.marginT;
    if (headerFn) {
      headerFn(this);
      this.y = this.headerHeight + 4;
    }
  }

  checkPageBreak(neededHeight, headerFn = null) {
    const bottomLimit = this.pageH - this.marginB - SPACING.footerHeight;
    if (this.y + neededHeight > bottomLimit) {
      this.addPage(headerFn);
      return true;
    }
    return false;
  }

  get remainingHeight() {
    const bottomLimit = this.pageH - this.marginB - SPACING.footerHeight;
    return bottomLimit - this.y;
  }

  // ─────────────────────────────────────────────
  // COLOR & FONT SETTERS
  // ─────────────────────────────────────────────

  setFill(color) {
    this.doc.setFillColor(...color);
    return this;
  }

  setStroke(color) {
    this.doc.setDrawColor(...color);
    return this;
  }

  setLineWidth(w) {
    this.doc.setLineWidth(w);
    return this;
  }

  setFont(size, style = 'normal', color = COLORS.gray900) {
    this.doc.setFontSize(size);
    this.doc.setFont(FONTS.family.normal, style);
    this.doc.setTextColor(...color);
    return this;
  }

  // ─────────────────────────────────────────────
  // PRIMITIVE DRAWING
  // ─────────────────────────────────────────────

  rect(x, y, w, h, fillColor, strokeColor = null, radius = 0) {
    this.setFill(fillColor);
    if (strokeColor) {
      this.setStroke(strokeColor);
      this.doc.setLineWidth(0.3);
    }
    if (radius > 0) {
      this.doc.roundedRect(
        x, y, w, h, radius, radius,
        strokeColor ? 'FD' : 'F'
      );
    } else {
      this.doc.rect(x, y, w, h, strokeColor ? 'FD' : 'F');
    }
    return this;
  }

  hrule(y = null, color = COLORS.gray300, thickness = SPACING.dividerH) {
    const lineY = y !== null ? y : this.y;
    this.setStroke(color);
    this.doc.setLineWidth(thickness);
    this.doc.line(this.marginL, lineY, this.pageW - this.marginR, lineY);
    if (y === null) this.y += thickness + 1;
    return this;
  }

  vrule(x, y1, y2, color = COLORS.gray300, thickness = 0.3) {
    this.setStroke(color);
    this.doc.setLineWidth(thickness);
    this.doc.line(x, y1, x, y2);
    return this;
  }

  // ─────────────────────────────────────────────
  // TEXT PRIMITIVES
  // ─────────────────────────────────────────────

  text(text, x, y, opts = {}) {
    const {
      size  = FONTS.size.body,
      style = 'normal',
      color = COLORS.gray900,
      align = 'left',
    } = opts;
    this.setFont(size, style, color);
    this.doc.text(String(text ?? ''), x, y, { align });
    return this;
  }

  writeLine(text, x = null, opts = {}) {
    const {
      size   = FONTS.size.body,
      style  = 'normal',
      color  = COLORS.gray900,
      align  = 'left',
      lineH  = size * 0.4 + 2,
      indent = 0,
    } = opts;
    const xPos = x !== null ? x : this.marginL + indent;
    this.setFont(size, style, color);
    this.doc.text(String(text ?? ''), xPos, this.y, { align });
    this.y += lineH;
    return this;
  }

  writeWrapped(text, x, y, maxWidth, opts = {}) {
    const {
      size  = FONTS.size.body,
      style = 'normal',
      color = COLORS.gray900,
      lineH = size * 0.4 + 2,
    } = opts;
    this.setFont(size, style, color);
    const lines = this.doc.splitTextToSize(String(text ?? ''), maxWidth);
    this.doc.text(lines, x, y);
    return lines.length * lineH;
  }

  textWidth(text, size = FONTS.size.body, style = 'normal') {
    this.doc.setFontSize(size);
    this.doc.setFont(FONTS.family.normal, style);
    return this.doc.getTextWidth(String(text ?? ''));
  }

  // ─────────────────────────────────────────────
  // SPACING
  // ─────────────────────────────────────────────

  gap(mm = 4) {
    this.y += mm;
    return this;
  }

  // ─────────────────────────────────────────────
  // SECTION HEADER
  // ─────────────────────────────────────────────

  sectionHeader(title, accentColor = COLORS.primary, subtitle = null) {
    this.checkPageBreak(14);

    const x = this.marginL;
    const y = this.y;
    const w = this.contentW;
    const h = subtitle ? 13 : 9;

    this.rect(x, y, w, h, COLORS.sectionBg);
    this.rect(x, y, 3, h, accentColor);

    this.text(
      String(title).toUpperCase(),
      x + 6,
      y + (subtitle ? 5.5 : 5.8),
      { size: FONTS.size.sectionTitle, style: 'bold', color: COLORS.gray900 }
    );

    if (subtitle) {
      this.text(
        subtitle,
        x + 6,
        y + 10,
        { size: FONTS.size.bodySmall, color: COLORS.gray500 }
      );
    }

    this.setStroke(COLORS.sectionBorder);
    this.doc.setLineWidth(0.3);
    this.doc.line(x, y + h, x + w, y + h);

    this.y = y + h + 3;
    return this;
  }

  // ─────────────────────────────────────────────
  // INFO GRID
  // ─────────────────────────────────────────────

  infoGrid(fields, opts = {}) {
    const {
      colW   = this.contentW / 2 - 2,
      rowH   = 5.5,
      labelW = 42,
      bgColor = null,
      startX = this.marginL,
    } = opts;

    const totalFields = fields.filter(f => f);
    let col       = 0;
    let rowStartY = this.y;

    if (bgColor) {
      const rows = Math.ceil(totalFields.length / 2);
      this.rect(startX, this.y - 1, this.contentW, rows * rowH + 4, bgColor);
    }

    totalFields.forEach((field) => {
      if (!field) return;

      const isFullWidth = field.fullWidth === true;
      let x, maxValW;

      if (isFullWidth) {
        if (col === 1) { col = 0; rowStartY += rowH; }
        x      = startX;
        maxValW = this.contentW - labelW - 4;
      } else {
        x      = startX + (col === 0 ? 0 : colW + 4);
        maxValW = colW - labelW - 4;
      }

      const y = rowStartY;

      this.text(
        String(field.label || '') + ':',
        x, y,
        { size: FONTS.size.label, style: 'bold', color: COLORS.gray500 }
      );

      const rawVal = field.value;
      const valStr = (rawVal === null || rawVal === undefined || rawVal === '')
        ? '—' : String(rawVal);

      const valColor = field.highlight
        ? (field.highlightColor || COLORS.primary)
        : COLORS.gray900;

      this.text(valStr, x + labelW, y, {
        size:  field.large ? FONTS.size.bodyLarge : FONTS.size.value,
        style: field.bold ? 'bold' : 'normal',
        color: valColor,
      });

      const lineW = isFullWidth ? this.contentW : colW;
      this.setStroke(COLORS.gray200);
      this.doc.setLineWidth(0.15);
      this.doc.line(x, y + 1.5, x + lineW, y + 1.5);

      if (isFullWidth) {
        col = 0;
        rowStartY += rowH;
      } else {
        col++;
        if (col === 2) { col = 0; rowStartY += rowH; }
      }
    });

    if (col === 1) rowStartY += rowH;
    this.y = rowStartY + 2;
    return this;
  }

  // ─────────────────────────────────────────────
  // SUMMARY BOX
  // ─────────────────────────────────────────────

  summaryBox(rows, boxW = 80, accentColor = COLORS.primary) {
    const x    = this.pageW - this.marginR - boxW;
    const rowH = 5.5;
    const pad  = 4;
    const totalH = rows.length * rowH + pad * 2;

    this.checkPageBreak(totalH + 4);

    const y = this.y;

    this.rect(x, y, boxW, totalH, COLORS.white, COLORS.gray300);
    this.rect(x, y, boxW, 2.5, accentColor);

    let rowY = y + pad + 2;

    rows.forEach((row) => {
      if (!row) return;

      if (row.separator) {
        this.setStroke(COLORS.gray300);
        this.doc.setLineWidth(0.3);
        this.doc.line(x + 2, rowY - 0.5, x + boxW - 2, rowY - 0.5);
        rowY += 1.5;
        return;
      }

      const isBold      = row.bold      || false;
      const isHighlight = row.highlight || false;

      if (isHighlight) {
        this.rect(x + 0.5, rowY - 3, boxW - 1, rowH + 0.5, COLORS.primaryLight);
      }

      this.text(String(row.label || ''), x + pad, rowY, {
        size:  isBold ? FONTS.size.bodySmall : FONTS.size.bodySmall,
        style: isBold ? 'bold' : 'normal',
        color: isHighlight ? COLORS.primaryDark : COLORS.gray600,
      });

      this.text(String(row.value ?? '—'), x + boxW - pad, rowY, {
        size:  isBold ? FONTS.size.body : FONTS.size.bodySmall,
        style: isBold ? 'bold' : 'normal',
        color: isHighlight ? COLORS.primaryDark : COLORS.gray900,
        align: 'right',
      });

      rowY += rowH;
    });

    this.y = y + totalH + 4;
    return this;
  }

  // ─────────────────────────────────────────────
  // STATUS BADGE
  // ─────────────────────────────────────────────

  badge(label, colors, x, y) {
    const text  = String(label || '').toUpperCase();
    const padH  = SPACING.badgePadH;
    const padV  = SPACING.badgePadV;
    const fSize = FONTS.size.badge;
    const tW    = this.textWidth(text, fSize, 'bold');
    const bW    = tW + padH * 2;
    const bH    = fSize * 0.4 + padV * 2;

    this.rect(x, y - bH + padV, bW, bH, colors.bg, colors.border, SPACING.cornerRadius);
    this.text(text, x + padH, y, { size: fSize, style: 'bold', color: colors.text });
    return bW;
  }

  // ─────────────────────────────────────────────
  // METRIC CARDS
  // ─────────────────────────────────────────────

  metricCards(metrics, accentColor = COLORS.primary) {
    const count = metrics.length;
    const cardW = (this.contentW - (count - 1) * 3) / count;
    const cardH = 20;

    this.checkPageBreak(cardH + 4);

    metrics.forEach((metric, i) => {
      const x     = this.marginL + i * (cardW + 3);
      const y     = this.y;
      const color = metric.color || accentColor;

      this.rect(x, y, cardW, cardH, COLORS.white, COLORS.gray300, 2);
      this.rect(x, y, 2.5, cardH, color, null, 0);

      // Value on line 1
      this.text(String(metric.value ?? '—'), x + 5, y + 8, {
        size:  FONTS.size.sectionTitle,
        style: 'bold',
        color: COLORS.gray900,
      });

      // Unit on line 2 (if present)
      if (metric.unit) {
        this.text(
          metric.unit,
          x + 5,
          y + 14,
          { size: FONTS.size.caption, color: COLORS.gray500 }
        );
      }

      // Label at bottom
      this.text(String(metric.label || ''), x + 5, y + (metric.unit ? 19 : 16), {
        size:  FONTS.size.label,
        style: 'bold',
        color,
      });
    });

    this.y += cardH + 4;
    return this;
  }

  // ─────────────────────────────────────────────
  // TABLE  ← THE FIXED METHOD
  // ─────────────────────────────────────────────

  table(columns, rows, opts = {}, headerFn = null) {
    const {
      accentColor  = COLORS.primary,
      startY       = this.y,
      showFooter   = false,
      footerRows   = [],
      theme        = 'grid',
      didParseCell,
      ...extraOpts
    } = opts;

    const baseStyle = TABLE_STYLES.default;

    const columnStyles = {};
    columns.forEach((col, i) => {
      const style = { halign: col.halign || 'left' };
      if (col.width) style.cellWidth = col.width;
      columnStyles[col.dataKey || i] = style;
    });

    // ── FIXED: use autoTable(doc, opts) function form ──
    autoTable(this.doc, {
      startY,
      columns: columns.map(c => ({
        header:  c.header,
        dataKey: c.dataKey,
      })),
      body: rows,
      foot: showFooter ? footerRows : [],

      theme,

      styles:             { ...baseStyle.styles },
      headStyles:         { ...baseStyle.headStyles, fillColor: accentColor },
      alternateRowStyles: { ...baseStyle.alternateRowStyles },
      bodyStyles:         { ...baseStyle.bodyStyles },
      footStyles: {
        fillColor: COLORS.gray100,
        textColor: COLORS.gray900,
        fontStyle: 'bold',
        fontSize:  FONTS.size.tableBody,
      },
      columnStyles,

      tableLineColor: baseStyle.tableLineColor,
      tableLineWidth: baseStyle.tableLineWidth,

      margin: {
        left:  this.marginL,
        right: this.marginR,
      },

      didParseCell: didParseCell || undefined,

      didDrawPage: (data) => {
        this.currentPage = this.doc.getCurrentPageInfo().pageNumber;
        if (headerFn && data.pageNumber > 1) {
          headerFn(this);
        }
      },

      ...extraOpts,
    });

    // ── Update cursor ──
    this.y = this.doc.lastAutoTable.finalY + 4;
    return this;
  }

  // ─────────────────────────────────────────────
  // WATERMARK
  // ─────────────────────────────────────────────

  addWatermark(text = WATERMARK.text) {
    if (!text) return this;
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(WATERMARK.fontSize);
      this.doc.setFont(FONTS.family.bold, 'bold');
      this.doc.setTextColor(...WATERMARK.color);
      this.doc.text(
        text,
        this.pageW / 2,
        this.pageH / 2,
        { align: 'center', angle: WATERMARK.angle }
      );
    }
    return this;
  }

  // ─────────────────────────────────────────────
  // OUTPUT
  // ─────────────────────────────────────────────

  save(filename) {
    this.doc.save(`${filename}.pdf`);
  }

  preview() {
    const blob = this.doc.output('blob');
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  getRaw() {
    return this.doc;
  }

  get pageCount() {
    return this.doc.getNumberOfPages();
  }
}