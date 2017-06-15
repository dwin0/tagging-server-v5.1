/**
 * In this module the population density and the community type are calculated.
 * @module business_logic/populationSurroundings
 */


var dbAccess= require('../persistence/dbAccess');
var parallel = require('async/parallel');
var queries = require('./dbQueries');
var request = require('request');
var converter = require('./wgs84_ch1903');


//Constants for community types:
const LARGE_CENTRE = {
    id: 1,
    type: 'Grosszentrum'
};

const NEIGHBORHOOD_CENTRE_OF_LARGE_CENTRE = {
    id: 2,
    type: 'Nebenzentrum eines Grosszentrums'
};

const BELT_OF_LARGE_CENTRE = {
    id: 3,
    type: 'Gürtel eines Grosszentrums'
};

const MEDIUM_CENTRE = {
    id: 4,
    type: 'Mittelzentrum'
};

const BELT_OF_MEDIUM_CENTRE = {
    id: 5,
    type: 'Gürtel eines Mittelzentrums'
};

const SMALL_CENTRE = {
    id: 6,
    type: 'Kleinzentrum'
};

const PERI_URBAN = {
    id: 7,
    type: 'Periurbane ländliche Gemeinde'
};

const AGRICULTURAL = {
    id: 8,
    type: 'Agrargemeinde'
};

const TOURISTICAL = {
    id: 9,
    type: 'Touristische Gemeinde'
};

const UNKNOWN = {
    id: -1,
    type: 'unknown',
    description: 'No tagging possible.',
    communityId: -1,
    communityName: 'unknown',
    cantonId: -1,
    cantonName: 'unknown'
};


const GEOADMIN_URL_POPULATION_DENSITY = 'https://api3.geo.admin.ch/rest/services/all/MapServer/' +
    'identify?geometry={y},{x}&geometryFormat=geojson&geometryType=esriGeometryPoint&imageDisplay=1,1,1' +
    '&lang=de&layers=all:ch.are.bevoelkerungsdichte&mapExtent=0,0,1,1&returnGeometry=false&tolerance=300';

const GEOADMIN_URL_COMMUNITY_TYPE = 'https://api3.geo.admin.ch/rest/services/all/MapServer/' +
    'identify?geometry={y},{x}&geometryFormat=geojson&geometryType=esriGeometryPoint&imageDisplay=1,1,1' +
    '&lang=de&layers=all:ch.are.gemeindetypen&mapExtent=0,0,1,1&returnGeometry=false&tolerance=0';

const POPULATION_DENSITY_DESCRIPTION = 'Average of persons living in 1ha based on a radius-search of 300 meters.';


/**
 * This function calculates the population density and the community type for download and upload.
 *
 * @param {Array} positions - the array is expected to have the best three positions in it, positions should be the result of choosePositions from positionsHelper
 * @see business_logic/positionsHelper
 * @param {function} callback - function which will be called with the result of the population density and community type
 * calculation, param1 of callback is the error which is null if no error occurred, param2 of callback is an object with
 * download and upload which both contain communityType and populationDensity which itself contains number and description
 */
function getGeoAdminData(positions, callback) {

    var queryPositions = queries.makeMultipoints(positions);

    dbAccess.queryMultiple(queries.FIND_MIDDLE_POINT, queryPositions, function (error, result) {

        if(error) {
            callback(error);
            return;
        }

        var urls = [];

        //download
        urls[0] = getGeoAdminURL(result[0][0], GEOADMIN_URL_POPULATION_DENSITY);
        urls[1] = getGeoAdminURL(result[0][0], GEOADMIN_URL_COMMUNITY_TYPE);

        //upload
        urls[2] = getGeoAdminURL(result[1][0], GEOADMIN_URL_POPULATION_DENSITY);
        urls[3] = getGeoAdminURL(result[1][0], GEOADMIN_URL_COMMUNITY_TYPE);


        var requestFunctions = getGeoAdminRequests(urls);

        parallel(requestFunctions,

            function (err, results) {

                if(err) {
                    callback(err);
                    return;
                }

                var resultingTags = {
                    download: {
                        populationDensity: {
                            number: getPopulationDensity(results[0]),
                            description: POPULATION_DENSITY_DESCRIPTION
                        },
                        communityType: getCommunityTypeJSON(results[1])
                    },
                    upload: {
                        populationDensity: {
                            number: getPopulationDensity(results[2]),
                            description: POPULATION_DENSITY_DESCRIPTION
                        },
                        communityType: getCommunityTypeJSON(results[3])
                    }
                };

                callback(null, resultingTags);
            }
        );
    });
}


