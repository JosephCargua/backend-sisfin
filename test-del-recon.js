const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.pzcbhwrwtgcouglbowkh:Josepcargua@1905@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

client.connect().then(() => {
  return client.query('SELECT * FROM bank_reconciliations LIMIT 1');
}).then(res => {
  console.log(res.rows);
  if (res.rows.length > 0) {
    return client.query('UPDATE journal_entry_lines SET "bankReconciliationId" = null WHERE "bankReconciliationId" = $1', [res.rows[0].id]);
  }
}).then(() => console.log('success'))
  .catch(console.error)
  .finally(() => client.end());
