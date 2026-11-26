// config/subscriptionTiers.js

/**
 * Subscription tier definitions with trainee limits
 *
 * Every tier ships the whole product (routines, plans, exercise library,
 * nutrition, cardio, charts, payments, chat, both languages). The only
 * difference between plans is how many trainees a coach can hold, so the
 * lineup is: Starter 1 · Bronze 5 · Silver 15 · Gold unlimited.
 *
 * A tier name is also persisted in `users.subscription_tier`, so removing one
 * requires a data migration (see migrations/015_tier_lineup.sql).
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
        maxTrainees: 5,
        displayName: 'Bronze (up to 5 trainees)',
        price: 5
    },
    silver: {
        name: 'Silver',
        maxTrainees: 15,
        displayName: 'Silver (up to 15 trainees)',
        price: 15
    },
    gold: {
        name: 'Gold',
        maxTrainees: 999, // Unlimited (high number, keeps slot math numeric)
        displayName: 'Gold (unlimited)',
        price: 30
    }
};

/**
 * Get trainee limit for a given tier
 * @param {string} tier - Tier name (starter, bronze, silver, gold)
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
    const tiers = ['starter', 'bronze', 'silver', 'gold'];

    for (const tier of tiers) {
        if (SUBSCRIPTION_TIERS[tier].maxTrainees >= traineeCount) {
            return tier;
        }
    }

    return 'gold'; // Gold is unlimited, so it always covers the count
}

module.exports = {
    SUBSCRIPTION_TIERS,
    getTraineeLimit,
    getTierInfo,
    getAllTiers,
    isValidTier,
    suggestTierUpgrade
};
