
// ----------------------------------------------------------------------------

function addStyleString(str) {
    var node = document.createElement('style');
    node.innerHTML = str;
    document.body.appendChild(node);
}

function CodeFlaskLua(editor) {

    editor.addLanguage('lua', {
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

var EditorMode = "lua";

function my_init(editor, scr) {
    CodeFlaskLua(editor);
    WaLua().then(function() {
        //fengari.load(scr)();
        run_script(scr);
    });
}

function run_lua() {
    requestAnimationFrame(function() {
        var s = step_lua();
        //console.log("DEBUG Lua VM step result:",s);
        if (s != 0) return run_lua();
        return s;
    });
}

function run_script(scr) {
    var status = compile_lua(scr);
    //console.log("DEBUG Lua Compiler result:",status);
    if (status != 0) {
        append_error("Error in lua script\n");
    } else {
        requestAnimationFrame(run_lua);
    }
}

