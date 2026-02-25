/**
 * PDF Export System - Weaving Production Entry Template
 * StitchFlow Textile Manufacturing ERP
 *
 * Generates a complete, professional PDF for a single
 * WeavingProduction entry (ProductionEntryDetails page).
 *
 * Document Structure:
 * ├── Header  (Company + Doc Meta + Shift Badge)
 * ├── Section 1: KPI Summary Cards
 * ├── Section 2: Basic Information
 * ├── Section 3: Equipment Details (Loom / Set / Beam)
 * ├── Section 4: Time & Production Metrics
 * ├── Section 5: Performance Analysis
 * ├── Section 6: Quality & Defects  (conditional)
 * ├── Section 7: Downtime Tracking  (conditional)
 * ├── Section 8: Remarks            (conditional)
 * ├── Section 9: Entry Metadata
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
  pdfDateTime,
  pdfSafe,
  pdfNumber,
} from '../pdfFormatters';

// ─────────────────────────────────────────────
// MODULE-LEVEL COLOR CONSTANTS
// ─────────────────────────────────────────────
const C = {
  entry:      DOC_TYPES.PRODUCTION_ENTRY.accentColor,  // Indigo-600
  blue:       [37,  99,  235],
  green:      [22,  163, 74],
  purple:     [124, 58,  237],
  amber:      [217, 119, 6],
  red:        [220, 38,  38],
  pink:       [236, 72,  153],
  teal:       [20,  184, 166],
  cyan:       [8,   145, 178],
  gray:       [75,  85,  99],

  // Shift colors
  shiftDay:     [217, 119, 6],    // Amber
  shiftNight:   [79,  70,  229],  // Indigo
  shiftGeneral: [75,  85,  99],   // Gray

  // Efficiency tiers
  effExcellent: [22,  163, 74],   // Green  ≥ 90
  effGood:      [37,  99,  235],  // Blue   ≥ 75
  effAverage:   [217, 119, 6],    // Amber  ≥ 60
  effPoor:      [220, 38,  38],   // Red    < 60

  // Quality tiers
  qualExcellent: [22,  163, 74],
  qualGood:      [37,  99,  235],
  qualAverage:   [217, 119, 6],
  qualPoor:      [220, 38,  38],
};

// ─────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ─────────────────────────────────────────────

/**
 * Generate and download / preview Production Entry PDF
 *
 * @param {object} entry    - WeavingProduction entry from API
 *                            (fully populated: loomId, setId, beamId, createdBy)
 * @param {object} company  - Active company object
 * @param {object} settings - User settings
 * @param {object} options  - { preview, watermark }
 */
