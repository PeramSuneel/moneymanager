# Money Manager — India Edition

A responsive personal finance and Indian investment tracker. All currency values use Indian Rupees (INR / ₹).

## Features
- Working Light, Dark and System appearance modes; preference is saved.
- Dashboard with estimated net position, income, expenses, EMI and portfolio value.
- Add, edit, delete and search income, expense and transfer transactions.
- Loan register with outstanding principal, interest rate, EMI, due date and remaining tenure.
- NSE/BSE stock holdings with editable prices, quantity, average cost and unrealized P&L.
- Explainable portfolio review prompts based on entered price movement and data freshness, plus investment thesis notes.
- Online gold and silver reference rates, Bengaluru/Chennai city selector, freshness labels and rate source.
- Gold/silver budget-to-grams calculator and jewellery bill estimator (wastage, making charges, discount and GST).
- TradingView stock ticker and interactive NSE/BSE chart widgets.
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
- TradingView website widgets are embedded for stock charts and ticker snapshots. Exchange data in free website widgets may be delayed; verify live execution prices with your broker. These widgets do not provide a downloadable real-time NSE/BSE API.
- Without a city-rate API key, gold/silver use a public national published buy-rate reference, not a Bengaluru/Chennai jeweller quote. 22K/18K fallback figures are estimated from the 24K reference by purity ratio.
- Optional city-specific pricing uses Nebula Metals. Its documentation advertises 50 free credits; gold and silver require separate calls, and further use may require payment. API key is stored in browser local storage, never in repository files. Avoid sharing the device/browser if you store a private key there.
- Metal calculators use GST as a configurable input (default 3%) and estimate wastage/making charges. Actual jeweller billing, hallmarking, stone value, discounts and tax treatment can differ; verify the invoice.
- Portfolio review is educational decision support, not a buy/sell instruction or SEBI-registered investment advice. Verify current company filings, fundamentals, valuation, risk and tax implications before investing.
- Loan values and EMI dates are based on your entries; confirm exact schedules with your lender.

## Market data and calculators
- Public reference rates refresh from the online endpoint and are cached to reduce unnecessary requests. The city selector labels the requested market; it does not make a national reference feed city-specific.
- To use city-wise prices, create an optional Nebula Metals key and enter it under Live markets. The documented city key for Bengaluru is `Bangalore`; the UI displays it as Bengaluru.
- The budget calculator includes GST in the budget when estimating grams. The jewellery estimator calculates metal value + wastage + making charges − discount, then applies the selected GST rate.
- Stock chart widgets are powered by TradingView. Their exchange feeds can be delayed, so do not use them as execution quotes.

## Stock CSV format
Required headers: `symbol,company,qty,avg,price`
Optional headers: `exchange`
Example: `TCS,Tata Consultancy Services,2,3500,3620,NSE`

## Backup
Use **Settings & backup → Download backup** to save a JSON copy. Restore it on the same browser or another device using **Restore backup**.
