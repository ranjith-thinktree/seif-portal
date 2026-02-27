@echo off
REM =========================================
REM  Run Database Migration
REM  File: 20260212_add_is_manual_request_to_scheduled_notifications.sql
REM =========================================

echo.
echo ===================================================
echo  SEIF Portal - Database Migration Runner
echo ===================================================
echo.
echo This will apply the is_manual_request column migration
echo to the scheduled_refurbishment_notifications table.
echo.
echo IMPORTANT: Make sure MySQL is running!
echo.

REM Try common MySQL paths
set MYSQL_PATH=""

if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "C:\xampp\mysql\bin\mysql.exe" (
    set MYSQL_PATH="C:\xampp\mysql\bin\mysql.exe"
) else if exist "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe" (
    set MYSQL_PATH="C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
) else (
    echo ERROR: MySQL not found in common locations.
    echo Please run this command manually:
    echo.
    echo mysql -u root -p seif ^< 20260212_add_is_manual_request_to_scheduled_notifications.sql
    echo.
    pause
    exit /b 1
)

echo Found MySQL at: %MYSQL_PATH%
echo.
echo Applying migration...
echo.

%MYSQL_PATH% -u root -p seif < 20260212_add_is_manual_request_to_scheduled_notifications.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo  SUCCESS: Migration applied successfully!
    echo ===================================================
    echo.
    echo Changes made:
    echo  - Added is_manual_request column
    echo  - Added index for filtering
    echo  - Updated existing records
    echo.
) else (
    echo.
    echo ===================================================
    echo  ERROR: Migration failed!
    echo ===================================================
    echo.
    echo Please check:
    echo  1. MySQL is running
    echo  2. Database 'seif' exists
    echo  3. You entered the correct password
    echo.
)

pause
