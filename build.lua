
local tool = {
  {
    name = "calcjs.html",
    wrapper = "scriptedit.html",
    javascript_global = { "calcjs_javascript.js", "build/CodeFlask/build/codeflask.min.js", },
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
  {
    name = "luavm.html",
    wrapper = "scriptedit.html",
    javascript_global = {"luavm_javascript.js", "build/walua/walua_build/walua.merged.js", "build/CodeFlask/build/codeflask.min.js", },
    setup_script = "luavm_setup.lua",
    initial_content = "luavm_initial.lua",
  },
  {
    name = "luasnip_playground.html",
    wrapper = "scriptedit.html",
    javascript_global = {"luavm_javascript.js", "build/walua/walua_build/walua.merged.js", "build/CodeFlask/build/codeflask.min.js", },
    setup_script = { "luavm_setup.lua", "build/luasnip_wrapped.lua", },
    initial_content = "luasnip_initial.lua",
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
  gitget('https://github.com/kazzkiq/CodeFlask')
  gitget('http://github.com/pocomane/walua')
  gitget('http://github.com/pocomane/luasnip')
end

local function luasnipwrap()
  local ls = io.open("build/luasnip/tool/luasnip.lua","r"):read("a")
  ls = '\n\nluasnip=(function()\n'..ls..'\nend)()\n\n'
  local ls = io.open("build/luasnip_wrapped.lua","w"):write(ls):close()
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
  t = t:gsub('(<[ \t]?[^>]*script[^>]*>)//INJECT ([a-zA-Z_]*)(</script>)',function(pre, inject, post)
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
    return pre..i..post
  end)
  local f, e = io.open('build/'..tool.name, 'w')
  if not f then
    error('can not open output file "'..tool.name..'" - '..e)
  end
  f:write(t)
  f:close()
  print('build/'..tool.name.." generated")
end

local function main(arg)
  os.execute('mkdir -p ./build')
  getdeps()
  luasnipwrap()
  for _, v in pairs(tool) do
    generate(v)
  end
end

main(arg)
