
var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    conservatory = require('conservatory-api'),
    nock = require('nock'),
    mock = require('./mock'),
    systemJson = require('../../lib'),
    trees = require('../fixtures/trees');

exports.shouldAnalyzeAllDeps = function () {
  var shouldAnalyzeDeps = exports.shouldAnalyzeDeps;

  return {
    "with a no dependencies":                      shouldAnalyzeDeps('no-deps'),
    "with a single dependency (implicit runlist)": shouldAnalyzeDeps('single-dep'),
    "with a single dependency (empty runlist)":    shouldAnalyzeDeps('empty-runlist'),
    "with multiple dependencies":                  shouldAnalyzeDeps('depends-on-a-b'),
    "with remoteDependencies":                     shouldAnalyzeDeps('hello-remote-deps'),
    "with indirect remoteDependencies":            shouldAnalyzeDeps('indirect-remote-deps'),
    "with a dependency in a dependency":           shouldAnalyzeDeps('dep-in-dep'),
    "with a single OS dependency":                 shouldAnalyzeDeps('single-ubuntu-dep', 'ubuntu')
  };
};

//
// ### function shouldFindDeps (system, os)
//
// Setups mock API endpoints for the `systems`, invokes 
// `systemJson.dependencies()` and asserts the result
// is equal to `tree`.
//
exports.shouldAnalyzeDeps = function (system, os) {
  var api = nock('http://api.testquill.com'),
      fixture = trees[system],
      tree = fixture.tree;
  
  mock.systems.all(api);
    
  return {
    "the dependencies() method": {
      topic: function () {
        systemJson.dependencies({
          client: conservatory.createClient('composer', {
            protocol: 'http',
            host: 'api.testquill.com',
            port: 80,
            auth: {}
          }).systems,
          systems: system,
          os: os
        }, this.callback);
      },
      "should respond with the correct dependency tree": function (err, actual) {
        assert.isNull(err);
        assert.deepEqual(actual, tree);
      },
      "the runlist() method": exports.shouldMakeRunlist(system, os)
    }
  };
};

//
// ### function shouldMakeRunlist (system, os)
//
// Setups mock API endpoints for the `systems`, invokes 
// `systemJson.runlist()` and asserts the result
// is equal to `list`.
//
exports.shouldMakeRunlist = function (system, os) {
  var fixture = trees[system],
      list = fixture.list;

  return {
    topic: function (deps) {
      return systemJson.runlist({
        systems: deps,
        os: os
      });
    },
    "should respond with the correct runlist": function (actual) {
      assert.deepEqual(
        actual.map(function (system) {
          return [system.name, system.version].join('@');
        }),
        list
      );
    }
  }
};