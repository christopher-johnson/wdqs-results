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
                 var $panel =
                    $('<div>', {
                        id: 'panel',
                        class: 'wdqsr_btnGroup mapCtl'
                    }).appendTo(wdqsr.resultsContainer);
                var $button1 =
                    $('<button>', {
                        class: 'wdqsr_btn'
                    })
                    .text('Toggle Heatmap')
                    .click(function() {
                        toggleHeatmap();
                    }).appendTo($panel);
                var $button2 =
                    $('<button>', {
                        class: 'wdqsr_btn'
                    })
                    .text('Toggle Markers')
                    .click(function() {
                        toggleMarkers();
                    }).appendTo($panel);
                var $button3 =
                    $('<button>', {
                        class: 'wdqsr_btn'
                    })
                    .text('Change Gradient')
                    .click(function() {
                        changeGradient();
                    }).appendTo($panel);
                var $button4 =
                    $('<button>', {
                        class: 'wdqsr_btn'
                    })
                    .text('Change Radius')
                    .click(function() {
                        changeRadius();
                    }).appendTo($panel);

                wdqsr.resultsContainer.append(
                    $('<div>', {
                        id: wrapperId,
                        class: 'gmapWrapper'
                    })
                );

                var map, heatmap;
                var markers = [];
                var mapCanvas = document.getElementById(wrapperId);
                var mapOptions = {
                    center: new google.maps.LatLng(52.516667, 13.383333),
                    zoom: 5,
                    mapTypeId: google.maps.MapTypeId.TERRAIN
                };
                map = new google.maps.Map(mapCanvas, mapOptions);

                var jsonResults = wdqsr.results.getAsJson();
                var spq = require('./parsers/sparql-geojson.js');
                var results = spq.sparqlToGeoJSON(jsonResults);

                function getPoints(results) {
                    var latLng = [];
                    for (var i = 0; i < results.features.length; i++) {
                        var coords = results.features[i].geometry.coordinates;
                        latLng.push(new google.maps.LatLng(coords[0], coords[1]));
                    }
                    return latLng
                }

                heatmap = new google.maps.visualization.HeatmapLayer({
                    data: getPoints(results),
                    map: map
                });

                heatmap.setMap(map);

                var infowindow = new google.maps.InfoWindow();
                var marker, i;

                for (i = 0; i < results.features.length; i++) {
                   var coords = results.features[i].geometry.coordinates;
                   var latLng = new google.maps.LatLng(coords[0], coords[1]);
                   var label = results.features[i].properties.label.value;
                   marker = new google.maps.Marker({
                       position: latLng,
                       map: map,
                       title: label
                    });
                  markers.push(marker);
                  google.maps.event.addListener(marker, 'click', (function (marker, i) {
                      return function () {
                          infowindow.setContent(marker.title);
                          infowindow.open(map, marker);
                      };
                  })(marker, i));
                }

                function toggleMarkers() {
                    if (markers[0].getMap() != null) {
                        var arg = null;
                    } else {
                        var arg = map;
                    }
                    for (var i = 0; i < markers.length; i++) {
                        markers[i].setMap(arg);
                    }
                }

                function toggleHeatmap() {

                    if (heatmap.getMap() != null) {
                        heatmap.setMap(null);
                    } else {
                        heatmap.setMap(map);
                    }
                }

                function changeGradient() {
                    var gradient = [
                        'rgba(0, 255, 255, 0)',
                        'rgba(0, 255, 255, 1)',
                        'rgba(0, 191, 255, 1)',
                        'rgba(0, 127, 255, 1)',
                        'rgba(0, 63, 255, 1)',
                        'rgba(0, 0, 255, 1)',
                        'rgba(0, 0, 223, 1)',
                        'rgba(0, 0, 191, 1)',
                        'rgba(0, 0, 159, 1)',
                        'rgba(0, 0, 127, 1)',
                        'rgba(63, 0, 91, 1)',
                        'rgba(127, 0, 63, 1)',
                        'rgba(191, 0, 31, 1)',
                        'rgba(255, 0, 0, 1)'];

                    heatmap.set('gradient', heatmap.get('gradient') ? null : gradient);
                }

                function changeRadius() {
                    heatmap.set('radius', heatmap.get('radius') ? null : 35);
                }

                function changeOpacity() {
                    heatmap.set('opacity', heatmap.get('opacity') ? null : 0.2);
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

