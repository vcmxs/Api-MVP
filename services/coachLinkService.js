// services/coachLinkService.js
//
// Single source of truth for the "coach <-> trainee" linking rules.
//
// Both the manual assignment (POST /coaches/:coachId/trainees) and the
// invite-link flows (POST /coach-invites/apply and the registration that
// carries a coachInviteCode) go through linkTraineeToCoach(), so the tier
// limits, the peer-coaching rule and the "one active coach" rule can never
// drift apart.

const pool = require('../config/database');
const { getTraineeLimit, getTierInfo } = require('../config/subscriptionTiers');

const CODES = {
    COACH_NOT_FOUND: 'COACH_NOT_FOUND',
    LIMIT_REACHED: 'LIMIT_REACHED',
    PEER_LIMIT_REACHED: 'PEER_LIMIT_REACHED',
    TRAINEE_NOT_FOUND: 'TRAINEE_NOT_FOUND',
    INVALID_ROLE: 'INVALID_ROLE',
    ALREADY_ASSIGNED: 'ALREADY_ASSIGNED',
    SELF_ASSIGN: 'SELF_ASSIGN',
    INVALID_INVITE: 'INVALID_INVITE',
};

const STATUS_BY_CODE = {
    COACH_NOT_FOUND: 404,
    LIMIT_REACHED: 403,
    PEER_LIMIT_REACHED: 403,
    TRAINEE_NOT_FOUND: 404,
    INVALID_ROLE: 400,
    ALREADY_ASSIGNED: 409,
    SELF_ASSIGN: 400,
    INVALID_INVITE: 404,
};

const LABEL_BY_CODE = {
    COACH_NOT_FOUND: 'Not Found',
    LIMIT_REACHED: 'Limit Reached',
    PEER_LIMIT_REACHED: 'Limit Reached',
    TRAINEE_NOT_FOUND: 'Not Found',
    INVALID_ROLE: 'Bad Request',
    ALREADY_ASSIGNED: 'Conflict',
    SELF_ASSIGN: 'Bad Request',
    INVALID_INVITE: 'Not Found',
};

/**
 * Typed error so controllers can answer with the right HTTP status/message
 * without re-implementing the rule checks.
 */
class CoachLinkError extends Error {
    constructor(code, message, meta) {
        super(message);
        this.name = 'CoachLinkError';
        this.code = code;
        this.label = LABEL_BY_CODE[code] || 'Error';
        this.status = STATUS_BY_CODE[code] || 400;
        this.meta = meta || {};
    }

    toJSON() {
        return {
            error: this.label,
            code: this.code,
            message: this.message,
            ...this.meta
        };
    }
}

async function countTrainees(coachId) {
    const result = await pool.query(
        'SELECT COUNT(*) FROM coach_trainee WHERE coach_id = $1',
        [coachId]
    );
    return parseInt(result.rows[0].count, 10);
}

/**
 * Link a trainee (or peer coach) to a coach, enforcing:
 *   • the coach's tier trainee limit,
 *   • the peer-coach's own tier limit (peer coaching consumes a slot on both sides),
 *   • the "one active coach per trainee" rule,
 *   • the role check (only trainee or coach accounts can be linked).
 *
 * Throws CoachLinkError on any rule violation.
 *
 * @param {Object} params
 * @param {number|string} params.coachId
 * @param {number|string} params.traineeId
 * @param {Object} [params.trainee] Optional already-loaded trainee row (id, name, email, role/role-less)
 * @returns {Promise<{ coachId: number, traineeId: number, trainee: Object }>}
 */
