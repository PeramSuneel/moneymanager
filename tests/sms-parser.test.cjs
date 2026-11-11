'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const parseSms = require('../sms-parser.js');
const at = new Date('2026-11-11T10:30:00+05:30');
const cases = [
  ['HDFCBK','Rs. 450.00 debited from A/c XX1234 via UPI to SWIGGY. UPI Ref 612345678901.','Expense','UPI',450,'Food'],
  ['SBIINB','Your A/c XX4321 debited by INR 1,250.50 on 11-11-2026 for UPI payment to ZOMATO. UPI Ref 712345678901.','Expense','UPI',1250.5,'Food'],
  ['ICICIB','INR 2,000.00 spent using UPI at BIGBASKET from A/c XX9876. UPI Ref 812345678901.','Expense','UPI',2000,'Groceries'],
  ['AXISBK','UPI txn: Rs 299 debited from A/c XX1122 to UBER. UPI Ref 912345678901.','Expense','UPI',299,'Transport'],
  ['KOTAKB','Rs. 1,25,000.50 debited via UPI to merchant@okaxis from account XX5566. UPI Ref 123456789012.','Expense','UPI',125000.5,'Other'],
  ['PNBSMS','INR 75.00 paid via UPI to TEA SHOP from A/c XX3333. UPI Ref 223456789012.','Expense','UPI',75,'Other'],
  ['CANBNK','Your account XX7788 is debited for Rs. 3,499.00 at AMAZON using debit card.','Expense','Card',3499,'Shopping'],
  ['YESBNK','INR 899.00 spent on POS at DMART using card ending 4455.','Expense','Card',899,'Groceries'],
  ['IDFCFB','Rs 1,799.00 debited for e-commerce purchase at MYNTRA on card XX6677.','Expense','Card',1799,'Shopping'],
  ['HDFCBK','ATM cash withdrawal of Rs. 5,000 from A/c XX1234.','Expense','ATM',5000,'Other'],
  ['SBIINB','Your A/c XX4321 debited with INR 2,000.00 for ATM withdrawal.','Expense','ATM',2000,'Other'],
  ['ICICIB','INR 25,000.00 credited to A/c XX1234 through NEFT from ABC PRIVATE LTD. UTR N123456789012.','Income','NEFT',25000,'Other income'],
  ['AXISBK','Rs. 8,500 credited to account XX2233 via IMPS from RAHUL. IMPS Ref 323456789012.','Income','IMPS',8500,'Other income'],
  ['KOTAKB','INR 1,20,000.00 received through NEFT in A/c XX1111. UTR K123456789012.','Income','NEFT',120000,'Other income'],
  ['PNBSMS','Salary of Rs 65,000.00 credited to your A/c XX9876.','Income','Bank',65000,'Salary'],
  ['CANBNK','Your salary Rs. 72,500 credited in account XX5566.','Income','Bank',72500,'Salary'],
  ['YESBNK','EMI of Rs 12,450.00 debited from A/c XX7654 towards loan repayment.','Expense','EMI',12450,'EMI'],
  ['IDFCFB','Rs. 8,999 debited towards EMI from your account XX6789.','Expense','EMI',8999,'EMI'],
  ['HDFCBK','Refund of Rs. 499.00 credited to A/c XX1234 by AMAZON.','Income','Bank',499,'Refund'],
  ['SBIINB','INR 1,250.00 reversed and credited to account XX4321. Refund for order.','Income','Bank',1250,'Refund'],
  ['ICICIB','Payment of Rs 15,000.00 received towards your ICICI Credit Card bill.','Transfer','Credit card bill',15000,'Other transfer'],
  ['AXISBK','Your credit card payment of INR 4,500.00 has been paid successfully.','Transfer','Credit card bill',4500,'Other transfer'],
  ['KOTAKB','UPI payment of Rs 1,25,000.50 debited from A/c XX5566 to merchant@okaxis. UPI Ref 423456789012.','Expense','UPI',125000.5,'Other'],
  ['HDFCBK','Rs. 1,000.00 debited from A/c XX1234 to ELECTRICITY BILL via net banking.','Expense','Bank',1000,'Utilities'],
  ['SBIINB','Rs 350.00 debited from A/c XX4321 for SWIGGY order.','Expense','Bank',350,'Food'],
  ['ICICIB','INR 2,500.00 credited to A/c XX1234 from client payment.','Income','Bank',2500,'Other income'],
  ['HDFCBK','UPI: Rs 425.00 debited from A/c XX1234 to DMART. UPI Ref 623456789001. Avl Bal: Rs 18,575.25','Expense','UPI',425,'Groceries'],
  ['SBIINB','INR 1,250.00 spent via UPI at SWIGGY. Available balance is INR 22,500.00.','Expense','UPI',1250,'Food'],
  ['ICICIB','Rs. 2,899.00 debited on card ending 4455 at RELIANCE FRESH. Avl Bal Rs 45,000.00; Limit Rs 1,00,000.00','Expense','Card',2899,'Groceries'],
  ['AXISBK','Your account XX1122 is debited by Rs 799.00 for purchase at MORE. Available Balance: Rs 9,201.00','Expense','Card',799,'Groceries'],
  ['KOTAKB','NEFT credit of INR 35,000.00 received in A/c XX7788. UTR K123456789099. Avl Bal: INR 50,000.00','Income','NEFT',35000,'Other income'],
  ['PNBSMS','Rs 12,500.00 credited via IMPS to A/c XX3333 from employer. Bal Rs 42,500.00','Income','IMPS',12500,'Other income'],
  ['CANBNK','ATM withdrawal of Rs 3,000.00 from A/c XX1234. Available balance Rs 7,000.00','Expense','ATM',3000,'Other'],
  ['YESBNK','Rs 6,499.00 debited for card purchase at AMAZON. Avl Bal: Rs 13,501.00','Expense','Card',6499,'Shopping'],
  ['IDFCFB','UPI payment Rs 99.00 paid to TEA SHOP from A/c XX6789; Avl Bal Rs 4,901.00','Expense','UPI',99,'Other'],
  ['HDFCBK','NEFT Rs 1,25,000.00 credited to account XX9876. Available balance: Rs 2,25,000.00','Income','NEFT',125000,'Other income']
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
  ['HDFCBK','Your OTP for net banking is 123456. Do not share it.'],
  ['SBIINB','Special festive offer! Get 10% cashback on shopping.'],
  ['ICICIB','Your account balance is INR 45,678.90.'],
  ['AXISBK','Available balance in A/c XX1234 is Rs 10,000.'],
  ['KOTAKB','Dear customer, enjoy reward points and exclusive offers.'],
  ['PAYTMB','Your verification code is 456789.'],
  ['UNKNOWN','Rs 500 debited from account XX1234 to merchant.'],
  ['HDFCBK','Your transaction alert: payment processed successfully.'],
  ['HDFCBK','Avl Bal: Rs 12,500.00; Limit Rs 50,000.00']
];
for (const [sender, body] of ignored) test('ignores non-transaction SMS: ' + body.slice(0, 42), () => assert.equal(parseSms(sender, body, at), null));
test('same SMS produces the same fingerprint for persistent duplicate checks', () => {
  const body = 'Rs. 450.00 debited from A/c XX1234 via UPI to SWIGGY. UPI Ref 612345678901.';
  const first = parseSms('HDFCBK', body, at);
  const again = parseSms('HDFCBK', body, at);
  assert.ok(first); assert.equal(first.fingerprint, again.fingerprint); assert.equal(first.reference, '612345678901');
});
test('uses SMS timestamp when body has no calendar date', () => {
  const result = parseSms('HDFCBK', 'Rs 99 debited from A/c XX1234 via UPI to TEA SHOP. UPI Ref 523456789012.', at);
  assert.equal(result.date, '2026-11-11');
});
test('returns null for malformed input without throwing', () => {
  assert.equal(parseSms(null, null, null), null);
  assert.equal(parseSms('HDFCBK', 'Rs. NaN debited from A/c XX1234', at), null);
});

