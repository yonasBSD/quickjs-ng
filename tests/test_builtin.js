import * as os from "qjs:os";
import { assert, assertThrows } from "./assert.js";

// Keep this at the top; it tests source positions.
function test_exception_source_pos()
{
    var e;

    try {
        throw new Error(""); // line 10, column 19
    } catch(_e) {
        e = _e;
    }

    assert(e.stack.includes("test_builtin.js:10:19"));
}

// Keep this at the top; it tests source positions.
function test_function_source_pos() // line 19, column 1
{
    function inner() {} // line 21, column 5
    var f = eval("function f() {} f");
    assert(`${test_function_source_pos.lineNumber}:${test_function_source_pos.columnNumber}`, "19:1");
    assert(`${inner.lineNumber}:${inner.columnNumber}`, "21:5");
    assert(`${f.lineNumber}:${f.columnNumber}`, "1:1");
}

// Keep this at the top; it tests source positions.
function test_exception_prepare_stack()
{
    var e;

    Error.prepareStackTrace = (_, frames) => {
        // Just return the array to check.
        return frames;
    };

    try {
        throw new Error(""); // line 39, column 19
    } catch(_e) {
        e = _e;
    }

    Error.prepareStackTrace = undefined;

    assert(e.stack.length, 2);
    const f = e.stack[0];
    assert(f.getFunctionName(), 'test_exception_prepare_stack');
    assert(f.getFileName().endsWith('test_builtin.js'));
    assert(f.getLineNumber(), 39);
    assert(f.getColumnNumber(), 19);
    assert(!f.isNative());
}

// Keep this at the top; it tests source positions.
function test_exception_stack_size_limit()
{
    var e;

    Error.stackTraceLimit = 1;
    Error.prepareStackTrace = (_, frames) => {
        // Just return the array to check.
        return frames;
    };

    try {
        throw new Error(""); // line 67, column 19
    } catch(_e) {
        e = _e;
    }

    Error.stackTraceLimit = 10;
    Error.prepareStackTrace = undefined;

    assert(e.stack.length, 1);
    const f = e.stack[0];
    assert(f.getFunctionName(), 'test_exception_stack_size_limit');
    assert(f.getFileName().endsWith('test_builtin.js'));
    assert(f.getLineNumber(), 67);
    assert(f.getColumnNumber(), 19);
    assert(!f.isNative());
}

function test_exception_capture_stack_trace()
{
  var o = {};

  assertThrows(TypeError, (function() {
      Error.captureStackTrace();
  }));

  Error.captureStackTrace(o);

  assert(typeof o.stack === 'string');
  assert(o.stack.includes('test_exception_capture_stack_trace'));
}

function test_exception_capture_stack_trace_filter()
{
  var o = {};
  const fun1 = () => { fun2(); };
  const fun2 = () => { fun3(); };
  const fun3 = () => { log_stack(); };
  function log_stack() {
      Error.captureStackTrace(o, fun3);
  }
  fun1();

  Error.captureStackTrace(o);

  assert(!o.stack.includes('fun3'));
  assert(!o.stack.includes('log_stack'));
}

function my_func(a, b)
{
    return a + b;
}

function test_function()
{
    function f(a, b) {
        var i, tab = [];
        tab.push(this);
        for(i = 0; i < arguments.length; i++)
            tab.push(arguments[i]);
        return tab;
    }
    function constructor1(a) {
        this.x = a;
    }

    var r, g;

    r = my_func.call(null, 1, 2);
    assert(r, 3, "call");

    r = my_func.apply(null, [1, 2]);
    assert(r, 3, "apply");

    r = (function () { return 1; }).apply(null, undefined);
    assert(r, 1);

    assertThrows(TypeError, (function() {
        Reflect.apply((function () { return 1; }), null, undefined);
    }));

    r = new Function("a", "b", "return a + b;");
    assert(r(2,3), 5, "function");

    g = f.bind(1, 2);
    assert(g.length, 1);
    assert(g.name, "bound f");
    assert(g(3), [1,2,3]);

    g = constructor1.bind(null, 1);
    r = new g();
    assert(r.x, 1);
}

