'use strict';

function parseSms(sender, body, timestamp) {
  try {
    const from = String(sender || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const text = String(body || '').replace(/\s+/g, ' ').trim();
    if (!text || !from || !/(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|CANBNK|CANARA|YESBNK|IDFC|PAYTM|AIRTEL|JIOFIN|FEDBNK|BOB|UNION|INDUS|RBL|AUFB)/i.test(from)) return null;

    const upper = text.toUpperCase();
    if (/\b(OTP|ONE TIME PASSWORD|VERIFICATION CODE|PROMO|OFFER|CASHBACK OFFER|REWARD POINTS)\b/i.test(upper)) return null;

    const balanceMarker = /\b(?:AVAIL(?:ABLE)?\s+BAL(?:ANCE)?|BAL(?:ANCE)?\s*(?=[:=]|(?:RS\.?|INR|₹)\s)|LIMIT\s*(?=[:=]|(?:RS\.?|INR|₹)\s))/i;
    const balanceMatch = balanceMarker.exec(text);
    const transactionText = balanceMatch ? text.slice(0, balanceMatch.index) : text;
    const actionPattern = /\b(?:debited|debit|credited|credit|spent|paid|payment|withdrawn|withdrawal|withdraw|purchase|refunded|refund|reversed|reversal|deposited|received|transferred|transfer)\b/ig;
    const actions = [...transactionText.matchAll(actionPattern)];
    if (!actions.length) return null;

    const amountPattern = /(?:₹|INR\s*|Rs\.?\s*)([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
    const amounts = [...transactionText.matchAll(amountPattern)].map(match => ({
      value: Number(match[1].replace(/,/g, '')),
      start: match.index,
      end: match.index + match[0].length
    })).filter(item => Number.isFinite(item.value) && item.value > 0);
    if (!amounts.length) return null;

    let selected = null;
    let selectedDistance = Infinity;
    for (const candidate of amounts) {
      for (const action of actions) {
        const actionStart = action.index;
        const actionEnd = actionStart + action[0].length;
        const distance = candidate.end < actionStart ? actionStart - candidate.end :
          (actionEnd < candidate.start ? candidate.start - actionEnd : 0);
        if (distance < selectedDistance) {
          selected = candidate;
          selectedDistance = distance;
        }
      }
    }
    if (!selected || selectedDistance > 80) return null;
    const amount = selected.value;

    const isCardBill = /\b(credit\s*card|card\s*payment|card\s*bill)\b/i.test(text) &&
      /\b(payment|paid|bill|due)\b/i.test(text);
    const isRefund = /\b(refund|refunded|reversed|reversal)\b/i.test(transactionText);
    const isCredit = /\b(credited|credit|deposited|received|refund|refunded|reversed|reversal)\b/i.test(transactionText);
    const isDebit = /\b(debited|debit|spent|paid|withdrawn|withdrawal|withdraw|purchase|transferred)\b/i.test(transactionText);
    if (!isCardBill && isCredit === isDebit) return null;

    let type;
    if (isCardBill) type = 'Transfer';
    else if (isCredit) type = 'Income';
    else type = 'Expense';

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
    let channel;
    if (isCardBill) channel = 'Credit card bill';
    else if (upi) channel = 'UPI';
    else if (atm) channel = 'ATM';
    else if (emi) channel = 'EMI';
    else if (card) channel = 'Card';
    else {
      const bankTransfer = text.match(/\b(NEFT|IMPS|RTGS)\b/i);
      channel = bankTransfer ? bankTransfer[1].toUpperCase() : 'Bank';
    }

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
    if (isCardBill || type === 'Transfer') category = 'Other transfer';
    else if (type === 'Income' && /\b(salary|payroll)\b/i.test(text)) category = 'Salary';
    else if (type === 'Income' && isRefund) category = 'Refund';
    else if (type === 'Income') category = 'Other income';
    else if (emi) category = 'EMI';
    else if (/\b(grocery|groceries|supermarket|bigbasket|blinkit|zepto|dmart|d\s*mart|reliance\s*fresh|more)\b/i.test(text + ' ' + merchant)) category = 'Groceries';
    else if (/\b(food|restaurant|swiggy|zomato|canteen)\b/i.test(text + ' ' + merchant)) category = 'Food';
    else if (/\b(fuel|petrol|diesel|uber|ola|rapido|metro|transport)\b/i.test(text + ' ' + merchant)) category = 'Transport';
    else if (/\b(electricity|water bill|mobile recharge|broadband|utility)\b/i.test(text)) category = 'Utilities';
    else if (/\b(amazon|flipkart|myntra|shopping)\b/i.test(text + ' ' + merchant)) category = 'Shopping';

    const description = [channel, merchant].filter(Boolean).join(' - ') || channel;
    let account;
    if (isCardBill) account = 'Credit card';
    else if (upi) account = 'UPI';
    else if (atm) account = 'Cash';
    else if (card) account = 'Debit card';
    else account = 'Bank transfer';
    const fingerprint = reference ? 'ref:' + reference :
      [from, amount.toFixed(2), date, last4, type, channel, merchant.toLowerCase()].join('|');

    return {
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      type, date, description, category, account, sender: from,
      accountLast4: last4, reference, fingerprint
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
