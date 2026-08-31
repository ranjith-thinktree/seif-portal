const fs = require('fs');
const path = require('path');

/**
 * Load backend/env and backend/.env.
 * Windows often saves the file as `env` (no leading dot); dotenv only
 * looks for `.env` by default, which left SMTP unset.
 */
const backendRoot = path.join(__dirname, '..', '..');
const envFiles = [path.join(backendRoot, '.env'), path.join(backendRoot, 'env')];

for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}
