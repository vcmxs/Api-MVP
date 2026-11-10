// controllers/coach_invite.controller.js
//
// Coach invite links — the shareable URL a coach sends to a trainee so the
// trainee signs up (or logs in) already linked to that coach.
//
//   GET  /coaches/:coachId/invite          → { code, url, uses, maxUses, ... }
//   POST /coaches/:coachId/invite/rotate   → revokes the old link, returns a new one
//   GET  /coach-invites/:code              → public preview (coach name + slots)
//   POST /coach-invites/apply              → links the logged-in account to the coach
//
// Note: this is NOT the Win-Win referral code (coach -> coach commissions).

const {
    CoachLinkError,
    getAvailableSlots
} = require('../services/coachLinkService');
const {
    buildInviteUrl,
    getOrCreateInvite,
    rotateInvite,
    findInviteByCode,
    consumeInvite
} = require('../services/coachInviteService');

const INVALID_REASON_MESSAGES = {
    not_found: 'This invite link is not valid.',
    revoked: 'This invite link was revoked by the coach.',
    expired: 'This invite link has expired.',
    exhausted: 'This invite link reached its maximum number of uses.'
};

function isSelfOrAdmin(req, coachId) {
    const user = req.user;
    if (!user) return false;
    if (String(user.role || '').toLowerCase() === 'admin') return true;
    return Number(user.id) === Number(coachId);
}

function serializeInvite(invite, req) {
    return {
        code: invite.code,
        url: buildInviteUrl(invite.code, req),
        uses: invite.uses,
        maxUses: invite.max_uses,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at
    };
}

function handleError(res, err, logLabel) {
    if (err instanceof CoachLinkError) {
        return res.status(err.status).json(err.toJSON());
    }
    console.error(`${logLabel}:`, err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
}

/**
 * Get (or lazily create) the coach's shareable invite link.
 */
exports.getInvite = async (req, res) => {
    const { coachId } = req.params;

    try {
        if (!isSelfOrAdmin(req, coachId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only see your own invite link.'
            });
        }

        const invite = await getOrCreateInvite(Number(coachId));
        const slots = await getAvailableSlots(Number(coachId));

        res.json({ ...serializeInvite(invite, req), ...slots });
    } catch (err) {
        handleError(res, err, 'Get coach invite error');
    }
};

/**
 * Revoke the current link and mint a new one (e.g. after leaking it).
 */
exports.rotateInvite = async (req, res) => {
    const { coachId } = req.params;

    try {
        if (!isSelfOrAdmin(req, coachId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only rotate your own invite link.'
            });
        }

        const invite = await rotateInvite(Number(coachId));
        const slots = await getAvailableSlots(Number(coachId));

        res.json({ ...serializeInvite(invite, req), ...slots });
    } catch (err) {
        handleError(res, err, 'Rotate coach invite error');
    }
};

/**
 * Public preview used by /join/[code] and by the register/login pages.
 * Always answers 200 so the client can render its own copy.
 */
exports.previewInvite = async (req, res) => {
    const { code } = req.params;

    try {
        const invite = await findInviteByCode(code);

        if (!invite) {
            return res.json({
                valid: false,
                reason: 'not_found',
                message: INVALID_REASON_MESSAGES.not_found
            });
        }

        if (invite.invalid_reason) {
            return res.json({
                valid: false,
                code: invite.code,
                coachName: invite.coach_name,
                reason: invite.invalid_reason,
                message: INVALID_REASON_MESSAGES[invite.invalid_reason]
            });
        }

        let slots = null;
        try {
            slots = await getAvailableSlots(invite.coach_id);
        } catch (slotErr) {
            console.error('Invite preview slot lookup failed:', slotErr);
        }

        res.json({
            valid: true,
            code: invite.code,
            coachId: invite.coach_id,
            coachName: invite.coach_name,
            slotsAvailable: slots ? slots.slotsAvailable : null,
            maxTrainees: slots ? slots.maxTrainees : null,
            tier: slots ? slots.tier : null
        });
    } catch (err) {
        handleError(res, err, 'Invite preview error');
    }
};

/**
 * Link the authenticated account to the coach behind an invite code.
 * Reused by the /join page ("Link my account") and by the login page.
 */
exports.applyInvite = async (req, res) => {
    const { code } = req.body || {};

    if (!code) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invite code is required'
        });
    }

    try {
        const { invite, link } = await consumeInvite({ code, userId: req.user.id });

        res.json({
            success: true,
            coachId: link.coachId,
            coachName: invite.coach_name,
            message: `You are now linked to ${invite.coach_name}.`
        });
    } catch (err) {
        handleError(res, err, 'Apply coach invite error');
    }
};
