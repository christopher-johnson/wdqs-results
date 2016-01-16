'use strict';
var $ = require("jquery"),
    EventEmitter = require('events').EventEmitter,
    Storage = require("wdqs-storage"),
    Svg = require("../lib/svg.js");

/**
 * Main WDQSR constructor
 *
 * @constructor
 * @type {HTMLElement}
 * @param {HTMLElement} parent element to append editor to.
 * @param {object} settings
 * @class WDQSR
 * @return {doc} WDQSR document
 */
var WDQSR = function(parent, options, queryResults) {
    EventEmitter.call(this);
    var wdqsr = this;

    wdqsr.options = $.extend(true, {}, module.exports.defaults, options);
    //the recursive copy does merge (overwrite) array values how we want it to. Do this manually
    if (options && options.outputPlugins) wdqsr.options.outputPlugins = options.outputPlugins;

    wdqsr.container = $("<div class='wdqsr'></div>").appendTo(parent);
    wdqsr.header = $("<div class='wdqsr_header'></div>").appendTo(wdqsr.container);
    wdqsr.resultsContainer = $("<div class='wdqsr_results'></div>").appendTo(wdqsr.container);
    wdqsr.storage = Storage.storage;

    var prefix = null;
    wdqsr.getPersistencyId = function(postfix) {
        if (prefix === null) {
            //instantiate prefix
            if (wdqsr.options.persistency && wdqsr.options.persistency.prefix) {
                prefix = (typeof wdqsr.options.persistency.prefix == 'string' ? wdqsr.options.persistency.prefix : wdqsr.options.persistency.prefix(wdqsr));
            } else {
                prefix = false;
            }
        }
        if (prefix && postfix != null) {
            return prefix + (typeof postfix == 'string' ? postfix : postfix(wdqsr));
        } else {
            return null;
        }
    };

    if (wdqsr.options.useGoogleCharts) {
        //pre-load google-loader
        require('./gChartLoader.js')
            .once('initError', function() {
                wdqsr.options.useGoogleCharts = false
            })
            .init();
    }

    //first initialize plugins
    wdqsr.plugins = {};
    for (var pluginName in module.exports.plugins) {
        if (!wdqsr.options.useGoogleCharts && pluginName == "gchart") continue;
        wdqsr.plugins[pluginName] = new module.exports.plugins[pluginName](wdqsr);
    }


    wdqsr.updateHeader = function() {
        var downloadIcon = wdqsr.header.find(".wdqsr_downloadIcon")
            .removeAttr("title"); //and remove previous titles
        var embedButton = wdqsr.header.find(".wdqsr_embedBtn");
        var outputPlugin = wdqsr.plugins[wdqsr.options.output];
        if (outputPlugin) {

            //Manage download link
            var info = (outputPlugin.getDownloadInfo ? outputPlugin.getDownloadInfo() : null);
            if (info) {
                if (info.buttonTitle) downloadIcon.attr('title', info.buttonTitle);
                downloadIcon.prop("disabled", false);
                downloadIcon.find("path").each(function() {
                    this.style.fill = "black";
                });
            } else {
                downloadIcon.prop("disabled", true).prop("title", "Download not supported for this result representation");
                downloadIcon.find("path").each(function() {
                    this.style.fill = "gray";
                });
            }

            //Manage embed button
            var link = null;
            if (outputPlugin.getEmbedHtml) link = outputPlugin.getEmbedHtml();
            if (link && link.length > 0) {
                embedButton.show();
            } else {
                embedButton.hide();
            }
        }
    };
    wdqsr.draw = function(output) {
        if (!wdqsr.results) return false;
        if (!output) output = wdqsr.options.output;


        //ah, our default output does not take our current results. Try to autodetect
        var selectedOutput = null;
        var selectedOutputPriority = -1;
        var unsupportedOutputs = [];
        for (var tryOutput in wdqsr.plugins) {
            if (wdqsr.plugins[tryOutput].canHandleResults(wdqsr)) {
                var priority = wdqsr.plugins[tryOutput].getPriority;
                if (typeof priority == "function") priority = priority(wdqsr);
                if (priority != null && priority != undefined && priority > selectedOutputPriority) {
                    selectedOutputPriority = priority;
                    selectedOutput = tryOutput;
                }
            } else {
                unsupportedOutputs.push(tryOutput);
            }
        }
        disableOutputs(unsupportedOutputs);
        var outputToDraw = null;
        if (output in wdqsr.plugins && wdqsr.plugins[output].canHandleResults(wdqsr)) {
            outputToDraw = output;
        } else if (selectedOutput) {
            outputToDraw = selectedOutput;
        }

        if (outputToDraw) {
            $(wdqsr.resultsContainer).empty();
            wdqsr.emit('draw', wdqsr, wdqsr.plugins[outputToDraw]);
            wdqsr.plugins[outputToDraw].draw();
            wdqsr.emit('drawn', wdqsr, wdqsr.plugins[outputToDraw]);
            wdqsr.updateHeader();
            return true;
        } else {
            wdqsr.updateHeader();
            return false;
        }
    };

    var disableOutputs = function(outputs) {
        //first enable everything.
        wdqsr.header.find('.wdqsr_btnGroup .wdqsr_btn').removeClass('disabled');


        //now disable the outputs passed as param
        outputs.forEach(function(outputName) {
            wdqsr.header.find('.wdqsr_btnGroup .select_' + outputName).addClass('disabled');
        });

    };
    wdqsr.somethingDrawn = function() {
        return !wdqsr.resultsContainer.is(":empty");
    };

    wdqsr.setResponse = function(dataOrJqXhr, textStatus, jqXhrOrErrorString) {
        try {
            wdqsr.results = require("./parsers/wrapper.js")(dataOrJqXhr, textStatus, jqXhrOrErrorString);
        } catch (exception) {
            wdqsr.results = {
                getException: function() {
                    return exception
                }
            };
        }
        wdqsr.draw();

        //store if needed
        var resultsId = wdqsr.getPersistencyId(wdqsr.options.persistency.results.key);
        if (resultsId) {
            if (wdqsr.results.getOriginalResponseAsString && wdqsr.results.getOriginalResponseAsString().length < wdqsr.options.persistency.results.maxSize) {
                Storage.storage.set(resultsId, wdqsr.results.getAsStoreObject(), "month");
            } else {
                //remove old string
                Storage.storage.remove(resultsId);
            }
        }
    };
    var $toggableWarning = null;
    var $toggableWarningClose = null;
    var $toggableWarningMsg = null;
    wdqsr.warn = function(warning) {
        if (!$toggableWarning) {
            //first time instantiation
            $toggableWarning = $('<div>', {
                class: 'toggableWarning'
            }).prependTo(wdqsr.container).hide();
            $toggableWarningClose = $('<span>', {
                class: 'toggleWarning'
            })
                .html('&times;')
                .click(function() {
                    $toggableWarning.hide(400);
                })
                .appendTo($toggableWarning);
            $toggableWarningMsg = $('<span>', {
                class: 'toggableMsg'
            }).appendTo($toggableWarning);
        }
        $toggableWarningMsg.empty();
        if (warning instanceof $) {
            $toggableWarningMsg.append(warning);
        } else {
            $toggableWarningMsg.html(warning);
        }
        $toggableWarning.show(400);
    };

    var blobDownloadSupported = null;
    var checkBlobDownloadSupported = function() {
        if (blobDownloadSupported === null) {
            var windowUrl = window.URL || window.webkitURL || window.mozURL || window.msURL;
            blobDownloadSupported = windowUrl && Blob;
        }
        return blobDownloadSupported;
    };
    var embedBtn = null;
    var drawHeader = function(wdqsr) {
        var drawOutputSelector = function() {
            var btnGroup = $('<div class="wdqsr_btnGroup"></div>');
            $.each(wdqsr.options.outputPlugins, function(i, pluginName) {
                var plugin = wdqsr.plugins[pluginName];
                if (!plugin) return; //plugin not loaded

                if (plugin.hideFromSelection) return;
                var name = plugin.name || pluginName;
                var button = $("<button class='wdqsr_btn'></button>")
                    .text(name)
                    .addClass("select_" + pluginName)
                    .click(function() {
                        //update buttons
                        btnGroup.find("button.selected").removeClass("selected");
                        $(this).addClass("selected");
                        //set and draw output
                        wdqsr.options.output = pluginName;

                        //store if needed
                        wdqsr.store();

                        //close warning if there is any
                        if ($toggableWarning) $toggableWarning.hide(400);

                        wdqsr.draw();
                    })
                    .appendTo(btnGroup);
                if (wdqsr.options.output == pluginName) button.addClass("selected");
            });

            if (btnGroup.children().length > 1) wdqsr.header.append(btnGroup);
        };
        var drawDownloadIcon = function() {
            var stringToUrl = function(string, contentType) {
                var url = null;
                var windowUrl = window.URL || window.webkitURL || window.mozURL || window.msURL;
                if (windowUrl && Blob) {
                    var blob = new Blob([string], {
                        type: contentType
                    });
                    url = windowUrl.createObjectURL(blob);
                }
                return url;
            };
            var button = $("<button class='wdqsr_btn wdqsr_downloadIcon btn_icon'></button>")
                .append(Svg.getElement(require('./imgs.js').download))
                .click(function() {
                    var currentPlugin = wdqsr.plugins[wdqsr.options.output];
                    if (currentPlugin && currentPlugin.getDownloadInfo) {
                        var downloadInfo = currentPlugin.getDownloadInfo();
                        var downloadUrl = stringToUrl(downloadInfo.getContent(), (downloadInfo.contentType ? downloadInfo.contentType : "text/plain"));
                        var downloadMockLink = $("<a></a>", {
                            href: downloadUrl,
                            download: downloadInfo.filename
                        });
                        require('./utils.js').fireClick(downloadMockLink);
                        //						downloadMockLink[0].click();
                    }
                });
            wdqsr.header.append(button);
        };
        var drawFullscreenButton = function() {
            var button = $("<button class='wdqsr_btn btn_fullscreen btn_icon'></button>")
                .append(Svg.getElement(require('./imgs.js').fullscreen))
                .click(function() {
                    wdqsr.container.addClass('wdqsr_fullscreen');
                });
            wdqsr.header.append(button);
        };
        var drawSmallscreenButton = function() {
            var button = $("<button class='wdqsr_btn btn_smallscreen btn_icon'></button>")
                .append(Svg.getElement(require('./imgs.js').smallscreen))
                .click(function() {
                    wdqsr.container.removeClass('wdqsr_fullscreen');
                });
            wdqsr.header.append(button);
        };
        var drawEmbedButton = function() {
            embedBtn = $("<button>", {
                class: 'wdqsr_btn wdqsr_embedBtn',
                title: 'Get HTML snippet to embed results on a web page'
            })
                .text('</>')
                .click(function(event) {
                    var currentPlugin = wdqsr.plugins[wdqsr.options.output];
                    if (currentPlugin && currentPlugin.getEmbedHtml) {
                        var embedLink = currentPlugin.getEmbedHtml();

                        event.stopPropagation();
                        var popup = $("<div class='wdqsr_embedPopup'></div>").appendTo(wdqsr.header);
                        $('html').click(function() {
                            if (popup) popup.remove();
                        });

                        popup.click(function(event) {
                            event.stopPropagation();
                            //dont close when clicking on popup
                        });
                        var prePopup = $("<textarea>").val(embedLink);
                        prePopup.focus(function() {
                            var $this = $(this);
                            $this.select();

                            // Work around Chrome's little problem
                            $this.mouseup(function() {
                                // Prevent further mouseup intervention
                                $this.unbind("mouseup");
                                return false;
                            });
                        });

                        popup.empty().append(prePopup);
                        var positions = embedBtn.position();
                        var top = (positions.top + embedBtn.outerHeight()) + 'px';
                        var left = Math.max(((positions.left + embedBtn.outerWidth()) - popup.outerWidth()), 0) + 'px';

                        popup.css("top", top).css("left", left);

                    }
                });
            wdqsr.header.append(embedBtn);
        };
        drawFullscreenButton();
        drawSmallscreenButton();
        if (wdqsr.options.drawOutputSelector) drawOutputSelector();
        if (wdqsr.options.drawDownloadIcon && checkBlobDownloadSupported()) drawDownloadIcon(); //only draw when it's supported
        drawEmbedButton();
    };

    var persistentId = null;
    //store persistent options (not results though. store these separately, as they are too large)
    wdqsr.store = function() {
        if (!persistentId) persistentId = wdqsr.getPersistencyId('main');
        if (persistentId) {
            Storage.storage.set(persistentId, wdqsr.getPersistentSettings());
        }
    };


    wdqsr.load = function() {
        if (!persistentId) persistentId = wdqsr.getPersistencyId('main');
        wdqsr.setPersistentSettings(Storage.storage.get(persistentId));
    };


    wdqsr.setPersistentSettings = function(settings) {
        if (settings) {
            if (settings.output) {
                wdqsr.options.output = settings.output;
            }
            for (var pluginName in settings.plugins) {
                if (wdqsr.plugins[pluginName] && wdqsr.plugins[pluginName].setPersistentSettings) {
                    wdqsr.plugins[pluginName].setPersistentSettings(settings.plugins[pluginName]);
                }
            }
        }
    }

    wdqsr.getPersistentSettings = function() {
        var settings = {
            output: wdqsr.options.output,
            plugins: {}
        };
        for (var pluginName in wdqsr.plugins) {
            if (wdqsr.plugins[pluginName].getPersistentSettings) {
                settings.plugins[pluginName] = wdqsr.plugins[pluginName].getPersistentSettings();
            }
        }
        return settings;
    }


    /**
     * postprocess
     */
    wdqsr.load();
    drawHeader(wdqsr);
    if (!queryResults && wdqsr.options.persistency && wdqsr.options.persistency.results) {
        var resultsId = wdqsr.getPersistencyId(wdqsr.options.persistency.results.key)
        var fromStorage;
        if (resultsId) {
            fromStorage = Storage.storage.get(resultsId);
        }


        if (!fromStorage && wdqsr.options.persistency.results.id) {
            //deprecated! But keep for backwards compatability
            //if results are stored under old ID. Fetch the results, and delete that key (results can be large, and clutter space)
            //setting the results, will automatically store it under the new key, so we don't have to worry about that here
            var deprId = (typeof wdqsr.options.persistency.results.id == "string" ? wdqsr.options.persistency.results.id : wdqsr.options.persistency.results.id(wdqsr));
            if (deprId) {
                fromStorage = Storage.storage.get(deprId);
                if (fromStorage) Storage.storage.remove(deprId);
            }
        }
        if (fromStorage) {
            if ($.isArray(fromStorage)) {
                wdqsr.setResponse.apply(this, fromStorage);
            } else {
                wdqsr.setResponse(fromStorage);
            }
        }
    }

    if (queryResults) {
        wdqsr.setResponse(queryResults);
    }
    wdqsr.updateHeader();


    return wdqsr;
};

