const currencyService = require('../services/currencyService');

exports.getUsdRate = async (req, res) => {
    try {
        const rate = await currencyService.getExchangeRate();
        res.json({
            currency: 'USD',
            rate: rate,
            source: 'BCV',
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to retrieve exchange rate',
            error: error.message
        });
    }
};
