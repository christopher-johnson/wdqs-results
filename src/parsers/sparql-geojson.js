//SPARQL-GeoJSON v.0.2-alpha
'use strict';
module.exports = {
    sparqlToGeoJSON: function (sparqlJSON) {

        var bindingindex, varindex, geometryType, wkt, coordinates, property;
        var geojson = {
            "type": "FeatureCollection",
            "features": []
        };

        for (bindingindex = 0; bindingindex < sparqlJSON.results.bindings.length; ++bindingindex) {
            for (varindex = 0; varindex < sparqlJSON.head.vars.length; ++varindex) {
                if (sparqlJSON.results.bindings[bindingindex][sparqlJSON.head.vars[varindex]] && (sparqlJSON.results.bindings[bindingindex][sparqlJSON.head.vars[varindex]].datatype === "http://www.opengis.net/ont/geosparql#wktLiteral" || sparqlJSON.results.bindings[bindingindex][sparqlJSON.head.vars[varindex]].datatype === "http://www.openlinksw.com/schemas/virtrdf#Geometry")) {
                    //assumes the well-known text is valid!
                    wkt = sparqlJSON.results.bindings[bindingindex][sparqlJSON.head.vars[varindex]].value;

                    //chop off geometry type, already have that
                    coordinates = wkt.substr(wkt.indexOf("("), wkt.length);
                    //add extra [ and replace ( by [
                    coordinates = "[" + coordinates.split("(").join("[");
                    //replace ) by ] and add extra ]
                    coordinates = coordinates.split(")").join("]") + "]";
                    //replace , by ],[
                    coordinates = coordinates.split(",").join("],[");
                    //replace spaces with ,
                    coordinates = coordinates.split(" ").join(",");

                    //find substring left of first "(" occurrence for geometry type
                    switch (wkt.substr(0, wkt.indexOf("("))) {
                        case "Point":
                            geometryType = "Point";
                            coordinates = coordinates.substr(1, coordinates.length - 2); //remove redundant [ and ] at beginning and end
                            break;
                        case "MULTIPOINT":
                            geometryType = "MultiPoint";
                            break;
                        case "LINESTRING":
                            geometryType = "Linestring";
                            break;
                        case "MULTILINE":
                            geometryType = "MultiLine";
                            break;
                        case "POLYGON":
                            geometryType = "Polygon";
                            break;
                        case "MULTIPOLYGON":
                            geometryType = "MultiPolygon";
                            break;
                        case "GEOMETRYCOLLECTION":
                            geometryType = "GeometryCollection";
                            break;
                        default:
                            //invalid wkt!
                            return {};
                    }


                    var feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": geometryType,
                            "coordinates": JSON.parse(coordinates)
                        },
                        "properties": sparqlJSON.results.bindings[bindingindex]
                    };

                    geojson.features.push(feature);
                }
            }
        }
        return geojson;
    }
};