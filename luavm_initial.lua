print [[
  This is a lua playground. It uses the official lua VM
  - https://lua.org

  It runs fully in-browser thanks to web assembly and Emscripten
  - https://webassembly.org
  - https://emscripten.org
  - https://github.com/pocomane/walua

  It has a nice code editor thanks to CodeFlask
  - https://kazzkiq.github.io/CodeFlask
]]

print(walua_version, math.random())
