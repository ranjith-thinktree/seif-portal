'use strict';

const db = require('../src/database/connection');
const { v4: uuidv4 } = require('uuid');

async function run() {
  try {
    // 1. Create portal_settings
    await db.query(`
      CREATE TABLE IF NOT EXISTS portal_settings (
        id CHAR(36) NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NULL,
        file_url VARCHAR(500) NULL,
        file_name VARCHAR(255) NULL,
        updated_by CHAR(36) NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('portal_settings table created (or already existed)');

    await db.query(`
      INSERT IGNORE INTO portal_settings (id, setting_key, setting_value) VALUES
        ('${uuidv4()}', 'student_data_instructions', 'Upload your student data using the provided Excel template. Ensure all required columns are filled correctly.'),
        ('${uuidv4()}', 'employment_instructions', 'Upload employment data for approved students. Download the pre-filled template first.'),
        ('${uuidv4()}', 'certification_instructions', 'Fill in the certification form with center, batch and date details, then attach the supporting document.'),
        ('${uuidv4()}', 'student_data_template_url', NULL),
        ('${uuidv4()}', 'employment_template_url', NULL),
        ('${uuidv4()}', 'certification_template_url', NULL)
    `);
    console.log('portal_settings seeded OK');

    // 2. Create kpi_settings
    await db.query(`
      CREATE TABLE IF NOT EXISTS kpi_settings (
        id CHAR(36) NOT NULL,
        kpi_key VARCHAR(50) NOT NULL,
        financial_year VARCHAR(10) NOT NULL DEFAULT 'all',
        custom_value INT NOT NULL DEFAULT 0,
        is_visible TINYINT(1) NOT NULL DEFAULT 1,
        updated_by CHAR(36) DEFAULT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_kpi_year (kpi_key, financial_year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('kpi_settings table created (or already existed)');

    await db.query(`
      INSERT IGNORE INTO kpi_settings (id, kpi_key, financial_year, custom_value, is_visible) VALUES
        ('${uuidv4()}', 'youth_trained',    'all', 0, 1),
        ('${uuidv4()}', 'trainers_trained', 'all', 0, 1),
        ('${uuidv4()}', 'edp',              'all', 0, 1),
        ('${uuidv4()}', 'youth_employed',   'all', 0, 1),
        ('${uuidv4()}', 'partners',         'all', 0, 1),
        ('${uuidv4()}', 'centers',          'all', 0, 1),
        ('${uuidv4()}', 'states_uts',       'all', 0, 1),
        ('${uuidv4()}', 'greater_india',    'all', 0, 1),
        ('${uuidv4()}', 'nsi',              'all', 0, 1),
        ('${uuidv4()}', 'alumni',           'all', 0, 1)
    `);
    console.log('kpi_settings seeded OK');

    await db.query(`
      CREATE TABLE IF NOT EXISTS performance_rating_settings (
        id CHAR(36) NOT NULL,
        min_score INT NOT NULL,
        max_score INT DEFAULT NULL,
        stars TINYINT NOT NULL,
        rating TINYINT NOT NULL,
        created_by CHAR(36) DEFAULT NULL,
        updated_by CHAR(36) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_performance_rating_min_score (min_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await db.query(`
      INSERT IGNORE INTO performance_rating_settings
        (id, min_score, max_score, stars, rating)
      VALUES
        ('${uuidv4()}', 0, 50, 1, 1),
        ('${uuidv4()}', 51, 75, 2, 2),
        ('${uuidv4()}', 76, 100, 3, 3),
        ('${uuidv4()}', 101, 150, 4, 4),
        ('${uuidv4()}', 151, NULL, 5, 5)
    `);
    console.log('performance_rating_settings table and defaults seeded OK');

    console.log('\nAll tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
}

run();