function test()
{
    var r, a, b, c, err;

    r = Error("hello");
    assert(r.message, "hello", "Error");

    a = new Object();
    a.x = 1;
    assert(a.x, 1, "Object");

    assert(Object.getPrototypeOf(a), Object.prototype, "getPrototypeOf");
    Object.defineProperty(a, "y", { value: 3, writable: true, configurable: true, enumerable: true });
    assert(a.y, 3, "defineProperty");

    Object.defineProperty(a, "z", { get: function () { return 4; }, set: function(val) { this.z_val = val; }, configurable: true, enumerable: true });
    assert(a.z, 4, "get");
    a.z = 5;
    assert(a.z_val, 5, "set");

    a = { get z() { return 4; }, set z(val) { this.z_val = val; } };
    assert(a.z, 4, "get");
    a.z = 5;
    assert(a.z_val, 5, "set");

    b = Object.create(a);
    assert(Object.getPrototypeOf(b), a, "create");
    c = {u:2};
    /* XXX: refcount bug in 'b' instead of 'a' */
    Object.setPrototypeOf(a, c);
    assert(Object.getPrototypeOf(a), c, "setPrototypeOf");

    a = {};
    assert(a.toString(), "[object Object]", "toString");

    a = {x:1};
    assert(Object.isExtensible(a), true, "extensible");
    Object.preventExtensions(a);

    err = false;
    try {
        a.y = 2;
    } catch(e) {
        err = true;
    }
    assert(Object.isExtensible(a), false, "extensible");
    assert(typeof a.y, "undefined", "extensible");
    assert(err, true, "extensible");

    assertThrows(TypeError, () => Object.setPrototypeOf(Object.prototype, {}));
}

function test_enum()
{
    var a, tab;
    a = {x:1,
         "18014398509481984": 1,
         "9007199254740992": 1,
         "9007199254740991": 1,
         "4294967296": 1,
         "4294967295": 1,
         y:1,
         "4294967294": 1,
         "1": 2};
    tab = Object.keys(a);
//    console.log("tab=" + tab.toString());
    assert(tab, ["1","4294967294","x","18014398509481984","9007199254740992","9007199254740991","4294967296","4294967295","y"], "keys");
}

function test_array()
{
    var a, err;

    a = [1, 2, 3];
    assert(a.length, 3, "array");
    assert(a[2], 3, "array1");

    a = new Array(10);
    assert(a.length, 10, "array2");

    a = new Array(1, 2);
    assert(a.length === 2 && a[0] === 1 && a[1] === 2, true, "array3");

    a = [1, 2, 3];
    a.length = 2;
    assert(a.length === 2 && a[0] === 1 && a[1] === 2, true, "array4");

    a = [];
    a[1] = 10;
    a[4] = 3;
    assert(a.length, 5);

    a = [1,2];
    a.length = 5;
    a[4] = 1;
    a.length = 4;
    assert(a[4] !== 1, true, "array5");

    a = [1,2];
    a.push(3,4);
    assert(a.join(), "1,2,3,4", "join");

    a = [1,2,3,4,5];
    Object.defineProperty(a, "3", { configurable: false });
    err = false;
    try {
        a.length = 2;
    } catch(e) {
        err = true;
    }
    assert(err && a.toString() === "1,2,3,4");
}

