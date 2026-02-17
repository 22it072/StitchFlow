/**
 * Calculate item totals for a single challan item
 */
function calculateItemTotals(item) {
  const { orderedMeters, weightPerMeter, pricePerMeter } = item;
  
  return {
    calculatedWeight: parseFloat((orderedMeters * weightPerMeter).toFixed(4)),
    calculatedAmount: parseFloat((orderedMeters * pricePerMeter).toFixed(2)),
  };
}

/**
 * Calculate challan totals from items array
 */
function calculateChallanTotals(items) {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalMeters += item.orderedMeters || 0;
      acc.totalWeight += item.calculatedWeight || 0;
      acc.subtotalAmount += item.calculatedAmount || 0;
      return acc;
    },
    { totalMeters: 0, totalWeight: 0, subtotalAmount: 0 }
  );

  return {
    totalMeters: parseFloat(totals.totalMeters.toFixed(2)),
    totalWeight: parseFloat(totals.totalWeight.toFixed(4)),
    subtotalAmount: parseFloat(totals.subtotalAmount.toFixed(2)),
  };
}

/**
 * Calculate compound interest
 * Formula: A = P(1 + r)^t - P
 * Where:
 *   P = principal amount
 *   r = daily interest rate (as decimal)
 *   t = number of days overdue
 */
function calculateCompoundInterest(principal, ratePercentPerDay, daysOverdue) {
  if (daysOverdue <= 0 || ratePercentPerDay <= 0) {
    return 0;
  }

  const rate = ratePercentPerDay / 100;
  const amount = principal * Math.pow(1 + rate, daysOverdue);
  const interest = amount - principal;

  return parseFloat(interest.toFixed(2));
}

/**
 * Calculate simple interest
 * Formula: I = P × r × t
 */
function calculateSimpleInterest(principal, ratePercentPerDay, daysOverdue) {
  if (daysOverdue <= 0 || ratePercentPerDay <= 0) {
    return 0;
  }

  const rate = ratePercentPerDay / 100;
  const interest = principal * rate * daysOverdue;

  return parseFloat(interest.toFixed(2));
}

/**
 * Calculate interest based on type (compound or simple)
 */
function calculateInterest(principal, ratePercentPerDay, daysOverdue, interestType = 'compound') {
  if (interestType === 'simple') {
    return calculateSimpleInterest(principal, ratePercentPerDay, daysOverdue);
  }
  return calculateCompoundInterest(principal, ratePercentPerDay, daysOverdue);
}

/**
 * Get days overdue from due date
 */
function getDaysOverdue(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  
  if (today <= due) return 0;
  
  const diffTime = Math.abs(today - due);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Calculate real-time interest for a challan
 */
function calculateChallanInterest(challan) {
  if (challan.status === 'Paid' || challan.status === 'Cancelled') {
    return 0;
  }

  const daysOverdue = getDaysOverdue(challan.dueDate);
  
  if (daysOverdue <= 0) {
    return 0;
  }

  const principal = challan.interestTracking.principalAmount || challan.totals.subtotalAmount;
  const rate = challan.interestTracking.interestRate || 0;
  const interestType = challan.interestTracking.interestType || 'compound';

  return calculateInterest(principal, rate, daysOverdue, interestType);
}

module.exports = {
  calculateItemTotals,
  calculateChallanTotals,
  calculateCompoundInterest,
  calculateSimpleInterest,
  calculateInterest,
  getDaysOverdue,
  calculateChallanInterest,
};