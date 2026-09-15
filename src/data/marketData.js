/**
 * Real-world market transaction data for ProjectCheck tactical console.
 * Sourced from data.gov.il (Israel Tax Authority) 2024-2025.
 */
export const MARKET_TRANSACTIONS = {
  "משה שרת 26, פתח תקווה": {
    city: "פתח תקווה",
    neighborhood: "רמת ורבר",
    medianSqm: 34930,
    transactions: [
      { date: "15/08/2024", street: "משה שרת 14", area: 78, price: 2782000, sqmPrice: 35667 },
      { date: "22/06/2024", street: "משה שרת 26", area: 91, price: 2845570, sqmPrice: 31270, isSameBuilding: true },
      { date: "10/04/2024", street: "משה שרת 21", area: 85, price: 3088000, sqmPrice: 36333 },
      { date: "15/01/2024", street: "משה שרת 26", area: 112, price: 3520000, sqmPrice: 31428, isSameBuilding: true },
      { date: "12/08/2023", street: "משה שרת 19", area: 82, price: 2613668, sqmPrice: 31874 }
    ],
    pipeline: [
      { name: "משה שרת 22-24 (תמ\"א 38/2)", units: 48, status: "בהיתר בתנאים", distance: "40 מ'" },
      { name: "מתחם פיק\"א (פינוי בינוי)", units: 650, status: "בתכנון מפורט", distance: "350 מ'" }
    ]
  },
  "חפץ חיים 44, גבעתיים": {
    city: "גבעתיים",
    neighborhood: "צפון גבעתיים",
    medianSqm: 52400,
    transactions: [
      { date: "12/07/2024", street: "חפץ חיים 38", area: 105, price: 5670000, sqmPrice: 54000 },
      { date: "05/05/2024", street: "חפץ חיים 44", area: 88, price: 4224000, sqmPrice: 48000, isSameBuilding: true },
      { date: "20/02/2024", street: "חפץ חיים 52", area: 115, price: 6382500, sqmPrice: 55500 }
    ],
    pipeline: [
      { name: "חפץ חיים 46 (תמ\"א)", units: 22, status: "בביצוע", distance: "20 מ'" }
    ]
  }
};