function test_string()
{
    var a;
    a = String("abc");
    assert(a.length, 3, "string");
    assert(a[1], "b", "string");
    assert(a.charCodeAt(1), 0x62, "string");
    assert(String.fromCharCode(65), "A", "string");
    assert(String.fromCharCode.apply(null, [65, 66, 67]), "ABC", "string");
    assert(a.charAt(1), "b");
    assert(a.charAt(-1), "");
    assert(a.charAt(3), "");

    a = "abcd";
    assert(a.substring(1, 3), "bc", "substring");
    a = String.fromCharCode(0x20ac);
    assert(a.charCodeAt(0), 0x20ac, "unicode");
    assert(a, "€", "unicode");
    assert(a, "\u20ac", "unicode");
    assert(a, "\u{20ac}", "unicode");
    assert("a", "\x61", "unicode");

    a = "\u{10ffff}";
    assert(a.length, 2, "unicode");
    assert(a, "\u{dbff}\u{dfff}", "unicode");
    assert(a.codePointAt(0), 0x10ffff);
    assert(String.fromCodePoint(0x10ffff), a);

    assert("a".concat("b", "c"), "abc");

    assert("abcabc".indexOf("cab"), 2);
    assert("abcabc".indexOf("cab2"), -1);
    assert("abc".indexOf("c"), 2);

    assert("aaa".indexOf("a"), 0);
    assert("aaa".indexOf("a", NaN), 0);
    assert("aaa".indexOf("a", -Infinity), 0);
    assert("aaa".indexOf("a", -1), 0);
    assert("aaa".indexOf("a", -0), 0);
    assert("aaa".indexOf("a", 0), 0);
    assert("aaa".indexOf("a", 1), 1);
    assert("aaa".indexOf("a", 2), 2);
    assert("aaa".indexOf("a", 3), -1);
    assert("aaa".indexOf("a", 4), -1);
    assert("aaa".indexOf("a", Infinity), -1);

    assert("aaa".indexOf(""), 0);
    assert("aaa".indexOf("", NaN), 0);
    assert("aaa".indexOf("", -Infinity), 0);
    assert("aaa".indexOf("", -1), 0);
    assert("aaa".indexOf("", -0), 0);
    assert("aaa".indexOf("", 0), 0);
    assert("aaa".indexOf("", 1), 1);
    assert("aaa".indexOf("", 2), 2);
    assert("aaa".indexOf("", 3), 3);
    assert("aaa".indexOf("", 4), 3);
    assert("aaa".indexOf("", Infinity), 3);

    assert("aaa".lastIndexOf("a"), 2);
    assert("aaa".lastIndexOf("a", NaN), 2);
    assert("aaa".lastIndexOf("a", -Infinity), 0);
    assert("aaa".lastIndexOf("a", -1), 0);
    assert("aaa".lastIndexOf("a", -0), 0);
    assert("aaa".lastIndexOf("a", 0), 0);
    assert("aaa".lastIndexOf("a", 1), 1);
    assert("aaa".lastIndexOf("a", 2), 2);
    assert("aaa".lastIndexOf("a", 3), 2);
    assert("aaa".lastIndexOf("a", 4), 2);
    assert("aaa".lastIndexOf("a", Infinity), 2);

    assert("aaa".lastIndexOf(""), 3);
    assert("aaa".lastIndexOf("", NaN), 3);
    assert("aaa".lastIndexOf("", -Infinity), 0);
    assert("aaa".lastIndexOf("", -1), 0);
    assert("aaa".lastIndexOf("", -0), 0);
    assert("aaa".lastIndexOf("", 0), 0);
    assert("aaa".lastIndexOf("", 1), 1);
    assert("aaa".lastIndexOf("", 2), 2);
    assert("aaa".lastIndexOf("", 3), 3);
    assert("aaa".lastIndexOf("", 4), 3);
    assert("aaa".lastIndexOf("", Infinity), 3);

    assert("a,b,c".split(","), ["a","b","c"]);
    assert(",b,c".split(","), ["","b","c"]);
    assert("a,b,".split(","), ["a","b",""]);

    assert("aaaa".split(), [ "aaaa" ]);
    assert("aaaa".split(undefined, 0), [ ]);
    assert("aaaa".split(""), [ "a", "a", "a", "a" ]);
    assert("aaaa".split("", 0), [ ]);
    assert("aaaa".split("", 1), [ "a" ]);
    assert("aaaa".split("", 2), [ "a", "a" ]);
    assert("aaaa".split("a"), [ "", "", "", "", "" ]);
    assert("aaaa".split("a", 2), [ "", "" ]);
    assert("aaaa".split("aa"), [ "", "", "" ]);
    assert("aaaa".split("aa", 0), [ ]);
    assert("aaaa".split("aa", 1), [ "" ]);
    assert("aaaa".split("aa", 2), [ "", "" ]);
    assert("aaaa".split("aaa"), [ "", "a" ]);
    assert("aaaa".split("aaaa"), [ "", "" ]);
    assert("aaaa".split("aaaaa"), [ "aaaa" ]);
    assert("aaaa".split("aaaaa", 0), [  ]);
    assert("aaaa".split("aaaaa", 1), [ "aaaa" ]);

    assert(eval('"\0"'), "\0");

    assert("abc".padStart(Infinity, ""), "abc");
}

function test_math()
{
    var a;
    a = 1.4;
    assert(Math.floor(a), 1);
    assert(Math.ceil(a), 2);
    assert(Math.imul(0x12345678, 123), -1088058456);
    assert(Math.imul(0xB505, 0xB504), 2147441940);
    assert(Math.imul(0xB505, 0xB505), -2147479015);
    assert(Math.imul((-2)**31, (-2)**31), 0);
    assert(Math.imul(2**31-1, 2**31-1), 1);
    assert(Math.fround(0.1), 0.10000000149011612);
    assert(Math.hypot() == 0);
    assert(Math.hypot(-2) == 2);
    assert(Math.hypot(3, 4) == 5);
    assert(Math.abs(Math.hypot(3, 4, 5) - 7.0710678118654755) <= 1e-15);
}

function test_number()
{
    assert(parseInt("123"), 123);
    assert(parseInt("  123r"), 123);
    assert(parseInt("0x123"), 0x123);
    assert(parseInt("0o123"), 0);
    assert(+"  123   ", 123);
    assert(+"0b111", 7);
    assert(+"0o123", 83);
    assert(parseFloat("2147483647"), 2147483647);
    assert(parseFloat("2147483648"), 2147483648);
    assert(parseFloat("-2147483647"), -2147483647);
    assert(parseFloat("-2147483648"), -2147483648);
    assert(parseFloat("0x1234"), 0);
    assert(parseFloat("Infinity"), Infinity);
    assert(parseFloat("-Infinity"), -Infinity);
    assert(parseFloat("123.2"), 123.2);
    assert(parseFloat("123.2e3"), 123200);
    assert(Number.isNaN(Number("+")));
    assert(Number.isNaN(Number("-")));
    assert(Number.isNaN(Number("\x00a")));

    assert((1-2**-53).toString(12), "0.bbbbbbbbbbbbbba");
    assert((1000000000000000128).toString(), "1000000000000000100");
    assert((1000000000000000128).toFixed(0), "1000000000000000128");
    assert((25).toExponential(0), "3e+1");
    assert((-25).toExponential(0), "-3e+1");
    assert((2.5).toPrecision(1), "3");
    assert((-2.5).toPrecision(1), "-3");
    assert((1.125).toFixed(2), "1.13");
    assert((-1.125).toFixed(2), "-1.13");
    assert((0.5).toFixed(0), "1");
    assert((-0.5).toFixed(0), "-1");
}

