@echo off
REM ================================================================
REM CLEAN SLATE: Delete All & Re-upload with ORG Format
REM ================================================================

echo.
echo ========================================================
echo    CLEAN SLATE APPROACH: Delete ^& Re-upload
echo ========================================================
echo.
echo This will:
echo   1. Check if deletion is safe
echo   2. Delete all partners and centers
echo   3. Guide you to re-upload with ORG format
echo.
echo ⚠️  WARNING: This DELETES all existing data!
echo    Make sure you have the CSV files ready.
echo.

REM ----------------------------------------------------------------
REM Check Prerequisites
REM ----------------------------------------------------------------

echo [1/4] Checking prerequisites...
echo.

if not exist "migrations\check_before_delete.sql" (
    echo [ERROR] Safety check script not found!
    pause
    exit /b 1
)

if not exist "migrations\clean_slate_delete_all.sql" (
    echo [ERROR] Delete script not found!
    pause
    exit /b 1
)

echo   ✓ Scripts found
echo.

REM ----------------------------------------------------------------
REM Safety Check
REM ----------------------------------------------------------------

echo [2/4] Running safety check...
echo.
echo ⚠️  CRITICAL: Check the output below carefully!
echo.

mysql -u root -p seif < migrations\check_before_delete.sql

echo.
echo ========================================================
echo   SAFETY CHECK COMPLETE - REVIEW OUTPUT ABOVE
echo ========================================================
echo.
echo ✅ SAFE TO DELETE IF:
echo    - Students count = 0
echo    - Batches count = 0
echo    - All checks show "SAFE TO DELETE"
echo.
echo ⚠️  DO NOT PROCEED IF:
echo    - You have students in the system
echo    - You have batches in the system
echo    - Any count ^> 0
echo.

set /p SAFE="Is it SAFE TO DELETE? (yes/no): "
if /i not "%SAFE%"=="yes" (
    echo.
    echo ❌ CANCELLED - Your data is safe.
    echo Please migrate existing data instead of deleting.
    pause
    exit /b 0
)

REM ----------------------------------------------------------------
REM Confirm Deletion
REM ----------------------------------------------------------------

echo.
echo ⚠️⚠️⚠️ FINAL WARNING ⚠️⚠️⚠️
echo.
echo This will DELETE:
echo   - 8 partners
echo   - 371 centers
echo   - All relationships
echo.
echo Backup will be created automatically.
echo.

set /p CONFIRM="Type 'DELETE' to confirm: "
if /i not "%CONFIRM%"=="DELETE" (
    echo.
    echo Deletion cancelled. No changes made.
    pause
    exit /b 0
)

REM ----------------------------------------------------------------
REM Execute Deletion
REM ----------------------------------------------------------------

echo.
echo [3/4] Deleting all data...
echo.
echo Please enter your MySQL password:
echo.

mysql -u root -p seif < migrations\clean_slate_delete_all.sql

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deletion failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo ✅ Deletion complete!
echo.

REM ----------------------------------------------------------------
REM Next Steps
REM ----------------------------------------------------------------

echo [4/4] Next steps...
echo.
echo ========================================================
echo   DATABASE CLEANED SUCCESSFULLY!
echo ========================================================
echo.
echo Now do this:
echo.
echo 1. Start backend server:
echo    cd c:\Users\ranji\Desktop\TT\SEIF\backend
echo    npm start
echo.
echo 2. Login as SUPER_ADMIN
echo.
echo 3. Upload Partners:
echo    - Go to Data ^> Partners
echo    - Click "Bulk Upload"
echo    - Upload: documents\partners_to_upload.csv
echo    - Verify: 8 partners with ORG-0001 to ORG-0008
echo.
echo 4. Upload Centers:
echo    - Go to Data ^> Centers
echo    - Click "Bulk Upload"
echo    - Upload: documents\centers_data_fixed.csv
echo    - Verify: 384 centers with ORG format
echo.
echo 🎉 All new uploads will have ORG format!
echo.
echo ========================================================
pause
