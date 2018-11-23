'use strict';

var inherits = require('inherits');
var bufferFrom = require('buffer-from');
var AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN;
var AbstractIterator = require('abstract-leveldown').AbstractIterator;

var LocalStorage = require('./localstorage').LocalStorage;
var LocalStorageCore = require('./localstorage-core');
var ltgt = require('ltgt');

// see http://stackoverflow.com/a/15349865/680742
var nextTick = global.setImmediate || process.nextTick;

function LDIterator(db, options) {
  AbstractIterator.call(this, db);

  this.range = ltgt.toLtgt(options);

  this._keysOnly = options.values === false;
  this._limit = options.limit;

  this.keyAsBuffer = options.keyAsBuffer !== false;
  this.valueAsBuffer = options.valueAsBuffer !== false;

  this._pos = 0;
  this._count = 0;
  this._nextQueue = [];

  this._init();
}

inherits(LDIterator, AbstractIterator);

LDIterator.prototype._init = function (callback) {
  var self = this;
  self.initStarted = true;

  nextTick(function () {
    self.initStarted = true;
    self.db.container.keys(function (err, keys) {
      self._keys = keys;

      if (self.range.reverse) {
        self._pos = keys.length - 1;
      }

      if (callback) { callback(); }

      self.initCompleted = true;
      for (var i = 0; i < self._nextQueue.length; i++) {
        self._nextQueue[i]();
      }
    });
  });
};

LDIterator.prototype._next = function (callback) {
  var self = this;

  if (!self.initStarted) {
    return self._init(onInitComplete);
  }

  if (!self.initCompleted) {
    return self._nextQueue.push(onInitComplete);
  }

  nextTick(onInitComplete);

  function onInitComplete () {
    if (self._pos >= self._keys.length || self._pos < 0) {
      return callback();
    }

    if (self._limit >= 0 && self._limit <= self._count) {
      return callback();
    }

    var key = self._keys[self._pos];
    self._pos += self.range.reverse ? -1 : 1;

    if (!ltgt.contains(self.range, key)) {
      return self._next(callback);
    }

    if (self.keyAsBuffer) {
      key = bufferFrom(String(key));
    }

    if (self._keysOnly) {
      self._count++;
      return callback(null, key);
    }

    self.db.container.getItem(key, function (err, value) {
      if (err) {
        if (err.message === 'NotFound') {
          return self._next(callback);
        }
        return callback(err);
      }

      if (self.valueAsBuffer) {
        value = bufferFrom(String(value));
      }

      self._count++;
      callback(null, key, value);
    });
  }
};


function LD(location) {
  if (!(this instanceof LD)) {
    return new LD(location);
  }

  if (typeof location !== 'string') {
    throw new Error('constructor requires a location string argument');
  }

  AbstractLevelDOWN.call(this);

  this.location = location;
  this.container = new LocalStorage(location);
}

inherits(LD, AbstractLevelDOWN);

LD.prototype._open = function (options, callback) {
  this.container.init(callback);
};

LD.prototype._put = function (key, value, options, callback) {
  this.container.setItem(key, value, callback);
};

LD.prototype._get = function (key, options, callback) {
  if (!Buffer.isBuffer(key)) {
    key = String(key);
  }
  this.container.getItem(key, function (err, value) {

    if (err) {
      return callback(err);
    }

    if (options.asBuffer !== false && !Buffer.isBuffer(value)) {
      value = bufferFrom(value);
    }


    if (options.asBuffer === false) {
      if (value.indexOf("{\"storetype\":\"json\",\"data\"") > -1) {
        var res = JSON.parse(value);
        value = res.data;
      }
    }
    callback(null, value);
  });
};

LD.prototype._del = function (key, options, callback) {
  this.container.removeItem(key, callback);
};

LD.prototype._batch = function (array, options, callback) {
  var self = this;
  nextTick(function () {
    var err;
    var key;
    var value;

    var numDone = 0;
    function checkDone() {
      if (++numDone === array.length) {
        callback(err);
      }
    }

    if (Array.isArray(array) && array.length) {
      for (var i = 0; i < array.length; i++) {
        var task = array[i];
        key = Buffer.isBuffer(task.key) ? task.key : String(task.key);
        if (err) {
          checkDone();
        } else if (task.type === 'del') {
          self._del(task.key, options, checkDone);
        } else if (task.type === 'put') {
          value = Buffer.isBuffer(task.value) ? task.value : String(task.value);
            self._put(key, value, options, checkDone);
        }
      }
    } else {
      callback();
    }
  });
};

LD.prototype._iterator = function (options) {
  return new LDIterator(this, options);
};

LD.prototype.destroy = function (callback) {
  LocalStorageCore.destroy(this.location, callback);
};

module.exports = LD;
