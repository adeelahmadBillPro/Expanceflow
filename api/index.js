// Vercel Serverless Function — wraps Express app
const path = require('path');

// Load env from server/.env in dev, Vercel provides env vars in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
}

const app = require('../server/src/index');

module.exports = app;
