# Money Manager — India Edition

A responsive personal finance and Indian investment tracker. All currency values use Indian Rupees (INR / ₹).

## Features
- Working Light, Dark and System appearance modes; preference is saved.
- Dashboard with estimated net position, income, expenses, EMI and portfolio value.
- Add, edit, delete and search income, expense and transfer transactions.
- Loan register with outstanding principal, interest rate, EMI, due date and remaining tenure.
- NSE/BSE stock holdings with editable prices, quantity, average cost and unrealized P&L.
- Explainable portfolio review prompts based on entered price movement and data freshness, plus investment thesis notes.
- Monthly cash-flow chart, spending category report and savings snapshot.
- JSON backup and restore; transaction CSV export; stock CSV import.
- Responsive desktop and mobile navigation; reduced-motion accessibility support.

## Publish with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. Wait for the deployment. The expected URL is https://peramsuneel.github.io/moneymanager/

## Important limitations
- Records are saved in this browser on this device. They do not automatically synchronize between devices. Download backups regularly.
- Bank account and broker connections are not enabled. Never enter bank passwords or broker credentials.
- Stock prices are manually entered or imported from CSV. No live NSE/BSE quote feed or unattended market refresh is enabled in this release.
- Portfolio review is educational decision support, not a buy/sell instruction or SEBI-registered investment advice. Verify current company filings, fundamentals, valuation, risk and tax implications before investing.
- Loan values and EMI dates are based on your entries; confirm exact schedules with your lender.

## Stock CSV format
Required headers: `symbol,company,qty,avg,price`
Optional headers: `exchange`
Example: `TCS,Tata Consultancy Services,2,3500,3620,NSE`

## Backup
Use **Settings & backup → Download backup** to save a JSON copy. Restore it on the same browser or another device using **Restore backup**.
