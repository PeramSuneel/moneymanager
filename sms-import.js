'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.MoneyManagerSmsImport = api;
    if (root.document) {
      const start = () => api.initSmsImportUI();
      if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start);
      else start();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const PROCESSED_KEY = 'moneyManagerSmsProcessed.v1';
  const REVIEW_KEY = 'moneyManagerSmsNeedsReview.v1';
  const VALID_CATEGORIES = new Set([
    'Food','Groceries','Transport','Shopping','Bills','Rent','Health','Education','EMI',
    'Salary','Investment','Family','Travel','Other','Entertainment','Personal care',
    'Utilities','Business income','Interest','Dividend','Refund','Gift','Other income',
    'Bank transfer','Wallet transfer','Cash deposit','Cash withdrawal','Other transfer'
  ]);

  function readList(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function createSmsImport({ storage, bridge, now = () => new Date().toISOString() } = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('SMS import requires browser storage for its own metadata.');
    }
    if (!bridge || typeof bridge.addBatch !== 'function') {
      throw new TypeError('MoneyManagerSms.addBatch is not available.');
    }

    function addParsedSmsTransactions(list) {
      const processed = new Set(readList(storage, PROCESSED_KEY).map(String));
      const review = readList(storage, REVIEW_KEY);
      const high = [];
      let reviewAdded = 0, duplicates = 0, ignored = 0;
      for (const item of Array.isArray(list) ? list : []) {
        if (!item || !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0) { ignored++; continue; }
        const fingerprint = String(item.fingerprint || [
          item.sender || '', item.date || '', item.type || '', item.amount || '',
          item.description || ''
        ].join('|'));
        if (processed.has(fingerprint)) { duplicates++; continue; }
        processed.add(fingerprint);
        const normalized = {
          ...item,
          fingerprint,
          category: VALID_CATEGORIES.has(item.category) ? item.category : 'Other',
          account: item.bankName && item.accountLast4
            ? String(item.bankName) + ' ••' + String(item.accountLast4).replace(/\D/g, '').slice(-4)
            : String(item.account || 'Other')
        };
        if (item.confidence === 'high') high.push(normalized);
        else {
          review.push({ ...normalized, addedToReviewAt: now() });
          reviewAdded++;
        }
      }
      let added = 0;
      if (high.length) added = Number(bridge.addBatch(high)) || 0;
      storage.setItem(PROCESSED_KEY, JSON.stringify([...processed]));
      if (reviewAdded) storage.setItem(REVIEW_KEY, JSON.stringify(review));
      return { added, review: reviewAdded, duplicates, ignored };
    }

    return { addParsedSmsTransactions };
  }

  function parseSmsBlocks(source, parser, timestamp = new Date()) {
    if (typeof parser !== 'function') throw new TypeError('SMS parser is unavailable.');
    return String(source || '').split(/\n\s*\n+/).map(block => block.trim()).filter(Boolean).map(block => {
      const lines = block.split(/\r?\n/);
      let sender = '', body = block;
      const senderLine = lines[0].match(/^(?:sender\s*:\s*)?([A-Z0-9-]{4,15})\s*:?$/i);
      const inline = lines[0].match(/^([A-Z0-9-]{4,15})\s*:\s*(.+)$/i);
      if (senderLine) { sender = senderLine[1]; body = lines.slice(1).join(' ').trim(); }
      else if (inline) { sender = inline[1]; body = [inline[2], ...lines.slice(1)].join(' ').trim(); }
      if (!sender || !body) return null;
      return parser(sender, body, timestamp);
    }).filter(Boolean);
  }

  function initSmsImportUI() {
    if (typeof document === 'undefined' || !root.MoneyManagerSms || !root.MoneyManagerSmsImport) return;
    const textarea = document.getElementById('smsPasteInput');
    const button = document.getElementById('smsPasteImport');
    const status = document.getElementById('smsPasteStatus');
    const reviewCount = document.getElementById('smsReviewCount');
    if (!textarea || !button || !status) return;
    const parser = root.parseSms;
    const importer = createSmsImport({ storage: root.localStorage, bridge: root.MoneyManagerSms });
    const updateReviewCount = () => {
      const count = readList(root.localStorage, REVIEW_KEY).length;
      if (reviewCount) reviewCount.textContent = String(count);
    };
    button.addEventListener('click', () => {
      try {
        const parsed = parseSmsBlocks(textarea.value, parser, new Date());
        const result = importer.addParsedSmsTransactions(parsed);
        status.textContent = 'Imported: ' + result.added + ' · Needs review: ' + result.review +
          ' · Duplicates skipped: ' + result.duplicates + ' · Ignored: ' + result.ignored;
        updateReviewCount();
      } catch (error) {
        status.textContent = 'Import could not be completed: ' + error.message;
      }
    });
    updateReviewCount();
  }

  return { createSmsImport, parseSmsBlocks, initSmsImportUI, PROCESSED_KEY, REVIEW_KEY };
});

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSmsImportUI);
  else initSmsImportUI();
}
