'use strict';

require('es5-shim');

var tape   = require('tape');
var suite = require('abstract-leveldown/test');
var LocalStorage = require('../');

var dbi = 0;
var common = suite.common({
  test: tape,
  factory: function(location) {
    return new LocalStorage(location || String(++dbi));
  },
  createIfMissing: false,
  errorIfExists: false,
  seek: false,
  bufferKeys: false,
  snapshots: false,
});

suite(common);
require('./destroy-test').all(tape, common);
require('./escape-test').all(tape, common);
