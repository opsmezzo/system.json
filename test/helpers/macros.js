/*
 * macros.js: Test macros for `system.json`.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    cycle = require('cycle'),
    nock = require('nock'),
    utile = require('utile'),
    mock = require('./mock'),
    helpers = require('./index'),
    systemJson = require('../../lib'),
    trees = require('../fixtures/trees');

//
// ### function shouldFindDeps (system, os)
//
// Setups mock API endpoints for the `systems`, invokes
// `systemJson.dependencies()` and asserts the result
// is equal to `tree`.
//
exports.shouldAnalyzeDeps = function (system, os) {
  var fixture = trees[system],
      tree = fixture.tree;

  return {
    "the dependencies() method": {
      topic: function () {
        helpers.dependencies(system, os, this.callback);
      },
      "should respond with the correct dependency tree": function (err, actual) {
        assert.isNull(err);

        try { assert.deepEqual(actual, tree) }
        catch (ex) { assert.deepEqual(cycle.decycle(actual), cycle.decycle(tree)) }
      },
      "when used by runlist()": exports.shouldMakeRunlist(system, os)
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

//
// ### function shouldBeDependent (system0, system1, ...)
// Asserts that all arguments depend on the
// context name.
//
exports.shouldBeDependent = function () {
  return exports.shouldHaveRelationship(
    'should be dependent',
    function (tree) {
      assert.include(
        systemJson.dependencies.of(this.target, tree),
        this.system
      );
    }
  ).apply(null, arguments);
};

//
// ### function shouldNotBeDependent (system0, system1, ...)
// Asserts that all arguments do not depend on the
// context name.
//
exports.shouldNotBeDependent = function () {
  return exports.shouldHaveRelationship(
    'should not be dependent',
    function (tree) {
      assert.isFalse(
        systemJson.dependencies.of(this.target, tree)
      );
    }
  ).apply(null, arguments);
};

//
// ### function shouldHaveRelationship (msg, assertFn)
// Asserts that all arguments have the `assertFn` relationship
// with the context name.
//
exports.shouldHaveRelationship = function (msg, assertFn) {
  return function () {
    return Array.prototype.slice.call(arguments)
      .reduce(function (tests, system) {
        var name = system,
            os;

        if (typeof system === 'object') {
          name = system.name;
          os = system.os
        }

        tests['by ' + name] = {
          topic: function (target) {
            this.target = target;
            this.system = name;
            helpers.dependencies(name, os, this.callback);
          }
        };

        tests['by ' + name][msg] = assertFn;
        return tests;
      }, {
        topic: function () {
          return this.context.name;
        }
      });
  };
};