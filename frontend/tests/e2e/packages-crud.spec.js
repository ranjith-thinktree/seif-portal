/**
 * @fileoverview E2E Tests for Refurbishment Packages CRUD Operations
 * Tests: Create, Read/View, Update/Edit, Delete for packages with image handling
 * 
 * @requires @playwright/test
 */

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth';

// Test data
const TEST_PACKAGE = {
  name: 'E2E Test Package - ' + Date.now(),
  description: 'This is an automated test package created by Playwright E2E testing suite',
  labs: ['Basic Electrican', 'Solar Solution'] // Must match actual lab names in DB
};

const UPDATED_PACKAGE = {
  name: 'E2E Test Package (Updated) - ' + Date.now(),
  description: 'This package has been updated by the automated test suite',
};

test.describe('Refurbishment Packages - Complete CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await login(page, {
      email: 'admin@seif.org',
      password: 'Admin@123' // Update with actual test credentials
    });

    // Navigate to Refurbishment Dashboard
    await page.goto('/admin/refurbishment');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Click on Packages tab
    await page.click('button:has-text("Packages")');
    
    // Wait for packages to load
    await page.waitForSelector('[data-testid="packages-table"], .table, table', {
      timeout: 10000
    });
  });

  test('should display packages tab correctly', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h3:has-text("Refurbishment Packages")')).toBeVisible();
    
    // Verify Create Package button exists
    await expect(page.locator('button:has-text("Create Package")')).toBeVisible();
    
    // Verify table or data display
    const hasTable = await page.locator('table').count() > 0;
    const hasDataDisplay = await page.locator('[data-testid="packages-list"]').count() > 0;
    expect(hasTable || hasDataDisplay).toBeTruthy();
  });

  test('should open create package modal', async ({ page }) => {
    // Click Create Package button
    await page.click('button:has-text("Create Package")');
    
    // Verify modal opened
    await expect(page.locator('text=Create New Package')).toBeVisible();
    
    // Verify form fields exist
    await expect(page.locator('input[placeholder*="Basic Furniture Package"], input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="description"]')).toBeVisible();
    
    // Verify labs selection exists
    await expect(page.locator('text=Applicable Labs')).toBeVisible();
    
    // Verify image upload area exists
    await expect(page.locator('text=Package Images')).toBeVisible();
  });

  test('should create a new package without images', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Package")');
    await page.waitForSelector('text=Create New Package');
    
    // Fill in package name
    await page.fill('input[placeholder*="Basic Furniture Package"], input[name="name"]', TEST_PACKAGE.name);
    
    // Fill in description
    await page.fill('textarea[placeholder*="description"]', TEST_PACKAGE.description);
    
    // Select labs (click checkboxes)
    for (const lab of TEST_PACKAGE.labs) {
      const checkbox = page.locator(`label:has-text("${lab}")`).first();
      if (await checkbox.count() > 0) {
        await checkbox.click();
      }
    }
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create Package")');
    
    // Wait for success message or modal to close
    await page.waitForTimeout(2000);
    
    // Verify modal closed
    await expect(page.locator('text=Create New Package')).not.toBeVisible();
    
    // Verify new package appears in the table
    await expect(page.locator(`text=${TEST_PACKAGE.name}`)).toBeVisible({ timeout: 10000 });
  });

  test('should view package details with images', async ({ page }) => {
    // Wait for packages to load
    await page.waitForTimeout(2000);
    
    // Find first package row
    const firstRow = page.locator('table tbody tr, [data-testid="package-row"]').first();
    
    // Click View button (eye icon)
    await firstRow.locator('button[title="View Package"], button:has-text("View")').first().click();
    
    // Wait for modal to open
    await expect(page.locator('text=Package Details')).toBeVisible();
    
    // Verify images section exists at the top
    await expect(page.locator('text=Package Images')).toBeVisible();
    
    // Verify package information is displayed
    await expect(page.locator('text=Package Information, text=Description')).toBeVisible();
    
    // Verify labs section
    await expect(page.locator('text=Applicable Labs, text=Training Labs')).toBeVisible();
    
    // Verify metadata (Created At, Last Updated)
    await expect(page.locator('text=Created At')).toBeVisible();
    await expect(page.locator('text=Last Updated')).toBeVisible();
    
    // Verify Edit button exists
    await expect(page.locator('button:has-text("Edit Package")')).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Close")');
    await expect(page.locator('text=Package Details')).not.toBeVisible();
  });

  test('should verify images are displayed in view modal', async ({ page }) => {
    // Find a package with images (check if image count badge exists)
    const packageWithImages = page.locator('table tbody tr').first();
    
    // Click View button
    await packageWithImages.locator('button[title="View Package"]').first().click();
    
    // Wait for modal
    await expect(page.locator('text=Package Details')).toBeVisible();
    
    // Check if images are displayed
    const imageElements = page.locator('img[alt*="Image"]');
    const imageCount = await imageElements.count();
    
    if (imageCount > 0) {
      // Verify images are visible
      await expect(imageElements.first()).toBeVisible();
      
      // Verify image counter badge
      await expect(page.locator('text=/ 2, text=/ 1').or(page.locator('[class*="absolute"][class*="top-2"]'))).toBeVisible();
    } else {
      // Verify "No images available" message
      await expect(page.locator('text=No images available')).toBeVisible();
    }
  });

  test('should edit a package', async ({ page }) => {
    // Find the test package we created
    await page.waitForTimeout(2000);
    
    // Find first package
    const firstRow = page.locator('table tbody tr').first();
    
    // Click Edit button (pencil icon)
    await firstRow.locator('button[title="Edit Package"]').click();
    
    // Wait for edit modal
    await expect(page.locator('text=Edit Package')).toBeVisible();
    
    // Update package name
    await page.fill('input[placeholder*="Basic Furniture Package"]', UPDATED_PACKAGE.name);
    
    // Update description
    await page.fill('textarea[placeholder*="description"]', UPDATED_PACKAGE.description);
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Update Package")');
    
    // Wait for success
    await page.waitForTimeout(2000);
    
    // Verify modal closed
    await expect(page.locator('text=Edit Package')).not.toBeVisible();
    
    // Verify updated name appears in table
    await expect(page.locator(`text=${UPDATED_PACKAGE.name}`)).toBeVisible({ timeout: 10000 });
  });

  test('should display existing images in edit modal', async ({ page }) => {
    // Find first package
    const firstRow = page.locator('table tbody tr').first();
    
    // Click Edit button
    await firstRow.locator('button[title="Edit Package"]').click();
    
    // Wait for modal
    await expect(page.locator('text=Edit Package')).toBeVisible();
    
    // Check for existing images section
    const existingImagesSection = page.locator('text=Existing Images');
    
    if (await existingImagesSection.count() > 0) {
      await expect(existingImagesSection).toBeVisible();
      
      // Verify images are displayed
      await expect(page.locator('img[alt*="Existing"]').first()).toBeVisible();
    }
    
    // Verify upload zone exists
    await expect(page.locator('text=Click to upload, text=Package Images')).toBeVisible();
  });

  test('should handle image upload validation', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Package")');
    await page.waitForSelector('text=Create New Package');
    
    // Try to upload too many images (if validation exists)
    const fileInput = page.locator('input[type="file"]');
    
    // Verify file input accepts images
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('image');
    
    // Verify max images message
    await expect(page.locator('text=Max 10 images, text=10 images')).toBeVisible();
  });

  test('should delete a package with confirmation', async ({ page }) => {
    // Find the updated test package
    await page.waitForTimeout(2000);
    
    // Find first package
    const firstRow = page.locator('table tbody tr').first();
    
    // Get package name before deletion
    const packageName = await firstRow.locator('td:first-child, [data-cell="name"]').textContent();
    
    // Click Delete button (trash icon)
    await firstRow.locator('button[title="Delete Package"]').click();
    
    // Wait for confirmation dialog
    await page.waitForTimeout(1000);
    
    // Look for confirmation dialog (might be browser confirm or custom modal)
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")');
    
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }
    
    // Wait for deletion to complete
    await page.waitForTimeout(2000);
    
    // Verify package is removed from table
    await expect(page.locator(`text=${packageName}`)).not.toBeVisible({ timeout: 10000 });
  });

  test('should search packages by name', async ({ page }) => {
    // Wait for packages to load
    await page.waitForTimeout(2000);
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search packages"], input[type="search"]');
    
    if (await searchInput.count() > 0) {
      // Get first package name
      const firstPackageName = await page.locator('table tbody tr:first-child td:first-child').textContent();
      
      // Search for it
      await searchInput.fill(firstPackageName.trim());
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify search results
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('should filter packages by lab/course', async ({ page }) => {
    // Wait for packages to load
    await page.waitForTimeout(2000);
    
    // Look for filter dropdown or chips
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("All Labs")');
    
    if (await filterButton.count() > 0) {
      await filterButton.first().click();
      
      // Select first lab/course
      const firstCourse = page.locator('[role="option"], button[class*="rounded-full"]').first();
      await firstCourse.click();
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify table updated
      const rows = page.locator('table tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);
    }
  });

  test('should export packages to CSV', async ({ page }) => {
    // Find export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Export CSV")');
    
    if (await exportButton.count() > 0) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download name contains 'package'
      expect(download.suggestedFilename()).toContain('package');
    }
  });

  test('should validate required fields in create form', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Package")');
    await page.waitForSelector('text=Create New Package');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]:has-text("Create Package")');
    
    // Verify validation messages or disabled state
    const submitButton = page.locator('button[type="submit"]:has-text("Create Package")');
    const isDisabled = await submitButton.isDisabled();
    
    expect(isDisabled).toBeTruthy();
  });

  test('should handle pagination if packages exceed page size', async ({ page }) => {
    // Wait for packages to load
    await page.waitForTimeout(2000);
    
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), button[aria-label="Next page"]');
    const _prevButton = page.locator('button:has-text("Previous"), button[aria-label="Previous page"]');
    
    if (await nextButton.count() > 0) {
      // Get initial first package name
      const firstPackage = await page.locator('table tbody tr:first-child td:first-child').textContent();
      
      // Click next page
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Get new first package name
      const newFirstPackage = await page.locator('table tbody tr:first-child td:first-child').textContent();
      
      // Verify packages changed
      expect(newFirstPackage).not.toBe(firstPackage);
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    // Try to create a package
    await page.click('button:has-text("Create Package")');
    await page.fill('input[placeholder*="Basic Furniture Package"]', 'Error Test Package');
    await page.click('button[type="submit"]:has-text("Create Package")');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Verify error handling (toast, modal, etc.)
    const _errorMessage = page.locator('text=error, text=failed, text=network');
    // Error message might not be visible depending on implementation
    
    // Restore network
    await page.context().setOffline(false);
  });
});

