export const calculateGrossEarnings = (earnings = {}) => {
  if (!earnings) return 0;
  return Object.values(earnings).reduce((sum, val) => sum + (Number(val) || 0), 0);
};

export const calculateTotalDeductions = (deductions = {}) => {
  if (!deductions) return 0;
  return Object.values(deductions).reduce((sum, val) => sum + (Number(val) || 0), 0);
};

export const calculateNetSalary = (earnings = {}, deductions = {}) => {
  const gross = calculateGrossEarnings(earnings);
  const totalDeductions = calculateTotalDeductions(deductions);
  return Math.max(0, gross - totalDeductions);
};

export default {
  calculateGrossEarnings,
  calculateTotalDeductions,
  calculateNetSalary
};
