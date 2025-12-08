/**
 * CSV Utility Functions
 * Functions for fetching and parsing CSV files
 */

/**
 * Parse CSV text content into 2D array
 * @param {string} csvText - Raw CSV text content
 * @returns {Array<Array<string>>} 2D array of CSV data
 */
export const parseCSV = (csvText) => {
  if (!csvText) return [];

  const lines = csvText.split("\n").filter((line) => line.trim());
  return lines.map((line) => {
    // Handle basic CSV parsing (simple comma-separated values)
    // Note: This doesn't handle escaped commas or quotes
    return line.split(",").map((cell) => cell.trim());
  });
};

/**
 * Fetch CSV file content from URL
 * @param {string} fileUrl - URL of the CSV file
 * @returns {Promise<string>} CSV text content
 */
export const fetchCSVContent = async (fileUrl) => {
  if (!fileUrl) {
    throw new Error("File URL is required");
  }

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const csvText = await response.text();
    return csvText;
  } catch (error) {
    console.error("Error fetching CSV:", error);
    throw error;
  }
};

/**
 * Fetch and parse CSV file in one step
 * @param {string} fileUrl - URL of the CSV file
 * @returns {Promise<Array<Array<string>>>} Parsed CSV data as 2D array
 */
export const fetchAndParseCSV = async (fileUrl) => {
  const csvText = await fetchCSVContent(fileUrl);
  return parseCSV(csvText);
};
