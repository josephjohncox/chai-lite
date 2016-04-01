/**
 Is chai too slow, you need some espresso
 */
'use strict';
let _ = require('lodash');

let natives = {
    '[object Array]': 'array'
    , '[object RegExp]': 'regexp'
    , '[object Function]': 'function'
    , '[object Arguments]': 'arguments'
    , '[object Date]': 'date'
};

function getType (obj) {
    let str = Object.prototype.toString.call(obj);
    if (natives[str]) return natives[str];
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (obj === Object(obj)) return 'object';
    return typeof obj;
}

function assert(condition, message) {
    if(!condition) {
        let msg = message || 'Assertion failed';
        if(arguments[2] && arguments[3] && arguments[4]){
            msg += ':: Expected #{this}: [#{exp}]; got [#{act}]';
            let val = arguments[2];
            let act = arguments[4];
            let exp = arguments[3];
            msg = msg.replace(/#\{this\}/g, val)
                .replace(/#\{act\}/g, act)
                .replace(/#\{exp\}/g, exp);
        }
        if (typeof Error !== 'undefined') {
            throw new Error(msg);
        }
        throw msg;
    }
}

function assertNot(condition, message) {
    assert(!condition, message);
}

function expect(object, msg) {
    return new ExpectC(object, msg);
}
function ExpectC(object, msg){
    let expected = assert;

    function satisfy(cond) {
        expected(cond(object), msg, 'to satisfy', cond, object);
        return expect(object, msg);
    }

    function an(type) {
        expected(getType(object) === type, msg, 'to be of type', type, typeof object);
        return expect(object, msg);
    };

    function oneOf(list) {
        expected(_.some(list,
                      function (a) {
                          return _.isEqual(a, object);
                      }
                     ),
               msg, 'to be one of', list, object);
        return expect(object, msg);
    }

    /* accessors must be lambdas closed over object to avoid evaluation */
    let cond = function (acc) {
        return {
            above: function(cond) {
                let accResult = acc();
                expected(accResult > cond, msg, 'to be greater than', cond, accResult);
                return expect(object, msg);
            }
        };
    };

    let match = function(regex) {
        expected(regex.test(object), msg, 'to match', regex, object);
        return expect(object, msg);
    };


    let be = {
        a: an,
        an: an,
        oneOf: oneOf
    };

    let includeObjCons = function (isAny) {
        return {
            keys: function() {
                let condType = isAny ? _.some : _.every;
                // contains each key in test, same length
                let kss;
                if(_.isArray(arguments[0])) {
                    kss = arguments[0];
                } else if(arguments.length > 1) {
                    kss = Array.apply(null,arguments);
                } else {
                    kss = [arguments[0]];
                }
                let result = condType(kss, function(k) { return _.has(object, k); });
                let oKeys = Object.keys(object);
                result &= (isAny || oKeys.length === kss.length);
                let assertType = '';
                if (!isAny){
                    assertType = 'to contain keys';
                } else {
                    assertType = 'to contain one of the keys';
                }
                expected(result, msg, assertType, kss, oKeys);
                return expect(object, msg);
            }
        };
    };

    let includeObj = [includeObjCons(true), includeObjCons(false)];

    let include = function (isAny) {
        return isAny ? includeObj[0] : includeObj[1];
    };

    let have = {
        all: include(false),
        any: include(true),
        length: cond(function() { return object.length; }),
        lengthOf: function(expectedLength) {
            let length = object.length;
            expected(length === expectedLength, 'to have lengthOf', expectedLength, length);
            return expect(object, msg);
        }
    };

    let deepEqual = function(target) {
        expected(_.isEqual(object, target), 'to deep equal', target, object);
        return expect(object, msg);
    };

    let shallowEqual = function(target) {
        expected(object === target, 'to equal', target, object);
        return expect(object, msg);
    };

    let deep = {
        equal: deepEqual
    };

    let toObj = {
        be: be,
        include: include(true),
        have: have,
        match: match,
        satisfy: satisfy,
        deep: deep,
        equal: shallowEqual
    };

    Object.defineProperty(toObj, 'not', {
        get: function() {
            expected = assertNot;
            return toObj;
        }
    });

    return {
        to:toObj
    };
};

module.exports = { expect: expect };
