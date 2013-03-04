/*
 * lifecycle.js: Core properties about system.json lifecycle actions.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

//
// ### @order {Object}
// Ordering of lifecycle-actions
//
exports.order = {
  install:   null,
  uninstall: null,
  configure: ['install'],
  update:    ['install', 'configure'],
  start:     ['install', 'configure']
};

//
// ### @recursive {Object}
// Default recursive properties of lifecycle-actions
//
exports.recursive = {
  configure: true,
  install:   true,
  start:     false,
  update:    false,
  uninstall: false
};