// Vercel Serverless Function — wraps our Express app
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const app = require('../server/src/index');

module.exports = app;
