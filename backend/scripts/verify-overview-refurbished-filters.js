require('dotenv').config();
const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');

(async () => {
  const result = await RefurbishmentService.getRecentlyRefurbishedCenters(1200);
  const currentYear = new Date().getFullYear();

  const byYear = result.centers.reduce((acc, center) => {
    const year = center.last_refurbishment_date
      ? new Date(center.last_refurbishment_date).getFullYear()
      : 'unknown';
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  console.log('Total refurbished centers:', result.totalCount);
  console.log('Counts by refurbishment year:', byYear);
  console.log(`Expected ${currentYear} count:`, byYear[currentYear] ?? 0);

  result.centers.forEach((center) => {
    console.log('-', {
      name: center.center_name,
      year: new Date(center.last_refurbishment_date).getFullYear(),
      city: center.city,
      partner: center.partner_name,
      requestId: center.latest_request_id,
    });
  });

  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