async function linkTraineeToCoach({ coachId, traineeId, trainee }) {
    const coachNumericId = Number(coachId);
    const traineeNumericId = Number(traineeId);

    if (!coachNumericId) {
        throw new CoachLinkError(CODES.COACH_NOT_FOUND, 'Coach not found');
    }

    // 1. Coach must exist and have a tier
    const coachProfile = await pool.query(
        'SELECT subscription_status, subscription_tier FROM users WHERE id = $1',
        [coachNumericId]
    );

    if (coachProfile.rows.length === 0) {
        throw new CoachLinkError(CODES.COACH_NOT_FOUND, 'Coach not found');
    }

    // 2. Resolve the trainee account
    let traineeRow = trainee;
    if (!traineeRow || !traineeRow.role) {
        if (!traineeNumericId) {
            throw new CoachLinkError(CODES.TRAINEE_NOT_FOUND, 'Trainee not found');
        }
        const traineeResult = await pool.query(
            'SELECT id, name, email, role FROM users WHERE id = $1',
            [traineeNumericId]
        );
        if (traineeResult.rows.length === 0) {
            throw new CoachLinkError(CODES.TRAINEE_NOT_FOUND, 'Trainee not found');
        }
        traineeRow = traineeResult.rows[0];
    }

    const resolvedTraineeId = Number(traineeRow.id);

    if (resolvedTraineeId === coachNumericId) {
        throw new CoachLinkError(CODES.SELF_ASSIGN, 'You cannot add yourself as your own trainee.');
    }

    if (traineeRow.role !== 'trainee' && traineeRow.role !== 'coach') {
        throw new CoachLinkError(CODES.INVALID_ROLE, 'User must be a trainee or a coach to be assigned.');
    }

    // 3. Coach's own trainee limit (defaults to 'starter' when no tier is set)
    const { subscription_tier } = coachProfile.rows[0];
    const currentTier = subscription_tier || 'starter';
    const maxTrainees = getTraineeLimit(currentTier);
    const currentCount = await countTrainees(coachNumericId);

    if (currentCount >= maxTrainees) {
        const tierInfo = getTierInfo(currentTier);
        throw new CoachLinkError(
            CODES.LIMIT_REACHED,
            `Your ${tierInfo?.name || currentTier} plan is limited to ${maxTrainees} trainee${maxTrainees > 1 ? 's' : ''}. Upgrade your subscription to add more.`,
            { currentCount, maxAllowed: maxTrainees, tier: currentTier }
        );
    }

    // 4. [PEER COACHING LOGIC] If the person being linked is ALSO a coach,
    //    they spend one of their own slots to be trained.
    if (traineeRow.role === 'coach') {
        const peerProfile = await pool.query(
            'SELECT subscription_status, subscription_tier FROM users WHERE id = $1',
            [resolvedTraineeId]
        );

        const peerTier = peerProfile.rows[0]?.subscription_tier || 'starter';
        const peerMaxTrainees = getTraineeLimit(peerTier);
        const peerCurrentCount = await countTrainees(resolvedTraineeId);

        if (peerCurrentCount >= peerMaxTrainees) {
            const tierInfo = getTierInfo(peerTier);
            throw new CoachLinkError(
                CODES.PEER_LIMIT_REACHED,
                `The coach you are trying to add has reached their trainee limit (${peerMaxTrainees}) on their ${tierInfo?.name || peerTier} plan, so they cannot allocate a slot to be trained right now.`,
                { peerTier, peerMaxAllowed: peerMaxTrainees }
            );
        }
    }

    // 5. Only one active coach per trainee (this coach OR another one)
    const existingResult = await pool.query(
        'SELECT coach_id FROM coach_trainee WHERE trainee_id = $1',
        [resolvedTraineeId]
    );

    if (existingResult.rows.length > 0) {
        const assignedCoachId = existingResult.rows[0].coach_id;
        if (Number(assignedCoachId) === coachNumericId) {
            throw new CoachLinkError(
                CODES.ALREADY_ASSIGNED,
                'This user is already assigned to you.',
                { coachId: coachNumericId }
            );
        }
        throw new CoachLinkError(
            CODES.ALREADY_ASSIGNED,
            'This user is already assigned to a coach. They must leave their current coach before you can add them.'
        );
    }

    // 6. Create the relationship
    await pool.query(
        'INSERT INTO coach_trainee (coach_id, trainee_id) VALUES ($1, $2)',
        [coachNumericId, resolvedTraineeId]
    );

    // 7. Auto-friend logic: create an 'accepted' friendship (secondary feature,
    //    never fails the link).
    const u1 = Math.min(coachNumericId, resolvedTraineeId);
    const u2 = Math.max(coachNumericId, resolvedTraineeId);

    try {
        await pool.query(
            `INSERT INTO friendships (user_id_1, user_id_2, status, action_user_id) 
             VALUES ($1, $2, 'accepted', $3)
             ON CONFLICT (user_id_1, user_id_2) 
             DO UPDATE SET status = 'accepted', action_user_id = $3`,
            [u1, u2, coachNumericId]
        );
    } catch (friendErr) {
        console.error('Auto-friend error (ignoring to prevent failure of main task):', friendErr);
    }

    return {
        coachId: coachNumericId,
        traineeId: resolvedTraineeId,
        trainee: traineeRow
    };
}

/**
 * How many trainee slots the coach still has free right now.
 */
async function getAvailableSlots(coachId) {
    const profile = await pool.query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [coachId]
    );

    if (profile.rows.length === 0) {
        throw new CoachLinkError(CODES.COACH_NOT_FOUND, 'Coach not found');
    }

    const tier = profile.rows[0].subscription_tier || 'starter';
    const maxTrainees = getTraineeLimit(tier);
    const currentCount = await countTrainees(coachId);

    return {
        tier,
        maxTrainees,
        currentCount,
        slotsAvailable: Math.max(maxTrainees - currentCount, 0)
    };
}

module.exports = {
    CODES,
    CoachLinkError,
    linkTraineeToCoach,
    getAvailableSlots
};
