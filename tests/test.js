'use strict';

require('es5-shim');

var tape   = require('tape');
var suite = require('abstract-leveldown/test');
var LocalStorage = require('../');

var dbi = 0;

suite({
    test: tape,
    factory: function() {
        return new LocalStorage(String(++dbi));
    },
    createIfMissing: false,
    errorIfExists: false,
    seek: false,
    bufferKeys: false,
    snapshots: false,
});
