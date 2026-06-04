@echo off
echo 🔄 Deploying Firestore Security Rules...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI is not installed!
    echo Install it with: npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if firebase.json exists
if not exist "firebase.json" (
    echo 🔄 Creating firebase.json configuration...
    (
        echo {
        echo   "firestore": {
        echo     "rules": "firestore.rules"
        echo   }
        echo }
    ) > firebase.json
    echo ✅ Created firebase.json
)

REM Deploy the rules
echo 🔄 Deploying security rules to Firebase project...
firebase deploy --only firestore:rules --project sia-hr-admin

if %errorlevel% equ 0 (
    echo ✅ Firestore security rules deployed successfully!
    echo.
    echo 📋 Rules Summary:
    echo   - ranking_cycles: Public read, Auth write
    echo   - users: Public read, Auth write
    echo   - applications: Public read, Auth write
    echo   - area_submissions: Auth read/write
    echo   - activity_logs: Auth read/write
    echo   - faculty: Public read, Auth write
    echo   - areas: Public read, Auth write
    echo   - departments: Public read, Auth write
    echo   - positions: Public read, Auth write
    echo   - All other collections: Denied
) else (
    echo ❌ Deployment failed!
)

pause
