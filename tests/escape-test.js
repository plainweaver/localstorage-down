'use strict';

var db;
var db2;

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
      }), function () {
        db2 = testCommon.factory();
        db2.open(function () {
          db2.batch(data.map(function (d) {
            return {
              type: 'put',
              key: d.key,
              value: d.value
            };
          }), t.end.bind(t));
        });
      });
    });
  });
};

exports.escape = function (test, testCommon) {
  test('test escaped db name', function (t) {
    db.put('!db1', '!db1', function (err) {
      t.notOk(err, 'no error');
      db2.put('db2', 'db2', function (err) {
        t.notOk(err, 'no error');
        db.close(function (err) {
          t.notOk(err, 'no error');
          db2.close(function (err) {
            t.notOk(err, 'no error');
            db = testCommon.factory('bang!');
            db.get('!db2', function (err, key, value) {
              t.ok(err, 'got error');
              t.equal(key, undefined, 'key should be null');
              t.equal(value, undefined, 'value should be null');
              t.end();
            });
          });
        });
      });
    });
  });
};

exports.tearDown = function (test, testCommon) {
  test('tearDown', function (t) {
    db.close(testCommon.tearDown.bind(null, t));
  });
};

exports.all = function (test, testCommon) {
  exports.setUp(test, testCommon);
  exports.escape(test, testCommon);
  exports.tearDown(test, testCommon);
};
