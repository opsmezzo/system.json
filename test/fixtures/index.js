/*
 * systems.js: Test fixtures for all systems in dependency trees.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */
 
var systems = module.exports = [
  {
    name: 'no-deps',
    version: '0.1.2',
    versions: {
      '0.1.2': {}
    }
  },
  {
    name: 'hello-remote-deps',
    version: '0.0.0',
    versions: {
      '0.0.0': {
        remoteDependencies: {
          'fixture-one': '0.0.x'
        },
        dependencies: {
          'fixture-two': '0.0.x'
        }
      }
    }
  },
  {
    name: 'hello-world',
    version: '0.0.0',
    versions: {
      '0.0.0': {
        dependencies: {
          'fixture-one': '0.0.x',
          'fixture-two': '0.0.x'
        }
      }
    }
  },
  {
    name: 'indirect-remote-deps',
    version: '0.0.0',
    versions: {
      '0.0.0': {
        dependencies: {
          'hello-remote-deps': '0.0.x'
        }
      }
    }
  },
  {
    name: 'fixture-two',
    version: '0.0.0',
    versions: {
      '0.0.0': {}
    }
  },
  {
    name: 'fixture-one',
    version: '0.0.0',
    versions: {
      '0.0.0': {}
    }
  },
  {
    name: 'single-dep',
    version: '0.1.0',
    versions: {
      '0.1.0': {
        dependencies: {
          a: '0.0.1'
        }
      }
    }
  },
  {
    name: 'empty-runlist',
    version: '0.1.0',
    versions: {
      '0.1.0': {
        runlist: [],
        dependencies: {
          a: '0.0.1'
        }
      }
    }
  },
  {
    name: 'depends-on-a-b',
    version: '0.1.2',
    versions: {
      '0.1.2': {
        runlist: ['b', 'a'],
        dependencies: {
          a: '0.0.1',
          b: '0.2.0'
        }
      }
    }
  },
  {
    name: 'dep-in-dep',
    version: '1.0.2',
    versions: {
      '1.0.2': {
        runlist: ['c', 'b', 'a'],
        dependencies: {
          a: '0.0.1',
          b: '0.2.0',
          c: '0.3.0'
        }
      }
    }
  },
  {
    name: 'nested-dep',
    version: '1.0.2',
    versions: {
      '1.0.2': {
        runlist: ['c', 'a'],
        dependencies: {
          a: '0.0.1',
          c: '0.3.0'
        }
      }
    }
  },
  {
    name: 'ubuntu-dep',
    version: '0.0.0',
    versions: {
      '0.0.0': {}
    },
    os: {
      ubuntu: { 'fixture-one': '0.0.0' }
    }
  },
  {
    name: 'single-ubuntu-dep',
    version: '0.0.1',
    versions: {
      '0.0.1': {
        dependencies: {
          'a': '0.0.1'
        }
      }
    },
    os: {
      ubuntu: { 'b': '0.2.0' }
    }
  },
  {
    name: 'a',
    version: '0.0.1',
    versions: {
      '0.0.1': {}
    }
  }, 
  {
    name: 'b',
    version: '0.2.0',
    versions: {
      '0.2.0': {}
    }
  },
  {
    name: 'c',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        runlist: ['b'],
        dependencies: {
          b: '0.2.0'
        }
      }
    }
  },
  {
    name: 'd',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        runlist: ['e'],
        dependencies: {
          e: '0.2.0'
        }
      }
    }
  },
  {
    name: 'e',
    version: '0.2.0',
    versions: {
      '0.2.0': {
        runlist: ['d'],
        dependencies: {
          d: '0.3.0'
        }
      }
    }
  },
  {
    name: 'f',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        runlist: ['g'],
        remoteDependencies: {
          g: '0.2.0'
        }
      }
    }
  },
  {
    name: 'g',
    version: '0.2.0',
    versions: {
      '0.2.0': {
        runlist: ['f'],
        remoteDependencies: {
          f: '0.3.0'
        }
      }
    }
  },
  {
    name: 'h',
    version: '0.2.0',
    versions: {
      '0.2.0': {
        runlist: ['i'],
        remoteDependencies: {
          i: '0.3.0'
        }
      }
    }
  },
  {
    name: 'i',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        runlist: ['indirect-circular-deps'],
        remoteDependencies: {
          'indirect-circular-deps': '0.3.0'
        }
      }
    }
  },
  {
    name: 'j',
    version: '0.2.0',
    versions: {
      '0.2.0': {
        runlist: ['k'],
        dependencies: {
          k: '0.3.0'
        }
      }
    }
  },
  {
    name: 'k',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        runlist: ['indirect-circular-deps'],
        dependencies: {
          'indirect-circular-deps': '0.3.0'
        }
      }
    }
  },
  {
    name: 'l',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        remoteDependencies: {
          'couchdb': "*",
          'graphite': "*",
          'complex-circular-deps': '0.3.0'
        }
      }
    }
  },
  {
    name: 'm',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        remoteDependencies: {
          'couchdb': "*",
          'graphite': "*",
          'l': '0.3.0',
          'complex-circular-deps': '0.3.0'
        }
      }
    }
  },
  {
    name: 'couchdb',
    version: '0.3.0',
    versions: {
      '0.3.0': { dependencies: {} }
    }
  },
  {
    name: 'graphite',
    version: '0.3.0',
    versions: {
      '0.3.0': { dependencies: {} }
    }
  },
  {
    name: 'circular-deps',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        runlist: ['d'],
        remoteDependencies: {
          f: '0.3.0'
        },
        dependencies: {
          d: '0.3.0'
        }
      }
    }
  },
  {
    name: 'indirect-circular-deps',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        remoteDependencies: {
          h: '0.2.0'
        },
        dependencies: {
          j: '0.2.0'
        }
      }
    }
  },
  {
    name: 'complex-circular-deps',
    version: '0.3.0',
    versions: {
      '0.3.0': {
        remoteDependencies: {
          l: '0.3.0',
          m: '0.3.0'
        },
        dependencies: {
          a: '0.0.1'
        }
      }
    }
  }
];

//
// Fill duplicate properties in `versions` of all systems.
//
systems.forEach(function (system) {
  if (!system.versions) {
    return;
  }
  
  function hoistValue(version, prop) {
    system.versions[version][prop] = system.versions[version][prop]
      || system[prop];
  }
  
  Object.keys(system.versions).forEach(function (version) {
    //
    // TODO: Hoist all the things!
    //
    hoistValue(version, 'name');
    hoistValue(version, 'os');
  });
});