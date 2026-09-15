/**
 * MarketDataService.js
 * Handles real-time real estate transaction data from data.gov.il (Israel Tax Authority).
 */

const RESOURCE_ID = 'ad51cf54-1fe4-4e92-bc91-3837424ccf4d';
const API_BASE = 'https://data.gov.il/api/3/action/datastore_search';

export const MarketDataService = {
  /**
   * Parses an address string into components.
   * Expected format: "Street Number, City" or "Street, City"
   */
  parseAddress(addressString) {
    if (!addressString) return null;
    
    const parts = addressString.split(',').map(p => p.trim());
    if (parts.length < 2) return { street: parts[0], city: '' };
    
    const city = parts[1];
    const streetPart = parts[0];
    
    // Extract house number if exists (e.g., "משה שרת 26")
    const match = streetPart.match(/(.+?)\s+(\d+)$/);
    if (match) {
      return { street: match[1], houseNumber: match[2], city };
    }
    
    return { street: streetPart, city };
  },

  /**
   * Fetches transactions from data.gov.il
   */
  async fetchTransactions(addressInfo) {
    const { city, street } = addressInfo;
    if (!city) throw new Error("City missing in address");

    // Construct query filters
    const filters = {
      CITY_NAME: city,
      ASSET_TYPE: "דירה בבית משותף" // Residential apartment
    };
    
    if (street) {
      filters.STREET_NAME = street;
    }

    const query = new URLSearchParams({
      resource_id: RESOURCE_ID,
      filters: JSON.stringify(filters),
      limit: 100,
      sort: 'DEALDATE desc'
    });

    try {
      const response = await fetch(`${API_BASE}?${query}`);
      if (!response.ok) throw new Error("Failed to fetch from data.gov.il");
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || "API error");
      
      return data.result.records;
    } catch (error) {
      console.error("MarketDataService Error:", error);
      throw error;
    }
  },

  /**
   * Processes records to calculate benchmarks and statistics.
   */
  processResults(records, targetHouseNumber) {
    if (!records || records.length === 0) return null;

    const normalized = records.map(r => {
      const amount = parseFloat(r.DEALAMOUNT) || 0;
      const area = parseFloat(r.AREA) || 1;
      const sqmPrice = Math.round(amount / area);
      
      return {
        date: r.DEALDATE,
        street: r.STREET_NAME,
        houseNumber: r.HOUSE_NUMBER,
        area: area,
        price: amount,
        sqmPrice: sqmPrice,
        isSameBuilding: r.HOUSE_NUMBER === targetHouseNumber
      };
    });

    // Calculate median price per SQM
    const prices = normalized.map(r => r.sqmPrice).sort((a, b) => a - b);
    const medianSqm = prices[Math.floor(prices.length / 2)];

    return {
      medianSqm,
      transactions: normalized.slice(0, 5), // Top 5 recent
      recordCount: normalized.length,
      neighborhood: records[0]?.NEIGHBORHOOD_NAME || "אזור הפרויקט"
    };
  }
};
