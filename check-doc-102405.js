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
  const res = await client.query(`SELECT id, "documentNumber", total, "amountPaid" FROM financial_documents WHERE "documentNumber" LIKE '%001-100-000102405%'`);
  console.log('FinancialDocs:'); console.table(res.rows);
  const res2 = await client.query(`SELECT id, "documentNumber", "documentLabel", total, "amountPaid" FROM electronic_document_registrations WHERE "documentNumber" LIKE '%001-100-000102405%' OR "documentLabel" LIKE '%001-100-000102405%'`);
  console.log('ElectronicDocs:'); console.table(res2.rows);
  await client.end();
}
main();
