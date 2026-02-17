const Beam = require('../models/Beam');
const Estimate = require('../models/Estimate');
const Loom = require('../models/Loom');
const { generateBeamNumber } = require('../utils/weavingCodeGenerator');
const { calculateBeamWeight } = require('../utils/weavingCalculations');
const mongoose = require('mongoose');

/**
 * @desc    Get all beams for company
 * @route   GET /api/weaving/beams
 * @access  Private (Viewer+)
 */
const getBeams = async (req, res) => {
  try {
    const { search, status, quality, sort = 'beamNumber', page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by quality
    if (quality) {
      query.qualityName = { $regex: quality, $options: 'i' };
    }
    
    // Search
    if (search) {
      query.$or = [
        { beamNumber: { $regex: search, $options: 'i' } },
        { qualityName: { $regex: search, $options: 'i' } },
      ];
    }
    
    let sortOption = {};
    if (sort === 'beamNumber') sortOption = { beamNumber: -1 };
    if (sort === 'quality') sortOption = { qualityName: 1, beamNumber: -1 };
    if (sort === 'status') sortOption = { status: 1, beamNumber: -1 };
    if (sort === 'remaining') sortOption = { remainingLength: -1 };
    
    const skip = (page - 1) * limit;
    
    const beams = await Beam.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('estimateId', 'qualityName')
      .populate('currentLoomId', 'loomNumber')
      .populate('createdBy', 'name email')
      .lean();
    
    const total = await Beam.countDocuments(query);
    
    res.json({
      success: true,
      beams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get beams error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single beam with details
 * @route   GET /api/weaving/beams/:id
 * @access  Private (Viewer+)
 */
const getBeam = async (req, res) => {
  try {
    const beam = await Beam.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
      .populate('estimateId')
      .populate('currentLoomId')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!beam) {
      return res.status(404).json({ success: false, message: 'Beam not found' });
    }
    
    res.json({
      success: true,
      beam,
    });
  } catch (error) {
    console.error('Get beam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create beam
 * @route   POST /api/weaving/beams
 * @access  Private (Operator+)
 */
const createBeam = async (req, res) => {
  try {
    const {
      beamType,
      qualityName,
      estimateId,
      tar,
      denier,
      totalLength,
      lengthUnit,
      preparationDate,
      notes,
    } = req.body;
    
    // Validate required fields
    if (!beamType || !qualityName || !tar || !denier || !totalLength) {
      return res.status(400).json({
        success: false,
        message: 'Beam type, quality name, tar, denier, and total length are required',
      });
    }
    
    // Generate beam number
    const beamNumber = await generateBeamNumber(req.companyId);
    
    // Get yarn details from estimate if provided
    let yarnDetails = {};
    if (estimateId) {
      const estimate = await Estimate.findOne({
        _id: estimateId,
        company: req.companyId,
      }).lean();
      
      if (estimate) {
        yarnDetails = {
          warpYarn: {
            yarnId: estimate.warp?.yarn?.yarnId || null,
            yarnName: estimate.warp?.yarn?.yarnName || '',
            displayName: estimate.warp?.yarn?.displayName || '',
            denier: estimate.warp?.denier || denier,
          },
        };
      }
    }
    
    // Calculate beam weight
    const beamWeight = calculateBeamWeight(
      parseFloat(tar),
      parseFloat(denier),
      parseFloat(totalLength)
    );
    
    const beam = await Beam.create({
      company: req.companyId,
      beamNumber,
      beamType,
      qualityName: qualityName.trim(),
      estimateId: estimateId || null,
      yarnDetails,
      tar: parseFloat(tar),
      denier: parseFloat(denier),
      totalLength: parseFloat(totalLength),
      lengthUnit: lengthUnit || 'meters',
      remainingLength: parseFloat(totalLength),
      beamWeight,
      preparationDate: preparationDate || Date.now(),
      status: 'Ready',
      notes: notes || '',
      createdBy: req.user._id,
    });
    
    res.status(201).json({
      success: true,
      beam,
    });
  } catch (error) {
    console.error('Create beam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update beam
 * @route   PUT /api/weaving/beams/:id
 * @access  Private (Operator+)
 */
const updateBeam = async (req, res) => {
  try {
    const beam = await Beam.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!beam) {
      return res.status(404).json({ success: false, message: 'Beam not found' });
    }
    
    const {
      beamType,
      qualityName,
      tar,
      denier,
      totalLength,
      lengthUnit,
      status,
      notes,
    } = req.body;
    
    // Update fields
    if (beamType) beam.beamType = beamType;
    if (qualityName) beam.qualityName = qualityName.trim();
    if (status) beam.status = status;
    if (notes !== undefined) beam.notes = notes;
    if (lengthUnit) beam.lengthUnit = lengthUnit;
    
    // Recalculate weight if dimensions changed
    let needsRecalculation = false;
    if (tar) {
      beam.tar = parseFloat(tar);
      needsRecalculation = true;
    }
    if (denier) {
      beam.denier = parseFloat(denier);
      needsRecalculation = true;
    }
    if (totalLength) {
      beam.totalLength = parseFloat(totalLength);
      needsRecalculation = true;
    }
    
    if (needsRecalculation) {
      const beamWeight = calculateBeamWeight(beam.tar, beam.denier, beam.totalLength);
      beam.beamWeight = beamWeight;
    }
    
    await beam.save();
    
    res.json({
      success: true,
      beam,
    });
  } catch (error) {
    console.error('Update beam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update beam remaining length
 * @route   PUT /api/weaving/beams/:id/remaining
 * @access  Private (System/Internal)
 */
const updateBeamRemaining = async (req, res) => {
  try {
    const { remainingLength } = req.body;
    
    const beam = await Beam.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!beam) {
      return res.status(404).json({ success: false, message: 'Beam not found' });
    }
    
    beam.remainingLength = Math.max(0, parseFloat(remainingLength));
    
    // Auto-update status
    if (beam.remainingLength === 0) {
      beam.status = 'Exhausted';
    }
    
    await beam.save();
    
    res.json({
      success: true,
      beam,
    });
  } catch (error) {
    console.error('Update beam remaining error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete beam
 * @route   DELETE /api/weaving/beams/:id
 * @access  Private (Admin+)
 */
const deleteBeam = async (req, res) => {
  try {
    const beam = await Beam.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!beam) {
      return res.status(404).json({ success: false, message: 'Beam not found' });
    }
    
    // Check if beam is currently on loom
    if (beam.status === 'On Loom' || beam.currentLoomId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete beam that is currently on loom',
      });
    }
    
    await beam.deleteOne();
    
    res.json({
      success: true,
      message: 'Beam deleted successfully',
    });
  } catch (error) {
    console.error('Delete beam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get beam statistics
 * @route   GET /api/weaving/beams/stats
 * @access  Private (Viewer+)
 */
const getBeamStats = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Status distribution
    const statusStats = await Beam.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalLength: { $sum: '$totalLength' },
          remainingLength: { $sum: '$remainingLength' },
        },
      },
    ]);
    
    // Total beams
    const totalBeams = await Beam.countDocuments({ company: companyObjectId });
    
    // Ready beams
    const readyBeams = await Beam.countDocuments({
      company: companyObjectId,
      status: 'Ready',
    });
    
    // On loom beams
    const onLoomBeams = await Beam.countDocuments({
      company: companyObjectId,
      status: 'On Loom',
    });
    
    res.json({
      success: true,
      stats: {
        totalBeams,
        readyBeams,
        onLoomBeams,
        statusDistribution: statusStats,
      },
    });
  } catch (error) {
    console.error('Get beam stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get available beams (for allocation)
 * @route   GET /api/weaving/beams/available
 * @access  Private (Supervisor+)
 */
const getAvailableBeams = async (req, res) => {
  try {
    const { qualityName } = req.query;
    
    let query = {
      company: req.companyId,
      status: 'Ready',
      remainingLength: { $gt: 0 },
    };
    
    if (qualityName) {
      query.qualityName = { $regex: qualityName, $options: 'i' };
    }
    
    const beams = await Beam.find(query)
      .select('beamNumber beamType qualityName tar denier totalLength remainingLength')
      .sort({ beamNumber: -1 })
      .lean();
    
    res.json({
      success: true,
      beams,
    });
  } catch (error) {
    console.error('Get available beams error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getBeams,
  getBeam,
  createBeam,
  updateBeam,
  updateBeamRemaining,
  deleteBeam,
  getBeamStats,
  getAvailableBeams,
};