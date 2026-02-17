// Estimatecontroller.js
const Estimate = require('../models/Estimate');
const Draft = require('../models/Draft');
const Yarn = require('../models/Yarn');
const { calculateEstimate } = require('../utils/calculations');
const mongoose = require('mongoose');

// Helper function to safely generate yarn display name
const generateYarnDisplayName = (yarn) => {
  if (!yarn) return '';
  
  const { name, yarnName, denier, yarnCategory, tpm, filamentCount } = yarn;
  const yarnNameToUse = name || yarnName || '';
  
  if (!yarnNameToUse) return '';
  if (!denier) return yarnNameToUse;
  
  let displayName = yarnNameToUse;
  
  if (yarnCategory === 'filament') {
    if (filamentCount && filamentCount > 0) {
      displayName = `${yarnNameToUse} ${denier}/${filamentCount}`;
      if (tpm && tpm > 0) {
        displayName = `${yarnNameToUse} ${denier}/${filamentCount} TPM ${tpm}`;
      }
    } else {
      displayName = `${yarnNameToUse} ${denier}D`;
      if (tpm && tpm > 0) {
        displayName = `${yarnNameToUse} ${denier}D TPM ${tpm}`;
      }
    }
  } else {
    if (tpm && tpm > 0) {
      displayName = `${yarnNameToUse} ${denier}/${tpm}`;
    } else {
      displayName = `${yarnNameToUse} ${denier}D`;
    }
  }
  
  return displayName.trim();
};

// Helper to normalize estimate data (handle both old and new structure)
const normalizeEstimateData = (estimate) => {
  if (!estimate) return null;
  
  const normalized = estimate.toObject ? estimate.toObject() : { ...estimate };
  
  // Normalize warp
  if (normalized.warp && !normalized.warp.yarn && normalized.warp.yarnName) {
    normalized.warp.yarn = {
      yarnId: normalized.warp.yarnId || null,
      yarnName: normalized.warp.yarnName,
      displayName: normalized.warp.displayName || generateYarnDisplayName({
        yarnName: normalized.warp.yarnName,
        denier: normalized.warp.denier,
        yarnCategory: normalized.warp.yarnCategory || 'spun',
        tpm: normalized.warp.tpm,
        filamentCount: normalized.warp.filamentCount,
      }),
      denier: normalized.warp.denier,
      yarnCategory: normalized.warp.yarnCategory || 'spun',
      tpm: normalized.warp.tpm || null,
      filamentCount: normalized.warp.filamentCount || null,
      yarnPrice: normalized.warp.yarnPrice || 0,
      yarnGst: normalized.warp.yarnGst || 0,
    };
  }
  
  // Normalize weft
  if (normalized.weft && !normalized.weft.yarn && normalized.weft.yarnName) {
    normalized.weft.yarn = {
      yarnId: normalized.weft.yarnId || null,
      yarnName: normalized.weft.yarnName,
      displayName: normalized.weft.displayName || generateYarnDisplayName({
        yarnName: normalized.weft.yarnName,
        denier: normalized.weft.denier,
        yarnCategory: normalized.weft.yarnCategory || 'spun',
        tpm: normalized.weft.tpm,
        filamentCount: normalized.weft.filamentCount,
      }),
      denier: normalized.weft.denier,
      yarnCategory: normalized.weft.yarnCategory || 'spun',
      tpm: normalized.weft.tpm || null,
      filamentCount: normalized.weft.filamentCount || null,
      yarnPrice: normalized.weft.yarnPrice || 0,
      yarnGst: normalized.weft.yarnGst || 0,
    };
  }
  
  // Normalize weft2 if enabled
  if (normalized.weft2Enabled && normalized.weft2 && !normalized.weft2.yarn && normalized.weft2.yarnName) {
    normalized.weft2.yarn = {
      yarnId: normalized.weft2.yarnId || null,
      yarnName: normalized.weft2.yarnName,
      displayName: normalized.weft2.displayName || generateYarnDisplayName({
        yarnName: normalized.weft2.yarnName,
        denier: normalized.weft2.denier,
        yarnCategory: normalized.weft2.yarnCategory || 'spun',
        tpm: normalized.weft2.tpm,
        filamentCount: normalized.weft2.filamentCount,
      }),
      denier: normalized.weft2.denier,
      yarnCategory: normalized.weft2.yarnCategory || 'spun',
      tpm: normalized.weft2.tpm || null,
      filamentCount: normalized.weft2.filamentCount || null,
      yarnPrice: normalized.weft2.yarnPrice || 0,
      yarnGst: normalized.weft2.yarnGst || 0,
    };
  }
  
  return normalized;
};

