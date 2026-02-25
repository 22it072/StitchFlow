/**
 * PDF Export System - Estimate Template
 * StitchFlow Textile Manufacturing ERP
 *
 * Generates a complete, professional PDF for EstimateDetail.
 *
 * Document Structure:
 * ├── Header (Company + Doc Meta)
 * ├── Section 1: Summary Metrics (KPI Cards)
 * ├── Section 2: Weight Analysis
 * ├── Section 3: Warp Details
 * ├── Section 4: Weft Details
 * ├── Section 5: Weft-2 Details (conditional)
 * ├── Section 6: Yarn Comparison Table
 * ├── Section 7: Cost Breakdown
 * ├── Section 8: Notes (conditional)
 * ├── Signature Block
 * └── Footer (all pages)
 */

import { PDFEngine }                        from '../pdfEngine';
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
  pdfCurrency,
  pdfSafe,
  pdfStatus,
  pdfPercent,
  pdfNumber,
  pdfGeneratedAt,
} from '../pdfFormatters';

// ─────────────────────────────────────────────
// SECTION ACCENT COLORS
// ─────────────────────────────────────────────
const WARP_COLOR   = [37,  99,  235];   // Blue-600
const WEFT_COLOR   = [22,  163, 74];    // Green-600
const WEFT2_COLOR  = [124, 58,  237];   // Violet-600
const TOTAL_COLOR  = [15,  23,  42];    // Slate-900
const WARN_COLOR   = [220, 38,  38];    // Red-600
const AMBER_COLOR  = [217, 119, 6];     // Amber-600

// ─────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────

/**
 * Generate and download Estimate PDF
 *
 * @param {object} estimate   - Full estimate object from API
 * @param {object} company    - Active company object
 * @param {object} settings   - User settings (currency, precision, etc.)
 * @param {object} options    - { preview: bool, watermark: string }
 */
