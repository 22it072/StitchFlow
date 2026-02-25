/**
 * PDF Export System - Challan (Delivery Challan) Template
 * StitchFlow Textile Manufacturing ERP
 *
 * Document Structure:
 * ├── Header (Company + Doc Meta)
 * ├── Section 1: Summary KPI Cards
 * ├── Section 2: Party & Challan Info (two-column)
 * ├── Section 3: Items Table
 * ├── Section 4: Financial Summary (totals + interest)
 * ├── Section 5: Payment History (conditional)
 * ├── Section 6: Notes (conditional)
 * ├── Signature Block
 * └── Footer (all pages)
 */

import { PDFEngine }                          from '../pdfEngine';
import { drawHeader, drawContinuationHeader } from '../pdfHeader';
import { drawFooters, drawSignatureBlock }    from '../pdfFooter';
import {
  COLORS,
  FONTS,
  SPACING,
  DOC_TYPES,
  STATUS_COLORS,
} from '../pdfStyles';
import {
  pdfDate,
  pdfSafe,
  pdfNumber,
} from '../pdfFormatters';

// ─────────────────────────────────────────────
// SECTION ACCENT COLORS
// ─────────────────────────────────────────────
const CHALLAN_COLOR  = [217, 119,  6];   // Amber-600  (matches DOC_TYPES.CHALLAN)
const PARTY_COLOR    = [8,   145, 178];  // Cyan-600
const ITEMS_COLOR    = [22,  163,  74];  // Green-600
const FINANCE_COLOR  = [37,   99, 235];  // Blue-600
const PAYMENT_COLOR  = [22,  163,  74];  // Green-600
const INTEREST_COLOR = [220,  38,  38];  // Red-600
const OVERDUE_COLOR  = [220,  38,  38];  // Red-600

