// node_modules/outvariant/lib/index.mjs
var POSITIONALS_EXP = /(%?)(%([sdijo]))/g;
function serializePositional(positional, flag) {
  switch (flag) {
    case "s":
      return positional;
    case "d":
    case "i":
      return Number(positional);
    case "j":
      return JSON.stringify(positional);
    case "o": {
      if (typeof positional === "string") {
        return positional;
      }
      const json = JSON.stringify(positional);
      if (json === "{}" || json === "[]" || /^\[object .+?\]$/.test(json)) {
        return positional;
      }
      return json;
    }
  }
}
function format(message4, ...positionals) {
  if (positionals.length === 0) {
    return message4;
  }
  let positionalIndex = 0;
  let formattedMessage = message4.replace(
    POSITIONALS_EXP,
    (match2, isEscaped, _, flag) => {
      const positional = positionals[positionalIndex];
      const value = serializePositional(positional, flag);
      if (!isEscaped) {
        positionalIndex++;
        return value;
      }
      return match2;
    }
  );
  if (positionalIndex < positionals.length) {
    formattedMessage += ` ${positionals.slice(positionalIndex).join(" ")}`;
  }
  formattedMessage = formattedMessage.replace(/%{2,2}/g, "%");
  return formattedMessage;
}
var STACK_FRAMES_TO_IGNORE = 2;
function cleanErrorStack(error4) {
  if (!error4.stack) {
    return;
  }
  const nextStack = error4.stack.split("\n");
  nextStack.splice(1, STACK_FRAMES_TO_IGNORE);
  error4.stack = nextStack.join("\n");
}
var InvariantError = class extends Error {
  constructor(message4, ...positionals) {
    super(message4);
    this.message = message4;
    this.name = "Invariant Violation";
    this.message = format(message4, ...positionals);
    cleanErrorStack(this);
  }
};
var invariant = (predicate, message4, ...positionals) => {
  if (!predicate) {
    throw new InvariantError(message4, ...positionals);
  }
};
invariant.as = (ErrorConstructor, predicate, message4, ...positionals) => {
  if (!predicate) {
    const formatMessage2 = positionals.length === 0 ? message4 : format(message4, ...positionals);
    let error4;
    try {
      error4 = Reflect.construct(ErrorConstructor, [
        formatMessage2
      ]);
    } catch (err) {
      error4 = ErrorConstructor(formatMessage2);
    }
    throw error4;
  }
};

// node_modules/rettime/build/lens-list.mjs
var LensList = class {
  #list;
  #lens;
  constructor() {
    this.#list = [];
    this.#lens = /* @__PURE__ */ new Map();
  }
  get [Symbol.iterator]() {
    return this.#list[Symbol.iterator].bind(this.#list);
  }
  entries() {
    return this.#lens.entries();
  }
  /**
  * Return an order-sensitive list of values by the given key.
  */
  get(key) {
    return this.#lens.get(key) || [];
  }
  /**
  * Return an order-sensitive list of all values.
  */
  getAll() {
    return this.#list.map(([, value]) => value);
  }
  /**
  * Append a new value to the given key.
  */
  append(key, value) {
    this.#list.push([key, value]);
    this.#openLens(key, (list) => list.push(value));
  }
  /**
  * Prepend a new value to the given key.
  */
  prepend(key, value) {
    this.#list.unshift([key, value]);
    this.#openLens(key, (list) => list.unshift(value));
  }
  /**
  * Delete the value belonging to the given key.
  * Returns `true` if the value was present and removed, `false` otherwise.
  */
  delete(key, value) {
    if (this.size === 0) return false;
    const values = this.#lens.get(key);
    if (!values) return false;
    const index = values.indexOf(value);
    if (index === -1) return false;
    values.splice(index, 1);
    this.#list.splice(this.#list.findIndex((item) => item[0] === key && item[1] === value), 1);
    return true;
  }
  /**
  * Delete all values belogning to the given key.
  */
  deleteAll(key) {
    if (this.size === 0) return;
    this.#list = this.#list.filter((item) => item[0] !== key);
    this.#lens.delete(key);
  }
  get size() {
    return this.#list.length;
  }
  clear() {
    if (this.size === 0) return;
    this.#list.length = 0;
    this.#lens.clear();
  }
  #openLens(key, setter) {
    setter(this.#lens.get(key) || this.#lens.set(key, []).get(key));
  }
};

// node_modules/rettime/build/index.mjs
var kDefaultPrevented = /* @__PURE__ */ Symbol("kDefaultPrevented");
var kPropagationStopped = /* @__PURE__ */ Symbol("kPropagationStopped");
var kImmediatePropagationStopped = /* @__PURE__ */ Symbol("kImmediatePropagationStopped");
var TypedEvent = class extends MessageEvent {
  /**
  * @note Keep a placeholder property with the return type
  * because the type must be set somewhere in order to be
  * correctly associated and inferred from the event.
  */
  #returnType;
  [kDefaultPrevented];
  [kPropagationStopped];
  [kImmediatePropagationStopped];
  constructor(...args) {
    super(args[0], args[1]);
    this[kDefaultPrevented] = false;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented];
  }
  preventDefault() {
    super.preventDefault();
    this[kDefaultPrevented] = true;
  }
  stopImmediatePropagation() {
    super.stopImmediatePropagation();
    this[kImmediatePropagationStopped] = true;
  }
};
var Emitter = class {
  #listeners;
  #listenerOptions;
  #listenerAbortCleanups;
  #typelessListeners;
  #hookListeners;
  #hookListenerOptions;
  #hookListenerAbortCleanups;
  hooks;
  constructor() {
    this.#listeners = new LensList();
    this.#listenerOptions = /* @__PURE__ */ new WeakMap();
    this.#listenerAbortCleanups = /* @__PURE__ */ new WeakMap();
    this.#typelessListeners = /* @__PURE__ */ new WeakSet();
    this.#hookListeners = new LensList();
    this.#hookListenerOptions = /* @__PURE__ */ new WeakMap();
    this.#hookListenerAbortCleanups = /* @__PURE__ */ new WeakMap();
    this.hooks = {
      on: (hook, callback, options) => {
        if (options?.signal?.aborted) return;
        if (options?.once) {
          const original = callback;
          const wrapper = ((...args) => {
            this.#deleteHookListener(hook, wrapper);
            return original(...args);
          });
          callback = wrapper;
        }
        this.#hookListeners.append(hook, callback);
        if (options) this.#hookListenerOptions.set(callback, options);
        if (options?.signal) {
          const { signal } = options;
          const onAbort = () => {
            this.#deleteHookListener(hook, callback);
          };
          signal.addEventListener("abort", onAbort, { once: true });
          this.#hookListenerAbortCleanups.set(callback, () => {
            signal.removeEventListener("abort", onAbort);
          });
        }
      },
      removeListener: (hook, callback) => {
        this.#deleteHookListener(hook, callback);
      }
    };
  }
  #deleteHookListener(hook, callback) {
    this.#hookListeners.delete(hook, callback);
    const cleanup = this.#hookListenerAbortCleanups.get(callback);
    if (cleanup) {
      cleanup();
      this.#hookListenerAbortCleanups.delete(callback);
    }
  }
  #deleteListener(type, listener) {
    const removed = this.#listeners.delete(type, listener);
    const cleanup = this.#listenerAbortCleanups.get(listener);
    if (cleanup) {
      cleanup();
      this.#listenerAbortCleanups.delete(listener);
    }
    return removed;
  }
  /**
  * Adds a listener for the given event type.
  */
  on(type, listener, options) {
    this.#addListener(type, listener, options);
    return this;
  }
  /**
  * Adds a one-time listener for the given event type.
  */
  once(type, listener, options) {
    return this.on(type, listener, {
      ...options || {},
      once: true
    });
  }
  /**
  * Prepends a listener for the given event type.
  */
  earlyOn(type, listener, options) {
    this.#addListener(type, listener, options, "prepend");
    return this;
  }
  /**
  * Prepends a one-time listener for the given event type.
  */
  earlyOnce(type, listener, options) {
    return this.earlyOn(type, listener, {
      ...options || {},
      once: true
    });
  }
  /**
  * Emits the given typed event.
  *
  * @returns {boolean} Returns `true` if the event had any listeners, `false` otherwise.
  */
  emit(event) {
    if (this.#listeners.size === 0) return false;
    const hasListeners = this.listenerCount(event.type) > 0;
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        proxiedEvent.revoke();
        return false;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) break;
      this.#callListener(proxiedEvent.event, listener);
    }
    proxiedEvent.revoke();
    return hasListeners;
  }
  /**
  * Emits the given typed event and returns a promise that resolves
  * when all the listeners for that event have settled.
  *
  * @returns {Promise<Array<Emitter.ListenerReturnType>>} A promise that resolves
  * with the return values of all listeners.
  */
  async emitAsPromise(event) {
    if (this.#listeners.size === 0) return [];
    const pendingListeners = [];
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        proxiedEvent.revoke();
        return [];
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) break;
      const returnValue = await Promise.resolve(this.#callListener(proxiedEvent.event, listener));
      if (!this.#isTypelessListener(listener)) pendingListeners.push(returnValue);
    }
    proxiedEvent.revoke();
    return Promise.allSettled(pendingListeners).then((results) => {
      return results.map((result) => result.status === "fulfilled" ? result.value : result.reason);
    });
  }
  /**
  * Emits the given event and returns a generator that yields
  * the result of each listener in the order of their registration.
  * This way, you stop exhausting the listeners once you get the expected value.
  */
  *emitAsGenerator(event) {
    if (this.#listeners.size === 0) return;
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        proxiedEvent.revoke();
        return;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) break;
      const returnValue = this.#callListener(proxiedEvent.event, listener);
      if (!this.#isTypelessListener(listener)) yield returnValue;
    }
    proxiedEvent.revoke();
  }
  /**
  * Removes a listener for the given event type.
  */
  removeListener(type, listener) {
    const options = this.#listenerOptions.get(listener);
    if (!this.#deleteListener(type, listener)) return;
    for (const hook of this.#hookListeners.get("removeListener").slice()) hook(type, listener, options);
  }
  /**
  * Removes all listeners for the given event type.
  * If no event type is provided, removes all existing listeners.
  */
  removeAllListeners(type) {
    if (type == null) {
      for (const [listenerType, listeners$1] of this.#listeners.entries()) while (listeners$1.length > 0) this.removeListener(listenerType, listeners$1[0]);
      for (const [hookType, hookListener] of [...this.#hookListeners]) if (!this.#hookListenerOptions.get(hookListener)?.persist) this.#deleteHookListener(hookType, hookListener);
      return;
    }
    const listeners = this.listeners(type);
    while (listeners.length > 0) this.removeListener(type, listeners[0]);
  }
  /**
  * Returns the list of listeners for the given event type.
  * If no even type is provided, returns all listeners.
  */
  listeners(type) {
    if (type == null) return this.#listeners.getAll();
    return this.#listeners.get(type);
  }
  /**
  * Returns the number of listeners for the given event type.
  * If no even type is provided, returns the total number of listeners.
  */
  listenerCount(type) {
    if (type == null) return this.#listeners.size;
    return this.listeners(type).length;
  }
  #addListener(type, listener, options, insertMode = "append") {
    if (options?.signal?.aborted) return;
    for (const hook of this.#hookListeners.get("newListener").slice()) hook(type, listener, options);
    if (type === "*") this.#typelessListeners.add(listener);
    if (insertMode === "prepend") this.#listeners.prepend(type, listener);
    else this.#listeners.append(type, listener);
    if (options) {
      this.#listenerOptions.set(listener, options);
      if (options.signal) {
        const { signal } = options;
        const onAbort = () => {
          this.removeListener(type, listener);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        this.#listenerAbortCleanups.set(listener, () => {
          signal.removeEventListener("abort", onAbort);
        });
      }
    }
  }
  #proxyEvent(event) {
    const { stopPropagation } = event;
    event.stopPropagation = () => {
      event[kPropagationStopped] = this;
      stopPropagation.call(event);
    };
    return {
      event,
      revoke() {
        event.stopPropagation = stopPropagation;
      }
    };
  }
  #callListener(event, listener) {
    for (const hook of this.#hookListeners.get("beforeEmit").slice()) if (hook(event) === false) return;
    const returnValue = listener.call(this, event);
    const options = this.#listenerOptions.get(listener);
    if (options?.once) {
      const type = this.#isTypelessListener(listener) ? "*" : event.type;
      if (this.#deleteListener(type, listener)) for (const hook of this.#hookListeners.get("removeListener").slice()) hook(type, listener, options);
    }
    return returnValue;
  }
  /**
  * Return a list of all event listeners relevant for the given event type.
  * This includes the explicit event listeners and also typeless event listeners.
  *
  * @note Snapshot the matching listeners before yielding. Listeners can add or
  * remove other listeners during emission (e.g. `earlyOn` unshifts `#list`),
  * which would otherwise shift the live iterator and re-yield prior entries.
  */
  *#matchListeners(type) {
    const snapshot = [];
    for (const [key, listener] of this.#listeners) if (key === "*" || key === type) snapshot.push(listener);
    yield* snapshot;
  }
  #isTypelessListener(listener) {
    return this.#typelessListeners.has(listener);
  }
};

// node_modules/msw/lib/core/experimental/frames/network-frame.mjs
var NetworkFrame = class {
  constructor(protocol, data) {
    this.protocol = protocol;
    this.data = data;
    this.events = new Emitter();
  }
  protocol;
  data;
  events;
};

// node_modules/msw/lib/core/experimental/sources/network-source.mjs
var NetworkFrameEvent = class extends TypedEvent {
  frame;
  constructor(type, frame) {
    super(...[type, {}]);
    this.frame = frame;
  }
};
var NetworkSource = class {
  emitter;
  constructor() {
    this.emitter = new Emitter();
  }
  async queue(frame) {
    await this.emitter.emitAsPromise(
      // @ts-expect-error Trouble handling a conditional type parameter.
      new NetworkFrameEvent("frame", frame)
    );
  }
  on(type, listener, options) {
    this.emitter.on(type, listener, options);
  }
  disable() {
    this.emitter.removeAllListeners();
  }
};

// node_modules/msw/lib/core/isCommonAssetRequest.mjs
function isCommonAssetRequest(request) {
  const url = new URL(request.url);
  if (url.protocol === "file:") {
    return true;
  }
  if (/(fonts\.googleapis\.com)/.test(url.hostname)) {
    return true;
  }
  if (/node_modules/.test(url.pathname)) {
    return true;
  }
  if (url.pathname.includes("@vite")) {
    return true;
  }
  return /\.(s?css|less|m?jsx?|m?tsx?|html|ttf|otf|woff|woff2|eot|gif|jpe?g|png|avif|webp|svg|mp4|webm|ogg|mov|mp3|wav|ogg|flac|aac|pdf|txt|csv|json|xml|md|zip|tar|gz|rar|7z)$/i.test(
    url.pathname
  );
}

// node_modules/msw/lib/core/utils/internal/devUtils.mjs
var LIBRARY_PREFIX = "[MSW]";
function formatMessage(message4, ...positionals) {
  const interpolatedMessage = format(message4, ...positionals);
  return `${LIBRARY_PREFIX} ${interpolatedMessage}`;
}
function warn(message4, ...positionals) {
  console.warn(formatMessage(message4, ...positionals));
}
function error(message4, ...positionals) {
  console.error(formatMessage(message4, ...positionals));
}
var devUtils = {
  formatMessage,
  warn,
  error
};
var InternalError = class extends Error {
  constructor(message4) {
    super(message4);
    this.name = "InternalError";
  }
};

// node_modules/until-async/lib/index.js
async function until(callback) {
  try {
    return [null, await callback().catch((error4) => {
      throw error4;
    })];
  } catch (error4) {
    return [error4, null];
  }
}

// node_modules/is-node-process/lib/index.mjs
function isNodeProcess() {
  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return true;
  }
  if (typeof process !== "undefined") {
    const type = process.type;
    if (type === "renderer" || type === "worker") {
      return false;
    }
    return !!(process.versions && process.versions.node);
  }
  return false;
}

// node_modules/@open-draft/logger/lib/index.mjs
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var colors_exports = {};
__export(colors_exports, {
  blue: () => blue,
  gray: () => gray,
  green: () => green,
  red: () => red,
  yellow: () => yellow
});
function yellow(text) {
  return `\x1B[33m${text}\x1B[0m`;
}
function blue(text) {
  return `\x1B[34m${text}\x1B[0m`;
}
function gray(text) {
  return `\x1B[90m${text}\x1B[0m`;
}
function red(text) {
  return `\x1B[31m${text}\x1B[0m`;
}
function green(text) {
  return `\x1B[32m${text}\x1B[0m`;
}
var IS_NODE = isNodeProcess();
var Logger = class {
  constructor(name) {
    this.name = name;
    this.prefix = `[${this.name}]`;
    const LOGGER_NAME = getVariable("DEBUG");
    const LOGGER_LEVEL = getVariable("LOG_LEVEL");
    const isLoggingEnabled = LOGGER_NAME === "1" || LOGGER_NAME === "true" || typeof LOGGER_NAME !== "undefined" && this.name.startsWith(LOGGER_NAME);
    if (isLoggingEnabled) {
      this.debug = isDefinedAndNotEquals(LOGGER_LEVEL, "debug") ? noop : this.debug;
      this.info = isDefinedAndNotEquals(LOGGER_LEVEL, "info") ? noop : this.info;
      this.success = isDefinedAndNotEquals(LOGGER_LEVEL, "success") ? noop : this.success;
      this.warning = isDefinedAndNotEquals(LOGGER_LEVEL, "warning") ? noop : this.warning;
      this.error = isDefinedAndNotEquals(LOGGER_LEVEL, "error") ? noop : this.error;
    } else {
      this.info = noop;
      this.success = noop;
      this.warning = noop;
      this.error = noop;
      this.only = noop;
    }
  }
  prefix;
  extend(domain) {
    return new Logger(`${this.name}:${domain}`);
  }
  /**
   * Print a debug message.
   * @example
   * logger.debug('no duplicates found, creating a document...')
   */
  debug(message4, ...positionals) {
    this.logEntry({
      level: "debug",
      message: gray(message4),
      positionals,
      prefix: this.prefix,
      colors: {
        prefix: "gray"
      }
    });
  }
  /**
   * Print an info message.
   * @example
   * logger.info('start parsing...')
   */
  info(message4, ...positionals) {
    this.logEntry({
      level: "info",
      message: message4,
      positionals,
      prefix: this.prefix,
      colors: {
        prefix: "blue"
      }
    });
    const performance2 = new PerformanceEntry();
    return (message22, ...positionals2) => {
      performance2.measure();
      this.logEntry({
        level: "info",
        message: `${message22} ${gray(`${performance2.deltaTime}ms`)}`,
        positionals: positionals2,
        prefix: this.prefix,
        colors: {
          prefix: "blue"
        }
      });
    };
  }
  /**
   * Print a success message.
   * @example
   * logger.success('successfully created document')
   */
  success(message4, ...positionals) {
    this.logEntry({
      level: "info",
      message: message4,
      positionals,
      prefix: `\u2714 ${this.prefix}`,
      colors: {
        timestamp: "green",
        prefix: "green"
      }
    });
  }
  /**
   * Print a warning.
   * @example
   * logger.warning('found legacy document format')
   */
  warning(message4, ...positionals) {
    this.logEntry({
      level: "warning",
      message: message4,
      positionals,
      prefix: `\u26A0 ${this.prefix}`,
      colors: {
        timestamp: "yellow",
        prefix: "yellow"
      }
    });
  }
  /**
   * Print an error message.
   * @example
   * logger.error('something went wrong')
   */
  error(message4, ...positionals) {
    this.logEntry({
      level: "error",
      message: message4,
      positionals,
      prefix: `\u2716 ${this.prefix}`,
      colors: {
        timestamp: "red",
        prefix: "red"
      }
    });
  }
  /**
   * Execute the given callback only when the logging is enabled.
   * This is skipped in its entirety and has no runtime cost otherwise.
   * This executes regardless of the log level.
   * @example
   * logger.only(() => {
   *   logger.info('additional info')
   * })
   */
  only(callback) {
    callback();
  }
  createEntry(level, message4) {
    return {
      timestamp: /* @__PURE__ */ new Date(),
      level,
      message: message4
    };
  }
  logEntry(args) {
    const {
      level,
      message: message4,
      prefix,
      colors: customColors,
      positionals = []
    } = args;
    const entry = this.createEntry(level, message4);
    const timestampColor = customColors?.timestamp || "gray";
    const prefixColor = customColors?.prefix || "gray";
    const colorize = {
      timestamp: colors_exports[timestampColor],
      prefix: colors_exports[prefixColor]
    };
    const write = this.getWriter(level);
    write(
      [colorize.timestamp(this.formatTimestamp(entry.timestamp))].concat(prefix != null ? colorize.prefix(prefix) : []).concat(serializeInput(message4)).join(" "),
      ...positionals.map(serializeInput)
    );
  }
  formatTimestamp(timestamp) {
    return `${timestamp.toLocaleTimeString(
      "en-GB"
    )}:${timestamp.getMilliseconds()}`;
  }
  getWriter(level) {
    switch (level) {
      case "debug":
      case "success":
      case "info": {
        return log;
      }
      case "warning": {
        return warn2;
      }
      case "error": {
        return error2;
      }
    }
  }
};
var PerformanceEntry = class {
  startTime;
  endTime;
  deltaTime;
  constructor() {
    this.startTime = performance.now();
  }
  measure() {
    this.endTime = performance.now();
    const deltaTime = this.endTime - this.startTime;
    this.deltaTime = deltaTime.toFixed(2);
  }
};
var noop = () => void 0;
function log(message4, ...positionals) {
  if (IS_NODE) {
    process.stdout.write(format(message4, ...positionals) + "\n");
    return;
  }
  console.log(message4, ...positionals);
}
function warn2(message4, ...positionals) {
  if (IS_NODE) {
    process.stderr.write(format(message4, ...positionals) + "\n");
    return;
  }
  console.warn(message4, ...positionals);
}
function error2(message4, ...positionals) {
  if (IS_NODE) {
    process.stderr.write(format(message4, ...positionals) + "\n");
    return;
  }
  console.error(message4, ...positionals);
}
function getVariable(variableName) {
  if (IS_NODE) {
    return process.env[variableName];
  }
  return globalThis[variableName]?.toString();
}
function isDefinedAndNotEquals(value, expected) {
  return value !== void 0 && value !== expected;
}
function serializeInput(message4) {
  if (typeof message4 === "undefined") {
    return "undefined";
  }
  if (message4 === null) {
    return "null";
  }
  if (typeof message4 === "string") {
    return message4;
  }
  if (typeof message4 === "object") {
    return JSON.stringify(message4);
  }
  return message4.toString();
}

// node_modules/strict-event-emitter/lib/index.mjs
var MemoryLeakError = class extends Error {
  constructor(emitter, type, count) {
    super(
      `Possible EventEmitter memory leak detected. ${count} ${type.toString()} listeners added. Use emitter.setMaxListeners() to increase limit`
    );
    this.emitter = emitter;
    this.type = type;
    this.count = count;
    this.name = "MaxListenersExceededWarning";
  }
};
var _Emitter = class {
  static listenerCount(emitter, eventName) {
    return emitter.listenerCount(eventName);
  }
  constructor() {
    this.events = /* @__PURE__ */ new Map();
    this.maxListeners = _Emitter.defaultMaxListeners;
    this.hasWarnedAboutPotentialMemoryLeak = false;
  }
  _emitInternalEvent(internalEventName, eventName, listener) {
    this.emit(
      internalEventName,
      ...[eventName, listener]
    );
  }
  _getListeners(eventName) {
    return Array.prototype.concat.apply([], this.events.get(eventName)) || [];
  }
  _removeListener(listeners, listener) {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    return [];
  }
  _wrapOnceListener(eventName, listener) {
    const onceListener = (...data) => {
      this.removeListener(eventName, onceListener);
      return listener.apply(this, data);
    };
    Object.defineProperty(onceListener, "name", { value: listener.name });
    return onceListener;
  }
  setMaxListeners(maxListeners) {
    this.maxListeners = maxListeners;
    return this;
  }
  /**
   * Returns the current max listener value for the `Emitter` which is
   * either set by `emitter.setMaxListeners(n)` or defaults to
   * `Emitter.defaultMaxListeners`.
   */
  getMaxListeners() {
    return this.maxListeners;
  }
  /**
   * Returns an array listing the events for which the emitter has registered listeners.
   * The values in the array will be strings or Symbols.
   */
  eventNames() {
    return Array.from(this.events.keys());
  }
  /**
   * Synchronously calls each of the listeners registered for the event named `eventName`,
   * in the order they were registered, passing the supplied arguments to each.
   * Returns `true` if the event has listeners, `false` otherwise.
   *
   * @example
   * const emitter = new Emitter<{ hello: [string] }>()
   * emitter.emit('hello', 'John')
   */
  emit(eventName, ...data) {
    const listeners = this._getListeners(eventName);
    listeners.forEach((listener) => {
      listener.apply(this, data);
    });
    return listeners.length > 0;
  }
  addListener(eventName, listener) {
    this._emitInternalEvent("newListener", eventName, listener);
    const nextListeners = this._getListeners(eventName).concat(listener);
    this.events.set(eventName, nextListeners);
    if (this.maxListeners > 0 && this.listenerCount(eventName) > this.maxListeners && !this.hasWarnedAboutPotentialMemoryLeak) {
      this.hasWarnedAboutPotentialMemoryLeak = true;
      const memoryLeakWarning = new MemoryLeakError(
        this,
        eventName,
        this.listenerCount(eventName)
      );
      console.warn(memoryLeakWarning);
    }
    return this;
  }
  on(eventName, listener) {
    return this.addListener(eventName, listener);
  }
  once(eventName, listener) {
    return this.addListener(
      eventName,
      this._wrapOnceListener(eventName, listener)
    );
  }
  prependListener(eventName, listener) {
    const listeners = this._getListeners(eventName);
    if (listeners.length > 0) {
      const nextListeners = [listener].concat(listeners);
      this.events.set(eventName, nextListeners);
    } else {
      this.events.set(eventName, listeners.concat(listener));
    }
    return this;
  }
  prependOnceListener(eventName, listener) {
    return this.prependListener(
      eventName,
      this._wrapOnceListener(eventName, listener)
    );
  }
  removeListener(eventName, listener) {
    const listeners = this._getListeners(eventName);
    if (listeners.length > 0) {
      this._removeListener(listeners, listener);
      this.events.set(eventName, listeners);
      this._emitInternalEvent("removeListener", eventName, listener);
    }
    return this;
  }
  /**
   * Alias for `emitter.removeListener()`.
   *
   * @example
   * emitter.off('hello', listener)
   */
  off(eventName, listener) {
    return this.removeListener(eventName, listener);
  }
  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
    return this;
  }
  /**
   * Returns a copy of the array of listeners for the event named `eventName`.
   */
  listeners(eventName) {
    return Array.from(this._getListeners(eventName));
  }
  /**
   * Returns the number of listeners listening to the event named `eventName`.
   */
  listenerCount(eventName) {
    return this._getListeners(eventName).length;
  }
  rawListeners(eventName) {
    return this.listeners(eventName);
  }
};
var Emitter2 = _Emitter;
Emitter2.defaultMaxListeners = 10;

// node_modules/@mswjs/interceptors/lib/browser/createRequestId-DYCsFHOi.mjs
function getGlobalSymbol(symbol) {
  return globalThis[symbol] || void 0;
}
function setGlobalSymbol(symbol, value) {
  globalThis[symbol] = value;
}
function deleteGlobalSymbol(symbol) {
  delete globalThis[symbol];
}
var InterceptorReadyState = /* @__PURE__ */ (function(InterceptorReadyState$1) {
  InterceptorReadyState$1["INACTIVE"] = "INACTIVE";
  InterceptorReadyState$1["APPLYING"] = "APPLYING";
  InterceptorReadyState$1["APPLIED"] = "APPLIED";
  InterceptorReadyState$1["DISPOSING"] = "DISPOSING";
  InterceptorReadyState$1["DISPOSED"] = "DISPOSED";
  return InterceptorReadyState$1;
})({});
var Interceptor = class {
  constructor(symbol) {
    this.symbol = symbol;
    this.readyState = InterceptorReadyState.INACTIVE;
    this.emitter = new Emitter2();
    this.subscriptions = [];
    this.logger = new Logger(symbol.description);
    this.emitter.setMaxListeners(0);
    this.logger.info("constructing the interceptor...");
  }
  /**
  * Determine if this interceptor can be applied
  * in the current environment.
  */
  checkEnvironment() {
    return true;
  }
  /**
  * Apply this interceptor to the current process.
  * Returns an already running interceptor instance if it's present.
  */
  apply() {
    const logger = this.logger.extend("apply");
    logger.info("applying the interceptor...");
    if (this.readyState === InterceptorReadyState.APPLIED) {
      logger.info("intercepted already applied!");
      return;
    }
    if (!this.checkEnvironment()) {
      logger.info("the interceptor cannot be applied in this environment!");
      return;
    }
    this.readyState = InterceptorReadyState.APPLYING;
    const runningInstance = this.getInstance();
    if (runningInstance) {
      logger.info("found a running instance, reusing...");
      this.on = (event, listener) => {
        logger.info('proxying the "%s" listener', event);
        runningInstance.emitter.addListener(event, listener);
        this.subscriptions.push(() => {
          runningInstance.emitter.removeListener(event, listener);
          logger.info('removed proxied "%s" listener!', event);
        });
        return this;
      };
      this.readyState = InterceptorReadyState.APPLIED;
      return;
    }
    logger.info("no running instance found, setting up a new instance...");
    this.setup();
    this.setInstance();
    this.readyState = InterceptorReadyState.APPLIED;
  }
  /**
  * Setup the module augments and stubs necessary for this interceptor.
  * This method is not run if there's a running interceptor instance
  * to prevent instantiating an interceptor multiple times.
  */
  setup() {
  }
  /**
  * Listen to the interceptor's public events.
  */
  on(event, listener) {
    const logger = this.logger.extend("on");
    if (this.readyState === InterceptorReadyState.DISPOSING || this.readyState === InterceptorReadyState.DISPOSED) {
      logger.info("cannot listen to events, already disposed!");
      return this;
    }
    logger.info('adding "%s" event listener:', event, listener);
    this.emitter.on(event, listener);
    return this;
  }
  once(event, listener) {
    this.emitter.once(event, listener);
    return this;
  }
  off(event, listener) {
    this.emitter.off(event, listener);
    return this;
  }
  removeAllListeners(event) {
    this.emitter.removeAllListeners(event);
    return this;
  }
  /**
  * Disposes of any side-effects this interceptor has introduced.
  */
  dispose() {
    const logger = this.logger.extend("dispose");
    if (this.readyState === InterceptorReadyState.DISPOSED) {
      logger.info("cannot dispose, already disposed!");
      return;
    }
    logger.info("disposing the interceptor...");
    this.readyState = InterceptorReadyState.DISPOSING;
    if (!this.getInstance()) {
      logger.info("no interceptors running, skipping dispose...");
      return;
    }
    this.clearInstance();
    logger.info("global symbol deleted:", getGlobalSymbol(this.symbol));
    if (this.subscriptions.length > 0) {
      logger.info("disposing of %d subscriptions...", this.subscriptions.length);
      for (const dispose of this.subscriptions) dispose();
      this.subscriptions = [];
      logger.info("disposed of all subscriptions!", this.subscriptions.length);
    }
    this.emitter.removeAllListeners();
    logger.info("destroyed the listener!");
    this.readyState = InterceptorReadyState.DISPOSED;
  }
  getInstance() {
    const instance = getGlobalSymbol(this.symbol);
    this.logger.info("retrieved global instance:", instance?.constructor?.name);
    return instance;
  }
  setInstance() {
    setGlobalSymbol(this.symbol, this);
    this.logger.info("set global instance!", this.symbol.description);
  }
  clearInstance() {
    deleteGlobalSymbol(this.symbol);
    this.logger.info("cleared global instance!", this.symbol.description);
  }
};
function createRequestId() {
  return Math.random().toString(16).slice(2);
}

// node_modules/@mswjs/interceptors/node_modules/@open-draft/deferred-promise/build/index.mjs
function createDeferredExecutor() {
  const executor = (resolve, reject) => {
    executor.state = "pending";
    executor.resolve = (data) => {
      if (executor.state !== "pending") {
        return;
      }
      executor.result = data;
      const onFulfilled = (value) => {
        executor.state = "fulfilled";
        return value;
      };
      return resolve(
        data instanceof Promise ? data : Promise.resolve(data).then(onFulfilled)
      );
    };
    executor.reject = (reason) => {
      if (executor.state !== "pending") {
        return;
      }
      queueMicrotask(() => {
        executor.state = "rejected";
      });
      return reject(executor.rejectionReason = reason);
    };
  };
  return executor;
}
var DeferredPromise = class extends Promise {
  #executor;
  resolve;
  reject;
  constructor(executor = null) {
    const deferredExecutor = createDeferredExecutor();
    super((originalResolve, originalReject) => {
      deferredExecutor(originalResolve, originalReject);
      executor?.(deferredExecutor.resolve, deferredExecutor.reject);
    });
    this.#executor = deferredExecutor;
    this.resolve = this.#executor.resolve;
    this.reject = this.#executor.reject;
  }
  get state() {
    return this.#executor.state;
  }
  get rejectionReason() {
    return this.#executor.rejectionReason;
  }
  then(onFulfilled, onRejected) {
    return this.#decorate(super.then(onFulfilled, onRejected));
  }
  catch(onRejected) {
    return this.#decorate(super.catch(onRejected));
  }
  finally(onfinally) {
    return this.#decorate(super.finally(onfinally));
  }
  #decorate(promise) {
    return Object.defineProperties(promise, {
      resolve: { configurable: true, value: this.resolve },
      reject: { configurable: true, value: this.reject }
    });
  }
};

// node_modules/@mswjs/interceptors/lib/browser/getRawRequest-B1BqgWG6.mjs
var InterceptorError = class InterceptorError2 extends Error {
  constructor(message4) {
    super(message4);
    this.name = "InterceptorError";
    Object.setPrototypeOf(this, InterceptorError2.prototype);
  }
};
var RequestController = class RequestController2 {
  static {
    this.PENDING = 0;
  }
  static {
    this.PASSTHROUGH = 1;
  }
  static {
    this.RESPONSE = 2;
  }
  static {
    this.ERROR = 3;
  }
  constructor(request, source) {
    this.request = request;
    this.source = source;
    this.readyState = RequestController2.PENDING;
    this.handled = new DeferredPromise();
  }
  get #handled() {
    return this.handled;
  }
  /**
  * Perform this request as-is.
  */
  async passthrough() {
    invariant.as(InterceptorError, this.readyState === RequestController2.PENDING, 'Failed to passthrough the "%s %s" request: the request has already been handled', this.request.method, this.request.url);
    this.readyState = RequestController2.PASSTHROUGH;
    await this.source.passthrough();
    this.#handled.resolve();
  }
  /**
  * Respond to this request with the given `Response` instance.
  *
  * @example
  * controller.respondWith(new Response())
  * controller.respondWith(Response.json({ id }))
  * controller.respondWith(Response.error())
  */
  respondWith(response) {
    invariant.as(InterceptorError, this.readyState === RequestController2.PENDING, 'Failed to respond to the "%s %s" request with "%d %s": the request has already been handled (%d)', this.request.method, this.request.url, response.status, response.statusText || "OK", this.readyState);
    this.readyState = RequestController2.RESPONSE;
    this.#handled.resolve();
    this.source.respondWith(response);
  }
  /**
  * Error this request with the given reason.
  *
  * @example
  * controller.errorWith()
  * controller.errorWith(new Error('Oops!'))
  * controller.errorWith({ message: 'Oops!'})
  */
  errorWith(reason) {
    invariant.as(InterceptorError, this.readyState === RequestController2.PENDING, 'Failed to error the "%s %s" request with "%s": the request has already been handled (%d)', this.request.method, this.request.url, reason?.toString(), this.readyState);
    this.readyState = RequestController2.ERROR;
    this.source.errorWith(reason);
    this.#handled.resolve();
  }
};
function canParseUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (_error) {
    return false;
  }
}
function getValueBySymbol(symbolName, source) {
  const symbol = Object.getOwnPropertySymbols(source).find((symbol$1) => {
    return symbol$1.description === symbolName;
  });
  if (symbol) return Reflect.get(source, symbol);
}
var kStatus = /* @__PURE__ */ Symbol("kStatus");
var kUrl = /* @__PURE__ */ Symbol("kUrl");
var FetchResponse = class FetchResponse2 extends Response {
  static {
    this.STATUS_CODES_WITHOUT_BODY = [
      101,
      103,
      204,
      205,
      304
    ];
  }
  static {
    this.STATUS_CODES_WITH_REDIRECT = [
      301,
      302,
      303,
      307,
      308
    ];
  }
  static isConfigurableStatusCode(status) {
    return status >= 200 && status <= 599;
  }
  static isRedirectResponse(status) {
    return FetchResponse2.STATUS_CODES_WITH_REDIRECT.includes(status);
  }
  /**
  * Returns a boolean indicating whether the given response status
  * code represents a response that can have a body.
  */
  static isResponseWithBody(status) {
    return !FetchResponse2.STATUS_CODES_WITHOUT_BODY.includes(status);
  }
  static setStatus(status, response) {
    const internalState = getValueBySymbol("state", response);
    if (internalState) internalState.status = status;
    else Object.defineProperty(response, "status", {
      value: status,
      enumerable: true,
      configurable: true,
      writable: false
    });
    Object.defineProperty(response, kStatus, {
      value: status,
      enumerable: false
    });
  }
  static setUrl(url, response) {
    if (!url || url === "about:" || !canParseUrl(url)) return;
    const state = getValueBySymbol("state", response);
    if (state) state.urlList.push(new URL(url));
    else Object.defineProperty(response, "url", {
      value: url,
      enumerable: true,
      configurable: true,
      writable: false
    });
    Object.defineProperty(response, kUrl, {
      value: url,
      enumerable: false
    });
  }
  /**
  * Parses the given raw HTTP headers into a Fetch API `Headers` instance.
  */
  static parseRawHeaders(rawHeaders) {
    const headers = new Headers();
    for (let line = 0; line < rawHeaders.length; line += 2) headers.append(rawHeaders[line], rawHeaders[line + 1]);
    return headers;
  }
  /**
  * Safely clones the given `Response`.
  * Coerces response clone exceptions into 500 mocked responses.
  * Handy in the environments that introduce arbitrary response
  * cloning restrictions, like "101 Switching Protocols" cloning
  * in "miniflare".
  */
  static clone(response) {
    try {
      return response.clone();
    } catch (error4) {
      return Response.json(error4 instanceof Error ? {
        name: error4.name,
        message: error4.message,
        stack: error4.stack
      } : {}, {
        status: 500,
        statusText: "Unclonable Response"
      });
    }
  }
  constructor(body, init = {}) {
    const status = init.status ?? 200;
    const safeStatus = FetchResponse2.isConfigurableStatusCode(status) ? status : 200;
    const finalBody = FetchResponse2.isResponseWithBody(status) ? body : null;
    super(finalBody, {
      status: safeStatus,
      statusText: init.statusText,
      headers: init.headers
    });
    if (status !== safeStatus) FetchResponse2.setStatus(status, this);
    FetchResponse2.setUrl(init.url, this);
  }
  clone() {
    const clonedResponse = super.clone();
    const customStatus = Reflect.get(this, kStatus);
    if (customStatus) FetchResponse2.setStatus(customStatus, clonedResponse);
    const customUrl = Reflect.get(this, kUrl);
    if (customUrl) FetchResponse2.setUrl(customUrl, clonedResponse);
    return clonedResponse;
  }
};

// node_modules/@mswjs/interceptors/lib/browser/bufferUtils-BiiO6HZv.mjs
var encoder = new TextEncoder();

// node_modules/@mswjs/interceptors/lib/browser/resolveWebSocketUrl-C83-x9iE.mjs
function resolveWebSocketUrl(url) {
  if (typeof url === "string") return resolveWebSocketUrl(new URL(url, typeof location !== "undefined" ? location.href : void 0));
  if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:")
    throw new SyntaxError(`Failed to construct 'WebSocket': The URL's scheme must be either 'http', 'https', 'ws', or 'wss'. '${url.protocol}' is not allowed.`);
  if (url.hash !== "") throw new SyntaxError(`Failed to construct 'WebSocket': The URL contains a fragment identifier ('${url.hash}'). Fragment identifiers are not allowed in WebSocket URLs.`);
  return url.href;
}

// node_modules/@mswjs/interceptors/lib/browser/index.mjs
var BatchInterceptor = class BatchInterceptor2 extends Interceptor {
  constructor(options) {
    BatchInterceptor2.symbol = Symbol.for(options.name);
    super(BatchInterceptor2.symbol);
    this.interceptors = options.interceptors;
  }
  setup() {
    const logger = this.logger.extend("setup");
    logger.info("applying all %d interceptors...", this.interceptors.length);
    for (const interceptor of this.interceptors) {
      logger.info('applying "%s" interceptor...', interceptor.constructor.name);
      interceptor.apply();
      logger.info("adding interceptor dispose subscription");
      this.subscriptions.push(() => interceptor.dispose());
    }
  }
  on(event, listener) {
    for (const interceptor of this.interceptors) interceptor.on(event, listener);
    return this;
  }
  once(event, listener) {
    for (const interceptor of this.interceptors) interceptor.once(event, listener);
    return this;
  }
  off(event, listener) {
    for (const interceptor of this.interceptors) interceptor.off(event, listener);
    return this;
  }
  removeAllListeners(event) {
    for (const interceptors of this.interceptors) interceptors.removeAllListeners(event);
    return this;
  }
};
function getCleanUrl(url, isAbsolute = true) {
  return [isAbsolute && url.origin, url.pathname].filter(Boolean).join("");
}

// node_modules/msw/lib/core/utils/request/toPublicUrl.mjs
function toPublicUrl(url) {
  const urlInstance = url instanceof URL ? url : new URL(url);
  if (typeof location !== "undefined" && urlInstance.origin === location.origin) {
    return urlInstance.pathname;
  }
  return urlInstance.origin + urlInstance.pathname;
}

// node_modules/set-cookie-parser/lib/set-cookie.js
var defaultParseOptions = {
  decodeValues: true,
  map: false,
  silent: false,
  split: "auto"
  // auto = split strings but not arrays
};
function isForbiddenKey(key) {
  return typeof key !== "string" || key in {};
}
function createNullObj() {
  return /* @__PURE__ */ Object.create(null);
}
function isNonEmptyString(str) {
  return typeof str === "string" && !!str.trim();
}
function parseString(setCookieValue, options) {
  var parts = setCookieValue.split(";").filter(isNonEmptyString);
  var nameValuePairStr = parts.shift();
  if (!nameValuePairStr) {
    return null;
  }
  var parsed = parseNameValuePair(nameValuePairStr);
  var name = parsed.name;
  var value = parsed.value;
  options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
  if (isForbiddenKey(name)) {
    return null;
  }
  try {
    value = options.decodeValues ? decodeURIComponent(value) : value;
  } catch (e) {
    console.error(
      "set-cookie-parser: failed to decode cookie value. Set options.decodeValues=false to disable decoding.",
      e
    );
  }
  var cookie2 = createNullObj();
  cookie2.name = name;
  cookie2.value = value;
  parts.forEach(function(part) {
    var sides = part.split("=");
    var key = sides.shift().trim().toLowerCase();
    if (isForbiddenKey(key)) {
      return;
    }
    var value2 = sides.join("=").trim();
    if (key === "expires") {
      cookie2.expires = new Date(value2);
    } else if (key === "max-age") {
      var n = parseInt(value2, 10);
      if (!Number.isNaN(n)) cookie2.maxAge = n;
    } else if (key === "secure") {
      cookie2.secure = true;
    } else if (key === "httponly") {
      cookie2.httpOnly = true;
    } else if (key === "samesite") {
      cookie2.sameSite = value2;
    } else if (key === "partitioned") {
      cookie2.partitioned = true;
    } else if (key) {
      cookie2[key] = value2;
    }
  });
  return cookie2;
}
function parseNameValuePair(nameValuePairStr) {
  var name = "";
  var value = "";
  var nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}
function parseSetCookie(input, options) {
  options = options ? Object.assign({}, defaultParseOptions, options) : defaultParseOptions;
  if (!input) {
    if (!options.map) {
      return [];
    } else {
      return createNullObj();
    }
  }
  if (input.headers) {
    if (typeof input.headers.getSetCookie === "function") {
      input = input.headers.getSetCookie();
    } else if (input.headers["set-cookie"]) {
      input = input.headers["set-cookie"];
    } else {
      var sch = input.headers[Object.keys(input.headers).find(function(key) {
        return key.toLowerCase() === "set-cookie";
      })];
      if (!sch && input.headers.cookie && !options.silent) {
        console.warn(
          "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
        );
      }
      input = sch;
    }
  }
  var split = options.split;
  var isArray = Array.isArray(input);
  if (split === "auto") {
    split = !isArray;
  }
  if (!isArray) {
    input = [input];
  }
  input = input.filter(isNonEmptyString);
  if (split) {
    input = input.map(splitCookiesString).flat();
  }
  if (!options.map) {
    return input.map(function(str) {
      return parseString(str, options);
    }).filter(Boolean);
  } else {
    var cookies = createNullObj();
    return input.reduce(function(cookies2, str) {
      var cookie2 = parseString(str, options);
      if (cookie2 && !isForbiddenKey(cookie2.name)) {
        cookies2[cookie2.name] = cookie2;
      }
      return cookies2;
    }, cookies);
  }
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;
  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }
  function notSpecialChar() {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  }
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }
  return cookiesStrings;
}
parseSetCookie.parseSetCookie = parseSetCookie;
parseSetCookie.parse = parseSetCookie;
parseSetCookie.parseString = parseString;
parseSetCookie.splitCookiesString = splitCookiesString;

// node_modules/headers-polyfill/lib/index.mjs
var HEADERS_INVALID_CHARACTERS = /[^a-z0-9\-#$%&'*+.^_`|~]/i;
function normalizeHeaderName(name) {
  if (HEADERS_INVALID_CHARACTERS.test(name) || name.trim() === "") throw new TypeError("Invalid character in header field name");
  return name.trim().toLowerCase();
}
var charCodesToRemove = [
  String.fromCharCode(10),
  String.fromCharCode(13),
  String.fromCharCode(9),
  String.fromCharCode(32)
];
var HEADER_VALUE_REMOVE_REGEXP = new RegExp(`(^[${charCodesToRemove.join("")}]|$[${charCodesToRemove.join("")}])`, "g");
function normalizeHeaderValue(value) {
  return value.replace(HEADER_VALUE_REMOVE_REGEXP, "");
}
function isValidHeaderName(value) {
  if (typeof value !== "string") return false;
  if (value.length === 0) return false;
  for (let i = 0; i < value.length; i++) {
    const character = value.charCodeAt(i);
    if (character > 127 || !isToken(character)) return false;
  }
  return true;
}
function isToken(value) {
  return ![
    127,
    32,
    "(",
    ")",
    "<",
    ">",
    "@",
    ",",
    ";",
    ":",
    "\\",
    '"',
    "/",
    "[",
    "]",
    "?",
    "=",
    "{",
    "}"
  ].includes(value);
}
function isValidHeaderValue(value) {
  if (typeof value !== "string") return false;
  if (value.trim() !== value) return false;
  for (let i = 0; i < value.length; i++) {
    const character = value.charCodeAt(i);
    if (character === 0 || character === 10 || character === 13) return false;
  }
  return true;
}
var _Symbol$toStringTag;
var NORMALIZED_HEADERS = /* @__PURE__ */ Symbol("normalizedHeaders");
var RAW_HEADER_NAMES = /* @__PURE__ */ Symbol("rawHeaderNames");
var HEADER_VALUE_DELIMITER = ", ";
var Headers2 = class Headers3 {
  constructor(init) {
    this[NORMALIZED_HEADERS] = {};
    this[RAW_HEADER_NAMES] = /* @__PURE__ */ new Map();
    this[_Symbol$toStringTag] = "Headers";
    if (["Headers", "HeadersPolyfill"].includes(init?.constructor?.name) || init instanceof Headers3 || typeof globalThis.Headers !== "undefined" && init instanceof globalThis.Headers) init.forEach((value, name) => {
      this.append(name, value);
    }, this);
    else if (Array.isArray(init)) init.forEach(([name, value]) => {
      this.append(name, Array.isArray(value) ? value.join(HEADER_VALUE_DELIMITER) : value);
    });
    else if (init) Object.getOwnPropertyNames(init).forEach((name) => {
      const value = init[name];
      this.append(name, Array.isArray(value) ? value.join(HEADER_VALUE_DELIMITER) : value);
    });
  }
  [(_Symbol$toStringTag = Symbol.toStringTag, Symbol.iterator)]() {
    return this.entries();
  }
  *keys() {
    for (const [name] of this.entries()) yield name;
  }
  *values() {
    for (const [, value] of this.entries()) yield value;
  }
  *entries() {
    let sortedKeys = Object.keys(this[NORMALIZED_HEADERS]).sort((a, b) => a.localeCompare(b));
    for (const name of sortedKeys) if (name === "set-cookie") for (const value of this.getSetCookie()) yield [name, value];
    else yield [name, this.get(name)];
  }
  /**
  * Returns a boolean stating whether a `Headers` object contains a certain header.
  */
  has(name) {
    if (!isValidHeaderName(name)) throw new TypeError(`Invalid header name "${name}"`);
    return this[NORMALIZED_HEADERS].hasOwnProperty(normalizeHeaderName(name));
  }
  /**
  * Returns a `ByteString` sequence of all the values of a header with a given name.
  */
  get(name) {
    if (!isValidHeaderName(name)) throw TypeError(`Invalid header name "${name}"`);
    return this[NORMALIZED_HEADERS][normalizeHeaderName(name)] ?? null;
  }
  /**
  * Sets a new value for an existing header inside a `Headers` object, or adds the header if it does not already exist.
  */
  set(name, value) {
    if (!isValidHeaderName(name) || !isValidHeaderValue(value)) return;
    const normalizedName = normalizeHeaderName(name);
    const normalizedValue = normalizeHeaderValue(value);
    this[NORMALIZED_HEADERS][normalizedName] = normalizeHeaderValue(normalizedValue);
    this[RAW_HEADER_NAMES].set(normalizedName, name);
  }
  /**
  * Appends a new value onto an existing header inside a `Headers` object, or adds the header if it does not already exist.
  */
  append(name, value) {
    if (!isValidHeaderName(name) || !isValidHeaderValue(value)) return;
    const normalizedName = normalizeHeaderName(name);
    const normalizedValue = normalizeHeaderValue(value);
    let resolvedValue = this.has(normalizedName) ? `${this.get(normalizedName)}, ${normalizedValue}` : normalizedValue;
    this.set(name, resolvedValue);
  }
  /**
  * Deletes a header from the `Headers` object.
  */
  delete(name) {
    if (!isValidHeaderName(name)) return;
    if (!this.has(name)) return;
    const normalizedName = normalizeHeaderName(name);
    delete this[NORMALIZED_HEADERS][normalizedName];
    this[RAW_HEADER_NAMES].delete(normalizedName);
  }
  /**
  * Traverses the `Headers` object,
  * calling the given callback for each header.
  */
  forEach(callback, thisArg) {
    for (const [name, value] of this.entries()) callback.call(thisArg, value, name, this);
  }
  /**
  * Returns an array containing the values
  * of all Set-Cookie headers associated
  * with a response
  */
  getSetCookie() {
    const setCookieHeader = this.get("set-cookie");
    if (setCookieHeader === null) return [];
    if (setCookieHeader === "") return [""];
    return splitCookiesString(setCookieHeader);
  }
};

// node_modules/msw/lib/core/utils/internal/getCallFrame.mjs
var SOURCE_FRAME = /[/\\]msw[/\\]src[/\\](.+)/;
var BUILD_FRAME = /(node_modules)?[/\\]lib[/\\](core|browser|node|native|iife)[/\\]|^[^/\\]*$/;
function getCallFrame(error4) {
  const stack = error4.stack;
  if (!stack) {
    return;
  }
  const frames = stack.split("\n").slice(1);
  const declarationFrame = frames.find((frame) => {
    return !(SOURCE_FRAME.test(frame) || BUILD_FRAME.test(frame));
  });
  if (!declarationFrame) {
    return;
  }
  const declarationPath = declarationFrame.replace(/\s*at [^()]*\(([^)]+)\)/, "$1").replace(/^@/, "");
  return declarationPath;
}

// node_modules/msw/lib/core/utils/internal/isIterable.mjs
function isIterable(fn) {
  if (!fn) {
    return false;
  }
  return Reflect.has(fn, Symbol.iterator) || Reflect.has(fn, Symbol.asyncIterator);
}

// node_modules/msw/lib/shims/statuses.mjs
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var require_codes = __commonJS({
  "node_modules/.pnpm/statuses@2.0.2/node_modules/statuses/codes.json"(exports, module) {
    module.exports = {
      "100": "Continue",
      "101": "Switching Protocols",
      "102": "Processing",
      "103": "Early Hints",
      "200": "OK",
      "201": "Created",
      "202": "Accepted",
      "203": "Non-Authoritative Information",
      "204": "No Content",
      "205": "Reset Content",
      "206": "Partial Content",
      "207": "Multi-Status",
      "208": "Already Reported",
      "226": "IM Used",
      "300": "Multiple Choices",
      "301": "Moved Permanently",
      "302": "Found",
      "303": "See Other",
      "304": "Not Modified",
      "305": "Use Proxy",
      "307": "Temporary Redirect",
      "308": "Permanent Redirect",
      "400": "Bad Request",
      "401": "Unauthorized",
      "402": "Payment Required",
      "403": "Forbidden",
      "404": "Not Found",
      "405": "Method Not Allowed",
      "406": "Not Acceptable",
      "407": "Proxy Authentication Required",
      "408": "Request Timeout",
      "409": "Conflict",
      "410": "Gone",
      "411": "Length Required",
      "412": "Precondition Failed",
      "413": "Payload Too Large",
      "414": "URI Too Long",
      "415": "Unsupported Media Type",
      "416": "Range Not Satisfiable",
      "417": "Expectation Failed",
      "418": "I'm a Teapot",
      "421": "Misdirected Request",
      "422": "Unprocessable Entity",
      "423": "Locked",
      "424": "Failed Dependency",
      "425": "Too Early",
      "426": "Upgrade Required",
      "428": "Precondition Required",
      "429": "Too Many Requests",
      "431": "Request Header Fields Too Large",
      "451": "Unavailable For Legal Reasons",
      "500": "Internal Server Error",
      "501": "Not Implemented",
      "502": "Bad Gateway",
      "503": "Service Unavailable",
      "504": "Gateway Timeout",
      "505": "HTTP Version Not Supported",
      "506": "Variant Also Negotiates",
      "507": "Insufficient Storage",
      "508": "Loop Detected",
      "509": "Bandwidth Limit Exceeded",
      "510": "Not Extended",
      "511": "Network Authentication Required"
    };
  }
});
var require_statuses = __commonJS({
  "node_modules/.pnpm/statuses@2.0.2/node_modules/statuses/index.js"(exports, module) {
    "use strict";
    var codes = require_codes();
    module.exports = status;
    status.message = codes;
    status.code = createMessageToStatusCodeMap(codes);
    status.codes = createStatusCodeList(codes);
    status.redirect = {
      300: true,
      301: true,
      302: true,
      303: true,
      305: true,
      307: true,
      308: true
    };
    status.empty = {
      204: true,
      205: true,
      304: true
    };
    status.retry = {
      502: true,
      503: true,
      504: true
    };
    function createMessageToStatusCodeMap(codes2) {
      var map = {};
      Object.keys(codes2).forEach(function forEachCode(code) {
        var message22 = codes2[code];
        var status2 = Number(code);
        map[message22.toLowerCase()] = status2;
      });
      return map;
    }
    function createStatusCodeList(codes2) {
      return Object.keys(codes2).map(function mapCode(code) {
        return Number(code);
      });
    }
    function getStatusCode(message22) {
      var msg = message22.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(status.code, msg)) {
        throw new Error('invalid status message: "' + message22 + '"');
      }
      return status.code[msg];
    }
    function getStatusMessage(code) {
      if (!Object.prototype.hasOwnProperty.call(status.message, code)) {
        throw new Error("invalid status code: " + code);
      }
      return status.message[code];
    }
    function status(code) {
      if (typeof code === "number") {
        return getStatusMessage(code);
      }
      if (typeof code !== "string") {
        throw new TypeError("code must be a number or string");
      }
      var n = parseInt(code, 10);
      if (!isNaN(n)) {
        return getStatusMessage(n);
      }
      return getStatusCode(code);
    }
  }
});
var allStatuses = __toESM(require_statuses(), 1);
var statuses = allStatuses.default || allStatuses;
var message = statuses.message;
var statuses_default = statuses;

// node_modules/msw/lib/core/utils/HttpResponse/decorators.mjs
var { message: message2 } = statuses_default;
var kSetCookie = /* @__PURE__ */ Symbol("kSetCookie");
function normalizeResponseInit(init = {}) {
  const status = init?.status || 200;
  const statusText = init?.statusText || message2[status] || "";
  const headers = new Headers(init?.headers);
  return {
    ...init,
    headers,
    status,
    statusText
  };
}
function decorateResponse(response, init) {
  if (init.type) {
    Object.defineProperty(response, "type", {
      value: init.type,
      enumerable: true,
      writable: false
    });
  }
  const responseCookies = init.headers.get("set-cookie");
  if (responseCookies) {
    Object.defineProperty(response, kSetCookie, {
      value: responseCookies,
      enumerable: false,
      writable: false
    });
  }
  return response;
}
function getRawSetCookie(response) {
  return Reflect.get(response, kSetCookie);
}
function copyResponseOwnProperties(source, target) {
  for (const propertyName of Reflect.ownKeys(source)) {
    const descriptor = Object.getOwnPropertyDescriptor(source, propertyName);
    const existingDescriptor = Object.getOwnPropertyDescriptor(
      target,
      propertyName
    );
    if (descriptor && existingDescriptor == null) {
      Object.defineProperty(target, propertyName, descriptor);
    }
  }
}

// node_modules/msw/lib/core/HttpResponse.mjs
var bodyType = /* @__PURE__ */ Symbol("bodyType");
var kDefaultContentType = /* @__PURE__ */ Symbol.for("kDefaultContentType");
var HttpResponse = class _HttpResponse extends FetchResponse {
  [bodyType] = null;
  constructor(body, init) {
    const responseInit = normalizeResponseInit(init);
    super(body, responseInit);
    decorateResponse(this, responseInit);
  }
  static error() {
    return super.error();
  }
  /**
   * Create a `Response` with a `Content-Type: "text/plain"` body.
   * @example
   * HttpResponse.text('hello world')
   * HttpResponse.text('Error', { status: 500 })
   */
  static text(body, init) {
    const responseInit = normalizeResponseInit(init);
    const hasExplicitContentType = responseInit.headers.has("Content-Type");
    if (!hasExplicitContentType) {
      responseInit.headers.set("Content-Type", "text/plain");
    }
    if (!responseInit.headers.has("Content-Length")) {
      responseInit.headers.set(
        "Content-Length",
        body ? new Blob([body]).size.toString() : "0"
      );
    }
    const response = new _HttpResponse(body, responseInit);
    if (!hasExplicitContentType) {
      Object.defineProperty(response, kDefaultContentType, {
        value: true,
        enumerable: false
      });
    }
    return response;
  }
  /**
   * Create a `Response` with a `Content-Type: "application/json"` body.
   * @example
   * HttpResponse.json({ firstName: 'John' })
   * HttpResponse.json({ error: 'Not Authorized' }, { status: 401 })
   */
  static json(body, init) {
    const responseInit = normalizeResponseInit(init);
    const hasExplicitContentType = responseInit.headers.has("Content-Type");
    if (!hasExplicitContentType) {
      responseInit.headers.set("Content-Type", "application/json");
    }
    const responseText = JSON.stringify(body);
    if (!responseInit.headers.has("Content-Length")) {
      responseInit.headers.set(
        "Content-Length",
        responseText ? new Blob([responseText]).size.toString() : "0"
      );
    }
    const response = new _HttpResponse(responseText, responseInit);
    if (!hasExplicitContentType) {
      Object.defineProperty(response, kDefaultContentType, {
        value: true,
        enumerable: false
      });
    }
    return response;
  }
  /**
   * Create a `Response` with a `Content-Type: "application/xml"` body.
   * @example
   * HttpResponse.xml(`<user name="John" />`)
   * HttpResponse.xml(`<article id="abc-123" />`, { status: 201 })
   */
  static xml(body, init) {
    const responseInit = normalizeResponseInit(init);
    const hasExplicitContentType = responseInit.headers.has("Content-Type");
    if (!hasExplicitContentType) {
      responseInit.headers.set("Content-Type", "text/xml");
    }
    const response = new _HttpResponse(body, responseInit);
    if (!hasExplicitContentType) {
      Object.defineProperty(response, kDefaultContentType, {
        value: true,
        enumerable: false
      });
    }
    return response;
  }
  /**
   * Create a `Response` with a `Content-Type: "text/html"` body.
   * @example
   * HttpResponse.html(`<p class="author">Jane Doe</p>`)
   * HttpResponse.html(`<main id="abc-123">Main text</main>`, { status: 201 })
   */
  static html(body, init) {
    const responseInit = normalizeResponseInit(init);
    const hasExplicitContentType = responseInit.headers.has("Content-Type");
    if (!hasExplicitContentType) {
      responseInit.headers.set("Content-Type", "text/html");
    }
    const response = new _HttpResponse(body, responseInit);
    if (!hasExplicitContentType) {
      Object.defineProperty(response, kDefaultContentType, {
        value: true,
        enumerable: false
      });
    }
    return response;
  }
  /**
   * Create a `Response` with an `ArrayBuffer` body.
   * @example
   * const buffer = new ArrayBuffer(3)
   * const view = new Uint8Array(buffer)
   * view.set([1, 2, 3])
   *
   * HttpResponse.arrayBuffer(buffer)
   */
  static arrayBuffer(body, init) {
    const responseInit = normalizeResponseInit(init);
    const hasExplicitContentType = responseInit.headers.has("Content-Type");
    if (!hasExplicitContentType) {
      responseInit.headers.set("Content-Type", "application/octet-stream");
    }
    if (body && !responseInit.headers.has("Content-Length")) {
      responseInit.headers.set("Content-Length", body.byteLength.toString());
    }
    const response = new _HttpResponse(body, responseInit);
    if (!hasExplicitContentType) {
      Object.defineProperty(response, kDefaultContentType, {
        value: true,
        enumerable: false
      });
    }
    return response;
  }
  /**
   * Create a `Response` with a `FormData` body.
   * @example
   * const data = new FormData()
   * data.set('name', 'Alice')
   *
   * HttpResponse.formData(data)
   */
  static formData(body, init) {
    return new _HttpResponse(body, normalizeResponseInit(init));
  }
};

// node_modules/@open-draft/deferred-promise/build/index.mjs
function createDeferredExecutor2() {
  const executor = ((resolve, reject) => {
    executor.state = "pending";
    executor.resolve = (data) => {
      if (executor.state !== "pending") return;
      executor.result = data;
      const onFulfilled = (value) => {
        executor.state = "fulfilled";
        return value;
      };
      return resolve(data instanceof Promise ? data : Promise.resolve(data).then(onFulfilled));
    };
    executor.reject = (reason) => {
      if (executor.state !== "pending") return;
      queueMicrotask(() => {
        executor.state = "rejected";
      });
      return reject(executor.rejectionReason = reason);
    };
  });
  return executor;
}
var DeferredPromise2 = class extends Promise {
  #executor;
  resolve;
  reject;
  constructor(executor = null) {
    const deferredExecutor = createDeferredExecutor2();
    super((originalResolve, originalReject) => {
      deferredExecutor(originalResolve, originalReject);
      executor?.(deferredExecutor.resolve, deferredExecutor.reject);
    });
    this.#executor = deferredExecutor;
    this.resolve = this.#executor.resolve;
    this.reject = this.#executor.reject;
  }
  get state() {
    return this.#executor.state;
  }
  get rejectionReason() {
    return this.#executor.rejectionReason;
  }
  then(onFulfilled, onRejected) {
    return this.#decorate(super.then(onFulfilled, onRejected));
  }
  catch(onRejected) {
    return this.#decorate(super.catch(onRejected));
  }
  finally(onfinally) {
    return this.#decorate(super.finally(onfinally));
  }
  #decorate(promise) {
    return Object.defineProperties(promise, {
      resolve: {
        configurable: true,
        value: this.resolve
      },
      reject: {
        configurable: true,
        value: this.reject
      }
    });
  }
};

// node_modules/msw/lib/core/utils/internal/observe-response-body-stream.mjs
function observeResponseBodyStream(response) {
  if (response.body == null || response.bodyUsed || response.body.locked) {
    return null;
  }
  const settled = new DeferredPromise2();
  const reader = response.body.getReader();
  const observedStream = new ReadableStream({
    async pull(controller) {
      try {
        const readResult = await reader.read();
        if (readResult.done) {
          settled.resolve();
          controller.close();
          return;
        }
        controller.enqueue(readResult.value);
      } catch (error4) {
        settled.resolve();
        throw error4;
      }
    },
    async cancel(reason) {
      settled.resolve();
      await reader.cancel(reason);
    }
  });
  const observedResponse = new FetchResponse(observedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  copyResponseOwnProperties(response, observedResponse);
  return {
    response: observedResponse,
    settled
  };
}

// node_modules/msw/lib/core/handlers/RequestHandler.mjs
var RequestHandler = class _RequestHandler {
  static cache = /* @__PURE__ */ new WeakMap();
  kind = "request";
  resolver;
  resolverIterator;
  resolverIteratorResult;
  resolverIteratorCleanups;
  options;
  scheduledCleanups;
  info;
  /**
   * Indicates whether this request handler has been used
   * (its resolver has successfully executed).
   */
  isUsed;
  constructor(args) {
    this.resolver = args.resolver;
    this.options = args.options;
    this.scheduledCleanups = /* @__PURE__ */ new Map();
    const callFrame = getCallFrame(new Error());
    this.info = {
      ...args.info,
      callFrame
    };
    this.isUsed = false;
  }
  /**
   * Reset the runtime state accumulated during response resolution,
   * such as generator iterator progress. Called when this handler is
   * removed from the active handlers list so re-adding it later starts
   * from a clean state.
   */
  reset() {
    this.scheduledCleanups.clear();
    const iterator = this.resolverIterator;
    this.resolverIterator = void 0;
    this.resolverIteratorResult = void 0;
    this.resolverIteratorCleanups = void 0;
    if (typeof iterator?.return === "function") {
      void Promise.resolve(iterator.return());
    }
  }
  /**
   * Restore this handler so it can match requests again after being
   * exhausted (e.g. via `{ once: true }`). Also clears any accumulated
   * resolution state.
   */
  restore() {
    if (this.options?.once) {
      this.reset();
      this.isUsed = false;
    }
  }
  /**
   * Parse the intercepted request to extract additional information from it.
   * Parsed result is then exposed to other methods of this request handler.
   */
  async parse(_args) {
    return {};
  }
  /**
   * Test if this handler matches the given request.
   *
   * This method is not used internally but is exposed
   * as a convenience method for consumers writing custom
   * handlers.
   */
  async test(args) {
    const parsedResult = await this.parse({
      request: args.request,
      resolutionContext: args.resolutionContext
    });
    return this.predicate({
      request: args.request,
      parsedResult,
      resolutionContext: args.resolutionContext
    });
  }
  extendResolverArgs(_args) {
    return {};
  }
  // Clone the request instance before it's passed to the handler phases
  // and the response resolver so we can always read it for logging.
  // We only clone it once per request to avoid unnecessary overhead.
  cloneRequestOrGetFromCache(request) {
    const existingClone = _RequestHandler.cache.get(request);
    if (typeof existingClone !== "undefined") {
      return existingClone;
    }
    const clonedRequest = request.clone();
    _RequestHandler.cache.set(request, clonedRequest);
    return clonedRequest;
  }
  /**
   * Execute this request handler and produce a mocked response
   * using the given resolver function.
   */
  async run(args) {
    if (this.isUsed && this.options?.once) {
      return null;
    }
    const requestClone = this.cloneRequestOrGetFromCache(args.request);
    const parsedResult = await this.parse({
      request: args.request,
      resolutionContext: args.resolutionContext
    });
    const shouldInterceptRequest = await this.predicate({
      request: args.request,
      parsedResult,
      resolutionContext: args.resolutionContext
    });
    if (!shouldInterceptRequest) {
      return null;
    }
    if (this.isUsed && this.options?.once) {
      return null;
    }
    this.isUsed = true;
    const executeResolver = this.wrapResolver(this.resolver);
    const resolverExtras = this.extendResolverArgs({
      request: args.request,
      parsedResult
    });
    const listenerController = new AbortController();
    let finalizeFunction;
    const getFinalize = () => {
      if (finalizeFunction == null) {
        if (!args.request.signal.aborted) {
          args.request.signal.addEventListener(
            "abort",
            () => this.runScheduledCleanups(args.requestId),
            {
              once: true,
              signal: listenerController.signal
            }
          );
        }
        finalizeFunction = (callback) => {
          this.scheduleCleanup(args.requestId, callback);
          if (args.request.signal.aborted) {
            void this.runScheduledCleanups(args.requestId);
          }
        };
      }
      return finalizeFunction;
    };
    const mockedResponsePromise = executeResolver({
      ...resolverExtras,
      get finalize() {
        return getFinalize();
      },
      requestId: args.requestId,
      request: args.request
    }).catch((errorOrResponse) => {
      if (errorOrResponse instanceof Response) {
        return errorOrResponse;
      }
      throw errorOrResponse;
    }).finally(() => {
      listenerController.abort();
    });
    const mockedResponse = await mockedResponsePromise;
    if (mockedResponse) {
      forwardResponseCookies(mockedResponse);
    }
    const executionResult = this.createExecutionResult({
      // Pass the cloned request to the result so that logging
      // and other consumers could read its body once more.
      request: requestClone,
      requestId: args.requestId,
      response: mockedResponse,
      parsedResult
    });
    return executionResult;
  }
  wrapResolver(resolver) {
    return async (info) => {
      if (!this.resolverIterator) {
        let result;
        try {
          result = await resolver(info);
        } catch (error4) {
          await this.runScheduledCleanups(info.requestId);
          throw error4;
        }
        if (!isIterable(result)) {
          return this.complete({
            request: info.request,
            requestId: info.requestId,
            response: result
          });
        }
        const existingCleanups = this.scheduledCleanups.get(info.requestId);
        if (existingCleanups != null && existingCleanups.length > 0) {
          this.resolverIteratorCleanups = existingCleanups;
          this.scheduledCleanups.delete(info.requestId);
        }
        this.resolverIterator = Symbol.iterator in result ? result[Symbol.iterator]() : result[Symbol.asyncIterator]();
      }
      this.isUsed = false;
      const { done, value } = await this.resolverIterator.next();
      const nextResponse = await value;
      if (nextResponse) {
        this.resolverIteratorResult = nextResponse.clone();
      }
      if (done) {
        this.isUsed = true;
        return this.complete({
          request: info.request,
          requestId: info.requestId,
          response: this.resolverIteratorResult?.clone()
        });
      }
      return nextResponse;
    };
  }
  createExecutionResult(args) {
    return {
      handler: this,
      request: args.request,
      requestId: args.requestId,
      response: args.response,
      parsedResult: args.parsedResult
    };
  }
  scheduleCleanup(requestId, callback) {
    if (this.resolverIterator) {
      ;
      (this.resolverIteratorCleanups ||= []).unshift(callback);
      return;
    }
    const cleanups = this.scheduledCleanups.get(requestId) || [];
    cleanups.unshift(callback);
    this.scheduledCleanups.set(requestId, cleanups);
  }
  async exhaustCleanups(cleanups) {
    const errors = [];
    for (const cleanup of cleanups) {
      try {
        await cleanup();
      } catch (error4) {
        if (error4 instanceof Error) {
          errors.push(error4);
        }
      }
    }
    if (errors.length > 0) {
      devUtils.error(
        'Failed to execute cleanup for request handler "%s"',
        this.info.header,
        new AggregateError(
          errors,
          `Failed to execute cleanup for request handler "${this.info.header}"`
        )
      );
    }
  }
  /**
   * Remove and return the cleanups scheduled for the given request
   * (or the pending iterator cleanups for generator resolvers).
   */
  takeScheduledCleanups(requestId) {
    if (this.resolverIterator && this.resolverIteratorCleanups != null && this.resolverIteratorCleanups.length > 0) {
      const cleanups2 = this.resolverIteratorCleanups;
      this.resolverIteratorCleanups = void 0;
      return cleanups2;
    }
    const cleanups = this.scheduledCleanups.get(requestId);
    if (!cleanups || cleanups.length === 0) {
      return void 0;
    }
    this.scheduledCleanups.delete(requestId);
    return cleanups;
  }
  async runScheduledCleanups(requestId) {
    const cleanups = this.takeScheduledCleanups(requestId);
    if (cleanups) {
      await this.exhaustCleanups(cleanups);
    }
  }
  /**
   * Conclude the response resolution for the given request.
   * Runs the scheduled cleanups immediately for responses without a
   * `ReadableStream` body. For streamed responses, returns an observed
   * copy of the response and defers the cleanups until its body settles
   * (is read to completion, errored, or canceled) or the request is
   * aborted, whichever comes first.
   */
  async complete(args) {
    const cleanups = this.takeScheduledCleanups(args.requestId);
    if (!cleanups) {
      return args.response;
    }
    const observedResponse = args.response ? observeResponseBodyStream(args.response) : null;
    if (!observedResponse) {
      await this.exhaustCleanups(cleanups);
      return args.response;
    }
    const listenerController = new AbortController();
    const runCleanupsOnce = () => {
      if (listenerController.signal.aborted) {
        return;
      }
      listenerController.abort();
      void this.exhaustCleanups(cleanups);
    };
    void observedResponse.settled.then(runCleanupsOnce);
    if (args.request.signal.aborted) {
      runCleanupsOnce();
    } else {
      args.request.signal.addEventListener("abort", runCleanupsOnce, {
        once: true,
        signal: listenerController.signal
      });
    }
    return observedResponse.response;
  }
};
function forwardResponseCookies(response) {
  if (typeof document === "undefined") {
    return;
  }
  const responseCookies = getRawSetCookie(response);
  if (!responseCookies) {
    return;
  }
  const allResponseCookies = Headers2.prototype.getSetCookie.call(
    new Headers([["set-cookie", responseCookies]])
  );
  for (const cookieString of allResponseCookies) {
    document.cookie = cookieString;
  }
}

// node_modules/msw/lib/core/utils/executeHandlers.mjs
var executeHandlers = async ({
  request,
  requestId,
  handlers: handlers2,
  resolutionContext
}) => {
  let matchingHandler = null;
  let result = null;
  for (const handler of handlers2) {
    result = await handler.run({ request, requestId, resolutionContext });
    if (result !== null) {
      matchingHandler = handler;
    }
    if (result?.response) {
      break;
    }
  }
  if (matchingHandler) {
    return {
      handler: matchingHandler,
      parsedResult: result?.parsedResult,
      response: result?.response
    };
  }
  return null;
};

// node_modules/tldts-core/dist/es6/src/domain.js
function shareSameDomainSuffix(hostname, vhost) {
  if (hostname.endsWith(vhost)) {
    return hostname.length === vhost.length || hostname[hostname.length - vhost.length - 1] === ".";
  }
  return false;
}
function extractDomainWithSuffix(hostname, publicSuffix) {
  const publicSuffixIndex = hostname.length - publicSuffix.length - 2;
  const lastDotBeforeSuffixIndex = hostname.lastIndexOf(".", publicSuffixIndex);
  if (lastDotBeforeSuffixIndex === -1) {
    return hostname;
  }
  return hostname.slice(lastDotBeforeSuffixIndex + 1);
}
function getDomain(suffix, hostname, options) {
  if (options.validHosts !== null) {
    const validHosts = options.validHosts;
    for (const vhost of validHosts) {
      if (
        /*@__INLINE__*/
        shareSameDomainSuffix(hostname, vhost)
      ) {
        return vhost;
      }
    }
  }
  let numberOfLeadingDots = 0;
  if (hostname.startsWith(".")) {
    while (numberOfLeadingDots < hostname.length && hostname[numberOfLeadingDots] === ".") {
      numberOfLeadingDots += 1;
    }
  }
  if (suffix.length === hostname.length - numberOfLeadingDots) {
    return null;
  }
  return (
    /*@__INLINE__*/
    extractDomainWithSuffix(hostname, suffix)
  );
}

// node_modules/tldts-core/dist/es6/src/domain-without-suffix.js
function getDomainWithoutSuffix(domain, suffix) {
  return domain.slice(0, -suffix.length - 1);
}

// node_modules/tldts-core/dist/es6/src/extract-hostname.js
var CONTROL_CHARS = /[\t\n\r]/g;
var extractedHostnameValidated = false;
function isValidHostnameChar(code) {
  return code >= 97 && code <= 122 || // a-z
  code >= 48 && code <= 57 || // 0-9
  code > 127 || // non-ASCII (accepted, not punycode-checked)
  code >= 65 && code <= 90 || // A-Z (becomes valid once lowercased)
  code === 45 || // '-'
  code === 95;
}
function getSpecialScheme(url, schemeStart, colonIndex) {
  const length = colonIndex - schemeStart;
  const c0 = url.charCodeAt(schemeStart) | 32;
  if (length === 2) {
    return c0 === 119 && (url.charCodeAt(schemeStart + 1) | 32) === 115 ? 1 : 0;
  } else if (length === 3) {
    const c1 = url.charCodeAt(schemeStart + 1) | 32;
    const c2 = url.charCodeAt(schemeStart + 2) | 32;
    if (c0 === 119 && c1 === 115 && c2 === 115)
      return 1;
    if (c0 === 102 && c1 === 116 && c2 === 112)
      return 1;
    return 0;
  } else if (length === 4) {
    const c1 = url.charCodeAt(schemeStart + 1) | 32;
    const c2 = url.charCodeAt(schemeStart + 2) | 32;
    const c3 = url.charCodeAt(schemeStart + 3) | 32;
    if (c0 === 104 && c1 === 116 && c2 === 116 && c3 === 112)
      return 1;
    if (c0 === 102 && c1 === 105 && c2 === 108 && c3 === 101)
      return 2;
    return 0;
  } else if (length === 5) {
    return c0 === 104 && (url.charCodeAt(schemeStart + 1) | 32) === 116 && (url.charCodeAt(schemeStart + 2) | 32) === 116 && (url.charCodeAt(schemeStart + 3) | 32) === 112 && (url.charCodeAt(schemeStart + 4) | 32) === 115 ? 1 : 0;
  }
  return 0;
}
function extractHostname(url, urlIsValidHostname, validate2 = false) {
  let start = 0;
  let end = url.length;
  let hasUpper = false;
  let isSpecial = false;
  extractedHostnameValidated = false;
  if (!urlIsValidHostname) {
    if (url.startsWith("data:")) {
      return null;
    }
    while (start < url.length && url.charCodeAt(start) <= 32) {
      start += 1;
    }
    while (end > start + 1 && url.charCodeAt(end - 1) <= 32) {
      end -= 1;
    }
    if (url.charCodeAt(start) === 47 && url.charCodeAt(start + 1) === 47) {
      start += 2;
    } else {
      const indexOfProtocol = url.indexOf(":/", start);
      if (indexOfProtocol !== -1) {
        const special = getSpecialScheme(url, start, indexOfProtocol);
        if (special === 1) {
          isSpecial = true;
          start = indexOfProtocol + 2;
          while (url.charCodeAt(start) === 47 || url.charCodeAt(start) === 92) {
            start += 1;
          }
        } else if (special === 2) {
          isSpecial = true;
          start = indexOfProtocol + 1;
          let slashes = 0;
          while ((url.charCodeAt(start) === 47 || url.charCodeAt(start) === 92) && slashes < 2) {
            start += 1;
            slashes += 1;
          }
          if (slashes < 2) {
            return null;
          }
        } else {
          for (let i = start; i < indexOfProtocol; i += 1) {
            const code = url.charCodeAt(i) | 32;
            if (!(code >= 97 && code <= 122 || // [a, z]
            code >= 48 && code <= 57 || // [0, 9]
            code === 46 || // '.'
            code === 45 || // '-'
            code === 43)) {
              const raw = url.charCodeAt(i);
              if (raw === 9 || raw === 10 || raw === 13) {
                return extractHostname(url.replace(CONTROL_CHARS, ""), urlIsValidHostname, validate2);
              }
              return null;
            }
          }
          if (url.charCodeAt(indexOfProtocol + 2) === 47) {
            start = indexOfProtocol + 3;
          } else {
            return null;
          }
        }
      } else if (url.charCodeAt(start) !== 91) {
        let indexOfColon = -1;
        for (let i = start; i < end; i += 1) {
          const code = url.charCodeAt(i);
          if (code === 9 || code === 10 || code === 13) {
            return extractHostname(url.replace(CONTROL_CHARS, ""), urlIsValidHostname, validate2);
          }
          if (code === 58) {
            indexOfColon = i;
            break;
          }
          if (code === 47 || code === 92 || code === 63 || code === 35) {
            break;
          }
        }
        if (indexOfColon !== -1) {
          let hasIdentifier = false;
          for (let i = indexOfColon + 1; i < end; i += 1) {
            const code = url.charCodeAt(i);
            if (code === 47 || code === 92 || code === 63 || code === 35) {
              break;
            }
            if (code === 64) {
              hasIdentifier = true;
              break;
            }
          }
          if (!hasIdentifier) {
            let allDigits = true;
            let i = indexOfColon + 1;
            for (; i < end; i += 1) {
              const code = url.charCodeAt(i);
              if (code === 47 || code === 92 || code === 63 || code === 35) {
                break;
              }
              if (code < 48 || code > 57) {
                allDigits = false;
                break;
              }
            }
            if (i === indexOfColon + 1) {
              allDigits = false;
            }
            if (!allDigits) {
              const special = getSpecialScheme(url, start, indexOfColon);
              if (special === 0) {
                let isBareIpv6 = false;
                for (let j = indexOfColon + 1; j < end; j += 1) {
                  const code = url.charCodeAt(j);
                  if (code === 47 || code === 92 || code === 63 || code === 35) {
                    break;
                  }
                  if (code === 58) {
                    isBareIpv6 = true;
                    break;
                  }
                }
                if (!isBareIpv6) {
                  return null;
                }
              } else {
                isSpecial = true;
                start = indexOfColon + 1;
                if (special === 2) {
                  let slashes = 0;
                  while ((url.charCodeAt(start) === 47 || url.charCodeAt(start) === 92) && slashes < 2) {
                    start += 1;
                    slashes += 1;
                  }
                  if (slashes < 2) {
                    return null;
                  }
                } else {
                  while (url.charCodeAt(start) === 47 || url.charCodeAt(start) === 92) {
                    start += 1;
                  }
                }
              }
            }
          }
        }
      }
    }
    let indexOfIdentifier = -1;
    let indexOfClosingBracket = -1;
    let indexOfPort = -1;
    let indexOfFirstColon = -1;
    let hasControl = false;
    let vValid = validate2;
    let vLastDot = start - 1;
    let vLastCode = -1;
    if (validate2 && start < end) {
      const c0 = url.charCodeAt(start);
      if (!/*@__INLINE__*/
      (isValidHostnameChar(c0) || c0 === 46 || c0 === 95) || c0 === 45) {
        vValid = false;
      }
    }
    for (let i = start; i < end; i += 1) {
      const code = url.charCodeAt(i);
      if (code < 64) {
        if (code === 47 || code === 35 || code === 63) {
          end = i;
          break;
        } else if (code === 58) {
          if (indexOfFirstColon === -1) {
            indexOfFirstColon = i;
          }
          indexOfPort = i;
        } else if (code === 9 || code === 10 || code === 13) {
          hasControl = true;
        } else if (validate2) {
          if (code === 46) {
            if (i - vLastDot > 64 || vLastCode === 46 || vLastCode === 45) {
              vValid = false;
            }
            vLastDot = i;
          } else if (code < 48 || code > 57) {
            if (code !== 45 || vLastCode === 46) {
              vValid = false;
            }
          }
        }
      } else if (isSpecial && code === 92) {
        end = i;
        break;
      } else if (code === 64) {
        indexOfIdentifier = i;
        indexOfFirstColon = -1;
      } else if (code === 93) {
        indexOfClosingBracket = i;
      } else if (code >= 65 && code <= 90) {
        hasUpper = true;
      } else if (validate2 && !/*@__INLINE__*/
      isValidHostnameChar(code)) {
        vValid = false;
      }
      if (validate2) {
        vLastCode = code;
      }
    }
    if (hasControl) {
      return extractHostname(url.replace(CONTROL_CHARS, ""), urlIsValidHostname, validate2);
    }
    if (indexOfIdentifier !== -1 && indexOfIdentifier >= start && indexOfIdentifier < end) {
      start = indexOfIdentifier + 1;
    }
    if (url.charCodeAt(start) === 91) {
      if (indexOfClosingBracket !== -1) {
        return url.slice(start + 1, indexOfClosingBracket).toLowerCase();
      }
      return null;
    } else if (indexOfPort !== -1 && indexOfPort > start && indexOfPort < end && // A host:port has exactly one ':' in the host (so its first ':' is its
    // last); a bare, unbracketed IPv6 literal ("2a01:e35::1") has >= 2, so
    // its first ':' precedes the last. Only the former has a ':port' to trim.
    indexOfFirstColon === indexOfPort) {
      end = indexOfPort;
    }
    if (start >= end) {
      return null;
    }
    if (validate2 && vValid && indexOfIdentifier === -1 && indexOfPort === -1 && indexOfClosingBracket === -1 && url.charCodeAt(end - 1) !== 46 && end - start <= 255 && // total length
    end - vLastDot - 1 <= 63 && // last label length
    vLastCode !== 45) {
      extractedHostnameValidated = true;
    }
  }
  while (end > start + 1 && url.charCodeAt(end - 1) === 46) {
    end -= 1;
  }
  const hostname = start !== 0 || end !== url.length ? url.slice(start, end) : url;
  if (hasUpper) {
    return hostname.toLowerCase();
  }
  return hostname;
}

// node_modules/tldts-core/dist/es6/src/is-ip.js
function isProbablyIpv4(hostname) {
  if (hostname.length < 7) {
    return false;
  }
  if (hostname.length > 15) {
    return false;
  }
  let numberOfDots = 0;
  for (let i = 0; i < hostname.length; i += 1) {
    const code = hostname.charCodeAt(i);
    if (code === 46) {
      numberOfDots += 1;
    } else if (code < 48 || code > 57) {
      return false;
    }
  }
  return numberOfDots === 3 && hostname.charCodeAt(0) !== 46 && hostname.charCodeAt(hostname.length - 1) !== 46;
}
function isProbablyIpv6(hostname) {
  if (hostname.length < 3) {
    return false;
  }
  let start = hostname.startsWith("[") ? 1 : 0;
  let end = hostname.length;
  if (hostname[end - 1] === "]") {
    end -= 1;
  }
  if (end - start > 39) {
    return false;
  }
  let hasColon = false;
  for (; start < end; start += 1) {
    const code = hostname.charCodeAt(start);
    if (code === 58) {
      hasColon = true;
    } else if (!(code >= 48 && code <= 57 || // 0-9
    code >= 97 && code <= 102 || // a-f
    code >= 65 && code <= 70)) {
      return false;
    }
  }
  return hasColon;
}
function isIp(hostname) {
  return isProbablyIpv6(hostname) || isProbablyIpv4(hostname);
}

// node_modules/tldts-core/dist/es6/src/is-special-use.js
var SPECIAL_USE_DOMAINS = [
  "test",
  // RFC 6761
  "localhost",
  // RFC 6761
  "invalid",
  // RFC 6761
  "example",
  // RFC 6761
  "example.com",
  // RFC 6761
  "example.net",
  // RFC 6761
  "example.org",
  // RFC 6761
  "local",
  // RFC 6762 (mDNS)
  "onion",
  // RFC 7686 (Tor)
  "alt",
  // RFC 9476
  "home.arpa",
  // RFC 8375
  "ipv4only.arpa",
  // RFC 8880
  "resolver.arpa",
  // RFC 9462
  "service.arpa",
  // RFC 9665
  "6tisch.arpa",
  // RFC 9031
  "eap.arpa"
  // RFC 9965
];
function isSpecialUse(hostname) {
  for (const name of SPECIAL_USE_DOMAINS) {
    if (hostname.endsWith(name) && (hostname.length === name.length || hostname.charCodeAt(hostname.length - name.length - 1) === 46)) {
      return true;
    }
  }
  return false;
}

// node_modules/tldts-core/dist/es6/src/is-valid.js
function isValidAscii(code) {
  return code >= 97 && code <= 122 || code >= 48 && code <= 57 || code > 127;
}
function is_valid_default(hostname) {
  if (hostname.length > 255) {
    return false;
  }
  if (hostname.length === 0) {
    return false;
  }
  if (
    /*@__INLINE__*/
    !isValidAscii(hostname.charCodeAt(0)) && hostname.charCodeAt(0) !== 46 && // '.' (dot)
    hostname.charCodeAt(0) !== 95
  ) {
    return false;
  }
  let lastDotIndex = -1;
  let lastCharCode = -1;
  const len = hostname.length;
  for (let i = 0; i < len; i += 1) {
    const code = hostname.charCodeAt(i);
    if (code === 46) {
      if (
        // Check that previous label is < 63 bytes long (64 = 63 + '.')
        i - lastDotIndex > 64 || // Check that previous character was not already a '.'
        lastCharCode === 46 || // Check that the previous label does not end with '-' (RFC 1035 §2.3.1 LDH).
        // '_' is intentionally NOT restricted: DNS allows any octet (RFC 2181 §11) and
        // WHATWG URL does not treat '_' as a forbidden host code point.
        lastCharCode === 45
      ) {
        return false;
      }
      lastDotIndex = i;
    } else if (
      // A forbidden character in the label...
      !/*@__INLINE__*/
      (isValidAscii(code) || code === 45 || code === 95) || // ...or a '-' starting a label (the byte right after a '.'). A label must
      // not begin with a hyphen (RFC 1034 §3.5 / RFC 1035 §2.3.1 LDH, as amended
      // by RFC 1123 §2.1; cf. UTS #46 CheckHyphens). The first label is covered by
      // the leading-character guard above; mirrors the trailing-'-' rule below.
      code === 45 && lastCharCode === 46
    ) {
      return false;
    }
    lastCharCode = code;
  }
  return (
    // Check that last label is shorter than 63 chars
    len - lastDotIndex - 1 <= 63 && // Check that the last character is an allowed trailing label character.
    // Since we already checked that the char is a valid hostname character,
    // we only need to check that it's different from '-'.
    lastCharCode !== 45
  );
}

// node_modules/tldts-core/dist/es6/src/options.js
function setDefaultsImpl({ allowIcannDomains = true, allowPrivateDomains = false, detectIp = true, detectSpecialUse = false, extractHostname: extractHostname2 = true, mixedInputs = true, validHosts = null, validateHostname = true }) {
  return {
    allowIcannDomains,
    allowPrivateDomains,
    detectIp,
    detectSpecialUse,
    extractHostname: extractHostname2,
    mixedInputs,
    validHosts,
    validateHostname
  };
}
var DEFAULT_OPTIONS = (
  /*@__INLINE__*/
  setDefaultsImpl({})
);
function setDefaults(options) {
  if (options === void 0) {
    return DEFAULT_OPTIONS;
  }
  return (
    /*@__INLINE__*/
    setDefaultsImpl(options)
  );
}

// node_modules/tldts-core/dist/es6/src/subdomain.js
function getSubdomain(hostname, domain) {
  if (domain.length === hostname.length) {
    return "";
  }
  return hostname.slice(0, -domain.length - 1);
}

// node_modules/tldts-core/dist/es6/src/factory.js
function getEmptyResult() {
  return {
    domain: null,
    domainWithoutSuffix: null,
    hostname: null,
    isIcann: null,
    isIp: null,
    isPrivate: null,
    isSpecialUse: null,
    publicSuffix: null,
    subdomain: null
  };
}
function resetResult(result) {
  result.domain = null;
  result.domainWithoutSuffix = null;
  result.hostname = null;
  result.isIcann = null;
  result.isIp = null;
  result.isPrivate = null;
  result.isSpecialUse = null;
  result.publicSuffix = null;
  result.subdomain = null;
}
function parseImpl(url, step, suffixLookup2, partialOptions, result) {
  const options = (
    /*@__INLINE__*/
    setDefaults(partialOptions)
  );
  if (typeof url !== "string") {
    return result;
  }
  let urlIsValid = false;
  if (!options.extractHostname) {
    result.hostname = url;
  } else if (options.mixedInputs) {
    urlIsValid = is_valid_default(url);
    result.hostname = extractHostname(url, urlIsValid, options.validateHostname);
  } else {
    result.hostname = extractHostname(url, false, options.validateHostname);
  }
  if (options.detectIp && result.hostname !== null) {
    result.isIp = isIp(result.hostname);
    if (result.isIp) {
      return result;
    }
  }
  if (options.validateHostname && options.extractHostname && result.hostname !== null && // Skip the re-scan when `url` was already validated and extractHostname
  // returned it unchanged (same reference => identical string, still valid).
  !(urlIsValid && result.hostname === url) && // Skip the re-scan when extractHostname already validated the host inline
  // (a confirmed-valid simple authority — see extract-hostname.ts).
  !extractedHostnameValidated && !is_valid_default(result.hostname)) {
    result.hostname = null;
    return result;
  }
  if (step === 0 || result.hostname === null) {
    return result;
  }
  if (step === 5 && options.detectSpecialUse) {
    result.isSpecialUse = isSpecialUse(result.hostname);
  }
  suffixLookup2(result.hostname, options, result);
  if (step === 2 || result.publicSuffix === null) {
    return result;
  }
  result.domain = getDomain(result.publicSuffix, result.hostname, options);
  if (step === 3 || result.domain === null) {
    return result;
  }
  result.subdomain = getSubdomain(result.hostname, result.domain);
  if (step === 4) {
    return result;
  }
  result.domainWithoutSuffix = getDomainWithoutSuffix(result.domain, result.publicSuffix);
  return result;
}

// node_modules/tldts-core/dist/es6/src/lookup/fast-path.js
function fast_path_default(hostname, options, out) {
  if (!options.allowPrivateDomains && hostname.length > 3) {
    const last = hostname.length - 1;
    const c3 = hostname.charCodeAt(last);
    const c2 = hostname.charCodeAt(last - 1);
    const c1 = hostname.charCodeAt(last - 2);
    const c0 = hostname.charCodeAt(last - 3);
    if (c3 === 109 && c2 === 111 && c1 === 99 && c0 === 46) {
      out.isIcann = true;
      out.isPrivate = false;
      out.publicSuffix = "com";
      return true;
    } else if (c3 === 103 && c2 === 114 && c1 === 111 && c0 === 46) {
      out.isIcann = true;
      out.isPrivate = false;
      out.publicSuffix = "org";
      return true;
    } else if (c3 === 117 && c2 === 100 && c1 === 101 && c0 === 46) {
      out.isIcann = true;
      out.isPrivate = false;
      out.publicSuffix = "edu";
      return true;
    } else if (c3 === 118 && c2 === 111 && c1 === 103 && c0 === 46) {
      out.isIcann = true;
      out.isPrivate = false;
      out.publicSuffix = "gov";
      return true;
    } else if (c3 === 116 && c2 === 101 && c1 === 110 && c0 === 46) {
      out.isIcann = true;
      out.isPrivate = false;
      out.publicSuffix = "net";
      return true;
    } else if (c3 === 101 && c2 === 100 && c1 === 46) {
      out.isIcann = true;
      out.isPrivate = false;
      out.publicSuffix = "de";
      return true;
    }
  }
  return false;
}

// node_modules/tldts/dist/es6/src/data/trie.js
var nodeFlags = /* @__PURE__ */ new Uint8Array([1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 2, 2, 0, 2, 2, 0, 2, 0, 0, 1, 0, 0, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 2, 2, 0, 0, 0, 2, 0, 1, 1, 0, 2, 0, 2, 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 2, 2, 0, 2, 2, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 2, 0, 2, 2, 2, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 2, 2, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
var edgeStart = /* @__PURE__ */ new Uint16Array([0, 0, 0, 10, 11, 18, 106, 111, 117, 124, 130, 136, 145, 146, 147, 148, 149, 150, 151, 153, 154, 155, 157, 159, 226, 239, 241, 242, 243, 258, 265, 266, 269, 270, 271, 274, 276, 295, 296, 298, 307, 312, 313, 331, 332, 335, 337, 338, 340, 374, 375, 377, 380, 381, 385, 387, 391, 394, 426, 429, 442, 443, 451, 452, 454, 464, 478, 479, 480, 489, 490, 527, 532, 548, 568, 574, 615, 616, 643, 670, 671, 819, 825, 828, 829, 830, 835, 840, 849, 871, 872, 873, 874, 875, 876, 877, 895, 897, 898, 901, 903, 904, 906, 908, 923, 938, 943, 944, 946, 947, 948, 949, 950, 952, 955, 960, 961, 962, 964, 965, 968, 971, 972, 973, 986, 988, 1e3, 1011, 1019, 1021, 1061, 1064, 1068, 1069, 1071, 1074, 1085, 1087, 1097, 1099, 1105, 1107, 1108, 1110, 1113, 1114, 1115, 1167, 1169, 1171, 1191, 1192, 1193, 1194, 1196, 1207, 1238, 1249, 1261, 1270, 1277, 1282, 1295, 1306, 1319, 1320, 1331, 1365, 1366, 1367, 1382, 1397, 1469, 1470, 1472, 1473, 1507, 1508, 1509, 1512, 1516, 1518, 1547, 1548, 1556, 1557, 1558, 1560, 1562, 1563, 1565, 1566, 1567, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1588, 1589, 1590, 1591, 1592, 1594, 1595, 1596, 1598, 2053, 2056, 2057, 2059, 2066, 2073, 2083, 2087, 2098, 2099, 2100, 2112, 2113, 2115, 2117, 2118, 2125, 2126, 2128, 2129, 2131, 2132, 2133, 2134, 2135, 2207, 2209, 2230, 2231, 2232, 2234, 2260, 2261, 2312, 2313, 2315, 2322, 2328, 2338, 2348, 2401, 2402, 2403, 2413, 2427, 2428, 2431, 2438, 2439, 2447, 2448, 2449, 2450, 2451, 2462, 2463, 2464, 2466, 2467, 2468, 2469, 2471, 2481, 2493, 2499, 2531, 2535, 2537, 2538, 2540, 2541, 2548, 2549, 2551, 2559, 2566, 2572, 2577, 2578, 2584, 2587, 2593, 2600, 2601, 2608, 2616, 2617, 2618, 2656, 2662, 2677, 2678, 2683, 2701, 2732, 2750, 2752, 2755, 2763, 2765, 2772, 2820, 2844, 2845, 2846, 2847, 2848, 2849, 2850, 2851, 2858, 2859, 2860, 2861, 2862, 2863, 2865, 2866, 2870, 2954, 2967, 2968, 3404, 3408, 3422, 3474, 3502, 3524, 3582, 3604, 3619, 3682, 3733, 3771, 3807, 3832, 3974, 4020, 4071, 4090, 4124, 4139, 4159, 4189, 4220, 4243, 4274, 4304, 4336, 4363, 4438, 4460, 4498, 4508, 4542, 4561, 4587, 4629, 4679, 4705, 4774, 4775, 4777, 4800, 4823, 4859, 4890, 4907, 4964, 4977, 5001, 5030, 5032, 5066, 5082, 5110, 5415, 5424, 5433, 5440, 5457, 5461, 5467, 5506, 5508, 5515, 5522, 5531, 5538, 5539, 5550, 5553, 5568, 5569, 5578, 5579, 5588, 5597, 5603, 5605, 5606, 5607, 5643, 5644, 5646, 5654, 5661, 5674, 5678, 5680, 5681, 5687, 5694, 5708, 5718, 5723, 5731, 5739, 5745, 5746, 5750, 5752, 5753, 5765, 5766, 5767, 5768, 5770, 5771, 5774, 5776, 5779, 5783, 5784, 5790, 5791, 5792, 5794, 5796, 5798, 5799, 5800, 5803, 5805, 5808, 5809, 5811, 6008, 6015, 6016, 6026, 6031, 6048, 6062, 6071, 6072, 6073, 6077, 6078, 6080, 6082, 6088, 6089, 6092, 6093, 6095, 6096, 6097, 6988, 6989, 6993, 7011, 7020, 7023, 7030, 7031, 7033, 7034, 7035, 7037, 7089, 7090, 7093, 7094, 7211, 7212, 7223, 7234, 7241, 7244, 7253, 7254, 7255, 7270, 7325, 7516, 7518, 7519, 7521, 7526, 7539, 7554, 7561, 7570, 7573, 7576, 7583, 7591, 7595, 7596, 7597, 7611, 7615, 7624, 7625, 7626, 7630, 7665, 7666, 7683, 7690, 7698, 7699, 7703, 7711, 7755, 7756, 7762, 7765, 7776, 7781, 7782, 7785, 7818, 7819, 7825, 7832, 7833, 7842, 7851, 7866, 7870, 7922, 7923, 7928, 7930, 7933, 7935, 7936, 7937, 7946, 7961, 7969, 7983, 7995, 7996, 7998, 8e3, 8022, 8033, 8039, 8040, 8052, 8064, 8151, 8163, 8165, 8174, 8177, 8183, 8208, 8211, 8212, 8213, 8215, 8218, 8221, 8232, 8234, 8236, 8264, 8338, 8345, 8349, 8350, 8359, 8381, 8382, 8387, 8388, 8467, 8469, 8471, 8480, 8484, 8490, 8496, 8502, 8512, 8517, 8518, 8536, 8547, 8552, 8557, 8567, 8573, 8577, 8583, 8589, 10197, 10198, 10199, 10206, 10208]);
var edgeLength = /* @__PURE__ */ new Uint8Array([3, 3, 3, 3, 3, 3, 3, 3, 5, 8, 8, 2, 2, 3, 3, 3, 3, 3, 8, 5, 5, 5, 5, 5, 3, 3, 5, 5, 9, 12, 19, 8, 19, 8, 11, 9, 9, 8, 7, 7, 6, 8, 9, 16, 10, 7, 7, 11, 8, 6, 6, 9, 7, 11, 7, 14, 4, 4, 4, 4, 4, 4, 10, 7, 6, 6, 6, 6, 10, 10, 6, 10, 10, 22, 11, 9, 10, 10, 10, 9, 10, 8, 7, 7, 7, 8, 21, 13, 11, 11, 9, 10, 9, 13, 10, 8, 8, 9, 12, 9, 7, 10, 7, 7, 13, 7, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 8, 6, 3, 3, 3, 3, 3, 3, 2, 5, 3, 3, 3, 7, 2, 2, 2, 2, 2, 2, 3, 3, 3, 1, 1, 7, 8, 5, 2, 2, 7, 2, 2, 1, 4, 1, 11, 9, 9, 5, 5, 8, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 5, 11, 9, 9, 13, 7, 14, 7, 6, 6, 6, 7, 6, 6, 6, 6, 6, 10, 7, 11, 9, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 8, 7, 10, 9, 9, 9, 8, 9, 8, 10, 6, 9, 9, 8, 10, 10, 7, 8, 1, 9, 10, 12, 12, 12, 10, 9, 9, 10, 10, 9, 9, 1, 1, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 6, 6, 4, 3, 3, 3, 7, 4, 4, 4, 3, 3, 6, 7, 3, 4, 1, 2, 2, 2, 6, 1, 2, 2, 2, 2, 2, 12, 5, 3, 8, 9, 13, 4, 4, 13, 9, 9, 11, 7, 3, 12, 9, 2, 2, 2, 3, 3, 3, 3, 3, 8, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 3, 7, 10, 15, 7, 15, 15, 20, 15, 9, 10, 10, 12, 14, 14, 14, 12, 12, 12, 12, 12, 14, 14, 10, 10, 10, 10, 14, 9, 9, 9, 10, 14, 14, 14, 13, 13, 9, 9, 9, 9, 9, 9, 7, 8, 6, 8, 8, 6, 8, 13, 8, 8, 6, 13, 8, 11, 13, 8, 6, 13, 8, 6, 9, 10, 10, 12, 14, 14, 14, 12, 12, 12, 12, 14, 14, 10, 10, 10, 10, 9, 9, 9, 10, 14, 14, 11, 13, 13, 9, 9, 9, 9, 9, 9, 2, 6, 9, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 2, 3, 3, 3, 3, 3, 3, 7, 7, 2, 3, 2, 2, 5, 3, 3, 3, 3, 3, 3, 4, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 5, 7, 2, 2, 12, 8, 10, 8, 10, 7, 18, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 2, 2, 3, 3, 3, 5, 5, 3, 8, 8, 6, 8, 6, 6, 4, 6, 7, 7, 7, 10, 11, 2, 5, 5, 3, 3, 3, 3, 3, 3, 5, 5, 6, 11, 10, 7, 7, 7, 4, 4, 4, 2, 3, 3, 3, 3, 3, 2, 7, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 7, 7, 7, 11, 7, 6, 9, 6, 6, 8, 10, 8, 6, 8, 13, 4, 4, 4, 4, 4, 10, 8, 11, 8, 8, 8, 10, 10, 7, 10, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 7, 10, 13, 7, 8, 7, 11, 8, 8, 6, 9, 8, 8, 6, 6, 6, 8, 8, 6, 6, 6, 6, 6, 9, 7, 6, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 9, 7, 8, 10, 8, 8, 2, 3, 3, 3, 3, 3, 2, 8, 9, 9, 2, 2, 2, 3, 3, 3, 2, 3, 3, 3, 9, 2, 2, 3, 3, 3, 3, 3, 3, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 12, 5, 5, 3, 5, 4, 2, 3, 2, 4, 3, 9, 2, 2, 2, 2, 2, 5, 5, 3, 8, 8, 13, 6, 10, 9, 4, 7, 9, 11, 2, 3, 7, 3, 3, 4, 1, 3, 4, 2, 9, 3, 3, 12, 5, 3, 7, 10, 10, 7, 4, 4, 6, 14, 7, 9, 7, 13, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 8, 15, 4, 4, 2, 3, 3, 3, 7, 4, 9, 9, 2, 3, 3, 3, 5, 3, 2, 2, 7, 2, 7, 6, 6, 7, 2, 4, 2, 2, 2, 2, 2, 2, 8, 8, 8, 9, 5, 2, 3, 3, 3, 3, 3, 3, 10, 7, 4, 4, 4, 4, 3, 4, 2, 3, 3, 3, 3, 3, 10, 7, 4, 4, 4, 4, 2, 3, 3, 3, 3, 10, 7, 4, 4, 4, 4, 3, 9, 6, 6, 6, 9, 13, 9, 2, 2, 2, 8, 7, 9, 5, 3, 3, 3, 5, 5, 12, 9, 10, 7, 8, 7, 6, 8, 6, 11, 12, 7, 9, 10, 4, 4, 7, 8, 11, 6, 7, 9, 8, 7, 10, 8, 9, 15, 7, 8, 5, 4, 7, 2, 3, 3, 3, 2, 14, 10, 2, 14, 10, 2, 14, 3, 9, 13, 13, 10, 14, 16, 17, 11, 2, 14, 2, 14, 3, 9, 13, 10, 14, 16, 17, 11, 14, 10, 14, 2, 7, 3, 10, 7, 14, 10, 2, 14, 10, 9, 9, 17, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 10, 10, 10, 12, 9, 4, 10, 11, 8, 8, 8, 7, 9, 5, 3, 3, 3, 3, 3, 3, 3, 3, 5, 8, 4, 4, 4, 4, 4, 4, 6, 16, 3, 3, 14, 3, 14, 2, 14, 9, 13, 10, 10, 14, 16, 17, 11, 6, 9, 10, 10, 12, 14, 14, 14, 12, 12, 12, 12, 14, 14, 10, 10, 10, 10, 14, 9, 9, 9, 10, 14, 14, 14, 9, 9, 9, 9, 9, 9, 2, 14, 9, 13, 10, 10, 14, 16, 17, 11, 6, 2, 14, 9, 17, 13, 10, 10, 14, 16, 17, 11, 6, 2, 14, 9, 13, 10, 14, 16, 17, 11, 2, 14, 9, 13, 10, 16, 11, 2, 14, 10, 19, 7, 2, 14, 9, 13, 10, 19, 10, 7, 14, 16, 17, 11, 6, 2, 14, 9, 13, 10, 19, 7, 14, 16, 17, 11, 2, 14, 9, 13, 17, 13, 10, 10, 14, 16, 17, 11, 6, 3, 2, 14, 9, 13, 10, 10, 14, 16, 17, 11, 6, 9, 10, 12, 14, 14, 14, 12, 12, 12, 12, 12, 14, 14, 14, 10, 10, 10, 14, 9, 9, 9, 9, 14, 14, 14, 13, 13, 14, 9, 9, 9, 9, 9, 9, 4, 11, 2, 14, 9, 13, 17, 13, 10, 19, 10, 7, 14, 16, 17, 11, 6, 2, 14, 9, 13, 17, 13, 10, 19, 10, 7, 14, 16, 17, 11, 6, 2, 9, 10, 10, 7, 17, 3, 3, 12, 12, 16, 15, 15, 12, 14, 14, 14, 20, 20, 13, 12, 12, 12, 12, 12, 12, 20, 25, 14, 14, 12, 12, 10, 10, 10, 10, 9, 9, 9, 25, 4, 9, 17, 10, 7, 14, 16, 21, 13, 13, 14, 20, 14, 13, 17, 24, 9, 12, 13, 25, 13, 21, 20, 17, 9, 9, 9, 9, 9, 9, 12, 17, 4, 4, 9, 9, 9, 10, 10, 12, 14, 14, 14, 12, 12, 12, 12, 12, 14, 14, 10, 10, 10, 10, 14, 9, 9, 9, 10, 14, 14, 14, 13, 13, 9, 9, 9, 9, 9, 9, 1, 8, 7, 11, 11, 1, 3, 3, 3, 4, 8, 9, 10, 14, 14, 12, 12, 12, 12, 14, 14, 10, 10, 10, 10, 14, 9, 9, 9, 10, 14, 14, 14, 13, 13, 9, 9, 9, 9, 9, 7, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 12, 6, 14, 4, 12, 7, 2, 2, 1, 2, 7, 6, 4, 4, 4, 6, 8, 8, 7, 4, 5, 6, 3, 3, 3, 3, 4, 16, 8, 3, 5, 4, 3, 3, 3, 5, 2, 2, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 11, 12, 7, 7, 13, 9, 10, 12, 8, 9, 7, 8, 5, 12, 10, 13, 14, 5, 5, 5, 13, 5, 5, 5, 3, 3, 3, 5, 16, 5, 5, 5, 5, 5, 7, 12, 14, 8, 12, 8, 10, 12, 9, 11, 7, 9, 7, 10, 7, 13, 9, 7, 12, 8, 17, 7, 7, 16, 10, 13, 13, 8, 10, 10, 14, 17, 7, 16, 16, 15, 8, 10, 10, 12, 17, 7, 17, 14, 7, 10, 17, 8, 7, 7, 7, 8, 15, 15, 7, 14, 10, 10, 10, 11, 11, 7, 7, 13, 8, 10, 7, 16, 7, 8, 7, 14, 17, 12, 10, 11, 21, 8, 9, 7, 13, 9, 8, 13, 6, 12, 7, 6, 13, 10, 10, 10, 8, 18, 9, 17, 13, 10, 12, 6, 13, 6, 11, 8, 13, 10, 13, 18, 13, 11, 13, 8, 16, 7, 10, 8, 16, 12, 10, 8, 8, 6, 14, 11, 8, 15, 8, 8, 7, 7, 12, 7, 8, 9, 14, 15, 8, 9, 10, 9, 15, 7, 8, 8, 12, 13, 9, 10, 15, 15, 13, 7, 10, 10, 20, 7, 6, 9, 6, 6, 14, 11, 14, 11, 12, 9, 10, 16, 16, 12, 7, 11, 28, 8, 11, 10, 7, 21, 8, 7, 9, 4, 4, 4, 17, 7, 8, 6, 9, 6, 6, 13, 6, 6, 6, 6, 18, 20, 14, 8, 11, 12, 9, 10, 13, 15, 19, 8, 9, 12, 7, 10, 16, 12, 9, 9, 9, 14, 12, 11, 9, 12, 11, 18, 9, 9, 9, 10, 7, 7, 16, 8, 9, 7, 13, 12, 10, 18, 7, 8, 11, 7, 7, 8, 8, 13, 7, 7, 7, 11, 15, 13, 11, 7, 8, 15, 11, 7, 8, 18, 14, 13, 18, 15, 10, 12, 12, 9, 7, 11, 11, 8, 7, 10, 8, 14, 12, 10, 18, 7, 10, 9, 7, 8, 13, 10, 14, 9, 10, 8, 8, 23, 7, 7, 11, 12, 12, 17, 7, 7, 11, 11, 17, 16, 16, 7, 8, 11, 14, 14, 8, 10, 7, 7, 16, 16, 13, 9, 11, 9, 15, 15, 11, 11, 7, 7, 14, 7, 9, 7, 7, 16, 10, 13, 10, 11, 14, 7, 11, 10, 11, 7, 11, 10, 11, 15, 11, 15, 10, 12, 17, 10, 14, 13, 11, 11, 12, 13, 10, 7, 13, 10, 16, 12, 21, 9, 10, 10, 7, 11, 14, 17, 7, 7, 8, 11, 12, 8, 15, 14, 14, 8, 17, 12, 10, 10, 7, 9, 11, 7, 10, 7, 11, 18, 7, 11, 7, 12, 11, 8, 8, 14, 12, 7, 8, 15, 3, 7, 7, 5, 2, 9, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 5, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 5, 11, 6, 4, 7, 10, 7, 7, 11, 1, 10, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 5, 7, 3, 5, 6, 3, 3, 5, 2, 2, 5, 3, 4, 13, 11, 3, 3, 6, 3, 5, 14, 2, 2, 3, 8, 2, 2, 12, 18, 5, 3, 3, 3, 16, 5, 5, 5, 10, 7, 13, 12, 13, 9, 12, 14, 19, 9, 9, 21, 9, 9, 10, 6, 9, 6, 15, 10, 6, 12, 8, 6, 10, 15, 4, 4, 6, 6, 9, 9, 12, 16, 14, 23, 7, 7, 7, 14, 9, 7, 7, 11, 14, 10, 7, 10, 10, 10, 12, 11, 10, 13, 11, 15, 11, 7, 12, 10, 3, 7, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 4, 3, 7, 2, 5, 5, 3, 3, 5, 5, 5, 5, 7, 6, 6, 6, 4, 4, 4, 4, 4, 4, 6, 6, 6, 6, 6, 7, 10, 2, 2, 2, 5, 5, 5, 5, 3, 3, 3, 3, 3, 5, 5, 10, 9, 11, 8, 7, 12, 8, 9, 7, 6, 13, 11, 6, 13, 7, 9, 9, 4, 4, 4, 4, 4, 4, 6, 10, 7, 8, 13, 8, 8, 9, 14, 8, 10, 7, 7, 7, 9, 6, 9, 7, 2, 12, 5, 3, 3, 13, 4, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 2, 5, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 1, 7, 6, 4, 12, 3, 3, 3, 3, 3, 8, 7, 3, 3, 3, 3, 3, 3, 4, 4, 11, 14, 2, 8, 3, 5, 5, 8, 10, 8, 6, 4, 7, 17, 7, 4, 5, 2, 6, 3, 5, 2, 4, 4, 2, 12, 5, 5, 3, 15, 13, 10, 8, 11, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 5, 3, 3, 3, 3, 4, 18, 2, 12, 5, 3, 3, 3, 3, 3, 5, 16, 8, 8, 9, 6, 6, 4, 4, 4, 4, 31, 6, 6, 10, 11, 21, 10, 9, 7, 10, 7, 7, 2, 4, 4, 4, 4, 6, 5, 3, 3, 4, 3, 3, 3, 3, 3, 3, 6, 6, 2, 2, 2, 5, 3, 3, 3, 7, 7, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 8, 2, 3, 3, 3, 3, 3, 5, 9, 11, 3, 3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 5, 10, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 11, 10, 10, 10, 10, 10, 11, 10, 11, 10, 11, 10, 9, 9, 11, 3, 3, 3, 3, 3, 3, 5, 3, 7, 8, 8, 7, 6, 6, 11, 4, 4, 4, 7, 8, 9, 9, 2, 3, 7, 4, 4, 2, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 2, 2, 5, 5, 5, 5, 5, 3, 3, 5, 5, 5, 7, 7, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 8, 8, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 6, 9, 12, 3, 7, 10, 7, 2, 2, 3, 3, 3, 3, 3, 4, 3, 3, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 8, 8, 6, 8, 7, 4, 4, 4, 4, 4, 6, 7, 5, 5, 20, 19, 8, 10, 9, 7, 10, 6, 8, 11, 6, 6, 6, 6, 13, 12, 8, 6, 7, 14, 11, 9, 2, 5, 3, 3, 6, 2, 3, 2, 2, 2, 2, 2, 2, 2, 5, 4, 3, 7, 6, 4, 7, 4, 3, 6, 4, 7, 2, 7, 7, 7, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 9, 10, 10, 8, 11, 7, 8, 20, 7, 8, 9, 8, 12, 6, 6, 6, 8, 9, 8, 12, 6, 6, 8, 13, 10, 12, 6, 6, 7, 7, 8, 9, 6, 4, 4, 4, 4, 4, 4, 4, 10, 6, 6, 6, 7, 14, 11, 10, 7, 8, 10, 8, 11, 14, 11, 11, 9, 7, 9, 8, 11, 9, 17, 10, 9, 2, 2, 2, 9, 3, 3, 3, 3, 15, 14, 9, 5, 5, 2, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 15, 12, 22, 19, 17, 18, 18, 19, 21, 7, 16, 16, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 7, 16, 11, 11, 7, 7, 7, 7, 17, 7, 8, 12, 15, 9, 19, 7, 19, 8, 16, 21, 11, 12, 19, 14, 22, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 16, 16, 19, 24, 12, 7, 14, 7, 12, 7, 8, 10, 10, 13, 7, 12, 12, 7, 7, 10, 18, 15, 12, 16, 7, 14, 12, 17, 10, 16, 17, 12, 17, 25, 7, 7, 7, 13, 6, 9, 6, 9, 18, 6, 6, 11, 20, 10, 6, 6, 6, 6, 6, 6, 6, 17, 6, 6, 6, 15, 6, 6, 6, 6, 6, 8, 14, 11, 12, 15, 13, 19, 17, 21, 7, 18, 8, 13, 13, 8, 12, 8, 6, 6, 13, 6, 15, 15, 16, 6, 6, 16, 6, 6, 6, 14, 6, 18, 6, 6, 6, 17, 18, 9, 13, 15, 8, 19, 8, 15, 15, 18, 14, 16, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 11, 10, 11, 6, 21, 23, 12, 17, 12, 11, 14, 13, 22, 15, 15, 11, 12, 14, 12, 7, 12, 8, 14, 12, 18, 10, 8, 16, 19, 17, 12, 14, 15, 8, 9, 19, 17, 12, 13, 13, 15, 18, 13, 23, 24, 23, 21, 17, 24, 8, 21, 8, 14, 14, 16, 14, 8, 8, 15, 20, 8, 19, 21, 9, 8, 13, 12, 13, 15, 11, 8, 11, 9, 9, 8, 11, 8, 21, 14, 21, 15, 15, 13, 7, 19, 7, 7, 7, 7, 7, 7, 16, 12, 17, 18, 7, 7, 11, 11, 7, 9, 9, 2, 2, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 10, 10, 7, 9, 7, 7, 7, 6, 8, 6, 6, 6, 6, 6, 6, 6, 7, 6, 8, 6, 6, 9, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4, 4, 8, 9, 8, 7, 8, 7, 8, 10, 7, 5, 5, 5, 5, 5, 5, 3, 9, 7, 7, 8, 6, 6, 6, 6, 6, 6, 6, 6, 9, 6, 6, 9, 11, 13, 7, 8, 9, 9, 5, 5, 5, 7, 8, 6, 6, 6, 6, 6, 6, 6, 7, 8, 9, 7, 10, 9, 10, 7, 8, 5, 5, 5, 5, 5, 5, 7, 7, 9, 8, 7, 7, 6, 6, 6, 6, 6, 6, 10, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 10, 4, 4, 4, 4, 8, 7, 7, 10, 10, 9, 8, 8, 15, 9, 8, 8, 8, 8, 8, 9, 10, 9, 10, 7, 8, 13, 5, 5, 5, 5, 5, 3, 3, 7, 7, 8, 6, 6, 6, 4, 4, 11, 9, 7, 8, 9, 10, 7, 5, 5, 5, 5, 5, 3, 3, 7, 6, 6, 13, 7, 9, 8, 7, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 7, 8, 7, 8, 13, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 6, 6, 6, 6, 7, 6, 7, 6, 6, 9, 7, 4, 4, 4, 4, 4, 4, 4, 7, 8, 7, 8, 9, 8, 8, 8, 7, 10, 7, 8, 5, 5, 5, 5, 5, 5, 5, 5, 3, 7, 7, 7, 7, 9, 7, 10, 9, 6, 6, 6, 6, 6, 8, 8, 6, 6, 6, 7, 6, 6, 6, 9, 9, 4, 4, 13, 7, 10, 9, 9, 12, 7, 8, 8, 10, 8, 8, 8, 8, 8, 8, 5, 5, 5, 5, 3, 7, 7, 11, 7, 9, 8, 8, 6, 6, 10, 6, 8, 8, 8, 6, 7, 6, 6, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 8, 8, 16, 8, 9, 8, 7, 5, 5, 5, 5, 5, 3, 3, 7, 7, 7, 10, 15, 8, 9, 8, 9, 9, 6, 6, 6, 6, 6, 6, 7, 4, 8, 7, 8, 8, 7, 8, 11, 8, 5, 5, 5, 5, 5, 3, 7, 7, 6, 11, 16, 7, 6, 4, 4, 4, 4, 9, 9, 8, 8, 8, 13, 12, 8, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 11, 7, 8, 8, 9, 13, 7, 7, 7, 9, 8, 8, 9, 12, 7, 12, 7, 12, 8, 7, 10, 12, 9, 9, 6, 6, 8, 8, 6, 6, 6, 6, 6, 6, 6, 9, 8, 9, 11, 8, 6, 6, 6, 6, 6, 12, 7, 6, 6, 6, 9, 7, 7, 6, 6, 6, 6, 6, 11, 9, 6, 6, 6, 6, 6, 7, 9, 4, 4, 4, 4, 4, 4, 4, 4, 9, 9, 9, 9, 7, 7, 7, 7, 7, 11, 7, 7, 8, 8, 8, 8, 8, 8, 9, 8, 9, 9, 7, 7, 11, 11, 7, 12, 8, 8, 8, 8, 8, 7, 8, 8, 8, 8, 8, 13, 12, 8, 8, 8, 8, 7, 7, 7, 9, 5, 5, 5, 5, 5, 5, 5, 3, 3, 7, 7, 11, 7, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 10, 11, 6, 7, 9, 4, 4, 4, 4, 4, 4, 9, 9, 8, 9, 8, 8, 8, 7, 7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 11, 7, 7, 7, 9, 6, 6, 11, 8, 10, 6, 6, 6, 12, 8, 8, 7, 6, 6, 8, 7, 4, 4, 4, 4, 4, 4, 4, 4, 9, 10, 9, 9, 8, 10, 9, 11, 8, 5, 5, 5, 7, 6, 6, 8, 7, 4, 4, 4, 4, 8, 7, 7, 8, 7, 8, 8, 5, 5, 5, 5, 7, 7, 8, 8, 8, 6, 6, 6, 6, 6, 10, 8, 9, 13, 6, 7, 6, 6, 8, 7, 8, 4, 4, 4, 4, 11, 8, 8, 8, 10, 5, 5, 8, 7, 8, 13, 8, 7, 6, 8, 6, 9, 7, 8, 7, 5, 5, 5, 5, 5, 5, 3, 3, 7, 8, 9, 6, 4, 8, 10, 10, 8, 12, 9, 13, 2, 7, 5, 5, 5, 5, 5, 7, 7, 10, 6, 6, 6, 6, 6, 6, 6, 8, 4, 4, 9, 8, 8, 8, 14, 8, 8, 8, 9, 8, 5, 5, 5, 5, 5, 3, 3, 9, 6, 6, 6, 6, 10, 12, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 11, 8, 7, 8, 8, 8, 5, 5, 3, 3, 3, 3, 7, 7, 6, 8, 6, 8, 11, 7, 6, 6, 6, 7, 4, 8, 11, 9, 10, 5, 5, 5, 3, 3, 3, 7, 7, 8, 9, 8, 15, 9, 6, 6, 6, 6, 6, 6, 11, 11, 4, 4, 4, 4, 4, 7, 9, 9, 10, 8, 7, 5, 5, 5, 5, 5, 5, 3, 3, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 7, 4, 4, 4, 4, 4, 9, 9, 8, 8, 10, 13, 5, 5, 5, 3, 17, 7, 7, 7, 7, 7, 8, 6, 8, 13, 6, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 9, 10, 8, 8, 8, 5, 5, 5, 5, 3, 7, 7, 7, 8, 8, 6, 6, 6, 8, 8, 8, 9, 10, 8, 4, 8, 10, 9, 8, 8, 8, 9, 13, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 7, 8, 9, 9, 7, 7, 7, 10, 9, 9, 8, 9, 8, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 12, 6, 6, 6, 6, 6, 6, 6, 6, 6, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 11, 8, 8, 9, 9, 10, 8, 9, 7, 7, 5, 5, 5, 5, 5, 5, 3, 7, 8, 7, 6, 6, 8, 6, 6, 10, 4, 7, 8, 9, 12, 8, 7, 7, 5, 5, 5, 5, 5, 5, 3, 3, 7, 14, 7, 9, 8, 8, 6, 6, 8, 12, 12, 6, 6, 7, 7, 10, 4, 4, 4, 4, 4, 9, 9, 14, 9, 13, 8, 7, 5, 5, 5, 6, 6, 6, 7, 4, 8, 7, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 7, 7, 7, 8, 6, 6, 6, 6, 6, 6, 12, 6, 6, 6, 6, 4, 4, 9, 9, 8, 8, 11, 7, 7, 7, 5, 5, 5, 3, 9, 8, 6, 6, 7, 4, 4, 4, 4, 4, 4, 8, 8, 11, 5, 5, 5, 7, 7, 7, 9, 6, 6, 6, 6, 6, 6, 9, 8, 4, 4, 4, 4, 7, 12, 9, 8, 8, 8, 7, 10, 10, 5, 5, 5, 5, 5, 5, 5, 3, 11, 14, 8, 7, 8, 8, 6, 6, 6, 6, 6, 8, 7, 6, 6, 6, 7, 6, 8, 9, 4, 4, 4, 7, 8, 9, 7, 9, 7, 7, 9, 8, 5, 5, 5, 5, 5, 5, 5, 5, 5, 11, 3, 9, 7, 7, 12, 14, 8, 6, 6, 12, 11, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 15, 7, 4, 4, 4, 16, 9, 9, 9, 8, 9, 9, 9, 9, 9, 8, 8, 8, 13, 11, 8, 5, 5, 5, 5, 3, 7, 6, 6, 8, 8, 8, 6, 6, 7, 10, 7, 4, 4, 4, 4, 9, 7, 8, 7, 7, 7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 7, 7, 7, 9, 6, 6, 6, 6, 6, 8, 8, 7, 7, 9, 6, 6, 6, 7, 6, 6, 6, 6, 6, 15, 4, 4, 4, 4, 4, 8, 8, 7, 8, 12, 9, 8, 8, 8, 8, 8, 9, 8, 8, 10, 8, 8, 8, 8, 16, 9, 10, 2, 5, 5, 5, 5, 5, 5, 5, 9, 7, 6, 8, 9, 4, 4, 4, 4, 4, 7, 8, 8, 8, 9, 8, 11, 10, 5, 5, 5, 5, 3, 7, 8, 6, 6, 6, 6, 6, 8, 6, 6, 6, 6, 4, 12, 10, 12, 7, 7, 7, 7, 7, 7, 7, 5, 5, 5, 5, 3, 3, 7, 7, 10, 8, 9, 7, 6, 10, 7, 6, 6, 4, 4, 8, 9, 7, 9, 9, 9, 9, 8, 8, 8, 8, 10, 5, 5, 5, 5, 5, 5, 8, 7, 6, 6, 6, 10, 6, 7, 10, 7, 4, 4, 4, 4, 4, 4, 4, 12, 9, 10, 7, 7, 10, 8, 10, 5, 12, 9, 6, 6, 6, 6, 6, 7, 6, 4, 4, 4, 10, 9, 9, 8, 7, 7, 5, 5, 5, 5, 5, 5, 3, 3, 13, 7, 7, 9, 7, 7, 7, 8, 9, 9, 7, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 13, 9, 15, 15, 4, 4, 4, 4, 4, 10, 10, 9, 8, 9, 8, 8, 9, 7, 8, 7, 8, 5, 5, 7, 6, 6, 6, 4, 4, 4, 7, 8, 11, 8, 5, 5, 5, 5, 5, 5, 5, 7, 6, 6, 6, 6, 6, 6, 9, 11, 10, 7, 4, 4, 4, 9, 8, 8, 5, 5, 5, 5, 5, 9, 9, 6, 6, 6, 6, 6, 6, 6, 9, 9, 4, 4, 4, 4, 8, 8, 8, 9, 9, 8, 8, 8, 13, 2, 4, 2, 7, 5, 5, 5, 5, 5, 5, 9, 9, 6, 6, 6, 6, 10, 8, 8, 8, 6, 6, 6, 4, 4, 9, 8, 10, 8, 9, 8, 8, 8, 9, 8, 8, 5, 3, 3, 3, 11, 6, 6, 6, 7, 6, 6, 6, 4, 4, 9, 8, 5, 5, 5, 5, 5, 3, 11, 8, 6, 6, 6, 6, 6, 9, 7, 4, 4, 14, 10, 9, 8, 12, 8, 8, 8, 11, 15, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 11, 11, 11, 10, 10, 7, 7, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 7, 11, 7, 7, 11, 11, 7, 8, 9, 10, 7, 7, 9, 9, 9, 9, 7, 7, 10, 8, 13, 8, 8, 8, 8, 11, 10, 6, 6, 8, 10, 11, 14, 14, 6, 6, 6, 6, 6, 6, 9, 11, 7, 7, 6, 8, 12, 11, 11, 6, 6, 10, 6, 6, 6, 6, 6, 10, 7, 7, 6, 6, 11, 6, 6, 6, 11, 8, 9, 7, 6, 10, 11, 9, 10, 11, 7, 11, 8, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 6, 6, 8, 9, 10, 9, 6, 6, 6, 10, 6, 6, 6, 6, 11, 10, 11, 10, 9, 8, 7, 7, 7, 7, 11, 14, 8, 10, 9, 9, 8, 8, 7, 11, 8, 8, 8, 11, 11, 10, 10, 9, 10, 8, 11, 10, 8, 11, 9, 12, 8, 10, 8, 11, 8, 9, 9, 11, 11, 10, 11, 13, 8, 7, 8, 8, 9, 7, 8, 8, 8, 8, 7, 8, 2, 2, 2, 2, 2, 2, 2, 4, 4, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 3, 3, 3, 3, 3, 3, 3, 3, 8, 6, 4, 4, 4, 11, 7, 11, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 5, 3, 3, 3, 3, 8, 7, 7, 8, 8, 4, 8, 7, 7, 7, 9, 7, 8, 9, 8, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 3, 3, 3, 3, 3, 4, 5, 5, 3, 8, 8, 6, 9, 4, 4, 10, 7, 3, 3, 3, 2, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 2, 2, 2, 3, 3, 3, 3, 3, 4, 10, 2, 3, 3, 3, 3, 3, 3, 3, 4, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 5, 2, 4, 2, 6, 2, 2, 9, 5, 5, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 9, 8, 7, 6, 6, 11, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 7, 7, 11, 8, 8, 6, 5, 11, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 3, 3, 3, 3, 3, 3, 6, 4, 4, 4, 4, 3, 3, 3, 3, 5, 7, 2, 3, 3, 3, 3, 3, 8, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 4, 4, 4, 4, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 2, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 6, 3, 3, 8, 10, 3, 4, 4, 1, 1, 1, 1, 1, 1, 1, 8, 9, 10, 7, 7, 1, 1, 3, 8, 7, 7, 8, 8, 8, 1, 6, 1, 1, 6, 3, 3, 4, 7, 3, 5, 5, 4, 4, 4, 4, 4, 2, 7, 7, 8, 12, 3, 4, 5, 1, 3, 4, 4, 10, 4, 3, 3, 3, 8, 7, 7, 2, 2, 2, 2, 2, 2, 2, 2, 2, 12, 9, 20, 7, 5, 5, 9, 13, 5, 5, 5, 5, 5, 3, 3, 3, 16, 5, 5, 5, 13, 7, 8, 8, 11, 8, 7, 9, 7, 11, 12, 9, 9, 8, 8, 11, 10, 14, 7, 12, 10, 11, 13, 7, 9, 11, 17, 17, 14, 13, 7, 8, 7, 10, 10, 7, 16, 13, 7, 8, 17, 12, 9, 8, 6, 7, 10, 6, 6, 12, 6, 8, 10, 8, 8, 8, 6, 8, 6, 14, 6, 6, 6, 13, 6, 10, 6, 6, 7, 14, 8, 6, 6, 10, 11, 10, 9, 9, 7, 7, 6, 6, 6, 9, 9, 7, 9, 10, 9, 13, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 6, 6, 8, 8, 6, 8, 9, 10, 9, 7, 10, 10, 8, 7, 8, 7, 10, 12, 9, 8, 15, 8, 7, 8, 8, 7, 7, 15, 13, 7, 10, 9, 14, 18, 16, 7, 24, 7, 8, 10, 11, 16, 8, 14, 7, 9, 9, 9, 11, 13, 19, 14, 15, 14, 11, 7, 13, 9, 10, 7, 13, 9, 10, 11, 12, 8, 9, 2, 3, 5, 8, 7, 4, 4, 10, 5, 3, 3, 3, 3, 3, 5, 4, 4, 4, 2, 2, 2, 2, 2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 2, 12, 5, 3, 8, 10, 15, 6, 7, 2, 3, 2, 5, 5, 12, 2, 5, 5, 5, 5, 2, 2, 5, 5, 12, 9, 5, 2, 2, 9, 5, 5, 12, 12, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 9, 12, 5, 8, 8, 9, 5, 5, 5, 8, 19, 7, 16, 15, 14, 9, 9, 9, 9, 7, 11, 11, 11, 14, 10, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 14, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 15, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 12, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 12, 9, 9, 12, 12, 12, 15, 7, 11, 7, 11, 18, 13, 8, 18, 15, 18, 12, 14, 12, 8, 8, 8, 8, 9, 9, 9, 12, 7, 10, 10, 8, 8, 12, 12, 12, 7, 12, 12, 9, 7, 7, 7, 7, 7, 8, 15, 12, 9, 10, 10, 7, 10, 10, 13, 11, 10, 9, 22, 11, 9, 8, 8, 8, 8, 8, 13, 18, 13, 9, 15, 19, 9, 7, 7, 10, 7, 7, 7, 11, 8, 13, 17, 7, 7, 10, 10, 10, 7, 20, 16, 7, 7, 7, 7, 11, 21, 12, 12, 13, 11, 14, 16, 8, 8, 13, 11, 9, 7, 7, 13, 7, 7, 14, 15, 15, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 13, 10, 18, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11, 8, 8, 12, 12, 11, 11, 8, 12, 9, 9, 9, 13, 13, 9, 9, 9, 9, 9, 9, 10, 12, 6, 6, 6, 6, 17, 11, 7, 7, 7, 7, 14, 14, 12, 6, 7, 7, 6, 6, 15, 10, 13, 10, 6, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 13, 9, 9, 15, 13, 6, 12, 12, 6, 19, 11, 10, 7, 7, 16, 8, 19, 17, 9, 9, 9, 9, 9, 6, 6, 6, 10, 8, 16, 8, 6, 6, 9, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 6, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 14, 6, 6, 6, 6, 20, 6, 9, 6, 9, 9, 9, 6, 9, 8, 8, 12, 9, 8, 8, 8, 7, 8, 12, 7, 8, 8, 8, 6, 8, 6, 6, 6, 6, 6, 6, 6, 9, 8, 8, 6, 6, 13, 9, 12, 13, 12, 14, 13, 12, 11, 11, 6, 8, 8, 8, 6, 13, 12, 11, 11, 12, 6, 11, 12, 11, 13, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 15, 6, 6, 6, 6, 6, 6, 6, 13, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 8, 8, 8, 6, 18, 6, 12, 13, 13, 13, 9, 10, 15, 9, 12, 6, 6, 6, 6, 6, 6, 6, 6, 9, 15, 10, 9, 10, 13, 9, 19, 8, 18, 17, 10, 10, 8, 8, 6, 6, 6, 6, 6, 6, 10, 14, 8, 16, 16, 9, 8, 15, 8, 8, 10, 12, 14, 7, 7, 8, 8, 7, 7, 7, 7, 8, 13, 13, 11, 9, 9, 9, 12, 10, 17, 8, 11, 9, 7, 7, 14, 8, 14, 14, 7, 7, 7, 7, 7, 7, 14, 7, 7, 7, 7, 7, 10, 10, 8, 14, 7, 7, 7, 7, 8, 8, 8, 8, 8, 17, 9, 15, 7, 8, 12, 7, 9, 14, 7, 7, 7, 9, 13, 8, 14, 7, 16, 18, 13, 15, 14, 12, 13, 10, 15, 9, 7, 7, 7, 10, 13, 15, 15, 9, 9, 9, 9, 19, 11, 11, 11, 13, 8, 8, 8, 8, 7, 12, 19, 17, 9, 9, 13, 7, 7, 7, 9, 7, 7, 7, 12, 13, 15, 10, 8, 8, 14, 15, 12, 13, 13, 8, 12, 14, 7, 11, 7, 14, 15, 13, 12, 8, 8, 8, 8, 11, 13, 15, 15, 8, 13, 12, 8, 8, 8, 13, 10, 16, 14, 11, 8, 8, 12, 12, 9, 15, 15, 12, 12, 13, 8, 8, 9, 12, 13, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 11, 12, 11, 14, 7, 13, 13, 13, 12, 18, 16, 7, 12, 11, 10, 10, 15, 9, 9, 9, 21, 7, 7, 7, 11, 16, 8, 8, 11, 11, 7, 7, 7, 7, 7, 19, 7, 7, 7, 7, 7, 7, 7, 7, 7, 12, 8, 9, 12, 14, 11, 9, 9, 9, 22, 12, 3, 8, 8, 15, 4, 2, 2, 5, 5, 3, 3, 3, 3, 3, 3, 6, 6, 4, 4, 4, 12, 7, 10, 2, 3, 3, 3, 3, 3, 3, 3, 6, 7, 3, 7, 5, 14, 4, 4, 7, 8, 10, 4, 1, 3, 3, 6, 2, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 2, 2, 5, 3, 4, 2, 2, 2, 2, 2, 2, 11, 5, 5, 5, 11, 5, 5, 3, 5, 5, 5, 5, 11, 14, 13, 9, 11, 9, 12, 8, 11, 11, 8, 11, 16, 9, 9, 7, 10, 9, 12, 8, 15, 6, 7, 6, 6, 13, 10, 8, 11, 8, 6, 6, 6, 12, 16, 6, 11, 7, 8, 9, 18, 6, 6, 9, 4, 4, 6, 13, 6, 6, 6, 6, 8, 8, 9, 16, 7, 7, 14, 7, 8, 8, 8, 7, 7, 7, 7, 7, 7, 15, 13, 7, 10, 7, 7, 10, 12, 16, 15, 7, 9, 9, 14, 11, 11, 10, 9, 10, 8, 12, 7, 8, 7, 7, 10, 12, 7, 12, 8, 7, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 3, 3, 5, 5, 5, 10, 4, 8, 7, 10, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 3, 3, 7, 4, 5, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 6, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 9, 8, 2, 2, 2, 8, 12, 7, 7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 8, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 7, 11, 9, 8, 8, 8, 7, 8, 9, 7, 7, 9, 7, 7, 7, 10, 7, 7, 10, 9, 10, 6, 6, 6, 6, 6, 6, 15, 7, 8, 9, 9, 8, 6, 6, 10, 9, 6, 8, 13, 9, 7, 6, 6, 6, 6, 6, 6, 12, 6, 6, 7, 6, 7, 6, 6, 6, 10, 10, 7, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 14, 6, 6, 7, 7, 9, 6, 6, 6, 6, 9, 9, 8, 9, 10, 9, 8, 9, 12, 7, 7, 7, 8, 7, 10, 12, 11, 9, 10, 7, 7, 7, 9, 10, 10, 8, 12, 9, 7, 7, 9, 8, 8, 8, 10, 7, 7, 8, 9, 9, 7, 7, 7, 8, 2, 4, 6, 3, 4, 2, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 5, 8, 6, 4, 7, 3, 3, 3, 3, 3, 3, 3, 12, 3, 3, 3, 3, 3, 3, 4, 4, 2, 3, 5, 3, 4, 7, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 6, 4, 3, 4, 2, 2, 2, 5, 3, 3, 3, 3, 3, 5, 4, 4, 4, 4, 7, 6, 8, 9, 2, 2, 2, 2, 3, 3, 3, 5, 7, 2, 3, 3, 8, 7, 7, 2, 2, 8, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 8, 8, 7, 7, 6, 10, 6, 9, 7, 11, 4, 6, 8, 8, 7, 8, 4, 5, 5, 5, 3, 3, 11, 8, 9, 6, 6, 8, 7, 4, 4, 7, 8, 7, 2, 2, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 7, 2, 2, 3, 3, 2, 3, 3, 3, 3, 3, 3, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 12, 5, 5, 3, 3, 3, 5, 10, 12, 6, 15, 4, 6, 6, 7, 14, 9, 3, 3, 3, 3, 3, 8, 2, 2, 3, 5, 3, 3, 3, 3, 3, 3, 8, 8, 8, 7, 5, 8, 4, 6, 11, 2, 2, 6, 7, 2, 9, 8, 5, 5, 3, 3, 5, 5, 7, 7, 6, 6, 10, 6, 6, 8, 9, 7, 4, 4, 4, 4, 7, 6, 6, 7, 7, 10, 9, 8, 11, 8, 3, 3, 3, 3, 3, 4, 4, 2, 3, 3, 3, 3, 3, 7, 6, 2, 5, 6, 7, 6, 4, 8, 9, 11, 2, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 5, 3, 3, 3, 3, 3, 9, 9, 6, 4, 8, 7, 7, 5, 9, 8, 6, 8, 7, 8, 5, 5, 5, 5, 5, 3, 3, 3, 16, 8, 7, 7, 7, 8, 7, 7, 7, 7, 9, 6, 9, 6, 10, 7, 7, 7, 6, 10, 8, 9, 11, 11, 8, 4, 4, 10, 8, 8, 6, 9, 6, 11, 8, 8, 8, 15, 7, 8, 9, 5, 3, 3, 3, 3, 3, 5, 11, 2, 2, 3, 8, 9, 10, 3, 2, 2, 2, 2, 2, 2, 3, 6, 4, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 2, 3, 3, 3, 3, 3, 3, 3, 11, 5, 3, 3, 3, 3, 3, 3, 3, 3, 6, 7, 4, 4, 2, 3, 3, 3, 3, 3, 3, 3, 3, 12, 7, 4, 12, 4, 6, 5, 4, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 11, 10, 6, 4, 6, 10, 8, 3, 3, 3, 3, 3, 3, 3, 3, 5, 4, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 5, 3, 4, 4, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 10, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 7, 8, 8, 7, 13, 12, 10, 10, 8, 8, 7, 7, 9, 12, 11, 6, 6, 8, 8, 9, 7, 7, 7, 10, 15, 10, 4, 4, 4, 4, 4, 11, 8, 8, 9, 7, 9, 14, 14, 12, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 12, 5, 5, 5, 8, 11, 10, 7, 9, 3, 8, 7, 3, 15, 13, 11, 4, 4, 2, 2, 2, 19, 7, 5, 5, 3, 3, 3, 3, 3, 3, 3, 5, 22, 18, 6, 14, 17, 4, 4, 19, 16, 18, 2, 3, 3, 2, 3, 2, 3, 3, 6, 4, 2, 3, 3, 2, 5, 3, 3, 3, 3, 3, 3, 3, 9, 9, 2, 3, 2, 2, 2, 3, 3, 3, 5, 7, 14, 7, 7, 12, 9, 13, 6, 11, 6, 10, 9, 7, 7, 8, 12, 12, 8, 8, 8, 10, 7, 7, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 5, 8, 10, 7, 8, 11, 8, 12, 9, 4, 7, 7, 9, 13, 2, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 1, 2, 2, 3, 3, 3, 3, 3, 3, 5, 2, 2, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 8, 4, 4, 4, 3, 2, 3, 3, 3, 3, 5, 2, 2, 2, 2, 5, 5, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 12, 9, 8, 8, 9, 8, 6, 17, 6, 6, 6, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 4, 4, 8, 8, 9, 9, 9, 7, 7, 7, 7, 7, 7, 7, 9, 9, 9, 7, 8, 8, 8, 10, 7, 13, 10, 8, 9, 3, 3, 5, 13, 3, 3, 3, 3, 3, 7, 7, 6, 6, 10, 13, 11, 11, 8, 8, 9, 8, 9, 9, 10, 10, 10, 11, 10, 10, 13, 13, 16, 15, 11, 12, 9, 9, 10, 9, 11, 10, 9, 9, 14, 7, 8, 3, 10, 7, 7, 3, 2, 2, 2, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 7, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 11, 6, 7, 4, 6, 2, 2, 3, 3, 3, 1, 3, 3, 3, 3, 3, 3, 6, 4, 4, 2, 2, 2, 3, 3, 3, 3, 4, 4, 6, 6, 6, 6, 5, 4, 4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 9, 11, 6, 10, 9, 12, 7, 7, 11, 14, 9, 7, 12, 3, 3, 7, 12, 11, 12, 7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 11, 5, 5, 5, 5, 5, 5, 5, 5, 11, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 10, 3, 3, 3, 11, 3, 5, 9, 11, 8, 12, 14, 9, 7, 8, 7, 7, 11, 11, 7, 7, 10, 9, 8, 10, 9, 7, 7, 7, 7, 7, 7, 8, 8, 7, 11, 8, 8, 8, 7, 7, 10, 8, 7, 13, 12, 7, 17, 10, 8, 8, 11, 7, 11, 11, 14, 7, 11, 7, 8, 6, 9, 20, 8, 7, 9, 16, 7, 10, 6, 11, 10, 8, 9, 7, 16, 11, 11, 9, 8, 9, 8, 8, 8, 11, 8, 15, 8, 8, 9, 7, 8, 8, 11, 10, 7, 5, 7, 10, 10, 15, 7, 7, 7, 8, 7, 8, 8, 10, 11, 10, 10, 10, 11, 11, 7, 8, 6, 8, 8, 8, 10, 6, 8, 6, 6, 7, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 16, 6, 15, 6, 7, 11, 11, 7, 9, 10, 11, 13, 10, 6, 16, 8, 10, 12, 11, 6, 6, 6, 6, 6, 6, 6, 10, 6, 10, 7, 7, 7, 7, 11, 7, 11, 6, 6, 6, 6, 6, 6, 17, 7, 7, 6, 6, 12, 22, 6, 6, 6, 6, 6, 8, 6, 6, 6, 6, 7, 6, 6, 5, 6, 6, 8, 11, 6, 9, 14, 11, 9, 11, 7, 7, 8, 6, 6, 6, 8, 10, 9, 6, 6, 6, 6, 9, 7, 6, 6, 6, 6, 6, 15, 6, 4, 4, 4, 6, 4, 17, 8, 11, 6, 6, 9, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 6, 6, 6, 6, 10, 6, 10, 6, 6, 6, 6, 12, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 9, 6, 6, 6, 6, 18, 6, 6, 6, 8, 9, 10, 7, 8, 9, 10, 11, 7, 13, 6, 8, 8, 6, 6, 14, 7, 7, 7, 7, 10, 7, 14, 9, 6, 6, 9, 15, 9, 7, 14, 6, 11, 14, 13, 7, 12, 8, 7, 7, 7, 7, 7, 12, 7, 10, 9, 16, 6, 8, 6, 5, 17, 6, 8, 10, 4, 6, 4, 10, 15, 17, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 4, 4, 11, 7, 4, 4, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 19, 17, 6, 10, 11, 6, 6, 6, 6, 18, 6, 6, 11, 4, 4, 4, 5, 6, 6, 6, 9, 5, 6, 4, 6, 6, 4, 6, 6, 6, 6, 10, 6, 6, 4, 6, 6, 10, 6, 10, 6, 6, 6, 6, 11, 6, 6, 10, 6, 6, 8, 6, 6, 6, 8, 6, 11, 4, 11, 9, 10, 9, 11, 4, 8, 4, 11, 12, 7, 9, 8, 6, 7, 7, 8, 12, 12, 11, 13, 10, 11, 7, 7, 7, 9, 7, 11, 10, 7, 7, 7, 16, 11, 10, 11, 17, 9, 9, 8, 8, 7, 7, 7, 9, 7, 7, 7, 14, 7, 13, 9, 11, 10, 14, 10, 10, 12, 11, 10, 7, 10, 5, 14, 8, 8, 8, 9, 7, 8, 7, 7, 9, 8, 7, 8, 7, 7, 7, 7, 7, 7, 7, 11, 8, 10, 8, 7, 8, 14, 11, 8, 9, 9, 9, 8, 24, 10, 10, 12, 7, 7, 15, 11, 8, 8, 12, 11, 8, 9, 9, 7, 8, 9, 10, 11, 10, 11, 7, 12, 7, 7, 11, 9, 8, 14, 13, 12, 8, 11, 10, 8, 8, 7, 7, 14, 9, 10, 8, 9, 11, 7, 14, 8, 8, 13, 8, 8, 12, 7, 10, 14, 14, 11, 9, 10, 9, 9, 7, 7, 11, 11, 13, 9, 13, 5, 5, 5, 7, 9, 5, 11, 12, 14, 8, 7, 7, 11, 10, 9, 7, 8, 8, 7, 10, 11, 11, 5, 5, 7, 5, 5, 5, 7, 7, 15, 7, 7, 8, 7, 15, 12, 12, 10, 7, 8, 7, 11, 7, 7, 7, 23, 11, 8, 8, 11, 10, 7, 8, 11, 7, 19, 7, 7, 6, 9, 9, 9, 11, 3, 4, 7, 8, 6, 6, 4, 10, 8, 2, 2]);
var edgeChild = /* @__PURE__ */ new Uint16Array([0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 1, 1, 1, 1, 1, 17, 1, 1, 1, 12, 1, 12, 1, 12, 13, 1, 1, 1, 1, 12, 1, 12, 1, 1, 1, 1, 1, 14, 21, 1, 1, 1, 1, 1, 1, 1, 19, 12, 1, 1, 1, 1, 1, 1, 1, 20, 1, 1, 1, 16, 1, 18, 1, 1, 15, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 22, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 1, 24, 25, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 12, 12, 12, 12, 1, 32, 0, 0, 0, 1, 1, 1, 1, 35, 34, 1, 1, 1, 1, 1, 33, 1, 1, 1, 1, 37, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 38, 0, 0, 0, 0, 39, 40, 0, 0, 0, 41, 0, 12, 1, 1, 12, 1, 1, 1, 1, 44, 45, 45, 45, 44, 45, 44, 44, 46, 45, 44, 45, 44, 44, 44, 44, 44, 44, 46, 44, 44, 44, 44, 44, 44, 45, 47, 47, 45, 44, 44, 44, 44, 44, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 50, 52, 50, 50, 50, 52, 50, 51, 50, 53, 50, 51, 51, 50, 50, 50, 51, 53, 51, 53, 50, 51, 51, 12, 55, 55, 54, 56, 51, 53, 50, 50, 48, 49, 57, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 60, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 67, 1, 12, 1, 1, 66, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 76, 79, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 12, 1, 1, 1, 1, 89, 1, 91, 1, 1, 1, 1, 1, 1, 1, 1, 94, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 97, 97, 1, 1, 12, 1, 100, 1, 1, 1, 1, 1, 1, 1, 98, 1, 99, 1, 101, 1, 1, 1, 1, 1, 102, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 110, 111, 1, 1, 1, 1, 1, 1, 113, 113, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 121, 122, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 122, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 122, 1, 1, 1, 1, 1, 1, 1, 1, 1, 126, 123, 125, 120, 1, 124, 1, 1, 114, 1, 1, 1, 1, 117, 1, 127, 1, 1, 1, 1, 1, 119, 1, 108, 1, 109, 1, 12, 128, 106, 1, 112, 1, 1, 1, 1, 1, 107, 115, 1, 12, 12, 12, 118, 116, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 12, 12, 1, 1, 1, 1, 1, 12, 134, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 136, 1, 1, 1, 1, 1, 1, 1, 1, 137, 138, 12, 12, 135, 133, 45, 45, 140, 50, 50, 139, 142, 141, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 145, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 143, 0, 0, 0, 0, 1, 0, 144, 132, 1, 0, 1, 12, 12, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 148, 147, 20, 1, 1, 12, 12, 1, 20, 12, 12, 1, 1, 1, 1, 1, 134, 1, 1, 152, 1, 1, 1, 1, 153, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 1, 1, 136, 1, 1, 152, 1, 1, 1, 1, 153, 1, 1, 134, 1, 1, 1, 152, 1, 1, 1, 1, 153, 1, 1, 134, 1, 1, 1, 1, 1, 1, 1, 1, 134, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 160, 1, 1, 1, 152, 1, 1, 1, 1, 1, 153, 1, 1, 160, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 134, 1, 1, 1, 1, 152, 1, 1, 1, 1, 153, 1, 1, 1, 134, 1, 1, 152, 1, 1, 1, 1, 164, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 1, 167, 1, 1, 160, 1, 1, 1, 1, 1, 152, 1, 1, 1, 1, 1, 153, 1, 1, 160, 1, 1, 1, 1, 1, 152, 1, 1, 1, 1, 1, 153, 1, 154, 158, 158, 12, 1, 12, 166, 1, 1, 1, 1, 1, 158, 158, 158, 154, 1, 1, 1, 157, 158, 161, 165, 1, 1, 1, 1, 157, 157, 1, 1, 156, 154, 154, 157, 170, 156, 170, 1, 1, 168, 1, 156, 155, 157, 1, 1, 1, 1, 157, 1, 159, 1, 1, 1, 12, 1, 162, 1, 162, 1, 1, 1, 162, 161, 163, 169, 156, 154, 1, 1, 1, 1, 1, 1, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 173, 172, 173, 172, 172, 172, 172, 174, 174, 172, 173, 172, 173, 172, 172, 12, 12, 12, 12, 12, 1, 12, 12, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 193, 1, 1, 1, 1, 12, 199, 200, 201, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 151, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 196, 1, 1, 1, 184, 1, 210, 1, 1, 1, 208, 1, 1, 205, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 190, 1, 1, 1, 186, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 182, 1, 1, 1, 1, 1, 1, 1, 191, 1, 1, 1, 1, 195, 1, 1, 1, 1, 171, 1, 1, 189, 1, 1, 1, 192, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 180, 1, 12, 1, 1, 12, 1, 1, 1, 1, 183, 1, 1, 1, 188, 1, 203, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 209, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 194, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 176, 12, 1, 1, 1, 178, 12, 1, 1, 1, 1, 1, 1, 1, 198, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 177, 1, 1, 1, 1, 1, 1, 204, 1, 1, 1, 181, 1, 1, 1, 187, 1, 12, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 191, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 175, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 185, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 206, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 207, 1, 1, 12, 1, 1, 1, 1, 179, 1, 1, 1, 185, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 197, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 202, 1, 1, 12, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 220, 0, 0, 0, 0, 0, 221, 0, 0, 0, 0, 0, 0, 1, 12, 1, 1, 1, 225, 1, 1, 1, 0, 226, 223, 224, 1, 1, 1, 1, 1, 1, 231, 1, 233, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 229, 1, 1, 1, 1, 1, 235, 1, 1, 12, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 234, 1, 1, 1, 12, 1, 1, 1, 1, 230, 1, 1, 1, 228, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 232, 1, 1, 1, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 241, 13, 1, 1, 1, 12, 12, 238, 239, 1, 1, 1, 1, 240, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 242, 1, 1, 12, 16, 1, 1, 1, 1, 1, 1, 1, 243, 1, 1, 1, 12, 12, 1, 1, 1, 1, 1, 243, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 252, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 256, 256, 1, 0, 0, 0, 0, 0, 1, 12, 0, 0, 0, 0, 0, 0, 0, 0, 172, 261, 262, 1, 12, 1, 1, 1, 1, 12, 264, 1, 1, 263, 1, 1, 266, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 271, 272, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 12, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 12, 0, 283, 0, 0, 284, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 60, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 308, 0, 0, 0, 0, 0, 0, 0, 0, 0, 310, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 327, 327, 328, 327, 0, 185, 1, 1, 13, 323, 1, 321, 0, 0, 0, 0, 1, 0, 0, 0, 324, 1, 1, 329, 1, 205, 1, 1, 1, 1, 1, 322, 1, 319, 1, 325, 1, 317, 1, 326, 1, 318, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 12, 1, 12, 320, 320, 1, 1, 1, 316, 184, 1, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 12, 1, 1, 1, 1, 315, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 332, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 266, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 372, 372, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 364, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 340, 351, 1, 1, 339, 374, 1, 345, 1, 1, 337, 369, 1, 1, 355, 336, 341, 1, 1, 1, 348, 379, 357, 1, 1, 1, 1, 1, 1, 358, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 367, 371, 0, 0, 79, 1, 1, 0, 365, 342, 378, 343, 346, 353, 1, 368, 0, 1, 0, 79, 362, 360, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 381, 1, 1, 352, 1, 79, 1, 0, 1, 1, 1, 384, 1, 0, 0, 79, 359, 0, 1, 338, 1, 1, 1, 0, 1, 1, 361, 1, 0, 1, 1, 1, 0, 1, 386, 349, 1, 1, 0, 1, 0, 0, 377, 0, 1, 1, 1, 79, 370, 1, 1, 366, 363, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 344, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 376, 0, 79, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 380, 1, 1, 1, 0, 0, 383, 0, 0, 0, 1, 356, 1, 0, 79, 382, 1, 0, 0, 0, 0, 385, 1, 1, 0, 0, 1, 0, 1, 0, 354, 0, 350, 0, 1, 1, 1, 0, 1, 1, 0, 373, 347, 375, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 400, 400, 1, 1, 12, 12, 1, 400, 1, 1, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 412, 1, 1, 0, 1, 1, 1, 1, 205, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 430, 430, 1, 1, 0, 0, 317, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 442, 1, 441, 1, 1, 1, 1, 1, 1, 1, 1, 445, 1, 12, 12, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 453, 1, 1, 1, 455, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 452, 1, 447, 1, 1, 1, 435, 1, 1, 1, 1, 1, 1, 1, 1, 448, 12, 1, 1, 1, 1, 454, 1, 1, 1, 449, 444, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 317, 1, 433, 1, 1, 12, 451, 1, 1, 317, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 437, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 454, 1, 1, 1, 1, 317, 1, 450, 1, 1, 1, 439, 1, 1, 1, 1, 1, 440, 1, 456, 443, 1, 1, 1, 1, 1, 438, 1, 1, 1, 1, 1, 1, 1, 1, 1, 434, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 446, 1, 1, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 436, 1, 1, 1, 1, 1, 1, 1, 220, 457, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 462, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 12, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 466, 0, 466, 466, 466, 466, 466, 466, 466, 0, 466, 466, 466, 466, 466, 1, 466, 466, 466, 0, 466, 466, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 471, 470, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 475, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 468, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 469, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 477, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 466, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 474, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 467, 0, 0, 478, 473, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 472, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 466, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 467, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 466, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 476, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 488, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 198, 198, 1, 492, 1, 1, 1, 491, 1, 1, 1, 1, 487, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 489, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 493, 1, 1, 490, 1, 1, 1, 1, 1, 1, 1, 1, 372, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 494, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 505, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 12, 1, 507, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 60, 1, 1, 12, 12, 12, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 526, 1, 1, 1, 1, 1, 1, 1, 527, 1, 1, 1, 1, 1, 1, 1, 525, 1, 1, 12, 1, 529, 239, 1, 1, 12, 12, 1, 1, 12, 1, 12, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 533, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 539, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 132, 1, 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 107, 1, 1, 12, 1, 1, 1, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 548, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 144, 1, 1, 1, 228, 1, 1, 12, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 572, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 577, 1, 220, 1, 328, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 578, 1, 1, 1, 1, 0, 580, 0, 79, 0, 579, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 12, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 586, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 582, 582, 0, 585, 583, 582, 582, 582, 582, 582, 587, 582, 582, 591, 582, 582, 582, 582, 582, 582, 582, 582, 582, 582, 588, 585, 582, 582, 585, 582, 582, 582, 582, 582, 582, 582, 582, 582, 582, 582, 582, 582, 583, 582, 582, 582, 582, 582, 589, 582, 582, 582, 582, 582, 582, 0, 0, 0, 1, 590, 1, 1, 1, 1, 584, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 595, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 12, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 12, 1, 1, 12, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 65, 280, 306, 411, 535, 0, 4, 68, 236, 254, 282, 307, 334, 388, 413, 0, 499, 519, 536, 597, 9, 0, 61, 88, 398, 409, 429, 575, 0, 497, 518, 532, 612, 0, 30, 6, 0, 461, 500, 602, 560, 70, 0, 7, 285, 255, 389, 463, 416, 538, 79, 598, 0, 576, 309, 418, 465, 9, 105, 288, 506, 6, 30, 0, 311, 79, 391, 79, 483, 10, 6, 131, 248, 275, 0, 613, 509, 0, 563, 0, 64, 6, 6, 251, 95, 2, 432, 399, 410, 596, 0, 6, 0, 6, 286, 103, 6, 561, 501, 540, 0, 464, 390, 273, 287, 8, 71, 104, 599, 543, 392, 312, 300, 419, 146, 74, 290, 546, 510, 601, 564, 335, 330, 479, 6, 75, 149, 11, 0, 249, 522, 547, 565, 514, 551, 570, 611, 36, 6, 260, 295, 333, 304, 218, 30, 528, 553, 218, 42, 216, 265, 296, 305, 406, 423, 481, 274, 0, 73, 562, 0, 403, 417, 299, 79, 247, 79, 0, 581, 545, 504, 292, 421, 79, 393, 387, 0, 0, 0, 9, 555, 571, 217, 0, 424, 407, 531, 516, 573, 615, 85, 218, 43, 297, 396, 425, 569, 0, 511, 293, 276, 79, 215, 80, 28, 390, 30, 6, 394, 331, 303, 604, 592, 524, 550, 513, 0, 258, 81, 30, 405, 422, 0, 30, 426, 0, 219, 593, 517, 9, 408, 427, 218, 248, 86, 222, 594, 574, 557, 482, 428, 397, 250, 227, 87, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 620, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 414, 0, 0, 0, 0, 0, 0, 0, 0, 82, 0, 129, 0, 0, 84, 549, 0, 0, 0, 0, 0, 0, 0, 27, 0, 552, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 414, 0, 0, 0, 0, 503, 0, 257, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 294, 0, 0, 0, 0, 0, 0, 0, 617, 0, 0, 0, 0, 0, 616, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 395, 0, 0, 0, 484, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 495, 0, 0, 0, 0, 0, 0, 404, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 211, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 515, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 496, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 269, 281, 0, 0, 0, 0, 0, 530, 277, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 512, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 458, 0, 0, 0, 314, 0, 0, 0, 0, 0, 0, 253, 0, 0, 0, 0, 0, 0, 23, 0, 0, 0, 0, 568, 0, 0, 0, 0, 600, 521, 0, 0, 0, 0, 244, 0, 0, 0, 0, 0, 0, 0, 0, 0, 480, 0, 0, 0, 0, 0, 62, 0, 0, 0, 267, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 246, 0, 0, 0, 0, 0, 279, 610, 0, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 619, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150, 0, 278, 0, 0, 0, 0, 0, 0, 567, 0, 0, 0, 0, 0, 0, 523, 0, 0, 0, 0, 0, 0, 0, 0, 0, 566, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 213, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84, 0, 502, 0, 0, 0, 0, 0, 554, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 486, 0, 485, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 259, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 459, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 289, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 537, 0, 0, 0, 0, 0, 0, 0, 0, 298, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 237, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84, 0, 606, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 245, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 609, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 520, 0, 0, 0, 84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 498, 0, 614, 0, 0, 431, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 402, 0, 0, 0, 544, 0, 93, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 0, 0, 0, 0, 0, 0, 29, 92, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 291, 0, 0, 0, 214, 0, 0, 0, 0, 0, 0, 558, 0, 270, 0, 0, 130, 0, 0, 0, 0, 0, 559, 0, 0, 0, 0, 0, 0, 0, 414, 420, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 313, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 301, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 534, 0, 0, 0, 415, 0, 0, 401, 0, 0, 0, 0, 0, 0, 603, 0, 0, 0, 541, 0, 0, 90, 0, 542, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 508, 460, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 268, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 414, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 608, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 607, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 618, 0, 0, 0, 0, 0, 556, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 302, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 605, 0, 0, 212, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 623, 623, 623, 623, 623, 623, 623, 622, 624]);
var labelText = "orgmilcomschnetedugovdrrformsfeedbackofficialaccoorgmilschnetgovmagazinemediaunioncargopilotgroupcaarespressworksaerodromeworkinggroupair-traffic-controlaircraftaccident-preventioneducatormarketplaceambulanceinsurancecateringairportrepbodyenginesoftwaremodellingair-surveillanceconsultingchartertrainermaintenanceservicesdesignflightskydivingfreightassociationstudentgroundhandlingdgcafuelclubtaxicrewshowballooningexpresstraderbrokerauthoragentsairtrafficjournalistsafetyconsultantmicrolightaccident-investigationparachutingequipmentproductionfederationrecreationscientistnavigationengineertradingglidingleasingresearchpassenger-associationentertainmentparaglidinghangglidingaerobaticrotorcraftemergencycertificationgovernmentaeroclubexchangelogisticschampionshiphomebuiltcouncilconferencecontrolairlinecivilaviationjournalorgcomnetedugovcoorgcomnomnetobjofforgcomnetuwukiloappsframerorgmilcomnetedugovcoradioorgcomnetcommuneedogpbcoitgvorgedugov*spreviewfrontendrelayononstagingupid*mtls*privatelinktypedreamdeveloperbravemochawindsurfaivenmirenupsunwnextbegetngrokclerkwale2bwebcsbrunputerflutterflowspawnbaseshiptodaymagicpatternsnetlifyondigitaloceanrailwayhostedclaudehasurabotdashvercelgithubluyanigadgetreplitcloudflaretelebitedgecomputeevervaultdetaexponyatnoopencrpplxzeaburwasmerframerzeropsconvexmedusajsspritesonherculeseasypanelstreamlitsnowflakemesserliloginlinehackclubnorthflankbase44corespeedadaptableleapcellngrok-freeclerkstagelovableon-fleek*us-west-3ap-south-2us-central-2us-central-1eu-central-1ap-south-1us-west-2us-east-2eu-north-1ap-north-1us-west-1us-east-1*rcloudintsegorgmilcomgobbetnetintedugovturmusicasenasamutualcoopip6uriurnin-addre164homeirisgovdixdaemoncloudnssthwien*inexexkunden4accogvormymyspreadshop4lima2ixortsinfofuturecmsfuturehosting12hpprivfuturemailinglima-cityfunkfeuer123webseitednshomemelmyspreadshopcloudletswasantqldvicactnswtascatholicwasaqldvictasvpsidwasantozqldorgcomvicasnactnetedugovnswtasconfhrsncomairflowlambda-urltransfer-webappairflowtransfer-webapptransfer-webapptransfer-webapp-fipstransfer-webappeu-west-3ap-south-2eu-south-2eu-central-2ap-southeast-3ap-southeast-4ap-northeast-3eu-central-1mx-central-1me-central-1ca-central-1il-central-1ap-northeast-1ap-southeast-1me-south-1af-south-1eu-south-1ap-south-1ap-southeast-7us-west-2eu-west-2us-east-2eu-north-1ap-southeast-2ap-northeast-2ap-southeast-5us-gov-west-1us-gov-east-1ca-west-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1privatenotebookstudiolabelingnotebookstudionotebooknotebook-fipslabelingnotebookstudionotebook-fipsnotebookstudio-fipsnotebook-fipsnotebookstudionotebook-fipsnotebookstudioeu-west-3ap-south-2eu-south-2eu-central-2ap-southeast-3ap-southeast-4ap-northeast-3eu-central-1me-central-1ca-central-1il-central-1ap-northeast-1ap-southeast-1me-south-1af-south-1eu-south-1ap-south-1us-west-2eu-west-2us-east-2eu-north-1ap-southeast-2ap-northeast-2experimentsus-gov-west-1us-gov-east-1ca-west-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1onrepostsagemakercopporgmilcompronetintedugovbiznameinfoshoprsorgmilcomnetedugovbrendlyresolvenzauscotvstoreorgcomnetedugovbizinfoidacaicoittvorgmilcomschnetedugovinfocloudezproxyacmymyspreadshopkuleuvenwebhostingtransurl123websitecloudnsinterhostsolutionsddns5476103298edgfacbmlonihkjutwvqpsryxzbarsycoororgcomedumyftpno-iporxcloud-ipfor-somemmafanfor-morewebhopselfipjozidyndnscloudnsdscloudfor-thefor-betteractivetrailcoeconorestooteorgcomeconeteduassurmoneyafricaarchitectesrestaurantloisirstourismavocatsinfoagrounivcoorgcomnetedugovtvdeportesaludtksatorgmilcomwebgobnetinteducienciaboliviarevistacooperativaempresanombreindustriamusicapatriamedicinademocraciapoliticapuebloindigenaplurinacionalarteblogwikiinfoagrotransportenoticiasprofesionalacademiaeconomiaecologiamovimientotecnologianaturalsimplesitecepesebamapadfmgalampbacscpirngorotomtrjspaprrprrsesmscepesebamapadfmgalampbacscpirngorotomtrjspaprrprrsesms*biaamfmtcmptvfeirasampajampanatalbelemananiradiog12medindfndbmdtrdthepoaggfjdfdefinfenflegsegongengcngorgzlgslglogppgmillelqslcimcomnomadmjabimbbibbsbabcrectecsjcetcpscpvhudieticriapipsiecnbiorioecogeoteoodoproatoartfstmatvetdetbetnetcntnotfotgrueduajuespappreptmpemparqsrvadvdevgovntrturagrjorfarjusmusdesvixxyzcozfozslzbhzmaringasantamariacampinagrandegoianiasorocabafloripasaobernardocuritibaboavistarecifeaparecidasaogoncasalvadorcuiabamorenamacapalondrinacontagemsocialfortalmaceioleilaoosascoriobranconiteroi9guacutcheblogflogvlogwikitaxicoopmanauspalmascaxiasjoinvillebaruericampinassantoandreribeiraoriopretoweorgcomnetedugovv0windsurfshiptodaycloudsitecoaccoorgnetgovofmilcomgovmediatechzacoorgcomnetedugsjgovmydnspenfnlabnbmbgcbcqconcontnuyksknsmyspreadshopno-ipawdevboxbarsyonidatemfuinabusavinstanceseceuguukussryzespawncsxcloud-ipmyphotosfantasyleaguetwmailcleverappsscrappingccwucloudnsftpaccessgame-serverccgovobjectsrmalpgcust*svcalp1aeappenginermalpgmyspreadshop4lima2ixsquare7cloudscale123websitefirenet12hpflowgotdnslinkyard-cloudcloudnslima-citydnskingobjectstorageedaccogoorusorgcomnetintedua\xE9roportxn--aroport-byaassogouvcomilgobgovcloudnses-1eu-west-1us-east-1euvipit1eurarubait1s3lbwebsites3websiteru-spbru-mskelasticcsrunstnukukcaukusnl-ams-1fr-par-1fr-par-2functionsnodess3ddlwhmrdbfnck8sifrs3-websitecockpitscblmgdbdtwhkafkpubprivs3ddlwhmrdbk8sifrs3-websitecockpitscblmgdbdtwhkafks3ddlrdbk8sifrs3-websitecockpitscblmgdbdtwhkafkk8sscalebookpl-wawfr-parnl-amsbaremetalsmartlabelinginstancesdechk2kuleuvenlaravelvoorloperurownoxazapscwhstgrvaporobservablehqelementorantagonistreclaimjoteluluencowaydiademjelasticmatlabmagentositetrendhostingaxarnetperspectajenv-arubajelejoteravendbemergenttrafficplexconvexkeliwebserveboltbegetcdnstaticson-rancherprimetelonstackitunison-servicesdnshomelinkyardbarsyjelecloudnscocomnetgovmycn-northwest-1cn-north-1s3s3-accesspoints3-websites3s3-accesspointrdsdualstacks3-deprecatedemrappui-prods3-websiteemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apis3s3-accesspoints3s3-accesspointrdsdualstackemrappui-prods3-websiteemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicn-northwest-1cn-north-1cn-northwest-1ebcomputeelbcn-north-1airflowcn-northwest-1cn-north-1oncn-northwest-1cn-north-1amazonawssagemakeramazonwebservicesdirectasgdsdhehahljlnmhbacscahqhshhihnlnynsnmofjbjzjxjtjhkcqtwgsjssxnxjxgxxzgz\u7DB2\u7D61\u7F51\u7EDC\u516C\u53F8orgmilcomnetedugovxn--55qx5dcanva-appsxn--io0a7iquickconnectcanvasitekhsjxn--od0algmyqnapcloudsrvrlessclustersrealtimestorageleadpagescarrdcrdorgmilcomnomnetedugovhidnssupabaserdpareplmypiumsoxmitotaplpagesfirewalledreplitowodevwebview-assetsvfswebview-assetss3s3-accesspointdualstackemrappui-prods3-websiteaws-cloud9emrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9eu-west-3ap-south-2eu-south-2eu-central-2ap-southeast-3ap-southeast-4ap-northeast-3eu-central-1me-central-1ca-central-1il-central-1ap-northeast-1ap-southeast-1me-south-1af-south-1eu-south-1ap-south-1ap-southeast-7us-west-2eu-west-2us-east-2eu-north-1ap-southeast-2ap-northeast-2ap-southeast-5ca-west-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1s3s3-accesspointdualstackemrappui-prods3-websiteaws-cloud9emrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9s3s3-accesspointdualstackanalytics-gatewayemrappui-prods3-websiteaws-cloud9emrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9s3s3-accesspointdualstackemrappui-prods3-websiteemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apis3s3-accesspointdualstacks3-deprecateds3-websites3-object-lambdaexecute-apis3s3-accesspoints3-websites3-accesspoint-fipss3-fipss3s3-accesspointdualstackemrappui-prods3-websites3-accesspoint-fipsaws-cloud9s3-fipsemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9s3s3-accesspointdualstackemrappui-prods3-websites3-accesspoint-fipss3-fipsemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apis3s3-accesspointdualstacks3-deprecatedanalytics-gatewayemrappui-prods3-websiteaws-cloud9emrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9vfss3s3-accesspointdualstackemrappui-prods3-websiteaws-cloud9emrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9eu-west-3ap-south-2eu-central-2ap-southeast-3ap-southeast-4ap-northeast-3eu-central-1mx-central-1me-central-1ca-central-1il-central-1ap-northeast-1us-northeast-1ap-southeast-1me-south-1af-south-1ap-south-1ap-southeast-7us-west-2eu-west-2ap-east-2us-east-2ap-southeast-2ap-northeast-2ap-southeast-5us-gov-west-1us-gov-east-1ap-southeast-6ca-west-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1mrapaccesspoints3s3-accesspointdualstacks3-deprecatedanalytics-gatewayemrappui-prods3-websites3-accesspoint-fipsaws-cloud9s3-fipsemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9s3s3-accesspointdualstacks3-deprecatedanalytics-gatewayemrappui-prods3-websites3-accesspoint-fipsaws-cloud9s3-fipsemrstudio-prods3-object-lambdaemrnotebooks-prodexecute-apicloud9s3eu-west-3ap-south-2eu-south-2computes3-ap-northeast-2elbrdss3-ap-east-1s3-sa-east-1s3-us-gov-west-1s3-eu-central-1s3-ca-central-1eu-central-2ap-southeast-3ap-southeast-4ap-northeast-3s3-website-us-west-2s3-website-eu-west-1s3-external-1eu-central-1me-central-1ca-central-1il-central-1s3-us-west-1s3-eu-west-1s3-website-sa-east-1s3-website-ap-southeast-2ap-northeast-1ap-southeast-1s3-us-west-2s3-eu-west-2me-south-1af-south-1eu-south-1ap-south-1us-west-2eu-west-2us-east-2s3-website-ap-southeast-1s3-1s3-globals3-ap-northeast-3eu-north-1airflowap-southeast-2s3-us-gov-east-1s3-fips-us-gov-east-1s3-me-south-1s3-ap-south-1ap-northeast-2s3-website-us-west-1ap-southeast-5s3-eu-north-1s3-ap-southeast-1s3-website-us-gov-west-1compute-1s3-eu-west-3us-gov-west-1s3-website-ap-northeast-1us-gov-east-1s3-fips-us-gov-west-1s3-website-us-east-1s3-ap-southeast-2ca-west-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1s3-us-east-2s3-ap-northeast-1authauthauth-fipsauth-fipseu-west-3ap-south-2eu-south-2eu-central-2ap-southeast-3ap-southeast-4ap-northeast-3eu-central-1mx-central-1me-central-1ca-central-1il-central-1ap-northeast-1ap-southeast-1me-south-1af-south-1eu-south-1ap-south-1ap-southeast-7us-west-2eu-west-2us-east-2eu-north-1ap-southeast-2ap-northeast-2ap-southeast-5us-gov-west-1us-gov-east-1ca-west-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1rservicesbuilderstg-builderdev-builder*ociocpocsdemoinstanceeu-west-3eu-south-2ap-southeast-3ap-northeast-3eu-central-1me-central-1ca-central-1il-central-1ap-northeast-1ap-southeast-1me-south-1af-south-1eu-south-1ap-south-1ap-southeast-7us-west-2eu-west-2us-east-2eu-north-1ap-southeast-2ap-northeast-2ap-southeast-5us-gov-west-1us-gov-east-1us-west-1eu-west-1us-east-1ap-east-1sa-east-1previeweu-4us-4us-1eu-1us-2eu-2us-3eu-3appspaasrag-cloudrag-cloud-chjcloudjcloud-ver-jpcdemonodebalancermembersipeuxvsoncillaocelotonzayalilynxsphinxfentigercustomercaracalo365cloudstaticxendevapp001testcode-builder-stgplatformapimediasiteprojedrydpagesjsu2u2-localx0desazacncoitrueu4uhkukgrbrushatenadiarymyspreadshopfrom-flfrom-wvwebspace-hosttheworkpchatenablogservesarcasmapplinzisakuratanwixsiteappchizigiizeis-into-carsdnsiskinkyadobeaemcloudis-a-therapistpgfogmyvncdojinis-an-actress1kappfldrvkozowqa2jpnmexprgmrfirewall-gatewaydynnscafjsfbsbxooguyxnbayfrom-gawoltlab-demois-a-anarchistwiardwebteaches-yogadattowebtb-hostinglive-websiteservegamegotpantheonfrom-nhsubsc-payfrom-ohvipsinaappfrom-cadyndns-officehomelinuxfrom-mahercules-appservebbsstreakusercontentfrom-okfrom-wyfastly-terrariumis-a-llamaqualyhqportalserveexchangeon-vaporvivenushopciscofreakgrayjayleaguesmetaaiusercontentfrom-iais-a-libertariansaves-the-whalestaveusercontentyolasiteoperaunitepoint2thisis-a-catererlinodeusercontentfrom-vagithubusercontentsells-for-lesshosteurcanva-appsplaystation-cloudddnsfreefrom-pafrom-prfrom-waddnskingoutsystemscloudhotelwithflightmydattois-a-nascarfanmydbserverminiserverdamnserverservehumouris-a-playerfrom-nvfrom-nmemergentagentgentappsamplifyappfrom-kyis-an-accountantnfshostserveircfrom-akpythonanywherestackhero-networkpostman-echolikescandydyndns-mailobservableusercontentserveftpfreeboxosfrom-utcdn77-storageamazonawsneat-urldyndns-serverlinodeis-a-teacherfrom-vtgleezemythic-beastsus1-pleniteu1-plenitla1-plenitpaywhirlservecounterstrikejdevcloudhealth-carereformis-into-animegoogleapisis-a-painterafricaisa-hockeynutatmetais-an-actora2hostedis-a-democratdatadetectest-le-patrondigitaloceanspacesis-a-designeris-a-hunterlinodeobjectstemp-dnsissmarterthanyoufrom-arsimplesiteevennodetownnews-stagingis-a-liberalgooglecodejelasticservemp3stdlibqualyhqpartnerdyndns-free1cooldnsest-a-la-masiondrayddnsdynuddnsfrom-orfrom-miis-a-bloggerfrom-himydobisscanvacodeis-an-engineerest-a-la-maisonupsunappdevinappswafflecellmyasustorwpenginepoweredfrom-ctservep2psame-appmyshopblocksthingdustdatalikes-piediscordsezis-with-thebanddev-myqnapcloudlpusercontentis-leetshopitsite3utilitiesis-a-personaltrainersinaappladeskis-a-cheflogoipselfipbase44-sandboxnospamproxyalibabacloudcsmesswithdnsauthgearappsiamallamawithgooglelutrausercontentmochausercontentframercanvasmytabitdyndns-homew-credentialless-staticblitzcpserverdiscordsaysis-a-nurseappspotatlassian-isolated-3premotewdfrom-mtwixstudiocode0emm180rmyactivedirectoryawsappsmytuleapdnsabrpolyspaceqbuserrenderbuiltwithdarkboutirgotdnsabrdnsdopaascanva-hosted-embedawsglobalacceleratorhomesecuritypcmyiphostditchyouripclever-clouddyndns-ipon-aptibleis-a-musiciansecuritytacticsappspaceusercontenthomeunixstrapiappsame-previewcf-ipfsmycloudnaselasticbeanstalkis-certifieddontexistkasserverik-serverdrive-platformatlassian-3pfirebaseappherokuappawsapprunnerbarsycenteris-a-cubicle-slaveservehttpmyshopifyis-a-guruquicksytessiiitesorsitesmagicpatternsappis-a-cpameteorappfrom-wiis-a-rockstarbumbleshrimpdattolocalreadthedocs-hostedfrom-rifamilydsdyndns-picsplesknsbplaceddnsaliasdynaliasdyndns-remotedoomdnsip-ddnsblogdnsis-a-doctorroutingthecloudamazoncognitobarsyonlinedsmynasddnsgurucloudflare-ipfsdeus-canvasfrom-idsmushcdnpagespeedmobilizerdyndns-at-homeunusualpersonhosted-by-previderis-a-republicandyn-o-saurstreamlitappworkisboringonthewificprapidqualifioappis-uberleetis-slickgetmyipwpdevcloudtypeformdyndns-at-workgentlentapismynascloudw-corp-staticblitzfrom-ingeekgalaxyservebeerfrom-mdonrenderspace-to-rentaivencloudappspacehostedonfabricawafaicloudcodespotblogspotatlassian-3p-us-gov-modfrom-ndfrom-msis-a-techieis-a-studentcustomer-ociis-a-photographerdurumisfrom-ksmassivegriddyndns-wikiis-an-entertaineris-a-hard-workermysecuritycamerafrom-mnrackmazedyndns-blogis-a-bulls-fanwritesthisblogfreemyipsimple-urlfrom-sdreservdauthgear-stagingest-mon-blogueuris-into-gamesrice-labsxtooldevicesakurawebis-an-anarchistoraclecloudappsdyndns-worksells-for-urhcloudfrom-dcfastvps-serverwpmucdnis-a-geekscrysecfrom-txis-into-cartoonsmodelscapetrycloudflarelocaltonetstreak-linkbalena-devicesfrom-njforgeblocksfreebox-oswebadorsitefrom-ncdoesntexisthobby-sitestreaklinkshomesecuritymacownprovidertuleap-partnersdattorelaywphostedmailalpha-myqnapcloudservequakeis-a-socialistservehalflifepivohostingdynuhostingquipelementsw-staticblitzdyndns-webfrom-deproject-studyaliases121is-not-certifiedhercules-devis-a-financialadvisorservepicsis-a-greenloseyouripfrom-ilwithyoutubemwcloudnonprodwiredbladehostingdnsdojofrom-tnpixolinomyqnapcloudis-an-artisthostedpiis-a-landscaperauiusercontentoaiusercontenton-forgeis-a-conservativedreamhostersnet-freaksapps-1and1is-goneencoreapifastly-edgefrom-nesalesforcefrom-scdeployagentoraclegovcloudappsfrom-alis-a-lawyercechirevultrobjectsstufftoreadisa-geekddnsgeeklovableprojecttry-snowplowfrom-moblogsyteis-a-bookkeepernogmyforumravendbmyboxdeelementoredsaacficogoorinforgcomgobnatneteduidstoreorgcomnetintedudevnomepublorgcomneteduathgovtestscalculatorspaynowinfoquizzesresearchedcloudnsfunnelsassessmentsjscaleforcetmacltdorgmilcompronetgovbizpresseklogesrsccloudcustomfltusrcloude4corealmgovmunicontentproxy9metacentrumdyndyndyndnsdynpagespages-researchitionoccustomercomymyspreadshopdiskussionsbereich4limacomrub2ixfirewall-gatewayddnssspdnsbarsykeymachinesquare7myhome-serverspeedpartnercommunity-proschuldockxenonconnectg\xFCnstigliefernbwcloud-os-instancedyndnssecmy-routerxn--gnstigliefern-wobin-butterl-o-g-i-nisteingeekin-dslin-berlinin-brbfuettertdasnetzleitungsenin-vpnlcube-serverdyn-ip24logoipdyn-berlinruhr-uni-bochum12hpgoipsrvdnsfruskygit-repossvn-reposinternet-dnsg\xFCnstigbestellenhome-webserverxn--gnstigbestellen-zvbbplacedheimdnscosidnswebspaceconfiglima-citydyndns1istmeinvirtualuserschulplattformmy-gatewayddnsseclebtimnetztest-iservmein-iservvirtual-useriservschuletaifun-dnstraeumtgeradeschulserverdynamisches-dns123webseitednshomehs-heilbronndnsupdaterbssgraphicdwadpdwdaepeweaawapaafpfwfabwbpbacwcpcciwebuserapiobjectsidsiskospockkimodorikerbonesteamsparisjanewaypicardglobaltarpitreedpikekiraworfsulukirkarchertuckerhackercanarywesleystagingprereleaset3r2lpbravepanelngrokiservstglclcrmerpflypagesbarsyvivenushoplocalcertlocalplayerbearbloggatewaydeno-stagingis-not-ais-a-goodbotdashvercelmocha-sandboxplatter-appreplitgithubpreviewworkersinbrowserevervaultdetais-ahrsndenoxmitmodxmyaddrstorageapipayloadgrebedocruncontainersstgstagelclstageloginlineis-a-fullstackleapcellngrok-freeis-coolstoragewebharemediatechlibp2pdiscourseimaginecomyspreadshopstoreregbiz123hjemmesidefirmcoorgcomnetedugovsldorgmilcomwebgobartnetedugovtmorgpolcomsocartnetedugovassoagrondiscoodontk12medcuegyecpaabgengorgmilgalsaltulcomadmesmgobpubdocmonfindgnriouioproartlatvetnetfotedulojgovntrturibrbarxxxofficialbasechefprofmktgpsictechinfoarqtcontdentrrpppsiqgit-pagesritmedfieorgcomlibprieduaipgovriikmeactvsportorgmilcomscieunnetedugovnameinfopintouchtawktotawkmyspreadshoporgcomnomgobedu123miwebcomputeorgcomnetedugovbiznameinfocognito-idpeusc-de-east-1onjelasticnxaspdnsbarsydirectwpdeuxfleurstransurldogadoprvwcloudnsamazonwebservicesdnshomeuserpartycokoobinmkmstorjfidemopaasdymyspreadshopalandkapsiikixn--hkkinen-5wacloudplatformdatacenterh\xE4kkinen123kotisivuidacorgmilcompronetedugovbiznameinforadioorgcomneteduuserexperts-comptablestmmyspreadshopgretaprdcomnomynhccifbxoshuissier-justicenotairesaeroportfreeboxoson-webavocatassoportgouvkdnschirurgiens-dentistes-en-franceavouesfbx-os123sitewebveterinairechirurgiens-dentistespharmacienchambagrimedecinfreebox-osdediboxgoupilemszicpyicpvicppleysheezypagesedugovcnpyorgcompvtnetedugovschooldaemond6atcopanelorgnetplybotdashstackitkaasorgmilcomnetedugovbizmodltdorgcomedugovcoorgcomneteduappwriteacorgcomnetedugovcloudtranslateusercontentorgcomnetedumobiassoorgcomnetedugovbarsysimplesitediscourseindorgmilcomgobneteduorgcomwebnetedugovguaminfonxhra\u6559\u80B2\u654E\u80B2\u7DB2\u7D61\u7F51\u7D61\u7EC4\u7E54\u7D44\u7E54\u7F51\u7EDC\u7DB2\u7EDC\u7EC4\u7EC7\u7D44\u7EC7\u516C\u53F8\u653F\u5E9C\u500B\u4EBA\u4E2A\u4EBA\u7B87\u4EBAltdorgcomincneteduidvgovxn--uc0ay4axn--55qx5dxn--mk0axixn--io0a7ixn--uc0atvxn--zf0avxxn--lcvr32dxn--od0algxn--wcvs22dxn--gmqw5axn--od0aq3bxn--mxtq1mxn--ciqpnxn--tn0agxn--gmq050iorgmilcomgobneteduiservwp2tempurlmircloudfreesitewpmudevmyfastgadgetcloudaccessjelehalfboltfastvpsemergenteasypanelopencraftizcombrendlynamefromrtpersoadultmedorgpolrelcomproartnetedufirminfoassoshopcoopgouvtmcomediahotelforumvideosportorgsexagrargameslakaseroticaerotikatozsdereklamcasino2000filmsuliinfoboltshopprivnewsszexcityutazasjogaszkonyveloingatlaneacaicogoormy\u1B29\u1B2E\u1B36milwebschnetkopbizzonedesaponpesxn--9tfkymyspreadshopgovmytabittabitorderravpageaccok12idforgnetgovmuniltdplcaccotttvorgcomnetmeca6g5gpgamacaicniocoukuptverdruscsdelhiindorgmilcomwebnicfingenpronetintedugovresbizbiharbarsyinternetbusinesstravelsupabasegujaratfirminfopostbankcoopindevscloudnsno-ipbarsybarrell-of-knowledgebarrel-of-knowledgensupdategroks-thisdnsupdatefor-ourknowsitalldvrcammittwalddynamic-dnsv-infowebhopselfipdyndnshere-for-moreilovecollegemayfirstforumzcloudnsmittwaldservertypo3servergroks-theeusekd1uk0cdndyndnsidrawsainaueuapjpusstagemocksysdevicesclientcustreservdcustdevdisrecprodtestingcobeebyteutwenteboxfusebravepstmndedynngrokorgmilcomnomhzcnetedugovqcxqzzbarsythingdustmo-siemensrb-hostingprotonetfh-muenstergitbookbluebitecloudbeesusercontentnodeartkiloappsforgerockdarklangresinstagingapigeebubbleb-datascryptedhypernodedappnodepantheonsitegitlabgithubkeeneticvirtualservercleverappshostyhostingon-rioedugitticketstelebiton-acornwixstudioon-k3sicp0icp12038jeleqotobigvlairbubbleappsmyaddrstolosmyrdbxwebflowdrive-platformbeagleboardhasura-applolipopdefinimavaporcloudmusicianwebflowtestazurecontainerresindevicereadthedocsloginlineeditorxmoonscalesandcatsbasicserverwebthingsbrowsersafetymarkbeebyteappbitbucketidaccovistablogorgschnetgovxn--mgba3a4f16axn--mgba3a4fraarvanedge\u0627\u064A\u0631\u0627\u0646\u0627\u06CC\u0631\u0627\u0646jclaspeziapdudcefegelemeperetevebacanatavaparasabgagfgogrgpgalclblimfmrmcbmbvbfclcmcvcrcpcchlimifibicivipirisimncnbnanenrnpntnnolomobocoaogorosopotoptvtatctbtmtltotpulunutpspapaqsvpvvvtvavvrtrsrprgrfrcrbrarorkrvstsssbscsmsispzczbzbozen-suedtirolmyspreadshopxn--bulsan-sdtirol-nsbxn--valledaoste-ebbtrentinoaltoadigetrentin-sued-tirolxn--forlcesena-c8axn--forl-cesena-fcbxn--bozen-sdtirol-2obtriestetrentinsuedtiroltrentino-s-tirollecceudineaostesienaparmaluccapaviagenoapaduaaostamonzaabruzzoternirietiturinmilanbozenlaziofermoleccocuneonuoropratola-speziavdataaligfvgpugmolcalcamlomumbsicpmnvenvaoedugovabrsarmaremrbastoslazibxosfirenzetrentinos\xFCdtirolval-d-aostavalle-aostamessinacremonaravennatoscanatrentin-suedtirolbolognacalabriaurbinopesarofriuli-v-giuliaogliastraxn--valle-aoste-ebblaquilaandriatranibarlettasyncloudtrentinosudtirolxn--valle-d-aoste-ehbaostavalleyvalled-aostatrentino-alto-adigevallee-d-aostexn--balsan-sdtirol-nsbpistoiasicilialucaniacataniaiserniaperugiabresciaveneziagorizialiguriaimperiabulsan-suedtirolbalsan-suedtirolbarlettatraniandriaxn--trentino-sdtirol-szbforl\xEC-cesenatuscanyvall\xE9e-d-aostemantovavall\xE9e-aostecasertapiemontevalleaostaval-daostafriulivgiuliatrevisoforli-cesenavall\xE9edaosteferrarapescaravald-aostatrentino-altoadigefriuli-vegiuliavallee-aostecarboniaiglesiastarantomediocampidanovalleedaostetrentinosud-tirolcampobassotrentins\xFCd-tiroltrentinos\xFCd-tirolmonzabrianzatrentino-s\xFCdtirolxn--trentino-sd-tirol-c3bpotenzacosenzavicenzaemiliaromagnavenicefrosinonemarchepordenonetrentinosued-tirolvaresemolisevall\xE9eaostefriuli-veneziagiuliabasilicatalatinaanconasavonaveronamodenaaquilabiellabolzano-altoadigepugliafoggiaumbriatrentino-stirolgenovapadovamateranovararagusapiacenzatrentinostirolvalleeaostetempio-olbiatrentinsudtirolmassa-carrarafriuliveneziagiuliatrentinosuedtirolandria-barletta-tranitrapanixn--cesenaforl-i8amaceratacaltanissettaascoli-picenobrindisicarraramassacagliaririmininapolivibo-valentiachietibulsan-sudtirolbalsan-sudtiroltrentino-a-adigebulsanbalsaniglesiascarboniamilanotorinoteramodell-ogliastraarezzotrentinoalto-adigerovigotrentovenetoiglesias-carboniatrentino-sud-tirolaltoadigereggio-emiliareggio-calabriasardegnatranibarlettaandriapiedmontxn--sdtirol-n2amedio-campidanotrentino-s\xFCd-tirolfriuli-vgiuliafriuli-ve-giuliaromeennaromapisa32-b16-b64-blodiastibarineencomonaplesforlicesenailiadboxosalessandriasicilytrani-barletta-andriaxn--trentin-sdtirol-7vbpesarourbinotrentinsued-tirolcesena-forliforl\xECcesenaemilia-romagnamonzaebrianzaxn--trentinsdtirol-nsbtrentinos-tiroltrentins\xFCdtirolvalledaostaolbia-tempiocampidanomediovibovalentiasassarivalle-daostalombardyfriulivegiuliareggioemiliamonzaedellabrianzaalto-adigevercellitrentin-sudtiroltraniandriabarlettatrentino-sudtirolascolipicenobozen-s\xFCdtirolfriulive-giuliaflorencevaldaostaxn--cesena-forl-mcbcarbonia-iglesiasaosta-valleycarrara-massadellogliastratrentinoa-adigexn--valleaoste-e7apesaro-urbinoxn--trentinosdtirol-7vbxn--trentin-sd-tirol-rzbxn--trentinsd-tirol-6vbtrani-andria-barlettatrentin-s\xFCd-tirolxn--trentinosd-tirol-rzbgrossetomonza-e-della-brianzas\xFCdtirolreggiocalabriatrentinoaadigetrentin-s\xFCdtirolfriuliv-giuliaverbaniacampaniatrentino-aadigefriulivenezia-giuliasardiniaandriabarlettatranibarletta-trani-andriacatanzarooristanourbino-pesarocesena-forl\xECvalle-d-aostacampidano-medio123homepagesiracusatempioolbiasuedtirollombardiaavellinocesenaforl\xECtrentinofriuli-venezia-giuliabozen-sudtirolandria-trani-barlettabulsan-s\xFCdtirolbalsan-s\xFCdtirolmonza-brianzabolzanotrentino-sued-tirolbellunosalernolivornocrotonesondriodnshometrentinsud-tirolmassacarraratrentin-sud-tiroltrentino-suedtirolviterbobergamocesenaforliolbiatempiopalermobeneventoagrigentoofcoorgnetfmaitvphdengorgmilcomschnetedugovperagrikanieasukehandachitatokaiaisaikonanoharuamaobuhigashiuraowariasahiinuyamatobishimaiwakurashitarainazawatoyonegamagorimihamatoyotataharakariyayatomioguchikomakimiyoshinishiotokonamekiyosuchiryutoyohashiokazakiisshikikasugaikotakiratoeianjotogofusosetohazutsushimashinshirotakahamanisshinshikatsuhekinantoyokawaichinomiyatoyoakeodateogataakitaikawakyowahonjoogayurihonjonoshirokamiokakatagamimitanegojomeyokotekosakadaisenkazunonikahohonjyomoriyoshimisatohappoukamikoanihachirogatahigashinarusesembokufujisatokitaakitaitayanagiowanitakkomutsutsurutahirosakigonoheoirasetowadamisawanohejiaomorishingohiranairokunohehashikamitsugarushichinohehachinohenakadomarisannohekuroishisakaeisumiasahiotakiinzaiabikomatsudoyachiyomutsuzawakujukuriomigawakashiwatoganemihamanaritasakuranagaramobarahanamigawachoshishiroichoseikozakishisuikatorimidorichonankyonanfuttsuonjukufunabashinagareyamanodasosatakochuotohnoshourayasukimitsuyokaichibayotsukaidosodegauratateyamakamagayayokoshibahikariyachimatakatsuuratomisatokisarazukamogawaichikawanarashinoichinomiyashimofusaminamibososhirakoichiharaoamishirasatoikatahonaiainansaijoseiyoiyoozuuwajimaniihamanamikatamasakiuchikokihokutobetoonshikokuchuomatsuyamaimabarikamijimakumakogenyawatahamamatsunosabaeikedaobamasakaifukuiohionotsurugamihamawakasaminamiechizeneiheijikatsuyamatakahamaechizensoedaukihaomutaokawanishiogoribuzenonojosueumiokiotochikugosasagurisaigawamizumakishinyoshitomikurumekurateyamadakasuganakamamiyamanogatatakatahakataiizukakawaratagawakasuyaashiyainatsukimunakataminamitsuikishonaikurogifukuchikeisenhigashimiyakoshinguyukuhashiokagakiyamekogaongausuikahotohochuotoyotsumiyawakadazaifuhisayamatachiaraiyanagawanakagawahirokawachikujochikushinochikuhochikuzennamieotamaokumashowateneiiwakikoorinangoononishigoshimogoomotegomishimafukushimaasakawakagamiishishirakawaiitatefutabahiratayugawahanawakitakatakawamatakunimiyabukibandaihigashihironoyamatomiharuyamatsuriaizubangedatesomaaizuwakamatsuyanaizuaizumisatonishiaizuizumizakikitashiobarataishinkaneyamakoriyamainawashirotanagurafurudonosamegawasukagawaishikawatamakawaikedaogakitaruiginanenahashimahichisonakatsugawaibigawashirakawamizunamiminokamomitakekawauesekigaharatomikasakahogikitagatayamagatatajimianpachimotosuyaotsukakamigaharahidakanisekitokigujominogodoyorogifukasamatsutakayamawanouchihigashishirakawakasaharashimonitatsumagoichiyodakannakanrashowameiwakiryuotaoratomiokafujiokaitakuranaganoharahigashiagatsumatakasakishibukawaminakamikatashinatsukiyonokawabanumataannakaoizumimidorishintoisesakiuenoyoshiokakusatsutakayamanakanojonanmokutamamuratatebayashimaebashiotakekaitadaiwahongofuchukuietajimashobaramiharahatsukaichihigashihiroshimamiyoshikumanokurenakasakaseraseranishiasaminamifukuyamashinichionomichiosakikamijimajinsekikogentakeharaotobenanaeikedatohmaozoraobiraabirakyowaeniwataikibibaisharirebunerimohiroooketootarupippunishiokoppechitosefurubirahakodateshiranukakitahiroshimakushiroobihironanporoiwamizawaniikappukunneppufukushimanakasatsunaitoyourakuromatsunaiakabirakamisunagawashibechaurakawakamifuranonakatombetsuasahikawashimokawakayabeokoppebiratoriabashirisaromaatsumanumatahidakabifukamukawamikasahorokanaitoyotomisarufutsuhigashikawaishikarikitamiyoichiesashiiwanaitomariminamifuranoakkeshifuranotoyakoyakumootoineppushikaoishiraoinemuronayorohaboroashorobihororishirifujiutashinaihokutotakasuebetsuurausuassabukikonaishimamakinaiedatetoyabieinikiesanuryuoumuteshikagarikubetsuashibetsukimobetsuaibetsutobetsusobetsuembetsushimizuchippubetsurishirihokuryuhoronobeshintokutsubetsushibetsuhonbetsumombetsutsukigatakuriyamakoshimizushiriuchikutchanmurorannoboribetsukamishihorowassamushinshinotsukembuchiwakkanaikamoenaikiyosatotakinoueshikabesunagawafukagawanakagawatakikawakamikawahigashikagurahamatonbetsumatsumaemoseushirankoshishakotanimakanemashikeotofuketomakomaisandatambaitamiawajikasaiasagoshisoonoakoyashirotoyookaminamiawajiinagawafukusakitakasagokamigorikasugaharimayokawaashiyahimejiakashitaishiaogakisannantakinosumototakarazukanishinomiyashingugoshikinishiwakiyokatakaaioimikisayoyabukawanishiamagasakisasayamashinonsenkakogawaichikawakamikawatatsunotsukubaiwamaogawaasahisakaitokaioaraiitakobandodaigosuifuinaamikasumigaurakashimaomitamayachiyoshimodatetomobetoridehitachinakainashikisakuragawakasamayawaramoriyahitachiomiyanamegatayamagatahitachikamisuushikutakahagiibarakitonekoganakasowayukimihojosomitoryugasakishimotsumafujishirotsuchiurachikuseihitachiotashirosatotamatsukuriuchiharashikahakuinanaotsubatawajimakahokukawakitatsurugikaganominotosuzuuchinadakomatsuanamizunakanotohakusannonoichikanazawaiwateshiwafudaikawaimoriokaofunatohanamakikuzumakikitakamininohekunoheyamadayahabasumitaichinosekitanohatahiraizumirikuzentakatajobojiotsuchihironomiyakoiwaizumikarumaiichinohenodakujitonooshushizukuishifujisawamizusawakamaishikanegasakimannoutazukotohiraayagawazentsujihigashikagawauchinomikanonjisanukimarugamemitoyotakamatsutadotsunaoshimatonoshoakuneamamiizumihiokiyusuikinkoisasookouyamanakatanekagoshimakanoyaisenkawanabeminamitanemakurazakitarumizunishinoomotematsumotosatsumasendaioimatsudaayaseebinamiurazushinakaiodawaraiseharasagamiharahakoneaikawakaiseiatsugitsukuihadanoyamatoyamakitazamaoisochigasakininomiyayokosukakamakuraminamiashigarafujisawasamukawakiyokawahiratsukayugawaraokawaumajikochitsunootoyoakiinonishitosayasudahidakamiharasakawaniyodogawahigashitsunokagamigeiseisusakiotsukinaharisukumomurototosakamiochitoyotosashimizumotoyamanankokunakamurakitagawayusuharaogunichoyoukiasoutoozugyokutoamakusamifunetakamoriyamagaminamataminamiogunikikuchisumotoyamatonagasumashikiaraokumamotokamiamakusanishiharayatsushiroayabeseikasakyoideineujinakagyokameokakyotangokyotanabekyotambaminamiyamashiroyamashinatanabeyawatawazukaminaminantanmiyazuhigashiyamafukuchiyamakitamukokamojoyokizumaizuruujitawaraoyamazakinagaokakyokumiyamakawagoeinabeshimameiwaasahitaikiudonoisetsukisosakikuwanamihamamiyamasuzukatamakimisuginabarikumanokomonominamiisewataraitobakiwatakikihotadomatsusakayokkaichikameyamaureshinoishinomakishichikashukuohirataiwaosakizaohigashimatsushimashikamaiwanumashibataogawaraonagawakawasakiseminemarumoriminamisanrikukakudamuratawakuyatomiyanatoriwataritagajomisatotomekamirifushiroishimatsushimayamamotoshiogamafurukawahyugaebinotsunosaitoayakushimanobeokakitauramiyazakitakazakigokaseshiibamimatashintomikunitomikitakatakobayashikawaminamitakaharukijotakanabemiyakonojonishimeranichinankitagawakadogawamorotsukakisofukushimaminamimakisakaeobuseikedaogawamiasaokayaasahiotakiotarichinoinaomichikumakomaganechikuhokukaruizawayasuokaooshikaikusakaminamiaikitogakushimatsukawakawakamitateshinatakamorikitaaikishiojirimiyadahakubaiizunaiijimaiiyamamiyotasuzakayasakatoguraookuwanagawaminowahirayayamagataminamiminowafujimiomachisakakitakaginaganonakanosakuhokomoronagisoshinanomachiwadauedaiidaharasuwatomiachiaokianankisosakunozawaonsenagematsutakayamashimosuwamatsumotoyamanouchinakagawamochizukiazuminotatsunoobamaomuraseihiunzenosetofutsuikichijiwanagasakiisahayahasamisaikaikawatanasasebohiradokuchinotsugototogitsutsushimashimabarashinkamigotomatsuurayamazoekashibaikomakawaitenrioyodosangokoryoudaojiikarugayamatokoriyamatenkawakatsuragikurotakikawakamimiyakemitsuetakatorikamikitayamayamatotakadahegurishinjokanmakisakuraitawaramotogoseoudanarasoniandokawanishishimoichihigashiyoshinokashiharashimokitayamanosegawayoshinomintsivorytopazsakuragehirnsumomoaseinetopalmail-boxmokurenyoitamuikaojiyagosensanjoaganomyokoseiroagaomishibataniigatanagaokamurakamiuonumayuzawakariwatagamitainaitsunanminamiuonumatochioyahikojoetsuseiroukamosadoizumozakitokamachiitoigawasekikawakashiwazakitsubamemitsukekokonoesaikiusukibeppuusahimeshimakunisakihasamataketatsukumihitaoitahijikusuyufukujukamitsuebungoonobungotakadaibaraniimibizentsuyamaokayamakasaokahayashimayakagemaniwaakaiwamisakishinjotamanotakahashikibichuowakesojanagishookumenannishiawakurakurashikiasakuchisetouchikagaminosatoshotomigusukunakagusukuyaeseizenaurumaiheyaaguniogiminanjokinminamidaitokitanakagusukuyonaguniokinawaishigakikunigamiurasoekadenataramahiraraginozataketomishimojizamamitonakiitomanhigashimotobuyonabarugushikamionnanahanagohaebarukumejimakitadaitonakijinnishiharayomitanginowantokashikiishikawaikedasuitaminohizuminishisakaikananabenodaitoosakasayamayaokishiwadatadaokakaizukatondabayashichihayaakasakakumatorikadomasayamahigashiosakashijonawatehirakatataishimisakitajirihannansennankatanotoyonominatosettsuhigashiyodogawaibarakinosekitachuohigashisumiyoshifujiiderakashiwaraizumiotsutoyonakamatsubaramoriguchiizumisanoshimamototakatsukineyagawahabikinotakaishikawachinaganoyoshinogarikamiminearitaouchiimarihizenogikashimaariakekiyamafukudomikitagatakitahataomachigenkaikanzakinishiaritakyuragisagataratosutakushiroishikaratsuhamatamakouhokukawagoeyoshidasatteogoseirumaasakaurawaogawaniizaomiyayoriiotakishikihonjooganohannohanyuinasaitamaokegawaarakawayoshikawayokozehasudasayamahidakafukayachichibuiwatsukiryokamiyoshimikamiizumifujimiwarabiranzanmiyoshiminanoyashiosakadosugitomisatohigashichichibutodasokakukiyonokazoshiraokakasukabekounosukawajimatsurugashimamiyashirokitamotohatoyamamoroyamahatogayakumagayakawaguchinagatorokamisatomatsubushinamegawatokigawakamikawafujiminohigashimatsuyamakoshigayatokorozawas3isk01isk02ryuohkoseikonanaishorittotakashimamaibarahikonetorahimenishiazaikokagamokotoyasuotsukusatsunagahamamoriyamatoyosatotakatsukinotogawaomihachimanhigashiomiakagiunnanizumogotsuamayatsukakakinokimatsuehamadamasudahikawahikimiokuizumoyasugiyakumomisatotamayuohdahigashiizumookinoshimanishinoshimatsuwanoshimaneshimadafujiedayoshidashimodagotembaiwataatamikosaiyaizuitoizumishimahaibaramakinoharaomaezakikawanehonkannamisusonohigashiizufukuroinumazukawazufujiaraishizuokahamamatsushimizuizunokunimatsuzakimorimachiminamiizunishiizukikugawakakegawafujikawafujinomiyaujiietsugaoyamayaitaohiranikkoashikagakuroisokanumasakurashioyakarasuyamamotegiichikaikaminokawatochigihagamokanogisanobatonasumibunasushiobaranishikatautsunomiyaiwafunemashikoshimotsukeohtawaratakanezawaitanokomatsushimatokushimaichibaminamiaizumiwajikikainanmiyoshinarutomimamugiananmatsushigesanagochishishikuinakagawamachidachiyodakomaefussainagitaitochofufuchuomeotahigashiyamatotoshimaokutamaaogashimakodairaedogawaarakawahachiojishinagawatachikawashibuyasuginamihinodekiyosesumidaoshimanerimamitakahamuraadachinakanomizuhobunkyomegurominatokoganeihigashikurumekokubunjihigashimurayamamusashimurayamatamakitahinochuokotokatsushikakouzushimaogasawaraakishimakunitachishinjukusetagayamusashinohachijoitabashiakirunohinoharachizunanbukotouramisasawakasayonagokogehinoyazutottorinichinansakaiminatokawaharaoyabetairainamiasahinantoimizufuchutakaokakurobeyamadajohanatoyamatonaminyuzenfunahashinakaniikawanamerikawaunazukitogahimiuozufukumitsutateyamakamiichiiwadearidayuasainamitaijikatsuragiaridagawatanabemihamahidakakainankiminomisatoshingushirahamakamitondayurakozakoyagobokitayamawakayamakudoyamahashimotokushimotokozagawahirogawakinokawanachikatsuurarsuseroeoishidasagaeoguniasahinagaitendonanyoobanazawanishikawasakataohkuratozawamikawamamurogawayamagatafunagatatakahatashonaishinjokahokuiideyuzakawanishitsuruokakaminoyamayamanobeshiratakamurayamanakayamakaneyamahigashineyonezawasakegawamitouubeyuuabushimonosekitabuseoshimatoyotaiwakunihikarishunannagatohagihofukudamatsutokuyamashowadoshitsurunanbukoshukaiminami-alpsnirasakikosugeotsukioshinohokutominobuyamanashifuefukichuokofuichikawamisatoyamanakakonakamichitabayamanishikatsuranarusawafujikawahayakawafujiyoshidafujikawaguchikouenohara\u9577\u91CE\u4EAC\u90FD\u5C90\u961C\u5927\u962A\u4E09\u91CD\u7FA4\u99AC\u5343\u8449\u6ECB\u8CC0\u4F50\u8CC0\u5948\u826Fadednelgaccogogror\u79CB\u7530\u611B\u77E5\u9AD8\u77E5\u57FC\u7389\u6C96\u7E04\u6803\u6728\u718A\u672C\u5CA9\u624B\u9752\u68EE\u5C71\u68A8\u65B0\u6F5F\u5CF6\u6839\u9CE5\u53D6\u9577\u5D0E\u9999\u5DDD\u5BAE\u57CE\u77F3\u5DDD\u5927\u5206\u5BAE\u5D0E\u8328\u57CE\u5C71\u53E3\u5175\u5EAB\u5C71\u5F62\u5FB3\u5CF6\u5E83\u5CF6\u798F\u5CF6\u798F\u5CA1\u5CA1\u5C71\u5BCC\u5C71\u9759\u5CA1\u611B\u5A9B\u798F\u4E95\u6771\u4EACxn--4it168dhatenadiaryxn--vgu402ckawaiishophatenablogcocottenamaste\u5317\u6D77\u9053penneehimeiwateversestabachibashigagonnagunmapermahaccaakitaosakauh-ohblushkochiaichifukuikuroncapooitigohyogotokyokyotopunyuthickcheap0t00g00j0mie2-ddaapyawjg0amfemsubxiiboomoobutchueekpgwrgrherskrboyrdyupperunderflierchipsmydnsheavyangryhippygirlyrulez\u795E\u5948\u5DDD\u9E7F\u5150\u5CF6\u548C\u6B4C\u5C71bambinaxn--nit225kokayamasaitamaxn--k7yn95exn--1lqs03nsapporoparasitelolipopmcxn--efvn9sniigatafukuokatokushimafukushimahiroshimakagoshimafakefurokinawaxn--8pvr4ucoolblogxn--0trq7p7nnkawasakinagasakimiyazakichilloutxn--8ltr62kxn--klty5xpeeweezombiecutegirlxn--rny31hxn--uuwu58axn--ntso0iqx3axn--djrs72d6uytoyamanikitanyantakagawamimozanagoyaboyfriendxn--2m4a15egreaterchowderegoismyamagatafashionstorexn--elqq16hxn--pssu33lsendaimiyagixn--rht27zpecoriaomorisaloonwatsonvivianxn--djty4knobushipigboatnaganopinokoxn--f6qx53asadistvelvetsecretxn--5js045dchicappayamanashiibarakidigickgirlfriendxn--1lqs71dmongolianxn--c3s14mxn--qqqt11mtochigixn--5rtq34kparallelo0o0mondkobesagabonadecaoitanarafoolkilldecimainhiholomosblokilociaoundopupugifutankcrapflopnooroopsmodsholyjeezstripperpepperbittershizuokaxn--rht3dkitakyushureadymadeicurusversusmatrixxn--rht61ehungryfloppygloomycrankyhandcraftedlittlestarxn--klt787dxn--kltx9awhitesnowsunnydaytottorilovepoptheshopbuyshopxn--5rtp49cxn--d5qv7z876cwebaccelxn--kbrq7oxn--4pvxsxn--1ctwolovesickkumamotocatfoodxn--tor131oyokohamawakayamatonkotsuxn--ehqz56nxn--uist22hxn--6btw5axn--kltp7dyamaguchifrenchkisspussycatxn--4it797kxn--uisz3gbabybluexn--zbx025dnetgamersxn--7t0a264ckanagawaxn--6orx2rishikawaxn--ntsq17ghalfmoonschoolbusjellybeanxn--mkru45iusercontentlolitapunkxn--32vp30hsakurastoragehokkaidoshimanecandypopbabymilksupersaleweblikeraindropbackdropwebsozaikikirarahateblodaynightmeneacsccogoormobiinfoaeusxxorgmilcomnetedugovorgcomnetedugovbizinfotmprdorgmilcomnomedugovassnotairespresseassocoopgouvveterinairemedecinpharmaciensorgnetedugovtraorgcomedurepgovmeneperekgacscaiiocogoitoresmshsseoulbusanulsandaeguc01milvkimmvchungnamjeonnamjeonbukeliv-dnsgyeonggijejueliv-cdnincheondaejeongangwongyeongbukgwangjuchungbukgyeongnameliv-apicoeduindorgcomembnetedugovorgmilcomnetedugovjcloudorgcomnetintedugovperbnrinfocooyorgcomnetedugovipfscanvamypepw3sstorachakeeneticjoinmcinbrowserdwebcyonnftstoragemyfritzaemewphlxachotelltdorgcomwebsocschngonetintedugrpgovassnomgacsccoorgnetedugovbizinfo123websiteidorgmilcomasnnetedugovconfidmedorgcomplcschnetedugovaccoorgnetgovpresstmassoirseproxaccosoundcasthoptocraftvp4c66orgnetedugovitsmcdirmyboxbarsyedgestacksynologylogintonohostwebhopdiskstationi234tcp4hoocgroknoipprivmydsddnsdnsforlohmustransipdscloudfilegear-sgbrasiliafilegearframerbarsybarsyonlinecoprdorgmilcomnomedugovinforgcomnetedugovnameacprorgcomartnetedugovpresseinfoassoinstgouvorgnycedugovbarsydscloudjuorgcomnetedugovminisiteaccoororgcomnetgovorgmilcompronetintedugovbizmuseumnameinfoaerocoopaccoorgcomnetintedugovbizcooporgcomgobneteduorgmilcomnetedugovbiznameaccoorgmilneteduadvgovcoorgcomnetaltgovforgotherhiskeeneticispmanagernomassoprod5476132eastasiacentraluswesteuropewestus2eastus2rucdnwest1-usfra1-desandboxjls-sto1jls-sto3jls-sto2aglobalabglobalsslmapprodfreetlsmaplon-1lon-2ny-1fr-1sg-1ny-2paassnwebpaashostingjelasticnordeste-idcsocuserpagescwebfileblobservicebuscoreatlricnjsjelasticwebsitestoragesezagbinruhuukjptsmyspreadshopmynetnameakamaiorigin-stagingfrom-codynv6cdn77serveblogadobeaemcloudhicamsprytdnsupno-ipownipde5ovhicpfirewall-gatewaysytesmypsxbarsyusgovcloudapimyamazemyradwebakamaihdsaveincloudfastlylbfrom-lasubsc-paysquare7in-the-bandblackbaudcdnhomelinuxoninfernoctfcloudservebbsdns-dynamiccloudfrontakamai-stagingipifonyham-radio-opsenseeringclickrisingcommunity-profrom-nylocalcertgrafana-devedgesuite-stagingcloudflareanycasteating-organicatlassian-devmydattofeste-iplocaltotorprojectknx-serveredgekeycloudflareglobalcloudyclustercasacamserveftpakamaized-stagingakamaiorigindns-cloudmyeffectboomlabotdashbuyshousestwmailhetemlazure-mobilein-dslthruhereredirectmedynuddnsbouncemesupabaseluyanicloudappakamaicloudfunctionsdebiannhlfanpgafanstatic-accessin-vpnmysynologymafeloappudohomeftptrafficmanagersiteleafseidatmemsetcloudflarecloudaccesskeyword-onazure-apiis-a-chefdoes-itgets-itwebhopselfiphomeipkicks-assedgesuitewindowsserver-ontunnelmolemydissentscrapper-sitecloudflarecnuni5srcfggffiobbzabcdenodynuopikddnsvpndnsakadnselastxkinghostvps-hostfastlyhomeunixazureedgeshopselectdontexistmyfritzcloudjiffyalwaysdatasells-itsquaresbroke-itazurefddattolocalat-band-campmeinforumfamilydsazurestaticappsdefinimabplaceddnsaliasdynaliasnow-dnsblogdnsroutingthecloudendofinternetdsmynasakamaiedgemymediapcadobeio-staticakamaiedge-stagingakamaihd-stagingddns-ipprivatizehealthinsurancelive-onkrellianschokokeksmassivegridmysecuritycamerarackmazeserveminecraftfrom-azis-a-geekakamaizedmoonscalecryptonomicoffice-on-theusgovtrafficmanageradobeioruntimeedgekey-stagingreserve-onlinechannelsdvrdnsdojousgovcloudappcdn77-sslapps-1and1podzoneazurewebsitesdynathomescaleforceyandexcloudvusercontentisa-geekcdn-edgescoaemalcesappwriteazimuthtlonarvonoticeablestorecomwebrecnetperotherfirminfoartslgdloncogoiltdorgmilcolcomplcschgenngonetedugovbiznamefirmmobiacincoorgmilcomnomwebgobnetintedubizinfocomyspreadshopdemongovtransurl123websitehosting-clusterkhplaycistrongsnesosvalerv\xE5lerxn--vler-qoaossandeheroysandeher\xF8yb\xF8boheroyher\xF8yxn--hery-iraxn--b-5gavalerb\xF8boxn--b-5gasandesandexn--hery-iraxn--vler-qoav\xE5lerh\xE5\xE5laahavaofsfvfhlolnlalrlhmfmtmahcostntbu\xE5strmreigersundmyspreadshopg\xE1ls\xE1eidsvolltingvollgildeskalflor\xF8vads\xF8vard\xF8vanylvenxn--bhccavuotna-k7astrandaxn--kvnangen-k0axn--sknland-fxaxn--mosjen-eyarakkestadhyllestadnannestadvevelstadvaapstenordre-landsondre-lands\xF8ndre-landxn--vrggt-xqads\xF8r-aurdalsor-aurdalheradstordmoldefordef\xF8rdeseljefedjeryggehemnexn--krehamn-dxasognegranes\xF8gnebrynetjomevallebykletokkegiskedovretj\xF8mehob\xF8lvoldasaudatolgas\xF8mnaviknad\xF8nnasomnadonnatranafrananesnaraumasmolatr\xE6nafr\xE6nalesjasm\xF8la\xF8rstaorstahitrafloraaukraloppafr\xF8yarissasnasahalsagalsaromsaraisar\xE1isafroyasn\xE5sagronghobolfjelltydal\xE5rdalardalaskimharamkraanghkekr\xE5anghkesorumbarumhurumb\xE6rums\xF8rummodums\xE1l\xE1tb\xE1l\xE1tfrognbjugnv\xE5ganvagangulenskienl\xF8tenlotenstrynvefsnxn--merker-kuaskaunsveiob\xF8mlobomloskj\xE5kvardoflorovadsosalatbalats\xE1latkl\xE6buklabuselbubarduulvikskjakkleppris\xF8rxn--nttery-byaefl\xE5eidflahofmilgolholsellomskifetvikdepvgsfhsaskerrisorhamarasnes\xE5snesr\xF8rosrorosxn--slat-5namasoynaroyvaroyluroydyroyaskoyradoyandoyrodoymeloyrad\xF8yand\xF8yr\xF8d\xF8ymel\xF8yask\xF8ylur\xF8ydyr\xF8ym\xE5s\xF8yv\xE6r\xF8yn\xE6r\xF8yhoylandeth\xF8ylandetdivtasvuodnal\xF8renskoglorenskognesoddtangenxn--tjme-hraxn--smla-hraxn--stjrdal-s1aunjargalillehammerunj\xE1rgadavvenjargaxn--bearalvhki-y4a123hjemmesidegjerdrumxn--brnnysund-m8acxn--tnsberg-q1axn--mlatvuopmi-s4axn--snsa-roaxn--skierv-utaxn--brum-voatysfjordkvafjordeidfjordkv\xE6fjordsongdalenmjondalenmj\xF8ndalenxn--gls-elackragerog\xE1\u014Bgaviikagangaviikas\xF8rreisasorreisas\xF8r-varangersor-varangerxn--risr-iraskiervaxn--frna-woaxn--trna-woakvinesdalleksvikleirvikr\xF8yrvikroyrviksvelvikvenneslaevje-og-hornnessandnessj\xF8enmarnardalvindafjordsandefjordenebakksnillfjordullensvangxn--trany-yuabr\xF8nn\xF8ysundnamsskoganaustevollxn--stjrdalshalsen-sqbnord-aurdalnord-frontr\xF8gstadtrogstadgrimstadflakstadgjerstadxn--sandy-yuaxn--leagaviika-52bnore-og-uvdalvegarsheixn--rlingen-mxaxn--ggaviika-8ya47hveg\xE5rsheikarlsoykvitsoymasfjordenhamaroyinderoyosteroydavvenj\xE1rgasauheradguovdageaidnuxn--vre-eiker-k8abronnoysiellakkr\xF8dsheradkrodsheradkvinnheradbr\xF8nn\xF8yxn--mtta-vrjjat-k7afxn--lrenskog-54akvits\xF8yv\xE1rgg\xE1toster\xF8yinder\xF8ybronnoysundxn--aurskog-hland-jnbbahccavuotnab\xE1hccavuotnagiehtavuoatnastor-elvdalmidtre-gauldalxn--gildeskl-g0akarasjokevenassixn--bievt-0qaxn--yer-znaaudnedalnlebesbynessebyxn--hbmer-xqamalselvm\xE5lselvxn--unjrga-rtam\xF8re-og-romsdalmore-og-romsdalhareidmeland\xF8rlandorlandstrand\xE5lg\xE5rdsolundalgardafjord\xE5fjorddielddanuorrikautokeinoxn--stre-toten-zcbskodjeaejriestangeliernebamblestokkefauskesn\xE5asesnaasekongsvingerlangevagberlevagxn--flor-jrahattfjelldalostre-toten\xF8stre-totenvestfoldxn--mely-ira\xE1laheadjualaheadjunordreisaxn--troms-zuaxn--lgrd-poacporsangerflatangerstavangerleikangerbremangersamnangerkarasjohkaxn--rdy-0nabfrostautsirasnoasatromsaxn--sr-aurdal-l8aflekkefjordj\xF8lsterjolsteraremarkhedmarkn\xE5\xE5mesjevuemienaamesjevuemiexn--vard-jrarollagmer\xE5kermerakerorskog\xF8rskogxn--bdddj-mrabd\xE1k\u014Boluoktaxn--osyro-wuaaknoluoktatrysilskjerv\xF8ymandaljondalbindalrindalmeldalsuldalorkdalsigdalalvdall\xE6rdalhurdalsirdalverdallerdallardaloppdal\xE5seralaseralhadselkrager\xF8divttasvuotnaoverhallasteinkjerxn--hnefoss-q1askedsmokorsettroms\xF8xn--dyry-iravestre-totenmuseumxn--sandnessjen-ogbrahkkeravjufylkesbiblb\xE1jddarbajddarxn--laheadju-7yarennes\xF8yxn--koluokta-7ya57hxn--hgebostad-g3aleirfjordstorfjordbalsfjordb\xE5tsfjordbatsfjordmuos\xE1tbiev\xE1tloab\xE1tk\xE1r\xE1\u0161johkan\xF8tter\xF8yxn--mjndalen-64anordkappl\xE1hppilahppialstahaugsiljanverranr\xF8ykenroykenhaldenlyngenbergenhortenh\xF8nefosshonefosstroandinbeiarnvarggatosoyroos\xF8yrotromsoidrettmuosatbievatruovatloabatvoagattynsetnessetxn--indery-fyask\xE1nitskanitraholtr\xE5holtxn--ystre-slidre-ujbandebusarpsborgbearduhordalandjorpelandj\xF8rpelanddeatnuringsakers\xF8r-odalsor-odalxn--slt-elabringerikenittedalnissedalhemsedalslattumsurnadalxn--blt-elabelverumstj\xF8rdalnaustdalhjartdalgj\xF8vikfyresdalhasviknarviklarvikgjovikmalvikgamviklenvikporsgrunnstjordalengerdaldrobakdr\xF8bakxn--msy-ula0hvestvagoyxn--vgan-qoaxn--ryken-vuaxn--lten-graxn--stfold-9xaxn--hpmir-xqaxn--lury-iram\xE1latvuopmimalatvuopmitysv\xE6rkirkenesbirkenesmoskenesb\xE1id\xE1rxn--fjord-lraxn--rdal-poabahcavuotnab\xE1hcavuotnaxn--frde-gralind\xE5sbearalvahkixn--hobl-irar\xE1hkker\xE1vjuxn--loabt-0qav\xE5g\xE5\xE1lt\xE1bod\xF8sundlundrader\xE5deetnetimeholeauregrueoddavagavegaranatanaarnasolasulaaltalekafusavangbergkvam\xE5mliamlifreibokntinnroangranosenoslobodor\xF8stroststat\xE5motamotivgupriv\xF8yeroyerliermossvossxn--nvuotna-hwalusterlunnermarkerh\xE1bmerhabmerhvalerfjalerxn--rholt-mratysvarbaidarfitjargaularh\xE1pmirhapmirmelhusfosnes\xF8ksnesoksnestysneshemnesevenesflesbergeidsbergtonsbergt\xF8nsberglindasxn--sndre-land-0cbnamsosxn--srum-gra\xF8ystre-slidreoystre-slidrevestre-slidretrondheimbalestrandxn--langevg-jxaaustrheimxn--skjk-soavagsoyaveroysandoykarmoyfinnoytranoyvestbytranbysykkylvenxn--hyanger-q1aspjelkavikandasuoloxn--fl-ziaxn--drbak-wuastathellexn--sr-varanger-ggbtelemarkxn--bhcavuotna-s4axn--porsgu-sta26f\u010D\xE1hcesuolocahcesuoloakrehamn\xE5krehamnsand\xF8ykarm\xF8yfinn\xF8ytran\xF8yv\xE5gs\xF8yaver\xF8ynamdalseidxn--lesund-huabadaddjaxn--vegrshei-c0axn--btsfjord-9zagildesk\xE5lporsanguxn--trgstad-r1an\xE1vuotnanavuotnahammerfestxn--sgne-graxn--brnny-wuacibestadharstadnarviikaeven\xE1\u0161\u0161ivestnesgjemnessandnesagdenesrennesoyxn--avery-yuaxn--tysvr-vrabearalv\xE1hkikongsbergspydebergrandabergxn--andy-iradavvesiidaxn--krdsherad-m8apors\xE1\u014Bgufredrikstadbjerkreimringeburennebuaurskog-holandnotteroyxn--vgsy-qoa0jxn--rmskog-byaskierv\xE1ivelandbyglandfrolandaurlandforsandxn--bjddar-ptamidsund\xE5lesundalesundfetsundfarsundovre-eiker\xF8vre-eikerakershusxn--moreke-juas\xF8rfold\xF8stfoldostfoldsorfoldh\xF8yangerhoyangerlevangerorkangertanangerxn--vestvgy-ixa6olillesandxn--rennesy-v1agranvinskjervoyxn--klbu-woalavagisxn--h-2faxn--ryrvik-byakafjordk\xE5fjordseljordfolkebiblxn--gjvik-wuajevnakerxn--kfjord-iuabudejjuxn--kranghke-b0axn--davvenjrga-y4axn--rland-uuaxn--ldingen-q1axn--mlselv-iuaxn--rady-iraxn--linds-prabrumunddalxn--ygarden-p1amo-i-ranaeidskogr\xF8mskogromskoghjelmelandxn--finny-yuaxn--sr-odal-q1axn--skjervy-v1aballangenkvanangenkv\xE6nangengratangenxn--hmmrfeasta-s4acvossevangenxn--rde-ulaxn--mli-tlaxn--ksnes-uuanordlandskanlandsk\xE5nlandsortlandfuoiskuxn--rros-graxn--hcesuolo-7ya35bxn--eveni-0qa01gagaivuotnag\xE1ivuotnaxn--seral-lradrammenmodalenmosjoenjan-mayentorskensteigengloppenxn--snes-poamatta-varjjatxn--sr-fron-q1aomasvuotnajessheimb\xE5d\xE5ddj\xE5xn--krager-gyaxn--kvfjord-nxaxn--asky-iraxn--snase-nraxn--bidr-5nacholt\xE5lenxn--vads-jraxn--jlster-byamosj\xF8enxn--rst-0nastavernxn--ostery-fyaxn--oppegrd-ixaxn--sknit-yqaxn--risa-5naoppeg\xE5rdskiptvetrendalenholtalenxn--mot-tlaxn--lhppi-xqaxn--holtlen-hxaxn--srreisa-q1akopervikxn--muost-0qaxn--bmlo-grahokksundkvalsundegersundxn--karmy-yuaullensakerxn--hylandet-54axn--kvitsy-fyaxn--bod-2nalangev\xE5gberlev\xE5gkristiansandxn--rsta-frahornindalstj\xF8rdalshalsenstjordalshalsensandnessjoenh\xE1mm\xE1rfeastaxn--lrdal-sras\xF8r-fronsor-fronnord-odalkristiansundm\xE1tta-v\xE1rjjatvestv\xE5g\xF8ynesoddennotoddenbuskerud\xF8ygardenoygardensalangenlavangenralingenr\xE6lingenlodingenl\xF8dingenlea\u014Bgaviikalaakesvuemieleangaviikaxn--srfold-byaaskvollxn--rskog-uuaxn--nry-yla5gxn--vry-yla5ghammarfeastaxn--rhkkervju-01afxn--givuotna-8yakommunekrokstadelvanedre-eikerhagebostadh\xE6gebostadxn--berlevg-jxakviteseidxn--s-1faxn--l-1faxn--nmesjevuemie-tcbafuosskomo\xE5rekemoarekexn--lt-liacxn--jrpeland-54asvalbardoppegardholmestrandtvedestrandsogndalsokndalarendalsunndalfolldalxn--krjohka-hwab49jlyngdaletnedalnorddalsaltdalgausdalskedsmovaksdalgjesdalstordalxn--frya-hraaarbortedrangedalxn--smna-graaurskog-h\xF8landxn--vg-yiabtjeldsundhaugesundlindesnesxn--mre-og-romsdal-qqbxn--dnna-gradynmerseineshacknetenterprisecloudmineaccomaorim\u0101oriorgmilcriiwigennetschoolhealthkiwigovtgeekxn--mori-qsacloudnsparliamentcomedorgcompronetedugovmuseumwebsitekinservicebarsywebsitebuildereerobookheimdnsleapcelleero-stagetechcrscsslorigingohomecdbedeeeiemesecabgngilnlalplchfisiincnnoroptatitmtltruauhulumkdkukskjplvtrgrfrkrhrusesismycynzcznetinteduassoososcloudstgbetaaezaeuhkusjshatenadiarycdn77hoptozaptois-a-knightmyftpno-ipjpnddnssdpdnsspdnsbarsysweetpepperis-a-bruinsfanis-very-sweetservegameis-a-soxfanhomelinuxcdn77-secureservebbsmisconfusedwebredirectblogsitefreedesktopcouchpotatofriestoolforgeaccesscamis-lostreadmyblogsmall-webfedorapeopleserveftpis-a-celticsfanmywirepotagertwmailin-dslsellsyourhomeread-booksfreeddnscable-modemis-savednflfanufcfanmlbfanstuff-4-saleendoftheinternetin-vpnmy-firewallhomeftpis-localis-a-chefboldlygoingnowherewebhopselfipkicks-assroxatunkcamdvrfedoraprojectgotdnsdvrdnsdyndnspubtlspimientahomeunixdontexistfedorainfracloudwmflabsfspagesbmoattachmentsteckidsfamilydsdnsaliasdynaliasnow-dnscloudnsdoomdnsduckdnsblogdnshomednsroutingthecloudendofinternetdsmynasip-dynamicpoivronhttpbinmyfirewallis-very-evilmysecuritycamerais-a-linux-userwmcloudis-a-geektuxfamilyis-a-candidatedoesntexistis-very-badhobby-sitegame-hostaltervistais-foundis-a-patsfandnsdojohepforgepodzonedynservcollegefanis-very-goodfrom-meis-very-niceisa-geeknerdpolacmedsldingorgcomnomgobabonetedupleskaemhlxmyboxrockyprvcydeuxfleurspdnscodebergheyflowstatichostorgmilcomnomgobneteduorgcomeduiorgmilcomngonetedugovcloudns1337ngrokacorggogfamcomwebgobnetedugokgopgkpgovgosbizpasaugumicsopozpapuwmwsrprusiskwpspkppspkmpspokeoiawsawifoumsdnskokwpmuppuppsppiwwiwoowuzswkzoschrzpisdnwzmiuwwitdpssewsseumigugimoirmpinbwinbwiihupporzgwgriwupowwskrwioswuozstarostwokonsulattmpccopruszkowmyspreadshopostrodakartuzyopolegminamediaustkazgorajgoraolawailawalomzawloclradombytomjaworznotargilubinkoninzagantorunkutnokepnonakloczestsopotsanokturekplockslasksklepzarowlukowmedaidgdaorgmilrelcomnomatmgsmartneteduelkgovwawsossexbiztgorysejnytychypomorzeboleslawiechomesklepsdscloudunicloudzakopanelegnicarawa-mazbydgoszczswidnikkrasnikwloclawekbielawamragowograjeworealestatebeskidykaszubymalopolskaprzeworskswiebodzinlecznadfirmaszkolawarmiagdyniamiastakazimierz-dolnymalborkswidnicadlugolekaostrolekapodlasieelblagtravelsimplesitezachpomormielecszczecinnieruchomosciwalbrzychlezajsklublinbedzinpoznanwielunmielnooleckostarachowicedkontopowiatwroclawrybniksuwalkileborkslupskgdanskostrowwlkptarnobrzegtourismwegrowkrakowglogowyou2pilanysamailwrocinfoagroautobeepshopprivlapypiszlodzcfolksecommerce-shopmazurypulawyskoczowrzeszowpomorskiezgierzkaliszolkuszlowiczostrowiecsosnowiecmazowszewodzislawbialowiezazgorzeleckatowicepabianicejelenia-gorawolominkarpaczsieradznowarudaczeladzkonskowolaskierniewiceswinoujscieturystykabieszczadycieszynketrzynolsztynbialystokbabia-goraprochowicewarszawastalowa-wolapolkowicegorlicegliwiceponiatowalimanowalubartowaugustowkobierzyceopocznognieznoszczytnokolobrzegshoparenapodhalebielskoklodzkostargardatwithplayitownnamecoorgnetedugovacorgcomproestnetedugovbiznameislaprofinforechtngrokmedaaaacacpaenglawjurbarbarsykeeneticavocatacctcloudnsorgcomsecplonetedugov123paginaweborgcomnetintedugovnomepublidkinbarsygovx443cloudnsorgmilcomnetedugovcooporgmilcomschnetedugovnamecomcannetlibassoaemclantmcontstoreorgcomnomrecwwwbarsyfirminfoshopartsstackitmyddnswebspacelima-cityacincooxorgedugovbarsybrendlyhbvpsvpsspectrumlandinghostingacppmordoviamcprecbgorgmilcomspbnetintedumsknovgovbirrasmcdirmytismircloudvladimirnalchikadygeyamarinepyatigorskmyjinobashkiriaeurodirvladikavkazna4ugroznykustanaikalmykiacldmaildagestaniranbuildcanvaliaravalwixdevelopmentappwritemigrationneedleverceldatabasestackitcodereplravendbonporterlovableaccoorgmilnetgovcoopmedorgcompubschnetedugovservicemecoorggovtvmedorgcomnetedugovinfoedgfacbmlonihkutwpsryxzbdtmacfhppmyspreadshopbrandpartiorgcomfhvpress123minsidaitcouldbeworlanbibkommunalforbundfhskiopsyskomvuxkomforbnaturbruksgymnloginlineorgcomnetedugovenscaledeuusentbotdaorgmilcomnetgovnowteleporthashbangplatformlovablebarsyshopwarebasehoplixbarsyonlinemsf5gitappgitpagecofigma-govcaffeinefigmacanvasoltstputerbarsysupportchatgptsquareomniweopensocialcpanelnotionnovecorewpsquaredpreviewjelecyonbyensrhtfastvpspieboxconvexjouwwebheyflowplatformshloginlinemadethissourcecraftclouderaorgorgcomartedugouvunivmeorgcomnetedugovsurveysstatichfheiyuxs4allprojectmyfastubervibehostapp-ionosdeployagentmecoorgcomschnetedugovbizcncostoreorgmilcomneteduembaixadaconsuladokiraranohoprincipesaotomeheliohobarsystorebaseshopwaresellfyabkhaziavologdamordoviapenzalenugsochinavoiexnetspbmsknovnorth-kazakhstanashgabadkareliaarmeniageorgiavladimirnalchikivanovobukharaadygeyakhakassiakalugakrasnodarjambylaktyubinsktroitskbryanskobninskkurganazerbaijanpokrovskbashkiriatselinogradvladikavkazmurmansktulatuvamangyshlaktashkentchimkentgroznykaragandatermezarkhangelskkustanaikalmykiabalashoveast-kazakhstankaracoldagestantogliattibarsyredorgcomgobedumirenknightpointaccoorgjelasticdiscoursecleverappsschacmiincogoornetonlineshopaccogoorgmilcomwebnicnetintedugovbiznametestcoorgmilcomnomnetedugovorangecloudpersoindorgcomfinnatnetgovensmincomtourismintlinfox0611oyaorgmilcomnetedugovquickconnectvpnplusnettprequalifymeaddrmyaddrntdllwadlnctvavdrk12orgmilpolbeltelcomwebgennetedutskkepgovbbsbiznameinfocoorgmilcompronetedugovbiznameinfobetter-thanworse-thansakurafromdyndnson-the-webmymailerorgmilurlcomneteduidvgovmydnsgameclubebizmeneacsccogotvorhotelmilmobiinfovodteiflgplkmsmsbcckhincndnvncoztltmkckppzpdprvcvkvlvcrkrkscxuzchernovtsyrivneyaltaodesavolynrovnolutskltdinforgcomnetedugovbizvinnicazhitomirternopilpoltavakropyvnytskyizaporizhzhiasevastopolsebastopoluzhgoroduzhhorodkharkovkharkivvinnytsiakhmelnytskyizaporizhzhecrimeaodessazhytomyrnikolaevcherkassydonetskluganskluhanskkirovogradivano-frankivskchernivtsikrymkievkyivlvivsumyzakarpattiamykolaivcherkasychernigovkhersonchernihivdnipropetrovskdnepropetrovskkhmelnitskiyneacsccogoorusorgmilcomedugovvmdhmyspreadshopadimono-ipbarsybytemarkbarsyonlinelayershiftnh-servretrosnubapicampaignservicelugaffinitylotteryweeklylotteryraffleentrygluglugsmeaccoindependent-inquestnimsitecopropymntltdorgplcschnetgovnhsbarsyindependent-commissionindependent-reviewpolicepublic-inquiryindependent-panelconnhospindependent-inquiryroyal-commissionoraclegovcloudappscck12libccphxcclibpvtparochchtrcck12libcceatonk12coglibtecgendstmusann-arborwashtenawcck12glghcck12sealibforksolympiabainbridge-islkeyporthoquiamyarrow-pointcentraliaport-townsendsequimport-ludlowrentonsilverdalebremertonredmondsheltonbellevueport-orchardport-angeleskingstonchehalisaberdeengig-harborseattlepoulsboidmdndsddemenegacalamaiavawapailalflnmdcncscohnhmihiviwiriinmntnmocoutvtctmtgunjokakwvnvprarorasmskstxwynykyazisadninsnngosrvis-bymircloudservernamepointtoenscaledland-4-salefreeddnsstuff-4-saleazure-apinoipcloudnsgolffanheliohostazurewebsitesgvorgmilcomgubneteducoorgcomnetd0egvorgmilcomnetedugovmydnsiacostoree12orgmilcomnomwebgobbibrectecnetintedugovraremprendefirminfoartseducok12orgcomnethidnsidacaiiosonlahanamhanoicamauhueorgcompronetintedugovbizbacninhtayninhhoabinhnamdinhtravinhhaiphongvinhlonghaiduongquangnamquangtrithuathienhuequangninhbacgianghaugiangquangbinhsoctrangbentrethanhphohochiminhdanangkontumhatinhkhanhhoathanhhoahealthgialailaocaiyenbaibackanngheanlonganphuyenphuthocanthodaklakdongnainameinfovinhphucdongthapkiengiangtiengiangquangngailaichaulangsonlamdongdaknonghagiangangiangcaobangbinhduongninhthuanbinhthuanbaclieuthaibinhninhbinhbinhdinhtuyenquanghungyenbaria-vungtauthainguyendienbienbinhphuocschbizputerimagine-proxyorgcomnetedugovcloud66advisormypetsdyndnsxn--8dbq2axn--4dbgdty6cxn--5dbhl8dxn--hebda8bxn--80auxn--d1atxn--c1avgxn--o1acxn--o1achxn--90azhxn--55qx5dxn--uc0atvxn--od0algxn--wcvs22dxn--gmqw5axn--mxtq1mxn--12c1fe0brxn--h3cuzk1dixn--12co0c3b4evaxn--12cfi8ixb8lxn--o3cyx2axn--m3ch0j3axn--j1adpxn--90amcxn--90a1afxn--h1ahnxn--j1ael8bxn--h1alizxn--c1avgxn--j1aefxn--80aaa0cvacxn--41acaffeineexeopentunnelbotdashtelebitorgtmaccoagricorgmilnomwebnicngonetaltedugovlawnisschoolgrondaraccoorgmilcomschnetedugovbizinfoprg1-zeropstritonstackitlimazeropsaccoorgmilgov\u044F\u0441\u043F\u0431\u043E\u0440\u0433\u043A\u043E\u043C\u043C\u0441\u043A\u0431\u0438\u0437\u043C\u0438\u0440\u0441\u0430\u043C\u0430\u0440\u0430\u043A\u0440\u044B\u043C\u0441\u043E\u0447\u0438\u0430\u043A\u043E\u0434\u043F\u0440\u043E\u0440\u0433\u043E\u0431\u0440\u0443\u043F\u0440\u05E6\u05D4\u05DC\u05DE\u05DE\u05E9\u05DC\u05D9\u05E9\u05D5\u05D1\u05D0\u05E7\u05D3\u05DE\u05D9\u05D4\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08\u0E23\u0E31\u0E10\u0E1A\u0E32\u0E25\u0E28\u0E36\u0E01\u0E29\u0E32\u0E17\u0E2B\u0E32\u0E23\u0E40\u0E19\u0E47\u0E15\u6559\u80B2\u7DB2\u7D61\u7D44\u7E54\u516C\u53F8\u653F\u5E9C\u500B\u4EBA\uB2F7\uB137\uD55C\uAD6D\u6FB3\u95E8\u65B0\u95FB\u6FB3\u9580\u8054\u901A\u5BB6\u96FB\u5609\u91CC\u62DB\u8058\u901A\u8CA9\uB2F7\uCEF4\uC0BC\uC131\u30B3\u30E0\u10D2\u10D4\u0431\u0433\u0440\u0444\u0435\u044Eadcdbdgdidmdsdtdaebedeeegeiejekemenepereseveyegabacalamanauavapaqasazacfbfafgfnfpfwftfbgcgagggegkgngmgsgpgvgtgugilmlnlalclglplsltlhmimjmkmmmomambmcmdmfmgmzmpmsmtmgbbblbsbecccacnclcmcvctcscmhkhghchbhthphshlinikifigiaibicivisikninhnmncnbngnsnpnvntnjoionomobocoaofodorosotoptstttytatbtetgtithtmtltrusuvuaucueuguhulumunufjdjbjtjsjlkmkhkfkdkcktkukskpkgpmpnpkpjpgqaqmqiqsvtvcvbvmvlvrwpwtwzwbwcwawgwkwmwtrsrprgrfrercrbrarnrmrlrkrirhrwsusrssspsgsesbsaslsmsissxmxaxcxuypysylymykygybycyuztzsznzmzkzdzczbzaz\u03B5\u03BB\u03B5\u03C5\u4E16\u754C\u53F0\u7063\u8D2D\u7269\u516C\u76CA\u70B9\u770B\u81FA\u7063\u7F51\u7EDC\u66F8\u7C4D\u5728\u7EBF\u7F51\u7AD9\u624B\u673A\u673A\u6784\u5927\u62FF\u6E38\u620F\u4FE1\u606F\u53F0\u6E7E\u8C37\u6B4C\u6148\u5584\u5546\u6807\u9999\u6E2F\u4E2D\u56FD\u9910\u5385\u7F51\u5740\u4E2D\u570B\u5546\u57CE\u98DF\u54C1\u5FAE\u535A\u653F\u52A1\u79FB\u52A8\u96C6\u56E2\u516C\u53F8\u516B\u5366\u5546\u5E97\u5065\u5EB7\u7F51\u5E97\u653F\u5E9C\u65F6\u5C1A\u4F5B\u5C71\u4E2D\u4FE1\u5A31\u4E50\u5E7F\u4E1C\u4F01\u4E1Ahomedepotengineering\u0627\u0645\u0627\u0631\u0627\u062Arepublicankuokgroupversicherungchannelcitadelxn--pgbs0dhxn--b4w605ferdstatebankwebsitexn--mgb9awbf\u4E9A\u9A6C\u900A\u6DE1\u9A6C\u9521alibabaxn--ngbc5azdxn--mgbbh1axn--45br5cyltoshibabuildworldcloudtradeguideplacespacedancemoviephoneprimesmilebiblestyleappleazurestoreskypegripexn--l1accdrivelottehorsehouseleasechasereisestadahondaomegaaetnaamicaninjanokiamediadeltavodkaedekaosakapizzaslingemailgmailtirolshelltmallfinallegaltotalhotelamfamforumrehabmusicciticricohcoachwatchboschearthfaithirishmiamiarchidubaiguccipraxi\u307F\u3093\u306A\u30B9\u30C8\u30A2\u30BB\u30FC\u30EBcanonsalononionnikonepsonkoelngreensevencrownikanoradioaudioweiboglobopromogalloyahoociscorodeovideomangobingotokyovolvolottokyotophotosmartsportquesttrusthyattjetztadultcymrubaidutushuxn--kprw13dubankclickblackmerckgroupsharpcheapnowtvxn--h2brj9c\u05E7\u05D5\u05DD\u0570\u0561\u0575\u043E\u0440\u0433\u0441\u0440\u0431\u043C\u043E\u043D\u043A\u043E\u043C\u0431\u0435\u043B\u043C\u043A\u0434\u049B\u0430\u0437\u0440\u0443\u0441\u0443\u043A\u0440\u0645\u0635\u0631\u0642\u0637\u0631\u0639\u0631\u0628\u0643\u0648\u0645dadcfdmedwedredphdthdbidpidkrdmsdltdiceonewmeglemoerwecfageacbanbambaaaammakianraspacpaaxawtfbcgaegongingaigvigorgdogdhlmilrilonlaolloluoljllcalgalnflafltelsrlfrllplkimibmcamcombommomifmabbjcbscbcabnabtabmlbpubabcbbcnecincpncllcstcwtcpwcnyckfhbzhovhmoiskiobisbitcifyituipinvinwinxincbnbcnmanfangdnmenrenkpnmtnyunrunfununobiojioriohbogmofooboooooacoecoceongoproartistottnttbbtcateatlatvetpetbetnethktmitfitintjothotgotdotbotprueduicujnjyouinknhktdkappsapgapmapdnptopgopllpjmpzipvipripesqtrvdtvitvdevmovgovhivnrwlawsewnewbmwwownowhowdvrftrmtrsfrbarcartvscrseusawsupsubssbsadsddsldssasbmsmlsxxxboxfoxgmxtjxsextaxbuyflydiysoyjoyskypaydaygayxyzanzbizwebersenerpokerlameractortatarsolar\u0EA5\u0EB2\u0EA7\u0E04\u0E2D\u0E21\u0E44\u0E17\u0E22tourslocusnexuslexusgiftsbeatsboatspartspressglassswiss\u0915\u0949\u092E\u0928\u0947\u091Ftiresgivescodeshomesgamestunesshoescardswalesloansvegastoolsdealsautosparis\u30D5\u30A1\u30C3\u30B7\u30E7\u30F3workssucksrocksxeroxforexfedexpartylillymoneystudyrugbytoraytoday\u4E2D\u6587\u7F51xn--unup4y\u5929\u4E3B\u6559\u98DE\u5229\u6D66\u65B0\u52A0\u5761enterprises\u6211\u7231\u4F60\u5609\u91CC\u5927\u9152\u5E97christmasxn--fct429kholdingsxn--8y0a063axn--mgbx4cd0ablifestyleabogadoallstatenetbank\u0643\u0627\u062B\u0648\u0644\u064A\u0643xn--s9brj9cxn--gk3at1ebestbuycharityxn--55qx5dmicrosoftpropertybasketballhomegoodscorsicajewelrygallerygrocerysurgerycountrybrusselsverisignferreroxn--czr694bhdfcbankcommbanksoftbank\u067E\u0627\u0643\u0633\u062A\u0627\u0646\u067E\u0627\u06A9\u0633\u062A\u0627\u0646nextdirect\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0647\u0627\u0644\u0639\u0644\u064A\u0627\u0646xn--h2brj9c8cxn--80adxhksshikshaxn--mgbai9azgqp6jcuisinellabarclayscatholicxn--kpry57dcompanyxn--xhq521bblackfridayxn--mgba3a3ejtsandvikxn--d1acj3bacademydownload\u0645\u0644\u064A\u0633\u064A\u0627xn--j1amhxn--w4r85el8fhu5dnraipirangaathletaxn--fhbeixn--mgbqly7cvafrzuerichxn--c2br7g\u0B87\u0BB2\u0B99\u0BCD\u0B95\u0BC8contractorsxn--io0a7igraphicsinsurancetemasekxn--xkc2al3hye2amotorcyclesphotographydirectoryplumbingxn--vhquvclothingtrainingcleaningwilliamhilllightingxn--mgba3a4f16ashoppingcateringeducationokinawapicturesventuresproductionsxn--9et52uwalmart\u0D2D\u0D3E\u0D30\u0D24\u0D02supportrealestatecapitalonexn--nqv7fs00emaauspostfloristdentistxn--qxamgodaddybradescobargainsmitsubishikerryhotelsxn--9dbq2axn--3pxu8kimmobilienxn--fjq720axn--mgbtx2bholidaymckinseymadridbusinessbuildershelsinkixn--4gbrim\u043C\u043E\u0441\u043A\u0432\u0430\u0627\u0644\u0633\u0639\u0648\u062F\u06CC\u0629coffeedegreelacaixapartnersalsaceofficeabbvievoyageorangegeorgeonlinechromemobilekindlegoogleoraclecircleschulesecureinsurexn--mgba7c0bbn0aestatexn--mgbc0a9azcgcruisehangoutxn--vuq861bxn--42c2d9arexrothfirestoneuniversityxn--nnx388alifeinsuranceextraspace\u043E\u043D\u043B\u0430\u0439\u043Dverm\xF6gensberatersoftwarexn--fiqs8sxn--mgbab2bdxn--w4rs40ltienda\u092D\u093E\u0930\u0924\u092E\u094Dafricatoyotaotsukasakuracameracreditcardnagoyaconsultingnetworkjunipertheatermonsterprogressivepioneerxn--55qw42gracingdatingvotingvikinglivinggivingxn--bck1b9a5dre4cbrotherweatherjoburg\u0641\u0644\u0633\u0637\u064A\u0646lplfinancialxn--clchc0ea0b2g2a9gcdfutbolschoolsocialglobaldentalwoodsidechanelairtelmatteltravelrealtorwebcamstream\u0C2D\u0C3E\u0C30\u0C24\u0C4Dunicomalstomxn--nodexn--6frz82gmuseumfurniturexn--rvc1e0am3exn--mix891faccenturexn--11b4c3dismailineustardiscountquebeccomsecclinicservicesxn--y9a3aqxn--c1avgswatchchurchsearch\u0627\u0644\u0627\u0631\u062F\u0646marketingcontacthealthmonashshoujisanofitaipeiamericanexpresssuzuki\u30A2\u30DE\u30BE\u30F3\u30AF\u30E9\u30A6\u30C9\u30DD\u30A4\u30F3\u30C8bharti\u30B0\u30FC\u30B0\u30EBxn--mgberp4a5d4armemorialxn--1qqw23alondonmormoninstitutevisionbostonnortoncouponmaisonamazonvirginberlindesigndurbanolayannissananquanxihuanhitachikaufengardenreisenbayerntechnologydatsunxn--90a3aclatinocasinostudiophysioxn--ngbe9e0apharmacytattootaobaoaramcoexpertreportabbottdirectselectimamatfairwindspictettargetmarketintuittravelersinsurancecreditdupontryukyusuppliesxn--tckwebnpparibasschmidtmerckmsdyodobashirestaurantbridgestonecricketxn--fpcrj9c3dbostikbroadwayattorneylefrakemerckxn--fiq228c5hscareersfarmerswinnersflowersxn--wgbh1cguitarsxn--54b7fta0ccxn--p1acfmakeupgalluplandroverxn--kcrx77d1x4agoldpointbauhausxn--mgbayh7gpahiphopplaystationxn--mgba3a4fraxn--eckvdtc9dhyundaixn--gckr3f0fistanbulticketsmarketsflightschintaireviewsxn--3e0b707ewindowsxn--fiqz9sfinancialxn--fzys8d69uvgm\u0627\u0628\u0648\u0638\u0628\u064Adiscoverreview\u09AC\u09BE\u0982\u09B2\u09BExn--5su34j936bgsgmoscowobserverapartments\u0434\u0435\u0442\u0438\u0627\u0631\u0627\u0645\u0643\u0648\u0441\u0430\u0439\u0442eurovisionxn--i1b6b1a6a2exn--xkc2dl3a5ee0h\u062A\u0648\u0646\u0633\u0645\u0648\u0642\u0639\u0628\u0627\u0631\u062A\u0680\u0627\u0631\u062A\u0634\u0628\u0643\u0629\u0639\u0645\u0627\u0646\u0628\u064A\u062A\u0643\u0639\u0631\u0627\u0642readkredbondlandbandfundfoodprodgoldfordtubecafesafelifeggeeieeefreefagepagegugezonewinememenamegamesaleablebikenikelikecarecbreherefiresaveloveliveblueartedatesitevotecaseluxebofamodaltdaasdatiaayogasinavanashiaasiajavabbvatevavivadatazaraarpacasavisasncfprofmaifsurfgolfdvagsongbingpingwangkpmggoogblogpohlfailcooldellcalldeallidlsarlfilmteamroomfarmimdbarabclubhdfcicbchsbcgmbhrichtechfishdishcashminiernikddiaudiwikimobitaxicitikiwidesiqponskinloanakdnwienopenporncerntownimmolimoolloinfonicofidolegosaxozeroaerovivoautovotomotofastbestresthostpostnextlgbtchatseatgiftmeetdietreitmintrentgentspotscotguruitausohumenucyoubanklinkpinkdclktalksilkbookseekworkrsvpaarpjeepshopcoophelpcamppccwshowbeerstarruhrflirweirhaircarsparsjprshausplusnewstipstoysjobskidsfanspicsdocsxboxamexsexynavycitysonyarmyallybabyplaydeliverybuzzgbizlamborghiniphilips\u0DBD\u0D82\u0D9A\u0DCF\u0CAD\u0CBE\u0CB0\u0CA4fitnessexpresslanxesspfizercenterwalterlawyersoccercareerkosherbrokerlockerdealerdoctorauthorxn--mgbqly7c0a67fbcverm\xF6gensberatungjaguarxn--pssy2uxn--hxt814eflickrrepairrogersairbusxn--mgbai9a5eva00beventsyachtsxn--t60b56a\u09AD\u09BE\u09F0\u09A4\u09AD\u09BE\u09B0\u09A4\u092D\u093E\u0930\u0924\u092D\u093E\u0930\u094B\u0924viajeshermeshughesxn--j1aef\u0938\u0902\u0917\u0920\u0928villas\u0B2D\u0B3E\u0B30\u0B24claimshotels\u0AAD\u0ABE\u0AB0\u0AA4zapposphotosjuegoscondostatamotorsgratistennis\u0A2D\u0A3E\u0A30\u0A24tkmaxxtjmaxxschaeffleryandexxn--80aswgrealtysafetybeautyluxuryxn--3ds443gsupplyfamilyxn--o3cw4hhockeysydneyxn--90aenissayalipayenergycomputeragencyxn--rovu88b\u96FB\u8A0A\u76C8\u79D1xn--gecrj9cstatefarmaccountantaquarelleolayangroup\u9999\u683C\u91CC\u62C9xn--p1ai\u7EC4\u7EC7\u673A\u6784xn--1ck2e1bxn--mgbt3dhdschwarz\u0645\u0648\u0631\u064A\u062A\u0627\u0646\u064A\u0627abudhabinowruzkomatsufujitsuhospitalxn--80asehdbxn--mgbtf8flxn--j6w193gxn--yfro4i67oprudentialxn--flw351ecruisescoursesrecipesxn--e1a4cferrarixn--ses554gxn--wgbl6awatchesstaplessinglesxn--mgbcpq6gpa1axn--otu796dpropertiescreditunionxn--mgbah1a3hjkrdstockholmhisamitsu\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629stcgroupdomainsoriginscouponsbloombergclubmedfroganslimitedxn--80aqecdr1aexposedinternationalequipmentbarclaycardxn--q7ce6axn--mgbi4ecexpprotectionassociatesconstructionxn--cck2b3bxn--45q11candroidfoundation\u05D9\u05E9\u05E8\u05D0\u05DCxn--mgbca7dzdocliniqueboutiqueengineerxn--qxa6asystemsfirmdalefashionauctionxn--nqv7finfinitirentalsreliancetradingweddingfishinghostinggentingbookingcookingxn--3hcrj9cgraingerxn--czrs0tdemocratsamsungyokohamaxn--h2breg3evexn--nyqy26alundbeckmelbournevacationssolutionsfrontierxn--vermgensberatung-pwbmanagementxn--cg4bkixn--mgb2ddeslincolnhamburgsandvikcoromantblockbusterairforcebarefootxn--4dbrk0ceinvestmentsfeedbackcommunityxn--ngbrx\u0627\u0644\u0628\u062D\u0631\u064A\u0646diamondsamsterdamhealthcareredumbrellaxn--mxtq1mxn--2scrj9cagakhanxn--mgbpl2fh\u043A\u0430\u0442\u043E\u043B\u0438\u043Acaravan\u0B9A\u0BBF\u0B99\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0BC2\u0BB0\u0BCDrichardlimortgageamericanfamilyxn--fzc2c9e2cscholarshipssaarlandxn--imr513nvlaanderensamsclubgoodyearkitchen\u0B87\u0BA8\u0BCD\u0BA4\u0BBF\u0BAF\u0BBEweatherchannelallfinanzxn--kput3i\u0627\u0644\u0633\u0639\u0648\u062F\u06CC\u06C3xn--90aisxn--efvy88h\u0627\u0644\u062C\u0632\u0627\u0626\u0631xn--mgbaam7a8hexchangejpmorganxn--tiq49xqyjfidelitysecurityxn--mk1bu44cwanggouxn--fiq64bxn--6qq986b3xlxn--mgbbh1a71exn--80ao21amarshallsxn--5tzm5gtravelerspanasoniclatrobeyoutubeaccountantsxn--rhqv96gxn--cckwcxetdanalyticsxn--ygbi2ammx\u0628\u0627\u0632\u0627\u0631\u0628\u06BE\u0627\u0631\u062A\u0633\u0648\u0631\u064A\u0629organicfresenius\u0633\u0648\u0631\u064A\u0627xn--9krt00axn--qcka1pmcxn--jlq480n2rgdeloittesciencefinancexn--jvr189mxn--30rr7yhomesensehotmailbaseballfootballleclercboehringerxn--q9jyb4cxn--mix082f\u0627\u0644\u064A\u0645\u0646\u0647\u0645\u0631\u0627\u0647politie\u0633\u0648\u062F\u0627\u0646\u0627\u064A\u0631\u0627\u0646\u0627\u06CC\u0631\u0627\u0646netflixyamaxunxn--lgbbat1ad8jcollegestoragecapetowncolognekerrypropertiesxn--mgbgu82axn--ogbpf8flxn--czru2dwhoswhociprianilasallexn--g2xx48cforsalebanamexaudiblexn--vermgensberater-ctbxn--zfr164bericssonvanguardxn--45brj9cindustriestheatremarriottxn--3bst00mcomparexn--mgberp4a5d4a87gcapitaldigital\u0627\u0644\u0645\u063A\u0631\u0628barcelonashangrilaxn--d1alfcalvinkleinwwwcitysapporokawasakinagoyasendaikobekitakyushuyokohamackjp";
var rulesRoot = 621;
var exceptionsRoot = 625;

// node_modules/tldts/dist/es6/src/suffix-trie.js
var numberOfNodes = nodeFlags.length;
var numberOfEdges = edgeLength.length;
var edgeOffset = new Uint32Array(numberOfEdges);
var edgeHash = new Uint32Array(numberOfEdges);
var wildcardEdge = new Int32Array(numberOfNodes).fill(-1);
for (let node = 0, offset = 0; node < numberOfNodes; node += 1) {
  for (let edge = edgeStart[node]; edge < edgeStart[node + 1]; edge += 1) {
    edgeOffset[edge] = offset;
    const end = offset + edgeLength[edge];
    let hash = 5381;
    for (let i = end - 1; i >= offset; i -= 1) {
      hash = hash * 33 ^ labelText.charCodeAt(i);
    }
    edgeHash[edge] = hash >>> 0;
    if (edgeLength[edge] === 1 && labelText.charCodeAt(offset) === 42) {
      wildcardEdge[node] = edge;
    }
    offset = end;
  }
}
var matchNode = -1;
var matchStart = 0;
var matchEnd = 0;
function labelEquals(edge, hostname, start, length) {
  if (edgeLength[edge] !== length) {
    return false;
  }
  const offset = edgeOffset[edge];
  for (let i = 0; i < length; i += 1) {
    if (labelText.charCodeAt(offset + i) !== hostname.charCodeAt(start + i)) {
      return false;
    }
  }
  return true;
}
function findEdge(node, hash, hostname, start, length) {
  let lo = edgeStart[node];
  let hi = edgeStart[node + 1];
  while (lo < hi) {
    const mid = lo + hi >>> 1;
    const value = edgeHash[mid];
    if (value < hash) {
      lo = mid + 1;
    } else if (value > hash) {
      hi = mid;
    } else {
      for (let e = mid; e >= lo && edgeHash[e] === hash; e -= 1) {
        if (labelEquals(e, hostname, start, length))
          return e;
      }
      for (let e = mid + 1; e < hi && edgeHash[e] === hash; e += 1) {
        if (labelEquals(e, hostname, start, length))
          return e;
      }
      return -1;
    }
  }
  return -1;
}
function walk(hostname, root, allowedMask) {
  let node = root;
  let end = hostname.length;
  let hash = 5381;
  matchNode = -1;
  for (let i = hostname.length - 1; i >= 0; i -= 1) {
    const code = hostname.charCodeAt(i);
    if (code === 46) {
      const start = i + 1;
      let edge2 = findEdge(node, hash >>> 0, hostname, start, end - start);
      if (edge2 === -1) {
        edge2 = wildcardEdge[node];
      }
      if (edge2 === -1) {
        return matchNode !== -1;
      }
      node = edgeChild[edge2];
      if ((nodeFlags[node] & allowedMask) !== 0) {
        matchNode = node;
        matchStart = start;
        matchEnd = end;
      }
      end = i;
      hash = 5381;
    } else {
      hash = hash * 33 ^ code;
    }
  }
  let edge = findEdge(node, hash >>> 0, hostname, 0, end);
  if (edge === -1) {
    edge = wildcardEdge[node];
  }
  if (edge !== -1) {
    node = edgeChild[edge];
    if ((nodeFlags[node] & allowedMask) !== 0) {
      matchNode = node;
      matchStart = 0;
      matchEnd = end;
    }
  }
  return matchNode !== -1;
}
function suffixLookup(hostname, options, out) {
  if (fast_path_default(hostname, options, out)) {
    return;
  }
  const allowedMask = (options.allowPrivateDomains ? 2 : 0) | (options.allowIcannDomains ? 1 : 0);
  if (walk(hostname, exceptionsRoot, allowedMask)) {
    out.isIcann = (nodeFlags[matchNode] & 1) !== 0;
    out.isPrivate = (nodeFlags[matchNode] & 2) !== 0;
    out.publicSuffix = hostname.slice(matchEnd + 1);
    return;
  }
  if (walk(hostname, rulesRoot, allowedMask)) {
    out.isIcann = (nodeFlags[matchNode] & 1) !== 0;
    out.isPrivate = (nodeFlags[matchNode] & 2) !== 0;
    out.publicSuffix = hostname.slice(matchStart);
    return;
  }
  out.isIcann = false;
  out.isPrivate = false;
  const lastDot = hostname.lastIndexOf(".");
  out.publicSuffix = lastDot === -1 ? hostname : hostname.slice(lastDot + 1);
}

// node_modules/tldts/dist/es6/index.js
var RESULT = getEmptyResult();
function getDomain2(url, options) {
  resetResult(RESULT);
  return parseImpl(url, 3, suffixLookup, options, RESULT).domain;
}

// node_modules/tough-cookie/dist/index.js
function pathMatch(reqPath, cookiePath) {
  if (cookiePath === reqPath) {
    return true;
  }
  const idx = reqPath.indexOf(cookiePath);
  if (idx === 0) {
    if (cookiePath[cookiePath.length - 1] === "/") {
      return true;
    }
    if (reqPath.startsWith(cookiePath) && reqPath[cookiePath.length] === "/") {
      return true;
    }
  }
  return false;
}
var SPECIAL_USE_DOMAINS2 = ["local", "example", "invalid", "localhost", "test"];
var SPECIAL_TREATMENT_DOMAINS = ["localhost", "invalid"];
var defaultGetPublicSuffixOptions = {
  allowSpecialUseDomain: false,
  ignoreError: false
};
function getPublicSuffix(domain, options = {}) {
  options = { ...defaultGetPublicSuffixOptions, ...options };
  const domainParts = domain.split(".");
  const topLevelDomain = domainParts[domainParts.length - 1];
  const allowSpecialUseDomain = !!options.allowSpecialUseDomain;
  const ignoreError = !!options.ignoreError;
  if (allowSpecialUseDomain && topLevelDomain !== void 0 && SPECIAL_USE_DOMAINS2.includes(topLevelDomain)) {
    if (domainParts.length > 1) {
      const secondLevelDomain = domainParts[domainParts.length - 2];
      return `${secondLevelDomain}.${topLevelDomain}`;
    } else if (SPECIAL_TREATMENT_DOMAINS.includes(topLevelDomain)) {
      return topLevelDomain;
    }
  }
  if (!ignoreError && topLevelDomain !== void 0 && SPECIAL_USE_DOMAINS2.includes(topLevelDomain)) {
    throw new Error(
      `Cookie has domain set to the public suffix "${topLevelDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain: true, rejectPublicSuffixes: false}.`
    );
  }
  const publicSuffix = getDomain2(domain, {
    allowIcannDomains: true,
    allowPrivateDomains: true
  });
  if (publicSuffix) return publicSuffix;
}
function permuteDomain(domain, allowSpecialUseDomain) {
  const pubSuf = getPublicSuffix(domain, {
    allowSpecialUseDomain
  });
  if (!pubSuf) {
    return void 0;
  }
  if (pubSuf == domain) {
    return [domain];
  }
  if (domain.slice(-1) == ".") {
    domain = domain.slice(0, -1);
  }
  const prefix = domain.slice(0, -(pubSuf.length + 1));
  const parts = prefix.split(".").reverse();
  let cur = pubSuf;
  const permutations = [cur];
  while (parts.length) {
    const part = parts.shift();
    cur = `${part}.${cur}`;
    permutations.push(cur);
  }
  return permutations;
}
var Store = class {
  constructor() {
    this.synchronous = false;
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookie(_domain, _path, _key, _callback) {
    throw new Error("findCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookies(_domain, _path, _allowSpecialUseDomain = false, _callback) {
    throw new Error("findCookies is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  putCookie(_cookie, _callback) {
    throw new Error("putCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  updateCookie(_oldCookie, _newCookie, _callback) {
    throw new Error("updateCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookie(_domain, _path, _key, _callback) {
    throw new Error("removeCookie is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookies(_domain, _path, _callback) {
    throw new Error("removeCookies is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeAllCookies(_callback) {
    throw new Error("removeAllCookies is not implemented");
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getAllCookies(_callback) {
    throw new Error(
      "getAllCookies is not implemented (therefore jar cannot be serialized)"
    );
  }
};
var objectToString = (obj) => Object.prototype.toString.call(obj);
var safeArrayToString = (arr, seenArrays) => {
  if (typeof arr.join !== "function") return objectToString(arr);
  seenArrays.add(arr);
  const mapped = arr.map(
    (val) => val === null || val === void 0 || seenArrays.has(val) ? "" : safeToStringImpl(val, seenArrays)
  );
  return mapped.join();
};
var safeToStringImpl = (val, seenArrays = /* @__PURE__ */ new WeakSet()) => {
  if (typeof val !== "object" || val === null) {
    return String(val);
  } else if (typeof val.toString === "function") {
    return Array.isArray(val) ? (
      // Arrays have a weird custom toString that we need to replicate
      safeArrayToString(val, seenArrays)
    ) : (
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      String(val)
    );
  } else {
    return objectToString(val);
  }
};
var safeToString = (val) => safeToStringImpl(val);
function createPromiseCallback(cb) {
  let callback;
  let resolve;
  let reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  if (typeof cb === "function") {
    callback = (err, result) => {
      try {
        if (err) cb(err);
        else cb(null, result);
      } catch (e) {
        reject(e instanceof Error ? e : new Error());
      }
    };
  } else {
    callback = (err, result) => {
      try {
        if (err) reject(err);
        else resolve(result);
      } catch (e) {
        reject(e instanceof Error ? e : new Error());
      }
    };
  }
  return {
    promise,
    callback,
    resolve: (value) => {
      callback(null, value);
      return promise;
    },
    reject: (error4) => {
      callback(error4);
      return promise;
    }
  };
}
function inOperator(k, o) {
  return k in o;
}
var MemoryCookieStore = class extends Store {
  /**
   * Create a new {@link MemoryCookieStore}.
   */
  constructor() {
    super();
    this.synchronous = true;
    this.idx = /* @__PURE__ */ Object.create(null);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookie(domain, path, key, callback) {
    const promiseCallback = createPromiseCallback(callback);
    if (domain == null || path == null || key == null) {
      return promiseCallback.resolve(void 0);
    }
    const result = this.idx[domain]?.[path]?.[key];
    return promiseCallback.resolve(result);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  findCookies(domain, path, allowSpecialUseDomain = false, callback) {
    if (typeof allowSpecialUseDomain === "function") {
      callback = allowSpecialUseDomain;
      allowSpecialUseDomain = true;
    }
    const results = [];
    const promiseCallback = createPromiseCallback(callback);
    if (!domain) {
      return promiseCallback.resolve([]);
    }
    let pathMatcher;
    if (!path) {
      pathMatcher = function matchAll(domainIndex) {
        for (const curPath in domainIndex) {
          const pathIndex = domainIndex[curPath];
          for (const key in pathIndex) {
            const value = pathIndex[key];
            if (value) {
              results.push(value);
            }
          }
        }
      };
    } else {
      pathMatcher = function matchRFC(domainIndex) {
        for (const cookiePath in domainIndex) {
          if (pathMatch(path, cookiePath)) {
            const pathIndex = domainIndex[cookiePath];
            for (const key in pathIndex) {
              const value = pathIndex[key];
              if (value) {
                results.push(value);
              }
            }
          }
        }
      };
    }
    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain];
    const idx = this.idx;
    domains.forEach((curDomain) => {
      const domainIndex = idx[curDomain];
      if (!domainIndex) {
        return;
      }
      pathMatcher(domainIndex);
    });
    return promiseCallback.resolve(results);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  putCookie(cookie2, callback) {
    const promiseCallback = createPromiseCallback(callback);
    const { domain, path, key } = cookie2;
    if (domain == null || path == null || key == null) {
      return promiseCallback.resolve(void 0);
    }
    const domainEntry = this.idx[domain] ?? /* @__PURE__ */ Object.create(null);
    this.idx[domain] = domainEntry;
    const pathEntry = domainEntry[path] ?? /* @__PURE__ */ Object.create(null);
    domainEntry[path] = pathEntry;
    pathEntry[key] = cookie2;
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  updateCookie(_oldCookie, newCookie, callback) {
    if (callback) this.putCookie(newCookie, callback);
    else return this.putCookie(newCookie);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookie(domain, path, key, callback) {
    const promiseCallback = createPromiseCallback(callback);
    delete this.idx[domain]?.[path]?.[key];
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeCookies(domain, path, callback) {
    const promiseCallback = createPromiseCallback(callback);
    const domainEntry = this.idx[domain];
    if (domainEntry) {
      if (path) {
        delete domainEntry[path];
      } else {
        delete this.idx[domain];
      }
    }
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  removeAllCookies(callback) {
    const promiseCallback = createPromiseCallback(callback);
    this.idx = /* @__PURE__ */ Object.create(null);
    return promiseCallback.resolve(void 0);
  }
  /**
   * @internal No doc because this is an overload that supports the implementation
   */
  getAllCookies(callback) {
    const promiseCallback = createPromiseCallback(callback);
    const cookies = [];
    const idx = this.idx;
    const domains = Object.keys(idx);
    domains.forEach((domain) => {
      const domainEntry = idx[domain] ?? {};
      const paths = Object.keys(domainEntry);
      paths.forEach((path) => {
        const pathEntry = domainEntry[path] ?? {};
        const keys = Object.keys(pathEntry);
        keys.forEach((key) => {
          const keyEntry = pathEntry[key];
          if (keyEntry != null) {
            cookies.push(keyEntry);
          }
        });
      });
    });
    cookies.sort((a, b) => {
      return (a.creationIndex || 0) - (b.creationIndex || 0);
    });
    return promiseCallback.resolve(cookies);
  }
};
function isNonEmptyString2(data) {
  return isString(data) && data !== "";
}
function isEmptyString(data) {
  return data === "" || data instanceof String && data.toString() === "";
}
function isString(data) {
  return typeof data === "string" || data instanceof String;
}
function isObject(data) {
  return objectToString(data) === "[object Object]";
}
function validate(bool, cbOrMessage, message4) {
  if (bool) return;
  const cb = typeof cbOrMessage === "function" ? cbOrMessage : void 0;
  let options = typeof cbOrMessage === "function" ? message4 : cbOrMessage;
  if (!isObject(options)) options = "[object Object]";
  const err = new ParameterError(safeToString(options));
  if (cb) cb(err);
  else throw err;
}
var ParameterError = class extends Error {
};
var version = "6.0.2";
var PrefixSecurityEnum = {
  SILENT: "silent",
  STRICT: "strict",
  DISABLED: "unsafe-disabled"
};
Object.freeze(PrefixSecurityEnum);
var IP_V6_REGEX = `
\\[?(?:
(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|
(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|
(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|
(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|
(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:))
)(?:%[0-9a-zA-Z]{1,})?\\]?
`.replace(/\s*\/\/.*$/gm, "").replace(/\n/g, "").trim();
var IP_V6_REGEX_OBJECT = new RegExp(`^${IP_V6_REGEX}$`);
var IP_V4_REGEX = `(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])`;
var IP_V4_REGEX_OBJECT = new RegExp(`^${IP_V4_REGEX}$`);
function domainToASCII(domain) {
  return new URL(`http://${domain}`).hostname;
}
function canonicalDomain(domainName) {
  if (domainName == null) {
    return void 0;
  }
  let str = domainName.trim().replace(/^\./, "");
  if (IP_V6_REGEX_OBJECT.test(str)) {
    if (!str.startsWith("[")) {
      str = "[" + str;
    }
    if (!str.endsWith("]")) {
      str = str + "]";
    }
    return domainToASCII(str).slice(1, -1);
  }
  if (/[^\u0001-\u007f]/.test(str)) {
    return domainToASCII(str);
  }
  return str.toLowerCase();
}
function formatDate(date) {
  return date.toUTCString();
}
function parseDate(cookieDate) {
  if (!cookieDate) {
    return void 0;
  }
  const flags2 = {
    foundTime: void 0,
    foundDayOfMonth: void 0,
    foundMonth: void 0,
    foundYear: void 0
  };
  const dateTokens = cookieDate.split(DELIMITER).filter((token) => token.length > 0);
  for (const dateToken of dateTokens) {
    if (flags2.foundTime === void 0) {
      const [, hours, minutes, seconds] = TIME.exec(dateToken) || [];
      if (hours != void 0 && minutes != void 0 && seconds != void 0) {
        const parsedHours = parseInt(hours, 10);
        const parsedMinutes = parseInt(minutes, 10);
        const parsedSeconds = parseInt(seconds, 10);
        if (!isNaN(parsedHours) && !isNaN(parsedMinutes) && !isNaN(parsedSeconds)) {
          flags2.foundTime = {
            hours: parsedHours,
            minutes: parsedMinutes,
            seconds: parsedSeconds
          };
          continue;
        }
      }
    }
    if (flags2.foundDayOfMonth === void 0 && DAY_OF_MONTH.test(dateToken)) {
      const dayOfMonth = parseInt(dateToken, 10);
      if (!isNaN(dayOfMonth)) {
        flags2.foundDayOfMonth = dayOfMonth;
        continue;
      }
    }
    if (flags2.foundMonth === void 0 && MONTH.test(dateToken)) {
      const month = months.indexOf(dateToken.substring(0, 3).toLowerCase());
      if (month >= 0 && month <= 11) {
        flags2.foundMonth = month;
        continue;
      }
    }
    if (flags2.foundYear === void 0 && YEAR.test(dateToken)) {
      const parsedYear = parseInt(dateToken, 10);
      if (!isNaN(parsedYear)) {
        flags2.foundYear = parsedYear;
        continue;
      }
    }
  }
  if (flags2.foundYear !== void 0 && flags2.foundYear >= 70 && flags2.foundYear <= 99) {
    flags2.foundYear += 1900;
  }
  if (flags2.foundYear !== void 0 && flags2.foundYear >= 0 && flags2.foundYear <= 69) {
    flags2.foundYear += 2e3;
  }
  if (flags2.foundDayOfMonth === void 0 || flags2.foundMonth === void 0 || flags2.foundYear === void 0 || flags2.foundTime === void 0) {
    return void 0;
  }
  if (flags2.foundDayOfMonth < 1 || flags2.foundDayOfMonth > 31) {
    return void 0;
  }
  if (flags2.foundYear < 1601) {
    return void 0;
  }
  if (flags2.foundTime.hours > 23) {
    return void 0;
  }
  if (flags2.foundTime.minutes > 59) {
    return void 0;
  }
  if (flags2.foundTime.seconds > 59) {
    return void 0;
  }
  const date = new Date(
    Date.UTC(
      flags2.foundYear,
      flags2.foundMonth,
      flags2.foundDayOfMonth,
      flags2.foundTime.hours,
      flags2.foundTime.minutes,
      flags2.foundTime.seconds
    )
  );
  if (date.getUTCFullYear() !== flags2.foundYear || date.getUTCMonth() !== flags2.foundMonth || date.getUTCDate() !== flags2.foundDayOfMonth) {
    return void 0;
  }
  return date;
}
var months = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
];
var DELIMITER = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/;
var TIME = /^(\d{1,2}):(\d{1,2}):(\d{1,2})(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/;
var DAY_OF_MONTH = /^[0-9]{1,2}(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/;
var MONTH = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\x00-\xFF]*$/i;
var YEAR = /^[\x30-\x39]{2,4}(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/;
var COOKIE_OCTETS = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/;
var PATH_VALUE = /[\x20-\x3A\x3C-\x7E]+/;
var CONTROL_CHARS2 = /[\x00-\x1F]/;
var TERMINATORS = ["\n", "\r", "\0"];
function trimTerminator(str) {
  if (isEmptyString(str)) return str;
  for (let t = 0; t < TERMINATORS.length; t++) {
    const terminator = TERMINATORS[t];
    const terminatorIdx = terminator ? str.indexOf(terminator) : -1;
    if (terminatorIdx !== -1) {
      str = str.slice(0, terminatorIdx);
    }
  }
  return str;
}
function parseCookiePair(cookiePair, looseMode) {
  cookiePair = trimTerminator(cookiePair);
  let firstEq = cookiePair.indexOf("=");
  if (looseMode) {
    if (firstEq === 0) {
      cookiePair = cookiePair.substring(1);
      firstEq = cookiePair.indexOf("=");
    }
  } else {
    if (firstEq <= 0) {
      return void 0;
    }
  }
  let cookieName, cookieValue;
  if (firstEq <= 0) {
    cookieName = "";
    cookieValue = cookiePair.trim();
  } else {
    cookieName = cookiePair.slice(0, firstEq).trim();
    cookieValue = cookiePair.slice(firstEq + 1).trim();
  }
  if (CONTROL_CHARS2.test(cookieName) || CONTROL_CHARS2.test(cookieValue)) {
    return void 0;
  }
  const c = new Cookie();
  c.key = cookieName;
  c.value = cookieValue;
  return c;
}
function parse(str, options) {
  if (isEmptyString(str) || !isString(str)) {
    return void 0;
  }
  str = str.trim();
  const firstSemi = str.indexOf(";");
  const cookiePair = firstSemi === -1 ? str : str.slice(0, firstSemi);
  const c = parseCookiePair(cookiePair, options?.loose ?? false);
  if (!c) {
    return void 0;
  }
  if (firstSemi === -1) {
    return c;
  }
  const unparsed = str.slice(firstSemi + 1).trim();
  if (unparsed.length === 0) {
    return c;
  }
  const cookie_avs = unparsed.split(";");
  while (cookie_avs.length) {
    const av = (cookie_avs.shift() ?? "").trim();
    if (av.length === 0) {
      continue;
    }
    const av_sep = av.indexOf("=");
    let av_key, av_value;
    if (av_sep === -1) {
      av_key = av;
      av_value = null;
    } else {
      av_key = av.slice(0, av_sep);
      av_value = av.slice(av_sep + 1);
    }
    av_key = av_key.trim().toLowerCase();
    if (av_value) {
      av_value = av_value.trim();
    }
    switch (av_key) {
      case "expires":
        if (av_value) {
          const exp = parseDate(av_value);
          if (exp) {
            c.expires = exp;
          }
        }
        break;
      case "max-age":
        if (av_value) {
          if (/^-?[0-9]+$/.test(av_value)) {
            const delta = parseInt(av_value, 10);
            c.setMaxAge(delta);
          }
        }
        break;
      case "domain":
        if (av_value) {
          const domain = av_value.trim().replace(/^\./, "");
          if (domain) {
            c.domain = domain.toLowerCase();
          }
        }
        break;
      case "path":
        c.path = av_value && av_value[0] === "/" ? av_value : null;
        break;
      case "secure":
        c.secure = true;
        break;
      case "httponly":
        c.httpOnly = true;
        break;
      case "samesite":
        switch (av_value ? av_value.toLowerCase() : "") {
          case "strict":
            c.sameSite = "strict";
            break;
          case "lax":
            c.sameSite = "lax";
            break;
          case "none":
            c.sameSite = "none";
            break;
          default:
            c.sameSite = void 0;
            break;
        }
        break;
      default:
        c.extensions = c.extensions || [];
        c.extensions.push(av);
        break;
    }
  }
  return c;
}
function fromJSON(str) {
  if (!str || isEmptyString(str)) {
    return void 0;
  }
  let obj;
  if (typeof str === "string") {
    try {
      obj = JSON.parse(str);
    } catch {
      return void 0;
    }
  } else {
    obj = str;
  }
  const c = new Cookie();
  Cookie.serializableProperties.forEach((prop) => {
    if (obj && typeof obj === "object" && inOperator(prop, obj)) {
      const val = obj[prop];
      if (val === void 0) {
        return;
      }
      if (inOperator(prop, cookieDefaults) && val === cookieDefaults[prop]) {
        return;
      }
      switch (prop) {
        case "key":
        case "value":
        case "sameSite":
          if (typeof val === "string") {
            c[prop] = val;
          }
          break;
        case "expires":
        case "creation":
        case "lastAccessed":
          if (typeof val === "number" || typeof val === "string" || val instanceof Date) {
            c[prop] = obj[prop] == "Infinity" ? "Infinity" : new Date(val);
          } else if (val === null) {
            c[prop] = null;
          }
          break;
        case "maxAge":
          if (typeof val === "number" || val === "Infinity" || val === "-Infinity") {
            c[prop] = val;
          }
          break;
        case "domain":
        case "path":
          if (typeof val === "string" || val === null) {
            c[prop] = val;
          }
          break;
        case "secure":
        case "httpOnly":
          if (typeof val === "boolean") {
            c[prop] = val;
          }
          break;
        case "extensions":
          if (Array.isArray(val) && val.every((item) => typeof item === "string")) {
            c[prop] = val;
          }
          break;
        case "hostOnly":
        case "pathIsDefault":
          if (typeof val === "boolean" || val === null) {
            c[prop] = val;
          }
          break;
      }
    }
  });
  return c;
}
var cookieDefaults = {
  // the order in which the RFC has them:
  key: "",
  value: "",
  expires: "Infinity",
  maxAge: null,
  domain: null,
  path: null,
  secure: false,
  httpOnly: false,
  extensions: null,
  // set by the CookieJar:
  hostOnly: null,
  pathIsDefault: null,
  creation: null,
  lastAccessed: null,
  sameSite: void 0
};
var _Cookie = class _Cookie2 {
  /**
   * Create a new Cookie instance.
   * @public
   * @param options - The attributes to set on the cookie
   */
  constructor(options = {}) {
    this.key = options.key ?? cookieDefaults.key;
    this.value = options.value ?? cookieDefaults.value;
    this.expires = options.expires ?? cookieDefaults.expires;
    this.maxAge = options.maxAge ?? cookieDefaults.maxAge;
    this.domain = options.domain ?? cookieDefaults.domain;
    this.path = options.path ?? cookieDefaults.path;
    this.secure = options.secure ?? cookieDefaults.secure;
    this.httpOnly = options.httpOnly ?? cookieDefaults.httpOnly;
    this.extensions = options.extensions ?? cookieDefaults.extensions;
    this.creation = options.creation ?? cookieDefaults.creation;
    this.hostOnly = options.hostOnly ?? cookieDefaults.hostOnly;
    this.pathIsDefault = options.pathIsDefault ?? cookieDefaults.pathIsDefault;
    this.lastAccessed = options.lastAccessed ?? cookieDefaults.lastAccessed;
    this.sameSite = options.sameSite ?? cookieDefaults.sameSite;
    this.creation = options.creation ?? /* @__PURE__ */ new Date();
    Object.defineProperty(this, "creationIndex", {
      configurable: false,
      enumerable: false,
      // important for assert.deepEqual checks
      writable: true,
      value: ++_Cookie2.cookiesCreated
    });
    this.creationIndex = _Cookie2.cookiesCreated;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    const now = Date.now();
    const hostOnly = this.hostOnly != null ? this.hostOnly.toString() : "?";
    const createAge = this.creation && this.creation !== "Infinity" ? `${String(now - this.creation.getTime())}ms` : "?";
    const accessAge = this.lastAccessed && this.lastAccessed !== "Infinity" ? `${String(now - this.lastAccessed.getTime())}ms` : "?";
    return `Cookie="${this.toString()}; hostOnly=${hostOnly}; aAge=${accessAge}; cAge=${createAge}"`;
  }
  /**
   * For convenience in using `JSON.stringify(cookie)`. Returns a plain-old Object that can be JSON-serialized.
   *
   * @remarks
   * - Any `Date` properties (such as {@link Cookie.expires}, {@link Cookie.creation}, and {@link Cookie.lastAccessed}) are exported in ISO format (`Date.toISOString()`).
   *
   *  - Custom Cookie properties are discarded. In tough-cookie 1.x, since there was no {@link Cookie.toJSON} method explicitly defined, all enumerable properties were captured.
   *      If you want a property to be serialized, add the property name to {@link Cookie.serializableProperties}.
   */
  toJSON() {
    const obj = {};
    for (const prop of _Cookie2.serializableProperties) {
      const val = this[prop];
      if (val === cookieDefaults[prop]) {
        continue;
      }
      switch (prop) {
        case "key":
        case "value":
        case "sameSite":
          if (typeof val === "string") {
            obj[prop] = val;
          }
          break;
        case "expires":
        case "creation":
        case "lastAccessed":
          if (typeof val === "number" || typeof val === "string" || val instanceof Date) {
            obj[prop] = val == "Infinity" ? "Infinity" : new Date(val).toISOString();
          } else if (val === null) {
            obj[prop] = null;
          }
          break;
        case "maxAge":
          if (typeof val === "number" || val === "Infinity" || val === "-Infinity") {
            obj[prop] = val;
          }
          break;
        case "domain":
        case "path":
          if (typeof val === "string" || val === null) {
            obj[prop] = val;
          }
          break;
        case "secure":
        case "httpOnly":
          if (typeof val === "boolean") {
            obj[prop] = val;
          }
          break;
        case "extensions":
          if (Array.isArray(val)) {
            obj[prop] = val;
          }
          break;
        case "hostOnly":
        case "pathIsDefault":
          if (typeof val === "boolean" || val === null) {
            obj[prop] = val;
          }
          break;
      }
    }
    return obj;
  }
  /**
   * Does a deep clone of this cookie, implemented exactly as `Cookie.fromJSON(cookie.toJSON())`.
   * @public
   */
  clone() {
    return fromJSON(this.toJSON());
  }
  /**
   * Validates cookie attributes for semantic correctness. Useful for "lint" checking any `Set-Cookie` headers you generate.
   * For now, it returns a boolean, but eventually could return a reason string.
   *
   * @remarks
   * Works for a few things, but is by no means comprehensive.
   *
   * @beta
   */
  validate() {
    if (!this.value || !COOKIE_OCTETS.test(this.value)) {
      return false;
    }
    if (this.expires != "Infinity" && !(this.expires instanceof Date) && !parseDate(this.expires)) {
      return false;
    }
    if (this.maxAge != null && this.maxAge !== "Infinity" && (this.maxAge === "-Infinity" || this.maxAge <= 0)) {
      return false;
    }
    if (this.path != null && !PATH_VALUE.test(this.path)) {
      return false;
    }
    const cdomain = this.cdomain();
    if (cdomain) {
      if (cdomain.match(/\.$/)) {
        return false;
      }
      const suffix = getPublicSuffix(cdomain);
      if (suffix == null) {
        return false;
      }
    }
    return true;
  }
  /**
   * Sets the 'Expires' attribute on a cookie.
   *
   * @remarks
   * When given a `string` value it will be parsed with {@link parseDate}. If the value can't be parsed as a cookie date
   * then the 'Expires' attribute will be set to `"Infinity"`.
   *
   * @param exp - the new value for the 'Expires' attribute of the cookie.
   */
  setExpires(exp) {
    if (exp instanceof Date) {
      this.expires = exp;
    } else {
      this.expires = parseDate(exp) || "Infinity";
    }
  }
  /**
   * Sets the 'Max-Age' attribute (in seconds) on a cookie.
   *
   * @remarks
   * Coerces `-Infinity` to `"-Infinity"` and `Infinity` to `"Infinity"` so it can be serialized to JSON.
   *
   * @param age - the new value for the 'Max-Age' attribute (in seconds).
   */
  setMaxAge(age) {
    if (age === Infinity) {
      this.maxAge = "Infinity";
    } else if (age === -Infinity) {
      this.maxAge = "-Infinity";
    } else {
      this.maxAge = age;
    }
  }
  /**
   * Encodes to a `Cookie` header value (specifically, the {@link Cookie.key} and {@link Cookie.value} properties joined with "=").
   * @public
   */
  cookieString() {
    const val = this.value || "";
    if (this.key) {
      return `${this.key}=${val}`;
    }
    return val;
  }
  /**
   * Encodes to a `Set-Cookie header` value.
   * @public
   */
  toString() {
    let str = this.cookieString();
    if (this.expires != "Infinity") {
      if (this.expires instanceof Date) {
        str += `; Expires=${formatDate(this.expires)}`;
      }
    }
    if (this.maxAge != null && this.maxAge != Infinity) {
      str += `; Max-Age=${String(this.maxAge)}`;
    }
    if (this.domain && !this.hostOnly) {
      str += `; Domain=${this.domain}`;
    }
    if (this.path) {
      str += `; Path=${this.path}`;
    }
    if (this.secure) {
      str += "; Secure";
    }
    if (this.httpOnly) {
      str += "; HttpOnly";
    }
    if (this.sameSite && this.sameSite !== "none") {
      if (this.sameSite.toLowerCase() === _Cookie2.sameSiteCanonical.lax.toLowerCase()) {
        str += `; SameSite=${_Cookie2.sameSiteCanonical.lax}`;
      } else if (this.sameSite.toLowerCase() === _Cookie2.sameSiteCanonical.strict.toLowerCase()) {
        str += `; SameSite=${_Cookie2.sameSiteCanonical.strict}`;
      } else {
        str += `; SameSite=${this.sameSite}`;
      }
    }
    if (this.extensions) {
      this.extensions.forEach((ext) => {
        str += `; ${ext}`;
      });
    }
    return str;
  }
  /**
   * Computes the TTL relative to now (milliseconds).
   *
   * @remarks
   * - `Infinity` is returned for cookies without an explicit expiry
   *
   * - `0` is returned if the cookie is expired.
   *
   * - Otherwise a time-to-live in milliseconds is returned.
   *
   * @param now - passing an explicit value is mostly used for testing purposes since this defaults to the `Date.now()`
   * @public
   */
  TTL(now = Date.now()) {
    if (this.maxAge != null && typeof this.maxAge === "number") {
      return this.maxAge <= 0 ? 0 : this.maxAge * 1e3;
    }
    const expires = this.expires;
    if (expires === "Infinity") {
      return Infinity;
    }
    return (expires?.getTime() ?? now) - (now || Date.now());
  }
  /**
   * Computes the absolute unix-epoch milliseconds that this cookie expires.
   *
   * The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The {@link Cookie.lastAccessed} attribute
   * (or the `now` parameter if given) is used to offset the {@link Cookie.maxAge} attribute.
   *
   * If Expires ({@link Cookie.expires}) is set, that's returned.
   *
   * @param now - can be used to provide a time offset (instead of {@link Cookie.lastAccessed}) to use when calculating the "Max-Age" value
   */
  expiryTime(now) {
    if (this.maxAge != null) {
      const relativeTo = now || this.lastAccessed || /* @__PURE__ */ new Date();
      const maxAge = typeof this.maxAge === "number" ? this.maxAge : -Infinity;
      const age = maxAge <= 0 ? -Infinity : maxAge * 1e3;
      if (relativeTo === "Infinity") {
        return Infinity;
      }
      return relativeTo.getTime() + age;
    }
    if (this.expires == "Infinity") {
      return Infinity;
    }
    return this.expires ? this.expires.getTime() : void 0;
  }
  /**
   * Similar to {@link Cookie.expiryTime}, computes the absolute unix-epoch milliseconds that this cookie expires and returns it as a Date.
   *
   * The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The {@link Cookie.lastAccessed} attribute
   * (or the `now` parameter if given) is used to offset the {@link Cookie.maxAge} attribute.
   *
   * If Expires ({@link Cookie.expires}) is set, that's returned.
   *
   * @param now - can be used to provide a time offset (instead of {@link Cookie.lastAccessed}) to use when calculating the "Max-Age" value
   */
  expiryDate(now) {
    const millisec = this.expiryTime(now);
    if (millisec == Infinity) {
      return /* @__PURE__ */ new Date(2147483647e3);
    } else if (millisec == -Infinity) {
      return /* @__PURE__ */ new Date(0);
    } else {
      return millisec == void 0 ? void 0 : new Date(millisec);
    }
  }
  /**
   * Indicates if the cookie has been persisted to a store or not.
   * @public
   */
  isPersistent() {
    return this.maxAge != null || this.expires != "Infinity";
  }
  /**
   * Calls {@link canonicalDomain} with the {@link Cookie.domain} property.
   * @public
   */
  canonicalizedDomain() {
    return canonicalDomain(this.domain);
  }
  /**
   * Alias for {@link Cookie.canonicalizedDomain}
   * @public
   */
  cdomain() {
    return canonicalDomain(this.domain);
  }
  /**
   * Parses a string into a Cookie object.
   *
   * @remarks
   * Note: when parsing a `Cookie` header it must be split by ';' before each Cookie string can be parsed.
   *
   * @example
   * ```
   * // parse a `Set-Cookie` header
   * const setCookieHeader = 'a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT'
   * const cookie = Cookie.parse(setCookieHeader)
   * cookie.key === 'a'
   * cookie.value === 'bcd'
   * cookie.expires === new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT'))
   * ```
   *
   * @example
   * ```
   * // parse a `Cookie` header
   * const cookieHeader = 'name=value; name2=value2; name3=value3'
   * const cookies = cookieHeader.split(';').map(Cookie.parse)
   * cookies[0].name === 'name'
   * cookies[0].value === 'value'
   * cookies[1].name === 'name2'
   * cookies[1].value === 'value2'
   * cookies[2].name === 'name3'
   * cookies[2].value === 'value3'
   * ```
   *
   * @param str - The `Set-Cookie` header or a Cookie string to parse.
   * @param options - Configures `strict` or `loose` mode for cookie parsing
   */
  static parse(str, options) {
    return parse(str, options);
  }
  /**
   * Does the reverse of {@link Cookie.toJSON}.
   *
   * @remarks
   * Any Date properties (such as .expires, .creation, and .lastAccessed) are parsed via Date.parse, not tough-cookie's parseDate, since ISO timestamps are being handled at this layer.
   *
   * @example
   * ```
   * const json = JSON.stringify({
   *   key: 'alpha',
   *   value: 'beta',
   *   domain: 'example.com',
   *   path: '/foo',
   *   expires: '2038-01-19T03:14:07.000Z',
   * })
   * const cookie = Cookie.fromJSON(json)
   * cookie.key === 'alpha'
   * cookie.value === 'beta'
   * cookie.domain === 'example.com'
   * cookie.path === '/foo'
   * cookie.expires === new Date(Date.parse('2038-01-19T03:14:07.000Z'))
   * ```
   *
   * @param str - An unparsed JSON string or a value that has already been parsed as JSON
   */
  static fromJSON(str) {
    return fromJSON(str);
  }
};
_Cookie.cookiesCreated = 0;
_Cookie.sameSiteLevel = {
  strict: 3,
  lax: 2,
  none: 1
};
_Cookie.sameSiteCanonical = {
  strict: "Strict",
  lax: "Lax"
};
_Cookie.serializableProperties = [
  "key",
  "value",
  "expires",
  "maxAge",
  "domain",
  "path",
  "secure",
  "httpOnly",
  "extensions",
  "hostOnly",
  "pathIsDefault",
  "creation",
  "lastAccessed",
  "sameSite"
];
var Cookie = _Cookie;
var MAX_TIME = 2147483647e3;
function cookieCompare(a, b) {
  let cmp;
  const aPathLen = a.path ? a.path.length : 0;
  const bPathLen = b.path ? b.path.length : 0;
  cmp = bPathLen - aPathLen;
  if (cmp !== 0) {
    return cmp;
  }
  const aTime = a.creation && a.creation instanceof Date ? a.creation.getTime() : MAX_TIME;
  const bTime = b.creation && b.creation instanceof Date ? b.creation.getTime() : MAX_TIME;
  cmp = aTime - bTime;
  if (cmp !== 0) {
    return cmp;
  }
  cmp = (a.creationIndex || 0) - (b.creationIndex || 0);
  return cmp;
}
function defaultPath(path) {
  if (!path || path.slice(0, 1) !== "/") {
    return "/";
  }
  if (path === "/") {
    return path;
  }
  const rightSlash = path.lastIndexOf("/");
  if (rightSlash === 0) {
    return "/";
  }
  return path.slice(0, rightSlash);
}
var IP_REGEX_LOWERCASE = /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-f\d]{1,4}:){7}(?:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,2}|:)|(?:[a-f\d]{1,4}:){4}(?:(?::[a-f\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,3}|:)|(?:[a-f\d]{1,4}:){3}(?:(?::[a-f\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,4}|:)|(?:[a-f\d]{1,4}:){2}(?:(?::[a-f\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,5}|:)|(?:[a-f\d]{1,4}:){1}(?:(?::[a-f\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,6}|:)|(?::(?:(?::[a-f\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,7}|:)))$)/;
function domainMatch(domain, cookieDomain, canonicalize) {
  if (domain == null || cookieDomain == null) {
    return void 0;
  }
  let _str;
  let _domStr;
  if (canonicalize !== false) {
    _str = canonicalDomain(domain);
    _domStr = canonicalDomain(cookieDomain);
  } else {
    _str = domain;
    _domStr = cookieDomain;
  }
  if (_str == null || _domStr == null) {
    return void 0;
  }
  if (_str == _domStr) {
    return true;
  }
  const idx = _str.lastIndexOf(_domStr);
  if (idx <= 0) {
    return false;
  }
  if (_str.length !== _domStr.length + idx) {
    return false;
  }
  if (_str.substring(idx - 1, idx) !== ".") {
    return false;
  }
  return !IP_REGEX_LOWERCASE.test(_str);
}
function isLoopbackV4(address) {
  const octets = address.split(".");
  return octets.length === 4 && octets[0] !== void 0 && parseInt(octets[0], 10) === 127;
}
function isLoopbackV6(address) {
  return address === "::1";
}
function isNormalizedLocalhostTLD(lowerHost) {
  return lowerHost.endsWith(".localhost");
}
function isLocalHostname(host) {
  const lowerHost = host.toLowerCase();
  return lowerHost === "localhost" || isNormalizedLocalhostTLD(lowerHost);
}
function hostNoBrackets(host) {
  if (host.length >= 2 && host.startsWith("[") && host.endsWith("]")) {
    return host.substring(1, host.length - 1);
  }
  return host;
}
function isPotentiallyTrustworthy(inputUrl, allowSecureOnLocal = true) {
  let url;
  if (typeof inputUrl === "string") {
    try {
      url = new URL(inputUrl);
    } catch {
      return false;
    }
  } else {
    url = inputUrl;
  }
  const scheme = url.protocol.replace(":", "").toLowerCase();
  const hostname = hostNoBrackets(url.hostname).replace(/\.+$/, "");
  if (scheme === "https" || scheme === "wss") {
    return true;
  }
  if (!allowSecureOnLocal) {
    return false;
  }
  if (IP_V4_REGEX_OBJECT.test(hostname)) {
    return isLoopbackV4(hostname);
  }
  if (IP_V6_REGEX_OBJECT.test(hostname)) {
    return isLoopbackV6(hostname);
  }
  return isLocalHostname(hostname);
}
var defaultSetCookieOptions = {
  loose: false,
  sameSiteContext: void 0,
  ignoreError: false,
  http: true
};
var defaultGetCookieOptions = {
  http: true,
  expire: true,
  allPaths: false,
  sameSiteContext: void 0,
  sort: void 0
};
var SAME_SITE_CONTEXT_VAL_ERR = 'Invalid sameSiteContext option for getCookies(); expected one of "strict", "lax", or "none"';
function getCookieContext(url) {
  if (url && typeof url === "object" && "hostname" in url && typeof url.hostname === "string" && "pathname" in url && typeof url.pathname === "string" && "protocol" in url && typeof url.protocol === "string") {
    return {
      hostname: url.hostname,
      pathname: url.pathname,
      protocol: url.protocol
    };
  } else if (typeof url === "string") {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    try {
      pathname = decodeURI(pathname);
    } catch {
    }
    return {
      hostname: parsed.hostname,
      pathname,
      protocol: parsed.protocol
    };
  } else {
    throw new ParameterError("`url` argument is not a string or URL.");
  }
}
function checkSameSiteContext(value) {
  const context = value.toLowerCase();
  if (context === "none" || context === "lax" || context === "strict") {
    return context;
  } else {
    return void 0;
  }
}
function isSecurePrefixConditionMet(cookie2) {
  const startsWithSecurePrefix = typeof cookie2.key === "string" && cookie2.key.startsWith("__Secure-");
  return !startsWithSecurePrefix || cookie2.secure;
}
function isHostPrefixConditionMet(cookie2) {
  const startsWithHostPrefix = typeof cookie2.key === "string" && cookie2.key.startsWith("__Host-");
  return !startsWithHostPrefix || Boolean(
    cookie2.secure && cookie2.hostOnly && cookie2.path != null && cookie2.path === "/"
  );
}
function getNormalizedPrefixSecurity(prefixSecurity) {
  const normalizedPrefixSecurity = prefixSecurity.toLowerCase();
  switch (normalizedPrefixSecurity) {
    case PrefixSecurityEnum.STRICT:
    case PrefixSecurityEnum.SILENT:
    case PrefixSecurityEnum.DISABLED:
      return normalizedPrefixSecurity;
    default:
      return PrefixSecurityEnum.SILENT;
  }
}
var CookieJar = class _CookieJar {
  /**
   * Creates a new `CookieJar` instance.
   *
   * @remarks
   * - If a custom store is not passed to the constructor, an in-memory store ({@link MemoryCookieStore} will be created and used.
   * - If a boolean value is passed as the `options` parameter, this is equivalent to passing `{ rejectPublicSuffixes: <value> }`
   *
   * @param store - a custom {@link Store} implementation (defaults to {@link MemoryCookieStore})
   * @param options - configures how cookies are processed by the cookie jar
   */
  constructor(store, options) {
    if (typeof options === "boolean") {
      options = { rejectPublicSuffixes: options };
    }
    this.rejectPublicSuffixes = options?.rejectPublicSuffixes ?? true;
    this.enableLooseMode = options?.looseMode ?? false;
    this.allowSpecialUseDomain = options?.allowSpecialUseDomain ?? true;
    this.allowSecureOnLocal = options?.allowSecureOnLocal ?? true;
    this.prefixSecurity = getNormalizedPrefixSecurity(
      options?.prefixSecurity ?? "silent"
    );
    this.store = store ?? new MemoryCookieStore();
  }
  callSync(fn) {
    if (!this.store.synchronous) {
      throw new Error(
        "CookieJar store is not synchronous; use async API instead."
      );
    }
    let syncErr = null;
    let syncResult = void 0;
    try {
      fn.call(this, (error4, result) => {
        syncErr = error4;
        syncResult = result;
      });
    } catch (err) {
      syncErr = err;
    }
    if (syncErr) throw syncErr;
    return syncResult;
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  setCookie(cookie2, url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    let context;
    try {
      if (typeof url === "string") {
        validate(
          isNonEmptyString2(url),
          callback,
          safeToString(options)
        );
      }
      context = getCookieContext(url);
      if (typeof url === "function") {
        return promiseCallback.reject(new Error("No URL was specified"));
      }
      if (typeof options === "function") {
        options = defaultSetCookieOptions;
      }
      validate(typeof cb === "function", cb);
      if (!isNonEmptyString2(cookie2) && !isObject(cookie2) && cookie2 instanceof String && cookie2.length == 0) {
        return promiseCallback.resolve(void 0);
      }
    } catch (err) {
      return promiseCallback.reject(err);
    }
    const host = canonicalDomain(context.hostname) ?? null;
    const loose = options?.loose || this.enableLooseMode;
    let sameSiteContext = null;
    if (options?.sameSiteContext) {
      sameSiteContext = checkSameSiteContext(options.sameSiteContext);
      if (!sameSiteContext) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
    }
    if (typeof cookie2 === "string" || cookie2 instanceof String) {
      const parsedCookie = Cookie.parse(cookie2.toString(), { loose });
      if (!parsedCookie) {
        const err = new Error("Cookie failed to parse");
        return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
      }
      cookie2 = parsedCookie;
    } else if (!(cookie2 instanceof Cookie)) {
      const err = new Error(
        "First argument to setCookie must be a Cookie object or string"
      );
      return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
    }
    const now = options?.now || /* @__PURE__ */ new Date();
    if (this.rejectPublicSuffixes && cookie2.domain) {
      try {
        const cdomain = cookie2.cdomain();
        const suffix = typeof cdomain === "string" ? getPublicSuffix(cdomain, {
          allowSpecialUseDomain: this.allowSpecialUseDomain,
          ignoreError: options?.ignoreError
        }) : null;
        if (suffix == null && !IP_V6_REGEX_OBJECT.test(cookie2.domain)) {
          const err = new Error("Cookie has domain set to a public suffix");
          return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
        }
      } catch (err) {
        return options?.ignoreError ? promiseCallback.resolve(void 0) : (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          promiseCallback.reject(err)
        );
      }
    }
    if (cookie2.domain) {
      if (!domainMatch(host ?? void 0, cookie2.cdomain() ?? void 0, false)) {
        const err = new Error(
          `Cookie not in this host's domain. Cookie:${cookie2.cdomain() ?? "null"} Request:${host ?? "null"}`
        );
        return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
      }
      if (cookie2.hostOnly == null) {
        cookie2.hostOnly = false;
      }
    } else {
      cookie2.hostOnly = true;
      cookie2.domain = host;
    }
    if (!cookie2.path || cookie2.path[0] !== "/") {
      cookie2.path = defaultPath(context.pathname);
      cookie2.pathIsDefault = true;
    }
    if (options?.http === false && cookie2.httpOnly) {
      const err = new Error("Cookie is HttpOnly and this isn't an HTTP API");
      return options.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
    }
    if (cookie2.sameSite !== "none" && cookie2.sameSite !== void 0 && sameSiteContext) {
      if (sameSiteContext === "none") {
        const err = new Error(
          "Cookie is SameSite but this is a cross-origin request"
        );
        return options?.ignoreError ? promiseCallback.resolve(void 0) : promiseCallback.reject(err);
      }
    }
    const ignoreErrorForPrefixSecurity = this.prefixSecurity === PrefixSecurityEnum.SILENT;
    const prefixSecurityDisabled = this.prefixSecurity === PrefixSecurityEnum.DISABLED;
    if (!prefixSecurityDisabled) {
      let errorFound = false;
      let errorMsg;
      if (!isSecurePrefixConditionMet(cookie2)) {
        errorFound = true;
        errorMsg = "Cookie has __Secure prefix but Secure attribute is not set";
      } else if (!isHostPrefixConditionMet(cookie2)) {
        errorFound = true;
        errorMsg = "Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'";
      }
      if (errorFound) {
        return options?.ignoreError || ignoreErrorForPrefixSecurity ? promiseCallback.resolve(void 0) : promiseCallback.reject(new Error(errorMsg));
      }
    }
    const store = this.store;
    if (!store.updateCookie) {
      store.updateCookie = async function(_oldCookie, newCookie, cb2) {
        return this.putCookie(newCookie).then(
          () => cb2?.(null),
          (error4) => cb2?.(error4)
        );
      };
    }
    const withCookie = function withCookie2(err, oldCookie) {
      if (err) {
        cb(err);
        return;
      }
      const next = function(err2) {
        if (err2) {
          cb(err2);
        } else if (typeof cookie2 === "string") {
          cb(null, void 0);
        } else {
          cb(null, cookie2);
        }
      };
      if (oldCookie) {
        if (options && "http" in options && options.http === false && oldCookie.httpOnly) {
          err = new Error("old Cookie is HttpOnly and this isn't an HTTP API");
          if (options.ignoreError) cb(null, void 0);
          else cb(err);
          return;
        }
        if (cookie2 instanceof Cookie) {
          cookie2.creation = oldCookie.creation;
          cookie2.creationIndex = oldCookie.creationIndex;
          cookie2.lastAccessed = now;
          store.updateCookie(oldCookie, cookie2, next);
        }
      } else {
        if (cookie2 instanceof Cookie) {
          cookie2.creation = cookie2.lastAccessed = now;
          store.putCookie(cookie2, next);
        }
      }
    };
    store.findCookie(cookie2.domain, cookie2.path, cookie2.key, withCookie);
    return promiseCallback.promise;
  }
  /**
   * Synchronously attempt to set the {@link Cookie} in the {@link CookieJar}.
   *
   * <strong>Note:</strong> Only works if the configured {@link Store} is also synchronous.
   *
   * @remarks
   * - If successfully persisted, the {@link Cookie} will have updated
   *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
   *     properties.
   *
   * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
   *     attribute on the cookie string. The {@link Cookie.domain} property is set to the
   *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
   *     exact hostname match (not a {@link domainMatch} as per usual)
   *
   * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when storing the cookie.
   * @public
   */
  setCookieSync(cookie2, url, options) {
    const setCookieFn = options ? this.setCookie.bind(this, cookie2, url, options) : this.setCookie.bind(this, cookie2, url);
    return this.callSync(setCookieFn);
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  getCookies(url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = defaultGetCookieOptions;
    } else if (options === void 0) {
      options = defaultGetCookieOptions;
    }
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    let context;
    try {
      if (typeof url === "string") {
        validate(isNonEmptyString2(url), cb, url);
      }
      context = getCookieContext(url);
      validate(
        isObject(options),
        cb,
        safeToString(options)
      );
      validate(typeof cb === "function", cb);
    } catch (parameterError) {
      return promiseCallback.reject(parameterError);
    }
    const host = canonicalDomain(context.hostname);
    const path = context.pathname || "/";
    const potentiallyTrustworthy = isPotentiallyTrustworthy(
      url,
      this.allowSecureOnLocal
    );
    let sameSiteLevel = 0;
    if (options.sameSiteContext) {
      const sameSiteContext = checkSameSiteContext(options.sameSiteContext);
      if (sameSiteContext == null) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
      sameSiteLevel = Cookie.sameSiteLevel[sameSiteContext];
      if (!sameSiteLevel) {
        return promiseCallback.reject(new Error(SAME_SITE_CONTEXT_VAL_ERR));
      }
    }
    const http2 = options.http ?? true;
    const now = Date.now();
    const expireCheck = options.expire ?? true;
    const allPaths = options.allPaths ?? false;
    const store = this.store;
    function matchingCookie(c) {
      if (c.hostOnly) {
        if (c.domain != host) {
          return false;
        }
      } else {
        if (!domainMatch(host ?? void 0, c.domain ?? void 0, false)) {
          return false;
        }
      }
      if (!allPaths && typeof c.path === "string" && !pathMatch(path, c.path)) {
        return false;
      }
      if (c.secure && !potentiallyTrustworthy) {
        return false;
      }
      if (c.httpOnly && !http2) {
        return false;
      }
      if (sameSiteLevel) {
        let cookieLevel;
        if (c.sameSite === "lax") {
          cookieLevel = Cookie.sameSiteLevel.lax;
        } else if (c.sameSite === "strict") {
          cookieLevel = Cookie.sameSiteLevel.strict;
        } else {
          cookieLevel = Cookie.sameSiteLevel.none;
        }
        if (cookieLevel > sameSiteLevel) {
          return false;
        }
      }
      const expiryTime = c.expiryTime();
      if (expireCheck && expiryTime != void 0 && expiryTime <= now) {
        store.removeCookie(c.domain, c.path, c.key, () => {
        });
        return false;
      }
      return true;
    }
    store.findCookies(
      host,
      allPaths ? null : path,
      this.allowSpecialUseDomain,
      (err, cookies) => {
        if (err) {
          cb(err);
          return;
        }
        if (cookies == null) {
          cb(null, []);
          return;
        }
        cookies = cookies.filter(matchingCookie);
        if ("sort" in options && options.sort !== false) {
          cookies = cookies.sort(cookieCompare);
        }
        const now2 = /* @__PURE__ */ new Date();
        for (const cookie2 of cookies) {
          cookie2.lastAccessed = now2;
        }
        cb(null, cookies);
      }
    );
    return promiseCallback.promise;
  }
  /**
   * Synchronously retrieve the list of cookies that can be sent in a Cookie header for the
   * current URL.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - The array of cookies returned will be sorted according to {@link cookieCompare}.
   *
   * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookiesSync(url, options) {
    return this.callSync(this.getCookies.bind(this, url, options)) ?? [];
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  getCookieString(url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    const next = function(err, cookies) {
      if (err) {
        promiseCallback.callback(err);
      } else {
        promiseCallback.callback(
          null,
          cookies?.sort(cookieCompare).map((c) => c.cookieString()).join("; ")
        );
      }
    };
    this.getCookies(url, options, next);
    return promiseCallback.promise;
  }
  /**
   * Synchronous version of `.getCookieString()`. Accepts the same options as `.getCookies()` but returns a string suitable for a
   * `Cookie` header rather than an Array.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getCookieStringSync(url, options) {
    return this.callSync(
      options ? this.getCookieString.bind(this, url, options) : this.getCookieString.bind(this, url)
    ) ?? "";
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  getSetCookieStrings(url, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = void 0;
    }
    const promiseCallback = createPromiseCallback(
      callback
    );
    const next = function(err, cookies) {
      if (err) {
        promiseCallback.callback(err);
      } else {
        promiseCallback.callback(
          null,
          cookies?.map((c) => {
            return c.toString();
          })
        );
      }
    };
    this.getCookies(url, options, next);
    return promiseCallback.promise;
  }
  /**
   * Synchronous version of `.getSetCookieStrings()`. Returns an array of strings suitable for `Set-Cookie` headers.
   * Accepts the same options as `.getCookies()`.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @param url - The domain to store the cookie with.
   * @param options - Configuration settings to use when retrieving the cookies.
   */
  getSetCookieStringsSync(url, options = {}) {
    return this.callSync(this.getSetCookieStrings.bind(this, url, options)) ?? [];
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  serialize(callback) {
    const promiseCallback = createPromiseCallback(callback);
    let type = this.store.constructor.name;
    if (isObject(type)) {
      type = null;
    }
    const serialized = {
      // The version of tough-cookie that serialized this jar. Generally a good
      // practice since future versions can make data import decisions based on
      // known past behavior. When/if this matters, use `semver`.
      version: `tough-cookie@${version}`,
      // add the store type, to make humans happy:
      storeType: type,
      // CookieJar configuration:
      rejectPublicSuffixes: this.rejectPublicSuffixes,
      enableLooseMode: this.enableLooseMode,
      allowSpecialUseDomain: this.allowSpecialUseDomain,
      prefixSecurity: getNormalizedPrefixSecurity(this.prefixSecurity),
      // this gets filled from getAllCookies:
      cookies: []
    };
    if (typeof this.store.getAllCookies !== "function") {
      return promiseCallback.reject(
        new Error(
          "store does not support getAllCookies and cannot be serialized"
        )
      );
    }
    this.store.getAllCookies((err, cookies) => {
      if (err) {
        promiseCallback.callback(err);
        return;
      }
      if (cookies == null) {
        promiseCallback.callback(null, serialized);
        return;
      }
      serialized.cookies = cookies.map((cookie2) => {
        const serializedCookie = cookie2.toJSON();
        delete serializedCookie.creationIndex;
        return serializedCookie;
      });
      promiseCallback.callback(null, serialized);
    });
    return promiseCallback.promise;
  }
  /**
   * Serialize the CookieJar if the underlying store supports `.getAllCookies`.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   */
  serializeSync() {
    return this.callSync((callback) => {
      this.serialize(callback);
    });
  }
  /**
   * Alias of {@link CookieJar.serializeSync}. Allows the cookie to be serialized
   * with `JSON.stringify(cookieJar)`.
   */
  toJSON() {
    return this.serializeSync();
  }
  /**
   * Use the class method CookieJar.deserialize instead of calling this directly
   * @internal
   */
  _importCookies(serialized, callback) {
    let cookies = void 0;
    if (serialized && typeof serialized === "object" && inOperator("cookies", serialized) && Array.isArray(serialized.cookies)) {
      cookies = serialized.cookies;
    }
    if (!cookies) {
      callback(new Error("serialized jar has no cookies array"), void 0);
      return;
    }
    cookies = cookies.slice();
    const putNext = (err) => {
      if (err) {
        callback(err, void 0);
        return;
      }
      if (Array.isArray(cookies)) {
        if (!cookies.length) {
          callback(err, this);
          return;
        }
        let cookie2;
        try {
          cookie2 = Cookie.fromJSON(cookies.shift());
        } catch (e) {
          callback(e instanceof Error ? e : new Error(), void 0);
          return;
        }
        if (cookie2 === void 0) {
          putNext(null);
          return;
        }
        this.store.putCookie(cookie2, putNext);
      }
    };
    putNext(null);
  }
  /**
   * @internal
   */
  _importCookiesSync(serialized) {
    this.callSync(this._importCookies.bind(this, serialized));
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  clone(newStore, callback) {
    if (typeof newStore === "function") {
      callback = newStore;
      newStore = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    this.serialize((err, serialized) => {
      if (err) {
        return promiseCallback.reject(err);
      }
      return _CookieJar.deserialize(serialized ?? "", newStore, cb);
    });
    return promiseCallback.promise;
  }
  /**
   * @internal
   */
  _cloneSync(newStore) {
    const cloneFn = newStore && typeof newStore !== "function" ? this.clone.bind(this, newStore) : this.clone.bind(this);
    return this.callSync((callback) => {
      cloneFn(callback);
    });
  }
  /**
   * Produces a deep clone of this CookieJar. Modifications to the original do
   * not affect the clone, and vice versa.
   *
   * <strong>Note</strong>: Only works if both the configured Store and destination
   * Store are synchronous.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - Transferring between store types is supported so long as the source
   *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
   *
   * @param newStore - The target {@link Store} to clone cookies into.
   */
  cloneSync(newStore) {
    if (!newStore) {
      return this._cloneSync();
    }
    if (!newStore.synchronous) {
      throw new Error(
        "CookieJar clone destination store is not synchronous; use async API instead."
      );
    }
    return this._cloneSync(newStore);
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  removeAllCookies(callback) {
    const promiseCallback = createPromiseCallback(callback);
    const cb = promiseCallback.callback;
    const store = this.store;
    if (typeof store.removeAllCookies === "function" && store.removeAllCookies !== Store.prototype.removeAllCookies) {
      store.removeAllCookies(cb);
      return promiseCallback.promise;
    }
    store.getAllCookies((err, cookies) => {
      if (err) {
        cb(err);
        return;
      }
      if (!cookies) {
        cookies = [];
      }
      if (cookies.length === 0) {
        cb(null, void 0);
        return;
      }
      let completedCount = 0;
      const removeErrors = [];
      const removeCookieCb = function removeCookieCb2(removeErr) {
        if (removeErr) {
          removeErrors.push(removeErr);
        }
        completedCount++;
        if (completedCount === cookies.length) {
          if (removeErrors[0]) cb(removeErrors[0]);
          else cb(null, void 0);
          return;
        }
      };
      cookies.forEach((cookie2) => {
        store.removeCookie(
          cookie2.domain,
          cookie2.path,
          cookie2.key,
          removeCookieCb
        );
      });
    });
    return promiseCallback.promise;
  }
  /**
   * Removes all cookies from the CookieJar.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - This is a new backwards-compatible feature of tough-cookie version 2.5,
   *     so not all Stores will implement it efficiently. For Stores that do not
   *     implement `removeAllCookies`, the fallback is to call `removeCookie` after
   *     `getAllCookies`.
   *
   * - If `getAllCookies` fails or isn't implemented in the Store, an error is returned.
   *
   * - If one or more of the `removeCookie` calls fail, only the first error is returned.
   */
  removeAllCookiesSync() {
    this.callSync((callback) => {
      this.removeAllCookies(callback);
    });
  }
  /**
   * @internal No doc because this is the overload implementation
   */
  static deserialize(strOrObj, store, callback) {
    if (typeof store === "function") {
      callback = store;
      store = void 0;
    }
    const promiseCallback = createPromiseCallback(callback);
    let serialized;
    if (typeof strOrObj === "string") {
      try {
        serialized = JSON.parse(strOrObj);
      } catch (e) {
        return promiseCallback.reject(e instanceof Error ? e : new Error());
      }
    } else {
      serialized = strOrObj;
    }
    const readSerializedProperty = (property) => {
      return serialized && typeof serialized === "object" && inOperator(property, serialized) ? serialized[property] : void 0;
    };
    const readSerializedBoolean = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "boolean" ? value : void 0;
    };
    const readSerializedString = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "string" ? value : void 0;
    };
    const jar = new _CookieJar(store, {
      rejectPublicSuffixes: readSerializedBoolean("rejectPublicSuffixes"),
      looseMode: readSerializedBoolean("enableLooseMode"),
      allowSpecialUseDomain: readSerializedBoolean("allowSpecialUseDomain"),
      prefixSecurity: getNormalizedPrefixSecurity(
        readSerializedString("prefixSecurity") ?? "silent"
      )
    });
    jar._importCookies(serialized, (err) => {
      if (err) {
        promiseCallback.callback(err);
        return;
      }
      promiseCallback.callback(null, jar);
    });
    return promiseCallback.promise;
  }
  /**
   * A new CookieJar is created and the serialized {@link Cookie} values are added to
   * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
   * the order in which they appear in the serialization.
   *
   * <strong>Note</strong>: Only works if the configured Store is also synchronous.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param strOrObj - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static deserializeSync(strOrObj, store) {
    const serialized = typeof strOrObj === "string" ? JSON.parse(strOrObj) : strOrObj;
    const readSerializedProperty = (property) => {
      return serialized && typeof serialized === "object" && inOperator(property, serialized) ? serialized[property] : void 0;
    };
    const readSerializedBoolean = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "boolean" ? value : void 0;
    };
    const readSerializedString = (property) => {
      const value = readSerializedProperty(property);
      return typeof value === "string" ? value : void 0;
    };
    const jar = new _CookieJar(store, {
      rejectPublicSuffixes: readSerializedBoolean("rejectPublicSuffixes"),
      looseMode: readSerializedBoolean("enableLooseMode"),
      allowSpecialUseDomain: readSerializedBoolean("allowSpecialUseDomain"),
      prefixSecurity: getNormalizedPrefixSecurity(
        readSerializedString("prefixSecurity") ?? "silent"
      )
    });
    if (!jar.store.synchronous) {
      throw new Error(
        "CookieJar store is not synchronous; use async API instead."
      );
    }
    jar._importCookiesSync(serialized);
    return jar;
  }
  /**
   * Alias of {@link CookieJar.deserializeSync}.
   *
   * @remarks
   * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
   *
   * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
   *
   * @param jsonString - A JSON string or object representing the deserialized cookies.
   * @param store - The underlying store to persist the deserialized cookies into.
   */
  static fromJSON(jsonString, store) {
    return _CookieJar.deserializeSync(jsonString, store);
  }
};

// node_modules/msw/lib/core/utils/internal/jsonParse.mjs
function jsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return void 0;
  }
}

// node_modules/msw/lib/core/utils/cookieStore.mjs
var CookieStore = class {
  #storageKey = "__msw-cookie-store__";
  #jar;
  #memoryStore;
  constructor() {
    if (!isNodeProcess()) {
      invariant(
        typeof localStorage !== "undefined",
        "Failed to create a CookieStore: `localStorage` is not available in this environment. This is likely an issue with your environment, which has been detected as browser (or browser-like) environment and must implement global browser APIs correctly."
      );
    }
    this.#memoryStore = new MemoryCookieStore();
    this.#memoryStore.idx = this.getCookieStoreIndex();
    this.#jar = new CookieJar(this.#memoryStore);
  }
  getCookies(url) {
    return this.#jar.getCookiesSync(url);
  }
  async setCookie(cookieName, url) {
    await this.#jar.setCookie(cookieName, url);
    this.persist();
  }
  getCookieStoreIndex() {
    if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") {
      return {};
    }
    const cookiesString = localStorage.getItem(this.#storageKey);
    if (cookiesString == null) {
      return {};
    }
    const rawCookies = jsonParse(cookiesString);
    if (rawCookies == null) {
      return {};
    }
    const cookies = {};
    for (const rawCookie of rawCookies) {
      const cookie2 = Cookie.fromJSON(rawCookie);
      if (cookie2 != null && cookie2.domain != null && cookie2.path != null) {
        cookies[cookie2.domain] ||= {};
        cookies[cookie2.domain][cookie2.path] ||= {};
        cookies[cookie2.domain][cookie2.path][cookie2.key] = cookie2;
      }
    }
    return cookies;
  }
  persist() {
    if (typeof localStorage === "undefined" || typeof localStorage.setItem !== "function") {
      return;
    }
    const data = [];
    const { idx } = this.#memoryStore;
    for (const domain in idx) {
      for (const path in idx[domain]) {
        for (const key in idx[domain][path]) {
          data.push(idx[domain][path][key].toJSON());
        }
      }
    }
    localStorage.setItem(this.#storageKey, JSON.stringify(data));
  }
};
var cookieStore = new CookieStore();

// node_modules/msw/lib/core/utils/request/storeResponseCookies.mjs
async function storeResponseCookies(request, response) {
  const responseCookies = getRawSetCookie(response);
  if (responseCookies) {
    await cookieStore.setCookie(responseCookies, request.url);
  }
}

// node_modules/msw/lib/core/experimental/request-utils.mjs
var REQUEST_INTENTION_HEADER_NAME = "x-msw-intention";
function shouldBypassRequest(request) {
  return !!request.headers.get("accept")?.includes("msw/passthrough");
}
function isPassthroughResponse(response) {
  return response.status === 302 && response.headers.get(REQUEST_INTENTION_HEADER_NAME) === "passthrough";
}
function deleteRequestPassthroughHeader(request) {
  const acceptHeader = request.headers.get("accept");
  if (acceptHeader) {
    const nextAcceptHeader = acceptHeader.replace(/(,\s+)?msw\/passthrough/, "");
    if (nextAcceptHeader) {
      request.headers.set("accept", nextAcceptHeader);
    } else {
      request.headers.delete("accept");
    }
  }
}

// node_modules/msw/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse2(path, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}

// node_modules/msw/lib/core/utils/url/cleanUrl.mjs
var REDUNDANT_CHARACTERS_EXP = /[?|#].*$/g;
function cleanUrl(path) {
  if (path.endsWith("?")) {
    return path;
  }
  return path.replace(REDUNDANT_CHARACTERS_EXP, "");
}

// node_modules/msw/lib/core/utils/url/isAbsoluteUrl.mjs
function isAbsoluteUrl(url) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

// node_modules/msw/lib/core/utils/url/getAbsoluteUrl.mjs
function getAbsoluteUrl(path, baseUrl) {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  if (path.startsWith("*")) {
    return path;
  }
  const origin = baseUrl || typeof location !== "undefined" && location.href;
  return origin ? (
    // Encode and decode the path to preserve escaped characters.
    decodeURI(new URL(encodeURI(path), origin).href)
  ) : path;
}

// node_modules/msw/lib/core/utils/matching/normalizePath.mjs
function normalizePath(path, baseUrl) {
  if (path instanceof RegExp) {
    return path;
  }
  const maybeAbsoluteUrl = getAbsoluteUrl(path, baseUrl);
  return cleanUrl(maybeAbsoluteUrl);
}

// node_modules/msw/lib/core/utils/matching/matchRequestUrl.mjs
function coercePath(path) {
  return path.replace(
    /([:a-zA-Z_-]*)(\*{1,2})+/g,
    (_, parameterName, wildcard) => {
      const expression = "(.*)";
      if (!parameterName) {
        return expression;
      }
      return parameterName.startsWith(":") ? `${parameterName}${wildcard}` : `${parameterName}${expression}`;
    }
  ).replace(/([^/])(:)(?=(?:\d+|\(\.\*\))(?=\/|$))/, "$1\\$2").replace(/^([^/]+)(:)(?=\/\/)/, "$1\\$2");
}
function matchRequestUrl(url, path, baseUrl) {
  const normalizedPath = normalizePath(path, baseUrl);
  const cleanPath = typeof normalizedPath === "string" ? coercePath(normalizedPath) : normalizedPath;
  const cleanUrl2 = getCleanUrl(url);
  const result = match(cleanPath, { decode: decodeURIComponent })(cleanUrl2);
  const params = result && result.params || {};
  return {
    matches: result !== false,
    params
  };
}

// node_modules/msw/lib/core/utils/logging/getTimestamp.mjs
function getTimestamp(options) {
  const now = /* @__PURE__ */ new Date();
  const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  if (options?.milliseconds) {
    return `${timestamp}.${now.getMilliseconds().toString().padStart(3, "0")}`;
  }
  return timestamp;
}

// node_modules/msw/lib/core/utils/internal/isObject.mjs
function isObject2(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

// node_modules/msw/lib/core/ws/utils/getMessageLength.mjs
function getMessageLength(data) {
  if (data instanceof Blob) {
    return data.size;
  }
  if (isObject2(data) && "byteLength" in data) {
    return data.byteLength;
  }
  return new Blob([data]).size;
}

// node_modules/msw/lib/core/ws/utils/truncateMessage.mjs
var MAX_LENGTH = 24;
function truncateMessage(message4) {
  if (message4.length <= MAX_LENGTH) {
    return message4;
  }
  return `${message4.slice(0, MAX_LENGTH)}\u2026`;
}

// node_modules/msw/lib/core/ws/utils/getPublicData.mjs
async function getPublicData(data) {
  if (data instanceof Blob) {
    const text = await data.text();
    return `Blob(${truncateMessage(text)})`;
  }
  if (isObject2(data)) {
    const text = new TextDecoder().decode(data);
    return `ArrayBuffer(${truncateMessage(text)})`;
  }
  return truncateMessage(data);
}

// node_modules/msw/lib/core/ws/utils/attachWebSocketLogger.mjs
var colors = {
  system: "#3b82f6",
  outgoing: "#22c55e",
  incoming: "#ef4444",
  mocked: "#ff6a33"
};
function attachWebSocketLogger(connection) {
  const { client, server } = connection;
  const controller = new AbortController();
  logConnectionOpen(client);
  client.addEventListener(
    "message",
    (event) => {
      logOutgoingClientMessage(event);
    },
    { signal: controller.signal }
  );
  client.addEventListener(
    "close",
    (event) => {
      logConnectionClose(event);
    },
    { signal: controller.signal }
  );
  client.socket.addEventListener(
    "error",
    (event) => {
      logClientError(event);
    },
    { signal: controller.signal }
  );
  const { send: originalClientSend } = client;
  client.send = new Proxy(client.send, {
    apply(target, thisArg, args) {
      const [data] = args;
      const messageEvent = new MessageEvent("message", { data });
      Object.defineProperties(messageEvent, {
        currentTarget: {
          enumerable: true,
          writable: false,
          value: client.socket
        },
        target: {
          enumerable: true,
          writable: false,
          value: client.socket
        }
      });
      queueMicrotask(() => {
        logIncomingMockedClientMessage(messageEvent);
      });
      return Reflect.apply(target, thisArg, args);
    }
  });
  server.addEventListener(
    "open",
    () => {
      server.addEventListener("message", (event) => {
        logIncomingServerMessage(event);
      });
    },
    {
      once: true,
      signal: controller.signal
    }
  );
  const { send: originalServerSend } = server;
  server.send = new Proxy(server.send, {
    apply(target, thisArg, args) {
      const [data] = args;
      const messageEvent = new MessageEvent("message", { data });
      Object.defineProperties(messageEvent, {
        currentTarget: {
          enumerable: true,
          writable: false,
          value: server.socket
        },
        target: {
          enumerable: true,
          writable: false,
          value: server.socket
        }
      });
      logOutgoingMockedClientMessage(messageEvent);
      return Reflect.apply(target, thisArg, args);
    }
  });
  controller.signal.addEventListener(
    "abort",
    () => {
      client.send = originalClientSend;
      server.send = originalServerSend;
    },
    { once: true }
  );
  return () => {
    controller.abort();
  };
}
function logConnectionOpen(client) {
  const publicUrl = toPublicUrl(client.url);
  console.groupCollapsed(
    devUtils.formatMessage(`${getTimestamp()} %c\u25B6%c ${publicUrl}`),
    `color:${colors.system}`,
    "color:inherit"
  );
  console.log("Client:", client.socket);
  console.groupEnd();
}
function logConnectionClose(event) {
  const target = event.target;
  const publicUrl = toPublicUrl(target.url);
  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c\u25A0%c ${publicUrl}`
    ),
    `color:${colors.system}`,
    "color:inherit"
  );
  console.log(event);
  console.groupEnd();
}
function logClientError(event) {
  const socket = event.target;
  const publicUrl = toPublicUrl(socket.url);
  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c\xD7%c ${publicUrl}`
    ),
    `color:${colors.system}`,
    "color:inherit"
  );
  console.log(event);
  console.groupEnd();
}
async function logOutgoingClientMessage(event) {
  const byteLength = getMessageLength(event.data);
  const publicData = await getPublicData(event.data);
  const arrow = event.defaultPrevented ? "\u21E1" : "\u2B06";
  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c${arrow}%c ${publicData} %c${byteLength}%c`
    ),
    `color:${colors.outgoing}`,
    "color:inherit",
    "color:gray;font-weight:normal",
    "color:inherit;font-weight:inherit"
  );
  console.log(event);
  console.groupEnd();
}
async function logOutgoingMockedClientMessage(event) {
  const byteLength = getMessageLength(event.data);
  const publicData = await getPublicData(event.data);
  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c\u2B06%c ${publicData} %c${byteLength}%c`
    ),
    `color:${colors.mocked}`,
    "color:inherit",
    "color:gray;font-weight:normal",
    "color:inherit;font-weight:inherit"
  );
  console.log(event);
  console.groupEnd();
}
async function logIncomingMockedClientMessage(event) {
  const byteLength = getMessageLength(event.data);
  const publicData = await getPublicData(event.data);
  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c\u2B07%c ${publicData} %c${byteLength}%c`
    ),
    `color:${colors.mocked}`,
    "color:inherit",
    "color:gray;font-weight:normal",
    "color:inherit;font-weight:inherit"
  );
  console.log(event);
  console.groupEnd();
}
async function logIncomingServerMessage(event) {
  const byteLength = getMessageLength(event.data);
  const publicData = await getPublicData(event.data);
  const arrow = event.defaultPrevented ? "\u21E3" : "\u2B07";
  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c${arrow}%c ${publicData} %c${byteLength}%c`
    ),
    `color:${colors.incoming}`,
    "color:inherit",
    "color:gray;font-weight:normal",
    "color:inherit;font-weight:inherit"
  );
  console.log(event);
  console.groupEnd();
}

// node_modules/msw/lib/core/handlers/WebSocketHandler.mjs
var kEmitter = /* @__PURE__ */ Symbol("kEmitter");
var kConnect = /* @__PURE__ */ Symbol("kConnect");
var kAutoConnect = /* @__PURE__ */ Symbol("kAutoConnect");
var kStopPropagationPatched = /* @__PURE__ */ Symbol("kStopPropagationPatched");
var KOnStopPropagation = /* @__PURE__ */ Symbol("KOnStopPropagation");
var WebSocketHandler = class {
  constructor(url) {
    this.url = url;
    this.id = createRequestId();
    this[kEmitter] = new Emitter2();
    this.callFrame = getCallFrame(new Error());
  }
  url;
  id;
  callFrame;
  kind = "websocket";
  [kEmitter];
  parse(args) {
    const clientUrl = new URL(args.url);
    const resolvedHandlerUrl = this.url instanceof RegExp || this.url.startsWith("*") ? this.url : this.#resolveWebSocketUrl(this.url, args.resolutionContext?.baseUrl);
    clientUrl.pathname = clientUrl.pathname.replace(/^\/socket.io\//, "/");
    const match2 = matchRequestUrl(
      clientUrl,
      resolvedHandlerUrl,
      args.resolutionContext?.baseUrl
    );
    return {
      match: match2
    };
  }
  predicate(args) {
    return args.parsedResult.match.matches;
  }
  test(url, resolutionContext) {
    return this.#match(url, resolutionContext) != null;
  }
  async run(connection, resolutionContext) {
    const parsedResult = this.#match(connection.client.url, resolutionContext);
    if (parsedResult == null) {
      return null;
    }
    const resolvedConnection = {
      ...connection,
      params: parsedResult.match.params || {}
    };
    if (resolutionContext?.[kAutoConnect] ?? true) {
      if (this[kConnect](resolvedConnection)) {
        return resolvedConnection;
      }
      return null;
    }
    return resolvedConnection;
  }
  #match(url, resolutionContext) {
    const resolvedUrl = this.#resolveWebSocketUrl(
      url.toString(),
      resolutionContext?.baseUrl
    );
    const parsedResult = this.parse({
      url: resolvedUrl,
      resolutionContext
    });
    if (this.predicate({
      url,
      parsedResult
    })) {
      return parsedResult;
    }
    return null;
  }
  [kConnect](connection) {
    connection.client.addEventListener(
      "message",
      createStopPropagationListener(this)
    );
    connection.client.addEventListener(
      "close",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "open",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "message",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "error",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "close",
      createStopPropagationListener(this)
    );
    return this[kEmitter].emit("connection", connection);
  }
  log(connection) {
    return attachWebSocketLogger(connection);
  }
  #resolveWebSocketUrl(url, baseUrl) {
    const resolvedUrl = resolveWebSocketUrl(
      baseUrl ? (
        /**
         * @note Resolve against the base URL preemtively because `resolveWebSocketUrl` only
         * resolves against `location.href`, which is missing in Node.js. Base URL allows
         * the handler to accept a relative URL in Node.js.
         */
        new URL(url, baseUrl)
      ) : url
    );
    return resolvedUrl.replace(/\/$/, "");
  }
};
function createStopPropagationListener(handler) {
  return function stopPropagationListener(event) {
    const propagationStoppedAt = Reflect.get(event, "kPropagationStoppedAt");
    if (propagationStoppedAt && handler.id !== propagationStoppedAt) {
      event.stopImmediatePropagation();
      return;
    }
    Object.defineProperty(event, KOnStopPropagation, {
      value() {
        Object.defineProperty(event, "kPropagationStoppedAt", {
          value: handler.id
        });
      },
      configurable: true
    });
    if (!Reflect.get(event, kStopPropagationPatched)) {
      event.stopPropagation = new Proxy(event.stopPropagation, {
        apply: (target, thisArg, args) => {
          Reflect.get(event, KOnStopPropagation)?.call(handler);
          return Reflect.apply(target, thisArg, args);
        }
      });
      Object.defineProperty(event, kStopPropagationPatched, {
        value: true,
        // If something else attempts to redefine this, throw.
        configurable: false
      });
    }
  };
}

// node_modules/msw/lib/core/utils/internal/attachSiblingHandlers.mjs
var kSiblingHandlers = /* @__PURE__ */ Symbol("kSiblingHandlers");
function getSiblingHandlers(owner) {
  return Reflect.get(owner, kSiblingHandlers) || [];
}

// node_modules/msw/lib/core/experimental/handlers-controller.mjs
function groupHandlersByKind(handlers2) {
  const groups = {};
  const pushUnique = (kind, handler) => {
    const bucket = groups[kind] ||= [];
    if (!bucket.includes(handler)) {
      bucket.push(handler);
    }
  };
  for (const handler of handlers2) {
    pushUnique(handler.kind, handler);
    for (const sibling of getSiblingHandlers(handler)) {
      pushUnique(sibling.kind, sibling);
    }
  }
  return groups;
}
var HandlersController = class {
  getInitialState(initialHandlers) {
    invariant(
      this.#validateHandlers(initialHandlers),
      devUtils.formatMessage(
        "Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?"
      )
    );
    const normalizedInitialHandlers = groupHandlersByKind(initialHandlers);
    return {
      initialHandlers: normalizedInitialHandlers,
      handlers: { ...normalizedInitialHandlers }
    };
  }
  currentHandlers() {
    return Object.values(this.getState().handlers).flat().filter((handler) => handler != null);
  }
  getHandlersByKind(kind) {
    return this.getState().handlers[kind] || [];
  }
  use(nextHandlers) {
    invariant(
      this.#validateHandlers(nextHandlers),
      devUtils.formatMessage(
        '[MSW] Failed to call "use()" with the given request handlers: invalid input. Did you forget to spread the array of request handlers?'
      )
    );
    if (nextHandlers.length === 0) {
      return;
    }
    const { handlers: handlers2 } = this.getState();
    const overrides = groupHandlersByKind(nextHandlers);
    for (const kind in overrides) {
      const overridesForKind = overrides[kind];
      const existingForKind = handlers2[kind];
      handlers2[kind] = existingForKind ? [...overridesForKind, ...existingForKind] : overridesForKind;
    }
    this.setState({ handlers: handlers2 });
  }
  reset(nextHandlers) {
    invariant(
      nextHandlers.length > 0 ? this.#validateHandlers(nextHandlers) : true,
      devUtils.formatMessage(
        "Failed to replace initial handlers during reset: invalid handlers. Did you forget to spread the handlers array?"
      )
    );
    for (const handler of this.currentHandlers()) {
      if ("reset" in handler) {
        handler["reset"]();
      }
    }
    const { initialHandlers } = this.getState();
    if (nextHandlers.length === 0) {
      this.setState({
        handlers: { ...initialHandlers }
      });
      return;
    }
    const normalizedNextHandlers = groupHandlersByKind(nextHandlers);
    this.setState({
      initialHandlers: normalizedNextHandlers,
      handlers: { ...normalizedNextHandlers }
    });
  }
  restore() {
    for (const handler of this.currentHandlers()) {
      if ("restore" in handler) {
        handler["restore"]();
      }
    }
  }
  #validateHandlers(handlers2) {
    return handlers2.every((handler) => !Array.isArray(handler));
  }
};
var InMemoryHandlersController = class extends HandlersController {
  #handlers;
  #initialHandlers;
  constructor(initialHandlers) {
    super();
    const initialState = this.getInitialState(initialHandlers);
    this.#initialHandlers = initialState.initialHandlers;
    this.#handlers = initialState.handlers;
  }
  getState() {
    return {
      initialHandlers: this.#initialHandlers,
      handlers: this.#handlers
    };
  }
  setState(nextState) {
    if (nextState.initialHandlers) {
      this.#initialHandlers = nextState.initialHandlers;
    }
    if (nextState.handlers) {
      this.#handlers = nextState.handlers;
    }
  }
};

// node_modules/msw/lib/core/experimental/frames/http-frame.mjs
var RequestEvent = class extends TypedEvent {
  requestId;
  request;
  constructor(type, data) {
    super(...[type, {}]);
    this.requestId = data.requestId;
    this.request = data.request;
  }
};
var ResponseEvent = class extends TypedEvent {
  requestId;
  request;
  response;
  constructor(type, data) {
    super(...[type, {}]);
    this.requestId = data.requestId;
    this.request = data.request;
    this.response = data.response;
  }
};
var UnhandledExceptionEvent = class extends TypedEvent {
  error;
  requestId;
  request;
  constructor(type, data) {
    super(...[type, {}]);
    this.error = data.error;
    this.requestId = data.requestId;
    this.request = data.request;
  }
};
var HttpNetworkFrame = class extends NetworkFrame {
  constructor(options) {
    const id = options.id || createRequestId();
    super("http", { id, request: options.request });
  }
  getHandlers(controller) {
    return controller.getHandlersByKind("request");
  }
  async getUnhandledMessage() {
    const { request } = this.data;
    const url = new URL(request.url);
    const publicUrl = toPublicUrl(url) + url.search;
    const requestBody = request.body == null ? null : await request.clone().text();
    const details = `

  \u2022 ${request.method} ${publicUrl}

${requestBody ? `  \u2022 Request body: ${requestBody}

` : ""}`;
    const message4 = `intercepted a request without a matching request handler:${details}If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`;
    return message4;
  }
  async resolve(handlers2, onUnhandledFrame, resolutionContext) {
    const { id: requestId, request } = this.data;
    const requestCloneForLogs = resolutionContext?.quiet ? null : request.clone();
    this.events.emit(new RequestEvent("request:start", { requestId, request }));
    if (shouldBypassRequest(request)) {
      this.events.emit(new RequestEvent("request:end", { requestId, request }));
      this.passthrough();
      return null;
    }
    const [lookupError, lookupResult] = await until(() => {
      return executeHandlers({
        requestId,
        request,
        handlers: handlers2,
        resolutionContext: {
          baseUrl: resolutionContext?.baseUrl?.toString(),
          quiet: resolutionContext?.quiet
        }
      });
    });
    if (lookupError != null) {
      if (!this.events.emit(
        new UnhandledExceptionEvent("unhandledException", {
          error: lookupError,
          requestId,
          request
        })
      )) {
        console.error(lookupError);
        devUtils.error(
          'Encountered an unhandled exception during the handler lookup for "%s %s". Please see the original error above.',
          request.method,
          request.url
        );
      }
      this.errorWith(lookupError);
      return null;
    }
    if (lookupResult == null) {
      this.events.emit(
        new RequestEvent("request:unhandled", {
          requestId,
          request
        })
      );
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error4) => this.errorWith(error4)
      );
      this.events.emit(
        new RequestEvent("request:end", {
          requestId,
          request
        })
      );
      return false;
    }
    const { response, handler, parsedResult } = lookupResult;
    this.events.emit(
      new RequestEvent("request:match", {
        requestId,
        request
      })
    );
    if (response == null) {
      this.events.emit(
        new RequestEvent("request:end", {
          requestId,
          request
        })
      );
      this.passthrough();
      return null;
    }
    if (isPassthroughResponse(response)) {
      this.events.emit(
        new RequestEvent("request:end", {
          requestId,
          request
        })
      );
      this.passthrough();
      return null;
    }
    const responseCloneForLogs = resolutionContext?.quiet ? null : response.clone();
    await storeResponseCookies(request, response);
    this.respondWith(response);
    this.events.emit(
      new RequestEvent("request:end", {
        requestId,
        request
      })
    );
    if (!resolutionContext?.quiet) {
      handler.log({
        request: requestCloneForLogs,
        response: responseCloneForLogs,
        parsedResult
      });
    }
    return true;
  }
};

// node_modules/msw/lib/core/experimental/on-unhandled-frame.mjs
async function executeUnhandledFrameHandle(frame, handle) {
  const printStrategyMessage = async (strategy) => {
    if (strategy === "bypass") {
      return;
    }
    const message4 = await frame.getUnhandledMessage();
    switch (strategy) {
      case "warn": {
        return devUtils.warn("Warning: %s", message4);
      }
      case "error": {
        return devUtils.error("Error: %s", message4);
      }
    }
  };
  const applyStrategy = async (strategy) => {
    invariant.as(
      InternalError,
      strategy === "bypass" || strategy === "warn" || strategy === "error",
      /**
       * @fixme Rename "onUnhandledRequest" to "onUnhandledFrame" in the error message
       * with the next major release.
       */
      devUtils.formatMessage(
        'Failed to react to an unhandled network frame: unknown strategy "%s". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
        strategy
      )
    );
    if (strategy === "bypass") {
      return;
    }
    await printStrategyMessage(strategy);
    if (strategy === "error") {
      return Promise.reject(
        new InternalError(
          devUtils.formatMessage(
            'Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.'
          )
        )
      );
    }
  };
  if (typeof handle === "function") {
    return handle({
      frame,
      defaults: {
        warn: printStrategyMessage.bind(null, "warn"),
        /**
         * @note The defaults only print the corresponding messages now.
         * They do not affect the frame resolution (e.g. do not error the frame).
         * That is only for backward compatibility reasons. In the future, these should
         * be an alias to `applyStrategy.bind(null, 'error')` instead.
         */
        error: printStrategyMessage.bind(null, "error")
      }
    });
  }
  if (frame instanceof HttpNetworkFrame && isCommonAssetRequest(frame.data.request)) {
    return;
  }
  return applyStrategy(handle);
}

// node_modules/msw/lib/core/utils/internal/toReadonlyArray.mjs
function toReadonlyArray(source) {
  const clone = [...source];
  Object.freeze(clone);
  return clone;
}

// node_modules/msw/lib/core/utils/internal/Disposable.mjs
var Disposable = class {
  subscriptions = [];
  dispose() {
    let subscription;
    const errors = [];
    while (subscription = this.subscriptions.shift()) {
      try {
        subscription();
      } catch (error4) {
        if (error4 instanceof Error) {
          errors.push(error4);
        }
      }
    }
    if (errors.length > 0) {
      console.error(
        new AggregateError(
          errors,
          devUtils.formatMessage(
            "Failed to dispose of some side effects. This is likely an issue with MSW, please report it on GitHub: https://github.com/mswjs/msw/issues"
          )
        )
      );
    }
  }
};

// node_modules/msw/lib/core/experimental/define-network.mjs
function colorlessPromiseAll(values) {
  const promises = [];
  for (const value of values) {
    if (value instanceof Promise) {
      promises.push(value);
    }
  }
  if (promises.length > 0) {
    return Promise.all(promises).then(() => {
    });
  }
}
var NetworkReadyState = /* @__PURE__ */ ((NetworkReadyState2) => {
  NetworkReadyState2[NetworkReadyState2["DISABLED"] = 0] = "DISABLED";
  NetworkReadyState2[NetworkReadyState2["ENABLED"] = 1] = "ENABLED";
  return NetworkReadyState2;
})(NetworkReadyState || {});
function defineNetwork(options) {
  let readyState = 0;
  const events = new Emitter();
  const disposable = new Disposable();
  const deriveHandlersController = (handlers2) => {
    return handlers2 instanceof HandlersController ? handlers2 : new InMemoryHandlersController(handlers2 || []);
  };
  let resolvedOptions = {
    ...options
  };
  let handlersController = deriveHandlersController(resolvedOptions.handlers);
  return {
    get readyState() {
      return readyState;
    },
    events,
    configure(options2) {
      invariant(
        readyState === 0,
        'Failed to call "configure()" on the network: cannot configure an already enabled network.'
      );
      if (options2.handlers && !Object.is(options2.handlers, resolvedOptions.handlers)) {
        handlersController = deriveHandlersController(options2.handlers);
      }
      resolvedOptions = {
        ...resolvedOptions,
        ...options2
      };
    },
    enable() {
      invariant(
        readyState === 0,
        'Failed to call "enable" on the network: already enabled'
      );
      readyState = 1;
      const session = { active: true };
      disposable["subscriptions"].push(() => {
        session.active = false;
      });
      const result = resolvedOptions.sources.map((source) => {
        NetworkSource.prototype.disable.call(source);
        source.on("frame", async ({ frame }) => {
          frame.events.on("*", (event) => {
            if (!session.active) {
              return;
            }
            events.emit(event);
          });
          const handlers2 = frame.getHandlers(handlersController);
          await frame.resolve(
            handlers2,
            resolvedOptions.onUnhandledFrame || "warn",
            resolvedOptions.context
          );
        });
        return source.enable();
      });
      return colorlessPromiseAll(result);
    },
    disable() {
      invariant(
        readyState === 1,
        'Failed to call "disable" on the network: already disabled'
      );
      readyState = 0;
      disposable.dispose();
      return colorlessPromiseAll(
        resolvedOptions.sources.map((source) => source.disable())
      );
    },
    use(...handlers2) {
      handlersController.use(handlers2);
    },
    resetHandlers(...handlers2) {
      handlersController.reset(handlers2);
    },
    restoreHandlers() {
      handlersController.restore();
    },
    listHandlers() {
      return toReadonlyArray(handlersController.currentHandlers());
    }
  };
}

// node_modules/@mswjs/interceptors/lib/browser/hasConfigurableGlobal-C8zq1MCg.mjs
async function emitAsync(emitter, eventName, ...data) {
  const listeners = emitter.listeners(eventName);
  if (listeners.length === 0) return;
  for (const listener of listeners) await listener.apply(emitter, data);
}
var PatchesRegistry = class {
  #replacements = /* @__PURE__ */ new Map();
  applyPatch(owner, key, getNextValue) {
    const ownerReplacements = this.#replacements.get(owner);
    invariant(!ownerReplacements?.has(key), `Failed to replace a global value at "${String(key)}": already replaced.`);
    const match2 = getDeepPropertyDescriptor(owner, key);
    if (typeof match2 === "undefined") {
      console.warn(`Failed to replace a global value at "${String(key)}": not a global value.`);
      return () => {
      };
    }
    if (match2.descriptor.configurable) Object.defineProperty(owner, key, {
      value: getNextValue(owner[key]),
      enumerable: true,
      configurable: true
    });
    else if (match2.descriptor.writable) owner[key] = getNextValue(owner[key]);
    else throw new Error(`Failed to patch a non-configurable non-writable property "${key.toString()}"`);
    const restorePatch = () => {
      const currentReplacements = this.#replacements.get(owner);
      if (!currentReplacements?.has(key)) return;
      if (match2.owner === owner)
        Object.defineProperty(match2.owner, key, match2.descriptor);
      else
        Reflect.deleteProperty(owner, key);
      currentReplacements.delete(key);
      if (currentReplacements.size === 0) this.#replacements.delete(owner);
    };
    if (ownerReplacements) ownerReplacements.set(key, restorePatch);
    else this.#replacements.set(owner, /* @__PURE__ */ new Map([[key, restorePatch]]));
    return restorePatch;
  }
  restoreAllPatches() {
    const errors = [];
    for (const [, ownerReplacements] of this.#replacements) for (const [, restorePatch] of ownerReplacements) try {
      restorePatch();
    } catch (error4) {
      if (error4 instanceof Error) errors.push(error4);
      else throw error4;
    }
    if (errors.length > 0) throw new AggregateError(errors, "FOO!");
  }
};
var patchesRegistry = new PatchesRegistry();
function getDeepPropertyDescriptor(owner, key) {
  let currentOwner = owner;
  let descriptor;
  while (currentOwner) {
    descriptor = Object.getOwnPropertyDescriptor(currentOwner, key);
    if (descriptor) return {
      owner: currentOwner,
      descriptor
    };
    currentOwner = Object.getPrototypeOf(currentOwner);
  }
}
function hasConfigurableGlobal(propertyName) {
  const match2 = getDeepPropertyDescriptor(globalThis, propertyName);
  if (typeof match2 === "undefined") return false;
  const { descriptor } = match2;
  if (typeof descriptor.get === "function" && typeof descriptor.get() === "undefined") return false;
  if (typeof descriptor.get === "undefined" && descriptor.value == null) return false;
  if (typeof descriptor.set === "undefined" && !descriptor.configurable) {
    console.error(`[MSW] Failed to apply interceptor: the global \`${propertyName}\` property is non-configurable. This is likely an issue with your environment. If you are using a framework, please open an issue about this in their repository.`);
    return false;
  }
  return true;
}

// node_modules/@mswjs/interceptors/lib/browser/interceptors/WebSocket/index.mjs
function bindEvent(target, event) {
  Object.defineProperties(event, {
    target: {
      value: target,
      enumerable: true,
      writable: true
    },
    currentTarget: {
      value: target,
      enumerable: true,
      writable: true
    }
  });
  return event;
}
var kCancelable = /* @__PURE__ */ Symbol("kCancelable");
var kDefaultPrevented2 = /* @__PURE__ */ Symbol("kDefaultPrevented");
var CancelableMessageEvent = class extends MessageEvent {
  constructor(type, init) {
    super(type, init);
    this[kCancelable] = !!init.cancelable;
    this[kDefaultPrevented2] = false;
  }
  get cancelable() {
    return this[kCancelable];
  }
  set cancelable(nextCancelable) {
    this[kCancelable] = nextCancelable;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented2];
  }
  set defaultPrevented(nextDefaultPrevented) {
    this[kDefaultPrevented2] = nextDefaultPrevented;
  }
  preventDefault() {
    if (this.cancelable && !this[kDefaultPrevented2]) this[kDefaultPrevented2] = true;
  }
};
var CloseEvent = class extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.code = init.code === void 0 ? 0 : init.code;
    this.reason = init.reason === void 0 ? "" : init.reason;
    this.wasClean = init.wasClean === void 0 ? false : init.wasClean;
  }
};
var CancelableCloseEvent = class extends CloseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this[kCancelable] = !!init.cancelable;
    this[kDefaultPrevented2] = false;
  }
  get cancelable() {
    return this[kCancelable];
  }
  set cancelable(nextCancelable) {
    this[kCancelable] = nextCancelable;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented2];
  }
  set defaultPrevented(nextDefaultPrevented) {
    this[kDefaultPrevented2] = nextDefaultPrevented;
  }
  preventDefault() {
    if (this.cancelable && !this[kDefaultPrevented2]) this[kDefaultPrevented2] = true;
  }
};
var kEmitter$1 = /* @__PURE__ */ Symbol("kEmitter");
var kBoundListener$1 = /* @__PURE__ */ Symbol("kBoundListener");
var WebSocketClientConnection = class {
  constructor(socket, transport) {
    this.socket = socket;
    this.transport = transport;
    this.id = createRequestId();
    this.url = new URL(socket.url);
    this[kEmitter$1] = new EventTarget();
    this.transport.addEventListener("outgoing", (event) => {
      const message4 = bindEvent(this.socket, new CancelableMessageEvent("message", {
        data: event.data,
        origin: event.origin,
        cancelable: true
      }));
      this[kEmitter$1].dispatchEvent(message4);
      if (message4.defaultPrevented) event.preventDefault();
    });
    this.transport.addEventListener("close", (event) => {
      this[kEmitter$1].dispatchEvent(bindEvent(this.socket, new CloseEvent("close", event)));
    });
  }
  /**
  * Listen for the outgoing events from the connected WebSocket client.
  */
  addEventListener(type, listener, options) {
    if (!Reflect.has(listener, kBoundListener$1)) {
      const boundListener = listener.bind(this.socket);
      Object.defineProperty(listener, kBoundListener$1, {
        value: boundListener,
        enumerable: false,
        configurable: false
      });
    }
    this[kEmitter$1].addEventListener(type, Reflect.get(listener, kBoundListener$1), options);
  }
  /**
  * Removes the listener for the given event.
  */
  removeEventListener(event, listener, options) {
    this[kEmitter$1].removeEventListener(event, Reflect.get(listener, kBoundListener$1), options);
  }
  /**
  * Send data to the connected client.
  */
  send(data) {
    this.transport.send(data);
  }
  /**
  * Close the WebSocket connection.
  * @param {number} code A status code (see https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1).
  * @param {string} reason A custom connection close reason.
  */
  close(code, reason) {
    this.transport.close(code, reason);
  }
};
var WEBSOCKET_CLOSE_CODE_RANGE_ERROR = "InvalidAccessError: close code out of user configurable range";
var kPassthroughPromise = /* @__PURE__ */ Symbol("kPassthroughPromise");
var kOnSend = /* @__PURE__ */ Symbol("kOnSend");
var kClose = /* @__PURE__ */ Symbol("kClose");
var WebSocketOverride = class extends EventTarget {
  static {
    this.CONNECTING = 0;
  }
  static {
    this.OPEN = 1;
  }
  static {
    this.CLOSING = 2;
  }
  static {
    this.CLOSED = 3;
  }
  constructor(url, protocols) {
    super();
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    this._onopen = null;
    this._onmessage = null;
    this._onerror = null;
    this._onclose = null;
    this.url = resolveWebSocketUrl(url);
    this.protocol = "";
    this.extensions = "";
    this.binaryType = "blob";
    this.readyState = this.CONNECTING;
    this.bufferedAmount = 0;
    this[kPassthroughPromise] = new DeferredPromise();
    queueMicrotask(async () => {
      if (await this[kPassthroughPromise]) return;
      this.protocol = typeof protocols === "string" ? protocols : Array.isArray(protocols) && protocols.length > 0 ? protocols[0] : "";
      if (this.readyState === this.CONNECTING) {
        this.readyState = this.OPEN;
        this.dispatchEvent(bindEvent(this, new Event("open")));
      }
    });
  }
  set onopen(listener) {
    this.removeEventListener("open", this._onopen);
    this._onopen = listener;
    if (listener !== null) this.addEventListener("open", listener);
  }
  get onopen() {
    return this._onopen;
  }
  set onmessage(listener) {
    this.removeEventListener("message", this._onmessage);
    this._onmessage = listener;
    if (listener !== null) this.addEventListener("message", listener);
  }
  get onmessage() {
    return this._onmessage;
  }
  set onerror(listener) {
    this.removeEventListener("error", this._onerror);
    this._onerror = listener;
    if (listener !== null) this.addEventListener("error", listener);
  }
  get onerror() {
    return this._onerror;
  }
  set onclose(listener) {
    this.removeEventListener("close", this._onclose);
    this._onclose = listener;
    if (listener !== null) this.addEventListener("close", listener);
  }
  get onclose() {
    return this._onclose;
  }
  /**
  * @see https://websockets.spec.whatwg.org/#ref-for-dom-websocket-send%E2%91%A0
  */
  send(data) {
    if (this.readyState === this.CONNECTING) {
      this.close();
      throw new DOMException("InvalidStateError");
    }
    if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) return;
    this.bufferedAmount += getDataSize(data);
    queueMicrotask(() => {
      this.bufferedAmount = 0;
      this[kOnSend]?.(data);
    });
  }
  close(code = 1e3, reason) {
    invariant(code, WEBSOCKET_CLOSE_CODE_RANGE_ERROR);
    invariant(code === 1e3 || code >= 3e3 && code <= 4999, WEBSOCKET_CLOSE_CODE_RANGE_ERROR);
    this[kClose](code, reason);
  }
  [kClose](code = 1e3, reason, wasClean = true) {
    if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) return;
    this.readyState = this.CLOSING;
    queueMicrotask(() => {
      this.readyState = this.CLOSED;
      this.dispatchEvent(bindEvent(this, new CloseEvent("close", {
        code,
        reason,
        wasClean
      })));
      this._onopen = null;
      this._onmessage = null;
      this._onerror = null;
      this._onclose = null;
    });
  }
  addEventListener(type, listener, options) {
    return super.addEventListener(type, listener, options);
  }
  removeEventListener(type, callback, options) {
    return super.removeEventListener(type, callback, options);
  }
};
function getDataSize(data) {
  if (typeof data === "string") return data.length;
  if (data instanceof Blob) return data.size;
  return data.byteLength;
}
var kEmitter2 = /* @__PURE__ */ Symbol("kEmitter");
var kBoundListener = /* @__PURE__ */ Symbol("kBoundListener");
var kSend = /* @__PURE__ */ Symbol("kSend");
var WebSocketServerConnection = class {
  constructor(client, transport, createConnection) {
    this.client = client;
    this.transport = transport;
    this.createConnection = createConnection;
    this[kEmitter2] = new EventTarget();
    this.mockCloseController = new AbortController();
    this.realCloseController = new AbortController();
    this.transport.addEventListener("outgoing", (event) => {
      if (typeof this.realWebSocket === "undefined") return;
      queueMicrotask(() => {
        if (!event.defaultPrevented)
          this[kSend](event.data);
      });
    });
    this.transport.addEventListener("incoming", this.handleIncomingMessage.bind(this));
  }
  /**
  * The `WebSocket` instance connected to the original server.
  * Accessing this before calling `server.connect()` will throw.
  */
  get socket() {
    invariant(this.realWebSocket, 'Cannot access "socket" on the original WebSocket server object: the connection is not open. Did you forget to call `server.connect()`?');
    return this.realWebSocket;
  }
  /**
  * Open connection to the original WebSocket server.
  */
  connect() {
    invariant(!this.realWebSocket || this.realWebSocket.readyState !== WebSocket.OPEN, 'Failed to call "connect()" on the original WebSocket instance: the connection already open');
    const realWebSocket = this.createConnection();
    realWebSocket.binaryType = this.client.binaryType;
    realWebSocket.addEventListener("open", (event) => {
      this[kEmitter2].dispatchEvent(bindEvent(this.realWebSocket, new Event("open", event)));
    }, { once: true });
    realWebSocket.addEventListener("message", (event) => {
      this.transport.dispatchEvent(bindEvent(this.realWebSocket, new MessageEvent("incoming", {
        data: event.data,
        origin: event.origin
      })));
    });
    this.client.addEventListener("close", (event) => {
      this.handleMockClose(event);
    }, { signal: this.mockCloseController.signal });
    realWebSocket.addEventListener("close", (event) => {
      this.handleRealClose(event);
    }, { signal: this.realCloseController.signal });
    realWebSocket.addEventListener("error", () => {
      const errorEvent = bindEvent(realWebSocket, new Event("error", { cancelable: true }));
      this[kEmitter2].dispatchEvent(errorEvent);
      if (!errorEvent.defaultPrevented) this.client.dispatchEvent(bindEvent(this.client, new Event("error")));
    });
    this.realWebSocket = realWebSocket;
  }
  /**
  * Listen for the incoming events from the original WebSocket server.
  */
  addEventListener(event, listener, options) {
    if (!Reflect.has(listener, kBoundListener)) {
      const boundListener = listener.bind(this.client);
      Object.defineProperty(listener, kBoundListener, {
        value: boundListener,
        enumerable: false
      });
    }
    this[kEmitter2].addEventListener(event, Reflect.get(listener, kBoundListener), options);
  }
  /**
  * Remove the listener for the given event.
  */
  removeEventListener(event, listener, options) {
    this[kEmitter2].removeEventListener(event, Reflect.get(listener, kBoundListener), options);
  }
  /**
  * Send data to the original WebSocket server.
  * @example
  * server.send('hello')
  * server.send(new Blob(['hello']))
  * server.send(new TextEncoder().encode('hello'))
  */
  send(data) {
    this[kSend](data);
  }
  [kSend](data) {
    const { realWebSocket } = this;
    invariant(realWebSocket, 'Failed to call "server.send()" for "%s": the connection is not open. Did you forget to call "server.connect()"?', this.client.url);
    if (realWebSocket.readyState === WebSocket.CLOSING || realWebSocket.readyState === WebSocket.CLOSED) return;
    if (realWebSocket.readyState === WebSocket.CONNECTING) {
      realWebSocket.addEventListener("open", () => {
        realWebSocket.send(data);
      }, { once: true });
      return;
    }
    realWebSocket.send(data);
  }
  /**
  * Close the actual server connection.
  */
  close() {
    const { realWebSocket } = this;
    invariant(realWebSocket, 'Failed to close server connection for "%s": the connection is not open. Did you forget to call "server.connect()"?', this.client.url);
    this.realCloseController.abort();
    if (realWebSocket.readyState === WebSocket.CLOSING || realWebSocket.readyState === WebSocket.CLOSED) return;
    realWebSocket.close();
    queueMicrotask(() => {
      this[kEmitter2].dispatchEvent(bindEvent(this.realWebSocket, new CancelableCloseEvent("close", {
        code: 1e3,
        cancelable: true
      })));
    });
  }
  handleIncomingMessage(event) {
    const messageEvent = bindEvent(event.target, new CancelableMessageEvent("message", {
      data: event.data,
      origin: event.origin,
      cancelable: true
    }));
    this[kEmitter2].dispatchEvent(messageEvent);
    if (!messageEvent.defaultPrevented) this.client.dispatchEvent(bindEvent(
      /**
      * @note Bind the forwarded original server events
      * to the mock WebSocket instance so it would
      * dispatch them straight away.
      */
      this.client,
      new MessageEvent("message", {
        data: event.data,
        origin: event.origin
      })
    ));
  }
  handleMockClose(_event) {
    if (this.realWebSocket) this.realWebSocket.close();
  }
  handleRealClose(event) {
    this.mockCloseController.abort();
    const closeEvent = bindEvent(this.realWebSocket, new CancelableCloseEvent("close", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      cancelable: true
    }));
    this[kEmitter2].dispatchEvent(closeEvent);
    if (!closeEvent.defaultPrevented) this.client[kClose](event.code, event.reason);
  }
};
var WebSocketClassTransport = class extends EventTarget {
  constructor(socket) {
    super();
    this.socket = socket;
    this.socket.addEventListener("close", (event) => {
      this.dispatchEvent(bindEvent(this.socket, new CloseEvent("close", event)));
    });
    this.socket[kOnSend] = (data) => {
      this.dispatchEvent(bindEvent(this.socket, new CancelableMessageEvent("outgoing", {
        data,
        origin: this.socket.url,
        cancelable: true
      })));
    };
  }
  addEventListener(type, callback, options) {
    return super.addEventListener(type, callback, options);
  }
  dispatchEvent(event) {
    return super.dispatchEvent(event);
  }
  send(data) {
    queueMicrotask(() => {
      if (this.socket.readyState === this.socket.CLOSING || this.socket.readyState === this.socket.CLOSED) return;
      const dispatchEvent = () => {
        this.socket.dispatchEvent(bindEvent(
          /**
          * @note Setting this event's "target" to the
          * WebSocket override instance is important.
          * This way it can tell apart original incoming events
          * (must be forwarded to the transport) from the
          * mocked message events like the one below
          * (must be dispatched on the client instance).
          */
          this.socket,
          new MessageEvent("message", {
            data,
            origin: this.socket.url
          })
        ));
      };
      if (this.socket.readyState === this.socket.CONNECTING) this.socket.addEventListener("open", () => {
        dispatchEvent();
      }, { once: true });
      else dispatchEvent();
    });
  }
  close(code, reason) {
    this.socket[kClose](code, reason);
  }
};
var WebSocketInterceptor = class WebSocketInterceptor2 extends Interceptor {
  static {
    this.symbol = /* @__PURE__ */ Symbol.for("websocket-interceptor");
  }
  constructor() {
    super(WebSocketInterceptor2.symbol);
  }
  checkEnvironment() {
    return hasConfigurableGlobal("WebSocket");
  }
  setup() {
    const logger = this.logger.extend("setup");
    const WebSocketProxy = new Proxy(globalThis.WebSocket, { construct: (target, args, newTarget) => {
      const [url, protocols] = args;
      const createConnection = () => {
        return Reflect.construct(target, args, newTarget);
      };
      const socket = new WebSocketOverride(url, protocols);
      const transport = new WebSocketClassTransport(socket);
      queueMicrotask(async () => {
        try {
          const server = new WebSocketServerConnection(socket, transport, createConnection);
          const hasConnectionListeners = this.emitter.listenerCount("connection") > 0;
          await emitAsync(this.emitter, "connection", {
            client: new WebSocketClientConnection(socket, transport),
            server,
            info: { protocols }
          });
          if (hasConnectionListeners) socket[kPassthroughPromise].resolve(false);
          else {
            socket[kPassthroughPromise].resolve(true);
            server.connect();
            server.addEventListener("open", () => {
              socket.dispatchEvent(bindEvent(socket, new Event("open")));
              if (server["realWebSocket"]) socket.protocol = server["realWebSocket"].protocol;
            });
          }
        } catch (error4) {
          if (error4 instanceof Error) {
            socket.dispatchEvent(new Event("error"));
            if (socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) socket[kClose](1011, error4.message, false);
            console.error(error4);
          }
        }
      });
      return socket;
    } });
    logger.info("patching global WebSocket...");
    this.subscriptions.push(patchesRegistry.applyPatch(globalThis, "WebSocket", () => WebSocketProxy));
    logger.info("global WebSocket patched!", globalThis.WebSocket.name);
  }
};

// node_modules/msw/lib/core/experimental/frames/websocket-frame.mjs
var WebSocketConnectionEvent = class extends TypedEvent {
  url;
  protocols;
  constructor(type, data) {
    super(...[type, {}]);
    this.url = data.url;
    this.protocols = data.protocols;
  }
};
var UnhandledWebSocketExceptionEvent = class extends TypedEvent {
  url;
  protocols;
  error;
  constructor(type, data) {
    super(...[type, {}]);
    this.url = data.url;
    this.protocols = data.protocols;
    this.error = data.error;
  }
};
var WebSocketNetworkFrame = class extends NetworkFrame {
  constructor(options) {
    super("ws", {
      connection: options.connection
    });
  }
  getHandlers(controller) {
    return controller.getHandlersByKind("websocket");
  }
  async resolve(handlers2, onUnhandledFrame, resolutionContext) {
    const { connection } = this.data;
    this.events.emit(
      new WebSocketConnectionEvent("connection", {
        url: connection.client.url,
        protocols: connection.info.protocols
      })
    );
    if (handlers2.length === 0) {
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error4) => this.errorWith(error4)
      );
      return false;
    }
    let hasMatchingHandlers = false;
    for (const handler of handlers2) {
      const handlerConnection = await handler.run(connection, {
        baseUrl: resolutionContext?.baseUrl?.toString(),
        /**
         * @note Do not emit the "connection" event when running the handler.
         * Use the run only to get the resolved connection object.
         */
        [kAutoConnect]: false
      });
      if (!handlerConnection) {
        continue;
      }
      hasMatchingHandlers = true;
      const removeLogger = !resolutionContext?.quiet ? handler.log(connection) : void 0;
      try {
        if (!handler[kConnect](handlerConnection)) {
          removeLogger?.();
        }
      } catch (error4) {
        if (!this.events.emit(
          new UnhandledWebSocketExceptionEvent("unhandledException", {
            error: error4,
            url: connection.client.url,
            protocols: connection.info.protocols
          })
        )) {
          console.error(error4);
          devUtils.error(
            'Encountered an unhandled exception during the handler lookup for "%s". Please see the original error above.',
            connection.client.url
          );
        }
        throw error4;
      }
    }
    if (!hasMatchingHandlers) {
      await executeUnhandledFrameHandle(this, onUnhandledFrame).then(
        () => this.passthrough(),
        (error4) => this.errorWith(error4)
      );
      return false;
    }
    return true;
  }
  async getUnhandledMessage() {
    const { connection } = this.data;
    const details = `

  \u2022 ${connection.client.url}

`;
    return `intercepted a WebSocket connection without a matching event handler:${details}If you still wish to intercept this unhandled connection, please create an event handler for it.
Read more: https://mswjs.io/docs/websocket`;
  }
};

// node_modules/msw/lib/core/experimental/sources/interceptor-source.mjs
var InterceptorSource = class extends NetworkSource {
  #interceptor;
  #frames;
  constructor(options) {
    super();
    this.#interceptor = new BatchInterceptor({
      name: "interceptor-source",
      interceptors: options.interceptors
    });
    this.#frames = /* @__PURE__ */ new Map();
  }
  enable() {
    this.#interceptor.apply();
    this.#interceptor.on("request", this.#handleRequest.bind(this)).on("response", this.#handleResponse.bind(this)).on("connection", this.#handleWebSocketConnection.bind(this));
  }
  disable() {
    super.disable();
    this.#interceptor.dispose();
    this.#frames.clear();
  }
  async #handleRequest({
    requestId,
    request,
    controller
  }) {
    const httpFrame = new InterceptorHttpNetworkFrame({
      id: requestId,
      request,
      controller
    });
    this.#frames.set(requestId, httpFrame);
    await this.queue(httpFrame);
  }
  async #handleResponse({
    requestId,
    request,
    response,
    isMockedResponse
  }) {
    const httpFrame = this.#frames.get(requestId);
    this.#frames.delete(requestId);
    if (httpFrame == null) {
      return;
    }
    queueMicrotask(() => {
      try {
        httpFrame.events.emit(
          new ResponseEvent(
            isMockedResponse ? "response:mocked" : "response:bypass",
            {
              requestId,
              request,
              response
            }
          )
        );
      } finally {
        httpFrame.events.removeAllListeners();
      }
    });
  }
  async #handleWebSocketConnection(connection) {
    await this.queue(
      new InterceptorWebSocketNetworkFrame({
        connection
      })
    );
  }
};
var InterceptorHttpNetworkFrame = class extends HttpNetworkFrame {
  #controller;
  constructor(options) {
    super({
      id: options.id,
      request: options.request
    });
    this.#controller = options.controller;
  }
  passthrough() {
    deleteRequestPassthroughHeader(this.data.request);
  }
  respondWith(response) {
    if (response) {
      this.#controller.respondWith(response);
    }
  }
  errorWith(reason) {
    if (reason instanceof Response) {
      return this.respondWith(reason);
    }
    if (reason instanceof InternalError) {
      this.#controller.errorWith(reason);
    }
    throw reason;
  }
};
var InterceptorWebSocketNetworkFrame = class extends WebSocketNetworkFrame {
  constructor(args) {
    super({ connection: args.connection });
    args.connection.client.addEventListener(
      "close",
      () => {
        this.events.removeAllListeners();
      },
      {
        once: true
      }
    );
  }
  errorWith(reason) {
    if (reason instanceof Error) {
      const { client } = this.data.connection;
      const errorEvent = new Event("error");
      Object.defineProperty(errorEvent, "cause", {
        enumerable: true,
        configurable: false,
        value: reason
      });
      client.socket.dispatchEvent(errorEvent);
    }
  }
  passthrough() {
    this.data.connection.server.connect();
  }
};

// node_modules/msw/lib/core/experimental/compat.mjs
function fromLegacyOnUnhandledRequest(getLegacyValue) {
  return ({ frame, defaults }) => {
    const legacyOnUnhandledRequestStrategy = getLegacyValue();
    if (legacyOnUnhandledRequestStrategy == null) {
      return;
    }
    if (typeof legacyOnUnhandledRequestStrategy === "function") {
      const request = frame instanceof HttpNetworkFrame ? frame.data.request : frame instanceof WebSocketNetworkFrame ? new Request(frame.data.connection.client.url, {
        headers: {
          connection: "upgrade",
          upgrade: "websocket"
        }
      }) : null;
      invariant(
        request != null,
        'Failed to coerce a network frame to a legacy `onUnhandledRequest` strategy: unknown frame protocol "%s"',
        frame.protocol
      );
      return legacyOnUnhandledRequestStrategy(request, {
        warning: defaults.warn,
        error: defaults.error
      });
    }
    return executeUnhandledFrameHandle(frame, legacyOnUnhandledRequestStrategy);
  };
}

// node_modules/msw/lib/core/utils/toResponseInit.mjs
function toResponseInit(response) {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  };
}

// node_modules/msw/lib/browser/index.mjs
var POSITIONALS_EXP2 = /(%?)(%([sdijo]))/g;
function serializePositional2(positional, flag) {
  switch (flag) {
    case "s":
      return positional;
    case "d":
    case "i":
      return Number(positional);
    case "j":
      return JSON.stringify(positional);
    case "o": {
      if (typeof positional === "string") {
        return positional;
      }
      const json = JSON.stringify(positional);
      if (json === "{}" || json === "[]" || /^\[object .+?\]$/.test(json)) {
        return positional;
      }
      return json;
    }
  }
}
function format2(message4, ...positionals) {
  if (positionals.length === 0) {
    return message4;
  }
  let positionalIndex = 0;
  let formattedMessage = message4.replace(
    POSITIONALS_EXP2,
    (match2, isEscaped, _, flag) => {
      const positional = positionals[positionalIndex];
      const value = serializePositional2(positional, flag);
      if (!isEscaped) {
        positionalIndex++;
        return value;
      }
      return match2;
    }
  );
  if (positionalIndex < positionals.length) {
    formattedMessage += ` ${positionals.slice(positionalIndex).join(" ")}`;
  }
  formattedMessage = formattedMessage.replace(/%{2,2}/g, "%");
  return formattedMessage;
}
var STACK_FRAMES_TO_IGNORE2 = 2;
function cleanErrorStack2(error22) {
  if (!error22.stack) {
    return;
  }
  const nextStack = error22.stack.split("\n");
  nextStack.splice(1, STACK_FRAMES_TO_IGNORE2);
  error22.stack = nextStack.join("\n");
}
var InvariantError2 = class extends Error {
  constructor(message4, ...positionals) {
    super(message4);
    this.message = message4;
    this.name = "Invariant Violation";
    this.message = format2(message4, ...positionals);
    cleanErrorStack2(this);
  }
};
var invariant2 = (predicate, message4, ...positionals) => {
  if (!predicate) {
    throw new InvariantError2(message4, ...positionals);
  }
};
invariant2.as = (ErrorConstructor, predicate, message4, ...positionals) => {
  if (!predicate) {
    const formatMessage2 = positionals.length === 0 ? message4 : format2(message4, ...positionals);
    let error22;
    try {
      error22 = Reflect.construct(ErrorConstructor, [
        formatMessage2
      ]);
    } catch (err) {
      error22 = ErrorConstructor(formatMessage2);
    }
    throw error22;
  }
};
function isNodeProcess2() {
  if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
    return true;
  }
  if (typeof process !== "undefined") {
    const type = process.type;
    if (type === "renderer" || type === "worker") {
      return false;
    }
    return !!(process.versions && process.versions.node);
  }
  return false;
}
var __defProp3 = Object.defineProperty;
var __export2 = (target, all) => {
  for (var name in all)
    __defProp3(target, name, { get: all[name], enumerable: true });
};
var colors_exports2 = {};
__export2(colors_exports2, {
  blue: () => blue2,
  gray: () => gray2,
  green: () => green2,
  red: () => red2,
  yellow: () => yellow2
});
function yellow2(text) {
  return `\x1B[33m${text}\x1B[0m`;
}
function blue2(text) {
  return `\x1B[34m${text}\x1B[0m`;
}
function gray2(text) {
  return `\x1B[90m${text}\x1B[0m`;
}
function red2(text) {
  return `\x1B[31m${text}\x1B[0m`;
}
function green2(text) {
  return `\x1B[32m${text}\x1B[0m`;
}
var IS_NODE2 = isNodeProcess2();
var Logger2 = class {
  constructor(name) {
    this.name = name;
    this.prefix = `[${this.name}]`;
    const LOGGER_NAME = getVariable2("DEBUG");
    const LOGGER_LEVEL = getVariable2("LOG_LEVEL");
    const isLoggingEnabled = LOGGER_NAME === "1" || LOGGER_NAME === "true" || typeof LOGGER_NAME !== "undefined" && this.name.startsWith(LOGGER_NAME);
    if (isLoggingEnabled) {
      this.debug = isDefinedAndNotEquals2(LOGGER_LEVEL, "debug") ? noop2 : this.debug;
      this.info = isDefinedAndNotEquals2(LOGGER_LEVEL, "info") ? noop2 : this.info;
      this.success = isDefinedAndNotEquals2(LOGGER_LEVEL, "success") ? noop2 : this.success;
      this.warning = isDefinedAndNotEquals2(LOGGER_LEVEL, "warning") ? noop2 : this.warning;
      this.error = isDefinedAndNotEquals2(LOGGER_LEVEL, "error") ? noop2 : this.error;
    } else {
      this.info = noop2;
      this.success = noop2;
      this.warning = noop2;
      this.error = noop2;
      this.only = noop2;
    }
  }
  prefix;
  extend(domain) {
    return new Logger2(`${this.name}:${domain}`);
  }
  /**
   * Print a debug message.
   * @example
   * logger.debug('no duplicates found, creating a document...')
   */
  debug(message4, ...positionals) {
    this.logEntry({
      level: "debug",
      message: gray2(message4),
      positionals,
      prefix: this.prefix,
      colors: {
        prefix: "gray"
      }
    });
  }
  /**
   * Print an info message.
   * @example
   * logger.info('start parsing...')
   */
  info(message4, ...positionals) {
    this.logEntry({
      level: "info",
      message: message4,
      positionals,
      prefix: this.prefix,
      colors: {
        prefix: "blue"
      }
    });
    const performance2 = new PerformanceEntry2();
    return (message22, ...positionals2) => {
      performance2.measure();
      this.logEntry({
        level: "info",
        message: `${message22} ${gray2(`${performance2.deltaTime}ms`)}`,
        positionals: positionals2,
        prefix: this.prefix,
        colors: {
          prefix: "blue"
        }
      });
    };
  }
  /**
   * Print a success message.
   * @example
   * logger.success('successfully created document')
   */
  success(message4, ...positionals) {
    this.logEntry({
      level: "info",
      message: message4,
      positionals,
      prefix: `\u2714 ${this.prefix}`,
      colors: {
        timestamp: "green",
        prefix: "green"
      }
    });
  }
  /**
   * Print a warning.
   * @example
   * logger.warning('found legacy document format')
   */
  warning(message4, ...positionals) {
    this.logEntry({
      level: "warning",
      message: message4,
      positionals,
      prefix: `\u26A0 ${this.prefix}`,
      colors: {
        timestamp: "yellow",
        prefix: "yellow"
      }
    });
  }
  /**
   * Print an error message.
   * @example
   * logger.error('something went wrong')
   */
  error(message4, ...positionals) {
    this.logEntry({
      level: "error",
      message: message4,
      positionals,
      prefix: `\u2716 ${this.prefix}`,
      colors: {
        timestamp: "red",
        prefix: "red"
      }
    });
  }
  /**
   * Execute the given callback only when the logging is enabled.
   * This is skipped in its entirety and has no runtime cost otherwise.
   * This executes regardless of the log level.
   * @example
   * logger.only(() => {
   *   logger.info('additional info')
   * })
   */
  only(callback) {
    callback();
  }
  createEntry(level, message4) {
    return {
      timestamp: /* @__PURE__ */ new Date(),
      level,
      message: message4
    };
  }
  logEntry(args) {
    const {
      level,
      message: message4,
      prefix,
      colors: customColors,
      positionals = []
    } = args;
    const entry = this.createEntry(level, message4);
    const timestampColor = customColors?.timestamp || "gray";
    const prefixColor = customColors?.prefix || "gray";
    const colorize = {
      timestamp: colors_exports2[timestampColor],
      prefix: colors_exports2[prefixColor]
    };
    const write = this.getWriter(level);
    write(
      [colorize.timestamp(this.formatTimestamp(entry.timestamp))].concat(prefix != null ? colorize.prefix(prefix) : []).concat(serializeInput2(message4)).join(" "),
      ...positionals.map(serializeInput2)
    );
  }
  formatTimestamp(timestamp) {
    return `${timestamp.toLocaleTimeString(
      "en-GB"
    )}:${timestamp.getMilliseconds()}`;
  }
  getWriter(level) {
    switch (level) {
      case "debug":
      case "success":
      case "info": {
        return log2;
      }
      case "warning": {
        return warn3;
      }
      case "error": {
        return error3;
      }
    }
  }
};
var PerformanceEntry2 = class {
  startTime;
  endTime;
  deltaTime;
  constructor() {
    this.startTime = performance.now();
  }
  measure() {
    this.endTime = performance.now();
    const deltaTime = this.endTime - this.startTime;
    this.deltaTime = deltaTime.toFixed(2);
  }
};
var noop2 = () => void 0;
function log2(message4, ...positionals) {
  if (IS_NODE2) {
    process.stdout.write(format2(message4, ...positionals) + "\n");
    return;
  }
  console.log(message4, ...positionals);
}
function warn3(message4, ...positionals) {
  if (IS_NODE2) {
    process.stderr.write(format2(message4, ...positionals) + "\n");
    return;
  }
  console.warn(message4, ...positionals);
}
function error3(message4, ...positionals) {
  if (IS_NODE2) {
    process.stderr.write(format2(message4, ...positionals) + "\n");
    return;
  }
  console.error(message4, ...positionals);
}
function getVariable2(variableName) {
  if (IS_NODE2) {
    return process.env[variableName];
  }
  return globalThis[variableName]?.toString();
}
function isDefinedAndNotEquals2(value, expected) {
  return value !== void 0 && value !== expected;
}
function serializeInput2(message4) {
  if (typeof message4 === "undefined") {
    return "undefined";
  }
  if (message4 === null) {
    return "null";
  }
  if (typeof message4 === "string") {
    return message4;
  }
  if (typeof message4 === "object") {
    return JSON.stringify(message4);
  }
  return message4.toString();
}
var MemoryLeakError2 = class extends Error {
  constructor(emitter, type, count) {
    super(
      `Possible EventEmitter memory leak detected. ${count} ${type.toString()} listeners added. Use emitter.setMaxListeners() to increase limit`
    );
    this.emitter = emitter;
    this.type = type;
    this.count = count;
    this.name = "MaxListenersExceededWarning";
  }
};
var _Emitter2 = class {
  static listenerCount(emitter, eventName) {
    return emitter.listenerCount(eventName);
  }
  constructor() {
    this.events = /* @__PURE__ */ new Map();
    this.maxListeners = _Emitter2.defaultMaxListeners;
    this.hasWarnedAboutPotentialMemoryLeak = false;
  }
  _emitInternalEvent(internalEventName, eventName, listener) {
    this.emit(
      internalEventName,
      ...[eventName, listener]
    );
  }
  _getListeners(eventName) {
    return Array.prototype.concat.apply([], this.events.get(eventName)) || [];
  }
  _removeListener(listeners, listener) {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    return [];
  }
  _wrapOnceListener(eventName, listener) {
    const onceListener = (...data) => {
      this.removeListener(eventName, onceListener);
      return listener.apply(this, data);
    };
    Object.defineProperty(onceListener, "name", { value: listener.name });
    return onceListener;
  }
  setMaxListeners(maxListeners) {
    this.maxListeners = maxListeners;
    return this;
  }
  /**
   * Returns the current max listener value for the `Emitter` which is
   * either set by `emitter.setMaxListeners(n)` or defaults to
   * `Emitter.defaultMaxListeners`.
   */
  getMaxListeners() {
    return this.maxListeners;
  }
  /**
   * Returns an array listing the events for which the emitter has registered listeners.
   * The values in the array will be strings or Symbols.
   */
  eventNames() {
    return Array.from(this.events.keys());
  }
  /**
   * Synchronously calls each of the listeners registered for the event named `eventName`,
   * in the order they were registered, passing the supplied arguments to each.
   * Returns `true` if the event has listeners, `false` otherwise.
   *
   * @example
   * const emitter = new Emitter<{ hello: [string] }>()
   * emitter.emit('hello', 'John')
   */
  emit(eventName, ...data) {
    const listeners = this._getListeners(eventName);
    listeners.forEach((listener) => {
      listener.apply(this, data);
    });
    return listeners.length > 0;
  }
  addListener(eventName, listener) {
    this._emitInternalEvent("newListener", eventName, listener);
    const nextListeners = this._getListeners(eventName).concat(listener);
    this.events.set(eventName, nextListeners);
    if (this.maxListeners > 0 && this.listenerCount(eventName) > this.maxListeners && !this.hasWarnedAboutPotentialMemoryLeak) {
      this.hasWarnedAboutPotentialMemoryLeak = true;
      const memoryLeakWarning = new MemoryLeakError2(
        this,
        eventName,
        this.listenerCount(eventName)
      );
      console.warn(memoryLeakWarning);
    }
    return this;
  }
  on(eventName, listener) {
    return this.addListener(eventName, listener);
  }
  once(eventName, listener) {
    return this.addListener(
      eventName,
      this._wrapOnceListener(eventName, listener)
    );
  }
  prependListener(eventName, listener) {
    const listeners = this._getListeners(eventName);
    if (listeners.length > 0) {
      const nextListeners = [listener].concat(listeners);
      this.events.set(eventName, nextListeners);
    } else {
      this.events.set(eventName, listeners.concat(listener));
    }
    return this;
  }
  prependOnceListener(eventName, listener) {
    return this.prependListener(
      eventName,
      this._wrapOnceListener(eventName, listener)
    );
  }
  removeListener(eventName, listener) {
    const listeners = this._getListeners(eventName);
    if (listeners.length > 0) {
      this._removeListener(listeners, listener);
      this.events.set(eventName, listeners);
      this._emitInternalEvent("removeListener", eventName, listener);
    }
    return this;
  }
  /**
   * Alias for `emitter.removeListener()`.
   *
   * @example
   * emitter.off('hello', listener)
   */
  off(eventName, listener) {
    return this.removeListener(eventName, listener);
  }
  removeAllListeners(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
    return this;
  }
  /**
   * Returns a copy of the array of listeners for the event named `eventName`.
   */
  listeners(eventName) {
    return Array.from(this._getListeners(eventName));
  }
  /**
   * Returns the number of listeners listening to the event named `eventName`.
   */
  listenerCount(eventName) {
    return this._getListeners(eventName).length;
  }
  rawListeners(eventName) {
    return this.listeners(eventName);
  }
};
var Emitter3 = _Emitter2;
Emitter3.defaultMaxListeners = 10;
var INTERNAL_REQUEST_ID_HEADER_NAME2 = "x-interceptors-internal-request-id";
function getGlobalSymbol2(symbol) {
  return globalThis[symbol] || void 0;
}
function setGlobalSymbol2(symbol, value) {
  globalThis[symbol] = value;
}
function deleteGlobalSymbol2(symbol) {
  delete globalThis[symbol];
}
var InterceptorReadyState2 = /* @__PURE__ */ (function(InterceptorReadyState$1) {
  InterceptorReadyState$1["INACTIVE"] = "INACTIVE";
  InterceptorReadyState$1["APPLYING"] = "APPLYING";
  InterceptorReadyState$1["APPLIED"] = "APPLIED";
  InterceptorReadyState$1["DISPOSING"] = "DISPOSING";
  InterceptorReadyState$1["DISPOSED"] = "DISPOSED";
  return InterceptorReadyState$1;
})({});
var Interceptor2 = class {
  constructor(symbol) {
    this.symbol = symbol;
    this.readyState = InterceptorReadyState2.INACTIVE;
    this.emitter = new Emitter3();
    this.subscriptions = [];
    this.logger = new Logger2(symbol.description);
    this.emitter.setMaxListeners(0);
    this.logger.info("constructing the interceptor...");
  }
  /**
  * Determine if this interceptor can be applied
  * in the current environment.
  */
  checkEnvironment() {
    return true;
  }
  /**
  * Apply this interceptor to the current process.
  * Returns an already running interceptor instance if it's present.
  */
  apply() {
    const logger = this.logger.extend("apply");
    logger.info("applying the interceptor...");
    if (this.readyState === InterceptorReadyState2.APPLIED) {
      logger.info("intercepted already applied!");
      return;
    }
    if (!this.checkEnvironment()) {
      logger.info("the interceptor cannot be applied in this environment!");
      return;
    }
    this.readyState = InterceptorReadyState2.APPLYING;
    const runningInstance = this.getInstance();
    if (runningInstance) {
      logger.info("found a running instance, reusing...");
      this.on = (event, listener) => {
        logger.info('proxying the "%s" listener', event);
        runningInstance.emitter.addListener(event, listener);
        this.subscriptions.push(() => {
          runningInstance.emitter.removeListener(event, listener);
          logger.info('removed proxied "%s" listener!', event);
        });
        return this;
      };
      this.readyState = InterceptorReadyState2.APPLIED;
      return;
    }
    logger.info("no running instance found, setting up a new instance...");
    this.setup();
    this.setInstance();
    this.readyState = InterceptorReadyState2.APPLIED;
  }
  /**
  * Setup the module augments and stubs necessary for this interceptor.
  * This method is not run if there's a running interceptor instance
  * to prevent instantiating an interceptor multiple times.
  */
  setup() {
  }
  /**
  * Listen to the interceptor's public events.
  */
  on(event, listener) {
    const logger = this.logger.extend("on");
    if (this.readyState === InterceptorReadyState2.DISPOSING || this.readyState === InterceptorReadyState2.DISPOSED) {
      logger.info("cannot listen to events, already disposed!");
      return this;
    }
    logger.info('adding "%s" event listener:', event, listener);
    this.emitter.on(event, listener);
    return this;
  }
  once(event, listener) {
    this.emitter.once(event, listener);
    return this;
  }
  off(event, listener) {
    this.emitter.off(event, listener);
    return this;
  }
  removeAllListeners(event) {
    this.emitter.removeAllListeners(event);
    return this;
  }
  /**
  * Disposes of any side-effects this interceptor has introduced.
  */
  dispose() {
    const logger = this.logger.extend("dispose");
    if (this.readyState === InterceptorReadyState2.DISPOSED) {
      logger.info("cannot dispose, already disposed!");
      return;
    }
    logger.info("disposing the interceptor...");
    this.readyState = InterceptorReadyState2.DISPOSING;
    if (!this.getInstance()) {
      logger.info("no interceptors running, skipping dispose...");
      return;
    }
    this.clearInstance();
    logger.info("global symbol deleted:", getGlobalSymbol2(this.symbol));
    if (this.subscriptions.length > 0) {
      logger.info("disposing of %d subscriptions...", this.subscriptions.length);
      for (const dispose of this.subscriptions) dispose();
      this.subscriptions = [];
      logger.info("disposed of all subscriptions!", this.subscriptions.length);
    }
    this.emitter.removeAllListeners();
    logger.info("destroyed the listener!");
    this.readyState = InterceptorReadyState2.DISPOSED;
  }
  getInstance() {
    const instance = getGlobalSymbol2(this.symbol);
    this.logger.info("retrieved global instance:", instance?.constructor?.name);
    return instance;
  }
  setInstance() {
    setGlobalSymbol2(this.symbol, this);
    this.logger.info("set global instance!", this.symbol.description);
  }
  clearInstance() {
    deleteGlobalSymbol2(this.symbol);
    this.logger.info("cleared global instance!", this.symbol.description);
  }
};
function createRequestId2() {
  return Math.random().toString(16).slice(2);
}
function resolveWebSocketUrl2(url) {
  if (typeof url === "string") return resolveWebSocketUrl2(new URL(url, typeof location !== "undefined" ? location.href : void 0));
  if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:")
    throw new SyntaxError(`Failed to construct 'WebSocket': The URL's scheme must be either 'http', 'https', 'ws', or 'wss'. '${url.protocol}' is not allowed.`);
  if (url.hash !== "") throw new SyntaxError(`Failed to construct 'WebSocket': The URL contains a fragment identifier ('${url.hash}'). Fragment identifiers are not allowed in WebSocket URLs.`);
  return url.href;
}
async function emitAsync2(emitter, eventName, ...data) {
  const listeners = emitter.listeners(eventName);
  if (listeners.length === 0) return;
  for (const listener of listeners) await listener.apply(emitter, data);
}
var PatchesRegistry2 = class {
  #replacements = /* @__PURE__ */ new Map();
  applyPatch(owner, key, getNextValue) {
    const ownerReplacements = this.#replacements.get(owner);
    invariant2(!ownerReplacements?.has(key), `Failed to replace a global value at "${String(key)}": already replaced.`);
    const match2 = getDeepPropertyDescriptor2(owner, key);
    if (typeof match2 === "undefined") {
      console.warn(`Failed to replace a global value at "${String(key)}": not a global value.`);
      return () => {
      };
    }
    if (match2.descriptor.configurable) Object.defineProperty(owner, key, {
      value: getNextValue(owner[key]),
      enumerable: true,
      configurable: true
    });
    else if (match2.descriptor.writable) owner[key] = getNextValue(owner[key]);
    else throw new Error(`Failed to patch a non-configurable non-writable property "${key.toString()}"`);
    const restorePatch = () => {
      const currentReplacements = this.#replacements.get(owner);
      if (!currentReplacements?.has(key)) return;
      if (match2.owner === owner)
        Object.defineProperty(match2.owner, key, match2.descriptor);
      else
        Reflect.deleteProperty(owner, key);
      currentReplacements.delete(key);
      if (currentReplacements.size === 0) this.#replacements.delete(owner);
    };
    if (ownerReplacements) ownerReplacements.set(key, restorePatch);
    else this.#replacements.set(owner, /* @__PURE__ */ new Map([[key, restorePatch]]));
    return restorePatch;
  }
  restoreAllPatches() {
    const errors = [];
    for (const [, ownerReplacements] of this.#replacements) for (const [, restorePatch] of ownerReplacements) try {
      restorePatch();
    } catch (error22) {
      if (error22 instanceof Error) errors.push(error22);
      else throw error22;
    }
    if (errors.length > 0) throw new AggregateError(errors, "FOO!");
  }
};
var patchesRegistry2 = new PatchesRegistry2();
function getDeepPropertyDescriptor2(owner, key) {
  let currentOwner = owner;
  let descriptor;
  while (currentOwner) {
    descriptor = Object.getOwnPropertyDescriptor(currentOwner, key);
    if (descriptor) return {
      owner: currentOwner,
      descriptor
    };
    currentOwner = Object.getPrototypeOf(currentOwner);
  }
}
function hasConfigurableGlobal2(propertyName) {
  const match2 = getDeepPropertyDescriptor2(globalThis, propertyName);
  if (typeof match2 === "undefined") return false;
  const { descriptor } = match2;
  if (typeof descriptor.get === "function" && typeof descriptor.get() === "undefined") return false;
  if (typeof descriptor.get === "undefined" && descriptor.value == null) return false;
  if (typeof descriptor.set === "undefined" && !descriptor.configurable) {
    console.error(`[MSW] Failed to apply interceptor: the global \`${propertyName}\` property is non-configurable. This is likely an issue with your environment. If you are using a framework, please open an issue about this in their repository.`);
    return false;
  }
  return true;
}
function createDeferredExecutor3() {
  const executor = (resolve, reject) => {
    executor.state = "pending";
    executor.resolve = (data) => {
      if (executor.state !== "pending") {
        return;
      }
      executor.result = data;
      const onFulfilled = (value) => {
        executor.state = "fulfilled";
        return value;
      };
      return resolve(
        data instanceof Promise ? data : Promise.resolve(data).then(onFulfilled)
      );
    };
    executor.reject = (reason) => {
      if (executor.state !== "pending") {
        return;
      }
      queueMicrotask(() => {
        executor.state = "rejected";
      });
      return reject(executor.rejectionReason = reason);
    };
  };
  return executor;
}
var DeferredPromise3 = class extends Promise {
  #executor;
  resolve;
  reject;
  constructor(executor = null) {
    const deferredExecutor = createDeferredExecutor3();
    super((originalResolve, originalReject) => {
      deferredExecutor(originalResolve, originalReject);
      executor?.(deferredExecutor.resolve, deferredExecutor.reject);
    });
    this.#executor = deferredExecutor;
    this.resolve = this.#executor.resolve;
    this.reject = this.#executor.reject;
  }
  get state() {
    return this.#executor.state;
  }
  get rejectionReason() {
    return this.#executor.rejectionReason;
  }
  then(onFulfilled, onRejected) {
    return this.#decorate(super.then(onFulfilled, onRejected));
  }
  catch(onRejected) {
    return this.#decorate(super.catch(onRejected));
  }
  finally(onfinally) {
    return this.#decorate(super.finally(onfinally));
  }
  #decorate(promise) {
    return Object.defineProperties(promise, {
      resolve: { configurable: true, value: this.resolve },
      reject: { configurable: true, value: this.reject }
    });
  }
};
function bindEvent2(target, event) {
  Object.defineProperties(event, {
    target: {
      value: target,
      enumerable: true,
      writable: true
    },
    currentTarget: {
      value: target,
      enumerable: true,
      writable: true
    }
  });
  return event;
}
var kCancelable2 = /* @__PURE__ */ Symbol("kCancelable");
var kDefaultPrevented3 = /* @__PURE__ */ Symbol("kDefaultPrevented");
var CancelableMessageEvent2 = class extends MessageEvent {
  constructor(type, init) {
    super(type, init);
    this[kCancelable2] = !!init.cancelable;
    this[kDefaultPrevented3] = false;
  }
  get cancelable() {
    return this[kCancelable2];
  }
  set cancelable(nextCancelable) {
    this[kCancelable2] = nextCancelable;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented3];
  }
  set defaultPrevented(nextDefaultPrevented) {
    this[kDefaultPrevented3] = nextDefaultPrevented;
  }
  preventDefault() {
    if (this.cancelable && !this[kDefaultPrevented3]) this[kDefaultPrevented3] = true;
  }
};
var CloseEvent2 = class extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.code = init.code === void 0 ? 0 : init.code;
    this.reason = init.reason === void 0 ? "" : init.reason;
    this.wasClean = init.wasClean === void 0 ? false : init.wasClean;
  }
};
var CancelableCloseEvent2 = class extends CloseEvent2 {
  constructor(type, init = {}) {
    super(type, init);
    this[kCancelable2] = !!init.cancelable;
    this[kDefaultPrevented3] = false;
  }
  get cancelable() {
    return this[kCancelable2];
  }
  set cancelable(nextCancelable) {
    this[kCancelable2] = nextCancelable;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented3];
  }
  set defaultPrevented(nextDefaultPrevented) {
    this[kDefaultPrevented3] = nextDefaultPrevented;
  }
  preventDefault() {
    if (this.cancelable && !this[kDefaultPrevented3]) this[kDefaultPrevented3] = true;
  }
};
var kEmitter$12 = /* @__PURE__ */ Symbol("kEmitter");
var kBoundListener$12 = /* @__PURE__ */ Symbol("kBoundListener");
var WebSocketClientConnection2 = class {
  constructor(socket, transport) {
    this.socket = socket;
    this.transport = transport;
    this.id = createRequestId2();
    this.url = new URL(socket.url);
    this[kEmitter$12] = new EventTarget();
    this.transport.addEventListener("outgoing", (event) => {
      const message4 = bindEvent2(this.socket, new CancelableMessageEvent2("message", {
        data: event.data,
        origin: event.origin,
        cancelable: true
      }));
      this[kEmitter$12].dispatchEvent(message4);
      if (message4.defaultPrevented) event.preventDefault();
    });
    this.transport.addEventListener("close", (event) => {
      this[kEmitter$12].dispatchEvent(bindEvent2(this.socket, new CloseEvent2("close", event)));
    });
  }
  /**
  * Listen for the outgoing events from the connected WebSocket client.
  */
  addEventListener(type, listener, options) {
    if (!Reflect.has(listener, kBoundListener$12)) {
      const boundListener = listener.bind(this.socket);
      Object.defineProperty(listener, kBoundListener$12, {
        value: boundListener,
        enumerable: false,
        configurable: false
      });
    }
    this[kEmitter$12].addEventListener(type, Reflect.get(listener, kBoundListener$12), options);
  }
  /**
  * Removes the listener for the given event.
  */
  removeEventListener(event, listener, options) {
    this[kEmitter$12].removeEventListener(event, Reflect.get(listener, kBoundListener$12), options);
  }
  /**
  * Send data to the connected client.
  */
  send(data) {
    this.transport.send(data);
  }
  /**
  * Close the WebSocket connection.
  * @param {number} code A status code (see https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1).
  * @param {string} reason A custom connection close reason.
  */
  close(code, reason) {
    this.transport.close(code, reason);
  }
};
var WEBSOCKET_CLOSE_CODE_RANGE_ERROR2 = "InvalidAccessError: close code out of user configurable range";
var kPassthroughPromise2 = /* @__PURE__ */ Symbol("kPassthroughPromise");
var kOnSend2 = /* @__PURE__ */ Symbol("kOnSend");
var kClose2 = /* @__PURE__ */ Symbol("kClose");
var WebSocketOverride2 = class extends EventTarget {
  static {
    this.CONNECTING = 0;
  }
  static {
    this.OPEN = 1;
  }
  static {
    this.CLOSING = 2;
  }
  static {
    this.CLOSED = 3;
  }
  constructor(url, protocols) {
    super();
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    this._onopen = null;
    this._onmessage = null;
    this._onerror = null;
    this._onclose = null;
    this.url = resolveWebSocketUrl2(url);
    this.protocol = "";
    this.extensions = "";
    this.binaryType = "blob";
    this.readyState = this.CONNECTING;
    this.bufferedAmount = 0;
    this[kPassthroughPromise2] = new DeferredPromise3();
    queueMicrotask(async () => {
      if (await this[kPassthroughPromise2]) return;
      this.protocol = typeof protocols === "string" ? protocols : Array.isArray(protocols) && protocols.length > 0 ? protocols[0] : "";
      if (this.readyState === this.CONNECTING) {
        this.readyState = this.OPEN;
        this.dispatchEvent(bindEvent2(this, new Event("open")));
      }
    });
  }
  set onopen(listener) {
    this.removeEventListener("open", this._onopen);
    this._onopen = listener;
    if (listener !== null) this.addEventListener("open", listener);
  }
  get onopen() {
    return this._onopen;
  }
  set onmessage(listener) {
    this.removeEventListener("message", this._onmessage);
    this._onmessage = listener;
    if (listener !== null) this.addEventListener("message", listener);
  }
  get onmessage() {
    return this._onmessage;
  }
  set onerror(listener) {
    this.removeEventListener("error", this._onerror);
    this._onerror = listener;
    if (listener !== null) this.addEventListener("error", listener);
  }
  get onerror() {
    return this._onerror;
  }
  set onclose(listener) {
    this.removeEventListener("close", this._onclose);
    this._onclose = listener;
    if (listener !== null) this.addEventListener("close", listener);
  }
  get onclose() {
    return this._onclose;
  }
  /**
  * @see https://websockets.spec.whatwg.org/#ref-for-dom-websocket-send%E2%91%A0
  */
  send(data) {
    if (this.readyState === this.CONNECTING) {
      this.close();
      throw new DOMException("InvalidStateError");
    }
    if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) return;
    this.bufferedAmount += getDataSize2(data);
    queueMicrotask(() => {
      this.bufferedAmount = 0;
      this[kOnSend2]?.(data);
    });
  }
  close(code = 1e3, reason) {
    invariant2(code, WEBSOCKET_CLOSE_CODE_RANGE_ERROR2);
    invariant2(code === 1e3 || code >= 3e3 && code <= 4999, WEBSOCKET_CLOSE_CODE_RANGE_ERROR2);
    this[kClose2](code, reason);
  }
  [kClose2](code = 1e3, reason, wasClean = true) {
    if (this.readyState === this.CLOSING || this.readyState === this.CLOSED) return;
    this.readyState = this.CLOSING;
    queueMicrotask(() => {
      this.readyState = this.CLOSED;
      this.dispatchEvent(bindEvent2(this, new CloseEvent2("close", {
        code,
        reason,
        wasClean
      })));
      this._onopen = null;
      this._onmessage = null;
      this._onerror = null;
      this._onclose = null;
    });
  }
  addEventListener(type, listener, options) {
    return super.addEventListener(type, listener, options);
  }
  removeEventListener(type, callback, options) {
    return super.removeEventListener(type, callback, options);
  }
};
function getDataSize2(data) {
  if (typeof data === "string") return data.length;
  if (data instanceof Blob) return data.size;
  return data.byteLength;
}
var kEmitter3 = /* @__PURE__ */ Symbol("kEmitter");
var kBoundListener2 = /* @__PURE__ */ Symbol("kBoundListener");
var kSend2 = /* @__PURE__ */ Symbol("kSend");
var WebSocketServerConnection2 = class {
  constructor(client, transport, createConnection) {
    this.client = client;
    this.transport = transport;
    this.createConnection = createConnection;
    this[kEmitter3] = new EventTarget();
    this.mockCloseController = new AbortController();
    this.realCloseController = new AbortController();
    this.transport.addEventListener("outgoing", (event) => {
      if (typeof this.realWebSocket === "undefined") return;
      queueMicrotask(() => {
        if (!event.defaultPrevented)
          this[kSend2](event.data);
      });
    });
    this.transport.addEventListener("incoming", this.handleIncomingMessage.bind(this));
  }
  /**
  * The `WebSocket` instance connected to the original server.
  * Accessing this before calling `server.connect()` will throw.
  */
  get socket() {
    invariant2(this.realWebSocket, 'Cannot access "socket" on the original WebSocket server object: the connection is not open. Did you forget to call `server.connect()`?');
    return this.realWebSocket;
  }
  /**
  * Open connection to the original WebSocket server.
  */
  connect() {
    invariant2(!this.realWebSocket || this.realWebSocket.readyState !== WebSocket.OPEN, 'Failed to call "connect()" on the original WebSocket instance: the connection already open');
    const realWebSocket = this.createConnection();
    realWebSocket.binaryType = this.client.binaryType;
    realWebSocket.addEventListener("open", (event) => {
      this[kEmitter3].dispatchEvent(bindEvent2(this.realWebSocket, new Event("open", event)));
    }, { once: true });
    realWebSocket.addEventListener("message", (event) => {
      this.transport.dispatchEvent(bindEvent2(this.realWebSocket, new MessageEvent("incoming", {
        data: event.data,
        origin: event.origin
      })));
    });
    this.client.addEventListener("close", (event) => {
      this.handleMockClose(event);
    }, { signal: this.mockCloseController.signal });
    realWebSocket.addEventListener("close", (event) => {
      this.handleRealClose(event);
    }, { signal: this.realCloseController.signal });
    realWebSocket.addEventListener("error", () => {
      const errorEvent = bindEvent2(realWebSocket, new Event("error", { cancelable: true }));
      this[kEmitter3].dispatchEvent(errorEvent);
      if (!errorEvent.defaultPrevented) this.client.dispatchEvent(bindEvent2(this.client, new Event("error")));
    });
    this.realWebSocket = realWebSocket;
  }
  /**
  * Listen for the incoming events from the original WebSocket server.
  */
  addEventListener(event, listener, options) {
    if (!Reflect.has(listener, kBoundListener2)) {
      const boundListener = listener.bind(this.client);
      Object.defineProperty(listener, kBoundListener2, {
        value: boundListener,
        enumerable: false
      });
    }
    this[kEmitter3].addEventListener(event, Reflect.get(listener, kBoundListener2), options);
  }
  /**
  * Remove the listener for the given event.
  */
  removeEventListener(event, listener, options) {
    this[kEmitter3].removeEventListener(event, Reflect.get(listener, kBoundListener2), options);
  }
  /**
  * Send data to the original WebSocket server.
  * @example
  * server.send('hello')
  * server.send(new Blob(['hello']))
  * server.send(new TextEncoder().encode('hello'))
  */
  send(data) {
    this[kSend2](data);
  }
  [kSend2](data) {
    const { realWebSocket } = this;
    invariant2(realWebSocket, 'Failed to call "server.send()" for "%s": the connection is not open. Did you forget to call "server.connect()"?', this.client.url);
    if (realWebSocket.readyState === WebSocket.CLOSING || realWebSocket.readyState === WebSocket.CLOSED) return;
    if (realWebSocket.readyState === WebSocket.CONNECTING) {
      realWebSocket.addEventListener("open", () => {
        realWebSocket.send(data);
      }, { once: true });
      return;
    }
    realWebSocket.send(data);
  }
  /**
  * Close the actual server connection.
  */
  close() {
    const { realWebSocket } = this;
    invariant2(realWebSocket, 'Failed to close server connection for "%s": the connection is not open. Did you forget to call "server.connect()"?', this.client.url);
    this.realCloseController.abort();
    if (realWebSocket.readyState === WebSocket.CLOSING || realWebSocket.readyState === WebSocket.CLOSED) return;
    realWebSocket.close();
    queueMicrotask(() => {
      this[kEmitter3].dispatchEvent(bindEvent2(this.realWebSocket, new CancelableCloseEvent2("close", {
        code: 1e3,
        cancelable: true
      })));
    });
  }
  handleIncomingMessage(event) {
    const messageEvent = bindEvent2(event.target, new CancelableMessageEvent2("message", {
      data: event.data,
      origin: event.origin,
      cancelable: true
    }));
    this[kEmitter3].dispatchEvent(messageEvent);
    if (!messageEvent.defaultPrevented) this.client.dispatchEvent(bindEvent2(
      /**
      * @note Bind the forwarded original server events
      * to the mock WebSocket instance so it would
      * dispatch them straight away.
      */
      this.client,
      new MessageEvent("message", {
        data: event.data,
        origin: event.origin
      })
    ));
  }
  handleMockClose(_event) {
    if (this.realWebSocket) this.realWebSocket.close();
  }
  handleRealClose(event) {
    this.mockCloseController.abort();
    const closeEvent = bindEvent2(this.realWebSocket, new CancelableCloseEvent2("close", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      cancelable: true
    }));
    this[kEmitter3].dispatchEvent(closeEvent);
    if (!closeEvent.defaultPrevented) this.client[kClose2](event.code, event.reason);
  }
};
var WebSocketClassTransport2 = class extends EventTarget {
  constructor(socket) {
    super();
    this.socket = socket;
    this.socket.addEventListener("close", (event) => {
      this.dispatchEvent(bindEvent2(this.socket, new CloseEvent2("close", event)));
    });
    this.socket[kOnSend2] = (data) => {
      this.dispatchEvent(bindEvent2(this.socket, new CancelableMessageEvent2("outgoing", {
        data,
        origin: this.socket.url,
        cancelable: true
      })));
    };
  }
  addEventListener(type, callback, options) {
    return super.addEventListener(type, callback, options);
  }
  dispatchEvent(event) {
    return super.dispatchEvent(event);
  }
  send(data) {
    queueMicrotask(() => {
      if (this.socket.readyState === this.socket.CLOSING || this.socket.readyState === this.socket.CLOSED) return;
      const dispatchEvent = () => {
        this.socket.dispatchEvent(bindEvent2(
          /**
          * @note Setting this event's "target" to the
          * WebSocket override instance is important.
          * This way it can tell apart original incoming events
          * (must be forwarded to the transport) from the
          * mocked message events like the one below
          * (must be dispatched on the client instance).
          */
          this.socket,
          new MessageEvent("message", {
            data,
            origin: this.socket.url
          })
        ));
      };
      if (this.socket.readyState === this.socket.CONNECTING) this.socket.addEventListener("open", () => {
        dispatchEvent();
      }, { once: true });
      else dispatchEvent();
    });
  }
  close(code, reason) {
    this.socket[kClose2](code, reason);
  }
};
var WebSocketInterceptor3 = class WebSocketInterceptor22 extends Interceptor2 {
  static {
    this.symbol = /* @__PURE__ */ Symbol.for("websocket-interceptor");
  }
  constructor() {
    super(WebSocketInterceptor22.symbol);
  }
  checkEnvironment() {
    return hasConfigurableGlobal2("WebSocket");
  }
  setup() {
    const logger = this.logger.extend("setup");
    const WebSocketProxy = new Proxy(globalThis.WebSocket, { construct: (target, args, newTarget) => {
      const [url, protocols] = args;
      const createConnection = () => {
        return Reflect.construct(target, args, newTarget);
      };
      const socket = new WebSocketOverride2(url, protocols);
      const transport = new WebSocketClassTransport2(socket);
      queueMicrotask(async () => {
        try {
          const server = new WebSocketServerConnection2(socket, transport, createConnection);
          const hasConnectionListeners = this.emitter.listenerCount("connection") > 0;
          await emitAsync2(this.emitter, "connection", {
            client: new WebSocketClientConnection2(socket, transport),
            server,
            info: { protocols }
          });
          if (hasConnectionListeners) socket[kPassthroughPromise2].resolve(false);
          else {
            socket[kPassthroughPromise2].resolve(true);
            server.connect();
            server.addEventListener("open", () => {
              socket.dispatchEvent(bindEvent2(socket, new Event("open")));
              if (server["realWebSocket"]) socket.protocol = server["realWebSocket"].protocol;
            });
          }
        } catch (error22) {
          if (error22 instanceof Error) {
            socket.dispatchEvent(new Event("error"));
            if (socket.readyState !== WebSocket.CLOSING && socket.readyState !== WebSocket.CLOSED) socket[kClose2](1011, error22.message, false);
            console.error(error22);
          }
        }
      });
      return socket;
    } });
    logger.info("patching global WebSocket...");
    this.subscriptions.push(patchesRegistry2.applyPatch(globalThis, "WebSocket", () => WebSocketProxy));
    logger.info("global WebSocket patched!", globalThis.WebSocket.name);
  }
};
function supportsServiceWorker() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof location !== "undefined" && location.protocol !== "file:";
}
function supportsReadableStreamTransfer() {
  try {
    const stream = new ReadableStream({
      start: (controller) => controller.close()
    });
    const message4 = new MessageChannel();
    message4.port1.postMessage(stream, [stream]);
    return true;
  } catch {
    return false;
  }
}
function createDeferredExecutor22() {
  const executor = ((resolve, reject) => {
    executor.state = "pending";
    executor.resolve = (data) => {
      if (executor.state !== "pending") return;
      executor.result = data;
      const onFulfilled = (value) => {
        executor.state = "fulfilled";
        return value;
      };
      return resolve(data instanceof Promise ? data : Promise.resolve(data).then(onFulfilled));
    };
    executor.reject = (reason) => {
      if (executor.state !== "pending") return;
      queueMicrotask(() => {
        executor.state = "rejected";
      });
      return reject(executor.rejectionReason = reason);
    };
  });
  return executor;
}
var DeferredPromise22 = class extends Promise {
  #executor;
  resolve;
  reject;
  constructor(executor = null) {
    const deferredExecutor = createDeferredExecutor22();
    super((originalResolve, originalReject) => {
      deferredExecutor(originalResolve, originalReject);
      executor?.(deferredExecutor.resolve, deferredExecutor.reject);
    });
    this.#executor = deferredExecutor;
    this.resolve = this.#executor.resolve;
    this.reject = this.#executor.reject;
  }
  get state() {
    return this.#executor.state;
  }
  get rejectionReason() {
    return this.#executor.rejectionReason;
  }
  then(onFulfilled, onRejected) {
    return this.#decorate(super.then(onFulfilled, onRejected));
  }
  catch(onRejected) {
    return this.#decorate(super.catch(onRejected));
  }
  finally(onfinally) {
    return this.#decorate(super.finally(onfinally));
  }
  #decorate(promise) {
    return Object.defineProperties(promise, {
      resolve: {
        configurable: true,
        value: this.resolve
      },
      reject: {
        configurable: true,
        value: this.reject
      }
    });
  }
};
var InterceptorError3 = class InterceptorError22 extends Error {
  constructor(message4) {
    super(message4);
    this.name = "InterceptorError";
    Object.setPrototypeOf(this, InterceptorError22.prototype);
  }
};
var RequestController3 = class RequestController22 {
  static {
    this.PENDING = 0;
  }
  static {
    this.PASSTHROUGH = 1;
  }
  static {
    this.RESPONSE = 2;
  }
  static {
    this.ERROR = 3;
  }
  constructor(request, source) {
    this.request = request;
    this.source = source;
    this.readyState = RequestController22.PENDING;
    this.handled = new DeferredPromise3();
  }
  get #handled() {
    return this.handled;
  }
  /**
  * Perform this request as-is.
  */
  async passthrough() {
    invariant2.as(InterceptorError3, this.readyState === RequestController22.PENDING, 'Failed to passthrough the "%s %s" request: the request has already been handled', this.request.method, this.request.url);
    this.readyState = RequestController22.PASSTHROUGH;
    await this.source.passthrough();
    this.#handled.resolve();
  }
  /**
  * Respond to this request with the given `Response` instance.
  *
  * @example
  * controller.respondWith(new Response())
  * controller.respondWith(Response.json({ id }))
  * controller.respondWith(Response.error())
  */
  respondWith(response) {
    invariant2.as(InterceptorError3, this.readyState === RequestController22.PENDING, 'Failed to respond to the "%s %s" request with "%d %s": the request has already been handled (%d)', this.request.method, this.request.url, response.status, response.statusText || "OK", this.readyState);
    this.readyState = RequestController22.RESPONSE;
    this.#handled.resolve();
    this.source.respondWith(response);
  }
  /**
  * Error this request with the given reason.
  *
  * @example
  * controller.errorWith()
  * controller.errorWith(new Error('Oops!'))
  * controller.errorWith({ message: 'Oops!'})
  */
  errorWith(reason) {
    invariant2.as(InterceptorError3, this.readyState === RequestController22.PENDING, 'Failed to error the "%s %s" request with "%s": the request has already been handled (%d)', this.request.method, this.request.url, reason?.toString(), this.readyState);
    this.readyState = RequestController22.ERROR;
    this.source.errorWith(reason);
    this.#handled.resolve();
  }
};
function canParseUrl2(url) {
  try {
    new URL(url);
    return true;
  } catch (_error) {
    return false;
  }
}
function getValueBySymbol2(symbolName, source) {
  const symbol = Object.getOwnPropertySymbols(source).find((symbol$1) => {
    return symbol$1.description === symbolName;
  });
  if (symbol) return Reflect.get(source, symbol);
}
var FetchRequest2 = class FetchRequest22 extends Request {
  static #resolveProperty(input, init = {}, key) {
    return init[key] ?? (input instanceof Request ? input[key] : void 0);
  }
  /**
  * Check if the given request method is configurable.
  * @see https://fetch.spec.whatwg.org/#methods
  */
  static isConfigurableMethod(method) {
    return method !== "CONNECT" && method !== "TRACE" && method !== "TRACK";
  }
  static isMethodWithBody(method) {
    return method !== "HEAD" && method !== "GET" && FetchRequest22.isConfigurableMethod(method);
  }
  /**
  * Check if the given request `mode` is configurable.
  * @see https://fetch.spec.whatwg.org/#concept-request-mode
  */
  static isConfigurableMode(mode) {
    return mode !== "navigate" && mode !== "websocket" && mode !== "webtransport";
  }
  constructor(input, init) {
    const method = FetchRequest22.#resolveProperty(input, init, "method") || "GET";
    const safeMethod = FetchRequest22.isConfigurableMethod(method) ? method : "GET";
    const hasExplicitBody = init != null && "body" in init;
    const bodyInit = !FetchRequest22.isMethodWithBody(method) ? { body: void 0 } : hasExplicitBody ? { body: init.body } : {};
    const mode = FetchRequest22.#resolveProperty(input, init, "mode") ?? void 0;
    const safeMode = FetchRequest22.isConfigurableMode(mode) ? mode : void 0;
    super(input, {
      ...init || {},
      method: safeMethod,
      mode: safeMode,
      duplex: init?.duplex ?? (FetchRequest22.isMethodWithBody(method) ? "half" : void 0),
      ...bodyInit
    });
    if (method !== safeMethod) this.#setInternalProperty("method", method);
    if (method === "CONNECT") {
      const url = new URL(input instanceof Request ? input.url : input);
      let authority;
      if (url.protocol === "localhost:") authority = url.href;
      else authority = url.pathname.replace(/^\/+/, "");
      Object.defineProperty(this, "url", {
        get: () => authority,
        enumerable: true,
        configurable: true
      });
    }
    if (mode != null && mode !== safeMode) this.#setInternalProperty("mode", mode);
  }
  #setInternalProperty(key, value) {
    const internalState = getValueBySymbol2("state", this);
    if (internalState) Reflect.set(internalState, key, value);
    else Object.defineProperty(this, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: false
    });
  }
};
var kStatus2 = /* @__PURE__ */ Symbol("kStatus");
var kUrl2 = /* @__PURE__ */ Symbol("kUrl");
var FetchResponse3 = class FetchResponse22 extends Response {
  static {
    this.STATUS_CODES_WITHOUT_BODY = [
      101,
      103,
      204,
      205,
      304
    ];
  }
  static {
    this.STATUS_CODES_WITH_REDIRECT = [
      301,
      302,
      303,
      307,
      308
    ];
  }
  static isConfigurableStatusCode(status) {
    return status >= 200 && status <= 599;
  }
  static isRedirectResponse(status) {
    return FetchResponse22.STATUS_CODES_WITH_REDIRECT.includes(status);
  }
  /**
  * Returns a boolean indicating whether the given response status
  * code represents a response that can have a body.
  */
  static isResponseWithBody(status) {
    return !FetchResponse22.STATUS_CODES_WITHOUT_BODY.includes(status);
  }
  static setStatus(status, response) {
    const internalState = getValueBySymbol2("state", response);
    if (internalState) internalState.status = status;
    else Object.defineProperty(response, "status", {
      value: status,
      enumerable: true,
      configurable: true,
      writable: false
    });
    Object.defineProperty(response, kStatus2, {
      value: status,
      enumerable: false
    });
  }
  static setUrl(url, response) {
    if (!url || url === "about:" || !canParseUrl2(url)) return;
    const state = getValueBySymbol2("state", response);
    if (state) state.urlList.push(new URL(url));
    else Object.defineProperty(response, "url", {
      value: url,
      enumerable: true,
      configurable: true,
      writable: false
    });
    Object.defineProperty(response, kUrl2, {
      value: url,
      enumerable: false
    });
  }
  /**
  * Parses the given raw HTTP headers into a Fetch API `Headers` instance.
  */
  static parseRawHeaders(rawHeaders) {
    const headers = new Headers();
    for (let line = 0; line < rawHeaders.length; line += 2) headers.append(rawHeaders[line], rawHeaders[line + 1]);
    return headers;
  }
  /**
  * Safely clones the given `Response`.
  * Coerces response clone exceptions into 500 mocked responses.
  * Handy in the environments that introduce arbitrary response
  * cloning restrictions, like "101 Switching Protocols" cloning
  * in "miniflare".
  */
  static clone(response) {
    try {
      return response.clone();
    } catch (error22) {
      return Response.json(error22 instanceof Error ? {
        name: error22.name,
        message: error22.message,
        stack: error22.stack
      } : {}, {
        status: 500,
        statusText: "Unclonable Response"
      });
    }
  }
  constructor(body, init = {}) {
    const status = init.status ?? 200;
    const safeStatus = FetchResponse22.isConfigurableStatusCode(status) ? status : 200;
    const finalBody = FetchResponse22.isResponseWithBody(status) ? body : null;
    super(finalBody, {
      status: safeStatus,
      statusText: init.statusText,
      headers: init.headers
    });
    if (status !== safeStatus) FetchResponse22.setStatus(status, this);
    FetchResponse22.setUrl(init.url, this);
  }
  clone() {
    const clonedResponse = super.clone();
    const customStatus = Reflect.get(this, kStatus2);
    if (customStatus) FetchResponse22.setStatus(customStatus, clonedResponse);
    const customUrl = Reflect.get(this, kUrl2);
    if (customUrl) FetchResponse22.setUrl(customUrl, clonedResponse);
    return clonedResponse;
  }
};
var kRawRequest = /* @__PURE__ */ Symbol("kRawRequest");
function setRawRequest(request, rawRequest) {
  Reflect.set(request, kRawRequest, rawRequest);
}
var encoder2 = new TextEncoder();
function encodeBuffer2(text) {
  return encoder2.encode(text);
}
function decodeBuffer2(buffer, encoding) {
  return new TextDecoder(encoding).decode(buffer);
}
function toArrayBuffer(array) {
  return array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
}
async function until2(callback) {
  try {
    return [null, await callback().catch((error22) => {
      throw error22;
    })];
  } catch (error22) {
    return [error22, null];
  }
}
function getAbsoluteWorkerUrl(workerUrl) {
  return new URL(workerUrl, location.href).href;
}
function getWorkerByRegistration(registration, absoluteWorkerUrl, findWorker) {
  const allStates = [
    registration.active,
    registration.installing,
    registration.waiting
  ];
  const relevantStates = allStates.filter((state) => {
    return state != null;
  });
  const worker2 = relevantStates.find((worker22) => {
    return findWorker(worker22.scriptURL, absoluteWorkerUrl);
  });
  return worker2 || null;
}
var getWorkerInstance = async (url, options = {}, findWorker) => {
  const absoluteWorkerUrl = getAbsoluteWorkerUrl(url);
  const mockRegistrations = await navigator.serviceWorker.getRegistrations().then(
    (registrations) => registrations.filter(
      (registration) => getWorkerByRegistration(registration, absoluteWorkerUrl, findWorker)
    )
  );
  if (!navigator.serviceWorker.controller && mockRegistrations.length > 0) {
    location.reload();
  }
  const [existingRegistration] = mockRegistrations;
  if (existingRegistration) {
    existingRegistration.update();
    return [
      getWorkerByRegistration(
        existingRegistration,
        absoluteWorkerUrl,
        findWorker
      ),
      existingRegistration
    ];
  }
  const [registrationError, registrationResult] = await until2(async () => {
    const registration = await navigator.serviceWorker.register(url, options);
    return [
      // Compare existing worker registration by its worker URL,
      // to prevent irrelevant workers to resolve here (such as Codesandbox worker).
      getWorkerByRegistration(registration, absoluteWorkerUrl, findWorker),
      registration
    ];
  });
  if (registrationError) {
    const isWorkerMissing = registrationError.message.includes("(404)");
    if (isWorkerMissing) {
      const scopeUrl = new URL(options?.scope || "/", location.href);
      throw new Error(
        devUtils.formatMessage(`Failed to register a Service Worker for scope ('${scopeUrl.href}') with script ('${absoluteWorkerUrl}'): Service Worker script does not exist at the given path.

Did you forget to run "npx msw init <PUBLIC_DIR>"?

Learn more about creating the Service Worker script: https://mswjs.io/docs/cli/init`)
      );
    }
    throw new Error(
      devUtils.formatMessage(
        "Failed to register the Service Worker:\n\n%s",
        registrationError.message
      )
    );
  }
  return registrationResult;
};
var LensList2 = class {
  #list;
  #lens;
  constructor() {
    this.#list = [];
    this.#lens = /* @__PURE__ */ new Map();
  }
  get [Symbol.iterator]() {
    return this.#list[Symbol.iterator].bind(this.#list);
  }
  entries() {
    return this.#lens.entries();
  }
  /**
  * Return an order-sensitive list of values by the given key.
  */
  get(key) {
    return this.#lens.get(key) || [];
  }
  /**
  * Return an order-sensitive list of all values.
  */
  getAll() {
    return this.#list.map(([, value]) => value);
  }
  /**
  * Append a new value to the given key.
  */
  append(key, value) {
    this.#list.push([key, value]);
    this.#openLens(key, (list) => list.push(value));
  }
  /**
  * Prepend a new value to the given key.
  */
  prepend(key, value) {
    this.#list.unshift([key, value]);
    this.#openLens(key, (list) => list.unshift(value));
  }
  /**
  * Delete the value belonging to the given key.
  * Returns `true` if the value was present and removed, `false` otherwise.
  */
  delete(key, value) {
    if (this.size === 0) return false;
    const values = this.#lens.get(key);
    if (!values) return false;
    const index = values.indexOf(value);
    if (index === -1) return false;
    values.splice(index, 1);
    this.#list.splice(this.#list.findIndex((item) => item[0] === key && item[1] === value), 1);
    return true;
  }
  /**
  * Delete all values belogning to the given key.
  */
  deleteAll(key) {
    if (this.size === 0) return;
    this.#list = this.#list.filter((item) => item[0] !== key);
    this.#lens.delete(key);
  }
  get size() {
    return this.#list.length;
  }
  clear() {
    if (this.size === 0) return;
    this.#list.length = 0;
    this.#lens.clear();
  }
  #openLens(key, setter) {
    setter(this.#lens.get(key) || this.#lens.set(key, []).get(key));
  }
};
var kDefaultPrevented22 = /* @__PURE__ */ Symbol("kDefaultPrevented");
var kPropagationStopped2 = /* @__PURE__ */ Symbol("kPropagationStopped");
var kImmediatePropagationStopped2 = /* @__PURE__ */ Symbol("kImmediatePropagationStopped");
var TypedEvent2 = class extends MessageEvent {
  /**
  * @note Keep a placeholder property with the return type
  * because the type must be set somewhere in order to be
  * correctly associated and inferred from the event.
  */
  #returnType;
  [kDefaultPrevented22];
  [kPropagationStopped2];
  [kImmediatePropagationStopped2];
  constructor(...args) {
    super(args[0], args[1]);
    this[kDefaultPrevented22] = false;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented22];
  }
  preventDefault() {
    super.preventDefault();
    this[kDefaultPrevented22] = true;
  }
  stopImmediatePropagation() {
    super.stopImmediatePropagation();
    this[kImmediatePropagationStopped2] = true;
  }
};
var Emitter22 = class {
  #listeners;
  #listenerOptions;
  #listenerAbortCleanups;
  #typelessListeners;
  #hookListeners;
  #hookListenerOptions;
  #hookListenerAbortCleanups;
  hooks;
  constructor() {
    this.#listeners = new LensList2();
    this.#listenerOptions = /* @__PURE__ */ new WeakMap();
    this.#listenerAbortCleanups = /* @__PURE__ */ new WeakMap();
    this.#typelessListeners = /* @__PURE__ */ new WeakSet();
    this.#hookListeners = new LensList2();
    this.#hookListenerOptions = /* @__PURE__ */ new WeakMap();
    this.#hookListenerAbortCleanups = /* @__PURE__ */ new WeakMap();
    this.hooks = {
      on: (hook, callback, options) => {
        if (options?.signal?.aborted) return;
        if (options?.once) {
          const original = callback;
          const wrapper = ((...args) => {
            this.#deleteHookListener(hook, wrapper);
            return original(...args);
          });
          callback = wrapper;
        }
        this.#hookListeners.append(hook, callback);
        if (options) this.#hookListenerOptions.set(callback, options);
        if (options?.signal) {
          const { signal } = options;
          const onAbort = () => {
            this.#deleteHookListener(hook, callback);
          };
          signal.addEventListener("abort", onAbort, { once: true });
          this.#hookListenerAbortCleanups.set(callback, () => {
            signal.removeEventListener("abort", onAbort);
          });
        }
      },
      removeListener: (hook, callback) => {
        this.#deleteHookListener(hook, callback);
      }
    };
  }
  #deleteHookListener(hook, callback) {
    this.#hookListeners.delete(hook, callback);
    const cleanup = this.#hookListenerAbortCleanups.get(callback);
    if (cleanup) {
      cleanup();
      this.#hookListenerAbortCleanups.delete(callback);
    }
  }
  #deleteListener(type, listener) {
    const removed = this.#listeners.delete(type, listener);
    const cleanup = this.#listenerAbortCleanups.get(listener);
    if (cleanup) {
      cleanup();
      this.#listenerAbortCleanups.delete(listener);
    }
    return removed;
  }
  /**
  * Adds a listener for the given event type.
  */
  on(type, listener, options) {
    this.#addListener(type, listener, options);
    return this;
  }
  /**
  * Adds a one-time listener for the given event type.
  */
  once(type, listener, options) {
    return this.on(type, listener, {
      ...options || {},
      once: true
    });
  }
  /**
  * Prepends a listener for the given event type.
  */
  earlyOn(type, listener, options) {
    this.#addListener(type, listener, options, "prepend");
    return this;
  }
  /**
  * Prepends a one-time listener for the given event type.
  */
  earlyOnce(type, listener, options) {
    return this.earlyOn(type, listener, {
      ...options || {},
      once: true
    });
  }
  /**
  * Emits the given typed event.
  *
  * @returns {boolean} Returns `true` if the event had any listeners, `false` otherwise.
  */
  emit(event) {
    if (this.#listeners.size === 0) return false;
    const hasListeners = this.listenerCount(event.type) > 0;
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped2] != null && proxiedEvent.event[kPropagationStopped2] !== this) {
        proxiedEvent.revoke();
        return false;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped2]) break;
      this.#callListener(proxiedEvent.event, listener);
    }
    proxiedEvent.revoke();
    return hasListeners;
  }
  /**
  * Emits the given typed event and returns a promise that resolves
  * when all the listeners for that event have settled.
  *
  * @returns {Promise<Array<Emitter.ListenerReturnType>>} A promise that resolves
  * with the return values of all listeners.
  */
  async emitAsPromise(event) {
    if (this.#listeners.size === 0) return [];
    const pendingListeners = [];
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped2] != null && proxiedEvent.event[kPropagationStopped2] !== this) {
        proxiedEvent.revoke();
        return [];
      }
      if (proxiedEvent.event[kImmediatePropagationStopped2]) break;
      const returnValue = await Promise.resolve(this.#callListener(proxiedEvent.event, listener));
      if (!this.#isTypelessListener(listener)) pendingListeners.push(returnValue);
    }
    proxiedEvent.revoke();
    return Promise.allSettled(pendingListeners).then((results) => {
      return results.map((result) => result.status === "fulfilled" ? result.value : result.reason);
    });
  }
  /**
  * Emits the given event and returns a generator that yields
  * the result of each listener in the order of their registration.
  * This way, you stop exhausting the listeners once you get the expected value.
  */
  *emitAsGenerator(event) {
    if (this.#listeners.size === 0) return;
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#matchListeners(event.type)) {
      if (proxiedEvent.event[kPropagationStopped2] != null && proxiedEvent.event[kPropagationStopped2] !== this) {
        proxiedEvent.revoke();
        return;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped2]) break;
      const returnValue = this.#callListener(proxiedEvent.event, listener);
      if (!this.#isTypelessListener(listener)) yield returnValue;
    }
    proxiedEvent.revoke();
  }
  /**
  * Removes a listener for the given event type.
  */
  removeListener(type, listener) {
    const options = this.#listenerOptions.get(listener);
    if (!this.#deleteListener(type, listener)) return;
    for (const hook of this.#hookListeners.get("removeListener").slice()) hook(type, listener, options);
  }
  /**
  * Removes all listeners for the given event type.
  * If no event type is provided, removes all existing listeners.
  */
  removeAllListeners(type) {
    if (type == null) {
      for (const [listenerType, listeners$1] of this.#listeners.entries()) while (listeners$1.length > 0) this.removeListener(listenerType, listeners$1[0]);
      for (const [hookType, hookListener] of [...this.#hookListeners]) if (!this.#hookListenerOptions.get(hookListener)?.persist) this.#deleteHookListener(hookType, hookListener);
      return;
    }
    const listeners = this.listeners(type);
    while (listeners.length > 0) this.removeListener(type, listeners[0]);
  }
  /**
  * Returns the list of listeners for the given event type.
  * If no even type is provided, returns all listeners.
  */
  listeners(type) {
    if (type == null) return this.#listeners.getAll();
    return this.#listeners.get(type);
  }
  /**
  * Returns the number of listeners for the given event type.
  * If no even type is provided, returns the total number of listeners.
  */
  listenerCount(type) {
    if (type == null) return this.#listeners.size;
    return this.listeners(type).length;
  }
  #addListener(type, listener, options, insertMode = "append") {
    if (options?.signal?.aborted) return;
    for (const hook of this.#hookListeners.get("newListener").slice()) hook(type, listener, options);
    if (type === "*") this.#typelessListeners.add(listener);
    if (insertMode === "prepend") this.#listeners.prepend(type, listener);
    else this.#listeners.append(type, listener);
    if (options) {
      this.#listenerOptions.set(listener, options);
      if (options.signal) {
        const { signal } = options;
        const onAbort = () => {
          this.removeListener(type, listener);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        this.#listenerAbortCleanups.set(listener, () => {
          signal.removeEventListener("abort", onAbort);
        });
      }
    }
  }
  #proxyEvent(event) {
    const { stopPropagation } = event;
    event.stopPropagation = () => {
      event[kPropagationStopped2] = this;
      stopPropagation.call(event);
    };
    return {
      event,
      revoke() {
        event.stopPropagation = stopPropagation;
      }
    };
  }
  #callListener(event, listener) {
    for (const hook of this.#hookListeners.get("beforeEmit").slice()) if (hook(event) === false) return;
    const returnValue = listener.call(this, event);
    const options = this.#listenerOptions.get(listener);
    if (options?.once) {
      const type = this.#isTypelessListener(listener) ? "*" : event.type;
      if (this.#deleteListener(type, listener)) for (const hook of this.#hookListeners.get("removeListener").slice()) hook(type, listener, options);
    }
    return returnValue;
  }
  /**
  * Return a list of all event listeners relevant for the given event type.
  * This includes the explicit event listeners and also typeless event listeners.
  *
  * @note Snapshot the matching listeners before yielding. Listeners can add or
  * remove other listeners during emission (e.g. `earlyOn` unshifts `#list`),
  * which would otherwise shift the live iterator and re-yield prior entries.
  */
  *#matchListeners(type) {
    const snapshot = [];
    for (const [key, listener] of this.#listeners) if (key === "*" || key === type) snapshot.push(listener);
    yield* snapshot;
  }
  #isTypelessListener(listener) {
    return this.#typelessListeners.has(listener);
  }
};
var SUPPORTS_SERVICE_WORKER = supportsServiceWorker();
var WorkerEvent = class extends TypedEvent2 {
  #workerEvent;
  constructor(workerEvent) {
    const type = workerEvent.data.type;
    const data = workerEvent.data.payload;
    super(
      // @ts-expect-error Troublesome `TypedEvent` extension.
      type,
      { data }
    );
    this.#workerEvent = workerEvent;
  }
  get ports() {
    return this.#workerEvent.ports;
  }
  /**
   * Reply directly to this event using its `MessagePort`.
   */
  postMessage(type, ...rest) {
    this.#workerEvent.ports[0].postMessage(
      { type, data: rest[0] },
      { transfer: rest[1] }
    );
  }
};
var WorkerChannel = class extends Emitter22 {
  #getWorker;
  #controller;
  constructor(options) {
    super();
    invariant2(
      SUPPORTS_SERVICE_WORKER,
      "Failed to open a WorkerChannel: Service Worker is not supported in this environment."
    );
    this.#getWorker = options.getWorker;
    this.#controller = new AbortController();
    navigator.serviceWorker.addEventListener(
      "message",
      async (event) => {
        const worker2 = await this.#getWorker();
        if (event.source != null && event.source !== worker2) {
          return;
        }
        if (event.data && isObject2(event.data) && "type" in event.data) {
          this.emit(new WorkerEvent(event));
        }
      },
      {
        signal: this.#controller.signal
      }
    );
  }
  /**
   * Send data to the Service Worker controlling this client.
   * This triggers the `message` event listener on ServiceWorkerGlobalScope.
   */
  postMessage(type) {
    invariant2(
      SUPPORTS_SERVICE_WORKER,
      "Failed to post message on a WorkerChannel: the Service Worker API is unavailable in this environment. This is likely an issue with MSW. Please report it on GitHub: https://github.com/mswjs/msw/issues"
    );
    this.#getWorker().then((worker2) => {
      worker2.postMessage(type);
    });
  }
  /**
   * Terminal teardown. Removes the `navigator.serviceWorker` message listener
   * and all emitter subscriptions. The channel is not usable afterwards.
   */
  terminate() {
    this.#controller.abort();
    this.removeAllListeners();
  }
};
function pruneGetRequestBody(request) {
  if (["HEAD", "GET"].includes(request.method)) {
    return void 0;
  }
  return request.body;
}
function deserializeRequest(serializedRequest) {
  return new Request(serializedRequest.url, {
    ...serializedRequest,
    body: pruneGetRequestBody(serializedRequest)
  });
}
function validateWorkerScope(registration) {
  if (!location.href.startsWith(registration.scope)) {
    devUtils.warn(
      `Cannot intercept requests on this page because it's outside of the worker's scope ("${registration.scope}"). If you wish to mock API requests on this page, you must resolve this scope issue.

- (Recommended) Register the worker at the root level ("/") of your application.
- Set the "Service-Worker-Allowed" response header to allow out-of-scope workers.`
    );
  }
}
function shouldInvalidateWorker(prevOptions, nextOptions) {
  return prevOptions.findWorker !== nextOptions.findWorker || prevOptions.serviceWorker.url !== nextOptions.serviceWorker.url || JSON.stringify(prevOptions.serviceWorker.options) !== JSON.stringify(nextOptions.serviceWorker.options);
}
var ServiceWorkerSource = class _ServiceWorkerSource extends NetworkSource {
  static #current;
  /**
   * Create a new Service Worker source or reuse an existing one.
   * These sources act as a singleton and only get recreated if the options change.
   */
  static async from(options) {
    if (_ServiceWorkerSource.#current == null) {
      _ServiceWorkerSource.#current = new _ServiceWorkerSource(options);
    } else if (shouldInvalidateWorker(_ServiceWorkerSource.#current.#options, options)) {
      await _ServiceWorkerSource.#current.terminate();
      _ServiceWorkerSource.#current = new _ServiceWorkerSource(options);
    }
    return _ServiceWorkerSource.#current;
  }
  #options;
  #frames;
  #channel;
  #listenerController;
  #clientPromise;
  #keepAliveInterval;
  #stoppedAt;
  workerPromise;
  constructor(options) {
    super();
    invariant2(
      supportsServiceWorker(),
      "Failed to use Service Worker as the network source: the Service Worker API is not supported in this environment"
    );
    this.#options = options;
    this.#frames = /* @__PURE__ */ new Map();
    this.workerPromise = new DeferredPromise22();
    this.#channel = new WorkerChannel({
      getWorker: () => this.workerPromise.then(([worker2]) => worker2)
    });
  }
  async enable() {
    if (this.workerPromise.state === "fulfilled" && typeof this.#stoppedAt == "undefined") {
      devUtils.warn(
        'Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.'
      );
      return this.workerPromise.then(([, registration2]) => registration2);
    }
    this.#stoppedAt = void 0;
    this.#channel.removeAllListeners();
    this.#frames.clear();
    this.#listenerController = new AbortController();
    const [worker2, registration] = await this.#startWorker();
    if (worker2.state !== "activated") {
      const controller = new AbortController();
      const activationPromise = new DeferredPromise22();
      activationPromise.then(() => controller.abort());
      worker2.addEventListener(
        "statechange",
        () => {
          if (worker2.state === "activated") {
            activationPromise.resolve();
          }
        },
        {
          signal: controller.signal
        }
      );
      await activationPromise;
    }
    this.#channel.postMessage("MOCK_ACTIVATE");
    const clientConfirmationPromise = new DeferredPromise22();
    this.#clientPromise = clientConfirmationPromise;
    this.#channel.once("MOCKING_ENABLED", (event) => {
      clientConfirmationPromise.resolve(event.data.client);
    });
    await clientConfirmationPromise;
    if (!this.#options.quiet) {
      this.#printStartMessage();
    }
    return registration;
  }
  disable() {
    if (typeof this.#stoppedAt !== "undefined") {
      devUtils.warn(
        `Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.`
      );
      return;
    }
    this.#stoppedAt = Date.now();
    this.#listenerController?.abort();
    this.#listenerController = void 0;
    this.#channel.postMessage("CLIENT_CLOSED");
    if (!this.#options.quiet) {
      this.#printStopMessage();
    }
  }
  /**
   * Terminal teardown. Unregisters the Service Worker, tears down the channel,
   * and clears timers. Called when the singleton is being replaced with one
   * that has different options. The instance is not usable afterwards.
   */
  async terminate() {
    if (this.#keepAliveInterval != null) {
      clearInterval(this.#keepAliveInterval);
      this.#keepAliveInterval = void 0;
    }
    this.#frames.clear();
    this.#channel.terminate();
    this.#listenerController?.abort();
    this.#listenerController = void 0;
    if (this.workerPromise.state === "fulfilled") {
      const [, registration] = await this.workerPromise;
      await registration.unregister();
    }
    if (_ServiceWorkerSource.#current === this) {
      _ServiceWorkerSource.#current = void 0;
    }
  }
  async #startWorker() {
    if (this.#keepAliveInterval) {
      clearInterval(this.#keepAliveInterval);
    }
    const workerUrl = this.#options.serviceWorker.url;
    const [worker2, registration] = await getWorkerInstance(
      workerUrl,
      this.#options.serviceWorker.options,
      this.#options.findWorker || this.#defaultFindWorker
    );
    if (worker2 == null) {
      const missingWorkerMessage = this.#options?.findWorker ? devUtils.formatMessage(
        `Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "%s".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
     `,
        workerUrl
      ) : devUtils.formatMessage(
        `Failed to locate the Service Worker registration.

This most likely means that the worker script URL "%s" cannot resolve against the actual public hostname (%s). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`,
        workerUrl,
        location.host
      );
      throw new Error(missingWorkerMessage);
    }
    if (this.workerPromise.state === "pending") {
      this.workerPromise.resolve([worker2, registration]);
    } else {
      this.workerPromise = new DeferredPromise22((resolve) => {
        resolve([worker2, registration]);
      });
    }
    this.#channel.on("REQUEST", this.#handleRequest.bind(this));
    this.#channel.on("RESPONSE", this.#handleResponse.bind(this));
    window.addEventListener(
      "beforeunload",
      () => {
        if (worker2.state !== "redundant") {
          this.#channel.postMessage("CLIENT_CLOSED");
        }
        clearInterval(this.#keepAliveInterval);
        window.postMessage({ type: "msw/worker:stop" });
      },
      {
        signal: this.#listenerController?.signal
      }
    );
    await this.#checkWorkerIntegrity().catch((error22) => {
      devUtils.error(
        "Error while checking the worker script integrity. Please report this on GitHub (https://github.com/mswjs/msw/issues) and include the original error below."
      );
      console.error(error22);
    });
    this.#keepAliveInterval = window.setInterval(() => {
      this.#channel.postMessage("KEEPALIVE_REQUEST");
    }, 5e3);
    if (!this.#options.quiet) {
      validateWorkerScope(registration);
    }
    return [worker2, registration];
  }
  async #handleRequest(event) {
    if (this.#stoppedAt && event.data.interceptedAt > this.#stoppedAt) {
      return event.postMessage("PASSTHROUGH");
    }
    const request = deserializeRequest(event.data);
    RequestHandler.cache.set(request, request.clone());
    const frame = new ServiceWorkerHttpNetworkFrame({
      event,
      request
    });
    this.#frames.set(event.data.id, frame);
    await this.queue(frame);
  }
  async #handleResponse(event) {
    const { request, response, isMockedResponse } = event.data;
    const frame = this.#frames.get(request.id);
    if (response.type?.includes("opaque")) {
      this.#frames.delete(request.id);
      frame?.events.removeAllListeners();
      return;
    }
    this.#frames.delete(request.id);
    if (frame == null) {
      return;
    }
    const fetchRequest = deserializeRequest(request);
    const fetchResponse = response.status === 0 ? Response.error() : new FetchResponse3(
      /**
       * Responses may be streams here, but when we create a response object
       * with null-body status codes, like 204, 205, 304 Response will
       * throw when passed a non-null body, so ensure it's null here
       * for those codes
       */
      FetchResponse3.isResponseWithBody(response.status) ? response.body : null,
      {
        ...response,
        /**
         * Set response URL if it's not set already.
         * @see https://github.com/mswjs/msw/issues/2030
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/url
         */
        url: request.url
      }
    );
    try {
      frame.events.emit(
        new ResponseEvent(
          isMockedResponse ? "response:mocked" : "response:bypass",
          {
            requestId: frame.data.id,
            request: fetchRequest,
            response: fetchResponse,
            isMockedResponse
          }
        )
      );
    } finally {
      frame.events.removeAllListeners();
    }
  }
  #defaultFindWorker = (workerUrl, mockServiceWorkerUrl) => {
    return workerUrl === mockServiceWorkerUrl;
  };
  async #checkWorkerIntegrity() {
    const integrityCheckPromise = new DeferredPromise22();
    this.#channel.postMessage("INTEGRITY_CHECK_REQUEST");
    this.#channel.once("INTEGRITY_CHECK_RESPONSE", (event) => {
      const { checksum, packageVersion } = event.data;
      if (checksum !== "03cb67ac84128e63d7cd722a6e5b7f1e") {
        devUtils.warn(
          `The currently registered Service Worker has been generated by a different version of MSW (${packageVersion}) and may not be fully compatible with the installed version.

It's recommended you update your worker script by running this command:

  \u2022 npx msw init <PUBLIC_DIR>

You can also automate this process and make the worker script update automatically upon the library installations. Read more: https://mswjs.io/docs/cli/init.`
        );
      }
      integrityCheckPromise.resolve();
    });
    return integrityCheckPromise;
  }
  async #printStartMessage() {
    if (this.workerPromise.state === "rejected") {
      return;
    }
    invariant2(
      this.#clientPromise != null,
      "[ServiceWorkerSource] Failed to print a start message: client confirmation not received"
    );
    const client = await this.#clientPromise;
    const [worker2, registration] = await this.workerPromise;
    console.groupCollapsed(
      `%c${devUtils.formatMessage("Mocking enabled.")}`,
      "color:orangered;font-weight:bold;"
    );
    console.log(
      "%cDocumentation: %chttps://mswjs.io/docs",
      "font-weight:bold",
      "font-weight:normal"
    );
    console.log("Found an issue? https://github.com/mswjs/msw/issues");
    console.log("Worker script URL:", worker2.scriptURL);
    console.log("Worker scope:", registration.scope);
    if (client) {
      console.log("Client ID: %s (%s)", client.id, client.frameType);
    }
    console.groupEnd();
  }
  #printStopMessage() {
    console.log(
      `%c${devUtils.formatMessage("Mocking disabled.")}`,
      "color:orangered;font-weight:bold;"
    );
  }
};
var ServiceWorkerHttpNetworkFrame = class extends HttpNetworkFrame {
  #event;
  constructor(options) {
    super({ request: options.request });
    this.#event = options.event;
  }
  passthrough() {
    this.#event.postMessage("PASSTHROUGH");
  }
  respondWith(response) {
    if (response) {
      this.#respondWith(response);
    }
  }
  errorWith(reason) {
    if (reason instanceof Response) {
      return this.respondWith(reason);
    }
    devUtils.warn(
      `Uncaught exception in the request handler for "%s %s". This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error, as it indicates a mistake in your code. If you wish to mock an error response, please see this guide: https://mswjs.io/docs/http/mocking-responses/error-responses`,
      this.data.request.method,
      this.data.request.url
    );
    const error22 = reason instanceof Error ? reason : new Error(reason?.toString() || "Request failure");
    this.respondWith(
      HttpResponse.json(
        {
          name: error22.name,
          message: error22.message,
          stack: error22.stack
        },
        {
          status: 500,
          statusText: "Request Handler Error"
        }
      )
    );
  }
  async #respondWith(response) {
    let responseBody;
    let transfer;
    const responseInit = toResponseInit(response);
    if (supportsReadableStreamTransfer()) {
      responseBody = response.body;
      transfer = response.body == null ? void 0 : [response.body];
    } else {
      responseBody = response.body == null ? null : await response.clone().arrayBuffer();
    }
    this.#event.postMessage(
      "MOCK_RESPONSE",
      {
        ...responseInit,
        body: responseBody
      },
      transfer
    );
  }
};
var until22 = async (promise) => {
  try {
    const data = await promise().catch((error22) => {
      throw error22;
    });
    return { error: null, data };
  } catch (error22) {
    return { error: error22, data: null };
  }
};
function isObject22(value, loose = false) {
  return loose ? Object.prototype.toString.call(value).startsWith("[object ") : Object.prototype.toString.call(value) === "[object Object]";
}
function isPropertyAccessible(obj, key) {
  try {
    obj[key];
    return true;
  } catch {
    return false;
  }
}
function createServerErrorResponse(body) {
  return new Response(JSON.stringify(body instanceof Error ? {
    name: body.name,
    message: body.message,
    stack: body.stack
  } : body), {
    status: 500,
    statusText: "Unhandled Exception",
    headers: { "Content-Type": "application/json" }
  });
}
function isResponseError(response) {
  return response != null && response instanceof Response && isPropertyAccessible(response, "type") && response.type === "error";
}
function isResponseLike(value) {
  return isObject22(value, true) && isPropertyAccessible(value, "status") && isPropertyAccessible(value, "statusText") && isPropertyAccessible(value, "bodyUsed");
}
function isNodeLikeError(error22) {
  if (error22 == null) return false;
  if (!(error22 instanceof Error)) return false;
  return "code" in error22 && "errno" in error22;
}
async function handleRequest(options) {
  const handleResponse = async (response) => {
    if (response instanceof Error) {
      await options.controller.errorWith(response);
      return true;
    }
    if (isResponseError(response)) {
      await options.controller.respondWith(response);
      return true;
    }
    if (isResponseLike(response)) {
      await options.controller.respondWith(response);
      return true;
    }
    if (isObject22(response)) {
      await options.controller.errorWith(response);
      return true;
    }
    return false;
  };
  const handleResponseError = async (error22) => {
    if (error22 instanceof InterceptorError3) throw result.error;
    if (isNodeLikeError(error22)) {
      await options.controller.errorWith(error22);
      return true;
    }
    if (error22 instanceof Response) return await handleResponse(error22);
    return false;
  };
  const requestAbortPromise = new DeferredPromise3();
  const onAbort = () => {
    requestAbortPromise.reject(options.request.signal?.reason);
  };
  if (options.request.signal) {
    if (options.request.signal.aborted) {
      await options.controller.errorWith(options.request.signal.reason);
      return;
    }
    options.request.signal.addEventListener("abort", onAbort, { once: true });
  }
  const result = await until22(async () => {
    const requestListenersPromise = emitAsync2(options.emitter, "request", {
      requestId: options.requestId,
      request: options.request,
      controller: options.controller
    });
    await Promise.race([
      requestAbortPromise,
      requestListenersPromise,
      options.controller.handled
    ]);
  });
  options.request.signal?.removeEventListener("abort", onAbort);
  if (requestAbortPromise.state === "rejected") {
    await options.controller.errorWith(requestAbortPromise.rejectionReason);
    return;
  }
  if (result.error) {
    if (await handleResponseError(result.error)) return;
    if (options.emitter.listenerCount("unhandledException") > 0) {
      const unhandledExceptionController = new RequestController3(options.request, {
        passthrough() {
        },
        async respondWith(response) {
          await handleResponse(response);
        },
        async errorWith(reason) {
          await options.controller.errorWith(reason);
        }
      });
      await emitAsync2(options.emitter, "unhandledException", {
        error: result.error,
        request: options.request,
        requestId: options.requestId,
        controller: unhandledExceptionController
      });
      if (unhandledExceptionController.readyState !== RequestController3.PENDING) return;
    }
    await options.controller.respondWith(createServerErrorResponse(result.error));
    return;
  }
  if (options.controller.readyState === RequestController3.PENDING) return await options.controller.passthrough();
  return options.controller.handled;
}
function createNetworkError(cause) {
  return Object.assign(/* @__PURE__ */ new TypeError("Failed to fetch"), { cause });
}
var REQUEST_BODY_HEADERS = [
  "content-encoding",
  "content-language",
  "content-location",
  "content-type",
  "content-length"
];
var kRedirectCount = /* @__PURE__ */ Symbol("kRedirectCount");
async function followFetchRedirect(request, response) {
  if (response.status !== 303 && request.body != null) return Promise.reject(createNetworkError());
  const requestUrl = new URL(request.url);
  let locationUrl;
  try {
    locationUrl = new URL(response.headers.get("location"), request.url);
  } catch (error22) {
    return Promise.reject(createNetworkError(error22));
  }
  if (!(locationUrl.protocol === "http:" || locationUrl.protocol === "https:")) return Promise.reject(createNetworkError("URL scheme must be a HTTP(S) scheme"));
  if (Reflect.get(request, kRedirectCount) > 20) return Promise.reject(createNetworkError("redirect count exceeded"));
  Object.defineProperty(request, kRedirectCount, { value: (Reflect.get(request, kRedirectCount) || 0) + 1 });
  if (request.mode === "cors" && (locationUrl.username || locationUrl.password) && !sameOrigin(requestUrl, locationUrl)) return Promise.reject(createNetworkError('cross origin not allowed for request mode "cors"'));
  const requestInit = {};
  if ([301, 302].includes(response.status) && request.method === "POST" || response.status === 303 && !["HEAD", "GET"].includes(request.method)) {
    requestInit.method = "GET";
    requestInit.body = null;
    REQUEST_BODY_HEADERS.forEach((headerName) => {
      request.headers.delete(headerName);
    });
  }
  if (!sameOrigin(requestUrl, locationUrl)) {
    request.headers.delete("authorization");
    request.headers.delete("proxy-authorization");
    request.headers.delete("cookie");
    request.headers.delete("host");
  }
  requestInit.headers = request.headers;
  const finalResponse = await fetch(new Request(locationUrl, requestInit));
  Object.defineProperty(finalResponse, "redirected", {
    value: true,
    configurable: true
  });
  return finalResponse;
}
function sameOrigin(left, right) {
  if (left.origin === right.origin && left.origin === "null") return true;
  if (left.protocol === right.protocol && left.hostname === right.hostname && left.port === right.port) return true;
  return false;
}
var BrotliDecompressionStream = class extends TransformStream {
  constructor() {
    console.warn("[Interceptors]: Brotli decompression of response streams is not supported in the browser");
    super({ transform(chunk, controller) {
      controller.enqueue(chunk);
    } });
  }
};
var PipelineStream = class extends TransformStream {
  constructor(transformStreams, ...strategies) {
    super({}, ...strategies);
    const readable = [super.readable, ...transformStreams].reduce((readable$1, transform) => readable$1.pipeThrough(transform));
    Object.defineProperty(this, "readable", { get() {
      return readable;
    } });
  }
};
function parseContentEncoding(contentEncoding) {
  return contentEncoding.toLowerCase().split(",").map((coding) => coding.trim());
}
function createDecompressionStream(contentEncoding) {
  if (contentEncoding === "") return null;
  const codings = parseContentEncoding(contentEncoding);
  if (codings.length === 0) return null;
  return new PipelineStream(codings.reduceRight((transformers, coding) => {
    if (coding === "gzip" || coding === "x-gzip") return transformers.concat(new DecompressionStream("gzip"));
    else if (coding === "deflate") return transformers.concat(new DecompressionStream("deflate"));
    else if (coding === "br") return transformers.concat(new BrotliDecompressionStream());
    else transformers.length = 0;
    return transformers;
  }, []));
}
function decompressResponse(response) {
  if (response.body === null) return null;
  const decompressionStream = createDecompressionStream(response.headers.get("content-encoding") || "");
  if (!decompressionStream) return null;
  response.body.pipeTo(decompressionStream.writable);
  return decompressionStream.readable;
}
var FetchInterceptor = class FetchInterceptor2 extends Interceptor2 {
  static {
    this.symbol = /* @__PURE__ */ Symbol.for("fetch-interceptor");
  }
  constructor() {
    super(FetchInterceptor2.symbol);
  }
  checkEnvironment() {
    return hasConfigurableGlobal2("fetch");
  }
  async setup() {
    const logger = this.logger.extend("setup");
    const pureFetch = globalThis.fetch;
    const fetchProxy = async (input, init) => {
      const requestId = createRequestId2();
      const request = new FetchRequest2(typeof input === "string" && typeof location !== "undefined" && !canParseUrl2(input) ? new URL(input, location.href) : input, init);
      if (input instanceof Request) setRawRequest(request, input);
      const responsePromise = new DeferredPromise3();
      const controller = new RequestController3(request, {
        passthrough: async () => {
          this.logger.info("request has not been handled, passthrough...");
          const requestCloneForResponseEvent = request.clone();
          const { error: responseError, data: originalResponse } = await until22(() => pureFetch(request));
          if (responseError) return responsePromise.reject(responseError);
          this.logger.info("original fetch performed", originalResponse);
          if (this.emitter.listenerCount("response") > 0) {
            this.logger.info('emitting the "response" event...');
            const responseClone = FetchResponse3.clone(originalResponse);
            await emitAsync2(this.emitter, "response", {
              response: responseClone,
              isMockedResponse: false,
              request: requestCloneForResponseEvent,
              requestId
            });
          }
          responsePromise.resolve(originalResponse);
        },
        respondWith: async (rawResponse) => {
          if (isResponseError(rawResponse)) {
            this.logger.info("request has errored!", { response: rawResponse });
            responsePromise.reject(createNetworkError(rawResponse));
            return;
          }
          this.logger.info("received mocked response!", { rawResponse });
          const response = new FetchResponse3(decompressResponse(rawResponse) || rawResponse.body, {
            url: request.url,
            status: rawResponse.status,
            statusText: rawResponse.statusText,
            headers: rawResponse.headers
          });
          if (FetchResponse3.isRedirectResponse(response.status)) {
            if (request.redirect === "error") {
              responsePromise.reject(createNetworkError("unexpected redirect"));
              return;
            }
            if (request.redirect === "follow") {
              followFetchRedirect(request, response).then((response$1) => {
                responsePromise.resolve(response$1);
              }, (reason) => {
                responsePromise.reject(reason);
              });
              return;
            }
          }
          if (this.emitter.listenerCount("response") > 0) {
            this.logger.info('emitting the "response" event...');
            await emitAsync2(this.emitter, "response", {
              response: FetchResponse3.clone(response),
              isMockedResponse: true,
              request,
              requestId
            });
          }
          responsePromise.resolve(response);
        },
        errorWith: (reason) => {
          this.logger.info("request has been aborted!", { reason });
          responsePromise.reject(reason);
        }
      });
      this.logger.info("[%s] %s", request.method, request.url);
      this.logger.info("awaiting for the mocked response...");
      this.logger.info('emitting the "request" event for %s listener(s)...', this.emitter.listenerCount("request"));
      await handleRequest({
        request,
        requestId,
        emitter: this.emitter,
        controller
      });
      return responsePromise;
    };
    logger.info("patching global fetch...");
    this.subscriptions.push(patchesRegistry2.applyPatch(globalThis, "fetch", () => fetchProxy));
    logger.info("global fetch patched!", globalThis.fetch.name);
  }
};
function concatArrayBuffer(left, right) {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left, 0);
  result.set(right, left.byteLength);
  return result;
}
var EventPolyfill = class {
  constructor(type, options) {
    this.NONE = 0;
    this.CAPTURING_PHASE = 1;
    this.AT_TARGET = 2;
    this.BUBBLING_PHASE = 3;
    this.type = "";
    this.srcElement = null;
    this.currentTarget = null;
    this.eventPhase = 0;
    this.isTrusted = true;
    this.composed = false;
    this.cancelable = true;
    this.defaultPrevented = false;
    this.bubbles = true;
    this.lengthComputable = true;
    this.loaded = 0;
    this.total = 0;
    this.cancelBubble = false;
    this.returnValue = true;
    this.type = type;
    this.target = options?.target || null;
    this.currentTarget = options?.currentTarget || null;
    this.timeStamp = Date.now();
  }
  composedPath() {
    return [];
  }
  initEvent(type, bubbles, cancelable) {
    this.type = type;
    this.bubbles = !!bubbles;
    this.cancelable = !!cancelable;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
  }
  stopImmediatePropagation() {
  }
};
var ProgressEventPolyfill = class extends EventPolyfill {
  constructor(type, init) {
    super(type);
    this.lengthComputable = init?.lengthComputable || false;
    this.composed = init?.composed || false;
    this.loaded = init?.loaded || 0;
    this.total = init?.total || 0;
  }
};
var SUPPORTS_PROGRESS_EVENT = typeof ProgressEvent !== "undefined";
function createEvent(target, type, init) {
  const progressEvents = [
    "error",
    "progress",
    "loadstart",
    "loadend",
    "load",
    "timeout",
    "abort"
  ];
  const ProgressEventClass = SUPPORTS_PROGRESS_EVENT ? ProgressEvent : ProgressEventPolyfill;
  return progressEvents.includes(type) ? new ProgressEventClass(type, {
    lengthComputable: true,
    loaded: init?.loaded || 0,
    total: init?.total || 0
  }) : new EventPolyfill(type, {
    target,
    currentTarget: target
  });
}
function findPropertySource(target, propertyName) {
  if (!(propertyName in target)) return null;
  if (Object.prototype.hasOwnProperty.call(target, propertyName)) return target;
  const prototype = Reflect.getPrototypeOf(target);
  return prototype ? findPropertySource(prototype, propertyName) : null;
}
function createProxy(target, options) {
  return new Proxy(target, optionsToProxyHandler(options));
}
function optionsToProxyHandler(options) {
  const { constructorCall, methodCall, getProperty, setProperty } = options;
  const handler = {};
  if (typeof constructorCall !== "undefined") handler.construct = function(target, args, newTarget) {
    const next = Reflect.construct.bind(null, target, args, newTarget);
    return constructorCall.call(newTarget, args, next);
  };
  handler.set = function(target, propertyName, nextValue) {
    const next = () => {
      const propertySource = findPropertySource(target, propertyName) || target;
      const ownDescriptors = Reflect.getOwnPropertyDescriptor(propertySource, propertyName);
      if (typeof ownDescriptors?.set !== "undefined") {
        ownDescriptors.set.apply(target, [nextValue]);
        return true;
      }
      return Reflect.defineProperty(propertySource, propertyName, {
        writable: true,
        enumerable: true,
        configurable: true,
        value: nextValue
      });
    };
    if (typeof setProperty !== "undefined") return setProperty.call(target, [propertyName, nextValue], next);
    return next();
  };
  handler.get = function(target, propertyName, receiver) {
    const next = () => target[propertyName];
    const value = typeof getProperty !== "undefined" ? getProperty.call(target, [propertyName, receiver], next) : next();
    if (typeof value === "function") return (...args) => {
      const next$1 = value.bind(target, ...args);
      if (typeof methodCall !== "undefined") return methodCall.call(target, [propertyName, args], next$1);
      return next$1();
    };
    return value;
  };
  return handler;
}
function isDomParserSupportedType(type) {
  return [
    "application/xhtml+xml",
    "application/xml",
    "image/svg+xml",
    "text/html",
    "text/xml"
  ].some((supportedType) => {
    return type.startsWith(supportedType);
  });
}
function parseJson(data) {
  try {
    return JSON.parse(data);
  } catch (_) {
    return null;
  }
}
function createResponse(request, body) {
  return new FetchResponse3(FetchResponse3.isResponseWithBody(request.status) ? body : null, {
    url: request.responseURL,
    status: request.status,
    statusText: request.statusText,
    headers: createHeadersFromXMLHttpRequestHeaders(request.getAllResponseHeaders())
  });
}
function createHeadersFromXMLHttpRequestHeaders(headersString) {
  const headers = new Headers();
  const lines = headersString.split(/[\r\n]+/);
  for (const line of lines) {
    if (line.trim() === "") continue;
    const [name, ...parts] = line.split(": ");
    const value = parts.join(": ");
    headers.append(name, value);
  }
  return headers;
}
async function getBodyByteLength(input) {
  const explicitContentLength = input.headers.get("content-length");
  if (explicitContentLength != null && explicitContentLength !== "") return Number(explicitContentLength);
  return (await input.arrayBuffer()).byteLength;
}
var kIsRequestHandled = /* @__PURE__ */ Symbol("kIsRequestHandled");
var IS_NODE22 = isNodeProcess2();
var kFetchRequest = /* @__PURE__ */ Symbol("kFetchRequest");
var XMLHttpRequestController = class {
  constructor(initialRequest, logger) {
    this.initialRequest = initialRequest;
    this.logger = logger;
    this.method = "GET";
    this.url = null;
    this[kIsRequestHandled] = false;
    this.events = /* @__PURE__ */ new Map();
    this.uploadEvents = /* @__PURE__ */ new Map();
    this.requestId = createRequestId2();
    this.requestHeaders = new Headers();
    this.responseBuffer = new Uint8Array();
    this.request = createProxy(initialRequest, {
      setProperty: ([propertyName, nextValue], invoke) => {
        switch (propertyName) {
          case "ontimeout": {
            const eventName = propertyName.slice(2);
            this.request.addEventListener(eventName, nextValue);
            return invoke();
          }
          default:
            return invoke();
        }
      },
      methodCall: ([methodName, args], invoke) => {
        switch (methodName) {
          case "open": {
            const [method, url] = args;
            if (typeof url === "undefined") {
              this.method = "GET";
              this.url = toAbsoluteUrl(method);
            } else {
              this.method = method;
              this.url = toAbsoluteUrl(url);
            }
            this.logger = this.logger.extend(`${this.method} ${this.url.href}`);
            this.logger.info("open", this.method, this.url.href);
            return invoke();
          }
          case "addEventListener": {
            const [eventName, listener] = args;
            this.registerEvent(eventName, listener);
            this.logger.info("addEventListener", eventName, listener);
            return invoke();
          }
          case "setRequestHeader": {
            const [name, value] = args;
            this.requestHeaders.set(name, value);
            this.logger.info("setRequestHeader", name, value);
            return invoke();
          }
          case "send": {
            const [body] = args;
            this.request.addEventListener("load", () => {
              if (typeof this.onResponse !== "undefined") {
                const fetchResponse = createResponse(
                  this.request,
                  /**
                  * The `response` property is the right way to read
                  * the ambiguous response body, as the request's "responseType" may differ.
                  * @see https://xhr.spec.whatwg.org/#the-response-attribute
                  */
                  this.request.response
                );
                this.onResponse.call(this, {
                  response: fetchResponse,
                  isMockedResponse: this[kIsRequestHandled],
                  request: fetchRequest,
                  requestId: this.requestId
                });
              }
            });
            const requestBody = typeof body === "string" ? encodeBuffer2(body) : body;
            const fetchRequest = this.toFetchApiRequest(requestBody);
            this[kFetchRequest] = fetchRequest.clone();
            queueMicrotask(() => {
              (this.onRequest?.call(this, {
                request: fetchRequest,
                requestId: this.requestId
              }) || Promise.resolve()).finally(() => {
                if (!this[kIsRequestHandled]) {
                  this.logger.info("request callback settled but request has not been handled (readystate %d), performing as-is...", this.request.readyState);
                  if (IS_NODE22) this.request.setRequestHeader(INTERNAL_REQUEST_ID_HEADER_NAME2, this.requestId);
                  return invoke();
                }
              });
            });
            break;
          }
          default:
            return invoke();
        }
      }
    });
    define(this.request, "upload", createProxy(this.request.upload, {
      setProperty: ([propertyName, nextValue], invoke) => {
        switch (propertyName) {
          case "onloadstart":
          case "onprogress":
          case "onaboart":
          case "onerror":
          case "onload":
          case "ontimeout":
          case "onloadend": {
            const eventName = propertyName.slice(2);
            this.registerUploadEvent(eventName, nextValue);
          }
        }
        return invoke();
      },
      methodCall: ([methodName, args], invoke) => {
        switch (methodName) {
          case "addEventListener": {
            const [eventName, listener] = args;
            this.registerUploadEvent(eventName, listener);
            this.logger.info("upload.addEventListener", eventName, listener);
            return invoke();
          }
        }
      }
    }));
  }
  registerEvent(eventName, listener) {
    const nextEvents = (this.events.get(eventName) || []).concat(listener);
    this.events.set(eventName, nextEvents);
    this.logger.info('registered event "%s"', eventName, listener);
  }
  registerUploadEvent(eventName, listener) {
    const nextEvents = (this.uploadEvents.get(eventName) || []).concat(listener);
    this.uploadEvents.set(eventName, nextEvents);
    this.logger.info('registered upload event "%s"', eventName, listener);
  }
  /**
  * Responds to the current request with the given
  * Fetch API `Response` instance.
  */
  async respondWith(response) {
    this[kIsRequestHandled] = true;
    if (this[kFetchRequest]) {
      const totalRequestBodyLength = await getBodyByteLength(this[kFetchRequest]);
      this.trigger("loadstart", this.request.upload, {
        loaded: 0,
        total: totalRequestBodyLength
      });
      this.trigger("progress", this.request.upload, {
        loaded: totalRequestBodyLength,
        total: totalRequestBodyLength
      });
      this.trigger("load", this.request.upload, {
        loaded: totalRequestBodyLength,
        total: totalRequestBodyLength
      });
      this.trigger("loadend", this.request.upload, {
        loaded: totalRequestBodyLength,
        total: totalRequestBodyLength
      });
    }
    this.logger.info("responding with a mocked response: %d %s", response.status, response.statusText);
    define(this.request, "status", response.status);
    define(this.request, "statusText", response.statusText);
    define(this.request, "responseURL", this.url.href);
    this.request.getResponseHeader = new Proxy(this.request.getResponseHeader, { apply: (_, __, args) => {
      this.logger.info("getResponseHeader", args[0]);
      if (this.request.readyState < this.request.HEADERS_RECEIVED) {
        this.logger.info("headers not received yet, returning null");
        return null;
      }
      const headerValue = response.headers.get(args[0]);
      this.logger.info('resolved response header "%s" to', args[0], headerValue);
      return headerValue;
    } });
    this.request.getAllResponseHeaders = new Proxy(this.request.getAllResponseHeaders, { apply: () => {
      this.logger.info("getAllResponseHeaders");
      if (this.request.readyState < this.request.HEADERS_RECEIVED) {
        this.logger.info("headers not received yet, returning empty string");
        return "";
      }
      const allHeaders = Array.from(response.headers.entries()).map(([headerName, headerValue]) => {
        return `${headerName}: ${headerValue}`;
      }).join("\r\n");
      this.logger.info("resolved all response headers to", allHeaders);
      return allHeaders;
    } });
    Object.defineProperties(this.request, {
      response: {
        enumerable: true,
        configurable: false,
        get: () => this.response
      },
      responseText: {
        enumerable: true,
        configurable: false,
        get: () => this.responseText
      },
      responseXML: {
        enumerable: true,
        configurable: false,
        get: () => this.responseXML
      }
    });
    const totalResponseBodyLength = await getBodyByteLength(response.clone());
    this.logger.info("calculated response body length", totalResponseBodyLength);
    this.trigger("loadstart", this.request, {
      loaded: 0,
      total: totalResponseBodyLength
    });
    this.setReadyState(this.request.HEADERS_RECEIVED);
    this.setReadyState(this.request.LOADING);
    const finalizeResponse = () => {
      this.logger.info("finalizing the mocked response...");
      this.setReadyState(this.request.DONE);
      this.trigger("load", this.request, {
        loaded: this.responseBuffer.byteLength,
        total: totalResponseBodyLength
      });
      this.trigger("loadend", this.request, {
        loaded: this.responseBuffer.byteLength,
        total: totalResponseBodyLength
      });
    };
    if (response.body) {
      this.logger.info("mocked response has body, streaming...");
      const reader = response.body.getReader();
      const readNextResponseBodyChunk = async () => {
        const { value, done } = await reader.read();
        if (done) {
          this.logger.info("response body stream done!");
          finalizeResponse();
          return;
        }
        if (value) {
          this.logger.info("read response body chunk:", value);
          this.responseBuffer = concatArrayBuffer(this.responseBuffer, value);
          this.trigger("progress", this.request, {
            loaded: this.responseBuffer.byteLength,
            total: totalResponseBodyLength
          });
        }
        readNextResponseBodyChunk();
      };
      readNextResponseBodyChunk();
    } else finalizeResponse();
  }
  responseBufferToText() {
    return decodeBuffer2(this.responseBuffer);
  }
  get response() {
    this.logger.info("getResponse (responseType: %s)", this.request.responseType);
    if (this.request.readyState !== this.request.DONE) return null;
    switch (this.request.responseType) {
      case "json": {
        const responseJson = parseJson(this.responseBufferToText());
        this.logger.info("resolved response JSON", responseJson);
        return responseJson;
      }
      case "arraybuffer": {
        const arrayBuffer = toArrayBuffer(this.responseBuffer);
        this.logger.info("resolved response ArrayBuffer", arrayBuffer);
        return arrayBuffer;
      }
      case "blob": {
        const mimeType = this.request.getResponseHeader("Content-Type") || "text/plain";
        const responseBlob = new Blob([this.responseBufferToText()], { type: mimeType });
        this.logger.info("resolved response Blob (mime type: %s)", responseBlob, mimeType);
        return responseBlob;
      }
      default: {
        const responseText = this.responseBufferToText();
        this.logger.info('resolving "%s" response type as text', this.request.responseType, responseText);
        return responseText;
      }
    }
  }
  get responseText() {
    invariant2(this.request.responseType === "" || this.request.responseType === "text", "InvalidStateError: The object is in invalid state.");
    if (this.request.readyState !== this.request.LOADING && this.request.readyState !== this.request.DONE) return "";
    const responseText = this.responseBufferToText();
    this.logger.info('getResponseText: "%s"', responseText);
    return responseText;
  }
  get responseXML() {
    invariant2(this.request.responseType === "" || this.request.responseType === "document", "InvalidStateError: The object is in invalid state.");
    if (this.request.readyState !== this.request.DONE) return null;
    const contentType = this.request.getResponseHeader("Content-Type") || "";
    if (typeof DOMParser === "undefined") {
      console.warn("Cannot retrieve XMLHttpRequest response body as XML: DOMParser is not defined. You are likely using an environment that is not browser or does not polyfill browser globals correctly.");
      return null;
    }
    if (isDomParserSupportedType(contentType)) return new DOMParser().parseFromString(this.responseBufferToText(), contentType);
    return null;
  }
  errorWith(error22) {
    this[kIsRequestHandled] = true;
    this.logger.info("responding with an error");
    this.setReadyState(this.request.DONE);
    this.trigger("error", this.request);
    this.trigger("loadend", this.request);
  }
  /**
  * Transitions this request's `readyState` to the given one.
  */
  setReadyState(nextReadyState) {
    this.logger.info("setReadyState: %d -> %d", this.request.readyState, nextReadyState);
    if (this.request.readyState === nextReadyState) {
      this.logger.info("ready state identical, skipping transition...");
      return;
    }
    define(this.request, "readyState", nextReadyState);
    this.logger.info("set readyState to: %d", nextReadyState);
    if (nextReadyState !== this.request.UNSENT) {
      this.logger.info('triggering "readystatechange" event...');
      this.trigger("readystatechange", this.request);
    }
  }
  /**
  * Triggers given event on the `XMLHttpRequest` instance.
  */
  trigger(eventName, target, options) {
    const callback = target[`on${eventName}`];
    const event = createEvent(target, eventName, options);
    this.logger.info('trigger "%s"', eventName, options || "");
    if (typeof callback === "function") {
      this.logger.info('found a direct "%s" callback, calling...', eventName);
      callback.call(target, event);
    }
    const events = target instanceof XMLHttpRequestUpload ? this.uploadEvents : this.events;
    for (const [registeredEventName, listeners] of events) if (registeredEventName === eventName) {
      this.logger.info('found %d listener(s) for "%s" event, calling...', listeners.length, eventName);
      listeners.forEach((listener) => listener.call(target, event));
    }
  }
  /**
  * Converts this `XMLHttpRequest` instance into a Fetch API `Request` instance.
  */
  toFetchApiRequest(body) {
    this.logger.info("converting request to a Fetch API Request...");
    const resolvedBody = body instanceof Document ? body.documentElement.innerText : body;
    const fetchRequest = new FetchRequest2(this.url.href, {
      method: this.method,
      headers: this.requestHeaders,
      credentials: this.request.withCredentials ? "include" : "same-origin",
      body: ["GET", "HEAD"].includes(this.method.toUpperCase()) ? null : resolvedBody
    });
    define(fetchRequest, "headers", createProxy(fetchRequest.headers, { methodCall: ([methodName, args], invoke) => {
      switch (methodName) {
        case "append":
        case "set": {
          const [headerName, headerValue] = args;
          this.request.setRequestHeader(headerName, headerValue);
          break;
        }
        case "delete": {
          const [headerName] = args;
          console.warn(`XMLHttpRequest: Cannot remove a "${headerName}" header from the Fetch API representation of the "${fetchRequest.method} ${fetchRequest.url}" request. XMLHttpRequest headers cannot be removed.`);
          break;
        }
      }
      return invoke();
    } }));
    setRawRequest(fetchRequest, this.request);
    this.logger.info("converted request to a Fetch API Request!", fetchRequest);
    return fetchRequest;
  }
};
function toAbsoluteUrl(url) {
  if (typeof location === "undefined") return new URL(url);
  return new URL(url.toString(), location.href);
}
function define(target, property, value) {
  Reflect.defineProperty(target, property, {
    writable: true,
    enumerable: true,
    value
  });
}
function createXMLHttpRequestProxy({ emitter, logger }) {
  return new Proxy(globalThis.XMLHttpRequest, { construct(target, args, newTarget) {
    logger.info("constructed new XMLHttpRequest");
    const originalRequest = Reflect.construct(target, args, newTarget);
    const prototypeDescriptors = Object.getOwnPropertyDescriptors(target.prototype);
    for (const propertyName in prototypeDescriptors) Reflect.defineProperty(originalRequest, propertyName, prototypeDescriptors[propertyName]);
    const xhrRequestController = new XMLHttpRequestController(originalRequest, logger);
    xhrRequestController.onRequest = async function({ request, requestId }) {
      const controller = new RequestController3(request, {
        passthrough: () => {
          this.logger.info("no mocked response received, performing request as-is...");
        },
        respondWith: async (response) => {
          if (isResponseError(response)) {
            this.errorWith(/* @__PURE__ */ new TypeError("Network error"));
            return;
          }
          await this.respondWith(response);
        },
        errorWith: (reason) => {
          this.logger.info("request errored!", { error: reason });
          if (reason instanceof Error) this.errorWith(reason);
        }
      });
      this.logger.info("awaiting mocked response...");
      this.logger.info('emitting the "request" event for %s listener(s)...', emitter.listenerCount("request"));
      await handleRequest({
        request,
        requestId,
        controller,
        emitter
      });
    };
    xhrRequestController.onResponse = async function({ response, isMockedResponse, request, requestId }) {
      this.logger.info('emitting the "response" event for %s listener(s)...', emitter.listenerCount("response"));
      emitter.emit("response", {
        response,
        isMockedResponse,
        request,
        requestId
      });
    };
    return xhrRequestController.request;
  } });
}
var XMLHttpRequestInterceptor = class XMLHttpRequestInterceptor2 extends Interceptor2 {
  static {
    this.symbol = /* @__PURE__ */ Symbol.for("xhr-interceptor");
  }
  constructor() {
    super(XMLHttpRequestInterceptor2.symbol);
  }
  checkEnvironment() {
    return hasConfigurableGlobal2("XMLHttpRequest");
  }
  setup() {
    const logger = this.logger.extend("setup");
    logger.info("patching global XMLHttpRequest...");
    this.subscriptions.push(patchesRegistry2.applyPatch(globalThis, "XMLHttpRequest", () => {
      return createXMLHttpRequestProxy({
        emitter: this.emitter,
        logger: this.logger
      });
    }));
    logger.info("global XMLHttpRequest patched!", globalThis.XMLHttpRequest.name);
  }
};
var FallbackHttpSource = class extends InterceptorSource {
  constructor(options) {
    super({
      interceptors: [new XMLHttpRequestInterceptor(), new FetchInterceptor()]
    });
    this.options = options;
  }
  options;
  enable() {
    super.enable();
    if (!this.options.quiet) {
      this.#printStartMessage();
    }
  }
  disable() {
    super.disable();
    if (!this.options.quiet) {
      this.#printStopMessage();
    }
  }
  #printStartMessage() {
    console.groupCollapsed(
      `%c${devUtils.formatMessage("Mocking enabled (fallback mode).")}`,
      "color:orangered;font-weight:bold;"
    );
    console.log(
      "%cDocumentation: %chttps://mswjs.io/docs",
      "font-weight:bold",
      "font-weight:normal"
    );
    console.log("Found an issue? https://github.com/mswjs/msw/issues");
    console.groupEnd();
  }
  #printStopMessage() {
    console.log(
      `%c${devUtils.formatMessage("Mocking disabled.")}`,
      "color:orangered;font-weight:bold;"
    );
  }
};
var DEFAULT_WORKER_URL = "/mockServiceWorker.js";
function setupWorker(...handlers2) {
  invariant2(
    !isNodeProcess2(),
    devUtils.formatMessage(
      "Failed to execute `setupWorker` in a non-browser environment"
    )
  );
  const network = defineNetwork({
    sources: [],
    handlers: handlers2
  });
  return {
    async start(options) {
      if (options?.waitUntilReady != null) {
        devUtils.warn(
          `The "waitUntilReady" option has been deprecated. Please remove it from this "worker.start()" call. Follow the recommended Browser integration (https://mswjs.io/docs/integrations/browser) to eliminate any race conditions between the Service Worker registration and any requests made by your application on initial render.`
        );
      }
      if (network.readyState === NetworkReadyState.ENABLED) {
        devUtils.warn(
          'Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.'
        );
        return;
      }
      const httpSource = supportsServiceWorker() ? await ServiceWorkerSource.from({
        serviceWorker: {
          url: options?.serviceWorker?.url?.toString() || DEFAULT_WORKER_URL,
          options: options?.serviceWorker?.options
        },
        findWorker: options?.findWorker,
        quiet: options?.quiet
      }) : new FallbackHttpSource({
        quiet: options?.quiet
      });
      network.configure({
        sources: [
          httpSource,
          new InterceptorSource({
            interceptors: [new WebSocketInterceptor3()]
          })
        ],
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || "warn";
        }),
        context: {
          quiet: options?.quiet
        }
      });
      await network.enable();
      if (httpSource instanceof ServiceWorkerSource) {
        const [, registration] = await httpSource.workerPromise;
        return registration;
      }
    },
    stop() {
      if (network.readyState === NetworkReadyState.DISABLED) {
        devUtils.warn(
          `Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.`
        );
        return;
      }
      network.disable();
      window.postMessage({ type: "msw/worker:stop" });
    },
    events: network.events,
    use: network.use.bind(network),
    resetHandlers: network.resetHandlers.bind(network),
    restoreHandlers: network.restoreHandlers.bind(network),
    listHandlers: network.listHandlers.bind(network)
  };
}

// node_modules/msw/lib/core/utils/internal/checkGlobals.mjs
function checkGlobals() {
  invariant(
    typeof URL !== "undefined",
    devUtils.formatMessage(
      `Global "URL" class is not defined. This likely means that you're running MSW in an environment that doesn't support all Node.js standard API (e.g. React Native). If that's the case, please use an appropriate polyfill for the "URL" class, like "react-native-url-polyfill".`
    )
  );
}

// node_modules/msw/lib/core/utils/internal/isStringEqual.mjs
function isStringEqual(actual, expected) {
  return actual.toLowerCase() === expected.toLowerCase();
}

// node_modules/msw/lib/core/utils/logging/getStatusCodeColor.mjs
function getStatusCodeColor(status) {
  if (status < 300) {
    return "#69AB32";
  }
  if (status < 400) {
    return "#F0BB4B";
  }
  return "#E95F5D";
}

// node_modules/msw/lib/core/utils/logging/serializeRequest.mjs
async function serializeRequest(request) {
  const requestClone = request.clone();
  const requestText = await requestClone.text();
  return {
    url: new URL(request.url),
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: requestText
  };
}

// node_modules/msw/lib/core/utils/logging/serializeResponse.mjs
var { message: message3 } = statuses_default;
async function serializeResponse(response) {
  const responseClone = response.clone();
  const responseText = await responseClone.text();
  const responseStatus = responseClone.status || 200;
  const responseStatusText = responseClone.statusText || message3[responseStatus] || "OK";
  return {
    status: responseStatus,
    statusText: responseStatusText,
    headers: Object.fromEntries(responseClone.headers.entries()),
    body: responseText
  };
}

// node_modules/msw/lib/shims/cookie.mjs
var __create2 = Object.create;
var __defProp4 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __getProtoOf2 = Object.getPrototypeOf;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __commonJS2 = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames2(from))
      if (!__hasOwnProp2.call(to, key) && key !== except)
        __defProp4(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create2(__getProtoOf2(mod)) : {}, __copyProps2(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp4(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var require_dist = __commonJS2({
  "node_modules/.pnpm/cookie@1.1.1/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie2;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie2, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie2)) {
        const val = cookie2[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie2 = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie2.name)) {
        throw new TypeError(`argument name is invalid: ${cookie2.name}`);
      }
      const value = cookie2.value ? enc(cookie2.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie2.value}`);
      }
      let str = cookie2.name + "=" + value;
      if (cookie2.maxAge !== void 0) {
        if (!Number.isInteger(cookie2.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie2.maxAge}`);
        }
        str += "; Max-Age=" + cookie2.maxAge;
      }
      if (cookie2.domain) {
        if (!domainValueRegExp.test(cookie2.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie2.domain}`);
        }
        str += "; Domain=" + cookie2.domain;
      }
      if (cookie2.path) {
        if (!pathValueRegExp.test(cookie2.path)) {
          throw new TypeError(`option path is invalid: ${cookie2.path}`);
        }
        str += "; Path=" + cookie2.path;
      }
      if (cookie2.expires) {
        if (!isDate(cookie2.expires) || !Number.isFinite(cookie2.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie2.expires}`);
        }
        str += "; Expires=" + cookie2.expires.toUTCString();
      }
      if (cookie2.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie2.secure) {
        str += "; Secure";
      }
      if (cookie2.partitioned) {
        str += "; Partitioned";
      }
      if (cookie2.priority) {
        const priority = typeof cookie2.priority === "string" ? cookie2.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie2.priority}`);
        }
      }
      if (cookie2.sameSite) {
        const sameSite = typeof cookie2.sameSite === "string" ? cookie2.sameSite.toLowerCase() : cookie2.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie2.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie2(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});
var allCookie = __toESM2(require_dist(), 1);
var cookie = allCookie.default || allCookie;
var parse3 = cookie.parse;
var serialize = cookie.serialize;

// node_modules/msw/lib/core/utils/request/getRequestCookies.mjs
function parseCookies(input) {
  const parsedCookies = parse3(input);
  const cookies = {};
  for (const cookieName in parsedCookies) {
    if (typeof parsedCookies[cookieName] !== "undefined") {
      cookies[cookieName] = parsedCookies[cookieName];
    }
  }
  return cookies;
}
function getAllDocumentCookies() {
  return parseCookies(document.cookie);
}
function getDocumentCookies(request) {
  if (typeof document === "undefined" || typeof location === "undefined") {
    return {};
  }
  switch (request.credentials) {
    case "same-origin": {
      const requestUrl = new URL(request.url);
      return location.origin === requestUrl.origin ? getAllDocumentCookies() : {};
    }
    case "include": {
      return getAllDocumentCookies();
    }
    default: {
      return {};
    }
  }
}
function getAllRequestCookies(request) {
  const requestCookieHeader = request.headers.get("cookie");
  const cookiesFromHeaders = requestCookieHeader ? parseCookies(requestCookieHeader) : {};
  const cookiesFromDocument = getDocumentCookies(request);
  for (const name in cookiesFromDocument) {
    request.headers.append(
      "cookie",
      serialize(name, cookiesFromDocument[name])
    );
  }
  const cookiesFromStore = cookieStore.getCookies(request.url);
  const storedCookiesObject = Object.fromEntries(
    cookiesFromStore.map((cookie2) => [cookie2.key, cookie2.value])
  );
  for (const cookie2 of cookiesFromStore) {
    request.headers.append("cookie", cookie2.toString());
  }
  return {
    ...cookiesFromDocument,
    ...storedCookiesObject,
    ...cookiesFromHeaders
  };
}

// node_modules/msw/lib/core/handlers/HttpHandler.mjs
var HttpMethods = /* @__PURE__ */ ((HttpMethods2) => {
  HttpMethods2["HEAD"] = "HEAD";
  HttpMethods2["GET"] = "GET";
  HttpMethods2["POST"] = "POST";
  HttpMethods2["PUT"] = "PUT";
  HttpMethods2["PATCH"] = "PATCH";
  HttpMethods2["OPTIONS"] = "OPTIONS";
  HttpMethods2["DELETE"] = "DELETE";
  return HttpMethods2;
})(HttpMethods || {});
var HttpHandler = class extends RequestHandler {
  constructor(method, predicate, resolver, options) {
    const displayPath = typeof predicate === "function" ? "[custom predicate]" : predicate;
    super({
      info: {
        header: `${method}${displayPath ? ` ${displayPath}` : ""}`,
        path: predicate,
        method
      },
      resolver,
      options
    });
    this.checkRedundantQueryParameters();
  }
  checkRedundantQueryParameters() {
    const { method, path } = this.info;
    if (!path || path instanceof RegExp || typeof path === "function") {
      return;
    }
    const url = cleanUrl(path);
    if (url === path) {
      return;
    }
    devUtils.warn(
      `Found a redundant usage of query parameters in the request handler URL for "${method} ${path}". Please match against a path instead and access query parameters using "new URL(request.url).searchParams" instead. Learn more: https://mswjs.io/docs/http/intercepting-requests#querysearch-parameters`
    );
  }
  async parse(args) {
    const url = new URL(args.request.url);
    const cookies = getAllRequestCookies(args.request);
    if (typeof this.info.path === "function") {
      const customPredicateResult = await this.info.path({
        request: args.request,
        cookies
      });
      const match22 = typeof customPredicateResult === "boolean" ? {
        matches: customPredicateResult,
        params: {}
      } : customPredicateResult;
      return {
        match: match22,
        cookies
      };
    }
    const match2 = this.info.path ? matchRequestUrl(url, this.info.path, args.resolutionContext?.baseUrl) : { matches: false, params: {} };
    return {
      match: match2,
      cookies
    };
  }
  async predicate(args) {
    const hasMatchingMethod = this.matchMethod(args.request.method);
    const hasMatchingUrl = args.parsedResult.match.matches;
    return hasMatchingMethod && hasMatchingUrl;
  }
  matchMethod(actualMethod) {
    return this.info.method instanceof RegExp ? this.info.method.test(actualMethod) : isStringEqual(this.info.method, actualMethod);
  }
  extendResolverArgs(args) {
    return {
      params: args.parsedResult.match?.params || {},
      cookies: args.parsedResult.cookies
    };
  }
  async log(args) {
    const publicUrl = toPublicUrl(args.request.url);
    const loggedRequest = await serializeRequest(args.request);
    const loggedResponse = await serializeResponse(args.response);
    const statusColor = getStatusCodeColor(loggedResponse.status);
    console.groupCollapsed(
      devUtils.formatMessage(
        `${getTimestamp()} ${args.request.method} ${publicUrl} (%c${loggedResponse.status} ${loggedResponse.statusText}%c)`
      ),
      `color:${statusColor}`,
      "color:inherit"
    );
    console.log("Request", loggedRequest);
    console.log("Handler:", this);
    console.log("Response", loggedResponse);
    console.groupEnd();
  }
};

// node_modules/msw/lib/core/http.mjs
function createHttpHandler(method) {
  return (predicate, resolver, options = {}) => {
    return new HttpHandler(method, predicate, resolver, options);
  };
}
var http = {
  all: createHttpHandler(/.+/),
  head: createHttpHandler(HttpMethods.HEAD),
  get: createHttpHandler(HttpMethods.GET),
  post: createHttpHandler(HttpMethods.POST),
  put: createHttpHandler(HttpMethods.PUT),
  delete: createHttpHandler(HttpMethods.DELETE),
  patch: createHttpHandler(HttpMethods.PATCH),
  options: createHttpHandler(HttpMethods.OPTIONS)
};

// node_modules/msw/lib/core/index.mjs
checkGlobals();

// src/mocks/handlers.js
var handlers = [
  http.get("https://api", () => {
    return HttpResponse.json({ message: "Hello from MSW!" });
  })
];

// src/mocks/browser.js
var worker = setupWorker(...handlers);
export {
  worker
};
/*! Bundled license information:

msw/lib/shims/statuses.mjs:
  (*! Bundled license information:
  
  statuses/index.js:
    (*!
     * statuses
     * Copyright(c) 2014 Jonathan Ong
     * Copyright(c) 2016 Douglas Christopher Wilson
     * MIT Licensed
     *)
  *)

tough-cookie/dist/index.js:
  (*!
   * Copyright (c) 2015-2020, Salesforce.com, Inc.
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   * this list of conditions and the following disclaimer.
   *
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   * this list of conditions and the following disclaimer in the documentation
   * and/or other materials provided with the distribution.
   *
   * 3. Neither the name of Salesforce.com nor the names of its contributors may
   * be used to endorse or promote products derived from this software without
   * specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   *)
*/
