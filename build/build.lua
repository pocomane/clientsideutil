
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
    javascript_global = "calclua_javascript.js",
    setup_script = "calclua_setup.lua",
    initial_content = "calclua_initial.lua",
  },
}

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
    local f, e = io.open(inject, 'r')
    if not f then
      error('can not open file to inject "'..inject..'" - '..e)
    end
    local i = f:read'a'
    return pre..post..'\n'..i..final
  end)
  local f, e = io.open('build/'..tool.name, 'w')
  if not f then
    error('can not open output file "'..tool.name..'" - '..e)
  end
  f:write(t)
  f:close()
end

local function main(arg)
  for _, v in pairs(tool) do
    generate(v)
  end
end

main(arg)
