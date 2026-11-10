// services/coachInviteService.js
//
// Coach invite links ("share this link with your trainees").
//
// Deliberately kept apart from users.referral_code: that one is the Win-Win
// money program (coach -> coach commissions); this one ONLY links a trainee
// account to a coach. Mixing both would make the commission rules ambiguous.

const pool = require('../config/database');
const {
    CODES,
    CoachLinkError,
    linkTraineeToCoach,
    getAvailableSlots
} = require('./coachLinkService');

const CODE_LENGTH = 6;
const DEFAULT_WEB_APP_URL = 'https://duplagym.vercel.app';

/**
 * 6-char alphanumeric code (same alphabet as referral codes, shorter for
 * WhatsApp-friendly links). Collisions are retried by createInvite().
 */
function generateCode() {
    const raw = Math.random().toString(36).substring(2, 2 + CODE_LENGTH).toUpperCase();
    return raw.padEnd(CODE_LENGTH, 'X');
}

/**
 * Base URL of the web app. Prefers an explicit env override, then the browser
 * Origin that called the API (so localhost dev links stay local), then prod.
 */
function resolveWebAppUrl(req) {
    const configured = (process.env.WEB_APP_URL || process.env.FRONTEND_URL || '').trim();
    if (configured) return configured.replace(/\/+$/, '');

    const origin = (req?.get?.('origin') || '').trim();
    if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, '');

    return DEFAULT_WEB_APP_URL;
}

function buildInviteUrl(code, req) {
    return `${resolveWebAppUrl(req)}/join/${code}`;
}

const INVITE_COLUMNS = 'id, code, coach_id, created_at, expires_at, max_uses, uses, revoked';

async function findActiveInvite(coachId) {
    const result = await pool.query(
        `SELECT ${INVITE_COLUMNS}
           FROM coach_invites
          WHERE coach_id = $1
            AND revoked = FALSE
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR uses < max_uses)
          ORDER BY created_at DESC
          LIMIT 1`,
        [coachId]
    );
    return result.rows[0] || null;
}

async function createInvite(coachId, { expiresAt = null, maxUses = null } = {}) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        try {
            const result = await pool.query(
                `INSERT INTO coach_invites (code, coach_id, expires_at, max_uses)
                 VALUES ($1, $2, $3, $4)
                 RETURNING ${INVITE_COLUMNS}`,
                [code, coachId, expiresAt, maxUses]
            );
            return result.rows[0];
        } catch (err) {
            // 23505 = unique_violation -> regenerate and retry
            if (err.code === '23505') continue;
            throw err;
        }
    }
    throw new Error('Could not generate a unique invite code. Please try again.');
}

/**
 * Reuse the coach's active invite, or mint a new one (lazy generation, same
 * pattern as GET /referrals/stats for the Win-Win code).
 */
async function getOrCreateInvite(coachId) {
    const existing = await findActiveInvite(coachId);
    if (existing) return existing;
    return createInvite(coachId);
}

/**
 * Revoke every active invite of the coach and mint a fresh one.
 */
async function rotateInvite(coachId) {
    await pool.query(
        'UPDATE coach_invites SET revoked = TRUE WHERE coach_id = $1 AND revoked = FALSE',
        [coachId]
    );
    return createInvite(coachId);
}

/**
 * Look up a code. Returns the row with an `invalid_reason` when it can no
 * longer be used ('revoked' | 'expired' | 'exhausted'), or null if unknown.
 */
async function findInviteByCode(code) {
    if (!code || typeof code !== 'string') return null;

    const result = await pool.query(
        `SELECT i.id, i.code, i.coach_id, i.created_at, i.expires_at, i.max_uses,
                i.uses, i.revoked, u.name AS coach_name
           FROM coach_invites i
           JOIN users u ON u.id = i.coach_id
          WHERE UPPER(i.code) = UPPER($1)
          LIMIT 1`,
        [code.trim()]
    );

    const invite = result.rows[0];
    if (!invite) return null;

    let invalid_reason = null;
    if (invite.revoked) invalid_reason = 'revoked';
    else if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) invalid_reason = 'expired';
    else if (invite.max_uses != null && invite.uses >= invite.max_uses) invalid_reason = 'exhausted';

    return { ...invite, invalid_reason };
}

/**
 * Validate a code + link the given account to the inviting coach + bump the
 * usage counter. Throws CoachLinkError when the code is unusable or any
 * linking rule (tier limit, already has a coach, ...) is violated.
 */
async function consumeInvite({ code, userId }) {
    const invite = await findInviteByCode(code);

    if (!invite) {
        throw new CoachLinkError(CODES.INVALID_INVITE, 'This invite link is not valid anymore.');
    }

    if (invite.invalid_reason) {
        const messages = {
            revoked: 'This invite link was revoked by your coach.',
            expired: 'This invite link has expired.',
            exhausted: 'This invite link reached its maximum number of uses.'
        };
        throw new CoachLinkError(
            CODES.INVALID_INVITE,
            messages[invite.invalid_reason] || 'This invite link is not valid anymore.',
            { reason: invite.invalid_reason }
        );
    }

    const link = await linkTraineeToCoach({ coachId: invite.coach_id, traineeId: userId });

    await pool.query(
        'UPDATE coach_invites SET uses = uses + 1 WHERE id = $1',
        [invite.id]
    );

    return { invite, link };
}

module.exports = {
    generateCode,
    buildInviteUrl,
    resolveWebAppUrl,
    getOrCreateInvite,
    rotateInvite,
    findInviteByCode,
    consumeInvite,
    getAvailableSlots
};
