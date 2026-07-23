export const numberToWords = (num) => {
  if (!num || isNaN(num) || Number(num) === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertHundreds = (n) => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str.trim();
  };

  let remainder = Math.floor(Number(num));
  let words = '';

  if (remainder >= 10000000) {
    words += convertHundreds(Math.floor(remainder / 10000000)) + ' Crore ';
    remainder %= 10000000;
  }
  if (remainder >= 100000) {
    words += convertHundreds(Math.floor(remainder / 100000)) + ' Lakh ';
    remainder %= 100000;
  }
  if (remainder >= 1000) {
    words += convertHundreds(Math.floor(remainder / 1000)) + ' Thousand ';
    remainder %= 1000;
  }
  if (remainder > 0) {
    words += convertHundreds(remainder);
  }

  return (words.trim().replace(/\s+/g, ' ') + ' Rupees Only').replace(/\s+/g, ' ');
};

export default numberToWords;
