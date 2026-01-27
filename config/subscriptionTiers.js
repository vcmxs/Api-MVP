// config/subscriptionTiers.js

/**
 * Subscription tier definitions with trainee limits
 */
const SUBSCRIPTION_TIERS = {
    starter: {
        name: 'Starter',
        maxTrainees: 1,
        displayName: 'Starter (1 trainee)',
        price: 0
    },
    bronze: {
        name: 'Bronze',
        maxTrainees: 4,
        displayName: 'Bronze (up to 4 trainees)',
        price: 9.99
    },
    silver: {
        name: 'Silver',
        maxTrainees: 10,
        displayName: 'Silver (up to 10 trainees)',
        price: 19.99
    },
    gold: {
        name: 'Gold',
        maxTrainees: 25,
        displayName: 'Gold (up to 25 trainees)',
        price: 39.99
    },
    olympian: {
        name: 'Olympian',
        maxTrainees: 999, // Unlimited (high number)
        displayName: 'Olympian (unlimited)',
        price: 99.99
    }
};

/**
 * Get trainee limit for a given tier
 * @param {string} tier - Tier name (starter, bronze, silver, gold, olympian)
 * @returns {number} Maximum number of trainees allowed
 */
function getTraineeLimit(tier) {
    const normalizedTier = tier?.toLowerCase();
    return SUBSCRIPTION_TIERS[normalizedTier]?.maxTrainees || 0;
}

/**
 * Get tier information
 * @param {string} tier - Tier name
 * @returns {object} Tier info object
 */
function getTierInfo(tier) {
    const normalizedTier = tier?.toLowerCase();
    return SUBSCRIPTION_TIERS[normalizedTier] || null;
}

/**
 * Get all available tiers
 * @returns {array} Array of tier keys
 */
function getAllTiers() {
    return Object.keys(SUBSCRIPTION_TIERS);
}

/**
 * Validate tier name
 * @param {string} tier - Tier name to validate
 * @returns {boolean} True if valid tier
 */
function isValidTier(tier) {
    const normalizedTier = tier?.toLowerCase();
    return SUBSCRIPTION_TIERS.hasOwnProperty(normalizedTier);
}

/**
 * Suggest next tier upgrade based on current trainee count
 * @param {number} traineeCount - Current number of trainees
 * @returns {string|null} Suggested tier name or null
 */
function suggestTierUpgrade(traineeCount) {
    const tiers = ['starter', 'bronze', 'silver', 'gold', 'olympian'];

    for (const tier of tiers) {
        if (SUBSCRIPTION_TIERS[tier].maxTrainees >= traineeCount) {
            return tier;
        }
    }

    return 'olympian'; // Default to highest tier
}

module.exports = {
    SUBSCRIPTION_TIERS,
    getTraineeLimit,
    getTierInfo,
    getAllTiers,
    isValidTier,
    suggestTierUpgrade
};
