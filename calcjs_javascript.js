
function run_script(scr) {
    var status = 0;

    try {
        var result = eval("(function(){return(\n" + scr + ")\n})()");
        append_output(result);
    } catch {
        try {
            var result = eval("(function(){\n" + scr + "\n})()");
            append_output(result);
        } catch (e) {
            throw ("Error js script - " + String(e) + "\n");
        }
    }
}

var EditorMode = "js";

function my_init(editor, scr) {}

