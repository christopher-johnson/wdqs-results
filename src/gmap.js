'use strict';

var $ = require('jquery'),
    utils = require('./utils.js'),
    yUtils = require('yasgui-utils');

var root = module.exports = function(wdqsr) {
    var plugin = {
        name: "Google Map",
        getPriority: 10
    };
    var options = $.extend(true, {}, root.defaults);
    var id = wdqsr.container.closest('[id]').attr('id');
    var map = null;

    plugin.draw = function() {
        wdqsr.resultsContainer.empty();
        var wrapperId = id + '_gmapWrapper';

        wdqsr.resultsContainer.append(
            $('<div>', {
                id: wrapperId,
                class: 'gmapWrapper'
            })
        );
        require('./gMapLoader.js')
            .on('done', function() {
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
                    var latLng = new google.maps.LatLng(coords[0],coords[1]);
                    var marker = new google.maps.Marker({
                        position: latLng,
                        map: map
                    });
                }
            })
            .on('error', function() {
            });

    };

    plugin.canHandleResults = function() {
        return wdqsr.results && wdqsr.results.getVariables && wdqsr.results.getVariables() && wdqsr.results.getVariables().length > 0;
    };

    return plugin;
};

root.defaults = {
    height: "100%",
    width: "100%",
    persistencyId: 'gmap',
    mapConfig: null
};

