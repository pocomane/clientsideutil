
// --------------------------------------------------------------------------------

// EMCC runtime injection

var WaLua = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  return (
function(WaLua) {
  WaLua = WaLua || {};

var Module = typeof WaLua !== "undefined" ? WaLua : {};

Module.print = function(txt) {
 if (null != append_output) {
  append_output(txt);
 } else {
  console.log(txt);
 }
};

Module.printErr = function(txt) {
 if (null != append_error) {
  append_output(txt);
 } else {
  console.log(txt);
 }
};

compile_lua = function(scr) {
 return Module.ccall("compile_lua", "number", [ "string" ], [ scr ]);
};

step_lua = function() {
 return Module.ccall("continue_lua", "number", [], []);
};

var moduleOverrides = {};

var key;

for (key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}

Module["arguments"] = [];

Module["thisProgram"] = "./this.program";

Module["quit"] = function(status, toThrow) {
 throw toThrow;
};

Module["preRun"] = [];

Module["postRun"] = [];

var ENVIRONMENT_IS_WEB = false;

var ENVIRONMENT_IS_WORKER = false;

var ENVIRONMENT_IS_NODE = false;

var ENVIRONMENT_IS_SHELL = false;

ENVIRONMENT_IS_WEB = typeof window === "object";

ENVIRONMENT_IS_WORKER = typeof importScripts === "function";

ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;

ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 } else {
  return scriptDirectory + path;
 }
}

if (ENVIRONMENT_IS_NODE) {
 scriptDirectory = __dirname + "/";
 var nodeFS;
 var nodePath;
 Module["read"] = function shell_read(filename, binary) {
  var ret;
  if (!nodeFS) nodeFS = require("fs");
  if (!nodePath) nodePath = require("path");
  filename = nodePath["normalize"](filename);
  ret = nodeFS["readFileSync"](filename);
  return binary ? ret : ret.toString();
 };
 Module["readBinary"] = function readBinary(filename) {
  var ret = Module["read"](filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 if (process["argv"].length > 1) {
  Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
 }
 Module["arguments"] = process["argv"].slice(2);
 process["on"]("uncaughtException", function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 });
 process["on"]("unhandledRejection", abort);
 Module["quit"] = function(status) {
  process["exit"](status);
 };
 Module["inspect"] = function() {
  return "[Emscripten Module object]";
 };
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof read != "undefined") {
  Module["read"] = function shell_read(f) {
   return read(f);
  };
 }
 Module["readBinary"] = function readBinary(f) {
  var data;
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof quit === "function") {
  Module["quit"] = function(status) {
   quit(status);
  };
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (_scriptDir) {
  scriptDirectory = _scriptDir;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 Module["read"] = function shell_read(url) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.responseText;
 };
 if (ENVIRONMENT_IS_WORKER) {
  Module["readBinary"] = function readBinary(url) {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, false);
   xhr.responseType = "arraybuffer";
   xhr.send(null);
   return new Uint8Array(xhr.response);
  };
 }
 Module["readAsync"] = function readAsync(url, onload, onerror) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
    return;
   }
   onerror();
  };
  xhr.onerror = onerror;
  xhr.send(null);
 };
 Module["setWindowTitle"] = function(title) {
  document.title = title;
 };
} else {}

var out = Module["print"] || (typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null);

var err = Module["printErr"] || (typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || out);

for (key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}

moduleOverrides = undefined;

function dynamicAlloc(size) {
 var ret = HEAP32[DYNAMICTOP_PTR >> 2];
 var end = ret + size + 15 & -16;
 if (end <= _emscripten_get_heap_size()) {
  HEAP32[DYNAMICTOP_PTR >> 2] = end;
 } else {
  return 0;
 }
 return ret;
}

function getNativeTypeSize(type) {
 switch (type) {
 case "i1":
 case "i8":
  return 1;

 case "i16":
  return 2;

 case "i32":
  return 4;

 case "i64":
  return 8;

 case "float":
  return 4;

 case "double":
  return 8;

 default:
  {
   if (type[type.length - 1] === "*") {
    return 4;
   } else if (type[0] === "i") {
    var bits = parseInt(type.substr(1));
    assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
    return bits / 8;
   } else {
    return 0;
   }
  }
 }
}

var asm2wasmImports = {
 "f64-rem": function(x, y) {
  return x % y;
 },
 "debugger": function() {
  debugger;
 }
};

var functionPointers = new Array(0);

var tempRet0 = 0;

var setTempRet0 = function(value) {
 tempRet0 = value;
};

var getTempRet0 = function() {
 return tempRet0;
};

if (typeof WebAssembly !== "object") {
 err("no native wasm support detected");
}

var wasmMemory;

var wasmTable;

var ABORT = false;

var EXITSTATUS = 0;

function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}

function getCFunc(ident) {
 var func = Module["_" + ident];
 assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
 return func;
}

function ccall(ident, returnType, argTypes, args, opts) {
 var toC = {
  "string": function(str) {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    var len = (str.length << 2) + 1;
    ret = stackAlloc(len);
    stringToUTF8(str, ret, len);
   }
   return ret;
  },
  "array": function(arr) {
   var ret = stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }
 };
 function convertReturnValue(ret) {
  if (returnType === "string") return UTF8ToString(ret);
  if (returnType === "boolean") return Boolean(ret);
  return ret;
 }
 var func = getCFunc(ident);
 var cArgs = [];
 var stack = 0;
 if (args) {
  for (var i = 0; i < args.length; i++) {
   var converter = toC[argTypes[i]];
   if (converter) {
    if (stack === 0) stack = stackSave();
    cArgs[i] = converter(args[i]);
   } else {
    cArgs[i] = args[i];
   }
  }
 }
 var ret = func.apply(null, cArgs);
 ret = convertReturnValue(ret);
 if (stack !== 0) stackRestore(stack);
 return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
 argTypes = argTypes || [];
 var numericArgs = argTypes.every(function(type) {
  return type === "number";
 });
 var numericRet = returnType !== "string";
 if (numericRet && numericArgs && !opts) {
  return getCFunc(ident);
 }
 return function() {
  return ccall(ident, returnType, argTypes, arguments, opts);
 };
}

function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  break;

 case "i8":
  HEAP8[ptr >> 0] = value;
  break;

 case "i16":
  HEAP16[ptr >> 1] = value;
  break;

 case "i32":
  HEAP32[ptr >> 2] = value;
  break;

 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  break;

 case "float":
  HEAPF32[ptr >> 2] = value;
  break;

 case "double":
  HEAPF64[ptr >> 3] = value;
  break;

 default:
  abort("invalid type for setValue: " + type);
 }
}

var ALLOC_NORMAL = 0;

var ALLOC_NONE = 3;

function allocate(slab, types, allocator, ptr) {
 var zeroinit, size;
 if (typeof slab === "number") {
  zeroinit = true;
  size = slab;
 } else {
  zeroinit = false;
  size = slab.length;
 }
 var singleType = typeof types === "string" ? types : null;
 var ret;
 if (allocator == ALLOC_NONE) {
  ret = ptr;
 } else {
  ret = [ _malloc, stackAlloc, dynamicAlloc ][allocator](Math.max(size, singleType ? 1 : types.length));
 }
 if (zeroinit) {
  var stop;
  ptr = ret;
  assert((ret & 3) == 0);
  stop = ret + (size & ~3);
  for (;ptr < stop; ptr += 4) {
   HEAP32[ptr >> 2] = 0;
  }
  stop = ret + size;
  while (ptr < stop) {
   HEAP8[ptr++ >> 0] = 0;
  }
  return ret;
 }
 if (singleType === "i8") {
  if (slab.subarray || slab.slice) {
   HEAPU8.set(slab, ret);
  } else {
   HEAPU8.set(new Uint8Array(slab), ret);
  }
  return ret;
 }
 var i = 0, type, typeSize, previousType;
 while (i < size) {
  var curr = slab[i];
  type = singleType || types[i];
  if (type === 0) {
   i++;
   continue;
  }
  if (type == "i64") type = "i32";
  setValue(ret + i, curr, type);
  if (previousType !== type) {
   typeSize = getNativeTypeSize(type);
   previousType = type;
  }
  i += typeSize;
 }
 return ret;
}

function getMemory(size) {
 if (!runtimeInitialized) return dynamicAlloc(size);
 return _malloc(size);
}

var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
  return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
 } else {
  var str = "";
  while (idx < endPtr) {
   var u0 = u8Array[idx++];
   if (!(u0 & 128)) {
    str += String.fromCharCode(u0);
    continue;
   }
   var u1 = u8Array[idx++] & 63;
   if ((u0 & 224) == 192) {
    str += String.fromCharCode((u0 & 31) << 6 | u1);
    continue;
   }
   var u2 = u8Array[idx++] & 63;
   if ((u0 & 240) == 224) {
    u0 = (u0 & 15) << 12 | u1 << 6 | u2;
   } else {
    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u8Array[idx++] & 63;
   }
   if (u0 < 65536) {
    str += String.fromCharCode(u0);
   } else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
   }
  }
 }
 return str;
}

function UTF8ToString(ptr, maxBytesToRead) {
 return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | u1 & 1023;
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   outU8Array[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   outU8Array[outIdx++] = 192 | u >> 6;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   outU8Array[outIdx++] = 224 | u >> 12;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 3 >= endIdx) break;
   outU8Array[outIdx++] = 240 | u >> 18;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  }
 }
 outU8Array[outIdx] = 0;
 return outIdx - startIdx;
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}

function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) ++len; else if (u <= 2047) len += 2; else if (u <= 65535) len += 3; else len += 4;
 }
 return len;
}

var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

function allocateUTF8(str) {
 var size = lengthBytesUTF8(str) + 1;
 var ret = _malloc(size);
 if (ret) stringToUTF8Array(str, HEAP8, ret, size);
 return ret;
}

function writeArrayToMemory(array, buffer) {
 HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; ++i) {
  HEAP8[buffer++ >> 0] = str.charCodeAt(i);
 }
 if (!dontAddNull) HEAP8[buffer >> 0] = 0;
}

function demangle(func) {
 return func;
}

function demangleAll(text) {
 var regex = /__Z[\w\d_]+/g;
 return text.replace(regex, function(x) {
  var y = demangle(x);
  return x === y ? x : y + " [" + x + "]";
 });
}

function jsStackTrace() {
 var err = new Error();
 if (!err.stack) {
  try {
   throw new Error(0);
  } catch (e) {
   err = e;
  }
  if (!err.stack) {
   return "(no stack trace available)";
  }
 }
 return err.stack.toString();
}

function stackTrace() {
 var js = jsStackTrace();
 if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
 return demangleAll(js);
}

var WASM_PAGE_SIZE = 65536;

var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferViews() {
 Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
 Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
 Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
}

var DYNAMIC_BASE = 5264176, DYNAMICTOP_PTR = 21040;

var TOTAL_STACK = 5242880;

var INITIAL_TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;

if (INITIAL_TOTAL_MEMORY < TOTAL_STACK) err("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");

if (Module["buffer"]) {
 buffer = Module["buffer"];
} else {
 if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
  wasmMemory = new WebAssembly.Memory({
   "initial": INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE,
   "maximum": INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
  });
  buffer = wasmMemory.buffer;
 } else {
  buffer = new ArrayBuffer(INITIAL_TOTAL_MEMORY);
 }
}

updateGlobalBufferViews();

HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;

function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Module["dynCall_v"](func);
   } else {
    Module["dynCall_vi"](func, callback.arg);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

var runtimeExited = false;

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
 TTY.init();
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 FS.ignorePermissions = false;
 callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
 runtimeExited = true;
}

function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

var Math_abs = Math.abs;

var Math_ceil = Math.ceil;

var Math_floor = Math.floor;

var Math_min = Math.min;

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
 return id;
}

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

Module["preloadedImages"] = {};

Module["preloadedAudios"] = {};

var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
 return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
}

var wasmBinaryFile = "walua.wasm";

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
// WASM sub-injection
var WASMCODE="AGFzbQEAAAABlAM8YAR/f39/AX9gAX8Bf2ACf38AYAN/f38Bf2ACfHwBfGADf39/AGACf38Bf2ABfwBgAAF/YAAAYAJ/fwF8YAF8AXxgA39/fwF8YAN/f38BfmACf38BfmACf3wAYAJ/fgBgAn9+AX9gA39/fgF/YAN/f34AYAR/f39/AGAGf39/f39/AX9gBX9/f39/AX9gA39/fgF+YAF/AX5gBX9/f39/AGABfgF/YAN/f3wAYAJ/fAF/YAZ/f39/f38AYAd/f39/f39/AGAJf39/f39/f39/AGACfH8AYAJ+fwBgBH9/fn4AYAJ+fwF+YAN+fn8BfmAHf39/f39/fwF/YAR/f35+AX5gA398fAF8YAJ+fwF/YAV/f39/fwF+YAV/fn9/fwBgA39+fwF/YAF8AX9gBH9/fn8AYAJ/fgF+YAZ/f35/f38AYAF/AXxgA3x/fwF/YAJ+fAF/YAJ8fgF/YAN/fn4BfmACfn4BfmAFf35/f34Bf2ADfn9/AX9gBn98f39/fwF/YAJ8fwF8YAJ8fwF/YAN8fH8BfALEAzEDZW52AWIAAQNlbnYBYwAHA2VudgFkAAYDZW52AWUABwNlbnYBZgABA2VudgFnAAcDZW52AWgACANlbnYBaQACA2VudgFqAAYDZW52AWsABwhhc20yd2FzbQdmNjQtcmVtAAQDZW52AWwACANlbnYBbQAGA2VudgFuAAYDZW52AW8ABgNlbnYBcAAGA2VudgFxAAcDZW52AXIABQNlbnYBcwABA2VudgF0AAEDZW52AXUAAANlbnYBdgABA2VudgF3AAEDZW52AXgACwNlbnYBeQALA2VudgF6AAEDZW52AUEABwNlbnYBQgABA2VudgFDAAMDZW52AUQACANlbnYBRQAKA2VudgFGAAkDZW52AUcABgNlbnYBSAAGA2VudgFJAAYDZW52AUoABgNlbnYBSwAGA2VudgFMAAYDZW52AU0ABgNlbnYBTgAGA2VudgFPAAYDZW52AVAABgNlbnYBUQAHA2VudgxfX3RhYmxlX2Jhc2UDfwADZW52AWEDfwAGZ2xvYmFsA05hTgN8AAZnbG9iYWwISW5maW5pdHkDfAADZW52Bm1lbW9yeQIBgAKAAgNlbnYFdGFibGUBcAGoAqgCA9UI0wgCAQYDBgYDAwIQAQYFDgYHAxUXAgcDBgUC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CCAAIAJBEGo2AgwLQQAgACgCcARAIAAgACABIAAoAgxBACACa0EEdGogAhD3BTYCDAsgACABKAIINgIUIAAgASgCACACIAEuASAQpgYLQAEBfyAAIAAoAmBB9v8DaiIDNgJgIANB//8DcUHRAEkEQCAAEKECCyAAIAEgAhCUASAAIAAoAmBBioB8ajYCYAsvAQF/IAFBASAAKAIQIgItAE10cUUEQANAIAAQ2gMaIAFBASACLQBNdHFFDQALCwsZACAAEHYgAUwEQCAAIAAsADRBf2o6ADQLCxoAIAAoAgQgASACEOAGBEAgAEGP/wAQhwELCwgAQQIQA0EACywBAX8CfwJAIAAoAgQiAiABLAAARg0AIAIgASwAAUYNAEEADAELIAAQgAQLC20BAX8jCiECIwpBIGokCiACIAApAwA3AwAgAiAAKQMINwMIIAIgACkDEDcDECAAIAEpAwA3AwAgACABKQMINwMIIAAgASkDEDcDECABIAIpAwA3AwAgASACKQMINwMIIAEgAikDEDcDECACJAoLFgAgAEEBIAGtEIsBIABBASACrRCLAQsSACAAIAAgARD4ASACEF4Q3AQLkwECBH8BfiMKIQMjCkEQaiQKIAMhAiAALAAIIgRBI0YEfyABIAApAwC5OQMAQQEFIARBD3FBBEYEfyAAKAIAQRBqIAIQlgIgACgCACIALAAEQRRGBH8gAC0ABwUgACgCDAtBAWpGBH8gASACKQMAIga5IAa/IAIsAAhBI0YbOQMAQQEFQQALBUEACwshBSADJAogBQslAEIAIABCACABfYggAUJBUxtCACAAIAGGIAFCP1UbIAFCAFMbC5wDAQV/IwohByMKQRBqJAogByEJIAEhBQJAAkACQAJAAkADQAJAIAQEQCAFKAIAIgYoAhgiAUUNASABLAAGQQJxDQEgAUEBIAAoAhAoAqwBEKIBIgFFDQEgASwACCEEBSAAIAVBARCNASIBLAAIIgRBD3FFDQMLIARBD3FBBkYNAyAEQf8BcUHFAEYEQCABKAIAIAIQuwEiBCwACEEPcQ0FBUEAIQQLIAhBAWoiCEHQD08NBSABIQUMAQsLIARBCGoiASwAAEEgRgRAIAAgBiACEPUCIgEhBCABQQhqIQELIAQgAykDADcDACABIAMsAAg6AAAgBkEAOgAGIAMsAAhBwABxBEAg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QgBRBEAgAEG1hAEgBBBKCwUgAkIAIAEgAoEiAUIAUiABIAKFQgBTcRsgAXwhBQsgAyQKIAULbQICfwF+IwohAyMKQRBqJAogAyEEIAJCAXxCAlQEQCACQgBRBEAgAEGbhAEgBBBKBUIAIAF9IQULBSABIAJ/IQUgASAChUIAUwRAIAMkCiABIAIgBX59QgBSQR90QR91rCAFfA8LCyADJAogBQupewMqfwN+A3wjCiELIwpB0AFqJAogC0HIAWohJyALQcABaiEoIAtBsAFqIRIgC0GgAWohEyALQZgBaiEUIAtBkAFqIRUgC0GIAWohFiALQYABaiEXIAtB+ABqIRggC0HwAGohGSALQegAaiEaIAtB4ABqIRsgC0HYAGohHCALQdAAaiEdIAtByABqIR4gC0FAayEfIAtBOGohICALQTBqISEgC0EoaiEiIAtBIGohIyALQRhqISUgC0EQaiEPIAtBCGohESALISQDQAJAIAEoAgAiBCgCACINKAIMIgIoAjAhCiABKAIQIQMgACgCcARAAkAgAiwABwRAIAFBATYCFEEAIQgMAQsgAyACKAI0RgRAIAAgARC0BAsgAUEBNgIUIAAgAxAtIQggASgCACEECwVBACEICyANQRBqISkgAygCACICIQYgA0EEaiEDIARBEGoiBCACQQd2Qf8BcUEEdGohBQNAAkACfwJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCAGQf8AcUECdEGgHmooAgBBAWsOUQMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVSAAECRkdIT1BJSktMTU4LQcgEIQIMUwtB0gQhAgxSC0HYBCECDFELIAUgBkEQdkH/AXEiAkEEdCAEaikDADcDACAFIAJBBHQgBGosAAg6AAggCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAxNCyAFIAZBD3ZBgYB8aqw3AwAgBUEjOgAIIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMTAsgBSAGQQ92QYGAfGq3OQMAIAVBEzoACCAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADEsLIAUgBkEPdiICQQR0IApqKQMANwMAIAUgAkEEdCAKaiwACDoACCAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADEoLIANBBGohBiAFIAMoAgBBB3YiAkEEdCAKaikDADcDACAFIAJBBHQgCmosAAg6AAggCARAIAAgBhAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQhqIQUgBigCAAxJCyAFIAZBEHZB/wFxNgIAIAVBAToACCADQQRqIAMgBkH///8HSxshAyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADEgLIAZBEHZB/wFxIQcDQCAFQRBqIQYgBUEAOgAIIAdBf2ohAiAHBEAgBiEFIAIhBwwBCwsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAxHCyAFIA1BEGogBkEQdkH/AXFBAnRqKAIAKAIIIgIpAwA3AwAgBSACLAAIOgAIIAgEQCAAIAMQLSEIIAEoAgBBEGohBAVBACEICyAEIQIgCCEEIANBBGohBSADKAIADEYLIA1BEGogBkEQdkH/AXFBAnRqKAIAIgYoAggiAiAFKQMANwMAIAIgBSwACDoACCAFLAAIQcAAcQRAIAYsAAVBIHEEQCAFKAIAIgIsAAVBGHEEQCAAIAYgAhBmCwsLIAgEQCAAIAMQLSEIIAEoAgBBEGohBAVBACEICyAEIQIgCCEEIANBBGohBSADKAIADEULIAZBGHZBBHQgCmohBwJAAkAgDUEQaiAGQRB2Qf8BcUECdGooAgAoAggiBiwACEHFAEYEQCAGKAIAIAcoAgAQkgEiAiwACEEPcQRAIAUgAikDADcDACAFIAIsAAg6AAgFDAILBUEAIQIMAQsMAQsgASADNgIQIAAgASgCBDYCDCAAIAYgByAFIAIQoQEgASgCFCEICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADEQLIAZBEHZB/wFxIgdBBHQgBGohCSAGQRh2IgJBBHQgBGohBgJAAkAgAkEEdCAEaiwACEEjRgR/IAYpAwAhLSAHQQR0IARqLAAIQcUARgR/IC1Cf3wiLCAJKAIAIgIoAgitVAR/IAIoAgwgLKdBBHRqBSACIC0QXgsiAkEIaiIHLAAAQQ9xBH8gAiEGIAcFDAMLBUEAIQIMAgsFIAdBBHQgBGosAAhBxQBGBH8gCSgCACAGELsBIgJBCGoiBywAAEEPcQR/IAIhBiAHBQwDCwVBACECDAILCyECIAUgBikDADcDACAFIAIsAAA6AAgMAQsgASADNgIQIAAgASgCBDYCDCAAIAkgBiAFIAIQoQEgASgCFCEICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADEMLIAZBEHZB/wFxIgdBBHQgBGohCSAGQRh2IgKtISwCQAJAIAdBBHQgBGosAAhBxQBGBEAgLEJ/fCAJKAIAIgYoAgitVAR/IAYoAgwgAkF/akEEdGoFIAYgLBBeCyICIgYsAAhBD3EEQCAFIAIpAwA3AwAgBSAGLAAIOgAIBQwCCwVBACECDAELDAELIBIgLDcDACASQSM6AAggASADNgIQIAAgASgCBDYCDCAAIAkgEiAFIAIQoQEgASgCFCEICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADEILIAZBEHZB/wFxIgJBBHQgBGohByAGQRh2QQR0IApqIQYCQAJAIAJBBHQgBGosAAhBxQBGBEAgBygCACAGKAIAEJIBIgIsAAhBD3EEQCAFIAIpAwA3AwAgBSACLAAIOgAIBQwCCwVBACECDAELDAELIAEgAzYCECAAIAEoAgQ2AgwgACAHIAYgBSACEKEBIAEoAhQhCAsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAxBCyAGQRB2Qf8BcUEEdCAKaiEFIAZBGHYiAkEEdCAEaiACQQR0IApqIAZBgIACcUUbIQcCQAJAIA1BEGogBkEHdkH/AXFBAnRqKAIAKAIIIgYsAAhBxQBGBEAgBigCACAFKAIAEJIBIgIsAAhBD3EEQCACIAcpAwA3AwAgAiAHLAAIOgAIIAcsAAhBwABxBEAgBigCACICLAAFQSBxBEAgBygCACwABUEYcQRAIAAgAhBvCwsLBQwCCwVBACECDAELDAELIAEgAzYCECAAIAEoAgQ2AgwgACAGIAUgByACEMkBIAEoAhQhCAsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAxACyAGQRB2Qf8BcSIHQQR0IARqIQkgBkEYdiICQQR0IARqIAJBBHQgCmogBkGAgAJxRRshDAJAAkACfyAHQQR0IARqLAAIQSNGBH8gCSkDACEtIAUsAAhBxQBGBH8gLUJ/fCIsIAUoAgAiAigCCK1UBH8gAigCDCAsp0EEdGoFIAIgLRBeCyICQQhqIgcsAABBD3EEfyACIQYgBwUMBAsFQQAhAgwDCwUgBSwACEHFAEYEfyAFKAIAIAkQuwEiAkEIaiIHLAAAQQ9xBH8gAiEGIAcFDAQLBUEAIQIMAwsLISogBiAMKQMANwMAICoLIAwsAAg6AAAgDCwACEHAAHEEQCAFKAIAIgIsAAVBIHEEQCAMKAIALAAFQRhxBEAgACACEG8LCwsMAQsgASADNgIQIAAgASgCBDYCDCAAIAUgCSAMIAIQyQEgASgCFCEICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADD8LIAZBGHYiAkEEdCAEaiACQQR0IApqIAZBgIACcUUbIQcgBkEQdkH/AXEiAq0hLAJAAkAgBSwACEHFAEYEQCAsQn98IAUoAgAiBigCCK1UBH8gBigCDCACQX9qQQR0agUgBiAsEF4LIgIiBiwACEEPcQRAIAIgBykDADcDACAGIAcsAAg6AAggBywACEHAAHEEQCAFKAIAIgIsAAVBIHEEQCAHKAIALAAFQRhxBEAgACACEG8LCwsFDAILBUEAIQIMAQsMAQsgEyAsNwMAIBNBIzoACCABIAM2AhAgACABKAIENgIMIAAgBSATIAcgAhDJASABKAIUIQgLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMPgsgBkEQdkH/AXFBBHQgCmohByAGQRh2IgJBBHQgBGogAkEEdCAKaiAGQYCAAnFFGyEGAkACQCAFLAAIQcUARgRAIAUoAgAgBygCABCSASICLAAIQQ9xBEAgAiAGKQMANwMAIAIgBiwACDoACCAGLAAIQcAAcQRAIAUoAgAiAiwABUEgcQRAIAYoAgAsAAVBGHEEQCAAIAIQbwsLCwUMAgsFQQAhAgwBCwwBCyABIAM2AhAgACABKAIENgIMIAAgBSAHIAYgAhDJASABKAIUIQgLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMPQsgBkEYdiECIAZBgIACcQRAIAIgAygCAEEHdkEIdHIhAgtBASAGQRB2Qf8BcSIGQX9qdEEAIAYbIQwgA0EEaiEJIAAgBUEQaiIHNgIMIAUgABDQASIGNgIAIAVBxQA6AAggAiAMcgRAIAAgBiACIAwQ8QELIAAoAhAoAgxBAEoEfyAAIAc2AgwgABBLIAEoAhQFIAgLBEAgACAJEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBCGohBSAJKAIADDwLIAZBGHYiAkEEdCAEaiACQQR0IApqIAZBgIACcUUbIgkoAgAhByAFIAZBEHZB/wFxIgJBBHQgBGoiBikDADcDECAFIAJBBHQgBGoiAiwACDoAGAJAAkAgAiwACEHFAEYEQCAGKAIAIAcQ9gIiAiwACEEPcQRAIAUgAikDADcDACAFIAIsAAg6AAgFDAILBUEAIQIMAQsMAQsgASADNgIQIAAgASgCBDYCDCAAIAYgCSAFIAIQoQEgASgCFCEICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADDsLIAZBEHZB/wFxIgJBBHQgBGohByAGQRh2QYF/aiEGAkAgBQJ/IAJBBHQgBGosAAhBE2siAgRAIAJBEEcNAiAFIAcpAwAgBqx8NwMAQSMMAQsgBSAHKwMAIAa3oDkDAEETCzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMOgsgBkEQdkH/AXEiAkEEdCAEaiEHIAZBGHYiBkEEdCAKaiEJAkAgBQJ8IAJBBHQgBGosAAhBE2siAgRAIAJBEEcNAiAHKQMAISwgLLkgBkEEdCAKaiwACCICQSNHDQEaIAUgLCAJKQMAfDcDACAFQSM6AAggA0EEaiEDDAILIAZBBHQgCmosAAghAiAHKwMACwJ8AkAgAkEYdEEYdUETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQugOQMAIAVBEzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMOQsgBkEQdkH/AXEiAkEEdCAEaiEHIAZBGHYiBkEEdCAKaiEJAkAgBQJ8IAJBBHQgBGosAAhBE2siAgRAIAJBEEcNAiAHKQMAISwgLLkgBkEEdCAKaiwACCICQSNHDQEaIAUgLCAJKQMAfTcDACAFQSM6AAggA0EEaiEDDAILIAZBBHQgCmosAAghAiAHKwMACwJ8AkAgAkEYdEEYdUETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQuhOQMAIAVBEzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMOAsgBkEQdkH/AXEiAkEEdCAEaiEHIAZBGHYiBkEEdCAKaiEJAkAgBQJ8IAJBBHQgBGosAAhBE2siAgRAIAJBEEcNAiAHKQMAISwgLLkgBkEEdCAKaiwACCICQSNHDQEaIAUgLCAJKQMAfjcDACAFQSM6AAggA0EEaiEDDAILIAZBBHQgCmosAAghAiAHKwMACwJ8AkAgAkEYdEEYdUETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQuiOQMAIAVBEzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMNwsgBkEQdkH/AXEiAkEEdCAEaiEHIAZBGHYiBkEEdCAKaiEJAkACfCACQQR0IARqLAAIQRNrIgIEQCACQRBHDQIgBykDACEsICy5IAZBBHQgCmosAAgiAkEjRw0BGiADQQRqIQMgBSAAICwgCSkDABDmAjcDACAFQSM6AAgMAgsgBkEEdCAKaiwACCECIAcrAwALIS8CfAJAIAJBGHRBGHVBE2siAgRAIAJBEEYEQAwCBQwECwALIAkrAwAMAQsgCSkDALkLITAgA0EEaiEDIAUgLyAwEOUCOQMAIAVBEzoACAsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAw2CyAGQRB2Qf8BcSICQQR0IARqIQkgBkEYdiIGQQR0IApqIQcCQAJ8AkAgAkEEdCAEaiwACEETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQshLwJ8AkAgBkEEdCAKaiwACEETayICBEAgAkEQRgRADAIFDAQLAAsgBysDAAwBCyAHKQMAuQshMCADQQRqIQMgBSAvIDAQ0gI5AwAgBUETOgAICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADDULIAZBEHZB/wFxIgJBBHQgBGohCSAGQRh2IgZBBHQgCmohBwJAIAUCfAJAIAJBBHQgBGosAAhBE2siAgRAIAJBEEYEQAwCBQwECwALIAkrAwAMAQsgCSkDALkLAnwCQCAGQQR0IApqLAAIQRNrIgIEQCACQRBGBEAMAgUMBAsACyAHKwMADAELIAcpAwC5C6M5AwAgBUETOgAIIANBBGohAwsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAw0CyAGQRB2Qf8BcSICQQR0IARqIQcgBkEYdiIGQQR0IApqIQkCQCAFAnwgAkEEdCAEaiwACEETayICBEAgAkEQRw0CIAcpAwAhLCAsuSAGQQR0IApqLAAIIgJBI0cNARogA0EEaiEDIAUgACAsIAkpAwAQ5wI3AwAgBUEjOgAIDAILIAZBBHQgCmosAAghAiAHKwMACwJ8AkAgAkEYdEEYdUETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQujnDkDACAFQRM6AAggA0EEaiEDCyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADDMLIAZBEHZB/wFxIgJBBHQgBGohByAGQRh2QQR0IApqKQMAIS0CQAJAIAJBBHQgBGosAAhBI0YEQCAUIAcpAwAiLDcDAAwBBSAHIBRBABBJBEAgFCkDACEsDAILCwwBCyAFICwgLYM3AwAgBUEjOgAIIANBBGohAwsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwyCyAGQRB2Qf8BcSICQQR0IARqIQcgBkEYdkEEdCAKaikDACEtAkACQCACQQR0IARqLAAIQSNGBEAgFSAHKQMAIiw3AwAMAQUgByAVQQAQSQRAIBUpAwAhLAwCCwsMAQsgBSAsIC2ENwMAIAVBIzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMMQsgBkEQdkH/AXEiAkEEdCAEaiEHIAZBGHZBBHQgCmopAwAhLQJAAkAgAkEEdCAEaiwACEEjRgRAIBYgBykDACIsNwMADAEFIAcgFkEAEEkEQCAWKQMAISwMAgsLDAELIAUgLCAthTcDACAFQSM6AAggA0EEaiEDCyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADDALIAZBEHZB/wFxIgdBBHQgBGohCSAGQRh2IQICQAJAIAdBBHQgBGosAAhBI0YEQCAXIAkpAwAiLDcDAAwBBSAJIBdBABBJBEAgFykDACEsDAILCwwBCyADQQRqIQMgBSAsQf8AIAJrrBDIATcDACAFQSM6AAgLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMLwsgBkEQdkH/AXEiB0EEdCAEaiEJIAZBGHZBgX9qIQICQAJAIAdBBHQgBGosAAhBI0YEQCAYIAkpAwAiLDcDAAwBBSAJIBhBABBJBEAgGCkDACEsDAILCwwBCyADQQRqIQMgBSACrCAsEMgBNwMAIAVBIzoACAsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwuCyAGQRB2Qf8BcSICQQR0IARqIQcgBkEYdiIGQQR0IARqIQkCQCAFAnwgAkEEdCAEaiwACEETayICBEAgAkEQRw0CIAcpAwAhLCAsuSAGQQR0IARqLAAIIgJBI0cNARogBSAsIAkpAwB8NwMAIAVBIzoACCADQQRqIQMMAgsgBkEEdCAEaiwACCECIAcrAwALAnwCQCACQRh0QRh1QRNrIgIEQCACQRBGBEAMAgUMBAsACyAJKwMADAELIAkpAwC5C6A5AwAgBUETOgAIIANBBGohAwsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwtCyAGQRB2Qf8BcSICQQR0IARqIQcgBkEYdiIGQQR0IARqIQkCQCAFAnwgAkEEdCAEaiwACEETayICBEAgAkEQRw0CIAcpAwAhLCAsuSAGQQR0IARqLAAIIgJBI0cNARogBSAsIAkpAwB9NwMAIAVBIzoACCADQQRqIQMMAgsgBkEEdCAEaiwACCECIAcrAwALAnwCQCACQRh0QRh1QRNrIgIEQCACQRBGBEAMAgUMBAsACyAJKwMADAELIAkpAwC5C6E5AwAgBUETOgAIIANBBGohAwsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwsCyAGQRB2Qf8BcSICQQR0IARqIQcgBkEYdiIGQQR0IARqIQkCQCAFAnwgAkEEdCAEaiwACEETayICBEAgAkEQRw0CIAcpAwAhLCAsuSAGQQR0IARqLAAIIgJBI0cNARogBSAsIAkpAwB+NwMAIAVBIzoACCADQQRqIQMMAgsgBkEEdCAEaiwACCECIAcrAwALAnwCQCACQRh0QRh1QRNrIgIEQCACQRBGBEAMAgUMBAsACyAJKwMADAELIAkpAwC5C6I5AwAgBUETOgAIIANBBGohAwsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwrCyAGQRB2Qf8BcSICQQR0IARqIQcgBkEYdiIGQQR0IARqIQkCQAJ8IAJBBHQgBGosAAhBE2siAgRAIAJBEEcNAiAHKQMAISwgLLkgBkEEdCAEaiwACCICQSNHDQEaIANBBGohAyAFIAAgLCAJKQMAEOYCNwMAIAVBIzoACAwCCyAGQQR0IARqLAAIIQIgBysDAAshLwJ8AkAgAkEYdEEYdUETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQshMCADQQRqIQMgBSAvIDAQ5QI5AwAgBUETOgAICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADCoLIAZBEHZB/wFxIgJBBHQgBGohCSAGQRh2IgZBBHQgBGohBwJAAnwCQCACQQR0IARqLAAIQRNrIgIEQCACQRBGBEAMAgUMBAsACyAJKwMADAELIAkpAwC5CyEvAnwCQCAGQQR0IARqLAAIQRNrIgIEQCACQRBGBEAMAgUMBAsACyAHKwMADAELIAcpAwC5CyEwIANBBGohAyAFIC8gMBDSAjkDACAFQRM6AAgLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMKQsgBkEQdkH/AXEiAkEEdCAEaiEJIAZBGHYiBkEEdCAEaiEHAkAgBQJ8AkAgAkEEdCAEaiwACEETayICBEAgAkEQRgRADAIFDAQLAAsgCSsDAAwBCyAJKQMAuQsCfAJAIAZBBHQgBGosAAhBE2siAgRAIAJBEEYEQAwCBQwECwALIAcrAwAMAQsgBykDALkLozkDACAFQRM6AAggA0EEaiEDCyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADCgLIAZBEHZB/wFxIgJBBHQgBGohByAGQRh2IgZBBHQgBGohCQJAIAUCfCACQQR0IARqLAAIQRNrIgIEQCACQRBHDQIgBykDACEsICy5IAZBBHQgBGosAAgiAkEjRw0BGiADQQRqIQMgBSAAICwgCSkDABDnAjcDACAFQSM6AAgMAgsgBkEEdCAEaiwACCECIAcrAwALAnwCQCACQRh0QRh1QRNrIgIEQCACQRBGBEAMAgUMBAsACyAJKwMADAELIAkpAwC5C6OcOQMAIAVBEzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMJwsgBkEQdkH/AXEiB0EEdCAEaiEJIAZBGHYiAkEEdCAEaiEGAkACQCAHQQR0IARqLAAIQSNGBEAgGSAJKQMANwMADAEFIAkgGUEAEEkNAQsMAQsgAkEEdCAEaiwACEEjRgRAIBogBikDACIsNwMABSAGIBpBABBJRQ0BIBopAwAhLAsgBSAZKQMAICyDNwMAIAVBIzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMJgsgBkEQdkH/AXEiB0EEdCAEaiEJIAZBGHYiAkEEdCAEaiEGAkACQCAHQQR0IARqLAAIQSNGBEAgGyAJKQMANwMADAEFIAkgG0EAEEkNAQsMAQsgAkEEdCAEaiwACEEjRgRAIBwgBikDACIsNwMABSAGIBxBABBJRQ0BIBwpAwAhLAsgBSAbKQMAICyENwMAIAVBIzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMJQsgBkEQdkH/AXEiB0EEdCAEaiEJIAZBGHYiAkEEdCAEaiEGAkACQCAHQQR0IARqLAAIQSNGBEAgHSAJKQMANwMADAEFIAkgHUEAEEkNAQsMAQsgAkEEdCAEaiwACEEjRgRAIB4gBikDACIsNwMABSAGIB5BABBJRQ0BIB4pAwAhLAsgBSAdKQMAICyFNwMAIAVBIzoACCADQQRqIQMLIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMJAsgBkEQdkH/AXEiB0EEdCAEaiEJIAZBGHYiAkEEdCAEaiEGAkACQCAHQQR0IARqLAAIQSNGBEAgISAJKQMANwMADAEFIAkgIUEAEEkNAQsMAQsgAkEEdCAEaiwACEEjRgRAICIgBikDACIsNwMABSAGICJBABBJRQ0BICIpAwAhLAsgA0EEaiEDIAUgISkDACAsEMgBNwMAIAVBIzoACAsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwjCyAGQRB2Qf8BcSIHQQR0IARqIQkgBkEYdiICQQR0IARqIQYCQAJAIAdBBHQgBGosAAhBI0YEQCAfIAkpAwA3AwAMAQUgCSAfQQAQSQ0BCwwBCyACQQR0IARqLAAIQSNGBEAgICAGKQMAIiw3AwAFIAYgIEEAEElFDQEgICkDACEsCyADQQRqIQMgBSAfKQMAQgAgLH0QyAE3AwAgBUEjOgAICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADCILIANBeGooAgBBB3ZB/wFxQQR0IARqIQIgASADNgIQIAAgASgCBDYCDCAAIAUgBkEQdkH/AXFBBHQgBGogAiAGQRh2EMoBIAEoAhQEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMIQsgA0F4aigCAEEHdkH/AXFBBHQgBGohAiABIAM2AhAgACABKAIENgIMIAAgBSAGQRB2Qf8BcUGBf2qsIAZBD3ZBAXEgAiAGQRh2EOsGIAEoAhQEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMIAsgA0F4aigCAEEHdkH/AXFBBHQgBGohAiABIAM2AhAgACABKAIENgIMIAAgBSAGQRB2Qf8BcUEEdCAKaiAGQQ92QQFxIAIgBkEYdhCXBCABKAIUBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADB8LIAZBEHZB/wFxIgJBBHQgBGohBgJAAkAgAkEEdCAEaiwACEETayICBEAgAkEQRw0BIAVCACAGKQMAfTcDACAFQSM6AAgMAgsgBSAGKwMAmjkDACAFQRM6AAgMAQsgASADNgIQIAAgASgCBDYCDCAAIAYgBiAFQRIQygEgASgCFCEICyAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADB4LIAZBEHZB/wFxIgJBBHQgBGohBgJAAkAgAkEEdCAEaiwACEEjRgR/ICMgBikDACIsNwMADAEFIAYgI0EAEEkEfyAjKQMAISwMAgUgASADNgIQIAAgASgCBDYCDCAAIAYgBiAFQRMQygEgASgCFAsLIQgMAQsgBSAsQn+FNwMAIAVBIzoACAsgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwdCyAFIAZBEHZB/wFxIgZBBHQgBGosAAgiAkEPcQR/IAJBAUYEfyAGQQR0IARqKAIARQVBAAsFQQELQQFxNgIAIAVBAToACCAIBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADBwLIAEgAzYCECAAIAEoAgQ2AgwgACAFIAZBEHZB/wFxQQR0IARqEJYEIAEoAhQEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMGwsgACAGQRB2Qf8BcSICQQR0IAVqNgIMIAEgAzYCECAAIAIQ6AEgACgCECgCDEEASgRAIAAQSwsgASgCFARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwaCyABIAM2AhAgACABKAIENgIMIAAgBUEAEHkaIAEoAhQEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMGQsgASADNgIQIAAgASgCBDYCDCAAIAUQ+AIgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwYCyAGQQd2QYGAgHhqQQJ0IANqIQMgASgCFARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwXCyABIAM2AhAgACABKAIENgIMAn8gACAFIAZBEHZB/wFxQQR0IARqEOcBISsgASgCFCECICsLIAZBD3ZBAXFGBH8gAygCAEEHdkGCgIB4agVBAQtBAnQgA2ohAyACBEAgACADEC0hBCABKAIAQRBqIQIFIAQhAkEAIQQLIANBBGohBSADKAIADBYLIAZBEHZB/wFxIgdBBHQgBGohCQJAAkACQCAFLAAIIgJBI0YEfyAHQQR0IARqLAAIIgJBI0YEfyAFKQMAIAkpAwBTBQwCCwUgAkEPcUEDRw0CIAdBBHQgBGosAAghAgwBCyECDAILIAJBD3FBA0cNACAFIAkQnAUhAgwBCyABIAM2AhAgACABKAIENgIMIAAgBSAJEL0EIQIgASgCFCEICyACIAZBD3ZBAXFGBH8gASgCFCEIIAMoAgBBB3ZBgoCAeGpBAnQgA2oFIANBBGoLIQMgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwVCyAGQRB2Qf8BcSIHQQR0IARqIQkCQAJAAkAgBSwACCICQSNGBH8gB0EEdCAEaiwACCICQSNGBH8gBSkDACAJKQMAVwUMAgsFIAJBD3FBA0cNAiAHQQR0IARqLAAIIQIMAQshAgwCCyACQQ9xQQNHDQAgBSAJEJ0FIQIMAQsgASADNgIQIAAgASgCBDYCDCAAIAUgCRC+BCECIAEoAhQhCAsgAiAGQQ92QQFxRgR/IAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqBSADQQRqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMFAtBACAFIAZBEHZB/wFxQQR0IApqEOcBIAZBD3ZBAXFGBH8gASgCFCEIIAMoAgBBB3ZBgoCAeGpBAnQgA2oFIANBBGoLIQMgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwTCyAGQRB2Qf8BcUGBf2ohBwJ/AkACQAJAAkAgBSwACEETayICBEAgAkEQRw0BIAUpAwAgB6xRIQIMAgsgBSsDACAHt2EhAgwBCyAGQYCAAnFFDQIMAQsgAiAGQYCAAnFBAEdzRQ0BCyADQQRqDAELIAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMEgsgBkEQdkH/AXFBgX9qIQcCQAJAIAUsAAhBE2siAgRAIAJBEEcNASAFKQMAIAesUyECDAILIAUrAwAgB7djIQIMAQsgASADNgIQIAAgASgCBDYCDCAAIAUgB0EAIAZBGHZBFBCTAiECIAEoAhQhCAsgAiAGQQ92QQFxRgR/IAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqBSADQQRqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMEQsgBkEQdkH/AXFBgX9qIQcCQAJAIAUsAAhBE2siAgRAIAJBEEcNASAFKQMAIAesVyECDAILIAUrAwAgB7dlIQIMAQsgASADNgIQIAAgASgCBDYCDCAAIAUgB0EAIAZBGHZBFRCTAiECIAEoAhQhCAsgAiAGQQ92QQFxRgR/IAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqBSADQQRqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMEAsgBkEQdkH/AXFBgX9qIQcCQAJAIAUsAAhBE2siAgRAIAJBEEcNASAFKQMAIAesVSECDAILIAUrAwAgB7dkIQIMAQsgASADNgIQIAAgASgCBDYCDCAAIAUgB0EBIAZBGHZBFBCTAiECIAEoAhQhCAsgAiAGQQ92QQFxRgR/IAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqBSADQQRqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMDwsgBkEQdkH/AXFBgX9qIQcCQAJAIAUsAAhBE2siAgRAIAJBEEcNASAFKQMAIAesWSECDAILIAUrAwAgB7dmIQIMAQsgASADNgIQIAAgASgCBDYCDCAAIAUgB0EBIAZBGHZBFRCTAiECIAEoAhQhCAsgAiAGQQ92QQFxRgR/IAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqBSADQQRqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMDgsCfwJAIAUsAAgiAkEPcQRAIAJBAUYEQCAFKAIAQQBHIAZBgIACcUEAR3NFDQIFIAZBgIACcQ0CCwUgBkGAgAJxRQ0BCyADQQRqDAELIAEoAhQhCCADKAIAQQd2QYKAgHhqQQJ0IANqCyEDIAgEQCAAIAMQLSEEIAEoAgBBEGohAgUgBCECQQAhBAsgA0EEaiEFIAMoAgAMDQsgBkEQdkH/AXEiAkEEdCAEaiEJAn8CQCACQQR0IARqIgcsAAgiAkEPcQRAIAJBAUYEQCAJKAIARSAGQYCAAnFBAEdzDQIFIAZBgIACcQ0CCwUgBkGAgAJxRQ0BCyADQQRqDAELIAUgCSkDADcDACAFIAcsAAg6AAggASgCFCEIIAMoAgBBB3ZBgoCAeGpBAnQgA2oLIQMgCARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwMCyAGQRB2Qf8BcSICBEAgACACQQR0IAVqNgIMCyABIAM2AhAgACAFIAZBGHZBf2oQlAEgASgCFARAIAAgAxAtIQQgASgCAEEQaiECBSAEIQJBACEECyADQQRqIQUgAygCAAwLCyAFIQggBSwAKEEjRgRAIAUiAikDECIuQgBSBEAgCCkDICEtIAUpAwAhLCACIC5Cf3w3AxAgBSAsIC18Iiw3AwAgBSAsNwMwIAVBIzoAOEEAIAZBD3ZrQQJ0IANqIQMLBQJAIAUrAxAhLyAIKwMgIjAgBSsDAKAhMSAwRAAAAAAAAAAAZARAIDEgL2VFDQEFIC8gMWVFDQELIAUgMTkDACAFIDE5AzAgBUETOgA4QQAgBkEPdmtBAnQgA2ohAwsLIAEoAhQEQCAAIAMQLSEIIAEoAgBBEGohBAVBACEICyAEIQIgCCEEIANBBGohBSADKAIADAoLIAVBEGohDiAFQSBqIRAgASADNgIQIAAgASgCBDYCDAJAAkAgBSIJLAAIQSNHDQAgBSwAKEEjRw0AIAUpAwAhLSAQKQMAIi5CAFEEQEHtBCECDA8LIAUgLTcDMCAFQSM6ADgCQCAAIC0gDiAlIC4Q+AcEQCAGQQ92QQFqQQJ0IANqIQMMAQsgJSkDACEsIA4gLkIAVQR+ICwgLX0hLCAuQgFSBH4gLCAugAUgLAsFIC0gLH1CACAufYALNwMAIAVBIzoAGAsMAQsgBSIHLAAYQRNGBEAgESAOKwMAOQMABSAOIBEQxwFFBEBB+AQhAgwPCwsgBSICLAAoQRNGBEAgJCAQKwMAOQMABSAQICQQxwFFBEBB/AQhAgwPCwsgCSwACEETRgRAIA8gBSsDADkDAAUgBSAPEMcBRQRAQYAFIQIMDwsLICQrAwAiMUQAAAAAAAAAAGEEQEGCBSECDA4LAkAgMUQAAAAAAAAAAGQEQCARKwMAIi8gDysDACIwY0UNAQUgDysDACIwIBErAwAiL2NFDQELIAZBD3ZBAWpBAnQgA2ohAwwBCyAOIC85AwAgB0ETOgAYIBAgMTkDACACQRM6ACggBSAwOQMAIAlBEzoACCAFIA8rAwA5AzAgBUETOgA4CyAIBEAgACADEC0hCCABKAIAQRBqIQQFQQAhCAsgBCECIAghBCADQQRqIQUgAygCAAwJCyABIAM2AhAgACABKAIENgIMIAAgBUEwahD4AiAGQQ92QQJ0IANqIgIoAgAhBiACQQRqIQMMBgsgBSgCACEMIAZBEHZB/wFxIgcEQCAAIAEoAgQ2AgwFIAAoAgwgBWtBBHVBf2ohBwsgByAGQRh2aiECIAZBgIACcQR/IAIgAygCAEEHdkEIdGohAiADQQRqBSADCyEJIAIgDBCEAUsEQCAAIAwiAyACIAMoAhQEf0EBIAMtAAd0BUEACxDxAQsgB0EASgRAIAchAwNAIAwoAgwiBiACQX9qIgJBBHRqIANBBHQgBWoiBykDADcDACACQQR0IAZqIANBBHQgBWoiBiwACDoACCAGLAAIQcAAcQRAIAwsAAVBIHEEQCAHKAIALAAFQRhxBEAgACAMEG8LCwsgA0F/aiEGIANBAUoEQCAGIQMMAQsLCyAIBEAgACAJEC0hAyABKAIAQRBqIQQFQQAhAwsgBCECIAMhBCAJQQRqIQUgCSgCAAwHCyANKAIMKAI4IAZBD3ZBAnRqKAIAIQIgASADNgIQIAAgASgCBDYCDCAAIAIgKSAEIAUQjQYgACgCECgCDEEASgR/IAAgBUEQajYCDCAAEEsgASgCFAUgCAsEQCAAIAMQLSEIIAEoAgBBEGohBAVBACEICyAEIQIgCCEEIANBBGohBSADKAIADAYLIAEgAzYCECAAIAEoAgQ2AgwgACABIAUgBkEYdkF/ahDtBiABKAIUBEAgACADEC0hCCABKAIAQRBqIQQFQQAhCAsgBCECIAghBCADQQRqIQUgAygCAAwFCyAAIAZBB3ZB/wFxIAEgDSgCDBDvBiABKAIUBH8gACABELQEIAAgA0EEaiIFNgIYIAAgAxAtBSADQQRqIQVBAAshBCABKAIAQRBqIQIgAygCAAwECyAIBEAgACADEC0hCCABKAIAQRBqIQQFQQAhCAsgBCECIAghBCADQQRqIQUgAygCAAwDC0G2BSECDAULIAVBQGsiAiAFKQMANwMAIAIgBSkDCDcDCCACIAUpAxA3AxAgAiAFKQMYNwMYIAIgBSkDIDcDICACIAUpAyg3AyggACAFQfAAajYCDCABIAM2AhAgACACIAZBGHYQlAEgASgCFCIIBEAgASgCAEEQaiIEIAZBB3ZB/wFxQQR0aiEFCyADKAIAIQYgA0EEaiEDCyAFLABIIgJBD3EEfyAFIAVBQGspAwA3AyAgBSACOgAoQQAgBkEPdmtBAnQgA2oFIAMLIQYgCARAIAAgBhAtIQMgASgCAEEQaiEEBUEAIQMLIAQhAiADIQQgBkEEaiEFIAYoAgALIQYgBCEIIAUhAyAGQQd2Qf8BcUEEdCACaiEFIAIhBAwBCwsgBkEYdiICBH9BACACIAEoAhhqawVBAAshJiAGQRB2Qf8BcSICBEAgACACQQR0IAVqNgIMBSAAKAIMIAVrQQR1IQILIAEgAzYCECAGQYCAAnEEQCAAIARBfxB5GgsgBSIHLAAIIghBD3FBBkcEfyACQQFqIQIgACAFELMEIAcsAAgFIAgLQf8BcUHWAEcEQEHDBCECDAELIAEgASgCACAmQQR0ajYCACAAIAEgBSACEI8HDAELCwJAAkACQAJAAkACQAJAAkACQAJAIAJBwwRrDkAACQkJCQEJCQkJCQkJCQkCCQkJCQkDCQkJCQkJCQkJCQkJCQkJCQkJCQkECQkJCQkJCQkJCQUJCQkGCQkJBwkICQsgACAFQX8QlAEgASgCFARAIAEoAgAiBEEQaiAGQQd2Qf8BcUEEdGohBQUgASgCACEECyABICZBBHQgBGo2AgAgACABIAAoAgwgBWtBBHUQvQEMCAsgBkEQdkH/AXEiCEF/aiECIAhFBEAgACgCDCAFa0EEdSECCyABIAM2AhAgBkGAgAJxBEAgACgCDCABKAIEIgNJBEAgACADNgIMCyAAIARBABB5GiABKAIUBH8gASgCAEEQaiAGQQd2Qf8BcUEEdGoFIAULIQULIAZBGHYiBARAIAEgASgCAEEAIAQgASgCGGprQQR0ajYCAAsgACACQQR0IAVqNgIMIAAgASACEL0BDAcLIAAoAnAEQCAAIAU2AgwgASADNgIQIAAgAUEAEL0BDAcLIAEuASAhAiAAIAEoAgg2AhQgACAEQXBqNgIMIAJBAEoEQCAAIAQ2AgwgBEF4akEAOgAAIAJBAUcEQCACIQEDQCABQX9qIQQgACAAKAIMIgJBEGo2AgwgAkEAOgAIIAFBAkoEQCAEIQEMAQsLCwsMBgsgACgCcARAIAAgBUEQajYCDCABIAM2AhAgACABQQEQvQEMBgsgAS4BICECIAAgASgCCDYCFCAEQXBqIQEgAkUEQCAAIAE2AgwMBgsgASAFKQMANwMAIARBeGogBSwACDoAACAAIAQ2AgwgAkEBSgRAIAAgBEEQajYCDCAEQQA6AAggAkECRwRAIAIhAQNAIAFBf2ohBCAAIAAoAgwiAkEQajYCDCACQQA6AAggAUEDSgRAIAQhAQwBCwsLCwwFCyAAQc+EASAoEEoMBAsgACAOQeKEARCeAgwDCyAAIBBB6IQBEJ4CDAILIAAgBUHthAEQngIMAQsgAEHPhAEgJxBKCyALJAoLRwAgACABIAIgACgCDCADEK0DRQRAIAAgASACEIcHCyAAKAIMIgAsAAgiAUEPcQR/IAFBAUYEfyAAKAIAQQBHBUEBCwVBAAsLTAECfyABIAJzIQIgAUEFdiIDIAFJBEAgA0F/cyEEA0AgAiAAIAFBf2pqLQAAIAJBBXQgAkECdmpqcyECIAEgBGoiASADSw0ACwsgAgscACAAIAFBJCAAKAIQKAJIEOwEIgAgATYCDCAACx0AIABBUGogAEEgckGpf2ogAEGxC2osAABBAnEbC0MBAn8gAEF/aiIAQf8BSwRAIAAhAgNAIAFBCGohASACQQh2IQAgAkH//wNLBEAgACECDAELCwsgASAAQdAVai0AAGoLdwEEfyMKIQIjCkGAAWokCiACQQhqIQUgAiEDAkACQCAAIAEgAkEMaiIEEIABRQ0AIABBuMMAIAQQ5QEaIAQoAhgiAUEATA0AIAMgBEEsajYCACADIAE2AgQgAEG7wwAgAxBEGgwBCyAAQaScASAFEEQaCyACJAoL9gIBB38jCiEHIwpBkAhqJAogByIEQQhqIQMgBEEEaiEGIAAQRUEBaiEFAkACQCABBH8gBCABNgIAIABBuMUAIAQQRBogAyABQYTlABD6ASIENgIEIAQNASAAQYTZACAFEJ4DQQYFIABBscUAEDAaIANBuDwoAgA2AgQMAQshAQwBCyADIAYQ2AMEQCADIAMoAgAiBEEBajYCACAEIANBCGpqQQo6AAALIAFBAEciCCAGKAIAIgRBG0ZxBEAgAyABIAMoAgQQ8wciATYCBCABBH8gAyAGENgDGiAGKAIABSAAQb/FACAFEJ4DQQYhAQwCCyEECyAEQX9HBEAgAyADKAIAIgFBAWo2AgAgASADQQhqaiAEOgAACyAAQQYgAyAAQX9BABA7IAIQ4gIhAQJ/IAMoAgQiBBDiBCEJIAgEQCAEENgBGgsgCQsEQCAAIAUQKyAAQaTXACAFEJ4DQQYhAQUgACAFQX8QQiAAQX4QKwsLIAckCiABC0IBAn8gAhBOIQUgASACEMICIgQEQANAIAAgASAEIAFrEGQgACADEJEBIAQgBWoiASACEMICIgQNAAsLIAAgARCRAQtWAQF/QQAgAyADQX9GGyEDIAJBgAJIBEAgAEHMACABIAMgAkEAEDwaBSACQQh2IQQgAEHMACABIAMgAkH/AXFBARA8GiAAIAQQ+AQLIAAgAUEBajoANAsbACAAKAIAQQZGBH8gACgCECAAKAIURgVBAAsLZQAgACABEIMBIAAgAUEUagJ/AkACQAJAIAEoAgBBAmsODwECAQEBAQICAgICAgICAAILIAAgARCDBCABKAIIDAILQX8MAQsgACABQQAQwQQLEM4BIAAgASgCEBClASABQX82AhALLAAgAkGAgAhIBEAgAEEDIAEgAhDuARoFIABBBCABQQAQ7gEaIAAgAhD4BAsL0wMCBn8BfCMKIQYjCkEwaiQKIAZBGGohAyACLAAIIgdBD3FFBEAgAEGB+gAgAxBKCyAGQSBqIQggBkEIaiEDIAYhBQJAAkAgASAHQRNGBH8gAisDACIJIAVBABCMAQRAIAMgBSkDADcDACADQSM6AAggAyEEBSAJIAliBEAgAEGU+gAgCBBKBSACIQQLCyAEBSACCyIFEIkEIgMsAAhBD3FFBEAgASgCFARAIAMhAgwCCwsgARDmByICRQRAIAAgASAFEIAGIAAgASAFEPABIQIMAgsgAyABIAMtAAkgA0EQahCKBCIERgRAIAMoAgwiBARAIAIgBEEYbCADaiACa0EYbTYCDAsgAyACIANrQRhtNgIMDAELA0AgBCgCDEEYbCAEaiIHIANHBEAgByEEDAELCyAEIAIiByAEa0EYbTYCDCACIAMpAwA3AwAgAiADKQMINwMIIAIgAykDEDcDECADKAIMBEAgAiACKAIMIAMgB2tBGG1qNgIMIANBADYCDAsgA0EQOgAIIAMhAgsgAiAFKQMANwMQIAIgBSwACDoACSAFLAAIQcAAcQRAIAEsAAVBIHEEQCAFKAIALAAFQRhxBEAgACABEG8LCwsLIAYkCiACC0kBBH8jCiEDIwpBEGokCiADIQIgASwABCIEQRRGBH8gACABEJIBBSACIAE2AgAgAiAEQcAAcjoACCAAIAIQjQMLIQUgAyQKIAULtAEBA38gASgCACIEQRBqIQUCQAJAAkAgAS4BIkECcQ0AIAJBAEgEfyABQQAgAmsgAxD9BwUgBCgCACgCDCACIAEQsAIQoAIiBkUNASAGIQAMAgshAAwCCyACQQBKIAEgACgCFEYEfyAAQQxqBSABKAIMCygCACAFa0EEdSACTnEEf0H60ABB7tAAIAEuASJBAnEbIQAMAQVBAAshAAwBCyADBEAgAyACQQR0IARqNgIACwsgAAtzAQF/IAEsAAgiAkEPcQRAAkAgAkEBRgRAIAEoAgBFDQELIAAgAUEYEI0BLAAIQQ9xRQRAIAAgAUGy1QAQwAMLIABBBiABEPQBBEAgAEEEIAFBEGoiAhC8ASAAIAEgAhDRAhogAEEAEKwDIABBBBBlCwsLCzcBAX8gAEEWIAFBAnQiAkEQahCnASIAQQA2AgwgACABOgAGIAEEQCAAQRBqQQAgAhCdARoLIAALSAECfyAAEOEFIgJBCG0gAkEKamoiAUHAhD0gAUHAhD1IGyEBIAJBvIQ9SARAIAEgACgCZEgEQCAAIAFBABD7AhoLCyAAEIwHC4cBAQN/IAAgACgCICAAKAJkIgRBBHQgAUEEdBCYAiIDBEAgBCABSARAIAQhAgNAIAJBBHQgA2pBADoACCACQQFqIgIgAUcNAAsLIAAgACgCICADEKsIIAAgAzYCICAAIAE2AmQgACABQQR0IANqQbB/ajYCHEEBIQUFIAIEQCAAQQQQZQsLIAULNgECfyAAKAIMIgIhASAAKAIcIAJrQSBIBEAgAEEBQQEQkwEaIAAoAgwhAQsgACABQRBqNgIMCy8BAX8gACgCECICIAE6AFIgAiwATgRAIAAgAhDUBBoFIAAgAhDyBwsgAkEAOgBSCzEBAX8gACgCECICLQBOIAFHBEAgAUEBRgRAIAAgAhDmBBoFIAIQoAMLCyACQQA2AhQLNwAgACABEL4IBH8gAiwAAEEqRgR/IABBARBHQQAFIABBg+QAEDAaQQILBSAAQYPkABAwGkEBCwufAwMCfwF+BXwgAL0iA0IgiKciAUGAgMAASSADQgBTIgJyBEACQCADQv///////////wCDQgBRBEBEAAAAAAAA8L8gACAAoqMPCyACRQRAQct3IQIgAEQAAAAAAABQQ6K9IgNCIIinIQEgA0L/////D4MhAwwBCyAAIAChRAAAAAAAAAAAow8LBSABQf//v/8HSwRAIAAPCyABQYCAwP8DRiADQv////8PgyIDQgBRcQR/RAAAAAAAAAAADwVBgXgLIQILIAMgAUHiviVqIgFB//8/cUGewZr/A2qtQiCGhL9EAAAAAAAA8L+gIgQgBEQAAAAAAADgP6KiIQUgBCAERAAAAAAAAABAoKMiBiAGoiIHIAeiIQAgAiABQRR2arciCEQAAOD+Qi7mP6IgBCAIRHY8eTXvOeo9oiAGIAUgACAAIABEn8Z40Amawz+iRK94jh3Fccw/oKJEBPqXmZmZ2T+goiAHIAAgACAARERSPt8S8cI/okTeA8uWZEbHP6CiRFmTIpQkSdI/oKJEk1VVVVVV5T+goqCgoqAgBaGgoAsnAgF/AX4gACABEDgiA6chAiACrCADUgRAIAAgAUHz6AAQMRoLIAILMwAgAiAAKAIwIgAgAUEEdGosAAhBD3FBBEYEfyABQQR0IABqKAIAQRBqBUHl5AALNgIACxAAIABBIEYgAEF3akEFSXILCwAgAEGff2pBGkkLGAAgABDyAgR/IAApAwgQrwJBAEcFQQALCxcAIAEgADYCACABQQE2AgQgAUEBNgIICx4AIAFBAEoEfyAAKAIUBSAAQQxqCygCACABQQR0agtoAQN/IwohBSMKQRBqJAogBSEEIAJBEHZB/wFxIQIgAwRAIAQgACACEL0CIgA2AgAFIAAgASACIAQQpwIaIAQoAgAhAAsgAAR/QcvRAEHY0QAgAEGM2gAQWRsFQcvRAAshBiAFJAogBgskACAAIAEQNigCACEAIAMEQCADIAA2AgALIAJBAnQgAGpBDGoLPQAgACgCACgCNCABQQJ0aiEAAkAgAUEATA0AIABBfGoiASgCAEH/AHFB0BdqLAAAQRBxRQ0AIAEhAAsgAAtQAQR/IwohAiMKQRBqJAogAiEDIABB2PNCIAEQSBogAEF/EJ8BIgQoAgRFBEAgAyABQQRqNgIAIABBntkAIAMQLhoLIAQoAgAhBSACJAogBQtlAQJ/IAAgACgCABBDIAAoAjgiASgCACECIAEgAkF/ajYCACAAIAIEfyABIAEoAgQiAUEBajYCBCABLQAABSABEDULIgE2AgAgACABQbELaiwAAEEQcUGU3QAQ2QEgACgCABDsAgtCAQF/IAEgACABEIkEIgAQ5QRFBEADQAJAIAAoAgwiAkUEQEHIOiEADAELIAEgAkEYbCAAaiIAEOUERQ0BCwsLIAALygEBA38jCiEHIwpBEGokCiAHIQUgACACIAMQywQhBiAFIAMoAgAiAzYCACAGQQdGBEACQCACKAIALAAABEAgACACIAUQywRBA0YgBSgCACICRXJFDQEFIAMhAgsgACgCAEEBQYryABAxGgsFIAMhAgsgBCAGQQNGIAJBAkhyBH9BAAUgAiAAKAIIIgNKBEAgBSADNgIAIAMhAgsgAkF/aiIDIAJxBEAgACgCAEEBQa3yABAxGgsgAyACIAEgA3FrcQs2AgAgByQKIAYLKQEBf0GQAyAAKAIIIgJrIAFIBEAgABClAyAAKAIIIQILIAIgAEEMamoL+wIBBH8gABBFIQMgASgCTBogASABKAIAQU9xNgIAAn8CQCADQQFGBH8gACABQQEQzQIhBCACQQFqIQMMAQUgACADQRNqQZnYABCkASACIQQgA0F+aiEDA0ACQCAAIAQQL0EDRgR/IAAgBBA4pyIFBH8gACABIAUQiAYFIAEQqAEiBSABEMMDIABBpJwBEDAaIAVBf0cLBQJ/AkACQAJAAkAgACAEQQAQMiIFQQFqIAUgBSwAAEEqRhssAABBzABrDiMCBgYGBgYGBgYGBgYGBgYGBgYGBgYDBgYGBgYGBgYGBgEGAAYLIAAgARCHBgwDCyAAIAFBARDNAgwCCyAAIAFBABDNAgwBCyAAIAEQiQZBAQsLIQYgBEEBaiEEIANBf2ohBSADQQBHIAZBAEdxBEAgBSEDDAIFIAQhAyAGIQQMBAsACwsgACAEQcPYABAxCwwBCyABEOIEBEAgAEEAQQAQbgwBCyAERQRAIABBfhArIAAQOgsgAyACawsLIQEBfyABIQMgAigCTBogACADIAIQlQUiACABIAAgA0cbC5EBAgF/An4CQAJAIAC9IgNCNIgiBKdB/w9xIgIEQCACQf8PRgRADAMFDAILAAsgASAARAAAAAAAAAAAYgR/IABEAAAAAAAA8EOiIAEQkgMhACABKAIAQUBqBUEACzYCAAwBCyABIASnQf8PcUGCeGo2AgAgA0L/////////h4B/g0KAgICAgICA8D+EvyEACyAACxsAIAEoAhQEQCAAIAEoAhBBGCABLQAHdBBGCwstACAAIAEoAgBBCEYEfyABKAIIBUF/CyACKAIAQQhGBH8gAigCCAVBfwsQ1gQLyAEBA38gAigCTEF/SgR/QQEFQQALGiABIQUgAiACLABKIgQgBEH/AWpyOgBKAkAgAigCCCACKAIEIgRrIgNBAEoEfyAAIAQgAyAFIAMgBUkbIgMQQBogAiADIAIoAgRqNgIEIAAgA2ohACAFIANrBSAFCyIERQ0AIAAhAyAEIQADQAJAIAIQtQMNACACIAMgACACKAIgQQ9xQYICahEDACIEQQFqQQJJDQAgACAEayIARQ0CIAMgBGohAwwBCwsgBSAAayEBCyABCyAAIAFBAUsEfyAAQQAQRyAAQX4QM0ECBSAAEEUgAmsLC1cBA38gACgCMCgCLCICIAAoAkQiACgCHCIDSAR/An8gACgCGCEEIAIhAAN/IAEgAEEEdCAEaiICKAIARgRAIAIMAgsgAEEBaiIAIANIDQBBAAsLBUEACwtXAQR/IwohAyMKQRBqJAogAyEEIABB1/NCIAIQSBogAEF/QQAQOyIFRQRAIAQgAjYCACAAQcXkACAEEC4aCyAAIAEgBUH9hQFB4+QAEOQDIQYgAyQKIAYLMwECfyMKIQIjCkEgaiQKIAAoAjAiAyABEKkEIAAQPyAAIAIQowMgAyABIAIQnQIgAiQKC0MBAn8jCiEDIwpBEGokCiADIQQgASAAEHRB/wFxRgRAIAMkCgUgACgCACEBIAQgAjYCACAAIAFBi4EBIAQQTxCHAQsL2AEBBH8gACABIAIQ6QQgAUEQaiEDIAEoAgBBEEYEQCAAIAMgASgCCBDOAQsgASgCFCIEIAMoAgAiBUcEQAJAAkAgACAFEIQEDQAgACAEEIQEDQBBfyEEQX8hBQwBCyABKAIAQRBGBH9BfwUgABCCAQshBiAAIAJBAEEBEPoEIQQgACACQQFBABD6BCEFIAAgBhClAQsgABC6ASEGIAAgASgCFCAGIAIgBBDTAiAAIAMoAgAgBiACIAUQ0wILIANBfzYCACABQX82AhQgASACNgIIIAFBCDYCAAsjAQF/IwohASMKQSBqJAogACABEJcBIAAoAjAgARByIAEkCgtMAQN/IAAsAAchAiAAKAIQIQMgACgCFCEEIAAgASwABzoAByAAIAEoAhA2AhAgACABKAIUNgIUIAEgAjoAByABIAM2AhAgASAENgIUC1oBA38jCiEDIwpBEGokCkHkmwEoAgAQwwIhBCAAIAJBABA7QQFqIQUgAyABNgIAIAMgBTYCBCADIAQ2AgggAEHKxQAgAxBEGiAAIAJBfxBCIABBfhArIAMkCgsgAQF/IAAoAhAiAUEDOgBNIAEgACABQdgAahDOAzYCXAtlACAAIAAoAlgQuwIgAEEANgKAASAAQQA2AoQBIABBADYCiAEgACAAKAJgELsCIAAgACgCeBC7AiAAQQA2AowBIABBADYCkAEgAEEANgKUASAAQQg6AE0gAEEAOgBOIABBADYCFAsrAQF/IAEgAkcEQANAIAEoAgAhAyAAIAEQrAIgAiADRwRAIAMhAQwBCwsLCzUBAX8gABDWAiIEIAE2AgAgBEGiATYCBCACBEAgAEF/EDMgAEHY80IgAhA3CyAAQX4gAxA3CwsAIAEgABB6ELMCCx8AIAAgAiADIAEgAykDCKdB/wBqIAQgBUEtIAYQ+wELGAAgACAAQQxqIAAoAggQ9AMgAEEANgIICy8BAX8gACACEDinIQMgACABQQYQYSAAIAEgAxCSBEUEQCAAIAJB4M4AEDEaCyADC10BBH8jCiEEIwpBEGokCiAEIQMgAQR/IAAgAhAwGkECBSAAQQFBABA7IQUgAEF/QQAQOyEBIAMgBTYCACADIAI2AgQgAyABNgIIIABByOMAIAMQLgshBiAEJAogBgsTACABIAJKBEAgACACIAMQkQgLCxYAIAAgARAwGiAAQQAgAmsQ4QFBAEcLaAEBfwJ/AkAgACgCACICIAEsAABGDQAgAiABLAABRg0AQQAMAQsgACACEEMgACgCOCIBKAIAIQIgASACQX9qNgIAIAAgAgR/IAEgASgCBCIBQQFqNgIEIAEtAAAFIAEQNQs2AgBBAQsLFAAgACgCECABRwRAIAAgARDkBAsLEQAgACAAKAIMQVBqQQAQvgELTwEBfwJ/AkAgACABIAQQjQEiBSwACEEPcQR/IAUhBAwBBSAAIAIgBBCNASIELAAIQQ9xBH8MAgVBAAsLDAELIAAgBCABIAIgAxCUAkEBCwuMAQEDfyMKIQQjCkHQAGokCiAEQRBqIgUgABDWCCIGNgIAIAYgAzYCKCAAIAUgBBD+AyAAQSgQbCACBEAgACAAQY7sAEEEEHcQaRogAEEBEKoBCyAAEJEGIABBKRBsIAAQ3gEgBSgCACAAKAIENgIsIABBhgJBiQIgAxCaASAAIAEQuAggABD8BCAEJAoL2gICA38DfiACIAFLBEADQAJAIAAgAa0iBxBRGiAAIAKtIggQURogAEF/QX4QrwEEQCAAIAEgAhDFAQUgAEF9ECsLIAIgAWsiBUEBRg0AIAAgA0UgBUHkAElyBH8gASACakEBdgUgAyACIAFrQQJ2IgRBAXRwIAEgBGpqCyIErSIJEFEaIAAgBxBRGiAAQX5BfxCvAQRAIAAgBCABEMUBBSAAQX4QKyAAIAgQURogAEF/QX4QrwEEQCAAIAQgAhDFAQUgAEF9ECsLCyAFQQJGDQAgACAJEFEaIABBfxAzIAAgAkF/aiIFrRBRGiAAIAQgBRDFASAAIAEgAhCQBiIGIAFrIgQgAiAGayIFSQRAIAAgASAGQX9qIAMQrwMgBkEBaiEBBSAAIAZBAWogAiADEK8DIAUhBCAGQX9qIQILIAIgAWtBB3YgBEsEQBC7ByEDCyACIAFLDQELCwsLSwECfyAAEEUiAkH8AU4EQCAAQfwBQZnYABAxGgsgAkF/aiEDIABBARAzIAAgA6wQNCAAIAEQRyAAQQJBAxBCIABBowEgAkECahB+Cz8BA38jCiEBIwpBEGokCiABIAAQuQEiAigCBDYCACACQQA2AgQgASgCACECIAAgAkH/AXERAQAhAyABJAogAwuMAQAgACgCMCEAIAEgAmshAQJAAkACQAJAAkACQCADKAIADhQCAQEBAQEBAQEBAQEBAQEBAQEAAAELIAAgAyABQQFqIgJBACACQQBKGxCcAiABQQBKDQIMAwsgACADEHILIAFBAEwNASAAIAAtADQgARClBAsgACABEIEBDAELIAAgAC0ANCABajoANAsLGQAgACABIABBMhCPAxDJAyAAKAIIajYCCAtGAQN/IAAQTiECIAEQTiEDIAAgAkF/amosAAAhBCAAIAJqQX9qIAEQxAIgACACIANqIgFBf2pqIAQ6AAAgACABakEAOgAAC48BAQJ/IAAgACwASiIBIAFB/wFqcjoASiAAKAIUIAAoAhxLBEAgACgCJCEBIABBAEEAIAFBD3FBggJqEQMAGgsgAEEANgIQIABBADYCHCAAQQA2AhQgACgCACIBQQRxBH8gACABQSByNgIAQX8FIAAgACgCLCAAKAIwaiICNgIIIAAgAjYCBCABQRt0QR91CwskAQF/IABBADYCaCAAIAAoAggiASAAKAIEazYCbCAAIAE2AmQLgAkDCX8BfgR8IwohByMKQTBqJAogB0EQaiEEIAchBSAAvSILQj+IpyEGAn8CQCALQiCIpyICQf////8HcSIDQfvUvYAESQR/IAJB//8/cUH7wyRGDQEgBkEARyECIANB/bKLgARJBH8gAgR/IAEgAEQAAEBU+yH5P6AiAEQxY2IaYbTQPaAiDDkDACABIAAgDKFEMWNiGmG00D2gOQMIQX8FIAEgAEQAAEBU+yH5v6AiAEQxY2IaYbTQvaAiDDkDACABIAAgDKFEMWNiGmG00L2gOQMIQQELBSACBH8gASAARAAAQFT7IQlAoCIARDFjYhphtOA9oCIMOQMAIAEgACAMoUQxY2IaYbTgPaA5AwhBfgUgASAARAAAQFT7IQnAoCIARDFjYhphtOC9oCIMOQMAIAEgACAMoUQxY2IaYbTgvaA5AwhBAgsLBQJ/IANBvIzxgARJBEAgA0G9+9eABEkEQCADQfyyy4AE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AhgiASkDADcDACADIAEpAwg3AwggAyABKQMQNwMQIAQgAyAFEJ0CIAAgAhCXASAEIAMgAhCbAiAEIAc6ADQgAiQKC4YBAQJ/IABFBEAgARCzAQ8LIAFBv39LBEBB5JsBQQw2AgBBAA8LIABBeGpBECABQQtqQXhxIAFBC0kbELsFIgIEQCACQQhqDwsgARCzASICRQRAQQAPCyACIAAgAEF8aigCACIDQXhxQQRBCCADQQNxG2siAyABIAMgAUkbEEAaIAAQ1gEgAguLAwEGfyMKIQYjCkEQaiQKIAYhBSAAIAAoAgAiBBBDIAAoAjgiAygCACECIAMgAkF/ajYCACAAIAIEfyADIAMoAgQiAkEBajYCBCACLQAABSADEDULNgIAIARBMEYEf0GM3ABBidwAIABBhtwAEKoDGwVBidwACyEEA0ACQCAAIAQQqgMEQCAAQY/cABCqAxoFIAAoAgAiA0GxC2osAAAiAkEQcUEARyADQS5GckUNASAAIAMQQyAAKAI4IgMoAgAhAiADIAJBf2o2AgAgACACBH8gAyADKAIEIgJBAWo2AgQgAi0AAAUgAxA1CzYCAAsMAQsLIAJBAXEEQCAAIAMQQyAAKAI4IgQoAgAhAiAEIAJBf2o2AgAgACACBH8gBCAEKAIEIgJBAWo2AgQgAi0AAAUgBBA1CzYCAAsgAEEAEEMgACgCPCgCACAFEJYCRQRAIABBktwAQaICEJUBCyAFLAAIQSNGBH8gASAFKQMANwMAQaMCBSABIAUrAwA5AwBBogILIQcgBiQKIAcLiQQBBn8jCiEHIwpBEGokCiAHIQUgACgCBCEIIAAgACgCABBDIAAoAjgiBCgCACEDIAQgA0F/ajYCACAAIAMEfyAEIAQoAgQiBEEBajYCBCAELQAABSAEEDULIgQ2AgACQAJAIARBCmsOBAABAQABCyAAEPcBCyABRSEEAkACQANAAkACQAJAAkAgACgCACIDQX9rDl8FAgICAgICAgICAgECAgECAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAAILIAAQxQIgAkYNAgwDCyAAQQoQQyAAEPcBIAQEQCAAKAI8QQA2AgQLDAILIARFBEAgACADEEML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LAAIIQIMAQtBAAwBCwJAAkACQCACQRh0QRh1QRNrIgIEQCACQRBGBEAMAgUMAwsACyADKwMAIQsMAgsgAykDALkhCwwBC0EADAELIAQgASAKIAsQ/wM5AwAgBEETOgAIQQELIQggBiQKIAgLvQMBAn8CQAJAAkACQCABLAAAQT1rDgQAAgIBAgsgAUEBaiEBIAJBPUkEQCAAIAEgAhBAGgUgACABKQAANwAAIAAgASkACDcACCAAIAEpABA3ABAgACABKQAYNwAYIAAgASkAIDcAICAAIAEpACg3ACggACABKQAwNwAwIAAgAS4AODsAOCAAIAEsADo6ADogAEEAOgA7CwwCCyACQT1JBEAgACABQQFqIAIQQBoFIABBmOYALgAAOwAAIABBmuYALAAAOgACIAAgASACakFIaiIBKQAANwADIAAgASkACDcACyAAIAEpABA3ABMgACABKQAYNwAbIAAgASkAIDcAIyAAIAEpACg3ACsgACABKQAwNwAzIAAgASwAODoAOwsMAQsgAUEKEDkhAyAAQZzmACkAADcAACAAQaTmACwAADoACCAAQQlqIQAgA0UiBCACQS1JcQR/IAAgASACEEAaIAAgAmoFIAAgASACIAMgAWsgBBsiAUEtIAFBLUkbIgEQQBogACABaiIAQZjmAC4AADsAACAAQZrmACwAADoAAiAAQQNqCyIAQabmAC4AADsAACAAQajmACwAADoAAgsLSQEBfyAAQQEQnwEiAQRAIABBARDkAQRAIABB2PNCQYPXABBIGiABQQAgAEF/QX4Q3wIbIQEgAEF9ECsFQQAhAQsFQQAhAQsgAQtDACAAQdjzQiABEEgEf0EABSAAQX4QKyAAQQBBAhBXIAAgARAwGiAAQX5Bx/4AEDcgAEF/EDMgAEHY80IgARA3QQELCzIBAn8jCiEFIwpBEGokCiAFIAE2AgAgBSACNgIEIABBByAFIAMgBBDiAiEGIAUkCiAGCzUBAn8jCiEEIwpBkARqJAogACAEEF0gBCABIAIgAxDwAiAEEFsgAEF/QQAQOyEFIAQkCiAFC0MAAn8CQAJAAkACQCABQX9rDgIAAQILIABBAEEAEG4MAwsgAEEBEEcMAQsgABA6CyAAQcXmABAwGiAAIAGsEDRBAwsLbwACQAJAAkAgASgCAEESaw4CAAECCyABQQg2AgAg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KQMAIQIgASwACEEjRgR/IAIgASkDAFcFIAIgASsDABD3CAsFIAArAwAhAyABLAAIQRNGBH8gAyABKwMAZQUgAyABKQMAEPgICwsLlwIBCH8jCiEEIwpBEGokCiAEIgIgACgCECIDELQFIgE2AgAgAiABLAAEQcAAcjoACCAAIAJBAhCNASIFLAAIQQ9xBEAgACwAByEGIAMsAFEhByAAQQA6AAcgA0EAOgBRIAAgACgCDCIBQRBqNgIMIAEgBSkDADcDACABIAUsAAg6AAggACAAKAIMIgFBEGo2AgwgASACKQMANwMAIAEgAiwACDoACCAAKAIUIgIgAi4BIkHAAHI7ASICfyAAQQhBACAAKAIMQWBqIAAoAiBrQQAQowIhCCAAKAIUIgIgAi4BIkG/f3E7ASIgACAGOgAHIAMgBzoAUSAICwRAIABBmNYAELEEIAAgACgCDEFwajYCDAsLIAQkCgsjAQF/IwohAiMKQRBqJAogAiAAOQMAIAJBCCABEJsBIAIkCgsjAQF/IwohAiMKQRBqJAogAiAANwMAIAJBCCABEJsBIAIkCguPAQACQAJAIAIoAgwNACABIAAoAkwiAUYNACABIAIQhAIMAQtBACACEIQCCyAAKAIoIAIQWCAAKAIsIAIQWCAALQAGIAIQcSAALQAHIAIQcSAALQAIIAIQcSAAKAIUIAIQWCAAKAI0IAAoAhRBAnQgAhCbASAAIAIQ/QggACACEPkIIAAgAhD6CCAAIAIQ/AgLBAAjCgsGACAAJAoLGwECfyMKIQIgACMKaiQKIwpBD2pBcHEkCiACCxIAIAEgAiAAQQ9xQZYCahECAAsGAEEFEAMLCABBARADQQAL0AEBA38gASABKAKAASABKAKIARCGBCABIAFB4ABqIgMoAgAgASgClAEQhgQgABC3AhogACABIAAgASABQdgAaiICIAEoAoABEN0BIgQgASgCiAEQ3QEaIAEgASgChAE2AogBIAEgBCgCADYChAEgASACKAIANgKAASAAIAEgACABIAMgASgCjAEQ3QEiAiABKAKUARDdARogASABKAKQATYClAEgASACKAIANgKQASABIAMoAgA2AowBIAAgASABQfgAakEAEN0BGiAAIAEQ3QQLDAAgAyABIAIQZEEAC2YBBH8jCiEDIwpBEGokCiAAKAIwIQIgABA/IAIQ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dHIhAiADRSIDIAEtAABBGHQgAS0AAUEQdHIgAS0AAkEIdHIiBCACRnIEfyADBSACIQEDfyABIABBAWoiACwAACICQf8BcXJBCHQhASACRSICIAEgBEZyRQ0AIAILCyEBQQAgAEF+aiABGwumAQIEfwJ+IwohAiMKQaAEaiQKIAIiAUGQBGohAyAAQQFBBRDaASAAEMsBIQUgAEECQaScASADEFwhBCAAQQNCARA9IQYgAEEEIAUQPSEFIAAgARBdAkACQCAGIAVTBEADQCAAIAEgBhCPBSABIAQgAygCABBkIAZCAXwiBiAFUw0ADAIACwAFIAUgBlENAQsMAQsgACABIAUQjwULIAEQWyACJApBAQuBAQEDfyMKIQMjCkEQaiQKIAMhAiAAvUIgiKdB/////wdxIgFB/MOk/wNJBEAgAUGAgIDyA08EQCAARAAAAAAAAAAAQQAQkQUhAAsFIAFB//+//wdLBHwgACAAoQUgACACELcDIQEgAisDACACKwMIIAFBAXEQkQULIQALIAMkCiAAC9wBAgJ/AnwjCiEDIwpBgAFqJAogAyICQgA3AgAgAkIANwIIIAJCADcCECACQgA3AhggAkIANwIgIAJCADcCKCACQgA3AjAgAkIANwI4IAJBQGtCADcCACACQgA3AkggAkIANwJQIAJCADcCWCACQgA3AmAgAkIANwJoIAJCADcCcCACQQA2AnggAiAANgIEIAJBfzYCCCACIAA2AiwgAkF/NgJMIAIQtgMgAhDsCCEFIAIoAmwgAigCBCACKAIIa2ohAiABBEAgASAAIAJqIAAgAhs2AgALIAMkCiAFC3QBBH9BAyEDQYfDACEBIAAsAAAiAgRAAkAgACEEIAIhAAN/IAEsAAAiAiAAQRh0QRh1RiACQQBHIANBf2oiA0EAR3FxRQ0BIAFBAWohASAEQQFqIgQsAAAiAA0AQQALIQALBUEAIQALIABB/wFxIAEtAABrC84BAQR/IwohBCMKQSBqJAogBCEDAkACQCABLAAAIgJFDQAgASwAAUUNACADQQBBIBCdARogASwAACICBEADQCACQf8BcSICQQV2QQJ0IANqIgUgBSgCAEEBIAJBH3F0cjYCACABQQFqIgEsAAAiAg0ACwsgACwAACICBEACQCAAIQEDQCACQf8BcSICQQV2QQJ0IANqKAIAQQEg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AAAAoiACRQ0BGiAPCyANIAsgBRtCAoZCYHx8IgtCsghVBEBB5JsBQSI2AgAgAbdE////////73+iRP///////+9/ogwBCyALQuR2UwRAQeSbAUEiNgIAIAG3RAAAAAAAABAAokQAAAAAAAAQAKIMAQsgAkF/SgRAIAIhAANAIBFEAAAAAAAA4D9mRSICQQFzIABBAXRyIQAgESARIBFEAAAAAAAA8L+gIAIboCERIAtCf3whCyAAQX9KDQALBSACIQALAnwCQCALQtIIfCINQjVTBEAgDaciBEEATARAQQAhBEHUACECDAILC0HUACAEayECIARBNUgNACABtyEQRAAAAAAAAAAADAELIAG3IRBEAAAAAAAA8D8gAhB7IBAQ8AQLIRJEAAAAAAAAAAAgESAAQQFxRSAEQSBIIBFEAAAAAAAAAABicXEiBBsgEKIgEiAQIAAgBEEBcWq4oqCgIBKhIhFEAAAAAAAAAABhBEBB5JsBQSI2AgALIBEgC6cQ5gMLBSAAKAJkRSIERQRAIAAgACgCBEF/ajYCBAsgBEUEQCAAIAAoAgRBf2o2AgQgBCAFRXJFBEAgACAAKAIEQX9qNgIECwsgAbdEAAAAAAAAAACiCwu7AQIBfwJ+IAEgAUIAUa18IQECQAJAA0AgAUKAgICAgICAgMAAVARAIAAgAUIBhiIDEF4sAAhBD3FFDQIgAyEBDAELCyAAQv///////////wAQXiwACEEPcQR+Qv///////////wAFQv///////////wAhAwwBCyEBDAELIAMgAX1CAVYEQANAIAAgASADfEIBiCIEEF4sAAhBD3FFIQIgBCADIAIbIgMgASAEIAIbIgF9QgFWDQALCwsgAQtIACABKAIEQf////8HRgRAIABBARD9AiABKAIEQf////8HRgRAIABBBBBlCwsgASgCCCIBQYCAgIACSARAIAAgAUEBdBCYBAsLZQEEfyAAKAIwIQEgACgCBCEDIAAgABB6IgQQlwMiAgRAIAEgAi0ADBCuASEAIAEQdiAASgRAIAFBNCAAQQBBAEEAEDwaCyABIAEQggEgAigCBBDNAQUgACAEIAMgARCCARDXAgsLggEBA38gAEHV80IQnwEiAUEMaiEDIAEgADYCGCABKAIAIgAgASgCEEsEf0EABQJ/A0ACQCADEMsCIAMgACABKAIE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AiAEIQNBvMUAEJYFIQUgASgCTEF/SgR/QQEFQQALGiABEHAaAkACQCAABEAgAEG8xQAQ+gEiAEUNASAAKAI8IgIgASgCPCIDRgRAIABBfzYCPAUgAiADIAVBgIAgcRDvCEEASARAIAAQ2AEaDAMLCyABIAAoAgAgASgCAEEBcXI2AgAgASAAKAIgNgIgIAEgACgCJDYCJCABIAAoAig2AiggASAAKAIMNgIMIAAQ2AEaBSAFQYCAIHEEQCADIAEoAjw2AgAgA0ECNgIEIANBATYCCEHdASADEAIaCyACIAEoAjw2AgAgAkEENgIEIAIgBUG//l9xNgIIQd0BIAIQAhBzQQBIDQELDAELIAEQ2AEaQQAhAQsgBCQKIAELnQEBA38gAC0AAEEYdCAALQABQRB0ciAALQACQQh0ciAAQQNqIgAsAAAiA0H/AXFyIQIgA0UiAyABLQADIAEtAABBGHQgAS0AAUEQdHIgAS0AAkEIdHJyIgQgAkZyBH8gAwUgAiEBA38gAEEBaiIALAAAIgJB/wFxIAFBCHRyIQEgAkUiAiABIARGckUNACACCwshAUEAIABBfWogARsL0gIBA38jCiECIwpBEGokCiAAKAIwIgQgAkEBEJgBIAAQPyAAEHohAwJAAkACQAJAIAAoAhBBLGsO4QEBAgICAgICAgICAgICAgICAgACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgECCyAAIAMgARD2BwwCCyAAIAMQ9wcMAQsgAEHt7gAQagsgAEGGAkGIAiABEJoBIAQQlgEgAiQKC5ABAQJ/IAAoAjAiAy0ANCEEIAAgAEGC7wBBCxB3EGkaIAAgAEGC7wBBCxB3EGkaIAAgAEGC7wBBCxB3EGkaIAAgARBpGiAAQT0QbCAAEJwDIABBLBBsIAAQnAMgAEEsEFUEQCAAEJwDBSADIAMtADRCARCnBCADQQEQgQELIABBAxCqASAAIAQgAkEBQQAQ2AQL4QEBBX8jCiEEIwpBIGokCiAEIQUgACgCMCICLQA0IQYgACAAQYLvAEELEHcQaRogACAAQYLvAEELEHcQaRogACAAQYLvAEELEHcQaRogACAAQYLvAEELEHcQaRogACABEGkaIABBLBBVBH9BBSEBA0AgACAAEHoQaRogAUEBaiEDIABBLBBVBEAgAyEBDAELCyABQX1qBUEBCyEBIABBjAIQbCAAKAIEIQMgAEEEIAAgBRD8ASAFELIDIABBBBCqASACIAIQdhDaAiACQQMQrAQgACAGIAMgAUEBENgEIAQkCgvWAQMEfwF+AXwjCiEGIwpBEGokCiAGIQUgBEIAUyEHAn8CQCACIAMgBEI/iKdBAWoQlQQEfyADKQMAIQkMAQUgAiwACEETRgRAIAUgAisDACIKOQMABSACIAUQxwEEQCAFKwMAIQoFIAAgAkHihAEQngILCwJAIAMgCkQAAAAAAAAAAGQEfiAHBH4MAgVC////////////AAsFIARCAFUNAUKAgICAgICAgIB/CyIJNwMADAILQQELDAELIAkgAVMgCSABVSAEQgBVG0EBcQshCCAGJAogCAs1ACAAQgBSBEADQCABQX9qIgEgAiAAp0EPcUGQJmotAAByOgAAIABCBIgiAEIAUg0ACwsgAQsuACAAQgBSBEADQCABQX9qIgEgAKdBB3FBMHI6AAAgAEIDiCIAQgBSDQALCyABC8sXAxR/A34BfCMKIRUjCkGwBGokCiAVQSBqIQcgFSINIREgDUGYBGoiCkEANgIAIA1BnARqIgxBDGohDyABvSIaQgBTBH8gAZoiAb0hGkGqhQEhEkEBBUGthQFBsIUBQauFASAEQQFxGyAEQYAQcRshEiAEQYEQcUEARwshEyAaQoCAgICAgID4/wCDQoCAgICAgID4/wBRBH9B0oUBQcWFASAFQSBxQQBHIgMbQb2FAUHBhQEgAxsgASABYhshBSAAQSAgAiATQQNqIgMgBEH//3txEFYgACASIBMQUiAAIAVBAxBSIABBICACIAMgBEGAwABzEFYgAwUCfyABIAoQkgNEAAAAAAAAAECiIgFEAAAAAAAAAABiIgYEQCAKIAooAgBBf2o2AgALIAVBIHIiDkHhAEYEQCASQQlqIBIgBUEgcSILGyEIQQwgA2siB0UgA0ELS3JFBEBEAAAAAAAAIEAhHQNAIB1EAAAAAAAAMECiIR0gB0F/aiIHDQALIAgsAABBLUYEfCAdIAGaIB2hoJoFIAEgHaAgHaELIQELIBNBAnIhCSAPQQAgCigCACIGayAGIAZBAEgbrCAPENcBIgdGBEAgDEELaiIHQTA6AAALIAdBf2ogBkEfdUECcUErajoAACAHQX5qIgcgBUEPajoAACADQQFIIQwgBEEIcUUhCiANIQUDQCAFIAsgAaoiBkGQJmotAAByOgAAIAEgBrehRAAAAAAAADBAoiEBIAVBAWoiBiARa0EBRgR/IAogDCABRAAAAAAAAAAAYXFxBH8gBgUgBkEuOgAAIAVBAmoLBSAGCyEFIAFEAAAAAAAAAABiDQALAn8gA0UgBUF+IBFraiADTnJFBEAgDyADQQJqaiAHayEMIAcMAQsgBSAPIBFrIAdraiEMIAcLIQMgAEEgIAIgCSAMaiIGIAQQViAAIAggCRBSIABBMCACIAYgBEGAgARzEFYgACANIAUgEWsiBRBSIABBMCAMIAUgDyADayIDamtBAEEAEFYgACAHIAMQUiAAQSAgAiAGIARBgMAAcxBWIAYMAQsgBgRAIAogCigCAEFkaiIINgIAIAFEAAAAAAAAsEGiIQEFIAooAgAhCAsgByAHQaACaiAIQQBIGyIMIQYDQCAGIAGrIgc2AgAgBkEEaiEGIAEgB7ihRAAAAABlzc1BoiIBRAAAAAAAAAAAYg0ACyAIQQBKBEAgDCEHA0AgCEEdIAhBHUgbIQsgBkF8aiIIIAdPBEAgC60hG0EAIQkDQCAJrSAIKAIArSAbhnwiHEKAlOvcA4AhGiAIIBwgGkKAlOvcA359PgIAIBqnIQkgCEF8aiIIIAdPDQALIAkEQCAHQXxqIgcgCTYCAAsLIAYgB0sEQAJAA38gBkF8aiIIKAIADQEgCCAHSwR/IAghBgwBBSAICwshBgsLIAogCigCACALayIINgIAIAhBAEoNAAsFIAwhBwtBBiADIANBAEgbIQsgCEEASARAIAtBGWpBCW1BAWohECAOQeYARiEUIAYhAwNAQQAgCGsiBkEJIAZBCUgbIQkgDCAHIANJBH9BASAJdEF/aiEWQYCU69wDIAl2IRdBACEIIAchBgNAIAYgCCAGKAIAIgggCXZqNgIAIBcgCCAWcWwhCCAGQQRqIgYgA0kNAAsgByAHQQRqIAcoAgAbIRkgCAR/IAMgCDYCACADQQRqBSADCyEGIBkFIAMhBiAHIAdBBGogBygCABsLIgMgFBsiByAQQQJ0aiAGIAYgB2tBAnUgEEobIQggCiAJIAooAgBqIgY2AgAgBkEASARAIAMhByAIIQMgBiEIDAELCwUgByEDIAYhCAsgDCEQIAMgCEkEQCAQIANrQQJ1QQlsIQcgAygCACIJQQpPBEBBCiEGA0AgB0EBaiEHIAkgBkEKbCIGTw0ACwsFQQAhBwsgC0EAIAcgDkHmAEYbayAOQecARiIWIAtBAEciF3FBH3RBH3VqIgYgCCAQa0ECdUEJbEF3akgEfyAGQYDIAGoiBkEJbSEOIAYgDkEJbGsiBkEISARAQQohCQNAIAZBAWohCiAJQQpsIQkgBkEHSARAIAohBgwBCwsFQQohCQsgDkECdCAMakGEYGoiBigCACIOIAluIRQgCCAGQQRqRiIYIA4gCSAUbGsiCkVxRQRARAEAAAAAAEBDRAAAAAAAAEBDIBRBAXEbIQFEAAAAAAAA4D9EAAAAAAAA8D9EAAAAAAAA+D8gGCAKIAlBAXYiFEZxGyAKIBRJGyEdIBMEQCAdmiAdIBIsAABBLUYiFBshHSABmiABIBQbIQELIAYgDiAKayIKNgIAIAEgHaAgAWIEQCAGIAkgCmoiBzYCACAHQf+T69wDSwRAA0AgBkEANgIAIAZBfGoiBiADSQRAIANBfGoiA0EANgIACyAGIAYoAgBBAWoiBzYCACAHQf+T69wDSw0ACwsgECADa0ECdUEJbCEHIAMoAgAiCkEKTwRAQQohCQNAIAdBAWohByAKIAlBCmwiCU8NAAsLCwsgByEJIAZBBGoiByAIIAggB0sbIQYgAwUgByEJIAghBiADCyEHIAYgB0sEfwJ/IAYhAwN/IANBfGoiBigCAARAIAMhBkEBDAILIAYgB0sEfyAGIQMMAQVBAAsLCwVBAAshDiAWBH8gF0EBc0EBcSALaiIDIAlKIAlBe0pxBH8gA0F/aiAJayEKIAVBf2oFIANBf2ohCiAFQX5qCyEFIARBCHEEfyAKBSAOBEAgBkF8aigCACILBEAgC0EKcARAQQAhAwVBACEDQQohCANAIANBAWohAyALIAhBCmwiCHBFDQALCwVBCSEDCwVBCSEDCyAGIBBrQQJ1QQlsQXdqIQggBUEgckHmAEYEfyAKIAggA2siA0EAIANBAEobIgMgCiADSBsFIAogCCAJaiADayIDQQAgA0EAShsiAyAKIANIGwsLBSALCyEDQQAgCWshCCAAQSAgAiAFQSByQeYARiILBH9BACEIIAlBACAJQQBKGwUgCCAJIAlBAEgbrCAPENcBIQggDyIKIAhrQQJIBEADQCAIQX9qIghBMDoAACAKIAhrQQJIDQALCyAIQX9qIAlBH3VBAnFBK2o6AAAgCEF+aiIIIAU6AAAgCiAIawsgAyATQQFqakEBIARBA3ZBAXEgA0EARyIKG2pqIgkgBBBWIAAgEiATEFIgAEEwIAIgCSAEQYCABHMQViALBEAgDUEJaiIIIQsgDUEIaiEPIAwgByAHIAxLGyIQIQcDQCAHKAIArSAIENcBIQUgByAQRgRAIAUgCEYEQCAPQTA6AAAgDyEFCwUgBSANSwRAIA1BMCAFIBFrEJ0BGgNAIAVBf2oiBSANSw0ACwsLIAAgBSALIAVrEFIgB0EEaiIFIAxNBEAgBSEHDAELCyAEQQhxRSAKQQFzcUUEQCAAQf2FAUEBEFILIABBMCAFIAZJIANBAEpxBH8DfyAFKAIArSAIENcBIgcgDUsEQCANQTAgByARaxCdARoDQCAHQX9qIgcgDUsNAAsLIAAgByADQQkgA0EJSBsQUiADQXdqIQcgBUEEaiIFIAZJIANBCUpxBH8gByEDDAEFIAcLCwUgAwtBCWpBCUEAEFYFIABBMCAHIAYgB0EEaiAOGyIQSSADQX9KcQR/IARBCHFFIRMgDUEJaiILIRJBACARayERIA1BCGohCiADIQUgByEGA38gCyAGKAIArSALENcBIgNGBEAgCkEwOgAAIAohAwsCQCAGIAdGBEAgA0EBaiEMIAAgA0EBEFIgEyAFQQFIcQRAIAwhAwwCCyAAQf2FAUEBEFIgDCEDBSADIA1NDQEgDUEwIAMgEWoQnQEaA0AgA0F/aiIDIA1LDQALCwsgACADIBIgA2siAyAFIAUgA0obEFIgBkEEaiIGIBBJIAUgA2siBUF/SnENACAFCwUgAwtBEmpBEkEAEFYgACAIIA8gCGsQUgsgAEEgIAIgCSAEQYDAAHMQViAJCwshACAVJAogAiAAIAAgAkgbC4EEAgN/BX4gAL0iBkI0iKdB/w9xIQIgAb0iB0I0iKdB/w9xIQQgBkKAgICAgICAgIB/gyEIAnwCQCAHQgGGIgVCAFENAAJ8IAJB/w9GIAG9Qv///////////wCDQoCAgICAgID4/wBWcg0BIAZCAYYiCSAFWARAIABEAAAAAAAAAACiIAAgBSAJURsPCyACBH4gBkL/////////B4NCgICAgICAgAiEBSAGQgyGIgVCf1UEQEEAIQIDQCACQX9qIQIgBUIBhiIFQn9VDQALBUEAIQILIAZBASACa62GCyIGIAQEfiAHQv////////8Hg0KAgICAgICACIQFIAdCDIYiBUJ/VQRAA0AgA0F/aiEDIAVCAYYiBUJ/VQ0ACwsgB0EBIAMiBGuthgsiB30iBUJ/VSEDIAIgBEoEQAJAA0ACQCADBEAgBUIAUQ0BBSAGIQULIAVCAYYiBiAHfSIFQn9VIQMgAkF/aiICIARKDQEMAgsLIABEAAAAAAAAAACiDAILCyADBEAgAEQAAAAAAAAAAKIgBUIAUQ0BGgUgBiEFCyAFQoCAgICAgIAIVARAA0AgAkF/aiECIAVCAYYiBUKAgICAgICACFQNAAsLIAVCgICAgICAgHh8IAKtQjSGhCAFQQEgAmutiCACQQBKGyAIhL8LDAELIAAgAaIiACAAowsLRwEBfyAAKAIAIgMoAgAoAgwsAAcEfyAAKAIYIgAgAUgEf0EABSACQQAgAGtBBHQgA2ogAUF/akEEdGo2AgBBiNEACwVBAAsLxgIBBn8gASAAKAI0IgcgAUECdGooAgBB/wBxQdAXaiwAAEEHdUEYdEEYdWoiBkEASgRAQX8hAEEAIQEDQCAEQQJ0IAdqKAIAIgVBB3YiCEH/AXEhAwJAAkACQAJAAkACQAJAIAVB/wBxQQZrDkUABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQDBAQEBAQEBAQEBAQCAgQEBAQEBAEECyADIAVBEHZB/wFxaiACSCADIAJKckUNBAwFCyADQQJqIAJMDQMMBAsgAyACTA0CDAMLIAggBEGCgIB4amoiAyABIAMgBkwgAyABSnEbIQEMAgsgAiADRiAFQf8AcUHQF2osAABBCHFBAEdxDQAMAQtBfyAEIAQgAUgbIQALIAYgBEEBaiIERw0ACwVBfyEACyAACzAAIAAoAhQiAARAAkADfyAALgEiQQhxDQEgACgCCCIADQBBAAshAAsFQQAhAAsgAAvQAQEFfyMKIQIjCkGgBGokCiACQZgEaiEDIAJBkARqIQQgAiEFIABB1/NCQcziABBIQQVHBEAgAEHW4gAgBBAuGgsgACAFEF1BASEGA0ACQCAAQQMgBq0QxgFFBEAgAEF+ECsgBRBbIABBf0EAEDshBCADIAE2AgAgAyAENgIEIABB+uIAIAMQLhoLIAAgARAwGiAAQQFBAkEAEGMgAEF+EC9BBkYNACAAQX4Q4wEEQCAAQX4QKyAFEHgFIABBfRArCyAGQQFqIQYMAQsLIAIkCgt5AQR/IwohBiMKQRBqJAogBiEHIAIsAAgiBEEPcQRAIARBI0YEfyACKQMAEI0FBUEACyIEQX9qIANJBEAgBCEFBSABIAIQjQMiAiwACEEgRgRAIABB6/kAIAcQSgUgA0EBaiACIAEoAhBrQRhtaiEFCwsLIAYkCiAFCz0BAn8DQCABQQJ0IABqKAIAIgNB/wBxQTZGBEAgAUGCgIB4aiADQQd2aiEBIAJBAWoiAkHkAEkNAQsLIAELTAEBfwJAAkAgACgCEEHbAGsiAgRAIAJByQFHDQEgABCUBEE9RgRAIAAgARDuAwUgACABELwECwwCCyAAIAEQ7gMMAQsgACABELwECwsaAQF/IAAQiQEhASAAQQEQMyAAIAFBAhDRBAtFAQN/IwohASMKQRBqJAogASECIAAQuQEiAygCBARAIAIgAygCADYCACAAQfTYACACEEQaBSAAQebYABAwGgsgASQKQQELPgICfwF+IAAQiQEhASAAQQJBAEGgERCaAiECIABBA0KABBA9IQMgACABIAJBAnRB9DpqKAIAEOkFRUEAEG4LfAIEfwF+IAAQiQEhASAAQQJB8tcAQbAREJoCIQMgAEEDQgAQPSIFpyECIAKsIAVSBEAgAEEDQfbXABAxGgsgASgCTBogASACIANBAnRBgDtqKAIAEOsIBH8gAEEAQQAQbgUCfyAAIQQgASgCTBogBAsgARDqCKwQNEEBCwsOACAAIAAQiQFBAhCQAwuPAQECfyABKAIAIgIoAgAhAyACIANBf2o2AgAgAwR/IAIgAigCBCICQQFqNgIEIAItAAAFIAIQNQshAiABKAI0IQMgACACQRtGBH8gACADQfzUABD/BCAAIAEoAgAgASgCOBDoBgUgACADQYPVABD/BCAAIAEoAgAgAUEEaiABQRBqIAEoAjggAhDiBgsQiQcLNwAgACgCECEBIAAgABDXAyAAIAEQ2AcgABDyBiAAEOwGIAAQ5AYgAUEBOgBRIAFBQGtBADoAAAsRACAAEIkBGiAAQQAQsANBAQshAQF/IAAQuQEiASgCBARAIAEoAgAEQCAAELEDGgsLQQALEAAgACAAEIkBEHBFQQAQbgsRACAAIAEoAgAgASgCBBC+AQuRAQEFfyMKIQIjCkEgaiQKIAAoAjAhAyAAIAIiAUEIaiIEEMACAkACQCAAKAIQQSxrIgUEQCAFQRFHDQELIAFBADYCACAAIAFBARDrAwwBCyADKAIAKAI0IAEoAhBBAnRqIQEgBCgCAEESRgRAIAEgASgCAEH///8HcUGAgIAIcjYCAAUgAEHW6wAQagsLIAIkCguXAwMCfwF+AnwgAL0iA0I/iKchAQJ8IAACfwJAIANCIIinQf////8HcSICQarGmIQESwR8IANC////////////AINCgICAgICAgPj/AFYEQCAADwsgAETvOfr+Qi6GQGQEQCAARAAAAAAAAOB/og8FIABE0rx63SsjhsBjIABEUTAt1RBJh8BjcUUNAkQAAAAAAAAAAA8LAAUgAkHC3Nj+A0sEQCACQbHFwv8DSw0CIAFBAXMgAWsMAwsgAkGAgMDxA0sEfEEAIQEgAAUgAEQAAAAAAADwP6APCwsMAgsgAET+gitlRxX3P6IgAUEDdEHwOWorAwCgqgsiAbciBEQAAOD+Qi7mP6KhIgAgBER2PHk17znqPaIiBaELIQQgACAEIAQgBCAEoiIAIAAgACAAIABE0KS+cmk3Zj6iRPFr0sVBvbu+oKJELN4lr2pWET+gokSTvb4WbMFmv6CiRD5VVVVVVcU/oKKhIgCiRAAAAAAAAABAIAChoyAFoaBEAAAAAAAA8D+gIQAgAUUEQCAADwsgACABEHsLcQEEfyMKIQMjCkEgaiQKIAMhBCAAKAIIKAI0IQUgACgCACgCKCIGBH8gBCAGNgIAIAVBvOwAIAQQTwVB0OwACyEEIANBCGoiAyACNgIAIAMgATYCBCADIAQ2AgggBUHe7AAgAxBPIQEgACgCCCABEGoLPwECfyAAIAAQxAgiA0EDdGoiBCABIABBGGogA0EDdGooAgBrNgIcIAAgASACEIoBIgBFBEAgBEF/NgIcCyAACxEAIAAgACgCDEFgakEAEL4BC/oTAw1/A34HfCMKIQ8jCkGABGokCiAPIQgCQAJAA0ACQAJAAkAgAUEuaw4DBAABAAsgASEFIAMhAQwBCyAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABBQCyEBQQEhAwwBCwsMAQsgACgCBCIBIAAoAmRJBH8gACABQQFqNgIEIAEtAAAFIAAQUAsiBUEwRgR/A38gACgCBCIBIAAoAmRJBH8gACABQQFqNgIEIAEtAAAFIAAQUAshBSARQn98IREgBUEwRg0AQQEhBEEBCwVBASEEIAMLIQELIAhBADYCAAJ8AkACQAJAAkAgBUEuRiIKIAVBUGoiDEEKSXIEQAJAQQAhAyAFIQsgDCEFA0ACQCAKBH4gBA0BQQEhBCAQIREgEAUCfiAQQgF8IRAgC0EwRyEKIAZB/QBOBEAgECAKRQ0BGiAIIAgoAvADQQFyNgLwAyAQDAELIAZBAnQgCGoiASAHBH8gC0FQaiABKAIAQQpsagUgBQs2AgAgB0EBaiIBQQlGIQVBACABIAUbIQcgBSAGaiEGIBCnIAMgChshA0EBIQEgEAsLIRIgACgCBCIFIAAoAmRJBH8gACAFQQFqNgIEIAUtAAAFIAAQUAsiC0FQaiIFQQpJIAtBLkYiCnIEQCASIRAMAgUgCyEFDAMLAAsLIAFBAEchAQwCCwVBACEDCyARIBIgBBshESABQQBHIgEgBUEgckHlAEZxRQRAIAVBf0oEQCASIRAMAgUMAwsACyAAEOUDIhBCgICAgICAgICAf1EEfiAAKAJkBEAgACAAKAIEQX9qNgIEC0IABSAQCyARfCERDAMLIAAoAmQEfiAAIAAoAgRBf2o2AgQgAUUNAiAQIRIMAwUgEAshEgsgAUUNAAwBC0HkmwFBFjYCACAAELYDRAAAAAAAAAAADAELIAK3RAAAAAAAAAAAoiAIKAIAIgBFDQAaIBEgElEgEkIKU3EEQCACtyAAuKIgAEE1dkVBAXINARoLIBFCmQRVBEBB5JsBQSI2AgAgArdE////////73+iRP///////+9/ogwBCyARQuR2UwRAQeSbAUEiNgIAIAK3RAAAAAAAABAAokQAAAAAAAAQAKIMAQsgBwRAIAdBCUgEQCAGQQJ0IAhqIgkoAgAhAQNAIAFBCmwhASAHQQFqIQAgB0EISARAIAAhBwwBCwsgCSABNgIACyAGQQFqIQYLIBGnIQEgA0EJSARAIAFBEkggAyABTHEEQCABQQlGBEAgArcgCCgCALiiDAMLIAFBCUgEQCACtyAIKAIAuKJBACABa0ECdEGwNWooAgC3owwDCyABQX1sQdAAaiIJQR5KIAgoAgAiACAJdkVyBEAgArcgALiiIAFBAnRB6DRqKAIAt6IMAwsLCyABQQlvIgAEf0EAIAAgAEEJaiABQX9KGyIKa0ECdEGwNWooAgAhDCAGBH9BgJTr3AMgDG0hBUEAIQNBACEAQQAhCQNAIAMgCUECdCAIaiIHKAIAIgQgDG4iA2ohCyAHIAs2AgAgBSAEIAMgDGxrbCEDIAFBd2ogASALRSAAIAlGcSIEGyEBIABBAWpB/wBxIAAgBBshACAJQQFqIgkgBkcNAAsgAwR/IAZBAnQgCGogAzYCACAAIQkgBkEBagUgACEJIAYLBUEAIQlBAAshACABQQkgCmtqIQEgCQUgBiEAQQALIQNBACEJA0ACQCABQRJIIQwgAUESRiELIANBAnQgCGohCgNAIAxFBEAgC0UNAiAKKAIAQd/gpQRPBEBBEiEBDAMLC0EAIQYgAEH/AGohBANAIAatIARB/wBxIg1BAnQgCGoiBygCAK1CHYZ8IhKnIQQgEkKAlOvcA1YEQCASQoCU69wDgCIRpyEGIBIgEUKAlOvcA359pyEEBUEAIQYLIAcgBDYCACAAIAAgDSAEGyADIA1GIgUgDSAAQf8AakH/AHFHchshByANQX9qIQQgBUUEQCAHIQAMAQsLIAlBY2ohCSAGRQ0ACyAHQf8AakH/AHEhBCAHQf4AakH/AHFBAnQgCGohBSADQf8AakH/AHEiAyAHRgRAIAUgBEECdCAIaigCACAFKAIAcjYCACAEIQALIANBAnQgCGogBjYCACABQQlqIQEMAQsLA0ACQCAAQQFqQf8AcSEFIABB/wBqQf8AcUECdCAIaiENIAEhBANAAkAgBEESRiEHQQlBASAEQRtKGyEOIAMhAQNAQQAhCgJAAkADQAJAIAAgASAKakH/AHEiA0YNAiADQQJ0IAhqKAIAIgYgCkECdEGswQBqKAIAIgNJDQIgBiADSw0AIApBAWpBAk8NAkEBIQoMAQsLDAELIAcNBAsgCSAOaiEJIAAgAUYEQCAAIQEMAQsLQQEgDnRBf2ohC0GAlOvcAyAOdiEKQQAhByABIQMgASEGA0AgByAGQQJ0IAhqIgcoAgAiASAOdmohDCAHIAw2AgAgCiABIAtxbCEHIARBd2ogBCAMRSADIAZGcSIEGyEBIANBAWpB/wBxIAMgBBshAyAGQQFqQf8AcSIGIABHBEAgASEEDAELCyAHBEAgAyAFRw0BIA0gDSgCAEEBcjYCAAsgASEEDAELCyAAQQJ0IAhqIAc2AgAgBSEADAELC0EAIQMDQCAAQQFqQf8AcSEEIAAgASADakH/AHEiBkYEQCAEQX9qQQJ0IAhqQQA2AgAgBCEACyATRAAAAABlzc1BoiAGQQJ0IAhqKAIAuKAhEyADQQFqIgNBAkcNAAsgEyACtyIVoiEWIAlBNWoiAkHOd2siA0E1SCEHAnwgA0EAIANBAEobQTUgBxsiBEE1SAR8RAAAAAAAAPA/QekAIARrEHsgFhDwBCEUIBZEAAAAAAAA8D9BNSAEaxB7ENkEIRMgFCEXIBQgFiAToaAFRAAAAAAAAAAAIRMgFgshGCABQQJqQf8AcSIFIABHBEACQCAFQQJ0IAhqKAIAIgVBgMq17gFJBHwgBUUEQCAAIAFBA2pB/wBxRg0CCyAVRAAAAAAAANA/oiAToAUgBUGAyrXuAUcEQCAVRAAAAAAAAOg/oiAToCETDAILIBVEAAAAAAAA4D+iIBOgIBVEAAAAAAAA6D+iIBOgIAAgAUEDakH/AHFGGwshEwtBNSAEa0EBSgR8IBNEAAAAAAAA8D8Q2QREAAAAAAAAAABhBHwgE0QAAAAAAADwP6AFIBMLBSATCyETCyAYCyAToCAXoSEUIAJB/////wdxQfsHSgR8AnwgCSAUmUQAAAAAAABAQ2ZFIgBBAXNqIQkgFCAURAAAAAAAAOA/oiAAGyEUIAlBMmpB/QdMBEAgFCAHIAAgAyAER3JxIBNEAAAAAAAAAABicUUNARoLQeSbAUEiNgIAIBQLBSAUCyAJEOYDCyEZIA8kCiAZC08BAn8gAEEBQQIQpgMhASAAQQNBBBCmAyECIABBARCRBARAIABBAUH2zgAQMRoLIABBAxCRBARAIABBA0H2zgAQMRoLIAAgASACENEGQQALNgECfyAAIABBAUECEKYDENIGIQEgACgCDCICIAE2AgAgAkECOgAIIAAgACgCDEEQajYCDEEBC2YBBX8jCiEBIwpBEGokCiAAIAEQ1AEhAgJAAkAgACABKAIAIgRBAWoiA0EAEDsiBQ0AIAAgAxAvQQFIDQAgACADEDMMAQsgACACIAUgACAEQQJqIAAgAkatED2nEPYGCyABJApBAQs0AQF/IABBA0IBED2nIQEgAEEBQQcQYSAAQQIQUyAAQQIQKyAAIAEQ1QZFBEAgABA6C0EBCw8AIABBAxBTIABBABCFBQsxAAJAAkAgAEECEC8OBgEAAAAAAQALIABBAkGlzgAQtwELIABBAhArIABBARC0AUEBC6cBAgd/AX4jCiEDIwpB8ABqJAogAyEEIAAgA0HsAGoiARDUASECIAAgASgCACIBQQFqIgUQOKchBiAAIAFBAmoQOCEIIAIgBiADEIABBH8gCKchBSAAIAFBA2oiARBTIAAgARArIAAgAkEBEP8BIAAgAkEBEHUgAiAEIAUQ1AYiBEUEQCACQX4QKwsgACAEEDAaQQEFIAAgBUGyzgAQMQshByADJAogBwvOAQEHfyMKIQQjCkEQaiQKIAAgBBDUASECIAAgBCgCACIBQQFqIgUQL0EBSAR/IAAgBRArQQAhAUEABQJ/IAAgAUECakEAEDIhByAAIAVBBhBhIAcLIAAgAUEDakIAED2nIgEQwwYhA0ECCyEGIABBxc4AEOsBRQRAIABBzs4AEDAaIABBfkG7/QAQNyAAQX8QMyAAQX4QtAELIAAgAkEBEP8BIAIQjgIaIAIgAEEBEHUgACAFEDMgAEF9EI8EIAIgBiADIAEQ1gYgBCQKQQALJQEBfyAAIABBARA4pxDXBiIBBEAgACABrBA0BSAAQQAQRwtBAQs6AQF+IABBAkIBED0hASAAQQEQL0EHRgR/IAAgAacQ3QZBf0YEf0EBBSAAQQEQR0ECCwUgABA6QQELCwkAIABBARCFBQsMACAAQdjzQhAzQQELGQAgAEEBEFMgAEEBEOQBRQRAIAAQOgtBAQu6AQEGfyMKIQQjCkHwAGokCiAAIAQiAkHsAGoiARDUASEDIAAgASgCACIBQQJqEDinIQUgACABQQFqIgEQL0EGRgR/IAAgARAzIAAgAEEAIAUQkwQQMBpBAQUCfyADIAAgARA4pyACEIABRQRAIAAgAUGyzgAQMQwBCyAAIANBARD/ASADIAIgBRCTBCICBH8gAyAAQQEQdSAAIAIQMBogAEF+QQEQQkECBSAAEDpBAQsLCyEGIAQkCiAGC4EEAQh/IwohBCMKQYABaiQKIAQhBiAEQQhqIQEgACAEQQRqIgIQ1AEhAyAAIAIoAgAiBUECaiIHQYzPAEEAEFwhAiAAIANBAxD/AQJ/AkAgACAFQQFqIgUQL0EGRgR/IAYgAjYCACAAQZTPACAGEEQhAiAAIAUQMyAAIANBARB1DAEFIAMgACAFEDinIAEQgAEEfwwCBSAAEDpBAQsLDAELIAMgAiABEOUBRQRAIAAgB0GYzwAQMQwBCyAAQQBBABBXIAJB0wAQOQRAIAAgASgCECABKAIUEH0aIABBfkGnzwAQNyAAQa7PACABQSxqEIgCIABBuM8AIAEoAhwQsAEgAEHEzwAgASgCIBCwASAAQdTPACABKAIMEIgCCyACQewAEDkEQCAAQdnPACABKAIYELABCyACQfUAEDkEQCAAQeXPACABLQAkELABIABB6s8AIAEtACUQsAEgAEHyzwAgASwAJhDcAwsgAkHuABA5BEAgAEH7zwAgASgCBBCIAiAAQYDQACABKAIIEIgCCyACQfIAEDkEQCAAQYnQACABLwEoELABIABBk9AAIAEvASoQsAELIAJB9AAQOQRAIABBndAAIAEsACcQ3AMLIAJBzAAQOQRAIAAgA0Go0AAQxQMLIAJB5gAQOQRAIAAgA0G00AAQxQMLQQELIQggBCQKIAgLoQEBBn8jCiECIwpBEGokCiACQQRqIQMgACACENQBIgEoAnAhBCABKAJYIgUEfyAFQQJGBEAgAEHY80JBxc4AEEgaIAAgAUEBEP8BIAEQjgIaIAEgAEEBEHUgAEF+EOEBGiAAQX5BfxBCIABBfhArBSAAQbnQABAwGgsgACAEIAMQsgUQMBogACABKAJorBA0QQMFIAAQOkEBCyEGIAIkCiAGC7sBAQV/IwohAyMKQZACaiQKIANBgAJqIQQgAyEBQcfQAEG4OygCACICEPkBIAIQcBogAUG4PCgCACIFEOEEBEADQCABQdPQABBZBEACQAJAIAAgASABEE5B2dAAQQAQnwQNACAAQQBBAEEAQQBBABDgAg0ADAELIAQgAEF/QQAQOzYCACACQerQACAEEK0CGiACEHAaCyAAQQAQK0HH0AAgAhD5ASACEHAaIAEgBRDhBA0BCwsLIAMkCkEAC0sBAn8gAEEEQQAQVwNAIAFBAnRBsBVqIQIgAEF+EDMgACACKAIAQQEQfiAAQX4gAUEBaiIBrRDdAiABQQRHDQALIABBfkHM4gAQNwtFACAAQQBBCRBXIABBkBtBABBgIABBpJwBEDAaIABBfhAzIABBfhC0ASAAQX4QKyAAQX4QMyAAQX5Bo/0AEDcgAEF+ECsLNgAgAEGD1wAQngQaIABBsBBBABBgIABBAEEHEFcgAEHgEEEAEGAgAEF+QaP9ABA3IABBfhArCy4AIABBvuQAEOsBGiAAQQBBARBXIABBpgFBABB+IABBfkG2/QAQNyAAQX4QtAELzAECA38BfCMKIQIjCkEQaiQKIAIhASAAvUIgiKdB/////wdxIgNB/MOk/wNJBHwgA0GewZryA0kEfEQAAAAAAADwPwUgAEQAAAAAAAAAABCDAgsFAnwgACAAoSADQf//v/8HSw0AGgJAAkACQAJAIAAgARC3A0EDcQ4DAAECAwsgASsDACABKwMIEIMCDAMLIAErAwAgASsDCEEBEIICmgwCCyABKwMAIAErAwgQgwKaDAELIAErAwAgASsDCEEBEIICCwshBCACJAogBAulAQEBfyABIAJHBEAgACAAKAIMIAEiA2tBBHVBBHQgAmo2AgwgACgCJCIBBEADQCABIAEoAgggA2tBBHVBBHQgAmo2AgggASgCECIBDQALCyAAKAIUIgAEQANAIAAgACgCBCADa0EEdUEEdCACajYCBCAAIAAoAgAgA2tBBHVBBHQgAmo2AgAgAC4BIkECcUUEQCAAQQE2AhQLIAAoAggiAA0ACwsLC1ABAX8gAEHoAGoQsQIiASAAKAJsNgIAIABBADYCbCABELECIgEgACgCdDYCACAAQQA2AnQgARCxAiIBIAAoAnA2AgAgAEEANgJwIAEQsQIaCz4BAn9BsJcBKAIAQY6FARDjAkGwlwEoAgBBAEEBQQAQY0GwlwEoAgBBf0EAEGKnIQFBsJcBKAIAQX4QKyABC5UBAAJAAkACQAJAAkACQCAALAAIQT9xDiUDAgUFBQUFBQUFBQUFBQUFBQUFAQQFBQUFBQUFBQUFBQUFBQAEBQsgAUEGNgIAIAEgACkDADcDCAwECyABQQU2AgAgASAAKwMAOQMIDAMLIAFBAkEDIAAoAgAbNgIADAILIAFBATYCAAwBCyABQQc2AgAgASAAKAIANgIICwtfAQd/IAEoAgAhCEEBIQIDQCAIIAJBAXYiA0sEQCAFIAZBAnQgAGooAgBqIgUgA0shAyAFIAQgAxshBCACIAcgAxshByAGQQFqIQYgAkEBdCICDQELCyABIAQ2AgAgBwuwAQECf0GwlwEoAgAiAUUEQEGwlwEQ+gYiATYCACABEPkGQbCXASgCAEH7hAEQ4wJBsJcBKAIAQfAgEDAaQbCXASgCAEEBQQFBABBjQbCXASgCAEEAQQBBABBjQbCXASgCAEEAECtBsJcBKAIAIQELIAFBgIUBEOMCQbCXASgCACAAEDAaQbCXASgCAEEBQQFBABBjQbCXASgCAEF/QQAQYqchAkGwlwEoAgBBfhArIAILvQEBBX8jCiEFIwpBEGokCiAFIQMCQAJAIAFFDQAgASwABEE2Rg0AIAEoAgwiBCgCKCEBIAAQ0AEhBiAAKAIMIgIgBjYCACACQcUAOgAIIAAgACgCDEEQajYCDCADQQE2AgAgA0EBOgAIIAQoAhhBAEoEQEEAIQIDQCAAIAYgBCABIAIQogYiAawgAxDvASACQQFqIgIgBCgCGEgNAAsLDAELIAAoAgxBADoACCAAIAAoAgxBEGo2AgwLIAUkCgs0AQF/IAAgAhBUIQQgACACEIYBIAIgACABQQAgBEEAQQAQPDYCCCACQRE2AgAgACADEKYBC6wCAgh/A34jCiEDIwpBIGokCiADQQhqIQcgAyEBIANBDGohBSAAQQEgA0EQaiICEDIhBiAAQQMgAEECQgEQPSACKAIAENwBIgkQPSACKAIAENwBIQogAEEEEFohBCAJQgBXBEAgAEECQbyCARAxGgsgCiACKAIArVUEQCAAQQNBvIIBEDEaCyAKIAlTBEBBACEBBQJAIAogCX0iC0L+////B1UEQCAAQcmCASABEC4hAQwBCyAAIAunQQFqQcmCARCkASAKpyIBIAZqIQggCadBf2oiAiABSAR/IARFIQRBACEBIAIgBmohAgNAIAIgBSAEELwCIgIEQCAAIAUoAgCtEDQgAUEBaiEBIAIgCEkNAQwDCwsgAEHXgQEgBxAuBUEACyEBCwsgAyQKIAELoAEBAn8CQAJAAkACQAJAIAEoAgBBAWsOEQABAAEBAQEDBAQEBAQEBAIDBAsgAUECNgIADAMLIAFBAzYCAAwCCyAAIAEQgwQMAQsgACABEOoEIAAgARCGASABIABBMUEAIAEoAghBAEEAEDw2AgggAUERNgIACyABKAIUIQIgASABKAIQIgM2AhQgASACNgIQIAAgAxDsAyAAIAEoAhAQ7AMLnQEBBX8jCiEFIwpBEGokCiAFIgZBADYCACACKAIAQQhHBEAgAiADEMQBCyAFQQRqIQQgACACEFQhByADIAQgBhCmAgR/IAQoAgAhBEE7BSAAIAMQ7QEEfyADKAIIIQRBOgUgACADEFQhBEE3CwshCCAAIAIgAxCUAyACIAAgCCAHIAQgBigCACABQQ1GELICNgIIIAJBEDYCACAFJAoLdAECfyAAEPkDIgQoAgAiBUH/AHFBM0YEQCAAIAIQhgEgBCABKAIIQQd0QYD/AXEgBUGAgPwHcUGAgARqQYCA/AdxIAQoAgBB/4CCeHFycjYCAAUgAEEzIAEoAghBAkEAQQAQPBogACACEIYBIAAgAxCmAQsLUAEBfyACQQAQrAEEfyACIAMQxAFBAQVBAAshBQJAAkAgAQ0AIAMQhQNFDQAgAEETIAIgAyAFIARBBhCkAwwBCyAAIAEgAiADIAUgBBD5BAsLKAAgAUERIAAoAjAoAgQiAEHNAEEAIAAoAiBBf2oQ7gEQayAAIAEQcgtwAQF/AkACQCACKAIAQQZGBEAgACACEO0BBEAgAiADEMQBQQEhBQwCCwsgAygCAEEGRgRAIAAgAxDtAQ0BCyAAIAFBIGogAiADIAQQtAIMAQsgACACIAMgAUEUaiADKAIIIAUgBEEuIAFBBmoQ+wELC00AIAEoAgAEQCAAIAEQciABQQA2AgAgASgCJEEyRgRAIAAgASgCGCgCCCABKAIgQTIQ8QIgASABKAIkIAEoAiBqNgIgIAFBADYCJAsLCzIAIAFBf0cEQCAAKAIwIgAgAUEBahDaAiAAKAIMQQE6AA8gAEE1IAFBAEEAQQAQPBoLC1IBBH8jCiECIwpBEGokCiACIQMgACABEJcDIgQEQCAAKAI0IQUgBCgCCCECIAMgAUEQajYCACADIAI2AgQgACAFQfbtACADEE8QzAEFIAIkCgsLqAEBBX8jCiEGIwpBEGokCiAGIQcCQAJAIAJBAUgNAEHD6QAhBUEBIQRB4QAhCANAAkAgCEH/AXFB/ABGBEAgBEEBaiEEBSABIAUgBBCyAUUNAQsgBCAFaiIFLAAAIghFIAQgAkpyRQ0BDAILCyADIAEgBBBAGiADIARqQQA6AAAgASAEaiEBDAELIAcgATYCACAAQQEgAEGR6gAgBxBEEDEaCyAGJAogAQsrAQF/IABB2PNCQb7kABBIGiAAQX8gARBIGiAAQX8QnwEhAiAAQX0QKyACC8MBAQN/IwohAyMKQRBqJAogAyEEIAAoAjAhAgJAAkACQAJAAkAgASgCAEEJaw4DAQIABAsgACgCRCgCACABKAIIQRhsakEQaiEBDAILIAIgAS8BChCFASIBLAAJBEAgAUEQaiEBDAILDAILIAIoAgAoAjwiAiABKAIIIgFBA3RqLAAGBEAgAUEDdCACaiEBDAELDAELIAEoAgAiAQRAIAAoAjQhAiAEIAFBEGo2AgAgACACQZ/tACAEEE8QzAELCyADJAoLiwIBB38gACgCMCIFLAA0IgZB/wFxIQcgAQRAIAZB/wFxIQlBACEAA0AgASIDKAIIIgRBfHFBDEYEQAJAIAIoAgAhCCAEQQ1GBEAgCEEKRw0BIAEiBC0AEiACKAIIRw0BIANBDzYCCCAEIAY6ABJBASEADAELIAhBCUYEQCABLAASIAIsAAhGBEAgAyAGOgASQQEhAAsLIARBDEYEQCACKAIAQQlGBEAgASIDLgEQIAItAAhGBEAgAyAJOwEQQQEhAAsLCwsLIAEoAgAiAQ0ACyAABEAgAigCAEEJRgR/IAVBACAHIAItAAhBAEEAEDwFIAVBByAHIAIoAghBAEEAEDwLGiAFQQEQgQELCwtpAQR/IwohAyMKQRBqJAogAyEEIAFBT2ohAgJAAkAgAUExSA0AIAIgAC0AFE4NACAAIAJBA3RqKAIcQX9GDQAMAQsCfyAAKAIMIQUgBCABQVBqNgIAIAULQYf1ACAEEC4hAgsgAyQKIAILlgEAIABB6/8AQe//ABCABSAAEGdB+ANHBEAgAEGCgAEQhwELIAAQdEH/AXEEQCAAQZOAARCHAQsgAEGjgAFBqoABEIAFIABBBEG6gAEQmgMgAEEIQcaAARCaAyAAQQhB0oABEJoDIAAQmgVC+KwBUgRAIABB3YABEIcBCyAAEJkFRAAAAAAAKHdAYgRAIABB9YABEIcBCwtTAQJ/IAEgAkgEfwJ/IABBQGsoAgAhBANAIAQgAUEBaiIDaiwAAEUEQCADIAJIBEAgAyEBDAIFQQAMAwsACwsgACABEPIBIAAgAhDyAUcLBUEACwtpAQR/IwohAyMKQRBqJAogAyEEAkACQCAALAAUIgFFDQAgAUH/AXEhAgNAIAAgAkF/aiIBQQN0aigCHEF/RwRAASACQQFMDQIgASECDAELCwwBCyAAKAIMQd72ACAEEC4hAQsgAyQKIAELuwEBAn8gAgRAIAFBIGogACgCIGshBCAAIAIgAUEQaiIDELwBIAAgASADENECBEAgAEEHQQAgBEEAEKMCIgNBAEciASACQX5GcUUEQCABBEAgAEGF1gAQsQQLIAAgBCAAKAIgajYCDCACIQMLBSACIQMLBQJAIAAgASAAKAIQQThqENECBEAgAEEAEKwDDAELIAEsAAgiAkEPcQRAIAJBAUYEQCABKAIARQ0CCyAAIAFB2dUAEMADCwsLIAML1QMCBn8EfiMKIQIjCkEQaiQKIAIhAyAAQQEgAkEEaiIEEDIhASAAQQIQOCEJAkACQCAAQQNCASAEKAIAQQFqrSAJQn9VGxA9IAQoAgAiBRDcASIHQgBXDQAgB0J/fCIHIAWtVQ0ADAELIABBA0HfggEQMRoLAn8CQCAJQgBRBH8gB0IAVQRAA0AgB6cgAWosAABBwAFxQYABRw0DIAdCf3whCCAHQgFVBEAgCCEHDAEFIAghBwwECwAACwAFDAILAAUCfyABIAenaiwAAEHAAXFBgAFGBEAgAEH1ggEgAxAuDAELAkACQCAJQgBTBEAgB0IAVQRAA0ACQCAHIQgDQCAIQn98IQcgCEIBVSIDRQ0BIAEgB6dqLAAAQcABcUGAAUYEQCAHIQgMAQsLIAlCAXwhCCADIAlCf1NxRQ0EIAghCQwBCwsgCUIBfCEIDAILBSAJQn98IQggCUIBVw0BIAQoAgCtIQoDQCAHIApZDQIDQCABIAdCAXwiB6dqLAAAQcABcUGAAUYNAAsgCEJ/fCEJIAhCAVUEQCAJIQgMAQUgCSEIDAMLAAALAAsMAQsgCEIAUQ0DCyAAEDpBAQsLDAELIAAgB0IBfBA0QQELIQYgAiQKIAYLKwEBfyAAKAIEIQEgABA/IAAgACgCNEG16gBBBRBfIAEgACgCMBCCARDXAgsOACAAQQFBABDKAhpBAAvbAQIDfwJ+An8CQAJAAkAgAEGMyQAQhwIgAGoiAywAAEEraw4DAQIAAgsgA0EBaiEDQQEMAgsgA0EBaiEDQQAMAQtBAAshBCADLAAAIgBB/wFxEKUCBEACQCABrCEHA0AgAEH/AXEiBUFQakEKSQR/IABBGHRBGHVBUGoFIAUQyANBSWoLIgCsIAYgB358IQYgA0EBaiEDIAAgAU4EQEEAIQAMAgsgAywAACIAQf8BcRClAg0ACyADQYzJABCHAiADaiEAIAJCACAGfSAGIAQbNwMACwVBACEACyAAC4QDAQV/IAEsAAAiBQRAIARFIQYgA0UhCSACQQRqIQcgASEIQQEhAQNAAkACQAJAAkACQAJAAkACQCAFQRh0QRh1QcwAaw4qBwYGBgYGBgAGBgYGBgYGBgYGBgYGBgYGBgYHBgYGBgYBBgQGBgYFBgMCBgsgAiADEPEHDAYLIAIgBgR/QX8FIAQuASJBAnEEf0F/BSAEEOsECws2AhgMBQsgCQRAIAJBADoAJAUgAiADLAAGOgAkIAMsAARBNkcEQCACIAMoAgwsAAc6ACYgAiADKAIMLAAGOgAlDAYLCyACQQE6ACYgAkEAOgAlDAQLIAIgBgR/QQAFIAQuASJBEHELOgAnDAMLIAIgACAEIAcQ5QciBTYCCCAFRQRAIAJBpJwBNgIIIAdBADYCAAsMAgsgBkUEQCAELgEiQYABcQRAIAIgBC4BHDsBKCACIAQuAR47ASoMAwsLIAJBADsBKiACQQA7ASgMAQtBACEBCyAIQQFqIggsAAAiBQ0ACwVBASEBCyABC6MEAgZ/An4CQCABvSIIQv///////////wCDQoCAgICAgID4/wBYBEAgAL0iCUL///////////8Ag0KAgICAgICA+P8AWARAIAinIgMgCEIgiKciBkGAgMCAfGpyRQRAIAAQjAUPCyAJQj+IpyIFIAhCPoinQQJxIgdyIQIgCUIgiKdB/////wdxIgQgCadyRQRAAkACQAJAAkAgAkEDcQ4EAgIAAQMLRBgtRFT7IQlADwtEGC1EVPshCcAPCyAADwsLIAMgBkH/////B3EiA3JFDQIgA0GAgMD/B0cEQCAEQYCAwP8HRiADQYCAgCBqIARJcg0DIAdBAEcgBEGAgIAgaiADSXEEfEQAAAAAAAAAAAUgACABo5kQjAULIQACQAJAAkACQCACQQNxDgMCAAEDCyAAmg8LRBgtRFT7IQlAIABEB1wUMyamobygoQ8LIAAPCyAARAdcFDMmpqG8oEQYLURU+yEJwKAPCyACQf8BcSECIARBgIDA/wdGBEACQAJAAkACQAJAIAJBA3EOBAMAAQIEC0QYLURU+yHpvw8LRNIhM3982QJADwtE0iEzf3zZAsAPC0QYLURU+yHpPw8LBQJAAkACQAJAAkAgAkEDcQ4EAwABAgQLRAAAAAAAAACADwtEGC1EVPshCUAPC0QYLURU+yEJwA8LRAAAAAAAAAAADwsLCwsgACABoA8LRBgtRFT7Ifm/RBgtRFT7Ifk/IAUbC+QEAwF/AX4CfCAAvSICQiCIp0H/////B3EiAUH//7//A0sEQCACpyABQYCAwIB8anIEQEQAAAAAAAAAACAAIAChow8FIABEGC1EVPsh+T+iRAAAAAAAAHA4oA8LAAsgAUGAgID/A0kEQCABQYCAQGpBgICA8gNJBEAgAA8LIAAgAKIiAyADIAMgAyADIANECff9DeE9Aj+iRIiyAXXg70k/oKJEO49otSiCpL+gokRVRIgOVcHJP6CiRH1v6wMS1tS/oKJEVVVVVVVVxT+goiADIAMgAyADRIKSLrHFuLM/okRZAY0bbAbmv6CiRMiKWZzlKgBAoKJESy2KHCc6A8CgokQAAAAAAADwP6CjIACiIACgDwtEAAAAAAAA8D8gAJmhRAAAAAAAAOA/oiIAnyEDIAAgACAAIAAgACAARAn3/Q3hPQI/okSIsgF14O9JP6CiRDuPaLUogqS/oKJEVUSIDlXByT+gokR9b+sDEtbUv6CiRFVVVVVVVcU/oKIgACAAIAAgAESCki6xxbizP6JEWQGNG2wG5r+gokTIilmc5SoAQKCiREstihwnOgPAoKJEAAAAAAAA8D+goyEEIAFBsua8/wNLBHxEGC1EVPsh+T8gAyADIASioEQAAAAAAAAAQKJEB1wUMyamkbygoSIAmiAAIAJCAFMbBUQYLURU+yHpPyADRAAAAAAAAABAoiAEokQHXBQzJqaRPCAAIAO9QoCAgIBwg78iACAAoqEgAyAAoKNEAAAAAAAAAECioaFEGC1EVPsh6T8gAEQAAAAAAAAAQKKhoaEiAJogACACQgBTGwsLDwAgAEEMQZj+ABCpAUEBCw8AIABBAUHT/QAQqQFBAQsPACAAQQRB5f0AEKkBQQELDwAgAEECQdn9ABCpAUEBCw8AIABBA0Hf/QAQqQFBAQsPACAAQQZB8f0AEKkBQQELDwAgAEEFQev9ABCpAUEBCw8AIABBAEHN/QAQqQFBAQulBAEHfyMKIQUjCkEgaiQKIAAoAggiAyAAKAIETwRAIABBARBBGiAAKAIIIQMLIAVBCGohCCAFIQkgBUEMaiEGIAAoAgAhBCAAIANBAWo2AgggAyAEakEiOgAAIAIEQANAIAJBf2ohAgJAAkACQCABLAAAIgRBCmsOUwABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAQsgACgCCCIDIAAoAgRPBEAgAEEBEEEaIAAoAgghAwsgACgCACEEIAAgA0EBajYCCCADIARqQdwAOgAAIAAoAggiAyAAKAIETwRAIABBARBBGiAAKAIIIQMLIAEsAAAhBCAAKAIAIQcgACADQQFqNgIIIAMgB2ogBDoAAAwBCyAEQf8BcSIDEMcERQRAIAAoAggiAyAAKAIETwRAIABBARBBGiAAKAIIIQMgASwAACEECyAAKAIAIQcgACADQQFqNgIIIAMgB2ogBDoAAAwBCyABLQABQVBqQQpJBEAgCCADNgIAIAZBCkH0+AAgCBBoGgUgCSADNgIAIAZBCkHw+AAgCRBoGgsgACAGEJEBCyABQQFqIQEgAg0ACwsgACgCCCIBIAAoAgRPBEAgAEEBEEEaIAAoAgghAQsgACgCACECIAAgAUEBajYCCCABIAJqQSI6AAAgBSQKC90BAQV/IAAoAjQhBCAAKAIwIgMoAgAhASADKAIgIgUgAUEcaiICKAIAIgBOBEAgASAEIAEoAjggBSACQQRB//8HQf7sABCPASIFNgI4IAAgAigCACICSARAIABBAnQgBWpBADYCACAAQQFqIgAgAkgEQANAIAEoAjggAEECdGpBADYCACAAQQFqIgAgAkgNAAsLCwsgBBCfAiEAIAEoAjghAiADIAMoAiAiA0EBajYCICADQQJ0IAJqIAA2AgAgASwABUEgcQRAIAAsAAVBGHEEQCAEIAEgABBmCwsgAAvJAQIDfwF+IwohBCMKQRBqJAogBCEFIARBCGohAwJAAkACQAJAAkAgACACEC8OBQICAwEAAwsgASAAIAIgAxA7IAMoAgAQ1QgMAwsgAUH4ABBBIQMgASAAIAIQfwR/IAUgACACQQAQYiIGNwMAIANB+ABBr/gAQbb4ACAGQoCAgICAgICAgH9RGyAFEGgFIAMgACACQQAQjQIQigYLIAEoAghqNgIIDAILIAAgAkEAEJkCGiABEHgMAQsgACACQbv4ABAxGgsgBCQKC70BAQR/IwohBiMKQRBqJAogBiEHIAAoAgwhBQJ/AkACQAJAAkAgBEEFaw4CAQACCyAFQQMQMyAFIAAgAiADEIsCQQFBABBjDAILIABBACACIAMQ9wMgBRDcBgwBCyAAIAEgAiADENkIQQEMAQsgBUF/EFpFBEAgBUF+ECsgASACIAMgAmsQZEEADAELIAVBfxDjAQR/IAEQeEEBBSAHIAVBfxAvEJ4BNgIAIAVBl/cAIAcQLgsLIQggBiQKIAgLzAIBC38jCiEGIwpBEGokCiAGIQkgBkEEaiEKIAAoAgwiC0EDIAZBCGoiCBA7IgRBJSAIKAIAIgUQfCIHBH8gAyACayEMA38gASAEIAcgBCINaxBkAkACQAJAAkAgByIFLAABIgRBJWsODAACAgICAgICAgICAQILIAEoAggiBCABKAIESQR/QSUFIAFBARBBGiABKAIIIQQgBSwAAQshDiABKAIAIQUgASAEQQFqNgIIIAQgBWogDjoAAAwCCyABIAIgDBBkDAELIARB/wFxQVBqQQpPBEAgCUElNgIAIAtBuPcAIAkQLhoMAQsgACAEQU9qIAIgAyAKENAEIgRBfkYEQCABEHgFIAEgCigCACAEEGQLCyAIIAgoAgAgDSAHQQJqIgRraiIFNgIAIARBJSAFEHwiBw0AIAULBSAFCyEAIAEgBCAAEGQgBiQKC80FAwF/AX4CfCAAvSICQiCIp0H/////B3EiAUH//7//A0sEQCACpyABQYCAwIB8anIEQEQAAAAAAAAAACAAIAChow8FRBgtRFT7IQlARAAAAAAAAAAAIAJCAFMbDwsACyABQYCAgP8DSQRAIAFBgYCA4wNJBEBEGC1EVPsh+T8PC0QYLURU+yH5PyAARAdcFDMmppE8IAAgAKIiAyADIAMgAyADIANECff9DeE9Aj+iRIiyAXXg70k/oKJEO49otSiCpL+gokRVRIgOVcHJP6CiRH1v6wMS1tS/oKJEVVVVVVVVxT+goiADIAMgAyADRIKSLrHFuLM/okRZAY0bbAbmv6CiRMiKWZzlKgBAoKJESy2KHCc6A8CgokQAAAAAAADwP6CjIACioaGhDwsgAkIAUwR8RBgtRFT7Ifk/IABEAAAAAAAA8D+gRAAAAAAAAOA/oiIAnyIDIAAgACAAIAAgACAARAn3/Q3hPQI/okSIsgF14O9JP6CiRDuPaLUogqS/oKJEVUSIDlXByT+gokR9b+sDEtbUv6CiRFVVVVVVVcU/oKIgACAAIAAgAESCki6xxbizP6JEWQGNG2wG5r+gokTIilmc5SoAQKCiREstihwnOgPAoKJEAAAAAAAA8D+goyADokQHXBQzJqaRvKCgoUQAAAAAAAAAQKIFRAAAAAAAAPA/IAChRAAAAAAAAOA/oiIAnyIEvUKAgICAcIO/IQMgACAAIAAgACAAIABECff9DeE9Aj+iRIiyAXXg70k/oKJEO49otSiCpL+gokRVRIgOVcHJP6CiRH1v6wMS1tS/oKJEVVVVVVVVxT+goiAAIAAgACAARIKSLrHFuLM/okRZAY0bbAbmv6CiRMiKWZzlKgBAoKJESy2KHCc6A8CgokQAAAAAAADwP6CjIASiIAAgAyADoqEgBCADoKOgIAOgRAAAAAAAAABAogsLBgBBiJwBCwYAQZScAQsGAEGQnAELOgEBfyAAKAJEBEAgACgCdCIBBEAgASAAKAJwNgJwCyAAKAJwIgAEfyAAQfQAagVBoMEACyABNgIACwuLAQECfwJAAkADQCACQaAmai0AACAARwRAIAJBAWoiAkHXAEcNAUHXACECDAILCyACDQBBgCchAAwBC0GAJyEAA0AgACEDA0AgA0EBaiEAIAMsAAAEQCAAIQMMAQsLIAJBf2oiAg0ACwsgASgCFCIBBH8gASgCACABKAIEIAAQ6AgFQQALIgEgACABGwveAQECfwJAAkAgASICIABzQQNxDQACQCACQQNxBEADQCAAIAEsAAAiAjoAACACRQ0CIABBAWohACABQQFqIgFBA3ENAAsLIAEoAgAiAkH//ft3aiACQYCBgoR4cUGAgYKEeHNxRQRAA38gAEEEaiEDIAAgAjYCACABQQRqIgEoAgAiAkH//ft3aiACQYCBgoR4cUGAgYKEeHNxBH8gAwUgAyEADAELCyEACwwBCwwBCyAAIAEsAAAiAjoAACACBEADQCAAQQFqIgAgAUEBaiIBLAAAIgI6AAAgAg0ACwsLC2cBBH8jCiEEIwpBIGokCiAEIgNBEGohBSAAQQE2AiQgACgCAEHAAHFFBEAgAyAAKAI8NgIAIANBk6gBNgIEIAMgBTYCCEE2IAMQDARAIABBfzoASwsLIAAgASACEJIFIQYgBCQKIAYLYgEDfyMKIQQjCkEgaiQKIAQiAyAAKAI8NgIAIANBADYCBCADIAE2AgggAyADQRRqIgA2AgwgAyACNgIQQYwBIAMQJxBzQQBIBH8gAEF/NgIAQX8FIAAoAgALIQUgBCQKIAUL1AEBBH8jCiEFIwpBIGokCiAFIgQgATYCACAEIAIgACgCMCIDQQBHazYCBCAEIAAoAiw2AgggBCADNgIMIARBEGoiAyAAKAI8NgIAIAMgBDYCBCADQQI2AghBkQEgAxAmEHMiA0EBSARAIAAgACgCACADQTBxQRBzcjYCACADIQIFIAMgBCgCBCIGSwRAIAAgACgCLCIENgIEIAAgBCADIAZrajYCCCAAKAIwBEAgACAEQQFqNgIEIAEgAkF/amogBCwAADoAAAsFIAMhAgsLIAUkCiACCykBAn8jCiEBIwpBEGokCiABIAAoAjw2AgBBBiABEAgQcyECIAEkCiACC60NAhd/AXwjCiENIwpBsARqJAogDUHAAmohDiACQX1qQRhtIgRBACAEQQBKGyERQZQ2KAIAIgsgA0F/aiIGakEATgRAIAMgC2ohCCARIAZrIQQDQCAFQQN0IA5qIARBAEgEfEQAAAAAAAAAAAUgBEECdEGgNmooAgC3CzkDACAEQQFqIQQgBUEBaiIFIAhHDQALCyANQeADaiEKIA1BoAFqIQ8gDSEMIBFBaGwiFSACQWhqaiEIIANBAEohB0EAIQQDQCAHBEAgBCAGaiEJRAAAAAAAAAAAIRtBACEFA0AgGyAFQQN0IABqKwMAIAkgBWtBA3QgDmorAwCioCEbIAVBAWoiBSADRw0ACwVEAAAAAAAAAAAhGwsgBEEDdCAMaiAbOQMAIARBAWohBSAEIAtIBEAgBSEEDAELCyAIQQBKIRJBGCAIayETQRcgCGshFiAIRSEXIANBAEohGCALIQQCQAJAA0ACQCAEQQN0IAxqKwMAIRsgBEEASiIJBEAgBCEFQQAhBgNAIAZBAnQgCmogGyAbRAAAAAAAAHA+oqq3IhtEAAAAAAAAcEGioao2AgAgBUF/aiIHQQN0IAxqKwMAIBugIRsgBkEBaiEGIAVBAUoEQCAHIQUMAQsLCyAbIAgQeyIbIBtEAAAAAAAAwD+inEQAAAAAAAAgQKKhIhuqIQUgGyAFt6EhGwJAAkACQCASBH8gBEF/akECdCAKaiIHKAIAIhAgE3UhBiAHIBAgBiATdGsiBzYCACAHIBZ1IQcgBSAGaiEFDAEFIBcEfyAEQX9qQQJ0IApqKAIAQRd1IQcMAgUgG0QAAAAAAADgP2YEf0ECIQcMBAVBAAsLCyEHDAILIAdBAEoNAAwBCwJ/IAUhGiAJBH9BACEFQQAhCQN/IAlBAnQgCmoiGSgCACEQAkACQCAFBH9B////ByEUDAEFIBAEf0EBIQVBgICACCEUDAIFQQALCyEFDAELIBkgFCAQazYCAAsgCUEBaiIJIARHDQAgBQsFQQALIQkgEgRAAkACQAJAIAhBAWsOAgABAgsgBEF/akECdCAKaiIFIAUoAgBB////A3E2AgAMAQsgBEF/akECdCAKaiIFIAUoAgBB////AXE2AgALCyAaC0EBaiEFIAdBAkYEQEQAAAAAAADwPyAboSEbIAkEQCAbRAAAAAAAAPA/IAgQe6EhGwtBAiEHCwsgG0QAAAAAAAAAAGINAiAEIAtKBEBBACEJIAQhBgNAIAkgBkF/aiIGQQJ0IApqKAIAciEJIAYgC0oNAAsgCQ0BC0EBIQUDQCAFQQFqIQYgCyAFa0ECdCAKaigCAEUEQCAGIQUMAQsLIAQgBWohBgNAIAMgBGoiB0EDdCAOaiAEQQFqIgUgEWpBAnRBoDZqKAIAtzkDACAYBEBEAAAAAAAAAAAhG0EAIQQDQCAbIARBA3QgAGorAwAgByAEa0EDdCAOaisDAKKgIRsgBEEBaiIEIANHDQALBUQAAAAAAAAAACEbCyAFQQN0IAxqIBs5AwAgBSAGSARAIAUhBAwBCwsgBiEEDAELCyAIIQADfyAAQWhqIQAgBEF/aiIEQQJ0IApqKAIARQ0AIAAhAiAECyEADAELIBtBACAIaxB7IhtEAAAAAAAAcEFmBH8gBEECdCAKaiAbIBtEAAAAAAAAcD6iqiIDt0QAAAAAAABwQaKhqjYCACACIBVqIQIgBEEBagUgCCECIBuqIQMgBAsiAEECdCAKaiADNgIAC0QAAAAAAADwPyACEHshGyAAQX9KIgYEQCAAIQIDQCACQQN0IAxqIBsgAkECdCAKaigCALeiOQMAIBtEAAAAAAAAcD6iIRsgAkF/aiEDIAJBAEoEQCADIQIMAQsLIAYEQCAAIQIDQCAAIAJrIQhBACEDRAAAAAAAAAAAIRsDQCAbIANBA3RBsDhqKwMAIAIgA2pBA3QgDGorAwCioCEbIANBAWohBCADIAtOIAMgCE9yRQRAIAQhAwwBCwsgCEEDdCAPaiAbOQMAIAJBf2ohAyACQQBKBEAgAyECDAELCwsLIAYEQEQAAAAAAAAAACEbIAAhAgNAIBsgAkEDdCAPaisDAKAhGyACQX9qIQMgAkEASgRAIAMhAgwBCwsFRAAAAAAAAAAAIRsLIAEgGyAbmiAHRSIEGzkDACAPKwMAIBuhIRsgAEEBTgRAQQEhAgNAIBsgAkEDdCAPaisDAKAhGyACQQFqIQMgACACRwRAIAMhAgwBCwsLIAEgGyAbmiAEGzkDCCANJAogBUEHcQsvAQJ/IAAQuAMiASgCADYCOCABKAIAIgIEQCACIAA2AjQLIAEgADYCAEH8mwEQAQsrAQF/IwohAiMKQRBqJAogAiAANgIAIAIgATYCBEHbACACECAQcxogAiQKC+sCAQt/IAAoAgggACgCAEGi2u/XBmoiBhCtASEEIAAoAgwgBhCtASEFIAAoAhAgBhCtASEDIAQgAUECdkkEfyAFIAEgBEECdGsiB0kgAyAHSXEEfyADIAVyQQNxBH9BAAUCfyAFQQJ2IQkCfyADQQJ2IQ1BACEFA0ACQCAJIAUgBEEBdiIHaiILQQF0IgxqIgNBAnQgAGooAgAgBhCtASEIQQAgA0EBakECdCAAaigCACAGEK0BIgMgAUkgCCABIANrSXFFDQMaQQAgACADIAhqaiwAAA0DGiACIAAgA2oQWSIDRQ0AIANBAEghA0EAIARBAUYNAxogBSALIAMbIQUgByAEIAdrIAMbIQQMAQsLIA0LIAxqIgJBAnQgAGooAgAgBhCtASEEIAJBAWpBAnQgAGooAgAgBhCtASICIAFJIAQgASACa0lxBH9BACAAIAJqIAAgAiAEamosAAAbBUEACwsLBUEACwVBAAsL2AUBCn8jCiEJIwpBkAJqJAogASwAAEUEQAJAQdaFARAAIgEEQCABLAAADQELIABBDGxBsDVqEAAiAQRAIAEsAAANAQtB3YUBEAAiAQRAIAEsAAANAQtB4oUBIQELCyAJIgVBgAJqIQYDfwJ/AkAgASACaiwAACIDBEAgA0EvRw0BCyACDAELIAJBAWoiAkEPSQ0BQQ8LCyEEAkACQAJAIAEsAAAiAkEuRgRAQeKFASEBBSABIARqLAAABEBB4oUBIQEFIAJBwwBHDQILCyABLAABRQ0BCyABQeKFARBZRQ0AIAFB6oUBEFlFDQBB6JsBKAIAIgIEQANAIAEgAkEIahBZRQ0DIAIoAhgiAg0ACwtB7JsBEAlB6JsBKAIAIgIEQAJAA0AgASACQQhqEFkEQCACKAIYIgJFDQIMAQsLQeybARABDAMLCwJ/AkBBrJsBKAIADQBB8IUBEAAiAkUNACACLAAARQ0AQf4BIARrIQogBEEBaiELA0ACQCACQToQuQIiBywAACIDQQBHQR90QR91IAcgAmtqIgggCkkEQCAFIAIgCBBAGiAFIAhqIgJBLzoAACACQQFqIAEgBBBAGiAFIAggC2pqQQA6AAAgBSAGECgiAw0BIAcsAAAhAwsgByADQf8BcUEAR2oiAiwAAA0BDAILC0EcELMBIgIEfyACIAM2AgAgAiAGKAIANgIEIAJBCGoiAyABIAQQQBogAyAEakEAOgAAIAJB6JsBKAIANgIYQeibASACNgIAIAIFIAMgBigCABDnCAwBCwwBC0EcELMBIgIEQCACQZw7KAIANgIAIAJBoDsoAgA2AgQgAkEIaiIDIAEgBBBAGiADIARqQQA6AAAgAkHomwEoAgA2AhhB6JsBIAI2AgALIAILIgFBnDsgACABchshAkHsmwEQAQwBCyAARQRAIAEsAAFBLkYEQEGcOyECDAILC0EAIQILIAkkCiACC2ABAX8gACgCKCEBIABBACAAKAIAQYABcQR/QQJBASAAKAIUIAAoAhxLGwVBAQsgAUEPcUGCAmoRAwAiAUEATgRAIAAoAhQgACgCBCABIAAoAghramogACgCHGshAQsgAQuoAQEBfyACQQFGBEAgACgCBCABIAAoAghraiEBCwJ/AkAgACgCFCAAKAIcTQ0AIAAoAiQhAyAAQQBBACADQQ9xQYICahEDABogACgCFA0AQX8MAQsgAEEANgIQIABBADYCHCAAQQA2AhQgACgCKCEDIAAgASACIANBD3FBggJqEQMAQQBIBH9BfwUgAEEANgIIIABBADYCBCAAIAAoAgBBb3E2AgBBAAsLC8sGAQN/AnwDQCAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABBQCyIBEIMDDQALAkACQAJAIAFBK2sOAwABAAELQQEgAUEtRkEBdGshAyAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABBQCyEBDAELQQEhAwsCQAJAAkADfyACQcmFAWosAAAgAUEgckYEfyACQQdJBEAgACgCBCIBIAAoAmRJBH8gACABQQFqNgIEIAEtAAAFIAAQUAshAQsgAkEBaiICQQhJDQFBCAUgAgsLIgJB/////wdxQQNrDgYBAAAAAAIACyACQQNLBEAgAkEIRg0CDAELIAJFBEACQEEAIQIDfyACQdKFAWosAAAgAUEgckcNASACQQJJBEAgACgCBCIBIAAoAmRJBH8gACABQQFqNgIEIAEtAAAFIAAQUAshAQsgAkEBaiICQQNJDQBBAwshAgsLAkACQAJAIAIOBAECAgACCyAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABBQC0EoRwRAIwggACgCZEUNBRogACAAKAIEQX9qNgIEIwgMBQtBASEBA0ACQCAAKAIEIgIgACgCZEkEfyAAIAJBAWo2AgQgAi0AAAUgABBQCyICQVBqQQpJIAJBv39qQRpJckUEQCACQd8ARiACQZ9/akEaSXJFDQELIAFBAWohAQwBCwsjCCACQSlGDQQaIAAoAmRFIgJFBEAgACAAKAIEQX9qNgIECyMIIAFFDQQaA0AgAkUEQCAAIAAoAgRBf2o2AgQLIwggAUF/aiIBRQ0FGgwAAAsACyAAIAFBMEYEfyAAKAIEIgEgACgCZEkEfyAAIAFBAWo2AgQgAS0AAAUgABBQC0EgckH4AEYEQCAAIAMQ3AcMBQsgACgCZARAIAAgACgCBEF/ajYCBAtBMAUgAQsgAxCUCAwDCyAAKAJkBEAgACAAKAIEQX9qNgIEC0HkmwFBFjYCACAAELYDRAAAAAAAAAAADAILIAAoAmRFIgFFBEAgACAAKAIEQX9qNgIECyACQQNLBEADQCABRQRAIAAgACgCBEF/ajYCBAsgAkF/aiICQQNLDQALCwsgA7IjCbaUuwsLBgBB5JsBCwgAQZicARAqC9IBAQh/IwohAyMKQTBqJAogA0EYaiEEIANBEGohBiADIQUgACABRgR/QWoFAn8gAkGAgCBxQQBHIgcEQANAAkAgBSAANgIAIAUgATYCBCAFIAI2AggCQAJAQcoCIAUQJCIIQVprIgkEQCAJQRZGBEAMAwUMAgsACwwCCyAIDAQLDAELCwsDQCAGIAA2AgAgBiABNgIEQT8gBhAhIgJBcEYNAAsgBwRAIAQgATYCACAEQQI2AgQgBEEBNgIIQd0BIAQQAhoLIAILCxBzIQogAyQKIAoLpgEBBH8gABBnIQQgACgCACECIARBAWpB/////wFLBEAgAhCjAQsgASACIARBA3RBABBtIgI2AjwgASAENgIMIARBAEoEQANAIANBA3QgAmpBADYCACAAEHQhAiABKAI8IANBA3RqIAI6AAQgABB0IQIgASgCPCADQQN0aiACOgAFIAAQdCEFIAEoAjwiAiADQQN0aiAFOgAGIANBAWoiAyAERw0ACwsLxAEBA38gABBnIQMgACgCACECIANBAWpB/////wNLBEAgAhCjAQsgASACIANBAnRBABBtIgI2AjggASADNgIcIANBAEoiBARAIAJBADYCACADQQFHBEBBASECA0AgASgCOCACQQJ0akEANgIAIAMgAkEBaiICRw0ACwsgBARAQQAhAgNAIAAoAgAQnwIhBCABKAI4IAJBAnRqIAQ2AgAgACABKAI4IAJBAnRqKAIAIAEoAkwQmwUgAkEBaiICIANHDQALCwsLrAMBBX8gABBnIQIgAUFAayAAKAIAIAJBABBtIgM2AgAgASACNgIYIAAgAyACEMEBIAAQZyEEIAAoAgAhAyAEQQFqQf////8BSwRAIAMQowELIAEgAyAEQQN0QQAQbTYCRCABIAQ2AiQCfyAEQQBKIQYgABBnIQMgBgsEQEEAIQIDQCABKAJEIAJBA3RqIAM2AgAgABBnIQMgASgCRCACQQN0aiADNgIEIAJBAWohAiAAEGchAyACIARHDQALCyAAKAIAIQIgA0EBakHVqtWqAUsEQCACEKMBCyABIAIgA0EMbEEAEG0iBTYCSCABIAM2AiAgA0EASiIEBEBBACECA0AgAkEMbCAFakEANgIAIAJBAWoiAiADRw0ACyAEBEBBACECA0AgABC6AiEEIAEoAkggAkEMbGogBDYCACAAEGchBCABKAJIIAJBDGxqIAQ2AgQgABBnIQQgASgCSCACQQxsaiAENgIIIAJBAWoiAiADRw0ACwsLIAAQZyIEQQBKBEBBACEDA0AgABC6AiECIAEoAjwgA0EDdGogAjYCACADQQFqIgMgBEcNAAsLC88CAQV/IAAQZyEEIAAoAgAhAiAEQQFqQf////8ASwRAIAIQowELIAEgAiAEQQR0QQAQbSIGNgIwIAEgBDYCECAEQQBKIgMEQAJAQQAhAgNAIAJBBHQgBmpBADoACCAEIAJBAWoiAkcNAAsgAwRAQQAhAgNAIAJBBHQgBmohBQJAAkACQAJAAkACQCAAEHQiA0EYdEEYdQ4lBAAFBQUFBQUFBQUFBQUFBQUFBQEDBQUFBQUFBQUFBQUFBQUCAwULIAUgABB0Qf8BcTYCAEEBIQMMAwsgBSAAEJkFOQMAQRMhAwwCCyAFIAAQmgU3AwBBIyEDDAELIAUCfyAAIgMQugIiBQRAIAUMAQUgA0G6/wAQhwELQQALIgM2AgAgAywABEHAAHIhAwsgAkEEdCAGaiADOgAICyAEIAJBAWoiAkYNAiABKAIwIQYMAAALAAsLCwtKAQN/IAAQZyEDIAAoAgAhAiADQQFqQf////8DSwRAIAIQowEFIAEgAiADQQJ0IgJBABBtIgQ2AjQgASADNgIUIAAgBCACEMEBCwtkAQR/IwohAyMKQRBqJAogAyECAn8gAEKAgICAgICAEHxCgYCAgICAgCBUBH8gALkgAWMFIAEgAkECEIwBRSEEIAFEAAAAAAAAAABkIAIpAwAgAFUgBBsLIQUgAyQKIAULQQFxC2QBBH8jCiEDIwpBEGokCiADIQICfyABQoCAgICAgIAQfEKBgICAgICAIFQEfyABuSAAZAUgACACQQEQjAFFIQQgAEQAAAAAAAAAAGMgAikDACABUyAEGwshBSADJAogBQtBAXELZAEEfyMKIQMjCkEQaiQKIAMhAgJ/IABCgICAgICAgBB8QoGAgICAgIAgVAR/IAC5IAFlBSABIAJBARCMAUUhBCABRAAAAAAAAAAAZCACKQMAIABZIAQbCyEFIAMkCiAFC0EBcQtkAQR/IwohAyMKQRBqJAogAyECAn8gAUKAgICAgICAEHxCgYCAgICAgCBUBH8gAbkgAGYFIAAgAkECEIwBRSEEIABEAAAAAAAAAABjIAIpAwAgAVcgBBsLIQUgAyQKIAULQQFxC1wBAn8gACgCDCIDIAEQWCADQQBKBEADQCAAKAI8IAJBA3RqLQAEIAEQcSAAKAI8IAJBA3RqLQAFIAEQcSAAKAI8IAJBA3RqLQAGIAEQcSADIAJBAWoiAkcNAAsLCz4BAn8gACgCHCIDIAEQWCADQQBKBEADQCAAKAI4IAJBAnRqKAIAIAAoAkwgARChBSADIAJBAWoiAkcNAAsLC04AQer/AEEEIAAQmwFB+AMgABBYQQAgABBxQaOAAUEGIAAQmwFBBCAAEHFBCCAAEHFBCCAAEHFC+KwBIAAQoAVEAAAAAAAod0AgABCfBQu2AgECfyABKAIMBH9BAAUgACgCGAsiAiABEFggAEFAaygCACACIAEQmwEgASgCDARAQQAgARBYBSAAKAIkIgMgARBYIANBAEoEQEEAIQIDQCAAKAJEIAJBA3RqKAIAIAEQWCAAKAJEIAJBA3RqKAIEIAEQWCACQQFqIgIgA0cNAAsLCyABKAIMBEBBACABEFgFIAAoAiAiAyABEFggA0EASgRAQQAhAgNAIAAoAkggAkEMbGooAgAgARCEAiAAKAJIIAJBDGxqKAIEIAEQWCAAKAJIIAJBDGxqKAIIIAEQWCACQQFqIgIgA0cNAAsLCyABKAIMBEBBACABEFgFIAAoAgwiAyABEFggA0EASgRAQQAhAgNAIAAoAjwgAkEDdGooAgAgARCEAiACQQFqIgIgA0cNAAsLCwu3AQEEfyAAKAIQIgUgARBYIAVBAEoEQANAIAAoAjAiBCACQQR0aiEDIAJBBHQgBGoiBCwACEE/cSABEHECQAJAAkACQAJAIAQsAAhBP3FBAWsOJAEEBAQEBAQEBAQEBAQEBAQEBAIABAQEBAQEBAQEBAQEBAQDAAQLIAMoAgAgARCEAgwDCyADKAIAIAEQcQwCCyADKwMAIAEQnwUMAQsgAykDACABEKAFCyAFIAJBAWoiAkcNAAsLCwv2dE8AQYAICw22PgAAAQAAAD8/AAABAEGgCAvCAe0jAAACAAAA9CMAAAMAAAADJAAABAAAAAokAAAFAAAAqCYAAAYAAAAQJAAABwAAABckAAAIAAAAe0IAAAkAAAAgJAAACgAAACUkAAALAAAAKyQAAAwAAAAxJAAADQAAADckAAAOAAAAPCQAAA8AAABFJAAAEAAAAEwkAAARAAAAUyQAABIAAABaJAAAEwAAAPQmAAAUAAAAYSQAABUAAABqJAAAFgAAALAvAAAXAAAAcyQAABgAAAAvKwAAAAAAAOQjAEHwCQsmWSUAAF4lAAA4JQAAUCcAAGhCAABmJQAAbyUAAHolAABMJQAAQCUAQaQKCyEBAAAAAgAAAAMAAAAFAAAABgAAAAcAAAAJAAAACgAAAAsAQdAKCz3YJQAAGQAAAN8lAAAaAAAA5iUAABsAAADuJQAAHAAAAPUlAAAdAAAA+iUAAB4AAAAAJgAAHwAAAFA3AAAgAEGgCwsO5iUAACgmAAAtJgAANyYAQboLCwUICAgICABB0QsLXwwEBAQEBAQEBAQEBAQEBAQWFhYWFhYWFhYWBAQEBAQEBBUVFRUVFQUFBQUFBQUFBQUFBQUFBQUFBQUFBAQEBAUEFRUVFRUVBQUFBQUFBQUFBQUFBQUFBQUFBQUEBAQEAEHADQuFAVQrAAAhAAAAdiYAACIAAACDJgAAIwAAAIsmAAAkAAAAkyYAACUAAACcJgAAJgAAAKgmAAAnAAAAtSYAACgAAADAJgAAKQAAAMwmAAAqAAAA1iYAACsAAADjJgAALAAAAOsmAAAtAAAA9CYAAC4AAAABJwAALwAAAAwnAAAwAAAAFicAADEAQdAOCxLgKQAAUS0AANArAABQJwAAVicAQfAOC00vKwAAMgAAADIrAAAzAAAAOisAADQAAAB/PgAANQAAAEQrAAA2AAAARysAADcAAAB4PgAAOAAAAEorAAA5AAAATysAADoAAABUKwAAOwBB0A8LVVA3AAA8AAAAtSsAAD0AAAB+LAAAPgAAAK8rAAA/AAAAhCwAAEAAAACJLAAAQQAAAJAsAABCAAAApCsAAEMAAACWLAAARAAAALAvAABFAAAAqSsAAEYAQbAQCx2jPgAAAAAAALY+AABHAAAAPz8AAEcAAABbLAAASABB4BALNaQrAABJAAAAqSsAAEoAAACvKwAASwAAALUrAABMAAAAuysAAE0AAABQNwAATgAAAMArAABPAEGgEQuyAcgrAADLKwAA0CsAAAAAAAAVLAAA8isAACQtAAAAAAAAES0AADU1AAAVLQAAGC0AAB0tAAAkLQAAKC0AAC4tAACFPgAAMi0AADctAAA6LQAAPS0AAFw+AABDLQAARy0AAEotAABRLQAAWC0AAF0tAABiLQAAaC0AAG4tAABxLQAAGDMAAHQtAAB3LQAAei0AAH0tAACALQAAgy0AAIYtAACJLQAAjy0AAJgtAACiLQAAqS0AQeASC9IBVS8AAFAAAABZLwAAUQAAAF4vAABSAAAAYy8AAFMAAABoLwAAVAAAAG0vAABVAAAAcS8AAFYAAAB1LwAAVwAAAHkvAABYAAAAgy8AAFkAAACJLwAAWgAAAI4vAABbAAAAki8AAFwAAACWLwAAXQAAAKgzAABeAAAAmi8AAF8AAACfLwAAYAAAAKMvAABhAAAApy8AAGIAAACsLwAAYwAAALAvAABkAAAAFy8AAAAAAAAeLwAAAAAAAPkuAAAAAAAA/C4AAAAAAAABLwAAAAAAAAwvAEHAFAsNFy8AAGUAAAAeLwAAZgBB4BQLMrEyAABnAAAAuTIAAGgAAAA8MQAAAAAAAL0wAAAAAAAAGDAAAAAAAABMMQAAAAAAACwxAEGgFQsFRDEAAGkAQbAVCw1qAAAAawAAAGwAAABtAEHRFQvQAgECAgMDAwMEBAQEBAQEBAUFBQUFBQUFBQUFBQUFBQUGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKCgkJCAgIAAgICAgAAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgIgICACAgICAgAAAQQEBAQEBAQEBAQGGhoIAAACQkBAAkgCUgoAwBBsBgLVSkzAABuAAAALzMAAG8AAAA0MwAAcAAAAD0zAABxAAAARTMAAHIAAABKMwAAcwAAAFA9AAB0AAAAUTMAAHUAAABYMwAAdgAAAGIzAAB3AAAAZzMAAHgAQZAZCxZQNAAAVDQAAFw0AABiNAAAazQAAGIzAEGwGQsVBgAAAAMAAAAAAAAABAAAAAEAAAACAEHQGQu1AQoKCgoLCwsLDg0LCwsLBgYEBAUFBwcHBwkIAwMDAwMDAwMDAwMDAgIBAQAAAAAAAEc4AAB5AAAAyEAAAHoAAABMOAAAewAAAFE4AAB8AAAAVjgAAH0AAABdOAAAfgAAAGQ4AAB/AAAAzUAAAIAAAABpOAAAgQAAAG84AACCAAAAdTgAAIMAAAB5OAAAhAAAAIE4AACFAAAAhTgAAIYAAABEPQAAhwAAAIs4AACIAAAAST0AAIkAQZAbC0LNPgAAigAAANM+AACLAAAA2T4AAIwAAADfPgAAjQAAAOU+AACOAAAA6z4AAI8AAADxPgAAkAAAABg/AACRAAAAoz4AQeAbCzU2PQAAkgAAAD09AACTAAAARD0AAJQAAABJPQAAlQAAAFA9AACWAAAAVz0AAJcAAABcPQAAmABBoBwLkgFTPgAAXD4AAGA+AABoPgAAcT4AAHg+AAB/PgAAhT4AAGg+AACOPgAAlT4AAJ0+AACjPgAAqz4AALY+AAC7PgAAwj4AAMg+AADNPgAA0z4AANk+AADfPgAA5T4AAOs+AADxPgAA+D4AAP8+AAAFPwAADD8AABI/AAAYPwAAHj8AACU/AAAqPwAALz8AADg/AAA/PwBBwB0LKrdAAACZAAAAvkAAAJoAAADIQAAAmwAAAM1AAACcAAAA0UAAAJ0AAACrQABBgB4LGP////+AAAAAAAgAAAAAAQAAACAAAAAABABBoB4LwQIBAAAAAgAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAEQAAABIAAAATAAAAFAAAABUAAAAWAAAAFwAAABgAAAAZAAAAGgAAABsAAAAcAAAAHQAAAB4AAAAfAAAAIAAAACEAAAAiAAAAIwAAACQAAAAlAAAAJgAAACcAAAAoAAAAKQAAACoAAAArAAAALAAAAC0AAAAuAAAALwAAADAAAAAxAAAAMgAAADMAAAA0AAAANQAAADYAAAA3AAAAOAAAADkAAAA6AAAAOwAAADwAAAA9AAAAPgAAAD8AAABAAAAAQQAAAEIAAABDAAAARAAAAEUAAABGAAAARwAAAEgAAABJAAAASgAAAEsAAABMAAAATQAAAE4AAABPAAAAUAAAAFEAQfAgC6gBV0FMVUFfQ09NUElMRSA9IGZ1bmN0aW9uKHdlYnNjcmlwdCkKbG9jYWwgZXJyCldBTFVBX1NURVAsIGVyciA9IGxvYWQod2Vic2NyaXB0LCAnZW1iZWRkZWQtY29kZScpCmlmIG5vdCBlcnIgdGhlbiByZXR1cm4gMCBlbmQKaW8uc3RkZXJyOndyaXRlKGVyciwnXHJcbicpCnJldHVybiAtMQplbmQKAEGgIgsU3hIElQAAAAD///////////////8AQcAiCxgRAAoAERERAAAAAAUAAAAAAAAJAAAAAAsAQeAiCyERAA8KERERAwoHAAETCQsLAAAJBgsAAAsABhEAAAAREREAQZEjCwELAEGaIwsYEQAKChEREQAKAAACAAkLAAAACQALAAALAEHLIwsBDABB1yMLFQwAAAAADAAAAAAJDAAAAAAADAAADABBhSQLAQ4AQZEkCxUNAAAABA0AAAAACQ4AAAAAAA4AAA4AQb8kCwEQAEHLJAseDwAAAAAPAAAAAAkQAAAAAAAQAAAQAAASAAAAEhISAEGCJQsOEgAAABISEgAAAAAAAAkAQbMlCwELAEG/JQsVCgAAAAAKAAAAAAkLAAAAAAALAAALAEHtJQsBDABB+SULfgwAAAAADAAAAAAJDAAAAAAADAAADAAAMDEyMzQ1Njc4OUFCQ0RFRlQhIhkNAQIDEUscDBAECx0SHidobm9wcWIgBQYPExQVGggWBygkFxgJCg4bHyUjg4J9JiorPD0+P0NHSk1YWVpbXF1eX2BhY2RlZmdpamtscnN0eXp7fABBgCcL9w5JbGxlZ2FsIGJ5dGUgc2VxdWVuY2UARG9tYWluIGVycm9yAFJlc3VsdCBub3QgcmVwcmVzZW50YWJsZQBOb3QgYSB0dHkAUGVybWlzc2lvbiBkZW5pZWQAT3BlcmF0aW9uIG5vdCBwZXJtaXR0ZWQATm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeQBObyBzdWNoIHByb2Nlc3MARmlsZSBleGlzdHMAVmFsdWUgdG9vIGxhcmdlIGZvciBkYXRhIHR5cGUATm8gc3BhY2UgbGVmdCBvbiBkZXZpY2UAT3V0IG9mIG1lbW9yeQBSZXNvdXJjZSBidXN5AEludGVycnVwdGVkIHN5c3RlbSBjYWxsAFJlc291cmNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlAEludmFsaWQgc2VlawBDcm9zcy1kZXZpY2UgbGluawBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0ARGlyZWN0b3J5IG5vdCBlbXB0eQBDb25uZWN0aW9uIHJlc2V0IGJ5IHBlZXIAT3BlcmF0aW9uIHRpbWVkIG91dABDb25uZWN0aW9uIHJlZnVzZWQASG9zdCBpcyBkb3duAEhvc3QgaXMgdW5yZWFjaGFibGUAQWRkcmVzcyBpbiB1c2UAQnJva2VuIHBpcGUASS9PIGVycm9yAE5vIHN1Y2ggZGV2aWNlIG9yIGFkZHJlc3MAQmxvY2sgZGV2aWNlIHJlcXVpcmVkAE5vIHN1Y2ggZGV2aWNlAE5vdCBhIGRpcmVjdG9yeQBJcyBhIGRpcmVjdG9yeQBUZXh0IGZpbGUgYnVzeQBFeGVjIGZvcm1hdCBlcnJvcgBJbnZhbGlkIGFyZ3VtZW50AEFyZ3VtZW50IGxpc3QgdG9vIGxvbmcAU3ltYm9saWMgbGluayBsb29wAEZpbGVuYW1lIHRvbyBsb25nAFRvbyBtYW55IG9wZW4gZmlsZXMgaW4gc3lzdGVtAE5vIGZpbGUgZGVzY3JpcHRvcnMgYXZhaWxhYmxlAEJhZCBmaWxlIGRlc2NyaXB0b3IATm8gY2hpbGQgcHJvY2VzcwBCYWQgYWRkcmVzcwBGaWxlIHRvbyBsYXJnZQBUb28gbWFueSBsaW5rcwBObyBsb2NrcyBhdmFpbGFibGUAUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIAU3RhdGUgbm90IHJlY292ZXJhYmxlAFByZXZpb3VzIG93bmVyIGRpZWQAT3BlcmF0aW9uIGNhbmNlbGVkAEZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZABObyBtZXNzYWdlIG9mIGRlc2lyZWQgdHlwZQBJZGVudGlmaWVyIHJlbW92ZWQARGV2aWNlIG5vdCBhIHN0cmVhbQBObyBkYXRhIGF2YWlsYWJsZQBEZXZpY2UgdGltZW91dABPdXQgb2Ygc3RyZWFtcyByZXNvdXJjZXMATGluayBoYXMgYmVlbiBzZXZlcmVkAFByb3RvY29sIGVycm9yAEJhZCBtZXNzYWdlAEZpbGUgZGVzY3JpcHRvciBpbiBiYWQgc3RhdGUATm90IGEgc29ja2V0AERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQATWVzc2FnZSB0b28gbGFyZ2UAUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0AFByb3RvY29sIG5vdCBhdmFpbGFibGUAUHJvdG9jb2wgbm90IHN1cHBvcnRlZABTb2NrZXQgdHlwZSBub3Qgc3VwcG9ydGVkAE5vdCBzdXBwb3J0ZWQAUHJvdG9jb2wgZmFtaWx5IG5vdCBzdXBwb3J0ZWQAQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZCBieSBwcm90b2NvbABBZGRyZXNzIG5vdCBhdmFpbGFibGUATmV0d29yayBpcyBkb3duAE5ldHdvcmsgdW5yZWFjaGFibGUAQ29ubmVjdGlvbiByZXNldCBieSBuZXR3b3JrAENvbm5lY3Rpb24gYWJvcnRlZABObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlAFNvY2tldCBpcyBjb25uZWN0ZWQAU29ja2V0IG5vdCBjb25uZWN0ZWQAQ2Fubm90IHNlbmQgYWZ0ZXIgc29ja2V0IHNodXRkb3duAE9wZXJhdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzAE9wZXJhdGlvbiBpbiBwcm9ncmVzcwBTdGFsZSBmaWxlIGhhbmRsZQBSZW1vdGUgSS9PIGVycm9yAFF1b3RhIGV4Y2VlZGVkAE5vIG1lZGl1bSBmb3VuZABXcm9uZyBtZWRpdW0gdHlwZQBObyBlcnJvciBpbmZvcm1hdGlvbgAAAAAAAAoAAABkAAAA6AMAABAnAACghgEAQEIPAICWmAAA4fUFTENfQ1RZUEUAAAAATENfTlVNRVJJQwAATENfVElNRQAAAAAATENfQ09MTEFURQAATENfTU9ORVRBUlkATENfTUVTU0FHRVMAQYA2CwdDLlVURi04AEGQNguXAgMAAAAEAAAABAAAAAYAAACD+aIARE5uAPwpFQDRVycA3TT1AGLbwAA8mZUAQZBDAGNR/gC73qsAt2HFADpuJADSTUIASQbgAAnqLgAcktEA6x3+ACmxHADoPqcA9TWCAES7LgCc6YQAtCZwAEF+XwDWkTkAU4M5AJz0OQCLX4QAKPm9APgfOwDe/5cAD5gFABEv7wAKWosAbR9tAM9+NgAJyycARk+3AJ5mPwAt6l8Auid1AOXrxwA9e/EA9zkHAJJSigD7a+oAH7FfAAhdjQAwA1YAe/xGAPCrawAgvM8ANvSaAOOpHQBeYZEACBvmAIWZZQCgFF8AjUBoAIDY/wAnc00ABgYxAMpWFQDJqHMAe+JgAGuMwABBszgLUED7Ifk/AAAAAC1EdD4AAACAmEb4PAAAAGBRzHg7AAAAgIMb8DkAAABAICV6OAAAAIAiguM2AAAAAB3zaTUvdG1wL3RtcGZpbGVfWFhYWFhYAEGQOQsSL3RtcC90bXBuYW1fWFhYWFhYAEGwOQtgT7thBWes3T8YLURU+yHpP5v2gdILc+8/GC1EVPsh+T/iZS8ifyt6PAdcFDMmpoE8vcvweogHcDwHXBQzJqaRPAAAAAAAAOA/AAAAAAAA4L8AAAAAAADwPwAAAAAAAPg/AEGYOgsIBtDPQ+v9TD4AQas6CwZAA7jiPwYAQcA6Cwj//////////wBB0DoLASAAQeA6CwEQAEHwOgs7/////wIAAAAAAAAAAQAAAAAAAAABAAAAAgAAAEgAAABJAAAARwAAAEsAAAAgEQAAFAAAAEMuVVRGLTgAQbg7CwW8HQAABQBByDsLAZ4AQeA7CwoBAAAAAgAAACROAEH4OwsBAgBBhzwLBf//////AEG4PAsFPB4AAAkAQcg8CwGeAEHcPAsSAwAAAAAAAAACAAAAGEMAAAAEAEGIPQsE/////wBBuD0LBbweAAAFAEHIPQsBngBB4D0LDgQAAAACAAAAKEcAAAAEAEH4PQsBAQBBhz4LBQr/////AEG4PgsCvB4AQeA+CwEFAEGHPwsF//////8AQfTAAAsCzE0AQazBAAvbRF9wiQD/CS8P/UIAACROAAAkTgAAJE4AACROAAAkTgAAJE4AACROAAAkTgAAJE4AAH9/f39/f39/f39/f39/AAAobm8gbmFtZSkAc3RhY2sgdHJhY2ViYWNrOgAKCS4uLgkoc2tpcHBpbmcgJWQgbGV2ZWxzKQBTbG50AAoJJXM6IGluIAAKCSVzOiVkOiBpbiAACgkoLi4udGFpbCBjYWxscy4uLikAZnVuY3Rpb24gJyVzJwAlcyAnJXMnAG1haW4gY2h1bmsAZnVuY3Rpb24gPCVzOiVkPgBmAF9HLgBfVUJPWCoAdG9vIG1hbnkgdXB2YWx1ZXMAc3RhY2sgb3ZlcmZsb3cgKCVzKQBTbAAlczolZDogAG5vdCBlbm91Z2ggbWVtb3J5IGZvciBidWZmZXIgYWxsb2NhdGlvbgBidWZmZXIgdG9vIGxhcmdlAGJhZCBhcmd1bWVudCAjJWQgKCVzKQBjYWxsaW5nICclcycgb24gYmFkIHNlbGYgKCVzKQBiYWQgYXJndW1lbnQgIyVkIHRvICclcycgKCVzKQBsaWdodCB1c2VyZGF0YQAlcyBleHBlY3RlZCwgZ290ICVzACVzOiAlcwBpbnZhbGlkIG9wdGlvbiAnJXMnAG51bWJlciBoYXMgbm8gaW50ZWdlciByZXByZXNlbnRhdGlvbgA9c3RkaW4AQCVzAHJiAHJlb3BlbgDvu78AY2Fubm90ICVzICVzOiAlcwBvYmplY3QgbGVuZ3RoIGlzIG5vdCBhbiBpbnRlZ2VyACdfX3Rvc3RyaW5nJyBtdXN0IHJldHVybiBhIHN0cmluZwAlSQAlZgAlczogJXAAQG9mZgBAb24ATHVhIHdhcm5pbmc6IAAKAFBBTklDOiB1bnByb3RlY3RlZCBlcnJvciBpbiBjYWxsIHRvIEx1YSBBUEkgKCVzKQoAY29yZSBhbmQgbGlicmFyeSBoYXZlIGluY29tcGF0aWJsZSBudW1lcmljIHR5cGVzAHZlcnNpb24gbWlzbWF0Y2g6IGFwcC4gbmVlZHMgJWYsIEx1YSBjb3JlIHByb3ZpZGVzICVmAEx1YSA1LjQAX1ZFUlNJT04AYXNzZXJ0AGNvbGxlY3RnYXJiYWdlAGRvZmlsZQBlcnJvcgBpcGFpcnMAbG9hZGZpbGUAbmV4dABwYWlycwBwY2FsbABwcmludAB3YXJuAHJhd2VxdWFsAHJhd2xlbgByYXdnZXQAcmF3c2V0AHNlbGVjdAB0b251bWJlcgB0b3N0cmluZwB4cGNhbGwAYmFzZSBvdXQgb2YgcmFuZ2UAIAwKDQkLAF9fbWV0YXRhYmxlAGNhbm5vdCBjaGFuZ2UgYSBwcm90ZWN0ZWQgbWV0YXRhYmxlAGluZGV4IG91dCBvZiByYW5nZQB0YWJsZSBvciBzdHJpbmcAX19wYWlycwBidAA9KGxvYWQpAHRvbyBtYW55IG5lc3RlZCBmdW5jdGlvbnMAcmVhZGVyIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGEgc3RyaW5nAGNvbGxlY3QAaW5jcmVtZW50YWwAZ2VuZXJhdGlvbmFsAHN0b3AAcmVzdGFydABzZXRwYXVzZQBzZXRzdGVwbXVsAGlzcnVubmluZwBhc3NlcnRpb24gZmFpbGVkIQBvcGNvZGVzAGZ1bmN0aW9uIG9yIGV4cHJlc3Npb24gbmVlZHMgdG9vIG1hbnkgcmVnaXN0ZXJzAGNvbnN0YW50cwBjcmVhdGUAcmVzdW1lAHJ1bm5pbmcAc3RhdHVzAHdyYXAAeWllbGQAaXN5aWVsZGFibGUAY2Fubm90IGNsb3NlIGEgJXMgY29yb3V0aW5lAGRlYWQAc3VzcGVuZGVkAG5vcm1hbAB0b28gbWFueSBhcmd1bWVudHMgdG8gcmVzdW1lAHRvbyBtYW55IHJlc3VsdHMgdG8gcmVzdW1lAGdldHVzZXJ2YWx1ZQBnZXRob29rAGdldGluZm8AZ2V0bG9jYWwAZ2V0cmVnaXN0cnkAZ2V0bWV0YXRhYmxlAGdldHVwdmFsdWUAdXB2YWx1ZWpvaW4AdXB2YWx1ZWlkAHNldHVzZXJ2YWx1ZQBzZXRob29rAHNldGxvY2FsAHNldG1ldGF0YWJsZQBzZXR1cHZhbHVlAHRyYWNlYmFjawBzZXRjc3RhY2tsaW1pdABuaWwgb3IgdGFibGUAbGV2ZWwgb3V0IG9mIHJhbmdlAF9IT09LS0VZAGsAY291bnQAdGFpbCBjYWxsAGludmFsaWQgdXB2YWx1ZSBpbmRleABMdWEgZnVuY3Rpb24gZXhwZWN0ZWQAZmxuU3J0dQA+JXMAaW52YWxpZCBvcHRpb24Ac291cmNlAHNob3J0X3NyYwBsaW5lZGVmaW5lZABsYXN0bGluZWRlZmluZWQAd2hhdABjdXJyZW50bGluZQBudXBzAG5wYXJhbXMAaXN2YXJhcmcAbmFtZQBuYW1ld2hhdABmdHJhbnNmZXIAbnRyYW5zZmVyAGlzdGFpbGNhbGwAYWN0aXZlbGluZXMAZnVuYwBleHRlcm5hbCBob29rAGx1YV9kZWJ1Zz4gAGNvbnQKAD0oZGVidWcgY29tbWFuZCkAJXMKACh0ZW1wb3JhcnkpAChDIHRlbXBvcmFyeSkAKHZhcmFyZykAbWV0YW1ldGhvZABmb3IgaXRlcmF0b3IAb3JkZXIAaG9vawBpbnRlZ2VyIGluZGV4AGNvbnN0YW50AGZpZWxkAG1ldGhvZABnbG9iYWwAPVtDXQA9PwBtYWluAEx1YQBhdHRlbXB0IHRvICVzIGEgJXMgdmFsdWUlcwAlczolZDogJXMAICglcyAnJXMnKQBiYWQgJ2ZvcicgJXMgKG51bWJlciBleHBlY3RlZCwgZ290ICVzKQBjb25jYXRlbmF0ZQBudW1iZXIlcyBoYXMgbm8gaW50ZWdlciByZXByZXNlbnRhdGlvbgBhdHRlbXB0IHRvIGNvbXBhcmUgdHdvICVzIHZhbHVlcwBhdHRlbXB0IHRvIGNvbXBhcmUgJXMgd2l0aCAlcwBlcnJvciBpbiBlcnJvciBoYW5kbGluZwBzdGFjayBvdmVyZmxvdwBjYWxsAGNhbm5vdCByZXN1bWUgbm9uLXN1c3BlbmRlZCBjb3JvdXRpbmUAY2Fubm90IHJlc3VtZSBkZWFkIGNvcm91dGluZQBhdHRlbXB0IHRvIHlpZWxkIGFjcm9zcyBhIEMtY2FsbCBib3VuZGFyeQBhdHRlbXB0IHRvIHlpZWxkIGZyb20gb3V0c2lkZSBhIGNvcm91dGluZQBiaW5hcnkAdGV4dABhdHRlbXB0IHRvIGxvYWQgYSAlcyBjaHVuayAobW9kZSBpcyAnJXMnKQB2YXJpYWJsZSAnJXMnIGdvdCBhIG5vbi1jbG9zYWJsZSB2YWx1ZQBhdHRlbXB0IHRvIGNsb3NlIG5vbi1jbG9zYWJsZSB2YXJpYWJsZSAnJXMnAF9fY2xvc2UgbWV0YW1ldGhvZABfX2djIG1ldGFtZXRob2QAAQMDBAQFBl9HAHBhY2thZ2UAY29yb3V0aW5lAGlvAG9zAG1hdGgAdXRmOABkZWJ1ZwBfSU9faW5wdXQAc3RkaW4AX0lPX291dHB1dABzdGRvdXQAc3RkZXJyAEZJTEUqAGNhbm5vdCBjbG9zZSBzdGFuZGFyZCBmaWxlAHJlYWQAd3JpdGUAbGluZXMAZmx1c2gAc2VlawBzZXR2YnVmAG5vAGZ1bGwAbGluZQBhdHRlbXB0IHRvIHVzZSBhIGNsb3NlZCBmaWxlAGN1cgBub3QgYW4gaW50ZWdlciBpbiBwcm9wZXIgcmFuZ2UAc2V0AHRvbyBtYW55IGFyZ3VtZW50cwBmaWxlIGlzIGFscmVhZHkgY2xvc2VkAGludmFsaWQgZm9ybWF0ADAwAGVFAHBQAF9fdG9zdHJpbmcAZmlsZSAoY2xvc2VkKQBmaWxlICglcCkAaW5wdXQAb3BlbgBvdXRwdXQAcG9wZW4AdG1wZmlsZQBzdGFuZGFyZCAlcyBmaWxlIGlzIGNsb3NlZABjbG9zZWQgZmlsZQBmaWxlACdwb3Blbicgbm90IHN1cHBvcnRlZAB3AGNhbm5vdCBvcGVuIGZpbGUgJyVzJyAoJXMpAGludmFsaWQgbW9kZQBiAF9FTlYAYW5kAGRvAGVsc2UAZWxzZWlmAGVuZABmYWxzZQBmb3IAZ290bwBpZgBpbgBsb2NhbABub3QAb3IAcmVwZWF0AHJldHVybgB0aGVuAHRydWUAdW50aWwAd2hpbGUALy8ALi4APT0APj0APD0Afj0APDwAPj4AOjoAPGVvZj4APG51bWJlcj4APGludGVnZXI+ADxuYW1lPgA8c3RyaW5nPgAnJWMnACc8XCVkPicAJyVzJwAlcyBuZWFyICVzAGxleGljYWwgZWxlbWVudCB0b28gbG9uZwBpbnZhbGlkIGxvbmcgc3RyaW5nIGRlbGltaXRlcgB4WABFZQBQcAAtKwBtYWxmb3JtZWQgbnVtYmVyAHVuZmluaXNoZWQgc3RyaW5nAGludmFsaWQgZXNjYXBlIHNlcXVlbmNlAGRlY2ltYWwgZXNjYXBlIHRvbyBsYXJnZQBtaXNzaW5nICd7JwBVVEYtOCB2YWx1ZSB0b28gbGFyZ2UAbWlzc2luZyAnfScAaGV4YWRlY2ltYWwgZGlnaXQgZXhwZWN0ZWQAY29tbWVudAB1bmZpbmlzaGVkIGxvbmcgJXMgKHN0YXJ0aW5nIGF0IGxpbmUgJWQpAGNodW5rIGhhcyB0b28gbWFueSBsaW5lcwBwaQBodWdlAG1heGludGVnZXIAbWluaW50ZWdlcgByYW5kb20AcmFuZG9tc2VlZAB3cm9uZyBudW1iZXIgb2YgYXJndW1lbnRzAGludGVydmFsIGlzIGVtcHR5AGFicwBhY29zAGFzaW4AYXRhbgBjZWlsAGNvcwBkZWcAZXhwAHRvaW50ZWdlcgBmbG9vcgBmbW9kAHVsdABsb2cAbWF4AG1vZGYAcmFkAHNpbgBzcXJ0AHRhbgB0eXBlAGZsb2F0AGludGVnZXIAdmFsdWUgZXhwZWN0ZWQAemVybwB0b28gbWFueSAlcyAobGltaXQgaXMgJWQpAG1lbW9yeSBhbGxvY2F0aW9uIGVycm9yOiBibG9jayB0b28gYmlnAHBhdGgATFVBX1BBVEgAL3Vzci9sb2NhbC9zaGFyZS9sdWEvNS40Lz8ubHVhOy91c3IvbG9jYWwvc2hhcmUvbHVhLzUuNC8/L2luaXQubHVhOy91c3IvbG9jYWwvbGliL2x1YS81LjQvPy5sdWE7L3Vzci9sb2NhbC9saWIvbHVhLzUuNC8/L2luaXQubHVhOy4vPy5sdWE7Li8/L2luaXQubHVhAGNwYXRoAExVQV9DUEFUSAAvdXNyL2xvY2FsL2xpYi9sdWEvNS40Lz8uc287L3Vzci9sb2NhbC9saWIvbHVhLzUuNC9sb2FkYWxsLnNvOy4vPy5zbwAvCjsKPwohCi0KAGNvbmZpZwBfTE9BREVEAGxvYWRlZABfUFJFTE9BRABwcmVsb2FkAHJlcXVpcmUAc2VhcmNoZXJzACdwYWNrYWdlLnNlYXJjaGVycycgbXVzdCBiZSBhIHRhYmxlAG1vZHVsZSAnJXMnIG5vdCBmb3VuZDolcwAlcyVzAF81XzQAOzsATFVBX05PRU5WAAoJbm8gbW9kdWxlICclcycgaW4gZmlsZSAnJXMnAGVycm9yIGxvYWRpbmcgbW9kdWxlICclcycgZnJvbSBmaWxlICclcyc6CgklcwBfAGx1YW9wZW5fJXMAZHluYW1pYyBsaWJyYXJpZXMgbm90IGVuYWJsZWQ7IGNoZWNrIHlvdXIgTHVhIGluc3RhbGxhdGlvbgBfQ0xJQlMAJ3BhY2thZ2UuJXMnIG11c3QgYmUgYSBzdHJpbmcALwA/AAoJbm8gZmlsZSAnADsAJwoJbm8gZmlsZSAnACcAcgAKCW5vIGZpZWxkIHBhY2thZ2UucHJlbG9hZFsnJXMnXQA6cHJlbG9hZDoAbG9hZGxpYgBzZWFyY2hwYXRoAGFic2VudABpbml0AC54WG5OACUuMTRnAC0wMTIzNDU2Nzg5ACVwACUAaW52YWxpZCBvcHRpb24gJyUlJWMnIHRvICdsdWFfcHVzaGZzdHJpbmcnAC4uLgBbc3RyaW5nICIAIl0AY2xvY2sAZGF0ZQBkaWZmdGltZQBleGVjdXRlAGV4aXQAZ2V0ZW52AHJlbmFtZQBzZXRsb2NhbGUAdGltZQB0bXBuYW1lAHVuYWJsZSB0byBnZW5lcmF0ZSBhIHVuaXF1ZSBmaWxlbmFtZQB5ZWFyAG1vbnRoAGRheQBob3VyAG1pbgBzZWMAdGltZSByZXN1bHQgY2Fubm90IGJlIHJlcHJlc2VudGVkIGluIHRoaXMgaW5zdGFsbGF0aW9uAHlkYXkAd2RheQBpc2RzdABmaWVsZCAnJXMnIGlzIG5vdCBhbiBpbnRlZ2VyAGZpZWxkICclcycgbWlzc2luZyBpbiBkYXRlIHRhYmxlAGZpZWxkICclcycgaXMgb3V0LW9mLWJvdW5kAGFsbABjb2xsYXRlAGN0eXBlAG1vbmV0YXJ5AG51bWVyaWMAdGltZSBvdXQtb2YtYm91bmRzACVjAGRhdGUgcmVzdWx0IGNhbm5vdCBiZSByZXByZXNlbnRlZCBpbiB0aGlzIGluc3RhbGxhdGlvbgAqdABhQWJCY0NkRGVGZ0doSElqbU1ucHJSU3RUdVVWd1d4WHlZelolfHxFY0VDRXhFWEV5RVlPZE9lT0hPSU9tT01PU091T1VPVk93T1dPeQBpbnZhbGlkIGNvbnZlcnNpb24gc3BlY2lmaWVyICclJSVzJwBicmVhawBicmVhayBvdXRzaWRlIGxvb3AgYXQgbGluZSAlZABubyB2aXNpYmxlIGxhYmVsICclcycgZm9yIDxnb3RvPiBhdCBsaW5lICVkADxnb3RvICVzPiBhdCBsaW5lICVkIGp1bXBzIGludG8gdGhlIHNjb3BlIG9mIGxvY2FsICclcycAbGFiZWxzL2dvdG9zACVzIGV4cGVjdGVkAHN5bnRheCBlcnJvcgBjYW5ub3QgdXNlICcuLi4nIG91dHNpZGUgYSB2YXJhcmcgZnVuY3Rpb24Ac2VsZgA8bmFtZT4gb3IgJy4uLicgZXhwZWN0ZWQAbG9jYWwgdmFyaWFibGVzAGZ1bmN0aW9uIGF0IGxpbmUgJWQAbWFpbiBmdW5jdGlvbgB0b28gbWFueSAlcyAobGltaXQgaXMgJWQpIGluICVzAGZ1bmN0aW9ucwBpdGVtcyBpbiBhIGNvbnN0cnVjdG9yAGF0dGVtcHQgdG8gYXNzaWduIHRvIGNvbnN0IHZhcmlhYmxlICclcycAZnVuY3Rpb24gYXJndW1lbnRzIGV4cGVjdGVkAHVuZXhwZWN0ZWQgc3ltYm9sAGxhYmVsICclcycgYWxyZWFkeSBkZWZpbmVkIG9uIGxpbmUgJWQAbXVsdGlwbGUgdG8tYmUtY2xvc2VkIHZhcmlhYmxlcyBpbiBsb2NhbCBsaXN0AGNvbnN0AGNsb3NlAHVua25vd24gYXR0cmlidXRlICclcycAJz0nIG9yICdpbicgZXhwZWN0ZWQAKGZvciBzdGF0ZSkAY29udHJvbCBzdHJ1Y3R1cmUgdG9vIGxvbmcAJXMgZXhwZWN0ZWQgKHRvIGNsb3NlICVzIGF0IGxpbmUgJWQpAHVwdmFsdWVzAEMgc3RhY2sgb3ZlcmZsb3cAZXJyb3Igb2JqZWN0IGlzIG5vdCBhIHN0cmluZwBlcnJvciBpbiAAICgAKQBub3QgZW5vdWdoIG1lbW9yeQBhdHRlbXB0IHRvICVzIGEgJyVzJyB3aXRoIGEgJyVzJwBieXRlAGR1bXAAZmluZABmb3JtYXQAZ21hdGNoAGdzdWIAbG93ZXIAbWF0Y2gAcmVwAHJldmVyc2UAc3ViAHVwcGVyAHBhY2tzaXplAGRhdGEgc3RyaW5nIHRvbyBzaG9ydAB0b28gbWFueSByZXN1bHRzAHVuZmluaXNoZWQgc3RyaW5nIGZvciBmb3JtYXQgJ3onACVkLWJ5dGUgaW50ZWdlciBkb2VzIG5vdCBmaXQgaW50byBMdWEgSW50ZWdlcgBpbnZhbGlkIG5leHQgb3B0aW9uIGZvciBvcHRpb24gJ1gnAGZvcm1hdCBhc2tzIGZvciBhbGlnbm1lbnQgbm90IHBvd2VyIG9mIDIAbWlzc2luZyBzaXplIGZvciBmb3JtYXQgb3B0aW9uICdjJwBpbnZhbGlkIGZvcm1hdCBvcHRpb24gJyVjJwBpbnRlZ3JhbCBzaXplICglZCkgb3V0IG9mIGxpbWl0cyBbMSwlZF0AdmFyaWFibGUtbGVuZ3RoIGZvcm1hdABmb3JtYXQgcmVzdWx0IHRvbyBsYXJnZQB1bnNpZ25lZCBvdmVyZmxvdwBzdHJpbmcgbG9uZ2VyIHRoYW4gZ2l2ZW4gc2l6ZQBzdHJpbmcgbGVuZ3RoIGRvZXMgbm90IGZpdCBpbiBnaXZlbiBzaXplAHN0cmluZyBjb250YWlucyB6ZXJvcwByZXN1bHRpbmcgc3RyaW5nIHRvbyBsYXJnZQB0b28gbWFueSBjYXB0dXJlcwBpbnZhbGlkIGNhcHR1cmUgaW5kZXggJSUlZAB1bmZpbmlzaGVkIGNhcHR1cmUAcGF0dGVybiB0b28gY29tcGxleABtaXNzaW5nICdbJyBhZnRlciAnJSVmJyBpbiBwYXR0ZXJuAG1hbGZvcm1lZCBwYXR0ZXJuIChlbmRzIHdpdGggJyUlJykAbWFsZm9ybWVkIHBhdHRlcm4gKG1pc3NpbmcgJ10nKQBtYWxmb3JtZWQgcGF0dGVybiAobWlzc2luZyBhcmd1bWVudHMgdG8gJyUlYicpAGludmFsaWQgcGF0dGVybiBjYXB0dXJlAF4kKis/LihbJS0Ac3RyaW5nL2Z1bmN0aW9uL3RhYmxlAGludmFsaWQgcmVwbGFjZW1lbnQgdmFsdWUgKGEgJXMpAGludmFsaWQgdXNlIG9mICclYycgaW4gcmVwbGFjZW1lbnQgc3RyaW5nAGxsAHNwZWNpZmllciAnJSVxJyBjYW5ub3QgaGF2ZSBtb2RpZmllcnMAaW52YWxpZCBjb252ZXJzaW9uICclcycgdG8gJ2Zvcm1hdCcAMHglbGx4ACVsbGQAdmFsdWUgaGFzIG5vIGxpdGVyYWwgZm9ybQAlYQAxZTk5OTkALTFlOTk5OQAoMC8wKQAlcwBcJWQAXCUwM2QALSsgIzAAaW52YWxpZCBmb3JtYXQgKHJlcGVhdGVkIGZsYWdzKQBpbnZhbGlkIGZvcm1hdCAod2lkdGggb3IgcHJlY2lzaW9uIHRvbyBsb25nKQB1bmFibGUgdG8gZHVtcCBnaXZlbiBmdW5jdGlvbgBpbnZhbGlkIGtleSB0byAnbmV4dCcAdGFibGUgaW5kZXggaXMgbmlsAHRhYmxlIGluZGV4IGlzIE5hTgB0YWJsZSBvdmVyZmxvdwBjb25jYXQAaW5zZXJ0AHBhY2sAdW5wYWNrAHJlbW92ZQBtb3ZlAHNvcnQAYXJyYXkgdG9vIGJpZwBpbnZhbGlkIG9yZGVyIGZ1bmN0aW9uIGZvciBzb3J0aW5nAHRvbyBtYW55IGVsZW1lbnRzIHRvIG1vdmUAZGVzdGluYXRpb24gd3JhcCBhcm91bmQAcG9zaXRpb24gb3V0IG9mIGJvdW5kcwB0b28gbWFueSByZXN1bHRzIHRvIHVucGFjawBuAHdyb25nIG51bWJlciBvZiBhcmd1bWVudHMgdG8gJ2luc2VydCcAaW52YWxpZCB2YWx1ZSAoJXMpIGF0IGluZGV4ICVkIGluIHRhYmxlIGZvciAnY29uY2F0JwBubyB2YWx1ZQBuaWwAYm9vbGVhbgB1c2VyZGF0YQBudW1iZXIAc3RyaW5nAHRhYmxlAGZ1bmN0aW9uAHRocmVhZAB1cHZhbHVlAHByb3RvAF9faW5kZXgAX19uZXdpbmRleABfX2djAF9fbW9kZQBfX2xlbgBfX2VxAF9fYWRkAF9fc3ViAF9fbXVsAF9fbW9kAF9fcG93AF9fZGl2AF9faWRpdgBfX2JhbmQAX19ib3IAX19ieG9yAF9fc2hsAF9fc2hyAF9fdW5tAF9fYm5vdABfX2x0AF9fbGUAX19jb25jYXQAX19jYWxsAF9fY2xvc2UAX19uYW1lAHBlcmZvcm0gYml0d2lzZSBvcGVyYXRpb24gb24AcGVyZm9ybSBhcml0aG1ldGljIG9uAGJpbmFyeSBzdHJpbmcAdHJ1bmNhdGVkIGNodW5rACVzOiBiYWQgYmluYXJ5IGZvcm1hdCAoJXMpAGJhZCBmb3JtYXQgZm9yIGNvbnN0YW50IHN0cmluZwBpbnRlZ2VyIG92ZXJmbG93ABtMdWEAbm90IGEgYmluYXJ5IGNodW5rAHZlcnNpb24gbWlzbWF0Y2gAZm9ybWF0IG1pc21hdGNoABmTDQoaCgBjb3JydXB0ZWQgY2h1bmsASW5zdHJ1Y3Rpb24AbHVhX0ludGVnZXIAbHVhX051bWJlcgBpbnRlZ2VyIGZvcm1hdCBtaXNtYXRjaABmbG9hdCBmb3JtYXQgbWlzbWF0Y2gAJXMgc2l6ZSBtaXNtYXRjaABbAC1/wi39XVuALb9dKgBjaGFycGF0dGVybgBvZmZzZXQAY29kZXBvaW50AGNoYXIAbGVuAGNvZGVzAGludmFsaWQgVVRGLTggY29kZQBpbml0aWFsIHBvc2l0aW9uIG91dCBvZiBzdHJpbmcAZmluYWwgcG9zaXRpb24gb3V0IG9mIHN0cmluZwB2YWx1ZSBvdXQgb2YgcmFuZ2UAJVUAb3V0IG9mIHJhbmdlAHN0cmluZyBzbGljZSB0b28gbG9uZwBwb3NpdGlvbiBvdXQgb2YgcmFuZ2UAaW5pdGlhbCBwb3NpdGlvbiBpcyBhIGNvbnRpbnVhdGlvbiBieXRlAGluZGV4ACdfX2luZGV4JyBjaGFpbiB0b28gbG9uZzsgcG9zc2libGUgbG9vcAAnX19uZXdpbmRleCcgY2hhaW4gdG9vIGxvbmc7IHBvc3NpYmxlIGxvb3AAc3RyaW5nIGxlbmd0aCBvdmVyZmxvdwBnZXQgbGVuZ3RoIG9mAGF0dGVtcHQgdG8gZGl2aWRlIGJ5IHplcm8AYXR0ZW1wdCB0byBwZXJmb3JtICduJSUwJwAnZm9yJyBzdGVwIGlzIHplcm8AbGltaXQAc3RlcABpbml0aWFsIHZhbHVlAGxvYWQAV0FMVUFfQ09NUElMRQBXQUxVQV9TVEVQAC0rICAgMFgweAAobnVsbCkALTBYKzBYIDBYLTB4KzB4IDB4AGluZgBJTkYATkFOAGluZmluaXR5AG5hbgBMQ19BTEwATEFORwBDLlVURi04AFBPU0lYAE1VU0xfTE9DUEFUSAAuAEMAcndhAHcrAI2BAQRuYW1lAYSBAf4IAAdfZ2V0ZW52AQlfX191bmxvY2sCDV9fX3N5c2NhbGwyMjEDBWFib3J0BAVfdGltZQULc2V0VGVtcFJldDAGC2dldFRlbXBSZXQwBwhfbG9uZ2ptcAgLX19fc3lzY2FsbDYJB19fX2xvY2sKB2Y2NC1yZW0LBl9jbG9jawwMX19fc3lzY2FsbDU0DQtfX19zeXNjYWxsNQ4NX19fc3lzY2FsbDE0Ng8MX19fc3lzY2FsbDEwEAtfX19zZXRFcnJObxEKaW52b2tlX3ZpaRIXYWJvcnRPbkNhbm5vdEdyb3dNZW1vcnkTB19zeXN0ZW0UCV9zdHJmdGltZRUHX21rdGltZRYKX2xvY2FsdGltZRcOX2xsdm1fbG9nMl9mNjQYD19sbHZtX2xvZzEwX2Y2NBkHX2dtdGltZRoFX2V4aXQbF19lbXNjcmlwdGVuX3Jlc2l6ZV9oZWFwHBZfZW1zY3JpcHRlbl9tZW1jcHlfYmlnHRlfZW1zY3JpcHRlbl9nZXRfaGVhcF9zaXplHglfZGlmZnRpbWUfBl9hYm9ydCAMX19fc3lzY2FsbDkxIQxfX19zeXNjYWxsNjMiDF9fX3N5c2NhbGw0MCMMX19fc3lzY2FsbDM4JA1fX19zeXNjYWxsMzMwJQ1fX19zeXNjYWxsMTk2Jg1fX19zeXNjYWxsMTQ1Jw1fX19zeXNjYWxsMTQwKAtfX19tYXBfZmlsZSkQX19fY2xvY2tfZ2V0dGltZSoTX19fYnVpbGRFbnZpcm9ubWVudCsLX2x1YV9zZXR0b3AsAmIwLQ9fbHVhR190cmFjZWV4ZWMuC19sdWFMX2Vycm9yLwlfbHVhX3R5cGUwD19sdWFfcHVzaHN0cmluZzEOX2x1YUxfYXJnZXJyb3IyEl9sdWFMX2NoZWNrbHN0cmluZzMOX2x1YV9wdXNodmFsdWU0EF9sdWFfcHVzaGludGVnZXI1Cl9sdWFaX2ZpbGw2DF9pbmRleDJ2YWx1ZTcNX2x1YV9zZXRmaWVsZDgSX2x1YUxfY2hlY2tpbnRlZ2VyOQdfc3RyY2hyOgxfbHVhX3B1c2huaWw7Dl9sdWFfdG9sc3RyaW5nPA5fbHVhS19jb2RlQUJDaz0QX2x1YUxfb3B0aW50ZWdlcj4RX3JlYWxseW1hcmtvYmplY3Q/Cl9sdWFYX25leHRAB19tZW1jcHlBEl9sdWFMX3ByZXBidWZmc2l6ZUILX2x1YV9yb3RhdGVDBV9zYXZlRBBfbHVhX3B1c2hmc3RyaW5nRQtfbHVhX2dldHRvcEYLX2x1YU1fZnJlZV9HEF9sdWFfcHVzaGJvb2xlYW5IDV9sdWFfZ2V0ZmllbGRJEV9sdWFWX3RvaW50ZWdlcm5zSg5fbHVhR19ydW5lcnJvcksKX2x1YUNfc3RlcEwPX2x1YV9wdXNobnVtYmVyTRFfbHVhTF9jaGVja251bWJlck4HX3N0cmxlbk8RX2x1YU9fcHVzaGZzdHJpbmdQCV9fX3NoZ2V0Y1EJX2x1YV9nZXRpUgRfb3V0Uw5fbHVhTF9jaGVja2FueVQQX2x1YUtfZXhwMmFueXJlZ1UJX3Rlc3RuZXh0VghfcGFkXzY2OVcQX2x1YV9jcmVhdGV0YWJsZVgIX0R1bXBJbnRZB19zdHJjbXBaDl9sdWFfdG9ib29sZWFuWxBfbHVhTF9wdXNocmVzdWx0XBBfbHVhTF9vcHRsc3RyaW5nXQ5fbHVhTF9idWZmaW5pdF4MX2x1YUhfZ2V0aW50Xw1fbHVhU19uZXdsc3RyYA5fbHVhTF9zZXRmdW5jc2EPX2x1YUxfY2hlY2t0eXBlYg9fbHVhX3RvaW50ZWdlcnhjCl9sdWFfY2FsbGtkEF9sdWFMX2FkZGxzdHJpbmdlC19sdWFEX3Rocm93Zg5fbHVhQ19iYXJyaWVyX2cIX0xvYWRJbnRoCV9zbnByaW50ZmkNX25ld19sb2NhbHZhcmoRX2x1YVhfc3ludGF4ZXJyb3JrCV9pbml0X2V4cGwKX2NoZWNrbmV4dG0NX2x1YU1fbWFsbG9jX24QX2x1YUxfZmlsZXJlc3VsdG8SX2x1YUNfYmFycmllcmJhY2tfcAdfZmZsdXNocQlfRHVtcEJ5dGVyEV9sdWFLX2V4cDJuZXh0cmVncw5fX19zeXNjYWxsX3JldHQJX0xvYWRCeXRldQpfbHVhX3htb3Zldg9fbHVhWV9udmFyc3RhY2t3D19sdWFYX25ld3N0cmluZ3gOX2x1YUxfYWRkdmFsdWV5C19sdWFGX2Nsb3Nleg5fc3RyX2NoZWNrbmFtZXsHX3NjYWxibnwHX21lbWNocn0QX2x1YV9wdXNobHN0cmluZ34RX2x1YV9wdXNoY2Nsb3N1cmV/Dl9sdWFfaXNpbnRlZ2VygAENX2x1YV9nZXRzdGFja4EBEV9sdWFLX3Jlc2VydmVyZWdzggEKX2x1YUtfanVtcIMBE19sdWFLX2Rpc2NoYXJnZXZhcnOEAQ9fbHVhSF9yZWFsYXNpemWFARBfZ2V0bG9jYWx2YXJkZXNjhgEIX2ZyZWVleHCHAQZfZXJyb3KIAQxfY2hlY2tfbmV4dDGJAQdfdG9maWxligEGX21hdGNoiwEJX2x1YV9zZXRpjAESX2x1YVZfZmx0dG9pbnRlZ2VyjQEQX2x1YVRfZ2V0dG1ieW9iao4BCV9sdWFTX25ld48BDl9sdWFNX2dyb3dhdXhfkAETX2x1YUxfY2hlY2t2ZXJzaW9uX5EBD19sdWFMX2FkZHN0cmluZ5IBEV9sdWFIX2dldHNob3J0c3RykwEPX2x1YURfZ3Jvd3N0YWNrlAEKX2x1YURfY2FsbJUBCV9sZXhlcnJvcpYBC19sZWF2ZWJsb2NrlwEFX2V4cHKYAQtfZW50ZXJibG9ja5kBBl9kaWdpdJoBDF9jaGVja19tYXRjaJsBCl9EdW1wQmxvY2ucAQlfc2V0ZmllbGSdAQdfbWVtc2V0ngENX2x1YV90eXBlbmFtZZ8BD19sdWFfdG91c2VyZGF0YaABB19sdWFfZ2OhAQ9fbHVhVl9maW5pc2hnZXSiAQtfbHVhVF9nZXR0baMBDF9sdWFNX3Rvb2JpZ6QBEF9sdWFMX2NoZWNrc3RhY2ulARFfbHVhS19wYXRjaHRvaGVyZaYBDV9sdWFLX2ZpeGxpbmWnAQxfbHVhQ19uZXdvYmqoAQVfZ2V0Y6kBBl9hcml0aKoBEF9hZGp1c3Rsb2NhbHZhcnOrAQJiNKwBCl90b251bWVyYWytAQZfc3dhcGOuAQtfc3RhY2tsZXZlbK8BCl9zb3J0X2NvbXCwAQlfc2V0dGFic2mxAQVfc2Jya7IBB19tZW1jbXCzAQdfbWFsbG9jtAERX2x1YV9zZXRtZXRhdGFibGW1AQlfbHVhX2NvcHm2ARNfbHVhTV9zaHJpbmt2ZWN0b3JftwEPX2x1YUxfdHlwZWVycm9yuAESX2x1YUxfZ2V0bWV0YWZpZWxkuQEQX2x1YUxfY2hlY2t1ZGF0YboBDl9sdWFLX2dldGxhYmVsuwEJX2x1YUhfZ2V0vAERX2x1YURfc2V0ZXJyb3JvYmq9AQ1fbHVhRF9wb3NjYWxsvgERX2x1YURfY2FsbG5veWllbGS/ARFfbHVhQ19ydW50aWxzdGF0ZcABCF9mcmVlcmVnwQEKX0xvYWRCbG9ja8IBAmIywwEGX3Rlc3QyxAEJX3N3YXBleHBzxQEFX3NldDLGAQxfbHVhX3Jhd2dldGnHAQ9fbHVhVl90b251bWJlcl/IAQxfbHVhVl9zaGlmdGzJAQ9fbHVhVl9maW5pc2hzZXTKAQ5fbHVhVF90cnliaW5UTcsBCV9sdWFMX2xlbswBDl9sdWFLX3NlbWVycm9yzQEPX2x1YUtfcGF0Y2hsaXN0zgEMX2x1YUtfY29uY2F0zwEKX2x1YUtfY29kZdABCV9sdWFIX25ld9EBD19sdWFHX3R5cGVlcnJvctIBDV9sdWFFX3dhcm5pbmfTAQ1fbHVhRV9zZXRkZWJ01AEKX2dldHRocmVhZNUBCV9nZXRmaWVsZNYBBV9mcmVl1wEGX2ZtdF912AEHX2ZjbG9zZdkBCV9lc2NjaGVja9oBCV9jaGVja3RhYtsBDF9hZGRzdHIyYnVmZtwBC191X3Bvc3JlbGF03QEJX3N3ZWVwZ2Vu3gEJX3N0YXRsaXN03wENX3Byb3BhZ2F0ZWFsbOABCl9wb3NyZWxhdEnhAQtfbHVhX3Jhd2dldOIBEl9sdWFfbmV3dXNlcmRhdGF1duMBDV9sdWFfaXNzdHJpbmfkARFfbHVhX2dldG1ldGF0YWJsZeUBDF9sdWFfZ2V0aW5mb+YBD19sdWFfY2hlY2tzdGFja+cBDl9sdWFWX2VxdWFsb2Jq6AEMX2x1YVZfY29uY2F06QESX2x1YU1fc2FmZXJlYWxsb2Nf6gEUX2x1YUxfcHVzaHJlc3VsdHNpemXrARFfbHVhTF9nZXRzdWJ0YWJsZewBEl9sdWFMX2J1ZmZpbml0c2l6Ze0BDF9sdWFLX2V4cDJSS+4BDV9sdWFLX2NvZGVBQnjvAQxfbHVhSF9zZXRpbnTwAQlfbHVhSF9zZXTxAQxfbHVhSF9yZXNpemXyARFfbHVhR19nZXRmdW5jbGluZfMBDl9sdWFHX2Vycm9ybXNn9AEVX2x1YURfcmF3cnVucHJvdGVjdGVk9QEKX2x1YURfaG9va/YBCl9pc2NsZWFyZWT3AQ5faW5jbGluZW51bWJlcvgBCV9nZXR0YWJsZfkBBl9mcHV0c/oBBl9mb3BlbvsBEF9maW5pc2hiaW5leHB2YWz8AQhfZXhwbGlzdP0BCV9jb2RlQUJSS/4BCV9jbGVhcmtlef8BC19jaGVja3N0YWNrgAINX2Jsb2NrX2ZvbGxvd4ECBV9hZGRrggIGX19fc2lugwIGX19fY29zhAILX0R1bXBTdHJpbmeFAgpfdGFnX2Vycm9yhgIMX3RhYmxlcmVoYXNohwIHX3N0cnNwbogCCV9zZXR0YWJzc4kCCV9zZXRwYXVzZYoCDV9yZXN1bWVfZXJyb3KLAg5fcHVzaF9jYXB0dXJlc4wCDV9wcmVwYnVmZnNpemWNAg5fbHVhX3RvbnVtYmVyeI4CD19sdWFfcHVzaHRocmVhZI8CC19sdWFfY29uY2F0kAIMX2x1YV9jb21wYXJlkQIPX2x1YVhfdG9rZW4yc3RykgIRX2x1YVRfb2JqdHlwZW5hbWWTAhJfbHVhVF9jYWxsb3JkZXJpVE2UAg9fbHVhVF9jYWxsVE1yZXOVAg5fbHVhT190b3N0cmluZ5YCDV9sdWFPX3N0cjJudW2XAhJfbHVhT19wdXNodmZzdHJpbmeYAg5fbHVhTV9yZWFsbG9jX5kCD19sdWFMX3RvbHN0cmluZ5oCEV9sdWFMX2NoZWNrb3B0aW9umwIOX2x1YUtfc3RvcmV2YXKcAhBfbHVhS19zZXRyZXR1cm5znQINX2x1YUtfaW5kZXhlZJ4CDl9sdWFHX2ZvcmVycm9ynwIOX2x1YUZfbmV3cHJvdG+gAhJfbHVhRl9nZXRsb2NhbG5hbWWhAgxfbHVhRV9mcmVlQ0miAhBfbHVhRV9lbnRlckNjYWxsowILX2x1YURfcGNhbGykAglfbHVhQ19maXilAghfaXNhbG51baYCC19pc1NDbnVtYmVypwILX2dldG9iam5hbWWoAgxfZ2V0bnVtbGltaXSpAghfZ2V0anVtcKoCCl9nZXRnY2xpc3SrAgZfZ2V0Y2+sAghfZnJlZW9iaq0CCF9mcHJpbnRmrgIIX2ZpeGp1bXCvAgZfZml0c0OwAgpfY3VycmVudHBjsQIQX2NvcnJlY3RncmF5bGlzdLICCV9jb25kanVtcLMCC19jb2Rlc3RyaW5ntAIOX2NvZGViaW5leHB2YWy1Ag5fY2xlYXJieXZhbHVlc7YCBl9ibG9ja7cCB19hdG9taWO4AghfX191Zmxvd7kCDF9fX3N0cmNocm51bLoCDF9Mb2FkU3RyaW5nTrsCCl93aGl0ZWxpc3S8AgxfdXRmOF9kZWNvZGW9AgpfdXB2YWxuYW1lvgIKX3N3ZWVwc3RlcL8CCl9zd2VlcDJvbGTAAgxfc3VmZml4ZWRleHDBAghfc3ViZXhwcsICB19zdHJzdHLDAglfc3RyZXJyb3LEAgdfc3RyY3B5xQIJX3NraXBfc2VwxgINX3NpbmdsZXZhcmF1eMcCDF9zaW5nbGVtYXRjaMgCDV9zZXRtaW5vcmRlYnTJAghfcmV2ZXJzZcoCCl9yZXNpemVib3jLAgxfcmVwcmVwc3RhdGXMAgtfcmVhZGRpZ2l0c80CCl9yZWFkX2xpbmXOAgtfcHVzaG51bWludM8CDF9wcmludGZfY29yZdACCl9wcmVwc3RhdGXRAhJfcHJlcGNsb3NpbmdtZXRob2TSAgRfcG930wINX3BhdGNobGlzdGF1eNQCCF9wYWNraW501QIJX25leHRyYW5k1gILX25ld3ByZWZpbGXXAg1fbmV3Z290b2VudHJ52AIIX25ld2ZpbGXZAhJfbWF0Y2hicmFja2V0Y2xhc3PaAgpfbWFya3VwdmFs2wINX2x1YV90b3RocmVhZNwCE19sdWFfc3RyaW5ndG9udW1iZXLdAgxfbHVhX3Jhd3NldGneAgtfbHVhX3Jhd2xlbt8CDV9sdWFfcmF3ZXF1YWzgAgtfbHVhX3BjYWxsa+ECCV9sdWFfbmV4dOICCV9sdWFfbG9hZOMCDl9sdWFfZ2V0Z2xvYmFs5AINX2x1YV9hYnNpbmRleOUCCl9sdWFWX21vZGbmAglfbHVhVl9tb2TnAgpfbHVhVl9pZGl26AINX2x1YVZfZXhlY3V0ZekCEV9sdWFUX2NhbGxvcmRlclRN6gIKX2x1YVNfaGFzaOsCFV9sdWFTX2NyZWF0ZWxuZ3N0cm9iauwCD19sdWFPX2hleGF2YWx1Ze0CDl9sdWFPX2NlaWxsb2cy7gILX2x1YUxfd2hlcmXvAg9fbHVhTF9sb2FkZmlsZXjwAg1fbHVhTF9hZGRnc3Vi8QINX2x1YUtfc2V0bGlzdPICDF9sdWFLX2lzS2ludPMCDl9sdWFLX2dvaWZ0cnVl9AILX2x1YUtfY29kZWv1AgxfbHVhSF9uZXdrZXn2AgxfbHVhSF9nZXRzdHL3Ag9fbHVhR19maW5kbG9jYWz4AhFfbHVhRl9uZXd0YmN1cHZhbPkCEV9sdWFGX25ld0xjbG9zdXJl+gIRX2x1YURfc2hyaW5rc3RhY2v7AhJfbHVhRF9yZWFsbG9jc3RhY2v8AgxfbHVhRF9pbmN0b3D9AgxfbHVhQ19mdWxsZ2P+AhBfbHVhQ19jaGFuZ2Vtb2Rl/wIMX2xvb2tmb3JmdW5jgAMEX2xvZ4EDDF9sX2NoZWNrdGltZYIDBl9rbmFtZYMDCF9pc3NwYWNlhAMIX2lzbG93ZXKFAwhfaXNTQ2ludIYDC19pbml0aGVhZGVyhwMMX2luZGV4MnN0YWNriAMEX2d4ZokDDF9nZXR1cHZhbHJlZooDD19nZXRqdW1wY29udHJvbIsDCl9nZXRpb2ZpbGWMAwhfZ2V0aGV4YY0DC19nZXRnZW5lcmljjgMLX2dldGRldGFpbHOPAwhfZ2V0YnVmZpADB19nX3JlYWSRAwdfZndyaXRlkgMGX2ZyZXhwkwMJX2ZyZWVoYXNolAMJX2ZyZWVleHBzlQMGX2ZyZWFklgMMX2ZpbmlzaHBjYWxslwMKX2ZpbmRsYWJlbJgDCV9maW5kZmlsZZkDCV9maWVsZHNlbJoDC19mY2hlY2tzaXplmwMIX2V4cDJyZWecAwVfZXhwMZ0DEV9leGNoYW5nZWhhc2hwYXJ0ngMIX2VycmZpbGWfAwtfZW50ZXJzd2VlcKADCV9lbnRlcmluY6EDC19kZWxldGVsaXN0ogMOX2NyZWF0ZXN0ZGZpbGWjAwlfY29kZW5hbWWkAwlfY29kZWJpbmmlAwpfY2xlYXJidWZmpgMLX2NoZWNrdXB2YWynAwpfY2hlY2tsb2FkqAMLX2NoZWNrbGltaXSpAwtfY2hlY2tmaWVsZKoDDF9jaGVja19uZXh0MqsDBl9jaGVja6wDCl9jYWxsY2xvc2WtAwpfY2FsbGJpblRNrgMFX2JvZHmvAwhfYXV4c29ydLADCl9hdXhfbGluZXOxAwpfYXV4X2Nsb3NlsgMOX2FkanVzdF9hc3NpZ26zAwxfYWRkbnVtMmJ1Zma0AwpfYWRkbGVubW9ktQMJX19fdG9yZWFktgMIX19fc2hsaW23AwtfX19yZW1fcGlvMrgDC19fX29mbF9sb2NruQMSX19fZmZsdXNoX3VubG9ja2VkugMJX0R1bXBTaXpluwMCYjO8AwdfeWluZGV4vQMHX3djdG9tYr4DCV92ZnByaW50Zr8DCF92YXJpbmZvwAMJX3ZhcmVycm9ywQMHX3Vucm9sbMIDCl91bnBhY2tpbnTDAwdfdW5nZXRjxAMJX3RyeWFnYWluxQMRX3RyZWF0c3RhY2tvcHRpb27GAxJfdHJhdmVyc2VlcGhlbWVyb27HAwtfdG91c2VyZGF0YcgDCF90b3VwcGVyyQMNX3Rvc3RyaW5nYnVmZsoDBl90b251bcsDCF90b2xvd2VyzAMQX3Rlc3RfdGhlbl9ibG9ja80DC190ZXN0U2V0am1wzgMMX3N3ZWVwdG9saXZlzwMKX3N3ZWVwbGlzdNADCF9zdHJwYnJr0QMIX3N0cmluZ0vSAwhfc3RyY29sbNMDDV9zdHJfZmluZF9hdXjUAwZfc3RyMkvVAwpfc3RhdGVtZW501gMOX3N0YXJ0X2NhcHR1cmXXAwtfc3RhY2tfaW5pdNgDDF9za2lwY29tbWVudNkDCl9zaW5nbGV2YXLaAwtfc2luZ2xlc3RlcNsDCl9zZXR2YXJhcmfcAwlfc2V0dGFic2LdAwhfc2V0c2VlZN4DCF9zZXRwYXRo3wMOX3NldG5vZGV2ZWN0b3LgAxdfc2V0bG9jYWxlX29uZV91bmxvY2tlZOEDD19zZXRsaW1pdHRvc2l6ZeIDDV9zZXRhbGxmaWVsZHPjAxBfc2VwYXJhdGV0b2JlZm565AMLX3NlYXJjaHBhdGjlAwhfc2NhbmV4cOYDCF9zY2FsYm5s5wMNX3NhdmVsaW5laW5mb+gDC19zYXZlU2V0am1w6QMFX3JvdGzqAwZfcm5hbWXrAwtfcmVzdGFzc2lnbuwDDV9yZW1vdmV2YWx1ZXPtAxNfcmVtb3ZlbGFzdGxpbmVpbmZv7gMJX3JlY2ZpZWxk7wMIX3JlYWxsb2PwAw1fcmVhZF9udW1lcmFs8QMRX3JlYWRfbG9uZ19zdHJpbmfyAwlfcmFuZHNlZWTzAwxfcHVzaHV0ZmNoYXL0AwhfcHVzaHN0cvUDCV9wdXNobW9kZfYDE19wdXNoZ2xvYmFsZnVuY25hbWX3AxBfcHVzaF9vbmVjYXB0dXJl+AMOX3Byb3BhZ2F0ZW1hcmv5AxRfcHJldmlvdXNpbnN0cnVjdGlvbvoDD19wcmVpbml0X3RocmVhZPsDCF9wb3BfYXJn/AMNX3BhdGNodGVzdHJlZ/0DCl9vcGVuY2hlY2v+Awpfb3Blbl9mdW5j/wMJX251bWFyaXRogAQGX25leHRjgQQJX25ld3VwdmFsggQOX25ld2xhYmVsZW50cnmDBBBfbmVnYXRlY29uZGl0aW9uhAQLX25lZWRfdmFsdWWFBAxfbWF0Y2hfY2xhc3OGBAhfbWFya29sZIcEB19tYXJrbXSIBA1fbWFya2JlaW5nZm56iQQPX21haW5wb3NpdGlvblRWigQNX21haW5wb3NpdGlvbosEDF9sdWFfd2FybmluZ4wEDl9sdWFfdG9wb2ludGVyjQQPX2x1YV9zZXR1cHZhbHVljgQQX2x1YV9yZXNldHRocmVhZI8EC19sdWFfcmF3c2V0kAQNX2x1YV9uZXdzdGF0ZZEEEF9sdWFfaXNjZnVuY3Rpb26SBA9fbHVhX2dldHVwdmFsdWWTBA1fbHVhX2dldGxvY2FslAQPX2x1YVhfbG9va2FoZWFklQQPX2x1YVZfdG9pbnRlZ2VylgQMX2x1YVZfb2JqbGVulwQTX2x1YVRfdHJ5YmluYXNzb2NUTZgEDF9sdWFTX3Jlc2l6ZZkEDl9sdWFTX2VxbG5nc3RymgQNX2x1YU9fdXRmOGVzY5sEDl9sdWFPX3Jhd2FyaXRonAQNX2x1YU9fY2h1bmtpZJ0ED19sdWFMX3Rlc3R1ZGF0YZ4EEl9sdWFMX25ld21ldGF0YWJsZZ8EEV9sdWFMX2xvYWRidWZmZXJ4oAQKX2x1YUxfZ3N1YqEEEF9sdWFMX2V4ZWNyZXN1bHSiBA9fbHVhS19zZXRvbmVyZXSjBAlfbHVhS19yZXSkBA1fbHVhS19udW1iZXJLpQQJX2x1YUtfbmlspgQKX2x1YUtfaW50S6cECV9sdWFLX2ludKgED19sdWFLX2dvaWZmYWxzZakEEl9sdWFLX2V4cDJhbnlyZWd1cKoEC19sdWFLX2V4cDJLqwQOX2x1YUtfY29kZUFzQnisBBBfbHVhS19jaGVja3N0YWNrrQQKX2x1YUhfZ2V0bq4EEF9sdWFHX29waW50ZXJyb3KvBA1fbHVhR19hZGRpbmZvsAQRX2x1YUZfdW5saW5rdXB2YWyxBA9fbHVhRV93YXJuZXJyb3KyBA5fbHVhRV9leHRlbmRDSbMED19sdWFEX3RyeWZ1bmNUTbQEDl9sdWFEX2hvb2tjYWxstQQUX2x1YUNfY2hlY2tmaW5hbGl6ZXK2BAtfbHVhQl9lcnJvcrcEDl9sdWFCX2NvY3JlYXRluAQPX2xvY2FsZGVidWdpbmZvuQQJX2xvYWRmdW5jugQJX2xvYWRfYXV4uwQFX2xsZXi8BApfbGlzdGZpZWxkvQQPX2xlc3N0aGFub3RoZXJzvgQQX2xlc3NlcXVhbG90aGVyc78ECV9sX3N0cmNtcMAEC19sX3N0cjJkbG9jwQQLX2p1bXBvbmNvbmTCBAlfaXRlcl9hdXjDBAlfaXN4ZGlnaXTEBAhfaXN1cHBlcsUEEF9pc3BvdzJyZWFsYXNpemXGBAhfaXNncmFwaMcECF9pc2NudHJsyAQIX2lzYWxwaGHJBAdfaXNLc3RyygQJX2ludGFyaXRoywQKX2dldG9wdGlvbswEB19nZXRudW3NBBBfZ2V0bmV4dGZpbGVuYW1lzgQHX2dldGludM8ECl9nZXRlbmRwb3PQBA9fZ2V0X29uZWNhcHR1cmXRBAhfZ193cml0ZdIECV9nX2lvZmlsZdMECV9mdW5jYXJnc9QECF9mdWxsZ2Vu1QQKX2ZyZWVzdGFja9YECV9mcmVlcmVnc9cEBl9mcHV0Y9gECF9mb3Jib2R52QQGX2Ztb2Rs2gQLX2ZpeGZvcmp1bXDbBAdfZml0c0J43AQNX2ZpbmlzaHJhd2dldN0ED19maW5pc2hnZW5jeWNsZd4EEF9maW5pc2hiaW5leHBuZWffBAxfZmluaXNoQ2NhbGzgBApfZmluZGZpZWxk4QQGX2ZnZXRz4gQHX2ZlcnJvcuMECF9mX2Nsb3Nl5AQPX2Vycm9yX2V4cGVjdGVk5QQJX2VxdWFsa2V55gQJX2VudGVyZ2Vu5wQLX2RvZmlsZWNvbnToBA5fZGlzcG9zZV9jaHVua+kEDl9kaXNjaGFyZ2UycmVn6gQRX2Rpc2NoYXJnZTJhbnlyZWfrBAxfY3VycmVudGxpbmXsBA1fY3JlYXRlc3Ryb2Jq7QQMX2NyZWF0ZWxhYmVs7gQJX2NvdW50aW507wQPX2NvcHl3aXRoZW5kaWFu8AQKX2NvcHlzaWdubPEECl9jb3B5MmJ1ZmbyBBNfY29udmVyZ2VlcGhlbWVyb25z8wQMX2NvbnN0cnVjdG9y9AQNX2NvbnN0Zm9sZGluZ/UECl9jb25zdDJ2YWz2BAVfY29uZPcECl9jb2Rlb3JkZXL4BA1fY29kZWV4dHJhYXJn+QQKX2NvZGVhcml0aPoEDl9jb2RlX2xvYWRib29s+wQMX2Nsb3NlX3N0YXRl/AQLX2Nsb3NlX2Z1bmP9BAxfY2xlYXJieWtleXP+BAlfY2xhc3NlbmT/BApfY2hlY2ttb2RlgAUNX2NoZWNrbGl0ZXJhbIEFC19jaGVja1NpemVzggUZX2NhbGxhbGxwZW5kaW5nZmluYWxpemVyc4MFBl9ib29sS4QFCl9iaW5zZWFyY2iFBQtfYXV4dXB2YWx1ZYYFCl9hdXhzdGF0dXOHBQpfYXV4c2V0c3RyiAUKX2F1eHJlc3VtZYkFCl9hdXhnZXRzdHKKBQxfYXV4X3VwdmFsdWWLBQtfYXRvbWljMmdlbowFBV9hdGFujQULX2FycmF5aW5kZXiOBQ1fYWxsb2N1cHZhbHVljwUJX2FkZGZpZWxkkAUKX19fdG93cml0ZZEFBl9fX3RhbpIFDl9fX3N0ZGlvX3dyaXRlkwULX19fcmFuZG5hbWWUBQtfX19vdmVyZmxvd5UFCl9fX2Z3cml0ZXiWBQ1fX19mbW9kZWZsYWdzlwUJX19fZmRvcGVumAUNX0xvYWRVbnNpZ25lZJkFC19Mb2FkTnVtYmVymgUMX0xvYWRJbnRlZ2VymwUNX0xvYWRGdW5jdGlvbpwFBl9MVG51bZ0FBl9MRW51bZ4FBV9HQ1RNnwULX0R1bXBOdW1iZXKgBQxfRHVtcEludGVnZXKhBQ1fRHVtcEZ1bmN0aW9uogUJc3RhY2tTYXZlowUMc3RhY2tSZXN0b3JlpAUKc3RhY2tBbGxvY6UFC2R5bkNhbGxfdmlppgUCYjWnBQJiMagFEF95b3VuZ2NvbGxlY3Rpb26pBQdfd3JpdGVyqgUKX3doaWxlc3RhdKsFCF93Y3J0b21irAUGX3dhcm5mrQUKX3ZzbnByaW50Zq4FCF92YWxpZG9wrwUHX3V0ZmxlbrAFCF91dGZjaGFysQUIX3V0Zjhlc2OyBQtfdW5tYWtlbWFza7MFCl91bmRlZmdvdG+0BQ9fdWRhdGEyZmluYWxpemW1BQlfdHh0VG9rZW62BQ5fdHdvd2F5X3N0cnN0crcFD190d29ieXRlX3N0cnN0crgFCF90dW5wYWNruQUPX3RyeW5ld3RiY3VwdmFsugUGX3RyeW10uwUSX3RyeV9yZWFsbG9jX2NodW5rvAUIX3RyZW1vdmW9BRJfdHJhdmVyc2V3ZWFrdmFsdWW+BQ5fdHJhdmVyc2V1ZGF0Yb8FD190cmF2ZXJzZXRocmVhZMAFDl90cmF2ZXJzZXRhYmxlwQUUX3RyYXZlcnNlc3Ryb25ndGFibGXCBQ5fdHJhdmVyc2Vwcm90b8MFEV90cmF2ZXJzZUxjbG9zdXJlxAURX3RyYXZlcnNlQ2Nsb3N1cmXFBQZfdHBhY2vGBQdfdG1wbmFtxwUIX3RtcGZpbGXIBQZfdG1vdmXJBQhfdGluc2VydMoFEV90aHJlZWJ5dGVfc3Ryc3RyywUIX3Rjb25jYXTMBQRfdGFuzQUHX3N0cnRveM4FCF9zdHJuY21wzwUIX3N0cmNzcG7QBQpfc3RyX3VwcGVy0QULX3N0cl91bnBhY2vSBQhfc3RyX3N1YtMFDF9zdHJfcmV2ZXJzZdQFCF9zdHJfcmVw1QUNX3N0cl9wYWNrc2l6ZdYFCV9zdHJfcGFja9cFCl9zdHJfbWF0Y2jYBQpfc3RyX2xvd2Vy2QUIX3N0cl9sZW7aBQlfc3RyX2dzdWLbBQtfc3RyX2Zvcm1hdNwFCV9zdHJfZmluZN0FCV9zdHJfZHVtcN4FCV9zdHJfY2hhct8FCV9zdHJfYnl0ZeAFDF9zdGVwZ2VuZnVsbOEFC19zdGFja2ludXNl4gUFX3NvcnTjBQtfc29sdmVnb3Rvc+QFCl9zb2x2ZWdvdG/lBQlfc25fd3JpdGXmBQhfc2tpcEJPTecFBF9zaW7oBQpfc2ltcGxlZXhw6QUIX3NldHZidWbqBQlfc2V0dHJhcHPrBQpfc2V0bG9jYWxl7AUJX3NldFRocmV37QUKX3NlYXJjaHZhcu4FDl9zZWFyY2h1cHZhbHVl7wURX3NlYXJjaGVyX3ByZWxvYWTwBQ1fc2VhcmNoZXJfTHVh8QUPX3NlYXJjaGVyX0Nyb2908gULX3NlYXJjaGVyX0PzBQtfc2NhbmZvcm1hdPQFEl9ydW5hZmV3ZmluYWxpemVyc/UFB19ya25hbWX2BQhfcmV0c3RhdPcFCF9yZXRob29r+AUHX3Jlc3VtZfkFEl9yZXN0YXJ0Y29sbGVjdGlvbvoFC19yZXBlYXRzdGF0+wUHX3JlbmFtZfwFC19yZW1vdmV2YXJz/QUHX3JlbW92Zf4FDV9yZW1hcmt1cHZhbHP/BQlfcmVpbnNlcnSABgdfcmVoYXNogQYRX3JlZ2lzdGVybG9jYWx2YXKCBghfcmVjb3ZlcoMGDF9yZWFkdXRmOGVzY4QGDF9yZWFkaGV4YWVzY4UGC19yZWFkZGVjZXNjhgYMX3JlYWRfc3RyaW5nhwYMX3JlYWRfbnVtYmVyiAYLX3JlYWRfY2hhcnOJBglfcmVhZF9hbGyKBgtfcXVvdGVmbG9hdIsGDV9wdXNoZnVuY25hbWWMBhJfcHVzaGVycm9ybm90Zm91bmSNBgxfcHVzaGNsb3N1cmWOBghfcHJvamVjdI8GC19wcmltYXJ5ZXhwkAYKX3BhcnRpdGlvbpEGCF9wYXJsaXN0kgYGX3BhbmljkwYLX29zX3RtcG5hbWWUBghfb3NfdGltZZUGDV9vc19zZXRsb2NhbGWWBgpfb3NfcmVuYW1llwYKX29zX3JlbW92ZZgGCl9vc19nZXRlbnaZBghfb3NfZXhpdJoGC19vc19leGVjdXRlmwYMX29zX2RpZmZ0aW1lnAYIX29zX2RhdGWdBglfb3NfY2xvY2ueBgtfbnVtdXNlaGFzaJ8GDF9udW11c2VhcnJheaAGC19ub3NwZWNpYWxzoQYFX25pbEuiBglfbmV4dGxpbmWjBgtfbmV3dXB2YWx1ZaQGDF9uZXdidWZmc2l6ZaUGB19uZXdib3imBgxfbW92ZXJlc3VsdHOnBg1fbW92ZWdvdG9zb3V0qAYLX21pbl9leHBhbmSpBgtfbWF4X2V4cGFuZKoGCV9tYXRoX3VsdKsGCl9tYXRoX3R5cGWsBgtfbWF0aF90b2ludK0GCV9tYXRoX3Rhbq4GCl9tYXRoX3NxcnSvBglfbWF0aF9zaW6wBhBfbWF0aF9yYW5kb21zZWVksQYMX21hdGhfcmFuZG9tsgYJX21hdGhfcmFkswYKX21hdGhfbW9kZrQGCV9tYXRoX21pbrUGCV9tYXRoX21heLYGCV9tYXRoX2xvZ7cGCl9tYXRoX2Ztb2S4BgtfbWF0aF9mbG9vcrkGCV9tYXRoX2V4cLoGCV9tYXRoX2RlZ7sGCV9tYXRoX2Nvc7wGCl9tYXRoX2NlaWy9BgpfbWF0aF9hdGFuvgYKX21hdGhfYXNpbr8GCl9tYXRoX2Fjb3PABglfbWF0aF9hYnPBBg1fbWF0Y2hiYWxhbmNlwgYOX21hdGNoX2NhcHR1cmXDBglfbWFrZW1hc2vEBglfbWFpbmZ1bmPFBg1fbHVhb3Blbl91dGY4xgYOX2x1YW9wZW5fdGFibGXHBg9fbHVhb3Blbl9zdHJpbmfIBhBfbHVhb3Blbl9wYWNrYWdlyQYLX2x1YW9wZW5fb3PKBg1fbHVhb3Blbl9tYXRoywYLX2x1YW9wZW5faW/MBg5fbHVhb3Blbl9kZWJ1Z80GEl9sdWFvcGVuX2Nvcm91dGluZc4GDV9sdWFvcGVuX2Jhc2XPBg5fbHVhaV9tYWtlc2VlZNAGC19sdWFfeWllbGRr0QYQX2x1YV91cHZhbHVlam9pbtIGDl9sdWFfdXB2YWx1ZWlk0wYMX2x1YV90b2Nsb3Nl1AYNX2x1YV9zZXRsb2NhbNUGEl9sdWFfc2V0aXVzZXJ2YWx1ZdYGDF9sdWFfc2V0aG9va9cGE19sdWFfc2V0Y3N0YWNrbGltaXTYBgtfbHVhX3Jlc3VtZdkGDl9sdWFfbmV3dGhyZWFk2gYIX2x1YV9sZW7bBg1fbHVhX2lzbnVtYmVy3AYNX2x1YV9nZXR0YWJsZd0GEl9sdWFfZ2V0aXVzZXJ2YWx1Zd4GCV9sdWFfZHVtcN8GCl9sdWFfYXJpdGjgBgpfbHVhWl9yZWFk4QYKX2x1YVpfaW5pdOIGDF9sdWFZX3BhcnNlcuMGDl9sdWFYX3NldGlucHV05AYKX2x1YVhfaW5pdOUGDl9sdWFWX2xlc3N0aGFu5gYPX2x1YVZfbGVzc2VxdWFs5wYOX2x1YVZfZmluaXNoT3DoBgxfbHVhVV91bmR1bXDpBgpfbHVhVV9kdW1w6gYRX2x1YVRfdHJ5Y29uY2F0VE3rBg9fbHVhVF90cnliaW5pVE3sBgpfbHVhVF9pbml07QYQX2x1YVRfZ2V0dmFyYXJnc+4GDF9sdWFUX2NhbGxUTe8GE19sdWFUX2FkanVzdHZhcmFyZ3PwBgxfbHVhU19yZW1vdmXxBg5fbHVhU19uZXd1ZGF0YfIGCl9sdWFTX2luaXTzBhFfbHVhU19oYXNobG9uZ3N0cvQGEF9sdWFTX2NsZWFyY2FjaGX1BgtfbHVhT19hcml0aPYGD19sdWFMX3RyYWNlYmFja/cGDl9sdWFMX3JlcXVpcmVm+AYJX2x1YUxfcmVm+QYOX2x1YUxfb3BlbmxpYnP6Bg5fbHVhTF9uZXdzdGF0ZfsGDl9sdWFMX2NhbGxtZXRh/AYSX2x1YUtfc2V0dGFibGVzaXpl/QYKX2x1YUtfc2VsZv4GDF9sdWFLX3ByZWZpeP8GDF9sdWFLX3Bvc2ZpeIAHC19sdWFLX2luZml4gQcLX2x1YUtfZmxvYXSCBwxfbHVhS19maW5pc2iDBw9fbHVhS19leHAyY29uc3SEBwpfbHVhSF9uZXh0hQcKX2x1YUhfZnJlZYYHEF9sdWFHX3RvaW50ZXJyb3KHBxBfbHVhR19vcmRlcmVycm9yiAcRX2x1YUdfY29uY2F0ZXJyb3KJBxBfbHVhRl9pbml0dXB2YWxzigcPX2x1YUZfZnJlZXByb3RviwcPX2x1YUZfZmluZHVwdmFsjAcOX2x1YUVfc2hyaW5rQ0mNBxBfbHVhRV9mcmVldGhyZWFkjgcVX2x1YURfcHJvdGVjdGVkcGFyc2VyjwcRX2x1YURfcHJldGFpbGNhbGyQBxRfbHVhQ19mcmVlYWxsb2JqZWN0c5EHD19sdWFCX3lpZWxkYWJsZZIHC19sdWFCX3lpZWxkkwcMX2x1YUJfeHBjYWxslAcKX2x1YUJfd2FybpUHCl9sdWFCX3R5cGWWBw5fbHVhQl90b3N0cmluZ5cHDl9sdWFCX3RvbnVtYmVymAcSX2x1YUJfc2V0bWV0YXRhYmxlmQcMX2x1YUJfc2VsZWN0mgcMX2x1YUJfcmF3c2V0mwcMX2x1YUJfcmF3bGVunAcMX2x1YUJfcmF3Z2V0nQcOX2x1YUJfcmF3ZXF1YWyeBwtfbHVhQl9wcmludJ8HC19sdWFCX3BjYWxsoAcLX2x1YUJfcGFpcnOhBwpfbHVhQl9uZXh0ogcOX2x1YUJfbG9hZGZpbGWjBwpfbHVhQl9sb2FkpAcMX2x1YUJfaXBhaXJzpQcSX2x1YUJfZ2V0bWV0YXRhYmxlpgcMX2x1YUJfZG9maWxlpwcMX2x1YUJfY293cmFwqAcOX2x1YUJfY29zdGF0dXOpBw9fbHVhQl9jb3J1bm5pbmeqBw5fbHVhQl9jb3Jlc3VtZasHFF9sdWFCX2NvbGxlY3RnYXJiYWdlrAcLX2x1YUJfY2xvc2WtBw1fbHVhQl9hdXh3cmFwrgcMX2x1YUJfYXNzZXJ0rwcKX2xvY2Fsc3RhdLAHCl9sb2NhbGZ1bmOxBwlfbG1lbWZpbmSyBw9fbGx2bV9ic3dhcF9pMzKzBw5fbGxfc2VhcmNocGF0aLQHC19sbF9yZXF1aXJltQcLX2xsX2xvYWRsaWK2Bw5fbGFzdGxpc3RmaWVsZLcHCl9sYXN0bGV2ZWy4BwpfbGFiZWxzdGF0uQcKX2xfc3RyMmludLoHCF9sX3N0cjJkuwcRX2xfcmFuZG9taXplUGl2b3S8BwxfbF9oYXNoZmxvYXS9BwxfbF9jaGVja21vZGW+BwhfbF9hbGxvY78HD19qdW1wc2NvcGVlcnJvcsAHC19pdGVyX2NvZGVzwQcPX2l0ZXJfYXV4c3RyaWN0wgcMX2l0ZXJfYXV4bGF4wwcNX2lzc2luZ2xlanVtcMQHBl9pc25lZ8UHCl9pc2luc3RhY2vGBwpfaXBhaXJzYXV4xwcJX2lvX3dyaXRlyAcIX2lvX3R5cGXJBwtfaW9fdG1wZmlsZcoHDF9pb19yZWFkbGluZcsHCF9pb19yZWFkzAcJX2lvX3BvcGVuzQcKX2lvX3BjbG9zZc4HCl9pb19vdXRwdXTPBwhfaW9fb3BlbtAHC19pb19ub2Nsb3Nl0QcJX2lvX2xpbmVz0gcJX2lvX2lucHV00wcJX2lvX2ZsdXNo1AcKX2lvX2ZjbG9zZdUHCV9pb19jbG9zZdYHDV9pbnRlcm5zaHJzdHLXBwlfaW5pdF92YXLYBw5faW5pdF9yZWdpc3RyedkHCF9pbmNzdGVw2gcHX2lmc3RhdNsHBl9ob29rZtwHCV9oZXhmbG9hdN0HDF9oYXNoX3NlYXJjaN4HC19ncm93c3RydGFi3wcJX2dvdG9zdGF04AcLX2dtYXRjaF9hdXjhBwdfZ21hdGNo4gcNX2dldHVwdmFsbmFtZeMHCV9nZXR1bm9wcuQHEl9nZXRsb2NhbGF0dHJpYnV0ZeUHDF9nZXRmdW5jbmFtZeYHC19nZXRmcmVlcG9z5wcKX2dldGJpbm9wcugHDF9nZXRiYXNlbGluZekHBV9nZXRT6gcFX2dldEbrBwhfZ2Vuc3RlcOwHD19nZW5lcmljX3JlYWRlcu0HBV9nY3Rt7gcJX2Z1bmNzdGF07wcRX2Z1bmNuYW1lZnJvbWNvZGXwBwlfZnVuY25hbWXxBwlfZnVuY2luZm/yBwhfZnVsbGluY/MHCF9mcmVvcGVu9AcQX2ZvdXJieXRlX3N0cnN0cvUHCF9mb3JzdGF09gcHX2Zvcm51bfcHCF9mb3JsaXN0+AcJX2ZvcmxpbWl0+QcGX2ZtdF94+gcGX2ZtdF9v+wcHX2ZtdF9mcPwHBV9mbW9k/QcLX2ZpbmR2YXJhcmf+BwtfZmluZHNldHJlZ/8HCl9maW5kcGNhbGyACAtfZmluZGxvYWRlcoEICl9maW5kaW5kZXiCCAxfZmluYWx0YXJnZXSDCAZfZmllbGSECAhfZl93cml0ZYUIC19mX3Rvc3RyaW5nhggKX2Zfc2V0dmJ1ZocIB19mX3NlZWuICAdfZl9yZWFkiQgJX2ZfcGFyc2VyiggKX2ZfbHVhb3BlbosICF9mX2xpbmVzjAgFX2ZfZ2ONCAhfZl9mbHVzaI4IB19mX2NhbGyPCAlfZXhwcnN0YXSQCARfZXhwkQgLX2Vycm9ybGltaXSSCAxfZW5kX2NhcHR1cmWTCApfZG90aGVjYWxslAgJX2RlY2Zsb2F0lQgPX2RiX3VwdmFsdWVqb2lulggNX2RiX3VwdmFsdWVpZJcIDV9kYl90cmFjZWJhY2uYCBBfZGJfc2V0dXNlcnZhbHVlmQgOX2RiX3NldHVwdmFsdWWaCBBfZGJfc2V0bWV0YXRhYmxlmwgMX2RiX3NldGxvY2FsnAgLX2RiX3NldGhvb2udCBJfZGJfc2V0Y3N0YWNrbGltaXSeCBBfZGJfZ2V0dXNlcnZhbHVlnwgOX2RiX2dldHVwdmFsdWWgCA9fZGJfZ2V0cmVnaXN0cnmhCBBfZGJfZ2V0bWV0YXRhYmxloggMX2RiX2dldGxvY2FsowgLX2RiX2dldGluZm+kCAtfZGJfZ2V0aG9va6UICV9kYl9kZWJ1Z6YIFV9jcmVhdGVzZWFyY2hlcnN0YWJsZacIEF9jcmVhdGVtZXRhdGFibGWoCAtfY3JlYXRlbWV0YakIEV9jcmVhdGVjbGlic3RhYmxlqggEX2Nvc6sIDV9jb3JyZWN0c3RhY2usCBFfY29ycmVjdGdyYXlsaXN0c60IDV9jb250aW51ZV9sdWGuCApfY29uc3QyZXhwrwgNX2NvbXB1dGVzaXplc7AIDF9jb21waWxlX2x1YbEIEl9jb2xsZWN0dmFsaWRsaW5lc7IIDV9jb2RldW5leHB2YWyzCApfY29kZXBvaW50tAgIX2NvZGVub3S1CAdfY29kZWVxtggLX2NvZGVjb25jYXS3CBBfY29kZWNvbW11dGF0aXZluAgMX2NvZGVjbG9zdXJluQgMX2NvZGViaXR3aXNluggPX2Nsb3NlbGlzdGZpZWxkuwgNX2NoZWNrdG9jbG9zZbwIDl9jaGVja3JlcGVhdGVkvQgMX2NoZWNrb3B0aW9uvggKX2NoZWNrY2xpYr8ID19jaGVja19yZWFkb25secAID19jaGVja19jb25mbGljdMEIDl9jaGVja19jYXB0dXJlwggMX2NoZWNrSGVhZGVywwgMX2NoYW5nZWRsaW5lxAgRX2NhcHR1cmVfdG9fY2xvc2XFCA1fY2FsbGNsb3NlbXRoxggLX2J5dGVvZmZzZXTHCApfYnJlYWtzdGF0yAgGX2JveGdjyQgKX2Jfc3RyMmludMoIC19hdXhnZXRpbmZvywgGX2F0YW4yzAgFX2FzaW7NCApfYXJpdGhfdW5tzggKX2FyaXRoX3N1Ys8ICl9hcml0aF9wb3fQCApfYXJpdGhfbXVs0QgKX2FyaXRoX21vZNIIC19hcml0aF9pZGl20wgKX2FyaXRoX2RpdtQICl9hcml0aF9hZGTVCApfYWRkcXVvdGVk1ggNX2FkZHByb3RvdHlwZdcIC19hZGRsaXRlcmFs2AgKX2FkZF92YWx1ZdkIBl9hZGRfc9oIBV9hY29z2wgMX19nZXRfdHpuYW1l3AgOX19nZXRfdGltZXpvbmXdCA5fX2dldF9kYXlsaWdodN4IFV9fX3VubGlzdF9sb2NrZWRfZmlsZd8IDV9fX3N0cmVycm9yX2zgCAlfX19zdHBjcHnhCA9fX19zdGRvdXRfd3JpdGXiCA1fX19zdGRpb19zZWVr4wgNX19fc3RkaW9fcmVhZOQIDl9fX3N0ZGlvX2Nsb3Nl5QgRX19fcmVtX3BpbzJfbGFyZ2XmCApfX19vZmxfYWRk5wgJX19fbXVubWFw6AgMX19fbW9fbG9va3Vw6QgNX19fZ2V0X2xvY2FsZeoIEl9fX2Z0ZWxsb191bmxvY2tlZOsIEl9fX2ZzZWVrb191bmxvY2tlZOwIDF9fX2Zsb2F0c2Nhbu0IEV9fX2Vycm5vX2xvY2F0aW9u7gghX19fZW1zY3JpcHRlbl9lbnZpcm9uX2NvbnN0cnVjdG9y7wgHX19fZHVwM/AIDV9Mb2FkVXB2YWx1ZXPxCAtfTG9hZFByb3Rvc/IICl9Mb2FkRGVidWfzCA5fTG9hZENvbnN0YW50c/QICV9Mb2FkQ29kZfUIC19MVGludGZsb2F09ggLX0xUZmxvYXRpbnT3CAtfTEVpbnRmbG9hdPgIC19MRWZsb2F0aW50+QgNX0R1bXBVcHZhbHVlc/oIC19EdW1wUHJvdG9z+wgLX0R1bXBIZWFkZXL8CApfRHVtcERlYnVn/QgOX0R1bXBDb25zdGFudHM=";
return Uint8Array.from(atob(WASMCODE), c => c.charCodeAt(0));
}
function __getBinary_origin(){
 try {
  if (Module["wasmBinary"]) {
   return new Uint8Array(Module["wasmBinary"]);
  }
  if (Module["readBinary"]) {
   return Module["readBinary"](wasmBinaryFile);
  } else {
   throw "both async and sync fetching of the wasm failed";
  }
 } catch (err) {
  abort(err);
 }
}

function getBinaryPromise() {
 if (!Module["wasmBinary"] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
  return fetch(wasmBinaryFile, {
   credentials: "same-origin"
  }).then(function(response) {
   if (!response["ok"]) {
    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
   }
   return response["arrayBuffer"]();
  }).catch(function() {
   return getBinary();
  });
 }
 return new Promise(function(resolve, reject) {
  resolve(getBinary());
 });
}

function createWasm(env) {
 var info = {
  "env": env,
  "global": {
   "NaN": NaN,
   Infinity: Infinity
  },
  "global.Math": Math,
  "asm2wasm": asm2wasmImports
 };
 function receiveInstance(instance, module) {
  var exports = instance.exports;
  Module["asm"] = exports;
  removeRunDependency("wasm-instantiate");
 }
 addRunDependency("wasm-instantiate");
 if (Module["instantiateWasm"]) {
  try {
   return Module["instantiateWasm"](info, receiveInstance);
  } catch (e) {
   err("Module.instantiateWasm callback failed with error: " + e);
   return false;
  }
 }
 function receiveInstantiatedSource(output) {
  receiveInstance(output["instance"]);
 }
 function instantiateArrayBuffer(receiver) {
  getBinaryPromise().then(function(binary) {
   return WebAssembly.instantiate(binary, info);
  }).then(receiver, function(reason) {
   err("failed to asynchronously prepare wasm: " + reason);
   abort(reason);
  });
 }
 if (!Module["wasmBinary"] && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
  WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, {
   credentials: "same-origin"
  }), info).then(receiveInstantiatedSource, function(reason) {
   err("wasm streaming compile failed: " + reason);
   err("falling back to ArrayBuffer instantiation");
   instantiateArrayBuffer(receiveInstantiatedSource);
  });
 } else {
  instantiateArrayBuffer(receiveInstantiatedSource);
 }
 return {};
}

Module["asm"] = function(global, env, providedBuffer) {
 env["memory"] = wasmMemory;
 env["table"] = wasmTable = new WebAssembly.Table({
  "initial": 296,
  "maximum": 296,
  "element": "anyfunc"
 });
 env["__memory_base"] = 1024;
 env["__table_base"] = 0;
 var exports = createWasm(env);
 return exports;
};

__ATINIT__.push({
 func: function() {
  ___emscripten_environ_constructor();
 }
});

var ENV = {};

function ___buildEnvironment(environ) {
 var MAX_ENV_VALUES = 64;
 var TOTAL_ENV_SIZE = 1024;
 var poolPtr;
 var envPtr;
 if (!___buildEnvironment.called) {
  ___buildEnvironment.called = true;
  ENV["USER"] = ENV["LOGNAME"] = "web_user";
  ENV["PATH"] = "/";
  ENV["PWD"] = "/";
  ENV["HOME"] = "/home/web_user";
  ENV["LANG"] = "C.UTF-8";
  ENV["_"] = Module["thisProgram"];
  poolPtr = getMemory(TOTAL_ENV_SIZE);
  envPtr = getMemory(MAX_ENV_VALUES * 4);
  HEAP32[envPtr >> 2] = poolPtr;
  HEAP32[environ >> 2] = envPtr;
 } else {
  envPtr = HEAP32[environ >> 2];
  poolPtr = HEAP32[envPtr >> 2];
 }
 var strings = [];
 var totalSize = 0;
 for (var key in ENV) {
  if (typeof ENV[key] === "string") {
   var line = key + "=" + ENV[key];
   strings.push(line);
   totalSize += line.length;
  }
 }
 if (totalSize > TOTAL_ENV_SIZE) {
  throw new Error("Environment size exceeded TOTAL_ENV_SIZE!");
 }
 var ptrSize = 4;
 for (var i = 0; i < strings.length; i++) {
  var line = strings[i];
  writeAsciiToMemory(line, poolPtr);
  HEAP32[envPtr + i * ptrSize >> 2] = poolPtr;
  poolPtr += line.length + 1;
 }
 HEAP32[envPtr + strings.length * ptrSize >> 2] = 0;
}

function _emscripten_get_now() {
 abort();
}

function _emscripten_get_now_is_monotonic() {
 return 0 || ENVIRONMENT_IS_NODE || typeof dateNow !== "undefined" || typeof performance === "object" && performance && typeof performance["now"] === "function";
}

function ___setErrNo(value) {
 if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
 return value;
}

function _clock_gettime(clk_id, tp) {
 var now;
 if (clk_id === 0) {
  now = Date.now();
 } else if (clk_id === 1 && _emscripten_get_now_is_monotonic()) {
  now = _emscripten_get_now();
 } else {
  ___setErrNo(22);
  return -1;
 }
 HEAP32[tp >> 2] = now / 1e3 | 0;
 HEAP32[tp + 4 >> 2] = now % 1e3 * 1e3 * 1e3 | 0;
 return 0;
}

function ___clock_gettime(a0, a1) {
 return _clock_gettime(a0, a1);
}

function ___lock() {}

function ___map_file(pathname, size) {
 ___setErrNo(1);
 return -1;
}

var PATH = {
 splitPath: function(filename) {
  var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 },
 normalizeArray: function(parts, allowAboveRoot) {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (;up; up--) {
    parts.unshift("..");
   }
  }
  return parts;
 },
 normalize: function(path) {
  var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter(function(p) {
   return !!p;
  }), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 },
 dirname: function(path) {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 },
 basename: function(path) {
  if (path === "/") return "/";
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 },
 extname: function(path) {
  return PATH.splitPath(path)[3];
 },
 join: function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return PATH.normalize(paths.join("/"));
 },
 join2: function(l, r) {
  return PATH.normalize(l + "/" + r);
 },
 resolve: function() {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = i >= 0 ? arguments[i] : FS.cwd();
   if (typeof path !== "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = path.charAt(0) === "/";
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
   return !!p;
  }), !resolvedAbsolute).join("/");
  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
 },
 relative: function(from, to) {
  from = PATH.resolve(from).substr(1);
  to = PATH.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (;start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (;end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 }
};

var TTY = {
 ttys: [],
 init: function() {},
 shutdown: function() {},
 register: function(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 },
 stream_ops: {
  open: function(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   stream.tty = tty;
   stream.seekable = false;
  },
  close: function(stream) {
   stream.tty.ops.flush(stream.tty);
  },
  flush: function(stream) {
   stream.tty.ops.flush(stream.tty);
  },
  read: function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(ERRNO_CODES.EIO);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  },
  write: function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
   }
   try {
    for (var i = 0; i < length; i++) {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    }
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES.EIO);
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  }
 },
 default_tty_ops: {
  get_char: function(tty) {
   if (!tty.input.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
     var BUFSIZE = 256;
     var buf = new Buffer(BUFSIZE);
     var bytesRead = 0;
     var isPosixPlatform = process.platform != "win32";
     var fd = process.stdin.fd;
     if (isPosixPlatform) {
      var usingDevice = false;
      try {
       fd = fs.openSync("/dev/stdin", "r");
       usingDevice = true;
      } catch (e) {}
     }
     try {
      bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
     } catch (e) {
      if (e.toString().indexOf("EOF") != -1) bytesRead = 0; else throw e;
     }
     if (usingDevice) {
      fs.closeSync(fd);
     }
     if (bytesRead > 0) {
      result = buf.slice(0, bytesRead).toString("utf-8");
     } else {
      result = null;
     }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
     result = window.prompt("Input: ");
     if (result !== null) {
      result += "\n";
     }
    } else if (typeof readline == "function") {
     result = readline();
     if (result !== null) {
      result += "\n";
     }
    }
    if (!result) {
     return null;
    }
    tty.input = intArrayFromString(result, true);
   }
   return tty.input.shift();
  },
  put_char: function(tty, val) {
   if (val === null || val === 10) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  flush: function(tty) {
   if (tty.output && tty.output.length > 0) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 },
 default_tty1_ops: {
  put_char: function(tty, val) {
   if (val === null || val === 10) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  flush: function(tty) {
   if (tty.output && tty.output.length > 0) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 }
};

var MEMFS = {
 ops_table: null,
 mount: function(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, 0);
 },
 createNode: function(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
  if (!MEMFS.ops_table) {
   MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap,
      msync: MEMFS.stream_ops.msync
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   };
  }
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 },
 getFileDataAsRegularArray: function(node) {
  if (node.contents && node.contents.subarray) {
   var arr = [];
   for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
   return arr;
  }
  return node.contents;
 },
 getFileDataAsTypedArray: function(node) {
  if (!node.contents) return new Uint8Array();
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 },
 expandFileStorage: function(node, newCapacity) {
  var prevCapacity = node.contents ? node.contents.length : 0;
  if (prevCapacity >= newCapacity) return;
  var CAPACITY_DOUBLING_MAX = 1024 * 1024;
  newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
  if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
  var oldContents = node.contents;
  node.contents = new Uint8Array(newCapacity);
  if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
  return;
 },
 resizeFileStorage: function(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
   return;
  }
  if (!node.contents || node.contents.subarray) {
   var oldContents = node.contents;
   node.contents = new Uint8Array(new ArrayBuffer(newSize));
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
   return;
  }
  if (!node.contents) node.contents = [];
  if (node.contents.length > newSize) node.contents.length = newSize; else while (node.contents.length < newSize) node.contents.push(0);
  node.usedBytes = newSize;
 },
 node_ops: {
  getattr: function(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  },
  setattr: function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  },
  lookup: function(parent, name) {
   throw FS.genericErrors[ERRNO_CODES.ENOENT];
  },
  mknod: function(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  },
  rename: function(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   old_node.parent = new_dir;
  },
  unlink: function(parent, name) {
   delete parent.contents[name];
  },
  rmdir: function(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
   }
   delete parent.contents[name];
  },
  readdir: function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  },
  symlink: function(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
   node.link = oldpath;
   return node;
  },
  readlink: function(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return node.link;
  }
 },
 stream_ops: {
  read: function(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); else {
    for (var i = 0; i < length; i++) {
     node.contents[position + i] = buffer[offset + i];
    }
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  },
  allocate: function(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  },
  mmap: function(stream, buffer, offset, length, position, prot, flags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < stream.node.usedBytes) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = _malloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
    }
    buffer.set(contents, ptr);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
   }
   if (mmapFlags & 2) {
    return 0;
   }
   var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
   return 0;
  }
 }
};

var IDBFS = {
 dbs: {},
 indexedDB: function() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  var ret = null;
  if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  assert(ret, "IDBFS used, but indexedDB not supported");
  return ret;
 },
 DB_VERSION: 21,
 DB_STORE_NAME: "FILE_DATA",
 mount: function(mount) {
  return MEMFS.mount.apply(null, arguments);
 },
 syncfs: function(mount, populate, callback) {
  IDBFS.getLocalSet(mount, function(err, local) {
   if (err) return callback(err);
   IDBFS.getRemoteSet(mount, function(err, remote) {
    if (err) return callback(err);
    var src = populate ? remote : local;
    var dst = populate ? local : remote;
    IDBFS.reconcile(src, dst, callback);
   });
  });
 },
 getDB: function(name, callback) {
  var db = IDBFS.dbs[name];
  if (db) {
   return callback(null, db);
  }
  var req;
  try {
   req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
  } catch (e) {
   return callback(e);
  }
  if (!req) {
   return callback("Unable to connect to IndexedDB");
  }
  req.onupgradeneeded = function(e) {
   var db = e.target.result;
   var transaction = e.target.transaction;
   var fileStore;
   if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
    fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
   } else {
    fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
   }
   if (!fileStore.indexNames.contains("timestamp")) {
    fileStore.createIndex("timestamp", "timestamp", {
     unique: false
    });
   }
  };
  req.onsuccess = function() {
   db = req.result;
   IDBFS.dbs[name] = db;
   callback(null, db);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 getLocalSet: function(mount, callback) {
  var entries = {};
  function isRealDir(p) {
   return p !== "." && p !== "..";
  }
  function toAbsolute(root) {
   return function(p) {
    return PATH.join2(root, p);
   };
  }
  var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  while (check.length) {
   var path = check.pop();
   var stat;
   try {
    stat = FS.stat(path);
   } catch (e) {
    return callback(e);
   }
   if (FS.isDir(stat.mode)) {
    check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
   }
   entries[path] = {
    timestamp: stat.mtime
   };
  }
  return callback(null, {
   type: "local",
   entries: entries
  });
 },
 getRemoteSet: function(mount, callback) {
  var entries = {};
  IDBFS.getDB(mount.mountpoint, function(err, db) {
   if (err) return callback(err);
   try {
    var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readonly");
    transaction.onerror = function(e) {
     callback(this.error);
     e.preventDefault();
    };
    var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
    var index = store.index("timestamp");
    index.openKeyCursor().onsuccess = function(event) {
     var cursor = event.target.result;
     if (!cursor) {
      return callback(null, {
       type: "remote",
       db: db,
       entries: entries
      });
     }
     entries[cursor.primaryKey] = {
      timestamp: cursor.key
     };
     cursor.continue();
    };
   } catch (e) {
    return callback(e);
   }
  });
 },
 loadLocalEntry: function(path, callback) {
  var stat, node;
  try {
   var lookup = FS.lookupPath(path);
   node = lookup.node;
   stat = FS.stat(path);
  } catch (e) {
   return callback(e);
  }
  if (FS.isDir(stat.mode)) {
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode
   });
  } else if (FS.isFile(stat.mode)) {
   node.contents = MEMFS.getFileDataAsTypedArray(node);
   return callback(null, {
    timestamp: stat.mtime,
    mode: stat.mode,
    contents: node.contents
   });
  } else {
   return callback(new Error("node type not supported"));
  }
 },
 storeLocalEntry: function(path, entry, callback) {
  try {
   if (FS.isDir(entry.mode)) {
    FS.mkdir(path, entry.mode);
   } else if (FS.isFile(entry.mode)) {
    FS.writeFile(path, entry.contents, {
     canOwn: true
    });
   } else {
    return callback(new Error("node type not supported"));
   }
   FS.chmod(path, entry.mode);
   FS.utime(path, entry.timestamp, entry.timestamp);
  } catch (e) {
   return callback(e);
  }
  callback(null);
 },
 removeLocalEntry: function(path, callback) {
  try {
   var lookup = FS.lookupPath(path);
   var stat = FS.stat(path);
   if (FS.isDir(stat.mode)) {
    FS.rmdir(path);
   } else if (FS.isFile(stat.mode)) {
    FS.unlink(path);
   }
  } catch (e) {
   return callback(e);
  }
  callback(null);
 },
 loadRemoteEntry: function(store, path, callback) {
  var req = store.get(path);
  req.onsuccess = function(event) {
   callback(null, event.target.result);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 storeRemoteEntry: function(store, path, entry, callback) {
  var req = store.put(entry, path);
  req.onsuccess = function() {
   callback(null);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 removeRemoteEntry: function(store, path, callback) {
  var req = store.delete(path);
  req.onsuccess = function() {
   callback(null);
  };
  req.onerror = function(e) {
   callback(this.error);
   e.preventDefault();
  };
 },
 reconcile: function(src, dst, callback) {
  var total = 0;
  var create = [];
  Object.keys(src.entries).forEach(function(key) {
   var e = src.entries[key];
   var e2 = dst.entries[key];
   if (!e2 || e.timestamp > e2.timestamp) {
    create.push(key);
    total++;
   }
  });
  var remove = [];
  Object.keys(dst.entries).forEach(function(key) {
   var e = dst.entries[key];
   var e2 = src.entries[key];
   if (!e2) {
    remove.push(key);
    total++;
   }
  });
  if (!total) {
   return callback(null);
  }
  var errored = false;
  var completed = 0;
  var db = src.type === "remote" ? src.db : dst.db;
  var transaction = db.transaction([ IDBFS.DB_STORE_NAME ], "readwrite");
  var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return callback(err);
    }
    return;
   }
   if (++completed >= total) {
    return callback(null);
   }
  }
  transaction.onerror = function(e) {
   done(this.error);
   e.preventDefault();
  };
  create.sort().forEach(function(path) {
   if (dst.type === "local") {
    IDBFS.loadRemoteEntry(store, path, function(err, entry) {
     if (err) return done(err);
     IDBFS.storeLocalEntry(path, entry, done);
    });
   } else {
    IDBFS.loadLocalEntry(path, function(err, entry) {
     if (err) return done(err);
     IDBFS.storeRemoteEntry(store, path, entry, done);
    });
   }
  });
  remove.sort().reverse().forEach(function(path) {
   if (dst.type === "local") {
    IDBFS.removeLocalEntry(path, done);
   } else {
    IDBFS.removeRemoteEntry(store, path, done);
   }
  });
 }
};

var NODEFS = {
 isWindows: false,
 staticInit: function() {
  NODEFS.isWindows = !!process.platform.match(/^win/);
  var flags = process["binding"]("constants");
  if (flags["fs"]) {
   flags = flags["fs"];
  }
  NODEFS.flagsForNodeMap = {
   1024: flags["O_APPEND"],
   64: flags["O_CREAT"],
   128: flags["O_EXCL"],
   0: flags["O_RDONLY"],
   2: flags["O_RDWR"],
   4096: flags["O_SYNC"],
   512: flags["O_TRUNC"],
   1: flags["O_WRONLY"]
  };
 },
 bufferFrom: function(arrayBuffer) {
  return Buffer.alloc ? Buffer.from(arrayBuffer) : new Buffer(arrayBuffer);
 },
 mount: function(mount) {
  assert(ENVIRONMENT_IS_NODE);
  return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
 },
 createNode: function(parent, name, mode, dev) {
  if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
  var node = FS.createNode(parent, name, mode);
  node.node_ops = NODEFS.node_ops;
  node.stream_ops = NODEFS.stream_ops;
  return node;
 },
 getMode: function(path) {
  var stat;
  try {
   stat = fs.lstatSync(path);
   if (NODEFS.isWindows) {
    stat.mode = stat.mode | (stat.mode & 292) >> 2;
   }
  } catch (e) {
   if (!e.code) throw e;
   throw new FS.ErrnoError(ERRNO_CODES[e.code]);
  }
  return stat.mode;
 },
 realPath: function(node) {
  var parts = [];
  while (node.parent !== node) {
   parts.push(node.name);
   node = node.parent;
  }
  parts.push(node.mount.opts.root);
  parts.reverse();
  return PATH.join.apply(null, parts);
 },
 flagsForNode: function(flags) {
  flags &= ~2097152;
  flags &= ~2048;
  flags &= ~32768;
  flags &= ~524288;
  var newFlags = 0;
  for (var k in NODEFS.flagsForNodeMap) {
   if (flags & k) {
    newFlags |= NODEFS.flagsForNodeMap[k];
    flags ^= k;
   }
  }
  if (!flags) {
   return newFlags;
  } else {
   throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
  }
 },
 node_ops: {
  getattr: function(node) {
   var path = NODEFS.realPath(node);
   var stat;
   try {
    stat = fs.lstatSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   if (NODEFS.isWindows && !stat.blksize) {
    stat.blksize = 4096;
   }
   if (NODEFS.isWindows && !stat.blocks) {
    stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
   }
   return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    uid: stat.uid,
    gid: stat.gid,
    rdev: stat.rdev,
    size: stat.size,
    atime: stat.atime,
    mtime: stat.mtime,
    ctime: stat.ctime,
    blksize: stat.blksize,
    blocks: stat.blocks
   };
  },
  setattr: function(node, attr) {
   var path = NODEFS.realPath(node);
   try {
    if (attr.mode !== undefined) {
     fs.chmodSync(path, attr.mode);
     node.mode = attr.mode;
    }
    if (attr.timestamp !== undefined) {
     var date = new Date(attr.timestamp);
     fs.utimesSync(path, date, date);
    }
    if (attr.size !== undefined) {
     fs.truncateSync(path, attr.size);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  lookup: function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   var mode = NODEFS.getMode(path);
   return NODEFS.createNode(parent, name, mode);
  },
  mknod: function(parent, name, mode, dev) {
   var node = NODEFS.createNode(parent, name, mode, dev);
   var path = NODEFS.realPath(node);
   try {
    if (FS.isDir(node.mode)) {
     fs.mkdirSync(path, node.mode);
    } else {
     fs.writeFileSync(path, "", {
      mode: node.mode
     });
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
   return node;
  },
  rename: function(oldNode, newDir, newName) {
   var oldPath = NODEFS.realPath(oldNode);
   var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
   try {
    fs.renameSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  unlink: function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.unlinkSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  rmdir: function(parent, name) {
   var path = PATH.join2(NODEFS.realPath(parent), name);
   try {
    fs.rmdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  readdir: function(node) {
   var path = NODEFS.realPath(node);
   try {
    return fs.readdirSync(path);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  symlink: function(parent, newName, oldPath) {
   var newPath = PATH.join2(NODEFS.realPath(parent), newName);
   try {
    fs.symlinkSync(oldPath, newPath);
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  readlink: function(node) {
   var path = NODEFS.realPath(node);
   try {
    path = fs.readlinkSync(path);
    path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
    return path;
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  }
 },
 stream_ops: {
  open: function(stream) {
   var path = NODEFS.realPath(stream.node);
   try {
    if (FS.isFile(stream.node.mode)) {
     stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  close: function(stream) {
   try {
    if (FS.isFile(stream.node.mode) && stream.nfd) {
     fs.closeSync(stream.nfd);
    }
   } catch (e) {
    if (!e.code) throw e;
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  read: function(stream, buffer, offset, length, position) {
   if (length === 0) return 0;
   try {
    return fs.readSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  write: function(stream, buffer, offset, length, position) {
   try {
    return fs.writeSync(stream.nfd, NODEFS.bufferFrom(buffer.buffer), offset, length, position);
   } catch (e) {
    throw new FS.ErrnoError(ERRNO_CODES[e.code]);
   }
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     try {
      var stat = fs.fstatSync(stream.nfd);
      position += stat.size;
     } catch (e) {
      throw new FS.ErrnoError(ERRNO_CODES[e.code]);
     }
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }
 }
};

var WORKERFS = {
 DIR_MODE: 16895,
 FILE_MODE: 33279,
 reader: null,
 mount: function(mount) {
  assert(ENVIRONMENT_IS_WORKER);
  if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
  var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
  var createdParents = {};
  function ensureParent(path) {
   var parts = path.split("/");
   var parent = root;
   for (var i = 0; i < parts.length - 1; i++) {
    var curr = parts.slice(0, i + 1).join("/");
    if (!createdParents[curr]) {
     createdParents[curr] = WORKERFS.createNode(parent, parts[i], WORKERFS.DIR_MODE, 0);
    }
    parent = createdParents[curr];
   }
   return parent;
  }
  function base(path) {
   var parts = path.split("/");
   return parts[parts.length - 1];
  }
  Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
   WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
  });
  (mount.opts["blobs"] || []).forEach(function(obj) {
   WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
  });
  (mount.opts["packages"] || []).forEach(function(pack) {
   pack["metadata"].files.forEach(function(file) {
    var name = file.filename.substr(1);
    WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end));
   });
  });
  return root;
 },
 createNode: function(parent, name, mode, dev, contents, mtime) {
  var node = FS.createNode(parent, name, mode);
  node.mode = mode;
  node.node_ops = WORKERFS.node_ops;
  node.stream_ops = WORKERFS.stream_ops;
  node.timestamp = (mtime || new Date()).getTime();
  assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
  if (mode === WORKERFS.FILE_MODE) {
   node.size = contents.size;
   node.contents = contents;
  } else {
   node.size = 4096;
   node.contents = {};
  }
  if (parent) {
   parent.contents[name] = node;
  }
  return node;
 },
 node_ops: {
  getattr: function(node) {
   return {
    dev: 1,
    ino: undefined,
    mode: node.mode,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: undefined,
    size: node.size,
    atime: new Date(node.timestamp),
    mtime: new Date(node.timestamp),
    ctime: new Date(node.timestamp),
    blksize: 4096,
    blocks: Math.ceil(node.size / 4096)
   };
  },
  setattr: function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
  },
  lookup: function(parent, name) {
   throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
  },
  mknod: function(parent, name, mode, dev) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  rename: function(oldNode, newDir, newName) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  unlink: function(parent, name) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  rmdir: function(parent, name) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  readdir: function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  },
  symlink: function(parent, newName, oldPath) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  },
  readlink: function(node) {
   throw new FS.ErrnoError(ERRNO_CODES.EPERM);
  }
 },
 stream_ops: {
  read: function(stream, buffer, offset, length, position) {
   if (position >= stream.node.size) return 0;
   var chunk = stream.node.contents.slice(position, position + length);
   var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
   buffer.set(new Uint8Array(ab), offset);
   return chunk.size;
  },
  write: function(stream, buffer, offset, length, position) {
   throw new FS.ErrnoError(ERRNO_CODES.EIO);
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.size;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
   }
   return position;
  }
 }
};

var FS = {
 root: null,
 mounts: [],
 devices: {},
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 trackingDelegate: {},
 tracking: {
  openFlags: {
   READ: 1,
   WRITE: 2
  }
 },
 ErrnoError: null,
 genericErrors: {},
 filesystems: null,
 syncFSRequests: 0,
 handleFSError: function(e) {
  if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
  return ___setErrNo(e.errno);
 },
 lookupPath: function(path, opts) {
  path = PATH.resolve(FS.cwd(), path);
  opts = opts || {};
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  for (var key in defaults) {
   if (opts[key] === undefined) {
    opts[key] = defaults[key];
   }
  }
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(40);
  }
  var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
   return !!p;
  }), false);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = i === parts.length - 1;
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || islast && opts.follow_mount) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(40);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 },
 getPath: function(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
   }
   path = path ? node.name + "/" + path : node.name;
   node = node.parent;
  }
 },
 hashName: function(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
  }
  return (parentid + hash >>> 0) % FS.nameTable.length;
 },
 hashAddNode: function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 },
 hashRemoveNode: function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 },
 lookupNode: function(parent, name) {
  var err = FS.mayLookup(parent);
  if (err) {
   throw new FS.ErrnoError(err, parent);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 },
 createNode: function(parent, name, mode, rdev) {
  if (!FS.FSNode) {
   FS.FSNode = function(parent, name, mode, rdev) {
    if (!parent) {
     parent = this;
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev;
   };
   FS.FSNode.prototype = {};
   var readMode = 292 | 73;
   var writeMode = 146;
   Object.defineProperties(FS.FSNode.prototype, {
    read: {
     get: function() {
      return (this.mode & readMode) === readMode;
     },
     set: function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
     }
    },
    write: {
     get: function() {
      return (this.mode & writeMode) === writeMode;
     },
     set: function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
     }
    },
    isFolder: {
     get: function() {
      return FS.isDir(this.mode);
     }
    },
    isDevice: {
     get: function() {
      return FS.isChrdev(this.mode);
     }
    }
   });
  }
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 },
 destroyNode: function(node) {
  FS.hashRemoveNode(node);
 },
 isRoot: function(node) {
  return node === node.parent;
 },
 isMountpoint: function(node) {
  return !!node.mounted;
 },
 isFile: function(mode) {
  return (mode & 61440) === 32768;
 },
 isDir: function(mode) {
  return (mode & 61440) === 16384;
 },
 isLink: function(mode) {
  return (mode & 61440) === 40960;
 },
 isChrdev: function(mode) {
  return (mode & 61440) === 8192;
 },
 isBlkdev: function(mode) {
  return (mode & 61440) === 24576;
 },
 isFIFO: function(mode) {
  return (mode & 61440) === 4096;
 },
 isSocket: function(mode) {
  return (mode & 49152) === 49152;
 },
 flagModes: {
  "r": 0,
  "rs": 1052672,
  "r+": 2,
  "w": 577,
  "wx": 705,
  "xw": 705,
  "w+": 578,
  "wx+": 706,
  "xw+": 706,
  "a": 1089,
  "ax": 1217,
  "xa": 1217,
  "a+": 1090,
  "ax+": 1218,
  "xa+": 1218
 },
 modeStringToFlags: function(str) {
  var flags = FS.flagModes[str];
  if (typeof flags === "undefined") {
   throw new Error("Unknown file open mode: " + str);
  }
  return flags;
 },
 flagsToPermissionString: function(flag) {
  var perms = [ "r", "w", "rw" ][flag & 3];
  if (flag & 512) {
   perms += "w";
  }
  return perms;
 },
 nodePermissions: function(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
   return 13;
  } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
   return 13;
  } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
   return 13;
  }
  return 0;
 },
 mayLookup: function(dir) {
  var err = FS.nodePermissions(dir, "x");
  if (err) return err;
  if (!dir.node_ops.lookup) return 13;
  return 0;
 },
 mayCreate: function(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return 17;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 },
 mayDelete: function(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var err = FS.nodePermissions(dir, "wx");
  if (err) {
   return err;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return 20;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return 16;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return 21;
   }
  }
  return 0;
 },
 mayOpen: function(node, flags) {
  if (!node) {
   return 2;
  }
  if (FS.isLink(node.mode)) {
   return 40;
  } else if (FS.isDir(node.mode)) {
   if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
    return 21;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 },
 MAX_OPEN_FDS: 4096,
 nextfd: function(fd_start, fd_end) {
  fd_start = fd_start || 0;
  fd_end = fd_end || FS.MAX_OPEN_FDS;
  for (var fd = fd_start; fd <= fd_end; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(24);
 },
 getStream: function(fd) {
  return FS.streams[fd];
 },
 createStream: function(stream, fd_start, fd_end) {
  if (!FS.FSStream) {
   FS.FSStream = function() {};
   FS.FSStream.prototype = {};
   Object.defineProperties(FS.FSStream.prototype, {
    object: {
     get: function() {
      return this.node;
     },
     set: function(val) {
      this.node = val;
     }
    },
    isRead: {
     get: function() {
      return (this.flags & 2097155) !== 1;
     }
    },
    isWrite: {
     get: function() {
      return (this.flags & 2097155) !== 0;
     }
    },
    isAppend: {
     get: function() {
      return this.flags & 1024;
     }
    }
   });
  }
  var newStream = new FS.FSStream();
  for (var p in stream) {
   newStream[p] = stream[p];
  }
  stream = newStream;
  var fd = FS.nextfd(fd_start, fd_end);
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 },
 closeStream: function(fd) {
  FS.streams[fd] = null;
 },
 chrdev_stream_ops: {
  open: function(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   if (stream.stream_ops.open) {
    stream.stream_ops.open(stream);
   }
  },
  llseek: function() {
   throw new FS.ErrnoError(29);
  }
 },
 major: function(dev) {
  return dev >> 8;
 },
 minor: function(dev) {
  return dev & 255;
 },
 makedev: function(ma, mi) {
  return ma << 8 | mi;
 },
 registerDevice: function(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 },
 getDevice: function(dev) {
  return FS.devices[dev];
 },
 getMounts: function(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push.apply(check, m.mounts);
  }
  return mounts;
 },
 syncfs: function(populate, callback) {
  if (typeof populate === "function") {
   callback = populate;
   populate = false;
  }
  FS.syncFSRequests++;
  if (FS.syncFSRequests > 1) {
   console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work");
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function doCallback(err) {
   FS.syncFSRequests--;
   return callback(err);
  }
  function done(err) {
   if (err) {
    if (!done.errored) {
     done.errored = true;
     return doCallback(err);
    }
    return;
   }
   if (++completed >= mounts.length) {
    doCallback(null);
   }
  }
  mounts.forEach(function(mount) {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  });
 },
 mount: function(type, opts, mountpoint) {
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(16);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(16);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(20);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 },
 unmount: function(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(22);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach(function(hash) {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.indexOf(current.mount) !== -1) {
     FS.destroyNode(current);
    }
    current = next;
   }
  });
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  node.mount.mounts.splice(idx, 1);
 },
 lookup: function(parent, name) {
  return parent.node_ops.lookup(parent, name);
 },
 mknod: function(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(22);
  }
  var err = FS.mayCreate(parent, name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(1);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 },
 create: function(path, mode) {
  mode = mode !== undefined ? mode : 438;
  mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 },
 mkdir: function(path, mode) {
  mode = mode !== undefined ? mode : 511;
  mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 },
 mkdirTree: function(path, mode) {
  var dirs = path.split("/");
  var d = "";
  for (var i = 0; i < dirs.length; ++i) {
   if (!dirs[i]) continue;
   d += "/" + dirs[i];
   try {
    FS.mkdir(d, mode);
   } catch (e) {
    if (e.errno != 17) throw e;
   }
  }
 },
 mkdev: function(path, mode, dev) {
  if (typeof dev === "undefined") {
   dev = mode;
   mode = 438;
  }
  mode |= 8192;
  return FS.mknod(path, mode, dev);
 },
 symlink: function(oldpath, newpath) {
  if (!PATH.resolve(oldpath)) {
   throw new FS.ErrnoError(2);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(2);
  }
  var newname = PATH.basename(newpath);
  var err = FS.mayCreate(parent, newname);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(1);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 },
 rename: function(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  try {
   lookup = FS.lookupPath(old_path, {
    parent: true
   });
   old_dir = lookup.node;
   lookup = FS.lookupPath(new_path, {
    parent: true
   });
   new_dir = lookup.node;
  } catch (e) {
   throw new FS.ErrnoError(16);
  }
  if (!old_dir || !new_dir) throw new FS.ErrnoError(2);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(18);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(22);
  }
  relative = PATH.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(39);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var err = FS.mayDelete(old_dir, old_name, isdir);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
   throw new FS.ErrnoError(16);
  }
  if (new_dir !== old_dir) {
   err = FS.nodePermissions(old_dir, "w");
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  try {
   if (FS.trackingDelegate["willMovePath"]) {
    FS.trackingDelegate["willMovePath"](old_path, new_path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
  try {
   if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
  } catch (e) {
   console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
 },
 rmdir: function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, true);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(16);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 },
 readdir: function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(20);
  }
  return node.node_ops.readdir(node);
 },
 unlink: function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var err = FS.mayDelete(parent, name, false);
  if (err) {
   throw new FS.ErrnoError(err);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(16);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 },
 readlink: function(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(2);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(22);
  }
  return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
 },
 stat: function(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(2);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(1);
  }
  return node.node_ops.getattr(node);
 },
 lstat: function(path) {
  return FS.stat(path, true);
 },
 chmod: function(path, mode, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(1);
  }
  node.node_ops.setattr(node, {
   mode: mode & 4095 | node.mode & ~4095,
   timestamp: Date.now()
  });
 },
 lchmod: function(path, mode) {
  FS.chmod(path, mode, true);
 },
 fchmod: function(fd, mode) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(9);
  }
  FS.chmod(stream.node, mode);
 },
 chown: function(path, uid, gid, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(1);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 },
 lchown: function(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 },
 fchown: function(fd, uid, gid) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(9);
  }
  FS.chown(stream.node, uid, gid);
 },
 truncate: function(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(22);
  }
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(1);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(21);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(22);
  }
  var err = FS.nodePermissions(node, "w");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 },
 ftruncate: function(fd, len) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(9);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(22);
  }
  FS.truncate(stream.node, len);
 },
 utime: function(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 },
 open: function(path, flags, mode, fd_start, fd_end) {
  if (path === "") {
   throw new FS.ErrnoError(2);
  }
  flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
  mode = typeof mode === "undefined" ? 438 : mode;
  if (flags & 64) {
   mode = mode & 4095 | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path === "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if (flags & 64) {
   if (node) {
    if (flags & 128) {
     throw new FS.ErrnoError(17);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(2);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if (flags & 65536 && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(20);
  }
  if (!created) {
   var err = FS.mayOpen(node, flags);
   if (err) {
    throw new FS.ErrnoError(err);
   }
  }
  if (flags & 512) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  }, fd_start, fd_end);
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
    console.log("FS.trackingDelegate error on read file: " + path);
   }
  }
  try {
   if (FS.trackingDelegate["onOpenFile"]) {
    var trackingFlags = 0;
    if ((flags & 2097155) !== 1) {
     trackingFlags |= FS.tracking.openFlags.READ;
    }
    if ((flags & 2097155) !== 0) {
     trackingFlags |= FS.tracking.openFlags.WRITE;
    }
    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
   }
  } catch (e) {
   console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
  }
  return stream;
 },
 close: function(stream) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if (stream.getdents) stream.getdents = null;
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
  stream.fd = null;
 },
 isClosed: function(stream) {
  return stream.fd === null;
 },
 llseek: function(stream, offset, whence) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(29);
  }
  if (whence != 0 && whence != 1 && whence != 2) {
   throw new FS.ErrnoError(22);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 },
 read: function(stream, buffer, offset, length, position) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(22);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(9);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(21);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(22);
  }
  var seeking = typeof position !== "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(29);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 },
 write: function(stream, buffer, offset, length, position, canOwn) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(22);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(9);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(21);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(22);
  }
  if (stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = typeof position !== "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(29);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  try {
   if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path);
  } catch (e) {
   console.log("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message);
  }
  return bytesWritten;
 },
 allocate: function(stream, offset, length) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(9);
  }
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(22);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(9);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(19);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(95);
  }
  stream.stream_ops.allocate(stream, offset, length);
 },
 mmap: function(stream, buffer, offset, length, position, prot, flags) {
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(13);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(19);
  }
  return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
 },
 msync: function(stream, buffer, offset, length, mmapFlags) {
  if (!stream || !stream.stream_ops.msync) {
   return 0;
  }
  return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
 },
 munmap: function(stream) {
  return 0;
 },
 ioctl: function(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(25);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 },
 readFile: function(path, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "r";
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = UTF8ArrayToString(buf, 0);
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 },
 writeFile: function(path, data, opts) {
  opts = opts || {};
  opts.flags = opts.flags || "w";
  var stream = FS.open(path, opts.flags, opts.mode);
  if (typeof data === "string") {
   var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
   var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
   FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
  } else if (ArrayBuffer.isView(data)) {
   FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
  } else {
   throw new Error("Unsupported data type");
  }
  FS.close(stream);
 },
 cwd: function() {
  return FS.currentPath;
 },
 chdir: function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (lookup.node === null) {
   throw new FS.ErrnoError(2);
  }
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(20);
  }
  var err = FS.nodePermissions(lookup.node, "x");
  if (err) {
   throw new FS.ErrnoError(err);
  }
  FS.currentPath = lookup.path;
 },
 createDefaultDirectories: function() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 },
 createDefaultDevices: function() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: function() {
    return 0;
   },
   write: function(stream, buffer, offset, length, pos) {
    return length;
   }
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var random_device;
  if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
   var randomBuffer = new Uint8Array(1);
   random_device = function() {
    crypto.getRandomValues(randomBuffer);
    return randomBuffer[0];
   };
  } else if (ENVIRONMENT_IS_NODE) {
   try {
    var crypto_module = require("crypto");
    random_device = function() {
     return crypto_module["randomBytes"](1)[0];
    };
   } catch (e) {}
  } else {}
  if (!random_device) {
   random_device = function() {
    abort("random_device");
   };
  }
  FS.createDevice("/dev", "random", random_device);
  FS.createDevice("/dev", "urandom", random_device);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 },
 createSpecialDirectories: function() {
  FS.mkdir("/proc");
  FS.mkdir("/proc/self");
  FS.mkdir("/proc/self/fd");
  FS.mount({
   mount: function() {
    var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
    node.node_ops = {
     lookup: function(parent, name) {
      var fd = +name;
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(9);
      var ret = {
       parent: null,
       mount: {
        mountpoint: "fake"
       },
       node_ops: {
        readlink: function() {
         return stream.path;
        }
       }
      };
      ret.parent = ret;
      return ret;
     }
    };
    return node;
   }
  }, {}, "/proc/self/fd");
 },
 createStandardStreams: function() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", "r");
  var stdout = FS.open("/dev/stdout", "w");
  var stderr = FS.open("/dev/stderr", "w");
 },
 ensureErrnoError: function() {
  if (FS.ErrnoError) return;
  FS.ErrnoError = function ErrnoError(errno, node) {
   this.node = node;
   this.setErrno = function(errno) {
    this.errno = errno;
   };
   this.setErrno(errno);
   this.message = "FS error";
   if (this.stack) Object.defineProperty(this, "stack", {
    value: new Error().stack,
    writable: true
   });
  };
  FS.ErrnoError.prototype = new Error();
  FS.ErrnoError.prototype.constructor = FS.ErrnoError;
  [ 2 ].forEach(function(code) {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  });
 },
 staticInit: function() {
  FS.ensureErrnoError();
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
  FS.createSpecialDirectories();
  FS.filesystems = {
   "MEMFS": MEMFS,
   "IDBFS": IDBFS,
   "NODEFS": NODEFS,
   "WORKERFS": WORKERFS
  };
 },
 init: function(input, output, error) {
  FS.init.initialized = true;
  FS.ensureErrnoError();
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 },
 quit: function() {
  FS.init.initialized = false;
  var fflush = Module["_fflush"];
  if (fflush) fflush(0);
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 },
 getMode: function(canRead, canWrite) {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
 },
 joinPath: function(parts, forceRelative) {
  var path = PATH.join.apply(null, parts);
  if (forceRelative && path[0] == "/") path = path.substr(1);
  return path;
 },
 absolutePath: function(relative, base) {
  return PATH.resolve(base, relative);
 },
 standardizePath: function(path) {
  return PATH.normalize(path);
 },
 findObject: function(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (ret.exists) {
   return ret.object;
  } else {
   ___setErrNo(ret.error);
   return null;
  }
 },
 analyzePath: function(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 },
 createFolder: function(parent, name, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.mkdir(path, mode);
 },
 createPath: function(parent, path, canRead, canWrite) {
  parent = typeof parent === "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 },
 createFile: function(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.create(path, mode);
 },
 createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
  var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
  var mode = FS.getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data === "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, "w");
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
  return node;
 },
 createDevice: function(parent, name, input, output) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open: function(stream) {
    stream.seekable = false;
   },
   close: function(stream) {
    if (output && output.buffer && output.buffer.length) {
     output(10);
    }
   },
   read: function(stream, buffer, offset, length, pos) {
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(5);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(11);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   },
   write: function(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(5);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   }
  });
  return FS.mkdev(path, mode, dev);
 },
 createLink: function(parent, name, target, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  return FS.symlink(target, path);
 },
 forceLoadFile: function(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  var success = true;
  if (typeof XMLHttpRequest !== "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (Module["read"]) {
   try {
    obj.contents = intArrayFromString(Module["read"](obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    success = false;
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
  if (!success) ___setErrNo(5);
  return success;
 },
 createLazyFile: function(parent, name, url, canRead, canWrite) {
  function LazyUint8Array() {
   this.lengthKnown = false;
   this.chunks = [];
  }
  LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
   if (idx > this.length - 1 || idx < 0) {
    return undefined;
   }
   var chunkOffset = idx % this.chunkSize;
   var chunkNum = idx / this.chunkSize | 0;
   return this.getter(chunkNum)[chunkOffset];
  };
  LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
   this.getter = getter;
  };
  LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
   var xhr = new XMLHttpRequest();
   xhr.open("HEAD", url, false);
   xhr.send(null);
   if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
   var datalength = Number(xhr.getResponseHeader("Content-length"));
   var header;
   var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
   var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
   var chunkSize = 1024 * 1024;
   if (!hasByteServing) chunkSize = datalength;
   var doXHR = function(from, to) {
    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
    if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
    if (xhr.overrideMimeType) {
     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    }
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    if (xhr.response !== undefined) {
     return new Uint8Array(xhr.response || []);
    } else {
     return intArrayFromString(xhr.responseText || "", true);
    }
   };
   var lazyArray = this;
   lazyArray.setDataGetter(function(chunkNum) {
    var start = chunkNum * chunkSize;
    var end = (chunkNum + 1) * chunkSize - 1;
    end = Math.min(end, datalength - 1);
    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
     lazyArray.chunks[chunkNum] = doXHR(start, end);
    }
    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
    return lazyArray.chunks[chunkNum];
   });
   if (usesGzip || !datalength) {
    chunkSize = datalength = 1;
    datalength = this.getter(0).length;
    chunkSize = datalength;
    console.log("LazyFiles on gzip forces download of the whole file when length is accessed");
   }
   this._length = datalength;
   this._chunkSize = chunkSize;
   this.lengthKnown = true;
  };
  if (typeof XMLHttpRequest !== "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array();
   Object.defineProperties(lazyArray, {
    length: {
     get: function() {
      if (!this.lengthKnown) {
       this.cacheLength();
      }
      return this._length;
     }
    },
    chunkSize: {
     get: function() {
      if (!this.lengthKnown) {
       this.cacheLength();
      }
      return this._chunkSize;
     }
    }
   });
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperties(node, {
   usedBytes: {
    get: function() {
     return this.contents.length;
    }
   }
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach(function(key) {
   var fn = node.stream_ops[key];
   stream_ops[key] = function forceLoadLazyFile() {
    if (!FS.forceLoadFile(node)) {
     throw new FS.ErrnoError(5);
    }
    return fn.apply(null, arguments);
   };
  });
  stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
   if (!FS.forceLoadFile(node)) {
    throw new FS.ErrnoError(5);
   }
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  };
  node.stream_ops = stream_ops;
  return node;
 },
 createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
  Browser.init();
  var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency("cp " + fullname);
  function processData(byteArray) {
   function finish(byteArray) {
    if (preFinish) preFinish();
    if (!dontCreateFile) {
     FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
    if (onload) onload();
    removeRunDependency(dep);
   }
   var handled = false;
   Module["preloadPlugins"].forEach(function(plugin) {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
     plugin["handle"](byteArray, fullname, finish, function() {
      if (onerror) onerror();
      removeRunDependency(dep);
     });
     handled = true;
    }
   });
   if (!handled) finish(byteArray);
  }
  addRunDependency(dep);
  if (typeof url == "string") {
   Browser.asyncLoad(url, function(byteArray) {
    processData(byteArray);
   }, onerror);
  } else {
   processData(url);
  }
 },
 indexedDB: function() {
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
 },
 DB_NAME: function() {
  return "EM_FS_" + window.location.pathname;
 },
 DB_VERSION: 20,
 DB_STORE_NAME: "FILE_DATA",
 saveFilesToDB: function(paths, onload, onerror) {
  onload = onload || function() {};
  onerror = onerror || function() {};
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
   console.log("creating db");
   var db = openRequest.result;
   db.createObjectStore(FS.DB_STORE_NAME);
  };
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   var transaction = db.transaction([ FS.DB_STORE_NAME ], "readwrite");
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach(function(path) {
    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
    putRequest.onsuccess = function putRequest_onsuccess() {
     ok++;
     if (ok + fail == total) finish();
    };
    putRequest.onerror = function putRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   });
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 },
 loadFilesFromDB: function(paths, onload, onerror) {
  onload = onload || function() {};
  onerror = onerror || function() {};
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = onerror;
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   try {
    var transaction = db.transaction([ FS.DB_STORE_NAME ], "readonly");
   } catch (e) {
    onerror(e);
    return;
   }
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach(function(path) {
    var getRequest = files.get(path);
    getRequest.onsuccess = function getRequest_onsuccess() {
     if (FS.analyzePath(path).exists) {
      FS.unlink(path);
     }
     FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
     ok++;
     if (ok + fail == total) finish();
    };
    getRequest.onerror = function getRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   });
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 }
};

var ERRNO_CODES = {
 EPERM: 1,
 ENOENT: 2,
 ESRCH: 3,
 EINTR: 4,
 EIO: 5,
 ENXIO: 6,
 E2BIG: 7,
 ENOEXEC: 8,
 EBADF: 9,
 ECHILD: 10,
 EAGAIN: 11,
 EWOULDBLOCK: 11,
 ENOMEM: 12,
 EACCES: 13,
 EFAULT: 14,
 ENOTBLK: 15,
 EBUSY: 16,
 EEXIST: 17,
 EXDEV: 18,
 ENODEV: 19,
 ENOTDIR: 20,
 EISDIR: 21,
 EINVAL: 22,
 ENFILE: 23,
 EMFILE: 24,
 ENOTTY: 25,
 ETXTBSY: 26,
 EFBIG: 27,
 ENOSPC: 28,
 ESPIPE: 29,
 EROFS: 30,
 EMLINK: 31,
 EPIPE: 32,
 EDOM: 33,
 ERANGE: 34,
 ENOMSG: 42,
 EIDRM: 43,
 ECHRNG: 44,
 EL2NSYNC: 45,
 EL3HLT: 46,
 EL3RST: 47,
 ELNRNG: 48,
 EUNATCH: 49,
 ENOCSI: 50,
 EL2HLT: 51,
 EDEADLK: 35,
 ENOLCK: 37,
 EBADE: 52,
 EBADR: 53,
 EXFULL: 54,
 ENOANO: 55,
 EBADRQC: 56,
 EBADSLT: 57,
 EDEADLOCK: 35,
 EBFONT: 59,
 ENOSTR: 60,
 ENODATA: 61,
 ETIME: 62,
 ENOSR: 63,
 ENONET: 64,
 ENOPKG: 65,
 EREMOTE: 66,
 ENOLINK: 67,
 EADV: 68,
 ESRMNT: 69,
 ECOMM: 70,
 EPROTO: 71,
 EMULTIHOP: 72,
 EDOTDOT: 73,
 EBADMSG: 74,
 ENOTUNIQ: 76,
 EBADFD: 77,
 EREMCHG: 78,
 ELIBACC: 79,
 ELIBBAD: 80,
 ELIBSCN: 81,
 ELIBMAX: 82,
 ELIBEXEC: 83,
 ENOSYS: 38,
 ENOTEMPTY: 39,
 ENAMETOOLONG: 36,
 ELOOP: 40,
 EOPNOTSUPP: 95,
 EPFNOSUPPORT: 96,
 ECONNRESET: 104,
 ENOBUFS: 105,
 EAFNOSUPPORT: 97,
 EPROTOTYPE: 91,
 ENOTSOCK: 88,
 ENOPROTOOPT: 92,
 ESHUTDOWN: 108,
 ECONNREFUSED: 111,
 EADDRINUSE: 98,
 ECONNABORTED: 103,
 ENETUNREACH: 101,
 ENETDOWN: 100,
 ETIMEDOUT: 110,
 EHOSTDOWN: 112,
 EHOSTUNREACH: 113,
 EINPROGRESS: 115,
 EALREADY: 114,
 EDESTADDRREQ: 89,
 EMSGSIZE: 90,
 EPROTONOSUPPORT: 93,
 ESOCKTNOSUPPORT: 94,
 EADDRNOTAVAIL: 99,
 ENETRESET: 102,
 EISCONN: 106,
 ENOTCONN: 107,
 ETOOMANYREFS: 109,
 EUSERS: 87,
 EDQUOT: 122,
 ESTALE: 116,
 ENOTSUP: 95,
 ENOMEDIUM: 123,
 EILSEQ: 84,
 EOVERFLOW: 75,
 ECANCELED: 125,
 ENOTRECOVERABLE: 131,
 EOWNERDEAD: 130,
 ESTRPIPE: 86
};

var SYSCALLS = {
 DEFAULT_POLLMASK: 5,
 mappings: {},
 umask: 511,
 calculateAt: function(dirfd, path) {
  if (path[0] !== "/") {
   var dir;
   if (dirfd === -100) {
    dir = FS.cwd();
   } else {
    var dirstream = FS.getStream(dirfd);
    if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
    dir = dirstream.path;
   }
   path = PATH.join2(dir, path);
  }
  return path;
 },
 doStat: function(func, path, buf) {
  try {
   var stat = func(path);
  } catch (e) {
   if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
    return -ERRNO_CODES.ENOTDIR;
   }
   throw e;
  }
  HEAP32[buf >> 2] = stat.dev;
  HEAP32[buf + 4 >> 2] = 0;
  HEAP32[buf + 8 >> 2] = stat.ino;
  HEAP32[buf + 12 >> 2] = stat.mode;
  HEAP32[buf + 16 >> 2] = stat.nlink;
  HEAP32[buf + 20 >> 2] = stat.uid;
  HEAP32[buf + 24 >> 2] = stat.gid;
  HEAP32[buf + 28 >> 2] = stat.rdev;
  HEAP32[buf + 32 >> 2] = 0;
  HEAP32[buf + 36 >> 2] = stat.size;
  HEAP32[buf + 40 >> 2] = 4096;
  HEAP32[buf + 44 >> 2] = stat.blocks;
  HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
  HEAP32[buf + 52 >> 2] = 0;
  HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
  HEAP32[buf + 60 >> 2] = 0;
  HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
  HEAP32[buf + 68 >> 2] = 0;
  HEAP32[buf + 72 >> 2] = stat.ino;
  return 0;
 },
 doMsync: function(addr, stream, len, flags) {
  var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
  FS.msync(stream, buffer, 0, len, flags);
 },
 doMkdir: function(path, mode) {
  path = PATH.normalize(path);
  if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
  FS.mkdir(path, mode, 0);
  return 0;
 },
 doMknod: function(path, mode, dev) {
  switch (mode & 61440) {
  case 32768:
  case 8192:
  case 24576:
  case 4096:
  case 49152:
   break;

  default:
   return -ERRNO_CODES.EINVAL;
  }
  FS.mknod(path, mode, dev);
  return 0;
 },
 doReadlink: function(path, buf, bufsize) {
  if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
  var ret = FS.readlink(path);
  var len = Math.min(bufsize, lengthBytesUTF8(ret));
  var endChar = HEAP8[buf + len];
  stringToUTF8(ret, buf, bufsize + 1);
  HEAP8[buf + len] = endChar;
  return len;
 },
 doAccess: function(path, amode) {
  if (amode & ~7) {
   return -ERRNO_CODES.EINVAL;
  }
  var node;
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  node = lookup.node;
  var perms = "";
  if (amode & 4) perms += "r";
  if (amode & 2) perms += "w";
  if (amode & 1) perms += "x";
  if (perms && FS.nodePermissions(node, perms)) {
   return -ERRNO_CODES.EACCES;
  }
  return 0;
 },
 doDup: function(path, flags, suggestFD) {
  var suggest = FS.getStream(suggestFD);
  if (suggest) FS.close(suggest);
  return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
 },
 doReadv: function(stream, iov, iovcnt, offset) {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
   var ptr = HEAP32[iov + i * 8 >> 2];
   var len = HEAP32[iov + (i * 8 + 4) >> 2];
   var curr = FS.read(stream, HEAP8, ptr, len, offset);
   if (curr < 0) return -1;
   ret += curr;
   if (curr < len) break;
  }
  return ret;
 },
 doWritev: function(stream, iov, iovcnt, offset) {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
   var ptr = HEAP32[iov + i * 8 >> 2];
   var len = HEAP32[iov + (i * 8 + 4) >> 2];
   var curr = FS.write(stream, HEAP8, ptr, len, offset);
   if (curr < 0) return -1;
   ret += curr;
  }
  return ret;
 },
 varargs: 0,
 get: function(varargs) {
  SYSCALLS.varargs += 4;
  var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
  return ret;
 },
 getStr: function() {
  var ret = UTF8ToString(SYSCALLS.get());
  return ret;
 },
 getStreamFromFD: function() {
  var stream = FS.getStream(SYSCALLS.get());
  if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  return stream;
 },
 getSocketFromFD: function() {
  var socket = SOCKFS.getSocket(SYSCALLS.get());
  if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
  return socket;
 },
 getSocketAddress: function(allowNull) {
  var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
  if (allowNull && addrp === 0) return null;
  var info = __read_sockaddr(addrp, addrlen);
  if (info.errno) throw new FS.ErrnoError(info.errno);
  info.addr = DNS.lookup_addr(info.addr) || info.addr;
  return info;
 },
 get64: function() {
  var low = SYSCALLS.get(), high = SYSCALLS.get();
  return low;
 },
 getZero: function() {
  SYSCALLS.get();
 }
};

function ___syscall10(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var path = SYSCALLS.getStr();
  FS.unlink(path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall140(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
  var offset = offset_low;
  FS.llseek(stream, offset, whence);
  HEAP32[result >> 2] = stream.position;
  if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall145(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
  return SYSCALLS.doReadv(stream, iov, iovcnt);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall146(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
  return SYSCALLS.doWritev(stream, iov, iovcnt);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall196(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var path = SYSCALLS.getStr(), buf = SYSCALLS.get();
  return SYSCALLS.doStat(FS.lstat, path, buf);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall221(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), cmd = SYSCALLS.get();
  switch (cmd) {
  case 0:
   {
    var arg = SYSCALLS.get();
    if (arg < 0) {
     return -ERRNO_CODES.EINVAL;
    }
    var newStream;
    newStream = FS.open(stream.path, stream.flags, 0, arg);
    return newStream.fd;
   }

  case 1:
  case 2:
   return 0;

  case 3:
   return stream.flags;

  case 4:
   {
    var arg = SYSCALLS.get();
    stream.flags |= arg;
    return 0;
   }

  case 12:
   {
    var arg = SYSCALLS.get();
    var offset = 0;
    HEAP16[arg + offset >> 1] = 2;
    return 0;
   }

  case 13:
  case 14:
   return 0;

  case 16:
  case 8:
   return -ERRNO_CODES.EINVAL;

  case 9:
   ___setErrNo(ERRNO_CODES.EINVAL);
   return -1;

  default:
   {
    return -ERRNO_CODES.EINVAL;
   }
  }
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall330(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var old = SYSCALLS.getStreamFromFD(), suggestFD = SYSCALLS.get(), flags = SYSCALLS.get();
  if (old.fd === suggestFD) return -ERRNO_CODES.EINVAL;
  return SYSCALLS.doDup(old.path, old.flags, suggestFD);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall38(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var old_path = SYSCALLS.getStr(), new_path = SYSCALLS.getStr();
  FS.rename(old_path, new_path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall40(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var path = SYSCALLS.getStr();
  FS.rmdir(path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall5(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var pathname = SYSCALLS.getStr(), flags = SYSCALLS.get(), mode = SYSCALLS.get();
  var stream = FS.open(pathname, flags, mode);
  return stream.fd;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall54(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
  switch (op) {
  case 21509:
  case 21505:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  case 21510:
  case 21511:
  case 21512:
  case 21506:
  case 21507:
  case 21508:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  case 21519:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    var argp = SYSCALLS.get();
    HEAP32[argp >> 2] = 0;
    return 0;
   }

  case 21520:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return -ERRNO_CODES.EINVAL;
   }

  case 21531:
   {
    var argp = SYSCALLS.get();
    return FS.ioctl(stream, op, argp);
   }

  case 21523:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  case 21524:
   {
    if (!stream.tty) return -ERRNO_CODES.ENOTTY;
    return 0;
   }

  default:
   abort("bad ioctl syscall " + op);
  }
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall6(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD();
  FS.close(stream);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall63(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var old = SYSCALLS.getStreamFromFD(), suggestFD = SYSCALLS.get();
  if (old.fd === suggestFD) return suggestFD;
  return SYSCALLS.doDup(old.path, old.flags, suggestFD);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___syscall91(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var addr = SYSCALLS.get(), len = SYSCALLS.get();
  var info = SYSCALLS.mappings[addr];
  if (!info) return 0;
  if (len === info.len) {
   var stream = FS.getStream(info.fd);
   SYSCALLS.doMsync(addr, stream, len, info.flags);
   FS.munmap(stream);
   SYSCALLS.mappings[addr] = null;
   if (info.allocated) {
    _free(info.malloc);
   }
  }
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___unlock() {}

function _abort() {
 Module["abort"]();
}

function _clock() {
 if (_clock.start === undefined) _clock.start = Date.now();
 return (Date.now() - _clock.start) * (1e6 / 1e3) | 0;
}

function _difftime(time1, time0) {
 return time1 - time0;
}

function _emscripten_get_heap_size() {
 return HEAP8.length;
}

function abortOnCannotGrowMemory(requestedSize) {
 abort("OOM");
}

function _emscripten_resize_heap(requestedSize) {
 abortOnCannotGrowMemory(requestedSize);
}

function _exit(status) {
 exit(status);
}

function _getenv(name) {
 if (name === 0) return 0;
 name = UTF8ToString(name);
 if (!ENV.hasOwnProperty(name)) return 0;
 if (_getenv.ret) _free(_getenv.ret);
 _getenv.ret = allocateUTF8(ENV[name]);
 return _getenv.ret;
}

var ___tm_current = 21136;

var ___tm_timezone = (stringToUTF8("GMT", 21184, 4), 21184);

function _gmtime_r(time, tmPtr) {
 var date = new Date(HEAP32[time >> 2] * 1e3);
 HEAP32[tmPtr >> 2] = date.getUTCSeconds();
 HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
 HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
 HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
 HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
 HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
 HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
 HEAP32[tmPtr + 36 >> 2] = 0;
 HEAP32[tmPtr + 32 >> 2] = 0;
 var start = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
 var yday = (date.getTime() - start) / (1e3 * 60 * 60 * 24) | 0;
 HEAP32[tmPtr + 28 >> 2] = yday;
 HEAP32[tmPtr + 40 >> 2] = ___tm_timezone;
 return tmPtr;
}

function _gmtime(time) {
 return _gmtime_r(time, ___tm_current);
}

function _llvm_log10_f32(x) {
 return Math.log(x) / Math.LN10;
}

function _llvm_log10_f64(a0) {
 return _llvm_log10_f32(a0);
}

function _llvm_log2_f32(x) {
 return Math.log(x) / Math.LN2;
}

function _llvm_log2_f64(a0) {
 return _llvm_log2_f32(a0);
}

function _tzset() {
 if (_tzset.called) return;
 _tzset.called = true;
 HEAP32[__get_timezone() >> 2] = new Date().getTimezoneOffset() * 60;
 var winter = new Date(2e3, 0, 1);
 var summer = new Date(2e3, 6, 1);
 HEAP32[__get_daylight() >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());
 function extractZone(date) {
  var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
  return match ? match[1] : "GMT";
 }
 var winterName = extractZone(winter);
 var summerName = extractZone(summer);
 var winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL);
 var summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
 if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
  HEAP32[__get_tzname() >> 2] = winterNamePtr;
  HEAP32[__get_tzname() + 4 >> 2] = summerNamePtr;
 } else {
  HEAP32[__get_tzname() >> 2] = summerNamePtr;
  HEAP32[__get_tzname() + 4 >> 2] = winterNamePtr;
 }
}

function _localtime_r(time, tmPtr) {
 _tzset();
 var date = new Date(HEAP32[time >> 2] * 1e3);
 HEAP32[tmPtr >> 2] = date.getSeconds();
 HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
 HEAP32[tmPtr + 8 >> 2] = date.getHours();
 HEAP32[tmPtr + 12 >> 2] = date.getDate();
 HEAP32[tmPtr + 16 >> 2] = date.getMonth();
 HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
 HEAP32[tmPtr + 24 >> 2] = date.getDay();
 var start = new Date(date.getFullYear(), 0, 1);
 var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
 HEAP32[tmPtr + 28 >> 2] = yday;
 HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
 var summerOffset = new Date(2e3, 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
 HEAP32[tmPtr + 32 >> 2] = dst;
 var zonePtr = HEAP32[__get_tzname() + (dst ? 4 : 0) >> 2];
 HEAP32[tmPtr + 40 >> 2] = zonePtr;
 return tmPtr;
}

function _localtime(time) {
 return _localtime_r(time, ___tm_current);
}

function _longjmp(env, value) {
 _setThrew(env, value || 1);
 throw "longjmp";
}

function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
}

function _mktime(tmPtr) {
 _tzset();
 var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
 var dst = HEAP32[tmPtr + 32 >> 2];
 var guessedOffset = date.getTimezoneOffset();
 var start = new Date(date.getFullYear(), 0, 1);
 var summerOffset = new Date(2e3, 6, 1).getTimezoneOffset();
 var winterOffset = start.getTimezoneOffset();
 var dstOffset = Math.min(winterOffset, summerOffset);
 if (dst < 0) {
  HEAP32[tmPtr + 32 >> 2] = Number(summerOffset != winterOffset && dstOffset == guessedOffset);
 } else if (dst > 0 != (dstOffset == guessedOffset)) {
  var nonDstOffset = Math.max(winterOffset, summerOffset);
  var trueOffset = dst > 0 ? dstOffset : nonDstOffset;
  date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4);
 }
 HEAP32[tmPtr + 24 >> 2] = date.getDay();
 var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
 HEAP32[tmPtr + 28 >> 2] = yday;
 return date.getTime() / 1e3 | 0;
}

function __isLeapYear(year) {
 return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function __arraySum(array, index) {
 var sum = 0;
 for (var i = 0; i <= index; sum += array[i++]) ;
 return sum;
}

var __MONTH_DAYS_LEAP = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

var __MONTH_DAYS_REGULAR = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

function __addDays(date, days) {
 var newDate = new Date(date.getTime());
 while (days > 0) {
  var leap = __isLeapYear(newDate.getFullYear());
  var currentMonth = newDate.getMonth();
  var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
  if (days > daysInCurrentMonth - newDate.getDate()) {
   days -= daysInCurrentMonth - newDate.getDate() + 1;
   newDate.setDate(1);
   if (currentMonth < 11) {
    newDate.setMonth(currentMonth + 1);
   } else {
    newDate.setMonth(0);
    newDate.setFullYear(newDate.getFullYear() + 1);
   }
  } else {
   newDate.setDate(newDate.getDate() + days);
   return newDate;
  }
 }
 return newDate;
}

function _strftime(s, maxsize, format, tm) {
 var tm_zone = HEAP32[tm + 40 >> 2];
 var date = {
  tm_sec: HEAP32[tm >> 2],
  tm_min: HEAP32[tm + 4 >> 2],
  tm_hour: HEAP32[tm + 8 >> 2],
  tm_mday: HEAP32[tm + 12 >> 2],
  tm_mon: HEAP32[tm + 16 >> 2],
  tm_year: HEAP32[tm + 20 >> 2],
  tm_wday: HEAP32[tm + 24 >> 2],
  tm_yday: HEAP32[tm + 28 >> 2],
  tm_isdst: HEAP32[tm + 32 >> 2],
  tm_gmtoff: HEAP32[tm + 36 >> 2],
  tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
 };
 var pattern = UTF8ToString(format);
 var EXPANSION_RULES_1 = {
  "%c": "%a %b %d %H:%M:%S %Y",
  "%D": "%m/%d/%y",
  "%F": "%Y-%m-%d",
  "%h": "%b",
  "%r": "%I:%M:%S %p",
  "%R": "%H:%M",
  "%T": "%H:%M:%S",
  "%x": "%m/%d/%y",
  "%X": "%H:%M:%S"
 };
 for (var rule in EXPANSION_RULES_1) {
  pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule]);
 }
 var WEEKDAYS = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
 var MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
 function leadingSomething(value, digits, character) {
  var str = typeof value === "number" ? value.toString() : value || "";
  while (str.length < digits) {
   str = character[0] + str;
  }
  return str;
 }
 function leadingNulls(value, digits) {
  return leadingSomething(value, digits, "0");
 }
 function compareByDay(date1, date2) {
  function sgn(value) {
   return value < 0 ? -1 : value > 0 ? 1 : 0;
  }
  var compare;
  if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
   if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
    compare = sgn(date1.getDate() - date2.getDate());
   }
  }
  return compare;
 }
 function getFirstWeekStartDate(janFourth) {
  switch (janFourth.getDay()) {
  case 0:
   return new Date(janFourth.getFullYear() - 1, 11, 29);

  case 1:
   return janFourth;

  case 2:
   return new Date(janFourth.getFullYear(), 0, 3);

  case 3:
   return new Date(janFourth.getFullYear(), 0, 2);

  case 4:
   return new Date(janFourth.getFullYear(), 0, 1);

  case 5:
   return new Date(janFourth.getFullYear() - 1, 11, 31);

  case 6:
   return new Date(janFourth.getFullYear() - 1, 11, 30);
  }
 }
 function getWeekBasedYear(date) {
  var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
  var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
  var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
  var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
  var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
  if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
   if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
    return thisDate.getFullYear() + 1;
   } else {
    return thisDate.getFullYear();
   }
  } else {
   return thisDate.getFullYear() - 1;
  }
 }
 var EXPANSION_RULES_2 = {
  "%a": function(date) {
   return WEEKDAYS[date.tm_wday].substring(0, 3);
  },
  "%A": function(date) {
   return WEEKDAYS[date.tm_wday];
  },
  "%b": function(date) {
   return MONTHS[date.tm_mon].substring(0, 3);
  },
  "%B": function(date) {
   return MONTHS[date.tm_mon];
  },
  "%C": function(date) {
   var year = date.tm_year + 1900;
   return leadingNulls(year / 100 | 0, 2);
  },
  "%d": function(date) {
   return leadingNulls(date.tm_mday, 2);
  },
  "%e": function(date) {
   return leadingSomething(date.tm_mday, 2, " ");
  },
  "%g": function(date) {
   return getWeekBasedYear(date).toString().substring(2);
  },
  "%G": function(date) {
   return getWeekBasedYear(date);
  },
  "%H": function(date) {
   return leadingNulls(date.tm_hour, 2);
  },
  "%I": function(date) {
   var twelveHour = date.tm_hour;
   if (twelveHour == 0) twelveHour = 12; else if (twelveHour > 12) twelveHour -= 12;
   return leadingNulls(twelveHour, 2);
  },
  "%j": function(date) {
   return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3);
  },
  "%m": function(date) {
   return leadingNulls(date.tm_mon + 1, 2);
  },
  "%M": function(date) {
   return leadingNulls(date.tm_min, 2);
  },
  "%n": function() {
   return "\n";
  },
  "%p": function(date) {
   if (date.tm_hour >= 0 && date.tm_hour < 12) {
    return "AM";
   } else {
    return "PM";
   }
  },
  "%S": function(date) {
   return leadingNulls(date.tm_sec, 2);
  },
  "%t": function() {
   return "\t";
  },
  "%u": function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay() || 7;
  },
  "%U": function(date) {
   var janFirst = new Date(date.tm_year + 1900, 0, 1);
   var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstSunday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
    var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00";
  },
  "%V": function(date) {
   var janFourthThisYear = new Date(date.tm_year + 1900, 0, 4);
   var janFourthNextYear = new Date(date.tm_year + 1901, 0, 4);
   var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
   var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
   var endDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
   if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
    return "53";
   }
   if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
    return "01";
   }
   var daysDifference;
   if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
    daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate();
   } else {
    daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate();
   }
   return leadingNulls(Math.ceil(daysDifference / 7), 2);
  },
  "%w": function(date) {
   var day = new Date(date.tm_year + 1900, date.tm_mon + 1, date.tm_mday, 0, 0, 0, 0);
   return day.getDay();
  },
  "%W": function(date) {
   var janFirst = new Date(date.tm_year, 0, 1);
   var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
   var endDate = new Date(date.tm_year + 1900, date.tm_mon, date.tm_mday);
   if (compareByDay(firstMonday, endDate) < 0) {
    var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
    var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
    var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
    return leadingNulls(Math.ceil(days / 7), 2);
   }
   return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00";
  },
  "%y": function(date) {
   return (date.tm_year + 1900).toString().substring(2);
  },
  "%Y": function(date) {
   return date.tm_year + 1900;
  },
  "%z": function(date) {
   var off = date.tm_gmtoff;
   var ahead = off >= 0;
   off = Math.abs(off) / 60;
   off = off / 60 * 100 + off % 60;
   return (ahead ? "+" : "-") + String("0000" + off).slice(-4);
  },
  "%Z": function(date) {
   return date.tm_zone;
  },
  "%%": function() {
   return "%";
  }
 };
 for (var rule in EXPANSION_RULES_2) {
  if (pattern.indexOf(rule) >= 0) {
   pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date));
  }
 }
 var bytes = intArrayFromString(pattern, false);
 if (bytes.length > maxsize) {
  return 0;
 }
 writeArrayToMemory(bytes, s);
 return bytes.length - 1;
}

function _system(command) {
 ___setErrNo(11);
 return -1;
}

function _time(ptr) {
 var ret = Date.now() / 1e3 | 0;
 if (ptr) {
  HEAP32[ptr >> 2] = ret;
 }
 return ret;
}

if (ENVIRONMENT_IS_NODE) {
 _emscripten_get_now = function _emscripten_get_now_actual() {
  var t = process["hrtime"]();
  return t[0] * 1e3 + t[1] / 1e6;
 };
} else if (typeof dateNow !== "undefined") {
 _emscripten_get_now = dateNow;
} else if (typeof performance === "object" && performance && typeof performance["now"] === "function") {
 _emscripten_get_now = function() {
  return performance["now"]();
 };
} else {
 _emscripten_get_now = Date.now;
}

FS.staticInit();

if (ENVIRONMENT_IS_NODE) {
 var fs = require("fs");
 var NODEJS_PATH = require("path");
 NODEFS.staticInit();
}

function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}

function invoke_vii(index, a1, a2) {
 var sp = stackSave();
 try {
  dynCall_vii(index, a1, a2);
 } catch (e) {
  stackRestore(sp);
  if (e !== e + 0 && e !== "longjmp") throw e;
  _setThrew(1, 0);
 }
}

var asmGlobalArg = {};

var asmLibraryArg = {
 "e": abort,
 "g": setTempRet0,
 "h": getTempRet0,
 "r": invoke_vii,
 "Q": ___buildEnvironment,
 "P": ___clock_gettime,
 "k": ___lock,
 "O": ___map_file,
 "q": ___setErrNo,
 "p": ___syscall10,
 "N": ___syscall140,
 "M": ___syscall145,
 "o": ___syscall146,
 "L": ___syscall196,
 "d": ___syscall221,
 "K": ___syscall330,
 "J": ___syscall38,
 "I": ___syscall40,
 "n": ___syscall5,
 "m": ___syscall54,
 "j": ___syscall6,
 "H": ___syscall63,
 "G": ___syscall91,
 "c": ___unlock,
 "F": _abort,
 "l": _clock,
 "E": _difftime,
 "D": _emscripten_get_heap_size,
 "C": _emscripten_memcpy_big,
 "B": _emscripten_resize_heap,
 "A": _exit,
 "b": _getenv,
 "z": _gmtime,
 "y": _llvm_log10_f64,
 "x": _llvm_log2_f64,
 "w": _localtime,
 "i": _longjmp,
 "v": _mktime,
 "u": _strftime,
 "t": _system,
 "f": _time,
 "s": abortOnCannotGrowMemory,
 "a": DYNAMICTOP_PTR
};

var asm = Module["asm"](asmGlobalArg, asmLibraryArg, buffer);

Module["asm"] = asm;

var ___emscripten_environ_constructor = Module["___emscripten_environ_constructor"] = function() {
 return Module["asm"]["R"].apply(null, arguments);
};

var ___errno_location = Module["___errno_location"] = function() {
 return Module["asm"]["S"].apply(null, arguments);
};

var __get_daylight = Module["__get_daylight"] = function() {
 return Module["asm"]["T"].apply(null, arguments);
};

var __get_timezone = Module["__get_timezone"] = function() {
 return Module["asm"]["U"].apply(null, arguments);
};

var __get_tzname = Module["__get_tzname"] = function() {
 return Module["asm"]["V"].apply(null, arguments);
};

var _compile_lua = Module["_compile_lua"] = function() {
 return Module["asm"]["W"].apply(null, arguments);
};

var _continue_lua = Module["_continue_lua"] = function() {
 return Module["asm"]["X"].apply(null, arguments);
};

var _free = Module["_free"] = function() {
 return Module["asm"]["Y"].apply(null, arguments);
};

var _malloc = Module["_malloc"] = function() {
 return Module["asm"]["Z"].apply(null, arguments);
};

var _setThrew = Module["_setThrew"] = function() {
 return Module["asm"]["_"].apply(null, arguments);
};

var stackAlloc = Module["stackAlloc"] = function() {
 return Module["asm"]["aa"].apply(null, arguments);
};

var stackRestore = Module["stackRestore"] = function() {
 return Module["asm"]["ba"].apply(null, arguments);
};

var stackSave = Module["stackSave"] = function() {
 return Module["asm"]["ca"].apply(null, arguments);
};

var dynCall_vii = Module["dynCall_vii"] = function() {
 return Module["asm"]["$"].apply(null, arguments);
};

Module["asm"] = asm;

Module["ccall"] = ccall;

Module["cwrap"] = cwrap;

Module["then"] = function(func) {
 if (Module["calledRun"]) {
  func(Module);
 } else {
  var old = Module["onRuntimeInitialized"];
  Module["onRuntimeInitialized"] = function() {
   if (old) old();
   func(Module);
  };
 }
 return Module;
};

function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}

ExitStatus.prototype = new Error();

ExitStatus.prototype.constructor = ExitStatus;

dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"]) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};

function run(args) {
 args = args || Module["arguments"];
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
}

Module["run"] = run;

function exit(status, implicit) {
 if (implicit && Module["noExitRuntime"] && status === 0) {
  return;
 }
 if (Module["noExitRuntime"]) {} else {
  ABORT = true;
  EXITSTATUS = status;
  exitRuntime();
  if (Module["onExit"]) Module["onExit"](status);
 }
 Module["quit"](status, new ExitStatus(status));
}

function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 if (what !== undefined) {
  out(what);
  err(what);
  what = JSON.stringify(what);
 } else {
  what = "";
 }
 ABORT = true;
 EXITSTATUS = 1;
 throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
}

Module["abort"] = abort;

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

Module["noExitRuntime"] = true;

run();


  return WaLua
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = WaLua;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return WaLua; });
    else if (typeof exports === 'object')
      exports["WaLua"] = WaLua;
    </script>
<script type='text/javascript'>
// CodeFlask injection
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.CodeFlask=t()}(this,function(){"use strict";var e,t,n,a='"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',s="\n  .codeflask {\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    overflow: hidden;\n  }\n\n  .codeflask, .codeflask * {\n    box-sizing: border-box;\n  }\n\n  .codeflask__pre {\n    pointer-events: none;\n    z-index: 3;\n    overflow: hidden;\n  }\n\n  .codeflask__textarea {\n    background: none;\n    border: none;\n    color: "+(e="caret-color",t="#000",(CSS?CSS.supports(e,t):(n=(n=e).split("-").filter(function(e){return!!e}).map(function(e){return e[0].toUpperCase()+e.substr(1)}).join(""))[0].toLowerCase()+n.substr(1)in document.body.style)?"#fff":"#ccc")+";\n    z-index: 1;\n    resize: none;\n    font-family: "+a+";\n    -webkit-appearance: pre;\n    caret-color: #111;\n    z-index: 2;\n    width: 100%;\n    height: 100%;\n  }\n\n  .codeflask--has-line-numbers .codeflask__textarea {\n    width: calc(100% - 40px);\n  }\n\n  .codeflask__code {\n    display: block;\n    font-family: "+a+";\n    overflow: hidden;\n  }\n\n  .codeflask__flatten {\n    padding: 10px;\n    font-size: 13px;\n    line-height: 20px;\n    white-space: pre;\n    position: absolute;\n    top: 0;\n    left: 0;\n    overflow: auto;\n    margin: 0 !important;\n    outline: none;\n    text-align: left;\n  }\n\n  .codeflask--has-line-numbers .codeflask__flatten {\n    width: calc(100% - 40px);\n    left: 40px;\n  }\n\n  .codeflask__line-highlight {\n    position: absolute;\n    top: 10px;\n    left: 0;\n    width: 100%;\n    height: 20px;\n    background: rgba(0,0,0,0.1);\n    z-index: 1;\n  }\n\n  .codeflask__lines {\n    padding: 10px 4px;\n    font-size: 12px;\n    line-height: 20px;\n    font-family: 'Cousine', monospace;\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 40px;\n    height: 100%;\n    text-align: right;\n    color: #999;\n    z-index: 2;\n  }\n\n  .codeflask__lines__line {\n    display: block;\n  }\n\n  .codeflask.codeflask--has-line-numbers {\n    padding-left: 40px;\n  }\n\n  .codeflask.codeflask--has-line-numbers:before {\n    content: '';\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 40px;\n    height: 100%;\n    background: #eee;\n    z-index: 1;\n  }\n";function i(e,t,n){var a=t||"codeflask-style",s=n||document.head;if(!e)return!1;if(document.getElementById(a))return!0;var i=document.createElement("style");return i.innerHTML=e,i.id=a,s.appendChild(i),!0}var r={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"};function o(e){return String(e).replace(/[&<>"'`=/]/g,function(e){return r[e]})}var l="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};var c,u=(function(e){var t="undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{},n=function(){var e=/\blang(?:uage)?-([\w-]+)\b/i,n=0,a=t.Prism={manual:t.Prism&&t.Prism.manual,disableWorkerMessageHandler:t.Prism&&t.Prism.disableWorkerMessageHandler,util:{encode:function(e){return e instanceof s?new s(e.type,a.util.encode(e.content),e.alias):"Array"===a.util.type(e)?e.map(a.util.encode):e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(e){return Object.prototype.toString.call(e).match(/\[object (\w+)\]/)[1]},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function(e,t){var n=a.util.type(e);switch(t=t||{},n){case"Object":if(t[a.util.objId(e)])return t[a.util.objId(e)];var s={};for(var i in t[a.util.objId(e)]=s,e)e.hasOwnProperty(i)&&(s[i]=a.util.clone(e[i],t));return s;case"Array":if(t[a.util.objId(e)])return t[a.util.objId(e)];s=[];return t[a.util.objId(e)]=s,e.forEach(function(e,n){s[n]=a.util.clone(e,t)}),s}return e}},languages:{extend:function(e,t){var n=a.util.clone(a.languages[e]);for(var s in t)n[s]=t[s];return n},insertBefore:function(e,t,n,s){var i=(s=s||a.languages)[e];if(2==arguments.length){for(var r in n=arguments[1])n.hasOwnProperty(r)&&(i[r]=n[r]);return i}var o={};for(var l in i)if(i.hasOwnProperty(l)){if(l==t)for(var r in n)n.hasOwnProperty(r)&&(o[r]=n[r]);o[l]=i[l]}return a.languages.DFS(a.languages,function(t,n){n===s[e]&&t!=e&&(this[t]=o)}),s[e]=o},DFS:function(e,t,n,s){for(var i in s=s||{},e)e.hasOwnProperty(i)&&(t.call(e,i,e[i],n||i),"Object"!==a.util.type(e[i])||s[a.util.objId(e[i])]?"Array"!==a.util.type(e[i])||s[a.util.objId(e[i])]||(s[a.util.objId(e[i])]=!0,a.languages.DFS(e[i],t,i,s)):(s[a.util.objId(e[i])]=!0,a.languages.DFS(e[i],t,null,s)))}},plugins:{},highlightAll:function(e,t){a.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var s={callback:n,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};a.hooks.run("before-highlightall",s);for(var i,r=s.elements||e.querySelectorAll(s.selector),o=0;i=r[o++];)a.highlightElement(i,!0===t,s.callback)},highlightElement:function(n,s,i){for(var r,o,l=n;l&&!e.test(l.className);)l=l.parentNode;l&&(r=(l.className.match(e)||[,""])[1].toLowerCase(),o=a.languages[r]),n.className=n.className.replace(e,"").replace(/\s+/g," ")+" language-"+r,n.parentNode&&(l=n.parentNode,/pre/i.test(l.nodeName)&&(l.className=l.className.replace(e,"").replace(/\s+/g," ")+" language-"+r));var c={element:n,language:r,grammar:o,code:n.textContent};if(a.hooks.run("before-sanity-check",c),!c.code||!c.grammar)return c.code&&(a.hooks.run("before-highlight",c),c.element.textContent=c.code,a.hooks.run("after-highlight",c)),void a.hooks.run("complete",c);if(a.hooks.run("before-highlight",c),s&&t.Worker){var u=new Worker(a.filename);u.onmessage=function(e){c.highlightedCode=e.data,a.hooks.run("before-insert",c),c.element.innerHTML=c.highlightedCode,i&&i.call(c.element),a.hooks.run("after-highlight",c),a.hooks.run("complete",c)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else c.highlightedCode=a.highlight(c.code,c.grammar,c.language),a.hooks.run("before-insert",c),c.element.innerHTML=c.highlightedCode,i&&i.call(n),a.hooks.run("after-highlight",c),a.hooks.run("complete",c)},highlight:function(e,t,n){var i={code:e,grammar:t,language:n};return a.hooks.run("before-tokenize",i),i.tokens=a.tokenize(i.code,i.grammar),a.hooks.run("after-tokenize",i),s.stringify(a.util.encode(i.tokens),i.language)},matchGrammar:function(e,t,n,s,i,r,o){var l=a.Token;for(var c in n)if(n.hasOwnProperty(c)&&n[c]){if(c==o)return;var u=n[c];u="Array"===a.util.type(u)?u:[u];for(var d=0;d<u.length;++d){var h=u[d],p=h.inside,g=!!h.lookbehind,f=!!h.greedy,m=0,b=h.alias;if(f&&!h.pattern.global){var y=h.pattern.toString().match(/[imuy]*$/)[0];h.pattern=RegExp(h.pattern.source,y+"g")}h=h.pattern||h;for(var k=s,v=i;k<t.length;v+=t[k].length,++k){var x=t[k];if(t.length>e.length)return;if(!(x instanceof l)){if(f&&k!=t.length-1){if(h.lastIndex=v,!(L=h.exec(e)))break;for(var w=L.index+(g?L[1].length:0),C=L.index+L[0].length,S=k,T=v,A=t.length;S<A&&(T<C||!t[S].type&&!t[S-1].greedy);++S)w>=(T+=t[S].length)&&(++k,v=T);if(t[k]instanceof l)continue;F=S-k,x=e.slice(v,T),L.index-=v}else{h.lastIndex=0;var L=h.exec(x),F=1}if(L){g&&(m=L[1]?L[1].length:0);C=(w=L.index+m)+(L=L[0].slice(m)).length;var E=x.slice(0,w),_=x.slice(C),N=[k,F];E&&(++k,v+=E.length,N.push(E));var j=new l(c,p?a.tokenize(L,p):L,b,L,f);if(N.push(j),_&&N.push(_),Array.prototype.splice.apply(t,N),1!=F&&a.matchGrammar(e,t,n,k,v,!0,c),r)break}else if(r)break}}}}},tokenize:function(e,t,n){var s=[e],i=t.rest;if(i){for(var r in i)t[r]=i[r];delete t.rest}return a.matchGrammar(e,s,t,0,0,!1),s},hooks:{all:{},add:function(e,t){var n=a.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=a.hooks.all[e];if(n&&n.length)for(var s,i=0;s=n[i++];)s(t)}}},s=a.Token=function(e,t,n,a,s){this.type=e,this.content=t,this.alias=n,this.length=0|(a||"").length,this.greedy=!!s};if(s.stringify=function(e,t,n){if("string"==typeof e)return e;if("Array"===a.util.type(e))return e.map(function(n){return s.stringify(n,t,e)}).join("");var i={type:e.type,content:s.stringify(e.content,t,n),tag:"span",classes:["token",e.type],attributes:{},language:t,parent:n};if(e.alias){var r="Array"===a.util.type(e.alias)?e.alias:[e.alias];Array.prototype.push.apply(i.classes,r)}a.hooks.run("wrap",i);var o=Object.keys(i.attributes).map(function(e){return e+'="'+(i.attributes[e]||"").replace(/"/g,"&quot;")+'"'}).join(" ");return"<"+i.tag+' class="'+i.classes.join(" ")+'"'+(o?" "+o:"")+">"+i.content+"</"+i.tag+">"},!t.document)return t.addEventListener?(a.disableWorkerMessageHandler||t.addEventListener("message",function(e){var n=JSON.parse(e.data),s=n.language,i=n.code,r=n.immediateClose;t.postMessage(a.highlight(i,a.languages[s],s)),r&&t.close()},!1),t.Prism):t.Prism;var i=document.currentScript||[].slice.call(document.getElementsByTagName("script")).pop();return i&&(a.filename=i.src,a.manual||i.hasAttribute("data-manual")||("loading"!==document.readyState?window.requestAnimationFrame?window.requestAnimationFrame(a.highlightAll):window.setTimeout(a.highlightAll,16):document.addEventListener("DOMContentLoaded",a.highlightAll))),t.Prism}();e.exports&&(e.exports=n),void 0!==l&&(l.Prism=n),n.languages.markup={comment:/<!--[\s\S]*?-->/,prolog:/<\?[\s\S]+?\?>/,doctype:/<!DOCTYPE[\s\S]+?>/i,cdata:/<!\[CDATA\[[\s\S]*?]]>/i,tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s+[^\s>\/=]+(?:=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+))?)*\s*\/?>/i,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/i,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"attr-value":{pattern:/=(?:("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|[^\s'">=]+)/i,inside:{punctuation:[/^=/,{pattern:/(^|[^\\])["']/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:/&#?[\da-z]{1,8};/i},n.languages.markup.tag.inside["attr-value"].inside.entity=n.languages.markup.entity,n.hooks.add("wrap",function(e){"entity"===e.type&&(e.attributes.title=e.content.replace(/&amp;/,"&"))}),n.languages.xml=n.languages.markup,n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:/@[\w-]+?.*?(?:;|(?=\s*\{))/i,inside:{rule:/@[\w-]+/}},url:/url\((?:(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1|.*?)\)/i,selector:/[^{}\s][^{};]*?(?=\s*\{)/,string:{pattern:/("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},property:/[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,important:/\B!important\b/i,function:/[-a-z0-9]+(?=\()/i,punctuation:/[(){};:]/},n.languages.css.atrule.inside.rest=n.languages.css,n.languages.markup&&(n.languages.insertBefore("markup","tag",{style:{pattern:/(<style[\s\S]*?>)[\s\S]*?(?=<\/style>)/i,lookbehind:!0,inside:n.languages.css,alias:"language-css",greedy:!0}}),n.languages.insertBefore("inside","attr-value",{"style-attr":{pattern:/\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,inside:{"attr-name":{pattern:/^\s*style/i,inside:n.languages.markup.tag.inside},punctuation:/^\s*=\s*['"]|['"]\s*$/,"attr-value":{pattern:/.+/i,inside:n.languages.css}},alias:"language-css"}},n.languages.markup.tag)),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,boolean:/\b(?:true|false)\b/,function:/[a-z0-9_]+(?=\()/i,number:/\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend("clike",{keyword:/\b(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield)\b/,number:/\b(?:0[xX][\dA-Fa-f]+|0[bB][01]+|0[oO][0-7]+|NaN|Infinity)\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/,function:/[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*\()/i,operator:/-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/}),n.languages.insertBefore("javascript","keyword",{regex:{pattern:/((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[[^\]\r\n]+]|\\.|[^/\\\[\r\n])+\/[gimyu]{0,5}(?=\s*($|[\r\n,.;})\]]))/,lookbehind:!0,greedy:!0},"function-variable":{pattern:/[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=\s*(?:function\b|(?:\([^()]*\)|[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/i,alias:"function"},constant:/\b[A-Z][A-Z\d_]*\b/}),n.languages.insertBefore("javascript","string",{"template-string":{pattern:/`(?:\\[\s\S]|\${[^}]+}|[^\\`])*`/,greedy:!0,inside:{interpolation:{pattern:/\${[^}]+}/,inside:{"interpolation-punctuation":{pattern:/^\${|}$/,alias:"punctuation"},rest:null}},string:/[\s\S]+/}}}),n.languages.javascript["template-string"].inside.interpolation.inside.rest=n.languages.javascript,n.languages.markup&&n.languages.insertBefore("markup","tag",{script:{pattern:/(<script[\s\S]*?>)[\s\S]*?(?=<\/script>)/i,lookbehind:!0,inside:n.languages.javascript,alias:"language-javascript",greedy:!0}}),n.languages.js=n.languages.javascript,"undefined"!=typeof self&&self.Prism&&self.document&&document.querySelector&&(self.Prism.fileHighlight=function(){var e={js:"javascript",py:"python",rb:"ruby",ps1:"powershell",psm1:"powershell",sh:"bash",bat:"batch",h:"c",tex:"latex"};Array.prototype.slice.call(document.querySelectorAll("pre[data-src]")).forEach(function(t){for(var a,s=t.getAttribute("data-src"),i=t,r=/\blang(?:uage)?-([\w-]+)\b/i;i&&!r.test(i.className);)i=i.parentNode;if(i&&(a=(t.className.match(r)||[,""])[1]),!a){var o=(s.match(/\.(\w+)$/)||[,""])[1];a=e[o]||o}var l=document.createElement("code");l.className="language-"+a,t.textContent="",l.textContent="Loading…",t.appendChild(l);var c=new XMLHttpRequest;c.open("GET",s,!0),c.onreadystatechange=function(){4==c.readyState&&(c.status<400&&c.responseText?(l.textContent=c.responseText,n.highlightElement(l)):c.status>=400?l.textContent="✖ Error "+c.status+" while fetching file: "+c.statusText:l.textContent="✖ Error: File does not exist or is empty")},c.send(null)}),n.plugins.toolbar&&n.plugins.toolbar.registerButton("download-file",function(e){var t=e.element.parentNode;if(t&&/pre/i.test(t.nodeName)&&t.hasAttribute("data-src")&&t.hasAttribute("data-download-link")){var n=t.getAttribute("data-src"),a=document.createElement("a");return a.textContent=t.getAttribute("data-download-link-label")||"Download",a.setAttribute("download",""),a.href=n,a}})},document.addEventListener("DOMContentLoaded",self.Prism.fileHighlight))}(c={exports:{}},c.exports),c.exports),d=function(e,t){if(!e)throw Error("CodeFlask expects a parameter which is Element or a String selector");if(!t)throw Error("CodeFlask expects an object containing options as second parameter");if(e.nodeType)this.editorRoot=e;else{var n=document.querySelector(e);n&&(this.editorRoot=n)}this.opts=t,this.startEditor()};return d.prototype.startEditor=function(){if(!i(s,null,this.opts.styleParent))throw Error("Failed to inject CodeFlask CSS.");this.createWrapper(),this.createTextarea(),this.createPre(),this.createCode(),this.runOptions(),this.listenTextarea(),this.populateDefault(),this.updateCode(this.code)},d.prototype.createWrapper=function(){this.code=this.editorRoot.innerHTML,this.editorRoot.innerHTML="",this.elWrapper=this.createElement("div",this.editorRoot),this.elWrapper.classList.add("codeflask")},d.prototype.createTextarea=function(){this.elTextarea=this.createElement("textarea",this.elWrapper),this.elTextarea.classList.add("codeflask__textarea","codeflask__flatten")},d.prototype.createPre=function(){this.elPre=this.createElement("pre",this.elWrapper),this.elPre.classList.add("codeflask__pre","codeflask__flatten")},d.prototype.createCode=function(){this.elCode=this.createElement("code",this.elPre),this.elCode.classList.add("codeflask__code","language-"+(this.opts.language||"html"))},d.prototype.createLineNumbers=function(){this.elLineNumbers=this.createElement("div",this.elWrapper),this.elLineNumbers.classList.add("codeflask__lines"),this.setLineNumber()},d.prototype.createElement=function(e,t){var n=document.createElement(e);return t.appendChild(n),n},d.prototype.runOptions=function(){this.opts.rtl=this.opts.rtl||!1,this.opts.tabSize=this.opts.tabSize||2,this.opts.enableAutocorrect=this.opts.enableAutocorrect||!1,this.opts.lineNumbers=this.opts.lineNumbers||!1,this.opts.defaultTheme=!1!==this.opts.defaultTheme,this.opts.areaId=this.opts.areaId||null,this.opts.ariaLabelledby=this.opts.ariaLabelledby||null,this.opts.readonly=this.opts.readonly||null,"boolean"!=typeof this.opts.handleTabs&&(this.opts.handleTabs=!0),"boolean"!=typeof this.opts.handleSelfClosingCharacters&&(this.opts.handleSelfClosingCharacters=!0),"boolean"!=typeof this.opts.handleNewLineIndentation&&(this.opts.handleNewLineIndentation=!0),!0===this.opts.rtl&&(this.elTextarea.setAttribute("dir","rtl"),this.elPre.setAttribute("dir","rtl")),!1===this.opts.enableAutocorrect&&(this.elTextarea.setAttribute("spellcheck","false"),this.elTextarea.setAttribute("autocapitalize","off"),this.elTextarea.setAttribute("autocomplete","off"),this.elTextarea.setAttribute("autocorrect","off")),this.opts.lineNumbers&&(this.elWrapper.classList.add("codeflask--has-line-numbers"),this.createLineNumbers()),this.opts.defaultTheme&&i("\n.codeflask {\n  background: #fff;\n  color: #4f559c;\n}\n\n.codeflask .token.punctuation {\n  color: #4a4a4a;\n}\n\n.codeflask .token.keyword {\n  color: #8500ff;\n}\n\n.codeflask .token.operator {\n  color: #ff5598;\n}\n\n.codeflask .token.string {\n  color: #41ad8f;\n}\n\n.codeflask .token.comment {\n  color: #9badb7;\n}\n\n.codeflask .token.function {\n  color: #8500ff;\n}\n\n.codeflask .token.boolean {\n  color: #8500ff;\n}\n\n.codeflask .token.number {\n  color: #8500ff;\n}\n\n.codeflask .token.selector {\n  color: #8500ff;\n}\n\n.codeflask .token.property {\n  color: #8500ff;\n}\n\n.codeflask .token.tag {\n  color: #8500ff;\n}\n\n.codeflask .token.attr-value {\n  color: #8500ff;\n}\n","theme-default",this.opts.styleParent),this.opts.areaId&&this.elTextarea.setAttribute("id",this.opts.areaId),this.opts.ariaLabelledby&&this.elTextarea.setAttribute("aria-labelledby",this.opts.ariaLabelledby),this.opts.readonly&&this.enableReadonlyMode()},d.prototype.updateLineNumbersCount=function(){for(var e="",t=1;t<=this.lineNumber;t++)e=e+'<span class="codeflask__lines__line">'+t+"</span>";this.elLineNumbers.innerHTML=e},d.prototype.listenTextarea=function(){var e=this;this.elTextarea.addEventListener("input",function(t){e.code=t.target.value,e.elCode.innerHTML=o(t.target.value),e.highlight(),setTimeout(function(){e.runUpdate(),e.setLineNumber()},1)}),this.elTextarea.addEventListener("keydown",function(t){e.handleTabs(t),e.handleSelfClosingCharacters(t),e.handleNewLineIndentation(t)}),this.elTextarea.addEventListener("scroll",function(t){e.elPre.style.transform="translate3d(-"+t.target.scrollLeft+"px, -"+t.target.scrollTop+"px, 0)",e.elLineNumbers&&(e.elLineNumbers.style.transform="translate3d(0, -"+t.target.scrollTop+"px, 0)")})},d.prototype.handleTabs=function(e){if(this.opts.handleTabs){if(9!==e.keyCode)return;e.preventDefault();var t=this.elTextarea,n=t.selectionDirection,a=t.selectionStart,s=t.selectionEnd,i=t.value,r=i.substr(0,a),o=i.substring(a,s),l=i.substring(s),c=" ".repeat(this.opts.tabSize);if(a!==s&&o.length>=c.length){var u=a-r.split("\n").pop().length,d=c.length,h=c.length;if(e.shiftKey)i.substr(u,c.length)===c?(d=-d,u>a?(o=o.substring(0,u)+o.substring(u+c.length),h=0):u===a?(d=0,h=0,o=o.substring(c.length)):(h=-h,r=r.substring(0,u)+r.substring(u+c.length))):(d=0,h=0),o=o.replace(new RegExp("\n"+c.split("").join("\\"),"g"),"\n");else r=r.substr(0,u)+c+r.substring(u,a),o=o.replace(/\n/g,"\n"+c);t.value=r+o+l,t.selectionStart=a+d,t.selectionEnd=a+o.length+h,t.selectionDirection=n}else t.value=r+c+l,t.selectionStart=a+c.length,t.selectionEnd=a+c.length;var p=t.value;this.updateCode(p),this.elTextarea.selectionEnd=s+this.opts.tabSize}},d.prototype.handleSelfClosingCharacters=function(e){if(this.opts.handleSelfClosingCharacters){var t=e.key;if(["(","[","{","<","'",'"'].includes(t)||[")","]","}",">","'",'"'].includes(t))switch(t){case"(":case")":this.closeCharacter(t);break;case"[":case"]":this.closeCharacter(t);break;case"{":case"}":this.closeCharacter(t);break;case"<":case">":case"'":case'"':this.closeCharacter(t)}}},d.prototype.setLineNumber=function(){this.lineNumber=this.code.split("\n").length,this.opts.lineNumbers&&this.updateLineNumbersCount()},d.prototype.handleNewLineIndentation=function(e){if(this.opts.handleNewLineIndentation&&13===e.keyCode){e.preventDefault();var t=this.elTextarea,n=t.selectionStart,a=t.selectionEnd,s=t.value,i=s.substr(0,n),r=s.substring(a),o=s.lastIndexOf("\n",n-1),l=o+s.slice(o+1).search(/[^ ]|$/),c=l>o?l-o:0,u=i+"\n"+" ".repeat(c)+r;t.value=u,t.selectionStart=n+c+1,t.selectionEnd=n+c+1,this.updateCode(t.value)}},d.prototype.closeCharacter=function(e){var t=this.elTextarea.selectionStart,n=this.elTextarea.selectionEnd;if(this.skipCloseChar(e)){var a=this.code.substr(n,1)===e,s=a?n+1:n,i=!a&&["'",'"'].includes(e)?e:"",r=""+this.code.substring(0,t)+i+this.code.substring(s);this.updateCode(r),this.elTextarea.selectionEnd=++this.elTextarea.selectionStart}else{var o=e;switch(e){case"(":o=String.fromCharCode(e.charCodeAt()+1);break;case"<":case"{":case"[":o=String.fromCharCode(e.charCodeAt()+2)}var l=this.code.substring(t,n),c=""+this.code.substring(0,t)+l+o+this.code.substring(n);this.updateCode(c)}this.elTextarea.selectionEnd=t},d.prototype.skipCloseChar=function(e){var t=this.elTextarea.selectionStart,n=this.elTextarea.selectionEnd,a=Math.abs(n-t)>0;return[")","}","]",">"].includes(e)||["'",'"'].includes(e)&&!a},d.prototype.updateCode=function(e){this.code=e,this.elTextarea.value=e,this.elCode.innerHTML=o(e),this.highlight(),this.setLineNumber(),setTimeout(this.runUpdate.bind(this),1)},d.prototype.updateLanguage=function(e){var t=this.opts.language;this.elCode.classList.remove("language-"+t),this.elCode.classList.add("language-"+e),this.opts.language=e,this.highlight()},d.prototype.addLanguage=function(e,t){u.languages[e]=t},d.prototype.populateDefault=function(){this.updateCode(this.code)},d.prototype.highlight=function(){u.highlightElement(this.elCode,!1)},d.prototype.onUpdate=function(e){if(e&&"[object Function]"!=={}.toString.call(e))throw Error("CodeFlask expects callback of type Function");this.updateCallBack=e},d.prototype.getCode=function(){return this.code},d.prototype.runUpdate=function(){this.updateCallBack&&this.updateCallBack(this.code)},d.prototype.enableReadonlyMode=function(){this.elTextarea.setAttribute("readonly",!0)},d.prototype.disableReadonlyMode=function(){this.elTextarea.removeAttribute("readonly")},d});

// ----------------------------------------------------------------------------

      function addStyleString(str) {
          var node = document.createElement('style');
          node.innerHTML = str;
          document.body.appendChild(node);
      }

      function CodeFlaskLua( editor ) {

        editor.addLanguage('lua',{
          comment: /^#!.+|--(?:\[(=*)\[[\s\S]*?\]\1\]|.*)/m,
          string: {
            pattern: /(["'])(?:(?!\1)[^\\\r\n]|\\z(?:\r\n|\s)|\\(?:\r\n|[\s\S]))*\1|\[(=*)\[[\s\S]*?\]\2\]/,
            greedy: !0
          },
          number: /\b0x[a-f\d]+\.?[a-f\d]*(?:p[+-]?\d+)?\b|\b\d+(?:\.\B|\.?\d*(?:e[+-]?\d+)?\b)|\B\.\d+(?:e[+-]?\d+)?\b/i,
          keyword: /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/,
          function: /(?!\d)\w+(?=\s*(?:[({]))/,
          operator: [/[-+*%^&|#]|\/\/?|<[<=]?|>[>=]?|[=~]=?/, {
            pattern: /(^|[^.])\.\.(?!\.)/,
            lookbehind: !0
          }],
          punctuation: /[\[\](){},;]|\.+|:+/
        });

        addStyleString(`

          .token.comment,
          .token.prolog,
          .token.doctype,
          .token.cdata {
            color: slategray;
          }

          .token.punctuation {
            color: #999;
          }

          .namespace {
          }

          .token.property,
          .token.tag,
          .token.boolean,
          .token.number,
          .token.constant,
          .token.symbol,
          .token.deleted {
            color: #905;
          }

          .token.selector,
          .token.attr-name,
          .token.string,
          .token.char,
          .token.builtin,
          .token.inserted {
            color: #690;
          }

          .token.operator,
          .token.entity,
          .token.url,
          .language-css .token.string,
          .style .token.string {
            color: #9a6e3a;
          }

          .token.atrule,
          .token.attr-value,
          .token.keyword {
            color: #07a;
          }

          .token.function,
          .token.class-name {
            color: #DD4A68;
          }

          .token.regex,
          .token.important,
          .token.variable {
            color: #e90;
          }

          .token.important,
          .token.bold {
            font-weight: bold;
          }

          .token.italic {
            font-style: italic;
          }

          .token.entity {
            cursor: help;
          }
        `);
      };

// --------------------------------------------------------------------------------

      var EditorMode = "lua";

      function my_init(editor, scr){
	      CodeFlaskLua(editor);
        WaLua().then(function(){
          //fengari.load(scr)();
          run_script(scr);
        });
      }

      function run_lua(){
        requestAnimationFrame(function(){
          var s = step_lua();
          //console.log("DEBUG Lua VM step result:",s);
          if (s != 0) return run_lua();
          return s;
        });
      }

      function run_script(scr){
        var status = compile_lua(scr);
        //console.log("DEBUG Lua Compiler result:",status);
        if (status != 0) {
          append_error("Error in lua script\n");
        } else {
          requestAnimationFrame(run_lua);
        }
      }
