/**
 * In this module the geographical surroundings is calculated.
 * @module business_logic/geographicalSurroundings
 */


var dbAccess= require('../persistence/dbAccess');
var queries = require('./dbQueries');


const UNKNOWN = {
    osmKey: 'unknown',
    osmValue: 'unknown',
    description: 'No tagging possible.'
};


/**
 * Queries the database for the keys boundary, "natural", leisure and landuse for the download and the upload and returns
 * the result.
 *
 * @param {Array} positions - the array is expected to have the best three positions in it, positions should be the result of choosePositions from positionsHelper
 * @see business_logic/positionsHelper
 * @param {function} callback - function which will be called with the result of the database, param1 of callback is the error
 * which is null if no error occurred, param2 of callback is the result
 */
function getGeographicalSurroundings(positions, callback) {

    var queryPositions = queries.makeMultipoints(positions);

    dbAccess.queryMultiple(queries.FIND_MIDDLE_POINT, queryPositions, function (error, result) {

        if(error) {
            callback(error);
            return;
        }

        /*DEMO-Points
         boundary: POINT(8.55777 47.2495) -> protected_area
         natural: POINT(8.7048 47.3611) -> wetland
         leisure: POINT(8.55777 47.2495) -> nature_reserve
         landuse: POINT(8.6875 47.2157) -> forest
         multiple entries: POINT(8.73956 47.54351) -> natural: scrub / leisure: natural_reserve
         */

        queryPositions = [result[0][0].st_astext, result[1][0].st_astext];

        dbAccess.queryMultiple(queries.GEOGRAPHICAL_QUERY, queryPositions, function (error, result) {

            if(error) {
                callback(error);
                return;
            }

            var downloadResult = [];
            var uploadResult = [];

            if(result[0].length) {
                downloadResult = result[0][0];
            }

            if(result[1].length) {
                uploadResult = result[1][0];
            }

            var resultObj = {
                download: prepareResult(downloadResult),
                upload: prepareResult(uploadResult)
            };

            callback(null, resultObj);
        });
    });
}

/**
 * Changes result of database query into an object.
 *
 * @param {object} dbResult - result of the database query
 * @returns {object} object with following: {osmKey: string, osmValue: string, description: string}
 */
function prepareResult(dbResult) {

    const DESCRIPTION = 'Tag comes from: OpenStreetMap';

    var prepared = {
        osmKey: UNKNOWN.osmKey,
        osmValue: UNKNOWN.osmValue,
        description: UNKNOWN.description
    };

    for (var entry in dbResult) {

        if (dbResult.hasOwnProperty(entry) && dbResult[entry] !== null) {

            prepared.osmKey = entry;
            prepared.osmValue = dbResult[entry];
            prepared.description = DESCRIPTION;
        }
    }

    return prepared;
}


module.exports = {
    "getGeographicalSurroundings": getGeographicalSurroundings
};