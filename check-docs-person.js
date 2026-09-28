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
  const res = await client.query(`SELECT id, "documentNumber", total, "amountPaid", "personId", "personName" FROM financial_documents WHERE "documentNumber" LIKE '%001-001-000005234%'`);
  console.log('Financial Docs:');
  console.table(res.rows);
  const res2 = await client.query(`SELECT id, "documentNumber", total, "amountPaid", "supplierName" as "personName" FROM electronic_document_registrations WHERE "documentNumber" LIKE '%001-001-000005234%'`);
  console.log('Electronic Docs:');
  console.table(res2.rows);
  await client.end();
}
main();
