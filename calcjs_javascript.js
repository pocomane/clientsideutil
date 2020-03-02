
      var editor_setup = {
          language: "js",
	  lineNumbers: true
      };

      function run_all(scr){
        if (document.getElementById("appendoutput").checked === false) {
          clear_output();
        }
        var status = 0;
		
		try {
			var result = eval("(function(){return(\n"+scr+")\n})()");
			append_output(result);
		} catch {
			try {
				var result = eval("(function(){\n"+scr+"\n})()");
				append_output(result);
			} catch (e) {
				append_error("Error js script - "+String(e)+"\n");
			}
		}
      }

      function run_editor_code(){

	var scr = editor_getText();
   
        var e = false;
        try {
          run_all(scr)
        } catch (err) {
          e = String(err) + "\n";
          append_error(e);
        }

        if (e) { append_output(e); }
      }

      function my_init(editor){
      }

