/*
 * validate.js: Common utility functions for validating system.json and dependencies.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var async = require('utile').async;

//
// ### function validate (system, os, log)
// #### @system {Object} System to validate for the `os`.
// #### @os     {string} Target OS to validate against.
// #### @log    {Logger} Winston logger to write to.
//
// Validates the specified `system` for the given `os`.
//
module.exports = function (system, os, log) {
  var lists = {
    dependencies: Object.keys(system.dependencies || {}),
    remote:       Object.keys(system.remoteDependencies || {}),
    os:           []
  };

  if (typeof system.os === 'object' && typeof system.os[os] === 'object') {
    lists.os = system.os.runlist || system.os.dependencies
      ? system.os.runlist || Object.keys(system.os.dependencies)
      : Object.keys(system.os[os]);
  }

  //
  // If the system has dependencies but no runlist
  // try to create an implicit runlist. This is only
  // valid for systems with a single dependency.
  //
  if (lists.dependencies.length === 1 && !system.runlist) {
    system.runlist = lists.dependencies;
  }
  
  function logExtraneous(name, prop) {
    log && log.warn([
      system.name.magenta + ':',
      'extraneous',
      name.yellow, 
      'in',
      prop.grey
    ].join(' '));
  }
  
  //
  // Check the dependencies against the runlist.
  //
  lists.dependencies.forEach(function (name) {
    if (!~system.runlist.indexOf(name) && !~lists.os.indexOf(name)
      && !~lists.remote.indexOf(name)) {
      logExtraneous(name, 'dependencies');
    }
  });
  
  //
  // Check the runlist against the dependencies.
  //
  if (system.runlist) {
    system.runlist.forEach(function (name) {
      if ((system.dependencies && !system.dependencies[name])
        && !~lists.remote.indexOf(name)) {
        logExtraneous(name, 'runlist');
      }
    });
  }
};
