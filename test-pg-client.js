require('dotenv').config();
const { Client } = require('pg');

// Try with raw pg client
const client = new Client({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.kobmfqaikvpozjjkmnk',
  password: '99747127aA@',
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('Attempting to connect with:');
console.log('Host:', client.host);
console.log('Port:', client.port);
console.log('Database:', client.database);
console.log('User:', client.user);
console.log('Password length:', client.password.length);

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('PostgreSQL version:', result.rows[0].version);
    client.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    client.end();
    process.exit(1);
  });
