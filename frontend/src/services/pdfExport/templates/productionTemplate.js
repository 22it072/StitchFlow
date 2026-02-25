/**
 * PDF Export System - Production Template
 * StitchFlow Textile Manufacturing ERP
 *
 * Generates a complete, professional PDF for ProductionDetail.
 *
 * Document Structure:
 * ├── Header (Company + Doc Meta)
 * ├── Section 1: Production Summary (KPI Cards)
 * ├── Section 2: Loom Parameters
 * ├── Section 3: Calculation Breakdown (Step-by-step)
 * ├── Section 4: Monthly Projection
 * ├── Section 5: Reference Data (conditional)
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
} from '../pdfStyles';
import {
  pdfDate,
  pdfCurrency,
  pdfSafe,
  pdfNumber,
} from '../pdfFormatters';

// ─────────────────────────────────────────────
// SECTION ACCENT COLORS
// ─────────────────────────────────────────────
const PROD_COLOR   = [22,  163, 74];    // Green-600  (production)
const LOOM_COLOR   = [79,  70,  229];   // Violet-600 (loom params)
const CALC_COLOR   = [37,  99,  235];   // Blue-600   (calculations)
const MONTH_COLOR  = [217, 119, 6];     // Amber-600  (monthly)
const REF_COLOR    = [8,   145, 178];   // Cyan-600   (reference)

// Efficiency band colors
const EFF_EXCELLENT = [22,  163, 74];   // ≥ 90%
const EFF_GOOD      = [37,  99,  235];  // 80-89%
const EFF_AVERAGE   = [217, 119, 6];    // 70-79%
const EFF_POOR      = [220, 38,  38];   // < 70%

// ─────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────

/**
 * Generate and download Production PDF
 *
 * @param {object} production  - Full production object from API
 * @param {object} breakdown   - Breakdown object from API (optional)
 * @param {object} company     - Active company object
 * @param {object} settings    - User settings (currency, precision, etc.)
 * @param {object} options     - { preview: bool, watermark: string }
 */
