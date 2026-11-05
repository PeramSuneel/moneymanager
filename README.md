# Money Manager

A free-first personal finance and Indian stock portfolio tracker, designed for INR and the India locale.

## Current starter features
- Overview dashboard with net worth, monthly income/expenses and portfolio value
- Income, expense and transfer transaction register
- Loan and EMI register with outstanding principal, interest rate, EMI and due day
- NSE/BSE stock holdings with quantity, average buy price and manually refreshed latest price
- Portfolio profit/loss calculations
- Basic rule-based stock review flags and investment thesis notes
- Daily local financial brief based on entered data
- Monthly cash-flow and category reports
- CSV transaction export, portfolio CSV import, JSON backup and restore
- Responsive layout for desktop and mobile; premium dark theme and motion effects

## Deploy with GitHub Pages
1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select branch **main**, folder **/ (root)**, then Save.
4. Wait for the Pages deployment and open the URL shown there.

## Important data and market limitations
- All monetary values are INR (₹).
- Records are stored in the browser's localStorage on the device/browser being used. They do not automatically sync between devices. Download backups regularly.
- Stock prices in this version are entered manually or imported from CSV. This version does not provide live NSE/BSE quotes, automatic broker sync, or unattended background market updates.
- The daily brief is generated when the app opens or becomes active, using locally recorded data. Scheduled push notifications and automatic market-data fetching require additional infrastructure and a reliable data provider.
- The stock advisor provides basic screening prompts only. It is not a SEBI-registered investment adviser and does not provide guaranteed buy/sell recommendations. Verify current financials, filings, valuations, risk, taxes and suitability before investing.

## CSV import format for holdings
Required headers: `symbol,company,quantity,avgPrice,price`
Optional header: `exchange`
Example row: `TCS,Tata Consultancy Services,2,3500,3620,NSE`

## Next development milestones
1. IndexedDB migration, edit flows, stronger validation and recurring transaction support.
2. Loan amortization schedules and payment reminders.
3. Reliable India-market data integration with source timestamps and error states.
4. Fundamental/technical research modules and explainable portfolio review.
5. Scheduled daily digest and cross-device backup/sync.
