/*
 * vars.js: Common utility functions for compiling required vars.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

//
// ### function vars (runlist)
// #### @runlist {Array} Ordered runlist of systems (with `vars`)
// Returns the unique set of vars for all systems in the `runlist`.
//
module.exports = function (runlist) {
  return runlist.reduce(function (all, system) {
    ['required', 'optional'].forEach(function (type) {
      var vars = (system.vars && system.vars[type]) || [];
      all[type].push.apply(all[type], vars.filter(function (key) {
        return !~all[type].indexOf(key);
      }));
    });

    return all;
  }, { required: [], optional: [] });
};
