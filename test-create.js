const http = require('http');

const payload = JSON.stringify({
  bankAccountId: '0c76ce73-cfdf-47ec-b530-58079a494d4d', // some uuid, doesn't matter much if not validated, wait it needs a valid UUID
  personaId: '3f74ea7d-1c39-4450-ae57-aeb89e6eb5be', // valid uuid?
  personName: "VILLAFUERTE MASABANDA JESSY LORENA",
  date: "2026-09-28",
  description: "Test",
  amount: 24.01,
  type: "Egreso",
  transactionType: "Egreso",
  paymentMethod: "Caja",
  checkNumber: "",
  checkDate: "2026-09-28",
  details: [
    {
      sourceType: 'DOCUMENT',
      accountName: 'FAC 001-002-000158229',
      documentNumber: 'FAC 001-002-000158229',
      amount: 24.01,
      costCenter: 'N/A'
    }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/bank-transactions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', e => console.error(e));
req.write(payload);
req.end();
