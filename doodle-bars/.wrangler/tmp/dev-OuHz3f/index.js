var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker/index.ts
import { DurableObject } from "cloudflare:workers";

// src/catalog/playlists/english.ts
function track(trackId, title2, artist, lane, aliases) {
  return aliases ? { trackId, title: title2, artist, lane, aliases } : { trackId, title: title2, artist, lane };
}
__name(track, "track");
var entries = [
  track(1193701392, "Shape of You", "Ed Sheeran", "party"),
  track(1615585008, "As It Was", "Harry Styles", "party"),
  track(1538003843, "Levitating", "Dua Lipa", "party"),
  track(1450695739, "bad guy", "Billie Eilish", "party"),
  track(943946671, "Uptown Funk", "Mark Ronson & Bruno Mars", "party"),
  track(1440933651, "Shake It Off", "Taylor Swift", "party"),
  track(1674691586, "Flowers", "Miley Cyrus", "party"),
  track(863835363, "Happy", "Pharrell Williams", "party"),
  track(1471704175, "Counting Stars", "OneRepublic", "party"),
  track(1499378607, "Blinding Lights", "The Weeknd", "party"),
  track(1649434293, "Anti-Hero", "Taylor Swift", "party"),
  track(1475930045, "Dance Monkey", "Tones And I", "party"),
  track(1485802967, "Watermelon Sugar", "Harry Styles", "party"),
  track(1574968888, "STAY", "The Kid LAROI & Justin Bieber", "party"),
  track(1445949267, "Sunflower", "Post Malone & Swae Lee", "party"),
  track(1484636829, "Don't Start Now", "Dua Lipa", "party"),
  track(1411628233, "Believer", "Imagine Dragons", "party"),
  track(1411629089, "Thunder", "Imagine Dragons", "party"),
  track(1170699703, "Closer", "The Chainsmokers", "party"),
  track(1447401620, "Despacito", "Luis Fonsi & Daddy Yankee", "party"),
  track(1468166468, "Old Town Road", "Lil Nas X", "party"),
  track(1571330212, "Bad Habits", "Ed Sheeran", "party"),
  track(1556170101, "Peaches", "Justin Bieber", "party"),
  track(1505683980, "Save Your Tears", "The Weeknd", "party"),
  track(1582277652, "good 4 u", "Olivia Rodrigo", "party"),
  track(1634655870, "About Damn Time", "Lizzo", "party"),
  track(1055074640, "Cheap Thrills", "Sia", "party"),
  track(1440818897, "Roar", "Katy Perry", "party"),
  track(1440933517, "Blank Space", "Taylor Swift", "party"),
  track(1468058171, "Cruel Summer", "Taylor Swift", "party"),
  track(1321217032, "Havana", "Camila Cabello", "party"),
  track(1440829610, "Sorry", "Justin Bieber", "party"),
  track(573962551, "Locked Out of Heaven", "Bruno Mars", "party"),
  track(1161504024, "24K Magic", "Bruno Mars", "party"),
  track(1228742334, "New Rules", "Dua Lipa", "party"),
  track(1440841384, "One Dance", "Drake", "party"),
  track(1406109863, "God's Plan", "Drake", "party"),
  track(1440903439, "Lose Yourself", "Eminem", "party"),
  track(1440872929, "Wake Me Up", "Avicii", "party"),
  track(693226464, "Titanium", "David Guetta", "party"),
  track(716192625, "Firework", "Katy Perry", "party"),
  track(1440819170, "Dark Horse", "Katy Perry", "party"),
  track(1440855562, "Sugar", "Maroon 5", "party"),
  track(1627575419, "Dynamite", "BTS", "party"),
  track(1627575769, "Butter", "BTS", "party"),
  track(1154239184, "Can't Stop the Feeling", "Justin Timberlake", "party"),
  track(1446016735, "I Gotta Feeling", "Black Eyed Peas", "party"),
  track(1440874008, "Call Me Maybe", "Carly Rae Jepsen", "party"),
  track(1445007713, "Party in the U.S.A.", "Miley Cyrus", "party"),
  track(1817217063, "Hips Don't Lie", "Shakira", "party"),
  track(1440858500, "Can't Feel My Face", "The Weeknd", "party"),
  track(1440870375, "Starboy", "The Weeknd", "party"),
  track(1440787349, "Levels", "Avicii", "party"),
  track(1440873108, "Hey Brother", "Avicii", "party"),
  track(1161504043, "That's What I Like", "Bruno Mars", "party"),
  track(581806439, "Treasure", "Bruno Mars", "party"),
  track(1440758945, "We Found Love", "Rihanna", "party"),
  track(1444321282, "Diamonds", "Rihanna", "party"),
  track(617154366, "Get Lucky", "Daft Punk, Pharrell Williams & Nile Rodgers", "party"),
  track(1594982922, "Royals", "Lorde", "party"),
  track(1440873126, "Radioactive", "Imagine Dragons", "party"),
  track(1440857424, "Born This Way", "Lady Gaga", "party"),
  track(1744253558, "Espresso", "Sabrina Carpenter", "party"),
  track(1724488124, "Beautiful Things", "Benson Boone", "party"),
  track(1691699836, "Lose Control", "Teddy Swims", "party"),
  track(1762656732, "Die With A Smile", "Lady Gaga & Bruno Mars", "party"),
  track(1773452221, "APT.", "Ros\xE9 & Bruno Mars", "party"),
  track(1193701400, "Perfect", "Ed Sheeran", "romance"),
  track(1050204631, "Thinking Out Loud", "Ed Sheeran", "romance"),
  track(1050204626, "Photograph", "Ed Sheeran", "romance"),
  track(1544491233, "Rolling in the Deep", "Adele", "romance"),
  track(1544491998, "Someone Like You", "Adele", "romance"),
  track(1452619054, "Someone You Loved", "Lewis Capaldi", "romance"),
  track(1434371887, "Shallow", "Lady Gaga & Bradley Cooper", "romance"),
  track(1560735480, "drivers license", "Olivia Rodrigo", "romance", ["Drivers License"]),
  track(1590036021, "Easy On Me", "Adele", "romance"),
  track(1440924808, "Love Story", "Taylor Swift", "romance"),
  track(1440925035, "You Belong With Me", "Taylor Swift", "romance"),
  track(1468910018, "Se\xF1orita", "Shawn Mendes & Camila Cabello", "romance"),
  track(966411602, "See You Again", "Wiz Khalifa", "romance"),
  track(1477880561, "Circles", "Post Malone", "romance"),
  track(1571176664, "Memories", "Maroon 5", "romance"),
  track(1396141911, "Girls Like You", "Maroon 5", "romance"),
  track(1293229677, "Attention", "Charlie Puth", "romance"),
  track(900672609, "Take Me to Church", "Hozier", "romance"),
  track(1441844542, "All of Me", "John Legend", "romance"),
  track(576670459, "Just the Way You Are", "Bruno Mars", "romance"),
  track(1440814425, "Stay With Me", "Sam Smith", "romance"),
  track(1147252591, "Say You Won't Let Go", "James Arthur", "romance"),
  track(1623014090, "Let Her Go", "Passenger", "romance"),
  track(573962555, "When I Was Your Man", "Bruno Mars", "romance"),
  track(1590368456, "All Too Well", "Taylor Swift", "romance", ["All Too Well Taylor's Version"]),
  track(1468058173, "Lover", "Taylor Swift", "romance"),
  track(1544494392, "Hello", "Adele", "romance"),
  track(1581702085, "Until I Found You", "Stephen Sanchez", "romance"),
  track(1440872304, "Die For You", "The Weeknd", "romance"),
  track(1485802970, "Adore You", "Harry Styles", "romance"),
  track(1485802975, "Falling", "Harry Styles", "romance"),
  track(1524680849, "Night Changes", "One Direction", "romance"),
  track(695312371, "Story of My Life", "One Direction", "romance"),
  track(1440904109, "Treat You Better", "Shawn Mendes", "romance"),
  track(1443072098, "Love Me Like You Do", "Ellie Goulding", "romance"),
  track(1485384412, "Before You Go", "Lewis Capaldi", "romance"),
  track(576670463, "Marry You", "Bruno Mars", "romance"),
  track(576655094, "Grenade", "Bruno Mars", "romance"),
  track(1544491988, "Set Fire to the Rain", "Adele", "romance"),
  track(1440837905, "I'm Not the Only One", "Sam Smith", "romance"),
  track(1440829613, "Love Yourself", "Justin Bieber", "romance"),
  track(1524801580, "cardigan", "Taylor Swift", "romance", ["Cardigan"]),
  track(1226034393, "Sign of the Times", "Harry Styles", "romance"),
  track(1545382976, "Make You Feel My Love", "Adele", "romance"),
  track(1440845641, "Earned It", "The Weeknd", "romance"),
  track(1441728727, "Let Me Down Slowly", "Alec Benjamin", "romance"),
  track(610187010, "All I Want", "Kodaline", "romance"),
  track(735301552, "Say Something", "A Great Big World", "romance"),
  track(1441133277, "Hey Jude", "The Beatles", "classic"),
  track(1422721989, "Sweet Caroline", "Neil Diamond", "classic"),
  track(283567164, "I Want It That Way", "Backstreet Boys", "classic"),
  track(1573849255, "Wannabe", "Spice Girls", "classic"),
  track(1440754487, "Somebody That I Used to Know", "Gotye", "classic"),
  track(1122773680, "Viva La Vida", "Coldplay", "classic"),
  track(1122782283, "Yellow", "Coldplay", "classic"),
  track(1472021081, "Crazy in Love", "Beyonc\xE9", "classic"),
  track(296016899, "Single Ladies", "Beyonc\xE9", "classic"),
  track(1441154437, "Umbrella", "Rihanna", "classic"),
  track(1476095084, "Bad Romance", "Lady Gaga", "classic"),
  track(185717604, "Africa", "Toto", "classic"),
  track(380907765, "Take On Me", "a-ha", "classic"),
  track(269573303, "Thriller", "Michael Jackson", "classic"),
  track(269573364, "Billie Jean", "Michael Jackson", "classic"),
  track(1422648513, "Dancing Queen", "ABBA", "classic"),
  track(1440861294, "Mamma Mia", "ABBA", "classic"),
  track(1441164738, "Let It Be", "The Beatles", "classic"),
  track(1441164805, "Yesterday", "The Beatles", "classic"),
  track(1468023761, "I Want to Hold Your Hand", "The Beatles", "classic"),
  track(83445997, "Like a Prayer", "Madonna", "classic"),
  track(400603693, "Girls Just Want to Have Fun", "Cyndi Lauper", "classic"),
  track(255966421, "Sweet Dreams", "Eurythmics", "classic", ["Sweet Dreams Are Made of This"]),
  track(1456623340, "September", "Earth, Wind & Fire", "classic"),
  track(1440900114, "Stayin' Alive", "Bee Gees", "classic", ["Staying Alive"]),
  track(1443818368, "I Will Survive", "Gloria Gaynor", "classic"),
  track(840431935, "I Wanna Dance with Somebody", "Whitney Houston", "classic"),
  track(429945616, "Careless Whisper", "George Michael", "classic"),
  track(1440882897, "Every Breath You Take", "The Police", "classic"),
  track(1440729860, "With or Without You", "U2", "classic"),
  track(1443100723, "Beautiful Day", "U2", "classic"),
  track(479204873, "My Heart Will Go On", "Celine Dion", "classic"),
  track(388151901, "I Will Always Love You", "Whitney Houston", "classic"),
  track(6781024437, "Bohemian Rhapsody", "Queen", "rock"),
  track(1377826892, "Sweet Child O' Mine", "Guns N' Roses", "rock"),
  track(635770202, "Hotel California", "Eagles", "rock"),
  track(1517447333, "Wonderwall", "Oasis", "rock"),
  track(1440783625, "Smells Like Teen Spirit", "Nirvana", "rock"),
  track(1422955211, "Livin' On a Prayer", "Bon Jovi", "rock"),
  track(160024096, "Don't Stop Believin'", "Journey", "rock"),
  track(1440891171, "Mr. Brightside", "The Killers", "rock"),
  track(1533513537, "Seven Nation Army", "The White Stripes", "rock"),
  track(1193701328, "Castle on the Hill", "Ed Sheeran", "rock"),
  track(6781080737, "We Will Rock You", "Queen", "rock"),
  track(6781080744, "We Are the Champions", "Queen", "rock"),
  track(6781076397, "Another One Bites the Dust", "Queen", "rock"),
  track(6781079518, "Don't Stop Me Now", "Queen", "rock"),
  track(254685026, "Eye of the Tiger", "Survivor", "rock"),
  track(1413948381, "Sweet Home Alabama", "Lynyrd Skynyrd", "rock"),
  track(1658644941, "Dream On", "Aerosmith", "rock"),
  track(1160082180, "Basket Case", "Green Day", "rock"),
  track(1161539473, "Holiday", "Green Day", "rock"),
  track(207192838, "Wake Me Up When September Ends", "Green Day", "rock"),
  track(590431785, "In the End", "Linkin Park", "rock"),
  track(590423552, "Numb", "Linkin Park", "rock"),
  track(1572051818, "Enter Sandman", "Metallica", "rock"),
  track(1572046444, "Nothing Else Matters", "Metallica", "rock"),
  track(1099335223, "Smoke on the Water", "Deep Purple", "rock"),
  track(580708180, "Stairway to Heaven", "Led Zeppelin", "rock"),
  track(1440745782, "Paint It Black", "The Rolling Stones", "rock", ["Paint It, Black"]),
  track(1440765093, "Satisfaction", "The Rolling Stones", "rock", ["I Can't Get No Satisfaction"]),
  track(574050602, "Back in Black", "AC/DC", "rock"),
  track(574044008, "Highway to Hell", "AC/DC", "rock"),
  track(1440783636, "Come As You Are", "Nirvana", "rock"),
  track(948460560, "Under the Bridge", "Red Hot Chili Peppers", "rock"),
  track(947688104, "Californication", "Red Hot Chili Peppers", "rock"),
  track(948438478, "Can't Stop", "Red Hot Chili Peppers", "rock"),
  track(1123076826, "Fix You", "Coldplay", "rock"),
  track(1122776155, "The Scientist", "Coldplay", "rock"),
  track(1122776156, "Clocks", "Coldplay", "rock"),
  track(1440758864, "Chasing Cars", "Snow Patrol", "rock"),
  track(290303018, "Use Somebody", "Kings of Leon", "rock"),
  track(290303003, "Sex on Fire", "Kings of Leon", "rock"),
  track(663097965, "Do I Wanna Know?", "Arctic Monkeys", "rock", ["Do I Wanna Know"]),
  track(315844084, "Take Me Out", "Franz Ferdinand", "rock"),
  track(266377010, "Last Nite", "The Strokes", "rock", ["Last Night"]),
  track(1440840510, "All the Small Things", "blink-182", "rock"),
  track(1450030115, "The Middle", "Jimmy Eat World", "rock"),
  track(1440783764, "Lithium", "Nirvana", "rock"),
  track(425465319, "Alive", "Pearl Jam", "rock"),
  track(362133505, "Everlong", "Foo Fighters", "rock"),
  track(300855110, "Best of You", "Foo Fighters", "rock"),
  track(278229654, "Learn to Fly", "Foo Fighters", "rock"),
  track(262743414, "The Pretender", "Foo Fighters", "rock"),
  track(1440868258, "Island in the Sun", "Weezer", "rock"),
  track(1440798133, "Buddy Holly", "Weezer", "rock"),
  track(1890580963, "Say It Ain't So", "Weezer", "rock"),
  track(1526194195, "Somebody Told Me", "The Killers", "rock"),
  track(208036515, "Dani California", "Red Hot Chili Peppers", "rock"),
  track(945575409, "Scar Tissue", "Red Hot Chili Peppers", "rock")
];
function toSong(entry) {
  return entry.aliases ? { trackId: entry.trackId, title: entry.title, artist: entry.artist, aliases: entry.aliases } : { trackId: entry.trackId, title: entry.title, artist: entry.artist };
}
__name(toSong, "toSong");
function playlist(id, name, description, lane) {
  const songs3 = entries.filter((entry) => lane === void 0 || entry.lane === lane).map(toSong);
  return { id, name, description, storefront: "us", songs: songs3 };
}
__name(playlist, "playlist");
var english = playlist("english", "English mix", "Pop, rock, and older hits.");
var englishRomance = playlist("english-romance", "English romance", "Love songs.", "romance");
var englishParty = playlist("english-party", "English party", "Dance songs.", "party");
var englishClassics = playlist("english-classics", "English classics", "Older hits.", "classic");
var englishRock = playlist("english-rock", "English rock", "Rock songs.", "rock");

