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
  const res = await client.query("SELECT name FROM accounts WHERE id = 'cdbf4017-b365-490f-bbce-57c98db4fa0a'");
  console.log(res.rows);
  await client.end();
}
main();
