var EventEmitter = require('events').EventEmitter,
    $ = require('jquery');
var loadingMain = false;
var loadingFailed = false;

var loader = function() {
    EventEmitter.call(this);
    var mod = this;
    this.init = function () {
        if (!loadingFailed && !require('google') && !loadingMain) {
            loadingMain = true;
            loadScript('https://maps.googleapis.com/maps/api/js?key=AIzaSyDqawy79f76MVm7I3eh2LEHXDNsLvFS2IY', function () {
                loadingMain = false;
                mod.emit('done');
            });

            var timeout = 100; //ms
            var maxTimeout = 6000; //so 6 sec max
            var startTime = +new Date();
            var checkAndWait = function () {
                if (!require('google')) {
                    if ((+new Date() - startTime) > maxTimeout) {
                        loadingFailed = true;
                        loadingMain = false;
                        mod.emit('initError');
                    } else {
                        setTimeout(checkAndWait, timeout);
                    }
                } else {
                }
            };
            checkAndWait();
        } else {
            if (require('google')) {
                mod.emit('initDone');
            } else if (loadingFailed) {
                mod.emit('initError')
            } else {
            }
        }
    };
    this.googleMapLoad = function() {
        loadScript('https://maps.googleapis.com/maps/api/js?key=AIzaSyDqawy79f76MVm7I3eh2LEHXDNsLvFS2IY', function () {
            mod.emit('done');
        });
    }
};

var loadScript = function(url, callback) {
    var script = document.createElement("script");
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