// ─────────────────────────────────────────────
// PDF-SAFE CURRENCY (avoids ₹ encoding issue)
// ─────────────────────────────────────────────
function fmt(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return 'Rs. 0.00';
  return `Rs. ${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// ─────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────

/**
 * Generate and download Challan PDF
 *
 * @param {object} challan      - Full challan object from API (populated)
 * @param {number} liveInterest - Current live interest amount
 * @param {object} company      - Active company object
 * @param {object} settings     - User settings
 * @param {object} options      - { preview: bool, watermark: string }
 */
export async function generateChallanPDF(challan, liveInterest = 0, company, settings, options = {}) {
  const { preview = false, watermark = '' } = options;

  // ── Derived values ────────────────────────────
  const dateFormat    = settings?.dateFormat || 'DD/MM/YYYY';
  const totalPaid     = challan.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const totalPayable  = (challan.totals?.subtotalAmount || 0) + liveInterest;
  const remaining     = Math.max(0, totalPayable - totalPaid);
  const daysOverdue   = _daysOverdue(challan.dueDate);
  const hasInterest   = liveInterest > 0;

  const statusDef  = _resolveStatus(challan.status);
  const docNumber  = challan.challanNumber;

  // ── Header config ─────────────────────────────
  const headerConfig = {
    company,
    docType:     'CHALLAN',
    docNumber,
    docDate:     challan.issueDate,
    title:       `Delivery Challan - ${challan.party?.partyName || ''}`,
    status:      challan.status,
    statusLabel: challan.status,
    subtitle:    `Due: ${pdfDate(challan.dueDate)}${daysOverdue > 0 ? `  ·  ${daysOverdue} days overdue` : ''}`,
  };

  // ── Continuation header fn ────────────────────
  const continuationHeader = (eng) => {
    drawContinuationHeader(eng, {
      company,
      docType:   'CHALLAN',
      docNumber,
      title:     `Challan - ${challan.party?.partyName || ''}`,
    });
  };

  // ── Init engine ───────────────────────────────
  const engine = new PDFEngine({
    title:  `Challan - ${docNumber}`,
    author: company?.name || 'StitchFlow ERP',
  });

  // ══════════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════════
  drawHeader(engine, headerConfig);

  // ══════════════════════════════════════════════
  // SECTION 1 — SUMMARY KPI CARDS
  // ══════════════════════════════════════════════
  engine.sectionHeader('Summary', CHALLAN_COLOR);

  const summaryMetrics = [
    {
      label: 'Total Amount',
      value: fmt(challan.totals?.subtotalAmount),
      unit:  'principal',
      color: FINANCE_COLOR,
    },
    {
      label: 'Total Paid',
      value: fmt(totalPaid),
      unit:  `${challan.payments?.length || 0} payment${challan.payments?.length !== 1 ? 's' : ''}`,
      color: PAYMENT_COLOR,
    },
    {
      label: hasInterest ? 'Total Payable' : 'Remaining',
      value: fmt(hasInterest ? totalPayable : remaining),
      unit:  hasInterest ? 'incl. interest' : 'outstanding',
      color: remaining > 0 ? OVERDUE_COLOR : PAYMENT_COLOR,
    },
    {
      label: 'Total Items',
      value: String(challan.items?.length || 0),
      unit:  'quality lines',
      color: ITEMS_COLOR,
    },
    {
      label: 'Total Meters',
      value: `${(challan.totals?.totalMeters || 0).toFixed(2)} m`,
      unit:  `${(challan.totals?.totalWeight || 0).toFixed(2)} Kg`,
      color: CHALLAN_COLOR,
    },
  ];

  engine.metricCards(summaryMetrics, CHALLAN_COLOR);

  // ══════════════════════════════════════════════
  // SECTION 2 — PARTY & CHALLAN INFO
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Challan & Party Information', PARTY_COLOR);

  _drawInfoColumns(engine, challan, daysOverdue);

  // ══════════════════════════════════════════════
  // SECTION 3 — ITEMS TABLE
  // ══════════════════════════════════════════════
  engine.checkPageBreak(40, continuationHeader);
  engine.sectionHeader('Items Details', ITEMS_COLOR);

  _drawItemsTable(engine, challan, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 4 — FINANCIAL SUMMARY
  // ══════════════════════════════════════════════
  engine.checkPageBreak(50, continuationHeader);
  engine.sectionHeader('Financial Summary', FINANCE_COLOR);

  _drawFinancialSummary(engine, challan, {
    totalPaid,
    totalPayable,
    remaining,
    liveInterest,
    hasInterest,
  });

  // ══════════════════════════════════════════════
  // SECTION 5 — PAYMENT HISTORY (conditional)
  // ══════════════════════════════════════════════
  if (challan.payments && challan.payments.length > 0) {
    engine.checkPageBreak(40, continuationHeader);
    engine.sectionHeader('Payment History', PAYMENT_COLOR);
    _drawPaymentHistory(engine, challan.payments, continuationHeader);
  }

  // ══════════════════════════════════════════════
  // SECTION 6 — NOTES (conditional)
  // ══════════════════════════════════════════════
  if (challan.notes) {
    engine.checkPageBreak(30, continuationHeader);
    engine.sectionHeader('Notes & Remarks', COLORS.gray600);
    _drawNotesBlock(engine, challan.notes);
  }

  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════
  drawSignatureBlock(
    engine,
    [
      { label: "Receiver's Signature", name: '' },
      { label: 'Prepared By',          name: '' },
      { label: 'Authorized Signatory', name: '' },
    ],
    CHALLAN_COLOR
  );

  // ══════════════════════════════════════════════
  // WATERMARK
  // ══════════════════════════════════════════════
  if (watermark) engine.addWatermark(watermark);

  // ══════════════════════════════════════════════
  // FOOTERS (all pages)
  // ══════════════════════════════════════════════
  drawFooters(engine, {
    company,
    docType:   'CHALLAN',
    docNumber,
    showTerms:  true,
    terms:      'This is a computer-generated delivery challan. Subject to our standard terms and conditions.',
    signatures: [],
  });

  // ── Output ────────────────────────────────────
  const partySlug = (challan.party?.partyName || 'Party').replace(/\s+/g, '_');
  const filename  = `Challan_${docNumber}_${partySlug}`;

  if (preview) {
    engine.preview();
  } else {
    engine.save(filename);
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Party + Challan Info (two columns)
// ─────────────────────────────────────────────

function _drawInfoColumns(engine, challan, daysOverdue) {
  const x        = engine.marginL;
  const contentW = engine.contentW;
  const halfW    = (contentW - 4) / 2;
  const startY   = engine.y;

  // ── Left col — Party info ─────────────────────
  _drawMiniCard(engine, x, halfW, startY, {
    title: 'Party Details',
    color: PARTY_COLOR,
    rows: [
      { label: 'Party Name',     value: pdfSafe(challan.party?.partyName) },
      { label: 'Contact',        value: pdfSafe(challan.party?.contactPerson) },
      { label: 'Phone',          value: pdfSafe(challan.party?.phone) },
      { label: 'Email',          value: pdfSafe(challan.party?.email) },
      { label: 'GST',            value: pdfSafe(challan.party?.gstNumber) },
    ].filter(r => r.value !== '—'),
  });

  // ── Right col — Challan info ──────────────────
  const challanRows = [
    { label: 'Challan No.',  value: challan.challanNumber },
    { label: 'Issue Date',   value: pdfDate(challan.issueDate) },
    { label: 'Due Date',     value: pdfDate(challan.dueDate) },
    { label: 'Status',       value: challan.status },
  ];
  if (daysOverdue > 0) {
    challanRows.push({ label: 'Days Overdue', value: `${daysOverdue} days`, highlight: true });
  }

  _drawMiniCard(engine, x + halfW + 4, halfW, startY, {
    title: 'Challan Details',
    color: CHALLAN_COLOR,
    rows:  challanRows,
  });

  // ── Set Y below tallest column ────────────────
  const leftH  = _miniCardHeight(challanRows.length > 4 ? 5 : 4);
  const rightH = _miniCardHeight(challanRows.length);
  engine.y = startY + Math.max(leftH, rightH) + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Items Table
// ─────────────────────────────────────────────

function _drawItemsTable(engine, challan, headerFn) {
  const rows = (challan.items || []).map((item, i) => ({
    no:            String(i + 1),
    qualityName:   item.qualityName,
    panna:         String(item.panna || '—'),
    meters:        (item.orderedMeters || 0).toFixed(2),
    wtPerMeter:    (item.weightPerMeter || 0).toFixed(4),
    totalWeight:   (item.calculatedWeight || 0).toFixed(2),
    pricePerMeter: fmt(item.pricePerMeter),
    amount:        fmt(item.calculatedAmount),
  }));

  // Footer row (totals)
  const footerRow = [{
    no:            '',
    qualityName:   'TOTAL',
    panna:         '',
    meters:        (challan.totals?.totalMeters || 0).toFixed(2),
    wtPerMeter:    '',
    totalWeight:   (challan.totals?.totalWeight || 0).toFixed(2),
    pricePerMeter: '',
    amount:        fmt(challan.totals?.subtotalAmount),
  }];

  const columns = [
    { header: '#',           dataKey: 'no',            width: 8,   halign: 'center' },
    { header: 'Quality Name',dataKey: 'qualityName',   width: 45,  halign: 'left'   },
    { header: 'Panna',       dataKey: 'panna',         width: 15,  halign: 'center' },
    { header: 'Meters',      dataKey: 'meters',        width: 21,  halign: 'right'  },
    { header: 'Wt/m (Kg)',   dataKey: 'wtPerMeter',    width: 21,  halign: 'right'  },
    { header: 'Weight (Kg)', dataKey: 'totalWeight',   width: 23,  halign: 'right'  },
    { header: 'Price/m',     dataKey: 'pricePerMeter', width: 23,  halign: 'right'  },
    { header: 'Amount',      dataKey: 'amount',        width: 26,  halign: 'right'  },
  ];

  engine.table(
    columns,
    rows,
    {
      accentColor: ITEMS_COLOR,
      startY:      engine.y,
      showFooter:  true,
      footerRows:  footerRow,
      didParseCell(data) {
        // Bold amount column body
        if (data.column.dataKey === 'amount' && data.row.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = FINANCE_COLOR;
        }
        // Bold total footer row
        if (data.row.section === 'foot') {
          data.cell.styles.fontStyle  = 'bold';
          data.cell.styles.fillColor  = [219, 234, 254];   // blue-100
          data.cell.styles.textColor  = FINANCE_COLOR;
          data.cell.styles.fontSize   = FONTS.size.tableBody + 0.5;
        }
        // Color quality name
        if (data.column.dataKey === 'qualityName' && data.row.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    },
    headerFn
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Financial Summary
// ─────────────────────────────────────────────

function _drawFinancialSummary(engine, challan, { totalPaid, totalPayable, remaining, liveInterest, hasInterest }) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  engine.checkPageBreak(50);

  // ── Left: breakdown bars ──────────────────────
  const barAreaW = contentW - 88;
  const barH     = 9;
  const barGap   = 4;

  const items = [
    { label: 'Principal Amount', value: challan.totals?.subtotalAmount || 0, color: FINANCE_COLOR },
  ];
  if (hasInterest) {
    items.push({ label: 'Interest Accrued', value: liveInterest, color: INTEREST_COLOR });
  }
  if (totalPaid > 0) {
    items.push({ label: 'Total Paid',       value: totalPaid,    color: PAYMENT_COLOR });
  }
  if (remaining > 0) {
    items.push({ label: 'Balance Due',      value: remaining,    color: OVERDUE_COLOR });
  }

  const maxVal = Math.max(...items.map(i => i.value), 1);
  let barY = engine.y;

  items.forEach(item => {
    const fillW = (item.value / maxVal) * barAreaW;

    // Track
    engine.rect(x, barY, barAreaW, barH, COLORS.gray100, COLORS.gray200, 1);
    // Fill
    if (fillW > 0) engine.rect(x, barY, Math.max(fillW, 2), barH, item.color, null, 1);

    // Label inside or outside depending on fill width
    if (fillW > 30) {
      engine.text(item.label, x + 3, barY + 6.2, {
        size: FONTS.size.label, style: 'bold', color: COLORS.white,
      });
    } else {
      engine.text(item.label, x + 3, barY + 6.2, {
        size: FONTS.size.label, style: 'bold', color: item.color,
      });
    }

    // Value to the right
    engine.text(fmt(item.value), x + barAreaW + 4, barY + 5.5, {
      size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray900,
    });

    barY += barH + barGap;
  });

  // ── Right: summary box ────────────────────────
  const summaryRows = [
    { label: 'Subtotal',          value: fmt(challan.totals?.subtotalAmount) },
  ];
  if (hasInterest) {
    summaryRows.push(
      { label: `Interest (${challan.interestTracking?.interestRate || 0}%/day)`, value: fmt(liveInterest) }
    );
  }
  summaryRows.push({ separator: true });
  summaryRows.push({
    label:     'Total Payable',
    value:     fmt(totalPayable),
    bold:      true,
    highlight: true,
  });
  if (totalPaid > 0) {
    summaryRows.push({ separator: true });
    summaryRows.push({ label: 'Paid',      value: fmt(totalPaid) });
    summaryRows.push({ label: 'Balance',   value: fmt(remaining), bold: true });
  }

  const savedY = engine.y;
  engine.y = engine.y - (items.length * (barH + barGap));   // rewind to bar start Y
  engine.summaryBox(summaryRows, 84, CHALLAN_COLOR);
  engine.y = Math.max(engine.y, savedY + 5);

  // ── Overdue banner (if applicable) ───────────────
  const daysOverdue = _daysOverdue(challan.dueDate);
  if (daysOverdue > 0 && challan.status !== 'Paid' && challan.status !== 'Cancelled') {
    engine.checkPageBreak(12);
    const bannerY = engine.y;
    engine.rect(x, bannerY, contentW, 10, [254, 226, 226], INTEREST_COLOR, 2);
    engine.rect(x, bannerY, 3, 10, INTEREST_COLOR, null, 0);
    engine.text(
      `OVERDUE: This challan is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past the due date of ${pdfDate(challan.dueDate)}.`,
      x + 6,
      bannerY + 7,
      { size: FONTS.size.bodySmall, style: 'bold', color: INTEREST_COLOR }
    );
    engine.y = bannerY + 14;
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Payment History Table
// ─────────────────────────────────────────────

function _drawPaymentHistory(engine, payments, headerFn) {
  const rows = payments.map((p, i) => ({
    no:        String(i + 1),
    date:      pdfDate(p.date),
    method:    pdfSafe(p.method),
    reference: pdfSafe(p.reference),
    notes:     p.notes ? String(p.notes).slice(0, 40) : '—',
    amount:    fmt(p.amount),
  }));

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const footerRow = [{
    no: '', date: '', method: '', reference: '', notes: 'TOTAL PAID',
    amount: fmt(totalPaid),
  }];

  const columns = [
    { header: '#',         dataKey: 'no',        width: 8,   halign: 'center' },
    { header: 'Date',      dataKey: 'date',       width: 28,  halign: 'center' },
    { header: 'Method',    dataKey: 'method',     width: 26,  halign: 'center' },
    { header: 'Reference', dataKey: 'reference',  width: 30,  halign: 'left'   },
    { header: 'Notes',     dataKey: 'notes',      width: 58,  halign: 'left'   },
    { header: 'Amount',    dataKey: 'amount',     width: 32,  halign: 'right'  },
  ];

  engine.table(
    columns,
    rows,
    {
      accentColor: PAYMENT_COLOR,
      startY:      engine.y,
      showFooter:  true,
      footerRows:  footerRow,
      didParseCell(data) {
        if (data.column.dataKey === 'amount' && data.row.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = PAYMENT_COLOR;
        }
        if (data.row.section === 'foot') {
          data.cell.styles.fontStyle  = 'bold';
          data.cell.styles.fillColor  = [220, 252, 231];   // green-100
          data.cell.styles.textColor  = PAYMENT_COLOR;
        }
      },
    },
    headerFn
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Notes Block
// ─────────────────────────────────────────────

function _drawNotesBlock(engine, notes) {
  const x        = engine.marginL;
  const contentW = engine.contentW;
  const padding  = 4;
  const maxW     = contentW - padding * 2;
  const lines    = engine.doc.splitTextToSize(String(notes), maxW);
  const blockH   = lines.length * 4.5 + padding * 2 + 2;

  engine.rect(x, engine.y, contentW, blockH, COLORS.gray50, COLORS.gray300, 2);
  engine.doc.setFontSize(FONTS.size.body);
  engine.doc.setFont('helvetica', 'normal');
  engine.doc.setTextColor(...COLORS.gray700);
  engine.doc.text(lines, x + padding, engine.y + padding + 3.5);
  engine.y += blockH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Mini two-column info card
// ─────────────────────────────────────────────

function _drawMiniCard(engine, x, w, y, { title, color, rows }) {
  const rowH    = 5.5;
  const headerH = 7;
  const padding = 3;
  const totalH  = headerH + rows.length * rowH + padding;

  engine.rect(x, y, w, totalH, COLORS.white, COLORS.gray200, 2);
  engine.rect(x, y, w, headerH, _lighten(color, 0.5), null, 0);
  engine.rect(x, y, 3, totalH, color, null, 0);

  engine.text(title.toUpperCase(), x + 5, y + 5, {
    size: FONTS.size.label, style: 'bold', color,
  });

  rows.forEach((row, i) => {
    const ry = y + headerH + i * rowH;

    if (i % 2 === 1) engine.rect(x, ry, w, rowH, COLORS.gray50);

    engine.setStroke(COLORS.gray100);
    engine.doc.setLineWidth(0.15);
    engine.doc.line(x, ry, x + w, ry);

    engine.text(String(row.label) + ':', x + 5, ry + 3.8, {
      size: FONTS.size.label, color: COLORS.gray500,
    });

    engine.text(pdfSafe(row.value), x + w - padding, ry + 3.8, {
      size:  FONTS.size.label + 0.5,
      style: row.highlight ? 'bold' : 'bold',
      color: row.highlight ? INTEREST_COLOR : COLORS.gray900,
      align: 'right',
    });
  });
}

// ─────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────

function _miniCardHeight(rowCount, rowH = 5.5, headerH = 7, padding = 3) {
  return headerH + rowCount * rowH + padding;
}

function _daysOverdue(dueDate) {
  if (!dueDate) return 0;
  const today = new Date();
  const due   = new Date(dueDate);
  if (today <= due) return 0;
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

function _resolveStatus(status) {
  const key = String(status || '').toLowerCase();
  const map = {
    open:      STATUS_COLORS.pending,
    paid:      STATUS_COLORS.completed,
    overdue:   STATUS_COLORS.cancelled,
    cancelled: STATUS_COLORS.inactive,
  };
  return map[key] || STATUS_COLORS.default;
}

function _lighten(color, factor = 0.12) {
  return color.map(c => Math.round(c + (255 - c) * (1 - factor)));
}