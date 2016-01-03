'use strict';
var $ = require("jquery"),
	CodeMirror = require("codemirror");

require('codemirror/addon/fold/foldcode.js');
require('codemirror/addon/fold/foldgutter.js');
require('codemirror/addon/fold/xml-fold.js');
require('codemirror/addon/fold/brace-fold.js');

require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');

var root = module.exports = function(wdqsr) {
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	var cm = null;
	var draw = function() {
		var cmOptions = options.CodeMirror;
		cmOptions.value = wdqsr.results.getOriginalResponseAsString();

		var mode = wdqsr.results.getType();
		if (mode) {
			if (mode == "json") {
				mode = {
					name: "javascript",
					json: true
				};
			}
			cmOptions.mode = mode;
		}

		cm = CodeMirror(wdqsr.resultsContainer.get()[0], cmOptions);

		//CM has some issues with folding and unfolding (blank parts in the codemirror area, which are only filled after clicking it)
		//so, refresh cm after folding/unfolding
		cm.on('fold', function() {
			cm.refresh();
		});
		cm.on('unfold', function() {
			cm.refresh();
		});

	};
	var canHandleResults = function() {
		if (!wdqsr.results) return false;
		if (!wdqsr.results.getOriginalResponseAsString) return false;
		var response = wdqsr.results.getOriginalResponseAsString();
		if ((!response || response.length == 0) && wdqsr.results.getException()) return false; //in this case, show exception instead, as we have nothing to show anyway
		return true;
	};

	var getDownloadInfo = function() {
		if (!wdqsr.results) return null;
		var contentType = wdqsr.results.getOriginalContentType();
		var type = wdqsr.results.getType();
		return {
			getContent: function() {
				return wdqsr.results.getOriginalResponse();
			},
			filename: "queryResults" + (type ? "." + type : ""),
			contentType: (contentType ? contentType : "text/plain"),
			buttonTitle: "Download raw response"
		};
	};

	return {
		draw: draw,
		name: "Raw Response",
		canHandleResults: canHandleResults,
		getPriority: 2,
		getDownloadInfo: getDownloadInfo,

	}
};



root.defaults = {
	CodeMirror: {
		readOnly: true,
		lineNumbers: true,
		lineWrapping: true,
		foldGutter: true,
		gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
	}
};

root.version = {
	"YASR-rawResponse": require("../package.json").version,
	"jquery": $.fn.jquery,
	"CodeMirror": CodeMirror.version
};