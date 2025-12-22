const csv = require('csv-parser');
const { Readable } = require('stream');
const partnerService = require('./partner.service');
const db = require('../../../database/connection');

/**
 * Partner Bulk Upload Service
 * Handles CSV parsing and bulk partner creation
 */
class PartnerBulkService {
  /**
   * Parse CSV and create partners in bulk
   * @param {Object} file - Uploaded file object
   * @param {string} userRole - Role of user uploading (ADMIN/SUPER_ADMIN)
   */
  async processBulkUpload(file, userRole = 'ADMIN') {
    const results = [];
    const errors = [];
    let successful = 0;
    let failed = 0;

    try {
      // Parse CSV from buffer
      const partners = await this.parseCSV(file.buffer);

      console.log(`Parsed ${partners.length} partners from CSV`);

      // Get default location data (India as default)
      const defaultLocation = await this.getDefaultLocation();

      // Process each partner
      for (let i = 0; i < partners.length; i++) {
        const row = partners[i];
        const rowNumber = i + 2; // +2 because CSV starts at row 2 (row 1 is header)

        try {
          // Validate required fields
          const validation = this.validatePartnerRow(row, rowNumber);
          if (!validation.valid) {
            errors.push({
              row: rowNumber,
              partner_name: row.partner_name || 'N/A',
              email: row.email || 'N/A',
              error: validation.error,
            });
            failed++;
            continue;
          }

          // Map CSV data to partner format
          const partnerData = await this.mapCSVToPartner(row, defaultLocation);

          // Set approval status based on user role
          if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
            partnerData.approval_status = 'approved';
          } else {
            partnerData.approval_status = 'pending';
          }

          // Create partner
          const partner = await partnerService.createPartner(partnerData);

          results.push({
            row: rowNumber,
            partner_id: partner.partner_id,
            name: partner.name,
            email: partner.contact_email,
            status: 'success',
          });
          successful++;

          console.log(`✅ Created partner: ${partner.name} (${partner.partner_id})`);
        } catch (error) {
          console.error(`❌ Failed to create partner at row ${rowNumber}:`, error.message);

          errors.push({
            row: rowNumber,
            partner_name: row.partner_name || 'N/A',
            email: row.email || 'N/A',
            error: error.message,
          });
          failed++;
        }
      }

      return {
        total: partners.length,
        successful,
        failed,
        results,
        errors,
      };
    } catch (error) {
      console.error('Error in processBulkUpload:', error);
      throw new Error(`Bulk upload failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV from buffer
   */
  async parseCSV(buffer) {
    return new Promise((resolve, reject) => {
      const partners = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csv())
        .on('data', (row) => {
          // Trim all values
          const trimmedRow = {};
          Object.keys(row).forEach((key) => {
            const trimmedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
            trimmedRow[trimmedKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
          });
          partners.push(trimmedRow);
        })
        .on('end', () => {
          resolve(partners);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Validate partner row data
   */
  validatePartnerRow(row, rowNumber) {
    // Required: Partner Name
    if (!row.partner_name || row.partner_name.trim() === '') {
      return { valid: false, error: 'Partner name is required' };
    }

    // Required: Email
    if (!row.email || row.email.trim() === '') {
      return { valid: false, error: 'Email is required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Required: Contact Person
    if (!row.contact_name || row.contact_name.trim() === '') {
      return { valid: false, error: 'Contact name is required' };
    }

    // Required: Phone Number
    if (!row.phone_number || row.phone_number.trim() === '') {
      return { valid: false, error: 'Phone number is required' };
    }

    // Validate phone number format (10 digits)
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = row.phone_number.replace(/\D/g, ''); // Remove non-digits
    if (!phoneRegex.test(cleanPhone)) {
      return { valid: false, error: 'Phone number must be 10 digits' };
    }

    return { valid: true };
  }

  /**
   * Get default location (India, with default state and city)
   */
  async getDefaultLocation() {
    const connection = await db.getConnection();

    try {
      // Get India country ID
      const [countries] = await connection.query(
        "SELECT id, name FROM countries WHERE code = 'IN' OR name = 'India' LIMIT 1"
      );

      if (!countries || countries.length === 0) {
        throw new Error('India country not found in database');
      }

      const country = countries[0];

      // Get default state (Delhi as fallback)
      const [states] = await connection.query(
        "SELECT id, name FROM states WHERE country_id = ? AND (name = 'Delhi' OR name = 'NCT of Delhi') LIMIT 1",
        [country.id]
      );

      let stateId = null;
      let stateName = null;

      if (states && states.length > 0) {
        stateId = states[0].id;
        stateName = states[0].name;

        // Get default city (New Delhi)
        const [cities] = await connection.query(
          "SELECT id, name FROM cities WHERE state_id = ? AND name LIKE '%New Delhi%' LIMIT 1",
          [stateId]
        );

        if (cities && cities.length > 0) {
          return {
            country_id: country.id,
            country_name: country.name,
            state_id: stateId,
            state_name: stateName,
            city_id: cities[0].id,
            city_name: cities[0].name,
          };
        }
      }

      // Fallback: Just country
      return {
        country_id: country.id,
        country_name: country.name,
        state_id: null,
        state_name: null,
        city_id: null,
        city_name: null,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Map CSV row to partner data format
   */
  async mapCSVToPartner(row, defaultLocation) {
    // Clean phone number
    const cleanPhone = row.phone_number.replace(/\D/g, '').slice(-10);

    return {
      // Basic Information
      name: row.partner_name.trim(),
      organization_type: row.type_of_partner?.trim() || 'NGO', // Default to NGO if not provided
      partner_email: row.email.trim().toLowerCase(),

      // Location Information (use defaults)
      country_id: defaultLocation.country_id,
      state_id: defaultLocation.state_id,
      city_id: defaultLocation.city_id,
      region: null,
      address_line1: 'To be updated',
      address_line2: null,
      postal_code: null,

      // Contact Information
      contact_person: row.contact_name.trim(),
      contact_phone: cleanPhone,
      contact_person_2_name: null,
      contact_person_2_mobile: null,

      // Legal Information (optional - will be updated later)
      date_of_incorporation: null,
      legal_status: null,
      registered_as: null,
      fcra_registration_number: null,
      years_of_experience: null,

      // State Presence
      state_presence: [],

      // System fields
      status: 'active',
      registration_date: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Generate CSV template
   */
  generateCSVTemplate() {
    const headers = [
      'partner_name',
      'type_of_partner',
      'contact_name',
      'email',
      'phone_number',
      'country',
    ];

    const sampleData = [
      ['ABC Skills Foundation', 'NGO', 'John Doe', 'john.doe@abcskills.org', '9876543210', 'India'],
      [
        'XYZ Training Institute',
        'Trust',
        'Jane Smith',
        'jane.smith@xyztraining.org',
        '9876543211',
        'India',
      ],
      [
        'PQR Education Society',
        'Society',
        'Robert Kumar',
        'robert@pqredu.org',
        '9876543212',
        'India',
      ],
    ];

    let csv = headers.join(',') + '\n';
    sampleData.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    return csv;
  }
}

module.exports = new PartnerBulkService();
