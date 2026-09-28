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
  const res = await client.query(`SELECT "payableAccountId", "recurringAccountId" FROM electronic_document_registrations WHERE "documentNumber" LIKE '%102405%'`);
  console.log('Electronic Docs accounts:');
  console.table(res.rows);

  const res2 = await client.query(`SELECT l."accountId", a.name FROM financial_document_lines l JOIN accounts a ON l."accountId" = a.id WHERE l."financialDocumentId" IN (SELECT id FROM financial_documents WHERE "documentNumber" LIKE '%102405%')`);
  console.log('Financial Docs lines:');
  console.table(res2.rows);

  await client.end();
}
main();
