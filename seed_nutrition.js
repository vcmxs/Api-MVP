const fs = require('fs');
const path = require('path');
// Import pool from db.js to ensure tables are created
const pool = require('./db');

const CSV_PATH = path.join(__dirname, 'data', 'nutrition_data.csv');

const parseValue = (val) => {
    if (!val) return 0;
    // Remove quotes and replace comma with dot
    const cleanVal = val.replace(/"/g, '').replace(',', '.').trim();
    return parseFloat(cleanVal) || 0;
};

const parseCSVLine = (line) => {
    const result = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentValue.trim());
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    result.push(currentValue.trim());
    return result;
};

const seedNutrition = async () => {
    // Wait for db.js to initialize tables (race condition fix)
    console.log('⏳ Waiting for database tables to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const client = await pool.connect();

    try {
        console.log('🌱 Starting nutrition seeding...');

        // Read file
        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split('\n');

        let insertedCount = 0;

        // Start transaction
        await client.query('BEGIN');

        // Skip first 4 lines (headers and empty lines)
        for (let i = 4; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = parseCSVLine(line);

            // Expected format based on CSV:
            // index 0: Empty (comma at start)
            // index 1: COMIDA (Name)
            // index 2: TIPO (Type)
            // index 3: CARBOHIDRATO
            // index 4: GRASAS
            // index 5: PROTEINAS
            // index 6: CALORIAS
            // index 7: RACION

            // Skip if no name
            if (!columns[1]) continue;

            const name = columns[1].replace(/"/g, ''); // Remove quotes if any
            const type = columns[2] ? columns[2].replace(/"/g, '') : 'Other';

            const carbs = parseValue(columns[3]);
            const fats = parseValue(columns[4]);
            const proteins = parseValue(columns[5]);
            const calories = parseValue(columns[6]);
            const servingSize = parseValue(columns[7]);

            // Check if food already exists to avoid duplicates
            const checkRes = await client.query('SELECT id FROM foods WHERE name = $1', [name]);

            if (checkRes.rows.length === 0) {
                await client.query(
                    `INSERT INTO foods (name, type, carbs, fats, proteins, calories, serving_size, serving_unit)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'g')`,
                    [name, type, carbs, fats, proteins, calories, servingSize]
                );
                insertedCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully inserted ${insertedCount} food items.`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding nutrition data:', err);
    } finally {
        // Only close pool if running as script
        if (require.main === module) {
            client.release();
            pool.end();
        } else {
            client.release();
        }
    }
};

// Run if called directly
if (require.main === module) {
    seedNutrition();
}

module.exports = seedNutrition;
