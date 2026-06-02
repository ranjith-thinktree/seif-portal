require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seif',
  });
  try {
    await c.execute(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id           CHAR(36)     NOT NULL,
        user_id      CHAR(36)     NOT NULL,
        pref_key     VARCHAR(100) NOT NULL,
        pref_value   MEDIUMTEXT,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_pref (user_id, pref_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('OK: user_preferences table created (or already exists)');
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  await c.end();
})();
