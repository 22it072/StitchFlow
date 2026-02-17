const WeavingProduction = require('../models/WeavingProduction');
const WeavingSet = require('../models/WeavingSet');
const Loom = require('../models/Loom');
const Beam = require('../models/Beam');
const {
  calculateEfficiency,
  calculateMetersPerHour,
  calculateActualPicks,
  updateRemainingLength,
} = require('../utils/weavingCalculations');
const mongoose = require('mongoose');

/**
 * @desc    Get all production entries for company
 * @route   GET /api/weaving/production
 * @access  Private (Viewer+)
 */
const getProductionEntries = async (req, res) => {
  try {
    const {
      search,
      loomId,
      setId,
      shift,
      startDate,
      endDate,
      sort = 'entryDate',
      page = 1,
      limit = 20,
    } = req.query;
    
    let query = { company: req.companyId };
    
    // Filter by loom
    if (loomId) {
      query.loomId = loomId;
    }
    
    // Filter by set
    if (setId) {
      query.setId = setId;
    }
    
    // Filter by shift
    if (shift) {
      query.shift = shift;
    }
    
    // Date range
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }
    
    // Search
    if (search) {
      query.operatorName = { $regex: search, $options: 'i' };
    }
    
    let sortOption = {};
    if (sort === 'entryDate') sortOption = { entryDate: -1 };
    if (sort === 'metersProduced') sortOption = { metersProduced: -1 };
    if (sort === 'efficiency') sortOption = { efficiency: -1 };
    
    const skip = (page - 1) * limit;
    
    const entries = await WeavingProduction.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('loomId', 'loomNumber loomType')
      .populate('setId', 'setNumber qualityName')
      .populate('beamId', 'beamNumber remainingLength')
      .populate('createdBy', 'name email')
      .lean();
    
    const total = await WeavingProduction.countDocuments(query);
    
    res.json({
      success: true,
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get production entries error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single production entry
 * @route   GET /api/weaving/production/:id
 * @access  Private (Viewer+)
 */
const getProductionEntry = async (req, res) => {
  try {
    const entry = await WeavingProduction.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
      .populate('loomId')
      .populate('setId')
      .populate('beamId')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Production entry not found' });
    }
    
    res.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error('Get production entry error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create production entry
 * @route   POST /api/weaving/production
 * @access  Private (Operator+)
 */
const createProductionEntry = async (req, res) => {
  try {
    const {
      entryDate,
      shift,
      loomId,
      setId,
      beamId,
      operatorName,
      startTime,
      endTime,
      metersProduced,
      defects,
      loomStoppageTime,
      stoppageReason,
      remarks,
    } = req.body;
    
    // Validate required fields
    if (!loomId || !setId || !operatorName || !startTime || !endTime || metersProduced === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Loom, set, operator, start/end time, and meters produced are required',
      });
    }
    
    // Validate loom
    const loom = await Loom.findOne({
      _id: loomId,
      company: req.companyId,
    });
    
    if (!loom) {
      return res.status(404).json({ success: false, message: 'Loom not found' });
    }
    
    // Validate set
    const set = await WeavingSet.findOne({
      _id: setId,
      company: req.companyId,
    });
    
    if (!set) {
      return res.status(404).json({ success: false, message: 'Weaving set not found' });
    }
    
    // Calculate total hours
    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalHours = (end - start) / (1000 * 60 * 60);
    
    if (totalHours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      });
    }
    
    // Calculate efficiency
    const stoppageHours = (loomStoppageTime || 0) / 60;
    const efficiency = calculateEfficiency(totalHours, stoppageHours);
    
    // Calculate meters per hour
    const mph = calculateMetersPerHour(parseFloat(metersProduced), totalHours);
    
    // Calculate actual picks if panna available
    let actualPicks = 0;
    if (set.weavingSpecs?.panna && set.weavingSpecs?.width) {
      actualPicks = calculateActualPicks(
        parseFloat(metersProduced),
        set.weavingSpecs.panna,
        set.weavingSpecs.width
      );
    }
    
    // Calculate beam length used
    const beamLengthUsed = parseFloat(metersProduced);
    
    // Create production entry
    const entry = await WeavingProduction.create({
      company: req.companyId,
      entryDate: entryDate || Date.now(),
      shift: shift || 'General',
      loomId,
      setId,
      beamId: beamId || null,
      operatorName: operatorName.trim(),
      startTime: start,
      endTime: end,
      totalHours: Number(totalHours.toFixed(2)),
      metersProduced: parseFloat(metersProduced),
      actualPicks,
      beamLengthUsed,
      defects: {
        count: defects?.count || 0,
        types: defects?.types || [],
        description: defects?.description || '',
      },
      loomStoppageTime: loomStoppageTime || 0,
      stoppageReason: stoppageReason || 'None',
      efficiency,
      metersPerHour: mph,
      remarks: remarks || '',
      createdBy: req.user._id,
    });
    
    // Update set produced quantity
    set.producedQuantity += parseFloat(metersProduced);
    
    // Auto-update set status
    if (set.status === 'Pending') {
      set.status = 'In Progress';
    }
    
    // Check if set is completed
    if (set.producedQuantity >= set.orderQuantity) {
      set.status = 'Completed';
      set.actualCompletionDate = new Date();
      
      // Free up loom
      if (set.allocatedLoomId) {
        await Loom.findByIdAndUpdate(set.allocatedLoomId, {
          currentSetId: null,
          status: 'Idle',
        });
      }
    }
    
    await set.save();
    
    // Update beam remaining length if beam is linked
    if (beamId) {
      const beam = await Beam.findOne({
        _id: beamId,
        company: req.companyId,
      });
      
      if (beam) {
        const newRemaining = updateRemainingLength(beam.remainingLength, beamLengthUsed);
        beam.remainingLength = newRemaining;
        
        // Auto-mark as exhausted
        if (newRemaining === 0) {
          beam.status = 'Exhausted';
          beam.currentLoomId = null;
        }
        
        await beam.save();
      }
    }
    
    // Update loom running hours
    loom.totalRunningHours += totalHours;
    await loom.save();
    
    const populatedEntry = await WeavingProduction.findById(entry._id)
      .populate('loomId', 'loomNumber')
      .populate('setId', 'setNumber qualityName')
      .populate('beamId', 'beamNumber')
      .lean();
    
    res.status(201).json({
      success: true,
      entry: populatedEntry,
    });
  } catch (error) {
    console.error('Create production entry error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update production entry
 * @route   PUT /api/weaving/production/:id
 * @access  Private (Supervisor+)
 */
const updateProductionEntry = async (req, res) => {
  try {
    const entry = await WeavingProduction.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Production entry not found' });
    }
    
    const {
      shift,
      operatorName,
      startTime,
      endTime,
      metersProduced,
      defects,
      loomStoppageTime,
      stoppageReason,
      remarks,
    } = req.body;
    
    const oldMetersProduced = entry.metersProduced;
    
    // Update fields
    if (shift) entry.shift = shift;
    if (operatorName) entry.operatorName = operatorName.trim();
    if (remarks !== undefined) entry.remarks = remarks;
    if (stoppageReason) entry.stoppageReason = stoppageReason;
    
    // Update defects
    if (defects) {
      entry.defects = {
        count: defects.count || 0,
        types: defects.types || [],
        description: defects.description || '',
      };
    }
    
    // Recalculate if time or meters changed
    let needsRecalculation = false;
    
    if (startTime) {
      entry.startTime = new Date(startTime);
      needsRecalculation = true;
    }
    
    if (endTime) {
      entry.endTime = new Date(endTime);
      needsRecalculation = true;
    }
    
    if (metersProduced !== undefined) {
      entry.metersProduced = parseFloat(metersProduced);
      needsRecalculation = true;
    }
    
    if (loomStoppageTime !== undefined) {
      entry.loomStoppageTime = parseFloat(loomStoppageTime);
      needsRecalculation = true;
    }
    
    if (needsRecalculation) {
      // Recalculate total hours
      const totalHours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
      entry.totalHours = Number(totalHours.toFixed(2));
      
      // Recalculate efficiency
      const stoppageHours = entry.loomStoppageTime / 60;
      entry.efficiency = calculateEfficiency(totalHours, stoppageHours);
      
      // Recalculate meters per hour
      entry.metersPerHour = calculateMetersPerHour(entry.metersProduced, totalHours);
      
      // Update beam length used
      entry.beamLengthUsed = entry.metersProduced;
      
      // Update set produced quantity if meters changed
      if (metersProduced !== undefined) {
        const set = await WeavingSet.findById(entry.setId);
        if (set) {
          const metersDifference = entry.metersProduced - oldMetersProduced;
          set.producedQuantity += metersDifference;
          
          // Check completion
          if (set.producedQuantity >= set.orderQuantity && set.status !== 'Completed') {
            set.status = 'Completed';
            set.actualCompletionDate = new Date();
          }
          
          await set.save();
        }
        
        // Update beam if linked
        if (entry.beamId) {
          const beam = await Beam.findById(entry.beamId);
          if (beam) {
            beam.remainingLength = updateRemainingLength(
              beam.remainingLength + oldMetersProduced,
              entry.metersProduced
            );
            
            if (beam.remainingLength === 0) {
              beam.status = 'Exhausted';
            }
            
            await beam.save();
          }
        }
      }
    }
    
    await entry.save();
    
    res.json({
      success: true,
      entry,
    });
  } catch (error) {
    console.error('Update production entry error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete production entry
 * @route   DELETE /api/weaving/production/:id
 * @access  Private (Admin+)
 */
const deleteProductionEntry = async (req, res) => {
  try {
    const entry = await WeavingProduction.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Production entry not found' });
    }
    
    // Revert set produced quantity
    const set = await WeavingSet.findById(entry.setId);
    if (set) {
      set.producedQuantity = Math.max(0, set.producedQuantity - entry.metersProduced);
      
      // Revert status if needed
      if (set.status === 'Completed' && set.producedQuantity < set.orderQuantity) {
        set.status = 'In Progress';
        set.actualCompletionDate = null;
      }
      
      await set.save();
    }
    
    // Revert beam remaining length
    if (entry.beamId) {
      const beam = await Beam.findById(entry.beamId);
      if (beam) {
        beam.remainingLength = Math.min(
          beam.totalLength,
          beam.remainingLength + entry.beamLengthUsed
        );
        
        if (beam.status === 'Exhausted' && beam.remainingLength > 0) {
          beam.status = 'Ready';
        }
        
        await beam.save();
      }
    }
    
    // Revert loom running hours
    const loom = await Loom.findById(entry.loomId);
    if (loom) {
      loom.totalRunningHours = Math.max(0, loom.totalRunningHours - entry.totalHours);
      await loom.save();
    }
    
    await entry.deleteOne();
    
    res.json({
      success: true,
      message: 'Production entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete production entry error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get production summary for today
 * @route   GET /api/weaving/production/today
 * @access  Private (Viewer+)
 */
const getTodayProduction = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const summary = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          totalMeters: { $sum: '$metersProduced' },
          totalHours: { $sum: '$totalHours' },
          avgEfficiency: { $avg: '$efficiency' },
          totalDefects: { $sum: '$defects.count' },
          totalDowntime: { $sum: '$loomStoppageTime' },
        },
      },
    ]);
    
    // Get shift-wise breakdown
    const shiftBreakdown = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: '$shift',
          entries: { $sum: 1 },
          meters: { $sum: '$metersProduced' },
          avgEfficiency: { $avg: '$efficiency' },
        },
      },
    ]);
    
    res.json({
      success: true,
      summary: summary[0] || {
        totalEntries: 0,
        totalMeters: 0,
        totalHours: 0,
        avgEfficiency: 0,
        totalDefects: 0,
        totalDowntime: 0,
      },
      shiftBreakdown,
    });
  } catch (error) {
    console.error('Get today production error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get production statistics
 * @route   GET /api/weaving/production/stats
 * @access  Private (Viewer+)
 */
const getProductionStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Overall stats
    const overallStats = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalMeters: { $sum: '$metersProduced' },
          totalHours: { $sum: '$totalHours' },
          avgEfficiency: { $avg: '$efficiency' },
          avgMPH: { $avg: '$metersPerHour' },
          totalDefects: { $sum: '$defects.count' },
        },
      },
    ]);
    
    // Daily trend
    const dailyTrend = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$entryDate' } },
          meters: { $sum: '$metersProduced' },
          avgEfficiency: { $avg: '$efficiency' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Loom-wise performance
    const loomPerformance = await WeavingProduction.aggregate([
      {
        $match: {
          company: companyObjectId,
          entryDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$loomId',
          totalMeters: { $sum: '$metersProduced' },
          avgEfficiency: { $avg: '$efficiency' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { totalMeters: -1 } },
      { $limit: 10 },
    ]);
    
    // Populate loom details
    await WeavingProduction.populate(loomPerformance, {
      path: '_id',
      select: 'loomNumber loomType',
    });
    
    res.json({
      success: true,
      stats: {
        overall: overallStats[0] || {},
        dailyTrend,
        loomPerformance,
      },
    });
  } catch (error) {
    console.error('Get production stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getProductionEntries,
  getProductionEntry,
  createProductionEntry,
  updateProductionEntry,
  deleteProductionEntry,
  getTodayProduction,
  getProductionStats,
};