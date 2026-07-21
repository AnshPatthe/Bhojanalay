export const formatCurrency = (value, currencyCode = 'USD') => {
  const code = (currencyCode || 'USD').toUpperCase();
  const options = {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  try {
    return new Intl.NumberFormat('en-US', options).format(value);
  } catch (e) {
    return `${code} ${Number(value).toFixed(2)}`;
  }
};

export default formatCurrency;
