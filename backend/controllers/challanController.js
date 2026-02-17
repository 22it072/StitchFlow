const Challan = require('../models/Challan');
const Party = require('../models/Party');
const Estimate = require('../models/Estimate');
const {
  calculateItemTotals,
  calculateChallanTotals,
  calculateChallanInterest,
  getDaysOverdue,
} = require('../utils/challanCalculations');
const mongoose = require('mongoose');

// Generate unique challan number
const generateChallanNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const prefix = `CH${year}`;
  
  const lastChallan = await Challan.findOne({
    company: companyId,
    challanNumber: { $regex: `^${prefix}` },
  })
    .sort({ challanNumber: -1 })
    .lean();
  
  let sequence = 1;
  if (lastChallan) {
    const lastNumber = parseInt(lastChallan.challanNumber.replace(prefix, ''));
    sequence = lastNumber + 1;
  }
  
  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

// @desc    Get all challans for company
// @route   GET /api/challans
// @access  Private (Viewer+)
const getChallans = async (req, res) => {
  try {
    const { search, status, partyId, startDate, endDate, sort, page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by party
    if (partyId) {
      query.party = partyId;
    }
    
    // Date range
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }
    
    // Search
    if (search) {
      query.challanNumber = { $regex: search, $options: 'i' };
    }
    
    let sortOption = { createdAt: -1 };
    if (sort === 'number') sortOption = { challanNumber: -1 };
    if (sort === 'amount') sortOption = { 'totals.subtotalAmount': -1 };
    if (sort === 'dueDate') sortOption = { dueDate: 1 };
    
    const skip = (page - 1) * limit;
    
    const challans = await Challan.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('party', 'partyName contactPerson phone')
      .populate('createdBy', 'name email')
      .lean();
    
    // Calculate real-time interest for each challan
    const challansWithInterest = challans.map(challan => {
      const currentInterest = calculateChallanInterest(challan);
      return {
        ...challan,
        currentInterest,
        totalPayable: challan.totals.subtotalAmount + currentInterest,
        daysOverdue: getDaysOverdue(challan.dueDate),
      };
    });
    
    const total = await Challan.countDocuments(query);
    
    res.json({
      success: true,
      challans: challansWithInterest,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get challans error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single challan with real-time interest
// @route   GET /api/challans/:id
// @access  Private (Viewer+)
const getChallan = async (req, res) => {
  try {
    const challan = await Challan.findOne({
      _id: req.params.id,
      company: req.companyId,
    })
      .populate('party')
      .populate('items.estimateId', 'qualityName')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }
    
    // Calculate real-time interest
    const currentInterest = calculateChallanInterest(challan);
    const daysOverdue = getDaysOverdue(challan.dueDate);
    
    res.json({
      success: true,
      challan: {
        ...challan,
        currentInterest,
        totalPayable: challan.totals.subtotalAmount + currentInterest,
        daysOverdue,
      },
    });
  } catch (error) {
    console.error('Get challan error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create challan
// @route   POST /api/challans
// @access  Private (Editor+)
const createChallan = async (req, res) => {
  try {
    const { partyId, issueDate, paymentTermsDays, items, notes } = req.body;
    
    // Validate party
    const party = await Party.findOne({
      _id: partyId,
      company: req.companyId,
      activeStatus: true,
    });
    
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found or inactive' });
    }
    
    // Validate and process items
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }
    
    const processedItems = [];
    
    for (const item of items) {
      // Fetch estimate
      const estimate = await Estimate.findOne({
        _id: item.estimateId,
        company: req.companyId,
      }).lean();
      
      if (!estimate) {
        return res.status(404).json({
          success: false,
          message: `Estimate ${item.estimateId} not found`,
        });
      }
      
      // Calculate item totals
      const itemData = {
        estimateId: estimate._id,
        qualityName: estimate.qualityName,
        panna: estimate.weft.panna,
        pricePerMeter: estimate.totalCost,
        weightPerMeter: estimate.totalNetWeight || estimate.totalWeight,
        orderedMeters: parseFloat(item.orderedMeters),
      };
      
      const calculated = calculateItemTotals(itemData);
      
      processedItems.push({
        ...itemData,
        ...calculated,
      });
    }
    
    // Calculate totals
    const totals = calculateChallanTotals(processedItems);
    
    // Calculate due date
    const termsDays = paymentTermsDays || party.paymentTermsDays || 30;
    const dueDate = new Date(issueDate || Date.now());
    dueDate.setDate(dueDate.getDate() + termsDays);
    
    // Generate challan number
    const challanNumber = await generateChallanNumber(req.companyId);
    
    // Create challan
    const challan = await Challan.create({
      company: req.companyId,
      challanNumber,
      party: partyId,
      issueDate: issueDate || Date.now(),
      dueDate,
      status: 'Open',
      items: processedItems,
      totals,
      interestTracking: {
        principalAmount: totals.subtotalAmount,
        interestAccrued: 0,
        lastCalculatedAt: new Date(),
        interestRate: party.interestPercentPerDay || 0,
        interestType: party.interestType || 'compound',
      },
      notes,
      createdBy: req.user._id,
      history: [
        {
          action: 'created',
          performedBy: req.user._id,
          performedAt: new Date(),
        },
      ],
    });
    
    // Update party outstanding
    party.currentOutstanding += totals.subtotalAmount;
    await party.save();
    
    const populatedChallan = await Challan.findById(challan._id)
      .populate('party', 'partyName contactPerson phone')
      .populate('createdBy', 'name email')
      .lean();
    
    res.status(201).json({
      success: true,
      challan: populatedChallan,
    });
  } catch (error) {
    console.error('Create challan error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update challan status
// @route   PUT /api/challans/:id/status
// @access  Private (Editor+)
const updateChallanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const challan = await Challan.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }
    
    const oldStatus = challan.status;
    challan.status = status;
    
    // Add history
    challan.history.push({
      action: 'status_changed',
      performedBy: req.user._id,
      performedAt: new Date(),
      changes: { from: oldStatus, to: status },
    });
    
    await challan.save();
    
    res.json({
      success: true,
      challan,
    });
  } catch (error) {
    console.error('Update challan status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Record payment
// @route   POST /api/challans/:id/payment
// @access  Private (Editor+)
const recordPayment = async (req, res) => {
  try {
    const { amount, date, method, reference, notes } = req.body;
    
    const challan = await Challan.findOne({
      _id: req.params.id,
      company: req.companyId,
    }).populate('party');
    
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }
    
    const payment = {
      amount: parseFloat(amount),
      date: date || new Date(),
      method,
      reference,
      notes,
    };
    
    challan.payments.push(payment);
    
    // Calculate total paid
    const totalPaid = challan.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Update status if fully paid
    if (totalPaid >= challan.totals.subtotalAmount) {
      challan.status = 'Paid';
      
      // Update party outstanding
      challan.party.currentOutstanding -= challan.totals.subtotalAmount;
      await challan.party.save();
    }
    
    // Add history
    challan.history.push({
      action: 'payment_recorded',
      performedBy: req.user._id,
      performedAt: new Date(),
      changes: { amount: payment.amount, method: payment.method },
    });
    
    await challan.save();
    
    res.json({
      success: true,
      challan,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get challan statistics - FIXED
// @route   GET /api/challans/stats
// @access  Private (Viewer+)
const getChallanStats = async (req, res) => {
  try {
    // FIX: Use 'new' keyword with ObjectId
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);
    
    const stats = await Challan.aggregate([
      { $match: { company: companyObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totals.subtotalAmount' },
          totalMeters: { $sum: '$totals.totalMeters' },
          totalWeight: { $sum: '$totals.totalWeight' },
        },
      },
    ]);
    
    // Get overdue challans
    const overdueCount = await Challan.countDocuments({
      company: companyObjectId,
      status: { $in: ['Open', 'Overdue'] },
      dueDate: { $lt: new Date() },
    });
    
    res.json({
      success: true,
      stats,
      overdueCount,
    });
  } catch (error) {
    console.error('Get challan stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete challan
// @route   DELETE /api/challans/:id
// @access  Private (Admin+)
const deleteChallan = async (req, res) => {
  try {
    const challan = await Challan.findOne({
      _id: req.params.id,
      company: req.companyId,
    }).populate('party');
    
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }
    
    // Update party outstanding if challan was open
    if (challan.status === 'Open' || challan.status === 'Overdue') {
      challan.party.currentOutstanding -= challan.totals.subtotalAmount;
      await challan.party.save();
    }
    
    await challan.deleteOne();
    
    res.json({
      success: true,
      message: 'Challan deleted successfully',
    });
  } catch (error) {
    console.error('Delete challan error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getChallans,
  getChallan,
  createChallan,
  updateChallanStatus,
  recordPayment,
  getChallanStats,
  deleteChallan,
};