// src/catalog/playlists/hindi.ts
function track2(trackId, title2, artist, lane, aliases) {
  return aliases ? { trackId, title: title2, artist, lane, aliases } : { trackId, title: title2, artist, lane };
}
__name(track2, "track");
var entries2 = [
  track2(1635014240, "Kesariya", "Pritam, Arijit Singh & Amitabh Bhattacharya", "romance"),
  track2(1073359419, "Tum Hi Ho", "Mithoon & Arijit Singh", "romance"),
  track2(300388792, "Kal Ho Naa Ho", "Shankar Ehsaan Loy & Sonu Nigam", "classic", ["Kal Ho Na Ho"]),
  track2(1169015785, "Channa Mereya", "Pritam & Arijit Singh", "romance", ["Chana Mereya"]),
  track2(1653219849, "Apna Bana Le", "Arijit Singh, Sachin-Jigar & Amitabh Bhattacharya", "romance"),
  track2(1123241921, "Kun Faya Kun", "A.R. Rahman, Javed Ali & Mohit Chauhan", "sufi"),
  track2(1130322151, "Chaiyya Chaiyya", "Sukhwinder Singh & Sapna Awasthi", "classic", ["Chaiya Chaiya"]),
  track2(1057567670, "Gerua", "Pritam, Arijit Singh & Antara Mitra", "romance"),
  track2(1070912815, "Ilahi", "Pritam & Arijit Singh", "sufi"),
  track2(1117420365, "Raabta", "Pritam, Hamsika, Arijit Singh & Joi", "romance", ["Rabta"]),
  track2(1134725347, "Tum Se Hi", "Pritam & Mohit Chauhan", "romance"),
  track2(1071074558, "Agar Tum Saath Ho", "Alka Yagnik & Arijit Singh", "romance", ["Agar Tum Sath Ho"]),
  track2(1070912834, "Kabira", "Pritam, Harshdeep & Arijit Singh", "sufi"),
  track2(1123340746, "Pee Loon", "Pritam & Mohit Chauhan", "romance"),
  track2(1263940994, "Hawayein", "Pritam & Arijit Singh", "romance", ["Hawayen", "Hawaien"]),
  track2(1499107789, "Shayad", "Pritam & Arijit Singh", "romance"),
  track2(1468448742, "Tujhe Kitna Chahne Lage", "Arijit Singh", "romance", [
    "Tujhe Kitna Chaahne Lage",
    "Tujhe Kitna Chahne Lage Hum"
  ]),
  track2(660561134, "Tum Mile", "Neeraj Shridhar & Pritam", "romance"),
  track2(1057567677, "Janam Janam", "Pritam, Antara Mitra & Arijit Singh", "romance"),
  track2(1111741439, "Galliyan", "Ankit Tiwari", "romance", ["Galiyan"]),
  track2(887456975, "Samjhawan", "Arijit Singh & Shreya Ghoshal", "romance", ["Samjhawan Unplugged"]),
  track2(1189133564, "Enna Sona", "A.R. Rahman & Arijit Singh", "romance"),
  track2(1810439755, "Phir Bhi Tumko Chaahunga", "Mithoon, Arijit Singh & Shashaa Tirupati", "romance", [
    "Phir Bhi Tumko Chahunga"
  ]),
  track2(1468448744, "Tera Ban Jaunga", "Akhil Sachdeva & Tulsi Kumar", "romance"),
  track2(1205913429, "Humsafar", "Akhil Sachdeva & Mansheel Gujral", "romance"),
  track2(1580955743, "Raataan Lambiyan", "Tanishk Bagchi, Jubin Nautiyal & Asees Kaur", "romance", [
    "Raatan Lambiyan",
    "Rataan Lambiyan"
  ]),
  track2(656016091, "Tum Tak", "A.R. Rahman, Javed Ali & Kirti Sagathia", "romance"),
  track2(1468448738, "Bekhayali", "Sachet Tandon", "romance"),
  track2(1553611733, "Dil Diyan Gallan", "Atif Aslam", "romance"),
  track2(1478499923, "Khairiyat", "Pritam & Arijit Singh", "romance"),
  track2(1482235392, "Tum Hi Aana", "Payal Dev & Jubin Nautiyal", "romance"),
  track2(1702461667, "Chaleya", "Anirudh Ravichander, Arijit Singh & Shilpa Rao", "romance"),
  track2(1070912828, "Subhanallah", "Pritam, Sreeram & Shilpa Rao", "romance", ["Subhan Allah"]),
  track2(1477605521, "Pachtaoge", "Arijit Singh", "romance"),
  track2(1730464043, "Sajni", "Ram Sampath & Arijit Singh", "romance"),
  track2(1720723962, "O Maahi", "Pritam & Arijit Singh", "romance", ["Oh Maahi"]),
  track2(1529543285, "Qaafirana", "Arijit Singh & Nikhita Gandhi", "romance", ["Kafirana", "Qaafiraana"]),
  track2(1529541384, "Ve Maahi", "Arijit Singh & Asees Kaur", "romance"),
  track2(1580955750, "Ranjha", "Jasleen Royal & B. Praak", "romance"),
  track2(1690466656, "Heeriye", "Jasleen Royal & Arijit Singh", "romance"),
  track2(1174924385, "Bulleya", "Pritam, Amit Mishra & Shilpa Rao", "romance"),
  track2(1131692261, "Masakali", "Mohit Chauhan", "romance"),
  track2(1070912803, "Badtameez Dil", "Pritam, Benny Dayal & Shefali Alvares", "party", ["Badtamez Dil"]),
  track2(1088788681, "Kar Gayi Chull", "Badshah, Amaal Mallik, Fazilpuria & Neha Kakkar", "party"),
  track2(1529568809, "Kala Chashma", "Badshah, Neha Kakkar & Indeep Bakshi", "party", ["Kaala Chashma"]),
  track2(1116194835, "London Thumakda", "Labh Janjua, Sonu Kakkar, Neha Kakkar & Amit Trivedi", "party"),
  track2(1111783498, "Abhi Toh Party Shuru Hui Hai", "Badshah & Aastha", "party", ["Abhi Toh Party"]),
  track2(1181809040, "Nashe Si Chadh Gayi", "Vishal & Shekhar & Arijit Singh", "party", ["Nashe Si Chad Gayi"]),
  track2(1292298873, "Bom Diggy", "Zack Knight & Jasmin Walia", "party", ["Bom Diggy Diggy"]),
  track2(1466957521, "Aankh Marey", "Neha Kakkar, Mika Singh & Kumar Sanu", "party", ["Aankh Maare", "Ankh Marey"]),
  track2(1478998926, "Ghungroo", "Arijit Singh, Shilpa Rao & Vishal & Shekhar", "party"),
  track2(486377559, "Chikni Chameli", "Shreya Ghoshal", "party"),
  track2(1116839791, "Fevicol Se", "Mamta Sharma & Wajid", "party"),
  track2(1123346653, "Munni Badnaam", "Mamta Sharma & Aishwarya Nigam", "party", ["Munni Badnaam Hui"]),
  track2(1842065696, "Malhari", "Vishal Dadlani", "party"),
  track2(1481956482, "Jai Jai Shivshankar", "Vishal & Shekhar, Vishal Dadlani & Benny Dayal", "party"),
  track2(1434394473, "Kamariya", "Darshan Raval, Lijo George & DJ Chetas", "party"),
  track2(887456974, "Saturday Saturday", "Badshah, Indeep Bakshi & Akriti Kakkar", "party"),
  track2(1071079631, "Dard-E-Disco", "Sukhwinder Singh & Vishal & Shekhar", "party", ["Dard E Disco"]),
  track2(1658280809, "Besharam Rang", "Vishal & Shekhar, Shilpa Rao & Caralisa Monteiro", "party"),
  track2(1169015786, "The Breakup Song", "Pritam, Arijit Singh, Badshah & Jonita Gandhi", "party", ["Breakup Song"]),
  track2(1169015787, "Cutiepie", "Pritam, Pardeep Singh Sran & Nakash Aziz", "party", ["Cutie Pie"]),
  track2(1696969405, "What Jhumka", "Pritam, Arijit Singh & Jonita Gandhi", "party", ["What Jhumka?"]),
  track2(1759100524, "Aaj Ki Raat", "Madhubanti Bagchi, Divya Kumar & Sachin-Jigar", "party"),
  track2(1562303433, "Zoobi Doobi", "Sonu Nigam & Shreya Ghoshal", "party"),
  track2(1659644978, "Jhoome Jo Pathaan", "Vishal & Shekhar, Arijit Singh & Sukriti Kakar", "party"),
  track2(1443458534, "Pal Pal Dil Ke Paas", "Kishore Kumar", "classic"),
  track2(1340749968, "Pehla Nasha", "Udit Narayan & Sadhana Sargam", "classic"),
  track2(1352484512, "Tujhe Dekha To", "Lata Mangeshkar & Kumar Sanu", "classic", ["Tujhe Dekha Toh"]),
  track2(673539855, "Kajra Re", "Alisha Chinai, Javed Ali & Shankar Mahadevan", "classic"),
  track2(305752291, "Mitwa", "Shankar Ehsaan Loy, Shafqat Amanat Ali & Shankar Mahadevan", "classic"),
  track2(673576188, "Chand Sifarish", "Kailash Kher & Shaan", "classic"),
  track2(1390183145, "Lag Ja Gale", "Sanam", "classic"),
  track2(1338718015, "Mere Sapno Ki Rani", "Kishore Kumar", "classic"),
  track2(1443485685, "Yeh Dosti", "Kishore Kumar & Manna Dey", "classic", ["Yeh Dosti Hum Nahin"]),
  track2(1337327963, "Khaike Paan Banaras Wala", "Kishore Kumar", "classic", ["Khaike Paan"]),
  track2(1338708210, "Om Shanti Om", "Kishore Kumar", "classic"),
  track2(1128665304, "Tip Tip Barsa Paani", "Alka Yagnik & Udit Narayan", "classic", ["Tip Tip Barsa Pani"]),
  track2(1131692110, "Arziyan", "Javed Ali & Kailash Kher", "sufi"),
  track2(327458459, "Iktara", "Amit Trivedi & Kavita Seth", "sufi"),
  track2(1537961313, "Khwaja Mere Khwaja", "A.R. Rahman", "sufi"),
  track2(1340774328, "Maula Mere Maula", "Roop Kumar Rathod", "sufi"),
  track2(660158693, "O Rangrez", "Shankar Ehsaan Loy, Shreya Ghoshal & Javed Bashir", "sufi"),
  track2(1123241928, "Nadaan Parinde", "A.R. Rahman & Mohit Chauhan", "sufi", ["Nadan Parinde"]),
  track2(1071855805, "Bhar Do Jholi Meri", "Pritam & Adnan Sami", "sufi", ["Bhar Do Jholi"]),
  track2(1798501074, "Tajdar-E-Haram", "Atif Aslam", "sufi", ["Tajdar E Haram"]),
  track2(1638680267, "Deva Deva", "Pritam, Arijit Singh & Jonita Gandhi", "sufi"),
  track2(1174924381, "Ae Dil Hai Mushkil", "Pritam & Arijit Singh", "romance"),
  track2(1529544912, "Kalank", "Pritam, Arijit Singh & Shilpa Rao", "romance"),
  track2(1529544906, "Ghar More Pardesiya", "Shreya Ghoshal & Pritam", "romance"),
  track2(1576395278, "Param Sundari", "A.R. Rahman & Shreya Ghoshal", "romance"),
  track2(1757825980, "Tauba Tauba", "Karan Aujla", "party"),
  track2(1727144339, "Satranga", "Shreyas Puranik, Arijit Singh & Siddharth-Garima", "romance"),
  track2(1727144597, "Pehle Bhi Main", "Vishal Mishra & Raj Shekhar", "romance"),
  track2(1722326390, "Lutt Putt Gaya", "Pritam, Arijit Singh, Swanand Kirkire & IP Singh", "party"),
  track2(1727144164, "Arjan Vailly", "Manan Bhardwaj & Bhupinder Babbal", "party"),
  track2(1746500881, "Ve Kamleya", "Pritam, Arijit Singh, Shreya Ghoshal, Shadab Faridi, Altamash Faridi & Amitabh Bhattacharya", "romance"),
  track2(1704635426, "Tere Vaaste", "Varun Jain, Altamash Faridi & Amitabh Bhattacharya", "romance"),
  track2(1447880276, "Naatu Naatu", "Rahul Sipligunj", "party"),
  track2(1602184672, "Oo Antava", "Indravathi Chauhan", "party", ["Oo Antava Oo Oo Antava"]),
  track2(1602184669, "Srivalli", "Sid Sriram", "romance"),
  track2(1337583672, "Ghoomar", "Shreya Ghoshal, Swaroop Khan & A M Turaz", "party"),
  track2(1337583674, "Khalibali", "Shivam Pathak, Shail Hada & A M Turaz", "party"),
  track2(1609214199, "Dholida", "Janhvi Shrimankar, Shail Hada, Dipti, Pragati, Rucha, Arohi, Sanjay Leela Bhansali & Archana", "party"),
  track2(1843041042, "Mann Mera", "Gajendra Verma", "romance"),
  track2(1537030225, "Tera Hone Laga Hoon", "Atif Aslam, Alisha Chinai & Pritam", "romance"),
  track2(1537031094, "Pehli Nazar Mein", "Atif Aslam & Pritam", "romance"),
  track2(1810438552, "Tere Sang Yaara", "Atif Aslam", "romance"),
  track2(1536600360, "Jeene Laga Hoon", "Atif Aslam, Shreya Ghoshal & Sachin-Jigar", "romance"),
  track2(1168269718, "Sunn Raha Hai", "Ankit Tiwari", "romance"),
  track2(876412650, "Muskurane", "Jeet Gannguli & Arijit Singh", "romance"),
  track2(996456909, "Hamari Adhuri Kahani", "Jeet Gannguli & Arijit Singh", "romance"),
  track2(1348996917, "Tera Yaar Hoon Main", "Arijit Singh", "romance"),
  track2(1328725384, "Pal", "Arijit Singh", "romance"),
  track2(1158884517, "Kaun Tujhe", "Palak Muchhal", "romance"),
  track2(1529524353, "Dilbaro", "Harshdeep Kaur, Shankar Mahadevan & Vibha Saraf", "romance"),
  track2(1529524352, "Ae Watan", "Arijit Singh", "sufi"),
  track2(1405546221, "Kar Har Maidaan Fateh", "Sukhwinder Singh & Shreya Ghoshal", "sufi"),
  track2(1719609914, "Jag Ghoomeya", "Rahat Fateh Ali Khan", "romance"),
  track2(1119070354, "Baby Ko Bass Pasand Hai", "Vishal & Shekhar, Vishal Dadlani, Shalmali Kholgade, Isheeta & Badshah", "party"),
  track2(1780615740, "First Class", "Pritam, Arijit Singh & Neeti Mohan", "party"),
  track2(1464121601, "Slow Motion", "Shreya Ghoshal & Nakash Aziz", "party"),
  track2(1498889226, "Garmi", "Badshah & Neha Kakkar", "party"),
  track2(1458863025, "Vaaste", "Dhvani Bhanushali & Nikhil D'Souza", "romance"),
  track2(1529555769, "Makhna", "Tanishk Bagchi, Yasser Desai & Asees Kaur", "party"),
  track2(1453984030, "Coca Cola", "Tony Kakkar, Neha Kakkar & Young Desi", "party"),
  track2(1727144176, "Hua Main", "Pritam, Raghav Chaitanya & Manoj Muntashir", "romance"),
  track2(1705952067, "Not Ramaiya Vastavaiya", "Anirudh Ravichander, Vishal Dadlani, Shilpa Rao & Kumaar", "party"),
  track2(1705952069, "Jawan Title Track", "Anirudh Ravichander & Raja Kumari", "party"),
  track2(1677558303, "Tere Pyaar Mein", "Pritam, Arijit Singh & Nikhita Gandhi", "romance"),
  track2(1757826141, "Jaanam", "Vishal Mishra", "romance"),
  track2(1600673695, "Saami Saami", "Sunidhi Chauhan", "party"),
  track2(1598907462, "Rait Zara Si", "Arijit Singh, Shashaa Tirupati & Irshad Kamil", "romance"),
  track2(1685140434, "Tere Hawale", "Pritam, Arijit Singh & Shreya Ghoshal", "romance"),
  track2(1662796605, "Current Laga Re", "Nakash Aziz, Dhvani Bhanushali, Jonita Gandhi, Lijo George, Vivek Hariharan, Kumaar & Hari", "party"),
  track2(1529453270, "Kashmir", "Shashwat Sachdev", "sufi"),
  track2(1694486810, "Tum Kya Mile", "Pritam, Arijit Singh, Shreya Ghoshal & Amitabh Bhattacharya", "romance")
];
function toSong2(entry) {
  return entry.aliases ? { trackId: entry.trackId, title: entry.title, artist: entry.artist, aliases: entry.aliases } : { trackId: entry.trackId, title: entry.title, artist: entry.artist };
}
__name(toSong2, "toSong");
function playlist2(id, name, description, lane) {
  const songs3 = entries2.filter((entry) => lane === void 0 || entry.lane === lane).map(toSong2);
  return { id, name, description, storefront: "in", songs: songs3 };
}
__name(playlist2, "playlist");
var hindi = playlist2("hindi", "Hindi mix", "Film songs, mixed.");
var hindiRomance = playlist2("hindi-romance", "Hindi romance", "Love songs.", "romance");
var hindiParty = playlist2("hindi-party", "Hindi party", "Dance songs.", "party");
var hindiClassics = playlist2("hindi-classics", "Hindi classics", "Older film songs.", "classic");
var hindiSufi = playlist2("hindi-sufi", "Hindi sufi", "Sufi and devotional songs.", "sufi");

