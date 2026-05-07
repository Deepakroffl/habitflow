require('dotenv').config();

const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected —', res.rows[0].now);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API at http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Cannot connect to PostgreSQL:', err.message);
    console.error('   Make sure PostgreSQL is running and .env is correct');
    process.exit(1);
  }
}

main();
