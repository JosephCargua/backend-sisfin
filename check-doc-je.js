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
  const res = await client.query(`SELECT id, "documentNumber", "journalEntryId" FROM financial_documents WHERE "documentNumber" LIKE '%102405%' LIMIT 1`);
  console.log(res.rows);
  
  if (res.rows.length > 0 && res.rows[0].journalEntryId) {
    const jeRes = await client.query(`
        SELECT je.id as "je_id", jel."accountId", a.name, jel.debit, jel.credit 
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel."journalEntryId"
        JOIN accounts a ON jel."accountId" = a.id
        WHERE je.id = $1
    `, [res.rows[0].journalEntryId]);
    console.table(jeRes.rows);
  } else {
    console.log("No journal entry for document");
    // Get document lines
    const lineRes = await client.query(`
        SELECT l."accountId", a.name 
        FROM financial_document_lines l 
        JOIN accounts a ON l."accountId" = a.id 
        WHERE l."financialDocumentId" = $1
    `, [res.rows[0].id]);
    console.log("Document lines:");
    console.table(lineRes.rows);
  }
  await client.end();
}
main();