// src/catalog/playlists/kannada.ts
function track3(trackId, title2, artist, aliases) {
  return aliases ? { trackId, title: title2, artist, aliases } : { trackId, title: title2, artist };
}
__name(track3, "track");
var songs = [
  track3(1702686059, "Belageddu", "Vijay Prakash", ["Belagiddu", "Belagedu"]),
  track3(1705945409, "Singara Siriye", "Vijay Prakash & Ananya Bhat", ["Shingara Siriye"]),
  track3(1810837048, "Anisuthide", "Sonu Nigam", ["Anisutide", "Anisuthidhe"]),
  track3(1810836820, "Mungaru Maleye", "Sonu Nigam", ["Mungaru Male"]),
  track3(1810836824, "Kunnidu Kunnidu Baare", "Udit Narayan & Sunidhi Chauhan", [
    "Kunidhu Kunidhu Baare",
    "Kunidu Kunidu Baare"
  ]),
  track3(1810836828, "Ivanu Geleyanalla", "Shreya Ghoshal"),
  track3(1810836826, "Araluthiru", "Shreya Ghoshal"),
  track3(1810837042, "Suvvi Suvalli", "Hemanth"),
  track3(1810836812, "Onde Ondu Saari", "Kunal Ganjawala", ["Onde Ondu Sari"]),
  track3(662774725, "Ninna Nodalentho", "Sonu Nigam & Shreya Ghoshal"),
  track3(1810836766, "Ninnindale", "Sonu Nigam", ["Ninnidale"]),
  track3(1810836998, "Madarangi", "Rajesh Krishnan & Shreya Ghoshal"),
  track3(1810836768, "Anthu Inthu", "Udit Narayan & K.S. Chithra"),
  track3(1810836987, "Male Nintu Hoda Mele", "Sonu Nigam & Shreya Ghoshal", ["Male Ninthu Hoda Mele"]),
  track3(1250889876, "Minchagi Neenu", "Sonu Nigam"),
  track3(1250889874, "Akasha Ishte Yaakide", "Kunal Ganjawala", [
    "Akasha Este Yakedyu",
    "Akasha Ishte Yakide"
  ]),
  track3(663696610, "Neene Neene", "Kunal Ganjawala", ["Ninne Ninne"]),
  track3(662774718, "Yenagali", "Sonu Nigam", ["Yenagali Munde Saagu"]),
  track3(1652046101, "Bombe Helutaithe", "Vijay Prakash", ["Bombe Heluthaite"]),
  track3(1702686351, "Last Bench Party", "Chandan Achar & B. Ajaneesh Loknath", [
    "Last Benchu Party",
    "Last Bench"
  ]),
  track3(1702686037, "Katheyondu Helide", "Rakshit Shetty", ["Katheyonda Helide"]),
  track3(1702686357, "Kaagadada Doniyalli", "Vasuki Vaibhav", ["Kagadada Doniyalli"]),
  track3(1702686355, "Neecha Sullu Sutho Naalige", "Vasishta N. Simha", ["Neecha Sullu"]),
  track3(1702686060, "Hey Who Are You", "Bharath B J & Indu Nagaraj"),
  track3(1702686050, "Thirboki Jeevana", "Rakshit Shetty"),
  track3(1702686075, "Neenire Saniha", "Shreya Ghoshal", ["Neenire Sanihe"]),
  track3(1801150689, "Salaam Rocky Bhai", "Vijay Prakash & Ravi Basrur", ["Salam Rocky Bhai"]),
  track3(1784431498, "Dheera Dheera", "Ananya Bhat & Ravi Basrur"),
  track3(1447875184, "Sultan", "Ananya Bhat"),
  track3(1619314140, "Gagana Nee", "Suchetha Basrur"),
  track3(1619314139, "Toofan", "Ravi Basrur & Santhosh Venky"),
  track3(1619318258, "Sulthana", "Ravi Basrur"),
  track3(1619318260, "Mehabooba", "Ananya Bhat", ["Mehbooba"]),
  track3(1705945418, "Varaha Roopam", "B. Ajaneesh Loknath & Sai Vignesh", [
    "Varaha Roopam Daiva Va Rishtam"
  ]),
  track3(1705945417, "Karma", "B. Ajaneesh Loknath", ["Karma Song"]),
  track3(1842555343, "Brahmakalasha", "B. Ajaneesh Loknath"),
  track3(1843318396, "Rebel", "B. Ajaneesh Loknath", ["Rebel Song"]),
  track3(1845097770, "Madana Mana Mohini", "Vijay Prakash & Ananya Bhat"),
  track3(1637241931, "Ra Ra Rakkamma", "Nakash Aziz & Sunidhi Chauhan"),
  track3(1637241935, "Chikki Bombe", "Vijay Prakash"),
  track3(1637241934, "Gumma Banda Gumma", "Anup Bhandari", ["The Devil's Fury"]),
  track3(1637241933, "Hey Fakira", "Sanjith Hegde"),
  track3(1637241932, "Rajkumari", "Vijay Prakash", ["Lullaby Song"]),
  track3(1840774567, "Belakina Kavithe", "Sanjith Hegde & Savitha Ravindranath"),
  track3(1485080237, "Ninna Gungalli", "Sonu Nigam"),
  track3(1816942619, "Male Barali Manju Irali", "Inchara, Gururaj & Mano Murthy"),
  track3(1139335641, "Kanasalu", "Shreya Ghoshal"),
  track3(1139335634, "Sariyagi", "Armaan Malik", ["Sariyaagi"]),
  track3(1139335637, "Neenu Irade", "Armaan Malik & Anuradha Bhat"),
  track3(1139335648, "Gamanisu", "Sonu Nigam"),
  track3(1652281359, "Yeno Yeno Aagide", "Haricharan & Apoorva Sridhar"),
  track3(1702933030, "College Days", "Nakul Abhyankar"),
  track3(1706000602, "Love You Chinna", "Nakul Abhyankar", ["Love you Chinna"]),
  track3(1705932683, "Sojugada Sooju Mallige", "Ananya Bhat", [
    "Sojugaada Sooju Mallige",
    "Sojugada Soojumallige"
  ]),
  track3(1609971391, "Sanchariyagu Nee", "Nakul Abhyankar & Vijay Prakash"),
  track3(1707526793, "Kaala Kaayiso Kade", "Charan Raj", ["Kala Kayiso Kade"]),
  track3(1810836848, "Neenu Bagehariyada Haadu", "Nihal Tauro", ["Neenu Bagehariyada"]),
  track3(1810836850, "Prayashaha", "Sonu Nigam"),
  track3(1810836843, "Naanaadada Maathellava", "Sonu Nigam"),
  track3(1810836846, "Devle Devle", "Vijay Prakash", ["Devle Devle Devle"]),
  track3(1485706247, "Paravashanadenu", "Sonu Nigam"),
  track3(1485706261, "Yavanig Gotthu", "Tippu"),
  track3(1485706255, "Thanmayaladenu", "Shreya Ghoshal"),
  track3(1702926864, "Tagaru Banthu Tagaru", "Anthony Daasan & Charan Raj", ["Tagaru Banthu"]),
  track3(1702926866, "Mental Ho Jawa", "Ananya Bhat"),
  track3(1702926867, "Hold On", "Ananya Bhat & Charan Raj"),
  track3(1702762939, "Nigooda Nigooda", "Sanjith Hegde"),
  track3(1705924346, "Endo Bareda", "Vasuki Vaibhav"),
  track3(1811433908, "Kanna Muchhe", "Shankar Mahadevan"),
  track3(1181858747, "Acchacchu Beldacchu", "Kunal Ganjawala", ["Achachu Beldachu"]),
  track3(1811948860, "Mussanje Veleli", "Vaani Harikrishna"),
  track3(1811949162, "Usire Usire", "Rajesh Krishnan"),
  track3(1816935835, "Usire", "Santhosh Venky"),
  track3(1251090278, "Yello Jogappa", "Shankar Mahadevan & Sunitha"),
  track3(591595513, "Ello Jogappa", "C. Ashwath & B.R. Chaya"),
  track3(1812864779, "Onde Usiranthe", "Rajesh Krishnan & K.S. Chithra", ["Onde Usirante"]),
  track3(1782556474, "Nanna Neenu Gellalare", "Dr. Rajkumar & S. Janaki"),
  track3(1338700766, "Naguva Nayana", "S.P. Balasubrahmanyam & S. Janaki"),
  track3(1328752597, "Beladingalaagi Baa", "Rajkumar", ["Beladingalagi Baa"]),
  track3(1781514548, "Jai Bharatha Jananiya", "C. Aswath & Shimoga Subbanna", ["Jai Bharata Jananiya"]),
  track3(6781108473, "Huttidare Kannada", "Rajkumar & Hamsalekha"),
  track3(1836855623, "Yaare Neenu Cheluve", "S.P. Balasubrahmanyam & S. Janaki", [
    "Yaare Neenu Sundara Cheluve"
  ]),
  track3(1808714712, "Bombeyatavayya", "Dr. Rajkumar & Vani Jairam", ["Bombe Aatavayya"]),
  track3(1782556476, "Jeeva Hoovagide", "Dr. Rajkumar & S. Janaki", ["I Love You"]),
  track3(1836838231, "Yaava Oorayya", "S.P. Balasubrahmanyam"),
  track3(1816934899, "Nanna Ninna Prema Geethe", "K.S. Chithra", ["Nanna Ninna Premageethe"]),
  track3(6781069839, "Nooraru Nenapina", "Dr. Rajkumar"),
  track3(1544451045, "Jogada Siri Belakinalli", "Rajesh Krishnan & K.S. Chithra", ["Jogada Siri"]),
  track3(1577353080, "Ninna Poojege Bande Mahadeshwara", "Raghu Dixit", ["Ninna Poojege"]),
  track3(1810836804, "Munjane Manjalli", "Raghu Dixit", ["Munjaane Manjalli"]),
  track3(1705799297, "Nenapina Hudugiye", "Vijay Prakash"),
  track3(1812979040, "Nee Chandane", "Kumar Sanu & K.S. Chithra"),
  track3(1816938656, "Nalle Nalle", "Vijay Prakash & Anuradha Bhat"),
  track3(1816957562, "Nijana Nanena", "Sonu Nigam", ["Nijaana Naanena"]),
  track3(1661267091, "Pushpavati", "Aishwarya Rangarajan"),
  track3(1783633571, "Pushpa Pushpa", "Vijay Prakash"),
  track3(1706011122, "Naa Ninage", "Sanjith Hegde & Charan Raj", ["Naa Ninage Kaavalugaara"]),
  track3(1744161265, "Hoovamma Hoove", "GowraHari", ["Hoovamma"]),
  track3(1701418599, "Sahapaati", "Nobin Paul"),
  track3(1840625125, "Gunu Gunuguva", "Sanjith Hegde")
];
var kannada = {
  id: "kannada",
  name: "Kannada",
  description: "Kannada songs.",
  storefront: "in",
  songs
};

