'use strict';

function parseSms(sender, body, timestamp) {
  try {
    const from = String(sender || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const text = String(body || '').replace(/\s+/g, ' ').trim();
    if (!text || !from || !/(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|CANBNK|CANARA|YESBNK|IDFC|PAYTM|AIRTEL|JIOFIN|FEDBNK|BOB|UNION|INDUS|RBL|AUFB)/i.test(from)) return null;

    if (/\b(OTP|ONE TIME PASSWORD|VERIFICATION CODE)\b/i.test(text)) return null;
    if (/\b(FAILED|FAILURE|UNSUCCESSFUL|SCHEDULED|MANDATE|REMINDER)\b/i.test(text) ||
        /\b(?:transaction|payment|transfer|debit|credit)\s+(?:was\s+)?declined\b|\bdeclined\s+(?:transaction|payment|transfer)\b/i.test(text) ||
        /\bWILL\s+BE\s+DEBITED\b/i.test(text) ||
        /\bREVERSED?[- ]ATTEMPT\b/i.test(text) ||
        /\b(?:PAYMENT\s+REQUEST|REQUEST\s+TO\s+(?:PAY|DEBIT)|PAYMENT\s+DUE|DUE\s+DATE)\b/i.test(text)) return null;

    const balanceMarker = /\b(?:AVAIL(?:ABLE)?\s+BAL(?:ANCE)?(?:\s+IS)?|BAL(?:ANCE)?\s*(?=[:=]|(?:RS\.?|INR|₹)\s)|LIMIT\s*(?=[:=]|(?:RS\.?|INR|₹)\s))/i;
    const balanceMatch = balanceMarker.exec(text);
    const transactionText = balanceMatch ? text.slice(0, balanceMatch.index) : text;

    // "payment" is descriptive, not a debit/credit direction.
    const actionRegex = /\b(debited|debit|credited|credit|spent|paid|sent|withdrawn|withdrawal|withdraw|purchase|refunded|refund|reversed|reversal|deposited|received|transferred|transfer)\b/ig;
    const actions = [...transactionText.matchAll(actionRegex)];
    if (!actions.length) return null;

    const accountMatch = transactionText.match(/\b(?:A\/C|AC|ACCOUNT)\s*(?:NO\.?\s*)?(?:XX|X{1,2}|[*])?\s*\d{3,4}/i);
    let decisionActions = actions;
    if (accountMatch) {
      const afterAccount = actions.filter(a => a.index >= accountMatch.index + accountMatch[0].length &&
        a.index - (accountMatch.index + accountMatch[0].length) <= 90);
      if (afterAccount.length) decisionActions = afterAccount;
    }
    const firstAction = decisionActions[0];
    const actionWord = firstAction[0].toLowerCase();

    const amountPattern = /(?:₹|INR\s*|Rs\.?\s*)([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
    const amounts = [...transactionText.matchAll(amountPattern)].map(m => ({
      value: Number(m[1].replace(/,/g, '')), start: m.index, end: m.index + m[0].length
    }));
    const barePattern = /\b(?:debited\s+(?:by|for)|credited\s+(?:by|with))\s+([0-9][0-9,]*(?:\.\d{1,2})?)/gi;
    for (const m of transactionText.matchAll(barePattern)) {
      amounts.push({value:Number(m[1].replace(/,/g,'')), start:m.index, end:m.index+m[0].length});
    }
    const validAmounts = amounts.filter(a => Number.isFinite(a.value) && a.value > 0);
    if (!validAmounts.length) return null;

    let selected = null;
    let selectedDistance = Infinity;
    for (const candidate of validAmounts) {
      for (const action of decisionActions) {
        const aStart = action.index;
        const aEnd = aStart + action[0].length;
        const distance = candidate.end < aStart ? aStart - candidate.end :
          (aEnd < candidate.start ? candidate.start - aEnd : 0);
        if (distance < selectedDistance) { selected = candidate; selectedDistance = distance; }
      }
    }
    if (!selected || selectedDistance > 90) return null;
    const amount = selected.value;

    const isCardBill = /\b(credit\s*card|card\s*payment|card\s*bill)\b/i.test(text) &&
      /\b(payment|paid|bill|due)\b/i.test(text);
    const isCredit = /^(credited|credit|deposited|received|refund|refunded|reversed|reversal)$/i.test(actionWord);
    const isDebit = /^(debited|debit|spent|paid|sent|withdrawn|withdrawal|withdraw|purchase|transferred)$/i.test(actionWord);
    if (!isCardBill && !isCredit && !isDebit) return null;
    const type = isCardBill ? 'Transfer' : isCredit ? 'Income' : 'Expense';

    const date = parseDate(text, timestamp);
    const accountId = text.match(/(?:A\/C|AC|ACCOUNT|CARD)\s*(?:NO\.?\s*)?[:#-]?\s*(?:XX|X{1,2}|\*)?([0-9]{3,4})\b/i) ||
      text.match(/\b(?:XX|X{1,2}|\*)\s*([0-9]{3,4})\b/i) ||
      text.match(/\b(?:ending|ending with)\s*([0-9]{3,4})\b/i);
    const last4 = accountId ? accountId[1] : '';

    const refMatch = text.match(/\b(?:UPI\s*REF(?:ERENCE)?|UTR|IMPS\s*REF|NEFT\s*UTR|TXN(?:\s*ID)?|REF(?:\s*NO)?|REFNO)[\s:#-]*([A-Z0-9]{3,})\b/i);
    const referenceCandidate = refMatch ? refMatch[1].toUpperCase() : '';
    const reference = /\d/.test(referenceCandidate) ? referenceCandidate : '';

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
      const transfer = text.match(/\b(NEFT|IMPS|RTGS)\b/i);
      channel = transfer ? transfer[1].toUpperCase() : 'Bank';
    }

    let merchant = '';
    const creditFrom = transactionText.match(/\bcredited\b[\s\S]*?\bfrom\s+([A-Z][A-Z0-9 &._-]{1,30}?)(?=[.,;]|\s+(?:call|if|to\s+dispute|ref|upi)\b|$)/i);
    if (creditFrom) merchant = creditFrom[1].trim();
    const pathMerchant = transactionText.match(/\bUPI\/P2M\/\d+\/([A-Z0-9][A-Z0-9 &._-]{1,30}?)(?=\s|$)/i);
    if (pathMerchant) merchant = pathMerchant[1].trim();

    const terminator = '(?:from|via|using|on|ref(?:no|erence)?|utr|upi|txn|avl|available|bal|balance|a/c|ac|card|dated|call|if|to\\s+dispute)';
    const payeePatterns = [
      new RegExp('\\bto\\s+([A-Z0-9][A-Z0-9._@& -]{1,38}?)(?=\\s+' + terminator + '\\b|[.,;]|$)', 'i'),
      new RegExp('\\bat\\s+([A-Z0-9][A-Z0-9._@& -]{1,38}?)(?=\\s+' + terminator + '\\b|[.,;]|$)', 'i'),
      new RegExp('\\bfrom\\s+([A-Z0-9][A-Z0-9._@& -]{1,38}?)(?=\\s+(?:via|using|on|ref|refno|utr|upi|txn|avl|available|bal|balance|a/c|ac|card|dated|call|if|to\\s+dispute)\\b|[.,;]|$)', 'i')
    ];
    if (!merchant) {
      for (const pattern of payeePatterns) {
        const match = transactionText.match(pattern);
        if (match) {
          merchant = match[1].trim().replace(/\s+/g, ' ').replace(/[.,;]+$/, '');
          if (merchant) break;
        }
      }
    }
    if (/^(?:A\/C|AC|ACCOUNT)\s+/i.test(merchant)) merchant = '';
    if (!merchant) {
      const fromMerchant = transactionText.match(/\bfrom\s+(?!A\/C\b|AC\b|ACCOUNT\b)([A-Z0-9][A-Z0-9 &._-]{1,30}?)(?=\s+(?:call|if|to\s+dispute|ref|upi)\b|[.,;]|$)/i);
      if (fromMerchant) merchant = fromMerchant[1].trim();
    }
    if (!merchant) {
      const vpa = transactionText.match(/\b([A-Z0-9._-]+@[A-Z0-9.-]+)\b/i);
      if (vpa) merchant = vpa[1];
    }
    merchant = merchant.replace(/\b(?:REF(?:NO|ERENCE)?|UPI|CALL|IF|TO\s+DISPUTE)\b.*$/i, '')
      .replace(/\b\d{5,}\b.*$/, '').trim();
    if (/^(?:BANK|ACCOUNT|A\/C|CARD|PAYMENT|TRANSACTION|DISPUTE|IF NOT|UNKNOWN)$/i.test(merchant)) merchant = '';
    merchant = merchant.slice(0, 48);

    let category = 'Other';
    if (isCardBill || type === 'Transfer') category = 'Other transfer';
    else if (type === 'Income' && /\b(salary|payroll)\b/i.test(text)) category = 'Salary';
    else if (type === 'Income' && /\b(refund|refunded|reversed|reversal)\b/i.test(transactionText)) category = 'Refund';
    else if (type === 'Income') category = 'Other income';
    else if (emi) category = 'EMI';
    else if (/\b(grocery|groceries|supermarket|bigbasket|blinkit|zepto|dmart|d\s*mart|reliance\s*fresh|more)\b/i.test(text + ' ' + merchant)) category = 'Groceries';
    else if (/\b(food|restaurant|swiggy|zomato|canteen)\b/i.test(text + ' ' + merchant)) category = 'Food';
    else if (/\b(fuel|petrol|diesel|uber|ola|rapido|metro|transport)\b/i.test(text + ' ' + merchant)) category = 'Transport';
    else if (/\b(electricity|water bill|mobile recharge|broadband|utility)\b/i.test(text)) category = 'Utilities';
    else if (/\b(amazon|flipkart|myntra|shopping)\b/i.test(text + ' ' + merchant)) category = 'Shopping';

    const description = [channel, merchant].filter(Boolean).join(' - ') || channel;
    const account = isCardBill ? 'Credit card' : upi ? 'UPI' : atm ? 'Cash' : card ? 'Debit card' : 'Bank transfer';
    const bankName = getBankName(from) || getBankNameFromText(text) || from;

    const timestampDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const timestampMinute = Number.isNaN(timestampDate.getTime()) ? date + 'T00:00' :
      [timestampDate.getFullYear(), String(timestampDate.getMonth()+1).padStart(2,'0'),
       String(timestampDate.getDate()).padStart(2,'0')].join('-') + 'T' +
      String(timestampDate.getHours()).padStart(2,'0') + ':' + String(timestampDate.getMinutes()).padStart(2,'0');
    const fingerprint = reference ? 'ref:' + reference :
      [from, amount.toFixed(2), date, timestampMinute, last4, type, channel, merchant.toLowerCase()].join('|');

    const hasDebitWord = /\b(debited|debit|spent|paid|sent|withdrawn|withdrawal|withdraw|purchase|transferred)\b/i.test(transactionText);
    const hasCreditWord = /\b(credited|credit|deposited|received|refunded|refund)\b/i.test(transactionText);
    const conflictingActions = hasDebitWord && hasCreditWord;
    const junkMerchant = !merchant || /^(?:UNKNOWN|PAYMENT|TRANSACTION|BANK|ACCOUNT|A\/C|DISPUTE|IF NOT)$/i.test(merchant);
    const confidence = (!junkMerchant && !conflictingActions && selectedDistance <= 45 && (isCredit || isDebit || isCardBill)) ? 'high' : 'low';

    return {
      confidence, amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      type, date, description, category, account, bankName,
      sender: from, accountLast4: last4, reference, fingerprint
    };
  } catch (_) {
    return null;
  }
}

function getBankNameFromText(text) {
  const match = String(text || '').match(/\b(HDFC|STATE BANK OF INDIA|SBI|ICICI|AXIS|KOTAK|PUNJAB NATIONAL BANK|PNB|CANARA|IDFC|BANK OF BARODA|BOB|UNION BANK|INDUSIND|RBL)\s+(?:BANK)?\b/i);
  if (!match) return '';
  const key = match[1].toUpperCase();
  if (key === 'STATE BANK OF INDIA' || key === 'SBI') return 'SBI';
  if (key === 'PUNJAB NATIONAL BANK' || key === 'PNB') return 'PNB';
  if (key === 'HDFC') return 'HDFC';
  if (key === 'ICICI') return 'ICICI';
  if (key === 'AXIS') return 'Axis';
  if (key === 'KOTAK') return 'Kotak';
  if (key === 'CANARA') return 'Canara';
  if (key === 'IDFC') return 'IDFC';
  if (key === 'BANK OF BARODA' || key === 'BOB') return 'Bank of Baroda';
  if (key === 'UNION BANK') return 'Union Bank';
  if (key === 'INDUSIND') return 'IndusInd';
  if (key === 'RBL') return 'RBL';
  return '';
}

function getBankName(sender) {
  if (/^(HDFC|HDFCBK)/i.test(sender)) return 'HDFC';
  if (/^(SBI|SBIN)/i.test(sender)) return 'SBI';
  if (/^ICICI/i.test(sender)) return 'ICICI';
  if (/^AXIS/i.test(sender)) return 'Axis';
  if (/^KOTAK/i.test(sender)) return 'Kotak';
  if (/^PNB/i.test(sender)) return 'PNB';
  if (/^(CANBNK|CANARA)/i.test(sender)) return 'Canara';
  if (/^YES/i.test(sender)) return 'Yes Bank';
  if (/^IDFC/i.test(sender)) return 'IDFC';
  if (/^BOB/i.test(sender)) return 'Bank of Baroda';
  if (/^UNION/i.test(sender)) return 'Union Bank';
  if (/^INDUS/i.test(sender)) return 'IndusInd';
  if (/^RBL/i.test(sender)) return 'RBL';
  return '';
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
