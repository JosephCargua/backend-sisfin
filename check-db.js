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

  // Find ALL document registrations - check payableAccountId and processingStatus
  const docResult = await client.query(
    `SELECT "documentNumber", "accessKey", "payableAccountId", "processingStatus", "reviewStatus"
     FROM electronic_document_registrations 
     ORDER BY "createdAt" DESC`
  );
  console.log('=== ALL REGISTRATIONS ===');
  console.table(docResult.rows);

  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
