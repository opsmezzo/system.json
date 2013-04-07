/*
 * vars-test.js: Tests for working with variables from runlists.
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
    helpers = require('./helpers'),
    macros = require('./helpers/macros'),
    mock = require('./helpers/mock'),
    systemJson = require('../lib');

var shouldAnalyzeDeps    = macros.shouldAnalyzeDeps,
    shouldBeDependent    = macros.shouldBeDependent,
    shouldNotBeDependent = macros.shouldNotBeDependent;

vows.describe('system.json/vars').addBatch({
  "When using system.json": {
    "vars()": {
      topic: function () {
        helpers.dependencies('dep-in-dep', null, this.callback)
      },
      "should contain the correct vars": function (err, deps) {
        var vars = systemJson.vars(
          systemJson.runlist({ systems: deps })
        );
        
        assert.isObject(vars);
        assert.isArray(vars.required);
        assert.isArray(vars.optional);
      }
    }
  }
}).export(module);