/**
 * Function which generates the url which can be called to get the results for either population density or community type.
 *
 * @param {object} point - database result for the middle point of either the download or the upload phase
 * @param {string} URL - predefined url with placeholders for the lon and lat value
 * @returns {string} the parametrized url
 */
function getGeoAdminURL(point, URL) {

    var longitude = point.st_x;
    var latitude = point.st_y;

    var chY = converter.WGStoCHy(latitude, longitude);
    var chX = converter.WGStoCHx(latitude, longitude);

    return URL.replace('{y}', chY).replace('{x}', chX);
}


/**
 * Function which generates the functions which can be called to get the results for either population density or community type.
 *
 * @param {Array} urls - array which contains the valid urls for the download and upload phase
 * @returns {Array} an array which contains functions, which will generate a request to the specified url, if they are called
 */
function getGeoAdminRequests(urls) {

    var requestFunctions = [];

    for(var i = 0; i < urls.length; i++) {

        requestFunctions[i] = (function (i) {
            return function(callback) {
                request.get(
                    urls[i],
                    function (error, response) {
                        if (!error && response.statusCode === 200) {

                            callback(null, JSON.parse(response.body));
                        }
                        else {
                            console.error('GeoAdmin-API-Error: ' + error);
                            callback(error);
                        }
                    }
                );
            };
        })(i);
    }

    return requestFunctions;
}


/**
 * Calculates the average of population density for the results array which was returned form the geoAdmin API call.
 *
 * @param {Array} geoAdminResult - array which was returned form the geoAdmin API call for population density
 * @returns {number} the calculated population density average
 */
function getPopulationDensity(geoAdminResult) {

    var total = 0;

    geoAdminResult.results.forEach(function (res) {
        total += res.properties.popt_ha;
    });

    if(geoAdminResult.results.length) {
        total = Math.round(total / geoAdminResult.results.length);
    }

    return total;
}


/**
 * Function which returns the consistent answer for the community type calculation.
 *
 * @param {Array} geoAdminResult - array which was returned form the geoAdmin API call for community type
 * @returns {object} an object which includes id, type, description, communityId, communityName, cantonId, cantonName
 */
function getCommunityTypeJSON(geoAdminResult) {

    if(geoAdminResult.results.length === 0) {

        return UNKNOWN;
    }

    var community = geoAdminResult.results[0].properties;
    var communityType = getTypeTag(community.typ_code);

    return {
        id: communityType.id,
        type: communityType.type,
        description: 'Tag comes from: Gemeindetypologie ARE (Bundesamt für Raumentwicklung)',
        communityId: community.bfs_no,
        communityName: community.label,
        cantonId: community.kt_no,
        cantonName: community.kt_kz
    };
}


/**
 * Function which returns the correct community type based on the number-string which was returned from the geoAdmin API call.
 *
 * @param {string} number - number-string which was returned from the geoAdmin API call for community type
 * @returns {object} an object witch includes id and type
 */
function getTypeTag(number) {

    switch(number) {
        case '1':
            return LARGE_CENTRE;
        case '2':
            return NEIGHBORHOOD_CENTRE_OF_LARGE_CENTRE;
        case '3':
            return BELT_OF_LARGE_CENTRE;
        case '4':
            return MEDIUM_CENTRE;
        case '5':
            return BELT_OF_MEDIUM_CENTRE;
        case '6':
            return SMALL_CENTRE;
        case '7':
            return PERI_URBAN;
        case '8':
            return AGRICULTURAL;
        case '9':
            return TOURISTICAL;
        default:
            return UNKNOWN;
    }
}



module.exports = {
    "getGeoAdminData": getGeoAdminData
};