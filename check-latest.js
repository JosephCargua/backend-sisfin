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
  const res = await client.query(`SELECT id, amount, type, description, "journalEntryId", "createdAt" FROM bank_transactions ORDER BY "createdAt" DESC LIMIT 5`);
  console.log('Latest Bank Transactions:'); console.table(res.rows);
  
  if (res.rows.length > 0) {
      const jeIds = res.rows.map(r => r.journalEntryId).filter(id => id);
      if (jeIds.length > 0) {
          const ids = jeIds.map(id => "'" + id + "'").join(',');
          const jeRes = await client.query(`
            SELECT je.id as "je_id", jel."accountId", a.name, jel.debit, jel.credit 
            FROM journal_entries je
            JOIN journal_entry_lines jel ON je.id = jel."journalEntryId"
            JOIN accounts a ON jel."accountId" = a.id
            WHERE je.id IN (${ids})
          `);
          console.log('Journal Entry Lines:'); console.table(jeRes.rows);
      }
  }
  await client.end();
}
main();
