'use strict';

var $ = require('jquery'),
    utils = require('./utils.js');

var root = module.exports = function(wdqsr) {
    var options = $.extend(true, {}, root.defaults);
    var id = wdqsr.container.closest('[id]').attr('id');
    var map = null;

    var initMaps = function(callback) {
        var google = require('google');
    };

    return {
        name: "Google Map",
        getPriority: 10,
        options: options,
        canHandleResults: function () {
            return wdqsr.results && wdqsr.results.getVariables && wdqsr.results.getVariables() && wdqsr.results.getVariables().length > 0;
        },
        draw: function () {
            var doDraw = function () {
                wdqsr.resultsContainer.empty();
                var wrapperId = id + '_gmapWrapper';

                wdqsr.resultsContainer.append(
                    $('<div>', {
                        id: wrapperId,
                        class: 'gmapWrapper'
                    })
                );
                var mapCanvas = document.getElementById(wrapperId);
                var mapOptions = {
                    center: new google.maps.LatLng(52.516667, 13.383333),
                    zoom: 2,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                };
                var map = new google.maps.Map(mapCanvas, mapOptions);
                var jsonResults = wdqsr.results.getAsJson();
                var spq = require('./parsers/sparql-geojson.js');
                var results = spq.sparqlToGeoJSON(jsonResults);

                for (var i = 0; i < results.features.length; i++) {
                    var coords = results.features[i].geometry.coordinates;
                    var latLng = new google.maps.LatLng(coords[0], coords[1]);
                    var label = results.features[i].properties.label.value;
                    var marker = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        title: label
                    });
                }
            };
            if (!require('google')) {
                require('./gMapLoader.js')
                    .on('done', function () {
                        initMaps();
                        doDraw();
                    })
                    .on('error', function () {
                    })
            } else {
                doDraw();
            }
        }
    }
};

root.defaults = {
    height: "100%",
    width: "100%",
    persistencyId: 'gmap',
    mapConfig: null
};

