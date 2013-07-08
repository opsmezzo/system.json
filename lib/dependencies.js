/*
 * dependencies.js: Common utility functions for building complete dependency trees.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path'),
    semver = require('semver'),
    utile = require('utile'),
    wtfos = require('wtfos'),
    async = utile.async,
    validate = require('./validate');

//
// ### function dependencies (options, callback)
// #### @options {Object} {Options for calculating dependencies}
// ####   @options.systems {Array|Object} List of systems to create dependency tree for.
// ####   @options.client  {Client}       API Client for fetching dependencies and remoteDependencies.
// ####   @options.os      {string}       Target OS to calculate dependencies for.
// ####   @options.all     {Object}       Set of all dependencies resolved.
// ####   @options.clients {Object}       **Optional** API Clients for fetching dependencies and remoteDependencies.
// ####     @dependencies       {Client}  API Client for fetching dependencies.
// ####     @remoteDependencies {Client}  API Client for fetching remoteDependencies.
// #### @callback {function} Continuation to respond to when complete.
//
// Creates a dependency tree for the specified `systems`.
//
var dependencies = module.exports = function (options, callback) {
  var systems          = options.systems,
      depsClient       = options.clients && options.clients.dependencies,
      remoteDepsClient = (options.clients && options.clients.remoteDependencies) || depsClient,
      types            = options.types || ['remoteDependencies', 'dependencies'],
      all              = options.all  || {},
      os               = options.os,
      tree             = {};

  if (!depsClient && options.client) {
    depsClient = remoteDepsClient = options.client;
  }
  else {
    return callback(new Error('options.client or options.clients is required.'));
  }

  //
  // Helper function which builds the subtree for
  // `name` and inserts it into the parent `tree`.
  //
  function updateTree(parts, next) {
    var name    = parts[0],
        version = parts[1];

    //
    // If the system `name` has already been fetched
    // then just set it in the tree.
    //
    if (all[name]) {
      tree[name] = all[name];
      return next();
    }

    depsClient.get(name, function (err, system) {
      if (err) {
        return next(new Error('Error fetching ' + name + ': ' + err.message.replace(/Error /, '')));
      }

      //
      // Remark: So here is an interesting story where we are using roles like
      // systems and they dont have a bunch of versions or anything like that.
      // First step pretend we have an array of versions.
      //
      var versions = system.versions && Object.keys(system.versions) || [],
          required = version || "*",
          invalid,
          osdeps;

      version = semver.maxSatisfying(
        versions,
        version || system.version
      ) || version;
      //
      // Remark: Next step is to bypass this error with some clever magic as we
      // dont really care about versions with roles
      //
      if (system.versions && !system.versions[version]) {
        return next(new Error('Could not resolve dependency: ' + [name, version].join('@')));
      }
      //
      // Remark: Now we are back where we began where we either use
      // a particular version or default back to the original system/role.
      //
      system              = system.versions && system.versions[version] || system,
      system.version      = version;
      system.required     = required;
      system.runlist      = system.runlist || [];
      system.dependencies = utile.mixin(
        system.dependencies || {},
        osDependencies(system, os)
      );

      if ((!system.runlist || !system.runlist.length) && system.dependencies) {
        system.runlist = Object.keys(system.dependencies);
      }

      invalid = validate(system, os);
      if (invalid) {
        return next(invalid);
      }

      //
      // Set the system in the tree and the
      // set of all systems we've fetched.
      //
      tree[name] = all[name] = system;

      if ((!system.dependencies || !Object.keys(system.dependencies).length)
          && (!system.remoteDependencies || !Object.keys(system.remoteDependencies).length)
          && (!system.os || !system.os[os])) {
        return next();
      }

      async.parallel({
        dependencies: function deps(next) {
          if (!system.dependencies || types.indexOf('dependencies') === -1) {
            return next();
          }

          dependencies({
            systems: system.dependencies,
            client: depsClient,
            all: all,
            types: types,
            os: os
          }, next);
        },
        remoteDependencies: function remoteDeps(next) {
          if (!system.remoteDependencies || types.indexOf('remoteDependencies')) {
            return next();
          }

          dependencies({
            systems: system.remoteDependencies,
            client: remoteDepsClient,
            types: types,
            all: all
          }, next);
        }
      }, function (err, subtrees) {
        if (err) {
          return next(err);
        }

        ['dependencies', 'remoteDependencies'].forEach(function (key) {
          if (subtrees[key]) {
            tree[name][key] = all[name][key] = subtrees[key];
          }
        });

        next();
      });
    });
  }

  async.forEach(dependencies.systemNames(systems), updateTree, function (err) {
    return err
      ? callback(err)
      : callback(null, tree);
  });
};

//
// ### function of (system, tree)
// #### @system {Object|string} System to check if it is a dependency of.
// #### @tree {Object} Dependency tree to check `system` against.
// Returns a list of systems in `dependencies` which depend on the
// specified `system`.
//
dependencies.of = function (system, tree) {
  var target = system.name || system,
      dependent;

  dependent = Object.keys(tree).filter(function (name) {
    var dep      = tree[name],
        children = Object.keys(dep.dependencies || {});

    if (!children.length) {
      return false;
    }

    return !~children.indexOf(target)
      ? dependencies.of(target, dep.dependencies)
      : true;
  });

  return dependent.length
    ? dependent
    : false;
};

//
// ### function maxSatisfying (callback)
// #### @options {Object} Options for calculating maximum satisfying set.
// ####   @options.system {Object|string} System to calculate against
// ####   @options.client {Client} API client to fetch systems from.
// #### @callback {function} Continuation to respond to
// Returns an object containing the latest versions which
// satisfy the dependency needs the system installed
// with the given name
//
// Algorithm:
//   1. Get the current OS with wtfos
//   2. Build the dependency tree for the system and
//      the current OS
//   3. Reduce the dependency tree to the aggregate semver
//      satisfying string, the "required satisfying set".
//   4. Get latest for all installed systems
//   5. Reduce latest against the satisfying set.
//
dependencies.maxSatisfying = function (options, callback) {
  var system = options.system,
      client = options.client;

  async.waterfall([
    //
    // 1. Get the current OS with wtfos
    //
    async.apply(wtfos),
    //
    // 3. Build the dependency tree for those systems and
    //    the current OS
    // 4. Reduce the dependency tree to the aggregate semver
    //    satisfying string, the "satisfying set".
    //
    function satisfyingSet(os, next) {
      var parent = system.name || system;

      //
      // Recursively adds all dependencies in the
      // system dependency subtree to the satisfying set.
      //
      function addSatisfying(dep, set) {
        var name = dep.name;

        set[name] =  set[name] ? (set[name] + ' ') : '';
        set[name] += dep.required;

        if (dep.dependencies && Object.keys(dep.dependencies).length) {
          set = addSatisfying(dep.dependencies, set);
        }

        return set;
      }

      os = (os.distribution && os.distribution.toLowerCase()) || null;
      dependencies({
        systems: parent,
        client: client,
        os: os
      }, function (err, dep) {
        if (err) {
          return next(err);
        }

        next(null, Object.keys(dep[parent].dependencies).reduce(function (set, name) {
          return addSatisfying(dep[parent].dependencies[name], set);
        }, {}));
      });
    },
    //
    // 5. Get latest for all installed systems
    //
    function getLatest(set, done) {
      async.reduce(
        Object.keys(set),
        {},
        function getSystem(latest, name, next) {
          client.get(name, function (err, system) {
            if (err) {
              return next(err);
            }

            latest[name] = system;
            next(null, latest);
          });
        },
        function (err, latest) {
          return !err
            ? done(null, latest, set)
            : done(err);
        }
      );
    }
  ], function satisfy(err, latest, required) {
    if (err) {
      return callback(err);
    }

    callback(null, Object.keys(required)
      .reduce(function (sat, name) {
        sat[name] = semver.maxSatisfying(
          Object.keys(latest[name].versions),
          required[name]
        );
        return sat;
      }, {}));
  });
};

//
// ### function systemNames(names)
// #### @names {string|Array|Object}
//
// Helper function with returns a normalized Array of
// Arrays representing the `<name, version>` pair
// for the specified `names`.
//
dependencies.systemNames = function (names) {
  if (typeof names === 'string') {
    return [names.split('@')];
  }
  else if (Array.isArray(names)) {
    return names.map(function (system) {
      return system.name || system.split('@');
    });
  }

  return Object.keys(names).map(function (name) {
    return [name, names[name] || '*'];
  });
};

//
// ### function osDependencies (system, os)
//
// Helper function which returns a dependency set for the given
// `system` and `os`.
//
function osDependencies(system, os) {
  if (!os || typeof system.os !== 'object' || typeof system.os[os] !== 'object' || !system.os[os]) {
    return {};
  }

  //
  // If `system.dependencies` and `system.runlist`
  // are not defined assume that the object is a single dependency
  //
  if (!system.os[os].dependencies && !system.os[os].runlist) {
    return system.os[os];
  }

  return system.os[os].dependencies || {};
}
