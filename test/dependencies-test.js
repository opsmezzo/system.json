/*
 * dependencies-test.js: Tests for working with dependency trees and runlists.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    nock = require('nock'),
    vows = require('vows'),
    conservatory = require('conservatory-api'),
    macros = require('./helpers/macros'),
    mock = require('./helpers/mock'),
    systemJson = require('../lib');

vows.describe('system.json/dependencies').addBatch({
  "When using system.json": {
    "calculating dependencies": macros.shouldAnalyzeAllDeps(),
    "the remote.runlist() method": {
      "hello-remote-deps": {
        topic: function () {
          var api  = nock('http://api.testquill.com'),
              that = this;

          mock.systems.all(api);
          systemJson.dependencies({
            systems: 'hello-remote-deps',
            client: conservatory.createClient('composer', {
              protocol: 'http',
              host: 'api.testquill.com',
              port: 80,
              auth: {}
            }).systems
          }, function (err, deps) {
            return that.callback(err, err || systemJson.remote.runlist({
              systems: deps
            }));
          });
        },
        "should respond with the correct remoteRunlist": function (err, remoteRunlist) {
          assert.isNull(err);
          assert.lengthOf(remoteRunlist, 1);

          var fixtureOne = remoteRunlist[0];
          assert.equal(fixtureOne.name, 'fixture-one');
          assert.equal(fixtureOne.version, '0.0.0');
          assert.equal(fixtureOne.semver, '0.0.x');
        }
      }
    }
  }
}).export(module);