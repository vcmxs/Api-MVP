const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'controllers', 'admin.controller.js');
let c = fs.readFileSync(file, 'utf8');

// Find the old simple res.json and replace with enhanced version
const oldJson = `res.json({\r\n            finance: { mrr, arr, churn_rate, net_profit, revenue_by_tier, historical_revenue }\r\n        });`;

const newJson = `// Recent individual payments this month (with coach name)\r\n        const recentPaymentsRes = await pool.query(\`\r\n            SELECT p.id, p.coach_id, u.name as coach_name, u.email as coach_email,\r\n                   p.amount, p.tier, p.status, p.created_at\r\n            FROM payments p\r\n            JOIN users u ON p.coach_id = u.id\r\n            WHERE p.created_at >= DATE_TRUNC('month', NOW())\r\n            ORDER BY p.created_at DESC\r\n            LIMIT 50\r\n        \`);\r\n        const recent_payments = recentPaymentsRes.rows.map(r => ({\r\n            id: r.id, coachId: r.coach_id, coachName: r.coach_name, coachEmail: r.coach_email,\r\n            amount: parseFloat(r.amount), tier: r.tier, status: r.status, createdAt: r.created_at\r\n        }));\r\n        const month_total = recent_payments.reduce((sum, p) => sum + p.amount, 0);\r\n\r\n        res.json({\r\n            finance: { mrr, arr, churn_rate, net_profit, revenue_by_tier, historical_revenue, recent_payments, month_total }\r\n        });`;

if (!c.includes(oldJson)) {
    console.error('Marker not found. File contents around target:');
    const idx = c.indexOf('res.json');
    console.log(JSON.stringify(c.slice(idx, idx + 200)));
    process.exit(1);
}

c = c.replace(oldJson, newJson);
fs.writeFileSync(file, c);
console.log('Done: Added recent_payments to finance endpoint');
