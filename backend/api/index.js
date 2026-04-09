/**
 * Vercel serverless entry: do not use src/server.js (it calls listen()).
 */
const { app } = require("../src/app");

module.exports = app;
