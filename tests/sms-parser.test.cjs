'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const parseSms = require('../sms-parser.js');

const at = new Date('2026-11-11T10:30:00+05:30');
const cases = [
  ['HDFCBK', 'Rs. 450.00 debited from A/c XX1234 via UPI to SWIGGY. UPI Ref 612345678901.', 'Expense', 'UPI', 450, 'Food'],
  ['SBIINB', 'Your A/c XX4321 debited by INR 1,250.50 on 11-11-2026 for UPI payment to ZOMATO. UPI Ref 712345678901.', 'Expense', 'UPI', 1250.5, 'Food'],
  ['ICICIB', 'INR 2,000.00 spent using UPI at BIGBASKET from A/c XX9876. UPI Ref 812345678901.', 'Expense', 'UPI', 2000, 'Groceries'],
  ['AXISBK', 'UPI txn: Rs 299 debited from A/c XX1122 to UBER. UPI Ref 912345678901.', 'Expense', 'UPI', 299, 'Transport'],
  ['KOTAKB', 'Rs. 1,25,000.50 debited via UPI to merchant@okaxis from account XX5566. UPI Ref 123456789012.', 'Expense', 'UPI', 125000.5, 'Other'],
  ['PNBSMS', 'INR 75.00 paid via UPI to TEA SHOP from A/c XX3333. UPI Ref 223456789012.', 'Expense', 'UPI', 75, 'Other'],
  ['CANBNK', 'Your account XX7788 is debited for Rs. 3,499.00 at AMAZON using debit card.', 'Expense', 'Card', 3499, 'Shopping'],
  ['YESBNK', 'INR 899.00 spent on POS at DMART using card ending 4455.', 'Expense', 'Card', 899, 'Groceries'],
  ['IDFCFB', 'Rs 1,799.00 debited for e-commerce purchase at MYNTRA on card XX6677.', 'Expense', 'Card', 1799, 'Shopping'],
  ['HDFCBK', 'ATM cash withdrawal of Rs. 5,000 from A/c XX1234.', 'Expense', 'ATM', 5000, 'Other'],
  ['SBIINB', 'Your A/c XX4321 debited with INR 2,000.00 for ATM withdrawal.', 'Expense', 'ATM', 2000, 'Other'],
  ['ICICIB', 'INR 25,000.00 credited to A/c XX1234 through NEFT from ABC PRIVATE LTD. UTR N123456789012.', 'Income', 'NEFT', 25000, 'Other income'],
  ['AXISBK', 'Rs. 8,500 credited to account XX2233 via IMPS from RAHUL. IMPS Ref 323456789012.', 'Income', 'IMPS', 8500, 'Other income'],
  ['KOTAKB', 'INR 1,20,000.00 received through NEFT in A/c XX1111. UTR K123456789012.', 'Income', 'NEFT', 120000, 'Other income'],
  ['PNBSMS', 'Salary of Rs 65,000.00 credited to your A/c XX9876.', 'Income', 'Bank', 65000, 'Salary'],
  ['CANBNK', 'Your salary Rs. 72,500 credited in account XX5566.', 'Income', 'Bank', 72500, 'Salary'],
  ['YESBNK', 'EMI of Rs 12,450.00 debited from A/c XX7654 towards loan repayment.', 'Expense', 'EMI', 12450, 'EMI'],
  ['IDFCFB', 'Rs. 8,999 debited towards EMI from your account XX6789.', 'Expense', 'EMI', 8999, 'EMI'],
  ['HDFCBK', 'Refund of Rs. 499.00 credited to A/c XX1234 by AMAZON.', 'Income', 'Bank', 499, 'Refund'],
  ['SBIINB', 'INR 1,250.00 reversed and credited to account XX4321. Refund for order.', 'Income', 'Bank', 1250, 'Refund'],
  ['ICICIB', 'Payment of Rs 15,000.00 received towards your ICICI Credit Card bill.', 'Transfer', 'Credit card bill', 15000, 'Other transfer'],
  ['AXISBK', 'Your credit card payment of INR 4,500.00 has been paid successfully.', 'Transfer', 'Credit card bill', 4500, 'Other transfer'],
  ['KOTAKB', 'UPI payment of Rs 1,25,000.50 debited from A/c XX5566 to merchant@okaxis. UPI Ref 423456789012.', 'Expense', 'UPI', 125000.5, 'Other'],
  ['HDFCBK', 'Rs. 1,000.00 debited from A/c XX1234 to ELECTRICITY BILL via net banking.', 'Expense', 'Bank', 1000, 'Utilities'],
  ['SBIINB', 'Rs 350.00 debited from A/c XX4321 for SWIGGY order.', 'Expense', 'Bank', 350, 'Food'],
  ['ICICIB', 'INR 2,500.00 credited to A/c XX1234 from client payment.', 'Income', 'Bank', 2500, 'Other income']
];

for (const [sender, body, type, channel, amount, category] of cases) {
  test('parses ' + sender + ' SMS: ' + body.slice(0, 48), () => {
    const result = parseSms(sender, body, at);
    assert.ok(result, 'expected a transaction candidate');
    assert.equal(result.type, type);
    assert.equal(result.amount, amount);
    assert.equal(result.category, category);
    assert.ok(result.description.startsWith(channel));
    assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
  });
}

const ignored = [
  ['HDFCBK', 'Your OTP for net banking is 123456. Do not share it.'],
  ['SBIINB', 'Special festive offer! Get 10% cashback on shopping.'],
  ['ICICIB', 'Your account balance is INR 45,678.90.'],
  ['AXISBK', 'Available balance in A/c XX1234 is Rs 10,000.'],
  ['KOTAKB', 'Dear customer, enjoy reward points and exclusive offers.'],
  ['PAYTMB', 'Your verification code is 456789.'],
  ['UNKNOWN', 'Rs 500 debited from account XX1234 to merchant.'],
  ['HDFCBK', 'Your transaction alert: payment processed successfully.']
];
for (const [sender, body] of ignored) {
  test('ignores non-transaction SMS: ' + body.slice(0, 42), () => {
    assert.equal(parseSms(sender, body, at), null);
  });
}

test('same SMS produces the same fingerprint for persistent duplicate checks', () => {
  const body = 'Rs. 450.00 debited from A/c XX1234 via UPI to SWIGGY. UPI Ref 612345678901.';
  const first = parseSms('HDFCBK', body, at);
  const importedAgain = parseSms('HDFCBK', body, at);
  assert.ok(first);
  assert.equal(first.fingerprint, importedAgain.fingerprint);
  assert.equal(first.reference, '612345678901');
});

test('uses SMS timestamp when body has no calendar date', () => {
  const result = parseSms('HDFCBK', 'Rs 99 debited from A/c XX1234 via UPI to TEA SHOP. UPI Ref 523456789012.', at);
  assert.equal(result.date, '2026-11-11');
});

test('returns null for malformed input without throwing', () => {
  assert.equal(parseSms(null, null, null), null);
  assert.equal(parseSms('HDFCBK', 'Rs. NaN debited from A/c XX1234', at), null);
});
