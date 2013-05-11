/*
 * mock.js: Mock helpers for `system.json`.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    utile = require('utile'),
    async = utile.async,
    nock = require('nock'),
    systems = require('../fixtures');

var mock = module.exports;

var systemsDir = path.join(__dirname, '..', 'fixtures'),
    sourceDir  = path.join(systemsDir, 'tgz');

mock.api     = nock('http://api.testquill.com');
mock.config  = {};
mock.systems = {};

mock.systems.get = function (api, system) {
  api.get('/systems/' + system.name)
    .reply(200, { system: system });
};

mock.systems.all = function (api) {
  systems.forEach(function (system) {
    for (var i = 0; i < 3; i++) {
      mock.systems.get(api, system);
    }
  });
};

mock.config.servers = function (api, servers) {
  api.get('/config/servers')
    .reply(200, servers);
};
