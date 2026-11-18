// controllers/release_notes.controller.js
//
// "What's new" notes shown in Settings (coaches and trainees) and authored from
// the admin panel. Publishing a note also fan-outs one `release_note`
// notification per coach/trainee, so the update reaches the bell / in-app popup
// without a deploy on the client.
//
// The note body is stored in both languages and the client picks one with its
// own language setting; the notification itself only carries `{ version }` as
// JSON params, exactly like every other templated notification.

const pool = require('../config/database');

const MAX_VERSION_LENGTH = 20;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 4000;
const MAX_NOTES = 50;

// Same shape as the audit helper in admin.controller.js: the JWT only carries
// id/email/role, so the admin name is looked up when the entry is written.
async function logAudit({ adminId, actionType, actionName, details, ipAddress }) {
    try {
        let adminName = 'Admin';
        let adminEmail = '';
        if (adminId) {
            const adminRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [adminId]);
            if (adminRes.rows.length > 0) {
                adminName = adminRes.rows[0].name;
                adminEmail = adminRes.rows[0].email;
            }
        }
        await pool.query(
            `INSERT INTO audit_logs (admin_id, admin_name, admin_email, action_type, action_name, details, target_user_id, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [adminId || null, adminName, adminEmail, actionType, actionName, details || '', null, ipAddress || null]
        );
    } catch (e) {
        console.error('[Audit] Failed to write audit log:', e.message);
    }
}

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function serializeNote(row) {
    return {
        id: row.id,
        version: row.version,
        // Both casings are returned: the dashboard views use camelCase, the
        // admin panel mirrors the columns.
        titleEs: row.title_es,
        titleEn: row.title_en,
        bodyEs: row.body_es,
        bodyEn: row.body_en,
        isPublished: row.is_published,
        is_published: row.is_published,
        notifiedAt: row.notified_at,
        createdAt: row.created_at,
    };
}

const SELECT_COLUMNS = `id, version, title_es, title_en, body_es, body_en,
                        is_published, notified_at, created_at`;

/**
 * GET /release-notes — published notes, newest first (any authenticated role).
 */
exports.listReleaseNotes = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${SELECT_COLUMNS}
               FROM release_notes
              WHERE is_published = TRUE
              ORDER BY created_at DESC
              LIMIT $1`,
            [MAX_NOTES]
        );

        res.json({ notes: result.rows.map(serializeNote) });
    } catch (err) {
        console.error('List release notes error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * GET /admin/release-notes — every note, published or not (admin only).
 */
exports.listAllReleaseNotes = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${SELECT_COLUMNS}
               FROM release_notes
              ORDER BY created_at DESC
              LIMIT $1`,
            [MAX_NOTES]
        );

        res.json({ notes: result.rows.map(serializeNote) });
    } catch (err) {
        console.error('List all release notes error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * POST /admin/release-notes
 *
 * Body: { version, titleEs, titleEn?, bodyEs, bodyEn?, notify? }
 * Publishing (the default) inserts the note and notifies every coach/trainee.
 */
exports.createReleaseNote = async (req, res) => {
    const version = cleanText(req.body?.version);
    const titleEs = cleanText(req.body?.titleEs ?? req.body?.title_es);
    const bodyEs = cleanText(req.body?.bodyEs ?? req.body?.body_es);
    // English is optional: falling back to Spanish keeps a note publishable
    // without blocking on a translation.
    const titleEn = cleanText(req.body?.titleEn ?? req.body?.title_en) || titleEs;
    const bodyEn = cleanText(req.body?.bodyEn ?? req.body?.body_en) || bodyEs;
    const notify = req.body?.notify !== false;

    if (!version) {
        return res.status(400).json({ error: 'Bad Request', message: 'version is required' });
    }
    if (version.length > MAX_VERSION_LENGTH) {
        return res.status(400).json({ error: 'Bad Request', message: `version must be at most ${MAX_VERSION_LENGTH} characters` });
    }
    if (!titleEs) {
        return res.status(400).json({ error: 'Bad Request', message: 'titleEs is required' });
    }
    if (titleEs.length > MAX_TITLE_LENGTH || titleEn.length > MAX_TITLE_LENGTH) {
        return res.status(400).json({ error: 'Bad Request', message: `title must be at most ${MAX_TITLE_LENGTH} characters` });
    }
    if (!bodyEs) {
        return res.status(400).json({ error: 'Bad Request', message: 'bodyEs is required' });
    }
    if (bodyEs.length > MAX_BODY_LENGTH || bodyEn.length > MAX_BODY_LENGTH) {
        return res.status(400).json({ error: 'Bad Request', message: `body must be at most ${MAX_BODY_LENGTH} characters` });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const inserted = await client.query(
            `INSERT INTO release_notes (version, title_es, title_en, body_es, body_en, is_published, created_by)
             VALUES ($1, $2, $3, $4, $5, TRUE, $6)
             RETURNING ${SELECT_COLUMNS}`,
            [version, titleEs, titleEn, bodyEs, bodyEn, req.user?.id ?? null]
        );
        const note = inserted.rows[0];

        let notified = 0;
        if (notify) {
            // One INSERT...SELECT instead of a loop: the params are identical
            // for every recipient and each client localizes them on render.
            const params = JSON.stringify({ version });
            const fanOut = await client.query(
                `INSERT INTO notifications (user_id, title, message, type, related_id)
                 SELECT id, $1, $2, 'release_note', $3
                   FROM users
                  WHERE role IN ('coach', 'trainee')
                    AND COALESCE(status, 'active') <> 'blocked'`,
                [params, params, note.id]
            );
            notified = fanOut.rowCount;

            await client.query('UPDATE release_notes SET notified_at = CURRENT_TIMESTAMP WHERE id = $1', [note.id]);
            note.notified_at = new Date();
        }

        await client.query('COMMIT');

        logAudit({
            adminId: req.user?.id,
            // `audit_logs.action_type` is constrained to the four platform
            // categories, so release notes are logged under `system` and
            // identified by their action name.
            actionType: 'system',
            actionName: 'Created release note',
            details: `v${version} (${notify ? `${notified} notifications` : 'no notification'})`,
            ipAddress: req.ip,
        });

        res.status(201).json({ note: serializeNote(note), notified });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('Create release note error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } finally {
        client.release();
    }
};

/**
 * PATCH /admin/release-notes/:id
 *
 * Body: any subset of { version, titleEs, titleEn, bodyEs, bodyEn, isPublished }
 */
exports.updateReleaseNote = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid note id' });
    }

    const version = cleanText(req.body?.version);
    const titleEs = cleanText(req.body?.titleEs ?? req.body?.title_es);
    const titleEn = cleanText(req.body?.titleEn ?? req.body?.title_en);
    const bodyEs = cleanText(req.body?.bodyEs ?? req.body?.body_es);
    const bodyEn = cleanText(req.body?.bodyEn ?? req.body?.body_en);
    const isPublished = typeof req.body?.isPublished === 'boolean'
        ? req.body.isPublished
        : typeof req.body?.is_published === 'boolean'
            ? req.body.is_published
            : null;

    if (version && version.length > MAX_VERSION_LENGTH) {
        return res.status(400).json({ error: 'Bad Request', message: `version must be at most ${MAX_VERSION_LENGTH} characters` });
    }
    if ((titleEs && titleEs.length > MAX_TITLE_LENGTH) || (titleEn && titleEn.length > MAX_TITLE_LENGTH)) {
        return res.status(400).json({ error: 'Bad Request', message: `title must be at most ${MAX_TITLE_LENGTH} characters` });
    }
    if ((bodyEs && bodyEs.length > MAX_BODY_LENGTH) || (bodyEn && bodyEn.length > MAX_BODY_LENGTH)) {
        return res.status(400).json({ error: 'Bad Request', message: `body must be at most ${MAX_BODY_LENGTH} characters` });
    }

    try {
        const result = await pool.query(
            `UPDATE release_notes
                SET version      = COALESCE($1, version),
                    title_es     = COALESCE($2, title_es),
                    title_en     = COALESCE($3, title_en),
                    body_es      = COALESCE($4, body_es),
                    body_en      = COALESCE($5, body_en),
                    is_published = COALESCE($6, is_published)
              WHERE id = $7
              RETURNING ${SELECT_COLUMNS}`,
            [
                version || null,
                titleEs || null,
                titleEn || null,
                bodyEs || null,
                bodyEn || null,
                isPublished,
                id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Release note not found' });
        }

        logAudit({
            adminId: req.user?.id,
            actionType: 'system',
            actionName: 'Updated release note',
            details: `#${id}`,
            ipAddress: req.ip,
        });

        res.json({ note: serializeNote(result.rows[0]) });
    } catch (err) {
        console.error('Update release note error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
};

/**
 * DELETE /admin/release-notes/:id — removes the note and its notifications.
 */
exports.deleteReleaseNote = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid note id' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // The fan-out rows point back at the note through related_id, so they
        // are removed together: a deleted note must not keep a dead bell row.
        await client.query(
            `DELETE FROM notifications WHERE type = 'release_note' AND related_id = $1`,
            [id]
        );
        const deleted = await client.query('DELETE FROM release_notes WHERE id = $1 RETURNING id', [id]);
        if (deleted.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Release note not found' });
        }
        await client.query('COMMIT');

        logAudit({
            adminId: req.user?.id,
            actionType: 'system',
            actionName: 'Deleted release note',
            details: `#${id}`,
            ipAddress: req.ip,
        });

        res.json({ message: 'Release note deleted successfully' });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        console.error('Delete release note error:', err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    } finally {
        client.release();
    }
};