// src/catalog/playlists/michael-jackson.ts
var michaelJackson = {
  id: "michael-jackson",
  name: "Michael Jackson",
  description: "MJ songs.",
  storefront: "us",
  songs: [
    { trackId: 269573364, title: "Billie Jean", artist: "Michael Jackson" },
    { trackId: 269573341, title: "Beat It", artist: "Michael Jackson" },
    { trackId: 269573303, title: "Thriller", artist: "Michael Jackson" },
    { trackId: 269572927, title: "Wanna Be Startin' Somethin'", artist: "Michael Jackson", aliases: ["Wanna Be Starting Something"] },
    { trackId: 159294345, title: "Bad", artist: "Michael Jackson" },
    { trackId: 159294551, title: "Smooth Criminal", artist: "Michael Jackson" },
    { trackId: 655262748, title: "Man in the Mirror", artist: "Michael Jackson" },
    { trackId: 655261377, title: "Rock with You", artist: "Michael Jackson" },
    { trackId: 186166292, title: "Don't Stop 'Til You Get Enough", artist: "Michael Jackson" },
    { trackId: 159294814, title: "Black or White", artist: "Michael Jackson" },
    { trackId: 322847187, title: "Remember the Time", artist: "Michael Jackson" },
    { trackId: 336644198, title: "The Way You Make Me Feel", artist: "Michael Jackson" },
    { trackId: 273048791, title: "P.Y.T.", artist: "Michael Jackson", aliases: ["Pretty Young Thing", "PYT"] },
    { trackId: 273048790, title: "Human Nature", artist: "Michael Jackson" },
    { trackId: 273598924, title: "Dirty Diana", artist: "Michael Jackson" },
    { trackId: 336644173, title: "They Don't Care About Us", artist: "Michael Jackson" },
    { trackId: 655265154, title: "You Are Not Alone", artist: "Michael Jackson" },
    { trackId: 310505593, title: "Earth Song", artist: "Michael Jackson" },
    { trackId: 322847189, title: "Heal the World", artist: "Michael Jackson" },
    { trackId: 322847207, title: "Will You Be There", artist: "Michael Jackson" },
    { trackId: 193015409, title: "Blood on the Dance Floor", artist: "Michael Jackson" },
    { trackId: 159295942, title: "You Rock My World", artist: "Michael Jackson" },
    { trackId: 850697815, title: "Love Never Felt So Good", artist: "Michael Jackson & Justin Timberlake" },
    { trackId: 1440944539, title: "Say Say Say", artist: "Paul McCartney & Michael Jackson" },
    { trackId: 1631592484, title: "Hold My Hand", artist: "Michael Jackson & Akon" },
    { trackId: 1443228831, title: "Ben", artist: "Michael Jackson" },
    { trackId: 186166433, title: "Off the Wall", artist: "Michael Jackson" },
    { trackId: 186166483, title: "She's Out of My Life", artist: "Michael Jackson" },
    { trackId: 186166410, title: "Workin' Day and Night", artist: "Michael Jackson" },
    { trackId: 269573042, title: "Baby Be Mine", artist: "Michael Jackson" },
    { trackId: 269573478, title: "The Lady in My Life", artist: "Michael Jackson" },
    { trackId: 273048786, title: "The Girl Is Mine", artist: "Michael Jackson & Paul McCartney" },
    { trackId: 655262664, title: "Speed Demon", artist: "Michael Jackson" },
    { trackId: 159294407, title: "Leave Me Alone", artist: "Michael Jackson" },
    { trackId: 655262735, title: "Liberian Girl", artist: "Michael Jackson" },
    { trackId: 655262745, title: "Another Part of Me", artist: "Michael Jackson" },
    { trackId: 322847119, title: "Jam", artist: "Michael Jackson" },
    { trackId: 322847192, title: "Who Is It", artist: "Michael Jackson" },
    { trackId: 322847185, title: "In the Closet", artist: "Michael Jackson" },
    { trackId: 322847195, title: "Give In to Me", artist: "Michael Jackson" },
    { trackId: 322847184, title: "Why You Wanna Trip on Me", artist: "Michael Jackson" },
    { trackId: 322847213, title: "Keep the Faith", artist: "Michael Jackson" },
    { trackId: 322847215, title: "Gone Too Soon", artist: "Michael Jackson" },
    { trackId: 159295746, title: "Dangerous", artist: "Michael Jackson" },
    { trackId: 310505571, title: "Stranger in Moscow", artist: "Michael Jackson" },
    { trackId: 655266045, title: "Smile", artist: "Michael Jackson" },
    { trackId: 310505596, title: "Come Together", artist: "Michael Jackson" },
    { trackId: 215739439, title: "Butterflies", artist: "Michael Jackson" },
    { trackId: 215739454, title: "Speechless", artist: "Michael Jackson" },
    { trackId: 215738278, title: "Unbreakable", artist: "Michael Jackson" },
    { trackId: 215740289, title: "Cry", artist: "Michael Jackson" },
    { trackId: 1631592675, title: "Hollywood Tonight", artist: "Michael Jackson" },
    { trackId: 1631592685, title: "Behind the Mask", artist: "Michael Jackson" },
    { trackId: 850697803, title: "Slave to the Rhythm", artist: "Michael Jackson" },
    { trackId: 1278580107, title: "Ghosts", artist: "Michael Jackson" }
  ]
};

// src/catalog/playlists/punjabi.ts
function track4(trackId, title2, artist, aliases) {
  return aliases ? { trackId, title: title2, artist, aliases } : { trackId, title: title2, artist };
}
__name(track4, "track");
var songs2 = [
  track4(1723166181, "Lahore", "Guru Randhawa"),
  track4(1254412550, "High Rated Gabru", "Guru Randhawa & Manj Musik"),
  track4(1311535360, "Ban Ja Rani", "Guru Randhawa"),
  track4(1392890980, "Made In India", "Guru Randhawa"),
  track4(1417043675, "Ishare Tere", "Guru Randhawa & Dhvani Bhanushali"),
  track4(1311535871, "Suit Suit", "Guru Randhawa", ["Suit"]),
  track4(1624680579, "Designer", "Guru Randhawa & Yo Yo Honey Singh"),
  track4(1499324279, "Surma", "Guru Randhawa & Jay Sean", ["Surma Surma"]),
  track4(1438414778, "Downtown", "Guru Randhawa"),
  track4(1160168987, "Patola", "Guru Randhawa & Bohemia"),
  track4(1318740998, "Naah", "Harrdy Sandhu", ["Nah"]),
  track4(1591442362, "Bijlee Bijlee", "Harrdy Sandhu", ["Bijli Bijli"]),
  track4(1436966640, "Kya Baat Ay", "Harrdy Sandhu", ["Kya Baat Hai"]),
  track4(1158554778, "Soch", "Harrdy Sandhu & B. Praak"),
  track4(1188705396, "Backbone", "Harrdy Sandhu"),
  track4(1159385155, "Hornn Blow", "Harrdy Sandhu & B. Praak", ["Horn Blow"]),
  track4(1760234621, "Prada", "Jass Manak"),
  track4(1760549731, "Lehanga", "Jass Manak", ["Lahenga"]),
  track4(1417334564, "Lamberghini", "The Doorbeen", ["Lamborghini"]),
  track4(1439316584, "Sakhiyaan", "Maninder Buttar", ["Sakhiyan"]),
  track4(1476799589, "Ik Tera", "Maninder Buttar"),
  track4(1538917079, "Titliaan", "Afsana Khan"),
  track4(684259225, "Proper Patola", "Diljit Dosanjh"),
  track4(1411250172, "Patiala Peg", "Diljit Dosanjh"),
  track4(1418045860, "5 Taara", "Diljit Dosanjh", ["5 Tara"]),
  track4(1574350467, "Do You Know", "Diljit Dosanjh"),
  track4(1581006912, "Lover", "Diljit Dosanjh"),
  track4(1523521149, "G.O.A.T.", "Diljit Dosanjh", ["GOAT"]),
  track4(1418045325, "Laembadgini", "Diljit Dosanjh"),
  track4(1523521607, "Born to Shine", "Diljit Dosanjh"),
  track4(1523521153, "Clash", "Diljit Dosanjh"),
  track4(1633627190, "Lemonade", "Diljit Dosanjh"),
  track4(1671294685, "Peaches", "Diljit Dosanjh"),
  track4(1714132057, "Case", "Diljit Dosanjh"),
  track4(1710378962, "Hass Hass", "Diljit Dosanjh & Sia"),
  track4(1714131801, "Kinni Kinni", "Diljit Dosanjh"),
  track4(1190320671, "3 Peg", "Sharry Maan"),
  track4(1414830140, "Qismat", "Ammy Virk"),
  track4(1425209733, "Mann Bharrya", "B. Praak", ["Mann Bharya"]),
  track4(1639343742, "So High", "Sidhu Moose Wala"),
  track4(1477018499, "Same Beef", "Bohemia & Sidhu Moose Wala"),
  track4(1826770457, "Old Skool", "Prem Dhillon, Sidhu Moose Wala & Naseeb", ["Old School"]),
  track4(1826785702, "The Last Ride", "Sidhu Moose Wala"),
  track4(1826848681, "GOAT", "Sidhu Moose Wala & Wazir Patar"),
  track4(1826786269, "Never Fold", "Sidhu Moose Wala"),
  track4(1826848605, "Moosedrilla", "Sidhu Moose Wala & Divine"),
  track4(1827207515, "Levels", "Sidhu Moose Wala & Sunny Malton"),
  track4(1439435013, "Dawood", "Sidhu Moose Wala"),
  track4(1826772148, "Bambiha Bole", "Amrit Maan & Sidhu Moose Wala"),
  track4(1826848687, "These Days", "Sidhu Moose Wala & Bohemia"),
  track4(1648624484, "Summer High", "AP Dhillon"),
  track4(1596475453, "Desires", "AP Dhillon & Gurinder Gill"),
  track4(1648624479, "Wo Noor", "AP Dhillon"),
  track4(1596475469, "Spaceship", "AP Dhillon, Shinda Kahlon & Gminxr"),
  track4(1588418743, "Excuses", "AP Dhillon, Gurinder Gill & Intense"),
  track4(1534955145, "Toxic", "AP Dhillon & Intense"),
  track4(1575407624, "Ma Belle", "AP Dhillon & Amari"),
  track4(1641674741, "Baller", "Shubh & Ikky"),
  track4(1635085707, "No Love", "Shubh"),
  track4(1700735404, "One Love", "Shubh"),
  track4(1687649546, "Still Rollin", "Shubh", ["Still Rolling"]),
  track4(1697533818, "Softly", "Karan Aujla & Ikky"),
  track4(1657665086, "White Brown Black", "Avvy Sra & Karan Aujla"),
  track4(1697533665, "Jee Ni Lagda", "Karan Aujla & Ikky"),
  track4(1745062759, "Winning Speech", "Karan Aujla & MXRCI"),
  track4(1679392199, "Players", "Karan Aujla & Badshah"),
  track4(1697533821, "Bachke Bachke", "Karan Aujla & Ikky"),
  track4(1158008528, "Love Dose", "Yo Yo Honey Singh"),
  track4(1071078538, "Dheere Dheere", "Yo Yo Honey Singh"),
  track4(1158008527, "Desi Kalakaar", "Yo Yo Honey Singh"),
  track4(1410961252, "Dope Shope", "Yo Yo Honey Singh & Deep Money"),
  track4(1410961966, "Angreji Beat", "Yo Yo Honey Singh & Gippy Grewal", ["Angrezi Beat"]),
  track4(1006710241, "DJ Waley Babu", "Badshah", ["Dj Waley Babu"]),
  track4(1419845181, "Guitar Sikhda", "Jassie Gill"),
  track4(1479168265, "8 Parche", "Baani Sandhu", ["8 Parchhe"]),
  track4(1419967809, "Gaal Ni Kadni", "Parmish Verma", ["Gal Ni Kadni"]),
  track4(1827611718, "Kalla Sohna Nai", "Neha Kakkar"),
  track4(1464879919, "Photo", "Singga"),
  track4(1531596345, "Brown Munde", "AP Dhillon, Gminxr, Gurinder Gill & Shinda Kahlon"),
  track4(1562346959, "Insane", "AP Dhillon, Shinda Kahlon, Gurinder Gill & Gminxr"),
  track4(1700880858, "With You", "AP Dhillon"),
  track4(1596475460, "Tere Te", "AP Dhillon & Gurinder Gill"),
  track4(1687649562, "Cheques", "Shubh"),
  track4(1859550748, "52 Bars", "Karan Aujla & Ikky"),
  track4(1775662801, "Chitta Kurta", "Karan Aujla"),
  track4(1859131965, "Don't Look", "Karan Aujla"),
  track4(1779786209, "Wavy", "Karan Aujla & Jay Trak"),
  track4(1697533816, "Try Me", "Karan Aujla & Ikky"),
  track4(1525344736, "Filhall", "B. Praak"),
  track4(1167342870, "Blue Eyes", "Yo Yo Honey Singh"),
  track4(1413202726, "Brown Rang", "Yo Yo Honey Singh"),
  track4(1356565549, "Laung Laachi", "Mannat Noor"),
  track4(1643971697, "Obsessed", "Riar Saab & Abhijay Sharma"),
  track4(1826848930, "295", "Sidhu Moose Wala"),
  track4(1734233958, "Naina", "Diljit Dosanjh, Badshah & Raj Ranjodh"),
  track4(1581006645, "Vibe", "Diljit Dosanjh"),
  track4(1622874716, "Chauffeur", "Diljit Dosanjh, Tory Lanez & Ikky"),
  track4(1161086081, "Koka", "Jasbir Jassi"),
  track4(1740169811, "Qismat 2", "Jaani & B. Praak"),
  track4(1526653623, "Droptop", "AP Dhillon, Gurinder Gill & Gminxr")
];
var punjabi = {
  id: "punjabi",
  name: "Punjabi",
  description: "Punjabi songs.",
  storefront: "in",
  songs: songs2
};

