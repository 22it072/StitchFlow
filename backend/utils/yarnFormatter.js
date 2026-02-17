/**
 * Yarn Display Name Formatter
 * Generates industry-standard yarn naming format
 */

/**
 * Generate display name for a yarn
 * @param {Object} yarn - Yarn object with name, denier, yarnCategory, tpm, filamentCount
 * @returns {String} - Formatted display name
 */
function generateYarnDisplayName(yarn) {
  if (!yarn) return '';
  
  const { name, denier, yarnCategory, tpm, filamentCount } = yarn;
  
  if (!name) return '';
  if (!denier) return name;
  
  let displayName = name;
  
  if (yarnCategory === 'filament') {
    // Filament Yarn Formats:
    // Basic: <Name> <Denier>/<Filament Count>
    // With TPM: <Name> <Denier>/<Filament Count> TPM <TPM>
    
    if (filamentCount && filamentCount > 0) {
      displayName = `${name} ${denier}/${filamentCount}`;
      
      if (tpm && tpm > 0) {
        displayName = `${name} ${denier}/${filamentCount} TPM ${tpm}`;
      }
    } else {
      // Fallback if no filament count
      displayName = `${name} ${denier}D`;
      if (tpm && tpm > 0) {
        displayName = `${name} ${denier}D TPM ${tpm}`;
      }
    }
  } else {
    // Spun Yarn Formats:
    // Basic: <Name> <Denier>D
    // With TPM: <Name> <Denier>/<TPM>
    
    if (tpm && tpm > 0) {
      displayName = `${name} ${denier}/${tpm}`;
    } else {
      displayName = `${name} ${denier}D`;
    }
  }
  
  return displayName.trim();
}

/**
 * Parse display name back to components (for reverse lookup)
 * @param {String} displayName - Formatted display name
 * @returns {Object} - Parsed components
 */
function parseYarnDisplayName(displayName) {
  if (!displayName) return null;
  
  // Try to match filament with TPM: Name Denier/Filament TPM Value
  let match = displayName.match(/^(.+?)\s+(\d+)\/(\d+)\s+TPM\s+(\d+)$/);
  if (match) {
    return {
      name: match[1],
      denier: parseInt(match[2]),
      filamentCount: parseInt(match[3]),
      tpm: parseInt(match[4]),
      yarnCategory: 'filament',
    };
  }
  
  // Try to match filament: Name Denier/Filament
  match = displayName.match(/^(.+?)\s+(\d+)\/(\d+)$/);
  if (match) {
    return {
      name: match[1],
      denier: parseInt(match[2]),
      filamentCount: parseInt(match[3]),
      yarnCategory: 'filament',
    };
  }
  
  // Try to match spun with TPM: Name Denier/TPM
  match = displayName.match(/^(.+?)\s+(\d+)\/(\d+)$/);
  if (match) {
    return {
      name: match[1],
      denier: parseInt(match[2]),
      tpm: parseInt(match[3]),
      yarnCategory: 'spun',
    };
  }
  
  // Try to match basic: Name DenierD
  match = displayName.match(/^(.+?)\s+(\d+)D$/);
  if (match) {
    return {
      name: match[1],
      denier: parseInt(match[2]),
    };
  }
  
  return { name: displayName };
}

/**
 * Get short display format for dropdowns
 * @param {Object} yarn - Yarn object
 * @returns {String} - Short format
 */
function getYarnShortDisplay(yarn) {
  if (!yarn) return '';
  
  const { name, denier, yarnCategory, filamentCount, tpm } = yarn;
  
  if (yarnCategory === 'filament' && filamentCount) {
    return `${name} ${denier}/${filamentCount}`;
  } else if (tpm) {
    return `${name} ${denier}/${tpm}`;
  }
  
  return `${name} ${denier}D`;
}

/**
 * Get yarn category label
 * @param {String} category - 'spun' or 'filament'
 * @returns {String} - Display label
 */
function getYarnCategoryLabel(category) {
  const labels = {
    spun: 'Spun Yarn',
    filament: 'Filament Yarn',
  };
  return labels[category] || category;
}

module.exports = {
  generateYarnDisplayName,
  parseYarnDisplayName,
  getYarnShortDisplay,
  getYarnCategoryLabel,
};