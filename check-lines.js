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
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'financial_document_lines'");
  console.log(res.rows);
  await client.end();
}
main();
