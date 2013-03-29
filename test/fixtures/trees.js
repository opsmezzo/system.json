/*
 * trees.js: Test fixtures for simple and complex dependency trees.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var trees = exports;

//
// Dependency tree with no dependencies
//
trees['no-deps'] = {
  tree: {
    'no-deps': {
      version: '0.1.2',
      required: '*',
      name: 'no-deps',
      dependencies: {},
      runlist: []
    }
  },
  list: ['no-deps@0.1.2']
};

//
// Dependency tree with remoteDependencies
//
trees['hello-remote-deps'] = {
  tree: {
    'hello-remote-deps': {
      remoteDependencies: { 'fixture-one': '0.0.x' },
      required: '*',
      dependencies: {
        'fixture-two': {
          required: '0.0.x',
          version: '0.0.0',
          name: 'fixture-two',
          dependencies: {},
          runlist: []
        }
      },
      remoteDependencies: {
        'fixture-one': {
          name: 'fixture-one',
          version: '0.0.0',
          dependencies: {},
          required: '0.0.x',
          runlist: []
        }
      },
      version: '0.0.0',
      name: 'hello-remote-deps',
      runlist: ['fixture-two']
    }
  },
  list: ['fixture-two@0.0.0', 'hello-remote-deps@0.0.0']
};

//
// Dependency tree with indirect remoteDependencies
//
trees['indirect-remote-deps'] = {
  tree: {
    'indirect-remote-deps': {
      required: '*',
      dependencies: {
        'hello-remote-deps': {
          remoteDependencies: { 'fixture-one': '0.0.x' },
          required: '0.0.x',
          dependencies: {
            'fixture-two': {
              required: '0.0.x',
              version: '0.0.0',
              name: 'fixture-two',
              dependencies: {},
              runlist: []
            }
          },
          remoteDependencies: {
            'fixture-one': {
              name: 'fixture-one',
              version: '0.0.0',
              dependencies: {},
              required: '0.0.x',
              runlist: []
            }
          },
          version: '0.0.0',
          name: 'hello-remote-deps',
          runlist: ['fixture-two']
        }
      },
      version: '0.0.0',
      name: 'indirect-remote-deps',
      runlist: ['hello-remote-deps']
    }
  },
  list: ['fixture-two@0.0.0', 'hello-remote-deps@0.0.0', 'indirect-remote-deps@0.0.0']
};

//
// Dependency tree with two dependencies
//
trees['depends-on-a-b'] = {
  tree: {
    'depends-on-a-b': {
      dependencies: {
        b: {
          name: 'b',
          version: '0.2.0',
          required: '0.2.0',
          dependencies: {},
          runlist: []
        },
        a: {
          name: 'a',
          version: '0.0.1',
          required: '0.0.1',
          dependencies: {},
          runlist: []
        }
      },
      name: 'depends-on-a-b',
      version: '0.1.2',
      required: '*',
      runlist: [ 'b', 'a' ]
    }
  },
  list: ['b@0.2.0', 'a@0.0.1', 'depends-on-a-b@0.1.2']
};

//
// Dependency tree with dependency in a dependency
// that is also required by the top-level
//
trees['dep-in-dep'] = {
  tree: {
    'dep-in-dep': {
      name: 'dep-in-dep',
      runlist: [ 'c', 'b', 'a' ],
      dependencies: {
        b: {
          name: 'b',
          runlist: [],
          required: '0.2.0',
          dependencies: {},
          version: '0.2.0'
        },
        a: {
          name: 'a',
          runlist: [],
          required: '0.0.1',
          dependencies: {},
          version: '0.0.1'
        },
        c: {
          name: 'c',
          runlist: [ 'b' ],
          dependencies: {
            b: {
              name: 'b',
              runlist: [],
              required: '0.2.0',
              dependencies: {},
              version: '0.2.0'
            }
          },
          required: '0.3.0',
          version: '0.3.0'
        }
      },
      required: '*',
      version: '1.0.2'
    }
  },
  list: ['b@0.2.0', 'c@0.3.0', 'a@0.0.1', 'dep-in-dep@1.0.2']
};

//
// Dependency tree with dependency in a dependency
//
trees['nested-dep'] = {
  tree: {
    'nested-dep': {
      name: 'nested-dep',
      runlist: [ 'c', 'a' ],
      dependencies: {
        a: {
          name: 'a',
          runlist: [],
          required: '0.0.1',
          dependencies: {},
          version: '0.0.1'
        },
        c: {
          name: 'c',
          runlist: [ 'b' ],
          dependencies: {
            b: {
              name: 'b',
              runlist: [],
              required: '0.2.0',
              dependencies: {},
              version: '0.2.0'
            }
          },
          required: '0.3.0',
          version: '0.3.0'
        }
      },
      required: '*',
      version: '1.0.2'
    }
  },
  list: ['b@0.2.0', 'c@0.3.0', 'a@0.0.1', 'nested-dep@1.0.2']
};

//
// Dependency with an implied runlist
//
trees['single-dep'] = {
  tree: {
    'single-dep': {
      name: 'single-dep',
      dependencies: {
        a: {
          name: 'a',
          runlist: [],
          required: '0.0.1',
          dependencies: {},
          version: '0.0.1'
        }
      },
      runlist: ['a'],
      required: '*',
      version: '0.1.0'
    }
  },
  list: ['a@0.0.1', 'single-dep@0.1.0']
};

//
// Dependency with an implied runlist but
// that runlist is empty.
//
trees['empty-runlist'] = {
  tree: {
    'empty-runlist': {
      required: '*',
      dependencies: {
        a: {
          required: '0.0.1',
          version: '0.0.1',
          name: 'a',
          dependencies: {},
          runlist: []
        }
      },
      version: '0.1.0',
      name: 'empty-runlist',
      runlist: ['a']
    }
  },
  list: ['a@0.0.1', 'empty-runlist@0.1.0']
};


//
// Dependency with OS specific runlist
//
trees['single-ubuntu-dep'] = {
  tree: {
    'single-ubuntu-dep': {
      runlist: ['a', 'b'],
      version: '0.0.1',
      dependencies: {
        a: {
          runlist: [],
          version: '0.0.1',
          dependencies: {},
          name: 'a',
          required: '0.0.1'
        },
        b: {
          runlist: [],
          version: '0.2.0',
          dependencies: {},
          name: 'b',
          required: '0.2.0'
        }
      },
      name: 'single-ubuntu-dep',
      os: {
        ubuntu: { b: '0.2.0' }
      },
      required: '*'
    }
  },
  list: ['b@0.2.0', 'a@0.0.1', 'single-ubuntu-dep@0.0.1']
};

//
// System with circular dependencies.
//
trees['circular-deps'] = {
  tree: {
    'circular-deps': {
      name: 'circular-deps',
      remoteDependencies: {
        f: {
          name: 'f',
          runlist: ['g'],
          required: '0.3.0',
          dependencies: {},
          remoteDependencies: {
            g: {
              runlist: ['f'],
              version: '0.2.0',
              dependencies: {},
              remoteDependencies: {},
              name: 'g',
              required: '0.2.0'
            }
          },
          version: '0.3.0'
        }
      },
      dependencies: {
        d: {
          name: 'd',
          runlist: ['e'],
          required: '0.3.0',
          dependencies: {
            e: {
              runlist: ['d'],
              version: '0.2.0',
              dependencies: {},
              name: 'e',
              required: '0.2.0'
            }
          },
          version: '0.3.0'
        }
      },
      runlist: ['d'],
      required: '*',
      version: '0.3.0'
    }
  },
  list: ['e@0.2.0', 'd@0.3.0', 'circular-deps@0.3.0']
};

//
// Setup the circular dependency
//
trees['circular-deps']
  .tree['circular-deps']
  .dependencies.d
  .dependencies.e
  .dependencies.d = trees['circular-deps']
    .tree['circular-deps']
    .dependencies.d;

trees['circular-deps']
  .tree['circular-deps']
  .remoteDependencies.f
  .remoteDependencies.g
  .remoteDependencies.f = trees['circular-deps']
    .tree['circular-deps']
    .remoteDependencies.f;

//
// System with indirect circular dependencies.
//
trees['indirect-circular-deps'] = {
  tree: {
    'indirect-circular-deps': {
      remoteDependencies: {
        h: {
          runlist: ['i'],
          remoteDependencies: {
            i: {
              runlist: ['indirect-circular-deps'],
              remoteDependencies: {},
              name: 'i',
              version: '0.3.0',
              required: '0.3.0',
              dependencies: {}
            }
          },
          name: 'h',
          version: '0.2.0',
          required: '0.2.0',
          dependencies: {}
        }
      },
      dependencies: {
        j: {
          name: 'j',
          runlist: [ 'k' ],
          dependencies: {},
          required: '0.2.0',
          version: '0.2.0',
          dependencies: {
            k: {
              name: 'k',
              runlist: [ 'indirect-circular-deps' ],
              dependencies: {},
              required: '0.3.0',
              version: '0.3.0'
            }
          }
        }
      },
      name: 'indirect-circular-deps',
      version: '0.3.0',
      required: '*',
      runlist: ['j']
    }
  },
  list: ['k@0.3.0', 'j@0.2.0', 'indirect-circular-deps@0.3.0']
};

//
// Setup the indirect circular dependency
//
trees['indirect-circular-deps']
  .tree['indirect-circular-deps']
  .remoteDependencies.h
  .remoteDependencies.i
  .remoteDependencies['indirect-circular-deps'] = trees['indirect-circular-deps']
    .tree['indirect-circular-deps'];

trees['indirect-circular-deps']
  .tree['indirect-circular-deps']
  .dependencies.j
  .dependencies.k
  .dependencies['indirect-circular-deps'] = trees['indirect-circular-deps']
    .tree['indirect-circular-deps'];

//
// System with complex circular dependencies.
//
trees['complex-circular-deps'] = {
  tree: {
    'complex-circular-deps': {
      remoteDependencies: {
        l: {
          runlist: [],
          remoteDependencies: {
            couchdb: {
              name: 'couchdb',
              version: '0.3.0',
              required: '*',
              dependencies: {},
              runlist: []
            },
            graphite: {
              name: 'graphite',
              version: '0.3.0',
              required: '*',
              dependencies: {},
              runlist: []
            }
          },
          name: 'l',
          version: '0.3.0',
          required: '0.3.0',
          dependencies: {}
        },
        m: {
          runlist: [],
          remoteDependencies: {
            couchdb: {
              name: 'couchdb',
              version: '0.3.0',
              required: '*',
              dependencies: {},
              runlist: []
            },
            graphite: {
              name: 'graphite',
              version: '0.3.0',
              required: '*',
              dependencies: {},
              runlist: []
            }
          },
          name: 'm',
          version: '0.3.0',
          required: '0.3.0',
          dependencies: {}
        }
      },
      dependencies: {
        a: {
          version: '0.0.1',
          runlist: [],
          dependencies: {},
          required: '0.0.1',
          name: 'a'
        }
      },
      name: 'complex-circular-deps',
      version: '0.3.0',
      required: '*',
      runlist: ['a']
    }
  },
  list: ['a@0.0.1', 'complex-circular-deps@0.3.0']
};

//
// Setup the complex circular dependency
//
trees['complex-circular-deps']
  .tree['complex-circular-deps']
  .remoteDependencies.l
  .remoteDependencies['complex-circular-deps'] = trees['complex-circular-deps']
    .tree['complex-circular-deps'];

trees['complex-circular-deps']
  .tree['complex-circular-deps']
  .remoteDependencies.m
  .remoteDependencies['complex-circular-deps'] = trees['complex-circular-deps']
    .tree['complex-circular-deps'];

trees['complex-circular-deps']
  .tree['complex-circular-deps']
  .remoteDependencies.m
  .remoteDependencies.l = trees['complex-circular-deps']
    .tree['complex-circular-deps']
    .remoteDependencies.l;
