/* Tiny expression parser: turns "2x^2 - sin(x)/3" into a JS function of x. */
(function (root) {
  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    ln: Math.log, log: Math.log10, exp: Math.exp,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign
  };
  var CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(src) {
    var s = src.replace(/π/g, "pi").replace(/×|·/g, "*").replace(/÷/g, "/")
               .replace(/−/g, "-").replace(/√/g, "sqrt").replace(/²/g, "^2").replace(/³/g, "^3");
    var t = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i))) && !/^\d+\.?\d*e(?![+-]?\d)/i.test(s.slice(i))) {
        t.push({ k: "num", v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if ((m = /^[A-Za-z]+/.exec(s.slice(i)))) {
        var w = m[0].toLowerCase();
        if (FUNCS[w] || CONSTS[w] !== undefined || w === "x") { t.push({ k: "id", v: w }); i += w.length; continue; }
        // split things like "xe" or "xpi" or "sinx" greedily into known names
        var done = false;
        for (var len = w.length - 1; len >= 1 && !done; len--) {
          var head = w.slice(0, len);
          if (FUNCS[head] || CONSTS[head] !== undefined || head === "x") {
            t.push({ k: "id", v: head }); i += len; done = true;
          }
        }
        if (!done) throw new Error("Unknown name: " + m[0]);
        continue;
      }
      if ("+-*/^(),".indexOf(c) >= 0) { t.push({ k: c }); i++; continue; }
      if (c === "|") { t.push({ k: "|" }); i++; continue; }
      throw new Error("Unexpected character: " + c);
    }
    return t;
  }

  function parse(src) {
    var s = src.trim();
    // accept "y = ...", "f(x) = ..."
    s = s.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, "");
    if (/=/.test(s)) throw new Error("Use the form y = f(x)");
    if (!s) throw new Error("Empty equation");
    var tk = tokenize(s), p = 0, absOpen = false;
    function peek() { return tk[p] ? tk[p].k : null; }
    function next() { return tk[p++]; }
    function expect(k) { if (peek() !== k) throw new Error("Expected '" + k + "'"); p++; }

    function startsFactor() {
      var k = peek();
      return k === "num" || k === "id" || k === "(" || (k === "|" && !absOpen);
    }
    function expr() {
      var l = term();
      while (peek() === "+" || peek() === "-") {
        var op = next().k, r = term(), a = l;
        l = op === "+" ? (function (a, r) { return function (x) { return a(x) + r(x); }; })(a, r)
                       : (function (a, r) { return function (x) { return a(x) - r(x); }; })(a, r);
      }
      return l;
    }
    function term() {
      var l = unary();
      for (;;) {
        var k = peek(), a = l, r;
        if (k === "*") { next(); r = unary(); l = (function (a, r) { return function (x) { return a(x) * r(x); }; })(a, r); }
        else if (k === "/") { next(); r = unary(); l = (function (a, r) { return function (x) { return a(x) / r(x); }; })(a, r); }
        else if (startsFactor()) { r = power(); l = (function (a, r) { return function (x) { return a(x) * r(x); }; })(a, r); }
        else return l;
      }
    }
    function unary() {
      if (peek() === "-") { next(); var u = unary(); return function (x) { return -u(x); }; }
      if (peek() === "+") { next(); return unary(); }
      return power();
    }
    function power() {
      var b = primary();
      if (peek() === "^") {
        next();
        var e = unary();
        return function (x) { return Math.pow(b(x), e(x)); };
      }
      return b;
    }
    function primary() {
      var t = next();
      if (!t) throw new Error("Unexpected end of equation");
      if (t.k === "num") { var n = t.v; return function () { return n; }; }
      if (t.k === "(") { var inner = expr(); expect(")"); return inner; }
      if (t.k === "|") {
        absOpen = true; var a = expr(); absOpen = false; expect("|");
        return function (x) { return Math.abs(a(x)); };
      }
      if (t.k === "id") {
        if (t.v === "x") return function (x) { return x; };
        if (CONSTS[t.v] !== undefined) { var c = CONSTS[t.v]; return function () { return c; }; }
        var f = FUNCS[t.v];
        var arg;
        if (peek() === "(") { next(); arg = expr(); expect(")"); }
        else { arg = power(); }               // allows "sin x" and "sin x^2"-style input
        return function (x) { return f(arg(x)); };
      }
      throw new Error("Unexpected '" + t.k + "'");
    }
    var fn = expr();
    if (p < tk.length) throw new Error("Unexpected '" + tk[p].k + "'");
    return fn;
  }

  var api = { parse: parse };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EqParser = api;
})(typeof window !== "undefined" ? window : this);