function test_eval2()
{
    var g_call_count = 0;
    /* force non strict mode for f1 and f2 */
    var f1 = new Function("eval", "eval(1, 2)");
    var f2 = new Function("eval", "eval(...[1, 2])");
    function g(a, b) {
        assert(a, 1);
        assert(b, 2);
        g_call_count++;
    }
    f1(g);
    f2(g);
    assert(g_call_count, 2);
    var e;
    try {
        new class extends Object {
            constructor() {
                (() => {
                    for (const _ in this);
                    eval("");
                })();
            }
        };
    } catch (_e) {
        e = _e;
    }
    assert(e?.message, "this is not initialized");
}

function test_eval()
{
    function f(b) {
        var x = 1;
        return eval(b);
    }
    var r, a;

    r = eval("1+1;");
    assert(r, 2, "eval");

    r = eval("var my_var=2; my_var;");
    assert(r, 2, "eval");
    assert(typeof my_var, "undefined");

    assert(eval("if (1) 2; else 3;"), 2);
    assert(eval("if (0) 2; else 3;"), 3);

    assert(f.call(1, "this"), 1);

    a = 2;
    assert(eval("a"), 2);

    eval("a = 3");
    assert(a, 3);

    assert(f("arguments.length", 1), 2);
    assert(f("arguments[1]", 1), 1);

    a = 4;
    assert(f("a"), 4);
    f("a=3");
    assert(a, 3);

    test_eval2();
}

function test_typed_array()
{
    var buffer, a, i, str, b;

    a = new Uint8Array(4);
    assert(a.length, 4);
    for(i = 0; i < a.length; i++)
        a[i] = i;
    assert(a.join(","), "0,1,2,3");
    a[0] = -1;
    assert(a[0], 255);

    a = new Int8Array(3);
    a[0] = 255;
    assert(a[0], -1);

    a = new Int32Array(3);
    a[0] = Math.pow(2, 32) - 1;
    assert(a[0], -1);
    assert(a.BYTES_PER_ELEMENT, 4);

    a = new Uint8ClampedArray(4);
    a[0] = -100;
    a[1] = 1.5;
    a[2] = 0.5;
    a[3] = 1233.5;
    assert(a.toString(), "0,2,0,255");

    buffer = new ArrayBuffer(16);
    assert(buffer.byteLength, 16);
    a = new Uint32Array(buffer, 12, 1);
    assert(a.length, 1);
    a[0] = -1;

    a = new Uint16Array(buffer, 2);
    a[0] = -1;

    a = new Float16Array(buffer, 8, 1);
    a[0] = 1;

    a = new Float32Array(buffer, 8, 1);
    a[0] = 1;

    a = new Uint8Array(buffer);

    str = a.toString();
    /* test little and big endian cases */
    if (str !== "0,0,255,255,0,0,0,0,0,0,128,63,255,255,255,255" &&
        str !== "0,0,255,255,0,0,0,0,63,128,0,0,255,255,255,255") {
        assert(false);
    }

    assert(a.buffer, buffer);

    a = new Uint8Array([1, 2, 3, 4]);
    assert(a.toString(), "1,2,3,4");
    a.set([10, 11], 2);
    assert(a.toString(), "1,2,10,11");

    a = new Uint8Array(buffer, 0, 4);
    a.constructor = {
      [Symbol.species]: function (len) {
        return new Uint8Array(buffer, 1, len);
      },
    };
    b = a.slice();
    assert(a.buffer, b.buffer);
    assert(a.toString(), "0,0,0,255");
    assert(b.toString(), "0,0,255,255");

    const TypedArray = class extends Object.getPrototypeOf(Uint8Array) {};
    let caught = false;
    try {
        new TypedArray(); // extensible but not instantiable
    } catch (e) {
        assert(/cannot be called/.test(e.message));
        caught = true;
    }
    assert(caught);
}

function test_json()
{
    var a, s;
    s = '{"x":1,"y":true,"z":null,"a":[1,2,3],"s":"str"}';
    a = JSON.parse(s);
    assert(a.x, 1);
    assert(a.y, true);
    assert(a.z, null);
    assert(JSON.stringify(a), s);

    /* indentation test */
    assert(JSON.stringify([[{x:1,y:{},z:[]},2,3]],undefined,1),
`[
 [
  {
   "x": 1,
   "y": {},
   "z": []
  },
  2,
  3
 ]
]`);
}