const accuracyCases = [
  ['HDFCBK','Your A/c XX1234 transaction failed. Rs 350 debited.','reject'],
  ['SBIINB','Your account XX1234 debit unsuccessful for Rs 350.','reject'],
  ['ICICIB','Your payment was declined. Rs 350 debited from A/c XX1234.','reject'],
  ['AXISBK','Transaction reversed-attempt for Rs 350 from A/c XX1234.','reject'],
  ['KOTAKB','Rs 350 will be debited from your A/c XX1234.','reject'],
  ['PNBSMS','Rs 350 debit scheduled from A/c XX1234.','reject'],
  ['CANBNK','Mandate for Rs 350 from A/c XX1234 is active.','reject'],
  ['YESBNK','Your EMI payment request/reminder is due for Rs 350 from A/c XX1234.','reject'],
  ['HDFCBK','Your A/c XX1234 debited by 350.0 via UPI to TEA SHOP.','amount'],
  ['SBIINB','Your A/c XX4321 credited by 12,500 via NEFT from EMPLOYER.','amount'],
  ['ICICIB','A/c XX1234 debited Rs 700 and credited Rs 700 as reversal.','mixed'],
  ['AXISBK','Your transaction declined. Ref DECLINED. Rs 200 debited from A/c XX1234.','ref'],
  ['KOTAKB','Rs 200 debited from A/c XX1234 at DMART.','fingerprint'],
  ['PNBSMS','Rs 450 debited from A/c XX1234 via UPI to SWIGGY.','account'],
  ['CANBNK','Your A/c XX1234 debited Rs 499 for subscription payment to NETFLIX.','description']
];
for (const [sender, body, kind] of accuracyCases) {
  test('parser accuracy: ' + kind + ' — ' + body.slice(0, 38), () => {
    const result = parseSms(sender, body, at);
    if (kind === 'reject') {
      assert.equal(result, null);
    } else if (kind === 'amount') {
      assert.ok(result);
      assert.ok(result.amount > 0);
    } else if (kind === 'mixed') {
      assert.ok(result);
      assert.equal(result.type, 'Expense');
    } else if (kind === 'ref') {
      assert.ok(result);
      assert.ok(!result.reference || /\\d/.test(result.reference));
    } else if (kind === 'fingerprint') {
      const same = parseSms(sender, body, at);
      const nextMinute = parseSms(sender, body, new Date('2026-11-11T10:31:00+05:30'));
      assert.ok(result);
      assert.equal(result.fingerprint, same.fingerprint);
      assert.notEqual(result.fingerprint, nextMinute.fingerprint);
    } else if (kind === 'account') {
      assert.ok(result);
      assert.equal(result.bankName, 'PNB');
      assert.equal(result.accountLast4, '1234');
      assert.match(result.description, /^UPI\\s-\\sSWIGGY$/);
    } else if (kind === 'description') {
      assert.ok(result);
      assert.doesNotMatch(result.description, /mandate|your|UPI to/i);
      assert.match(result.description, /^Bank\\s-\\sNETFLIX$/);
    }
  });
}


