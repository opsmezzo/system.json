/*
 * index.js: Test helpers for `system.json`.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    conservatory = require('conservatory-api'),
    nock = require('nock'),
    utile = require('utile'),
    mock = require('./mock'),
    systemJson = require('../../lib'),
    trees = require('../fixtures/trees');

//
// Helper function that fetches all dependencies for
// `system` and `os` using a mocked `conservatory-api` client.
//
exports.dependencies = function (system, os, callback) {
  var api = nock('http://api.testquill.com');
  
  mock.systems.all(api);
  systemJson.dependencies({
    client: conservatory.createClient('composer', {
      protocol: 'http',
      host: 'api.testquill.com',
      port: 80,
      auth: {}
    }).systems,
    systems: system,
    os: os
  }, callback);
};