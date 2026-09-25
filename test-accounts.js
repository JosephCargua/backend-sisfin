const { Client } = require("pg");
const client = new Client({ 
  connectionString: "postgresql://postgres.pzcbhwrwtgcouglbowkh:Josepcargua@1905@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require",
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query(`SELECT id, name FROM accounts WHERE name ILIKE '%CAJA%' LIMIT 5`))
  .then(res => {
    console.log("Cuentas CAJA:", res.rows);
    client.end();
  })
  .catch(err => console.error(err));
