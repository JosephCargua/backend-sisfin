const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/bank-reconciliations/0a092aac-8b53-4bb4-a6d8-3961950ba14b',
  method: 'DELETE'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', console.error);
req.end();
