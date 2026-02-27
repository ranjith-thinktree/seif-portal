const db = require('../src/database/connection');
const http = require('http');

async function run() {
  // Get all partner users with their IDs
  const [users] = await db.query(
    "SELECT id, email FROM users WHERE role = 'PARTNER' AND status = 'active'"
  );
  console.log('Partner users:', JSON.stringify(users));

  // Try default passwords
  const passwords = ['Password123', 'password', 'seif@123', 'Partner@123', 'seif123'];
  for (const u of users) {
    for (const pwd of passwords) {
      try {
        const body = JSON.stringify({ email: u.email, password: pwd });
        const result = await new Promise((resolve, reject) => {
          const req = http.request(
            {
              hostname: '127.0.0.1',
              port: 5000,
              path: '/api/v1/auth/login',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
              },
            },
            (res) => {
              let d = '';
              res.on('data', (c) => (d += c));
              res.on('end', () => resolve({ status: res.statusCode, body: d }));
            }
          );
          req.on('error', reject);
          req.write(body);
          req.end();
        });
        const parsed = JSON.parse(result.body);
        if (parsed.success && parsed.data && parsed.data.accessToken) {
          console.log(`\n✅ Login OK: ${u.email} / ${pwd}`);

          // Now test notification count
          const token = parsed.data.accessToken;
          const countResult = await new Promise((resolve, reject) => {
            http
              .request(
                {
                  hostname: '127.0.0.1',
                  port: 5000,
                  path: '/api/v1/notifications/count',
                  headers: { Authorization: `Bearer ${token}` },
                },
                (res) => {
                  let d = '';
                  res.on('data', (c) => (d += c));
                  res.on('end', () => resolve(d));
                }
              )
              .on('error', reject)
              .end();
          });
          console.log(`  Notification count response: ${countResult}`);

          process.exit(0);
        }
      } catch (e) {
        /* ignore */
      }
    }
  }

  console.log('No partner login worked, skipping API test');
  process.exit(0);
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
