/**
 * PDF Export System - Party Profile Template
 * StitchFlow Textile Manufacturing ERP
 *
 * Generates a complete, professional Party Profile PDF.
 *
 * Document Structure:
 * ├── Header (Company + Doc Meta + Party Status)
 * ├── Section 1: Party Identity & Contact Information
 * ├── Section 2: Credit & Financial Configuration
 * ├── Section 3: Business Performance Metrics (KPI Cards)
 * ├── Section 4: Payment Performance Analysis
 * ├── Section 5: Financial Summary
 * ├── Section 6: Challan Transaction History Table
 * ├── Section 7: Outstanding & Overdue Summary (conditional)
 * ├── Signature Block
 * └── Footer (all pages)
 */

import { PDFEngine }                          from '../pdfEngine';
import { drawHeader, drawContinuationHeader } from '../pdfHeader';
import { drawFooters, drawSignatureBlock }     from '../pdfFooter';
import {
  COLORS,
  FONTS,
  SPACING,
  DOC_TYPES,
  STATUS_COLORS,
} from '../pdfStyles';
import {
  pdfDate,
  pdfCurrency,
  pdfSafe,
  pdfPhone,
  pdfStatus,
  pdfPercent,
  pdfNumber,
  pdfCount,
} from '../pdfFormatters';

// ─────────────────────────────────────────────
// PARTY-SPECIFIC COLOR PALETTE
// ─────────────────────────────────────────────
const C = {
  party:       DOC_TYPES.PARTY.accentColor,         // Cyan-600
  credit:      [22,  163, 74],                       // Green-600
  outstanding: [37,  99,  235],                      // Blue-600
  interest:    [217, 119, 6],                        // Amber-600
  danger:      [220, 38,  38],                       // Red-600
  warning:     [234, 179, 8],                        // Yellow-500
  paid:        [22,  163, 74],                       // Green-600
  pending:     [217, 119, 6],                        // Amber-600
  overdue:     [220, 38,  38],                       // Red-600
  open:        [37,  99,  235],                      // Blue-600
  purple:      [124, 58,  237],                      // Violet-600
  teal:        [20,  184, 166],                      // Teal-500
  pink:        [236, 72,  153],                      // Pink-500
  indigo:      [79,  70,  229],                      // Indigo-600
};

// ─────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────

/**
 * Generate and download/preview Party Profile PDF
 *
 * @param {object} party              - Party object from API
 * @param {Array}  challans           - Filtered challans array
 * @param {object} stats              - Computed stats object from PartyDetails
 * @param {object} company            - Active company object
 * @param {object} settings           - User settings
 * @param {object} options            - { preview, watermark, dateRange }
 */
