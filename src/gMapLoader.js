var EventEmitter = require('events').EventEmitter,
    $ = require('jquery');
//cannot package google loader via browserify....
var loadingMain = false;
var loader = function() {
    EventEmitter.call(this);
    var mod = this;
    this.init = loadScript('https://maps.googleapis.com/maps/api/js?key=AIzaSyDqawy79f76MVm7I3eh2LEHXDNsLvFS2IY', function() {
                loadingMain = false;
                mod.emit('done');
            });
};


var loadScript = function(url, callback) {
    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState) { //IE
        script.onreadystatechange = function() {
            if (script.readyState == "loaded" ||
                script.readyState == "complete") {
                script.onreadystatechange = null;
                callback();
            }
        };
    } else { //Others
        script.onload = function() {
            callback();
        };
    }

    script.src = url;
    document.body.appendChild(script);
};
loader.prototype = new EventEmitter;
module.exports = new loader();
