// backend/controllers/yarnController.js
const Yarn = require('../models/Yarn');
const { generateYarnDisplayName } = require('../utils/yarnFormatter');

// @desc    Get all yarns for company
// @route   GET /api/yarns
// @access  Private
const getYarns = async (req, res) => {
  try {
    const { type, category, active, search, sort } = req.query;
    
    // UPDATED: Company-scoped query
    let query = { company: req.companyId };
    
    if (type && type !== 'all') {
      query.yarnType = { $in: [type, 'all'] };
    }
    
    if (category && category !== 'all') {
      query.yarnCategory = category;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'displayName') sortOption = { displayName: 1 };
    if (sort === 'price') sortOption = { price: 1 };
    if (sort === 'usage') sortOption = { usageCount: -1 };
    if (sort === 'denier') sortOption = { denier: 1 };

    const yarns = await Yarn.find(query).sort(sortOption);
    
    res.json(yarns);
  } catch (error) {
    console.error('Get yarns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single yarn
// @route   GET /api/yarns/:id
// @access  Private
const getYarn = async (req, res) => {
  try {
    // UPDATED: Company-scoped query
    const yarn = await Yarn.findOne({
      _id: req.params.id,
      company: req.companyId,
    });

    if (!yarn) {
      return res.status(404).json({ message: 'Yarn not found' });
    }

    res.json(yarn);
  } catch (error) {
    console.error('Get yarn error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create yarn
// @route   POST /api/yarns
// @access  Private (Editor+)
const createYarn = async (req, res) => {
  try {
    const { 
      name, 
      denier, 
      price, 
      gstPercentage, 
      yarnType, 
      yarnCategory,
      tpm,
      filamentCount,
      color, 
      description 
    } = req.body;

    const yarnData = {
      company: req.companyId, // UPDATED: Add company
      user: req.user._id,
      name,
      denier,
      price,
      gstPercentage,
      yarnType,
      yarnCategory: yarnCategory || 'spun',
      tpm: tpm || null,
      filamentCount: filamentCount || null,
      color,
      description,
    };

    // Generate display name
    yarnData.displayName = generateYarnDisplayName(yarnData);

    const yarn = await Yarn.create(yarnData);

    res.status(201).json(yarn);
  } catch (error) {
    console.error('Create yarn error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update yarn
// @route   PUT /api/yarns/:id
// @access  Private (Editor+)
const updateYarn = async (req, res) => {
  try {
    // UPDATED: Company-scoped query
    const yarn = await Yarn.findOne({
      _id: req.params.id,
      company: req.companyId,
    });

    if (!yarn) {
      return res.status(404).json({ message: 'Yarn not found' });
    }

    const { 
      name, 
      denier, 
      price, 
      gstPercentage, 
      yarnType, 
      yarnCategory,
      tpm,
      filamentCount,
      color, 
      description, 
      isActive 
    } = req.body;

    // Update fields
    yarn.name = name || yarn.name;
    yarn.denier = denier !== undefined ? denier : yarn.denier;
    yarn.price = price !== undefined ? price : yarn.price;
    yarn.gstPercentage = gstPercentage !== undefined ? gstPercentage : yarn.gstPercentage;
    yarn.yarnType = yarnType || yarn.yarnType;
    yarn.yarnCategory = yarnCategory || yarn.yarnCategory;
    yarn.tpm = tpm !== undefined ? tpm : yarn.tpm;
    yarn.filamentCount = filamentCount !== undefined ? filamentCount : yarn.filamentCount;
    yarn.color = color !== undefined ? color : yarn.color;
    yarn.description = description !== undefined ? description : yarn.description;
    yarn.isActive = isActive !== undefined ? isActive : yarn.isActive;

    // Regenerate display name
    yarn.displayName = generateYarnDisplayName(yarn);

    const updatedYarn = await yarn.save();
    res.json(updatedYarn);
  } catch (error) {
    console.error('Update yarn error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete yarn
// @route   DELETE /api/yarns/:id
// @access  Private (Admin+)
const deleteYarn = async (req, res) => {
  try {
    // UPDATED: Company-scoped query
    const yarn = await Yarn.findOne({
      _id: req.params.id,
      company: req.companyId,
    });

    if (!yarn) {
      return res.status(404).json({ message: 'Yarn not found' });
    }

    await yarn.deleteOne();
    res.json({ message: 'Yarn removed' });
  } catch (error) {
    console.error('Delete yarn error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Increment yarn usage count
// @route   POST /api/yarns/:id/usage
// @access  Private
const incrementUsage = async (req, res) => {
  try {
    // UPDATED: Company-scoped query
    const yarn = await Yarn.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!yarn) {
      return res.status(404).json({ message: 'Yarn not found' });
    }

    res.json(yarn);
  } catch (error) {
    console.error('Increment usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get yarn statistics
// @route   GET /api/yarns/stats
// @access  Private
const getYarnStats = async (req, res) => {
  try {
    // UPDATED: Company-scoped aggregation
    const stats = await Yarn.aggregate([
      { $match: { company: req.company._id } },
      {
        $group: {
          _id: null,
          totalYarns: { $sum: 1 },
          spunYarns: { 
            $sum: { $cond: [{ $eq: ['$yarnCategory', 'spun'] }, 1, 0] } 
          },
          filamentYarns: { 
            $sum: { $cond: [{ $eq: ['$yarnCategory', 'filament'] }, 1, 0] } 
          },
          avgPrice: { $avg: '$price' },
          avgDenier: { $avg: '$denier' },
          totalUsage: { $sum: '$usageCount' },
        },
      },
    ]);

    const categoryStats = await Yarn.aggregate([
      { $match: { company: req.company._id } },
      {
        $group: {
          _id: '$yarnCategory',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          avgDenier: { $avg: '$denier' },
        },
      },
    ]);

    const typeStats = await Yarn.aggregate([
      { $match: { company: req.company._id } },
      {
        $group: {
          _id: '$yarnType',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      overall: stats[0] || {},
      byCategory: categoryStats,
      byType: typeStats,
    });
  } catch (error) {
    console.error('Get yarn stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getYarns,
  getYarn,
  createYarn,
  updateYarn,
  deleteYarn,
  incrementUsage,
  getYarnStats,
};