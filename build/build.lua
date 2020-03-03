
local tool = {
  {
    name = "calcjs.html",
    wrapper = "scriptedit.html",
    javascript_global = "calcjs_javascript.js",
    setup_script = "calcjs_setup.js",
    initial_content = "calcjs_initial.js",
  },
  {
    name = "calclua.html",
    wrapper = "scriptedit.html",
    javascript_global = {"calclua_javascript.js", "build/walua/walua_build/walua.merged.js", "build/CodeFlask/build/codeflask.min.js", },
    setup_script = "calclua_setup.lua",
    initial_content = "calclua_initial.lua",
  },
}

local function gitget(url)
  local dir = url:match('[^\\/]*$')
  local exist = os.execute('cd build && test -d "'..dir..'"')
  if not exist then
    local ok = os.execute('cd build && git clone "'..url..'"')
    if not ok then
      error('can not git-clone '..url)
    end
  end
end

local function getdeps()
  gitget('http://github.com/pocomane/walua')
  gitget('https://github.com/kazzkiq/CodeFlask')
end

local function generate(tool)
  local template = tool.wrapper:gsub('%.[^%.]-$','')
  local target = tool.name:gsub('%.[^%.]-$','')
  local f, e = io.open(tool.wrapper, 'r')
  if not f then
    error('can not open template file "'..tool.wrapper..'" - '..e)
  end
  local t = f:read'a'
  f:close()
  t = t:gsub('(<[ \t]*script[ \t]*)src[ \t]*=[ \t]*"([^"]*)"(.->)(</[ \t]*script[ \t]*>)',function(pre, inject, post, final)
    inject = tool[inject]
    if type(inject) ~= 'table' then inject = {inject} end
    local i = ''
    for _, path in pairs(inject) do
      local f, e = io.open(path, 'r')
      if not f then
        error('can not open file to inject "'..path..'" - '..e)
      end
      i = i .. '\n' .. f:read'a'
    end
    return pre..post..i..final
  end)
  local f, e = io.open('build/'..tool.name, 'w')
  if not f then
    error('can not open output file "'..tool.name..'" - '..e)
  end
  f:write(t)
  f:close()
end

local function main(arg)
  getdeps()
  for _, v in pairs(tool) do
    generate(v)
  end
end

main(arg)