export async function generateProductionPDF(production, breakdown, company, settings, options = {}) {
  const { preview = false, watermark = '' } = options;

  // ── Derived values ────────────────────────────
  const { loomParams, calculations, referenceData } = production;
  const symbol      = settings?.currencySymbol || '₹';
  const dateFormat  = settings?.dateFormat     || 'DD/MM/YYYY';
  const effColor    = _efficiencyColor(loomParams.efficiency);
  const effLabel    = _efficiencyLabel(loomParams.efficiency);
  const docNumber   = `PRD-${production._id?.slice(-6)?.toUpperCase() || 'XXXXXX'}`;

  // ── Header config ─────────────────────────────
  const headerConfig = {
    company,
    docType:     'PRODUCTION',
    docNumber,
    docDate:     production.createdAt,
    title:       production.qualityName,
    status:      production.status,
    statusLabel: production.status.charAt(0).toUpperCase() + production.status.slice(1),
    subtitle:    `Efficiency: ${loomParams.efficiency}% · ${loomParams.machines} Machine${loomParams.machines > 1 ? 's' : ''}`,
  };

  // ── Continuation header fn ────────────────────
  const continuationHeader = (eng) => {
    drawContinuationHeader(eng, {
      company,
      docType:   'PRODUCTION',
      docNumber,
      title:     production.qualityName,
    });
  };

  // ── Init engine ───────────────────────────────
  const engine = new PDFEngine({
    title:  `Production - ${production.qualityName}`,
    author: company?.name || 'StitchFlow ERP',
  });

  // ══════════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════════
  drawHeader(engine, headerConfig);

  // ══════════════════════════════════════════════
  // SECTION 1 — PRODUCTION SUMMARY (KPI cards)
  // ══════════════════════════════════════════════
  engine.sectionHeader('Production Summary', PROD_COLOR);

  const dailyM  = calculations.rawProductionMeters  || 0;
  const monthM  = calculations.monthlyProduction?.raw || 0;
  const workDays = calculations.monthlyProduction?.workingDays || 26;

  const summaryMetrics = [
    {
      label: 'Daily Production',
      value: `${dailyM.toFixed(2)} m`,
      unit:  'per day',
      color: PROD_COLOR,
    },
    {
      label: 'Monthly Production',
      value: `${monthM.toFixed(2)} m`,
      unit:  `${workDays} working days`,
      color: MONTH_COLOR,
    },
    {
      label: 'Efficiency',
      value: `${loomParams.efficiency}%`,
      unit:  effLabel,
      color: effColor,
    },
    {
      label: 'Machines',
      value: String(loomParams.machines),
      unit:  'looms',
      color: LOOM_COLOR,
    },
    {
      label: 'Working Hours',
      value: `${loomParams.workingHours} h`,
      unit:  'per day',
      color: CALC_COLOR,
    },
  ];

  engine.metricCards(summaryMetrics, PROD_COLOR);

  // ══════════════════════════════════════════════
  // SECTION 2 — LOOM PARAMETERS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Loom Parameters', LOOM_COLOR);

  _drawLoomParameters(engine, loomParams, effColor, effLabel);

  // ══════════════════════════════════════════════
  // SECTION 3 — CALCULATION BREAKDOWN
  // ══════════════════════════════════════════════
  engine.checkPageBreak(80, continuationHeader);
  engine.sectionHeader('Calculation Breakdown', CALC_COLOR);

  _drawCalculationBreakdown(engine, loomParams, calculations, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 4 — MONTHLY PROJECTION TABLE
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Monthly Projection', MONTH_COLOR);

  _drawMonthlyProjection(engine, calculations, continuationHeader);

  // ══════════════════════════════════════════════
  // SECTION 5 — REFERENCE DATA (conditional)
  // ══════════════════════════════════════════════
  const hasRefData = referenceData &&
    Object.values(referenceData).some(v => v !== null && v !== undefined && v !== '');

  if (hasRefData) {
    engine.checkPageBreak(40, continuationHeader);
    engine.sectionHeader('Reference Data', REF_COLOR);
    _drawReferenceData(engine, referenceData);
  }

  // ══════════════════════════════════════════════
  // SECTION 6 — NOTES (conditional)
  // ══════════════════════════════════════════════
  if (production.notes) {
    engine.checkPageBreak(30, continuationHeader);
    engine.sectionHeader('Notes & Remarks', COLORS.gray600);
    _drawNotesBlock(engine, production.notes);
  }

  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════
  drawSignatureBlock(
    engine,
    [
      { label: 'Prepared By',   name: '' },
      { label: 'Reviewed By',   name: '' },
      { label: 'Authorized By', name: '' },
    ],
    PROD_COLOR
  );

  // ══════════════════════════════════════════════
  // WATERMARK
  // ══════════════════════════════════════════════
  if (watermark) {
    engine.addWatermark(watermark);
  }

  // ══════════════════════════════════════════════
  // FOOTERS (all pages)
  // ══════════════════════════════════════════════
  drawFooters(engine, {
    company,
    docType:   'PRODUCTION',
    docNumber,
    showTerms:  true,
    terms:      'This production record is generated from loom parameters and is for reference only.',
    signatures: [],
  });

  // ── Output ────────────────────────────────────
  const filename = `Production_${production.qualityName.replace(/\s+/g, '_')}_${docNumber}`;

  if (preview) {
    engine.preview();
  } else {
    engine.save(filename);
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Loom Parameters Grid
// ─────────────────────────────────────────────

function _drawLoomParameters(engine, loomParams, effColor, effLabel) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  engine.checkPageBreak(38);

  // ── Five parameter boxes side by side ─────────
  const params = [
    { label: 'RPM',          value: String(loomParams.rpm),              unit: 'rev/min', color: LOOM_COLOR },
    { label: 'Pick (PPI)',   value: String(loomParams.pick),             unit: 'picks/in', color: CALC_COLOR },
    { label: 'Efficiency',   value: `${loomParams.efficiency}%`,         unit: effLabel,   color: effColor   },
    { label: 'Machines',     value: String(loomParams.machines),         unit: 'looms',    color: [124, 58, 237] },
    { label: 'Working Hours',value: `${loomParams.workingHours} h`,      unit: 'per day',  color: [8, 145, 178]  },
  ];

  const boxCount = params.length;
  const boxW     = (contentW - (boxCount - 1) * 3) / boxCount;
  const boxH     = 28;
  const startY   = engine.y;

  params.forEach((p, i) => {
    const bx = x + i * (boxW + 3);
    const by = startY;

    // Card background + left accent bar
    engine.rect(bx, by, boxW, boxH, COLORS.white, COLORS.gray200, 2);
    engine.rect(bx, by, 2.5, boxH, p.color, null, 0);

    // Value (large)
    engine.text(p.value, bx + 5, by + 11, {
      size:  FONTS.size.sectionTitle + 1,
      style: 'bold',
      color: COLORS.gray900,
    });

    // Unit (small, below value)
    engine.text(p.unit, bx + 5, by + 17, {
      size:  FONTS.size.caption,
      color: p.color,
    });

    // Label (bottom)
    engine.text(p.label, bx + 5, by + 24, {
      size:  FONTS.size.label,
      style: 'bold',
      color: COLORS.gray500,
    });
  });

  engine.y = startY + boxH + 5;

  // ── Efficiency visual bar ─────────────────────
  engine.checkPageBreak(16);

  const barY     = engine.y;
  const barH     = 10;
  const barTrackW = contentW;
  const effFill  = (loomParams.efficiency / 100) * barTrackW;

  // Labels: zone markers
  engine.text('Efficiency Rating', x, barY + 3.5, {
    size: FONTS.size.label, style: 'bold', color: COLORS.gray600,
  });
  engine.text(`${loomParams.efficiency}%`, x + contentW, barY + 3.5, {
    size: FONTS.size.label, style: 'bold', color: effColor, align: 'right',
  });

  // Track
  engine.rect(x, barY + 5, barTrackW, barH, COLORS.gray100, COLORS.gray200, 2);

  // Filled portion
  if (effFill > 0) {
    engine.rect(x, barY + 5, Math.max(effFill, 3), barH, effColor, null, 2);
  }

  // Zone labels inside track
  const zones = [
    { label: 'Poor',      threshold: 0.60, color: COLORS.white },
    { label: 'Average',   threshold: 0.70, color: COLORS.white },
    { label: 'Good',      threshold: 0.80, color: COLORS.white },
    { label: 'Excellent', threshold: 0.90, color: COLORS.white },
  ];
  zones.forEach(z => {
    const zx = x + z.threshold * barTrackW;
    engine.vrule(zx, barY + 5, barY + 5 + barH, COLORS.white, 0.4);
    engine.text(z.label, zx + 2, barY + 11, {
      size: FONTS.size.caption, color: COLORS.white,
    });
  });

  engine.y = barY + barH + 9;
}

// ─────────────────────────────────────────────
// PRIVATE: Calculation Breakdown (3 steps)
// ─────────────────────────────────────────────

function _drawCalculationBreakdown(engine, loomParams, calculations, headerFn) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  const steps = [
    {
      step:    1,
      title:   'Raw Picks per Day',
      color:   CALC_COLOR,
      bgColor: [219, 234, 254],   // blue-100
      formula: 'RPM × 60 min × Working Hours × Machines × (Efficiency ÷ 100)',
      values:  `${loomParams.rpm} × 60 × ${loomParams.workingHours} × ${loomParams.machines} × (${loomParams.efficiency} ÷ 100)`,
      result:  `${(calculations.rawPicksPerDay || 0).toLocaleString('en-IN')} picks/day`,
    },
    {
      step:    2,
      title:   'Raw Production (meters/day)',
      color:   LOOM_COLOR,
      bgColor: [237, 233, 254],   // violet-100
      formula: 'Raw Picks ÷ (Pick × 39.37)',
      values:  `${(calculations.rawPicksPerDay || 0).toLocaleString('en-IN')} ÷ (${loomParams.pick} × 39.37)`,
      result:  `${(calculations.rawProductionMeters || 0).toFixed(4)} meters/day`,
    },
    {
      step:    3,
      title:   'Final Daily Production',
      color:   PROD_COLOR,
      bgColor: [220, 252, 231],   // green-100
      formula: 'Normalized production (rounded to 2 decimal places)',
      values:  `${(calculations.rawProductionMeters || 0).toFixed(4)} meters/day`,
      result:  `${(calculations.rawProductionMeters || 0).toFixed(2)} meters/day`,
    },
  ];

  steps.forEach((step) => {
    engine.checkPageBreak(30, headerFn);

    const sy = engine.y;
    const sh = 28;

    // Step card background
    engine.rect(x, sy, contentW, sh, step.bgColor, _withAlpha(step.color, 0.3), 2);

    // Step number pill
    engine.rect(x + 3, sy + 4, 14, 7, step.color, null, 1);
    engine.text(`STEP ${step.step}`, x + 10, sy + 9, {
      size: FONTS.size.caption, style: 'bold', color: COLORS.white, align: 'center',
    });

    // Step title
    engine.text(step.title, x + 20, sy + 9, {
      size: FONTS.size.bodySmall, style: 'bold', color: step.color,
    });

    // Formula line
    engine.text(step.formula, x + 4, sy + 16, {
      size: FONTS.size.label, color: COLORS.gray600,
    });

    // Values line (monospace feel — bold)
    engine.text(step.values, x + 4, sy + 21, {
      size: FONTS.size.label, style: 'bold', color: COLORS.gray800,
    });

    // Result (right-aligned, prominent)
    engine.text('= ' + step.result, x + contentW - 4, sy + 14, {
      size: FONTS.size.bodyLarge, style: 'bold', color: step.color, align: 'right',
    });

    // Right accent bar
    engine.rect(x + contentW - 2, sy, 2, sh, step.color, null, 0);

    engine.y = sy + sh + 4;
  });
}

// ─────────────────────────────────────────────
// PRIVATE: Monthly Projection Table
// ─────────────────────────────────────────────

function _drawMonthlyProjection(engine, calculations, headerFn) {
  const dailyM   = calculations.rawProductionMeters || 0;
  const workDays = calculations.monthlyProduction?.workingDays || 26;
  const monthlyM = calculations.monthlyProduction?.raw || 0;

  // Build projection rows for different working day scenarios
  const rows = [
    { days: 22, production: (dailyM * 22).toFixed(2), label: '22 days/month' },
    { days: 24, production: (dailyM * 24).toFixed(2), label: '24 days/month' },
    { days: 26, production: (dailyM * 26).toFixed(2), label: '26 days/month (standard)' },
    { days: 28, production: (dailyM * 28).toFixed(2), label: '28 days/month' },
    { days: 30, production: (dailyM * 30).toFixed(2), label: '30 days/month (full)' },
  ];

  // Highlight the current working days setting
  const tableRows = rows.map(r => ({
    scenario:   r.label,
    daily:      `${dailyM.toFixed(2)} m`,
    monthly:    `${r.production} m`,
    perMachine: `${(dailyM / (calculations.machines || 1)).toFixed(2)} m`,
    isActive:   r.days === workDays,
  }));

  const columns = [
    { header: 'Scenario',             dataKey: 'scenario',   width: 65,  halign: 'left'   },
    { header: 'Daily Production',     dataKey: 'daily',      width: 40,  halign: 'right'  },
    { header: 'Monthly Total',        dataKey: 'monthly',    width: 45,  halign: 'right'  },
  ];

  engine.table(
    columns,
    tableRows,
    {
      accentColor: MONTH_COLOR,
      startY:      engine.y,
      didParseCell(data) {
        // Highlight the active working-days row
        if (data.row.section === 'body' && data.row.raw?.isActive) {
          data.cell.styles.fillColor  = [254, 243, 199];   // amber-100
          data.cell.styles.textColor  = [180, 83, 9];      // amber-800
          data.cell.styles.fontStyle  = 'bold';
        }
        // Bold monthly total column
        if (data.column.dataKey === 'monthly' && data.row.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    },
    headerFn
  );

  // Summary note below table
  const noteY = engine.y;
  engine.checkPageBreak(10);
  engine.rect(engine.marginL, noteY, engine.contentW, 9, COLORS.gray50, COLORS.gray200, 1);
  engine.text(
    `Current setting: ${workDays} working days/month  ·  Daily rate: ${dailyM.toFixed(2)} m/day  ·  Monthly total: ${monthlyM.toFixed(2)} m`,
    engine.marginL + 3,
    noteY + 6,
    { size: FONTS.size.label, style: 'bold', color: COLORS.gray700 }
  );
  engine.y = noteY + 13;
}

// ─────────────────────────────────────────────
// PRIVATE: Reference Data
// ─────────────────────────────────────────────

function _drawReferenceData(engine, referenceData) {
  const fields = [];

  if (referenceData.panna)     fields.push({ label: 'Panna (Width)',  value: String(referenceData.panna) });
  if (referenceData.reedSpace) fields.push({ label: 'Reed Space',    value: String(referenceData.reedSpace) });
  if (referenceData.warpCount) fields.push({ label: 'Warp Count',    value: String(referenceData.warpCount) });
  if (referenceData.weftCount) fields.push({ label: 'Weft Count',    value: String(referenceData.weftCount) });

  if (fields.length === 0) return;

  engine.infoGrid(fields, { bgColor: COLORS.gray50 });
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
// PURE HELPERS
// ─────────────────────────────────────────────

function _efficiencyColor(eff) {
  if (eff >= 90) return EFF_EXCELLENT;
  if (eff >= 80) return EFF_GOOD;
  if (eff >= 70) return EFF_AVERAGE;
  return EFF_POOR;
}

function _efficiencyLabel(eff) {
  if (eff >= 90) return 'Excellent';
  if (eff >= 80) return 'Good';
  if (eff >= 70) return 'Average';
  return 'Needs Improvement';
}

/**
 * Approximate alpha blending for border colors
 * (jsPDF doesn't support true alpha — this just lightens)
 */
function _withAlpha(color, factor = 0.5) {
  return color.map(c => Math.round(c + (255 - c) * (1 - factor)));
}