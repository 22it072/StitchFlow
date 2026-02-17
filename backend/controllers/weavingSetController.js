const WeavingSet = require('../models/WeavingSet');
const Estimate = require('../models/Estimate');
const Party = require('../models/Party');
const Loom = require('../models/Loom');
const Beam = require('../models/Beam');
const { generateSetNumber } = require('../utils/weavingCodeGenerator');
const mongoose = require('mongoose');

/**
 * @desc    Get all weaving sets for company
 * @route   GET /api/weaving/sets
 * @access  Private (Viewer+)
 */
const getWeavingSets = async (req, res) => {
  try {
    const { search, status, partyId, priority, sort = 'setNumber', page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by party
    if (partyId) {
      query.partyId = partyId;
    }
    
    // Filter by priority
    if (priority) {
      query.priority = priority;
    }
    
    // Search
    if (search) {
      query.$or = [
        { setNumber: { $regex: search, $options: 'i' } },
        { qualityName: { $regex: search, $options: 'i' } },
      ];
    }
    
    let sortOption = {};
    if (sort === 'setNumber') sortOption = { setNumber: -1 };
    if (sort === 'quality') sortOption = { qualityName: 1, setNumber: -1 };
    if (sort === 'status') sortOption = { status: 1, setNumber: -1 };
    if (sort === 'priority') sortOption = { priority: 1, setNumber: -1 };
    if (sort === 'completion') sortOption = { producedQuantity: -1 };
    
    const skip = (page - 1) * limit;
    
    const sets = await WeavingSet.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('estimateId', 'qualityName')
      .populate('partyId', 'partyName contactPerson')
      .populate('allocatedLoomId', 'loomNumber status')
      .populate('allocatedBeamId', 'beamNumber remainingLength')
      .populate('createdBy', 'name email')
      .lean();
    
    const total = await WeavingSet.countDocuments(query);
    
    res.json({
      success: true,
      sets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get weaving sets error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get single weaving set with details
 * @route   GET /api/weaving/sets/:id
 * @access  Private (Viewer+)
 */
const getWeavingSet = async (req, res) => {
  try {
    const set = await WeavingSet.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
      .populate('estimateId')
      .populate('partyId')
      .populate('allocatedLoomId')
      .populate('allocatedBeamId')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!set) {
      return res.status(404).json({ success: false, message: 'Weaving set not found' });
    }
    
    res.json({
      success: true,
      set,
    });
  } catch (error) {
    console.error('Get weaving set error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Create weaving set
 * @route   POST /api/weaving/sets
 * @access  Private (Supervisor+)
 */
const createWeavingSet = async (req, res) => {
  try {
    const {
      qualityName,
      estimateId,
      partyId,
      orderQuantity,
      quantityUnit,
      allocatedLoomId,
      allocatedBeamId,
      targetMetersPerDay,
      priority,
      startDate,
      notes,
    } = req.body;
    
    // Validate required fields
    if (!qualityName || !partyId || !orderQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Quality name, party, and order quantity are required',
      });
    }
    
    // Validate party
    const party = await Party.findOne({
      _id: partyId,
      company: req.companyId,
      activeStatus: true,
    });
    
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found or inactive' });
    }
    
    // Generate set number
    const setNumber = await generateSetNumber(req.companyId);
    
    // Get weaving specs from estimate if provided
    let weavingSpecs = {};
    if (estimateId) {
      const estimate = await Estimate.findOne({
        _id: estimateId,
        company: req.companyId,
      }).lean();
      
      if (estimate) {
        weavingSpecs = {
          weftYarn1: {
            yarnId: estimate.weft?.yarn?.yarnId || null,
            yarnName: estimate.weft?.yarn?.yarnName || '',
            displayName: estimate.weft?.yarn?.displayName || '',
            denier: estimate.weft?.denier || 0,
          },
          reed: estimate.fabricDetails?.reed || 0,
          pick: estimate.weft?.peek || 0,
          panna: estimate.weft?.panna || 0,
          width: estimate.fabricDetails?.width || 0,
          targetGSM: estimate.targetGSM || 0,
        };
        
        if (estimate.weft2Enabled && estimate.weft2) {
          weavingSpecs.weftYarn2 = {
            yarnId: estimate.weft2.yarn?.yarnId || null,
            yarnName: estimate.weft2.yarn?.yarnName || '',
            displayName: estimate.weft2.yarn?.displayName || '',
            denier: estimate.weft2.denier || 0,
          };
        }
      }
    }
    
    // Calculate expected completion date
    let expectedCompletionDate = null;
    if (startDate && targetMetersPerDay > 0) {
      const daysRequired = Math.ceil(parseFloat(orderQuantity) / parseFloat(targetMetersPerDay));
      expectedCompletionDate = new Date(startDate);
      expectedCompletionDate.setDate(expectedCompletionDate.getDate() + daysRequired);
    }
    
    const set = await WeavingSet.create({
      company: req.companyId,
      setNumber,
      setDate: Date.now(),
      qualityName: qualityName.trim(),
      estimateId: estimateId || null,
      partyId,
      orderQuantity: parseFloat(orderQuantity),
      quantityUnit: quantityUnit || 'meters',
      producedQuantity: 0,
      allocatedLoomId: allocatedLoomId || null,
      allocatedBeamId: allocatedBeamId || null,
      targetMetersPerDay: targetMetersPerDay || 0,
      priority: priority || 'Medium',
      startDate: startDate || null,
      expectedCompletionDate,
      weavingSpecs,
      status: 'Pending',
      notes: notes || '',
      createdBy: req.user._id,
    });
    
    // Update loom if allocated
    if (allocatedLoomId) {
      await Loom.findByIdAndUpdate(allocatedLoomId, {
        currentSetId: set._id,
        status: 'Active',
      });
    }
    
    // Update beam if allocated
    if (allocatedBeamId) {
      await Beam.findByIdAndUpdate(allocatedBeamId, {
        currentLoomId: allocatedLoomId,
        status: 'On Loom',
      });
    }
    
    const populatedSet = await WeavingSet.findById(set._id)
      .populate('estimateId', 'qualityName')
      .populate('partyId', 'partyName')
      .populate('allocatedLoomId', 'loomNumber')
      .populate('allocatedBeamId', 'beamNumber')
      .lean();
    
    res.status(201).json({
      success: true,
      set: populatedSet,
    });
  } catch (error) {
    console.error('Create weaving set error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update weaving set
 * @route   PUT /api/weaving/sets/:id
 * @access  Private (Supervisor+)
 */
const updateWeavingSet = async (req, res) => {
  try {
    const set = await WeavingSet.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!set) {
      return res.status(404).json({ success: false, message: 'Weaving set not found' });
    }
    
    const {
      orderQuantity,
      allocatedLoomId,
      allocatedBeamId,
      targetMetersPerDay,
      priority,
      startDate,
      status,
      notes,
    } = req.body;
    
    // Update fields
    if (orderQuantity) set.orderQuantity = parseFloat(orderQuantity);
    if (targetMetersPerDay !== undefined) set.targetMetersPerDay = parseFloat(targetMetersPerDay);
    if (priority) set.priority = priority;
    if (startDate !== undefined) set.startDate = startDate;
    if (status) set.status = status;
    if (notes !== undefined) set.notes = notes;
    
    // Handle loom allocation change
    if (allocatedLoomId !== undefined) {
      // Clear old loom
      if (set.allocatedLoomId && set.allocatedLoomId.toString() !== allocatedLoomId) {
        await Loom.findByIdAndUpdate(set.allocatedLoomId, {
          currentSetId: null,
          status: 'Idle',
        });
      }
      
      // Set new loom
      if (allocatedLoomId) {
        await Loom.findByIdAndUpdate(allocatedLoomId, {
          currentSetId: set._id,
          status: 'Active',
        });
      }
      
      set.allocatedLoomId = allocatedLoomId;
    }
    
    // Handle beam allocation change
    if (allocatedBeamId !== undefined) {
      // Clear old beam
      if (set.allocatedBeamId && set.allocatedBeamId.toString() !== allocatedBeamId) {
        await Beam.findByIdAndUpdate(set.allocatedBeamId, {
          currentLoomId: null,
          status: 'Ready',
        });
      }
      
      // Set new beam
      if (allocatedBeamId) {
        await Beam.findByIdAndUpdate(allocatedBeamId, {
          currentLoomId: set.allocatedLoomId,
          status: 'On Loom',
        });
      }
      
      set.allocatedBeamId = allocatedBeamId;
    }
    
    // Recalculate expected completion
    if (set.startDate && set.targetMetersPerDay > 0) {
      const remainingQty = set.orderQuantity - set.producedQuantity;
      const daysRequired = Math.ceil(remainingQty / set.targetMetersPerDay);
      const expectedDate = new Date(set.startDate);
      expectedDate.setDate(expectedDate.getDate() + daysRequired);
      set.expectedCompletionDate = expectedDate;
    }
    
    await set.save();
    
    res.json({
      success: true,
      set,
    });
  } catch (error) {
    console.error('Update weaving set error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update weaving set status
 * @route   PUT /api/weaving/sets/:id/status
 * @access  Private (Supervisor+)
 */
const updateSetStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const set = await WeavingSet.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!set) {
      return res.status(404).json({ success: false, message: 'Weaving set not found' });
    }
    
    const validStatuses = ['Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }
    
    set.status = status;
    
    // Set completion date if completed
    if (status === 'Completed') {
      set.actualCompletionDate = new Date();
      
      // Free up loom
      if (set.allocatedLoomId) {
        await Loom.findByIdAndUpdate(set.allocatedLoomId, {
          currentSetId: null,
          status: 'Idle',
        });
      }
      
      // Free up beam
      if (set.allocatedBeamId) {
        await Beam.findByIdAndUpdate(set.allocatedBeamId, {
          currentLoomId: null,
          status: 'Ready',
        });
      }
    }
    
    await set.save();
    
    res.json({
      success: true,
      set,
    });
  } catch (error) {
    console.error('Update set status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete weaving set
 * @route   DELETE /api/weaving/sets/:id
 * @access  Private (Admin+)
 */
const deleteWeavingSet = async (req, res) => {
  try {
    const set = await WeavingSet.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!set) {
      return res.status(404).json({ success: false, message: 'Weaving set not found' });
    }
    
    // Cannot delete if in progress
    if (set.status === 'In Progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete set that is in progress',
      });
    }
    
    // Free up loom
    if (set.allocatedLoomId) {
      await Loom.findByIdAndUpdate(set.allocatedLoomId, {
        currentSetId: null,
        status: 'Idle',
      });
    }
    
    // Free up beam
    if (set.allocatedBeamId) {
      await Beam.findByIdAndUpdate(set.allocatedBeamId, {
        currentLoomId: null,
        status: 'Ready',
      });
    }
    
    await set.deleteOne();
    
    res.json({
      success: true,
      message: 'Weaving set deleted successfully',
    });
  } catch (error) {
    console.error('Delete weaving set error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get weaving set statistics
 * @route   GET /api/weaving/sets/stats
 * @access  Private (Viewer+)
 */
const getSetStats = async (req, res) => {
  try {
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    // Status distribution
    const statusStats = await WeavingSet.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalOrdered: { $sum: '$orderQuantity' },
          totalProduced: { $sum: '$producedQuantity' },
        },
      },
    ]);
    
    // Priority distribution
    const priorityStats = await WeavingSet.aggregate([
      { $match: { company: companyObjectId, status: { $in: ['Pending', 'In Progress'] } } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);
    
    res.json({
      success: true,
      stats: {
        statusDistribution: statusStats,
        priorityDistribution: priorityStats,
      },
    });
  } catch (error) {
    console.error('Get set stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getWeavingSets,
  getWeavingSet,
  createWeavingSet,
  updateWeavingSet,
  updateSetStatus,
  deleteWeavingSet,
  getSetStats,
};