WDQSR.prototype = new EventEmitter;
module.exports = function(parent, options, queryResults) {
    return new WDQSR(parent, options, queryResults);
};


module.exports.plugins = {};
module.exports.registerOutput = function(name, constructor) {
    module.exports.plugins[name] = constructor;
};




/**
 * The default options of WDQSR. Either change the default options by setting WDQSR.defaults, or by
 * passing your own options as second argument to the WDQSR constructor
 *
 * @attribute WDQSR.defaults
 */
module.exports.defaults = require('./defaults.js');
module.exports.version = {
    "WDQSR": require("../package.json").version,
    "jquery": $.fn.jquery,
    "wdqs-storage": require("wdqs-storage").version
};
module.exports.$ = $;



//put these in a try-catch. When using the unbundled version, and when some dependencies are missing, then WDQSR as a whole will still function
try {
    module.exports.registerOutput('boolean', require("./boolean.js"))
} catch (e) {}
try {
    module.exports.registerOutput('rawResponse', require("./rawResponse.js"))
} catch (e) {}
try {
    module.exports.registerOutput('table', require("./table.js"))
} catch (e) {}
try {
    module.exports.registerOutput('error', require("./error.js"))
} catch (e) {}
try {
    module.exports.registerOutput('pivot', require("./pivot.js"))
} catch (e) {}
try {
    module.exports.registerOutput('gchart', require("./gchart.js"))
} catch (e) {}
try {
    module.exports.registerOutput('gmap', require("./gmap.js"))
} catch (e) {}
