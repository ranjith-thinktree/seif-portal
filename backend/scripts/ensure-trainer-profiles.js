require('dotenv').config();

const TrainerService = require('../src/api/v1/services/trainer.service');
const db = require('../src/database/connection');

(async () => {
  try {
    await TrainerService.ensureTrainerProfilesTable();
    const [rows] = await db.query(
      "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
      ['trainer_profiles']
    );
    console.log('trainer_profiles_exists:', rows?.[0]?.c || 0);
  } catch (error) {
    console.error('Failed to ensure trainer_profiles:', error.message);
    process.exitCode = 1;
  } finally {
    await db.closePool();
  }
})();
