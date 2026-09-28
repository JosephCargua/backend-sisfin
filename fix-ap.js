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
  const res = await client.query(`SELECT id FROM accounts WHERE name ILIKE '%Gastos varios%'`);
  if (res.rows.length > 0) {
     const gastosVariosId = res.rows[0].id;
     await client.query(`UPDATE journal_entry_lines SET "accountId" = $1 WHERE id = '5d80ca39-d00b-479e-bf6f-5a461da8877a'`, [gastosVariosId]);
     console.log('Fixed journal entry line 5d80ca39-d00b-479e-bf6f-5a461da8877a to Gastos Varios');
  }
  await client.end();
}
main();
