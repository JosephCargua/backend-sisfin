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
  const res3 = await client.query(`
    SELECT dp.id, dp."documentId", dp."documentType", dp.amount, bt.id as "txId", bt.date, bt.type, bt."isAnnulled"
    FROM document_payments dp
    JOIN bank_transactions bt ON bt.id = dp."transactionId"
    WHERE dp."documentId"::text = '949171ee-2358-493e-861d-565b49ed357f' OR dp."documentId"::text = '6028c887-36cf-4a80-a91b-a63738ec7c3d'
  `);
  console.log('Payments linked to these documents:');
  console.table(res3.rows);
  await client.end();
}
main();
