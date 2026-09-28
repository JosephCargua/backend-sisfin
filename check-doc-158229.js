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
  console.log('Querying Financial Docs:');
  const res = await client.query(`SELECT id, "documentNumber", total, "amountPaid" FROM financial_documents WHERE "documentNumber" LIKE '%001-002-000158229%'`);
  console.table(res.rows);
  console.log('Querying Electronic Docs:');
  const res2 = await client.query(`SELECT id, "documentNumber", "documentLabel", total, "amountPaid" FROM electronic_document_registrations WHERE "documentNumber" LIKE '%001-002-000158229%' OR "documentLabel" LIKE '%001-002-000158229%'`);
  console.table(res2.rows);
  
  // Let's also check if there is a payment in document_payments
  const res3 = await client.query(`
    SELECT dp.id, dp."documentId", dp."documentType", dp.amount, bt.id as "txId", bt.date, bt.type
    FROM document_payments dp
    JOIN bank_transactions bt ON bt.id = dp."transactionId"
  `);
  // Filter manually just in case
  const matchingPayments = res3.rows.filter(r => 
    res.rows.some(d => d.id === r.documentId) || 
    res2.rows.some(d => d.id === r.documentId)
  );
  console.log('Payments linked to these documents:');
  console.table(matchingPayments);
  
  await client.end();
}
main();
