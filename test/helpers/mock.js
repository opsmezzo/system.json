/*
 * mock.js: Mock helpers for `quill`.
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
mock.systems = {};

mock.systems.get = function (api, system) {
  api.get('/systems/' + system.name)
    .reply(200, { system: system });
};

mock.systems.all = function (api) {
  systems.forEach(function (system) {
    mock.systems.get(api, system);
  });
};