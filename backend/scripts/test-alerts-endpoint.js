const http = require('http');

async function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let str = '';
        res.on('data', (c) => (str += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(str) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let str = '';
        res.on('data', (c) => (str += c));
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(str) }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Login as admin
  const loginRes = await post('/api/v1/auth/login', {
    email: 'admin@seif.org',
    password: 'Password123',
  });
  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.body.data?.accessToken;
  console.log('Logged in as admin. Token:', token?.slice(0, 20) + '...');

  // Test getAlerts endpoint
  const alertsRes = await get('/api/v1/admin/refurbishment/alerts?limit=50&offset=0', token);
  console.log('\n=== GET /api/v1/admin/refurbishment/alerts');
  console.log('Status:', alertsRes.status);
  console.log('Response:', JSON.stringify(alertsRes.body, null, 2));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
