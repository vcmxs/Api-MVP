// middleware/plan-access.js
const pool = require('../config/database');

/**
 * A workout plan belongs to one trainee and (usually) one coach. Admins can
 * reach everything; a trainee only their own plans; a coach only the plans they
 * wrote. Coaches linked to the trainee (`coach_trainee`) also count: they
 * already list that trainee's plans and need the detail view for sessions the
 * trainee built on their own.
 */
function canAccessPlan(plan, user) {
    if (!plan || !user) return false;
    const role = String(user.role || '').toLowerCase();
    if (role === 'admin') return true;
    if (plan.trainee_id != null && String(plan.trainee_id) === String(user.id)) return true;
    if (plan.coach_id != null && String(plan.coach_id) === String(user.id)) return true;
    return false;
}

async function isLinkedCoach(user, traineeId) {
    if (!user || String(user.role || '').toLowerCase() !== 'coach' || traineeId == null) return false;
    const result = await pool.query(
        'SELECT 1 FROM coach_trainee WHERE coach_id = $1 AND trainee_id = $2',
        [user.id, traineeId]
    );
    return result.rows.length > 0;
}

const isCompleted = (plan) => String(plan?.status || '').toLowerCase() === 'completed';

/**
 * Loads the plan named by `:workoutPlanId` / `:planId` and checks the signed-in
 * user may touch it. Must run after `authenticateToken`.
 *
 * Plan ids are sequential integers and the workout routes used to be public, so
 * without this any visitor could read or overwrite another trainee's plan.
 *
 * @param {{ blockCompleted?: boolean }} [options] `blockCompleted` refuses
 *   writes once the trainee finished the session (the prescription is history
 *   at that point).
 */
function loadWorkoutPlan({ blockCompleted = false } = {}) {
    return async (req, res, next) => {
        try {
            const planId = req.params.workoutPlanId || req.params.planId;
            if (!planId) {
                return res.status(400).json({ error: 'Bad Request', message: 'Workout plan id required' });
            }

            const result = await pool.query(
                'SELECT id, trainee_id, coach_id, shared_session_id, status FROM workout_plans WHERE id = $1',
                [planId]
            );
            const plan = result.rows[0];

            if (!plan) {
                return res.status(404).json({ error: 'Not Found', message: 'Workout plan not found' });
            }

            if (!canAccessPlan(plan, req.user) && !(await isLinkedCoach(req.user, plan.trainee_id))) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'You do not have access to this workout plan'
                });
            }

            if (blockCompleted && isCompleted(plan)) {
                return res.status(409).json({
                    error: 'Conflict',
                    message: 'This workout is already completed and can no longer be modified'
                });
            }

            req.workoutPlan = plan;
            next();
        } catch (err) {
            console.error('Workout plan access check error:', err);
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
        }
    };
}

module.exports = { loadWorkoutPlan, canAccessPlan };
