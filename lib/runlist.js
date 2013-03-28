/*
 * runlist.js: Core runlist algorithms.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path'),
    semver = require('semver'),
    utile = require('utile'),
    wtfos = require('wtfos'),
    async = utile.async,
    lifecycle = require('./lifecycle'),
    validate = require('./validate');

//
// ### function runlist (options, callback)
// #### @options {Object} Options for calculating the runlist.
// ####   @options.os       {string} OS for the runlist.
// ####   @options.list     {Array}  Current runlist found.
// ####   @options.depth    {number} Depth in the current runlist.
// ####   @options.maxDepth {number} Max depth of the runlist.
// ####   @options.systems  {object} Systems to add to the runlist.
// ####   @options.all     {Object}  Set of all dependencies resolved.
// #### @callback {function} Continuation to respond to when complete.
//
// Creates a runlist for the specified `systems`. A runlist is the order
// of operations to follow when installing dependencies for a given system.
// The runlist will always end with the target system.
//
// 1. (in-order) `unshift` each system with version onto the list.
//   * If the system exists in the `list` validate the version.
//     * If there is a conflict, respond with error.
// 2. Recursively add the runlist of each dependencies to the list.
//
// Remark: By convention any OS specific runlists run before anything else.
//
var runlist = module.exports = function (options, callback) {
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
    var remoteDependencies,
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

    if (list.length) {
      //
      // Remark: Could be an error case here if versions mismatch...
      //
      trimRunlist(record);
    }

    list.unshift(record);
    all[record.name] = all[record.name]
      ? all[record.name] + 1
      : 1;

    //
    // Remove any remoteDependencies from the
    // system runlist
    //
    if (system.remoteDependencies && system.runlist) {
      remoteDependencies = Object.keys(system.remoteDependencies);
      system.runlist = system.runlist.filter(function (name) {
        return remoteDependencies.indexOf(name) === -1;
      });
    }

    if (!system.dependencies && !system.runlist && !system.os) {
      return;
    }

    invalid = validate(system, os);
    if (invalid) {
      throw invalid;
    }

    //
    // Add any OS specific dependencies to the runlist.
    //
    if (os && system.os) {
      deps = osRunlist(system, os);
    }

    deps = (deps || [])
      .concat((system.runlist || []).map(function (name) {
        return system.dependencies[name];
      }))
      .reverse()
      .filter(function (dep) {
        return dep && (!all[dep.name]
          || all[dep.name] < 9);
      });

    runlist({
      os: os,
      all: all,
      list: list,
      systems: deps,
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
// ### function localize (options)
// #### @runlist   {Array}  List of systems to create runlist for.
// #### @installed {Object} List of systems to create runlist for.
// #### @log       {Logger} Winston logger to write to.
//
// Localizes the specified `runlist` removing any systems already installed.
//
runlist.localize = function (runlist, installed, log) {
  if (!installed) {
    return runlist;
  }

  //
  // Reduce the list for anything already installed
  //
  return runlist.map(function (system) {
    if (installed[system.name] && installed[system.name].system) {
      log.info('Already installed: ' + system.name.magenta);
    }

    return !installed[system.name] || !installed[system.name].system
      ? system
      : null;
  }).filter(Boolean);
};

//
// ### function filter (runlist, script, callback)
// #### @options {Object} Options for filtering the runlist.
// ####   @options.action    {string}  Action being run on the filtered runlist.
// ####   @options.runlist   {Array}   List of systems to create runlist for.
// ####   @options.installed {Object}  Information about installed systems.
// ####   @options.log       {Logger}  Winston logger to write to.
// ####   @options.recursive {Boolean} Value indicating if this runlist is recursive.
//
// Filter scripts for all systems in the `runlist` to exclude:
// 1. Any scripts which are extraneous for the `action`
// 2. Any non-recursive actions (i.e. update and uninstall)
//    (unless --r | --recursive is set).
// 3. That have already been run based on the local history
//    (unless --force is set)
//
runlist.filter = function (options) {
  var recursive = options.recursive,
      installed = options.installed,
      runlist   = options.runlist,
      action    = options.action,
      log       = options.log;

  //
  // Regify a given string
  //
  function regify(str) {
    return new RegExp('^' + str, 'i');
  }

  //
  // Filter scripts against a given set of RegExps
  // (i.e. predicate list).
  //
  function filterScripts(list, iter) {
    return function (system) {
      if (Array.isArray(system.scripts)) {
        system.scripts = system.scripts.filter(function (script) {
          var isValid = list.some(function (re) {
            return re.test(script);
          });

          if (iter) {
            iter(isValid, system, script);
          }
          return isValid;
        });
      }

      return system;
    }
  }

  var previous = lifecycle.order[action] || [],
      matchers = [regify(action)],
      recursiveActions,
      parent;

  //
  // Create predicate lists for lifecycle actions for which
  // this `action` is dependent and for those that are
  // `recursiveActions` (e.g. install, configure).
  //
  previous = previous.map(regify);
  matchers = matchers.concat(previous);
  recursiveActions = Object.keys(lifecycle.recursive)
    .filter(function (name) {
      return lifecycle.recursive[name];
    }).map(regify);

  //
  // 1. Filter the set of scripts for the system to only include
  // those required by the specified `action`.
  //
  runlist = runlist.map(filterScripts(matchers));

  //
  // 2. Filter out any non-recursive actions
  //
  if (!recursive) {
    parent = runlist.pop();
    runlist = runlist.map(
      filterScripts(recursiveActions, function (isValid, system, script) {
        if (!isValid) {
          log.warn([
            'Skipping non-recursive lifecycle action',
            script,
            'for',
            system.name
          ].join(' '));
        }
      })
    ).concat(parent);
  }

  //
  // 3. Reduce the list of scripts for anything already installed
  // based on the history on the local machine.
  //
  if (installed) {
    runlist = runlist.map(function (system) {
      if (!installed[system.name] || !installed[system.name].system) {
        return system;
      }

      var history = installed[system.name].history || {},
          uninstalled,
          actions;

      actions = Object.keys(history).reduce(function (all, key) {
        return history[key].time === 'end'
          ? all.concat(history[key].action)
          : all;
      }, []);

      uninstalled = actions.indexOf('uninstall');
      if (uninstalled !== -1) {
        actions = actions.slice(uninstalled + 1);
      }

      //
      // If there is no history, return all the scripts
      // for the system.
      //
      if (!actions.length) {
        return system;
      }

      function logSkip(script) {
        log.info([
          'Already executed lifecycle action',
          script.yellow,
          'for',
          system.name.magenta
        ].join(' '));
      }

      //
      // Remove the install script since this system is already
      // installed
      //
      logSkip('install');
      system.scripts = system.scripts.filter(function (script) {
        return !/^install/.test(script);
      });

      //
      // Now filter out any dependent scripts for the action
      // e.g. for `start`, remove `configure` and `install`.
      //
      system.scripts = system.scripts.filter(function (script) {
        var alreadyRun = previous.some(function (re) {
          return re.test(script);
        });

        if (alreadyRun) {
          logSkip(script);
        }

        return !alreadyRun;
      });

      return system;
    });
  }

  parent = runlist.pop();
  //
  // If there are no scripts in `system.scripts` then skip this
  // system.
  //
  if (!Array.isArray(parent.scripts) || !parent.scripts.length) {
    log.warn('No scripts found for: ' + parent.name.magenta + ' ' + action);
  }

  runlist.push(parent);
  return runlist;
};

//
// ### function osRunlist (system, os)
//
// Helper function which returns a runlist for the given
// `system` and `os`. Expects expanded system tree from
// exports.dependencies().
//
function osRunlist(system, os) {
  if (!os || typeof system.os !== 'object' || typeof system.os[os] !== 'object') {
    return;
  }

  //
  // If `system.dependencies` and `system.runlist`
  // are not defined assume that the object is a single dependency
  //
  if (!system.os[os].dependencies && !system.os[os].runlist) {
    return Object.keys(system.os[os]).map(function (name) {
      return system.dependencies[name];
    });
  }

  return (system.os[os].runlist || Object.keys(system.os[os].dependencies))
    .map(function (name) {
      return system.dependencies[name];
    });
}