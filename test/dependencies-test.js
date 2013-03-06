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
    "should respond with the correct remoteRunlist": assertFn
  }
}

vows.describe('system.json/dependencies').addBatch({
  "When using system.json": {
    "calculating dependencies": {
      "with a no dependencies":                      shouldAnalyzeDeps('no-deps'),
      "with a single dependency (implicit runlist)": shouldAnalyzeDeps('single-dep'),
      "with a single dependency (empty runlist)":    shouldAnalyzeDeps('empty-runlist'),
      "with multiple dependencies":                  shouldAnalyzeDeps('depends-on-a-b'),
      "with remoteDependencies":                     shouldAnalyzeDeps('hello-remote-deps'),
      "with indirect remoteDependencies":            shouldAnalyzeDeps('indirect-remote-deps'),
      "with duplicate nested dependencies":          shouldAnalyzeDeps('dep-in-dep'),
      "with nested dependencies":                    shouldAnalyzeDeps('nested-dep'),
      "with a single OS dependency":                 shouldAnalyzeDeps('single-ubuntu-dep', 'ubuntu')
    },
    "remote.runlist()": {
      "hello-remote-deps":    shouldMakeRemoteRunlist(assertHelloRemoteDeps),
      "indirect-remote-deps": shouldMakeRemoteRunlist(assertHelloRemoteDeps)
    },
    "dependencies.of()": {
      "when dependedent:": {
        "fixture-one": shouldBeDependent(
          'hello-world',
          { name: 'ubuntu-dep', os: 'ubuntu' }
        ),
        "b": shouldBeDependent(
          'dep-in-dep', 'c', 'nested-dep',
          { name: 'single-ubuntu-dep', os: 'ubuntu' }
        )
      },
      "when not dependent": {
        "fixture-one": shouldNotBeDependent(
          'a', 'b', 'c',
          { name: 'ubuntu-dep', os: 'smartos' }
        )
      }
    }
  }
}).export(module);