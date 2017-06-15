/**
 * This module is needed to return a consistent answer for the /tag and /findSurroundings route.
 * @module business_logic/jsonHelper
 */


/**
 * Function which creates a consistent answer for the /tag route.
 *
 * @param {object} locationRes - object with the results of the location calculation
 * @param {object} typeOfMotion - object with the results of the type of motion calculation
 * @param {object} velocityJSON - object with the results of the velocity calculation
 * @param {object} geographicalSurroundingsResult - object with the results of the geographical surroundings calculation
 * @param {object} geoAdminResults - object with the results of the geoAdmin calculation
 * @returns {object} object with title, location, typeoOfMotion, velocity and surroundings
 */
function renderTagJson(locationRes, typeOfMotion, velocityJSON, geographicalSurroundingsResult, geoAdminResults) {

    var surroundingsJson = renderSurroundingsJson(geographicalSurroundingsResult, geoAdminResults);

    return {
        title: 'Calculated Tagging',
        location: locationRes,
        typeOfMotion: typeOfMotion,
        velocity: velocityJSON,
        surroundings: surroundingsJson.surroundings
    }
}


/**
 *  Function which creates a consistent answer for the /findSurroundings route
 *
 * @param {object} geographicalSurroundingsResult - object with the results of the geographical surroundings calculation
 * @param {object} geoAdminResults - object with the results of the geoAdmin calculation
 * @returns {object} object with title and surroundings, surroundings includes download and upload which each include
 * populationDensity, communityType and geographicalSurroundings
 */
function renderSurroundingsJson(geographicalSurroundingsResult, geoAdminResults) {

    return {
        title: 'Calculated Surroundings',
        surroundings: {
            download: {
                populationDensity: geoAdminResults.download.populationDensity,
                communityType: geoAdminResults.download.communityType,
                geographicalSurroundings: geographicalSurroundingsResult.download
            },
            upload: {
                populationDensity: geoAdminResults.upload.populationDensity,
                communityType: geoAdminResults.upload.communityType,
                geographicalSurroundings: geographicalSurroundingsResult.upload
            }
        }
    }
}



module.exports = {
    "renderTagJson": renderTagJson,
    "renderSurroundingsJson": renderSurroundingsJson
};