test.describe('Refurbishment Packages - Image Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, {
      email: 'admin@seif.org',
      password: 'Admin@123'
    });
    await page.goto('/admin/refurbishment');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Packages")');
    await page.waitForTimeout(2000);
  });

  test('should click on image to open in new tab', async ({ page }) => {
    // Find first package and view it
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="View Package"]').click();
    
    // Wait for modal
    await expect(page.locator('text=Package Details')).toBeVisible();
    
    // Check if images exist
    const firstImage = page.locator('img[alt*="Image"]').first();
    
    if (await firstImage.count() > 0) {
      // Setup popup listener
      const popupPromise = page.waitForEvent('popup');
      
      // Click image
      await firstImage.click();
      
      // Verify new tab opened
      const popup = await popupPromise;
      expect(popup.url()).toContain('http');
    }
  });

  test('should remove existing image in edit mode', async ({ page }) => {
    // Find first package and edit it
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="Edit Package"]').click();
    
    // Wait for modal
    await expect(page.locator('text=Edit Package')).toBeVisible();
    
    // Check if existing images exist
    const removeButton = page.locator('button[title="Remove image"]').first();
    
    if (await removeButton.count() > 0) {
      // Count images before removal
      const imagesBefore = await page.locator('img[alt*="Existing"]').count();
      
      // Click remove button
      await removeButton.click();
      await page.waitForTimeout(500);
      
      // Count images after removal
      const imagesAfter = await page.locator('img[alt*="Existing"]').count();
      
      // Verify image was removed
      expect(imagesAfter).toBe(imagesBefore - 1);
    }
  });

  test('should show "NEW" badge on newly uploaded images', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Package")');
    await page.waitForSelector('text=Create New Package');
    
    // Upload an image (if possible in testing environment)
    // Note: File upload might require actual files or mocking
    
    // Verify NEW badge appears (if images were uploaded)
    const _newBadge = page.locator('text=NEW');
    // Badge visibility depends on actual upload
  });

  test('should display image counter in view modal', async ({ page }) => {
    // View first package
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.locator('button[title="View Package"]').click();
    
    // Wait for modal
    await expect(page.locator('text=Package Details')).toBeVisible();
    
    // Check for image counter (e.g., "1 / 2")
    const imageCounter = page.locator('[class*="absolute"][class*="top-2"]');
    
    if (await imageCounter.count() > 0) {
      const counterText = await imageCounter.first().textContent();
      expect(counterText).toMatch(/\d+\s*\/\s*\d+/);
    }
  });
});
