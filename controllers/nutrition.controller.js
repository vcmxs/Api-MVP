const pool = require('../db');
const seedNutrition = require('../seed_nutrition');

// Helper to calculate nutrition based on quantity
const calculateNutrition = (food, quantity) => {
    const ratio = quantity / food.serving_size;
    return {
        calories: Number((food.calories * ratio).toFixed(2)),
        carbs: Number((food.carbs * ratio).toFixed(2)),
        fats: Number((food.fats * ratio).toFixed(2)),
        proteins: Number((food.proteins * ratio).toFixed(2))
    };
};

const NutritionController = {
    // Search foods
    searchFoods: async (req, res) => {
        try {
            const { query, type, limit = 50 } = req.query;
            let sql = 'SELECT * FROM foods WHERE 1=1';
            const params = [];
            let paramCount = 1;

            if (query) {
                sql += ` AND name ILIKE $${paramCount}`;
                params.push(`%${query}%`);
                paramCount++;
            }

            if (type) {
                sql += ` AND type = $${paramCount}`;
                params.push(type);
                paramCount++;
            }

            sql += ` LIMIT $${paramCount}`;
            params.push(limit);

            const result = await pool.query(sql, params);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error searching foods' });
        }
    },

    // Get food by ID
    getFoodById: async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM foods WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Food not found' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error fetching food' });
        }
    },

    // Log a meal
    logMeal: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { food_id, meal_type, serving_quantity, notes, date } = req.body;
            const user_id = req.user.id;
            const logDate = date || new Date().toISOString().split('T')[0];

            // 1. Get food details
            const foodRes = await client.query('SELECT * FROM foods WHERE id = $1', [food_id]);
            if (foodRes.rows.length === 0) {
                throw new Error('Food not found');
            }
            const food = foodRes.rows[0];

            // 2. Create meal log
            const logRes = await client.query(
                `INSERT INTO meal_logs (user_id, food_id, meal_type, serving_quantity, logged_date, food_snapshot, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [user_id, food_id, meal_type, serving_quantity, logDate, food, notes]
            );

            // 3. Update Daily Summary
            // Calculate nutrition to add
            const nutrition = calculateNutrition(food, serving_quantity);

            // Check if summary exists
            const summaryRes = await client.query(
                'SELECT * FROM daily_nutrition_summary WHERE user_id = $1 AND summary_date = $2',
                [user_id, logDate]
            );

            if (summaryRes.rows.length === 0) {
                // Create new summary
                await client.query(
                    `INSERT INTO daily_nutrition_summary 
                    (user_id, summary_date, total_calories, total_carbs, total_fats, total_proteins)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [user_id, logDate, nutrition.calories, nutrition.carbs, nutrition.fats, nutrition.proteins]
                );
            } else {
                // Update existing summary
                await client.query(
                    `UPDATE daily_nutrition_summary 
                     SET total_calories = total_calories + $1,
                         total_carbs = total_carbs + $2,
                         total_fats = total_fats + $3,
                         total_proteins = total_proteins + $4,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = $5 AND summary_date = $6`,
                    [nutrition.calories, nutrition.carbs, nutrition.fats, nutrition.proteins, user_id, logDate]
                );
            }

            await client.query('COMMIT');
            res.status(201).json(logRes.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ message: err.message || 'Error logging meal' });
        } finally {
            client.release();
        }
    },

    // Delete meal log
    deleteMealLog: async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            const user_id = req.user.id;

            // 1. Get log to delete
            const logRes = await client.query('SELECT * FROM meal_logs WHERE id = $1 AND user_id = $2', [id, user_id]);
            if (logRes.rows.length === 0) {
                return res.status(404).json({ message: 'Log not found' });
            }
            const log = logRes.rows[0];
            const food = log.food_snapshot;

            // 2. Delete log
            await client.query('DELETE FROM meal_logs WHERE id = $1', [id]);

            // 3. Subtract from Daily Summary
            if (food) {
                const nutrition = calculateNutrition(food, log.serving_quantity);
                await client.query(
                    `UPDATE daily_nutrition_summary 
                     SET total_calories = GREATEST(0, total_calories - $1),
                         total_carbs = GREATEST(0, total_carbs - $2),
                         total_fats = GREATEST(0, total_fats - $3),
                         total_proteins = GREATEST(0, total_proteins - $4),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = $5 AND summary_date = $6`,
                    [nutrition.calories, nutrition.carbs, nutrition.fats, nutrition.proteins, user_id, log.logged_date]
                );
            }

            await client.query('COMMIT');
            res.json({ message: 'Meal log deleted successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ message: 'Error deleting meal log' });
        } finally {
            client.release();
        }
    },

    // Get Daily Summary
    getDailySummary: async (req, res) => {
        try {
            const { date } = req.params;
            const { userId } = req.query; // Optional userId for coaches
            let targetUserId = req.user.id;

            // If a specific userId is requested, verify access
            if (userId && parseInt(userId) !== req.user.id) {
                // User is trying to view ANOTHER user's data
                // Check if requester is a coach and has this trainee
                const accessCheck = await pool.query(
                    `SELECT id FROM coach_trainee WHERE coach_id = $1 AND trainee_id = $2`,
                    [req.user.id, userId]
                );

                if (accessCheck.rows.length > 0 || req.user.role === 'admin') {
                    targetUserId = parseInt(userId);
                } else {
                    return res.status(403).json({ message: 'Access denied: You are not assigned to this trainee' });
                }
            } else if (userId && parseInt(userId) === req.user.id) {
                // User is explicitly requesting their own data (which is fine)
                targetUserId = req.user.id;
            }

            // Get summary
            const summaryRes = await pool.query(
                'SELECT * FROM daily_nutrition_summary WHERE user_id = $1 AND summary_date = $2',
                [targetUserId, date]
            );

            // Get meals for that day
            const mealsRes = await pool.query(
                `SELECT ml.*, f.name as food_name, f.serving_unit, f.calories, f.proteins, f.carbs, f.fats 
                 FROM meal_logs ml 
                 LEFT JOIN foods f ON ml.food_id = f.id 
                 WHERE ml.user_id = $1 AND ml.logged_date = $2 
                 ORDER BY ml.meal_type, ml.logged_at`,
                [targetUserId, date]
            );

            const summary = summaryRes.rows[0] || {
                total_calories: 0, total_carbs: 0, total_fats: 0, total_proteins: 0,
                calorie_goal: 2000, protein_goal: 150, carb_goal: 250, fat_goal: 70 // Defaults
            };

            res.json({
                summary,
                meals: mealsRes.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error fetching daily summary' });
        }
    },

    // Update Goals
    updateGoals: async (req, res) => {
        try {
            const { calorie_goal, protein_goal, carb_goal, fat_goal, date } = req.body;
            const user_id = req.user.id;
            const updateDate = date || new Date().toISOString().split('T')[0];

            const result = await pool.query(
                `INSERT INTO daily_nutrition_summary (user_id, summary_date, calorie_goal, protein_goal, carb_goal, fat_goal)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, summary_date) 
                 DO UPDATE SET 
                    calorie_goal = EXCLUDED.calorie_goal,
                    protein_goal = EXCLUDED.protein_goal,
                    carb_goal = EXCLUDED.carb_goal,
                    fat_goal = EXCLUDED.fat_goal,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [user_id, updateDate, calorie_goal, protein_goal, carb_goal, fat_goal]
            );

            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error updating goals' });
        }
    },

    // Get Nutrition Stats (Range)
    getNutritionStats: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const user_id = req.user.id;

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start date and end date required' });
            }

            const result = await pool.query(
                `SELECT * FROM daily_nutrition_summary 
                 WHERE user_id = $1 AND summary_date >= $2 AND summary_date <= $3
                 ORDER BY summary_date ASC`,
                [user_id, startDate, endDate]
            );

            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error fetching nutrition stats' });
        }
    },

    // Force seed (manual trigger)
    forceSeed: async (req, res) => {
        try {
            console.log('🌱 Manual seeding triggered via API...');
            await seedNutrition();
            res.json({ message: 'Seeding process completed successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error running seed script', error: err.message });
        }
    }
};

module.exports = NutritionController;
