'use strict';

/**
 * Pure parser for Indian bank / UPI transaction SMS.
 * @param {string} sender SMS sender ID (for example HDFCBK or SBIINB).
 * @param {string} body SMS text.
 * @param {number|string|Date} timestamp SMS timestamp.
 * @returns {object|null} Normalized transaction candidate, or null when not financial.
 */
function parseSms(sender, body, timestamp) {
  try {
    const from = String(sender || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const text = String(body || '').replace(/\s+/g, ' ').trim();
    if (!text || !from || !/(HDFC|HDFCBK|SBI|SBIN|ICICI|ICICIB|AXIS|AXISBK|KOTAK|PNB|PNBSMS|CANBNK|CANARA|YESBNK|IDFC|IDFCFB|PAYTM|AIRTEL|JIOFIN|FEDBNK|BOB|UNION|INDUS|RBL|AUFB)/i.test(from)) return null;

    const upper = text.toUpperCase();
    if (/\b(OTP|ONE TIME PASSWORD|VERIFICATION CODE|PROMO|OFFER|CASHBACK OFFER|REWARD POINTS|AVAILABLE BALANCE|AVAIL BAL|BALANCE IS|BALANCE:|MINIMUM BALANCE)\b/i.test(upper)) return null;
    if (/\b(credited|deposited|received|debited|spent|paid|withdrawn|purchase|refund|reversed|transferred|transfer)\b/i.test(upper) === false) return null;

    const amountMatches = [...text.matchAll(/(?:₹|INR\s*|Rs\.?\s*)([0-9][0-9,]*(?:\.\d{1,2})?)/gi)];
    if (amountMatches.length !== 1) return null;
    const amount = Number(amountMatches[0][1].replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const isCardBill = /\b(credit\s*card|card\s*payment|card\s*bill)\b/i.test(text) &&
      /\b(payment|paid|bill|due)\b/i.test(text);
    const isRefund = /\b(refund|reversed|reversal)\b/i.test(text);
    const isCredit = /\b(credited|deposited|received|refund|reversed|reversal)\b/i.test(text);
    const isDebit = /\b(debited|spent|paid|withdrawn|purchase|transferred)\b/i.test(text);
    if (!isCardBill && isCredit === isDebit) return null;

    const type = isCardBill ? 'Transfer' : (isCredit ? 'Income' : 'Expense');
    const date = parseDate(text, timestamp);
    const last4Match = text.match(/(?:A\/C|AC|ACCOUNT|CARD|XX|X{2,})\s*[:#-]?\s*(?:XX|X{2,})?([0-9]{4})\b/i) ||
      text.match(/\b(?:ending|ending with)\s*([0-9]{4})\b/i);
    const last4 = last4Match ? last4Match[1] : '';
    const refMatch = text.match(/\b(?:UPI\s*REF(?:ERENCE)?|UTR|IMPS\s*REF|NEFT\s*UTR|TXN(?:\s*ID)?|REF(?:\s*NO)?)[\s:#-]*([A-Z0-9]{6,})\b/i);
    const reference = refMatch ? refMatch[1].toUpperCase() : '';

    const upi = /\bUPI\b/i.test(text);
    const atm = /\bATM\b|cash\s+withdraw/i.test(text);
    const card = /\b(card|POS|e-?com|purchase)\b/i.test(text);
    const emi = /\bEMI\b/i.test(text);
    const channel = isCardBill ? 'Credit card bill' : (upi ? 'UPI' : (atm ? 'ATM' : (emi ? 'EMI' : (card ? 'Card' : (/\b(NEFT|IMPS|RTGS)\b/i.test(text) ? text.match(/\b(NEFT|IMPS|RTGS)\b/i)[1].toUpperCase() : 'Bank'))));

    let merchant = '';
    const merchantPatterns = [
      /(?:to|at|for|from)\s+([A-Z0-9][A-Z0-9 .&@_-]{1,38}?)(?=\s+(?:on|ref|utr|upi|via|from|using|avl|available|bal|balance|a\/c|ac|card|txn|dated)\b|[.,;]|$)/i,
      /VPA\s*[:=-]?\s*([A-Z0-9._-]+@[A-Z0-9.-]+)/i
    ];
    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        merchant = match[1].trim().replace(/\s+/g, ' ').replace(/[.,;]+$/, '');
        if (/^(your account|a\/c|account|card|bank)$/i.test(merchant)) merchant = '';
        if (merchant) break;
      }
    }
    if (!merchant) {
      const vpa = text.match(/\b([A-Z0-9._-]+@[A-Z0-9.-]+)\b/i);
      if (vpa) merchant = vpa[1];
    }
    merchant = merchant.slice(0, 48);

    let category = 'Other';
    if (isCardBill) category = 'Other transfer';
    else if (type === 'Transfer') category = 'Other transfer';
    else if (type === 'Income' && /\b(salary|payroll)\b/i.test(text)) category = 'Salary';
    else if (type === 'Income' && isRefund) category = 'Refund';
    else if (type === 'Income') category = 'Other income';
    else if (emi) category = 'EMI';
    else if (/\b(grocery|groceries|supermarket|bigbasket|blinkit|zepto)\b/i.test(text + ' ' + merchant)) category = 'Groceries';
    else if (/\b(food|restaurant|swiggy|zomato|canteen)\b/i.test(text + ' ' + merchant)) category = 'Food';
    else if (/\b(fuel|petrol|diesel|uber|ola|rapido|metro|transport)\b/i.test(text + ' ' + merchant)) category = 'Transport';
    else if (/\b(electricity|water bill|mobile recharge|broadband|utility)\b/i.test(text)) category = 'Utilities';
    else if (/\b(amazon|flipkart|myntra|shopping)\b/i.test(text + ' ' + merchant)) category = 'Shopping';
    else if (atm) category = 'Other';
    
    const description = [channel, merchant].filter(Boolean).join(' - ') || channel;
    const account = isCardBill ? 'Credit card' : (upi ? 'UPI' : (atm ? 'Cash' : (card ? 'Debit card' : 'Bank transfer')));
    const fingerprint = reference
      ? 'ref:' + reference
      : [from, amount.toFixed(2), date, last4, type, channel, merchant.toLowerCase()].join('|');

    return {
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      type,
      date,
      description,
      category,
      account,
      sender: from,
      accountLast4: last4,
      reference,
      fingerprint
    };
  } catch (_) {
    return null;
  }
}

function parseDate(text, timestamp) {
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return iso[1] + '-' + String(iso[2]).padStart(2, '0') + '-' + String(iso[3]).padStart(2, '0');
  const local = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (local) {
    const year = local[3].length === 2 ? '20' + local[3] : local[3];
    return year + '-' + String(local[2]).padStart(2, '0') + '-' + String(local[1]).padStart(2, '0');
  }
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (!Number.isNaN(d.getTime())) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  return null;
}

module.exports = parseSms;
module.exports.parseSms = parseSms;