export async function generateEstimatePDF(estimate, company, settings, options = {}) {
  const { preview = false, watermark = '' } = options;

  // ── Derived values ────────────────────────────
  const warpYarn     = _getYarnDetails(estimate.warp);
  const weftYarn     = _getYarnDetails(estimate.weft);
  const weft2Yarn    = estimate.weft2Enabled ? _getYarnDetails(estimate.weft2) : null;
  const totalWastage = _calcTotalWastage(estimate);
  const wastagePerc  = _calcWastagePercentage(estimate);
  const precision    = settings.weightDecimalPrecision || 4;
  const costPrec     = settings.costDecimalPrecision   || 2;
  const symbol       = settings.currencySymbol         || '₹';
  const dateFormat   = settings.dateFormat             || 'DD/MM/YYYY';

  // ── Header config (reused for continuation pages) ──
  const headerConfig = {
    company,
    docType:    'ESTIMATE',
    docNumber:  `EST-V${estimate.currentVersion}`,
    docDate:    estimate.createdAt,
    title:      estimate.qualityName,
    status:     estimate.currentVersion > 1 ? 'revised' : 'current',
    statusLabel: estimate.currentVersion > 1
      ? `Version ${estimate.currentVersion}`
      : 'Current',
    subtitle:   estimate.tags?.length
      ? estimate.tags.join('  ·  ')
      : '',
  };

  // ── Continuation header fn (for page 2+) ─────
  const continuationHeader = (eng) => {
    drawContinuationHeader(eng, {
      company,
      docType:   'ESTIMATE',
      docNumber: `EST-V${estimate.currentVersion}`,
      title:     estimate.qualityName,
    });
  };

  // ── Init engine ───────────────────────────────
  const engine = new PDFEngine({
    title:  `Estimate - ${estimate.qualityName}`,
    author: company.name || 'StitchFlow ERP',
  });

  // ══════════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════════
  drawHeader(engine, headerConfig);

  // ══════════════════════════════════════════════
  // SECTION 1 — SUMMARY METRICS
  // ══════════════════════════════════════════════
  engine.sectionHeader('Summary', DOC_TYPES.ESTIMATE.accentColor);

  const summaryMetrics = [
    {
      label: 'Net Weight',
      value: `${(estimate.totalNetWeight || 0).toFixed(precision)} Kg`,
      unit:  '',
      color: [20, 184, 166],   // Teal-500
    },
    {
      label: 'Gross Weight',
      value: `${(estimate.totalWeight || 0).toFixed(precision)} Kg`,
      unit:  '',
      color: COLORS.gray600,
    },
    {
      label: 'Total Wastage',
      value: `${totalWastage.toFixed(precision)} Kg`,
      unit:  `(${wastagePerc.toFixed(2)}%)`,
      color: WARN_COLOR,
    },
    {
      label: 'Total Cost',
      value: pdfCurrency(estimate.totalCost, symbol, costPrec),
      unit:  '/ meter',
      color: DOC_TYPES.ESTIMATE.accentColor,
    },
    {
      label: 'Other Cost',
      value: pdfCurrency(estimate.otherCostPerMeter || 0, symbol, costPrec),
      unit:  '/ meter',
      color: AMBER_COLOR,
    },
  ];

  engine.metricCards(summaryMetrics, DOC_TYPES.ESTIMATE.accentColor);

  // ── Version & Tags info row ──────────────────
  if (estimate.tags?.length || estimate.currentVersion > 1) {
    engine.infoGrid(
      [
        {
          label: 'Quality Name',
          value: estimate.qualityName,
          bold:  true,
        },
        {
          label: 'Version',
          value: `Version ${estimate.currentVersion}`,
        },
        {
          label: 'Created Date',
          value: pdfDate(estimate.createdAt, dateFormat),
        },
        {
          label: 'Last Modified',
          value: pdfDate(estimate.updatedAt, dateFormat),
        },
        estimate.tags?.length
          ? {
              label:     'Tags',
              value:     estimate.tags.join(', '),
              fullWidth: true,
            }
          : null,
        estimate.notes
          ? null   // notes get their own section
          : null,
      ].filter(Boolean),
      { bgColor: COLORS.gray50 }
    );
  }

  // ══════════════════════════════════════════════
  // SECTION 2 — WEIGHT ANALYSIS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Weight Analysis', COLORS.accent);

  _drawWeightAnalysisTable(engine, estimate, precision, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 3 — WARP DETAILS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(80, continuationHeader);
  engine.sectionHeader('Warp Details', WARP_COLOR);

  _drawYarnSection(engine, {
    section:    estimate.warp,
    yarnData:   warpYarn,
    label:      'WARP',
    color:      WARP_COLOR,
    symbol,
    precision,
    costPrec,
    isWarp:     true,
  }, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 4 — WEFT DETAILS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(80, continuationHeader);
  engine.sectionHeader('Weft Details', WEFT_COLOR);

  _drawYarnSection(engine, {
    section:    estimate.weft,
    yarnData:   weftYarn,
    label:      'WEFT',
    color:      WEFT_COLOR,
    symbol,
    precision,
    costPrec,
    isWarp:     false,
  }, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 5 — WEFT-2 DETAILS (conditional)
  // ══════════════════════════════════════════════
  if (estimate.weft2Enabled && estimate.weft2) {
    engine.checkPageBreak(80, continuationHeader);
    engine.sectionHeader('Weft-2 Details', WEFT2_COLOR);

    _drawYarnSection(engine, {
      section:    estimate.weft2,
      yarnData:   weft2Yarn,
      label:      'WEFT-2',
      color:      WEFT2_COLOR,
      symbol,
      precision,
      costPrec,
      isWarp:     false,
    }, continuationHeader);
  }

  // ══════════════════════════════════════════════
  // SECTION 6 — YARN COMPARISON TABLE
  // ══════════════════════════════════════════════
  engine.checkPageBreak(50, continuationHeader);
  engine.sectionHeader('Yarn Summary', COLORS.accent);

  _drawYarnSummaryTable(engine, estimate, {
    warpYarn,
    weftYarn,
    weft2Yarn,
    symbol,
    costPrec,
  }, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 7 — COST BREAKDOWN
  // ══════════════════════════════════════════════
  engine.checkPageBreak(50, continuationHeader);
  engine.sectionHeader('Cost Breakdown', AMBER_COLOR);

  _drawCostBreakdown(engine, estimate, { symbol, costPrec }, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 8 — NOTES (conditional)
  // ══════════════════════════════════════════════
  if (estimate.notes) {
    engine.checkPageBreak(30, continuationHeader);
    engine.sectionHeader('Notes & Remarks', COLORS.gray600);
    _drawNotesBlock(engine, estimate.notes);
  }

  // ══════════════════════════════════════════════
  // SECTION 9 — VERSION HISTORY (if any)
  // ══════════════════════════════════════════════
  if (estimate.versions?.length > 0) {
    engine.checkPageBreak(40, continuationHeader);
    engine.sectionHeader('Version History', COLORS.gray500);
    _drawVersionHistory(engine, estimate, { symbol, dateFormat });
  }

  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════
  drawSignatureBlock(
    engine,
    [
      { label: 'Prepared By',  name: '' },
      { label: 'Reviewed By',  name: '' },
      { label: 'Authorized By', name: '' },
    ],
    DOC_TYPES.ESTIMATE.accentColor
  );

  // ══════════════════════════════════════════════
  // WATERMARK (if requested)
  // ══════════════════════════════════════════════
  if (watermark) {
    engine.addWatermark(watermark);
  }

  // ══════════════════════════════════════════════
  // FOOTERS (all pages)
  // ══════════════════════════════════════════════
  drawFooters(engine, {
    company,
    docType:    'ESTIMATE',
    docNumber:  `EST-V${estimate.currentVersion}`,
    showTerms:  true,
    terms:      'This estimate is for reference only and subject to market rate changes.',
    signatures: [],
  });

  // ── Output ────────────────────────────────────
  const filename = `Estimate_${estimate.qualityName.replace(/\s+/g, '_')}_V${estimate.currentVersion}`;

  if (preview) {
    engine.preview();
  } else {
    engine.save(filename);
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Weight Analysis Table
// ─────────────────────────────────────────────

function _drawWeightAnalysisTable(engine, estimate, precision, headerFn) {
  const rows = [];

  // Warp row
  const warpNetW   = estimate.warp?.formattedNetWeight || estimate.warp?.netWeight || 0;
  const warpGrossW = estimate.warp?.formattedWeight || 0;
  const warpWaste  = warpGrossW - warpNetW;

  rows.push({
    section:    'Warp',
    netWeight:  warpNetW.toFixed(precision),
    grossWeight: warpGrossW.toFixed(precision),
    wastage:    warpWaste.toFixed(precision),
    wastagePerc: `${estimate.warp?.wastage || 0}%`,
  });

  // Weft row
  const weftNetW   = estimate.weft?.formattedNetWeight || estimate.weft?.netWeight || 0;
  const weftGrossW = estimate.weft?.formattedWeight || 0;
  const weftWaste  = weftGrossW - weftNetW;

  rows.push({
    section:    'Weft',
    netWeight:  weftNetW.toFixed(precision),
    grossWeight: weftGrossW.toFixed(precision),
    wastage:    weftWaste.toFixed(precision),
    wastagePerc: `${estimate.weft?.wastage || 0}%`,
  });

  // Weft-2 row (conditional)
  if (estimate.weft2Enabled && estimate.weft2) {
    const w2NetW   = estimate.weft2?.formattedNetWeight || estimate.weft2?.netWeight || 0;
    const w2GrossW = estimate.weft2?.formattedWeight || 0;
    const w2Waste  = w2GrossW - w2NetW;

    rows.push({
      section:    'Weft-2',
      netWeight:  w2NetW.toFixed(precision),
      grossWeight: w2GrossW.toFixed(precision),
      wastage:    w2Waste.toFixed(precision),
      wastagePerc: `${estimate.weft2?.wastage || 0}%`,
    });
  }

  // Totals row
  const totalWastage = _calcTotalWastage(estimate);
  const wastagePerc  = _calcWastagePercentage(estimate);

  rows.push({
    section:    'TOTAL',
    netWeight:  (estimate.totalNetWeight || 0).toFixed(precision),
    grossWeight: (estimate.totalWeight || 0).toFixed(precision),
    wastage:    totalWastage.toFixed(precision),
    wastagePerc: `${wastagePerc.toFixed(2)}%`,
  });

  const columns = [
    { header: 'Section',         dataKey: 'section',     width: 35,  halign: 'left'   },
    { header: 'Net Weight (Kg)', dataKey: 'netWeight',   width: 40,  halign: 'right'  },
    { header: 'Gross Weight (Kg)', dataKey: 'grossWeight', width: 40, halign: 'right' },
    { header: 'Wastage (Kg)',    dataKey: 'wastage',     width: 38,  halign: 'right'  },
    { header: 'Wastage %',       dataKey: 'wastagePerc', width: 29,  halign: 'center' },
  ];

  engine.table(
    columns,
    rows,
    {
      accentColor: COLORS.accent,
      startY:      engine.y,
      showFooter:  false,

      // Custom cell styling via didParseCell
      didParseCell(data) {
        // Bold & color total row
        if (data.row.raw?.section === 'TOTAL') {
          data.cell.styles.fontStyle  = 'bold';
          data.cell.styles.fillColor  = COLORS.gray100;
          data.cell.styles.textColor  = COLORS.gray900;
          data.cell.styles.fontSize   = FONTS.size.tableBody + 0.5;
        }
        // Color wastage column red
        if (data.column.dataKey === 'wastage' && data.row.section === 'body') {
          data.cell.styles.textColor = WARN_COLOR;
        }
        // Section name colors
        if (data.column.dataKey === 'section' && data.row.section === 'body') {
          const sectionColors = {
            Warp:   WARP_COLOR,
            Weft:   WEFT_COLOR,
            'Weft-2': WEFT2_COLOR,
            TOTAL:  COLORS.gray900,
          };
          const color = sectionColors[data.cell.raw];
          if (color) data.cell.styles.textColor = color;
          if (data.cell.raw !== 'TOTAL') data.cell.styles.fontStyle = 'bold';
        }
      },
    },
    headerFn
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Yarn Section (Warp / Weft / Weft-2)
// ─────────────────────────────────────────────

function _drawYarnSection(engine, config, headerFn) {
  const {
    section,
    yarnData,
    label,
    color,
    symbol,
    precision,
    costPrec,
    isWarp,
  } = config;

  if (!section) return;

  const x        = engine.marginL;
  const contentW = engine.contentW;
  const halfW    = (contentW - 4) / 2;

  // ── Yarn Identity Box ──────────────────────────
  engine.checkPageBreak(22, headerFn);

  const yarnBoxY = engine.y;
  const yarnBoxH = 18;

  // Yarn box background
  engine.rect(x, yarnBoxY, contentW, yarnBoxH, _lightenColor(color), color, 2);

  // Label pill
  engine.rect(x + 3, yarnBoxY + 3, 18, 6, color, null, 1);
  engine.text(
    label,
    x + 12, yarnBoxY + 7.5,
    { size: FONTS.size.caption, style: 'bold', color: COLORS.white, align: 'center' }
  );

  // Yarn display name
  const displayName = _getYarnDisplayName(section);
  engine.text(
    displayName,
    x + 25,
    yarnBoxY + 9,
    { size: FONTS.size.sectionTitle, style: 'bold', color: COLORS.gray900 }
  );

  // Yarn category badge
  const catLabel = yarnData?.yarnCategory === 'filament' ? 'Filament' : 'Spun';
  const catColor = yarnData?.yarnCategory === 'filament'
    ? { bg: [219, 234, 254], text: WARP_COLOR, border: [147, 197, 253] }
    : { bg: [220, 252, 231], text: WEFT_COLOR, border: [134, 239, 172] };

  engine.badge(catColor ? catLabel : catLabel, catColor, x + 25, yarnBoxY + 15.5);

  // Denier on right
  engine.text(
    `${section.denier || 0}D`,
    x + contentW - 3,
    yarnBoxY + 9,
    { size: FONTS.size.bodyLarge, style: 'bold', color, align: 'right' }
  );
  engine.text(
    'Denier',
    x + contentW - 3,
    yarnBoxY + 14.5,
    { size: FONTS.size.label, color: COLORS.gray500, align: 'right' }
  );

  engine.y = yarnBoxY + yarnBoxH + 4;

  // ── Two-column detail layout ───────────────────
  engine.checkPageBreak(55, headerFn);

  const col1X = x;
  const col2X = x + halfW + 4;
  const startY = engine.y;

  // Col 1 — Input Parameters
  _drawDetailColumn(engine, col1X, halfW, startY, {
    title: 'Input Parameters',
    color,
    rows:  isWarp
      ? [
          { label: 'Tar (Threads)',  value: pdfSafe(section.tar) },
          { label: 'Denier',         value: `${section.denier || 0}D` },
          { label: 'Wastage',        value: `${section.wastage || 0}%` },
        ]
      : [
          { label: 'Peek',           value: pdfSafe(section.peek) },
          { label: 'Panna (Width)',  value: pdfSafe(section.panna) },
          { label: 'Denier',         value: `${section.denier || 0}D` },
          { label: 'Wastage',        value: `${section.wastage || 0}%` },
        ],
  });

  // Col 2 — Yarn Specifications
  const yarnSpecRows = [];
  if (yarnData?.tpm)           yarnSpecRows.push({ label: 'TPM',          value: String(yarnData.tpm) });
  if (yarnData?.filamentCount) yarnSpecRows.push({ label: 'Filament',     value: `${yarnData.filamentCount}F` });

  yarnSpecRows.push(
    { label: 'Yarn Price',    value: pdfCurrency(yarnData?.yarnPrice || 0, symbol, costPrec) },
    { label: 'GST',           value: `${yarnData?.yarnGst || 0}%` },
    {
      label: 'Price + GST',
      value: pdfCurrency(
        (yarnData?.yarnPrice || 0) * (1 + (yarnData?.yarnGst || 0) / 100),
        symbol,
        costPrec
      ),
    }
  );

  _drawDetailColumn(engine, col2X, halfW, startY, {
    title: 'Yarn Specifications',
    color,
    rows:  yarnSpecRows,
  });

  // Set Y to max of both columns + gap
  engine.y = startY + Math.max(
    _columnHeight(isWarp ? 3 : 4),
    _columnHeight(yarnSpecRows.length)
  ) + 6;

  // ── Calculated Results Row (full width) ────────
  engine.checkPageBreak(22, headerFn);

  const resultsY = engine.y;
  const resultsH = 20;
  const thirdW   = (contentW - 8) / 3;

  // Background
  engine.rect(x, resultsY, contentW, resultsH, _lightenColor(color));
  engine.text(
    'CALCULATED RESULTS',
    x + 4,
    resultsY + 5,
    { size: FONTS.size.label, style: 'bold', color }
  );

  // Divider below title text
  engine.setStroke(_lightenColor(color, 0.4));
  engine.doc.setLineWidth(0.2);
  engine.doc.line(x + 4, resultsY + 7, x + contentW - 4, resultsY + 7);

  // Three metric boxes
  const resultMetrics = [
    {
      label: 'Net Weight',
      value: `${(section.formattedNetWeight || section.netWeight || 0).toFixed(precision)} Kg`,
    },
    {
      label: 'Gross Weight',
      value: `${(section.formattedWeight || 0).toFixed(precision)} Kg`,
    },
    {
      label: `${label} Cost`,
      value: pdfCurrency(section.formattedCost || 0, symbol, costPrec),
    },
  ];

  resultMetrics.forEach((m, i) => {
    const mx = x + 4 + i * (thirdW + 4);
    // Value (prominent, on top)
    engine.text(
      m.value,
      mx + thirdW / 2,
      resultsY + 13,
      { size: FONTS.size.bodyLarge, style: 'bold', color: COLORS.gray900, align: 'center' }
    );
    // Label (smaller, below)
    engine.text(
      m.label,
      mx + thirdW / 2,
      resultsY + 18,
      { size: FONTS.size.caption, color: COLORS.gray500, align: 'center' }
    );

    // Divider between metrics
    if (i < 2) {
      engine.vrule(mx + thirdW + 2, resultsY + 8, resultsY + resultsH - 2, COLORS.gray300);
    }
  });

  engine.y = resultsY + resultsH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Yarn Summary Table
// ─────────────────────────────────────────────

function _drawYarnSummaryTable(engine, estimate, { warpYarn, weftYarn, weft2Yarn, symbol, costPrec }, headerFn) {
  const rows = [
    {
      section:    'Warp',
      yarnName:   _getYarnDisplayName(estimate.warp),
      category:   warpYarn?.yarnCategory === 'filament' ? 'Filament' : 'Spun',
      denier:     `${estimate.warp?.denier || 0}D`,
      tpm:        warpYarn?.tpm ? String(warpYarn.tpm) : '—',
      filament:   warpYarn?.filamentCount ? `${warpYarn.filamentCount}F` : '—',
      price:      pdfCurrency(warpYarn?.yarnPrice || 0, symbol, costPrec),
      gst:        `${warpYarn?.yarnGst || 0}%`,
      priceGst:   pdfCurrency(
        (warpYarn?.yarnPrice || 0) * (1 + (warpYarn?.yarnGst || 0) / 100),
        symbol,
        costPrec
      ),
    },
    {
      section:    'Weft',
      yarnName:   _getYarnDisplayName(estimate.weft),
      category:   weftYarn?.yarnCategory === 'filament' ? 'Filament' : 'Spun',
      denier:     `${estimate.weft?.denier || 0}D`,
      tpm:        weftYarn?.tpm ? String(weftYarn.tpm) : '—',
      filament:   weftYarn?.filamentCount ? `${weftYarn.filamentCount}F` : '—',
      price:      pdfCurrency(weftYarn?.yarnPrice || 0, symbol, costPrec),
      gst:        `${weftYarn?.yarnGst || 0}%`,
      priceGst:   pdfCurrency(
        (weftYarn?.yarnPrice || 0) * (1 + (weftYarn?.yarnGst || 0) / 100),
        symbol,
        costPrec
      ),
    },
  ];

  if (estimate.weft2Enabled && estimate.weft2 && weft2Yarn) {
    rows.push({
      section:    'Weft-2',
      yarnName:   _getYarnDisplayName(estimate.weft2),
      category:   weft2Yarn?.yarnCategory === 'filament' ? 'Filament' : 'Spun',
      denier:     `${estimate.weft2?.denier || 0}D`,
      tpm:        weft2Yarn?.tpm ? String(weft2Yarn.tpm) : '—',
      filament:   weft2Yarn?.filamentCount ? `${weft2Yarn.filamentCount}F` : '—',
      price:      pdfCurrency(weft2Yarn?.yarnPrice || 0, symbol, costPrec),
      gst:        `${weft2Yarn?.yarnGst || 0}%`,
      priceGst:   pdfCurrency(
        (weft2Yarn?.yarnPrice || 0) * (1 + (weft2Yarn?.yarnGst || 0) / 100),
        symbol,
        costPrec
      ),
    });
  }

  const columns = [
    { header: 'Section',      dataKey: 'section',   width: 17,  halign: 'center' },
    { header: 'Yarn Name',    dataKey: 'yarnName',  width: 40,  halign: 'left'   },
    { header: 'Category',     dataKey: 'category',  width: 19,  halign: 'center' },
    { header: 'Denier',       dataKey: 'denier',    width: 17,  halign: 'center' },
    { header: 'TPM',          dataKey: 'tpm',       width: 13,  halign: 'center' },
    { header: 'Filament',     dataKey: 'filament',  width: 17,  halign: 'center' },
    { header: 'Price',        dataKey: 'price',     width: 21,  halign: 'right'  },
    { header: 'GST',          dataKey: 'gst',       width: 12,  halign: 'center' },
    { header: 'Price + GST',  dataKey: 'priceGst',  width: 21,  halign: 'right'  },
  ];

  engine.table(
    columns,
    rows,
    {
      accentColor: COLORS.accent,
      startY:      engine.y,
      didParseCell(data) {
        if (data.column.dataKey === 'section' && data.row.section === 'body') {
          const colorMap = { Warp: WARP_COLOR, Weft: WEFT_COLOR, 'Weft-2': WEFT2_COLOR };
          const c = colorMap[data.cell.raw];
          if (c) {
            data.cell.styles.textColor = c;
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.column.dataKey === 'priceGst' && data.row.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = DOC_TYPES.ESTIMATE.accentColor;
        }
      },
    },
    headerFn
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Cost Breakdown
// ─────────────────────────────────────────────

function _drawCostBreakdown(engine, estimate, { symbol, costPrec }, headerFn) {
  const totalCost = estimate.totalCost || 0;

  // ── Cost bars visual ──────────────────────────
  const costItems = [
    {
      label:  'Warp Cost',
      value:  estimate.warp?.formattedCost || 0,
      color:  WARP_COLOR,
    },
    {
      label:  'Weft Cost',
      value:  estimate.weft?.formattedCost || 0,
      color:  WEFT_COLOR,
    },
  ];

  if (estimate.weft2Enabled && estimate.weft2) {
    costItems.push({
      label: 'Weft-2 Cost',
      value: estimate.weft2?.formattedCost || 0,
      color: WEFT2_COLOR,
    });
  }

  if (estimate.otherCostPerMeter > 0) {
    costItems.push({
      label: 'Other Cost',
      value: estimate.otherCostPerMeter,
      color: AMBER_COLOR,
    });
  }

  engine.checkPageBreak(costItems.length * 10 + 20, headerFn);

  const x        = engine.marginL;
  const contentW = engine.contentW;
  const barAreaW = contentW - 85;   // leave space for summary box
  const barH     = 9;
  const barGap   = 4;

  let barY = engine.y;

  costItems.forEach((item) => {
    const perc   = totalCost > 0 ? (item.value / totalCost) : 0;
    const filled = barAreaW * perc;

    // Background track
    engine.rect(x, barY, barAreaW, barH, COLORS.gray100, COLORS.gray200, 1);

    // Filled portion
    if (filled > 0) {
      engine.rect(x, barY, Math.max(filled, 2), barH, item.color, null, 1);
    }

    // Label inside bar (only if bar is wide enough)
    if (filled > 25) {
      engine.text(
        item.label,
        x + 3,
        barY + 6,
        { size: FONTS.size.label, style: 'bold', color: COLORS.white }
      );
    } else {
      // Label to the left of bar area when bar too small
      engine.text(
        item.label,
        x + 3,
        barY + 6,
        { size: FONTS.size.label, style: 'bold', color: item.color }
      );
    }

    // Value right of bar
    engine.text(
      pdfCurrency(item.value, symbol, costPrec),
      x + barAreaW + 4,
      barY + 5,
      { size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray900 }
    );

    // Percentage below value, right of bar
    engine.text(
      `(${(perc * 100).toFixed(1)}%)`,
      x + barAreaW + 4,
      barY + 8.5,
      { size: FONTS.size.caption, color: COLORS.gray500 }
    );

    barY += barH + barGap;
  });

  engine.y = barY + 3;

  // ── Summary totals box ─────────────────────────
  const summaryRows = [
    ...costItems.map(item => ({
      label: item.label,
      value: pdfCurrency(item.value, symbol, costPrec),
    })),
    { separator: true },
    {
      label:     'TOTAL COST / METER',
      value:     pdfCurrency(totalCost, symbol, costPrec),
      bold:      true,
      highlight: true,
    },
  ];

  // Position summary box to the right
  const savedY = engine.y;
  engine.y = barY + 3;
  engine.summaryBox(summaryRows, 78, DOC_TYPES.ESTIMATE.accentColor);
  engine.y = Math.max(engine.y, savedY);
}

// ─────────────────────────────────────────────
// PRIVATE: Notes Block
// ─────────────────────────────────────────────

function _drawNotesBlock(engine, notes) {
  const x        = engine.marginL;
  const contentW = engine.contentW;
  const padding  = 4;

  const maxW   = contentW - padding * 2;
  const lines  = engine.doc.splitTextToSize(String(notes), maxW);
  const blockH = lines.length * 4.5 + padding * 2 + 2;

  engine.rect(x, engine.y, contentW, blockH, COLORS.gray50, COLORS.gray300, 2);

  engine.doc.setFontSize(FONTS.size.body);
  engine.doc.setFont('helvetica', 'normal');
  engine.doc.setTextColor(...COLORS.gray700);
  engine.doc.text(lines, x + padding, engine.y + padding + 3.5);

  engine.y += blockH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Version History Table
// ─────────────────────────────────────────────

function _drawVersionHistory(engine, estimate, { symbol, dateFormat }) {
  const rows = estimate.versions
    .slice()
    .reverse()
    .slice(0, 10)   // max 10 versions shown
    .map(v => ({
      version:  `v${v.versionNumber}`,
      date:     pdfDate(v.editedAt, dateFormat),
      editedBy: pdfSafe(v.editedBy),
      quality:  pdfSafe(v.data?.qualityName),
      cost:     pdfCurrency(v.data?.totalCost || 0, symbol),
      weight:   `${(v.data?.totalWeight || 0).toFixed(2)} Kg`,
    }));

  const columns = [
    { header: 'Version',    dataKey: 'version',  width: 19,  halign: 'center' },
    { header: 'Date',       dataKey: 'date',     width: 29,  halign: 'center' },
    { header: 'Edited By',  dataKey: 'editedBy', width: 39,  halign: 'left'   },
    { header: 'Quality',    dataKey: 'quality',  width: 43,  halign: 'left'   },
    { header: 'Cost/m',     dataKey: 'cost',     width: 27,  halign: 'right'  },
    { header: 'Weight',     dataKey: 'weight',   width: 25,  halign: 'right'  },
  ];

  engine.table(columns, rows, {
    accentColor: COLORS.gray500,
    startY:      engine.y,
  });
}

// ─────────────────────────────────────────────
// PRIVATE: Detail Column (mini key-value card)
// ─────────────────────────────────────────────

function _drawDetailColumn(engine, x, w, y, { title, color, rows }) {
  const saved = engine.y;
  engine.y = y;

  const rowH     = 5.5;
  const headerH  = 7;
  const padding  = 3;
  const totalH   = headerH + rows.length * rowH + padding;

  // Column border + background
  engine.rect(x, y, w, totalH, COLORS.white, COLORS.gray200, 2);

  // Column header
  engine.rect(x, y, w, headerH, _lightenColor(color, 0.5), null, 0);
  engine.text(
    title.toUpperCase(),
    x + padding,
    y + 5,
    { size: FONTS.size.label, style: 'bold', color }
  );

  // Rows
  rows.forEach((row, i) => {
    const rowY = y + headerH + i * rowH;

    // Alternating background
    if (i % 2 === 1) {
      engine.rect(x, rowY, w, rowH, COLORS.gray50);
    }

    // Separator
    engine.setStroke(COLORS.gray100);
    engine.doc.setLineWidth(0.15);
    engine.doc.line(x, rowY, x + w, rowY);

    // Label (left)
    engine.text(
      String(row.label || '') + ':',
      x + padding,
      rowY + 3.8,
      { size: FONTS.size.label, color: COLORS.gray500 }
    );

    // Value (right-aligned)
    engine.text(
      pdfSafe(row.value),
      x + w - padding,
      rowY + 3.8,
      { size: FONTS.size.label + 0.5, style: 'bold', color: COLORS.gray900, align: 'right' }
    );
  });

  engine.y = saved;    // restore — caller manages Y
}

// ─────────────────────────────────────────────
// PURE HELPERS (no engine dependency)
// ─────────────────────────────────────────────

function _getYarnDetails(section) {
  if (!section) return null;
  if (section.yarn) return section.yarn;
  return {
    yarnName:      section.yarnName,
    yarnCategory:  section.yarnCategory || 'spun',
    tpm:           section.tpm || null,
    filamentCount: section.filamentCount || null,
    yarnPrice:     section.yarnPrice || 0,
    yarnGst:       section.yarnGst || 0,
  };
}

function _getYarnDisplayName(section) {
  if (!section) return '—';
  if (section.yarn?.displayName) return section.yarn.displayName;
  if (section.displayName)       return section.displayName;
  if (section.yarn?.yarnName)    return section.yarn.yarnName;
  if (section.yarnName)          return section.yarnName;
  return '—';
}

function _calcTotalWastage(estimate) {
  if (!estimate) return 0;
  const warpW  = (estimate.warp?.formattedWeight || 0)  - (estimate.warp?.formattedNetWeight  || estimate.warp?.netWeight  || 0);
  const weftW  = (estimate.weft?.formattedWeight || 0)  - (estimate.weft?.formattedNetWeight  || estimate.weft?.netWeight  || 0);
  const weft2W = estimate.weft2Enabled && estimate.weft2
    ? (estimate.weft2?.formattedWeight || 0) - (estimate.weft2?.formattedNetWeight || estimate.weft2?.netWeight || 0)
    : 0;
  return Math.max(0, warpW + weftW + weft2W);
}

function _calcWastagePercentage(estimate) {
  const totalNet   = estimate?.totalNetWeight || 0;
  const totalGross = estimate?.totalWeight    || 0;
  if (totalNet === 0) return 0;
  return ((totalGross - totalNet) / totalNet) * 100;
}

function _columnHeight(rowCount, rowH = 5.5, headerH = 7, padding = 3) {
  return headerH + rowCount * rowH + padding;
}

/**
 * Create a very light tint of an RGB color
 * @param {Array}  color   - [r, g, b]
 * @param {number} factor  - 0 = white, 1 = original color
 */
function _lightenColor(color, factor = 0.12) {
  return color.map(c => Math.round(c + (255 - c) * (1 - factor)));
}