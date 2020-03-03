
--------------------------------------------------------------------

-- Hint: change this to customize the code execution behaviour
local function core_compile(scr)
  return load(scr, 'editor-code')
end

--------------------------------------------------------------------

-- This is executed when the page is loaded
walua_version = "WaLua 0.1"

--------------------------------------------------------------------

local cocreate, coresume, costatus = coroutine.create, coroutine.resume, coroutine.status
local trace, error = debug.traceback, error

local func_nop = function() end
local func = func_nop

local monolitic_compile = function(webscript)

 local f, err = core_compile(webscript)
 if err then
   func = func_nop
   io.stderr:write(err,'\r\n')
   return -1
 end

 func = function() xpcall(f, function(err)
   io.stderr:write(trace(err, 2),'\r\n')
 end) end

 return 0
end

local monolitic_step = function()

  func()
  func = func_nop
  return 0
end

--------------------------------------------------------------------

local thread

local collaborative_compile = function(webscript)

 -- TODO : check thread status / delete old thread !??

 local func, err = core_compile(webscript)
 if err then
   io.stderr:write(err,'\r\n')
   return -1
 end

 local wrap = function() xpcall(func, function(err)
   io.stderr:write(trace(err, 2),'\r\n')
 end) end

 thread = cocreate(wrap)
 return 0
end

local collaborative_step = function()

 coresume(thread)

 if 'suspended' == costatus(thread) then return 1 end
 return 0
end

--------------------------------------------------------------------

local wrapped = setmetatable({},{__mode="k"})

function yieldwrap(t, n)
  local origin = t[n]
  if 'function' ~= type(origin) then
    error(tostring(n).." of "..tostring(t).." must be a function")
  end
  local parent = wrapped[t]
  if nil == parent then
    parent = {}
    wrapped[t] = parent
  end
  if nil ~= parent[n] then
    error(tostring(n).." of "..tostring(t).." already wrapped")
  end
  -- TODO : automatically collect when the parent[n] is set to nil from user code
  parent[n] = {
    origin = origin,
    wrapped = function(...)
      local a, b, c, d, e, f, g, h = origin(...)
      coroutine.yield()
      return a, b, c, d, e, f, g, h
    end,
  }
end

function set_monolitic()
  WALUA_COMPILE = monolitic_compile
  WALUA_STEP = monolitic_step
  for k, v in pairs(wrapped) do
    for n, d in pairs(v) do
      k[n] = d.origin
    end
  end
end

function set_collaborative()
  WALUA_COMPILE = collaborative_compile
  WALUA_STEP = collaborative_step
  for k, v in pairs(wrapped) do
    for n, d in pairs(v) do
      k[n] = d.wrapped
    end
  end
end

--------------------------------------------------------------------

yieldwrap(_ENV, 'print')
yieldwrap(io, 'write')

set_monolitic()

--------------------------------------------------------------------

