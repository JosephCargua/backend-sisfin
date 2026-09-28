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
  // Get latest 5 transactions
  const res = await client.query("SELECT * FROM bank_transactions ORDER BY \"createdAt\" DESC LIMIT 5");
  for (const tx of res.rows) {
      console.log('Transaction:', tx.id, tx.description);
      if (tx.journalEntryId) {
        const jeRes = await client.query("SELECT jel.debit, jel.credit, a.name FROM journal_entry_lines jel JOIN accounts a ON jel.\"accountId\" = a.id WHERE jel.\"journalEntryId\" = $1", [tx.journalEntryId]);
        console.table(jeRes.rows);
      } else {
        console.log('No JE');
      }
      console.log('----------------');
  }
  await client.end();
}
main();
