-- Check subscription status for all coaches
SELECT id, name, email, role, subscription_status 
FROM users 
WHERE role = 'coach';
