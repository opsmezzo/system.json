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
      "with a single OS dependency":                 shouldAnalyzeDeps('single-ubuntu-dep', 'ubuntu'),
      "with circular dependencies":                  shouldAnalyzeDeps('circular-deps'),
      "with indirect circular dependencies":         shouldAnalyzeDeps('indirect-circular-deps'),
      "with complex circular dependencies":          shouldAnalyzeDeps('complex-circular-deps')
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