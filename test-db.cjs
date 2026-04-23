const { Client } = require('pg');

// Correctly encoding special characters in the password (@ -> %40, # -> %23)
const connectionString = 'postgresql://postgres.iekhwfojwqurruryzydm:Yeyint2005%40%23@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    await client.connect();
    console.log('Successfully connected to Supabase Database!');
    const res = await client.query('SELECT NOW()');
    console.log('Current Database Time:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err.stack);
  }
}

testConnection();