// @desc    Get all estimates for company
// @route   GET /api/estimates
// @access  Private (Viewer+)
const getEstimates = async (req, res) => {
  try {
    const { search, sort, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId };
    
    if (search) {
      query.$or = [
        { qualityName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { qualityName: 1 };
    if (sort === 'cost') sortOption = { totalCost: -1 };
    if (sort === 'weight') sortOption = { totalWeight: -1 };
    if (sort === 'netWeight') sortOption = { totalNetWeight: -1 };

    const skip = (page - 1) * limit;

    const estimates = await Estimate.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-versions')
      .populate('user', 'name email')
      .lean();

    const total = await Estimate.countDocuments(query);
    
    const normalizedEstimates = estimates.map(est => normalizeEstimateData(est));
    
    res.json({
      estimates: normalizedEstimates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get estimates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single estimate with full details
// @route   GET /api/estimates/:id
// @access  Private (Viewer+)
const getEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
    .populate('user', 'name email')
    .lean();

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    const normalizedEstimate = normalizeEstimateData(estimate);
    res.json(normalizedEstimate);
  } catch (error) {
    console.error('Get estimate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create estimate
// @route   POST /api/estimates
// @access  Private (Editor+)
const createEstimate = async (req, res) => {
  try {
    const {
      qualityName,
      warp,
      weft,
      weft2Enabled,
      weft2,
      otherCostPerMeter,
      notes,
      tags,
    } = req.body;

    // Build yarn details from input
    const buildYarnDetails = (data) => ({
      yarnId: data.yarnId || null,
      yarnName: data.yarnName || '',
      displayName: data.displayName || generateYarnDisplayName({
        yarnName: data.yarnName,
        denier: data.denier,
        yarnCategory: data.yarnCategory || 'spun',
        tpm: data.tpm,
        filamentCount: data.filamentCount,
      }),
      denier: data.denier || 0,
      yarnCategory: data.yarnCategory || 'spun',
      tpm: data.tpm || null,
      filamentCount: data.filamentCount || null,
      yarnPrice: data.yarnPrice || 0,
      yarnGst: data.yarnGst || 0,
    });

    // Perform calculations (NOW INCLUDES NET WEIGHT)
    const calcResults = calculateEstimate({
      warp,
      weft,
      weft2Enabled,
      weft2,
      otherCostPerMeter,
    });

    // Build estimate data with company
    const estimateData = {
      company: req.companyId,
      user: req.user._id,
      qualityName,
      warp: {
        tar: parseFloat(warp.tar),
        denier: parseFloat(warp.denier),
        wastage: parseFloat(warp.wastage),
        yarn: buildYarnDetails(warp),
        // NEW: Net weight fields
        netWeight: calcResults.warp.netWeight,
        formattedNetWeight: calcResults.warp.formattedNetWeight,
        // Existing fields
        rawWeight: calcResults.warp.rawWeight,
        formattedWeight: calcResults.warp.formattedWeight,
        rawCost: calcResults.warp.rawCost,
        formattedCost: calcResults.warp.formattedCost,
      },
      weft: {
        peek: parseFloat(weft.peek),
        panna: parseFloat(weft.panna),
        denier: parseFloat(weft.denier),
        wastage: parseFloat(weft.wastage),
        yarn: buildYarnDetails(weft),
        // NEW: Net weight fields
        netWeight: calcResults.weft.netWeight,
        formattedNetWeight: calcResults.weft.formattedNetWeight,
        // Existing fields
        rawWeight: calcResults.weft.rawWeight,
        formattedWeight: calcResults.weft.formattedWeight,
        rawCost: calcResults.weft.rawCost,
        formattedCost: calcResults.weft.formattedCost,
      },
      weft2Enabled: Boolean(weft2Enabled),
      otherCostPerMeter: parseFloat(otherCostPerMeter) || 0,
      // NEW: Total net weight
      totalNetWeight: calcResults.totals.totalNetWeight,
      totalWeight: calcResults.totals.totalWeight,
      totalCost: calcResults.totals.totalCost,
      notes,
      tags: tags || [],
      currentVersion: 1,
    };

    // Add Weft-2 if enabled
    if (weft2Enabled && weft2 && calcResults.weft2) {
      estimateData.weft2 = {
        peek: parseFloat(weft2.peek),
        panna: parseFloat(weft2.panna),
        denier: parseFloat(weft2.denier),
        wastage: parseFloat(weft2.wastage),
        yarn: buildYarnDetails(weft2),
        // NEW: Net weight fields
        netWeight: calcResults.weft2.netWeight,
        formattedNetWeight: calcResults.weft2.formattedNetWeight,
        // Existing fields
        rawWeight: calcResults.weft2.rawWeight,
        formattedWeight: calcResults.weft2.formattedWeight,
        rawCost: calcResults.weft2.rawCost,
        formattedCost: calcResults.weft2.formattedCost,
      };
    }

    const estimate = await Estimate.create(estimateData);

    // Increment yarn usage counts
    const yarnIds = [warp.yarnId, weft.yarnId];
    if (weft2Enabled && weft2?.yarnId) yarnIds.push(weft2.yarnId);
    
    for (const yarnId of yarnIds) {
      if (yarnId) {
        await Yarn.findOneAndUpdate(
          { _id: yarnId, company: req.companyId },
          { $inc: { usageCount: 1 } }
        );
      }
    }

    // Clear any draft
    await Draft.deleteOne({ 
      user: req.user._id, 
      company: req.companyId,
      formType: 'estimate' 
    });

    res.status(201).json(normalizeEstimateData(estimate));
  } catch (error) {
    console.error('Create estimate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update estimate (with version history)
// @route   PUT /api/estimates/:id
// @access  Private (Editor+)
const updateEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.id,
      company: req.companyId,
    });

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    const {
      qualityName,
      warp,
      weft,
      weft2Enabled,
      weft2,
      otherCostPerMeter,
      notes,
      tags,
    } = req.body;

    // Build yarn details
    const buildYarnDetails = (data) => ({
      yarnId: data.yarnId || null,
      yarnName: data.yarnName || '',
      displayName: data.displayName || generateYarnDisplayName({
        yarnName: data.yarnName,
        denier: data.denier,
        yarnCategory: data.yarnCategory || 'spun',
        tpm: data.tpm,
        filamentCount: data.filamentCount,
      }),
      denier: data.denier || 0,
      yarnCategory: data.yarnCategory || 'spun',
      tpm: data.tpm || null,
      filamentCount: data.filamentCount || null,
      yarnPrice: data.yarnPrice || 0,
      yarnGst: data.yarnGst || 0,
    });

    // Save current version to history
    const currentVersion = {
      versionNumber: estimate.currentVersion,
      data: {
        qualityName: estimate.qualityName,
        warp: estimate.warp,
        weft: estimate.weft,
        weft2Enabled: estimate.weft2Enabled,
        weft2: estimate.weft2,
        otherCostPerMeter: estimate.otherCostPerMeter,
        totalNetWeight: estimate.totalNetWeight,
        totalWeight: estimate.totalWeight,
        totalCost: estimate.totalCost,
        notes: estimate.notes,
        tags: estimate.tags,
      },
      editedAt: new Date(),
      editedBy: req.user.name || req.user.email,
    };

    // Perform new calculations (NOW INCLUDES NET WEIGHT)
    const calcResults = calculateEstimate({
      warp,
      weft,
      weft2Enabled,
      weft2,
      otherCostPerMeter,
    });

    // Update fields
    estimate.qualityName = qualityName;
    estimate.warp = {
      tar: parseFloat(warp.tar),
      denier: parseFloat(warp.denier),
      wastage: parseFloat(warp.wastage),
      yarn: buildYarnDetails(warp),
      netWeight: calcResults.warp.netWeight,
      formattedNetWeight: calcResults.warp.formattedNetWeight,
      rawWeight: calcResults.warp.rawWeight,
      formattedWeight: calcResults.warp.formattedWeight,
      rawCost: calcResults.warp.rawCost,
      formattedCost: calcResults.warp.formattedCost,
    };
    estimate.weft = {
      peek: parseFloat(weft.peek),
      panna: parseFloat(weft.panna),
      denier: parseFloat(weft.denier),
      wastage: parseFloat(weft.wastage),
      yarn: buildYarnDetails(weft),
      netWeight: calcResults.weft.netWeight,
      formattedNetWeight: calcResults.weft.formattedNetWeight,
      rawWeight: calcResults.weft.rawWeight,
      formattedWeight: calcResults.weft.formattedWeight,
      rawCost: calcResults.weft.rawCost,
      formattedCost: calcResults.weft.formattedCost,
    };
    estimate.weft2Enabled = Boolean(weft2Enabled);
    
    if (weft2Enabled && weft2 && calcResults.weft2) {
      estimate.weft2 = {
        peek: parseFloat(weft2.peek),
        panna: parseFloat(weft2.panna),
        denier: parseFloat(weft2.denier),
        wastage: parseFloat(weft2.wastage),
        yarn: buildYarnDetails(weft2),
        netWeight: calcResults.weft2.netWeight,
        formattedNetWeight: calcResults.weft2.formattedNetWeight,
        rawWeight: calcResults.weft2.rawWeight,
        formattedWeight: calcResults.weft2.formattedWeight,
        rawCost: calcResults.weft2.rawCost,
        formattedCost: calcResults.weft2.formattedCost,
      };
    } else {
      estimate.weft2 = undefined;
    }

    estimate.otherCostPerMeter = parseFloat(otherCostPerMeter) || 0;
    estimate.totalNetWeight = calcResults.totals.totalNetWeight;
    estimate.totalWeight = calcResults.totals.totalWeight;
    estimate.totalCost = calcResults.totals.totalCost;
    estimate.notes = notes;
    estimate.tags = tags || [];
    estimate.versions.push(currentVersion);
    estimate.currentVersion += 1;

    await estimate.save();
    res.json(normalizeEstimateData(estimate));
  } catch (error) {
    console.error('Update estimate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete estimate
// @route   DELETE /api/estimates/:id
// @access  Private (Admin+)
const deleteEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.id,
      company: req.companyId,
    });

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    await estimate.deleteOne();
    res.json({ message: 'Estimate removed' });
  } catch (error) {
    console.error('Delete estimate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Duplicate estimate
// @route   POST /api/estimates/:id/duplicate
// @access  Private (Editor+)
const duplicateEstimate = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.id,
      company: req.companyId,
    }).lean();

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    const { newQualityName } = req.body;
    const normalizedEstimate = normalizeEstimateData(estimate);

    const duplicateData = {
      company: req.companyId,
      user: req.user._id,
      qualityName: newQualityName || `${normalizedEstimate.qualityName} (Copy)`,
      warp: { ...normalizedEstimate.warp },
      weft: { ...normalizedEstimate.weft },
      weft2Enabled: normalizedEstimate.weft2Enabled,
      weft2: normalizedEstimate.weft2 ? { ...normalizedEstimate.weft2 } : undefined,
      otherCostPerMeter: normalizedEstimate.otherCostPerMeter,
      totalNetWeight: normalizedEstimate.totalNetWeight,
      totalWeight: normalizedEstimate.totalWeight,
      totalCost: normalizedEstimate.totalCost,
      notes: normalizedEstimate.notes,
      tags: normalizedEstimate.tags,
      currentVersion: 1,
      versions: [],
    };

    const newEstimate = await Estimate.create(duplicateData);
    res.status(201).json(normalizeEstimateData(newEstimate));
  } catch (error) {
    console.error('Duplicate estimate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Revert to previous version
// @route   POST /api/estimates/:id/revert/:version
// @access  Private (Editor+)
const revertVersion = async (req, res) => {
  try {
    const estimate = await Estimate.findOne({
      _id: req.params.id,
      company: req.companyId,
    });

    if (!estimate) {
      return res.status(404).json({ message: 'Estimate not found' });
    }

    const versionNumber = parseInt(req.params.version);
    const targetVersion = estimate.versions.find(
      (v) => v.versionNumber === versionNumber
    );

    if (!targetVersion) {
      return res.status(404).json({ message: 'Version not found' });
    }

    // Save current state
    const currentVersion = {
      versionNumber: estimate.currentVersion,
      data: {
        qualityName: estimate.qualityName,
        warp: estimate.warp,
        weft: estimate.weft,
        weft2Enabled: estimate.weft2Enabled,
        weft2: estimate.weft2,
        otherCostPerMeter: estimate.otherCostPerMeter,
        totalNetWeight: estimate.totalNetWeight,
        totalWeight: estimate.totalWeight,
        totalCost: estimate.totalCost,
        notes: estimate.notes,
        tags: estimate.tags,
      },
      editedAt: new Date(),
      editedBy: req.user.name || req.user.email,
    };
    estimate.versions.push(currentVersion);

    // Restore target version
    const versionData = targetVersion.data;
    estimate.qualityName = versionData.qualityName;
    estimate.warp = versionData.warp;
    estimate.weft = versionData.weft;
    estimate.weft2Enabled = versionData.weft2Enabled;
    estimate.weft2 = versionData.weft2;
    estimate.otherCostPerMeter = versionData.otherCostPerMeter;
    estimate.totalNetWeight = versionData.totalNetWeight || 0;
    estimate.totalWeight = versionData.totalWeight;
    estimate.totalCost = versionData.totalCost;
    estimate.notes = versionData.notes;
    estimate.tags = versionData.tags;
    estimate.currentVersion += 1;

    await estimate.save();
    res.json(normalizeEstimateData(estimate));
  } catch (error) {
    console.error('Revert version error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Compare multiple estimates
// @route   POST /api/estimates/compare
// @access  Private (Viewer+)
const compareEstimates = async (req, res) => {
  try {
    const { estimateIds } = req.body;

    if (!estimateIds || estimateIds.length < 2) {
      return res.status(400).json({ message: 'At least 2 estimates required for comparison' });
    }

    const estimates = await Estimate.find({
      _id: { $in: estimateIds },
      company: req.companyId,
    }).select('-versions').lean();

    if (estimates.length !== estimateIds.length) {
      return res.status(404).json({ message: 'Some estimates not found or not accessible' });
    }

    const normalizedEstimates = estimates.map(est => normalizeEstimateData(est));
    res.json(normalizedEstimates);
  } catch (error) {
    console.error('Compare estimates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Save draft
// @route   POST /api/estimates/draft
// @access  Private (Editor+)
const saveDraft = async (req, res) => {
  try {
    const { formData } = req.body;

    await Draft.findOneAndUpdate(
      { 
        user: req.user._id, 
        company: req.companyId,
        formType: 'estimate' 
      },
      { 
        formData, 
        lastSaved: new Date(),
        company: req.companyId
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Draft saved' });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get draft
// @route   GET /api/estimates/draft
// @access  Private (Editor+)
const getDraft = async (req, res) => {
  try {
    const draft = await Draft.findOne({
      user: req.user._id,
      company: req.companyId,
      formType: 'estimate',
    });

    res.json(draft);
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete draft
// @route   DELETE /api/estimates/draft
// @access  Private (Editor+)
const deleteDraft = async (req, res) => {
  try {
    await Draft.deleteOne({ 
      user: req.user._id, 
      company: req.companyId,
      formType: 'estimate' 
    });
    res.json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Perform real-time calculation
// @route   POST /api/estimates/calculate
// @access  Private (Viewer+)
const calculate = async (req, res) => {
  try {
    const { warp, weft, weft2Enabled, weft2, otherCostPerMeter } = req.body;

    const results = calculateEstimate({
      warp,
      weft,
      weft2Enabled,
      weft2,
      otherCostPerMeter,
    });

    res.json(results);
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Migrate old estimates to new structure
// @route   POST /api/estimates/migrate
// @access  Private (Admin+)
const migrateEstimates = async (req, res) => {
  try {
    const estimates = await Estimate.find({ company: req.companyId });
    let migratedCount = 0;

    for (const estimate of estimates) {
      let needsSave = false;

      // Add net weight if missing
      if (estimate.totalNetWeight === undefined || estimate.totalNetWeight === null) {
        const calcResults = calculateEstimate({
          warp: {
            tar: estimate.warp.tar,
            denier: estimate.warp.denier,
            wastage: estimate.warp.wastage,
            yarnPrice: estimate.warp.yarn?.yarnPrice || estimate.warp.yarnPrice || 0,
            yarnGst: estimate.warp.yarn?.yarnGst || estimate.warp.yarnGst || 0,
          },
          weft: {
            peek: estimate.weft.peek,
            panna: estimate.weft.panna,
            denier: estimate.weft.denier,
            wastage: estimate.weft.wastage,
            yarnPrice: estimate.weft.yarn?.yarnPrice || estimate.weft.yarnPrice || 0,
            yarnGst: estimate.weft.yarn?.yarnGst || estimate.weft.yarnGst || 0,
          },
          weft2Enabled: estimate.weft2Enabled,
          weft2: estimate.weft2 ? {
            peek: estimate.weft2.peek,
            panna: estimate.weft2.panna,
            denier: estimate.weft2.denier,
            wastage: estimate.weft2.wastage,
            yarnPrice: estimate.weft2.yarn?.yarnPrice || estimate.weft2.yarnPrice || 0,
            yarnGst: estimate.weft2.yarn?.yarnGst || estimate.weft2.yarnGst || 0,
          } : null,
          otherCostPerMeter: estimate.otherCostPerMeter || 0,
        });

        estimate.totalNetWeight = calcResults.totals.totalNetWeight;
        if (estimate.warp) {
          estimate.warp.netWeight = calcResults.warp.netWeight;
          estimate.warp.formattedNetWeight = calcResults.warp.formattedNetWeight;
        }
        if (estimate.weft) {
          estimate.weft.netWeight = calcResults.weft.netWeight;
          estimate.weft.formattedNetWeight = calcResults.weft.formattedNetWeight;
        }
        if (estimate.weft2Enabled && estimate.weft2 && calcResults.weft2) {
          estimate.weft2.netWeight = calcResults.weft2.netWeight;
          estimate.weft2.formattedNetWeight = calcResults.weft2.formattedNetWeight;
        }
        needsSave = true;
      }

      // Check and migrate yarn structure
      if (estimate.warp && !estimate.warp.yarn && estimate.warp.yarnName) {
        estimate.warp.yarn = {
          yarnId: estimate.warp.yarnId || null,
          yarnName: estimate.warp.yarnName,
          displayName: generateYarnDisplayName({
            yarnName: estimate.warp.yarnName,
            denier: estimate.warp.denier,
            yarnCategory: 'spun',
          }),
          denier: estimate.warp.denier,
          yarnCategory: 'spun',
          tpm: null,
          filamentCount: null,
          yarnPrice: estimate.warp.yarnPrice || 0,
          yarnGst: estimate.warp.yarnGst || 0,
        };
        needsSave = true;
      }

      if (estimate.weft && !estimate.weft.yarn && estimate.weft.yarnName) {
        estimate.weft.yarn = {
          yarnId: estimate.weft.yarnId || null,
          yarnName: estimate.weft.yarnName,
          displayName: generateYarnDisplayName({
            yarnName: estimate.weft.yarnName,
            denier: estimate.weft.denier,
            yarnCategory: 'spun',
          }),
          denier: estimate.weft.denier,
          yarnCategory: 'spun',
          tpm: null,
          filamentCount: null,
          yarnPrice: estimate.weft.yarnPrice || 0,
          yarnGst: estimate.weft.yarnGst || 0,
        };
        needsSave = true;
      }

      if (estimate.weft2Enabled && estimate.weft2 && !estimate.weft2.yarn && estimate.weft2.yarnName) {
        estimate.weft2.yarn = {
          yarnId: estimate.weft2.yarnId || null,
          yarnName: estimate.weft2.yarnName,
          displayName: generateYarnDisplayName({
            yarnName: estimate.weft2.yarnName,
            denier: estimate.weft2.denier,
            yarnCategory: 'spun',
          }),
          denier: estimate.weft2.denier,
          yarnCategory: 'spun',
          tpm: null,
          filamentCount: null,
          yarnPrice: estimate.weft2.yarnPrice || 0,
          yarnGst: estimate.weft2.yarnGst || 0,
        };
        needsSave = true;
      }

      if (needsSave) {
        await estimate.save();
        migratedCount++;
      }
    }

    res.json({ 
      message: 'Migration complete', 
      totalEstimates: estimates.length,
      migratedCount 
    });
  } catch (error) {
    console.error('Migrate estimates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get estimate statistics for company
// @route   GET /api/estimates/stats
// @access  Private (Viewer+)
const getEstimateStats = async (req, res) => {
  try {
    const companyObjectId = mongoose.Types.ObjectId(req.companyId);
    
    const stats = await Estimate.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: null,
          totalEstimates: { $sum: 1 },
          avgCost: { $avg: '$totalCost' },
          avgWeight: { $avg: '$totalWeight' },
          avgNetWeight: { $avg: '$totalNetWeight' },
          totalCost: { $sum: '$totalCost' },
          totalWeight: { $sum: '$totalWeight' },
          totalNetWeight: { $sum: '$totalNetWeight' },
          minCost: { $min: '$totalCost' },
          maxCost: { $max: '$totalCost' },
        },
      },
    ]);

    // Get monthly trends
    const monthlyTrends = await Estimate.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          avgCost: { $avg: '$totalCost' },
          avgNetWeight: { $avg: '$totalNetWeight' },
          avgGrossWeight: { $avg: '$totalWeight' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Get top qualities by count
    const topQualities = await Estimate.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$qualityName',
          count: { $sum: 1 },
          avgCost: { $avg: '$totalCost' },
          avgNetWeight: { $avg: '$totalNetWeight' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      overall: stats[0] || {
        totalEstimates: 0,
        avgCost: 0,
        avgWeight: 0,
        avgNetWeight: 0,
        totalCost: 0,
        totalWeight: 0,
        totalNetWeight: 0,
      },
      monthlyTrends,
      topQualities,
    });
  } catch (error) {
    console.error('Get estimate stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getEstimates,
  getEstimate,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  duplicateEstimate,
  revertVersion,
  compareEstimates,
  saveDraft,
  getDraft,
  deleteDraft,
  calculate,
  migrateEstimates,
  getEstimateStats,
};