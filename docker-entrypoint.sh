#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
until node -e "const { Pool } = require('pg'); const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); pool.query('SELECT 1').then(() => { console.log('Database ready'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; do
  echo "Waiting for database connection..."
  sleep 2
done

echo "Database is ready!"

# Check if tables exist, if not initialize
node -e "const { Pool } = require('pg'); const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); pool.query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \'patients\')').then(result => { if (!result.rows[0].exists) { console.log('Initializing database...'); require('./scripts/initDb.js'); } else { console.log('Database already initialized'); } }).catch(console.error);"

# Start the application with the command passed to the container
exec "$@"
