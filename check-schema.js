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
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'electronic_document_registrations'");
  console.log('Electronic Docs columns:');
  console.table(res.rows);

  const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'financial_documents'");
  console.log('Financial Docs columns:');
  console.table(res2.rows);

  await client.end();
}
main();
