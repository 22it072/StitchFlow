const Loom = require('../models/Loom');
const Beam = require('../models/Beam');
const WeavingSet = require('../models/WeavingSet');
const LoomMaintenance = require('../models/LoomMaintenance');

/**
 * Generate unique loom number
 * Format: L-001, L-002, etc.
 * 
 * @param {String} companyId - Company ID
 * @returns {String} Generated loom number
 */
async function generateLoomNumber(companyId) {
  const prefix = 'L';
  
  const lastLoom = await Loom.findOne({
    company: companyId,
    loomNumber: { $regex: `^${prefix}` },
  })
    .sort({ loomNumber: -1 })
    .lean();
  
  let sequence = 1;
  if (lastLoom) {
    const lastNumber = parseInt(lastLoom.loomNumber.replace(`${prefix}-`, ''));
    sequence = lastNumber + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

/**
 * Generate unique beam number
 * Format: BM-YYYY-001, BM-YYYY-002, etc.
 * 
 * @param {String} companyId - Company ID
 * @returns {String} Generated beam number
 */
async function generateBeamNumber(companyId) {
  const year = new Date().getFullYear();
  const prefix = `BM${year}`;
  
  const lastBeam = await Beam.findOne({
    company: companyId,
    beamNumber: { $regex: `^${prefix}` },
  })
    .sort({ beamNumber: -1 })
    .lean();
  
  let sequence = 1;
  if (lastBeam) {
    const lastNumber = parseInt(lastBeam.beamNumber.replace(prefix, ''));
    sequence = lastNumber + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate unique weaving set number
 * Format: WS-YYYY-001, WS-YYYY-002, etc.
 * 
 * @param {String} companyId - Company ID
 * @returns {String} Generated set number
 */
async function generateSetNumber(companyId) {
  const year = new Date().getFullYear();
  const prefix = `WS${year}`;
  
  const lastSet = await WeavingSet.findOne({
    company: companyId,
    setNumber: { $regex: `^${prefix}` },
  })
    .sort({ setNumber: -1 })
    .lean();
  
  let sequence = 1;
  if (lastSet) {
    const lastNumber = parseInt(lastSet.setNumber.replace(prefix, ''));
    sequence = lastNumber + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate unique maintenance ID
 * Format: MNT-YYYY-001, MNT-YYYY-002, etc.
 * 
 * @param {String} companyId - Company ID
 * @returns {String} Generated maintenance ID
 */
async function generateMaintenanceId(companyId) {
  const year = new Date().getFullYear();
  const prefix = `MNT${year}`;
  
  const lastMaintenance = await LoomMaintenance.findOne({
    company: companyId,
    maintenanceId: { $regex: `^${prefix}` },
  })
    .sort({ maintenanceId: -1 })
    .lean();
  
  let sequence = 1;
  if (lastMaintenance) {
    const lastNumber = parseInt(lastMaintenance.maintenanceId.replace(prefix, ''));
    sequence = lastNumber + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

module.exports = {
  generateLoomNumber,
  generateBeamNumber,
  generateSetNumber,
  generateMaintenanceId,
};