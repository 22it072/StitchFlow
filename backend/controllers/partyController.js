const Party = require('../models/Party');
const Challan = require('../models/Challan');
const mongoose = require('mongoose');

// @desc    Get all parties for company
// @route   GET /api/parties
// @access  Private (Viewer+)
const getParties = async (req, res) => {
  try {
    const { search, active, sort, page = 1, limit = 20 } = req.query;
    
    let query = { company: req.companyId };
    
    // Filter by active status
    if (active !== undefined) {
      query.activeStatus = active === 'true';
    }
    
    // Search
    if (search) {
      query.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { partyName: 1 };
    if (sort === 'outstanding') sortOption = { currentOutstanding: -1 };
    
    const skip = (page - 1) * limit;
    
    const parties = await Party.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Party.countDocuments(query);
    
    res.json({
      success: true,
      parties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get parties error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single party - FIXED
// @route   GET /api/parties/:id
// @access  Private (Viewer+)
const getParty = async (req, res) => {
  try {
    // FIX: Use findById instead of manual ObjectId conversion
    const party = await Party.findOne({
      _id: req.params.id,
      company: req.companyId,
    }).lean();
    
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }
    
    // FIX: Use 'new' keyword with ObjectId
    const challanStats = await Challan.aggregate([
      {
        $match: {
          party: new mongoose.Types.ObjectId(req.params.id),
          company: new mongoose.Types.ObjectId(req.companyId),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totals.subtotalAmount' },
        },
      },
    ]);
    
    res.json({
      success: true,
      party,
      challanStats,
    });
  } catch (error) {
    console.error('Get party error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create party
// @route   POST /api/parties
// @access  Private (Editor+)
const createParty = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        message: "CompanyId missing"
      });
    }

    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);

    const {
      partyName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      paymentTermsDays,      // ADD THIS
      interestPercentPerDay, // ADD THIS
      interestType,          // ADD THIS
      creditLimit = 0
    } = req.body;

    if (!partyName) {
      return res.status(400).json({
        success: false,
        message: "Party name required"
      });
    }

    // Get last partyCode
    const lastParty = await Party.findOne(
      { company: companyObjectId },
      {},
      { sort: { createdAt: -1 } }
    );

    let partyCode = "PTY-0001";

    if (lastParty && lastParty.partyCode) {
      const number = parseInt(lastParty.partyCode.split('-')[1]);
      partyCode = `PTY-${String(number + 1).padStart(4, '0')}`;
    }

    // Create party with ALL fields
    const party = await Party.create({
      company: companyObjectId,
      partyCode,
      partyName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      paymentTermsDays: paymentTermsDays !== undefined ? Number(paymentTermsDays) : 30, // ADD THIS
      interestPercentPerDay: interestPercentPerDay !== undefined ? Number(interestPercentPerDay) : 0, // ADD THIS
      interestType: interestType || 'compound', // ADD THIS
      creditLimit: creditLimit !== undefined ? Number(creditLimit) : 0,
      currentOutstanding: 0,
      activeStatus: true
    });

    // Log for debugging
    console.log('Party created with values:', {
      paymentTermsDays: party.paymentTermsDays,
      interestPercentPerDay: party.interestPercentPerDay,
      interestType: party.interestType
    });

    res.status(201).json({
      success: true,
      party
    });
  } catch (error) {
    console.error("Create party error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update party
// @route   PUT /api/parties/:id
// @access  Private (Editor+)
const updateParty = async (req, res) => {
  try {
    const party = await Party.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }
    
    const {
      partyName,
      contactPerson,
      phone,
      email,
      address,
      gstNumber,
      paymentTermsDays,
      interestPercentPerDay,
      interestType,
      creditLimit,
      activeStatus,
    } = req.body;
    
    // Check for duplicate name if changing
    if (partyName && partyName !== party.partyName) {
      const existingParty = await Party.findOne({
        company: req.companyId,
        partyName: { $regex: `^${partyName}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      
      if (existingParty) {
        return res.status(400).json({
          success: false,
          message: 'Party with this name already exists',
        });
      }
    }
    
    // Update fields - with proper type conversion
    if (partyName !== undefined) party.partyName = partyName;
    if (contactPerson !== undefined) party.contactPerson = contactPerson;
    if (phone !== undefined) party.phone = phone;
    if (email !== undefined) party.email = email;
    if (address !== undefined) party.address = address;
    if (gstNumber !== undefined) party.gstNumber = gstNumber;
    if (paymentTermsDays !== undefined) party.paymentTermsDays = Number(paymentTermsDays);
    if (interestPercentPerDay !== undefined) party.interestPercentPerDay = Number(interestPercentPerDay);
    if (interestType !== undefined) party.interestType = interestType;
    if (creditLimit !== undefined) party.creditLimit = Number(creditLimit);
    if (activeStatus !== undefined) party.activeStatus = activeStatus;
    
    await party.save();
    
    // Log for debugging
    console.log('Party updated with values:', {
      paymentTermsDays: party.paymentTermsDays,
      interestPercentPerDay: party.interestPercentPerDay,
      interestType: party.interestType
    });
    
    res.json({
      success: true,
      party,
    });
  } catch (error) {
    console.error('Update party error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete party
// @route   DELETE /api/parties/:id
// @access  Private (Admin+)
const deleteParty = async (req, res) => {
  try {
    const party = await Party.findOne({
      _id: req.params.id,
      company: req.companyId,
    });
    
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }
    
    // Check if party has any challans
    const challanCount = await Challan.countDocuments({
      party: req.params.id,
      company: req.companyId,
    });
    
    if (challanCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete party with ${challanCount} existing challan(s). Please delete or reassign challans first.`,
      });
    }
    
    await party.deleteOne();
    
    res.json({
      success: true,
      message: 'Party deleted successfully',
    });
  } catch (error) {
    console.error('Delete party error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get party statistics - FIXED
// @route   GET /api/parties/stats
// @access  Private (Viewer+)
const getPartyStats = async (req, res) => {
  try {
    if (!req.companyId || !mongoose.Types.ObjectId.isValid(req.companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid companyId"
      });
    }

    // FIX: Use 'new' keyword with ObjectId
    const companyObjectId = new mongoose.Types.ObjectId(req.companyId);

    const stats = await Party.aggregate([
      {
        $match: {
          company: companyObjectId
        }
      },
      {
        $group: {
          _id: null,
          totalParties: { $sum: 1 },
          activeParties: {
            $sum: {
              $cond: ["$activeStatus", 1, 0]
            }
          },
          totalOutstanding: {
            $sum: {
              $ifNull: ["$currentOutstanding", 0]
            }
          },
          totalCreditLimit: {
            $sum: {
              $ifNull: ["$creditLimit", 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalParties: 0,
        activeParties: 0,
        totalOutstanding: 0,
        totalCreditLimit: 0
      }
    });
  } catch (error) {
    console.error("Get party stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getParties,
  getParty,
  createParty,
  updateParty,
  deleteParty,
  getPartyStats,
};