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
  const res = await client.query(`
    SELECT a.id, a.name 
    FROM accounts a
    WHERE a.name ILIKE '%Cuentas por pagar proveedores%'
  `);
  console.log('Accounts:');
  console.table(res.rows);
  
  if (res.rows.length > 0) {
    const accountId = res.rows[0].id;
    const res2 = await client.query(`
      SELECT jel.id, jel.debit, jel.credit, je.description, je."entryNumber", je.date, je.reference
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE jel."accountId" = $1
      ORDER BY je.date ASC
    `, [accountId]);
    console.log('Lines for Cuentas por pagar proveedores:');
    console.table(res2.rows);

    let sum = 0;
    res2.rows.forEach(r => sum += (Number(r.credit) - Number(r.debit)));
    console.log('Total balance (Credit - Debit):', sum);
  }
  await client.end();
}
main();
