/*
 * remote-dependencies.js: Common utility functions for working with remoteDependencies.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path'),
    semver = require('semver'),
    cycle = require('cycle'),
    utile = require('utile'),
    wtfos = require('wtfos'),
    async = utile.async,
    validate = require('./validate');

//
// ### @private {RegExp} refPattern
// Regular expression for extracting circular
// remoteDependency names.
//
var refPattern = /\[\"([\w|\_|\-|\.]+)\"\]$/;

//
// ### function runlist (options, callback)
// #### @options {Object} Options for calculating the remote runlist.
// ####   @options.os       {string} OS for the runlist.
// ####   @options.list     {Array}  Current runlist found.
// ####   @options.depth    {number} Depth in the current runlist.
// ####   @options.maxDepth {number} Max depth of the runlist.
// ####   @options.systems  {object} Systems to add to the runlist.
// ####   @options.all      {object}  Set of all dependencies resolved.
// #### @callback {function} Continuation to respond to when complete.
//
// Creates a runlist for the specified `systems` filtering only `remoteDependencies`.
//
// 1. (in-order) `unshift` each system with version onto the list.
//   * If the system exists in the `list` validate the version.
//     * If there is a conflict, respond with error.
// 2. Recursively add the runlist of each of the `remoteDependencies` to the list.
//
exports.runlist = function (options) {
  var os       = options.os,
      all      = options.all   || {},
      list     = options.list  || [],
      depth    = options.depth || 0,
      maxDepth = options.maxDepth,
      systems  = options.systems;

  function trimRunlist(record) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].name === record.name) {
        //
        // TODO: Check semver equality here.
        //
        list.splice(i, 1);
      }
    }
  }

  //
  // Helper function which builds the sublist for
  // `name` and unshifts it into the parent `list`.
  //
  function updateList(system, next) {
    var names    = list.map(function (d) { return d.name }),
        exists   = !!~names.indexOf(system.name),
        previous = 0,
        remoteDependencies,
        dependencies,
        invalid,
        record,
        deps;

    record = {
      name:    system.name,
      semver:  system.required,
      scripts: system.scripts,
      config:  system.config,
      version: system.version
    };

    if (system.remoteDependencies) {
      remoteDependencies = Object.keys(system.remoteDependencies);
      remoteDependencies.forEach(function (name) {
        var index = names.indexOf(name);
        if (index > previous) {
          previous = index;
        }
      });
    }

    if (list.length) {
      //
      // Remark: Could be an error case here if versions mismatch...
      //
      trimRunlist(record);
    }

    if (options.parent) {
      if (!previous) {
        list.unshift(record);
      }
      else if (previous) {
        list.splice(previous, 0, record);
      }

      all[record.name] = all[record.name]
        ? all[record.name] + 1
        : 1;
    }

    if (!system.remoteDependencies && !system.runlist) {
      return;
    }

    if (remoteDependencies) {
      system.runlist = remoteDependencies.concat(
        (system.runlist || []).filter(function (name) {
          return remoteDependencies.indexOf(name) === -1;
        })
      );
    }

    invalid = validate(system, os);
    if (invalid) {
      throw invalid;
    }

    //
    // Remove any remoteDependencies from the
    // system runlist
    //
    if (system.dependencies && system.runlist) {
      dependencies = Object.keys(system.dependencies);
      system.runlist = system.runlist.filter(function (name) {
        return dependencies.indexOf(name) === -1;
      });
    }

    deps = (deps || [])
      .concat((system.runlist || []).map(function (name) {
        return system.remoteDependencies[name];
      }))
      .reverse()
      .filter(function (dep) {
        return dep && (!all[dep.name]
          || all[dep.name] < 3);
      });

    //
    // Add the remoteDependencies for any of this systems
    // remoteDependencies
    //
    exports.runlist({
      os: os,
      all: utile.clone(all),
      list: list,
      systems: deps,
      parent: record,
      depth: depth++,
      maxDepth: maxDepth
    });

    //
    // Add the remoteDependencies for any of this systems
    // dependencies
    //
    dependencies = dependencies.filter(function (name) {
      all[name] = all[name] ? all[name] + 1 : 1;
      return all[name] < 3;
    }).map(function (name) {
      return system.dependencies[name]
    });

    exports.runlist({
      os: os,
      all: utile.clone(all),
      list: list,
      systems: dependencies,
      depth: depth++,
      maxDepth: maxDepth
    });
  }

  //
  // If we've exceeded the maximum depth then
  // respond immediately.
  //
  if (maxDepth && depth > maxDepth) {
    return list;
  }

  if (!Array.isArray(systems)) {
    systems = Object.keys(systems).map(function (name) {
      return systems[name];
    });
  }

  systems.forEach(updateList);
  return list;
};

//
// ### function verifyRunlist (options, callback)
// #### @options {Object} Options to verify the remote runlist.
// ####   @options.runlist {Array} Set of ordered remote dependencies
// ####   @options.client  {Client}       API Client for fetching config.
// #### @callback {function} Continuation to respond to.
// Verifies that the necessary servers exist to satisfy the
// remote `runlist`.
//
exports.verifyRunlist = function (options, callback) {
  var runlist = options.runlist,
      client  = options.client;

  if (!runlist || !runlist.length || !client || !client.servers) {
    return callback();
  }

  client.servers(function (err, config) {
    if (err) {
      return callback(err);
    }

    var satisfying,
        missing;

    //
    // Calculate the satisfying addresses for the specified
    // remoteDependencies in the `runlist`.
    //
    satisfying = runlist.reduce(function (all, system) {
      all[system.name] = config[system.name];
      return all;
    }, {});

    //
    // Check if there are any missing remoteDependencies
    // in the `runlist`.
    //
    missing = runlist.map(function (system) {
      return system.name;
    }).filter(function (name) {
      return !config[name];
    });

    if (missing.length) {
      err = new Error('Missing remoteDependencies: ' + missing.join(', '));
      err.missing = missing;
      return callback(err);
    }

    callback(null, satisfying);
  });
};

//
// ### function cycles (systems)
// #### @systems {Object} Systems to detect cycles in
// Returns an object literal containing any cycles found in the `systems`.
//
exports.cycles = function (systems) {
  var decycle  = cycle.decycle(systems),
      circular = {};

  //
  // Helper function which adds the circular
  // dependency between `lval` and `rval`.
  //
  function addCycle(lval, rval) {
    circular[lval] = circular[lval] || [];
    circular[rval] = circular[rval] || [];

    if (!~circular[lval].indexOf(rval)) {
      circular[lval].push(rval);
    }

    if (!~circular[rval].indexOf(lval)) {
      circular[rval].push(lval);
    }
  }

  //
  // Helper function that adds any "$ref"
  // cycles to the set of `circular`
  // remoteDependencies.
  //
  function addCircular(system, parents) {
    var deps = system.remoteDependencies
      && Object.keys(system.remoteDependencies);

    if (!deps || !deps.length) {
      return;
    }
    
    deps.forEach(function (name) {
      var ref = system.remoteDependencies[name]['$ref'],
          refName,
          match;

      if (!ref) {
        //
        // Create a copy of parents for this part of the
        // path iteration.
        //
        parents = parents ? parents.slice() : [];
        return addCircular(
          system.remoteDependencies[name],
          parents.concat(system.name)
        );
      }

      if ((match = refPattern.exec(ref))) {
        refName = match[1];
        if (~parents.indexOf(refName)) {
          addCycle(refName, system.name);
        }
      }
    });
  }

  //
  // Build all references in the decycled object which may
  // (potentially) be cycles in `remoteDependencies`.
  //
  Object.keys(decycle).forEach(function (name) {
    addCircular(decycle[name]);
  });

  return circular;
};