// src/catalog/registry.ts
var playlists = [
  hindi,
  hindiRomance,
  hindiParty,
  hindiClassics,
  hindiSufi,
  punjabi,
  kannada,
  english,
  englishRomance,
  englishParty,
  englishClassics,
  englishRock,
  michaelJackson
];
function getPlaylist(id) {
  return playlists.find((playlist3) => playlist3.id === id) ?? null;
}
__name(getPlaylist, "getPlaylist");

// src/game/names.ts
function cleanNickname(input) {
  const nickname = input.replace(/\s+/g, " ").trim();
  if (nickname.length < 2 || nickname.length > 16) return null;
  if (/[^\p{L}\p{N} _.-]/u.test(nickname)) return null;
  return nickname;
}
__name(cleanNickname, "cleanNickname");
function cleanCode(input) {
  const code = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) return null;
  return code;
}
__name(cleanCode, "cleanCode");

// src/game/constants.ts
var DEFAULT_ROUNDS = 5;
var MIN_ROUNDS = 1;
var MAX_ROUNDS = 20;
var MAX_PLAYERS = 8;
var MIN_CLIP_SECONDS = 1;
var MAX_CLIP_SECONDS = 15;
var DEFAULT_CLIP_SECONDS = 5;

// src/game/clip.ts
function clampClipSeconds(value) {
  if (!Number.isFinite(value)) return DEFAULT_CLIP_SECONDS;
  return Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, Math.round(value)));
}
__name(clampClipSeconds, "clampClipSeconds");

// src/game/guess.ts
function normalizeAnswer(input) {
  return input.normalize("NFKD").replace(/\p{M}/gu, "").replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").replace(/&/g, " and ").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
__name(normalizeAnswer, "normalizeAnswer");
var CREDIT_SPLIT = /\s*(?:,|&|\/|\band\b|\bfeat\.?\b|\bft\.?\b|\bwith\b)\s*/i;
function artistCredits(artist) {
  const parts = artist.split(CREDIT_SPLIT).map((part) => part.trim()).filter((part) => part.length > 0);
  const credits = [];
  const seen = /* @__PURE__ */ new Set();
  for (const part of [artist.trim(), ...parts]) {
    const key = normalizeAnswer(part);
    if (key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    credits.push(part);
  }
  return credits;
}
__name(artistCredits, "artistCredits");
function judgeArtist(guess, artist) {
  const credits = artistCredits(artist);
  const first = credits[0];
  if (!first) return "miss";
  return judgeGuess(guess, first, credits.slice(1));
}
__name(judgeArtist, "judgeArtist");
function judgeGuess(guess, title2, aliases = []) {
  let best = "miss";
  for (const target of [title2, ...aliases]) {
    const result = judgeOne(guess, target);
    if (result === "correct") return "correct";
    if (result === "close") best = "close";
  }
  return best;
}
__name(judgeGuess, "judgeGuess");
function judgeOne(guess, target) {
  const normalizedGuess = normalizeAnswer(guess);
  const normalizedTarget = normalizeAnswer(target);
  if (normalizedGuess.length < 3 || normalizedTarget.length < 3) return "miss";
  if (normalizedGuess === normalizedTarget) return "correct";
  if (normalizedGuess.startsWith(`${normalizedTarget} `)) return "correct";
  const foldedGuess = fold(normalizedGuess);
  const foldedTarget = fold(normalizedTarget);
  if (foldedGuess.length < 3 || foldedTarget.length < 3) return "miss";
  if (foldedGuess === foldedTarget) return "correct";
  if (foldedGuess.startsWith(`${foldedTarget} `)) return "correct";
  const distance = levenshtein(foldedGuess, foldedTarget);
  const length = Math.max(foldedGuess.length, foldedTarget.length);
  if (distance <= correctBudget(length)) return "correct";
  if (isNearPrefix(foldedGuess, foldedTarget)) return "close";
  if (distance <= closeBudget(length)) return "close";
  return "miss";
}
__name(judgeOne, "judgeOne");
function fold(value) {
  return value.replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u").replace(/w/g, "v").replace(/q/g, "k").replace(/(.)\1+/g, "$1");
}
__name(fold, "fold");
function correctBudget(length) {
  if (length < 5) return 0;
  if (length < 8) return 1;
  return 2;
}
__name(correctBudget, "correctBudget");
function closeBudget(length) {
  if (length < 5) return 1;
  if (length < 12) return 3;
  return 4;
}
__name(closeBudget, "closeBudget");
function isNearPrefix(guess, target) {
  if (guess.length < 4 || target.length < 4) return false;
  if (target.startsWith(guess) && target.length - guess.length <= 4) return true;
  if (guess.startsWith(target) && guess.length - target.length <= 3) return true;
  return false;
}
__name(isNearPrefix, "isNearPrefix");
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const insert = curr[j - 1] + 1;
      const remove = prev[j] + 1;
      const replace = prev[j - 1] + cost;
      curr[j] = Math.min(insert, remove, replace);
    }
    for (let j = 0; j < prev.length; j += 1) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? b.length;
}
__name(levenshtein, "levenshtein");

// src/game/playlist-rules.ts
var SONG_ONLY_PLAYLISTS = /* @__PURE__ */ new Set(["michael-jackson"]);
function allowsArtistGuess(playlistId) {
  return !SONG_ONLY_PLAYLISTS.has(playlistId);
}
__name(allowsArtistGuess, "allowsArtistGuess");

// src/game/rounds.ts
function clampRoundCount(value) {
  if (!Number.isFinite(value)) return DEFAULT_ROUNDS;
  return Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Math.round(value)));
}
__name(clampRoundCount, "clampRoundCount");

