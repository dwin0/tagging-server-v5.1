/**
 * This module chooses the best positions with help of the positionsHelper, passes them on to velocity, typeOfMotion, location,
 * geographicalSurroundings and populationSurroundings and prepares the answer of those delegations with help of the jsonHelper
 * for the answer to the client.
 * @see business_logic/positionsHelper
 * @see business_logic/velocity
 * @see business_logic/typeOfMotion
 * @see business_logic/location
 * @see business_logic/geographicalSurroundings
 * @see business_logic/populationSurroundings
 * @module business_logic/taggingCommunication
 */

var location = require('./location');
var typeOfMotion = require('./typeOfMotion');
var velocity = require('./velocity');
var populationSurroundings = require('./populationSurroundings');
var geographicalSurroundings = require('./geographicalSurroundings');
var parallel = require('async/parallel');
var jsonHelper = require('./jsonHelper');
var positionsHelper = require('./positionsHelper');
var logError = require('./errorLogger').logError;


/**
 * Function which filters the positions and starts the calculation of the velocity and the calculation of the rest of the tags.
 *
 * @param {object} req - client request
 * @param {object} res - response which will be sent to the client
 */
function getTags(req, res) {

    positionsHelper.choosePositions(req.body, res, function (positions) {

        //error occurred, but already handled
        if(!positions) {
            return;
        }

        calculateVelocity(positions, req.body, res, calculateTags);
    });
}


/**
 * Function which starts the calculation of the velocity.
 *
 * @param {Array} positions - the array is expected to have the best three positions in it, positions should be the result of choosePositions from positionsHelper
 * @see business_logic/positionsHelper
 * @param {object} body - part of the request, will only be used in case of an error, so that the body which triggers the error can be logged
 * @param {object} res - response object, will be used to send an error if something went wrong
 * @param {function} callback - function which will be called with the result of the velocity calculation, param1 of callback is the
 * positions array, param2 of callback is the body, param3 is the response, param4 is the result of the velocity calculation
 */
function calculateVelocity(positions, body, res, callback) {

    velocity.getVelocity(positions, function (error, velocityJSON) {

        if(error || velocityJSON.velocityKilometersPerHour < 0) {
            res.status(500).json({ error: 'Internal Server Error' });
            logError(500, 'Internal Server Error', error || 'Speed: ' + velocityJSON.velocityKilometersPerHour + 'km/h',
                'velocity.getVelocity', 'taggingCommunication', body);
            return;
        }

        if(velocityJSON.timeSeconds === 0) {
            res.status(400).json({ error: 'All positions have the same time.' });
            return;
        }

        callback(positions, body, res, velocityJSON)
    });
}


/**
 * Function which starts the type of motion calculation and after the type of motion is received in parallel the calculation
 * of the location, the geographical surroundings, the population density and the community type.
 *
 * @param {Array} positions - the array is expected to have the best three positions in it, positions should be the result of choosePositions from positionsHelper
 * @see business_logic/positionsHelper
 * @param {object} body - part of the request, will only be used in case of an error, so that the body which triggers the error can be logged
 * @param {object} res - response object, will be used to send an error if something went wrong otherwise the the result of the
 * tagging calculation is returned to the client
 * @param {object} velocityJSON - result of the calculateVelocity function
 */
function calculateTags(positions, body, res, velocityJSON) {

    var typeOfMotionRes = typeOfMotion.getTypeOfMotion(velocityJSON.velocityKilometersPerHour);

    if(typeOfMotionRes.name === 'unknown') {
        res.status(400).json({ error: 'The input-positions are too far away from each other.' });
        return;
    }

    parallel([
            function(callback) {
                //console.time('getLocation');
                location.getLocation(typeOfMotionRes, positions, function (error, result) {
                    //console.timeEnd('getLocation');
                    callback(error, result);
                });
            },
            function(callback) {
                //console.time('getGeographicalSurroundings');
                geographicalSurroundings.getGeographicalSurroundings(positions, function (error, result) {
                    //console.timeEnd('getGeographicalSurroundings');
                    callback(error, result);
                });
            },
            function(callback) {
                //console.time('getGeoAdminData');
                populationSurroundings.getGeoAdminData(positions, function (error, result) {
                    //console.timeEnd('getGeoAdminData');
                    callback(error, result);
                })
            }
        ],
        function(err, results) {

            if(err) {
                res.status(500).json({ error: 'Internal Server Error' });
                logError(500, 'Internal Server Error', err, 'parallel', 'taggingCommunication', body);
                return;
            }

            /*Parameters: location-result, type-of-motion, speed-result, geographicalSurroundings-result, geoAdmin-result */
            var response = jsonHelper.renderTagJson(results[0], typeOfMotionRes, velocityJSON, results[1], results[2]);
            res.status(200).json(response);
        });
}


module.exports = {
    "getTags": getTags
};