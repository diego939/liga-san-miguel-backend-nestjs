'use strict';

/** Punto de entrada Vercel: delega en Nest compilado en dist/lambda.js */
module.exports = require('../dist/src/lambda.js').handler;