// Step 2c regressions and safety coverage.
const step2cCases = [
  ['KOTAKB','UPI payment of Rs 1,25,000.50 debited from A/c XX5566 to merchant@okaxis. UPI Ref 423456789012.','Expense',125000.5,'Kotak','5566'],
  ['ICICIB','INR 2,500.00 credited to A/c XX1234 from client payment.','Income',2500,'ICICI','1234'],
  ['IDFCFB','UPI payment Rs 99.00 paid to TEA SHOP from A/c XX1111. UPI Ref 723456789012.','Expense',99,'IDFC','1111'],
  ['HDFCBK','Sent Rs.450.00 From HDFC Bank A/C *1234 To SWIGGY On 11/11/26 Ref 612345678901','Expense',450,'HDFC','1234'],
  ['KOTAKB','Sent Rs.250.00 from Kotak Bank AC X7788 to merchant@ybl','Expense',250,'Kotak','7788'],
  ['HDFCBK','Rs 100 debited from A/c XX1234 to FOO. UPI Ref 823456789012. Offer: get Rs 500 cashback','Expense',100,'HDFC','1234'],
  ['HDFCBK','Rs 200 debited from A/c XX1234 trf to RAMESH Refno 612345678903','Expense',200,'HDFC','1234'],
  ['HDFCBK','UPI/P2M/612345678905/ZOMATO SMS BLOCKUPI payment Rs 300 debited from A/c XX1234','Expense',300,'HDFC','1234'],
  ['ICICIB','Rs 500 credited to A/c XX1234 from ZEPTO. Call 1800 to dispute','Income',500,'ICICI','1234'],
  ['HDFCBK','Rs 50 debited from A/c XX123 to TEA SHOP. UPI Ref 923456789012.','Expense',50,'HDFC','123'],
  ['HDFCBK','Rs 60 debited from A/c X4321 to TEA SHOP. UPI Ref 923456789013.','Expense',60,'HDFC','4321'],
  ['HDFCBK','Rs 70 debited from A/c *1234 to TEA SHOP. UPI Ref 923456789014.','Expense',70,'HDFC','1234']
];
for (const [sender, body, type, amount, bank, last4] of step2cCases) {
  test('Step 2c real-world SMS: ' + body.slice(0, 52), () => {
    const result = parseSms(sender, body, at);
    assert.ok(result, 'expected a transaction candidate');
    assert.equal(result.type, type);
    assert.equal(result.amount, amount);
    assert.equal(result.bankName, bank);
    assert.equal(result.accountLast4, last4);
    assert.ok(['high','low'].includes(result.confidence));
  });
}
test('Step 2c: promo-only SMS remains ignored', () => {
  assert.equal(parseSms('HDFCBK', 'Special offer: get Rs 500 cashback on shopping. PROMO', at), null);
});
test('Step 2c: reference containing DECLINED is not accepted without a digit', () => {
  const result = parseSms('AXISBK', 'Rs 200 debited from A/c XX1234. Ref DECLINED.', at);
  assert.ok(result);
  assert.equal(result.reference, '');
});
test('Step 2c: bank name uses sender ID before text fallback', () => {
  const result = parseSms('HDFCBK', 'Rs 200 debited from A/c XX1234 at SHOP. Ref 123456789012. PNB transfer partner.', at);
  assert.equal(result.bankName, 'HDFC');
});
test('Step 2c: merchant extraction stops at reference and operational text', () => {
  const a = parseSms('HDFCBK', 'Rs 200 debited from A/c XX1234 trf to RAMESH Refno 612345678903', at);
  const b = parseSms('HDFCBK', 'UPI/P2M/612345678905/ZOMATO SMS BLOCKUPI payment Rs 300 debited from A/c XX1234', at);
  const c = parseSms('ICICIB', 'Rs 500 credited to A/c XX1234 from ZEPTO. Call 1800 to dispute', at);
  assert.match(a.description, /RAMESH/);
  assert.doesNotMatch(a.description, /Refno|612345/);
  assert.match(b.description, /ZOMATO/);
  assert.doesNotMatch(b.description, /BLOCKUPI|SMS/);
  assert.match(c.description, /ZEPTO/);
  assert.doesNotMatch(c.description, /dispute|1800/);
});
test('Step 2c: empty or junk merchant is low confidence', () => {
  const empty = parseSms('HDFCBK', 'Rs 100 debited from A/c XX1234. UPI Ref 123456789012.', at);
  const junk = parseSms('HDFCBK', 'Rs 100 debited from A/c XX1234 to if not. UPI Ref 123456789013.', at);
  assert.equal(empty.confidence, 'low');
  assert.equal(junk.confidence, 'low');
});
test('Step 2c: conflicting debit and credit actions are low confidence', () => {
  const result = parseSms('ICICIB', 'A/c XX1234 debited Rs 700 and credited Rs 700 as reversal.', at);
  assert.ok(result);
  assert.equal(result.confidence, 'low');
});
test('Step 2c: uncertain direction is low confidence rather than auto-add safe', () => {
  const result = parseSms('HDFCBK', 'Account XX1234 transaction for Rs 100 at SHOP.', at);
  if (result) assert.equal(result.confidence, 'low');
});
test('Step 2c: clean description for subscription debit is Bank - NETFLIX', () => {
  const result = parseSms('HDFCBK', 'Your A/c XX1234 debited Rs 499 for subscription payment to NETFLIX.', at);
  assert.ok(result);
  assert.equal(result.description, 'Bank - NETFLIX');
});
