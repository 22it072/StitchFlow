/**
 * Yarn Display Name Formatter - Frontend
 * Generates industry-standard yarn naming format
 */

/**
 * Generate display name for a yarn
 * @param {Object} yarn - Yarn object
 * @returns {String} - Formatted display name
 */
export function generateYarnDisplayName(yarn) {
  if (!yarn) return '';
  
  const { name, denier, yarnCategory, tpm, filamentCount } = yarn;
  
  if (!name) return '';
  if (!denier) return name;
  
  let displayName = name;
  
  if (yarnCategory === 'filament') {
    // Filament Yarn Formats
    if (filamentCount && filamentCount > 0) {
      displayName = `${name} ${denier}/${filamentCount}`;
      
      if (tpm && tpm > 0) {
        displayName = `${name} ${denier}/${filamentCount} TPM ${tpm}`;
      }
    } else {
      displayName = `${name} ${denier}D`;
      if (tpm && tpm > 0) {
        displayName = `${name} ${denier}D TPM ${tpm}`;
      }
    }
  } else {
    // Spun Yarn Formats
    if (tpm && tpm > 0) {
      displayName = `${name} ${denier}/${tpm}`;
    } else {
      displayName = `${name} ${denier}D`;
    }
  }
  
  return displayName.trim();
}

/**
 * Get short display format for compact views
 * @param {Object} yarn - Yarn object
 * @returns {String} - Short format
 */
export function getYarnShortDisplay(yarn) {
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
 * Get yarn category display label
 * @param {String} category - 'spun' or 'filament'
 * @returns {String} - Display label
 */
export function getYarnCategoryLabel(category) {
  const labels = {
    spun: 'Spun Yarn',
    filament: 'Filament Yarn',
  };
  return labels[category] || category;
}

/**
 * Get yarn category badge color classes
 * @param {String} category - 'spun' or 'filament'
 * @returns {String} - Tailwind classes
 */
export function getYarnCategoryColor(category) {
  const colors = {
    spun: 'bg-amber-100 text-amber-800',
    filament: 'bg-cyan-100 text-cyan-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

/**
 * Get yarn type badge color classes
 * @param {String} type - 'warp', 'weft', 'weft-2', 'all'
 * @returns {String} - Tailwind classes
 */
export function getYarnTypeColor(type) {
  const colors = {
    warp: 'bg-blue-100 text-blue-800',
    weft: 'bg-green-100 text-green-800',
    'weft-2': 'bg-purple-100 text-purple-800',
    all: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Format yarn specifications for display
 * @param {Object} yarn - Yarn object
 * @returns {Object} - Formatted specs
 */
export function formatYarnSpecs(yarn) {
  if (!yarn) return {};
  
  const specs = {
    denier: `${yarn.denier}D`,
  };
  
  if (yarn.yarnCategory === 'filament' && yarn.filamentCount) {
    specs.filament = `${yarn.filamentCount}F`;
  }
  
  if (yarn.tpm) {
    specs.tpm = `${yarn.tpm} TPM`;
  }
  
  return specs;
}

/**
 * Build complete yarn details object for storage
 * @param {Object} yarnData - Form data
 * @param {Object} selectedYarn - Selected yarn from library
 * @returns {Object} - Complete yarn details
 */
export function buildYarnDetails(yarnData, selectedYarn = null) {
  const details = {
    yarnId: selectedYarn?._id || yarnData.yarnId || null,
    yarnName: selectedYarn?.name || yarnData.yarnName || '',
    displayName: '',
    denier: selectedYarn?.denier || yarnData.denier || 0,
    yarnCategory: selectedYarn?.yarnCategory || yarnData.yarnCategory || 'spun',
    tpm: selectedYarn?.tpm || yarnData.tpm || null,
    filamentCount: selectedYarn?.filamentCount || yarnData.filamentCount || null,
    yarnPrice: selectedYarn?.price || yarnData.yarnPrice || 0,
    yarnGst: selectedYarn?.gstPercentage || yarnData.yarnGst || 0,
  };
  
  // Generate display name
  details.displayName = generateYarnDisplayName(details);
  
  return details;
}