function test_date()
{
    // Date Time String format is YYYY-MM-DDTHH:mm:ss.sssZ
    // accepted date formats are: YYYY, YYYY-MM and YYYY-MM-DD
    // accepted time formats are: THH:mm, THH:mm:ss, THH:mm:ss.sss
    // expanded years are represented with 6 digits prefixed by + or -
    // -000000 is invalid.
    // A string containing out-of-bounds or nonconforming elements
    //   is not a valid instance of this format.
    // Hence the fractional part after . should have 3 digits and how
    // a different number of digits is handled is implementation defined.
    assert(Date.parse(""), NaN);
    assert(Date.parse("13"), NaN);
    assert(Date.parse("31"), NaN);
    assert(Date.parse("1000"), -30610224000000);
    assert(Date.parse("1969"), -31536000000);
    assert(Date.parse("1970"), 0);
    assert(Date.parse("2000"), 946684800000);
    assert(Date.parse("9999"), 253370764800000);
    assert(Date.parse("275761"), NaN);
    assert(Date.parse("999999"), NaN);
    assert(Date.parse("1000000000"), NaN);
    assert(Date.parse("-271821"), NaN);
    assert(Date.parse("-271820"), -8639977881600000);
    assert(Date.parse("-100000"), -3217862419200000);
    assert(Date.parse("+100000"), 3093527980800000);
    assert(Date.parse("+275760"), 8639977881600000);
    assert(Date.parse("+275761"), NaN);
    assert(Date.parse("2000-01"), 946684800000);
    assert(Date.parse("2000-01-01"), 946684800000);
    assert(Date.parse("2000-01-01T"), NaN);
    assert(Date.parse("2000-01-01T00Z"), NaN);
    assert(Date.parse("2000-01-01T00:00Z"), 946684800000);
    assert(Date.parse("2000-01-01T00:00:00Z"), 946684800000);
    assert(Date.parse("2000-01-01T00:00:00.1Z"), 946684800100);
    assert(Date.parse("2000-01-01T00:00:00.10Z"), 946684800100);
    assert(Date.parse("2000-01-01T00:00:00.100Z"), 946684800100);
    assert(Date.parse("2000-01-01T00:00:00.1000Z"), 946684800100);
    assert(Date.parse("2000-01-01T00:00:00+00:00"), 946684800000);
    //assert(Date.parse("2000-01-01T00:00:00+00:30"), 946686600000);
    var d = new Date("2000T00:00");  // Jan 1st 2000, 0:00:00 local time
    assert(typeof d === 'object' && d.toString() != 'Invalid Date');
    assert((new Date('Jan 1 2000')).toISOString(),
           d.toISOString());
    assert((new Date('Jan 1 2000 00:00')).toISOString(),
           d.toISOString());
    assert((new Date('Jan 1 2000 00:00:00')).toISOString(),
           d.toISOString());
    assert((new Date('Jan 1 2000 00:00:00 GMT+0100')).toISOString(),
           '1999-12-31T23:00:00.000Z');
    assert((new Date('Jan 1 2000 00:00:00 GMT+0200')).toISOString(),
           '1999-12-31T22:00:00.000Z');
    assert((new Date('Sat Jan 1 2000')).toISOString(),
           d.toISOString());
    assert((new Date('Sat Jan 1 2000 00:00')).toISOString(),
           d.toISOString());
    assert((new Date('Sat Jan 1 2000 00:00:00')).toISOString(),
           d.toISOString());
    assert((new Date('Sat Jan 1 2000 00:00:00 GMT+0100')).toISOString(),
           '1999-12-31T23:00:00.000Z');
    assert((new Date('Sat Jan 1 2000 00:00:00 GMT+0200')).toISOString(),
           '1999-12-31T22:00:00.000Z');

    var d = new Date(1506098258091);
    assert(d.toISOString(), "2017-09-22T16:37:38.091Z");
    d.setUTCHours(18, 10, 11);
    assert(d.toISOString(), "2017-09-22T18:10:11.091Z");
    var a = Date.parse(d.toISOString());
    assert((new Date(a)).toISOString(), d.toISOString());

    assert((new Date("2020-01-01T01:01:01.123Z")).toISOString(),
                     "2020-01-01T01:01:01.123Z");
    /* implementation defined behavior */
    assert((new Date("2020-01-01T01:01:01.1Z")).toISOString(),
                     "2020-01-01T01:01:01.100Z");
    assert((new Date("2020-01-01T01:01:01.12Z")).toISOString(),
                     "2020-01-01T01:01:01.120Z");
    assert((new Date("2020-01-01T01:01:01.1234Z")).toISOString(),
                     "2020-01-01T01:01:01.123Z");
    assert((new Date("2020-01-01T01:01:01.12345Z")).toISOString(),
                     "2020-01-01T01:01:01.123Z");
    assert((new Date("2020-01-01T01:01:01.1235Z")).toISOString(),
                     "2020-01-01T01:01:01.123Z");
    assert((new Date("2020-01-01T01:01:01.9999Z")).toISOString(),
                     "2020-01-01T01:01:01.999Z");

    assert(Date.UTC(2017), 1483228800000);
    assert(Date.UTC(2017, 9), 1506816000000);
    assert(Date.UTC(2017, 9, 22), 1508630400000);
    assert(Date.UTC(2017, 9, 22, 18), 1508695200000);
    assert(Date.UTC(2017, 9, 22, 18, 10), 1508695800000);
    assert(Date.UTC(2017, 9, 22, 18, 10, 11), 1508695811000);
    assert(Date.UTC(2017, 9, 22, 18, 10, 11, 91), 1508695811091);

    assert(Date.UTC(NaN), NaN);
    assert(Date.UTC(2017, NaN), NaN);
    assert(Date.UTC(2017, 9, NaN), NaN);
    assert(Date.UTC(2017, 9, 22, NaN), NaN);
    assert(Date.UTC(2017, 9, 22, 18, NaN), NaN);
    assert(Date.UTC(2017, 9, 22, 18, 10, NaN), NaN);
    assert(Date.UTC(2017, 9, 22, 18, 10, 11, NaN), NaN);
    assert(Date.UTC(2017, 9, 22, 18, 10, 11, 91, NaN), 1508695811091);

    // TODO: Fix rounding errors on Windows/Cygwin.
    if (!['win32', 'cygwin'].includes(os.platform)) {
        // from test262/test/built-ins/Date/UTC/fp-evaluation-order.js
        assert(Date.UTC(1970, 0, 1, 80063993375, 29, 1, -288230376151711740), 29312,
               'order of operations / precision in MakeTime');
        assert(Date.UTC(1970, 0, 213503982336, 0, 0, 0, -18446744073709552000), 34447360,
               'precision in MakeDate');
    }
    //assert(Date.UTC(2017 - 1e9, 9 + 12e9), 1506816000000);  // node fails this
    assert(Date.UTC(2017, 9, 22 - 1e10, 18 + 24e10), 1508695200000);
    assert(Date.UTC(2017, 9, 22, 18 - 1e10, 10 + 60e10), 1508695800000);
    assert(Date.UTC(2017, 9, 22, 18, 10 - 1e10, 11 + 60e10), 1508695811000);
    assert(Date.UTC(2017, 9, 22, 18, 10, 11 - 1e12, 91 + 1000e12), 1508695811091);
    assert(new Date("2024 Apr 7 1:00 AM").toLocaleString(), "04/07/2024, 01:00:00 AM");
    assert(new Date("2024 Apr 7 2:00 AM").toLocaleString(), "04/07/2024, 02:00:00 AM");
    assert(new Date("2024 Apr 7 11:00 AM").toLocaleString(), "04/07/2024, 11:00:00 AM");
    assert(new Date("2024 Apr 7 12:00 AM").toLocaleString(), "04/07/2024, 12:00:00 AM");
    assert(new Date("2024 Apr 7 1:00 PM").toLocaleString(), "04/07/2024, 01:00:00 PM");
    assert(new Date("2024 Apr 7 2:00 PM").toLocaleString(), "04/07/2024, 02:00:00 PM");
    assert(new Date("2024 Apr 7 11:00 PM").toLocaleString(), "04/07/2024, 11:00:00 PM");
    assert(new Date("2024 Apr 7 12:00 PM").toLocaleString(), "04/07/2024, 12:00:00 PM");
}

