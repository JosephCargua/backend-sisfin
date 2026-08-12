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
    SELECT id, ruc, cedula
    FROM personas
    WHERE ruc = '1802841187001' OR cedula = '1802841187001'
  `);

  console.log(`Found ${res.rows.length} records for Villafuerte`);

  if (res.rows.length > 1) {
    const keepId = res.rows[0].id; // Keep the first one
    const deleteIds = res.rows.slice(1).map(r => r.id);

    console.log(`Keeping ID: ${keepId}`);
    console.log(`Deleting IDs: ${deleteIds.join(', ')}`);

    for (const id of deleteIds) {
      await client.query(`DELETE FROM personas WHERE id = $1`, [id]);
    }
    console.log('Duplicates deleted.');
  }

  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