// src/game/score.ts
var ARTIST_POINT_RATIO = 0.25;
function pointsForGuess(elapsedMs, roundMs, reason = "title") {
  const safeRound = Math.max(1, roundMs);
  const elapsed = Math.min(Math.max(0, elapsedMs), safeRound);
  const ratio = (safeRound - elapsed) / safeRound;
  const base = Math.max(100, Math.round(1e3 * ratio));
  switch (reason) {
    case "title":
      return base;
    case "later":
      return Math.max(50, Math.round(base * 0.6));
    case "artist":
      return Math.max(25, Math.round(base * ARTIST_POINT_RATIO));
    default: {
      const unexpected = reason;
      throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`);
    }
  }
}
__name(pointsForGuess, "pointsForGuess");
function roundDurationMs(clipSeconds, graceSeconds) {
  return (clampClipSeconds(clipSeconds) + graceSeconds) * 1e3;
}
__name(roundDurationMs, "roundDurationMs");
function guessGraceSeconds() {
  const raw = Number(process.env.GUESS_GRACE_SECONDS);
  if (!Number.isFinite(raw) || raw < 1) return 12;
  return Math.min(120, Math.floor(raw));
}
__name(guessGraceSeconds, "guessGraceSeconds");

// src/game/room.ts
function createRoom(input) {
  return {
    code: input.code,
    mode: input.mode,
    answer: allowsArtistGuess(input.playlistId) ? input.answer : "song",
    hostId: input.hostId,
    playlistId: input.playlistId,
    playlistName: input.playlistName,
    clipSeconds: clampClipSeconds(input.clipSeconds),
    roundCount: clampRoundCount(input.roundCount),
    players: [
      { id: input.hostId, nickname: input.nickname, score: 0, connected: true }
    ],
    phase: "lobby",
    roundIndex: -1,
    songs: [],
    roundStartedAt: null,
    roundEndsAt: null,
    solvedIds: [],
    artistIds: [],
    guesses: [],
    history: [],
    feedback: {},
    starting: false
  };
}
__name(createRoom, "createRoom");
function joinRoom(room, player) {
  if (room.mode === "solo") return { ok: false, error: "That game is solo" };
  if (room.phase !== "lobby") return { ok: false, error: "This game already started" };
  if (room.players.length >= MAX_PLAYERS) return { ok: false, error: "That room is full" };
  if (room.players.some((item) => item.id === player.id)) {
    return { ok: false, error: "You are already in this room" };
  }
  const next = structuredClone(room);
  next.players.push({
    id: player.id,
    nickname: player.nickname,
    score: 0,
    connected: true
  });
  return { ok: true, room: next };
}
__name(joinRoom, "joinRoom");
function configureRoom(room, playerId, playlistId, playlistName, clipSeconds, roundCount, answer) {
  if (room.hostId !== playerId) return { ok: false, error: "Only the host can do that" };
  if (room.phase !== "lobby" || room.starting) {
    return { ok: false, error: "You can only change settings in the lobby" };
  }
  const next = structuredClone(room);
  next.playlistId = playlistId;
  next.playlistName = playlistName;
  next.clipSeconds = clampClipSeconds(clipSeconds);
  next.roundCount = clampRoundCount(roundCount);
  next.answer = allowsArtistGuess(playlistId) ? answer : "song";
  return { ok: true, room: next };
}
__name(configureRoom, "configureRoom");
function markStarting(room, playerId) {
  if (room.hostId !== playerId) return { ok: false, error: "Only the host can do that" };
  if (room.phase !== "lobby") return { ok: false, error: "The game already started" };
  if (room.starting) return { ok: false, error: "Already starting" };
  const next = structuredClone(room);
  next.starting = true;
  return { ok: true, room: next };
}
__name(markStarting, "markStarting");
function abortStarting(room) {
  const next = structuredClone(room);
  next.starting = false;
  return next;
}
__name(abortStarting, "abortStarting");
function beginGame(room, songs3, now, graceSeconds) {
  if (room.phase !== "lobby") return { ok: false, error: "The game already started" };
  if (!room.starting) return { ok: false, error: "The game is not starting" };
  if (songs3.length === 0) return { ok: false, error: "No songs" };
  const next = structuredClone(room);
  next.songs = songs3.map((song) => ({ ...song, aliases: [...song.aliases] }));
  next.phase = "playing";
  next.roundIndex = 0;
  next.starting = false;
  next.solvedIds = [];
  next.artistIds = [];
  next.guesses = [];
  next.history = [];
  next.feedback = {};
  const duration = roundDurationMs(next.clipSeconds, graceSeconds);
  next.roundStartedAt = now;
  next.roundEndsAt = now + duration;
  for (const player of next.players) player.score = 0;
  return { ok: true, room: next };
}
__name(beginGame, "beginGame");
function submitGuess(room, playerId, text, now) {
  if (room.phase !== "playing") return { ok: false, error: "Wait for the next round" };
  if (room.roundEndsAt !== null && now >= room.roundEndsAt) {
    return { ok: false, error: "That round just ended", room: syncPhase(room, now) };
  }
  const player = room.players.find((item) => item.id === playerId);
  if (!player) return { ok: false, error: "You are not in this room" };
  if (room.solvedIds.includes(playerId)) return { ok: false, error: "You already have this one" };
  const song = room.songs[room.roundIndex];
  if (!song) return { ok: false, error: "No song in this round" };
  const next = structuredClone(room);
  const titleJudgement = judgeGuess(text, song.title, song.aliases);
  const artistJudgement = judgeArtist(text, song.artist);
  const artistCounts = allowsArtistGuess(next.playlistId);
  if (next.answer === "artist" && artistCounts) {
    return { ok: true, room: scoreArtistRound(next, player, text, now, titleJudgement, artistJudgement) };
  }
  if (titleJudgement === "correct") {
    const points = awardPoints(next, playerId, now, "title");
    next.solvedIds.push(playerId);
    next.feedback[playerId] = { correct: true, close: false, artist: false, song: false, points };
    next.guesses.push(guessNote(next, player, text, "correct", points));
    return { ok: true, room: syncPhase(next, now) };
  }
  if (!artistCounts && artistJudgement === "correct" && titleJudgement !== "close") {
    next.feedback[playerId] = { correct: false, close: false, artist: true, song: true, points: 0 };
    next.guesses.push(guessNote(next, player, text, "miss", 0));
    return { ok: true, room: next };
  }
  if (artistCounts && artistJudgement === "correct") {
    if (next.artistIds.includes(playerId)) {
      next.feedback[playerId] = { correct: false, close: false, artist: true, song: false, points: 0 };
      next.guesses.push(guessNote(next, player, text, "artist", 0));
      return { ok: true, room: next };
    }
    const points = awardPoints(next, playerId, now, "artist");
    next.artistIds.push(playerId);
    next.feedback[playerId] = { correct: false, close: false, artist: true, song: false, points };
    next.guesses.push(guessNote(next, player, text, "artist", points));
    return { ok: true, room: next };
  }
  if (titleJudgement === "close" || artistCounts && artistJudgement === "close") {
    next.feedback[playerId] = { correct: false, close: true, artist: false, song: false, points: 0 };
    next.guesses.push(guessNote(next, player, text, "close", 0));
    return { ok: true, room: next };
  }
  next.feedback[playerId] = { correct: false, close: false, artist: false, song: false, points: 0 };
  next.guesses.push(guessNote(next, player, text, "miss", 0));
  return { ok: true, room: next };
}
__name(submitGuess, "submitGuess");
function scoreArtistRound(room, player, text, now, titleJudgement, artistJudgement) {
  if (artistJudgement === "correct") {
    const points = awardPoints(room, player.id, now, "title");
    room.solvedIds.push(player.id);
    room.feedback[player.id] = { correct: true, close: false, artist: true, song: false, points };
    room.guesses.push(guessNote(room, player, text, "correct", points));
    return syncPhase(room, now);
  }
  if (titleJudgement === "correct") {
    room.feedback[player.id] = { correct: false, close: false, artist: false, song: true, points: 0 };
    room.guesses.push(guessNote(room, player, text, "song", 0));
    return room;
  }
  if (artistJudgement === "close") {
    room.feedback[player.id] = { correct: false, close: true, artist: false, song: false, points: 0 };
    room.guesses.push(guessNote(room, player, text, "close", 0));
    return room;
  }
  room.feedback[player.id] = { correct: false, close: false, artist: false, song: false, points: 0 };
  room.guesses.push(guessNote(room, player, text, "miss", 0));
  return room;
}
__name(scoreArtistRound, "scoreArtistRound");
function awardPoints(room, playerId, now, reason) {
  const started = room.roundStartedAt ?? now;
  const ends = room.roundEndsAt ?? now;
  const points = pointsForGuess(now - started, Math.max(1, ends - started), reason);
  const scorer = room.players.find((item) => item.id === playerId);
  if (scorer) scorer.score += points;
  return points;
}
__name(awardPoints, "awardPoints");
function snapshotRound(room) {
  const song = room.songs[room.roundIndex];
  if (!song) return null;
  const scores = [];
  for (const guess of room.guesses) {
    if (guess.points <= 0) continue;
    if (guess.kind !== "correct" && guess.kind !== "artist") continue;
    scores.push({ nickname: guess.nickname, points: guess.points, kind: guess.kind });
  }
  return {
    title: song.title,
    artist: song.artist,
    storeUrl: song.storeUrl,
    scores
  };
}
__name(snapshotRound, "snapshotRound");
function toSetlist(history) {
  return history.map((round) => {
    const guessedBy = round.scores.filter((score) => score.kind === "correct").map((score) => score.nickname);
    return {
      title: round.title,
      artist: round.artist,
      storeUrl: round.storeUrl,
      guessed: guessedBy.length > 0,
      guessedBy
    };
  });
}
__name(toSetlist, "toSetlist");
function guessNote(room, player, text, kind, points) {
  return {
    id: String(room.guesses.length + 1),
    playerId: player.id,
    nickname: player.nickname,
    text,
    kind,
    points
  };
}
__name(guessNote, "guessNote");
function revealIfDue(room, now) {
  if (room.phase !== "playing") return room;
  if (room.roundEndsAt === null || now < room.roundEndsAt) return room;
  const next = structuredClone(room);
  next.phase = "reveal";
  return next;
}
__name(revealIfDue, "revealIfDue");
function syncPhase(room, now) {
  const timed = revealIfDue(room, now);
  if (timed.phase !== "playing") return timed;
  if (timed.solvedIds.length === 0) return timed;
  const next = structuredClone(timed);
  next.phase = "reveal";
  return next;
}
__name(syncPhase, "syncPhase");
function advance(room, playerId, now, graceSeconds, fromRound = 0) {
  if (room.hostId !== playerId) return { ok: false, error: "Only the host can do that" };
  const currentRound = room.roundIndex >= 0 ? room.roundIndex + 1 : 0;
  if (fromRound > 0 && fromRound !== currentRound) return { ok: true, room };
  if (room.phase !== "reveal") {
    if (fromRound > 0 && room.phase === "done") return { ok: true, room };
    return { ok: false, error: "Wait for the reveal" };
  }
  const next = structuredClone(room);
  const recorded = snapshotRound(room);
  if (recorded) next.history.push(recorded);
  const upcoming = room.roundIndex + 1;
  if (upcoming >= room.songs.length) {
    next.phase = "done";
    return { ok: true, room: next };
  }
  next.roundIndex = upcoming;
  next.phase = "playing";
  next.solvedIds = [];
  next.artistIds = [];
  next.guesses = [];
  next.feedback = {};
  const duration = roundDurationMs(next.clipSeconds, graceSeconds);
  next.roundStartedAt = now;
  next.roundEndsAt = now + duration;
  return { ok: true, room: next };
}
__name(advance, "advance");
function restart(room, playerId) {
  if (room.hostId !== playerId) return { ok: false, error: "Only the host can do that" };
  if (room.phase === "lobby") return { ok: true, room };
  if (room.phase !== "done") return { ok: false, error: "Finish the set first" };
  const next = structuredClone(room);
  next.phase = "lobby";
  next.songs = [];
  next.roundIndex = -1;
  next.roundStartedAt = null;
  next.roundEndsAt = null;
  next.solvedIds = [];
  next.artistIds = [];
  next.guesses = [];
  next.history = [];
  next.feedback = {};
  next.starting = false;
  for (const player of next.players) player.score = 0;
  return { ok: true, room: next };
}
__name(restart, "restart");
function setConnected(room, playerId, connected2, now) {
  const next = structuredClone(room);
  const player = next.players.find((item) => item.id === playerId);
  if (!player) return next;
  player.connected = connected2;
  return syncPhase(next, now);
}
__name(setConnected, "setConnected");
function leaveRoom(room, playerId, now) {
  const next = structuredClone(room);
  next.players = next.players.filter((player) => player.id !== playerId);
  if (next.players.length === 0) return null;
  if (next.hostId === playerId) {
    const connected2 = next.players.find((player) => player.connected) ?? next.players[0];
    next.hostId = connected2.id;
  }
  next.solvedIds = next.solvedIds.filter((id) => id !== playerId);
  next.artistIds = next.artistIds.filter((id) => id !== playerId);
  delete next.feedback[playerId];
  return syncPhase(next, now);
}
__name(leaveRoom, "leaveRoom");
function toView(room, playerId) {
  const you = room.players.find((player) => player.id === playerId);
  if (!you) return null;
  const song = room.roundIndex >= 0 ? room.songs[room.roundIndex] : void 0;
  const showClip = room.phase === "playing" && song ? { previewUrl: song.previewUrl } : null;
  const answerVisible = room.phase === "reveal" || room.phase === "done";
  const showReveal = answerVisible && song ? { title: song.title, artist: song.artist, storeUrl: song.storeUrl, trackId: song.trackId } : null;
  const youSolved = room.solvedIds.includes(you.id);
  const artworkUrl = song?.artworkUrl && (answerVisible || room.phase === "playing" && youSolved) ? song.artworkUrl : null;
  return {
    code: room.code,
    mode: room.mode,
    answer: room.answer,
    phase: room.phase,
    playlistId: room.playlistId,
    playlistName: room.playlistName,
    clipSeconds: room.clipSeconds,
    roundCount: room.roundCount,
    roundNumber: room.roundIndex >= 0 ? room.roundIndex + 1 : 0,
    totalRounds: room.songs.length,
    setlist: room.phase === "done" ? toSetlist(room.history) : [],
    you: { id: you.id, isHost: room.hostId === you.id, nickname: you.nickname },
    players: room.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      solved: room.solvedIds.includes(player.id),
      namedArtist: room.artistIds.includes(player.id),
      connected: player.connected
    })),
    clip: showClip,
    reveal: showReveal,
    artworkUrl,
    guesses: room.phase === "playing" || room.phase === "reveal" ? room.guesses : [],
    recap: room.phase === "done" ? room.history.map((round) => ({
      title: round.title,
      artist: round.artist,
      storeUrl: round.storeUrl,
      scores: round.scores.map((score) => ({ ...score }))
    })) : [],
    lastGuess: room.feedback[playerId] ?? null,
    roundEndsAt: room.phase === "playing" ? room.roundEndsAt : null,
    starting: room.starting
  };
}
__name(toView, "toView");

// src/game/room-service.ts
var MSG_LIMIT = 32;
var REAP_MS = 6 * 60 * 60 * 1e3;
var RoomInputError = class extends Error {
  static {
    __name(this, "RoomInputError");
  }
};
function createInitialState(input, key, now) {
  const nickname = cleanNickname(input.nickname);
  if (!nickname) throw new RoomInputError("Use 2-16 letters or numbers");
  const playlist3 = getPlaylist(input.playlistId);
  if (!playlist3) throw new RoomInputError("Unknown playlist");
  const code = cleanCode(key);
  if (!code) throw new RoomInputError("That room code is not valid");
  return {
    room: createRoom({
      code,
      hostId: input.hostId,
      nickname,
      playlistId: playlist3.id,
      playlistName: playlist3.name,
      clipSeconds: input.clipSeconds,
      roundCount: input.roundCount,
      mode: input.mode,
      answer: input.answer
    }),
    recentMsgIds: {},
    lastSeenAt: now
  };
}
__name(createInitialState, "createInitialState");
function readConnParams(params) {
  if (typeof params !== "object" || params === null) return null;
  if (!("playerId" in params) || typeof params.playerId !== "string") return null;
  if (params.playerId.length === 0 || params.playerId.length > 80) return null;
  if (!("intent" in params) || params.intent !== "join" && params.intent !== "resume") return null;
  return { playerId: params.playerId, intent: params.intent };
}
__name(readConnParams, "readConnParams");
function duplicate(c, playerId, msgId) {
  if (!msgId) return false;
  return (c.state.recentMsgIds[playerId] ?? []).includes(msgId);
}
__name(duplicate, "duplicate");
function remember(c, playerId, msgId) {
  if (!msgId) return;
  const prior = c.state.recentMsgIds[playerId] ?? [];
  const next = prior.filter((id) => id !== msgId);
  next.push(msgId);
  while (next.length > MSG_LIMIT) next.shift();
  c.state.recentMsgIds = { ...c.state.recentMsgIds, [playerId]: next };
}
__name(remember, "remember");
function forget(c, playerId, msgId) {
  if (!msgId) return;
  const prior = c.state.recentMsgIds[playerId];
  if (!prior) return;
  c.state.recentMsgIds = {
    ...c.state.recentMsgIds,
    [playerId]: prior.filter((id) => id !== msgId)
  };
}
__name(forget, "forget");
function trackIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item) || item <= 0) continue;
    ids.push(item);
    if (ids.length > 500) ids.shift();
  }
  return ids;
}
__name(trackIds, "trackIds");
function idleSince(state) {
  return typeof state.lastSeenAt === "number" ? state.lastSeenAt : Date.now();
}
__name(idleSince, "idleSince");

// src/server/previews.ts
import { request } from "node:https";

// src/game/shuffle.ts
function orderAvoidingRecent(songs3, recentIds, take = DEFAULT_ROUNDS, rng = Math.random) {
  const catalogIds = new Set(songs3.map((song) => song.trackId));
  const seen = /* @__PURE__ */ new Set();
  const recentInCatalog = [];
  for (const id of recentIds) {
    if (!catalogIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    recentInCatalog.push(id);
  }
  const pool = Math.min(Math.max(take, 1), songs3.length);
  let avoided = recentInCatalog.length;
  while (songs3.length - avoided < pool && avoided > 0) avoided -= 1;
  const avoid = new Set(recentInCatalog.slice(recentInCatalog.length - avoided));
  const eligible = [];
  const deferred = [];
  for (const song of songs3) {
    if (avoid.has(song.trackId)) deferred.push(song);
    else eligible.push(song);
  }
  shuffleInPlace(eligible, rng);
  shuffleInPlace(deferred, rng);
  return [...eligible, ...deferred];
}
__name(orderAvoidingRecent, "orderAvoidingRecent");
function shuffleInPlace(items, rng) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = items[index];
    items[index] = items[swap];
    items[swap] = current;
  }
}
__name(shuffleInPlace, "shuffleInPlace");

// src/server/previews.ts
var FIXTURE_ARTWORK = "/fixture-cover.svg";
var LOOKUP_LIMIT = 40;
var LOOKUP_SPARE = 8;
var HIT_TTL_MS = 6 * 60 * 60 * 1e3;
var RETRY_DELAYS_MS = [200, 600];
var LOOKUP_SOCKET_MS = 1e4;
var LOOKUP_DEADLINE_MS = 35e3;
var previewCache = /* @__PURE__ */ new Map();
var lookupChain = Promise.resolve();
function largerArtwork(raw) {
  if (typeof raw !== "string" || !raw.startsWith("https://")) return null;
  return raw.replace(/\/\d+x\d+bb\.jpg(?=$|\?)/i, "/600x600bb.jpg");
}
__name(largerArtwork, "largerArtwork");
async function loadRoundSongs(playlist3, options, roundCount = DEFAULT_ROUNDS, avoidTrackIds = [], rng = Math.random) {
  const take = clampRoundCount(roundCount);
  const ordered = orderSongs(playlist3.songs, options.order, avoidTrackIds, take, rng);
  const resolved = [];
  let index = 0;
  while (resolved.length < take && index < ordered.length) {
    const size = Math.min(LOOKUP_LIMIT, take - resolved.length + LOOKUP_SPARE, ordered.length - index);
    const window = ordered.slice(index, index + size);
    index += window.length;
    const batch = await resolvePreviews(window, playlist3.storefront, options);
    resolved.push(...batch);
  }
  return resolved.slice(0, take);
}
__name(loadRoundSongs, "loadRoundSongs");
function orderSongs(songs3, order, avoidTrackIds = [], take = DEFAULT_ROUNDS, rng = Math.random) {
  if (order === "catalog") return [...songs3];
  return orderAvoidingRecent(songs3, avoidTrackIds, take, rng);
}
__name(orderSongs, "orderSongs");
async function resolvePreviews(songs3, storefront, options) {
  if (options.mode === "fixture") {
    return songs3.map(
      (song) => toRoundSong(song, "/api/fixture-tone", storeUrl(storefront, song.trackId), FIXTURE_ARTWORK)
    );
  }
  const tracks = await lookupTracks(songs3.map((song) => song.trackId), storefront, options.fetchImpl);
  const resolved = [];
  for (const song of songs3) {
    const match = tracks.get(song.trackId);
    if (!match) continue;
    resolved.push(
      toRoundSong(
        song,
        match.previewUrl,
        match.storeUrl ?? storeUrl(storefront, song.trackId),
        match.artworkUrl
      )
    );
  }
  return resolved;
}
__name(resolvePreviews, "resolvePreviews");
function cacheKey(storefront, trackId) {
  return `${storefront}:${trackId}`;
}
__name(cacheKey, "cacheKey");
function readCache(storefront, trackId, now) {
  const hit = previewCache.get(cacheKey(storefront, trackId));
  if (!hit) return null;
  if (now - hit.at >= HIT_TTL_MS) {
    previewCache.delete(cacheKey(storefront, trackId));
    return null;
  }
  return hit;
}
__name(readCache, "readCache");
function scheduleLookup(task) {
  const run = lookupChain.then(
    () => withDeadline(task(), LOOKUP_DEADLINE_MS),
    () => withDeadline(task(), LOOKUP_DEADLINE_MS)
  );
  lookupChain = run.then(
    () => void 0,
    () => void 0
  );
  return run;
}
__name(scheduleLookup, "scheduleLookup");
function withDeadline(task, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("iTunes lookup timed out"));
    }, ms);
    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error3) => {
        clearTimeout(timer);
        reject(error3 instanceof Error ? error3 : new Error("iTunes lookup failed"));
      }
    );
  });
}
__name(withDeadline, "withDeadline");
async function lookupTracks(ids, storefront, fetchImpl) {
  const now = Date.now();
  const missing = [];
  for (const id of ids) {
    if (!readCache(storefront, id, now)) missing.push(id);
  }
  for (let index = 0; index < missing.length; index += LOOKUP_LIMIT) {
    const chunk = missing.slice(index, index + LOOKUP_LIMIT);
    await scheduleLookup(() => fetchChunk(chunk, storefront, fetchImpl));
  }
  const found = /* @__PURE__ */ new Map();
  const after = Date.now();
  for (const id of ids) {
    const hit = readCache(storefront, id, after);
    if (hit) found.set(id, hit);
  }
  return found;
}
__name(lookupTracks, "lookupTracks");
async function fetchChunk(ids, storefront, fetchImpl) {
  const now = Date.now();
  const need = ids.filter((id) => !readCache(storefront, id, now));
  if (need.length === 0) return;
  const url = `https://itunes.apple.com/lookup?id=${need.join(",")}&country=${encodeURIComponent(storefront)}`;
  const body = await readLookupWithRetry(url, fetchImpl);
  const byId = /* @__PURE__ */ new Map();
  for (const result of body.results ?? []) {
    if (typeof result.trackId === "number") byId.set(result.trackId, result);
  }
  const storedAt = Date.now();
  for (const id of need) {
    const match = byId.get(id);
    if (!match?.previewUrl) continue;
    previewCache.set(cacheKey(storefront, id), {
      previewUrl: match.previewUrl,
      storeUrl: match.trackViewUrl ?? null,
      artworkUrl: largerArtwork(match.artworkUrl100),
      at: storedAt
    });
  }
}
__name(fetchChunk, "fetchChunk");
async function readLookupWithRetry(url, fetchImpl) {
  let last;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await readLookup(url, fetchImpl);
    } catch (error3) {
      last = error3;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === void 0 || !retryableLookup(error3)) break;
      await new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }
  throw last instanceof Error ? last : new Error("iTunes lookup failed");
}
__name(readLookupWithRetry, "readLookupWithRetry");
function retryableLookup(error3) {
  const message = error3 instanceof Error ? error3.message : "";
  if (/timed out|fetch failed|network|econnreset|socket/i.test(message)) return true;
  const status = Number(message.match(/\((\d+)\)/)?.[1]);
  return status === 403 || status === 429 || status >= 500;
}
__name(retryableLookup, "retryableLookup");
function toRoundSong(song, previewUrl, store, artworkUrl) {
  return {
    trackId: song.trackId,
    title: song.title,
    artist: song.artist,
    aliases: [...song.aliases ?? []],
    previewUrl,
    storeUrl: store,
    artworkUrl
  };
}
__name(toRoundSong, "toRoundSong");
function storeUrl(storefront, trackId) {
  return `https://music.apple.com/${storefront}/song/${trackId}`;
}
__name(storeUrl, "storeUrl");
async function readLookup(url, fetchImpl) {
  if (fetchImpl) {
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`iTunes lookup failed (${response.status})`);
    return await response.json();
  }
  return readHttpsJson(url);
}
__name(readLookup, "readLookup");
function readHttpsJson(url) {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", headers: { accept: "application/json" } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        const status = res.statusCode ?? 500;
        if (status >= 400) {
          reject(new Error(`iTunes lookup failed (${status})`));
          return;
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (error3) {
          reject(error3 instanceof Error ? error3 : new Error("Bad iTunes response"));
        }
      });
    });
    const kill2 = /* @__PURE__ */ __name(() => {
      req.destroy(new Error("iTunes lookup timed out"));
    }, "kill");
    const deadline = setTimeout(kill2, LOOKUP_SOCKET_MS);
    req.setTimeout(LOOKUP_SOCKET_MS, kill2);
    req.on("close", () => {
      clearTimeout(deadline);
    });
    req.on("error", reject);
    req.end();
  });
}
__name(readHttpsJson, "readHttpsJson");

