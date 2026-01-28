const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Cache configuration
let cachedRate = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const BCV_URL = 'https://www.bcv.org.ve';

// Create an axios instance with a custom https agent to handle potential SSL issues
// and custom headers to look like a real browser
const client = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    },
    timeout: 10000 // 10 second timeout
});

exports.getExchangeRate = async () => {
    const now = Date.now();

    // Return cached rate if valid
    if (cachedRate && (now - lastFetchTime < CACHE_TTL)) {
        return cachedRate;
    }

    try {
        console.log('Fetching exchange rate from BCV...');
        const response = await client.get(BCV_URL);
        const html = response.data;
        const $ = cheerio.load(html);

        // Selector based on user's screenshot: #dolar strong
        // The value is in format "361,49060000" (comma as decimal separator)
        const rateText = $('#dolar strong').text().trim();

        if (!rateText) {
            throw new Error('Rate element not found on BCV page');
        }

        // Parse format "361,49060000" -> 361.4906
        // Replace comma with dot and remove any non-numeric chars except dot
        const normalizedRate = rateText.replace(',', '.').replace(/[^0-9.]/g, '');
        const rate = parseFloat(normalizedRate);

        if (isNaN(rate)) {
            throw new Error(`Failed to parse rate: ${rateText}`);
        }

        // Update cache
        cachedRate = rate;
        lastFetchTime = now;

        console.log(`Updated exchange rate: ${rate} Bs/$`);
        return rate;

    } catch (error) {
        console.error('Error fetching BCV rate:', error.message);

        // If we have a stale cache, return it rather than failing
        if (cachedRate) {
            console.warn('Returning stale cached rate due to error');
            return cachedRate;
        }

        // Fallback hardcoded value (approximate) if everything fails
        // Updated to match recent trends if scraping completely fails
        return 361.49;
    }
};
