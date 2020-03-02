
    --------------------------------------------------------------------

local ord, env = {}, {}
setmetatable(env,{
  __newindex = function(_,k,v)
    if not ord[k] then ord[#ord+1] = k end
    ord[k] = true
    rawset(env, k, v)
  end,
})
local function out_values(typ)
  for i = 1, #ord do
    local k = ord[i]
    if ord[k] and env[k] ~= nil then
      print(k.." =", env[k])
    end
  end
end
local outcalled = 0
function out(typ)
  outcalled = outcalled + 1
  if type(typ) ~= 'string' or typ == "" then
    print('------- '..outcalled)
  else
    print('------- '..outcalled.." - "..typ)
  end
  out_values()
end
local wspath
function ws(path)
  if path == nil or path == "" then path = "calc.lua.ws" end
  if type(path) ~= "string" then error("argument #1 must be a string or nil",2) end
  wspath = path
  local f, e = io.open(path, "r")
  if e then
    print("can not open workspace '"..path.."', starting from an empty one ("..e..")")
  else
    local d, e = f:read"a"
    if e or d == "" then
      error("can not open workspace file '"..path.."' - "..e)
    else
      f, e = load(d,"workspace","t", env)
      if e then
        error("invalid workspace file '"..path.."' - "..e)
      else
        local ws_env, ws_ord = f()
        for k, v in pairs(ws_env) do rawset(env, k, v) end
        for k, v in ipairs(ws_ord) do
          rawset(ord, k, v)
          rawset(ord, v, true)
        end
      end
    end
  end
end
function reset()
  ord = {}
  for k, v in pairs(env) do rawset(env, k, nil) end
  for k, v in pairs(_ENV) do rawset(env, k, v) end
  for k, v in pairs(_ENV.math) do rawset(env, k, v) end
  -- TODO : sandbox ?
end
local function core_compile(calc)
  reset()
  local calcfunc, err = load("RESULT = (function() return "..calc .." end)()","calc","t", env)
  if err then
    calcfunc, err = load(calc,"calc","t", env)
    if err then
      return nil, err
    end
  end
  local function wrapped()
    calcfunc()
    if outcalled > 0 then print('------- '..(1+outcalled).." - final") end
    out_values()
    local function output_table(f, ...)
      f:write("{\n")
      for k, v in ... do
        local ok, keyfield = pcall(string.format, "%q",k)
        if ok then
          local ok, valuefield = pcall(string.format, "%q",v)
          if ok then
            f:write("  ["..keyfield.."] = "..valuefield..",\n")
          end
        end
      end
      f:write("}")
    end
    if wspath then
      local f, e = io.open(wspath, "w")
      if e then error(e) end
      f:write("return ")
      output_table(f, pairs(env))
      f:write(",")
      output_table(f, ipairs(ord))
      f:close()
    end
  end
  return wrapped, nil
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