// src/rivet/errors.ts
var MISSING_ROOM = "No room with that code";

// src/cloudflare/room-host.ts
var RoomHost = class {
  constructor(platform2, saved) {
    this.platform = platform2;
    this.armedAt = null;
    this.state = saved;
  }
  static {
    __name(this, "RoomHost");
  }
  exists() {
    return this.state !== null;
  }
  /**
   * Runs once each time the object loads, including after eviction. A room left in `starting`
   * goes back to the lobby so a lost song load can be retried. With no socket open, everyone is away.
   */
  wake() {
    const state = this.state;
    if (!state) return;
    const now = this.platform.now();
    let room = state.room;
    let recentMsgIds = state.recentMsgIds;
    if (room.starting) {
      room = abortStarting(room);
      const ids = { ...recentMsgIds };
      delete ids[room.hostId];
      recentMsgIds = ids;
    }
    if (this.platform.conns().length === 0) {
      for (const player of room.players) {
        if (!player.connected) continue;
        room = setConnected(room, player.id, false, now);
      }
    }
    room = syncPhase(room, now);
    if (recentMsgIds === state.recentMsgIds && JSON.stringify(room) === JSON.stringify(state.room)) {
      this.rearm();
      return;
    }
    this.commit({
      ...state,
      room,
      recentMsgIds,
      lastSeenAt: typeof state.lastSeenAt === "number" ? state.lastSeenAt : now
    });
  }
  create(input, key) {
    if (this.state) return { ok: false, status: 409, message: "That room code is already in use" };
    try {
      this.commit(createInitialState(input, key, this.platform.now()));
      return { ok: true };
    } catch (error3) {
      if (error3 instanceof RoomInputError) return { ok: false, status: 400, message: error3.message };
      throw error3;
    }
  }
  /** Decides whether a new socket may join. Sends the refusal itself. */
  admit(conn, params) {
    const state = this.state;
    if (!state || params.intent === "resume" && !state.room.players.some((p) => p.id === params.playerId)) {
      conn.send({ type: "error", message: MISSING_ROOM });
      return false;
    }
    return true;
  }
  connect(conn) {
    const state = this.state;
    if (!state) return;
    const now = this.platform.now();
    let room = state.room;
    if (room.players.some((player) => player.id === conn.playerId)) {
      room = setConnected(room, conn.playerId, true, now);
    }
    this.commit({ ...state, room, lastSeenAt: now });
    this.pushViews();
  }
  disconnect(conn) {
    const state = this.state;
    if (!state) return;
    const stillThere = this.platform.conns().some((other) => other.id !== conn.id && other.playerId === conn.playerId);
    if (stillThere) return;
    const now = this.platform.now();
    let room = state.room;
    if (room.players.some((player) => player.id === conn.playerId)) {
      room = setConnected(room, conn.playerId, false, now);
    }
    this.commit({ ...state, room, lastSeenAt: now });
    this.pushViews();
  }
  async message(conn, request2) {
    const state = this.state;
    if (!state) {
      conn.send({ type: "error", message: MISSING_ROOM });
      return;
    }
    switch (request2.type) {
      case "join":
        this.join(conn, request2.nickname);
        return;
      case "configure":
        this.configure(conn, request2);
        return;
      case "start":
        await this.start(conn, request2.msgId, request2.avoidTrackIds);
        return;
      case "guess":
        this.guess(conn, request2.msgId, request2.text);
        return;
      case "next":
        this.next(conn, request2.msgId, request2.roundNumber);
        return;
      case "restart":
        this.restartGame(conn, request2.msgId);
        return;
      case "leave":
        await this.leave(conn);
        return;
      default: {
        const unexpected = request2;
        throw new Error(`Unexpected value: ${JSON.stringify(unexpected)}`);
      }
    }
  }
  /** The one alarm covers the round deadline and the idle reaper. */
  async alarm() {
    this.armedAt = null;
    const state = this.state;
    if (!state) return;
    const now = this.platform.now();
    const room = state.room;
    if (room.phase === "playing" && room.roundEndsAt !== null && now >= room.roundEndsAt) {
      this.commit({ ...state, room: syncPhase(room, now) });
      this.pushViews();
    }
    const current = this.requireState();
    const awake = this.platform.conns().length > 0 || current.room.players.some((player) => player.connected);
    if (awake) {
      this.commit({ ...current, lastSeenAt: now });
    } else if (now - idleSince(current) >= REAP_MS) {
      await this.destroy();
      return;
    }
    this.rearm();
  }
  join(conn, nickname) {
    const room = this.room();
    const now = this.platform.now();
    if (room.players.some((player) => player.id === conn.playerId)) {
      this.setRoom(setConnected(room, conn.playerId, true, now));
      this.pushViews();
      return;
    }
    const cleaned = cleanNickname(nickname);
    if (!cleaned) {
      this.fail(conn, "Use 2-16 letters or numbers");
      return;
    }
    const joined = joinRoom(room, { id: conn.playerId, nickname: cleaned });
    if (!joined.ok) {
      this.fail(conn, joined.error);
      return;
    }
    this.setRoom(joined.room);
    this.pushViews();
  }
  configure(conn, request2) {
    const playerId = this.seated(conn);
    if (!playerId) return;
    if (this.isDuplicate(playerId, request2.msgId)) {
      this.pushOne(conn);
      return;
    }
    const playlist3 = getPlaylist(request2.playlistId);
    if (!playlist3) {
      this.fail(conn, "Unknown playlist");
      return;
    }
    const configured = configureRoom(
      this.room(),
      playerId,
      playlist3.id,
      playlist3.name,
      request2.clipSeconds,
      request2.roundCount,
      request2.answer
    );
    if (!configured.ok) {
      this.fail(conn, configured.error);
      return;
    }
    this.remember(playerId, request2.msgId);
    this.setRoom(configured.room);
    this.pushViews();
  }
  async start(conn, msgId, avoidTrackIds) {
    const playerId = this.seated(conn);
    if (!playerId) return;
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn);
      return;
    }
    const marked = markStarting(this.room(), playerId);
    if (!marked.ok) {
      this.fail(conn, marked.error);
      return;
    }
    this.remember(playerId, msgId);
    this.setRoom(marked.room);
    this.pushViews();
    const playlist3 = getPlaylist(marked.room.playlistId);
    if (!playlist3) {
      this.abortStart(playerId, msgId);
      this.fail(conn, "Unknown playlist");
      return;
    }
    try {
      const songs3 = await loadRoundSongs(
        playlist3,
        this.platform.previewOptions(),
        marked.room.roundCount,
        trackIds(avoidTrackIds)
      );
      const pending = this.stateOrNull()?.room;
      if (!pending?.starting) return;
      if (songs3.length === 0) {
        this.abortStart(playerId, msgId);
        this.fail(conn, "No previews for that playlist");
        return;
      }
      const begun = beginGame(pending, songs3, this.platform.now(), guessGraceSeconds());
      if (!begun.ok) {
        this.abortStart(playerId, msgId);
        this.fail(conn, begun.error);
        return;
      }
      this.setRoom(begun.room);
      this.pushViews();
    } catch (error3) {
      if (this.stateOrNull()?.room.starting) this.abortStart(playerId, msgId);
      this.fail(conn, error3 instanceof Error ? error3.message : "Could not load previews");
    }
  }
  guess(conn, msgId, text) {
    const playerId = this.seated(conn);
    if (!playerId) return;
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn);
      return;
    }
    const guessed = submitGuess(this.room(), playerId, text, this.platform.now());
    if (!guessed.ok) {
      if (guessed.room) this.setRoom(guessed.room);
      this.pushViews();
      this.fail(conn, guessed.error);
      return;
    }
    this.remember(playerId, msgId);
    this.setRoom(guessed.room);
    this.pushViews();
  }
  next(conn, msgId, roundNumber) {
    const playerId = this.seated(conn);
    if (!playerId) return;
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn);
      return;
    }
    const stepped = advance(this.room(), playerId, this.platform.now(), guessGraceSeconds(), roundNumber);
    if (!stepped.ok) {
      this.fail(conn, stepped.error);
      return;
    }
    this.remember(playerId, msgId);
    this.setRoom(stepped.room);
    this.pushViews();
  }
  restartGame(conn, msgId) {
    const playerId = this.seated(conn);
    if (!playerId) return;
    if (this.isDuplicate(playerId, msgId)) {
      this.pushOne(conn);
      return;
    }
    const restarted = restart(this.room(), playerId);
    if (!restarted.ok) {
      this.fail(conn, restarted.error);
      return;
    }
    this.remember(playerId, msgId);
    this.setRoom(restarted.room);
    this.pushViews();
  }
  async leave(conn) {
    const state = this.requireState();
    const next = leaveRoom(state.room, conn.playerId, this.platform.now());
    conn.send({ type: "left" });
    const ids = { ...state.recentMsgIds };
    delete ids[conn.playerId];
    if (!next) {
      await this.destroy();
      return;
    }
    this.commit({ ...state, room: next, recentMsgIds: ids });
    this.pushViews();
  }
  async destroy() {
    this.state = null;
    this.armedAt = null;
    await this.platform.wipe();
  }
  abortStart(playerId, msgId) {
    const state = this.stateOrNull();
    if (!state) return;
    const holder = { state };
    forget(holder, playerId, msgId);
    this.commit({ ...holder.state, room: abortStarting(state.room) });
    this.pushViews();
  }
  stateOrNull() {
    return this.state;
  }
  requireState() {
    if (!this.state) throw new Error(MISSING_ROOM);
    return this.state;
  }
  room() {
    return this.requireState().room;
  }
  setRoom(room) {
    this.commit({ ...this.requireState(), room });
  }
  isDuplicate(playerId, msgId) {
    return duplicate({ state: this.requireState() }, playerId, msgId);
  }
  remember(playerId, msgId) {
    const holder = { state: this.requireState() };
    remember(holder, playerId, msgId);
    this.commit(holder.state);
  }
  seated(conn) {
    if (!this.room().players.some((player) => player.id === conn.playerId)) {
      this.fail(conn, "Join a room first");
      return null;
    }
    return conn.playerId;
  }
  commit(state) {
    this.state = state;
    this.platform.save(state);
    this.rearm();
  }
  /** The alarm is a billed write, so it only moves when the next due time actually changes. */
  rearm() {
    const state = this.state;
    if (!state) return;
    const reapAt = idleSince(state) + REAP_MS;
    const room = state.room;
    const roundAt = room.phase === "playing" ? room.roundEndsAt : null;
    const target = roundAt !== null ? Math.min(roundAt, reapAt) : reapAt;
    if (target === this.armedAt) return;
    this.armedAt = target;
    this.platform.setAlarm(target);
  }
  pushViews() {
    const room = this.stateOrNull()?.room;
    if (!room) return;
    for (const conn of this.platform.conns()) {
      const view = toView(room, conn.playerId);
      if (!view) continue;
      conn.send({ type: "snapshot", playerId: conn.playerId, view });
    }
  }
  pushOne(conn) {
    const view = toView(this.room(), conn.playerId);
    if (!view) return;
    conn.send({ type: "snapshot", playerId: conn.playerId, view });
  }
  fail(conn, message) {
    conn.send({ type: "error", message });
  }
};

