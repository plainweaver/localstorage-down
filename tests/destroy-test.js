'use strict';

var collectEntries = require('level-concat-iterator');

var db;

var data = (function () {
  var d = [];
  var i = 0;
  var k;
  for (; i < 100; i++) {
    k = (i < 10 ? '0' : '') + i;
    d.push({
      key: k,
      value: String(Math.random())
    });
  }
  return d;
}());

exports.setUp = function (test, testCommon) {
  test('setUp common', testCommon.setUp);
  test('setUp db', function (t) {
    db = testCommon.factory();
    db.open(function () {
      db.batch(data.map(function (d) {
        return {
          type: 'put',
          key: d.key,
          value: d.value
        };
      }), t.end.bind(t));
    });
  });
};

module.exports.destroy = function (test, testCommon) {
  test('setUp common', testCommon.setUp);

  test('test simple destroy()', function (t) {
    var db = testCommon.factory();
    db.open(function() {
      db.batch(data.map(function (d) {
        return {
          type: 'put',
          key: d.key,
          value: d.value
        };
      }), function (err) {
        t.error(err, 'setUp database');
        db.destroy(function (err) {
          t.error(err);
          collectEntries(db.iterator(), function (err, result) {
            t.error(err);
            t.is(result.length, 0, 'correct number of entries');
            t.same(result, []);
            t.end();
          });
        });
      });
    });
  });

  test('tearDown', testCommon.tearDown);
};

exports.tearDown = function (test, testCommon) {
  test('tearDown', function (t) {
    db.close(testCommon.tearDown.bind(null, t));
  });
};

exports.all = function (test, testCommon) {
  exports.setUp(test, testCommon);
  exports.destroy(test, testCommon);
  exports.tearDown(test, testCommon);
};