function test_regexp()
{
    var a, str;
    str = "abbbbbc";
    a = /(b+)c/.exec(str);
    assert(a[0], "bbbbbc");
    assert(a[1], "bbbbb");
    assert(a.index, 1);
    assert(a.input, str);
    a = /(b+)c/.test(str);
    assert(a, true);
    assert(/\x61/.exec("a")[0], "a");
    assert(/\u0061/.exec("a")[0], "a");
    assert(/\ca/.exec("\x01")[0], "\x01");
    assert(/\\a/.exec("\\a")[0], "\\a");
    assert(/\c0/.exec("\\c0")[0], "\\c0");

    a = /(\.(?=com|org)|\/)/.exec("ah.com");
    assert(a.index === 2 && a[0] === ".");

    a = /(\.(?!com|org)|\/)/.exec("ah.com");
    assert(a, null);

    a = /(?=(a+))/.exec("baaabac");
    assert(a.index === 1 && a[0] === "" && a[1] === "aaa");

    a = /(z)((a+)?(b+)?(c))*/.exec("zaacbbbcac");
    assert(a, ["zaacbbbcac","z","ac","a",,"c"]);

    a = eval("/\0a/");
    assert(a.toString(), "/\0a/");
    assert(a.exec("\0a")[0], "\0a");

    assert(/{1a}/.toString(), "/{1a}/");
    a = /a{1+/.exec("a{11");
    assert(a, ["a{11"] );

    eval("/[a-]/");  // accepted with no flag
    eval("/[a-]/u"); // accepted with 'u' flag

    let ex;
    try {
        eval("/[a-]/v"); // rejected with 'v' flag
    } catch (_ex) {
        ex = _ex;
    }
    assert(ex?.message, "invalid class range");

    eval("/[\\-]/");
    eval("/[\\-]/u");

    /* test zero length matches */
    a = /()*?a/.exec(",");
    assert(a, null);
    a = /(?:(?=(abc)))a/.exec("abc");
    assert(a, ["a", "abc"]);
    a = /(?:(?=(abc)))?a/.exec("abc");
    assert(a, ["a", undefined]);
    a = /(?:(?=(abc))){0,2}a/.exec("abc");
    assert(a, ["a", undefined]);
    a = /(?:|[\w])+([0-9])/.exec("123a23");
    assert(a, ["123a23", "3"]);
    a = "ab".split(/(c)*/);
    assert(a, ["a", undefined, "b"]);
}

function test_symbol()
{
    var a, b, obj, c;
    a = Symbol("abc");
    obj = {};
    obj[a] = 2;
    assert(obj[a], 2);
    assert(typeof obj["abc"], "undefined");
    assert(String(a), "Symbol(abc)");
    b = Symbol("abc");
    assert(a == a);
    assert(a === a);
    assert(a != b);
    assert(a !== b);

    b = Symbol.for("abc");
    c = Symbol.for("abc");
    assert(b === c);
    assert(b !== a);

    assert(Symbol.keyFor(b), "abc");
    assert(Symbol.keyFor(a), undefined);

    a = Symbol("aaa");
    assert(a.valueOf(), a);
    assert(a.toString(), "Symbol(aaa)");

    b = Object(a);
    assert(b.valueOf(), a);
    assert(b.toString(), "Symbol(aaa)");
}

function test_map()
{
    var a, i, n, tab, o, v;
    n = 1000;

    a = new Map();
    for (var i = 0; i < n; i++) {
        a.set(i, i);
    }
    a.set(-2147483648, 1);
    assert(a.get(-2147483648), 1);
    assert(a.get(-2147483647 - 1), 1);
    assert(a.get(-2147483647.5 - 0.5), 1);

    a = new Map();
    tab = [];
    for(i = 0; i < n; i++) {
        v = { };
        o = { id: i };
        tab[i] = [o, v];
        a.set(o, v);
    }

    assert(a.size, n);
    for(i = 0; i < n; i++) {
        assert(a.get(tab[i][0]), tab[i][1]);
    }

    i = 0;
    a.forEach(function (v, o) {
        assert(o, tab[i++][0]);
        assert(a.has(o));
        assert(a.delete(o));
        assert(!a.has(o));
    });

    assert(a.size, 0);
}

function test_weak_map()
{
    var a, e, i, n, tab, o, v, n2;
    a = new WeakMap();
    n = 10;
    tab = [];
    for (const k of [null, 42, "no", Symbol.for("forbidden")]) {
        e = undefined;
        try {
            a.set(k, 42);
        } catch (_e) {
            e = _e;
        }
        assert(!!e);
        assert(e.message, "invalid value used as WeakMap key");
    }
    for(i = 0; i < n; i++) {
        v = { };
        o = { id: i };
        tab[i] = [o, v];
        a.set(o, v);
    }
    o = null;

    n2 = n >> 1;
    for(i = 0; i < n2; i++) {
        a.delete(tab[i][0]);
    }
    for(i = n2; i < n; i++) {
        tab[i][0] = null; /* should remove the object from the WeakMap too */
    }
    /* the WeakMap should be empty here */
}

function test_weak_set()
{
    var a, e;
    a = new WeakSet();
    for (const k of [null, 42, "no", Symbol.for("forbidden")]) {
        e = undefined;
        try {
            a.add(k);
        } catch (_e) {
            e = _e;
        }
        assert(!!e);
        assert(e.message, "invalid value used as WeakSet key");
    }
}

function test_generator()
{
    function *f() {
        var ret;
        yield 1;
        ret = yield 2;
        assert(ret, "next_arg");
        return 3;
    }
    function *f2() {
        yield 1;
        yield 2;
        return "ret_val";
    }
    function *f1() {
        var ret = yield *f2();
        assert(ret, "ret_val");
        return 3;
    }
    function *f3() {
        var ret;
        /* test stack consistency with nip_n to handle yield return +
         * finally clause */
        try {
            ret = 2 + (yield 1);
        } catch(e) {
        } finally {
            ret++;
        }
        return ret;
    }
    var g, v;
    g = f();
    v = g.next();
    assert(v.value === 1 && v.done === false);
    v = g.next();
    assert(v.value === 2 && v.done === false);
    v = g.next("next_arg");
    assert(v.value === 3 && v.done === true);
    v = g.next();
    assert(v.value === undefined && v.done === true);

    g = f1();
    v = g.next();
    assert(v.value === 1 && v.done === false);
    v = g.next();
    assert(v.value === 2 && v.done === false);
    v = g.next();
    assert(v.value === 3 && v.done === true);
    v = g.next();
    assert(v.value === undefined && v.done === true);

    g = f3();
    v = g.next();
    assert(v.value === 1 && v.done === false);
    v = g.next(3);
    assert(v.value === 6 && v.done === true);
}

function test_proxy_iter()
{
    const p = new Proxy({}, {
        getOwnPropertyDescriptor() {
            return {configurable: true, enumerable: true, value: 42};
        },
        ownKeys() {
            return ["x", "y"];
        },
    });
    const a = [];
    for (const x in p) a.push(x);
    assert(a[0], "x");
    assert(a[1], "y");
}

/* CVE-2023-31922 */
function test_proxy_is_array()
{
  for (var r = new Proxy([], {}), y = 0; y < 331072; y++)
      r = new Proxy(r, {});

  try {
    /* Without ASAN */
    assert(Array.isArray(r));
  } catch(e) {
    /* With ASAN expect RangeError "Maximum call stack size exceeded" to be raised */
    if (e instanceof RangeError) {
      assert(e.message, "Maximum call stack size exceeded", "Stack overflow error was not raised")
    } else {
      throw e;
    }
  }
}

function test_finalization_registry()
{
    {
        let expected = {};
        let actual;
        let finrec = new FinalizationRegistry(v => { actual = v });
        finrec.register({}, expected);
        queueMicrotask(() => {
            assert(actual, expected);
        });
    }
    {
        let expected = 42;
        let actual;
        let finrec = new FinalizationRegistry(v => { actual = v });
        finrec.register({}, expected);
        queueMicrotask(() => {
            assert(actual, expected);
        });
    }
}

function test_cur_pc()
{
    var a = [];
    Object.defineProperty(a, '1', {
            get: function() { throw Error("a[1]_get"); },
            set: function(x) { throw Error("a[1]_set"); }
            });
    assertThrows(Error, function() { return a[1]; });
    assertThrows(Error, function() { a[1] = 1; });
    assertThrows(Error, function() { return [...a]; });
    assertThrows(Error, function() { return ({...b} = a); });

    var o = {};
    Object.defineProperty(o, 'x', {
            get: function() { throw Error("o.x_get"); },
            set: function(x) { throw Error("o.x_set"); }
            });
    o.valueOf = function() { throw Error("o.valueOf"); };
    assertThrows(Error, function() { return +o; });
    assertThrows(Error, function() { return -o; });
    assertThrows(Error, function() { return o+1; });
    assertThrows(Error, function() { return o-1; });
    assertThrows(Error, function() { return o*1; });
    assertThrows(Error, function() { return o/1; });
    assertThrows(Error, function() { return o%1; });
    assertThrows(Error, function() { return o**1; });
    assertThrows(Error, function() { return o<<1; });
    assertThrows(Error, function() { return o>>1; });
    assertThrows(Error, function() { return o>>>1; });
    assertThrows(Error, function() { return o&1; });
    assertThrows(Error, function() { return o|1; });
    assertThrows(Error, function() { return o^1; });
    assertThrows(Error, function() { return o<1; });
    assertThrows(Error, function() { return o==1; });
    assertThrows(Error, function() { return o++; });
    assertThrows(Error, function() { return o--; });
    assertThrows(Error, function() { return ++o; });
    assertThrows(Error, function() { return --o; });
    assertThrows(Error, function() { return ~o; });

    Object.defineProperty(globalThis, 'xxx', {
            get: function() { throw Error("xxx_get"); },
            set: function(x) { throw Error("xxx_set"); }
            });
    assertThrows(Error, function() { return xxx; });
    assertThrows(Error, function() { xxx = 1; });
}

test();
test_function();
test_enum();
test_array();
test_string();
test_math();
test_number();
test_eval();
test_typed_array();
test_json();
test_date();
test_regexp();
test_symbol();
test_map();
test_weak_map();
test_weak_set();
test_generator();
test_proxy_iter();
test_proxy_is_array();
test_finalization_registry();
test_exception_source_pos();
test_function_source_pos();
test_exception_prepare_stack();
test_exception_stack_size_limit();
test_exception_capture_stack_trace();
test_exception_capture_stack_trace_filter();
test_cur_pc();