// src/cloudflare/wire.ts
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
__name(isRecord, "isRecord");
function readMsgId(value) {
  return typeof value === "string" && value.length <= 80 ? value : "";
}
__name(readMsgId, "readMsgId");
function readText(value, max) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}
__name(readText, "readText");
function parseWireRequest(raw) {
  if (typeof raw !== "string") return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.type !== "string") return null;
  switch (value.type) {
    case "join": {
      const nickname = readText(value.nickname, 16);
      return nickname ? { type: "join", nickname } : null;
    }
    case "configure": {
      const playlistId = readText(value.playlistId, 40);
      if (!playlistId) return null;
      if (typeof value.clipSeconds !== "number" || typeof value.roundCount !== "number") return null;
      if (value.answer !== "song" && value.answer !== "artist") return null;
      return {
        type: "configure",
        msgId: readMsgId(value.msgId),
        playlistId,
        clipSeconds: value.clipSeconds,
        roundCount: value.roundCount,
        answer: value.answer
      };
    }
    case "start":
      return {
        type: "start",
        msgId: readMsgId(value.msgId),
        avoidTrackIds: Array.isArray(value.avoidTrackIds) ? value.avoidTrackIds.filter((item) => typeof item === "number") : []
      };
    case "guess": {
      const text = readText(value.text, 80);
      return text ? { type: "guess", msgId: readMsgId(value.msgId), text } : null;
    }
    case "next":
      return {
        type: "next",
        msgId: readMsgId(value.msgId),
        roundNumber: typeof value.roundNumber === "number" ? value.roundNumber : 0
      };
    case "restart":
      return { type: "restart", msgId: readMsgId(value.msgId) };
    case "leave":
      return { type: "leave" };
    default:
      return null;
  }
}
__name(parseWireRequest, "parseWireRequest");

// worker/index.ts
var STATE_KEY = "state";
var SOCKET_OPEN = 1;
var GameRoom = class extends DurableObject {
  static {
    __name(this, "GameRoom");
  }
  host;
  constructor(ctx, env2) {
    super(ctx, env2);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get(STATE_KEY);
      this.host = new RoomHost(this.platform(), saved ?? null);
      this.host.wake();
    });
  }
  async fetch(request2) {
    const url = new URL(request2.url);
    const code = cleanCode(url.pathname.split("/").at(-1) ?? "");
    if (!code) return json({ error: "That room code is not valid" }, 400);
    if (request2.method === "POST") {
      let input;
      try {
        input = await request2.json();
      } catch {
        return json({ error: "Bad request" }, 400);
      }
      const created = this.host.create(input, code);
      if (!created.ok) return json({ error: created.message }, created.status);
      return json({ ok: true }, 201);
    }
    if (request2.headers.get("Upgrade") !== "websocket") {
      return this.host.exists() ? json({ exists: true }, 200) : json({ error: MISSING_ROOM }, 404);
    }
    const params = readConnParams({
      playerId: url.searchParams.get("playerId"),
      intent: url.searchParams.get("intent")
    });
    if (!params) return json({ error: "Join a room first" }, 400);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    const attachment = { playerId: params.playerId, connId: crypto.randomUUID() };
    server.serializeAttachment(attachment);
    const conn = toConn(server);
    if (!conn) return json({ error: "Bad request" }, 400);
    if (this.host.admit(conn, params)) {
      this.host.connect(conn);
    } else {
      server.close(1e3, "room not available");
    }
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    const conn = toConn(ws);
    if (!conn) return;
    const request2 = parseWireRequest(message);
    if (!request2) {
      conn.send({ type: "error", message: "Bad request" });
      return;
    }
    try {
      await this.host.message(conn, request2);
    } catch (error3) {
      console.error("room message failed", error3);
      conn.send({ type: "error", message: "Something went wrong. Try again." });
    }
  }
  webSocketClose(ws) {
    const conn = toConn(ws);
    if (conn) this.host.disconnect(conn);
  }
  webSocketError(ws) {
    const conn = toConn(ws);
    if (conn) this.host.disconnect(conn);
  }
  async alarm() {
    await this.host.alarm();
  }
  platform() {
    return {
      now: /* @__PURE__ */ __name(() => Date.now(), "now"),
      conns: /* @__PURE__ */ __name(() => this.ctx.getWebSockets().flatMap((ws) => ws.readyState === SOCKET_OPEN ? [toConn(ws)] : []).filter(isConn), "conns"),
      save: /* @__PURE__ */ __name((state) => {
        void this.ctx.storage.put(STATE_KEY, state);
      }, "save"),
      wipe: /* @__PURE__ */ __name(async () => {
        for (const ws of this.ctx.getWebSockets()) {
          try {
            ws.close(1e3, "room closed");
          } catch {
          }
        }
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
      }, "wipe"),
      setAlarm: /* @__PURE__ */ __name((at) => {
        if (at === null) void this.ctx.storage.deleteAlarm();
        else void this.ctx.storage.setAlarm(at);
      }, "setAlarm"),
      previewOptions: /* @__PURE__ */ __name(() => ({
        mode: this.env.SONG_PREVIEW_MODE === "fixture" ? "fixture" : "live",
        order: this.env.SONG_ORDER === "catalog" ? "catalog" : "shuffle",
        fetchImpl: fetch
      }), "previewOptions")
    };
  }
};
function isConn(value) {
  return value !== null;
}
__name(isConn, "isConn");
function toConn(ws) {
  const attachment = ws.deserializeAttachment();
  if (!attachment) return null;
  return {
    id: attachment.connId,
    playerId: attachment.playerId,
    send: /* @__PURE__ */ __name((message) => {
      try {
        ws.send(JSON.stringify(message));
      } catch {
      }
    }, "send")
  };
}
__name(toConn, "toConn");
function json(body, status, headers) {
  return Response.json(body, { status, headers });
}
__name(json, "json");
function originAllowed(request2, env2) {
  const allowed = (env2.ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(request2.headers.get("Origin") ?? "");
}
__name(originAllowed, "originAllowed");
function corsHeaders(request2) {
  return {
    "Access-Control-Allow-Origin": request2.headers.get("Origin") ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");
var worker_default = {
  async fetch(request2, env2) {
    const url = new URL(request2.url);
    if (url.pathname === "/health") return json({ ok: true }, 200);
    const match = /^\/room\/([^/]+)$/.exec(url.pathname);
    const code = match ? cleanCode(match[1] ?? "") : null;
    if (!code) return json({ error: "Not found" }, 404);
    if (!originAllowed(request2, env2)) return json({ error: "Origin not allowed" }, 403);
    if (request2.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request2) });
    const room = env2.GAME_ROOM.getByName(code);
    if (request2.method === "POST") {
      const response = await room.fetch(request2);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request2))) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
    if (request2.method === "GET") {
      const response = await room.fetch(request2);
      if (response.status === 101) return response;
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders(request2))) headers.set(key, value);
      return new Response(response.body, { status: response.status, headers });
    }
    return json({ error: "Method not allowed" }, 405);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request2, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request2, env2);
  } finally {
    try {
      if (request2.body !== null && !request2.bodyUsed) {
        const reader = request2.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request2, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request2, env2);
  } catch (e) {
    const error3 = reduceError(e);
    const body = JSON.stringify(error3);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-7UY5yv/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request2, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request2, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request2, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request2, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-7UY5yv/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request2, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request2, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request2, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request2, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request2, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request2);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request2) {
      return __facade_invoke__(
        request2,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  GameRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
