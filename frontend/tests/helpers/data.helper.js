/**
 * Data Helper for Playwright Tests
 * Utilities for working with data tables and breakdowns
 */

/**
 * Get Partner-wise Breakdown table rows
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<import('@playwright/test').Locator>} Partner rows locator
 */
function getPartnerRows(page) {
  return page.locator("tbody tr").filter({
    hasNot: page.locator('td:has-text("No partner data")'),
  });
}

/**
 * Get Center-wise Breakdown table rows
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<import('@playwright/test').Locator>} Center rows locator
 */
function getCenterRows(page) {
  return page.locator("tbody tr").filter({
    hasNot: page.locator('td:has-text("No center data")'),
  });
}

/**
 * Extract student counts from a row (for sorting validation)
 * @param {import('@playwright/test').Locator} rows - Row locator
 * @param {number} columnIndex - Column index for student count
 * @param {number} maxRows - Maximum rows to extract
 * @returns {Promise<number[]>} Array of student counts
 */
async function extractStudentCounts(rows, columnIndex, maxRows = 5) {
  const count = await rows.count();
  const students = [];

  for (let i = 0; i < Math.min(count, maxRows); i++) {
    const cell = rows.nth(i).locator(`td:nth-child(${columnIndex})`);
    const text = await cell.textContent();
    const num = parseInt(text.trim().replace(/,/g, ""));

    if (!isNaN(num)) {
      students.push(num);
    }
  }

  return students;
}

/**
 * Verify descending sort order
 * @param {number[]} numbers - Array of numbers to check
 * @returns {boolean} True if sorted in descending order
 */
function isDescendingOrder(numbers) {
  for (let i = 0; i < numbers.length - 1; i++) {
    if (numbers[i] < numbers[i + 1]) {
      return false;
    }
  }
  return true;
}

/**
 * Change year filter
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} year - Year to select ('all', '2022-23', '2023-24', '2024-25')
 */
async function changeYearFilter(page, year) {
  const yearFilter = page
    .locator("select")
    .filter({ hasText: /year|financial/i })
    .first();

  if ((await yearFilter.count()) > 0) {
    const yearPatterns = {
      all: /all/i,
      "2022-23": /2022.*23/i,
      "2023-24": /2023.*24/i,
      "2024-25": /2024.*25/i,
    };

    const pattern = yearPatterns[year] || /all/i;
    await yearFilter.selectOption({ label: pattern });
    await page.waitForTimeout(1500);

    console.log(`✅ Year filter changed to: ${year}`);
  } else {
    console.warn("⚠️ Year filter not found");
  }
}

/**
 * Get table content as text (for search/verification)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} tableIdentifier - Text to identify the table
 * @returns {Promise<string>} Table content as text
 */
async function getTableContent(page, tableIdentifier) {
  const table = page
    .locator("table")
    .filter({ hasText: tableIdentifier })
    .first();
  return await table.textContent();
}

/**
 * Count rows with data (excluding "No data" messages)
 * @param {import('@playwright/test').Locator} rows - Row locator
 * @returns {Promise<number>} Number of rows with data
 */
async function countDataRows(rows) {
  return await rows.count();
}

/**
 * Extract row data as object
 * @param {import('@playwright/test').Locator} row - Single row locator
 * @param {string[]} columnNames - Column names for object keys
 * @returns {Promise<Object>} Row data as object
 */
async function extractRowData(row, columnNames) {
  const data = {};

  for (let i = 0; i < columnNames.length; i++) {
    const cell = row.locator(`td:nth-child(${i + 1})`);
    const text = await cell.textContent();
    data[columnNames[i]] = text.trim();
  }

  return data;
}

/**
 * Verify location format (City, State)
 * @param {string} location - Location string to verify
 * @returns {boolean} True if format is correct
 */
function isValidLocationFormat(location) {
  // Should contain comma and have at least 2 parts
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length >= 2;
}

/**
 * Wait for data to load
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds
 */
async function waitForDataLoad(page, timeout = 3000) {
  await page.waitForTimeout(timeout);
}

module.exports = {
  getPartnerRows,
  getCenterRows,
  extractStudentCounts,
  isDescendingOrder,
  changeYearFilter,
  getTableContent,
  countDataRows,
  extractRowData,
  isValidLocationFormat,
  waitForDataLoad,
};
