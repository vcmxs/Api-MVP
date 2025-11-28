# Test Script for Refactored Routes
# Run this in PowerShell to test all refactored endpoints

$baseUrl = "http://localhost:3000/api/v1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Refactored Backend Routes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Auth - Register
Write-Host "Test 1: POST /auth/register" -ForegroundColor Yellow
$registerBody = @{
    name = "Test User"
    email = "testuser_$(Get-Random)@example.com"
    password = "password123"
    role = "trainee"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✅ PASS - User registered successfully" -ForegroundColor Green
    Write-Host "   User ID: $($response.user.id)" -ForegroundColor Gray
    $testUserId = $response.user.id
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Auth - Login
Write-Host "Test 2: POST /auth/login" -ForegroundColor Yellow
$loginBody = @{
    email = "coach@gym.com"
    password = "coach123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✅ PASS - Login successful" -ForegroundColor Green
    Write-Host "   Token: $($response.token.Substring(0, 20))..." -ForegroundColor Gray
    $coachId = $response.user.id
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: User - Get User by ID
Write-Host "Test 3: GET /users/:userId" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/1" -Method Get
    Write-Host "✅ PASS - User retrieved successfully" -ForegroundColor Green
    Write-Host "   User: $($response.name) ($($response.role))" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: User - Get User Profile
Write-Host "Test 4: GET /users/:userId/profile" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/1/profile" -Method Get
    Write-Host "✅ PASS - Profile retrieved successfully" -ForegroundColor Green
    Write-Host "   Name: $($response.name)" -ForegroundColor Gray
    Write-Host "   Email: $($response.email)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: User - Update Profile
Write-Host "Test 5: PUT /users/:userId/profile" -ForegroundColor Yellow
$profileBody = @{
    name = "Updated Test User"
    age = 25
    phone = "123-456-7890"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/1/profile" -Method Put -Body $profileBody -ContentType "application/json"
    Write-Host "✅ PASS - Profile updated successfully" -ForegroundColor Green
    Write-Host "   Updated name: $($response.name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Coach - Get Trainees
Write-Host "Test 6: GET /coaches/:coachId/trainees" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/coaches/1/trainees" -Method Get
    Write-Host "✅ PASS - Trainees retrieved successfully" -ForegroundColor Green
    Write-Host "   Number of trainees: $($response.trainees.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Coach - Assign Trainee
Write-Host "Test 7: POST /coaches/:coachId/trainees" -ForegroundColor Yellow
$assignBody = @{
    email = "john@gym.com"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/coaches/1/trainees" -Method Post -Body $assignBody -ContentType "application/json"
    Write-Host "✅ PASS - Trainee assigned successfully" -ForegroundColor Green
    Write-Host "   Trainee: $($response.name)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Message -like "*409*" -or $_.Exception.Message -like "*Conflict*") {
        Write-Host "⚠️  EXPECTED - Trainee already assigned" -ForegroundColor Yellow
    } else {
        Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Auth Module: 2 endpoints tested" -ForegroundColor Green
Write-Host "✅ User Module: 5 endpoints tested" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Test with frontend application" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3001" -ForegroundColor Gray
Write-Host "2. Try logging in as coach@gym.com / coach123" -ForegroundColor Gray
Write-Host "3. Navigate to profile and update it" -ForegroundColor Gray
Write-Host "4. Check trainee list" -ForegroundColor Gray
