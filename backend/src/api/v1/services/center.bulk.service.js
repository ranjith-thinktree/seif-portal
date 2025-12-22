const db = require('../../../database/connection');
const csv = require('csv-parser');
const { Readable } = require('stream');
const centerService = require('./center.service');

/**
 * Center Bulk Service
 * Handles bulk center creation from CSV
 */
class CenterBulkService {
  /**
   * Process bulk center upload from CSV
   * @param {Buffer} fileBuffer - CSV file buffer
   * @param {string} createdByRole - Role of user uploading
   * @returns {Promise<Object>} Processing results
   */
  async processBulkUpload(fileBuffer, createdByRole) {
    try {
      console.log('📝 Starting bulk center upload processing...');

      // Parse CSV
      const centers = await this.parseCSV(fileBuffer);
      console.log(`📊 Parsed ${centers.length} centers from CSV`);

      // Get all partners for mapping
      const partnerMap = await this.getPartnerMap();
      console.log(`🔗 Found ${partnerMap.size} partners in database`);

      // Get default location (India)
      const defaultLocation = await this.getDefaultLocation();

      const results = [];
      const errors = [];
      let successful = 0;
      let failed = 0;

      // Process each center
      for (let i = 0; i < centers.length; i++) {
        const row = centers[i];
        const rowNumber = i + 2; // +2 for header row and 0-based index

        try {
          // Validate row
          const validation = this.validateCenterRow(row, rowNumber);
          if (!validation.valid) {
            errors.push({
              row: rowNumber,
              center_name: row.training_center || 'Unknown',
              error: validation.error,
            });
            failed++;
            continue;
          }

          // Map CSV data to center format
          const centerData = await this.mapCSVToCenter(row, partnerMap, defaultLocation);

          // Create center
          const center = await centerService.createCenter(centerData, createdByRole);

          results.push({
            row: rowNumber,
            center_id: center.id,
            center_name: center.center_name,
            status: 'success',
          });
          successful++;
        } catch (error) {
          console.error(`❌ Error processing row ${rowNumber}:`, error.message);
          errors.push({
            row: rowNumber,
            center_name: row.training_center || 'Unknown',
            error: error.message,
          });
          failed++;
        }
      }

      console.log(`✅ Bulk upload completed: ${successful} successful, ${failed} failed`);

      return {
        successful,
        failed,
        total: centers.length,
        results,
        errors,
      };
    } catch (error) {
      console.error('❌ Error in processBulkUpload:', error);
      throw error;
    }
  }

