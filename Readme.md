
# Client side web utilities

This is a collection of utilities released as single html file app:

- [Js calculator](https://raw.githack.com/pocomane/clientsideutil/master/build/calcjs.html).
- [Lua playground](https://raw.githack.com/pocomane/clientsideutil/master/build/luavm.html).
- [Lua calculator](https://raw.githack.com/pocomane/clientsideutil/master/build/calclua.html).
- [Luasnip playground](https://raw.githack.com/pocomane/clientsideutil/master/build/luasnip_playground.html).

Since they are fully client-side and they are distributed as single html file, you can also run it from disk whitout a proper web server.

In the following you will find specific documentation of each tool.

# Build

Just run the build script in the project root directory:

> lua ./build/build.lua

It will download the dependencies (make sure git is installed) and it will
merge sources and dependencies in self-contained html files. All the results
will be updated in the `build` directory.

Every html output file is a stand alone utility with all the dependencies
merged. They are generated this way since a more classic version, splitted
among multiple html/js files, probably needs some adhoc configuration to be run
directly from the hard disk. I.e.  file:// and CORS must be allowed in the
browser when loading a file from the disk. Instead, the embedded version should
work out of the box.

# Lua VM

This tool that let you to edit and run lua code in the browser. The editor is
[codeflask.js](https://kazzkiq.github.io/CodeFlask). The VM is the official PUC
RIO Lua compiled to web assembly: [WaLua](https://github.com/pocomane/walua)

The playground uses a error handler to write stack dump in case of error.

Please note that the browser blocks while the script is running, so the browser
is not updated during the execution. There is a quick workaround in the
playground.  Normally the [following
code](https://raw.githack.com/pocomane/clientsideutil/master/build/luavm.html?cHJpbnQnb25lJwpsb2NhbCBzID0gb3MuY8SLY2soKQp3aGlsZcSUxJbEmMSMxJspIC3EkCA8IDEgZG8gZW5kCsSAxILEhHR3b8SJ):

```
print'one'
local s = os.clock()
while os.clock() - s < 1 do end
print'two'
```

will show `one` and `two` in a single step, after ~1 second.  If you call the
lua function `set_collaborative()`, the next scripts will start to behave as it
was asynchronous, i.e. `one` is written immediately, then `two` is written
after ~1 second. You can switch back to the normal mode with `set_monolitic()`.

The system leverages the collaborative multitasking features of lua and the
browser. `set_collaborative` overloads the lua IO operation to yield after each
operation. The lua code compiler and launcher is overloaded too, with one that
wraps the whole user code into a coroutine. In this way after each IO operation
the control is given to the browser that can update the page.

Some Notes:

- The `step_lua` javascript function is continously called until there are no
  more yields.
- No yield parameters/returns are handled, i.e. zero values are always
  passed/returned during the resume/yield phase.
- There can be issues if you call IO operation inside a sub-coroutine.

To extend this system to other lua function, you have to wrap it in another one
that yield just before to return. You can do this automatically in the
playground with the utility lua function `yieldwrap`:

```
yieldwrap( _ENV, 'myfunction' )
set_collaborative()
```

where `myfunction` is the name of the function to be wrapped. In this way the
browser have the chance to update the page before `myfunction` returns.

# Luasnip playground

This works the same as the `Lua VM` tool, but it comes with
[Luasnip](https://github.com/pocomane/luasnip) built in.

# Js/lua Calculator

wip...

