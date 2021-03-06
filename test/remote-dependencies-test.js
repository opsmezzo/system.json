/*
 * remote-dependencies-test.js: Tests for working with remote dependency trees and runlists.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    nock = require('nock'),
    vows = require('vows'),
    composer = require('composer-api'),
    macros = require('./helpers/macros'),
    mock = require('./helpers/mock'),
    systemJson = require('../lib');

var shouldAnalyzeDeps    = macros.shouldAnalyzeDeps,
    shouldBeDependent    = macros.shouldBeDependent,
    shouldNotBeDependent = macros.shouldNotBeDependent;

//
// Asserts the remote runlist for `hello-remote-deps`.
//
function assertHelloRemoteDeps(err, remoteRunlist) {
  assert.isNull(err);
  assert.lengthOf(remoteRunlist, 1);

  var fixtureOne = remoteRunlist[0];
  assert.equal(fixtureOne.name, 'fixture-one');
  assert.equal(fixtureOne.version, '0.0.0');
  assert.equal(fixtureOne.semver, '0.0.x');
}

//
// Test macro that asserts the system with
// `this.context.name` returns a remote runlist
// that conforms to the `assertFn`.
//
function shouldMakeRemoteRunlist(assertFn) {
  return {
    topic: function () {
      var api  = nock('http://api.testquill.com'),
          that = this;

      mock.systems.all(api);
      systemJson.dependencies({
        systems: this.context.name,
        client: composer.createClient({
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
    "should respond with the correct remoteRunlist": assertFn
  }
}

//
// Test macro that asserts the system with
// `this.context.name` returns has circular
// remoteDependencies that conform to the `assertFn`.
//
function shouldFindCircularRemoteDeps(assertFn) {
  return {
    topic: function () {
      var api  = nock('http://api.testquill.com'),
          that = this;

      mock.systems.all(api);
      systemJson.dependencies({
        systems: this.context.name,
        client: composer.createClient({
          protocol: 'http',
          host: 'api.testquill.com',
          port: 80,
          auth: {}
        }).systems
      }, function (err, deps) {
        return that.callback(err, err || systemJson.remote.cycles(deps));
      });
    },
    "should respond with the correct cycles": assertFn
  }
}

function shouldVerifyRunlist(options, callback) {
  return {
    topic: function () {
      var api  = nock('http://api.testquill.com');

      if (options.clusters) {
        Object.keys(options.servers).forEach(function (cluster) {
          mock.config.servers(api, cluster, options.servers[cluster]);
        });
      }
      else {
        mock.config.servers(api, options.servers);
      }

      systemJson.remote.verifyRunlist({
        runlist: options.runlist,
        clusters: options.clusters,
        client: composer.createClient({
          protocol: 'http',
          host: 'api.testquill.com',
          port: 80,
          auth: {}
        }).config
      }, this.callback);
    },
    'should respond with correct servers': callback
  };
}

vows.describe('system.json/remote-dependencies').addBatch({
  "When using system.json": {
    "remote.runlist()": {
      "hello-remote-deps":    shouldMakeRemoteRunlist(assertHelloRemoteDeps),
      "indirect-remote-deps": shouldMakeRemoteRunlist(assertHelloRemoteDeps),
      "circular-deps":        shouldMakeRemoteRunlist(function (err, remoteRunlist) {
        assert.isNull(err);
        assert.lengthOf(remoteRunlist, 2);
        assert.equal(remoteRunlist[0].name, 'g');
        assert.equal(remoteRunlist[1].name, 'f');
      }),
      "indirect-circular-deps": shouldMakeRemoteRunlist(function (err, remoteRunlist) {
        assert.isNull(err);
        assert.lengthOf(remoteRunlist, 3);
        assert.equal(remoteRunlist[0].name, 'h');
        assert.equal(remoteRunlist[1].name, 'indirect-circular-deps');
        assert.equal(remoteRunlist[2].name, 'i');
      }),
      "complex-circular-deps": shouldMakeRemoteRunlist(function (err, remoteRunlist) {
        assert.isNull(err);
        assert.lengthOf(remoteRunlist, 5);
        assert.equal(remoteRunlist[0].name, 'couchdb');
        assert.equal(remoteRunlist[1].name, 'graphite');
        assert.equal(remoteRunlist[2].name, 'm');
        assert.equal(remoteRunlist[3].name, 'l');
        assert.equal(remoteRunlist[4].name, 'complex-circular-deps');
      })
    },
    "remote.cycles()": {
      "indirect-circular-deps": shouldFindCircularRemoteDeps(function (err, cycles) {
        assert.isNull(err);
        assert.deepEqual(cycles, {
          i: ['indirect-circular-deps'],
          'indirect-circular-deps': ['i']
        });
      }),
      "circular-deps": shouldFindCircularRemoteDeps(function (err, cycles) {
        assert.isNull(err);
        assert.deepEqual(cycles, {
          f: ['g'],
          g: ['f']
        });
      }),
      "complex-circular-deps": shouldFindCircularRemoteDeps(function (err, cycles) {
        assert.isNull(err);
        assert.deepEqual(cycles, {
          'complex-circular-deps': [ 'l', 'm' ],
          'l': [ 'complex-circular-deps' ],
          'm': [ 'complex-circular-deps' ]
        });
      })
    },
    '`remote.verifyRunlist()`': {
      'no clusters, one dependency': shouldVerifyRunlist({
        runlist: [ { name: 'couchdb' } ],
        servers: { 'couchdb': [ { public: ['couchdb.net' ] } ]
        }
      }, function (err, satisfying) {
        assert.isNull(err);
        assert.deepEqual(satisfying, {
          'couchdb': [ { public: ['couchdb.net' ] } ]
        });
      }),
      'not satisfied dependency': shouldVerifyRunlist({
        runlist: [ { name: 'couchdb' }, { name: 'redis' } ],
        servers: { 'redis': [ { public: ['redis.net' ] } ]
        }
      }, function (err, satisfying) {
        assert(err);
        assert.deepEqual(err.missing, [ 'couchdb' ]);
      }),
      'one cluster': shouldVerifyRunlist({
        runlist: [ { name: 'couchdb' } ],
        clusters: ['composer'],
        servers: {
          composer: { couchdb: [ { public: ['couchdb.net'] } ] }
        }
      }, function (err, satisfying) {
        assert.isNull(err);
        assert.deepEqual(satisfying, {
          'couchdb': [ { public: ['couchdb.net' ] } ]
        });
      }),
      'duplicate servers in two clusters': shouldVerifyRunlist({
        runlist: [ { name: 'couchdb' } ],
        clusters: ['composer', 'conservatory'],
        servers: {
          composer: { couchdb: [ { public: ['couchdb.net'] } ] },
          conservatory: { couchdb: [ { public: ['couchdb.net'] } ] }
        }
      }, function (err, satisfying) {
        assert.isNull(err);
        assert.deepEqual(satisfying, {
          'couchdb': [ { public: ['couchdb.net' ] } ]
        });
      }),
      'servers are correctly ordered': shouldVerifyRunlist({
        runlist: [ { name: 'couchdb' } ],
        clusters: ['tempi', 'us-east-1'],
        servers: {
          tempi: { couchdb: [
            { public: ['couchdb.us-west-1.net'] },
            { public: ['couchdb.us-east-1.net'] }
          ]},
          'us-east-1': { couchdb: [ { public: ['couchdb.us-east-1.net'] } ] }
        }
      }, function (err, satisfying) {
        assert.isNull(err);
        assert.deepEqual(satisfying, {
          'couchdb': [
            { public: ['couchdb.us-east-1.net'] },
            { public: ['couchdb.us-west-1.net' ] }
          ]
        });
      })
    }
  }
}).export(module);