export async function generateProductionEntryPDF(
  entry,
  company,
  settings,
  options = {}
) {
  const { preview = false, watermark = '' } = options;

  // ── Derived values ─────────────────────────────
  const dateFormat  = settings?.dateFormat || 'DD/MM/YYYY';
  const entryDateFmt = pdfDate(entry.entryDate, dateFormat);

  const shiftColor  = _shiftColor(entry.shift);
  const effColor    = _efficiencyColor(entry.efficiency);
  const qualScore   = _qualityScore(entry.defects?.count, entry.metersProduced);
  const qualColor   = _qualityColor(qualScore);
  const qualLabel   = _qualityLabel(entry.defects?.count);

  const productiveHours = entry.totalHours - (entry.loomStoppageTime || 0) / 60;
  const defectRate = entry.metersProduced > 0
    ? ((entry.defects?.count || 0) / entry.metersProduced * 100)
    : 0;

  // ── Document number ────────────────────────────
  const docNumber = _buildDocNumber(entry);

  // ── Continuation header ────────────────────────
  const continuationHeader = (eng) => {
    drawContinuationHeader(eng, {
      company,
      docType:   'PRODUCTION_ENTRY',
      docNumber,
      title:     `${entryDateFmt} — ${entry.shift} Shift`,
    });
  };

  // ── Init engine ───────────────────────────────
  const engine = new PDFEngine({
    title:  `Production Entry — ${entryDateFmt}`,
    author: company?.name || 'StitchFlow ERP',
  });

  // ══════════════════════════════════════════════
  // PAGE 1 HEADER
  // ══════════════════════════════════════════════
  drawHeader(engine, {
    company,
    docType:    'PRODUCTION_ENTRY',
    docNumber,
    docDate:    entry.entryDate,
    title:      `${entryDateFmt} — ${entry.shift} Shift`,
    status:     entry.shift.toLowerCase(),
    statusLabel: `${entry.shift} Shift`,
    subtitle:   `Operator: ${entry.operatorName}  ·  Loom: ${entry.loomId?.loomNumber || '—'}`,
  });

  // ══════════════════════════════════════════════
  // SECTION 1 — KPI SUMMARY CARDS
  // ══════════════════════════════════════════════
  engine.sectionHeader('Production Summary', C.entry);

  engine.metricCards([
    {
      label: 'Meters Produced',
      value: `${entry.metersProduced}`,
      unit:  'm',
      color: C.blue,
    },
    {
      label: 'Efficiency',
      value: `${entry.efficiency.toFixed(1)}%`,
      color: effColor,
    },
    {
      label: 'Production Rate',
      value: `${entry.metersPerHour.toFixed(1)}`,
      unit:  'm/hr',
      color: C.purple,
    },
    {
      label: 'Total Hours',
      value: `${entry.totalHours.toFixed(1)}`,
      unit:  'hrs',
      color: C.amber,
    },
    {
      label: 'Quality Score',
      value: `${qualScore}`,
      unit:  '/100',
      color: qualColor,
    },
  ], C.entry);

  // ══════════════════════════════════════════════
  // SECTION 2 — BASIC INFORMATION
  // ══════════════════════════════════════════════
  engine.checkPageBreak(40, continuationHeader);
  engine.sectionHeader('Basic Information', C.entry);

  _drawBasicInfo(engine, entry, { dateFormat, shiftColor });

  // ══════════════════════════════════════════════
  // SECTION 3 — EQUIPMENT DETAILS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(50, continuationHeader);
  engine.sectionHeader('Equipment Details', C.blue);

  _drawEquipmentDetails(engine, entry);

  // ══════════════════════════════════════════════
  // SECTION 4 — TIME & PRODUCTION METRICS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Time & Production Metrics', C.purple);

  _drawProductionMetrics(engine, entry, { productiveHours });

  // ══════════════════════════════════════════════
  // SECTION 5 — PERFORMANCE ANALYSIS
  // ══════════════════════════════════════════════
  engine.checkPageBreak(55, continuationHeader);
  engine.sectionHeader('Performance Analysis', C.green);

  _drawPerformanceAnalysis(engine, entry, {
    effColor,
    qualScore,
    qualColor,
    qualLabel,
    defectRate,
    productiveHours,
  });

  // ══════════════════════════════════════════════
  // SECTION 6 — QUALITY & DEFECTS (conditional)
  // ══════════════════════════════════════════════
  if ((entry.defects?.count > 0) || (entry.defects?.types?.length > 0)) {
    engine.checkPageBreak(45, continuationHeader);
    engine.sectionHeader('Quality & Defect Tracking', C.amber);
    _drawDefectSection(engine, entry.defects, entry.metersProduced);
  }

  // ══════════════════════════════════════════════
  // SECTION 7 — DOWNTIME TRACKING (conditional)
  // ══════════════════════════════════════════════
  if (entry.loomStoppageTime > 0) {
    engine.checkPageBreak(35, continuationHeader);
    engine.sectionHeader('Downtime Tracking', C.red);
    _drawDowntimeSection(engine, entry);
  }

  // ══════════════════════════════════════════════
  // SECTION 8 — REMARKS (conditional)
  // ══════════════════════════════════════════════
  if (entry.remarks) {
    engine.checkPageBreak(25, continuationHeader);
    engine.sectionHeader('Remarks', C.gray);
    _drawRemarksBlock(engine, entry.remarks);
  }

  // ══════════════════════════════════════════════
  // SECTION 9 — ENTRY METADATA
  // ══════════════════════════════════════════════
  engine.checkPageBreak(30, continuationHeader);
  engine.sectionHeader('Entry Information', C.gray);
  _drawMetadataBlock(engine, entry);

  // ══════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════
  drawSignatureBlock(
    engine,
    [
      { label: 'Operator',          name: entry.operatorName || '' },
      { label: 'Shift Supervisor',  name: '' },
      { label: 'Production Manager', name: '' },
    ],
    C.entry
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
    docType:   'PRODUCTION_ENTRY',
    docNumber,
    showTerms: true,
    terms:     'This is an official production record. Please retain for audit purposes.',
  });

  // ── Output ─────────────────────────────────────
  const safeName = `${entryDateFmt.replace(/\//g, '-')}_${entry.shift}`;
  const filename  = `ProductionEntry_${safeName}_${entry.loomId?.loomNumber || 'Loom'}`;

  if (preview) {
    engine.preview();
  } else {
    engine.save(filename);
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Basic Information
// ─────────────────────────────────────────────

function _drawBasicInfo(engine, entry, { dateFormat, shiftColor }) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // ── Shift + Operator banner ────────────────────
  engine.checkPageBreak(14);

  const bannerY = engine.y;
  const bannerH = 12;

  engine.rect(x, bannerY, contentW, bannerH, _tint(shiftColor, 0.07));
  engine.rect(x, bannerY, 3, bannerH, shiftColor);

  // Shift pill
  engine.rect(x + 5, bannerY + 2.5, 22, 7, shiftColor, null, 1);
  engine.text(
    (entry.shift || 'General').toUpperCase(),
    x + 16, bannerY + 7,
    { size: FONTS.size.label, style: 'bold', color: COLORS.white, align: 'center' }
  );

  // Operator name
  engine.text(
    entry.operatorName || '—',
    x + 32, bannerY + 5.5,
    { size: FONTS.size.sectionTitle, style: 'bold', color: COLORS.gray900 }
  );
  engine.text(
    'Operator',
    x + 32, bannerY + 10.5,
    { size: FONTS.size.label, color: COLORS.gray500 }
  );

  // Date on right
  engine.text(
    pdfDate(entry.entryDate, dateFormat),
    x + contentW - 3, bannerY + 5.5,
    { size: FONTS.size.bodyLarge, style: 'bold', color: COLORS.gray900, align: 'right' }
  );
  engine.text(
    'Entry Date',
    x + contentW - 3, bannerY + 10.5,
    { size: FONTS.size.label, color: COLORS.gray500, align: 'right' }
  );

  engine.y = bannerY + bannerH + 4;

  // ── Info grid ──────────────────────────────────
  engine.infoGrid(
    [
      { label: 'Entry Date',    value: pdfDate(entry.entryDate, dateFormat) },
      { label: 'Shift',         value: entry.shift || '—' },
      { label: 'Operator Name', value: pdfSafe(entry.operatorName) },
      { label: 'Created By',    value: pdfSafe(entry.createdBy?.name) },
      { label: 'Recorded At',   value: pdfDateTime(entry.createdAt) },
      { label: 'Last Updated',  value: pdfDateTime(entry.updatedAt) },
    ],
    { bgColor: COLORS.gray50 }
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Equipment Details
// ─────────────────────────────────────────────

function _drawEquipmentDetails(engine, entry) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // Determine column count
  const hasBeam  = !!entry.beamId;
  const colCount = hasBeam ? 3 : 2;
  const colW     = (contentW - (colCount - 1) * 4) / colCount;

  engine.checkPageBreak(_boxHeight(4) + 6);

  const startY = engine.y;

  // ── Loom Column ────────────────────────────────
  _drawEquipBox(engine, x, colW, startY, {
    title:  'Loom Details',
    color:  C.blue,
    icon:   'LOOM',
    fields: [
      { label: 'Loom Number', value: pdfSafe(entry.loomId?.loomNumber) },
      { label: 'Loom Type',   value: pdfSafe(entry.loomId?.loomType) },
      { label: 'Status',      value: pdfSafe(entry.loomId?.status) },
      { label: 'Loom ID',     value: _shortId(entry.loomId?._id) },
    ],
  });

  // ── Weaving Set Column ─────────────────────────
  const col2X = x + colW + 4;
  _drawEquipBox(engine, col2X, colW, startY, {
    title:  'Weaving Set Details',
    color:  C.teal,
    icon:   'SET',
    fields: [
      { label: 'Set Number',   value: pdfSafe(entry.setId?.setNumber) },
      { label: 'Quality Name', value: pdfSafe(entry.setId?.qualityName) },
      { label: 'Status',       value: pdfSafe(entry.setId?.status) },
      { label: 'Set ID',       value: _shortId(entry.setId?._id) },
    ],
  });

  // ── Beam Column (conditional) ──────────────────
  if (hasBeam) {
    const col3X = x + (colW + 4) * 2;
    _drawEquipBox(engine, col3X, colW, startY, {
      title:  'Beam Details',
      color:  C.purple,
      icon:   'BEAM',
      fields: [
        { label: 'Beam Number',    value: pdfSafe(entry.beamId?.beamNumber) },
        { label: 'Length Used',    value: `${(entry.beamLengthUsed || 0).toFixed(2)} m` },
        { label: 'Remaining',      value: `${(entry.beamId?.remainingLength || 0).toFixed(2)} m` },
        { label: 'Total Length',   value: `${(entry.beamId?.totalLength || 0).toFixed(2)} m` },
      ],
    });
  }

  engine.y = startY + _boxHeight(4) + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Time & Production Metrics
// ─────────────────────────────────────────────

function _drawProductionMetrics(engine, entry, { productiveHours }) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  engine.checkPageBreak(50);

  // ── Time block (two columns: start / end) ──────
  const halfW  = (contentW - 4) / 2;
  const timeY  = engine.y;
  const timeH  = 14;

  // Start time box
  engine.rect(x, timeY, halfW, timeH, _tint(C.blue, 0.08), COLORS.gray200, 2);
  engine.text('START TIME', x + 4, timeY + 5.5, {
    size: FONTS.size.label, style: 'bold', color: C.blue,
  });
  engine.text(
    _formatTime(entry.startTime),
    x + 4, timeY + 11.5,
    { size: FONTS.size.sectionTitle + 2, style: 'bold', color: COLORS.gray900 }
  );

  // End time box
  const col2X = x + halfW + 4;
  engine.rect(col2X, timeY, halfW, timeH, _tint(C.purple, 0.08), COLORS.gray200, 2);
  engine.text('END TIME', col2X + 4, timeY + 5.5, {
    size: FONTS.size.label, style: 'bold', color: C.purple,
  });
  engine.text(
    _formatTime(entry.endTime),
    col2X + 4, timeY + 11.5,
    { size: FONTS.size.sectionTitle + 2, style: 'bold', color: COLORS.gray900 }
  );

  engine.y = timeY + timeH + 4;

  // ── Metrics grid ───────────────────────────────
  engine.checkPageBreak(30);

  const metrics = [
    { label: 'Total Hours',      value: `${entry.totalHours.toFixed(2)} hrs`,  color: C.amber  },
    { label: 'Productive Hours', value: `${productiveHours.toFixed(2)} hrs`,   color: C.green  },
    { label: 'Meters Produced',  value: `${entry.metersProduced} m`,           color: C.blue   },
    { label: 'Meters / Hour',    value: `${entry.metersPerHour.toFixed(2)} m/hr`, color: C.purple },
  ];

  if (entry.actualPicks > 0) {
    metrics.push({
      label: 'Actual Picks',
      value: pdfNumber(entry.actualPicks, 0),
      color: C.pink,
    });
  }

  if (entry.beamLengthUsed > 0) {
    metrics.push({
      label: 'Beam Length Used',
      value: `${entry.beamLengthUsed.toFixed(2)} m`,
      color: C.teal,
    });
  }

  engine.metricCards(metrics, C.entry);
}

// ─────────────────────────────────────────────
// PRIVATE: Performance Analysis
// ─────────────────────────────────────────────

function _drawPerformanceAnalysis(engine, entry, {
  effColor, qualScore, qualColor, qualLabel, defectRate, productiveHours,
}) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  // ── Efficiency gauge bar ───────────────────────
  engine.checkPageBreak(22);

  const effY = engine.y;
  const effH = 18;

  engine.rect(x, effY, contentW, effH, COLORS.gray50, COLORS.gray200, 2);
  engine.rect(x, effY, 3, effH, effColor);

  engine.text('EFFICIENCY', x + 5, effY + 6, {
    size: FONTS.size.label, style: 'bold', color: effColor,
  });
  engine.text(
    `${entry.efficiency.toFixed(1)}%`,
    x + contentW - 4, effY + 6,
    { size: FONTS.size.body + 1, style: 'bold', color: effColor, align: 'right' }
  );

  const trackY = effY + 9;
  const trackW = contentW - 8;
  const fillW  = (Math.min(entry.efficiency, 100) / 100) * trackW;

  engine.rect(x + 4, trackY, trackW, 5, COLORS.gray200, null, 2);
  if (fillW > 0) {
    engine.rect(x + 4, trackY, fillW, 5, effColor, null, 2);
  }

  // Threshold markers
  [60, 75, 90].forEach((threshold) => {
    const markerX = x + 4 + (threshold / 100) * trackW;
    engine.vrule(markerX, trackY, trackY + 5, COLORS.white, 0.5);
    engine.text(`${threshold}%`, markerX, trackY + 9, {
      size: FONTS.size.caption, color: COLORS.gray400, align: 'center',
    });
  });

  // Efficiency label
  const effLabel = entry.efficiency >= 90 ? 'Excellent'
    : entry.efficiency >= 75 ? 'Good'
    : entry.efficiency >= 60 ? 'Average'
    : 'Needs Improvement';

  engine.text(
    effLabel,
    x + 5, effY + 16.5,
    { size: FONTS.size.label, style: 'bold', color: effColor }
  );

  engine.y = effY + effH + 4;

  // ── Performance data table ─────────────────────
  engine.checkPageBreak(45);

  const perfRows = [
    {
      metric:     'Efficiency',
      value:      `${entry.efficiency.toFixed(1)}%`,
      benchmark:  '≥ 90% = Excellent',
      status:     entry.efficiency >= 90 ? 'Excellent'
        : entry.efficiency >= 75 ? 'Good'
        : entry.efficiency >= 60 ? 'Average' : 'Poor',
      _effVal:    entry.efficiency,
    },
    {
      metric:     'Production Rate',
      value:      `${entry.metersPerHour.toFixed(2)} m/hr`,
      benchmark:  'Higher is better',
      status:     entry.metersPerHour >= 10 ? 'Good' : 'Review',
      _effVal:    entry.metersPerHour >= 10 ? 80 : 50,
    },
    {
      metric:     'Productive Time',
      value:      `${productiveHours.toFixed(2)} hrs`,
      benchmark:  `of ${entry.totalHours.toFixed(2)} total hrs`,
      status:     productiveHours / entry.totalHours >= 0.9 ? 'Excellent' : 'Review',
      _effVal:    (productiveHours / entry.totalHours) * 100,
    },
    {
      metric:     'Defect Rate',
      value:      `${defectRate.toFixed(2)}%`,
      benchmark:  '< 1% = Good',
      status:     defectRate === 0 ? 'Excellent'
        : defectRate < 1 ? 'Good'
        : defectRate < 3 ? 'Average' : 'Poor',
      _effVal:    defectRate === 0 ? 100 : Math.max(0, 100 - defectRate * 10),
    },
    {
      metric:     'Quality Score',
      value:      `${qualScore} / 100`,
      benchmark:  '≥ 95 = Excellent',
      status:     qualLabel,
      _effVal:    qualScore,
    },
  ];

  engine.table(
    [
      { header: 'Performance Metric', dataKey: 'metric',    width: 50, halign: 'left'   },
      { header: 'Value',              dataKey: 'value',     width: 38, halign: 'right'  },
      { header: 'Benchmark',          dataKey: 'benchmark', width: 52, halign: 'left'   },
      { header: 'Status',             dataKey: 'status',    width: 42, halign: 'center' },
    ],
    perfRows,
    {
      accentColor: C.green,
      startY:      engine.y,
      didParseCell(data) {
        if (data.row.section !== 'body') return;

        if (data.column.dataKey === 'status') {
          const val = data.row.raw._effVal;
          const col = val >= 90 ? C.green
            : val >= 75 ? C.blue
            : val >= 60 ? C.amber
            : C.red;
          const bg  = val >= 90 ? [220, 252, 231]
            : val >= 75 ? [219, 234, 254]
            : val >= 60 ? [254, 243, 199]
            : [254, 226, 226];
          data.cell.styles.textColor = col;
          data.cell.styles.fillColor = bg;
          data.cell.styles.fontStyle = 'bold';
        }

        if (data.column.dataKey === 'value') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    },
    null
  );

  // ── Summary box ────────────────────────────────
  engine.checkPageBreak(16);
  const summaryY = engine.y;
  const summaryH = 12;
  const summaryC = effColor;

  engine.rect(x, summaryY, contentW, summaryH, _tint(summaryC, 0.07), summaryC, 2);

  engine.text('OVERALL ASSESSMENT:', x + 4, summaryY + 7.5, {
    size: FONTS.size.bodySmall, style: 'bold', color: summaryC,
  });

  const overallLabel = entry.efficiency >= 90 && defectRate < 1
    ? 'Excellent Performance — All metrics within target'
    : entry.efficiency >= 75
    ? 'Good Performance — Minor improvements possible'
    : entry.efficiency >= 60
    ? 'Average Performance — Review efficiency and quality'
    : 'Needs Improvement — Immediate attention required';

  engine.text(overallLabel, x + contentW - 4, summaryY + 7.5, {
    size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray900, align: 'right',
  });

  engine.y = summaryY + summaryH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Defect Section
// ─────────────────────────────────────────────

function _drawDefectSection(engine, defects, metersProduced) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  engine.checkPageBreak(30);

  // ── Count + Types row ──────────────────────────
  const halfW = (contentW - 4) / 2;
  const rowY  = engine.y;
  const rowH  = 14;

  // Count box
  engine.rect(x, rowY, halfW, rowH, [254, 243, 199], [252, 211, 77], 2);
  engine.text('TOTAL DEFECTS', x + 4, rowY + 5.5, {
    size: FONTS.size.label, style: 'bold', color: C.amber,
  });
  engine.text(
    String(defects?.count || 0),
    x + halfW / 2, rowY + 11.5,
    { size: FONTS.size.sectionTitle + 3, style: 'bold', color: C.amber, align: 'center' }
  );

  // Types count box
  engine.rect(x + halfW + 4, rowY, halfW, rowH, [254, 226, 226], [252, 165, 165], 2);
  engine.text('DEFECT TYPES', x + halfW + 8, rowY + 5.5, {
    size: FONTS.size.label, style: 'bold', color: C.red,
  });
  engine.text(
    String(defects?.types?.length || 0),
    x + halfW + 4 + halfW / 2, rowY + 11.5,
    { size: FONTS.size.sectionTitle + 3, style: 'bold', color: C.red, align: 'center' }
  );

  engine.y = rowY + rowH + 4;

  // ── Defect types tags ──────────────────────────
  if (defects?.types?.length > 0) {
    engine.checkPageBreak(20);

    const tagsY   = engine.y;
    const tagH    = 8;
    const tagPad  = 4;
    let   tagX    = x;
    let   tagLineY = tagsY;

    engine.text('Defect Types:', x, tagsY - 3, {
      size: FONTS.size.label, style: 'bold', color: COLORS.gray600,
    });

    defects.types.forEach((type) => {
      const labelW = engine.textWidth(type, FONTS.size.bodySmall, 'bold');
      const boxW   = labelW + tagPad * 2;

      // Wrap to next line if needed
      if (tagX + boxW > x + contentW) {
        tagX    = x;
        tagLineY += tagH + 2;
      }

      engine.rect(tagX, tagLineY, boxW, tagH, [254, 243, 199], [252, 211, 77], 1);
      engine.text(type, tagX + tagPad, tagLineY + 5.5, {
        size:  FONTS.size.bodySmall,
        style: 'bold',
        color: C.amber,
      });

      tagX += boxW + 3;
    });

    engine.y = tagLineY + tagH + 5;
  }

  // ── Defect description ─────────────────────────
  if (defects?.description) {
    engine.checkPageBreak(18);

    const descY = engine.y;
    const maxW  = contentW - 6;
    const lines = engine.doc.splitTextToSize(defects.description, maxW);
    const descH = lines.length * 4.5 + 8;

    engine.rect(x, descY, contentW, descH, COLORS.gray50, COLORS.gray200, 2);
    engine.text('Description:', x + 3, descY + 5.5, {
      size: FONTS.size.label, style: 'bold', color: COLORS.gray600,
    });

    engine.doc.setFontSize(FONTS.size.body);
    engine.doc.setFont('helvetica', 'normal');
    engine.doc.setTextColor(...COLORS.gray700);
    engine.doc.text(lines, x + 3, descY + 10);

    engine.y = descY + descH + 5;
  }

  // ── Defect rate calculation ────────────────────
  if (metersProduced > 0 && defects?.count > 0) {
    engine.checkPageBreak(12);

    const rate    = (defects.count / metersProduced * 100).toFixed(3);
    const drY     = engine.y;

    engine.rect(x, drY, contentW, 10, COLORS.gray50, COLORS.gray200, 2);
    engine.text(
      `Defect Rate: ${rate}% — ${defects.count} defect${defects.count > 1 ? 's' : ''} per ${metersProduced}m produced`,
      x + 4,
      drY + 6.5,
      { size: FONTS.size.bodySmall, color: COLORS.gray600 }
    );

    engine.y = drY + 10 + 5;
  }
}

// ─────────────────────────────────────────────
// PRIVATE: Downtime Section
// ─────────────────────────────────────────────

function _drawDowntimeSection(engine, entry) {
  const x        = engine.marginL;
  const contentW = engine.contentW;

  engine.checkPageBreak(28);

  const halfW = (contentW - 4) / 2;
  const dtY   = engine.y;
  const dtH   = 16;

  // Stoppage time box
  engine.rect(x, dtY, halfW, dtH, [254, 226, 226], [252, 165, 165], 2);
  engine.text('STOPPAGE TIME', x + 4, dtY + 5.5, {
    size: FONTS.size.label, style: 'bold', color: C.red,
  });
  engine.text(
    `${entry.loomStoppageTime} min`,
    x + 4, dtY + 11,
    { size: FONTS.size.sectionTitle + 1, style: 'bold', color: C.red }
  );
  engine.text(
    `(${(entry.loomStoppageTime / 60).toFixed(2)} hours)`,
    x + 4, dtY + 15,
    { size: FONTS.size.caption, color: C.red }
  );

  // Reason box
  engine.rect(x + halfW + 4, dtY, halfW, dtH, [255, 237, 213], [253, 186, 116], 2);
  engine.text('STOPPAGE REASON', x + halfW + 8, dtY + 5.5, {
    size: FONTS.size.label, style: 'bold', color: [194, 65, 12],
  });
  engine.text(
    pdfSafe(entry.stoppageReason),
    x + halfW + 8, dtY + 12,
    { size: FONTS.size.bodyLarge, style: 'bold', color: [154, 52, 18] }
  );

  engine.y = dtY + dtH + 4;

  // ── Impact analysis ────────────────────────────
  engine.checkPageBreak(12);

  const stoppageHrs   = entry.loomStoppageTime / 60;
  const impactPct     = entry.totalHours > 0
    ? ((stoppageHrs / entry.totalHours) * 100).toFixed(1)
    : 0;
  const lostMeters    = (stoppageHrs * entry.metersPerHour).toFixed(2);

  const impactY = engine.y;
  engine.rect(x, impactY, contentW, 10, COLORS.gray50, COLORS.gray200, 2);
  engine.text(
    `Downtime Impact: ${impactPct}% of shift lost  ·  Estimated lost production: ~${lostMeters} m`,
    x + 4, impactY + 6.5,
    { size: FONTS.size.bodySmall, style: 'bold', color: C.red }
  );
  engine.y = impactY + 10 + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Remarks Block
// ─────────────────────────────────────────────

function _drawRemarksBlock(engine, remarks) {
  const x        = engine.marginL;
  const contentW = engine.contentW;
  const maxW     = contentW - 8;
  const lines    = engine.doc.splitTextToSize(String(remarks), maxW);
  const blockH   = lines.length * 4.5 + 10;

  engine.checkPageBreak(blockH + 4);

  engine.rect(x, engine.y, contentW, blockH, COLORS.gray50, COLORS.gray300, 2);

  engine.doc.setFontSize(FONTS.size.body);
  engine.doc.setFont('helvetica', 'normal');
  engine.doc.setTextColor(...COLORS.gray700);
  engine.doc.text(lines, x + 4, engine.y + 7);

  engine.y += blockH + 5;
}

// ─────────────────────────────────────────────
// PRIVATE: Metadata Block
// ─────────────────────────────────────────────

function _drawMetadataBlock(engine, entry) {
  engine.infoGrid(
    [
      { label: 'Created At',    value: pdfDateTime(entry.createdAt) },
      { label: 'Last Updated',  value: pdfDateTime(entry.updatedAt) },
      { label: 'Created By',    value: pdfSafe(entry.createdBy?.name) },
      { label: 'Creator Email', value: pdfSafe(entry.createdBy?.email) },
      {
        label:     'Entry ID',
        value:     String(entry._id || '—'),
        fullWidth: true,
      },
    ],
    { bgColor: COLORS.gray50 }
  );
}

// ─────────────────────────────────────────────
// PRIVATE: Equipment Box (card-style)
// ─────────────────────────────────────────────

function _drawEquipBox(engine, x, w, y, { title, color, icon, fields }) {
  const rowH    = 6.5;
  const headerH = 10;
  const padding = 3;
  const totalH  = headerH + fields.length * rowH + padding;

  // Border & background
  engine.rect(x, y, w, totalH, COLORS.white, COLORS.gray200, 2);

  // Header
  engine.rect(x, y, w, headerH, _tint(color, 0.1), null, 0);
  engine.rect(x, y, 3, headerH, color, null, 0);

  // Icon pill
  engine.rect(x + 5, y + 1.5, 14, 7, color, null, 1);
  engine.text(icon, x + 12, y + 6.5, {
    size: FONTS.size.caption, style: 'bold', color: COLORS.white, align: 'center',
  });

  // Title
  engine.text(title.toUpperCase(), x + 22, y + 6.5, {
    size: FONTS.size.label, style: 'bold', color,
  });

  // Fields
  fields.forEach((field, i) => {
    const fy = y + headerH + i * rowH;

    if (i % 2 === 1) engine.rect(x + 0.5, fy, w - 1, rowH, COLORS.gray50);

    engine.setStroke(COLORS.gray100);
    engine.doc.setLineWidth(0.15);
    engine.doc.line(x, fy, x + w, fy);

    engine.text(
      String(field.label || '') + ':',
      x + padding, fy + 4.2,
      { size: FONTS.size.label, color: COLORS.gray500 }
    );
    engine.text(
      pdfSafe(field.value),
      x + w - padding, fy + 4.2,
      { size: FONTS.size.bodySmall, style: 'bold', color: COLORS.gray900, align: 'right' }
    );
  });
}

// ─────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────

function _buildDocNumber(entry) {
  const d   = new Date(entry.entryDate);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const yy  = String(d.getFullYear()).slice(2);
  const loom = entry.loomId?.loomNumber || 'L?';
  return `PE-${dd}${mm}${yy}-${loom}`;
}

function _shiftColor(shift) {
  return shift === 'Day'   ? C.shiftDay
    : shift === 'Night'    ? C.shiftNight
    : C.shiftGeneral;
}

function _efficiencyColor(efficiency) {
  return efficiency >= 90 ? C.effExcellent
    : efficiency >= 75    ? C.effGood
    : efficiency >= 60    ? C.effAverage
    : C.effPoor;
}

function _qualityScore(defectCount, metersProduced) {
  if (!metersProduced || metersProduced === 0) return 100;
  const count = defectCount || 0;
  return Math.max(0, Math.round(100 - (count / metersProduced * 100)));
}

function _qualityColor(score) {
  return score >= 95 ? C.qualExcellent
    : score >= 80    ? C.qualGood
    : score >= 60    ? C.qualAverage
    : C.qualPoor;
}

function _qualityLabel(defectCount) {
  const count = defectCount || 0;
  return count === 0    ? 'Excellent Quality'
    : count < 5         ? 'Good Quality'
    : count < 10        ? 'Acceptable Quality'
    : 'Needs Improvement';
}

function _formatTime(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function _shortId(id) {
  if (!id) return '—';
  const s = String(id);
  return s.length > 8 ? `...${s.slice(-8)}` : s;
}

function _boxHeight(fieldCount, rowH = 6.5, headerH = 10, padding = 3) {
  return headerH + fieldCount * rowH + padding;
}

function _tint(color, factor = 0.1) {
  return color.map(c => Math.min(255, Math.round(c + (255 - c) * (1 - factor))));
}