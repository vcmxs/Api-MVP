const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'controllers', 'admin.controller.js');
let c = fs.readFileSync(file, 'utf8');

// 1. Add logAudit helper after the require statements
const afterRequires = `const pool = require('../config/database');\r\nconst { SUBSCRIPTION_TIERS, isValidTier, getTierInfo } = require('../config/subscriptionTiers');`;
const withHelper = `const pool = require('../config/database');\r\nconst { SUBSCRIPTION_TIERS, isValidTier, getTierInfo } = require('../config/subscriptionTiers');\r\n\r\n// Utility: write an audit log entry\r\nasync function logAudit({ adminId, adminName, adminEmail, actionType, actionName, details, targetUserId, ipAddress }) {\r\n    try {\r\n        await pool.query(\r\n            \`INSERT INTO audit_logs (admin_id, admin_name, admin_email, action_type, action_name, details, target_user_id, ip_address)\r\n             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,\r\n            [adminId || null, adminName || 'Admin', adminEmail || '', actionType, actionName, details || '', targetUserId || null, ipAddress || null]\r\n        );\r\n    } catch (e) {\r\n        console.error('[Audit] Failed to write audit log:', e.message);\r\n    }\r\n}`;

c = c.replace(afterRequires, withHelper);

// 2. Add audit log after successful block/unblock — find blockUser
const blockSuccess = `        res.json({ message: \`User \${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully\`, user: result.rows[0] });`;
const blockWithAudit = `        const blockedUser = result.rows[0];\r\n        await logAudit({\r\n            adminId: req.user?.id, adminName: req.user?.name, adminEmail: req.user?.email,\r\n            actionType: 'security',\r\n            actionName: newStatus === 'blocked' ? 'User Blocked' : 'User Unblocked',\r\n            details: \`\${newStatus === 'blocked' ? 'Blocked' : 'Unblocked'} user \${blockedUser.name} (ID \${blockedUser.id})\`,\r\n            targetUserId: blockedUser.id,\r\n            ipAddress: req.ip\r\n        });\r\n        res.json({ message: \`User \${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully\`, user: blockedUser });`;
c = c.replace(blockSuccess, blockWithAudit);

// 3. Add audit after subscription update
const subSuccess = `        res.json({ user: result.rows[0] });`;
const subWithAudit = `        const updatedUser = result.rows[0];\r\n        await logAudit({\r\n            adminId: req.user?.id, adminName: req.user?.name, adminEmail: req.user?.email,\r\n            actionType: 'user_management',\r\n            actionName: isComped ? 'Comped Subscription' : 'Subscription Updated',\r\n            details: \`\${isComped ? '[COMPED] ' : ''}Set \${updatedUser.name} (ID \${updatedUser.id}) to \${tier || updatedUser.subscription_tier} / \${status || updatedUser.subscription_status}\`,\r\n            targetUserId: updatedUser.id,\r\n            ipAddress: req.ip\r\n        });\r\n        res.json({ user: updatedUser });`;
c = c.replace(subSuccess, subWithAudit);

// 4. Add audit after payout
const payoutSuccess = `        res.json({ message: 'Marked as paid' });`;
const payoutWithAudit = `        await logAudit({\r\n            adminId: req.user?.id, adminName: req.user?.name, adminEmail: req.user?.email,\r\n            actionType: 'financial',\r\n            actionName: 'Referral Payout',\r\n            details: \`Marked referral earning ID \${earningId} ($\${earning.amount}) as PAID for coach ID \${earning.referrer_id}\`,\r\n            targetUserId: earning.referrer_id,\r\n            ipAddress: req.ip\r\n        });\r\n        res.json({ message: 'Marked as paid' });`;
c = c.replace(payoutSuccess, payoutWithAudit);

// 5. Add getAuditLogs endpoint at the end
const endOfFile = c.trimEnd();
const auditEndpoint = `\r\n\r\nexports.getAuditLogs = async (req, res) => {\r\n    try {\r\n        const { type, search } = req.query;\r\n        let query = \`\r\n            SELECT al.id, al.admin_name as "adminName", al.admin_email as "adminEmail",\r\n                   al.action_type as "actionType", al.action_name as "actionName",\r\n                   al.details, al.ip_address as "ipAddress", al.created_at as "createdAt",\r\n                   al.target_user_id as "targetUserId"\r\n            FROM audit_logs al\r\n            WHERE 1=1\r\n        \`;\r\n        const params = [];\r\n        if (type && type !== 'all') {\r\n            params.push(type);\r\n            query += \` AND al.action_type = $\${params.length}\`;\r\n        }\r\n        if (search) {\r\n            params.push(\`%\${search}%\`);\r\n            query += \` AND (al.admin_name ILIKE $\${params.length} OR al.action_name ILIKE $\${params.length} OR al.details ILIKE $\${params.length})\`;\r\n        }\r\n        query += ' ORDER BY al.created_at DESC LIMIT 200';\r\n        const result = await pool.query(query, params);\r\n        res.json({ logs: result.rows });\r\n    } catch (err) {\r\n        res.status(500).json({ error: 'Internal Server Error', message: err.message });\r\n    }\r\n};\r\n`;
c = endOfFile + auditEndpoint;

fs.writeFileSync(file, c);
console.log('✅ Patched admin.controller.js with audit logging + getAuditLogs endpoint');
