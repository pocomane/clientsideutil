print [[

  This is a playground designed to try LuaSnip
  - https://github.com/pocomane/luasnip/blob/master/documentation.adoc

  It uses the official lua VM
  - https://lua.org

  It runs fully in-browser thanks to web assembly and Emscripten
  - https://webassembly.org
  - https://emscripten.org
  - https://github.com/pocomane/walua

  It has a nice code editor thanks to CodeFlask
  - https://kazzkiq.github.io/CodeFlask
]]

print(math.random())
print(luasnip.subbytebase(6,luasnip.sha2'Hello World!'))
