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

mock.config.servers = function (api, cluster, servers) {
  if (typeof cluster === 'object') {
    servers = cluster;
    cluster = null;
  }

  api.get('/config/servers' + (cluster ? ('/' + cluster) : ''))
    .reply(200, servers);
};