  /**
   * Parse CSV file
   * @param {Buffer} fileBuffer - CSV file buffer
   * @returns {Promise<Array>} Parsed center data
   */
  async parseCSV(fileBuffer) {
    return new Promise((resolve, reject) => {
      const centers = [];
      const stream = Readable.from(fileBuffer.toString());

      stream
        .pipe(
          csv({
            mapHeaders: ({ header }) => header.toLowerCase().trim().replace(/\s+/g, '_'),
            skipEmptyLines: true,
          })
        )
        .on('data', (row) => {
          centers.push(row);
        })
        .on('end', () => {
          resolve(centers);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Get partner mapping (name -> id)
   * @returns {Promise<Map>} Partner name to ID map
   */
  async getPartnerMap() {
    const partners = await db.query('SELECT id, name FROM partners WHERE status = "active"');

    const map = new Map();
    partners.forEach((partner) => {
      // Create multiple variations of partner name for matching
      const normalizedName = partner.name.toLowerCase().trim();
      map.set(normalizedName, partner.id);

      // Also store with extra spaces removed
      const compactName = normalizedName.replace(/\s+/g, ' ');
      map.set(compactName, partner.id);

      // Store without spaces for fuzzy matching
      const noSpaceName = normalizedName.replace(/\s+/g, '');
      map.set(noSpaceName, partner.id);
    });

    return map;
  }

  /**
   * Get default location (India)
   * @returns {Promise<Object>} Location data
   */
  async getDefaultLocation() {
    try {
      // Get India country
      const countries = await db.query(
        'SELECT id, name FROM countries WHERE name = "India" LIMIT 1'
      );

      if (!countries || countries.length === 0) {
        throw new Error('Default country (India) not found in database');
      }

      const country = countries[0];

      return {
        country_id: country.id,
        country: country.name,
      };
    } catch (error) {
      console.error('Error getting default location:', error);
      throw error;
    }
  }

  /**
   * Validate center row
   * @param {Object} row - CSV row data
   * @param {number} rowNumber - Row number
   * @returns {Object} Validation result
   */
  validateCenterRow(row, rowNumber) {
    const errors = [];

    // Required: Training Center (center_name)
    if (!row.training_center || row.training_center.trim() === '') {
      errors.push('Training Center name is required');
    }

    // Required: Implementation Partner
    if (!row.implemenation_partner && !row.implementation_partner) {
      errors.push('Implementation Partner is required');
    }

    // Validate year if provided
    if (row.year_of_establishment) {
      const year = parseInt(row.year_of_establishment);
      if (isNaN(year) || year < 1900 || year > 2100) {
        errors.push('Invalid year of establishment');
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; '),
      };
    }

    return { valid: true };
  }

  /**
   * Map CSV row to center data format
   * @param {Object} row - CSV row
   * @param {Map} partnerMap - Partner name to ID mapping
   * @param {Object} defaultLocation - Default location data
   * @returns {Promise<Object>} Center data
   */
  async mapCSVToCenter(row, partnerMap, defaultLocation) {
    // Get partner ID from name
    const partnerName = (row.implemenation_partner || row.implementation_partner || '')
      .toLowerCase()
      .trim();

    // Try multiple matching strategies
    let partner_id =
      partnerMap.get(partnerName) ||
      partnerMap.get(partnerName.replace(/\s+/g, ' ')) ||
      partnerMap.get(partnerName.replace(/\s+/g, ''));

    if (!partner_id) {
      throw new Error(
        `Partner "${row.implemenation_partner || row.implementation_partner}" not found. Please create partner first.`
      );
    }

    // Get state and city IDs if they exist
    let state_id = null;
    let city_id = null;

    if (row.state && row.state.trim() !== '') {
      const states = await db.query('SELECT id FROM states WHERE name = ? AND country_id = ?', [
        row.state.trim(),
        defaultLocation.country_id,
      ]);
      if (states && states.length > 0) {
        state_id = states[0].id;
      }
    }

    if (row.city && row.city.trim() !== '' && state_id) {
      const cities = await db.query('SELECT id FROM cities WHERE name = ? AND state_id = ?', [
        row.city.trim(),
        state_id,
      ]);
      if (cities && cities.length > 0) {
        city_id = cities[0].id;
      }
    }

    // Map center type from CSV columns
    const centerType = this.determineCenterType(row);

    // Map status
    const status = this.mapStatus(row.status_of_the_centre);

    return {
      partner_id: partner_id,
      center_name: row.training_center.trim(),
      center_type: centerType,
      region: row.region ? row.region.trim() : null,
      country_id: defaultLocation.country_id,
      country: defaultLocation.country,
      state_id: state_id,
      state: row.state ? row.state.trim() : null,
      city_id: city_id,
      city: row.city ? row.city.trim() : null,
      address: row.center__address ? row.center__address.trim() : null,
      year_of_establishment: row.year_of_establishment ? parseInt(row.year_of_establishment) : null,
      status: status,
      center_head: null, // Not in CSV
      mobile_number: null, // Not in CSV
      email: null, // Not in CSV
      latitude: null,
      longitude: null,
      refurbishment_eligible: 0,
    };
  }

  /**
   * Determine center type from CSV columns
   * @param {Object} row - CSV row
   * @returns {string} Center type
   */
  determineCenterType(row) {
    // CSV has "Type of the centre" column with values like:
    // "Electrical", "Solar", "Industrial Automation", "Entrepreneurship", "CoE"

    const typeColumn = row.type_of_the_centre || row.type_of_centre || '';

    if (typeColumn.toLowerCase().includes('electrical')) return 'Electrical';
    if (typeColumn.toLowerCase().includes('solar')) return 'Solar';
    if (typeColumn.toLowerCase().includes('industrial automation')) return 'Industrial Automation';
    if (typeColumn.toLowerCase().includes('entrepreneurship')) return 'Entrepreneurship';
    if (typeColumn.toLowerCase().includes('coe')) return 'CoE';

    // Check the "Short term / ITI/ Polytechnic" column
    const termType = row['short_term_/_iti/_polytechnic'] || row.short_term || '';
    if (termType.toLowerCase().includes('iti')) return 'ITI';
    if (termType.toLowerCase().includes('polytechnic')) return 'Polytechnic';

    // Default based on last column "Type of the centre"
    const lastTypeColumn = row['type_of_the_centre.1'] || row.type_of_the_centre_1 || '';
    if (lastTypeColumn.toLowerCase().includes('lab')) return 'Lab';
    if (
      lastTypeColumn.toLowerCase().includes('kc') ||
      lastTypeColumn.toLowerCase().includes('knowledge')
    )
      return 'Knowledge Center';

    return 'Lab'; // Default
  }

  /**
   * Map status from CSV
   * @param {string} csvStatus - Status from CSV
   * @returns {string} Mapped status
   */
  mapStatus(csvStatus) {
    if (!csvStatus) return 'active';

    const status = csvStatus.toLowerCase().trim();

    if (status === 'active' || status === 'in-active' || status === 'inactive') {
      return status === 'in-active' || status === 'inactive' ? 'inactive' : 'active';
    }

    return 'active'; // Default to active
  }

  /**
   * Generate CSV template for bulk upload
   * @returns {string} CSV template
   */
  generateCSVTemplate() {
    const headers = [
      'Training Center',
      'Implementation Partner',
      'Type of the centre',
      'Short term / ITI/ Polytechnic',
      'Type',
      'Region',
      'City',
      'UT',
      'State',
      'Center address',
      'Year of establishment',
      'Status of the centre',
      'Type of the centre',
    ];

    const sampleRow = [
      'Don Bosco Poonch',
      'Don Bosco Tech Society',
      'Electrical',
      'Short term',
      'NGO',
      'North',
      'Poonch',
      'UT',
      'J&K',
      'Ayaz, Christ School Poonch, Jammu-185 101',
      '2009',
      'Active',
      'KC',
    ];

    return `${headers.join(',')}\n${sampleRow.join(',')}\n`;
  }
}

module.exports = new CenterBulkService();
