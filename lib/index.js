/*
 * index.js: Top-level include for the `system.json` module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
//
// Expose core system.json algorithms.
//
exports.runlist            = require('./runlist');
exports.remoteDependencies = require('./remote-dependencies');
exports.dependencies       = require('./dependencies');
exports.validate           = require('./validate');

//
// Alias `remoteDependencies` for the sake of my fingers.
//
exports.remote = exports.remoteDependencies;