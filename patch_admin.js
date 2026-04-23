const fs = require('fs');
const path = require('path');
const controllerPath = path.join(__dirname, 'controllers/admin.controller.js');
let content = fs.readFileSync(controllerPath, 'utf8');

// 1. Destructure isComped
content = content.replace(
  `const { status, tier } = req.body;`,
  `const { status, tier, isComped } = req.body;`
);

// 2. Add is_comped to SELECT query
content = content.replace(
  `'SELECT role, subscription_status, subscription_start_date, referred_by, referral_discount_used, subscription_tier FROM users WHERE id = $1',`,
  `'SELECT role, subscription_status, subscription_start_date, referred_by, referral_discount_used, subscription_tier, is_comped FROM users WHERE id = $1',`
);

// 3. Add is_comped to UPDATE query
content = content.replace(
  `        if (tier) {
            query += \`, subscription_tier = $\${valueIndex}\`;
            values.push(tier);
            valueIndex++;
        }`,
  `        if (tier) {
            query += \`, subscription_tier = $\${valueIndex}\`;
            values.push(tier);
            valueIndex++;
        }

        if (isComped !== undefined) {
            query += \`, is_comped = $\${valueIndex}\`;
            values.push(isComped);
            valueIndex++;
        }`
);

// 4. Update the logic block for Referrals and Payments
const oldLogic = `        // Logic: If user has a Referrer, calculate commission.
        if (shouldUpdateDates && (newStatus === 'active' || currentStatus === 'active')) {
            const referrerId = currentUser.referred_by;
            if (referrerId) {
                const finalTier = tier || currentUser.subscription_tier || 'starter';`;
            
const newLogic = `        // Logic: If user has a Referrer, calculate commission.
        if (shouldUpdateDates && (newStatus === 'active' || currentStatus === 'active')) {
            const finalComped = isComped !== undefined ? isComped : currentUser.is_comped;
            const finalTier = tier || currentUser.subscription_tier || 'starter';
            const tierInfo = getTierInfo(finalTier);
            const basePrice = tierInfo?.price || 0;

            // INSERT INTO PAYMENTS IF NOT COMPED
            if (!finalComped && basePrice > 0) {
                await pool.query(
                    'INSERT INTO payments (coach_id, amount, tier, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
                    [req.params.userId, basePrice, finalTier, 'succeeded']
                );
            }

            const referrerId = currentUser.referred_by;
            if (referrerId && !finalComped) {`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync(controllerPath, content);
console.log("Patched admin.controller.js");