export async function generatePartyPDF(
  party,
  challans,
  stats,
  company,
  settings,
  options = {}
) {
  const {
    preview   = false,
    watermark = '',
    dateRange = 'all',
  } = options;

  // ── Derived values ─────────────────────────────
  const symbol      = settings.currencySymbol || '₹';
  const costPrec    = settings.costDecimalPrecision || 2;
  const dateFormat  = settings.dateFormat || 'DD/MM/YYYY';

  const creditUtil      = party.creditLimit > 0
    ? ((party.currentOutstanding / party.creditLimit) * 100)
    : 0;
  const availableCredit = Math.max(party.creditLimit - party.currentOutstanding, 0);
  const isOverLimit     = party.currentOutstanding > party.creditLimit;
  const isNearLimit     = creditUtil > 80 && !isOverLimit;

  // ── Status resolution ─────────────────────────
  const partyStatus     = party.activeStatus ? 'active' : 'inactive';
  const statusLabel     = party.activeStatus ? 'Active' : 'Inactive';

  // ── Date range label ──────────────────────────
  const dateRangeLabel  = _dateRangeLabel(dateRange);

  // ── Continuation header config ─────────────────
  const continuationHeader = (eng) => {
    drawContinuationHeader(eng, {
      company,
      docType:   'PARTY',
      docNumber: party.partyCode || party._id?.toString().slice(-6).toUpperCase(),
      title:     party.partyName,
    });
  };

  // ── Init engine ───────────────────────────────
  const engine = new PDFEngine({
    title:  `Party Profile - ${party.partyName}`,
    author: company.name || 'StitchFlow ERP',
  });

  // ══════════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════════
  drawHeader(engine, {
    company,
    docType:    'PARTY',
    docNumber:  party.partyCode || 'PTY',
    docDate:    new Date(),
    title:      party.partyName,
    status:     partyStatus,
    statusLabel,
    subtitle:   party.contactPerson
      ? `Contact: ${party.contactPerson}`
      : 'Party Profile & Transaction Report',
  });

  // ══════════════════════════════════════════════
  // SECTION 1 — PARTY IDENTITY & CONTACT
  // ══════════════════════════════════════════════
  engine.sectionHeader('Party Information', C.party);
  _drawPartyIdentity(engine, party, { symbol, dateFormat });

  // ══════════════════════════════════════════════
  // SECTION 2 — CREDIT & FINANCIAL CONFIGURATION
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Credit & Payment Configuration', C.credit);
  _drawCreditConfig(engine, party, {
    symbol,
    costPrec,
    creditUtil,
    availableCredit,
    isOverLimit,
    isNearLimit,
  });

  // ══════════════════════════════════════════════
  // SECTION 3 — BUSINESS PERFORMANCE METRICS
  // ══════════════════════════════════════════════
  if (stats) {
    engine.checkPageBreak(30, continuationHeader);
    engine.sectionHeader(
      `Business Performance  (${dateRangeLabel})`,
      C.indigo
    );
    _drawPerformanceMetrics(engine, stats, { symbol, costPrec });
  }

  // ══════════════════════════════════════════════
  // SECTION 4 — PAYMENT PERFORMANCE
  // ══════════════════════════════════════════════
  if (stats) {
    engine.checkPageBreak(55, continuationHeader);
    engine.sectionHeader('Payment Performance Analysis', C.paid);
    _drawPaymentPerformance(engine, stats, { symbol, costPrec });
  }

  // ══════════════════════════════════════════════
  // SECTION 5 — FINANCIAL SUMMARY
  // ══════════════════════════════════════════════
  if (stats) {
    engine.checkPageBreak(50, continuationHeader);
    engine.sectionHeader('Financial Summary', C.purple);
    _drawFinancialSummary(engine, stats, party, { symbol, costPrec });
  }

  // ══════════════════════════════════════════════
  // SECTION 6 — CHALLAN TRANSACTION HISTORY
  // ══════════════════════════════════════════════
  if (challans && challans.length > 0) {
    engine.checkPageBreak(40, continuationHeader);
    engine.sectionHeader(
      `Challan Transaction History  (${challans.length} records)`,
      C.purple
    );
    _drawChallanTable(engine, challans, { symbol, costPrec, dateFormat },
      continuationHeader
    );
  } else {
    engine.checkPageBreak(20, continuationHeader);
    engine.sectionHeader('Challan Transaction History', C.purple);
    _drawNoChallanBlock(engine);
  }

  // ══════════════════════════════════════════════
  // SECTION 7 — OVERDUE CHALLANS (conditional)
  // ══════════════════════════════════════════════
  const overdueChallans = challans?.filter(c => c.status === 'Overdue') || [];
  if (overdueChallans.length > 0) {
    engine.checkPageBreak(40, continuationHeader);
    engine.sectionHeader(
      `Overdue Challans  (${overdueChallans.length} pending)`,
      C.overdue
    );
    _drawOverdueTable(engine, overdueChallans, { symbol, costPrec, dateFormat },
      continuationHeader
    );
  }

  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════
  drawSignatureBlock(
    engine,
    [
      { label: 'Prepared By',   name: '' },
      { label: 'Account Manager', name: '' },
      { label: 'Authorized By', name: '' },
    ],
    C.party
  );

  // ══════════════════════════════════════════════
  // WATERMARK
  // ══════════════════════════════════════════════
  if (watermark) engine.addWatermark(watermark);

  // ══════════════════════════════════════════════
  // FOOTERS
  // ══════════════════════════════════════════════
  drawFooters(engine, {
    company,
    docType:   'PARTY',
    docNumber: party.partyCode || '',
    showTerms: true,
    terms:     'This report is confidential and intended for internal use only.',
  });

  // ── Output ────────────────────────────────────
  const filename = `Party_${party.partyName.replace(/\s+/g, '_')}_${party.partyCode || 'Profile'}`;

  if (preview) {
    engine.preview();
  } else {
    engine.save(filename);
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Party Identity Block
// ─────────────────────────────────────────────

function _drawPartyIdentity(engine, party, { symbol, dateFormat }) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // ── Identity banner ────────────────────────────
  engine.checkPageBreak(18);

  const bannerY = engine.y;
  const bannerH = 14;

  engine.rect(x, bannerY, contentW, bannerH, _tint(C.party, 0.06));
  engine.rect(x, bannerY, 3, bannerH, C.party);

  // Party code pill
  const codeText = party.partyCode || '—';
  engine.rect(x + 5, bannerY + 3, 28, 7, C.party, null, 1);
  engine.text(codeText, x + 19, bannerY + 7.8, {
    size:  FONTS.size.label,
    style: 'bold',
    color: COLORS.white,
    align: 'center',
  });

  // Party name
  engine.text(party.partyName, x + 37, bannerY + 6, {
    size:  FONTS.size.sectionTitle + 1,
    style: 'bold',
    color: COLORS.gray900,
  });

  // Status on right
  const statusColors = party.activeStatus
    ? STATUS_COLORS.active
    : STATUS_COLORS.inactive;
  engine.badge(
    party.activeStatus ? 'ACTIVE' : 'INACTIVE',
    statusColors,
    x + contentW - 30,
    bannerY + 9
  );

  // Member since
  engine.text(
    `Member since: ${pdfDate(party.createdAt, dateFormat)}`,
    x + 37,
    bannerY + 11.5,
    { size: FONTS.size.label, color: COLORS.gray500 }
  );

  engine.y = bannerY + bannerH + 4;

  // ── Two-column contact layout ──────────────────
  engine.checkPageBreak(42);

  const halfW  = (contentW - 4) / 2;
  const col1X  = x;
  const col2X  = x + halfW + 4;
  const startY = engine.y;

  // Left column — Contact details
  _drawLabeledBox(engine, col1X, halfW, startY, {
    title:  'Contact Details',
    color:  C.party,
    fields: [
      { label: 'Party Name',      value: pdfSafe(party.partyName) },
      { label: 'Contact Person',  value: pdfSafe(party.contactPerson) },
      { label: 'Phone',           value: pdfPhone(party.phone) },
      { label: 'Email',           value: pdfSafe(party.email) },
      { label: 'Address',         value: pdfSafe(party.address) },
    ],
  });

  // Right column — Tax & Registration
  _drawLabeledBox(engine, col2X, halfW, startY, {
    title:  'Registration & Tax',
    color:  C.indigo,
    fields: [
      { label: 'GST Number',      value: pdfSafe(party.gstNumber) },
      { label: 'Party Code',      value: pdfSafe(party.partyCode) },
      { label: 'Account Status',  value: party.activeStatus ? 'Active' : 'Inactive' },
      { label: 'Member Since',    value: pdfDate(party.createdAt, dateFormat) },
      { label: 'Last Updated',    value: pdfDate(party.updatedAt, dateFormat) },
    ],
  });

  const colH = _boxHeight(5);
  engine.y = startY + colH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Credit Configuration Block
// ─────────────────────────────────────────────

function _drawCreditConfig(engine, party, {
  symbol, costPrec,
  creditUtil, availableCredit,
  isOverLimit, isNearLimit,
}) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // ── Credit utilization bar ────────────────────
  engine.checkPageBreak(30);

  const barY   = engine.y;
  const barH   = 18;
  const barW   = contentW;

  engine.rect(x, barY, barW, barH, COLORS.gray50, COLORS.gray200, 2);

  // Bar label
  engine.text('Credit Utilization', x + 3, barY + 6, {
    size:  FONTS.size.label,
    style: 'bold',
    color: COLORS.gray600,
  });

  // Percentage
  const utilColor = isOverLimit ? C.danger
    : isNearLimit  ? C.warning
    : C.credit;

  engine.text(
    `${creditUtil.toFixed(1)}%`,
    x + barW - 3,
    barY + 6,
    { size: FONTS.size.bodySmall, style: 'bold', color: utilColor, align: 'right' }
  );

  // Track
  const trackY = barY + 9;
  const trackH = 5;
  const trackW = barW - 6;

  engine.rect(x + 3, trackY, trackW, trackH, COLORS.gray200, null, 2);

  // Fill
  const fillW = Math.min((creditUtil / 100) * trackW, trackW);
  if (fillW > 0) {
    engine.rect(x + 3, trackY, fillW, trackH, utilColor, null, 2);
  }

  // Labels below bar
  engine.text(
    `Outstanding: ${pdfCurrency(party.currentOutstanding, symbol, costPrec)}`,
    x + 3,
    barY + 17,
    { size: FONTS.size.label, color: C.outstanding }
  );
  engine.text(
    `Limit: ${pdfCurrency(party.creditLimit, symbol, costPrec)}`,
    x + barW - 3,
    barY + 17,
    { size: FONTS.size.label, color: COLORS.gray500, align: 'right' }
  );

  engine.y = barY + barH + 4;

  // ── Alert box (if near/over limit) ────────────
  if (isOverLimit || isNearLimit) {
    engine.checkPageBreak(12);

    const alertY     = engine.y;
    const alertH     = 10;
    const alertColor = isOverLimit ? C.danger : C.warning;
    const alertBg    = isOverLimit ? [254, 226, 226] : [254, 243, 199];
    const alertMsg   = isOverLimit
      ? `⚠  Credit limit exceeded by ${pdfCurrency(party.currentOutstanding - party.creditLimit, symbol, costPrec)}`
      : `⚠  Near credit limit — only ${pdfCurrency(availableCredit, symbol, costPrec)} available`;

    engine.rect(x, alertY, contentW, alertH, alertBg, alertColor, 2);
    engine.text(alertMsg, x + 4, alertY + 6.5, {
      size:  FONTS.size.bodySmall,
      style: 'bold',
      color: alertColor,
    });

    engine.y = alertY + alertH + 4;
  }

  // ── Three-column credit & payment config ──────
  engine.checkPageBreak(40);

  const thirdW = (contentW - 8) / 3;
  const startY = engine.y;

  const cols = [
    {
      title:  'Credit Terms',
      color:  C.credit,
      fields: [
        { label: 'Credit Limit',   value: pdfCurrency(party.creditLimit, symbol, costPrec) },
        { label: 'Outstanding',    value: pdfCurrency(party.currentOutstanding, symbol, costPrec) },
        { label: 'Available',      value: pdfCurrency(availableCredit, symbol, costPrec) },
        { label: 'Utilization',    value: `${creditUtil.toFixed(1)}%` },
      ],
    },
    {
      title:  'Payment Terms',
      color:  C.outstanding,
      fields: [
        { label: 'Payment Days',   value: `${party.paymentTermsDays} days` },
        { label: 'Interest Rate',  value: `${party.interestPercentPerDay}% / day` },
        { label: 'Interest Type',  value: pdfStatus(party.interestType) },
        { label: 'Status',         value: party.activeStatus ? 'Active' : 'Inactive' },
      ],
    },
    {
      title:  'Account Info',
      color:  C.purple,
      fields: [
        { label: 'Party Code',     value: pdfSafe(party.partyCode) },
        { label: 'GST Number',     value: pdfSafe(party.gstNumber) },
        { label: 'Created',        value: pdfDate(party.createdAt) },
        { label: 'Updated',        value: pdfDate(party.updatedAt) },
      ],
    },
  ];

  cols.forEach((col, i) => {
    const cx = x + i * (thirdW + 4);
    _drawLabeledBox(engine, cx, thirdW, startY, col);
  });

  engine.y = startY + _boxHeight(4) + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Performance Metrics (KPI Cards)
// ─────────────────────────────────────────────

function _drawPerformanceMetrics(engine, stats, { symbol, costPrec }) {
  const metrics = [
    {
      label: 'Total Business',
      value: pdfCurrency(stats.totalAmount, symbol, costPrec),
      color: C.indigo,
    },
    {
      label: 'Total Challans',
      value: pdfCount(stats.totalChallans),
      color: C.party,
    },
    {
      label: 'Total Items',
      value: pdfCount(stats.totalItems),
      color: C.teal,
    },
    {
      label: 'Total Meters',
      value: `${(stats.totalMeters || 0).toFixed(2)} m`,
      color: C.pink,
    },
    {
      label: 'Avg. Order Value',
      value: pdfCurrency(stats.averageOrderValue || 0, symbol, costPrec),
      color: C.interest,
    },
  ];

  engine.metricCards(metrics, C.indigo);
}

// ─────────────────────────────────────────────
// PRIVATE: Payment Performance Analysis
// ─────────────────────────────────────────────

function _drawPaymentPerformance(engine, stats, { symbol, costPrec }) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // ── Status distribution row ────────────────────
  engine.checkPageBreak(24);

  const distY    = engine.y;
  const distH    = 20;
  const quarterW = (contentW - 9) / 4;

  const statusBoxes = [
    {
      label:  'Paid',
      count:  stats.paidChallans,
      amount: pdfCurrency(stats.paidAmount, symbol, costPrec),
      bg:     [220, 252, 231],
      border: [134, 239, 172],
      color:  C.paid,
    },
    {
      label:  'Open',
      count:  stats.openChallans,
      amount: '',
      bg:     [219, 234, 254],
      border: [147, 197, 253],
      color:  C.outstanding,
    },
    {
      label:  'Overdue',
      count:  stats.overdueChallans,
      amount: '',
      bg:     [254, 226, 226],
      border: [252, 165, 165],
      color:  C.overdue,
    },
    {
      label:  'Total',
      count:  stats.totalChallans,
      amount: pdfCurrency(stats.totalAmount, symbol, costPrec),
      bg:     [243, 244, 246],
      border: [209, 213, 219],
      color:  COLORS.gray700,
    },
  ];

  statusBoxes.forEach((box, i) => {
    const bx = x + i * (quarterW + 3);
    engine.rect(bx, distY, quarterW, distH, box.bg, box.border, 2);

    // Count (large)
    engine.text(
      String(box.count),
      bx + quarterW / 2,
      distY + 9,
      { size: FONTS.size.sectionTitle + 2, style: 'bold', color: box.color, align: 'center' }
    );

    // Label
    engine.text(
      box.label,
      bx + quarterW / 2,
      distY + 15,
      { size: FONTS.size.label, style: 'bold', color: box.color, align: 'center' }
    );

    // Amount (if available)
    if (box.amount) {
      engine.text(
        box.amount,
        bx + quarterW / 2,
        distY + 19.5,
        { size: FONTS.size.caption, color: box.color, align: 'center' }
      );
    }
  });

  engine.y = distY + distH + 5;

  // ── Rate bars ─────────────────────────────────
  engine.checkPageBreak(28);

  const rates = [
    {
      label:    'Payment Rate',
      value:    parseFloat(stats.paymentRate || 0),
      subLabel: `${stats.paidChallans} of ${stats.totalChallans} challans paid`,
      color:    C.paid,
    },
    {
      label:    'Collection Rate',
      value:    parseFloat(stats.collectionRate || 0),
      subLabel: `${pdfCurrency(stats.paidAmount, symbol, costPrec)} collected of ${pdfCurrency(stats.totalAmount, symbol, costPrec)}`,
      color:    C.outstanding,
    },
  ];

  rates.forEach((rate) => {
    engine.checkPageBreak(12);
    const ry  = engine.y;
    const rW  = contentW;
    const pct = Math.min(rate.value, 100);

    // Label row
    engine.text(rate.label, x, ry, {
      size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray700,
    });
    engine.text(`${rate.value.toFixed(1)}%`, x + rW, ry, {
      size: FONTS.size.bodySmall, style: 'bold', color: rate.color, align: 'right',
    });

    // Track
    engine.rect(x, ry + 3, rW, 5, COLORS.gray200, null, 2);

    // Fill
    if (pct > 0) {
      engine.rect(x, ry + 3, (pct / 100) * rW, 5, rate.color, null, 2);
    }

    // Sub-label
    engine.text(rate.subLabel, x, ry + 11, {
      size: FONTS.size.caption, color: COLORS.gray400,
    });

    engine.y = ry + 14;
  });

  // ── Average payment days ───────────────────────
  engine.checkPageBreak(14);
  engine.gap(2);

  const avgY = engine.y;
  engine.rect(x, avgY, contentW, 12, COLORS.gray50, COLORS.gray200, 2);

  engine.text('Average Payment Duration:', x + 3, avgY + 7.5, {
    size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray600,
  });

  engine.text(
    `${stats.averagePaymentDays || 0} days`,
    x + contentW - 3,
    avgY + 7.5,
    { size: FONTS.size.bodySmall, style: 'bold', color: C.party, align: 'right' }
  );

  engine.text(
    `(Payment terms: ${/* will be passed if needed */ '—'} days)`,
    x + contentW / 2,
    avgY + 7.5,
    { size: FONTS.size.caption, color: COLORS.gray400, align: 'center' }
  );

  engine.y = avgY + 12 + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Financial Summary
// ─────────────────────────────────────────────

function _drawFinancialSummary(engine, stats, party, { symbol, costPrec }) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // ── Left: row-by-row summary ───────────────────
  engine.checkPageBreak(50);

  const halfW  = contentW - 82;   // leave 78mm for summary box
  const startY = engine.y;

  const summaryRows = [
    {
      label:  'Total Business Value',
      value:  pdfCurrency(stats.totalAmount, symbol, costPrec),
      bg:     [219, 234, 254],
      color:  C.outstanding,
    },
    {
      label:  'Amount Collected',
      value:  pdfCurrency(stats.paidAmount, symbol, costPrec),
      bg:     [220, 252, 231],
      color:  C.paid,
    },
    {
      label:  'Pending Amount',
      value:  pdfCurrency(stats.pendingAmount, symbol, costPrec),
      bg:     [254, 243, 199],
      color:  C.pending,
    },
    {
      label:  'Interest Accrued',
      value:  pdfCurrency(stats.totalInterest || 0, symbol, costPrec),
      bg:     [254, 226, 226],
      color:  C.overdue,
    },
    {
      label:  'Current Outstanding',
      value:  pdfCurrency(party.currentOutstanding, symbol, costPrec),
      bg:     [243, 244, 246],
      color:  COLORS.gray700,
      bold:   true,
    },
  ];

  let rowY = startY;
  const rowH = 9;

  summaryRows.forEach((row) => {
    engine.rect(x, rowY, halfW, rowH, row.bg, null, 1);

    engine.text(row.label, x + 3, rowY + 5.8, {
      size:  FONTS.size.bodySmall,
      style: row.bold ? 'bold' : 'normal',
      color: row.color,
    });
    engine.text(row.value, x + halfW - 3, rowY + 5.8, {
      size:  FONTS.size.bodySmall,
      style: 'bold',
      color: row.color,
      align: 'right',
    });

    rowY += rowH + 1;
  });

  // ── Right: summary box ─────────────────────────
  const savedY  = engine.y;
  engine.y = startY;

  engine.summaryBox(
    [
      { label: 'Total Business',  value: pdfCurrency(stats.totalAmount, symbol, costPrec) },
      { label: 'Collected',       value: pdfCurrency(stats.paidAmount, symbol, costPrec) },
      { label: 'Pending',         value: pdfCurrency(stats.pendingAmount, symbol, costPrec) },
      { separator: true },
      { label: 'Outstanding',     value: pdfCurrency(party.currentOutstanding, symbol, costPrec) },
      { label: 'Credit Limit',    value: pdfCurrency(party.creditLimit, symbol, costPrec) },
      { separator: true },
      {
        label:     'BALANCE DUE',
        value:     pdfCurrency(party.currentOutstanding, symbol, costPrec),
        bold:      true,
        highlight: true,
      },
    ],
    78,
    C.party
  );

  engine.y = Math.max(engine.y, rowY + 5);
}

// ─────────────────────────────────────────────
// PRIVATE: Challan History Table
// ─────────────────────────────────────────────

function _drawChallanTable(engine, challans, { symbol, costPrec, dateFormat }, headerFn) {
  const rows = challans.map((challan) => {
    const totalPaid  = challan.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const remaining  = (challan.totals?.subtotalAmount || 0) - totalPaid;
    const daysOverdue = _getDaysOverdue(challan.dueDate);

    return {
      challanNo:  pdfSafe(challan.challanNumber),
      issueDate:  pdfDate(challan.issueDate, dateFormat),
      dueDate:    pdfDate(challan.dueDate, dateFormat),
      items:      String(challan.items?.length || 0),
      meters:     `${(challan.totals?.totalMeters || 0).toFixed(2)}`,
      amount:     pdfCurrency(challan.totals?.subtotalAmount || 0, symbol, costPrec),
      paid:       pdfCurrency(totalPaid, symbol, costPrec),
      balance:    remaining > 0 ? pdfCurrency(remaining, symbol, costPrec) : '—',
      interest:   challan.currentInterest > 0
        ? pdfCurrency(challan.currentInterest, symbol, costPrec)
        : '—',
      status:     challan.status || 'Open',
      _status:    challan.status,   // for styling
      _overdue:   daysOverdue,
    };
  });

  const columns = [
    { header: 'Challan No.',   dataKey: 'challanNo',  width: 27, halign: 'left'   },
    { header: 'Issue Date',    dataKey: 'issueDate',  width: 20, halign: 'center' },
    { header: 'Due Date',      dataKey: 'dueDate',    width: 20, halign: 'center' },
    { header: 'Items',         dataKey: 'items',      width: 11, halign: 'center' },
    { header: 'Meters',        dataKey: 'meters',     width: 17, halign: 'right'  },
    { header: 'Amount',        dataKey: 'amount',     width: 23, halign: 'right'  },
    { header: 'Paid',          dataKey: 'paid',       width: 21, halign: 'right'  },
    { header: 'Balance',       dataKey: 'balance',    width: 24, halign: 'right'  },
    { header: 'Status',        dataKey: 'status',     width: 19, halign: 'center' },
  ];

  engine.table(
    columns,
    rows,
    {
      accentColor: C.purple,
      startY:      engine.y,

      didParseCell(data) {
        if (data.row.section !== 'body') return;

        const row     = data.row.raw;
        const colKey  = data.column.dataKey;

        // Status column coloring
        if (colKey === 'status') {
          const statusColorMap = {
            Paid:      { text: C.paid,        bg: [220, 252, 231] },
            Open:      { text: C.outstanding, bg: [219, 234, 254] },
            Overdue:   { text: C.overdue,     bg: [254, 226, 226] },
            Cancelled: { text: COLORS.gray500, bg: [243, 244, 246] },
          };
          const sc = statusColorMap[row._status] || statusColorMap.Open;
          data.cell.styles.textColor = sc.text;
          data.cell.styles.fillColor = sc.bg;
          data.cell.styles.fontStyle = 'bold';
        }

        // Balance column — red if non-zero
        if (colKey === 'balance' && row.balance !== '—') {
          data.cell.styles.textColor = C.overdue;
          data.cell.styles.fontStyle = 'bold';
        }

        // Overdue row — light red tint on entire row
        if (row._status === 'Overdue') {
          if (!['status', 'balance'].includes(colKey)) {
            data.cell.styles.textColor = [127, 29, 29];   // red-900
          }
        }

        // Amount column bold
        if (colKey === 'amount') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    },
    headerFn
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Overdue Challans Table
// ─────────────────────────────────────────────

function _drawOverdueTable(engine, overdueChallans, { symbol, costPrec, dateFormat }, headerFn) {
  const rows = overdueChallans.map((challan) => {
    const totalPaid   = challan.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const balance     = (challan.totals?.subtotalAmount || 0) - totalPaid;
    const daysOverdue = _getDaysOverdue(challan.dueDate);

    return {
      challanNo:   pdfSafe(challan.challanNumber),
      dueDate:     pdfDate(challan.dueDate, dateFormat),
      daysOverdue: `${daysOverdue} days`,
      amount:      pdfCurrency(challan.totals?.subtotalAmount || 0, symbol, costPrec),
      paid:        pdfCurrency(totalPaid, symbol, costPrec),
      balance:     pdfCurrency(balance, symbol, costPrec),
      interest:    pdfCurrency(challan.currentInterest || 0, symbol, costPrec),
      total:       pdfCurrency(balance + (challan.currentInterest || 0), symbol, costPrec),
    };
  });

  // Totals footer row
  const totalBalance  = overdueChallans.reduce((s, c) => {
    const paid = c.payments?.reduce((ps, p) => ps + p.amount, 0) || 0;
    return s + ((c.totals?.subtotalAmount || 0) - paid);
  }, 0);
  const totalInterest = overdueChallans.reduce((s, c) => s + (c.currentInterest || 0), 0);

  const columns = [
    { header: 'Challan No.',   dataKey: 'challanNo',   width: 28, halign: 'left'   },
    { header: 'Due Date',      dataKey: 'dueDate',     width: 22, halign: 'center' },
    { header: 'Days Overdue',  dataKey: 'daysOverdue', width: 22, halign: 'center' },
    { header: 'Invoice Amt',   dataKey: 'amount',      width: 25, halign: 'right'  },
    { header: 'Paid',          dataKey: 'paid',        width: 20, halign: 'right'  },
    { header: 'Balance',       dataKey: 'balance',     width: 22, halign: 'right'  },
    { header: 'Interest',      dataKey: 'interest',    width: 20, halign: 'right'  },
    { header: 'Total Due',     dataKey: 'total',       width: 23, halign: 'right'  },
  ];

  engine.table(
    columns,
    rows,
    {
      accentColor: C.overdue,
      startY:      engine.y,
      showFooter:  true,
      footerRows: [
        [
          { content: 'TOTAL',                        colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
          { content: pdfCurrency(totalBalance, symbol, costPrec),  styles: { halign: 'right', fontStyle: 'bold', textColor: C.overdue } },
          { content: pdfCurrency(totalInterest, symbol, costPrec), styles: { halign: 'right', fontStyle: 'bold', textColor: C.overdue } },
          { content: pdfCurrency(totalBalance + totalInterest, symbol, costPrec), styles: { halign: 'right', fontStyle: 'bold', textColor: C.overdue } },
        ],
      ],

      didParseCell(data) {
        if (data.row.section !== 'body') return;
        // All overdue rows get light red tint
        data.cell.styles.textColor = [127, 29, 29];
        if (data.column.dataKey === 'daysOverdue') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = C.overdue;
        }
        if (data.column.dataKey === 'total') {
          data.cell.styles.fontStyle  = 'bold';
          data.cell.styles.textColor  = C.overdue;
        }
      },
    },
    headerFn
  );

  // ── Grand total box ────────────────────────────
  engine.checkPageBreak(16);
  const x        = engine.marginL;
  const contentW = engine.contentW;
  const totalDue = totalBalance + totalInterest;
  const boxY     = engine.y;

  engine.rect(x, boxY, contentW, 13, [254, 226, 226], C.overdue, 2);
  engine.text('TOTAL AMOUNT DUE (including interest):', x + 4, boxY + 8, {
    size:  FONTS.size.body,
    style: 'bold',
    color: C.overdue,
  });
  engine.text(
    pdfCurrency(totalDue, symbol, costPrec),
    x + contentW - 4,
    boxY + 8,
    { size: FONTS.size.sectionTitle, style: 'bold', color: C.overdue, align: 'right' }
  );
  engine.y = boxY + 13 + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: No Challans Placeholder
// ─────────────────────────────────────────────

function _drawNoChallanBlock(engine) {
  const x        = engine.marginL;
  const contentW = engine.contentW;
  const blockH   = 18;

  engine.checkPageBreak(blockH + 4);

  engine.rect(x, engine.y, contentW, blockH, COLORS.gray50, COLORS.gray200, 2);
  engine.text('No challan records found for the selected period.', x + contentW / 2, engine.y + 11, {
    size:  FONTS.size.body,
    color: COLORS.gray400,
    align: 'center',
  });
  engine.y += blockH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Labeled Box (reusable column card)
// ─────────────────────────────────────────────

function _drawLabeledBox(engine, x, w, y, { title, color, fields }) {
  const rowH    = 6.5;
  const headerH = 8;
  const padding = 3;
  const totalH  = headerH + fields.length * rowH + padding;

  // Border
  engine.rect(x, y, w, totalH, COLORS.white, COLORS.gray200, 2);

  // Header bar
  engine.rect(x, y, w, headerH, _tint(color, 0.12), null, 0);
  engine.rect(x, y, 2.5, headerH, color, null, 0);

  engine.text(title.toUpperCase(), x + 5, y + 5.5, {
    size:  FONTS.size.label,
    style: 'bold',
    color,
  });

  // Fields
  fields.forEach((field, i) => {
    const fy = y + headerH + i * rowH;

    if (i % 2 === 1) {
      engine.rect(x + 0.5, fy, w - 1, rowH, COLORS.gray50);
    }

    // Separator
    engine.setStroke(COLORS.gray100);
    engine.doc.setLineWidth(0.15);
    engine.doc.line(x, fy, x + w, fy);

    engine.text(
      String(field.label || '') + ':',
      x + padding,
      fy + 4.2,
      { size: FONTS.size.label, color: COLORS.gray500 }
    );

    engine.text(
      pdfSafe(field.value),
      x + w - padding,
      fy + 4.2,
      { size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray900, align: 'right' }
    );
  });
}

// ─────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────

function _boxHeight(fieldCount, rowH = 6.5, headerH = 8, padding = 3) {
  return headerH + fieldCount * rowH + padding;
}

function _tint(color, factor = 0.1) {
  return color.map(c => Math.min(255, Math.round(c + (255 - c) * (1 - factor))));
}

function _getDaysOverdue(dueDate) {
  if (!dueDate) return 0;
  const now  = new Date();
  const due  = new Date(dueDate);
  const diff = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function _dateRangeLabel(range) {
  const map = {
    '7':   'Last 7 days',
    '30':  'Last 30 days',
    '60':  'Last 60 days',
    '90':  'Last 90 days',
    '180': 'Last 6 months',
    '365': 'Last year',
    'all': 'All time',
  };
  return map[String(range)] || 'Selected period';
}