const { Client } = require('pg');
const client = new Client({
  host: 'aws-1-us-west-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.pzcbhwrwtgcouglbowkh',
  password: 'Josepcargua@1905',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT * FROM bank_transactions
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);
  console.table(res.rows.map(r => ({id: r.id, amount: r.amount, date: r.date, isAnnulled: r.isAnnulled, createdAt: r.createdAt})));
  
  const res2 = await client.query(`
    SELECT * FROM document_payments
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);
  console.table(res2.rows);
  await client.end();
}
main();
