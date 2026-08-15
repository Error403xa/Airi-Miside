let rr = { exports: {} };
(function () {
  var ht; var ni; var oi; var li; var ui; var se; var hi; var gt = { d: function(s, e) {
    for (var t in e) gt.o(e, t) && !gt.o(s, t) && Object.defineProperty(s, t, { enumerable: !0, get: e[t] });
  }, o: function(s, e) {
    return Object.prototype.hasOwnProperty.call(s, e);
  }, r: function(s) {
    typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(s, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(s, "__esModule", { value: !0 });
  } }; var Ft = {}
  gt.r(Ft), gt.d(Ft, { hideMessageBox() {
    return ha;
  }, initializeLive2D() {
    return ca;
  }, revealMessageBox() {
    return ga;
  }, setExpression() {
    return oa;
  }, setMessageBox() {
    return ua;
  }, setRandomExpression() {
    return la;
  } })
  class S {
    constructor(e = 0) {
      e < 1 ? (this._ptr = [], this._capacity = 0, this._size = 0) : (this._ptr = new Array(e), this._capacity = e, this._size = 0)
    }
    at(e) {
      return this._ptr[e]
    }
    set(e, t) {
      this._ptr[e] = t
    }
    get(e = 0) {
      const t = [];
      for (let i = e; i < this._size; i++) t.push(this._ptr[i])
      return t
    }
    pushBack(e) {
      this._size >= this._capacity && this.prepareCapacity(this._capacity == 0 ? S.s_defaultSize : 2 * this._capacity), this._ptr[this._size++] = e
    }
    clear() {
      this._ptr.length = 0, this._size = 0
    }
    getSize() {
      return this._size
    }
    assign(e, t) {
      this._size < e && this.prepareCapacity(e)
      for (let i = 0; i < e; i++) this._ptr[i] = t
      this._size = e
    }
    resize(e, t = null) {
      this.updateSize(e, t, !0)
    }
    updateSize(e, t = null, i = !0) {
      if (this._size < e) { if (this.prepareCapacity(e), i) for (let r = this._size; r < e; r++) this._ptr[r] = typeof t == "function" ? JSON.parse(JSON.stringify(new t())) : t;
      else for (let r = this._size; r < e; r++) this._ptr[r] = t;
}
      else {
        const r = this._size - e
        this._ptr.splice(this._size - r, r)
      }
      this._size = e
    }
    insert(e, t, i) {
      let r = e._index
      const a = t._index; const o = i._index; const n = o - a
      this.prepareCapacity(this._size + n)
      const l = this._size - r
      if (l > 0) { for (let h = 0; h < l; h++) this._ptr.splice(r + h, 0, null);
}
      for (let h = a; h < o; h++, r++) this._ptr[r] = t._vector._ptr[h]
      this._size = this._size + n
    }
    remove(e) {
      return e >= 0 && this._size > e && !this._ptr.splice(e, 1), --this._size, 0;
    }

    erase(e) {
      const t = e._index
      return t < 0 || this._size <= t ? e : (this._ptr.splice(t, 1), --this._size, new Be(this, t))
    }
    prepareCapacity(e) {
      e > this._capacity && (this._capacity == 0 ? (this._ptr = new Array(e), this._capacity = e) : (this._ptr.length = e, this._capacity = e))
    }
    begin() {
      return this._size == 0 ? this.end() : new Be(this, 0)
    }
    end() {
      return new Be(this, this._size)
    }
    getOffset(e) {
      const t = new S()
      return t._ptr = this.get(e), t._size = this.get(e).length, t._capacity = this.get(e).length, t
    }
  }
  S.s_defaultSize = 10
  class Be {
    constructor(e, t) {
      this._vector = e ?? null, this._index = t ?? 0
    }
    set(e) {
      return this._index = e._index, this._vector = e._vector, this
    }
    preIncrement() {
      return ++this._index, this
    }
    preDecrement() {
      return --this._index, this
    }
    increment() {
      return new Be(this._vector, this._index++)
    }
    decrement() {
      return new Be(this._vector, this._index--)
    }
    ptr() {
      return this._vector._ptr[this._index]
    }
    substitution(e) {
      return this._index = e._index, this._vector = e._vector, this
    }
    notEqual(e) {
      return this._index != e._index || this._vector != e._vector
    }
  }
  (function (s) {
    s.csmVector = S, s.iterator = Be
  })(ht || (ht = {}))
  class Z {
    append(e, t) {
      return this.s += t !== void 0 ? e.substr(0, t) : e, this
    }
    expansion(e, t) {
      for (let i = 0; i < e; i++) this.append(t)
      return this
    }
    getBytes() {
      return encodeURIComponent(this.s).replace(/%../g, 'x').length
    }
    getLength() {
      return this.s.length
    }
    isLess(e) {
      return this.s < e.s
    }
    isGreat(e) {
      return this.s > e.s
    }
    isEqual(e) {
      return this.s == e
    }
    isEmpty() {
      return this.s.length == 0
    }
    constructor(e) {
      this.s = e
    }
  }
  (function (s) {
    s.csmString = Z
  })(ni || (ni = {}))
  class He {
    getString() {
      return this._id
    }
    constructor(e) {
      this._id = typeof e != 'string' ? e : new Z(e)
    }
    isEqual(e) {
      return typeof e == 'string' ? this._id.isEqual(e) : e instanceof Z ? this._id.isEqual(e.s) : e instanceof He && this._id.isEqual(e._id.s)
    }
    isNotEqual(e) {
      return typeof e == 'string' ? !this._id.isEqual(e) : e instanceof Z ? !this._id.isEqual(e.s) : e instanceof He && !this._id.isEqual(e._id.s)
    }
  }
  (function (s) {
    s.CubismId = He
  })(oi || (oi = {}))
  class gi {
    constructor() {
      this._ids = new S()
    }
    release() {
      for (let e = 0; e < this._ids.getSize(); ++e) this._ids.set(e, void 0)
      this._ids = null
    }
    registerIds(e) {
      for (let t = 0; t < e.length; t++) this.registerId(e[t])
    }
    registerId(e) {
      let t = null
      return typeof e != 'string' ? this.registerId(e.s) : ((t = this.findId(e)) != null || (t = new He(e), this._ids.pushBack(t)), t)
    }
    getId(e) {
      return this.registerId(e)
    }
    isExist(e) {
      return typeof e == 'string' ? this.findId(e) != null : this.isExist(e.s)
    }
    findId(e) {
      for (let t = 0; t < this._ids.getSize(); ++t) { if (this._ids.at(t).getString().isEqual(e)) return this._ids.at(t);
}
      return null
    }
  }
  (function (s) {
    s.CubismIdManager = gi
  })(li || (li = {}))
  class O {
    constructor() {
      this._tr = new Float32Array(16), this.loadIdentity()
    }
    static multiply(e, t, i) {
      const r = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      for (let a = 0; a < 4; ++a) { for (let o = 0; o < 4; ++o) for (let n = 0; n < 4; ++n) r[o + 4 * a] += e[n + 4 * a] * t[o + 4 * n];
}
      for (let a = 0; a < 16; ++a) i[a] = r[a]
    }
    loadIdentity() {
      const e = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
      this.setMatrix(e)
    }
    setMatrix(e) {
      for (let t = 0; t < 16; ++t) this._tr[t] = e[t]
    }
    getArray() {
      return this._tr
    }
    getScaleX() {
      return this._tr[0]
    }
    getScaleY() {
      return this._tr[5]
    }
    getTranslateX() {
      return this._tr[12]
    }
    getTranslateY() {
      return this._tr[13]
    }
    transformX(e) {
      return this._tr[0] * e + this._tr[12]
    }
    transformY(e) {
      return this._tr[5] * e + this._tr[13]
    }
    invertTransformX(e) {
      return (e - this._tr[12]) / this._tr[0]
    }
    invertTransformY(e) {
      return (e - this._tr[13]) / this._tr[5]
    }
    translateRelative(e, t) {
      const i = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, e, t, 0, 1])
      O.multiply(i, this._tr, this._tr)
    }
    translate(e, t) {
      this._tr[12] = e, this._tr[13] = t
    }
    translateX(e) {
      this._tr[12] = e
    }
    translateY(e) {
      this._tr[13] = e
    }
    scaleRelative(e, t) {
      const i = new Float32Array([e, 0, 0, 0, 0, t, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
      O.multiply(i, this._tr, this._tr)
    }
    scale(e, t) {
      this._tr[0] = e, this._tr[5] = t
    }
    multiplyByMatrix(e) {
      O.multiply(e.getArray(), this._tr, this._tr)
    }
    clone() {
      const e = new O()
      for (let t = 0; t < this._tr.length; t++) e._tr[t] = this._tr[t]
      return e
    }
  }
  (function (s) {
    s.CubismMatrix44 = O
  })(ui || (ui = {}))
  class dt {
    static create() {
      return null
    }
    static delete(e) {
    }

    initialize(e) {
      this._model = e
    }
    drawModel() {
      this.getModel() != null && (this.saveProfile(), this.doDrawModel(), this.restoreProfile())
    }
    setMvpMatrix(e) {
      this._mvpMatrix4x4.setMatrix(e.getArray())
    }
    getMvpMatrix() {
      return this._mvpMatrix4x4
    }
    setModelColor(e, t, i, r) {
      e < 0 ? e = 0 : e > 1 && (e = 1), t < 0 ? t = 0 : t > 1 && (t = 1), i < 0 ? i = 0 : i > 1 && (i = 1), r < 0 ? r = 0 : r > 1 && (r = 1), this._modelColor.R = e, this._modelColor.G = t, this._modelColor.B = i, this._modelColor.A = r
    }
    getModelColor() {
      return JSON.parse(JSON.stringify(this._modelColor))
    }
    setIsPremultipliedAlpha(e) {
      this._isPremultipliedAlpha = e
    }
    isPremultipliedAlpha() {
      return this._isPremultipliedAlpha
    }
    setIsCulling(e) {
      this._isCulling = e
    }
    isCulling() {
      return this._isCulling
    }
    setAnisotropy(e) {
      this._anisotropy = e
    }
    getAnisotropy() {
      return this._anisotropy
    }
    getModel() {
      return this._model
    }
    useHighPrecisionMask(e) {
      this._useHighPrecisionMask = e
    }
    isUsingHighPrecisionMask() {
      return this._useHighPrecisionMask
    }
    constructor() {
      this._isCulling = !1, this._isPremultipliedAlpha = !1, this._anisotropy = 0, this._model = null, this._modelColor = new H(), this._useHighPrecisionMask = !1, this._mvpMatrix4x4 = new O(), this._mvpMatrix4x4.loadIdentity()
    }
  }
  (function (s) {
    s[s.CubismBlendMode_Normal = 0] = 'CubismBlendMode_Normal', s[s.CubismBlendMode_Additive = 1] = 'CubismBlendMode_Additive', s[s.CubismBlendMode_Multiplicative = 2] = 'CubismBlendMode_Multiplicative';
  })(se || (se = {}))
  class H {
    constructor(e = 1, t = 1, i = 1, r = 1) {
      this.R = e, this.G = t, this.B = i, this.A = r
    }
  }
  (function (s) {
    s.CubismBlendMode = se, s.CubismRenderer = dt, s.CubismTextureColor = H
  })(hi || (hi = {}))
  const ct = (s, e, t) => {
      ((i, r, a) => {
        di.print(i, '[CSM]' + r, a)
    })(s, `${e  }
`, t)
  }, re = (s) => {
      console.assert(s)
  };
  let qe, ae, pe, X
  qe = (s, ...e) => {
    ct(ye.LogLevel_Debug, '[D]' + s, e)
  }, ae = (s, ...e) => {
    ct(ye.LogLevel_Info, '[I]' + s, e)
  }, pe = (s, ...e) => {
    ct(ye.LogLevel_Warning, '[W]' + s, e)
  }, X = (s, ...e) => {
    ct(ye.LogLevel_Error, '[E]' + s, e)
  };
  class di {
    static print(e, t, i) {
      if (e < V.getLoggingLevel()) 
return;
      const r = V.coreLogFunction
      r && r(t.replace(/\{(\d+)\}/g, (a, o) => i[o]))
    }
    static dumpBytes(e, t, i) {
      for (let r = 0; r < i; r++) { r % 16 == 0 && r > 0 ? this.print(e, `
`) : r % 8 == 0 && r > 0 && this.print(e, "  "), this.print(e, "{0} ", [255 & t[r]]);
}
      this.print(e, `
`)
    }
    constructor() {
    }
  }
  let ci, _i;
  (function (s) {
    s.CubismDebug = di
  })(ci || (ci = {}))
  class mi {
    constructor(e, t) {
      this.first = e ?? null, this.second = t ?? null
    }
  }
  class G {
    constructor(e) {
      e != null ? e < 1 ? (this._keyValues = [], this._dummyValue = null, this._size = 0) : (this._keyValues = new Array(e), this._size = e) : (this._keyValues = [], this._dummyValue = null, this._size = 0)
    }
    release() {
      this.clear()
    }
    appendKey(e) {
      this.prepareCapacity(this._size + 1, !1), this._keyValues[this._size] = new mi(e), this._size += 1
    }
    getValue(e) {
      let t = -1
      for (let i = 0; i < this._size; i++) { if (this._keyValues[i].first == e) {
        t = i;
        break;
      }
}
      return t >= 0 ? this._keyValues[t].second : (this.appendKey(e), this._keyValues[this._size - 1].second)
    }
    setValue(e, t) {
      let i = -1
      for (let r = 0; r < this._size; r++) { if (this._keyValues[r].first == e) {
        i = r;
        break;
      }
}
      i >= 0 ? this._keyValues[i].second = t : (this.appendKey(e), this._keyValues[this._size - 1].second = t)
    }
    isExist(e) {
      for (let t = 0; t < this._size; t++) { if (this._keyValues[t].first == e) return !0;
}
      return !1
    }
    clear() {
      this._keyValues = void 0, this._keyValues = null, this._keyValues = [], this._size = 0
    }
    getSize() {
      return this._size
    }
    prepareCapacity(e, t) {
      e > this._keyValues.length && (this._keyValues.length == 0 ? (!t && e < G.DefaultSize && (e = G.DefaultSize), this._keyValues.length = e) : (!t && e < 2 * this._keyValues.length && (e = 2 * this._keyValues.length), this._keyValues.length = e))
    }
    begin() {
      return new ve(this, 0)
    }
    end() {
      return new ve(this, this._size)
    }
    erase(e) {
      const t = e._index
      return t < 0 || this._size <= t ? e : (this._keyValues.splice(t, 1), --this._size, new ve(this, t))
    }
    dumpAsInt() {
      for (let e = 0; e < this._size; e++) { qe("{0} ,", this._keyValues[e]), qe(`
`);
}
    }
  }
  G.DefaultSize = 10
  class ve {
    constructor(e, t) {
      this._map = e ?? new G(), this._index = t ?? 0
    }
    set(e) {
      return this._index = e._index, this._map = e._map, this
    }
    preIncrement() {
      return ++this._index, this
    }
    preDecrement() {
      return --this._index, this
    }
    increment() {
      return new ve(this._map, this._index++)
    }
    decrement() {
      const e = new ve(this._map, this._index)
      return this._map = e._map, this._index = e._index, this
    }
    ptr() {
      return this._map._keyValues[this._index]
    }
    notEqual(e) {
      return this._index != e._index || this._map != e._map
    }
  }
  (function (s) {
    s.csmMap = G, s.csmPair = mi, s.iterator = ve
  })(_i || (_i = {}))
  class _t {
    static parseJsonObject(e, t) {
      return Object.keys(e).forEach((i) => {
        if (typeof e[i] == 'boolean') {
          const r = !!e[i]
          t.put(i, new ne(r))
        } else if (typeof e[i] == 'string') {
          const r = String(e[i])
          t.put(i, new Ee(r))
        } else if (typeof e[i] == 'number') {
          const r = Number(e[i])
          t.put(i, new pt(r))
        } else { e[i] instanceof Array ? t.put(i, _t.parseJsonArray(e[i])) : e[i] instanceof Object ? t.put(i, _t.parseJsonObject(e[i], new Fe())) : e[i] == null ? t.put(i, new Re()) : t.put(i, e[i]);
}
      }), t
    }
    static parseJsonArray(e) {
      const t = new Lt()
      return Object.keys(e).forEach((i) => {
        if (typeof Number(i) == 'number') { if (typeof e[i] == "boolean") {
          const r = !!e[i];
          t.add(new ne(r));
        } else if (typeof e[i] == "string") {
          const r = String(e[i]);
          t.add(new Ee(r));
        } else if (typeof e[i] == "number") {
          const r = Number(e[i]);
          t.add(new pt(r));
        } else e[i] instanceof Array ? t.add(this.parseJsonArray(e[i])) : e[i] instanceof Object ? t.add(this.parseJsonObject(e[i], new Fe())) : e[i] == null ? t.add(new Re()) : t.add(e[i]);
}
        else if (Array.isArray(e[i])) { t.add(this.parseJsonArray(e[i]));
}
        else if (e[i] instanceof Object) { t.add(this.parseJsonObject(e[i], new Fe()));
}
        else if (e[i] == null) { t.add(new Re());
}
        else {
          const r = new Array(e[i])
          for (let a = 0; a < r.length; a++) t.add(r[a])
        }
      }), t
    }
  }
  const mt = 'Error: type mismatch';
  class L {
    constructor() {
    }

    getRawString(e, t) {
      return this.getString(e, t)
    }
    toInt(e = 0) {
      return e
    }
    toFloat(e = 0) {
      return e
    }
    toBoolean(e = !1) {
      return e
    }
    getSize() {
      return 0
    }
    getArray(e = null) {
      return e
    }
    getVector(e = new S()) {
      return e
    }
    getMap(e) {
      return e
    }
    getValueByIndex(e) {
      return L.errorValue.setErrorNotForClientCall(mt)
    }
    getValueByString(e) {
      return L.nullValue.setErrorNotForClientCall(mt)
    }
    getKeys() {
      return L.s_dummyKeys
    }
    isError() {
      return !1
    }
    isNull() {
      return !1
    }
    isBool() {
      return !1
    }
    isFloat() {
      return !1
    }
    isString() {
      return !1
    }
    isArray() {
      return !1
    }
    isMap() {
      return !1
    }
    equals(e) {
      return !1
    }
    isStatic() {
      return !1
    }
    setErrorNotForClientCall(e) {
      return We.errorValue
    }
    static staticInitializeNotForClientCall() {
      ne.trueValue = new ne(!0), ne.falseValue = new ne(!1), L.errorValue = new We('ERROR', !0), L.nullValue = new Re(), L.s_dummyKeys = new S()
    }
    static staticReleaseNotForClientCall() {
      ne.trueValue = null, ne.falseValue = null, L.errorValue = null, L.nullValue = null, L.s_dummyKeys = null
    }
  }
  class U {
    constructor(e, t) {
      this._parseCallback = _t.parseJsonObject, this._error = null, this._lineCount = 0, this._root = null, e != null && this.parseBytes(e, t, this._parseCallback)
    }
    static create(e, t) {
      const i = new U()
      return i.parseBytes(e, t, i._parseCallback) ? i : (U.delete(i), null)
    }
    static delete(e) {
    }

    getRoot() {
      return this._root
    }
    static arrayBufferToString(e) {
      const t = new Uint8Array(e)
      let i = '';
      for (let r = 0, a = t.length; r < a; ++r) i += '%' + this.pad(t[r].toString(16))
      return i = decodeURIComponent(i), i
    }
    static pad(e) {
      return e.length < 2 ? '0' + e : e
    }
    parseBytes(e, t, i) {
      const r = new Array(1); const a = U.arrayBufferToString(e)
      if (this._root = i == null ? this.parseValue(a, t, 0, r) : i(JSON.parse(a), new Fe()), this._error) {
        let o = '\0';
        return o = 'Json parse error : @line ' + (this._lineCount + 1) + `
`, this._root = new Ee(o), ae('{0}', this._root.getRawString()), !1
      }
      return this._root != null || (this._root = new We(new Z(this._error), !1), !1)
    }
    getParseError() {
      return this._error
    }
    checkEndOfFile() {
      return this._root.getArray()[1].equals('EOF');
    }

    parseValue(e, t, i, r) {
      if (this._error) 
return null
      let a; let o = null; let n = i
      for (; n < t; n++) { switch (e[n]) {
        case "-":
        case ".":
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          const l = new Array(1);
          return a = ar(e.slice(n), l), r[0] = e.indexOf(l[0]), new pt(a);
        }
        case '"':
          return new Ee(this.parseString(e, t, n + 1, r));
        case "[":
          return o = this.parseArray(e, t, n + 1, r), o;
        case "{":
          return o = this.parseObject(e, t, n + 1, r), o;
        case "n":
          return n + 3 < t ? (o = new Re(), r[0] = n + 4) : this._error = "parse null", o;
        case "t":
          return n + 3 < t ? (o = ne.trueValue, r[0] = n + 4) : this._error = "parse true", o;
        case "f":
          return n + 4 < t ? (o = ne.falseValue, r[0] = n + 5) : this._error = "illegal ',' position", o;
        case ",":
          return this._error = "illegal ',' position", null;
        case "]":
          return r[0] = n, null;
        case `
`:
          this._lineCount++;
      }
}
      return this._error = 'illegal end of value', null
    }
    parseString(e, t, i, r) {
      if (this._error) 
return null
      let a; let o; let n = i
      const l = new Z('');
      let h = i
      for (; n < t; n++) { switch (a = e[n], a) {
        case '"':
          return r[0] = n + 1, l.append(e.slice(h), n - h), l.s;
        case "//":
          if (n++, n - 1 > h && l.append(e.slice(h), n - h), h = n + 1, n < t) switch (o = e[n], o) {
            case "\\":
              l.expansion(1, "\\");
              break;
            case '"':
              l.expansion(1, '"');
              break;
            case "/":
              l.expansion(1, "/");
              break;
            case "b":
              l.expansion(1, "\b");
              break;
            case "f":
              l.expansion(1, "\f");
              break;
            case "n":
              l.expansion(1, `
`);
              break;
            case "r":
              l.expansion(1, "\r");
              break;
            case "t":
              l.expansion(1, "	");
              break;
            case "u":
              this._error = "parse string/unicord escape not supported";
          }
          else this._error = "parse string/escape error";
      }
}
      return this._error = 'parse string/illegal end', null
    }
    parseObject(e, t, i, r) {
      if (this._error) 
return null
      const a = new Fe()
      let o = '', n = i, l = '';
      const h = new Array(1)
      let u = !1
      for (; n < t; n++) {
        e: for (; n < t; n++) { switch (l = e[n], l) {
          case '"':
            if (o = this.parseString(e, t, n + 1, h), this._error) return null;
            n = h[0], u = !0;
            break e;
          case "}":
            return r[0] = n + 1, a;
          case ":":
            this._error = "illegal ':' position";
            break;
          case `
`:
            this._lineCount++;
        }
}
        if (!u) 
return this._error = 'key not found', null
        u = !1
        e: for (; n < t; n++) { switch (l = e[n], l) {
          case ":":
            u = !0, n++;
            break e;
          case "}":
            this._error = "illegal '}' position";
            break;
          case `
`:
            this._lineCount++;
        }
}
        if (!u) 
return this._error = '\':\' not found', null
        const _ = this.parseValue(e, t, n, h)
        if (this._error) 
return null
        n = h[0], a.put(o, _)
        e: for (; n < t; n++) { switch (l = e[n], l) {
          case ",":
            break e;
          case "}":
            return r[0] = n + 1, a;
          case `
`:
            this._lineCount++;
        }
}
      }
      return this._error = 'illegal end of perseObject', null
    }
    parseArray(e, t, i, r) {
      if (this._error) 
return null
      let a; let o = new Lt(); let n = i
      const l = new Array(1)
      for (; n < t; n++) {
        const h = this.parseValue(e, t, n, l)
        if (this._error) 
return null
        n = l[0], h && o.add(h)
        e: for (; n < t; n++) { switch (a = e[n], a) {
          case ",":
            break e;
          case "]":
            return r[0] = n + 1, o;
          case `
`:
            ++this._lineCount;
        }
}
      }
      return o = void 0, this._error = 'illegal end of parseObject', null
    }
  }
  class pt extends L {
    constructor(e) {
      super(), this._value = e
    }
    isFloat() {
      return !0
    }
    getString(e, t) {
      return this._value = Number.parseFloat('\0'), this._stringBuffer = '\0', this._stringBuffer
    }
    toInt(e = 0) {
      return Number.parseInt(this._value.toString())
    }
    toFloat(e = 0) {
      return this._value
    }
    equals(e) {
      return typeof e == 'number' && !Math.round(e) && e == this._value
    }
  }
  class ne extends L {
    isBool() {
      return !0
    }
    toBoolean(e = !1) {
      return this._boolValue
    }
    getString(e, t) {
      return this._stringBuffer = this._boolValue ? 'true' : 'false', this._stringBuffer
    }
    equals(e) {
      return typeof e == 'boolean' && e == this._boolValue
    }
    isStatic() {
      return !0
    }
    constructor(e) {
      super(), this._boolValue = e
    }
  }
  class Ee extends L {
    constructor(e) {
      super(), typeof e == 'string' && (this._stringBuffer = e), e instanceof Z && (this._stringBuffer = e.s)
    }
    isString() {
      return !0
    }
    getString(e, t) {
      return this._stringBuffer
    }
    equals(e) {
      return typeof e == 'string' ? this._stringBuffer == e : e instanceof Z && this._stringBuffer == e.s
    }
  }
  class We extends Ee {
    isStatic() {
      return this._isStatic
    }
    setErrorNotForClientCall(e) {
      return this._stringBuffer = e, this
    }
    constructor(e, t) {
      super(e), this._isStatic = t
    }
    isError() {
      return !0
    }
  }
  class Re extends L {
    isNull() {
      return !0
    }
    getString(e, t) {
      return this._stringBuffer
    }
    isStatic() {
      return !0
    }
    setErrorNotForClientCall(e) {
      return this._stringBuffer = e, We.nullValue
    }
    constructor() {
      super(), this._stringBuffer = 'NullValue';
    }
  }
  class Lt extends L {
    constructor() {
      super(), this._array = new S()
    }
    release() {
      for (let e = this._array.begin(); e.notEqual(this._array.end()); e.preIncrement()) {
        let t = e.ptr()
        t && !t.isStatic() && (t = void 0, t = null)
      }
    }

    isArray() {
      return !0
    }
    getValueByIndex(e) {
      if (e < 0 || this._array.getSize() <= e) 
return L.errorValue.setErrorNotForClientCall('Error: index out of bounds');
      const t = this._array.at(e)
      return t ?? L.nullValue
    }
    getValueByString(e) {
      return L.errorValue.setErrorNotForClientCall(mt)
    }
    getString(e, t) {
      const i = `${t  }[
`;
      for (let r = this._array.begin(); r.notEqual(this._array.end()); r.increment()) {
        const a = r.ptr()
        this._stringBuffer += `${t  }${  a.getString(t + " ")  }
`;
      }
      return this._stringBuffer = `${i + t  }]
`, this._stringBuffer
    }
    add(e) {
      this._array.pushBack(e)
    }
    getVector(e = null) {
      return this._array
    }
    getSize() {
      return this._array.getSize()
    }
  }
  class Fe extends L {
    constructor() {
      super(), this._map = new G()
    }
    release() {
      const e = this._map.begin()
      for (; e.notEqual(this._map.end());) {
        let t = e.ptr().second
        t && !t.isStatic() && (t = void 0, t = null), e.preIncrement()
      }
    }

    isMap() {
      return !0
    }
    getValueByString(e) {
      if (e instanceof Z) {
        const t = this._map.getValue(e.s)
        return t ?? L.nullValue
      }
      for (let t = this._map.begin(); t.notEqual(this._map.end()); t.preIncrement()) { if (t.ptr().first == e) return t.ptr().second == null ? L.nullValue : t.ptr().second;
}
      return L.nullValue
    }
    getValueByIndex(e) {
      return L.errorValue.setErrorNotForClientCall(mt)
    }
    getString(e, t) {
      this._stringBuffer = `${t  }{
`;
      const i = this._map.begin()
      for (; i.notEqual(this._map.end());) {
        const r = i.ptr().first; const a = i.ptr().second
        this._stringBuffer += `${t  } ${  r  } : ${  a.getString(t + "   ")  } 
`, i.preIncrement()
      }
      return this._stringBuffer += `${t  }}
`, this._stringBuffer
    }
    getMap(e) {
      return this._map
    }
    put(e, t) {
      this._map.setValue(e, t)
    }
    getKeys() {
      if (!this._keys) {
        this._keys = new S()
        const e = this._map.begin()
        for (; e.notEqual(this._map.end());) {
          const t = e.ptr().first
          this._keys.pushBack(t), e.preIncrement()
        }
      }
      return this._keys
    }
    getSize() {
      return this._keys.getSize()
    }
  }
  let pi
  function ar(s, e) {
    let t = 0
    for (let r = 1; ; r++) {
      const a = s.slice(r - 1, r)
      if (a == 'e' || a == '-' || a == 'E') 
continue;
      const o = s.substring(0, r); const n = Number(o)
      if (isNaN(n)) 
break;
      t = r
    }
    let i = Number.parseFloat(s)
    return isNaN(i) && (i = Number.NaN), e[0] = s.slice(t), i
  }
  (function (s) {
    s.CubismJson = U, s.JsonArray = Lt, s.JsonBoolean = ne, s.JsonError = We, s.JsonFloat = pt, s.JsonMap = Fe, s.JsonNullvalue = Re, s.JsonString = Ee, s.Value = L
  })(pi || (pi = {}))
  let oe = !1; let Le = !1; let Ae = null; let $e = null
  const fe = Object.freeze({ vertexOffset: 0, vertexStep: 2 })
  function nr(s) {
  }
  class V {
    static startUp(e = null) {
      if (oe) 
return ae('CubismFramework.startUp() is already done.'), oe
      if (Ae = e, Ae != null && Live2DCubismCore.Logging.csmSetLogFunction(Ae.logFunction), oe = !0, oe) {
        const t = Live2DCubismCore.Version.csmGetVersion(); const i = (16711680 & t) >> 16; const r = 65535 & t; const a = t
        ae('Live2D Cubism Core version: {0}.{1}.{2} ({3})', ('00' + ((4278190080 & t) >> 24)).slice(-2), ('00' + i).slice(-2), ('0000' + r).slice(-4), a)
      }
      return ae('CubismFramework.startUp() is complete.'), oe
    }
    static cleanUp() {
      oe = !1, Le = !1, Ae = null, $e = null
    }
    static initialize(e = 0) {
      re(oe), oe ? Le ? pe('CubismFramework.initialize() skipped, already initialized.') : (L.staticInitializeNotForClientCall(), $e = new gi(), Live2DCubismCore.Memory.initializeAmountOfMemory(e), Le = !0, ae('CubismFramework.initialize() is complete.')) : pe('CubismFramework is not started.');
    }

    static dispose() {
      re(oe), oe ? Le ? (L.staticReleaseNotForClientCall(), $e.release(), $e = null, dt.staticRelease(), Le = !1, ae('CubismFramework.dispose() is complete.')) : pe('CubismFramework.dispose() skipped, not initialized.') : pe('CubismFramework is not started.');
    }

    static isStarted() {
      return oe
    }
    static isInitialized() {
      return Le
    }
    static coreLogFunction(e) {
      Live2DCubismCore.Logging.csmGetLogFunction() && Live2DCubismCore.Logging.csmGetLogFunction()(e)
    }
    static getLoggingLevel() {
      return Ae != null ? Ae.loggingLevel : ye.LogLevel_Off
    }
    static getIdManager() {
      return $e
    }
    constructor() {
    }
  }
  class or {
  }
  let ye, fi;
  (function (s) {
    s[s.LogLevel_Verbose = 0] = 'LogLevel_Verbose', s[s.LogLevel_Debug = 1] = 'LogLevel_Debug', s[s.LogLevel_Info = 2] = 'LogLevel_Info', s[s.LogLevel_Warning = 3] = 'LogLevel_Warning', s[s.LogLevel_Error = 4] = 'LogLevel_Error', s[s.LogLevel_Off = 5] = 'LogLevel_Off';
  })(ye || (ye = {})), (function(s) {
    s.Constant = fe, s.csmDelete = nr, s.CubismFramework = V;
  }(fi || (fi = {})));
  var b = { Canvas: void 0, CanvasId: 'live2d', MessageBoxId: 'live2dMessageBox', BackgroundRGBA: [0, 0, 0, 0], CanvasSize: 'auto', LoadFromCache: !1, Live2dDB: void 0, ViewScale: 1, ViewMaxScale: 2, ViewMinScale: 0.8, ViewLogicalLeft: -1, ViewLogicalRight: 1, ViewLogicalMaxLeft: -2, ViewLogicalMaxRight: 2, ViewLogicalMaxBottom: -2, ViewLogicalMaxTop: 2, ResourcesPath: '', MotionGroupIdle: 'Idle', MotionGroupTapBody: 'TapBody', HitAreaNameHead: 'Head', HitAreaNameBody: 'Body', PriorityIdle: 1, PriorityNormal: 2, PriorityForce: 3, CubismLoggingLevel: ye.LogLevel_Verbose }; var j = typeof globalThis < "u" && globalThis || typeof self < "u" && self || j !== void 0 && j; var yi = "URLSearchParams" in j; var xi = "Symbol" in j && "iterator" in Symbol; var ft = "FileReader" in j && "Blob" in j && function() {
    try {
      return new Blob(), !0;
    } catch {
      return !1;
    }
  }(); var Si = "FormData" in j; var yt = 'ArrayBuffer' in j
  if (yt) { var lr = ["[object Int8Array]", "[object Uint8Array]", "[object Uint8ClampedArray]", "[object Int16Array]", "[object Uint16Array]", "[object Int32Array]", "[object Uint32Array]", "[object Float32Array]", "[object Float64Array]"], ur = ArrayBuffer.isView || function(s) {
    return s && lr.indexOf(Object.prototype.toString.call(s)) > -1;
  };
}
  function Je(s) {
    if (typeof s != 'string' && (s = String(s)), /[^\w\-#$%&'*+.^`|~!]/i.test(s) || s === '') 
throw new TypeError(`Invalid character in header field name: "${  s  }"`);
    return s.toLowerCase()
  }
  function At(s) {
    return typeof s != 'string' && (s = String(s)), s
  }
  function Dt(s) {
    let e = { next() {
      var t = s.shift();
      return { done: t === void 0, value: t };
    } }
    return xi && (e[Symbol.iterator] = function () {
      return e
    }), e
  }
  function N(s) {
    this.map = {}, s instanceof N
? s.forEach(function (e, t) {
      this.append(t, e)
    }, this)
: Array.isArray(s)
? s.forEach(function (e) {
      this.append(e[0], e[1])
    }, this)
: s && Object.getOwnPropertyNames(s).forEach(function (e) {
      this.append(e, s[e])
    }, this)
  }
  function kt(s) {
    if (s.bodyUsed) 
return Promise.reject(new TypeError('Already read'))
    s.bodyUsed = !0
  }
  function Ci(s) {
    return new Promise((e, t) => {
      s.onload = function () {
        e(s.result)
      }, s.onerror = function () {
        t(s.error)
      };
    })
  }
  function hr(s) {
    let e = new FileReader(); var t = Ci(e)
    return e.readAsArrayBuffer(s), t
  }
  function Bi(s) {
    if (s.slice) 
return s.slice(0)
    var e = new Uint8Array(s.byteLength)
    return e.set(new Uint8Array(s)), e.buffer
  }
  function vi() {
    return this.bodyUsed = !1, this._initBody = function (s) {
      let e
      this.bodyUsed = this.bodyUsed, this._bodyInit = s, s ? typeof s == 'string' ? this._bodyText = s : ft && Blob.prototype.isPrototypeOf(s) ? this._bodyBlob = s : Si && FormData.prototype.isPrototypeOf(s) ? this._bodyFormData = s : yi && URLSearchParams.prototype.isPrototypeOf(s) ? this._bodyText = s.toString() : yt && ft && (e = s) && DataView.prototype.isPrototypeOf(e) ? (this._bodyArrayBuffer = Bi(s.buffer), this._bodyInit = new Blob([this._bodyArrayBuffer])) : yt && (ArrayBuffer.prototype.isPrototypeOf(s) || ur(s)) ? this._bodyArrayBuffer = Bi(s) : this._bodyText = s = Object.prototype.toString.call(s) : this._bodyText = '', this.headers.get('content-type') || (typeof s == 'string' ? this.headers.set('content-type', 'text/plain;charset=UTF-8') : this._bodyBlob && this._bodyBlob.type ? this.headers.set('content-type', this._bodyBlob.type) : yi && URLSearchParams.prototype.isPrototypeOf(s) && this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8'))
    }, ft && (this.blob = function () {
      let s = kt(this)
      if (s) 
return s
      if (this._bodyBlob) 
return Promise.resolve(this._bodyBlob)
      if (this._bodyArrayBuffer) 
return Promise.resolve(new Blob([this._bodyArrayBuffer]))
      if (this._bodyFormData) 
throw new Error('could not read FormData body as blob');
      return Promise.resolve(new Blob([this._bodyText]))
    }, this.arrayBuffer = function () {
      return this._bodyArrayBuffer ? kt(this) || (ArrayBuffer.isView(this._bodyArrayBuffer) ? Promise.resolve(this._bodyArrayBuffer.buffer.slice(this._bodyArrayBuffer.byteOffset, this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength)) : Promise.resolve(this._bodyArrayBuffer)) : this.blob().then(hr)
    }), this.text = function () {
      let s; var e; var t; var i = kt(this)
      if (i) 
return i
      if (this._bodyBlob) 
return s = this._bodyBlob, t = Ci(e = new FileReader()), e.readAsText(s), t
      if (this._bodyArrayBuffer) { return Promise.resolve(function(r) {
        for (var a = new Uint8Array(r), o = new Array(a.length), n = 0; n < a.length; n++) o[n] = String.fromCharCode(a[n]);
        return o.join("");
      }(this._bodyArrayBuffer));
}
      if (this._bodyFormData) 
throw new Error('could not read FormData body as text');
      return Promise.resolve(this._bodyText)
    }, Si && (this.formData = function () {
      return this.text().then(dr)
    }), this.json = function () {
      return this.text().then(JSON.parse)
    }, this
  }
  N.prototype.append = function (s, e) {
    s = Je(s), e = At(e)
    var t = this.map[s]
    this.map[s] = t ? `${t  }, ${  e}` : e
  }, N.prototype.delete = function (s) {
    delete this.map[Je(s)]
  }, N.prototype.get = function (s) {
    return s = Je(s), this.has(s) ? this.map[s] : null
  }, N.prototype.has = function (s) {
    return this.map.hasOwnProperty(Je(s))
  }, N.prototype.set = function (s, e) {
    this.map[Je(s)] = At(e)
  }, N.prototype.forEach = function (s, e) {
    for (let t in this.map) this.map.hasOwnProperty(t) && s.call(e, this.map[t], t, this)
  }, N.prototype.keys = function () {
    let s = []
    return this.forEach((e, t) => {
      s.push(t)
    }), Dt(s)
  }, N.prototype.values = function () {
    let s = []
    return this.forEach((e) => {
      s.push(e)
    }), Dt(s)
  }, N.prototype.entries = function () {
    let s = []
    return this.forEach((e, t) => {
      s.push([t, e])
    }), Dt(s)
  }, xi && (N.prototype[Symbol.iterator] = N.prototype.entries)
  var gr = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];
  function be(s, e) {
    if (!(this instanceof be)) 
throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    var t; var i; var r = (e = e || {}).body
    if (s instanceof be) {
      if (s.bodyUsed) 
throw new TypeError('Already read');
      this.url = s.url, this.credentials = s.credentials, e.headers || (this.headers = new N(s.headers)), this.method = s.method, this.mode = s.mode, this.signal = s.signal, r || s._bodyInit == null || (r = s._bodyInit, s.bodyUsed = !0)
    } else { this.url = String(s);
}
    if (this.credentials = e.credentials || this.credentials || 'same-origin', !e.headers && this.headers || (this.headers = new N(e.headers)), this.method = (i = (t = e.method || this.method || 'GET').toUpperCase(), gr.includes(i) ? i : t), this.mode = e.mode || this.mode || null, this.signal = e.signal || this.signal, this.referrer = null, (this.method === 'GET' || this.method === 'HEAD') && r) 
throw new TypeError('Body not allowed for GET or HEAD requests');
    if (this._initBody(r), !(this.method !== 'GET' && this.method !== 'HEAD' || e.cache !== 'no-store' && e.cache !== 'no-cache')) {
      let a = /([?&])_=[^&]*/
      a.test(this.url) ? this.url = this.url.replace(a, '$1_=' + (/* @__PURE__ */ new Date()).getTime()) : this.url += `${/\?/.test(this.url) ? "&" : "?"  }_=${  (/* @__PURE__ */ new Date()).getTime()}`;
    }
  }
  function dr(s) {
    let e = new FormData()
    return s.trim().split('&').forEach((t) => {
      if (t) {
        let i = t.split('='); var r = i.shift().replace(/\+/g, " "); var a = i.join('=').replace(/\+/g, ' ');
        e.append(decodeURIComponent(r), decodeURIComponent(a))
      }
    }), e
  }
  function le(s, e) {
    if (!(this instanceof le)) 
throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    e || (e = {}), this.type = 'default', this.status = e.status === void 0 ? 200 : e.status, this.ok = this.status >= 200 && this.status < 300, this.statusText = e.statusText === void 0 ? '' : '' + e.statusText, this.headers = new N(e.headers), this.url = e.url || '', this._initBody(s)
  }
  be.prototype.clone = function () {
    return new be(this, { body: this._bodyInit })
  }, vi.call(be.prototype), vi.call(le.prototype), le.prototype.clone = function () {
    return new le(this._bodyInit, { status: this.status, statusText: this.statusText, headers: new N(this.headers), url: this.url })
  }, le.error = function () {
    let s = new le(null, { status: 0, statusText: '' })
    return s.type = 'error', s
  };
  let cr = [301, 302, 303, 307, 308]
  le.redirect = function (s, e) {
    if (!cr.includes(e)) 
throw new RangeError('Invalid status code');
    return new le(null, { status: e, headers: { location: s } })
  };
  let De = j.DOMException
  try {
    new De()
  } catch {
    (De = function (e, t) {
      this.message = e, this.name = t
      var i = new Error(e)
      this.stack = i.stack
    }).prototype = Object.create(Error.prototype), De.prototype.constructor = De
  }
  function bi(s, e) {
    return new Promise((t, i) => {
      let r = new be(s, e)
      if (r.signal && r.signal.aborted) 
return i(new De('Aborted', 'AbortError'))
      var a = new XMLHttpRequest()
      function o() {
        a.abort()
      }
      a.onload = function () {
        let n; var l; var h = { status: a.status, statusText: a.statusText, headers: (n = a.getAllResponseHeaders() || '', l = new N(), n.replace(/\r?\n[\t ]+/g, ' ').split('\r').map((_) => {
          return _.indexOf(`
`) === 0
? _.substr(1, _.length)
: _
        }).forEach((_) => {
          let g = _.split(':'); var d = g.shift().trim()
          if (d) {
            let c = g.join(':').trim()
            l.append(d, c)
          }
        }), l) }
        h.url = 'responseURL' in a ? a.responseURL : h.headers.get('X-Request-URL');
        let u = 'response' in a ? a.response : a.responseText
        setTimeout(() => {
          t(new le(u, h))
        }, 0)
      }, a.onerror = function () {
        setTimeout(() => {
          i(new TypeError('Network request failed'))
        }, 0)
      }, a.ontimeout = function () {
        setTimeout(() => {
          i(new TypeError('Network request failed'))
        }, 0)
      }, a.onabort = function () {
        setTimeout(() => {
          i(new De('Aborted', 'AbortError'))
        }, 0)
      }, a.open(r.method, (function(n) {
        try {
          return n === "" && j.location.href ? j.location.href : n;
        } catch {
          return n;
        }
      }(r.url)), !0), r.credentials === 'include' ? a.withCredentials = !0 : r.credentials === 'omit' && (a.withCredentials = !1), 'responseType' in a && (ft ? a.responseType = 'blob' : yt && r.headers.get('Content-Type') && r.headers.get("Content-Type").includes("application/octet-stream") && (a.responseType = 'arraybuffer')), !e || typeof e.headers != 'object' || e.headers instanceof N
? r.headers.forEach((n, l) => {
        a.setRequestHeader(l, n)
      })
: Object.getOwnPropertyNames(e.headers).forEach((n) => {
        a.setRequestHeader(n, At(e.headers[n]))
      }), r.signal && (r.signal.addEventListener('abort', o), a.onreadystatechange = function () {
        a.readyState === 4 && r.signal.removeEventListener('abort', o)
      }), a.send(r._bodyInit === void 0 ? null : r._bodyInit)
    });
  }
  bi.polyfill = !0, j.fetch || (j.fetch = bi, j.Headers = N, j.Request = be, j.Response = le)
  const C = Object.freeze({ HitAreaPrefix: 'HitArea', HitAreaHead: 'Head', HitAreaBody: 'Body', PartsIdCore: 'Parts01Core', PartsArmPrefix: 'Parts01Arm_', PartsArmLPrefix: 'Parts01ArmL_', PartsArmRPrefix: 'Parts01ArmR_', ParamAngleX: 'ParamAngleX', ParamAngleY: 'ParamAngleY', ParamAngleZ: 'ParamAngleZ', ParamEyeLOpen: 'ParamEyeLOpen', ParamEyeLSmile: 'ParamEyeLSmile', ParamEyeROpen: 'ParamEyeROpen', ParamEyeRSmile: 'ParamEyeRSmile', ParamEyeBallX: 'ParamEyeBallX', ParamEyeBallY: 'ParamEyeBallY', ParamEyeBallForm: 'ParamEyeBallForm', ParamBrowLY: 'ParamBrowLY', ParamBrowRY: 'ParamBrowRY', ParamBrowLX: 'ParamBrowLX', ParamBrowRX: 'ParamBrowRX', ParamBrowLAngle: 'ParamBrowLAngle', ParamBrowRAngle: 'ParamBrowRAngle', ParamBrowLForm: 'ParamBrowLForm', ParamBrowRForm: 'ParamBrowRForm', ParamMouthForm: 'ParamMouthForm', ParamMouthOpenY: 'ParamMouthOpenY', ParamCheek: 'ParamCheek', ParamBodyAngleX: 'ParamBodyAngleX', ParamBodyAngleY: 'ParamBodyAngleY', ParamBodyAngleZ: 'ParamBodyAngleZ', ParamBreath: 'ParamBreath', ParamArmLA: 'ParamArmLA', ParamArmRA: 'ParamArmRA', ParamArmLB: 'ParamArmLB', ParamArmRB: 'ParamArmRB', ParamHandL: 'ParamHandL', ParamHandR: 'ParamHandR', ParamHairFront: 'ParamHairFront', ParamHairSide: 'ParamHairSide', ParamHairBack: 'ParamHairBack', ParamHairFluffy: 'ParamHairFluffy', ParamShoulderY: 'ParamShoulderY', ParamBustX: 'ParamBustX', ParamBustY: 'ParamBustY', ParamBaseX: 'ParamBaseX', ParamBaseY: 'ParamBaseY', ParamNONE: 'NONE:' })
  var Mi, Pi;
  (function (s) {
    s.HitAreaBody = C.HitAreaBody, s.HitAreaHead = C.HitAreaHead, s.HitAreaPrefix = C.HitAreaPrefix, s.ParamAngleX = C.ParamAngleX, s.ParamAngleY = C.ParamAngleY, s.ParamAngleZ = C.ParamAngleZ, s.ParamArmLA = C.ParamArmLA, s.ParamArmLB = C.ParamArmLB, s.ParamArmRA = C.ParamArmRA, s.ParamArmRB = C.ParamArmRB, s.ParamBaseX = C.ParamBaseX, s.ParamBaseY = C.ParamBaseY, s.ParamBodyAngleX = C.ParamBodyAngleX, s.ParamBodyAngleY = C.ParamBodyAngleY, s.ParamBodyAngleZ = C.ParamBodyAngleZ, s.ParamBreath = C.ParamBreath, s.ParamBrowLAngle = C.ParamBrowLAngle, s.ParamBrowLForm = C.ParamBrowLForm, s.ParamBrowLX = C.ParamBrowLX, s.ParamBrowLY = C.ParamBrowLY, s.ParamBrowRAngle = C.ParamBrowRAngle, s.ParamBrowRForm = C.ParamBrowRForm, s.ParamBrowRX = C.ParamBrowRX, s.ParamBrowRY = C.ParamBrowRY, s.ParamBustX = C.ParamBustX, s.ParamBustY = C.ParamBustY, s.ParamCheek = C.ParamCheek, s.ParamEyeBallForm = C.ParamEyeBallForm, s.ParamEyeBallX = C.ParamEyeBallX, s.ParamEyeBallY = C.ParamEyeBallY, s.ParamEyeLOpen = C.ParamEyeLOpen, s.ParamEyeLSmile = C.ParamEyeLSmile, s.ParamEyeROpen = C.ParamEyeROpen, s.ParamEyeRSmile = C.ParamEyeRSmile, s.ParamHairBack = C.ParamHairBack, s.ParamHairFluffy = C.ParamHairFluffy, s.ParamHairFront = C.ParamHairFront, s.ParamHairSide = C.ParamHairSide, s.ParamHandL = C.ParamHandL, s.ParamHandR = C.ParamHandR, s.ParamMouthForm = C.ParamMouthForm, s.ParamMouthOpenY = C.ParamMouthOpenY, s.ParamNONE = C.ParamNONE, s.ParamShoulderY = C.ParamShoulderY, s.PartsArmLPrefix = C.PartsArmLPrefix, s.PartsArmPrefix = C.PartsArmPrefix, s.PartsArmRPrefix = C.PartsArmRPrefix, s.PartsIdCore = C.PartsIdCore
  })(Mi || (Mi = {}))
  class wi {
  }
  (function (s) {
    s.ICubismModelSetting = wi
  })(Pi || (Pi = {}))
  const xe = 'FileReferences', Ii = 'UserData', Se = 'Name', Ti = 'File', xt = 'Ids', Vi = 'Sound', Ei = 'FadeInTime', Ri = 'FadeOutTime', Ot = 'LipSync', Nt = 'EyeBlink';
  let w, Fi, Li, q, Ai;
  (function (s) {
    s[s.FrequestNode_Groups = 0] = 'FrequestNode_Groups', s[s.FrequestNode_Moc = 1] = 'FrequestNode_Moc', s[s.FrequestNode_Motions = 2] = 'FrequestNode_Motions', s[s.FrequestNode_Expressions = 3] = 'FrequestNode_Expressions', s[s.FrequestNode_Textures = 4] = 'FrequestNode_Textures', s[s.FrequestNode_Physics = 5] = 'FrequestNode_Physics', s[s.FrequestNode_Pose = 6] = 'FrequestNode_Pose', s[s.FrequestNode_HitAreas = 7] = 'FrequestNode_HitAreas';
  })(w || (w = {}))
  class Di extends wi {
    constructor(e, t) {
      super(), this._json = U.create(e, t), this._json && (this._jsonValue = new S(), this._jsonValue.pushBack(this._json.getRoot().getValueByString('Groups')), this._jsonValue.pushBack(this._json.getRoot().getValueByString(xe).getValueByString('Moc')), this._jsonValue.pushBack(this._json.getRoot().getValueByString(xe).getValueByString('Motions')), this._jsonValue.pushBack(this._json.getRoot().getValueByString(xe).getValueByString('Expressions')), this._jsonValue.pushBack(this._json.getRoot().getValueByString(xe).getValueByString('Textures')), this._jsonValue.pushBack(this._json.getRoot().getValueByString(xe).getValueByString('Physics')), this._jsonValue.pushBack(this._json.getRoot().getValueByString(xe).getValueByString('Pose')), this._jsonValue.pushBack(this._json.getRoot().getValueByString('HitAreas')))
    }
    release() {
      U.delete(this._json), this._jsonValue = null
    }
    GetJson() {
      return this._json
    }
    getModelFileName() {
      return this.isExistModelFile() ? this._jsonValue.at(w.FrequestNode_Moc).getRawString() : '';
    }

    getTextureCount() {
      return this.isExistTextureFiles() ? this._jsonValue.at(w.FrequestNode_Textures).getSize() : 0
    }
    getTextureDirectory() {
      const e = this._jsonValue.at(w.FrequestNode_Textures).getValueByIndex(0).getRawString().split('/'); const t = e.length - 1
      let i = '';
      for (let r = 0; r < t; r++) i += e[r], r < t - 1 && (i += '/');
      return i
    }
    getTextureFileName(e) {
      return this._jsonValue.at(w.FrequestNode_Textures).getValueByIndex(e).getRawString()
    }
    getHitAreasCount() {
      return this.isExistHitAreas() ? this._jsonValue.at(w.FrequestNode_HitAreas).getSize() : 0
    }
    getHitAreaId(e) {
      return V.getIdManager().getId(this._jsonValue.at(w.FrequestNode_HitAreas).getValueByIndex(e).getValueByString('Id').getRawString())
    }
    getHitAreaName(e) {
      return this._jsonValue.at(w.FrequestNode_HitAreas).getValueByIndex(e).getValueByString(Se).getRawString()
    }
    getPhysicsFileName() {
      return this.isExistPhysicsFile() ? this._jsonValue.at(w.FrequestNode_Physics).getRawString() : '';
    }

    getPoseFileName() {
      return this.isExistPoseFile() ? this._jsonValue.at(w.FrequestNode_Pose).getRawString() : '';
    }

    getExpressionCount() {
      return this.isExistExpressionFile() ? this._jsonValue.at(w.FrequestNode_Expressions).getSize() : 0
    }
    getExpressionName(e) {
      return this._jsonValue.at(w.FrequestNode_Expressions).getValueByIndex(e).getValueByString(Se).getRawString()
    }
    getExpressionFileName(e) {
      return this._jsonValue.at(w.FrequestNode_Expressions).getValueByIndex(e).getValueByString(Ti).getRawString()
    }
    getMotionGroupCount() {
      return this.isExistMotionGroups() ? this._jsonValue.at(w.FrequestNode_Motions).getKeys().getSize() : 0
    }
    getMotionGroupName(e) {
      return this.isExistMotionGroups() ? this._jsonValue.at(w.FrequestNode_Motions).getKeys().at(e) : null
    }
    getMotionCount(e) {
      return this.isExistMotionGroupName(e) ? this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getSize() : 0
    }
    getMotionFileName(e, t) {
      return this.isExistMotionGroupName(e) ? this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Ti).getRawString() : '';
    }

    getMotionSoundFileName(e, t) {
      return this.isExistMotionSoundFile(e, t) ? this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Vi).getRawString() : '';
    }

    getMotionFadeInTimeValue(e, t) {
      return this.isExistMotionFadeIn(e, t) ? this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Ei).toFloat() : -1
    }
    getMotionFadeOutTimeValue(e, t) {
      return this.isExistMotionFadeOut(e, t) ? this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Ri).toFloat() : -1
    }
    getUserDataFile() {
      return this.isExistUserDataFile() ? this._json.getRoot().getValueByString(xe).getValueByString(Ii).getRawString() : '';
    }

    getLayoutMap(e) {
      const t = this._json.getRoot().getValueByString('Layout').getMap()
      if (t == null) 
return !1
      let i = !1
      for (const r = t.begin(); r.notEqual(t.end()); r.preIncrement()) e.setValue(r.ptr().first, r.ptr().second.toFloat()), i = !0
      return i
    }
    getEyeBlinkParameterCount() {
      if (!this.isExistEyeBlinkParameters()) 
return 0
      let e = 0
      for (let t = 0; t < this._jsonValue.at(w.FrequestNode_Groups).getSize(); t++) {
        const i = this._jsonValue.at(w.FrequestNode_Groups).getValueByIndex(t)
        if (!i.isNull() && !i.isError() && i.getValueByString(Se).getRawString() == Nt) {
          e = i.getValueByString(xt).getVector().getSize()
          break;
        }
      }
      return e
    }
    getEyeBlinkParameterId(e) {
      if (!this.isExistEyeBlinkParameters()) 
return null
      for (let t = 0; t < this._jsonValue.at(w.FrequestNode_Groups).getSize(); t++) {
        const i = this._jsonValue.at(w.FrequestNode_Groups).getValueByIndex(t)
        if (!i.isNull() && !i.isError() && i.getValueByString(Se).getRawString() == Nt) 
return V.getIdManager().getId(i.getValueByString(xt).getValueByIndex(e).getRawString())
      }
      return null
    }
    getLipSyncParameterCount() {
      if (!this.isExistLipSyncParameters()) 
return 0
      let e = 0
      for (let t = 0; t < this._jsonValue.at(w.FrequestNode_Groups).getSize(); t++) {
        const i = this._jsonValue.at(w.FrequestNode_Groups).getValueByIndex(t)
        if (!i.isNull() && !i.isError() && i.getValueByString(Se).getRawString() == Ot) {
          e = i.getValueByString(xt).getVector().getSize()
          break;
        }
      }
      return e
    }
    getLipSyncParameterId(e) {
      if (!this.isExistLipSyncParameters()) 
return null
      for (let t = 0; t < this._jsonValue.at(w.FrequestNode_Groups).getSize(); t++) {
        const i = this._jsonValue.at(w.FrequestNode_Groups).getValueByIndex(t)
        if (!i.isNull() && !i.isError() && i.getValueByString(Se).getRawString() == Ot) 
return V.getIdManager().getId(i.getValueByString(xt).getValueByIndex(e).getRawString())
      }
      return null
    }
    isExistModelFile() {
      const e = this._jsonValue.at(w.FrequestNode_Moc)
      return !e.isNull() && !e.isError()
    }
    isExistTextureFiles() {
      const e = this._jsonValue.at(w.FrequestNode_Textures)
      return !e.isNull() && !e.isError()
    }
    isExistHitAreas() {
      const e = this._jsonValue.at(w.FrequestNode_HitAreas)
      return !e.isNull() && !e.isError()
    }
    isExistPhysicsFile() {
      const e = this._jsonValue.at(w.FrequestNode_Physics)
      return !e.isNull() && !e.isError()
    }
    isExistPoseFile() {
      const e = this._jsonValue.at(w.FrequestNode_Pose)
      return !e.isNull() && !e.isError()
    }
    isExistExpressionFile() {
      const e = this._jsonValue.at(w.FrequestNode_Expressions)
      return !e.isNull() && !e.isError()
    }
    isExistMotionGroups() {
      const e = this._jsonValue.at(w.FrequestNode_Motions)
      return !e.isNull() && !e.isError()
    }
    isExistMotionGroupName(e) {
      const t = this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e)
      return !t.isNull() && !t.isError()
    }
    isExistMotionSoundFile(e, t) {
      const i = this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Vi)
      return !i.isNull() && !i.isError()
    }
    isExistMotionFadeIn(e, t) {
      const i = this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Ei)
      return !i.isNull() && !i.isError()
    }
    isExistMotionFadeOut(e, t) {
      const i = this._jsonValue.at(w.FrequestNode_Motions).getValueByString(e).getValueByIndex(t).getValueByString(Ri)
      return !i.isNull() && !i.isError()
    }
    isExistUserDataFile() {
      const e = this._json.getRoot().getValueByString(xe).getValueByString(Ii)
      return !e.isNull() && !e.isError()
    }
    isExistEyeBlinkParameters() {
      if (this._jsonValue.at(w.FrequestNode_Groups).isNull() || this._jsonValue.at(w.FrequestNode_Groups).isError()) 
return !1
      for (let e = 0; e < this._jsonValue.at(w.FrequestNode_Groups).getSize(); ++e) { if (this._jsonValue.at(w.FrequestNode_Groups).getValueByIndex(e).getValueByString(Se).getRawString() == Nt) return !0;
}
      return !1
    }
    isExistLipSyncParameters() {
      if (this._jsonValue.at(w.FrequestNode_Groups).isNull() || this._jsonValue.at(w.FrequestNode_Groups).isError()) 
return !1
      for (let e = 0; e < this._jsonValue.at(w.FrequestNode_Groups).getSize(); ++e) { if (this._jsonValue.at(w.FrequestNode_Groups).getValueByIndex(e).getValueByString(Se).getRawString() == Ot) return !0;
}
      return !1
    }
  }
  (function (s) {
    s.CubismModelSettingJson = Di
  })(Fi || (Fi = {}))
  class Ze {
    static create() {
      return new Ze()
    }
    static delete(e) {
    }

    setParameters(e) {
      this._breathParameters = e
    }
    getParameters() {
      return this._breathParameters
    }
    updateParameters(e, t) {
      this._currentTime += t
      const i = 2 * this._currentTime * 3.14159
      for (let r = 0; r < this._breathParameters.getSize(); ++r) {
        const a = this._breathParameters.at(r)
        e.addParameterValueById(a.parameterId, a.offset + a.peak * Math.sin(i / a.cycle), a.weight)
      }
    }

    constructor() {
      this._currentTime = 0
    }
  }
  class ke {
    constructor(e, t, i, r, a) {
      this.parameterId = e ?? null, this.offset = t ?? 0, this.peak = i ?? 0, this.cycle = r ?? 0, this.weight = a ?? 0
    }
  }
  (function (s) {
    s.BreathParameterData = ke, s.CubismBreath = Ze
  })(Li || (Li = {}))
  class Me {
    static create(e = null) {
      return new Me(e)
    }
    static delete(e) {
    }

    setBlinkingInterval(e) {
      this._blinkingIntervalSeconds = e
    }
    setBlinkingSetting(e, t, i) {
      this._closingSeconds = e, this._closedSeconds = t, this._openingSeconds = i
    }
    setParameterIds(e) {
      this._parameterIds = e
    }
    getParameterIds() {
      return this._parameterIds
    }
    updateParameters(e, t) {
      let i
      this._userTimeSeconds += t
      let r = 0
      switch (this._blinkingState) {
        case q.EyeState_Closing:
          r = (this._userTimeSeconds - this._stateStartTimeSeconds) / this._closingSeconds, r >= 1 && (r = 1, this._blinkingState = q.EyeState_Closed, this._stateStartTimeSeconds = this._userTimeSeconds), i = 1 - r
          break;
        case q.EyeState_Closed:
          r = (this._userTimeSeconds - this._stateStartTimeSeconds) / this._closedSeconds, r >= 1 && (this._blinkingState = q.EyeState_Opening, this._stateStartTimeSeconds = this._userTimeSeconds), i = 0
          break;
        case q.EyeState_Opening:
          r = (this._userTimeSeconds - this._stateStartTimeSeconds) / this._openingSeconds, r >= 1 && (r = 1, this._blinkingState = q.EyeState_Interval, this._nextBlinkingTime = this.determinNextBlinkingTiming()), i = r
          break;
        case q.EyeState_Interval:
          this._nextBlinkingTime < this._userTimeSeconds && (this._blinkingState = q.EyeState_Closing, this._stateStartTimeSeconds = this._userTimeSeconds), i = 1
          break;
        case q.EyeState_First:
        default:
          this._blinkingState = q.EyeState_Interval, this._nextBlinkingTime = this.determinNextBlinkingTiming(), i = 1
      }
      Me.CloseIfZero || (i = -i)
      for (let a = 0; a < this._parameterIds.getSize(); ++a) e.setParameterValueById(this._parameterIds.at(a), i)
    }
    constructor(e) {
      if (this._blinkingState = q.EyeState_First, this._nextBlinkingTime = 0, this._stateStartTimeSeconds = 0, this._blinkingIntervalSeconds = 4, this._closingSeconds = 0.1, this._closedSeconds = 0.05, this._openingSeconds = 0.15, this._userTimeSeconds = 0, this._parameterIds = new S(), e != null) { for (let t = 0; t < e.getEyeBlinkParameterCount(); ++t) this._parameterIds.pushBack(e.getEyeBlinkParameterId(t));
}
    }

    determinNextBlinkingTiming() {
      const e = Math.random()
      return this._userTimeSeconds + e * (2 * this._blinkingIntervalSeconds - 1)
    }
  }
  Me.CloseIfZero = !0, (function(s) {
    s[s.EyeState_First = 0] = "EyeState_First", s[s.EyeState_Interval = 1] = "EyeState_Interval", s[s.EyeState_Closing = 2] = "EyeState_Closing", s[s.EyeState_Closed = 3] = "EyeState_Closed", s[s.EyeState_Opening = 4] = "EyeState_Opening";
  }(q || (q = {}))), (function(s) {
    s.CubismEyeBlink = Me, s.EyeState = q;
  }(Ai || (Ai = {})));
  const ki = 'FadeInTime', Oi = 'Link';
  class Ke {
    static create(e, t) {
      const i = new Ke(); const r = U.create(e, t); const a = r.getRoot()
      a.getValueByString(ki).isNull() || (i._fadeTimeSeconds = a.getValueByString(ki).toFloat(0.5), i._fadeTimeSeconds <= 0 && (i._fadeTimeSeconds = 0.5))
      const o = a.getValueByString('Groups'); const n = o.getSize()
      for (let l = 0; l < n; ++l) {
        const h = o.getValueByIndex(l); const u = h.getSize()
        let _ = 0
        for (let g = 0; g < u; ++g) {
          const d = h.getValueByIndex(g); const c = new Qe(); const m = V.getIdManager().getId(d.getValueByString('Id').getRawString())
          if (c.partId = m, !d.getValueByString(Oi).isNull()) {
            const p = d.getValueByString(Oi); const v = p.getSize()
            for (let x = 0; x < v; ++x) {
              const M = new Qe(); const f = V.getIdManager().getId(p.getValueByIndex(x).getString())
              M.partId = f, c.link.pushBack(M)
            }
          }
          i._partGroups.pushBack(c.clone()), ++_
        }
        i._partGroupCounts.pushBack(_)
      }
      return U.delete(r), i
    }
    static delete(e) {
    }

    updateParameters(e, t) {
      e != this._lastModel && this.reset(e), this._lastModel = e, t < 0 && (t = 0)
      let i = 0
      for (let r = 0; r < this._partGroupCounts.getSize(); r++) {
        const a = this._partGroupCounts.at(r)
        this.doFade(e, t, i, a), i += a
      }
      this.copyPartOpacities(e)
    }
    reset(e) {
      let t = 0
      for (let i = 0; i < this._partGroupCounts.getSize(); ++i) {
        const r = this._partGroupCounts.at(i)
        for (let a = t; a < t + r; ++a) {
          this._partGroups.at(a).initialize(e)
          const o = this._partGroups.at(a).partIndex; const n = this._partGroups.at(a).parameterIndex
          if (!(o < 0)) {
            e.setPartOpacityByIndex(o, a == t ? 1 : 0), e.setParameterValueByIndex(n, a == t ? 1 : 0)
            for (let l = 0; l < this._partGroups.at(a).link.getSize(); ++l) this._partGroups.at(a).link.at(l).initialize(e)
          }
        }
        t += r
      }
    }

    copyPartOpacities(e) {
      for (let t = 0; t < this._partGroups.getSize(); ++t) {
        const i = this._partGroups.at(t)
        if (i.link.getSize() == 0) 
continue;
        const r = this._partGroups.at(t).partIndex; const a = e.getPartOpacityByIndex(r)
        for (let o = 0; o < i.link.getSize(); ++o) {
          const n = i.link.at(o).partIndex
          n < 0 || e.setPartOpacityByIndex(n, a)
        }
      }
    }

    doFade(e, t, i, r) {
      let a = -1; let o = 1
      for (let n = i; n < i + r; ++n) {
        const l = this._partGroups.at(n).partIndex; const h = this._partGroups.at(n).parameterIndex
        if (e.getParameterValueByIndex(h) > 1e-3) {
          if (a >= 0) 
break;
          a = n, o = e.getPartOpacityByIndex(l), o += t / this._fadeTimeSeconds, o > 1 && (o = 1)
        }
      }
      a < 0 && (a = 0, o = 1)
      for (let n = i; n < i + r; ++n) {
        const l = this._partGroups.at(n).partIndex
        if (a == n) { e.setPartOpacityByIndex(l, o);
}
        else {
          let h; let u = e.getPartOpacityByIndex(l)
          h = o < 0.5 ? -0.5 * o / 0.5 + 1 : 0.5 * (1 - o) / 0.5, (1 - h) * (1 - o) > 0.15 && (h = 1 - 0.15 / (1 - o)), u > h && (u = h), e.setPartOpacityByIndex(l, u)
        }
      }
    }

    constructor() {
      this._fadeTimeSeconds = 0.5, this._lastModel = null, this._partGroups = new S(), this._partGroupCounts = new S()
    }
  }
  class Qe {
    constructor(e) {
      if (this.parameterIndex = 0, this.partIndex = 0, this.link = new S(), e != null) {
        this.partId = e.partId
        for (const t = e.link.begin(); t.notEqual(e.link.end()); t.preIncrement()) this.link.pushBack(t.ptr().clone())
      }
    }

    assignment(e) {
      this.partId = e.partId
      for (const t = e.link.begin(); t.notEqual(e.link.end()); t.preIncrement()) this.link.pushBack(t.ptr().clone())
      return this
    }
    initialize(e) {
      this.parameterIndex = e.getParameterIndex(this.partId), this.partIndex = e.getPartIndex(this.partId), e.setParameterValueByIndex(this.parameterIndex, 1)
    }
    clone() {
      const e = new Qe()
      e.partId = this.partId, e.parameterIndex = this.parameterIndex, e.partIndex = this.partIndex, e.link = new S()
      for (let t = this.link.begin(); t.notEqual(this.link.end()); t.increment()) e.link.pushBack(t.ptr().clone())
      return e
    }
  }
  let Ni, Ui, zi, ji, Xi, Gi;
  (function (s) {
    s.CubismPose = Ke, s.PartData = Qe
  })(Ni || (Ni = {}))
  class Yi extends O {
    constructor(e, t) {
      super(), this._width = e !== void 0 ? e : 0, this._height = t !== void 0 ? t : 0, this.setHeight(2)
    }
    setWidth(e) {
      const t = e / this._width; const i = t
      this.scale(t, i)
    }
    setHeight(e) {
      const t = e / this._height; const i = t
      this.scale(t, i)
    }
    setPosition(e, t) {
      this.translate(e, t)
    }
    setCenterPosition(e, t) {
      this.centerX(e), this.centerY(t)
    }
    top(e) {
      this.setY(e)
    }
    bottom(e) {
      const t = this._height * this.getScaleY()
      this.translateY(e - t)
    }
    left(e) {
      this.setX(e)
    }
    right(e) {
      const t = this._width * this.getScaleX()
      this.translateX(e - t)
    }
    centerX(e) {
      const t = this._width * this.getScaleX()
      this.translateX(e - t / 2)
    }
    setX(e) {
      this.translateX(e)
    }
    centerY(e) {
      const t = this._height * this.getScaleY()
      this.translateY(e - t / 2)
    }
    setY(e) {
      this.translateY(e)
    }
    setupFromLayout(e) {
      for (const t = e.begin(); t.notEqual(e.end()); t.preIncrement()) {
        const i = t.ptr().first; const r = t.ptr().second
        i == 'width' ? this.setWidth(r) : i == 'height' && this.setHeight(r)
      }
      for (const t = e.begin(); t.notEqual(e.end()); t.preIncrement()) {
        const i = t.ptr().first; const r = t.ptr().second
        i == 'x' ? this.setX(r) : i == 'y' ? this.setY(r) : i == 'center_x' ? this.centerX(r) : i == 'center_y' ? this.centerY(r) : i == 'top' ? this.top(r) : i == 'bottom' ? this.bottom(r) : i == 'left' ? this.left(r) : i == 'right' && this.right(r)
      }
    }
  }
  (function (s) {
    s.CubismModelMatrix = Yi
  })(Ui || (Ui = {}))
  class B {
    constructor(e, t) {
      this.x = e, this.y = t, this.x = e ?? 0, this.y = t ?? 0
    }
    add(e) {
      const t = new B(0, 0)
      return t.x = this.x + e.x, t.y = this.y + e.y, t
    }
    substract(e) {
      const t = new B(0, 0)
      return t.x = this.x - e.x, t.y = this.y - e.y, t
    }
    multiply(e) {
      const t = new B(0, 0)
      return t.x = this.x * e.x, t.y = this.y * e.y, t
    }
    multiplyByScaler(e) {
      return this.multiply(new B(e, e))
    }
    division(e) {
      const t = new B(0, 0)
      return t.x = this.x / e.x, t.y = this.y / e.y, t
    }
    divisionByScalar(e) {
      return this.division(new B(e, e))
    }
    getLength() {
      return Math.sqrt(this.x * this.x + this.y * this.y)
    }
    getDistanceWith(e) {
      return Math.sqrt((this.x - e.x) * (this.x - e.x) + (this.y - e.y) * (this.y - e.y))
    }
    dot(e) {
      return this.x * e.x + this.y * e.y
    }
    normalize() {
      const e = (this.x * this.x + this.y * this.y)**0.5;
      this.x = this.x / e, this.y = this.y / e
    }
    isEqual(e) {
      return this.x == e.x && this.y == e.y
    }
    isNotEqual(e) {
      return !this.isEqual(e)
    }
  }
  (function (s) {
    s.CubismVector2 = B
  })(zi || (zi = {}))
  class P {
    static range(e, t, i) {
      return e < t ? e = t : e > i && (e = i), e
    }
    static sin(e) {
      return Math.sin(e)
    }
    static cos(e) {
      return Math.cos(e)
    }
    static abs(e) {
      return Math.abs(e)
    }
    static sqrt(e) {
      return Math.sqrt(e)
    }
    static cbrt(e) {
      if (e === 0) 
return e
      let t = e
      const i = t < 0
      let r
      return i && (t = -t), t === 1 / 0 ? r = 1 / 0 : (r = Math.exp(Math.log(t) / 3), r = (t / (r * r) + 2 * r) / 3), i ? -r : r
    }
    static getEasingSine(e) {
      return e < 0 ? 0 : e > 1 ? 1 : 0.5 - 0.5 * this.cos(e * Math.PI)
    }
    static max(e, t) {
      return e > t ? e : t
    }
    static min(e, t) {
      return e > t ? t : e
    }
    static degreesToRadian(e) {
      return e / 180 * Math.PI
    }
    static radianToDegrees(e) {
      return 180 * e / Math.PI
    }
    static directionToRadian(e, t) {
      let i = Math.atan2(t.y, t.x) - Math.atan2(e.y, e.x)
      for (; i < -Math.PI;) i += 2 * Math.PI
      for (; i > Math.PI;) i -= 2 * Math.PI
      return i
    }
    static directionToDegrees(e, t) {
      const i = this.directionToRadian(e, t)
      let r = this.radianToDegrees(i)
      return t.x - e.x > 0 && (r = -r), r
    }
    static radianToDirection(e) {
      const t = new B()
      return t.x = this.sin(e), t.y = this.cos(e), t
    }
    static quadraticEquation(e, t, i) {
      return this.abs(e) < P.Epsilon ? this.abs(t) < P.Epsilon ? -i : -i / t : -(t + this.sqrt(t * t - 4 * e * i)) / (2 * e)
    }
    static cardanoAlgorithmForBezier(e, t, i, r) {
      if (this.sqrt(e) < P.Epsilon) 
return this.range(this.quadraticEquation(t, i, r), 0, 1)
      const a = t / e; const o = i / e; const n = (3 * o - a * a) / 3; const l = n / 3; const h = (2 * a * a * a - 9 * a * o + r / e * 27) / 27; const u = h / 2; const _ = u * u + l * l * l; const g = 0.51
      if (_ < 0) {
        const m = -n / 3; const p = m * m * m; const v = this.sqrt(p); const x = -h / (2 * v); const M = this.range(x, -1, 1); const f = Math.acos(M); const A = 2 * this.cbrt(v); const T = A * this.cos(f / 3) - a / 3
        if (this.abs(T - 0.5) < g) 
return this.range(T, 0, 1)
        const E = A * this.cos((f + 2 * Math.PI) / 3) - a / 3
        if (this.abs(E - 0.5) < g) 
return this.range(E, 0, 1)
        const I = A * this.cos((f + 4 * Math.PI) / 3) - a / 3
        return this.range(I, 0, 1)
      }
      if (_ == 0) {
        let m
        m = u < 0 ? this.cbrt(-u) : -this.cbrt(u)
        const p = 2 * m - a / 3
        if (this.abs(p - 0.5) < g) 
return this.range(p, 0, 1)
        const v = -m - a / 3
        return this.range(v, 0, 1)
      }
      const d = this.sqrt(_); const c = this.cbrt(d - u) - this.cbrt(d + u) - a / 3
      return this.range(c, 0, 1)
    }
    constructor() {
    }
  }
  P.Epsilon = 1e-5, (function(s) {
    s.CubismMath = P;
  }(ji || (ji = {})));
  class Hi {
    constructor() {
      this._faceTargetX = 0, this._faceTargetY = 0, this._faceX = 0, this._faceY = 0, this._faceVX = 0, this._faceVY = 0, this._lastTimeSeconds = 0, this._userTimeSeconds = 0
    }
    update(e) {
      this._userTimeSeconds += e
      const t = 4 / 30
      if (this._lastTimeSeconds == 0) 
return void (this._lastTimeSeconds = this._userTimeSeconds)
      const i = 30 * (this._userTimeSeconds - this._lastTimeSeconds)
      this._lastTimeSeconds = this._userTimeSeconds
      const r = i * t / 4.5; const a = this._faceTargetX - this._faceX; const o = this._faceTargetY - this._faceY
      if (P.abs(a) <= 0.01 && P.abs(o) <= 0.01) 
return;
      const n = P.sqrt(a * a + o * o); const l = t * o / n
      let h = t * a / n - this._faceVX; let u = l - this._faceVY
      const _ = P.sqrt(h * h + u * u);
      (_ < -r || _ > r) && (h *= r / _, u *= r / _), this._faceVX += h, this._faceVY += u
      {
        const g = 0.5 * (P.sqrt(r * r + 16 * r * n - 8 * r * n) - r); const d = P.sqrt(this._faceVX * this._faceVX + this._faceVY * this._faceVY)
        d > g && (this._faceVX *= g / d, this._faceVY *= g / d)
      }
      this._faceX += this._faceVX, this._faceY += this._faceVY
    }
    getX() {
      return this._faceX
    }
    getY() {
      return this._faceY
    }
    set(e, t) {
      this._faceTargetX = e, this._faceTargetY = t
    }
  }
  (function (s) {
    s.CubismTargetPoint = Hi
  })(Xi || (Xi = {}))
  class Oe {
    static delete(e) {
      e.release(), e = null
    }
    constructor() {
      this.setFinishedMotionHandler = e => this._onFinishedMotion = e, this.getFinishedMotionHandler = () => this._onFinishedMotion, this._fadeInSeconds = -1, this._fadeOutSeconds = -1, this._weight = 1, this._offsetSeconds = 0, this._firedEventValues = new S()
    }
    release() {
      this._weight = 0
    }
    updateParameters(e, t, i) {
      if (!t.isAvailable() || t.isFinished()) 
return;
      if (!t.isStarted()) {
        t.setIsStarted(!0), t.setStartTime(i - this._offsetSeconds), t.setFadeInStartTime(i)
        const a = this.getDuration()
        t.getEndTime() < 0 && t.setEndTime(a <= 0 ? -1 : t.getStartTime() + a)
      }
      let r = this._weight
      r = r * (this._fadeInSeconds == 0 ? 1 : P.getEasingSine((i - t.getFadeInStartTime()) / this._fadeInSeconds)) * (this._fadeOutSeconds == 0 || t.getEndTime() < 0 ? 1 : P.getEasingSine((t.getEndTime() - i) / this._fadeOutSeconds)), t.setState(i, r), re(r >= 0 && r <= 1), this.doUpdateParameters(e, i, r, t), t.getEndTime() > 0 && t.getEndTime() < i && t.setIsFinished(!0)
    }
    setFadeInTime(e) {
      this._fadeInSeconds = e
    }
    setFadeOutTime(e) {
      this._fadeOutSeconds = e
    }
    getFadeOutTime() {
      return this._fadeOutSeconds
    }
    getFadeInTime() {
      return this._fadeInSeconds
    }
    setWeight(e) {
      this._weight = e
    }
    getWeight() {
      return this._weight
    }
    getDuration() {
      return -1
    }
    getLoopDuration() {
      return -1
    }
    setOffsetTime(e) {
      this._offsetSeconds = e
    }
    getFiredEvent(e, t) {
      return this._firedEventValues
    }
    isExistModelOpacity() {
      return !1
    }
    getModelOpacityIndex() {
      return -1
    }
    getModelOpacityId(e) {
      return null
    }
    getModelOpacityValue() {
      return 1
    }
  }
  (function (s) {
    s.ACubismMotion = Oe
  })(Gi || (Gi = {}))
  const qi = 'Parameters', St = 'Blend';
  class Ct extends Oe {
    static create(e, t) {
      const i = new Ct()
      return i.parse(e, t), i
    }
    doUpdateParameters(e, t, i, r) {
      for (let a = 0; a < this._parameters.getSize(); ++a) {
        const o = this._parameters.at(a)
        switch (o.blendType) {
          case ue.ExpressionBlendType_Add:
            e.addParameterValueById(o.parameterId, o.value, i)
            break;
          case ue.ExpressionBlendType_Multiply:
            e.multiplyParameterValueById(o.parameterId, o.value, i)
            break;
          case ue.ExpressionBlendType_Overwrite:
            e.setParameterValueById(o.parameterId, o.value, i)
        }
      }
    }

    parse(e, t) {
      const i = U.create(e, t); const r = i.getRoot()
      this.setFadeInTime(r.getValueByString('FadeInTime').toFloat(1)), this.setFadeOutTime(r.getValueByString('FadeOutTime').toFloat(1))
      const a = r.getValueByString(qi).getSize()
      this._parameters.prepareCapacity(a)
      for (let o = 0; o < a; ++o) {
        const n = r.getValueByString(qi).getValueByIndex(o); const l = V.getIdManager().getId(n.getValueByString("Id").getRawString()); const h = n.getValueByString('Value').toFloat()
        let u
        u = n.getValueByString(St).isNull() || n.getValueByString(St).getString() == 'Add' ? ue.ExpressionBlendType_Add : n.getValueByString(St).getString() == 'Multiply' ? ue.ExpressionBlendType_Multiply : n.getValueByString(St).getString() == 'Overwrite' ? ue.ExpressionBlendType_Overwrite : ue.ExpressionBlendType_Add
        const _ = new Ji()
        _.parameterId = l, _.blendType = u, _.value = h, this._parameters.pushBack(_)
      }
      U.delete(i)
    }
    constructor() {
      super(), this._parameters = new S()
    }
  }
  let ue, Wi, W, K, $i;
  (function (s) {
    s[s.ExpressionBlendType_Add = 0] = 'ExpressionBlendType_Add', s[s.ExpressionBlendType_Multiply = 1] = 'ExpressionBlendType_Multiply', s[s.ExpressionBlendType_Overwrite = 2] = 'ExpressionBlendType_Overwrite';
  })(ue || (ue = {}))
  class Ji {
  }
  (function (s) {
    s.CubismExpressionMotion = Ct, s.ExpressionBlendType = ue, s.ExpressionParameter = Ji
  })(Wi || (Wi = {})), (function(s) {
    s[s.CubismMotionCurveTarget_Model = 0] = "CubismMotionCurveTarget_Model", s[s.CubismMotionCurveTarget_Parameter = 1] = "CubismMotionCurveTarget_Parameter", s[s.CubismMotionCurveTarget_PartOpacity = 2] = "CubismMotionCurveTarget_PartOpacity";
  }(W || (W = {}))), (function(s) {
    s[s.CubismMotionSegmentType_Linear = 0] = "CubismMotionSegmentType_Linear", s[s.CubismMotionSegmentType_Bezier = 1] = "CubismMotionSegmentType_Bezier", s[s.CubismMotionSegmentType_Stepped = 2] = "CubismMotionSegmentType_Stepped", s[s.CubismMotionSegmentType_InverseStepped = 3] = "CubismMotionSegmentType_InverseStepped";
  }(K || (K = {})));
  class Ut {
    constructor() {
      this.time = 0, this.value = 0
    }
  }
  class Zi {
    constructor() {
      this.evaluate = null, this.basePointIndex = 0, this.segmentType = 0
    }
  }
  class Ki {
    constructor() {
      this.type = W.CubismMotionCurveTarget_Model, this.segmentCount = 0, this.baseSegmentIndex = 0, this.fadeInTime = 0, this.fadeOutTime = 0
    }
  }
  class Qi {
    constructor() {
      this.fireTime = 0
    }
  }
  class es {
    constructor() {
      this.duration = 0, this.loop = !1, this.curveCount = 0, this.eventCount = 0, this.fps = 0, this.curves = new S(), this.segments = new S(), this.points = new S(), this.events = new S()
    }
  }
  (function (s) {
    s.CubismMotionCurve = Ki, s.CubismMotionCurveTarget = W, s.CubismMotionData = es, s.CubismMotionEvent = Qi, s.CubismMotionPoint = Ut, s.CubismMotionSegment = Zi, s.CubismMotionSegmentType = K
  })($i || ($i = {}))
  const $ = 'Meta', Ce = 'Curves', Bt = 'FadeInTime', vt = 'FadeOutTime', ts = 'Segments', is = 'UserData';
  class ss {
    constructor(e, t) {
      this._json = U.create(e, t)
    }
    release() {
      U.delete(this._json)
    }
    getMotionDuration() {
      return this._json.getRoot().getValueByString($).getValueByString('Duration').toFloat()
    }
    isMotionLoop() {
      return this._json.getRoot().getValueByString($).getValueByString('Loop').toBoolean()
    }
    getEvaluationOptionFlag(e) {
      return bt.EvaluationOptionFlag_AreBeziersRistricted == e && this._json.getRoot().getValueByString($).getValueByString('AreBeziersRestricted').toBoolean()
    }
    getMotionCurveCount() {
      return this._json.getRoot().getValueByString($).getValueByString('CurveCount').toInt()
    }
    getMotionFps() {
      return this._json.getRoot().getValueByString($).getValueByString('Fps').toFloat()
    }
    getMotionTotalSegmentCount() {
      return this._json.getRoot().getValueByString($).getValueByString('TotalSegmentCount').toInt()
    }
    getMotionTotalPointCount() {
      return this._json.getRoot().getValueByString($).getValueByString('TotalPointCount').toInt()
    }
    isExistMotionFadeInTime() {
      return !this._json.getRoot().getValueByString($).getValueByString(Bt).isNull()
    }
    isExistMotionFadeOutTime() {
      return !this._json.getRoot().getValueByString($).getValueByString(vt).isNull()
    }
    getMotionFadeInTime() {
      return this._json.getRoot().getValueByString($).getValueByString(Bt).toFloat()
    }
    getMotionFadeOutTime() {
      return this._json.getRoot().getValueByString($).getValueByString(vt).toFloat()
    }
    getMotionCurveTarget(e) {
      return this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString('Target').getRawString()
    }
    getMotionCurveId(e) {
      return V.getIdManager().getId(this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString('Id').getRawString())
    }
    isExistMotionCurveFadeInTime(e) {
      return !this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString(Bt).isNull()
    }
    isExistMotionCurveFadeOutTime(e) {
      return !this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString(vt).isNull()
    }
    getMotionCurveFadeInTime(e) {
      return this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString(Bt).toFloat()
    }
    getMotionCurveFadeOutTime(e) {
      return this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString(vt).toFloat()
    }
    getMotionCurveSegmentCount(e) {
      return this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString(ts).getVector().getSize()
    }
    getMotionCurveSegment(e, t) {
      return this._json.getRoot().getValueByString(Ce).getValueByIndex(e).getValueByString(ts).getValueByIndex(t).toFloat()
    }
    getEventCount() {
      return this._json.getRoot().getValueByString($).getValueByString('UserDataCount').toInt()
    }
    getTotalEventValueSize() {
      return this._json.getRoot().getValueByString($).getValueByString('TotalUserDataSize').toInt()
    }
    getEventTime(e) {
      return this._json.getRoot().getValueByString(is).getValueByIndex(e).getValueByString('Time').toFloat()
    }
    getEventValue(e) {
      return new Z(this._json.getRoot().getValueByString(is).getValueByIndex(e).getValueByString('Value').getRawString())
    }
  }
  let bt, rs;
  (function (s) {
    s[s.EvaluationOptionFlag_AreBeziersRistricted = 0] = 'EvaluationOptionFlag_AreBeziersRistricted';
  })(bt || (bt = {})), (function(s) {
    s.CubismMotionJson = ss;
  }(rs || (rs = {})));
  const Mt = 'Opacity';
  function Q(s, e, t) {
    const i = new Ut()
    return i.time = s.time + (e.time - s.time) * t, i.value = s.value + (e.value - s.value) * t, i
  }
  function _r(s, e) {
    let t = (e - s[0].time) / (s[1].time - s[0].time)
    return t < 0 && (t = 0), s[0].value + (s[1].value - s[0].value) * t
  }
  function mr(s, e) {
    let t = (e - s[0].time) / (s[3].time - s[0].time)
    t < 0 && (t = 0)
    const i = Q(s[0], s[1], t); const r = Q(s[1], s[2], t); const a = Q(s[2], s[3], t); const o = Q(i, r, t); const n = Q(r, a, t)
    return Q(o, n, t).value
  }
  function pr(s, e) {
    const t = e; const i = s[0].time; const r = s[3].time; const a = s[1].time; const o = s[2].time; const n = r - 3 * o + 3 * a - i; const l = 3 * o - 6 * a + 3 * i; const h = 3 * a - 3 * i; const u = i - t; const _ = P.cardanoAlgorithmForBezier(n, l, h, u); const g = Q(s[0], s[1], _); const d = Q(s[1], s[2], _); const c = Q(s[2], s[3], _); const m = Q(g, d, _); const p = Q(d, c, _)
    return Q(m, p, _).value
  }
  function fr(s, e) {
    return s[0].value
  }
  function yr(s, e) {
    return s[1].value
  }
  function zt(s, e, t) {
    const i = s.curves.at(e)
    let r = -1
    const a = i.baseSegmentIndex + i.segmentCount
    let o = 0
    for (let l = i.baseSegmentIndex; l < a; ++l) { if (o = s.segments.at(l).basePointIndex + (s.segments.at(l).segmentType == K.CubismMotionSegmentType_Bezier ? 3 : 1), s.points.at(o).time > t) {
      r = l;
      break;
    }
}
    if (r == -1) 
return s.points.at(o).value
    const n = s.segments.at(r)
    return n.evaluate(s.points.get(n.basePointIndex), t)
  }
  class Pt extends Oe {
    static create(e, t, i) {
      const r = new Pt()
      return r.parse(e, t), r._sourceFrameRate = r._motionData.fps, r._loopDurationSeconds = r._motionData.duration, r._onFinishedMotion = i, r
    }
    doUpdateParameters(e, t, i, r) {
      this._modelCurveIdEyeBlink == null && (this._modelCurveIdEyeBlink = V.getIdManager().getId('EyeBlink')), this._modelCurveIdLipSync == null && (this._modelCurveIdLipSync = V.getIdManager().getId('LipSync')), this._modelCurveIdOpacity == null && (this._modelCurveIdOpacity = V.getIdManager().getId(Mt))
      let a = t - r.getStartTime()
      a < 0 && (a = 0)
      let o = Number.MAX_VALUE; let n = Number.MAX_VALUE
      const l = 64
      let h = 0; let u = 0
      this._eyeBlinkParameterIds.getSize() > l && qe('too many eye blink targets : {0}', this._eyeBlinkParameterIds.getSize()), this._lipSyncParameterIds.getSize() > l && qe('too many lip sync targets : {0}', this._lipSyncParameterIds.getSize())
      const _ = this._fadeInSeconds <= 0 ? 1 : P.getEasingSine((t - r.getFadeInStartTime()) / this._fadeInSeconds); const g = this._fadeOutSeconds <= 0 || r.getEndTime() < 0 ? 1 : P.getEasingSine((r.getEndTime() - t) / this._fadeOutSeconds)
      let d; let c; let m; let p = a
      if (this._isLoop) { for (; p > this._motionData.duration; ) p -= this._motionData.duration;
}
      const v = this._motionData.curves
      for (c = 0; c < this._motionData.curveCount && v.at(c).type == W.CubismMotionCurveTarget_Model; ++c) d = zt(this._motionData, c, p), v.at(c).id == this._modelCurveIdEyeBlink ? n = d : v.at(c).id == this._modelCurveIdLipSync ? o = d : v.at(c).id == this._modelCurveIdOpacity && (this._modelOpacity = d, e.setModelOapcity(this.getModelOpacityValue()))
      for (; c < this._motionData.curveCount && v.at(c).type == W.CubismMotionCurveTarget_Parameter; ++c) {
        if (m = e.getParameterIndex(v.at(c).id), m == -1) 
continue;
        const x = e.getParameterValueByIndex(m)
        if (d = zt(this._motionData, c, p), n != Number.MAX_VALUE) {
          for (let f = 0; f < this._eyeBlinkParameterIds.getSize() && f < l; ++f) { if (this._eyeBlinkParameterIds.at(f) == v.at(c).id) {
            d *= n, u |= 1 << f;
            break;
          }
}
        }
        if (o != Number.MAX_VALUE) {
          for (let f = 0; f < this._lipSyncParameterIds.getSize() && f < l; ++f) { if (this._lipSyncParameterIds.at(f) == v.at(c).id) {
            d += o, h |= 1 << f;
            break;
          }
}
        }
        let M
        if (v.at(c).fadeInTime < 0 && v.at(c).fadeOutTime < 0) { M = x + (d - x) * i;
}
        else {
          let f, A
          f = v.at(c).fadeInTime < 0 ? _ : v.at(c).fadeInTime == 0 ? 1 : P.getEasingSine((t - r.getFadeInStartTime()) / v.at(c).fadeInTime), A = v.at(c).fadeOutTime < 0 ? g : v.at(c).fadeOutTime == 0 || r.getEndTime() < 0 ? 1 : P.getEasingSine((r.getEndTime() - t) / v.at(c).fadeOutTime), M = x + (d - x) * (this._weight * f * A)
        }
        e.setParameterValueByIndex(m, M, 1)
      }
      if (n != Number.MAX_VALUE) { for (let x = 0; x < this._eyeBlinkParameterIds.getSize() && x < l; ++x) {
        const M = e.getParameterValueById(this._eyeBlinkParameterIds.at(x));
        if (u >> x & 1) continue;
        const f = M + (n - M) * i;
        e.setParameterValueById(this._eyeBlinkParameterIds.at(x), f);
      }
}
      if (o != Number.MAX_VALUE) { for (let x = 0; x < this._lipSyncParameterIds.getSize() && x < l; ++x) {
        const M = e.getParameterValueById(this._lipSyncParameterIds.at(x));
        if (h >> x & 1) continue;
        const f = M + (o - M) * i;
        e.setParameterValueById(this._lipSyncParameterIds.at(x), f);
      }
}
      for (; c < this._motionData.curveCount && v.at(c).type == W.CubismMotionCurveTarget_PartOpacity; ++c) m = e.getParameterIndex(v.at(c).id), m != -1 && (d = zt(this._motionData, c, p), e.setParameterValueByIndex(m, d))
      a >= this._motionData.duration && (this._isLoop ? (r.setStartTime(t), this._isLoopFadeIn && r.setFadeInStartTime(t)) : (this._onFinishedMotion && this._onFinishedMotion(this), r.setIsFinished(!0))), this._lastWeight = i
    }
    setIsLoop(e) {
      this._isLoop = e
    }
    isLoop() {
      return this._isLoop
    }
    setIsLoopFadeIn(e) {
      this._isLoopFadeIn = e
    }
    isLoopFadeIn() {
      return this._isLoopFadeIn
    }
    getDuration() {
      return this._isLoop ? -1 : this._loopDurationSeconds
    }
    getLoopDuration() {
      return this._loopDurationSeconds
    }
    setParameterFadeInTime(e, t) {
      const i = this._motionData.curves
      for (let r = 0; r < this._motionData.curveCount; ++r) { if (e == i.at(r).id) return void (i.at(r).fadeInTime = t);
}
    }

    setParameterFadeOutTime(e, t) {
      const i = this._motionData.curves
      for (let r = 0; r < this._motionData.curveCount; ++r) { if (e == i.at(r).id) return void (i.at(r).fadeOutTime = t);
}
    }

    getParameterFadeInTime(e) {
      const t = this._motionData.curves
      for (let i = 0; i < this._motionData.curveCount; ++i) { if (e == t.at(i).id) return t.at(i).fadeInTime;
}
      return -1
    }
    getParameterFadeOutTime(e) {
      const t = this._motionData.curves
      for (let i = 0; i < this._motionData.curveCount; ++i) { if (e == t.at(i).id) return t.at(i).fadeOutTime;
}
      return -1
    }
    setEffectIds(e, t) {
      this._eyeBlinkParameterIds = e, this._lipSyncParameterIds = t
    }
    constructor() {
      super(), this._sourceFrameRate = 30, this._loopDurationSeconds = -1, this._isLoop = !1, this._isLoopFadeIn = !0, this._lastWeight = 0, this._motionData = null, this._modelCurveIdEyeBlink = null, this._modelCurveIdLipSync = null, this._modelCurveIdOpacity = null, this._eyeBlinkParameterIds = null, this._lipSyncParameterIds = null, this._modelOpacity = 1
    }
    release() {
      this._motionData = void 0, this._motionData = null
    }
    parse(e, t) {
      this._motionData = new es()
      let i = new ss(e, t)
      this._motionData.duration = i.getMotionDuration(), this._motionData.loop = i.isMotionLoop(), this._motionData.curveCount = i.getMotionCurveCount(), this._motionData.fps = i.getMotionFps(), this._motionData.eventCount = i.getEventCount()
      const r = i.getEvaluationOptionFlag(bt.EvaluationOptionFlag_AreBeziersRistricted)
      i.isExistMotionFadeInTime() ? this._fadeInSeconds = i.getMotionFadeInTime() < 0 ? 1 : i.getMotionFadeInTime() : this._fadeInSeconds = 1, i.isExistMotionFadeOutTime() ? this._fadeOutSeconds = i.getMotionFadeOutTime() < 0 ? 1 : i.getMotionFadeOutTime() : this._fadeOutSeconds = 1, this._motionData.curves.updateSize(this._motionData.curveCount, Ki, !0), this._motionData.segments.updateSize(i.getMotionTotalSegmentCount(), Zi, !0), this._motionData.points.updateSize(i.getMotionTotalPointCount(), Ut, !0), this._motionData.events.updateSize(this._motionData.eventCount, Qi, !0)
      let a = 0; let o = 0
      for (let n = 0; n < this._motionData.curveCount; ++n) {
        i.getMotionCurveTarget(n) == 'Model' ? this._motionData.curves.at(n).type = W.CubismMotionCurveTarget_Model : i.getMotionCurveTarget(n) == 'Parameter' ? this._motionData.curves.at(n).type = W.CubismMotionCurveTarget_Parameter : i.getMotionCurveTarget(n) == 'PartOpacity' ? this._motionData.curves.at(n).type = W.CubismMotionCurveTarget_PartOpacity : pe('Warning : Unable to get segment type from Curve! The number of "CurveCount" may be incorrect!'), this._motionData.curves.at(n).id = i.getMotionCurveId(n), this._motionData.curves.at(n).baseSegmentIndex = o, this._motionData.curves.at(n).fadeInTime = i.isExistMotionCurveFadeInTime(n) ? i.getMotionCurveFadeInTime(n) : -1, this._motionData.curves.at(n).fadeOutTime = i.isExistMotionCurveFadeOutTime(n) ? i.getMotionCurveFadeOutTime(n) : -1
        for (let l = 0; l < i.getMotionCurveSegmentCount(n);) {
          switch (l == 0 ? (this._motionData.segments.at(o).basePointIndex = a, this._motionData.points.at(a).time = i.getMotionCurveSegment(n, l), this._motionData.points.at(a).value = i.getMotionCurveSegment(n, l + 1), a += 1, l += 2) : this._motionData.segments.at(o).basePointIndex = a - 1, i.getMotionCurveSegment(n, l)) {
            case K.CubismMotionSegmentType_Linear:
              this._motionData.segments.at(o).segmentType = K.CubismMotionSegmentType_Linear, this._motionData.segments.at(o).evaluate = _r, this._motionData.points.at(a).time = i.getMotionCurveSegment(n, l + 1), this._motionData.points.at(a).value = i.getMotionCurveSegment(n, l + 2), a += 1, l += 3
              break;
            case K.CubismMotionSegmentType_Bezier:
              this._motionData.segments.at(o).segmentType = K.CubismMotionSegmentType_Bezier, this._motionData.segments.at(o).evaluate = r ? mr : pr, this._motionData.points.at(a).time = i.getMotionCurveSegment(n, l + 1), this._motionData.points.at(a).value = i.getMotionCurveSegment(n, l + 2), this._motionData.points.at(a + 1).time = i.getMotionCurveSegment(n, l + 3), this._motionData.points.at(a + 1).value = i.getMotionCurveSegment(n, l + 4), this._motionData.points.at(a + 2).time = i.getMotionCurveSegment(n, l + 5), this._motionData.points.at(a + 2).value = i.getMotionCurveSegment(n, l + 6), a += 3, l += 7
              break;
            case K.CubismMotionSegmentType_Stepped:
              this._motionData.segments.at(o).segmentType = K.CubismMotionSegmentType_Stepped, this._motionData.segments.at(o).evaluate = fr, this._motionData.points.at(a).time = i.getMotionCurveSegment(n, l + 1), this._motionData.points.at(a).value = i.getMotionCurveSegment(n, l + 2), a += 1, l += 3
              break;
            case K.CubismMotionSegmentType_InverseStepped:
              this._motionData.segments.at(o).segmentType = K.CubismMotionSegmentType_InverseStepped, this._motionData.segments.at(o).evaluate = yr, this._motionData.points.at(a).time = i.getMotionCurveSegment(n, l + 1), this._motionData.points.at(a).value = i.getMotionCurveSegment(n, l + 2), a += 1, l += 3
              break;
            default:
              re(0)
          }
          ++this._motionData.curves.at(n).segmentCount, ++o
        }
      }
      for (let n = 0; n < i.getEventCount(); ++n) this._motionData.events.at(n).fireTime = i.getEventTime(n), this._motionData.events.at(n).value = i.getEventValue(n)
      i.release(), i = void 0, i = null
    }
    getFiredEvent(e, t) {
      this._firedEventValues.updateSize(0)
      for (let i = 0; i < this._motionData.eventCount; ++i) this._motionData.events.at(i).fireTime > e && this._motionData.events.at(i).fireTime <= t && this._firedEventValues.pushBack(new Z(this._motionData.events.at(i).value.s))
      return this._firedEventValues
    }
    isExistModelOpacity() {
      for (let e = 0; e < this._motionData.curveCount; e++) {
        const t = this._motionData.curves.at(e)
        if (t.type == W.CubismMotionCurveTarget_Model && t.id.getString().s.localeCompare(Mt) == 0) 
return !0
      }
      return !1
    }
    getModelOpacityIndex() {
      if (this.isExistModelOpacity()) { for (let e = 0; e < this._motionData.curveCount; e++) {
        const t = this._motionData.curves.at(e);
        if (t.type == W.CubismMotionCurveTarget_Model && t.id.getString().s.localeCompare(Mt) == 0) return e;
      }
}
      return -1
    }
    getModelOpacityId(e) {
      if (e != -1) {
        const t = this._motionData.curves.at(e)
        if (t.type == W.CubismMotionCurveTarget_Model && t.id.getString().s.localeCompare(Mt) == 0) 
return V.getIdManager().getId(t.id.getString().s)
      }
      return null
    }
    getModelOpacityValue() {
      return this._modelOpacity
    }
  }
  let as, ns;
  (function (s) {
    s.CubismMotion = Pt
  })(as || (as = {}))
  class os {
    constructor() {
      this._autoDelete = !1, this._motion = null, this._available = !0, this._finished = !1, this._started = !1, this._startTimeSeconds = -1, this._fadeInStartTimeSeconds = 0, this._endTimeSeconds = -1, this._stateTimeSeconds = 0, this._stateWeight = 0, this._lastEventCheckSeconds = 0, this._motionQueueEntryHandle = this, this._fadeOutSeconds = 0, this._isTriggeredFadeOut = !1
    }
    release() {
      this._autoDelete && this._motion && Oe.delete(this._motion)
    }
    setFadeOut(e) {
      this._fadeOutSeconds = e, this._isTriggeredFadeOut = !0
    }
    startFadeOut(e, t) {
      const i = t + e
      this._isTriggeredFadeOut = !0, (this._endTimeSeconds < 0 || i < this._endTimeSeconds) && (this._endTimeSeconds = i)
    }
    isFinished() {
      return this._finished
    }
    isStarted() {
      return this._started
    }
    getStartTime() {
      return this._startTimeSeconds
    }
    getFadeInStartTime() {
      return this._fadeInStartTimeSeconds
    }
    getEndTime() {
      return this._endTimeSeconds
    }
    setStartTime(e) {
      this._startTimeSeconds = e
    }
    setFadeInStartTime(e) {
      this._fadeInStartTimeSeconds = e
    }
    setEndTime(e) {
      this._endTimeSeconds = e
    }
    setIsFinished(e) {
      this._finished = e
    }
    setIsStarted(e) {
      this._started = e
    }
    isAvailable() {
      return this._available
    }
    setIsAvailable(e) {
      this._available = e
    }
    setState(e, t) {
      this._stateTimeSeconds = e, this._stateWeight = t
    }
    getStateTime() {
      return this._stateTimeSeconds
    }
    getStateWeight() {
      return this._stateWeight
    }
    getLastCheckEventSeconds() {
      return this._lastEventCheckSeconds
    }
    setLastCheckEventSeconds(e) {
      this._lastEventCheckSeconds = e
    }
    isTriggeredFadeOut() {
      return this._isTriggeredFadeOut
    }
    getFadeOutSeconds() {
      return this._fadeOutSeconds
    }
  }
  (function (s) {
    s.CubismMotionQueueEntry = os
  })(ns || (ns = {}))
  class ls {
    constructor() {
      this._userTimeSeconds = 0, this._eventCallBack = null, this._eventCustomData = null, this._motions = new S()
    }
    release() {
      for (let e = 0; e < this._motions.getSize(); ++e) this._motions.at(e) && (this._motions.at(e).release(), this._motions.set(e, null))
      this._motions = null
    }
    startMotion(e, t, i) {
      if (e == null) 
return wt
      let r = null
      for (let a = 0; a < this._motions.getSize(); ++a) r = this._motions.at(a), r != null && r.setFadeOut(r._motion.getFadeOutTime())
      return r = new os(), r._autoDelete = t, r._motion = e, this._motions.pushBack(r), r._motionQueueEntryHandle
    }
    isFinished() {
      for (let e = this._motions.begin(); e.notEqual(this._motions.end());) {
        let t = e.ptr()
        if (t != null) { if (t._motion != null) {
          if (!t.isFinished()) return !1;
          e.preIncrement();
        } else t.release(), t = null, e = this._motions.erase(e);
}
        else { e = this._motions.erase(e);
}
      }
      return !0
    }
    isFinishedByHandle(e) {
      for (let t = this._motions.begin(); t.notEqual(this._motions.end()); t.increment()) {
        const i = t.ptr()
        if (i != null && i._motionQueueEntryHandle == e && !i.isFinished()) 
return !1
      }
      return !0
    }
    stopAllMotions() {
      for (let e = this._motions.begin(); e.notEqual(this._motions.end());) {
        let t = e.ptr()
        t != null ? (t.release(), t = null, e = this._motions.erase(e)) : e = this._motions.erase(e)
      }
    }

    getCubismMotionQueueEntry(e) {
      for (let t = this._motions.begin(); t.notEqual(this._motions.end()); t.preIncrement()) {
        const i = t.ptr()
        if (i != null && i._motionQueueEntryHandle == e) 
return i
      }
      return null
    }
    setEventCallback(e, t = null) {
      this._eventCallBack = e, this._eventCustomData = t
    }
    doUpdateMotion(e, t) {
      let i = !1
      for (let r = this._motions.begin(); r.notEqual(this._motions.end());) {
        let a = r.ptr()
        if (a == null) {
          r = this._motions.erase(r)
          continue;
        }
        const o = a._motion
        if (o == null) {
          a.release(), a = null, r = this._motions.erase(r)
          continue;
        }
        o.updateParameters(e, a, t), i = !0
        const n = o.getFiredEvent(a.getLastCheckEventSeconds() - a.getStartTime(), t - a.getStartTime())
        for (let l = 0; l < n.getSize(); ++l) this._eventCallBack(this, n.at(l), this._eventCustomData)
        a.setLastCheckEventSeconds(t), a.isFinished() ? (a.release(), a = null, r = this._motions.erase(r)) : (a.isTriggeredFadeOut() && a.startFadeOut(a.getFadeOutSeconds(), t), r.preIncrement())
      }
      return i
    }
  }
  const wt = -1
  var us, hs, et, ge, gs;
  (function (s) {
    s.CubismMotionQueueManager = ls, s.InvalidMotionQueueEntryHandleValue = wt
  })(us || (us = {}))
  class jt extends ls {
    constructor() {
      super(), this._currentPriority = 0, this._reservePriority = 0
    }
    getCurrentPriority() {
      return this._currentPriority
    }
    getReservePriority() {
      return this._reservePriority
    }
    setReservePriority(e) {
      this._reservePriority = e
    }
    startMotionPriority(e, t, i) {
      return i == this._reservePriority && (this._reservePriority = 0), this._currentPriority = i, super.startMotion(e, t, this._userTimeSeconds)
    }
    updateMotion(e, t) {
      this._userTimeSeconds += t
      const i = super.doUpdateMotion(e, this._userTimeSeconds)
      return this.isFinished() && (this._currentPriority = 0), i
    }
    reserveMotion(e) {
      return e > this._reservePriority && e > this._currentPriority && !this._reservePriority = e, 0;
    }
  }
  (function (s) {
    s.CubismMotionManager = jt
  })(hs || (hs = {})), (function(s) {
    s[s.CubismPhysicsTargetType_Parameter = 0] = "CubismPhysicsTargetType_Parameter";
  }(et || (et = {}))), (function(s) {
    s[s.CubismPhysicsSource_X = 0] = "CubismPhysicsSource_X", s[s.CubismPhysicsSource_Y = 1] = "CubismPhysicsSource_Y", s[s.CubismPhysicsSource_Angle = 2] = "CubismPhysicsSource_Angle";
  }(ge || (ge = {})));
  class xr {
    constructor() {
      this.gravity = new B(0, 0), this.wind = new B(0, 0)
    }
  }
  class Xt {
  }
  class Gt {
  }
  class ds {
    constructor() {
      this.initialPosition = new B(0, 0), this.position = new B(0, 0), this.lastPosition = new B(0, 0), this.lastGravity = new B(0, 0), this.force = new B(0, 0), this.velocity = new B(0, 0)
    }
  }
  class cs {
    constructor() {
      this.normalizationPosition = new Gt(), this.normalizationAngle = new Gt()
    }
  }
  class _s {
    constructor() {
      this.source = new Xt()
    }
  }
  class ms {
    constructor() {
      this.destination = new Xt(), this.translationScale = new B(0, 0)
    }
  }
  class ps {
    constructor() {
      this.settings = new S(), this.inputs = new S(), this.outputs = new S(), this.particles = new S(), this.gravity = new B(0, 0), this.wind = new B(0, 0), this.fps = 0
    }
  }
  (function (s) {
    s.CubismPhysicsInput = _s, s.CubismPhysicsNormalization = Gt, s.CubismPhysicsOutput = ms, s.CubismPhysicsParameter = Xt, s.CubismPhysicsParticle = ds, s.CubismPhysicsRig = ps, s.CubismPhysicsSource = ge, s.CubismPhysicsSubRig = cs, s.CubismPhysicsTargetType = et, s.PhysicsJsonEffectiveForces = xr
  })(gs || (gs = {}))
  const tt = 'Position', Yt = 'Angle', fs = 'Type', de = 'Meta', It = 'EffectiveForces', ys = 'Gravity', xs = 'Wind', D = 'PhysicsSettings', Ne = 'Normalization', Ss = 'Minimum', Cs = 'Maximum', Bs = 'Default', vs = 'Reflect', bs = 'Weight', it = 'Input', Pe = 'Output', we = 'Vertices';
  class Ms {
    constructor(e, t) {
      this._json = U.create(e, t)
    }
    release() {
      U.delete(this._json)
    }
    getGravity() {
      const e = new B(0, 0)
      return e.x = this._json.getRoot().getValueByString(de).getValueByString(It).getValueByString(ys).getValueByString('X').toFloat(), e.y = this._json.getRoot().getValueByString(de).getValueByString(It).getValueByString(ys).getValueByString('Y').toFloat(), e
    }
    getWind() {
      const e = new B(0, 0)
      return e.x = this._json.getRoot().getValueByString(de).getValueByString(It).getValueByString(xs).getValueByString('X').toFloat(), e.y = this._json.getRoot().getValueByString(de).getValueByString(It).getValueByString(xs).getValueByString('Y').toFloat(), e
    }
    getFps() {
      return this._json.getRoot().getValueByString(de).getValueByString('Fps').toFloat(0)
    }
    getSubRigCount() {
      return this._json.getRoot().getValueByString(de).getValueByString('PhysicsSettingCount').toInt()
    }
    getTotalInputCount() {
      return this._json.getRoot().getValueByString(de).getValueByString('TotalInputCount').toInt()
    }
    getTotalOutputCount() {
      return this._json.getRoot().getValueByString(de).getValueByString('TotalOutputCount').toInt()
    }
    getVertexCount() {
      return this._json.getRoot().getValueByString(de).getValueByString('VertexCount').toInt()
    }
    getNormalizationPositionMinimumValue(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Ne).getValueByString(tt).getValueByString(Ss).toFloat()
    }
    getNormalizationPositionMaximumValue(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Ne).getValueByString(tt).getValueByString(Cs).toFloat()
    }
    getNormalizationPositionDefaultValue(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Ne).getValueByString(tt).getValueByString(Bs).toFloat()
    }
    getNormalizationAngleMinimumValue(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Ne).getValueByString(Yt).getValueByString(Ss).toFloat()
    }
    getNormalizationAngleMaximumValue(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Ne).getValueByString(Yt).getValueByString(Cs).toFloat()
    }
    getNormalizationAngleDefaultValue(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Ne).getValueByString(Yt).getValueByString(Bs).toFloat()
    }
    getInputCount(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(it).getVector().getSize()
    }
    getInputWeight(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(it).getValueByIndex(t).getValueByString(bs).toFloat()
    }
    getInputReflect(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(it).getValueByIndex(t).getValueByString(vs).toBoolean()
    }
    getInputType(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(it).getValueByIndex(t).getValueByString(fs).getRawString()
    }
    getInputSourceId(e, t) {
      return V.getIdManager().getId(this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(it).getValueByIndex(t).getValueByString('Source').getValueByString('Id').getRawString())
    }
    getOutputCount(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getVector().getSize()
    }
    getOutputVertexIndex(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getValueByIndex(t).getValueByString('VertexIndex').toInt()
    }
    getOutputAngleScale(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getValueByIndex(t).getValueByString('Scale').toFloat()
    }
    getOutputWeight(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getValueByIndex(t).getValueByString(bs).toFloat()
    }
    getOutputDestinationId(e, t) {
      return V.getIdManager().getId(this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getValueByIndex(t).getValueByString('Destination').getValueByString('Id').getRawString())
    }
    getOutputType(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getValueByIndex(t).getValueByString(fs).getRawString()
    }
    getOutputReflect(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(Pe).getValueByIndex(t).getValueByString(vs).toBoolean()
    }
    getParticleCount(e) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getVector().getSize()
    }
    getParticleMobility(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getValueByIndex(t).getValueByString('Mobility').toFloat()
    }
    getParticleDelay(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getValueByIndex(t).getValueByString('Delay').toFloat()
    }
    getParticleAcceleration(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getValueByIndex(t).getValueByString('Acceleration').toFloat()
    }
    getParticleRadius(e, t) {
      return this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getValueByIndex(t).getValueByString('Radius').toFloat()
    }
    getParticlePosition(e, t) {
      const i = new B(0, 0)
      return i.x = this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getValueByIndex(t).getValueByString(tt).getValueByString('X').toFloat(), i.y = this._json.getRoot().getValueByString(D).getValueByIndex(e).getValueByString(we).getValueByIndex(t).getValueByString(tt).getValueByString('Y').toFloat(), i
    }
  }
  let Ps;
  (function (s) {
    s.CubismPhysicsJson = Ms
  })(Ps || (Ps = {}))
  const ws = 'Angle';
  class st {
    static create(e, t) {
      const i = new st()
      return i.parse(e, t), i._physicsRig.gravity.y = 0, i
    }
    static delete(e) {
      e != null && (e.release(), e = null)
    }
    parse(e, t) {
      this._physicsRig = new ps()
      let i = new Ms(e, t)
      this._physicsRig.gravity = i.getGravity(), this._physicsRig.wind = i.getWind(), this._physicsRig.subRigCount = i.getSubRigCount(), this._physicsRig.fps = i.getFps(), this._physicsRig.settings.updateSize(this._physicsRig.subRigCount, cs, !0), this._physicsRig.inputs.updateSize(i.getTotalInputCount(), _s, !0), this._physicsRig.outputs.updateSize(i.getTotalOutputCount(), ms, !0), this._physicsRig.particles.updateSize(i.getVertexCount(), ds, !0), this._currentRigOutputs.clear(), this._previousRigOutputs.clear()
      let r = 0; let a = 0; let o = 0
      for (let n = 0; n < this._physicsRig.settings.getSize(); ++n) {
        this._physicsRig.settings.at(n).normalizationPosition.minimum = i.getNormalizationPositionMinimumValue(n), this._physicsRig.settings.at(n).normalizationPosition.maximum = i.getNormalizationPositionMaximumValue(n), this._physicsRig.settings.at(n).normalizationPosition.defalut = i.getNormalizationPositionDefaultValue(n), this._physicsRig.settings.at(n).normalizationAngle.minimum = i.getNormalizationAngleMinimumValue(n), this._physicsRig.settings.at(n).normalizationAngle.maximum = i.getNormalizationAngleMaximumValue(n), this._physicsRig.settings.at(n).normalizationAngle.defalut = i.getNormalizationAngleDefaultValue(n), this._physicsRig.settings.at(n).inputCount = i.getInputCount(n), this._physicsRig.settings.at(n).baseInputIndex = r
        for (let u = 0; u < this._physicsRig.settings.at(n).inputCount; ++u) this._physicsRig.inputs.at(r + u).sourceParameterIndex = -1, this._physicsRig.inputs.at(r + u).weight = i.getInputWeight(n, u), this._physicsRig.inputs.at(r + u).reflect = i.getInputReflect(n, u), i.getInputType(n, u) == 'X' ? (this._physicsRig.inputs.at(r + u).type = ge.CubismPhysicsSource_X, this._physicsRig.inputs.at(r + u).getNormalizedParameterValue = Sr) : i.getInputType(n, u) == 'Y' ? (this._physicsRig.inputs.at(r + u).type = ge.CubismPhysicsSource_Y, this._physicsRig.inputs.at(r + u).getNormalizedParameterValue = Cr) : i.getInputType(n, u) == ws && (this._physicsRig.inputs.at(r + u).type = ge.CubismPhysicsSource_Angle, this._physicsRig.inputs.at(r + u).getNormalizedParameterValue = Br), this._physicsRig.inputs.at(r + u).source.targetType = et.CubismPhysicsTargetType_Parameter, this._physicsRig.inputs.at(r + u).source.id = i.getInputSourceId(n, u)
        r += this._physicsRig.settings.at(n).inputCount, this._physicsRig.settings.at(n).outputCount = i.getOutputCount(n), this._physicsRig.settings.at(n).baseOutputIndex = a
        const l = new Ts()
        l.outputs.resize(this._physicsRig.settings.at(n).outputCount)
        const h = new Ts()
        h.outputs.resize(this._physicsRig.settings.at(n).outputCount)
        for (let u = 0; u < this._physicsRig.settings.at(n).outputCount; ++u) l.outputs.set(u, 0), h.outputs.set(u, 0), this._physicsRig.outputs.at(a + u).destinationParameterIndex = -1, this._physicsRig.outputs.at(a + u).vertexIndex = i.getOutputVertexIndex(n, u), this._physicsRig.outputs.at(a + u).angleScale = i.getOutputAngleScale(n, u), this._physicsRig.outputs.at(a + u).weight = i.getOutputWeight(n, u), this._physicsRig.outputs.at(a + u).destination.targetType = et.CubismPhysicsTargetType_Parameter, this._physicsRig.outputs.at(a + u).destination.id = i.getOutputDestinationId(n, u), i.getOutputType(n, u) == 'X' ? (this._physicsRig.outputs.at(a + u).type = ge.CubismPhysicsSource_X, this._physicsRig.outputs.at(a + u).getValue = vr, this._physicsRig.outputs.at(a + u).getScale = Pr) : i.getOutputType(n, u) == 'Y' ? (this._physicsRig.outputs.at(a + u).type = ge.CubismPhysicsSource_Y, this._physicsRig.outputs.at(a + u).getValue = br, this._physicsRig.outputs.at(a + u).getScale = wr) : i.getOutputType(n, u) == ws && (this._physicsRig.outputs.at(a + u).type = ge.CubismPhysicsSource_Angle, this._physicsRig.outputs.at(a + u).getValue = Mr, this._physicsRig.outputs.at(a + u).getScale = Ir), this._physicsRig.outputs.at(a + u).reflect = i.getOutputReflect(n, u)
        this._currentRigOutputs.pushBack(l), this._previousRigOutputs.pushBack(h), a += this._physicsRig.settings.at(n).outputCount, this._physicsRig.settings.at(n).particleCount = i.getParticleCount(n), this._physicsRig.settings.at(n).baseParticleIndex = o
        for (let u = 0; u < this._physicsRig.settings.at(n).particleCount; ++u) this._physicsRig.particles.at(o + u).mobility = i.getParticleMobility(n, u), this._physicsRig.particles.at(o + u).delay = i.getParticleDelay(n, u), this._physicsRig.particles.at(o + u).acceleration = i.getParticleAcceleration(n, u), this._physicsRig.particles.at(o + u).radius = i.getParticleRadius(n, u), this._physicsRig.particles.at(o + u).position = i.getParticlePosition(n, u)
        o += this._physicsRig.settings.at(n).particleCount
      }
      this.initialize(), i.release(), i = void 0, i = null
    }
    stabilization(e) {
      let t, i, r, a
      let o, n, l, h
      const u = new B()
      let _, g, d, c, m, p, v, x
      m = e.getModel().parameters.values, p = e.getModel().parameters.maximumValues, v = e.getModel().parameters.minimumValues, x = e.getModel().parameters.defaultValues, ((i = (t = this._parameterCaches) === null || t === void 0 ? void 0 : t.length) !== null && i !== void 0 ? i : 0) < e.getParameterCount() && (this._parameterCaches = new Float32Array(e.getParameterCount())), ((a = (r = this._parameterInputCaches) === null || r === void 0 ? void 0 : r.length) !== null && a !== void 0 ? a : 0) < e.getParameterCount() && (this._parameterInputCaches = new Float32Array(e.getParameterCount()))
      for (let M = 0; M < e.getParameterCount(); ++M) this._parameterCaches[M] = m[M], this._parameterInputCaches[M] = m[M]
      for (let M = 0; M < this._physicsRig.subRigCount; ++M) {
        o = { angle: 0 }, u.x = 0, u.y = 0, _ = this._physicsRig.settings.at(M), g = this._physicsRig.inputs.get(_.baseInputIndex), d = this._physicsRig.outputs.get(_.baseOutputIndex), c = this._physicsRig.particles.get(_.baseParticleIndex)
        for (let f = 0; f < _.inputCount; ++f) n = g[f].weight / 100, g[f].sourceParameterIndex == -1 && (g[f].sourceParameterIndex = e.getParameterIndex(g[f].source.id)), g[f].getNormalizedParameterValue(u, o, m[g[f].sourceParameterIndex], v[g[f].sourceParameterIndex], p[g[f].sourceParameterIndex], x[g[f].sourceParameterIndex], _.normalizationPosition, _.normalizationAngle, g[f].reflect, n), this._parameterCaches[g[f].sourceParameterIndex] = m[g[f].sourceParameterIndex]
        l = P.degreesToRadian(-o.angle), u.x = u.x * P.cos(l) - u.y * P.sin(l), u.y = u.x * P.sin(l) + u.y * P.cos(l), Vr(c, _.particleCount, u, o.angle, this._options.wind, 1e-3 * _.normalizationPosition.maximum)
        for (let f = 0; f < _.outputCount; ++f) {
          const A = d[f].vertexIndex
          if (d[f].destinationParameterIndex == -1 && (d[f].destinationParameterIndex = e.getParameterIndex(d[f].destination.id)), A < 1 || A >= _.particleCount) 
continue;
          let T = new B()
          T = c[A].position.substract(c[A - 1].position), h = d[f].getValue(T, c, A, d[f].reflect, this._options.gravity), this._currentRigOutputs.at(M).outputs.set(f, h), this._previousRigOutputs.at(M).outputs.set(f, h)
          const E = d[f].destinationParameterIndex; const I = !Float32Array.prototype.slice && 'subarray' in Float32Array.prototype ? JSON.parse(JSON.stringify(m.subarray(E))) : m.slice(E)
          Ht(I, v[E], p[E], h, d[f])
          for (let z = E, Ye = 0; z < this._parameterCaches.length; z++, Ye++) m[z] = this._parameterCaches[z] = I[Ye]
        }
      }
    }

    evaluate(e, t) {
      let i, r, a, o
      let n, l, h, u
      const _ = new B()
      let g, d, c, m, p, v, x, M, f
      if (t <= 0) 
return;
      if (this._currentRemainTime += t, this._currentRemainTime > 5 && (this._currentRemainTime = 0), p = e.getModel().parameters.values, v = e.getModel().parameters.maximumValues, x = e.getModel().parameters.minimumValues, M = e.getModel().parameters.defaultValues, ((r = (i = this._parameterCaches) === null || i === void 0 ? void 0 : i.length) !== null && r !== void 0 ? r : 0) < e.getParameterCount() && (this._parameterCaches = new Float32Array(e.getParameterCount())), ((o = (a = this._parameterInputCaches) === null || a === void 0 ? void 0 : a.length) !== null && o !== void 0 ? o : 0) < e.getParameterCount()) {
        this._parameterInputCaches = new Float32Array(e.getParameterCount())
        for (let T = 0; T < e.getParameterCount(); ++T) this._parameterInputCaches[T] = p[T]
      }
      for (f = this._physicsRig.fps > 0 ? 1 / this._physicsRig.fps : t; this._currentRemainTime >= f;) {
        for (let E = 0; E < this._physicsRig.subRigCount; ++E) {
          g = this._physicsRig.settings.at(E), c = this._physicsRig.outputs.get(g.baseOutputIndex)
          for (let I = 0; I < g.outputCount; ++I) this._previousRigOutputs.at(E).outputs.set(I, this._currentRigOutputs.at(E).outputs.at(I))
        }
        const T = f / this._currentRemainTime
        for (let E = 0; E < e.getParameterCount(); ++E) this._parameterCaches[E] = this._parameterInputCaches[E] * (1 - T) + p[E] * T, this._parameterInputCaches[E] = this._parameterCaches[E]
        for (let E = 0; E < this._physicsRig.subRigCount; ++E) {
          n = { angle: 0 }, _.x = 0, _.y = 0, g = this._physicsRig.settings.at(E), d = this._physicsRig.inputs.get(g.baseInputIndex), c = this._physicsRig.outputs.get(g.baseOutputIndex), m = this._physicsRig.particles.get(g.baseParticleIndex)
          for (let I = 0; I < g.inputCount; ++I) l = d[I].weight / 100, d[I].sourceParameterIndex == -1 && (d[I].sourceParameterIndex = e.getParameterIndex(d[I].source.id)), d[I].getNormalizedParameterValue(_, n, this._parameterCaches[d[I].sourceParameterIndex], x[d[I].sourceParameterIndex], v[d[I].sourceParameterIndex], M[d[I].sourceParameterIndex], g.normalizationPosition, g.normalizationAngle, d[I].reflect, l)
          h = P.degreesToRadian(-n.angle), _.x = _.x * P.cos(h) - _.y * P.sin(h), _.y = _.x * P.sin(h) + _.y * P.cos(h), Tr(m, g.particleCount, _, n.angle, this._options.wind, 1e-3 * g.normalizationPosition.maximum, f, 5)
          for (let I = 0; I < g.outputCount; ++I) {
            const z = c[I].vertexIndex
            if (c[I].destinationParameterIndex == -1 && (c[I].destinationParameterIndex = e.getParameterIndex(c[I].destination.id)), z < 1 || z >= g.particleCount) 
continue;
            const Ye = new B()
            Ye.x = m[z].position.x - m[z - 1].position.x, Ye.y = m[z].position.y - m[z - 1].position.y, u = c[I].getValue(Ye, m, z, c[I].reflect, this._options.gravity), this._currentRigOutputs.at(E).outputs.set(I, u)
            const ut = c[I].destinationParameterIndex; const tr = !Float32Array.prototype.slice && 'subarray' in Float32Array.prototype ? JSON.parse(JSON.stringify(this._parameterCaches.subarray(ut))) : this._parameterCaches.slice(ut)
            Ht(tr, x[ut], v[ut], u, c[I])
            for (let ai = ut, ir = 0; ai < this._parameterCaches.length; ai++, ir++) this._parameterCaches[ai] = tr[ir]
          }
        }
        this._currentRemainTime -= f
      }
      const A = this._currentRemainTime / f
      this.interpolate(e, A)
    }
    interpolate(e, t) {
      let i, r, a, o, n
      a = e.getModel().parameters.values, o = e.getModel().parameters.maximumValues, n = e.getModel().parameters.minimumValues
      for (let l = 0; l < this._physicsRig.subRigCount; ++l) {
        r = this._physicsRig.settings.at(l), i = this._physicsRig.outputs.get(r.baseOutputIndex)
        for (let h = 0; h < r.outputCount; ++h) {
          if (i[h].destinationParameterIndex == -1) 
continue;
          const u = i[h].destinationParameterIndex; const _ = !Float32Array.prototype.slice && 'subarray' in Float32Array.prototype ? JSON.parse(JSON.stringify(a.subarray(u))) : a.slice(u)
          Ht(_, n[u], o[u], this._previousRigOutputs.at(l).outputs.at(h) * (1 - t) + this._currentRigOutputs.at(l).outputs.at(h) * t, i[h])
          for (let g = u, d = 0; g < a.length; g++, d++) a[g] = _[d]
        }
      }
    }

    setOptions(e) {
      this._options = e
    }
    getOption() {
      return this._options
    }
    constructor() {
      this._physicsRig = null, this._options = new Is(), this._options.gravity.y = -1, this._options.gravity.x = 0, this._options.wind.x = 0, this._options.wind.y = 0, this._currentRigOutputs = new S(), this._previousRigOutputs = new S(), this._currentRemainTime = 0, this._parameterCaches = null, this._parameterInputCaches = null
    }
    release() {
      this._physicsRig = void 0, this._physicsRig = null
    }
    initialize() {
      let e, t, i
      for (let r = 0; r < this._physicsRig.subRigCount; ++r) {
        t = this._physicsRig.settings.at(r), e = this._physicsRig.particles.get(t.baseParticleIndex), e[0].initialPosition = new B(0, 0), e[0].lastPosition = new B(e[0].initialPosition.x, e[0].initialPosition.y), e[0].lastGravity = new B(0, -1), e[0].lastGravity.y *= -1, e[0].velocity = new B(0, 0), e[0].force = new B(0, 0)
        for (let a = 1; a < t.particleCount; ++a) i = new B(0, 0), i.y = e[a].radius, e[a].initialPosition = new B(e[a - 1].initialPosition.x + i.x, e[a - 1].initialPosition.y + i.y), e[a].position = new B(e[a].initialPosition.x, e[a].initialPosition.y), e[a].lastPosition = new B(e[a].initialPosition.x, e[a].initialPosition.y), e[a].lastGravity = new B(0, -1), e[a].lastGravity.y *= -1, e[a].velocity = new B(0, 0), e[a].force = new B(0, 0)
      }
    }
  }
  class Is {
    constructor() {
      this.gravity = new B(0, 0), this.wind = new B(0, 0)
    }
  }
  class Ts {
    constructor() {
      this.outputs = new S(0)
    }
  }
  function Sr(s, e, t, i, r, a, o, n, l, h) {
    s.x += qt(t, i, r, 0, o.minimum, o.maximum, o.defalut, l) * h
  }
  function Cr(s, e, t, i, r, a, o, n, l, h) {
    s.y += qt(t, i, r, 0, o.minimum, o.maximum, o.defalut, l) * h
  }
  function Br(s, e, t, i, r, a, o, n, l, h) {
    e.angle += qt(t, i, r, 0, n.minimum, n.maximum, n.defalut, l) * h
  }
  function vr(s, e, t, i, r) {
    let a = s.x
    return i && (a *= -1), a
  }
  function br(s, e, t, i, r) {
    let a = s.y
    return i && (a *= -1), a
  }
  function Mr(s, e, t, i, r) {
    let a
    return r = t >= 2 ? e[t - 1].position.substract(e[t - 2].position) : r.multiplyByScaler(-1), a = P.directionToRadian(r, s), i && (a *= -1), a
  }
  function Pr(s, e) {
    return JSON.parse(JSON.stringify(s.x))
  }
  function wr(s, e) {
    return JSON.parse(JSON.stringify(s.y))
  }
  function Ir(s, e) {
    return JSON.parse(JSON.stringify(e))
  }
  function Tr(s, e, t, i, r, a, o, n) {
    let l; let h; let u; let _; let g = new B(0, 0); let d = new B(0, 0); let c = new B(0, 0); let m = new B(0, 0)
    s[0].position = new B(t.x, t.y), l = P.degreesToRadian(i), _ = P.radianToDirection(l), _.normalize()
    for (let p = 1; p < e; ++p) s[p].force = _.multiplyByScaler(s[p].acceleration).add(r), s[p].lastPosition = new B(s[p].position.x, s[p].position.y), h = s[p].delay * o * 30, g = s[p].position.substract(s[p - 1].position), u = P.directionToRadian(s[p].lastGravity, _) / n, g.x = P.cos(u) * g.x - g.y * P.sin(u), g.y = P.sin(u) * g.x + g.y * P.cos(u), s[p].position = s[p - 1].position.add(g), d = s[p].velocity.multiplyByScaler(h), c = s[p].force.multiplyByScaler(h).multiplyByScaler(h), s[p].position = s[p].position.add(d).add(c), m = s[p].position.substract(s[p - 1].position), m.normalize(), s[p].position = s[p - 1].position.add(m.multiplyByScaler(s[p].radius)), P.abs(s[p].position.x) < a && (s[p].position.x = 0), h != 0 && (s[p].velocity = s[p].position.substract(s[p].lastPosition), s[p].velocity = s[p].velocity.divisionByScalar(h), s[p].velocity = s[p].velocity.multiplyByScaler(s[p].mobility)), s[p].force = new B(0, 0), s[p].lastGravity = new B(_.x, _.y)
  }
  function Vr(s, e, t, i, r, a) {
    let o; let n; let l = new B(0, 0)
    s[0].position = new B(t.x, t.y), o = P.degreesToRadian(i), n = P.radianToDirection(o), n.normalize()
    for (let h = 1; h < e; ++h) s[h].force = n.multiplyByScaler(s[h].acceleration).add(r), s[h].lastPosition = new B(s[h].position.x, s[h].position.y), s[h].velocity = new B(0, 0), l = s[h].force, l.normalize(), l = l.multiplyByScaler(s[h].radius), s[h].position = s[h - 1].position.add(l), P.abs(s[h].position.x) < a && (s[h].position.x = 0), s[h].force = new B(0, 0), s[h].lastGravity = new B(n.x, n.y)
  }
  function Ht(s, e, t, i, r) {
    let a, o, n
    a = r.getScale(r.translationScale, r.angleScale), o = i * a, o < e ? (o < r.valueBelowMinimum && (r.valueBelowMinimum = o), o = e) : o > t && (o > r.valueExceededMaximum && (r.valueExceededMaximum = o), o = t), n = r.weight / 100, n >= 1 || (o = s[0] * (1 - n) + o * n), s[0] = o
  }
  function qt(s, e, t, i, r, a, o, n) {
    let l = 0
    const h = P.max(t, e)
    h < s && (s = h)
    const u = P.min(t, e)
    u > s && (s = u)
    const _ = P.min(r, a); const g = P.max(r, a); const d = o; const c = (p = u, v = h, P.min(p, v) + function(x, M) {
      const f = P.max(x, M), A = P.min(x, M);
      return P.abs(f - A);
    }(p, v) / 2); const m = s - c
    var p, v
    switch (function (x) {
      let M = 0
      return x > 0 ? M = 1 : x < 0 && (M = -1), M
    }(m)) {
      case 1: {
        const x = h - c
        x != 0 && (l = m * ((g - d) / x), l += d)
        break;
      }
      case -1: {
        const x = u - c
        x != 0 && (l = m * ((_ - d) / x), l += d)
        break;
      }
      case 0:
        l = d
    }
    return n ? l : -1 * l
  }
  let Vs, Es;
  (function (s) {
    s.CubismPhysics = st, s.Options = Is
  })(Vs || (Vs = {}))
  class Tt {
    constructor(e, t, i, r) {
      this.x = e, this.y = t, this.width = i, this.height = r
    }
    getCenterX() {
      return this.x + 0.5 * this.width
    }
    getCenterY() {
      return this.y + 0.5 * this.height
    }
    getRight() {
      return this.x + this.width
    }
    getBottom() {
      return this.y + this.height
    }
    setRect(e) {
      this.x = e.x, this.y = e.y, this.width = e.width, this.height = e.height
    }
    expand(e, t) {
      this.x -= e, this.y -= t, this.width += 2 * e, this.height += 2 * t
    }
  }
  let Ie, ce, Vt;
  (function (s) {
    s.csmRect = Tt
  })(Es || (Es = {}))
  class Wt {
    getChannelFlagAsColor(e) {
      return this._channelColors.at(e)
    }
    getMaskRenderTexture() {
      if (this._maskTexture && this._maskTexture.textures != null) { this._maskTexture.frameNo = this._currentFrameNo;
}
      else {
        this._maskRenderTextures != null && this._maskRenderTextures.clear(), this._maskRenderTextures = new S(), this._maskColorBuffers != null && this._maskColorBuffers.clear(), this._maskColorBuffers = new S()
        const e = this._clippingMaskBufferSize
        for (let t = 0; t < this._renderTextureCount; t++) this._maskColorBuffers.pushBack(this.gl.createTexture()), this.gl.bindTexture(this.gl.TEXTURE_2D, this._maskColorBuffers.at(t)), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, e, e, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR), this.gl.bindTexture(this.gl.TEXTURE_2D, null), this._maskRenderTextures.pushBack(this.gl.createFramebuffer()), this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._maskRenderTextures.at(t)), this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this._maskColorBuffers.at(t), 0)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, Vt), this._maskTexture = new Rs(this._currentFrameNo, this._maskRenderTextures)
      }
      return this._maskTexture.textures
    }
    setGL(e) {
      this.gl = e
    }
    calcClippedDrawTotalBounds(e, t) {
      let i = Number.MAX_VALUE; let r = Number.MAX_VALUE; let a = Number.MIN_VALUE; let o = Number.MIN_VALUE
      const n = t._clippedDrawableIndexList.length
      for (let l = 0; l < n; l++) {
        const h = t._clippedDrawableIndexList[l]; const u = e.getDrawableVertexCount(h); const _ = e.getDrawableVertices(h)
        let g = Number.MAX_VALUE; let d = Number.MAX_VALUE; let c = -Number.MAX_VALUE; let m = -Number.MAX_VALUE
        const p = u * fe.vertexStep
        for (let v = fe.vertexOffset; v < p; v += fe.vertexStep) {
          const x = _[v]; const M = _[v + 1]
          x < g && (g = x), x > c && (c = x), M < d && (d = M), M > m && (m = M)
        }
        if (g != Number.MAX_VALUE) { if (g < i && (i = g), d < r && (r = d), c > a && (a = c), m > o && (o = m), i == Number.MAX_VALUE) t._allClippedDrawRect.x = 0, t._allClippedDrawRect.y = 0, t._allClippedDrawRect.width = 0, t._allClippedDrawRect.height = 0, t._isUsing = !1;
        else {
          t._isUsing = !0;
          const v = a - i, x = o - r;
          t._allClippedDrawRect.x = i, t._allClippedDrawRect.y = r, t._allClippedDrawRect.width = v, t._allClippedDrawRect.height = x;
        }
}
      }
    }

    constructor() {
      this._currentMaskRenderTexture = null, this._maskColorBuffers = null, this._currentFrameNo = 0, this._renderTextureCount = 0, this._clippingMaskBufferSize = 256, this._clippingContextListForMask = new S(), this._clippingContextListForDraw = new S(), this._channelColors = new S(), this._tmpBoundsOnModel = new Tt(), this._tmpMatrix = new O(), this._tmpMatrixForMask = new O(), this._tmpMatrixForDraw = new O(), this._maskTexture = null
      let e = new H()
      e.R = 1, e.G = 0, e.B = 0, e.A = 0, this._channelColors.pushBack(e), e = new H(), e.R = 0, e.G = 1, e.B = 0, e.A = 0, this._channelColors.pushBack(e), e = new H(), e.R = 0, e.G = 0, e.B = 1, e.A = 0, this._channelColors.pushBack(e), e = new H(), e.R = 0, e.G = 0, e.B = 0, e.A = 1, this._channelColors.pushBack(e)
    }
    release() {
      for (let e = 0; e < this._clippingContextListForMask.getSize(); e++) this._clippingContextListForMask.at(e) && (this._clippingContextListForMask.at(e).release(), this._clippingContextListForMask.set(e, void 0)), this._clippingContextListForMask.set(e, null)
      this._clippingContextListForMask = null
      for (let e = 0; e < this._clippingContextListForDraw.getSize(); e++) this._clippingContextListForDraw.set(e, null)
      if (this._clippingContextListForDraw = null, this._maskTexture) {
        for (let e = 0; e < this._maskTexture.textures.getSize(); e++) this.gl.deleteFramebuffer(this._maskTexture.textures.at(e))
        this._maskTexture.textures.clear(), this._maskTexture.textures = null, this._maskTexture = null
      }
      for (let e = 0; e < this._channelColors.getSize(); e++) this._channelColors.set(e, null)
      if (this._channelColors = null, this._maskColorBuffers != null) {
        for (let e = 0; e < this._maskColorBuffers.getSize(); e++) this.gl.deleteTexture(this._maskColorBuffers.at(e))
        this._maskColorBuffers.clear()
      }
      this._maskColorBuffers = null, this._maskRenderTextures != null && this._maskRenderTextures.clear(), this._maskRenderTextures = null, this._clearedFrameBufferflags != null && this._clearedFrameBufferflags.clear(), this._clearedFrameBufferflags = null
    }
    initialize(e, t, i, r, a) {
      a % 1 != 0 && (pe('The number of render textures must be specified as an integer. The decimal point is rounded down and corrected to an integer.'), a = ~~a), a < 1 && pe('The number of render textures must be an integer greater than or equal to 1. Set the number of render textures to 1.'), this._renderTextureCount = a < 1 ? 1 : a, this._clearedFrameBufferflags = new S(this._renderTextureCount)
      for (let o = 0; o < t; o++) {
        if (r[o] <= 0) {
          this._clippingContextListForDraw.pushBack(null)
          continue;
        }
        let n = this.findSameClip(i[o], r[o])
        n == null && (n = new Fs(this, i[o], r[o]), this._clippingContextListForMask.pushBack(n)), n.addClippedDrawable(o), this._clippingContextListForDraw.pushBack(n)
      }
    }

    setupClippingContext(e, t) {
      this._currentFrameNo++
      let i = 0
      for (let r = 0; r < this._clippingContextListForMask.getSize(); r++) {
        const a = this._clippingContextListForMask.at(r)
        this.calcClippedDrawTotalBounds(e, a), a._isUsing && i++
      }
      if (i > 0) {
        this.setupLayoutBounds(t.isUsingHighPrecisionMask() ? 0 : i), t.isUsingHighPrecisionMask() || (this.gl.viewport(0, 0, this._clippingMaskBufferSize, this._clippingMaskBufferSize), this._currentMaskRenderTexture = this.getMaskRenderTexture().at(0), t.preDraw(), this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._currentMaskRenderTexture)), this._clearedFrameBufferflags.getSize() != this._renderTextureCount && (this._clearedFrameBufferflags.clear(), this._clearedFrameBufferflags = new S(this._renderTextureCount))
        for (let r = 0; r < this._clearedFrameBufferflags.getSize(); r++) this._clearedFrameBufferflags.set(r, !1)
        for (let r = 0; r < this._clippingContextListForMask.getSize(); r++) {
          const a = this._clippingContextListForMask.at(r); const o = a._allClippedDrawRect; const n = a._layoutBounds; const l = 0.05
          let h = 0; let u = 0
          const _ = this.getMaskRenderTexture().at(a._bufferIndex)
          if (this._currentMaskRenderTexture == _ || t.isUsingHighPrecisionMask() || (this._currentMaskRenderTexture = _, t.preDraw(), this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this._currentMaskRenderTexture)), t.isUsingHighPrecisionMask()) {
            const g = e.getPixelsPerUnit(); const d = a.getClippingManager()._clippingMaskBufferSize; const c = n.width * d; const m = n.height * d
            this._tmpBoundsOnModel.setRect(o), this._tmpBoundsOnModel.width * g > c ? (this._tmpBoundsOnModel.expand(o.width * l, 0), h = n.width / this._tmpBoundsOnModel.width) : h = g / c, this._tmpBoundsOnModel.height * g > m ? (this._tmpBoundsOnModel.expand(0, o.height * l), u = n.height / this._tmpBoundsOnModel.height) : u = g / m
          } else { this._tmpBoundsOnModel.setRect(o), this._tmpBoundsOnModel.expand(o.width * l, o.height * l), h = n.width / this._tmpBoundsOnModel.width, u = n.height / this._tmpBoundsOnModel.height;
}
          if (this._tmpMatrix.loadIdentity(), this._tmpMatrix.translateRelative(-1, -1), this._tmpMatrix.scaleRelative(2, 2), this._tmpMatrix.translateRelative(n.x, n.y), this._tmpMatrix.scaleRelative(h, u), this._tmpMatrix.translateRelative(-this._tmpBoundsOnModel.x, -this._tmpBoundsOnModel.y), this._tmpMatrixForMask.setMatrix(this._tmpMatrix.getArray()), this._tmpMatrix.loadIdentity(), this._tmpMatrix.translateRelative(n.x, n.y), this._tmpMatrix.scaleRelative(h, u), this._tmpMatrix.translateRelative(-this._tmpBoundsOnModel.x, -this._tmpBoundsOnModel.y), this._tmpMatrixForDraw.setMatrix(this._tmpMatrix.getArray()), a._matrixForMask.setMatrix(this._tmpMatrixForMask.getArray()), a._matrixForDraw.setMatrix(this._tmpMatrixForDraw.getArray()), !t.isUsingHighPrecisionMask()) {
            const g = a._clippingIdCount
            for (let d = 0; d < g; d++) {
              const c = a._clippingIdList[d]
              e.getDrawableDynamicFlagVertexPositionsDidChange(c) && (t.setIsCulling(e.getDrawableCulling(c) != 0), this._clearedFrameBufferflags.at(a._bufferIndex) || (this.gl.clearColor(1, 1, 1, 1), this.gl.clear(this.gl.COLOR_BUFFER_BIT), this._clearedFrameBufferflags.set(a._bufferIndex, !0)), t.setClippingContextBufferForMask(a), t.drawMesh(e.getDrawableTextureIndex(c), e.getDrawableVertexIndexCount(c), e.getDrawableVertexCount(c), e.getDrawableVertexIndices(c), e.getDrawableVertices(c), e.getDrawableVertexUvs(c), e.getMultiplyColor(c), e.getScreenColor(c), e.getDrawableOpacity(c), se.CubismBlendMode_Normal, !1))
            }
          }
        }
        t.isUsingHighPrecisionMask() || (this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, Vt), t.setClippingContextBufferForMask(null), this.gl.viewport(ce[0], ce[1], ce[2], ce[3]))
      }
    }

    findSameClip(e, t) {
      for (let i = 0; i < this._clippingContextListForMask.getSize(); i++) {
        const r = this._clippingContextListForMask.at(i); const a = r._clippingIdCount
        if (a != t) 
continue;
        let o = 0
        for (let n = 0; n < a; n++) {
          const l = r._clippingIdList[n]
          for (let h = 0; h < a; h++) { if (e[h] == l) {
            o++;
            break;
          }
}
        }
        if (o == a) 
return r
      }
      return null
    }
    setupLayoutBounds(e) {
      const t = this._renderTextureCount <= 1 ? 36 : 32 * this._renderTextureCount
      if (e <= 0 || e > t) {
        e > t && X(`not supported mask count : {0}
[Details] render texture count : {1}, mask count : {2}`, e - t, this._renderTextureCount, e)
        for (let h = 0; h < this._clippingContextListForMask.getSize(); h++) {
          const u = this._clippingContextListForMask.at(h)
          u._layoutChannelNo = 0, u._layoutBounds.x = 0, u._layoutBounds.y = 0, u._layoutBounds.width = 1, u._layoutBounds.height = 1, u._bufferIndex = 0
        }
        return
      }
      const i = this._renderTextureCount <= 1 ? 9 : 8
      let r = e / this._renderTextureCount; let a = e % this._renderTextureCount
      r = ~~r, a = ~~a
      let o = r / 4; let n = r % 4
      o = ~~o, n = ~~n
      let l = 0
      for (let h = 0; h < this._renderTextureCount; h++) { for (let u = 0; u < 4; u++) {
        let _ = o + (u < n ? 1 : 0);
        if (_ < i && u == (n + 1 >= 4 ? 0 : n + 1) && (_ += h < a ? 1 : 0), _ != 0) if (_ == 1) {
          const g = this._clippingContextListForMask.at(l++);
          g._layoutChannelNo = u, g._layoutBounds.x = 0, g._layoutBounds.y = 0, g._layoutBounds.width = 1, g._layoutBounds.height = 1, g._bufferIndex = h;
        } else if (_ == 2) for (let g = 0; g < _; g++) {
          let d = g % 2;
          d = ~~d;
          const c = this._clippingContextListForMask.at(l++);
          c._layoutChannelNo = u, c._layoutBounds.x = 0.5 * d, c._layoutBounds.y = 0, c._layoutBounds.width = 0.5, c._layoutBounds.height = 1, c._bufferIndex = h;
        }
        else if (_ <= 4) for (let g = 0; g < _; g++) {
          let d = g % 2, c = g / 2;
          d = ~~d, c = ~~c;
          const m = this._clippingContextListForMask.at(l++);
          m._layoutChannelNo = u, m._layoutBounds.x = 0.5 * d, m._layoutBounds.y = 0.5 * c, m._layoutBounds.width = 0.5, m._layoutBounds.height = 0.5, m._bufferIndex = h;
        }
        else if (_ <= i) for (let g = 0; g < _; g++) {
          let d = g % 3, c = g / 3;
          d = ~~d, c = ~~c;
          const m = this._clippingContextListForMask.at(l++);
          m._layoutChannelNo = u, m._layoutBounds.x = d / 3, m._layoutBounds.y = c / 3, m._layoutBounds.width = 1 / 3, m._layoutBounds.height = 1 / 3, m._bufferIndex = h;
        }
        else {
          X(`not supported mask count : {0}
[Details] render texture count : {1}, mask count : {2}`, e - t, this._renderTextureCount, e);
          for (let g = 0; g < _; g++) {
            const d = this._clippingContextListForMask.at(l++);
            d._layoutChannelNo = 0, d._layoutBounds.x = 0, d._layoutBounds.y = 0, d._layoutBounds.width = 1, d._layoutBounds.height = 1, d._bufferIndex = 0;
          }
        }
      }
}
    }

    getColorBuffer() {
      return this._maskColorBuffers
    }
    getClippingContextListForDraw() {
      return this._clippingContextListForDraw
    }
    getClippingMaskCount() {
      return this._clippingContextListForMask.getSize()
    }
    setClippingMaskBufferSize(e) {
      this._clippingMaskBufferSize = e
    }
    getClippingMaskBufferSize() {
      return this._clippingMaskBufferSize
    }
    getRenderTextureCount() {
      return this._renderTextureCount
    }
  }
  class Rs {
    constructor(e, t) {
      this.frameNo = e, this.textures = t
    }
  }
  class Fs {
    constructor(e, t, i) {
      this._owner = e, this._clippingIdList = t, this._clippingIdCount = i, this._allClippedDrawRect = new Tt(), this._layoutBounds = new Tt(), this._clippedDrawableIndexList = [], this._matrixForMask = new O(), this._matrixForDraw = new O(), this._bufferIndex = 0
    }
    release() {
      this._layoutBounds != null && (this._layoutBounds = null), this._allClippedDrawRect != null && (this._allClippedDrawRect = null), this._clippedDrawableIndexList != null && (this._clippedDrawableIndexList = null)
    }
    addClippedDrawable(e) {
      this._clippedDrawableIndexList.push(e)
    }
    getClippingManager() {
      return this._owner
    }
    setGl(e) {
      this._owner.setGL(e)
    }
  }
  class Er {
    setGlEnable(e, t) {
      t ? this.gl.enable(e) : this.gl.disable(e)
    }
    setGlEnableVertexAttribArray(e, t) {
      t ? this.gl.enableVertexAttribArray(e) : this.gl.disableVertexAttribArray(e)
    }
    save() {
      this.gl != null
? (this._lastArrayBufferBinding = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING), this._lastArrayBufferBinding = this.gl.getParameter(this.gl.ELEMENT_ARRAY_BUFFER_BINDING), this._lastProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM), this._lastActiveTexture = this.gl.getParameter(this.gl.ACTIVE_TEXTURE), this.gl.activeTexture(this.gl.TEXTURE1), this._lastTexture1Binding2D = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D), this.gl.activeTexture(this.gl.TEXTURE0), this._lastTexture0Binding2D = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D), this._lastVertexAttribArrayEnabled[0] = this.gl.getVertexAttrib(0, this.gl.VERTEX_ATTRIB_ARRAY_ENABLED), this._lastVertexAttribArrayEnabled[1] = this.gl.getVertexAttrib(1, this.gl.VERTEX_ATTRIB_ARRAY_ENABLED), this._lastVertexAttribArrayEnabled[2] = this.gl.getVertexAttrib(2, this.gl.VERTEX_ATTRIB_ARRAY_ENABLED), this._lastVertexAttribArrayEnabled[3] = this.gl.getVertexAttrib(3, this.gl.VERTEX_ATTRIB_ARRAY_ENABLED), this._lastScissorTest = this.gl.isEnabled(this.gl.SCISSOR_TEST), this._lastStencilTest = this.gl.isEnabled(this.gl.STENCIL_TEST), this._lastDepthTest = this.gl.isEnabled(this.gl.DEPTH_TEST), this._lastCullFace = this.gl.isEnabled(this.gl.CULL_FACE), this._lastBlend = this.gl.isEnabled(this.gl.BLEND), this._lastFrontFace = this.gl.getParameter(this.gl.FRONT_FACE), this._lastColorMask = this.gl.getParameter(this.gl.COLOR_WRITEMASK), this._lastBlending[0] = this.gl.getParameter(this.gl.BLEND_SRC_RGB), this._lastBlending[1] = this.gl.getParameter(this.gl.BLEND_DST_RGB), this._lastBlending[2] = this.gl.getParameter(this.gl.BLEND_SRC_ALPHA), this._lastBlending[3] = this.gl.getParameter(this.gl.BLEND_DST_ALPHA), this._lastFBO = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING), this._lastViewport = this.gl.getParameter(this.gl.VIEWPORT))
: X(`'gl' is null. WebGLRenderingContext is required.
Please call 'CubimRenderer_WebGL.startUp' function.`)
    }
    restore() {
      this.gl != null
? (this.gl.useProgram(this._lastProgram), this.setGlEnableVertexAttribArray(0, this._lastVertexAttribArrayEnabled[0]), this.setGlEnableVertexAttribArray(1, this._lastVertexAttribArrayEnabled[1]), this.setGlEnableVertexAttribArray(2, this._lastVertexAttribArrayEnabled[2]), this.setGlEnableVertexAttribArray(3, this._lastVertexAttribArrayEnabled[3]), this.setGlEnable(this.gl.SCISSOR_TEST, this._lastScissorTest), this.setGlEnable(this.gl.STENCIL_TEST, this._lastStencilTest), this.setGlEnable(this.gl.DEPTH_TEST, this._lastDepthTest), this.setGlEnable(this.gl.CULL_FACE, this._lastCullFace), this.setGlEnable(this.gl.BLEND, this._lastBlend), this.gl.frontFace(this._lastFrontFace), this.gl.colorMask(this._lastColorMask[0], this._lastColorMask[1], this._lastColorMask[2], this._lastColorMask[3]), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._lastArrayBufferBinding), this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._lastElementArrayBufferBinding), this.gl.activeTexture(this.gl.TEXTURE1), this.gl.bindTexture(this.gl.TEXTURE_2D, this._lastTexture1Binding2D), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, this._lastTexture0Binding2D), this.gl.activeTexture(this._lastActiveTexture), this.gl.blendFuncSeparate(this._lastBlending[0], this._lastBlending[1], this._lastBlending[2], this._lastBlending[3]))
: X(`'gl' is null. WebGLRenderingContext is required.
Please call 'CubimRenderer_WebGL.startUp' function.`)
    }
    setGl(e) {
      this.gl = e
    }
    constructor() {
      this._lastVertexAttribArrayEnabled = new Array(4), this._lastColorMask = new Array(4), this._lastBlending = new Array(4), this._lastViewport = new Array(4)
    }
  }
  class Ue {
    static getInstance() {
      return Ie == null && (Ie = new Ue()), Ie
    }
    static deleteInstance() {
      Ie && (Ie.release(), Ie = null)
    }
    constructor() {
      this._shaderSets = new S()
    }
    release() {
      this.releaseShaderProgram()
    }
    setupShaderProgram(e, t, i, r, a, o, n, l, h, u, _, g, d, c, m) {
      let p, v, x, M
      if (d || X('NoPremultipliedAlpha is not allowed'), this._shaderSets.getSize() == 0 && this.generateShaders(), e.getClippingContextBufferForMask() != null) {
        const f = this._shaderSets.at(Te.ShaderNames_SetupMask)
        this.gl.useProgram(f.shaderProgram), this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, t), this.gl.uniform1i(f.samplerTexture0Location, 0), n.vertex == null && (n.vertex = this.gl.createBuffer()), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, n.vertex), this.gl.bufferData(this.gl.ARRAY_BUFFER, r, this.gl.DYNAMIC_DRAW), this.gl.enableVertexAttribArray(f.attributePositionLocation), this.gl.vertexAttribPointer(f.attributePositionLocation, 2, this.gl.FLOAT, !1, 0, 0), n.uv == null && (n.uv = this.gl.createBuffer()), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, n.uv), this.gl.bufferData(this.gl.ARRAY_BUFFER, o, this.gl.DYNAMIC_DRAW), this.gl.enableVertexAttribArray(f.attributeTexCoordLocation), this.gl.vertexAttribPointer(f.attributeTexCoordLocation, 2, this.gl.FLOAT, !1, 0, 0)
        const A = e.getClippingContextBufferForMask()._layoutChannelNo; const T = e.getClippingContextBufferForMask().getClippingManager().getChannelFlagAsColor(A)
        this.gl.uniform4f(f.uniformChannelFlagLocation, T.R, T.G, T.B, T.A), this.gl.uniformMatrix4fv(f.uniformClipMatrixLocation, !1, e.getClippingContextBufferForMask()._matrixForMask.getArray())
        const E = e.getClippingContextBufferForMask()._layoutBounds
        this.gl.uniform4f(f.uniformBaseColorLocation, 2 * E.x - 1, 2 * E.y - 1, 2 * E.getRight() - 1, 2 * E.getBottom() - 1), this.gl.uniform4f(f.uniformMultiplyColorLocation, _.R, _.G, _.B, _.A), this.gl.uniform4f(f.uniformScreenColorLocation, g.R, g.G, g.B, g.A), p = this.gl.ZERO, v = this.gl.ONE_MINUS_SRC_COLOR, x = this.gl.ZERO, M = this.gl.ONE_MINUS_SRC_ALPHA
      } else {
        const f = e.getClippingContextBufferForDraw() != null; const A = f ? m ? 2 : 1 : 0
        let T = new $t()
        switch (h) {
          case se.CubismBlendMode_Normal:
          default:
            T = this._shaderSets.at(Te.ShaderNames_NormalPremultipliedAlpha + A), p = this.gl.ONE, v = this.gl.ONE_MINUS_SRC_ALPHA, x = this.gl.ONE, M = this.gl.ONE_MINUS_SRC_ALPHA
            break;
          case se.CubismBlendMode_Additive:
            T = this._shaderSets.at(Te.ShaderNames_AddPremultipliedAlpha + A), p = this.gl.ONE, v = this.gl.ONE, x = this.gl.ZERO, M = this.gl.ONE
            break;
          case se.CubismBlendMode_Multiplicative:
            T = this._shaderSets.at(Te.ShaderNames_MultPremultipliedAlpha + A), p = this.gl.DST_COLOR, v = this.gl.ONE_MINUS_SRC_ALPHA, x = this.gl.ZERO, M = this.gl.ONE
        }
        if (this.gl.useProgram(T.shaderProgram), n.vertex == null && (n.vertex = this.gl.createBuffer()), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, n.vertex), this.gl.bufferData(this.gl.ARRAY_BUFFER, r, this.gl.DYNAMIC_DRAW), this.gl.enableVertexAttribArray(T.attributePositionLocation), this.gl.vertexAttribPointer(T.attributePositionLocation, 2, this.gl.FLOAT, !1, 0, 0), n.uv == null && (n.uv = this.gl.createBuffer()), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, n.uv), this.gl.bufferData(this.gl.ARRAY_BUFFER, o, this.gl.DYNAMIC_DRAW), this.gl.enableVertexAttribArray(T.attributeTexCoordLocation), this.gl.vertexAttribPointer(T.attributeTexCoordLocation, 2, this.gl.FLOAT, !1, 0, 0), f) {
          this.gl.activeTexture(this.gl.TEXTURE1)
          const E = e.getClippingContextBufferForDraw().getClippingManager().getColorBuffer().at(e.getClippingContextBufferForDraw()._bufferIndex)
          this.gl.bindTexture(this.gl.TEXTURE_2D, E), this.gl.uniform1i(T.samplerTexture1Location, 1), this.gl.uniformMatrix4fv(T.uniformClipMatrixLocation, !1, e.getClippingContextBufferForDraw()._matrixForDraw.getArray())
          const I = e.getClippingContextBufferForDraw()._layoutChannelNo; const z = e.getClippingContextBufferForDraw().getClippingManager().getChannelFlagAsColor(I)
          this.gl.uniform4f(T.uniformChannelFlagLocation, z.R, z.G, z.B, z.A)
        }
        this.gl.activeTexture(this.gl.TEXTURE0), this.gl.bindTexture(this.gl.TEXTURE_2D, t), this.gl.uniform1i(T.samplerTexture0Location, 0), this.gl.uniformMatrix4fv(T.uniformMatrixLocation, !1, c.getArray()), this.gl.uniform4f(T.uniformBaseColorLocation, u.R, u.G, u.B, u.A), this.gl.uniform4f(T.uniformMultiplyColorLocation, _.R, _.G, _.B, _.A), this.gl.uniform4f(T.uniformScreenColorLocation, g.R, g.G, g.B, g.A)
      }
      n.index == null && (n.index = this.gl.createBuffer()), this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, n.index), this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, a, this.gl.DYNAMIC_DRAW), this.gl.blendFuncSeparate(p, v, x, M)
    }
    releaseShaderProgram() {
      for (let e = 0; e < this._shaderSets.getSize(); e++) this.gl.deleteProgram(this._shaderSets.at(e).shaderProgram), this._shaderSets.at(e).shaderProgram = 0, this._shaderSets.set(e, void 0), this._shaderSets.set(e, null)
    }
    generateShaders() {
      for (let e = 0; e < 10; e++) this._shaderSets.pushBack(new $t())
      this._shaderSets.at(0).shaderProgram = this.loadShaderProgram(Rr, Fr), this._shaderSets.at(1).shaderProgram = this.loadShaderProgram(Lr, Ar), this._shaderSets.at(2).shaderProgram = this.loadShaderProgram(Ls, Dr), this._shaderSets.at(3).shaderProgram = this.loadShaderProgram(Ls, kr), this._shaderSets.at(4).shaderProgram = this._shaderSets.at(1).shaderProgram, this._shaderSets.at(5).shaderProgram = this._shaderSets.at(2).shaderProgram, this._shaderSets.at(6).shaderProgram = this._shaderSets.at(3).shaderProgram, this._shaderSets.at(7).shaderProgram = this._shaderSets.at(1).shaderProgram, this._shaderSets.at(8).shaderProgram = this._shaderSets.at(2).shaderProgram, this._shaderSets.at(9).shaderProgram = this._shaderSets.at(3).shaderProgram, this._shaderSets.at(0).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(0).shaderProgram, 'a_position'), this._shaderSets.at(0).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(0).shaderProgram, 'a_texCoord'), this._shaderSets.at(0).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(0).shaderProgram, 's_texture0'), this._shaderSets.at(0).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(0).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(0).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(0).shaderProgram, 'u_channelFlag'), this._shaderSets.at(0).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(0).shaderProgram, 'u_baseColor'), this._shaderSets.at(0).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(0).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(0).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(0).shaderProgram, 'u_screenColor'), this._shaderSets.at(1).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(1).shaderProgram, 'a_position'), this._shaderSets.at(1).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(1).shaderProgram, 'a_texCoord'), this._shaderSets.at(1).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(1).shaderProgram, 's_texture0'), this._shaderSets.at(1).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(1).shaderProgram, 'u_matrix'), this._shaderSets.at(1).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(1).shaderProgram, 'u_baseColor'), this._shaderSets.at(1).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(1).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(1).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(1).shaderProgram, 'u_screenColor'), this._shaderSets.at(2).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(2).shaderProgram, 'a_position'), this._shaderSets.at(2).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(2).shaderProgram, 'a_texCoord'), this._shaderSets.at(2).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 's_texture0'), this._shaderSets.at(2).samplerTexture1Location = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 's_texture1'), this._shaderSets.at(2).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 'u_matrix'), this._shaderSets.at(2).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(2).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 'u_channelFlag'), this._shaderSets.at(2).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 'u_baseColor'), this._shaderSets.at(2).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(2).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(2).shaderProgram, 'u_screenColor'), this._shaderSets.at(3).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(3).shaderProgram, 'a_position'), this._shaderSets.at(3).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(3).shaderProgram, 'a_texCoord'), this._shaderSets.at(3).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 's_texture0'), this._shaderSets.at(3).samplerTexture1Location = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 's_texture1'), this._shaderSets.at(3).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 'u_matrix'), this._shaderSets.at(3).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(3).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 'u_channelFlag'), this._shaderSets.at(3).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 'u_baseColor'), this._shaderSets.at(3).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(3).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(3).shaderProgram, 'u_screenColor'), this._shaderSets.at(4).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(4).shaderProgram, 'a_position'), this._shaderSets.at(4).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(4).shaderProgram, 'a_texCoord'), this._shaderSets.at(4).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(4).shaderProgram, 's_texture0'), this._shaderSets.at(4).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(4).shaderProgram, 'u_matrix'), this._shaderSets.at(4).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(4).shaderProgram, 'u_baseColor'), this._shaderSets.at(4).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(4).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(4).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(4).shaderProgram, 'u_screenColor'), this._shaderSets.at(5).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(5).shaderProgram, 'a_position'), this._shaderSets.at(5).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(5).shaderProgram, 'a_texCoord'), this._shaderSets.at(5).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 's_texture0'), this._shaderSets.at(5).samplerTexture1Location = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 's_texture1'), this._shaderSets.at(5).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 'u_matrix'), this._shaderSets.at(5).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(5).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 'u_channelFlag'), this._shaderSets.at(5).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 'u_baseColor'), this._shaderSets.at(5).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(5).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(5).shaderProgram, 'u_screenColor'), this._shaderSets.at(6).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(6).shaderProgram, 'a_position'), this._shaderSets.at(6).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(6).shaderProgram, 'a_texCoord'), this._shaderSets.at(6).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 's_texture0'), this._shaderSets.at(6).samplerTexture1Location = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 's_texture1'), this._shaderSets.at(6).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 'u_matrix'), this._shaderSets.at(6).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(6).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 'u_channelFlag'), this._shaderSets.at(6).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 'u_baseColor'), this._shaderSets.at(6).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(6).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(6).shaderProgram, 'u_screenColor'), this._shaderSets.at(7).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(7).shaderProgram, 'a_position'), this._shaderSets.at(7).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(7).shaderProgram, 'a_texCoord'), this._shaderSets.at(7).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(7).shaderProgram, 's_texture0'), this._shaderSets.at(7).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(7).shaderProgram, 'u_matrix'), this._shaderSets.at(7).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(7).shaderProgram, 'u_baseColor'), this._shaderSets.at(7).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(7).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(7).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(7).shaderProgram, 'u_screenColor'), this._shaderSets.at(8).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(8).shaderProgram, 'a_position'), this._shaderSets.at(8).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(8).shaderProgram, 'a_texCoord'), this._shaderSets.at(8).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 's_texture0'), this._shaderSets.at(8).samplerTexture1Location = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 's_texture1'), this._shaderSets.at(8).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 'u_matrix'), this._shaderSets.at(8).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(8).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 'u_channelFlag'), this._shaderSets.at(8).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 'u_baseColor'), this._shaderSets.at(8).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(8).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(8).shaderProgram, 'u_screenColor'), this._shaderSets.at(9).attributePositionLocation = this.gl.getAttribLocation(this._shaderSets.at(9).shaderProgram, 'a_position'), this._shaderSets.at(9).attributeTexCoordLocation = this.gl.getAttribLocation(this._shaderSets.at(9).shaderProgram, 'a_texCoord'), this._shaderSets.at(9).samplerTexture0Location = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 's_texture0'), this._shaderSets.at(9).samplerTexture1Location = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 's_texture1'), this._shaderSets.at(9).uniformMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 'u_matrix'), this._shaderSets.at(9).uniformClipMatrixLocation = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 'u_clipMatrix'), this._shaderSets.at(9).uniformChannelFlagLocation = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 'u_channelFlag'), this._shaderSets.at(9).uniformBaseColorLocation = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 'u_baseColor'), this._shaderSets.at(9).uniformMultiplyColorLocation = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 'u_multiplyColor'), this._shaderSets.at(9).uniformScreenColorLocation = this.gl.getUniformLocation(this._shaderSets.at(9).shaderProgram, 'u_screenColor');
    }

    loadShaderProgram(e, t) {
      let i = this.gl.createProgram(); let r = this.compileShaderSource(this.gl.VERTEX_SHADER, e)
      if (!r) 
return X('Vertex shader compile error!'), 0
      let a = this.compileShaderSource(this.gl.FRAGMENT_SHADER, t)
      return a ? (this.gl.attachShader(i, r), this.gl.attachShader(i, a), this.gl.linkProgram(i), this.gl.getProgramParameter(i, this.gl.LINK_STATUS) ? (this.gl.deleteShader(r), this.gl.deleteShader(a), i) : (X('Failed to link program: {0}', i), this.gl.deleteShader(r), r = 0, this.gl.deleteShader(a), a = 0, i && (this.gl.deleteProgram(i), i = 0), 0)) : (X('Vertex shader compile error!'), 0)
    }
    compileShaderSource(e, t) {
      const i = t; const r = this.gl.createShader(e)
      if (this.gl.shaderSource(r, i), this.gl.compileShader(r), !r) {
        const a = this.gl.getShaderInfoLog(r)
        X('Shader compile log: {0} ', a)
      }
      return this.gl.getShaderParameter(r, this.gl.COMPILE_STATUS) ? r : (this.gl.deleteShader(r), null)
    }
    setGl(e) {
      this.gl = e
    }
  }
  class $t {
  }
  let Te;
  (function (s) {
    s[s.ShaderNames_SetupMask = 0] = 'ShaderNames_SetupMask', s[s.ShaderNames_NormalPremultipliedAlpha = 1] = 'ShaderNames_NormalPremultipliedAlpha', s[s.ShaderNames_NormalMaskedPremultipliedAlpha = 2] = 'ShaderNames_NormalMaskedPremultipliedAlpha', s[s.ShaderNames_NomralMaskedInvertedPremultipliedAlpha = 3] = 'ShaderNames_NomralMaskedInvertedPremultipliedAlpha', s[s.ShaderNames_AddPremultipliedAlpha = 4] = 'ShaderNames_AddPremultipliedAlpha', s[s.ShaderNames_AddMaskedPremultipliedAlpha = 5] = 'ShaderNames_AddMaskedPremultipliedAlpha', s[s.ShaderNames_AddMaskedPremultipliedAlphaInverted = 6] = 'ShaderNames_AddMaskedPremultipliedAlphaInverted', s[s.ShaderNames_MultPremultipliedAlpha = 7] = 'ShaderNames_MultPremultipliedAlpha', s[s.ShaderNames_MultMaskedPremultipliedAlpha = 8] = 'ShaderNames_MultMaskedPremultipliedAlpha', s[s.ShaderNames_MultMaskedPremultipliedAlphaInverted = 9] = 'ShaderNames_MultMaskedPremultipliedAlphaInverted';
  })(Te || (Te = {}))
  const Rr = 'attribute vec4     a_position;attribute vec2     a_texCoord;varying vec2       v_texCoord;varying vec4       v_myPos;uniform mat4       u_clipMatrix;void main(){   gl_Position = u_clipMatrix * a_position;   v_myPos = u_clipMatrix * a_position;   v_texCoord = a_texCoord;   v_texCoord.y = 1.0 - v_texCoord.y;}', Fr = 'precision mediump float;varying vec2       v_texCoord;varying vec4       v_myPos;uniform vec4       u_baseColor;uniform vec4       u_channelFlag;uniform sampler2D  s_texture0;void main(){   float isInside =        step(u_baseColor.x, v_myPos.x/v_myPos.w)       * step(u_baseColor.y, v_myPos.y/v_myPos.w)       * step(v_myPos.x/v_myPos.w, u_baseColor.z)       * step(v_myPos.y/v_myPos.w, u_baseColor.w);   gl_FragColor = u_channelFlag * texture2D(s_texture0, v_texCoord).a * isInside;}', Lr = 'attribute vec4     a_position;attribute vec2     a_texCoord;varying vec2       v_texCoord;uniform mat4       u_matrix;void main(){   gl_Position = u_matrix * a_position;   v_texCoord = a_texCoord;   v_texCoord.y = 1.0 - v_texCoord.y;}', Ls = 'attribute vec4     a_position;attribute vec2     a_texCoord;varying vec2       v_texCoord;varying vec4       v_clipPos;uniform mat4       u_matrix;uniform mat4       u_clipMatrix;void main(){   gl_Position = u_matrix * a_position;   v_clipPos = u_clipMatrix * a_position;   v_texCoord = a_texCoord;   v_texCoord.y = 1.0 - v_texCoord.y;}', Ar = 'precision mediump float;varying vec2       v_texCoord;uniform vec4       u_baseColor;uniform sampler2D  s_texture0;uniform vec4       u_multiplyColor;uniform vec4       u_screenColor;void main(){   vec4 texColor = texture2D(s_texture0, v_texCoord);   texColor.rgb = texColor.rgb * u_multiplyColor.rgb;   texColor.rgb = (texColor.rgb + u_screenColor.rgb * texColor.a) - (texColor.rgb * u_screenColor.rgb);   vec4 color = texColor * u_baseColor;   gl_FragColor = vec4(color.rgb, color.a);}', Dr = 'precision mediump float;varying vec2       v_texCoord;varying vec4       v_clipPos;uniform vec4       u_baseColor;uniform vec4       u_channelFlag;uniform sampler2D  s_texture0;uniform sampler2D  s_texture1;uniform vec4       u_multiplyColor;uniform vec4       u_screenColor;void main(){   vec4 texColor = texture2D(s_texture0, v_texCoord);   texColor.rgb = texColor.rgb * u_multiplyColor.rgb;   texColor.rgb = (texColor.rgb + u_screenColor.rgb * texColor.a) - (texColor.rgb * u_screenColor.rgb);   vec4 col_formask = texColor * u_baseColor;   vec4 clipMask = (1.0 - texture2D(s_texture1, v_clipPos.xy / v_clipPos.w)) * u_channelFlag;   float maskVal = clipMask.r + clipMask.g + clipMask.b + clipMask.a;   col_formask = col_formask * maskVal;   gl_FragColor = col_formask;}', kr = 'precision mediump float;varying vec2      v_texCoord;varying vec4      v_clipPos;uniform sampler2D s_texture0;uniform sampler2D s_texture1;uniform vec4      u_channelFlag;uniform vec4      u_baseColor;uniform vec4      u_multiplyColor;uniform vec4      u_screenColor;void main(){   vec4 texColor = texture2D(s_texture0, v_texCoord);   texColor.rgb = texColor.rgb * u_multiplyColor.rgb;   texColor.rgb = (texColor.rgb + u_screenColor.rgb * texColor.a) - (texColor.rgb * u_screenColor.rgb);   vec4 col_formask = texColor * u_baseColor;   vec4 clipMask = (1.0 - texture2D(s_texture1, v_clipPos.xy / v_clipPos.w)) * u_channelFlag;   float maskVal = clipMask.r + clipMask.g + clipMask.b + clipMask.a;   col_formask = col_formask * (1.0 - maskVal);   gl_FragColor = col_formask;}';
  class Jt extends dt {
    initialize(e, t = 1) {
      e.isUsingMasking() && (this._clippingManager = new Wt(), this._clippingManager.initialize(e, e.getDrawableCount(), e.getDrawableMasks(), e.getDrawableMaskCounts(), t)), this._sortedDrawableIndexList.resize(e.getDrawableCount(), 0), super.initialize(e)
    }
    bindTexture(e, t) {
      this._textures.setValue(e, t)
    }
    getBindedTextures() {
      return this._textures
    }
    setClippingMaskBufferSize(e) {
      if (!this._model.isUsingMasking()) 
return;
      const t = this._clippingManager.getRenderTextureCount()
      this._clippingManager.release(), this._clippingManager = void 0, this._clippingManager = null, this._clippingManager = new Wt(), this._clippingManager.setClippingMaskBufferSize(e), this._clippingManager.initialize(this.getModel(), this.getModel().getDrawableCount(), this.getModel().getDrawableMasks(), this.getModel().getDrawableMaskCounts(), t)
    }
    getClippingMaskBufferSize() {
      return this._model.isUsingMasking() ? this._clippingManager.getClippingMaskBufferSize() : -1
    }
    getRenderTextureCount() {
      return this._model.isUsingMasking() ? this._clippingManager.getRenderTextureCount() : -1
    }
    constructor() {
      super(), this._clippingContextBufferForMask = null, this._clippingContextBufferForDraw = null, this._rendererProfile = new Er(), this.firstDraw = !0, this._textures = new G(), this._sortedDrawableIndexList = new S(), this._bufferData = { vertex: WebGLBuffer = null, uv: WebGLBuffer = null, index: WebGLBuffer = null }, this._textures.prepareCapacity(32, !0)
    }
    release() {
      this._clippingManager && (this._clippingManager.release(), this._clippingManager = void 0, this._clippingManager = null), this.gl != null && (this.gl.deleteBuffer(this._bufferData.vertex), this._bufferData.vertex = null, this.gl.deleteBuffer(this._bufferData.uv), this._bufferData.uv = null, this.gl.deleteBuffer(this._bufferData.index), this._bufferData.index = null, this._bufferData = null, this._textures = null)
    }
    doDrawModel() {
      if (this.gl == null) { return void X(`'gl' is null. WebGLRenderingContext is required.
Please call 'CubimRenderer_WebGL.startUp' function.`);
}
      this._clippingManager != null && (this.preDraw(), this._clippingManager.setupClippingContext(this.getModel(), this)), this.preDraw()
      const e = this.getModel().getDrawableCount(); const t = this.getModel().getDrawableRenderOrders()
      for (let i = 0; i < e; ++i) {
        const r = t[i]
        this._sortedDrawableIndexList.set(r, i)
      }
      for (let i = 0; i < e; ++i) {
        const r = this._sortedDrawableIndexList.at(i)
        if (!this.getModel().getDrawableDynamicFlagIsVisible(r)) 
continue;
        const a = this._clippingManager != null ? this._clippingManager.getClippingContextListForDraw().at(r) : null
        if (a != null && this.isUsingHighPrecisionMask()) {
          a._isUsing && (this.gl.viewport(0, 0, this._clippingManager.getClippingMaskBufferSize(), this._clippingManager.getClippingMaskBufferSize()), this.preDraw(), this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, a.getClippingManager().getMaskRenderTexture().at(a._bufferIndex)), this.gl.clearColor(1, 1, 1, 1), this.gl.clear(this.gl.COLOR_BUFFER_BIT))
          {
            const o = a._clippingIdCount
            for (let n = 0; n < o; n++) {
              const l = a._clippingIdList[n]
              this._model.getDrawableDynamicFlagVertexPositionsDidChange(l) && (this.setIsCulling(this._model.getDrawableCulling(l) != 0), this.setClippingContextBufferForMask(a), this.drawMesh(this.getModel().getDrawableTextureIndex(l), this.getModel().getDrawableVertexIndexCount(l), this.getModel().getDrawableVertexCount(l), this.getModel().getDrawableVertexIndices(l), this.getModel().getDrawableVertices(l), this.getModel().getDrawableVertexUvs(l), this.getModel().getMultiplyColor(l), this.getModel().getScreenColor(l), this.getModel().getDrawableOpacity(l), se.CubismBlendMode_Normal, !1))
            }
          }
          this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, Vt), this.setClippingContextBufferForMask(null), this.gl.viewport(ce[0], ce[1], ce[2], ce[3]), this.preDraw()
        }
        this.setClippingContextBufferForDraw(a), this.setIsCulling(this.getModel().getDrawableCulling(r)), this.drawMesh(this.getModel().getDrawableTextureIndex(r), this.getModel().getDrawableVertexIndexCount(r), this.getModel().getDrawableVertexCount(r), this.getModel().getDrawableVertexIndices(r), this.getModel().getDrawableVertices(r), this.getModel().getDrawableVertexUvs(r), this.getModel().getMultiplyColor(r), this.getModel().getScreenColor(r), this.getModel().getDrawableOpacity(r), this.getModel().getDrawableBlendMode(r), this.getModel().getDrawableInvertedMaskBit(r))
      }
    }

    drawMesh(e, t, i, r, a, o, n, l, h, u, _) {
      this.isCulling() ? this.gl.enable(this.gl.CULL_FACE) : this.gl.disable(this.gl.CULL_FACE), this.gl.frontFace(this.gl.CCW)
      const g = this.getModelColor()
      let d
      this.getClippingContextBufferForMask() == null && (g.A *= h, this.isPremultipliedAlpha() && (g.R *= g.A, g.G *= g.A, g.B *= g.A)), d = this._textures.getValue(e) != null ? this._textures.getValue(e) : null, Ue.getInstance().setupShaderProgram(this, d, i, a, r, o, this._bufferData, h, u, g, n, l, this.isPremultipliedAlpha(), this.getMvpMatrix(), _), this.gl.drawElements(this.gl.TRIANGLES, t, this.gl.UNSIGNED_SHORT, 0), this.gl.useProgram(null), this.setClippingContextBufferForDraw(null), this.setClippingContextBufferForMask(null)
    }
    saveProfile() {
      this._rendererProfile.save()
    }
    restoreProfile() {
      this._rendererProfile.restore()
    }
    static doStaticRelease() {
      Ue.deleteInstance()
    }
    setRenderState(e, t) {
      Vt = e, ce = t
    }
    preDraw() {
      if (this.firstDraw && (this.firstDraw = !1), this.gl.disable(this.gl.SCISSOR_TEST), this.gl.disable(this.gl.STENCIL_TEST), this.gl.disable(this.gl.DEPTH_TEST), this.gl.frontFace(this.gl.CW), this.gl.enable(this.gl.BLEND), this.gl.colorMask(!0, !0, !0, !0), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null), this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null), this.getAnisotropy() > 0 && this._extension) { for (let e = 0; e < this._textures.getSize(); ++e) this.gl.bindTexture(this.gl.TEXTURE_2D, this._textures.getValue(e)), this.gl.texParameterf(this.gl.TEXTURE_2D, this._extension.TEXTURE_MAX_ANISOTROPY_EXT, this.getAnisotropy());
}
    }

    setClippingContextBufferForMask(e) {
      this._clippingContextBufferForMask = e
    }
    getClippingContextBufferForMask() {
      return this._clippingContextBufferForMask
    }
    setClippingContextBufferForDraw(e) {
      this._clippingContextBufferForDraw = e
    }
    getClippingContextBufferForDraw() {
      return this._clippingContextBufferForDraw
    }
    startUp(e) {
      this.gl = e, this._clippingManager && this._clippingManager.setGL(e), Ue.getInstance().setGl(e), this._rendererProfile.setGl(e), this._extension = this.gl.getExtension('EXT_texture_filter_anisotropic') || this.gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || this.gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
    }
  }
  let As, Ds, ks
  dt.staticRelease = () => {
    Jt.doStaticRelease()
  }, (function(s) {
    s.CubismClippingContext = Fs, s.CubismClippingManager_WebGL = Wt, s.CubismRenderTextureResource = Rs, s.CubismRenderer_WebGL = Jt, s.CubismShaderSet = $t, s.CubismShader_WebGL = Ue, s.ShaderNames = Te;
  }(As || (As = {})));
  class Os {
    constructor(e = !1, t = new H()) {
      this.isOverwritten = e, this.Color = t
    }
  }
  class Ns {
    constructor(e = !1, t = new H()) {
      this.isOverwritten = e, this.Color = t
    }
  }
  class Or {
    constructor(e = !1, t = !1) {
      this.isOverwritten = e, this.isCulling = t
    }
  }
  class Us {
    update() {
      this._model.update(), this._model.drawables.resetDynamicFlags()
    }
    getPixelsPerUnit() {
      return this._model == null ? 0 : this._model.canvasinfo.PixelsPerUnit
    }
    getCanvasWidth() {
      return this._model == null ? 0 : this._model.canvasinfo.CanvasWidth / this._model.canvasinfo.PixelsPerUnit
    }
    getCanvasHeight() {
      return this._model == null ? 0 : this._model.canvasinfo.CanvasHeight / this._model.canvasinfo.PixelsPerUnit
    }
    saveParameters() {
      const e = this._model.parameters.count; const t = this._savedParameters.getSize()
      for (let i = 0; i < e; ++i) i < t ? this._savedParameters.set(i, this._parameterValues[i]) : this._savedParameters.pushBack(this._parameterValues[i])
    }
    getMultiplyColor(e) {
      return this.getOverwriteFlagForModelMultiplyColors() || this.getOverwriteFlagForDrawableMultiplyColors(e) ? this._userMultiplyColors.at(e).Color : this.getDrawableMultiplyColor(e)
    }
    getScreenColor(e) {
      return this.getOverwriteFlagForModelScreenColors() || this.getOverwriteFlagForDrawableScreenColors(e) ? this._userScreenColors.at(e).Color : this.getDrawableScreenColor(e)
    }
    setMultiplyColorByTextureColor(e, t) {
      this.setMultiplyColorByRGBA(e, t.R, t.G, t.B, t.A)
    }
    setMultiplyColorByRGBA(e, t, i, r, a = 1) {
      this._userMultiplyColors.at(e).Color.R = t, this._userMultiplyColors.at(e).Color.G = i, this._userMultiplyColors.at(e).Color.B = r, this._userMultiplyColors.at(e).Color.A = a
    }
    setScreenColorByTextureColor(e, t) {
      this.setScreenColorByRGBA(e, t.R, t.G, t.B, t.A)
    }
    setScreenColorByRGBA(e, t, i, r, a = 1) {
      this._userScreenColors.at(e).Color.R = t, this._userScreenColors.at(e).Color.G = i, this._userScreenColors.at(e).Color.B = r, this._userScreenColors.at(e).Color.A = a
    }
    getPartMultiplyColor(e) {
      return this._userPartMultiplyColors.at(e).Color
    }
    getPartScreenColor(e) {
      return this._userPartScreenColors.at(e).Color
    }
    setPartColor(e, t, i, r, a, o, n) {
      if (o.at(e).Color.R = t, o.at(e).Color.G = i, o.at(e).Color.B = r, o.at(e).Color.A = a, o.at(e).isOverwritten) { for (let l = 0; l < this._partChildDrawables.at(e).getSize(); ++l) {
        const h = this._partChildDrawables.at(e).at(l);
        n.at(h).Color.R = t, n.at(h).Color.G = i, n.at(h).Color.B = r, n.at(h).Color.A = a;
      }
}
    }

    setPartMultiplyColorByTextureColor(e, t) {
      this.setPartMultiplyColorByRGBA(e, t.R, t.G, t.B, t.A)
    }
    setPartMultiplyColorByRGBA(e, t, i, r, a) {
      this.setPartColor(e, t, i, r, a, this._userPartMultiplyColors, this._userMultiplyColors)
    }
    setPartScreenColorByTextureColor(e, t) {
      this.setPartScreenColorByRGBA(e, t.R, t.G, t.B, t.A)
    }
    setPartScreenColorByRGBA(e, t, i, r, a) {
      this.setPartColor(e, t, i, r, a, this._userPartScreenColors, this._userScreenColors)
    }
    getOverwriteFlagForModelMultiplyColors() {
      return this._isOverwrittenModelMultiplyColors
    }
    getOverwriteFlagForModelScreenColors() {
      return this._isOverwrittenModelScreenColors
    }
    setOverwriteFlagForModelMultiplyColors(e) {
      this._isOverwrittenModelMultiplyColors = e
    }
    setOverwriteFlagForModelScreenColors(e) {
      this._isOverwrittenModelScreenColors = e
    }
    getOverwriteFlagForDrawableMultiplyColors(e) {
      return this._userMultiplyColors.at(e).isOverwritten
    }
    getOverwriteFlagForDrawableScreenColors(e) {
      return this._userScreenColors.at(e).isOverwritten
    }
    setOverwriteFlagForDrawableMultiplyColors(e, t) {
      this._userMultiplyColors.at(e).isOverwritten = t
    }
    setOverwriteFlagForDrawableScreenColors(e, t) {
      this._userScreenColors.at(e).isOverwritten = t
    }
    getOverwriteColorForPartMultiplyColors(e) {
      return this._userPartMultiplyColors.at(e).isOverwritten
    }
    getOverwriteColorForPartScreenColors(e) {
      return this._userPartScreenColors.at(e).isOverwritten
    }
    setOverwriteColorForPartColors(e, t, i, r) {
      i.at(e).isOverwritten = t
      for (let a = 0; a < this._partChildDrawables.at(e).getSize(); ++a) {
        const o = this._partChildDrawables.at(e).at(a)
        r.at(o).isOverwritten = t, t && (r.at(o).Color.R = i.at(e).Color.R, r.at(o).Color.G = i.at(e).Color.G, r.at(o).Color.B = i.at(e).Color.B, r.at(o).Color.A = i.at(e).Color.A)
      }
    }

    setOverwriteColorForPartMultiplyColors(e, t) {
      this._userPartMultiplyColors.at(e).isOverwritten = t, this.setOverwriteColorForPartColors(e, t, this._userPartMultiplyColors, this._userMultiplyColors)
    }
    setOverwriteColorForPartScreenColors(e, t) {
      this._userPartScreenColors.at(e).isOverwritten = t, this.setOverwriteColorForPartColors(e, t, this._userPartScreenColors, this._userScreenColors)
    }
    getDrawableCulling(e) {
      if (this.getOverwriteFlagForModelCullings() || this.getOverwriteFlagForDrawableCullings(e)) 
return this._userCullings.at(e).isCulling
      const t = this._model.drawables.constantFlags
      return !Live2DCubismCore.Utils.hasIsDoubleSidedBit(t[e])
    }
    setDrawableCulling(e, t) {
      this._userCullings.at(e).isCulling = t
    }
    getOverwriteFlagForModelCullings() {
      return this._isOverwrittenCullings
    }
    setOverwriteFlagForModelCullings(e) {
      this._isOverwrittenCullings = e
    }
    getOverwriteFlagForDrawableCullings(e) {
      return this._userCullings.at(e).isOverwritten
    }
    setOverwriteFlagForDrawableCullings(e, t) {
      this._userCullings.at(e).isOverwritten = t
    }
    getModelOapcity() {
      return this._modelOpacity
    }
    setModelOapcity(e) {
      this._modelOpacity = e
    }
    getModel() {
      return this._model
    }
    getPartIndex(e) {
      let t
      const i = this._model.parts.count
      for (t = 0; t < i; ++t) { if (e == this._partIds.at(t)) return t;
}
      return this._notExistPartId.isExist(e) ? this._notExistPartId.getValue(e) : (t = i + this._notExistPartId.getSize(), this._notExistPartId.setValue(e, t), this._notExistPartOpacities.appendKey(t), t)
    }
    getPartId(e) {
      const t = this._model.parts.ids[e]
      return V.getIdManager().getId(t)
    }
    getPartCount() {
      return this._model.parts.count
    }
    setPartOpacityByIndex(e, t) {
      this._notExistPartOpacities.isExist(e) ? this._notExistPartOpacities.setValue(e, t) : (re(e >= 0 && e < this.getPartCount()), this._partOpacities[e] = t)
    }
    setPartOpacityById(e, t) {
      const i = this.getPartIndex(e)
      i < 0 || this.setPartOpacityByIndex(i, t)
    }
    getPartOpacityByIndex(e) {
      return this._notExistPartOpacities.isExist(e) ? this._notExistPartOpacities.getValue(e) : (re(e >= 0 && e < this.getPartCount()), this._partOpacities[e])
    }
    getPartOpacityById(e) {
      const t = this.getPartIndex(e)
      return t < 0 ? 0 : this.getPartOpacityByIndex(t)
    }
    getParameterIndex(e) {
      let t
      const i = this._model.parameters.count
      for (t = 0; t < i; ++t) { if (e == this._parameterIds.at(t)) return t;
}
      return this._notExistParameterId.isExist(e) ? this._notExistParameterId.getValue(e) : (t = this._model.parameters.count + this._notExistParameterId.getSize(), this._notExistParameterId.setValue(e, t), this._notExistParameterValues.appendKey(t), t)
    }
    getParameterCount() {
      return this._model.parameters.count
    }
    getParameterType(e) {
      return this._model.parameters.types[e]
    }
    getParameterMaximumValue(e) {
      return this._model.parameters.maximumValues[e]
    }
    getParameterMinimumValue(e) {
      return this._model.parameters.minimumValues[e]
    }
    getParameterDefaultValue(e) {
      return this._model.parameters.defaultValues[e]
    }
    getParameterValueByIndex(e) {
      return this._notExistParameterValues.isExist(e) ? this._notExistParameterValues.getValue(e) : (re(e >= 0 && e < this.getParameterCount()), this._parameterValues[e])
    }
    getParameterValueById(e) {
      const t = this.getParameterIndex(e)
      return this.getParameterValueByIndex(t)
    }
    setParameterValueByIndex(e, t, i = 1) {
      this._notExistParameterValues.isExist(e) ? this._notExistParameterValues.setValue(e, i == 1 ? t : this._notExistParameterValues.getValue(e) * (1 - i) + t * i) : (re(e >= 0 && e < this.getParameterCount()), this._model.parameters.maximumValues[e] < t && (t = this._model.parameters.maximumValues[e]), this._model.parameters.minimumValues[e] > t && (t = this._model.parameters.minimumValues[e]), this._parameterValues[e] = i == 1 ? t : this._parameterValues[e] = this._parameterValues[e] * (1 - i) + t * i)
    }
    setParameterValueById(e, t, i = 1) {
      const r = this.getParameterIndex(e)
      this.setParameterValueByIndex(r, t, i)
    }
    addParameterValueByIndex(e, t, i = 1) {
      this.setParameterValueByIndex(e, this.getParameterValueByIndex(e) + t * i)
    }
    addParameterValueById(e, t, i = 1) {
      const r = this.getParameterIndex(e)
      this.addParameterValueByIndex(r, t, i)
    }
    multiplyParameterValueById(e, t, i = 1) {
      const r = this.getParameterIndex(e)
      this.multiplyParameterValueByIndex(r, t, i)
    }
    multiplyParameterValueByIndex(e, t, i = 1) {
      this.setParameterValueByIndex(e, this.getParameterValueByIndex(e) * (1 + (t - 1) * i))
    }
    getDrawableIndex(e) {
      const t = this._model.drawables.count
      for (let i = 0; i < t; ++i) { if (this._drawableIds.at(i) == e) return i;
}
      return -1
    }
    getDrawableCount() {
      return this._model.drawables.count
    }
    getDrawableId(e) {
      const t = this._model.drawables.ids
      return V.getIdManager().getId(t[e])
    }
    getDrawableRenderOrders() {
      return this._model.drawables.renderOrders
    }
    getDrawableTextureIndices(e) {
      return this.getDrawableTextureIndex(e)
    }
    getDrawableTextureIndex(e) {
      return this._model.drawables.textureIndices[e]
    }
    getDrawableDynamicFlagVertexPositionsDidChange(e) {
      const t = this._model.drawables.dynamicFlags
      return Live2DCubismCore.Utils.hasVertexPositionsDidChangeBit(t[e])
    }
    getDrawableVertexIndexCount(e) {
      return this._model.drawables.indexCounts[e]
    }
    getDrawableVertexCount(e) {
      return this._model.drawables.vertexCounts[e]
    }
    getDrawableVertices(e) {
      return this.getDrawableVertexPositions(e)
    }
    getDrawableVertexIndices(e) {
      return this._model.drawables.indices[e]
    }
    getDrawableVertexPositions(e) {
      return this._model.drawables.vertexPositions[e]
    }
    getDrawableVertexUvs(e) {
      return this._model.drawables.vertexUvs[e]
    }
    getDrawableOpacity(e) {
      return this._model.drawables.opacities[e]
    }
    getDrawableMultiplyColor(e) {
      const t = this._model.drawables.multiplyColors; const i = 4 * e; const r = new H()
      return r.R = t[i], r.G = t[i + 1], r.B = t[i + 2], r.A = t[i + 3], r
    }
    getDrawableScreenColor(e) {
      const t = this._model.drawables.screenColors; const i = 4 * e; const r = new H()
      return r.R = t[i], r.G = t[i + 1], r.B = t[i + 2], r.A = t[i + 3], r
    }
    getDrawableParentPartIndex(e) {
      return this._model.drawables.parentPartIndices[e]
    }
    getDrawableBlendMode(e) {
      const t = this._model.drawables.constantFlags
      return Live2DCubismCore.Utils.hasBlendAdditiveBit(t[e]) ? se.CubismBlendMode_Additive : Live2DCubismCore.Utils.hasBlendMultiplicativeBit(t[e]) ? se.CubismBlendMode_Multiplicative : se.CubismBlendMode_Normal
    }
    getDrawableInvertedMaskBit(e) {
      const t = this._model.drawables.constantFlags
      return Live2DCubismCore.Utils.hasIsInvertedMaskBit(t[e])
    }
    getDrawableMasks() {
      return this._model.drawables.masks
    }
    getDrawableMaskCounts() {
      return this._model.drawables.maskCounts
    }
    isUsingMasking() {
      for (let e = 0; e < this._model.drawables.count; ++e) { if (!(this._model.drawables.maskCounts[e] <= 0)) return !0;
}
      return !1
    }
    getDrawableDynamicFlagIsVisible(e) {
      const t = this._model.drawables.dynamicFlags
      return Live2DCubismCore.Utils.hasIsVisibleBit(t[e])
    }
    getDrawableDynamicFlagVisibilityDidChange(e) {
      const t = this._model.drawables.dynamicFlags
      return Live2DCubismCore.Utils.hasVisibilityDidChangeBit(t[e])
    }
    getDrawableDynamicFlagOpacityDidChange(e) {
      const t = this._model.drawables.dynamicFlags
      return Live2DCubismCore.Utils.hasOpacityDidChangeBit(t[e])
    }
    getDrawableDynamicFlagRenderOrderDidChange(e) {
      const t = this._model.drawables.dynamicFlags
      return Live2DCubismCore.Utils.hasRenderOrderDidChangeBit(t[e])
    }
    getDrawableDynamicFlagBlendColorDidChange(e) {
      const t = this._model.drawables.dynamicFlags
      return Live2DCubismCore.Utils.hasBlendColorDidChangeBit(t[e])
    }
    loadParameters() {
      let e = this._model.parameters.count
      const t = this._savedParameters.getSize()
      e > t && (e = t)
      for (let i = 0; i < e; ++i) this._parameterValues[i] = this._savedParameters.at(i)
    }
    initialize() {
      re(this._model), this._parameterValues = this._model.parameters.values, this._partOpacities = this._model.parts.opacities, this._parameterMaximumValues = this._model.parameters.maximumValues, this._parameterMinimumValues = this._model.parameters.minimumValues
      {
        const t = this._model.parameters.ids; const i = this._model.parameters.count
        this._parameterIds.prepareCapacity(i)
        for (let r = 0; r < i; ++r) this._parameterIds.pushBack(V.getIdManager().getId(t[r]))
      }
      const e = this._model.parts.count
      {
        const t = this._model.parts.ids
        this._partIds.prepareCapacity(e)
        for (let i = 0; i < e; ++i) this._partIds.pushBack(V.getIdManager().getId(t[i]))
        this._userPartMultiplyColors.prepareCapacity(e), this._userPartScreenColors.prepareCapacity(e), this._partChildDrawables.prepareCapacity(e)
      }
      {
        const t = this._model.drawables.ids; const i = this._model.drawables.count
        this._userMultiplyColors.prepareCapacity(i), this._userScreenColors.prepareCapacity(i), this._userCullings.prepareCapacity(i)
        const r = new Or(!1, !1)
        for (let a = 0; a < e; ++a) {
          const o = new H(1, 1, 1, 1); const n = new H(0, 0, 0, 1); const l = new Ns(!1, o); const h = new Ns(!1, n)
          this._userPartMultiplyColors.pushBack(l), this._userPartScreenColors.pushBack(h), this._partChildDrawables.pushBack(new S()), this._partChildDrawables.at(a).prepareCapacity(i)
        }
        for (let a = 0; a < i; ++a) {
          const o = new H(1, 1, 1, 1); const n = new H(0, 0, 0, 1); const l = new Os(!1, o); const h = new Os(!1, n)
          this._drawableIds.pushBack(V.getIdManager().getId(t[a])), this._userMultiplyColors.pushBack(l), this._userScreenColors.pushBack(h), this._userCullings.pushBack(r)
          const u = this.getDrawableParentPartIndex(a)
          u >= 0 && this._partChildDrawables.at(u).pushBack(a)
        }
      }
    }

    constructor(e) {
      this._model = e, this._parameterValues = null, this._parameterMaximumValues = null, this._parameterMinimumValues = null, this._partOpacities = null, this._savedParameters = new S(), this._parameterIds = new S(), this._drawableIds = new S(), this._partIds = new S(), this._isOverwrittenModelMultiplyColors = !1, this._isOverwrittenModelScreenColors = !1, this._isOverwrittenCullings = !1, this._modelOpacity = 1, this._userMultiplyColors = new S(), this._userScreenColors = new S(), this._userCullings = new S(), this._userPartMultiplyColors = new S(), this._userPartScreenColors = new S(), this._partChildDrawables = new S(), this._notExistPartId = new G(), this._notExistParameterId = new G(), this._notExistParameterValues = new G(), this._notExistPartOpacities = new G()
    }
    release() {
      this._model.release(), this._model = null
    }
  }
  (function (s) {
    s.CubismModel = Us
  })(Ds || (Ds = {}))
  class rt {
    static create(e, t) {
      let i = null
      if (t && !this.hasMocConsistency(e)) 
return X('Inconsistent MOC3.'), i
      const r = Live2DCubismCore.Moc.fromArrayBuffer(e)
      return r && (i = new rt(r), i._mocVersion = Live2DCubismCore.Version.csmGetMocVersion(r, e)), i
    }
    static delete(e) {
      e._moc._release(), e._moc = null, e = null
    }
    createModel() {
      let e = null
      const t = Live2DCubismCore.Model.fromMoc(this._moc)
      return t && (e = new Us(t), e.initialize(), ++this._modelCount), e
    }
    deleteModel(e) {
      e != null && (e.release(), e = null, --this._modelCount)
    }
    constructor(e) {
      this._moc = e, this._modelCount = 0, this._mocVersion = 0
    }
    release() {
      re(this._modelCount == 0), this._moc._release(), this._moc = null
    }
    getLatestMocVersion() {
      return Live2DCubismCore.Version.csmGetLatestMocVersion()
    }
    getMocVersion() {
      return this._mocVersion
    }
    static hasMocConsistency(e) {
      return Live2DCubismCore.Moc.prototype.hasMocConsistency(e) === 1
    }
  }
  (function (s) {
    s.CubismMoc = rt
  })(ks || (ks = {}))
  const zs = 'Meta', Zt = 'UserData';
  class js {
    constructor(e, t) {
      this._json = U.create(e, t)
    }
    release() {
      U.delete(this._json)
    }
    getUserDataCount() {
      return this._json.getRoot().getValueByString(zs).getValueByString('UserDataCount').toInt()
    }
    getTotalUserDataSize() {
      return this._json.getRoot().getValueByString(zs).getValueByString('TotalUserDataSize').toInt()
    }
    getUserDataTargetType(e) {
      return this._json.getRoot().getValueByString(Zt).getValueByIndex(e).getValueByString('Target').getRawString()
    }
    getUserDataId(e) {
      return V.getIdManager().getId(this._json.getRoot().getValueByString(Zt).getValueByIndex(e).getValueByString('Id').getRawString())
    }
    getUserDataValue(e) {
      return this._json.getRoot().getValueByString(Zt).getValueByIndex(e).getValueByString('Value').getRawString()
    }
  }
  let Xs, Gs, Ys;
  (function (s) {
    s.CubismModelUserDataJson = js
  })(Xs || (Xs = {}))
  class Hs {
  }
  class at {
    static create(e, t) {
      const i = new at()
      return i.parseUserData(e, t), i
    }
    static delete(e) {
      e != null && (e.release(), e = null)
    }
    getArtMeshUserDatas() {
      return this._artMeshUserDataNode
    }
    parseUserData(e, t) {
      let i = new js(e, t)
      const r = V.getIdManager().getId('ArtMesh'); const a = i.getUserDataCount()
      for (let o = 0; o < a; o++) {
        const n = new Hs()
        n.targetId = i.getUserDataId(o), n.targetType = V.getIdManager().getId(i.getUserDataTargetType(o)), n.value = new Z(i.getUserDataValue(o)), this._userDataNodes.pushBack(n), n.targetType == r && this._artMeshUserDataNode.pushBack(n)
      }
      i.release(), i = void 0
    }
    constructor() {
      this._userDataNodes = new S(), this._artMeshUserDataNode = new S()
    }
    release() {
      for (let e = 0; e < this._userDataNodes.getSize(); ++e) this._userDataNodes.set(e, null)
      this._userDataNodes = null
    }
  }
  (function (s) {
    s.CubismModelUserData = at, s.CubismModelUserDataNode = Hs
  })(Gs || (Gs = {}))
  class Et {
    isInitialized() {
      return this._initialized
    }
    setInitialized(e) {
      this._initialized = e
    }
    isUpdating() {
      return this._updating
    }
    setUpdating(e) {
      this._updating = e
    }
    setDragging(e, t) {
      this._dragManager.set(e, t)
    }
    setAcceleration(e, t, i) {
      this._accelerationX = e, this._accelerationY = t, this._accelerationZ = i
    }
    getModelMatrix() {
      return this._modelMatrix
    }
    setOpacity(e) {
      this._opacity = e
    }
    getOpacity() {
      return this._opacity
    }
    loadModel(e, t = !1) {
      this._moc = rt.create(e, t), this._moc != null ? (this._model = this._moc.createModel(), this._model != null ? (this._model.saveParameters(), this._modelMatrix = new Yi(this._model.getCanvasWidth(), this._model.getCanvasHeight())) : X('Failed to CreateModel().')) : X('Failed to CubismMoc.create().');
    }

    loadExpression(e, t, i) {
      return Ct.create(e, t)
    }
    loadPose(e, t) {
      this._pose = Ke.create(e, t)
    }
    loadUserData(e, t) {
      this._modelUserData = at.create(e, t)
    }
    loadPhysics(e, t) {
      this._physics = st.create(e, t)
    }
    isHit(e, t, i) {
      const r = this._model.getDrawableIndex(e)
      if (r < 0) 
return !1
      const a = this._model.getDrawableVertexCount(r); const o = this._model.getDrawableVertices(r)
      let n = o[0]; let l = o[0]; let h = o[1]; let u = o[1]
      for (let d = 1; d < a; ++d) {
        const c = o[fe.vertexOffset + d * fe.vertexStep]; const m = o[fe.vertexOffset + d * fe.vertexStep + 1]
        c < n && (n = c), c > l && (l = c), m < h && (h = m), m > u && (u = m)
      }
      const _ = this._modelMatrix.invertTransformX(t); const g = this._modelMatrix.invertTransformY(i)
      return n <= _ && _ <= l && h <= g && g <= u
    }
    getModel() {
      return this._model
    }
    getRenderer() {
      return this._renderer
    }
    createRenderer(e = 1) {
      this._renderer && this.deleteRenderer(), this._renderer = new Jt(), this._renderer.initialize(this._model, e)
    }
    deleteRenderer() {
      this._renderer != null && (this._renderer.release(), this._renderer = null)
    }
    motionEventFired(e) {
      ae('{0}', e.s)
    }
    static cubismDefaultMotionEventCallback(e, t, i) {
      i != null && i.motionEventFired(t)
    }
    constructor() {
      this.loadMotion = (e, t, i, r) => Pt.create(e, t, r), this._moc = null, this._model = null, this._motionManager = null, this._expressionManager = null, this._eyeBlink = null, this._breath = null, this._modelMatrix = null, this._pose = null, this._dragManager = null, this._physics = null, this._modelUserData = null, this._initialized = !1, this._updating = !1, this._opacity = 1, this._lipsync = !0, this._lastLipSyncValue = 0, this._dragX = 0, this._dragY = 0, this._accelerationX = 0, this._accelerationY = 0, this._accelerationZ = 0, this._mocConsistency = !1, this._debugMode = !1, this._renderer = null, this._motionManager = new jt(), this._motionManager.setEventCallback(Et.cubismDefaultMotionEventCallback, this), this._expressionManager = new jt(), this._dragManager = new Hi()
    }
    release() {
      this._motionManager != null && (this._motionManager.release(), this._motionManager = null), this._expressionManager != null && (this._expressionManager.release(), this._expressionManager = null), this._moc != null && (this._moc.deleteModel(this._model), this._moc.release(), this._moc = null), this._modelMatrix = null, Ke.delete(this._pose), Me.delete(this._eyeBlink), Ze.delete(this._breath), this._dragManager = null, st.delete(this._physics), at.delete(this._modelUserData), this.deleteRenderer()
    }
  }
  (function (s) {
    s.CubismUserModel = Et
  })(Ys || (Ys = {}))
  const Nr = 'background-color: #CB81DA; color: white; padding: 3px; border-radius: 3px;';
  function qs(s) {
    console.log('%c' + s, Nr)
  }
  let Kt = function (s, e, t, i) {
    return new (t || (t = Promise))((r, a) => {
      function o(h) {
        try {
          l(i.next(h))
        } catch (u) {
          a(u)
        }
      }
      function n(h) {
        try {
          l(i.throw(h))
        } catch (u) {
          a(u)
        }
      }
      function l(h) {
        let u
        h.done
? r(h.value)
: (u = h.value, u instanceof t
? u
: new t((_) => {
          _(u)
        })).then(o, n)
      }
      l((i = i.apply(s, [])).next())
    });
  }
  const Ws = { refreshCache: !1 }
  function ee(s) {
    return Kt(this, void 0, void 0, function* () {
      if (!Ws.refreshCache && b.LoadFromCache && b.Live2dDB) {
        const r = yield (e = s, new Promise((a, o) => {
          const n = b.Live2dDB.transaction('live2d', 'readonly').objectStore('live2d').index('url').get(e)
          n.onsuccess = (l) => {
            const h = l.currentTarget.result
            a(h || void 0)
          }, n.onerror = (l) => {
            a(void 0)
          };
        }))
        if (r !== void 0) {
          const a = r.arraybuffer
          return { arrayBuffer: () => Kt(this, void 0, void 0, function* () {
            return a
          }) }
        }
      }
      let e
      qs('[Live2dRender] cacheFetch 请求并缓存 url ' + s)
      const t = yield fetch(s); const i = yield t.arrayBuffer()
      return b.LoadFromCache && b.Live2dDB && (function(r) {
        new Promise((a, o) => {
          const n = b.Live2dDB.transaction("live2d", "readwrite").objectStore("live2d").add(r);
          n.onsuccess = () => a(!0), n.onerror = () => a(!1);
        });
      }({ url: s, arraybuffer: i })), { arrayBuffer: () => Kt(this, void 0, void 0, function* () {
        return i
      }) }
    });
  }
  class Y {
    static loadFileAsBytes(e, t) {
      ee(e).then(i => i.arrayBuffer()).then(i => t(i, i.byteLength))
    }
    static getDeltaTime() {
      return this.s_deltaTime
    }
    static updateTime() {
      this.s_currentFrame = Date.now(), this.s_deltaTime = (this.s_currentFrame - this.s_lastFrame) / 1e3, this.s_lastFrame = this.s_currentFrame
    }
    static printMessage(e) {
    }
  }
  Y.lastUpdate = Date.now(), Y.s_currentFrame = 0, Y.s_lastFrame = 0, Y.s_deltaTime = 0
  var $s = function (s, e, t, i) {
    return new (t || (t = Promise))((r, a) => {
      function o(h) {
        try {
          l(i.next(h))
        } catch (u) {
          a(u)
        }
      }
      function n(h) {
        try {
          l(i.throw(h))
        } catch (u) {
          a(u)
        }
      }
      function l(h) {
        let u
        h.done
? r(h.value)
: (u = h.value, u instanceof t
? u
: new t((_) => {
          _(u)
        })).then(o, n)
      }
      l((i = i.apply(s, [])).next())
    });
  }
  let ze = null
  class Qt {
    static getInstance() {
      return ze == null && (ze = new Qt()), ze
    }
    static releaseInstance() {
      ze != null && (ze = void 0), ze = null
    }
    update(e) {
      let t, i
      if (this._pcmData == null || this._sampleOffset >= this._wavFileInfo._samplesPerChannel) 
return this._lastRms = 0, !1
      this._userTimeSeconds += e, t = Math.floor(this._userTimeSeconds * this._wavFileInfo._samplingRate), t > this._wavFileInfo._samplesPerChannel && (t = this._wavFileInfo._samplesPerChannel), i = 0
      for (let r = 0; r < this._wavFileInfo._numberOfChannels; r++) { for (let a = this._sampleOffset; a < t; a++) {
        const o = this._pcmData[r][a];
        i += o * o;
      }
}
      return i = Math.sqrt(i / (this._wavFileInfo._numberOfChannels * (t - this._sampleOffset))), this._lastRms = i, this._sampleOffset = t, !0
    }
    start(e) {
      this._sampleOffset = 0, this._userTimeSeconds = 0, this._lastRms = 0, this.loadWavFile(e)
    }
    getRms() {
      return this._lastRms
    }
    loadWavFile(e) {
      let t = !1
      this._pcmData != null && this.releasePcmData()
      const i = () => $s(this, void 0, void 0, function* () {
        return ee(e).then(r => r.arrayBuffer())
      });
      return $s(this, void 0, void 0, function* () {
        if (this._byteReader._fileByte = yield i(), this._byteReader._fileDataView = new DataView(this._byteReader._fileByte), this._byteReader._fileSize = this._byteReader._fileByte.byteLength, this._byteReader._readOffset = 0, this._byteReader._fileByte == null || this._byteReader._fileSize < 4) 
return !1
        this._wavFileInfo._fileName = e
        try {
          if (!this._byteReader.getCheckSignature('RIFF')) 
throw t = !1, new Error('Cannot find Signeture "RIFF".')
          if (this._byteReader.get32LittleEndian(), !this._byteReader.getCheckSignature('WAVE')) 
throw t = !1, new Error('Cannot find Signeture "WAVE".')
          if (!this._byteReader.getCheckSignature('fmt ')) 
throw t = !1, new Error('Cannot find Signeture "fmt".')
          const r = this._byteReader.get32LittleEndian()
          if (this._byteReader.get16LittleEndian() != 1) 
throw t = !1, new Error('File is not linear PCM.');
          for (this._wavFileInfo._numberOfChannels = this._byteReader.get16LittleEndian(), this._wavFileInfo._samplingRate = this._byteReader.get32LittleEndian(), this._byteReader.get32LittleEndian(), this._byteReader.get16LittleEndian(), this._wavFileInfo._bitsPerSample = this._byteReader.get16LittleEndian(), r > 16 && (this._byteReader._readOffset += r - 16); !this._byteReader.getCheckSignature('data') && this._byteReader._readOffset < this._byteReader._fileSize;) this._byteReader._readOffset += this._byteReader.get32LittleEndian() + 4
          if (this._byteReader._readOffset >= this._byteReader._fileSize) 
throw t = !1, new Error('Cannot find "data" Chunk.')
          {
            const a = this._byteReader.get32LittleEndian()
            this._wavFileInfo._samplesPerChannel = 8 * a / (this._wavFileInfo._bitsPerSample * this._wavFileInfo._numberOfChannels)
          }
          this._pcmData = new Array(this._wavFileInfo._numberOfChannels)
          for (let a = 0; a < this._wavFileInfo._numberOfChannels; a++) this._pcmData[a] = new Float32Array(this._wavFileInfo._samplesPerChannel)
          for (let a = 0; a < this._wavFileInfo._samplesPerChannel; a++) { for (let o = 0; o < this._wavFileInfo._numberOfChannels; o++) this._pcmData[o][a] = this.getPcmSample();
}
          t = !0
        } catch (r) {
          console.log(r)
        }
      }), t
    }
    getPcmSample() {
      let e
      switch (this._wavFileInfo._bitsPerSample) {
        case 8:
          e = this._byteReader.get8() - 128, e <<= 24
          break;
        case 16:
          e = this._byteReader.get16LittleEndian() << 16
          break;
        case 24:
          e = this._byteReader.get24LittleEndian() << 8
          break;
        default:
          e = 0
      }
      return e / 2147483647
    }
    releasePcmData() {
      for (let e = 0; e < this._wavFileInfo._numberOfChannels; e++) delete this._pcmData[e]
      delete this._pcmData, this._pcmData = null
    }
    constructor() {
      this._loadFiletoBytes = (e, t) => {
        this._byteReader._fileByte = e, this._byteReader._fileDataView = new DataView(this._byteReader._fileByte), this._byteReader._fileSize = t
      }, this._pcmData = null, this._userTimeSeconds = 0, this._lastRms = 0, this._sampleOffset = 0, this._wavFileInfo = new Ur(), this._byteReader = new zr()
    }
  }
  class Ur {
    constructor() {
      this._fileName = '', this._numberOfChannels = 0, this._bitsPerSample = 0, this._samplingRate = 0, this._samplesPerChannel = 0
    }
  }
  class zr {
    constructor() {
      this._fileByte = null, this._fileDataView = null, this._fileSize = 0, this._readOffset = 0
    }
    get8() {
      const e = this._fileDataView.getUint8(this._readOffset)
      return this._readOffset++, e
    }
    get16LittleEndian() {
      const e = this._fileDataView.getUint8(this._readOffset + 1) << 8 | this._fileDataView.getUint8(this._readOffset)
      return this._readOffset += 2, e
    }
    get24LittleEndian() {
      const e = this._fileDataView.getUint8(this._readOffset + 2) << 16 | this._fileDataView.getUint8(this._readOffset + 1) << 8 | this._fileDataView.getUint8(this._readOffset)
      return this._readOffset += 3, e
    }
    get32LittleEndian() {
      const e = this._fileDataView.getUint8(this._readOffset + 3) << 24 | this._fileDataView.getUint8(this._readOffset + 2) << 16 | this._fileDataView.getUint8(this._readOffset + 1) << 8 | this._fileDataView.getUint8(this._readOffset)
      return this._readOffset += 4, e
    }
    getCheckSignature(e) {
      const t = new Uint8Array(4); const i = new TextEncoder().encode(e)
      if (e.length != 4) 
return !1
      for (let r = 0; r < 4; r++) t[r] = this.get8()
      return t[0] == i[0] && t[1] == i[1] && t[2] == i[2] && t[3] == i[3]
    }
  }
  let F; var Js = function (s, e, t, i) {
    return new (t || (t = Promise))((r, a) => {
      function o(h) {
        try {
          l(i.next(h))
        } catch (u) {
          a(u)
        }
      }
      function n(h) {
        try {
          l(i.throw(h))
        } catch (u) {
          a(u)
        }
      }
      function l(h) {
        let u
        h.done
? r(h.value)
: (u = h.value, u instanceof t
? u
: new t((_) => {
          _(u)
        })).then(o, n)
      }
      l((i = i.apply(s, [])).next())
    });
  };
  (function (s) {
    s[s.LoadAssets = 0] = 'LoadAssets', s[s.LoadModel = 1] = 'LoadModel', s[s.WaitLoadModel = 2] = 'WaitLoadModel', s[s.LoadExpression = 3] = 'LoadExpression', s[s.WaitLoadExpression = 4] = 'WaitLoadExpression', s[s.LoadPhysics = 5] = 'LoadPhysics', s[s.WaitLoadPhysics = 6] = 'WaitLoadPhysics', s[s.LoadPose = 7] = 'LoadPose', s[s.WaitLoadPose = 8] = 'WaitLoadPose', s[s.SetupEyeBlink = 9] = 'SetupEyeBlink', s[s.SetupBreath = 10] = 'SetupBreath', s[s.LoadUserData = 11] = 'LoadUserData', s[s.WaitLoadUserData = 12] = 'WaitLoadUserData', s[s.SetupEyeBlinkIds = 13] = 'SetupEyeBlinkIds', s[s.SetupLipSyncIds = 14] = 'SetupLipSyncIds', s[s.SetupLayout = 15] = 'SetupLayout', s[s.LoadMotion = 16] = 'LoadMotion', s[s.WaitLoadMotion = 17] = 'WaitLoadMotion', s[s.CompleteInitialize = 18] = 'CompleteInitialize', s[s.CompleteSetupModel = 19] = 'CompleteSetupModel', s[s.LoadTexture = 20] = 'LoadTexture', s[s.WaitLoadTexture = 21] = 'WaitLoadTexture', s[s.CompleteSetup = 22] = 'CompleteSetup';
  })(F || (F = {}))
  class jr extends Et {
    loadAssets(e, t) {
      return Js(this, void 0, void 0, function* () {
        this._modelHomeDir = e
        const i = yield ee(t); const r = yield i.arrayBuffer(); const a = new Di(r, r.byteLength)
        this._state = F.LoadModel, this.setupModel(a)
      });
    }

    setupModel(e) {
      if (this._updating = !0, this._initialized = !1, this._modelSetting = e, this._modelSetting.getModelFileName() != '') {
        const g = this._modelSetting.getModelFileName()
        ee(`${this._modelHomeDir}${g}`).then(d => d.arrayBuffer()).then((d) => {
          this.loadModel(d, this._mocConsistency), this._state = F.LoadExpression, t()
        }), this._state = F.WaitLoadModel
      }
      const t = () => {
          if (this._modelSetting.getExpressionCount() > 0) {
            const g = this._modelSetting.getExpressionCount()
          for (let d = 0; d < g; ++d) {
              const c = this._modelSetting.getExpressionName(d); const m = this._modelSetting.getExpressionFileName(d)
            ee(`${this._modelHomeDir}${m}`).then(p => p.arrayBuffer()).then((p) => {
                const v = this.loadExpression(p, p.byteLength, c)
              this._expressions.getValue(c) != null && (Oe.delete(this._expressions.getValue(c)), this._expressions.setValue(c, null)), this._expressions.setValue(c, v), this._expressionCount++, this._expressionCount >= g && (this._state = F.LoadPhysics, i())
            });
            }
            this._state = F.WaitLoadExpression
        } else { this._state = F.LoadPhysics, i();
}
        }; const i = () => {
        if (this._modelSetting.getPhysicsFileName() != "") {
          const g = this._modelSetting.getPhysicsFileName();
          ee(`${this._modelHomeDir}${g}`).then((d) => d.arrayBuffer()).then((d) => {
            this.loadPhysics(d, d.byteLength), this._state = F.LoadPose, r();
          }), this._state = F.WaitLoadPhysics;
        } else this._state = F.LoadPose, r();
      }; const r = () => {
        if (this._modelSetting.getPoseFileName() != "") {
          const g = this._modelSetting.getPoseFileName();
          ee(`${this._modelHomeDir}${g}`).then((d) => d.arrayBuffer()).then((d) => {
            this.loadPose(d, d.byteLength), this._state = F.SetupEyeBlink, a();
          }), this._state = F.WaitLoadPose;
        } else this._state = F.SetupEyeBlink, a();
      }; const a = () => {
        this._modelSetting.getEyeBlinkParameterCount() > 0 && (this._eyeBlink = Me.create(this._modelSetting), this._state = F.SetupBreath), o();
      }; const o = () => {
        this._breath = Ze.create();
        const g = new S();
        g.pushBack(new ke(this._idParamAngleX, 0, 15, 6.5345, 0.5)), g.pushBack(new ke(this._idParamAngleY, 0, 8, 3.5345, 0.5)), g.pushBack(new ke(this._idParamAngleZ, 0, 10, 5.5345, 0.5)), g.pushBack(new ke(this._idParamBodyAngleX, 0, 4, 15.5345, 0.5)), g.pushBack(new ke(V.getIdManager().getId(C.ParamBreath), 0.5, 0.5, 3.2345, 1)), this._breath.setParameters(g), this._state = F.LoadUserData, n();
      }; const n = () => {
        if (this._modelSetting.getUserDataFile() != "") {
          const g = this._modelSetting.getUserDataFile();
          ee(`${this._modelHomeDir}${g}`).then((d) => d.arrayBuffer()).then((d) => {
            this.loadUserData(d, d.byteLength), this._state = F.SetupEyeBlinkIds, l();
          }), this._state = F.WaitLoadUserData;
        } else this._state = F.SetupEyeBlinkIds, l();
      }; const l = () => {
        const g = this._modelSetting.getEyeBlinkParameterCount();
        for (let d = 0; d < g; ++d) this._eyeBlinkIds.pushBack(this._modelSetting.getEyeBlinkParameterId(d));
        this._state = F.SetupLipSyncIds, h();
      }; const h = () => {
        const g = this._modelSetting.getLipSyncParameterCount();
        for (let d = 0; d < g; ++d) this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(d));
        this._state = F.SetupLayout, u();
      }; const u = () => {
        const g = new G();
        this._modelSetting != null && this._modelMatrix != null ? (this._modelSetting.getLayoutMap(g), this._modelMatrix.setupFromLayout(g), this._state = F.LoadMotion, _()) : X("Failed to setupLayout().");
      }; const _ = () => {
          this._state = F.WaitLoadMotion, this._model.saveParameters(), this._allMotionCount = 0, this._motionCount = 0
        const g = []; const d = this._modelSetting.getMotionGroupCount()
        for (let c = 0; c < d; c++) g[c] = this._modelSetting.getMotionGroupName(c), this._allMotionCount += this._modelSetting.getMotionCount(g[c])
        for (let c = 0; c < d; c++) this.preLoadMotionGroup(g[c])
        d == 0 && (this._state = F.LoadTexture, this._motionManager.stopAllMotions(), this._updating = !1, this._initialized = !0, this.createRenderer(), this.setupTextures(), this.getRenderer().startUp(y))
      };
    }

    setupTextures() {
      if (this._state == F.LoadTexture) {
        const e = this._modelSetting.getTextureCount()
        for (let t = 0; t < e; t++) {
          if (this._modelSetting.getTextureFileName(t) == '') {
            console.log('getTextureFileName null');
            continue
          }
          let i = this._modelSetting.getTextureFileName(t)
          i = this._modelHomeDir + i
          const r = (a) => {
            this.getRenderer().bindTexture(t, a.id), this._textureCount++, this._textureCount >= e && (this._state = F.CompleteSetup)
          };
          k.getInstance().getTextureManager().createTextureFromFile(i, !0, r), this.getRenderer().setIsPremultipliedAlpha(!0)
        }
        this._state = F.WaitLoadTexture
      }
    }

    reloadRenderer() {
      this.deleteRenderer(), this.createRenderer(), this.setupTextures()
    }
    update() {
      if (this._state != F.CompleteSetup) 
return;
      const e = Y.getDeltaTime()
      this._userTimeSeconds += e, this._dragManager.update(e), this._dragX = this._dragManager.getX(), this._dragY = this._dragManager.getY()
      let t = !1
      if (this._model.loadParameters(), this._motionManager.isFinished() ? this.startRandomMotion(b.MotionGroupIdle, b.PriorityIdle) : t = this._motionManager.updateMotion(this._model, e), this._model.saveParameters(), t || this._eyeBlink != null && this._eyeBlink.updateParameters(this._model, e), this._expressionManager != null && this._expressionManager.updateMotion(this._model, e), this._model.addParameterValueById(this._idParamAngleX, 30 * this._dragX), this._model.addParameterValueById(this._idParamAngleY, 30 * this._dragY), this._model.addParameterValueById(this._idParamAngleZ, this._dragX * this._dragY * -30), this._model.addParameterValueById(this._idParamBodyAngleX, 10 * this._dragX), this._model.addParameterValueById(this._idParamEyeBallX, this._dragX), this._model.addParameterValueById(this._idParamEyeBallY, this._dragY), this._breath != null && this._breath.updateParameters(this._model, e), this._physics != null && this._physics.evaluate(this._model, e), this._lipsync) {
        let i = 0
        this._wavFileHandler.update(e), i = this._wavFileHandler.getRms()
        for (let r = 0; r < this._lipSyncIds.getSize(); ++r) this._model.addParameterValueById(this._lipSyncIds.at(r), i, 0.8)
      }
      this._pose != null && this._pose.updateParameters(this._model, e), this._model.update()
    }
    startMotion(e, t, i, r) {
      if (i == b.PriorityForce) 
this._motionManager.setReservePriority(i)
      else if (!this._motionManager.reserveMotion(i)) 
return this._debugMode && Y.printMessage('[APP]can\'t start motion.'), wt
      const a = this._modelSetting.getMotionFileName(e, t); const o = `${e}_${t}`
      let n = this._motions.getValue(o); let l = !1
      n == null
? ee(`${this._modelHomeDir}${a}`).then(u => u.arrayBuffer()).then((u) => {
        n = this.loadMotion(u, u.byteLength, null, r)
        let _ = this._modelSetting.getMotionFadeInTimeValue(e, t)
        _ >= 0 && n.setFadeInTime(_), _ = this._modelSetting.getMotionFadeOutTimeValue(e, t), _ >= 0 && n.setFadeOutTime(_), n.setEffectIds(this._eyeBlinkIds, this._lipSyncIds), l = !0
      })
: n.setFinishedMotionHandler(r)
      const h = this._modelSetting.getMotionSoundFileName(e, t)
      if (h.localeCompare('') != 0) {
        let u = h
        u = this._modelHomeDir + u, this._wavFileHandler.start(u)
      }
      return this._debugMode && Y.printMessage(`[APP]start motion: [${e}_${t}`), this._motionManager.startMotionPriority(n, l, i)
    }
    startRandomMotion(e, t, i) {
      if (this._modelSetting.getMotionCount(e) == 0) 
return wt
      const r = Math.floor(Math.random() * this._modelSetting.getMotionCount(e))
      return this.startMotion(e, r, t, i)
    }
    setExpression(e) {
      const t = this._expressions.getValue(e)
      this._debugMode && Y.printMessage(`[APP]expression: [${e}]`), t != null ? this._expressionManager.startMotionPriority(t, !0, b.PriorityForce) : this._debugMode && Y.printMessage(`[APP]expression[${e}] is null`)
    }
    setRandomExpression() {
      if (this._expressions.getSize() == 0) 
return;
      const e = Math.floor(Math.random() * this._expressions.getSize()); const t = this._expressions._keyValues[e].first
      this.setExpression(t)
    }
    motionEventFired(e) {
      ae('{0} is fired on LAppModel!!', e.s)
    }
    hitTest(e, t, i) {
      if (this._opacity < 1) 
return !1
      const r = this._modelSetting.getHitAreasCount()
      for (let a = 0; a < r; a++) { if (this._modelSetting.getHitAreaName(a) == e) {
        const o = this._modelSetting.getHitAreaId(a);
        return this.isHit(o, t, i);
      }
}
      return !1
    }
    preLoadMotionGroup(e) {
      for (let t = 0; t < this._modelSetting.getMotionCount(e); t++) {
        const i = this._modelSetting.getMotionFileName(e, t); const r = `${e}_${t}`
        this._debugMode && Y.printMessage(`[APP]load motion: ${i} => [${r}]`), ee(`${this._modelHomeDir}${i}`).then(a => a.arrayBuffer()).then((a) => {
          const o = this.loadMotion(a, a.byteLength, r)
          let n = this._modelSetting.getMotionFadeInTimeValue(e, t)
          n >= 0 && o.setFadeInTime(n), n = this._modelSetting.getMotionFadeOutTimeValue(e, t), n >= 0 && o.setFadeOutTime(n), o.setEffectIds(this._eyeBlinkIds, this._lipSyncIds), this._motions.getValue(r) != null && Oe.delete(this._motions.getValue(r)), this._motions.setValue(r, o), this._motionCount++, this._motionCount >= this._allMotionCount && (this._state = F.LoadTexture, this._motionManager.stopAllMotions(), this._updating = !1, this._initialized = !0, this.createRenderer(), this.setupTextures(), this.getRenderer().startUp(y))
        });
      }
    }

    releaseMotions() {
      this._motions.clear()
    }
    releaseExpressions() {
      this._expressions.clear()
    }
    doDraw() {
      if (this._model == null) 
return;
      const e = [0, 0, R.width, R.height]
      this.getRenderer().setRenderState(si, e), this.getRenderer().drawModel()
    }
    draw(e) {
      this._model != null && this._state == F.CompleteSetup && (e.multiplyByMatrix(this._modelMatrix), this.getRenderer().setMvpMatrix(e), this.doDraw())
    }
    hasMocConsistencyFromFile() {
      return Js(this, void 0, void 0, function* () {
        if (re(this._modelSetting.getModelFileName().localeCompare('')), this._modelSetting.getModelFileName() != '') {
          const e = this._modelSetting.getModelFileName(); const t = yield ee(`${this._modelHomeDir}${e}`); const i = yield t.arrayBuffer()
          return this._consistency = rt.hasMocConsistency(i), this._consistency ? ae('Consistent MOC3.') : ae('Inconsistent MOC3.'), this._consistency
        }
      })
    }
    constructor() {
      super(), this._modelSetting = null, this._modelHomeDir = null, this._userTimeSeconds = 0, this._eyeBlinkIds = new S(), this._lipSyncIds = new S(), this._motions = new G(), this._expressions = new G(), this._hitArea = new S(), this._userArea = new S(), this._idParamAngleX = V.getIdManager().getId(C.ParamAngleX), this._idParamAngleY = V.getIdManager().getId(C.ParamAngleY), this._idParamAngleZ = V.getIdManager().getId(C.ParamAngleZ), this._idParamEyeBallX = V.getIdManager().getId(C.ParamEyeBallX), this._idParamEyeBallY = V.getIdManager().getId(C.ParamEyeBallY), this._idParamBodyAngleX = V.getIdManager().getId(C.ParamBodyAngleX), this._mocConsistency = !0, this._state = F.LoadAssets, this._expressionCount = 0, this._textureCount = 0, this._motionCount = 0, this._allMotionCount = 0, this._wavFileHandler = new Qt(), this._consistency = !1
    }
  }
  const Xr = `
<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M561.978 551.978c18.7-23.374 18.7-56.587 0-79.96000001l-256-319.99999999c-22.07999999-27.602-62.355-32.077-89.956-9.996-27.6 22.08-32.076 62.355-9.995 89.956l256 320 0-79.96-256 319.99999999c-22.08 27.6-17.606 67.875 9.995 89.95500001 27.6 22.08 67.875 17.606 89.956-9.995l256-320z m320 0c18.7-23.374 18.7-56.587 0-79.96000001l-256-319.99999999c-22.07999999-27.602-62.355-32.077-89.956-9.996-27.6 22.08-32.076 62.355-9.995 89.956l256 320 0-79.96-256 319.99999999c-22.08 27.6-17.606 67.875 9.995 89.95500001 27.6 22.08 67.875 17.606 89.956-9.995l256-320z" fill="#202020" p-id="9041"></path></svg>
`; const Gr = `
<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M19.692308 512A25 25 0 1 1 19.692308 531.692308Z" fill="#202020" p-id="2530"></path><path d="M711.59627 286.625965C756.296611 286.625965 792.533213 322.898276 792.533213 367.642667 792.533213 412.387058 756.296611 448.659369 711.59627 448.659369 666.895931 448.659369 630.659328 412.387058 630.659328 367.642667 630.659438 322.898276 666.896041 286.625965 711.59627 286.625965L711.59627 286.625965Z" fill="#202020" p-id="2531"></path><path d="M310.73715 286.625965C355.437491 286.625965 391.674092 322.898276 391.674092 367.642667 391.674092 412.387058 355.437491 448.659369 310.73715 448.659369 266.036809 448.659369 229.800208 412.387058 229.800208 367.642667 229.800208 322.898276 266.036809 286.625965 310.73715 286.625965L310.73715 286.625965Z" fill="#202020" p-id="2532"></path><path d="M761.510209 633.145716C736.812916 742.981134 625.189321 818.997906 511.993303 818.997906 394.704234 818.997906 283.635686 740.921017 261.458914 628.724533 261.458914 598.401185 284.583786 587.521741 298.828633 587.521741L719.423009 587.521741C729.782947 587.544891 769.395771 591.132788 761.510209 633.145716L761.510209 633.145716Z" p-id="2533" fill="#202020"></path></svg>
`; const Yr = `
<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M257.6 462.4c28.8 1.6 43.2-11.2 43.2-36.8 0-25.6-17.6-43.2-43.2-43.2H150.4C201.6 208 358.4 84.8 542.4 84.8c187.2 0 348.8 128 395.2 310.4 4.8 20.8 30.4 38.4 51.2 30.4 20.8-4.8 38.4-30.4 30.4-51.2C958.4 153.6 763.2 0 537.6 0 337.6 0 163.2 123.2 80 305.6v-92.8c0-22.4-9.6-43.2-35.2-43.2S1.6 187.2 0 212.8v200c1.6 30.4 25.6 51.2 57.6 49.6h200zM966.4 590.4H779.2c-12.8 0-27.2 3.2-36.8 11.2-11.2 8-19.2 20.8-19.2 36.8 0 20.8 19.2 32 43.2 32h105.6c-59.2 163.2-208 265.6-374.4 265.6-174.4 0-326.4-110.4-382.4-280-8-20.8-30.4-33.6-56-25.6-20.8 8-33.6 30.4-25.6 56C104 888 286.4 1024 499.2 1024c187.2 0 352-105.6 444.8-272v97.6c1.6 24 9.6 43.2 35.2 43.2s43.2-17.6 44.8-43.2V649.6c-1.6-28.8-27.2-54.4-57.6-59.2z" p-id="3561" fill="#202020"></path></svg>
`; const Hr = `
<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M960 384l-313.6-40.96L512 64 377.6 343.04 64 384l230.4 208.64L234.88 896 512 746.88 789.12 896l-59.52-303.36L960 384z" p-id="10992" fill="#202020"></path></svg>
`; const qr = `
<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M624.48 882.4c-2.96 10.64-4.72 18-7.04 25.2-10.08 31.12-25.04 41.6-57.92 41.12-115.28-1.6-230.56-3.52-345.84-4.56-30 0-60 3.04-90 3.76-54.4 1.44-72.8-14.48-73.28-69.28-1.6-177.28-3.12-354.56-2-531.84 0-64 7.2-128 13.6-191.2 2.24-21.92 3.28-54.32 30.32-56 14.48-0.8 37.36 23.52 44.64 41.28 35.76 87.28 99.36 118.32 189.76 106.24a671.52 671.52 0 0 1 84.24-1.68 72.56 72.56 0 0 0 66.88-38.4c17.52-30.16 34.72-60.4 53.04-90.08a86.16 86.16 0 0 1 24-28.48c12-7.44 30-16 40-12.16s18.72 22.88 22.32 36.64 0.88 30.8 0.96 46.32c1.04 180.24 2.48 360.4 2.56 540.64 0 26.32 9.04 40.96 31.36 55.52 70.96 46.4 127.44 38.88 194.08-33.76 9.12-10 16.64-21.6 26.24-30.96a59.68 59.68 0 0 1 79.28-6.4 58.08 58.08 0 0 1 14.48 78.24C913.76 848 790.24 949.04 644.08 888a194.08 194.08 0 0 0-19.6-5.6z m-454.08-488a48 48 0 0 0-45.6 44.32 47.2 47.2 0 0 0 46.64 46.16A44.64 44.64 0 0 0 216 440.64a45.2 45.2 0 0 0-45.6-46.32z m338.16 90.4a45.92 45.92 0 0 0 43.84-45.2 45.28 45.28 0 0 0-46.64-45.04 45.12 45.12 0 0 0 2.8 90.24z" p-id="17483" fill="#202020"></path></svg>
`
  var he = function (s, e, t, i) {
    return new (t || (t = Promise))((r, a) => {
      function o(h) {
        try {
          l(i.next(h))
        } catch (u) {
          a(u)
        }
      }
      function n(h) {
        try {
          l(i.throw(h))
        } catch (u) {
          a(u)
        }
      }
      function l(h) {
        let u
        h.done
? r(h.value)
: (u = h.value, u instanceof t
? u
: new t((_) => {
          _(u)
        })).then(o, n)
      }
      l((i = i.apply(s, [])).next())
    });
  }
  const ei = 35; const _e = "#00A6ED"; const Wr = "white"; const Rt = 'rgb(224, 209, 41)';
  let te; let je; let ti = !1; let Zs = 35
  const me = '__live2d-toolbox-item';
  function nt() {
    te && (je && clearTimeout(je), je = setTimeout(() => {
      te.style.opacity = '1';
    }, 200))
  }
  function ot() {
    te && !ti && (je && clearTimeout(je), je = setTimeout(() => {
      te.style.opacity = '0';
    }, 200))
  }
  function lt(s, e = '', t = []) {
    const i = document.createElement('div');
    i.classList.add(me), t.forEach(o => i.classList.add(o))
    const r = document.createElement('span'); const a = document.createElement('span');
    return r.innerHTML = s, a.innerText = e, i.appendChild(r), i.appendChild(a), i
  }
  function $r(s) {
    const e = lt(Hr, '', ['button-item'])
    return e.style.backgroundColor = _e, e.style.fontSize = '1.05rem', e.addEventListener('mouseenter', () => {
      e.style.backgroundColor = Rt
    }), e.addEventListener('mouseleave', () => {
      e.style.backgroundColor = _e
    }), e.onclick = () => he(this, void 0, void 0, function* () {
      window.open('https://github.com/LSTM-Kirigaya/Live2dRender', '_blank');
    }), e
  }
  function Ks() {
    const s = document.createElement('div');
    s.style.display = 'flex', s.style.alignItems = 'center', s.style.justifyContent = 'center', s.style.flexDirection = 'column';
    const e = b.Canvas
    s.style.zIndex = Number.parseInt(e.style.zIndex) + 1 + '', s.style.opacity = '0', s.style.transition = '.7s cubic-bezier(0.23, 1, 0.32, 1)', s.style.position = 'fixed', s.style.right = `${e.width - Zs  }px`, s.style.top = `${window.innerHeight - e.height  }px`;
    const t = (function(o) {
      const n = lt(Xr, "", ["button-item"]);
      n.style.backgroundColor = _e, n.style.fontSize = "1.05rem", n.addEventListener("mouseenter", () => {
        n.style.backgroundColor = Rt;
      }), n.addEventListener("mouseleave", () => {
        n.style.backgroundColor = _e;
      });
      let l = 0;
      return n.onclick = () => he(this, void 0, void 0, function* () {
        const h = b.Canvas;
        if (h) {
          const u = Math.ceil(h.width);
          l = (l + u) % (u << 1), h.style.transform = `translateX(${l}px)`, o.style.transform = `translateX(${Math.max(0, l - Zs)}px)`, l > 0 ? (ti = !0, n.style.transform = "rotate(180deg)", setTimeout(() => {
            nt();
          }, 500)) : (ti = !1, n.style.transform = "rotate(0)");
        }
      }), n;
    }(s)), i = (function(o) {
      const n = lt(Gr, "", ["button-item"]);
      n.style.backgroundColor = _e, n.style.fontSize = "1.05rem", n.style.position = "relative";
      const l = document.createElement("div");
      l.style.position = "absolute", l.style.top = "0px", l.style.flexDirection = "column", l.style.transition = "all .75s cubic-bezier(0.23, 1, 0.32, 1)", l.style.display = "flex", l.style.opacity = "0";
      let h = 0;
      l.style.transform = `translate(-75px, ${h - 50}px)`, n.addEventListener("mouseenter", () => {
        n.style.backgroundColor = Rt, l.style.visibility = "visible", l.style.opacity = "1", l.style.transform = `translate(-75px, ${h}px)`;
      }), n.addEventListener("mouseleave", () => {
        n.style.backgroundColor = _e, l.style.opacity = "0", l.style.transform = `translate(-75px, ${h - 50}px)`, setTimeout(() => {
          l.style.visibility = "hidden";
        }, 500);
      }), l.addEventListener("wheel", (_) => {
        const g = getComputedStyle(l).transform;
        let d = new WebKitCSSMatrix(g).m42;
        _.deltaY > 0 ? d -= 50 : d += 50, h = d, l.style.transform = `translate(-75px, ${d}px)`, _.preventDefault();
      });
      const u = function(_) {
        const g = ie.getInstance(), d = b.Canvas, c = [];
        if (g && d) {
          const m = Math.max(0, Math.floor(d.height / ei) - 1), p = g.getModel(0), v = Math.min(p._expressions.getSize(), m);
          for (let x = 0; x < v; ++x) {
            const M = p._expressions._keyValues[x].first, f = M.replace(".exp3.json", ""), A = lt(qr, f);
            A.classList.add("expression-item"), A.onclick = () => he(this, void 0, void 0, function* () {
              p.setExpression(M);
            }), c.push(A);
          }
        }
        return c;
      }();
      for (const _ of u) l.appendChild(_);
      return n.appendChild(l), n;
    }()), r = (function(o) {
      const n = lt(Yr, "", ["button-item"]);
      return n.style.backgroundColor = _e, n.style.fontSize = "1.05rem", n.addEventListener("mouseenter", () => {
        n.style.backgroundColor = Rt;
      }), n.addEventListener("mouseleave", () => {
        n.style.backgroundColor = _e;
      }), n.onclick = () => he(this, void 0, void 0, function* () {
        Ws.refreshCache = !0, ie.getInstance().loadLive2dModel();
      }), n;
    }()), a = $r()
    return s.appendChild(t), s.appendChild(i), s.appendChild(r), s.appendChild(a), document.body.appendChild(s), s
  }
  let Xe = null
  class ie {
    static getInstance() {
      return Xe == null && (Xe = new ie()), Xe
    }
    static releaseInstance() {
      Xe != null && (Xe = void 0), Xe = null
    }
    getModel(e) {
      return e < this._models.getSize() ? this._models.at(e) : null
    }
    get model() {
      return this.getModel(0)
    }
    releaseAllModel() {
      for (let e = 0; e < this._models.getSize(); e++) this._models.at(e).release(), this._models.set(e, null)
      this._models.clear()
    }
    onDrag(e, t) {
      for (let i = 0; i < this._models.getSize(); i++) {
        const r = this.getModel(i)
        r && r.setDragging(e, t)
      }
    }

    onTap(e, t) {
      Y.printMessage(`[APP]tap point: {x: ${e.toFixed(2)} y: ${t.toFixed(2)}}`)
      for (let i = 0; i < this._models.getSize(); i++) this._models.at(i).hitTest(b.HitAreaNameHead, e, t) ? this._models.at(i).setRandomExpression() : this._models.at(i).hitTest(b.HitAreaNameBody, e, t) && this._models.at(i).startRandomMotion(b.MotionGroupTapBody, b.PriorityNormal, this._finishedMotion)
    }
    onUpdate() {
      const { width: e, height: t } = R; const i = this._models.getSize()
      for (let r = 0; r < i; ++r) {
        const a = new O(); const o = this.getModel(r)
        o.getModel() && (o.getModel().getCanvasWidth() > 1 && e < t ? (o.getModelMatrix().setWidth(2), a.scale(1, e / t)) : a.scale(t / e, 1), this._viewMatrix != null && a.multiplyByMatrix(this._viewMatrix)), o.update(), o.draw(a)
      }
    }

    nextScene() {
    }

    getModelPath(e) {
      if (!e.includes('/')) 
return '.';
      const t = e.split('/');
      return t.pop(), `${t.join("/")  }/`;
    }

    loadLive2dModel() {
      return e = this, t = void 0, r = function* () {
        const a = b.ResourcesPath
        if (!a.endsWith('.model3.json')) 
return void console.log('%c无法加载模型！模型资源路径的结尾必须是.model3.json！', 'background-color:rgb(227, 91, 49); color: white; padding: 3px; border-radius: 3px;');
        const o = this.getModelPath(a)
        this.releaseAllModel()
        const n = new jr()
        this._models.pushBack(n), yield n.loadAssets(o, a), setTimeout(() => {
          (function () {
            te && (ot(), document.body.removeChild(te), te = Ks(), nt(), te.onmouseenter = () => he(this, void 0, void 0, function* () {
              nt()
            }), te.onmouseleave = () => he(this, void 0, void 0, function* () {
              ot()
            }))
          })()
        }, 500), qs('[Live2dRender] 模型重载完成，重载路径: ' + o)
      }, new ((i = void 0) || (i = Promise))((a, o) => {
        function n(u) {
          try {
            h(r.next(u))
          } catch (_) {
            o(_)
          }
        }
        function l(u) {
          try {
            h(r.throw(u))
          } catch (_) {
            o(_)
          }
        }
        function h(u) {
          let _
          u.done
? a(u.value)
: (_ = u.value, _ instanceof i
? _
: new i((g) => {
            g(_)
          })).then(n, l)
        }
        h((r = r.apply(e, t || [])).next())
      });
      let e, t, i, r
    }
    setViewMatrix(e) {
      for (let t = 0; t < 16; t++) this._viewMatrix.getArray()[t] = e.getArray()[t]
    }
    constructor() {
      this._finishedMotion = (e) => {
        console.log(e)
      }, this._viewMatrix = new O(), this._models = new S(), this.loadLive2dModel()
    }
  }
  let Qs
  class Jr {
    constructor() {
      this._textures = new S()
    }
    release() {
      for (let e = this._textures.begin(); e.notEqual(this._textures.end()); e.preIncrement()) y.deleteTexture(e.ptr().id)
      this._textures = null
    }
    createTextureFromFile(e, t, i) {
      return r = this, a = void 0, n = function* () {
        for (let c = this._textures.begin(); c.notEqual(this._textures.end()); c.preIncrement()) { if (c.ptr().fileName == e && c.ptr().usePremultply == t) return c.ptr().img = new Image(), c.ptr().img.onload = () => i(c.ptr()), void (c.ptr().img.src = e);
}
        const l = new Image()
        l.onload = () => {
          const c = y.createTexture()
          y.bindTexture(y.TEXTURE_2D, c), y.texParameteri(y.TEXTURE_2D, y.TEXTURE_MIN_FILTER, y.LINEAR_MIPMAP_LINEAR), y.texParameteri(y.TEXTURE_2D, y.TEXTURE_MAG_FILTER, y.LINEAR), t && y.pixelStorei(y.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1), y.texImage2D(y.TEXTURE_2D, 0, y.RGBA, y.RGBA, y.UNSIGNED_BYTE, l), y.generateMipmap(y.TEXTURE_2D), y.bindTexture(y.TEXTURE_2D, null)
          const m = new Zr()
          m != null && (m.fileName = e, m.width = l.width, m.height = l.height, m.id = c, m.img = l, m.usePremultply = t, this._textures.pushBack(m)), i(m)
        };
        const h = e.split('.').at(-1).toLowerCase(); const u = yield ee(e); const _ = yield u.arrayBuffer(); const g = new Blob([_], { type: "image/" + h }); const d = URL.createObjectURL(g)
        l.src = d
      }, new ((o = void 0) || (o = Promise))((l, h) => {
        function u(d) {
          try {
            g(n.next(d))
          } catch (c) {
            h(c)
          }
        }
        function _(d) {
          try {
            g(n.throw(d))
          } catch (c) {
            h(c)
          }
        }
        function g(d) {
          let c
          d.done
? l(d.value)
: (c = d.value, c instanceof o
? c
: new o((m) => {
            m(c)
          })).then(u, _)
        }
        g((n = n.apply(r, a || [])).next())
      });
      let r, a, o, n
    }
    releaseTextures() {
      for (let e = 0; e < this._textures.getSize(); e++) this._textures.set(e, null)
      this._textures.clear()
    }
    releaseTextureByTexture(e) {
      for (let t = 0; t < this._textures.getSize(); t++) { if (this._textures.at(t).id == e) {
        this._textures.set(t, null), this._textures.remove(t);
        break;
      }
}
    }

    releaseTextureByFilePath(e) {
      for (let t = 0; t < this._textures.getSize(); t++) { if (this._textures.at(t).fileName == e) {
        this._textures.set(t, null), this._textures.remove(t);
        break;
      }
}
    }
  }
  class Zr {
    constructor() {
      this.id = null, this.width = 0, this.height = 0
    }
  }
  class er extends O {
    constructor() {
      super(), this._screenLeft = 0, this._screenRight = 0, this._screenTop = 0, this._screenBottom = 0, this._maxLeft = 0, this._maxRight = 0, this._maxTop = 0, this._maxBottom = 0, this._maxScale = 0, this._minScale = 0
    }
    adjustTranslate(e, t) {
      this._tr[0] * this._maxLeft + (this._tr[12] + e) > this._screenLeft && (e = this._screenLeft - this._tr[0] * this._maxLeft - this._tr[12]), this._tr[0] * this._maxRight + (this._tr[12] + e) < this._screenRight && (e = this._screenRight - this._tr[0] * this._maxRight - this._tr[12]), this._tr[5] * this._maxTop + (this._tr[13] + t) < this._screenTop && (t = this._screenTop - this._tr[5] * this._maxTop - this._tr[13]), this._tr[5] * this._maxBottom + (this._tr[13] + t) > this._screenBottom && (t = this._screenBottom - this._tr[5] * this._maxBottom - this._tr[13])
      const i = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, e, t, 0, 1])
      O.multiply(i, this._tr, this._tr)
    }
    adjustScale(e, t, i) {
      const r = this.getMaxScale(); const a = this.getMinScale(); const o = i * this._tr[0]
      o < a ? this._tr[0] > 0 && (i = a / this._tr[0]) : o > r && this._tr[0] > 0 && (i = r / this._tr[0])
      const n = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, e, t, 0, 1]); const l = new Float32Array([i, 0, 0, 0, 0, i, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); const h = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -e, -t, 0, 1])
      O.multiply(h, this._tr, this._tr), O.multiply(l, this._tr, this._tr), O.multiply(n, this._tr, this._tr)
    }
    setScreenRect(e, t, i, r) {
      this._screenLeft = e, this._screenRight = t, this._screenBottom = i, this._screenTop = r
    }
    setMaxScreenRect(e, t, i, r) {
      this._maxLeft = e, this._maxRight = t, this._maxTop = r, this._maxBottom = i
    }
    setMaxScale(e) {
      this._maxScale = e
    }
    setMinScale(e) {
      this._minScale = e
    }
    getMaxScale() {
      return this._maxScale
    }
    getMinScale() {
      return this._minScale
    }
    isMaxScale() {
      return this.getScaleX() >= this._maxScale
    }
    isMinScale() {
      return this.getScaleX() <= this._minScale
    }
    getScreenLeft() {
      return this._screenLeft
    }
    getScreenRight() {
      return this._screenRight
    }
    getScreenBottom() {
      return this._screenBottom
    }
    getScreenTop() {
      return this._screenTop
    }
    getMaxLeft() {
      return this._maxLeft
    }
    getMaxRight() {
      return this._maxRight
    }
    getMaxBottom() {
      return this._maxBottom
    }
    getMaxTop() {
      return this._maxTop
    }
  }
  (function (s) {
    s.CubismViewMatrix = er
  })(Qs || (Qs = {}))
  class Kr {
    constructor() {
      this._startX = 0, this._startY = 0, this._lastX = 0, this._lastY = 0, this._lastX1 = 0, this._lastY1 = 0, this._lastX2 = 0, this._lastY2 = 0, this._lastTouchDistance = 0, this._deltaX = 0, this._deltaY = 0, this._scale = 1, this._touchSingle = !1, this._flipAvailable = !1
    }
    getCenterX() {
      return this._lastX
    }
    getCenterY() {
      return this._lastY
    }
    getDeltaX() {
      return this._deltaX
    }
    getDeltaY() {
      return this._deltaY
    }
    getStartX() {
      return this._startX
    }
    getStartY() {
      return this._startY
    }
    getScale() {
      return this._scale
    }
    getX() {
      return this._lastX
    }
    getY() {
      return this._lastY
    }
    getX1() {
      return this._lastX1
    }
    getY1() {
      return this._lastY1
    }
    getX2() {
      return this._lastX2
    }
    getY2() {
      return this._lastY2
    }
    isSingleTouch() {
      return this._touchSingle
    }
    isFlickAvailable() {
      return this._flipAvailable
    }
    disableFlick() {
      this._flipAvailable = !1
    }
    touchesBegan(e, t) {
      this._lastX = e, this._lastY = t, this._startX = e, this._startY = t, this._lastTouchDistance = -1, this._flipAvailable = !0, this._touchSingle = !0
    }
    touchesMoved(e, t) {
      this._lastX = e, this._lastY = t, this._lastTouchDistance = -1, this._touchSingle = !0
    }
    getFlickDistance() {
      return this.calculateDistance(this._startX, this._startY, this._lastX, this._lastY)
    }
    calculateDistance(e, t, i, r) {
      return Math.sqrt((e - i) * (e - i) + (t - r) * (t - r))
    }
    calculateMovingAmount(e, t) {
      if (e > 0 != t > 0) 
return 0
      const i = e > 0 ? 1 : -1; const r = Math.abs(e); const a = Math.abs(t)
      return i * (r < a ? r : a)
    }
  }
  class Qr {
    constructor() {
      this._programId = null, this._touchManager = new Kr(), this._deviceToScreen = new O(), this._viewMatrix = new er()
    }
    initialize() {
      const { width: e, height: t } = R; const i = e / t; const r = -i; const a = i; const o = b.ViewLogicalLeft; const n = b.ViewLogicalRight
      if (this._viewMatrix.setScreenRect(r, a, o, n), this._viewMatrix.scale(b.ViewScale, b.ViewScale), this._deviceToScreen.loadIdentity(), e > t) {
        const l = Math.abs(a - r)
        this._deviceToScreen.scaleRelative(l / e, -l / e)
      } else {
        const l = Math.abs(n - o)
        this._deviceToScreen.scaleRelative(l / t, -l / t)
      }
      this._deviceToScreen.translateRelative(0.5 * -e, 0.5 * -t), this._viewMatrix.setMaxScale(b.ViewMaxScale), this._viewMatrix.setMinScale(b.ViewMinScale), this._viewMatrix.setMaxScreenRect(b.ViewLogicalMaxLeft, b.ViewLogicalMaxRight, b.ViewLogicalMaxBottom, b.ViewLogicalMaxTop)
    }
    release() {
      this._viewMatrix = null, this._touchManager = null, this._deviceToScreen = null, y.deleteProgram(this._programId), this._programId = null
    }
    render() {
      y.useProgram(this._programId), y.flush()
      const e = ie.getInstance()
      e.setViewMatrix(this._viewMatrix), e.onUpdate()
    }
    initializeSprite() {
      R.width, R.height, k.getInstance().getTextureManager(), this._programId == null && (this._programId = k.getInstance().createShader())
    }
    onTouchesBegan(e, t) {
      this._touchManager.touchesBegan(e, t)
    }
    onTouchesMoved(e, t) {
      const i = this.transformViewX(this._touchManager.getX()); const r = this.transformViewY(this._touchManager.getY())
      this._touchManager.touchesMoved(e, t), ie.getInstance().onDrag(i, r)
    }
    onTouchesEnded(e, t) {
      const i = ie.getInstance()
      i.onDrag(0, 0)
      {
        const r = this._deviceToScreen.transformX(this._touchManager.getX()); const a = this._deviceToScreen.transformY(this._touchManager.getY())
        i.onTap(r, a)
      }
    }

    transformViewX(e) {
      const t = this._deviceToScreen.transformX(e)
      return this._viewMatrix.invertTransformX(t)
    }
    transformViewY(e) {
      const t = this._deviceToScreen.transformY(e)
      return this._viewMatrix.invertTransformY(t)
    }
    transformScreenX(e) {
      return this._deviceToScreen.transformX(e)
    }
    transformScreenY(e) {
      return this._deviceToScreen.transformY(e)
    }
  }
  let ii = null; let J = null
  class Ge {
    constructor() {
      this._messageBox = null
    }
    static getInstance() {
      return ii == null && (ii = new Ge()), ii
    }
    getMessageBox() {
      return this._messageBox == null && (this._messageBox = document.querySelector('#live2dMessageBox-content')), this._messageBox
    }
    initialize(e) {
      return J = document.createElement('div'), J.id = b.MessageBoxId, J.style.position = 'fixed', J.style.padding = '10px', J.style.zIndex = '9999', J.style.display = 'flex', J.style.justifyContent = 'center', J.style.width = `${e.width  }px`, J.style.height = '20px', J.style.right = '0', J.style.bottom = `${e.height + 50  }px`, J.innerHTML = '<div id="live2dMessageBox-content"></div>', document.body.appendChild(J), this.hideMessageBox(), !0
    }
    setMessage(e, t = null) {
      const i = this.getMessageBox()
      this.hideMessageBox(), i.textContent = e, setTimeout(() => {
        document.querySelector('#' + b.MessageBoxId).style.bottom = `${(b.CanvasSize === "auto" ? 500 : b.CanvasSize.height) + i.offsetHeight - 25  }px`;
      }, 10), this.revealMessageBox(), t && setTimeout(() => {
        this.hideMessageBox()
      }, t)
    }
    hideMessageBox() {
      const e = this.getMessageBox()
      e.classList.remove('live2dMessageBox-content-visible'), e.classList.add('live2dMessageBox-content-hidden');
    }

    revealMessageBox() {
      const e = this.getMessageBox()
      e.classList.remove('live2dMessageBox-content-hidden'), e.classList.add('live2dMessageBox-content-visible');
    }
  }
  let R = null; let Ve = null; let y = null; let si = null
  class k {
    static getInstance() {
      return Ve == null && (Ve = new k()), Ve
    }
    static releaseInstance() {
      Ve != null && Ve.release(), Ve = null
    }
    initialize() {
      return R = document.createElement('canvas'), R.id = b.CanvasId, R.style.position = 'fixed', R.style.bottom = '0', R.style.right = '0', R.style.zIndex = '9999', b.Canvas = R, b.CanvasSize === 'auto' ? this._resizeCanvas() : (R.width = b.CanvasSize.width, R.height = b.CanvasSize.height), R.style.opacity = '0', R.style.transition = '.7s cubic-bezier(0.23, 1, 0.32, 1)', y = R.getContext('webgl') || R.getContext('experimental-webgl'), y ? (document.body.appendChild(R), Ge.getInstance().initialize(R), si || (si = y.getParameter(y.FRAMEBUFFER_BINDING)), y.enable(y.BLEND), y.blendFunc(y.SRC_ALPHA, y.ONE_MINUS_SRC_ALPHA), y.clear(y.COLOR_BUFFER_BIT | y.DEPTH_BUFFER_BIT), 'ontouchend' in R ? (R.ontouchstart = sa, R.ontouchmove = ra, R.ontouchend = aa, R.ontouchcancel = na) : (R.onmousedown = ea, R.onmousemove = ta, R.onmouseup = ia), this._view.initialize(), this.initializeCubism(), !0) : (console.log('Cannot initialize WebGL. This browser does not support.'), y = null, !1)
    }
    onResize() {
      this._resizeCanvas(), this._view.initialize(), this._view.initializeSprite()
      const e = [0, 0, R.width, R.height]
      y.viewport(e[0], e[1], e[2], e[3])
    }
    release() {
      this._textureManager.release(), this._textureManager = null, this._view.release(), this._view = null, ie.releaseInstance(), V.dispose()
    }
    run() {
      const e = () => {
        Ve != null && (Y.updateTime(), y.clearColor(...b.BackgroundRGBA), y.enable(y.DEPTH_TEST), y.depthFunc(y.LEQUAL), y.clear(y.COLOR_BUFFER_BIT | y.DEPTH_BUFFER_BIT), y.clearDepth(1), y.enable(y.BLEND), y.blendFunc(y.SRC_ALPHA, y.ONE_MINUS_SRC_ALPHA), this._view.render(), requestAnimationFrame(e))
      };
      e()
    }
    createShader() {
      const e = y.createShader(y.VERTEX_SHADER)
      if (e == null) 
return null
      y.shaderSource(e, 'precision mediump float;attribute vec3 position;attribute vec2 uv;varying vec2 vuv;void main(void){   gl_Position = vec4(position, 1.0);   vuv = uv;}'), y.compileShader(e)
      const t = y.createShader(y.FRAGMENT_SHADER)
      if (t == null) 
return null
      y.shaderSource(t, 'precision mediump float;varying vec2 vuv;uniform sampler2D texture;void main(void){   gl_FragColor = texture2D(texture, vuv);}'), y.compileShader(t)
      const i = y.createProgram()
      return y.attachShader(i, e), y.attachShader(i, t), y.deleteShader(e), y.deleteShader(t), y.linkProgram(i), y.useProgram(i), i
    }
    getView() {
      return this._view
    }
    getTextureManager() {
      return this._textureManager
    }
    constructor() {
      this._captured = !1, this._mouseX = 0, this._mouseY = 0, this._isEnd = !1, this._cubismOption = new or(), this._view = new Qr(), this._textureManager = new Jr()
    }
    initializeCubism() {
      this._cubismOption.logFunction = Y.printMessage, this._cubismOption.loggingLevel = b.CubismLoggingLevel, V.startUp(this._cubismOption), V.initialize(), ie.getInstance(), Y.updateTime()
    }
    _resizeCanvas() {
      R.width = window.innerWidth, R.height = window.innerHeight
    }
  }
  function ea(s) {
    k.getInstance()._view ? ie.getInstance().model.setRandomExpression() : Y.printMessage('view notfound');
  }
  function ta(s) {
    const e = k.getInstance()
    if (!e._view) 
return;
    const t = s.target.getBoundingClientRect(); const i = s.clientX - t.left; const r = s.clientY - t.top
    e._view.onTouchesMoved(i, r)
  }
  function ia(s) {
    if (k.getInstance()._captured = !1, !k.getInstance()._view) 
return;
    const e = s.target.getBoundingClientRect(); const t = s.clientX - e.left; const i = s.clientY - e.top
    k.getInstance()._view.onTouchesEnded(t, i)
  }
  function sa(s) {
    const e = k.getInstance()
    if (!e._view) 
return;
    const t = s.changedTouches[0].pageX; const i = s.changedTouches[0].pageY
    e._view.onTouchesBegan(t, i)
  }
  function ra(s) {
    if (!k.getInstance()._captured || !k.getInstance()._view) 
return;
    const e = s.target.getBoundingClientRect(); const t = s.changedTouches[0].clientX - e.left; const i = s.changedTouches[0].clientY - e.top
    k.getInstance()._view.onTouchesMoved(t, i)
  }
  function aa(s) {
    if (k.getInstance()._captured = !1, !k.getInstance()._view) 
return;
    const e = s.target.getBoundingClientRect(); const t = s.changedTouches[0].clientX - e.left; const i = s.changedTouches[0].clientY - e.top
    k.getInstance()._view.onTouchesEnded(t, i)
  }
  function na(s) {
    if (k.getInstance()._captured = !1, !k.getInstance()._view) 
return;
    const e = s.target.getBoundingClientRect(); const t = s.changedTouches[0].clientX - e.left; const i = s.changedTouches[0].clientY - e.top
    k.getInstance()._view.onTouchesEnded(t, i)
  }
  let ri = function (s, e, t, i) {
    return new (t || (t = Promise))((r, a) => {
      function o(h) {
        try {
          l(i.next(h))
        } catch (u) {
          a(u)
        }
      }
      function n(h) {
        try {
          l(i.throw(h))
        } catch (u) {
          a(u)
        }
      }
      function l(h) {
        let u
        h.done
? r(h.value)
: (u = h.value, u instanceof t
? u
: new t((_) => {
          _(u)
        })).then(o, n)
      }
      l((i = i.apply(s, [])).next())
    });
  }
  function oa(s) {
    const e = ie.getInstance()
    e && e.getModel(0).setExpression(s)
  }
  function la() {
    const s = ie.getInstance()
    s && s.model.setRandomExpression()
  }
  function ua(s, e) {
    Ge.getInstance().setMessage(s, e)
  }
  function ha() {
    Ge.getInstance().hideMessageBox()
  }
  function ga() {
    Ge.getInstance().revealMessageBox()
  }
  function da(s) {
    const e = document.createElement('script');
    return e.src = s, new Promise((t, i) => {
      e.onload = () => {
        t()
      }, e.onerror = (r) => {
        i(r)
      }, document.head.appendChild(e)
    });
  }
  function ca(s) {
    return ri(this, void 0, void 0, function* () {
      if (!(document.querySelectorAll('#live2d').length >= 1)) {
        if (s.MinifiedJSUrl === void 0 && (s.MinifiedJSUrl = 'https://unpkg.com/core-js-bundle@3.6.1/minified.js'), s.Live2dCubismcoreUrl === void 0 && (s.Live2dCubismcoreUrl = 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js'), s.ShowToolBox === void 0 && (s.ShowToolBox = !1), b.ShowToolBox = s.ShowToolBox, yield (function(t) {
          return ri(this, void 0, void 0, function* () {
            const i = [];
            for (const r of t) i.push(da(r));
            for (const r of i) yield r;
          });
        }([s.MinifiedJSUrl, s.Live2dCubismcoreUrl])), s.CanvasId && (b.CanvasId = s.CanvasId), s.CanvasSize && (b.CanvasSize = s.CanvasSize), s.BackgroundRGBA && (b.BackgroundRGBA = s.BackgroundRGBA), s.ResourcesPath && (b.ResourcesPath = s.ResourcesPath), s.LoadFromCache && window.indexedDB) {
          b.LoadFromCache = s.LoadFromCache
          const t = yield (e = 'live2d', new Promise((i, r) => {
            window.indexedDB === void 0 && i(void 0)
            const a = indexedDB.open('db', 1)
            a.onsuccess = (o) => {
              const n = o.currentTarget.result
              i(n)
            }, a.onerror = (o) => {
              const n = o.currentTarget.error
              console.log('[live2d] 打开 indexDB 错误. ' + n.message), i(void 0)
            }, a.onupgradeneeded = (o) => {
              const n = o.currentTarget.result
              if (e && !n.objectStoreNames.contains(e)) {
                const l = n.createObjectStore(e, { autoIncrement: !0 })
                l.createIndex('url', 'url', { unique: !0 }), l.createIndex('arraybuffer', 'arraybuffer');
              }
            }
          }))
          b.Live2dDB = t
        }
        let e
        return (function() {
          return ri(this, void 0, void 0, function* () {
            const t = k.getInstance();
            t.initialize() ? (t.run(), b.Canvas && b.ShowToolBox && setTimeout(() => {
              b.Canvas.style.opacity = "1", function() {
                (function() {
                  const r = document.createElement("style");
                  r.innerHTML = `
.${me} {
    margin: 2px;
    padding: 2px;
    display: flex;
    height: ${ei}px;
    width: ${ei}px;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 0.7rem;
    background-color: ${_e};
    color: ${Wr};
    border-radius: 0.5em;
    transition: all .35s cubic-bezier(0.23, 1, 0.32, 1);
}

.${me}:hover {
    background-color: rgb(224, 209, 41);
}

.${me}.button-item {
    display: flex;
    align-items: center;
    width: fit-content;
    padding: 5px 10px 0px;
}

.${me}.button-item svg {
    height: 20px;
}

.${me}.expression-item {
    display: flex;
    align-items: center;
    width: fit-content;
    padding: 3px 10px;
}

.${me}.expression-item > span:last-child {
    width: 60px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.${me}.expression-item svg {
    height: 20px;
    margin-right: 5px;
}

.${me} svg path {
    fill: white;
}

`, document.head.appendChild(r);
                })(), te = Ks(), ot(), te.onmouseenter = () => he(this, void 0, void 0, function* () {
                  nt();
                }), te.onmouseleave = () => he(this, void 0, void 0, function* () {
                  ot();
                });
                const i = b.Canvas;
                i.onmouseenter = () => he(this, void 0, void 0, function* () {
                  nt();
                }), i.onmouseleave = () => he(this, void 0, void 0, function* () {
                  ot();
                });
              }();
            }, 500)) : console.log("初始化失败，退出");
          });
        }());
      }
    })
  }
  window && (window.onbeforeunload = () => {
    const s = k.getInstance()
    s && s.release()
  }, window.onresize = () => {
    const s = k.getInstance()
    s && b.CanvasSize === 'auto' && s.onResize()
  }), rr.exports = Ft
})()
var _a = rr.exports
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', sr) : sr()
async function sr() {
  try {
    console.log('[Live2D] 开始初始化前台 Live2D...'), await _a.initializeLive2D({
      // live2d 所在区域的背景颜色（透明）
      BackgroundRGBA: [0, 0, 0, 0],
      // live2d 的 model3.json 文件的路径
      // 使用 Halo API 路径格式访问插件静态资源
      ResourcesPath: '/apis/api.console.halo.run/v1alpha1/plugins/live2d/assets/live2d/米塔/3.model3.json',
      // live2d 的大小
      CanvasSize: {
        height: 500,
        width: 400,
      },
      // live2d 的位置 ('left' | 'right')
      CanvasPosition: 'right',
      // 展示工具箱（Live2dRender 原生的）
      ShowToolBox: !0,
      // 是否使用 indexDB 进行缓存优化
      LoadFromCache: !0,
    }), console.log('[Live2D] ✅ 米塔加载完成');
  }
 catch (ht) {
    console.error('[Live2D] ❌ 初始化失败:', ht)
  }
}
