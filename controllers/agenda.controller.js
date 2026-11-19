// controllers/agenda.controller.js
//
// Read-only feed for the dashboard's "Today's workouts" section.
//
// The agenda answers "what is scheduled for this calendar day?" from the
// perspective of the signed-in user: a trainee sees their own plans, a coach
// sees the plans of the trainees they follow plus their own routines, an admin
// sees the whole day.
// Rows arrive own-first, then alphabetically by trainee name (see
// Workout.findAgenda); each row carries `isMine` so the UI can distinguish the
// caller's own routine from one written for a trainee.
// `scheduled_date` is a DATE column and db.js returns it as `YYYY-MM-DD`, so
// the caller's local day is compared as-is (no UTC conversion).

const Workout = require('../models/Workout');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-31). */
function isValidDate(value) {
    if (!DATE_PATTERN.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Fallback when the client does not send `?date=`: today in UTC. */
function todayUTC() {
    return new Date().toISOString().slice(0, 10);
}

const roleOf = (user) => String(user?.role || '').toLowerCase();

/**
 * Maps a `workout_plans` + `users` row to the agenda JSON contract.
 *
 * `viewerId` is the signed-in user: `isMine` lets the UI mark the caller's own
 * routine (cyan icon, routine name as the primary label) without re-deriving
 * the identity on the client. Rows of other trainees lead with the trainee name.
 */
function toAgendaItem(row, viewerId) {
    const coachId = row.coach_id == null ? null : Number(row.coach_id);
    const traineeId = row.trainee_id == null ? null : Number(row.trainee_id);

    return {
        id: String(row.id),
        traineeId: String(row.trainee_id),
        traineeName: row.trainee_name || '',
        traineeEmail: row.trainee_email || '',
        name: row.name || '',
        status: String(row.status || 'assigned').toLowerCase(),
        scheduledDate: row.scheduled_date,
        exerciseCount: Number(row.exercise_count || 0),
        // A plan written by the trainee has no coach_id; Co-Op plans reuse the
        // creator as coach, so compare against the trainee instead of trusting
        // the column alone.
        isCoachAssigned: coachId != null && coachId !== traineeId,
        isShared: row.shared_session_id != null,
        isMine: viewerId != null && traineeId === viewerId,
    };
}

/**
 * GET /agenda/today?date=YYYY-MM-DD
 *
 * 200 → { date, summary: { total, completed, pending }, workouts: [...] }
 * 400 → malformed `date`
 */
exports.getTodayAgenda = async (req, res) => {
    try {
        const requested = typeof req.query.date === 'string' ? req.query.date.trim() : '';
        if (requested && !isValidDate(requested)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'date must be a valid calendar date in YYYY-MM-DD format'
            });
        }
        const date = requested || todayUTC();

        const role = roleOf(req.user);
        const scope = {};
        if (role === 'trainee') {
            scope.traineeId = Number(req.user.id);
        } else if (role !== 'admin') {
            // Coaches (and any other staff role) get the agenda of the trainees
            // they follow plus their own routines; `coach_trainee` is the source
            // of truth for the former, `trainee_id = coach_id` for the latter.
            scope.coachId = Number(req.user.id);
        }

        const viewerId = req.user?.id == null ? null : Number(req.user.id);
        const rows = await Workout.findAgenda({ date, ...scope });
        // `isMine` is resolved against the caller, not the row's coach_id: the
        // same plan is "mine" for its trainee and "someone else's" for a coach.
        const workouts = rows.map((row) => toAgendaItem(row, viewerId));
        const completed = workouts.filter((w) => w.status === 'completed').length;

        res.json({
            date,
            summary: {
                total: workouts.length,
                completed,
                pending: workouts.length - completed,
            },
            workouts,
        });
    } catch (err) {
        console.error('Error building the agenda:', err);
        res.status(500).json({ error: 'Internal Server Error', message: 'Could not load the agenda' });
    }
};
