/**
 * In this module the correct formatted input-positions will be validated and filtered. Validation includes: a check if
 * the positions are inside switzerland, a check if at least one of the lon, lat values of a position is not equal to zero,
 * a check if the time string of a position can be parsed to a valid date and a check whether at least one horizontalAccuracy is
 * below 200m. If the validation fails an error will be sent back to the client. Otherwise the best position for each
 * phase will be selected.
 * @module business_logic/positionsHelper
 */


var dbAccess= require('../persistence/dbAccess');
var queries = require('./dbQueries');
var logError = require('./errorLogger').logError;


/**
 * Filters the 8 input-positions for the 3 bests.
 * Positions 1-3, 4-5 and 6-8 are close to each other. This methods chooses the best position out of each group / phase.
 *
 * @param {object} body - part of the request, should have positions inside
 * @param {object} res - response object, will be used to send an error if something went wrong
 * @param {function} callback - function which will be called with the three best positions, in case of error callback is
 * called with no parameters
 */
function choosePositions(body, res, callback) {

    var positions = body.positions;

    if(typeof positions === 'string') {
        positions = JSON.parse(positions);
    }

    positions.sort(function (p1, p2) {
        return new Date(p1.time).getTime() - new Date(p2.time).getTime();
    });

    var beforeDownload = chooseForPhase([positions[0], positions[1], positions[2]], chooseBeforeDownload);
    var beforeUpload = chooseForPhase([positions[3], positions[4]], chooseBeforeUpload);
    var afterUpload = chooseForPhase([positions[5], positions[6], positions[7]], chooseAfterUpload);

    if(!beforeDownload || !beforeUpload || !afterUpload) {

        res.status(400).json({ error: 'Cannot tag invalid positions. (Multiple occurrences of longitude or latitude 0 ' +
                             'OR invalid time strings.)' });
        callback();
        return;
    }

    checkIfSwitzerland([beforeDownload, beforeUpload, afterUpload], function (error, allPointsInSwitzerland) {

        if(error) {
            res.status(500).json({ error: 'Internal Server Error' });
            logError(500, 'Internal Server Error', error, 'checkIfSwitzerland', 'positionsHelper', body);
            callback();
            return;
        }

        if(!allPointsInSwitzerland) {

            res.status(400).json({ error: 'Not all positions are located within Switzerland.' });
            callback();
            return;
        }

        if(!checkValidHorizontalAccuracy([beforeDownload, beforeUpload, afterUpload])) {

            res.status(400).json({ error: 'Cannot tag positions less accurate than 200 meters.' });
            callback();
            return;
        }

        callback([beforeDownload, beforeUpload, afterUpload]);
    });
}


/**
 * Validates and filters the phaseCandidates for the best position and returns it. Needs to be called for each phase separately.
 *
 * @param {array} phaseCandidates - are the positions of one phase (phases are currently one of 1-3, 4-5 or 6-8 of the whole positions array)
 * @param {function} phaseSelectionMethod - method which will be called to filter the valid phaseCandidates for one phase
 * @returns {object} the best position for a phase, undefined if none of the phaseCandidates are valid
 */
function chooseForPhase(phaseCandidates, phaseSelectionMethod) {

    var validCandidates = filterValidPositions(phaseCandidates);
    if(!validCandidates) {
        return;
    }
    return phaseSelectionMethod(validCandidates);
}


/**
 * Filters the posArray for the valid positions and returns them. Needs to be called for each phase separately.
 *
 * @param {array} posArray - array includes the positions of one phase (phases are currently one of 1-3, 4-5 or 6-8 of the whole positions array)
 * @returns {array} filtered array with valid positions, undefined if none of the posArray elements are valid
 */
function filterValidPositions(posArray) {

    var validPositions = [];

    posArray.forEach(function (pos) {

        if(pos.latitude !== 0 && pos.longitude !== 0 && Date.parse(pos.time)) {
            validPositions.push(pos);
        }
    });

    if(validPositions.length) {
        return validPositions;
    }
}


/**
 * Checks whether all positions are inside switzerland or not, if they are not inside 0 is returned otherwise 1 is returned.
 * If a database error occurs an error will be returned.
 *
 * @param {array} positions - includes the positions which should be checked
 * @param {function} callback - function which will be called with the result of the check, param1 of callback is the error
 * which is null if no error occurred, param2 of callback is the result
 */
function checkIfSwitzerland(positions, callback) {

    var queryPositions = queries.makePoints(positions);

    dbAccess.singleQuery(queries.INSIDE_SWITZERLAND, queryPositions, function (error, result) {
        if(error) {
            callback(error);
            return;
        }

        callback(null, result.length);
    });
}


/**
 * Checks whether at least one position has a horizontalAccuracy which is below 200m.
 *
 * @param {array} positions - includes the positions which should be checked
 * @returns {boolean} true if at least one position is below 200m, false if none are below 200m
 */
function checkValidHorizontalAccuracy(positions) {

    var result = false;

    positions.forEach(function (pos) {

        if(pos.horizontalAccuracy <= 200) {
            result = true;
        }
    });

    return result;
}




/**
 * Returns the best position for the phase "before download".
 *
 * @param {array} posArray - includes the positions which should be filtered
 * @returns {object} best position
 */
function chooseBeforeDownload(posArray) {

    /*
     Choose the best of the following positions:
     Position 1: FCTStart
     Position 2: FCTEnd
     Position 3: DownloadStart

     In the case of a long FCT-Phase, Position 1 and 2 could be far away from each other.
     Position 2 and 3 are always close to each other.
     */

    if(posArray.length === 1) {
        /*
        In the worst case, only position 1 is valid and the FCT-Phase has a long duration. This could tamper the
        download-surroundings-result.
         */
        return posArray[0];
    }
    else {
        /*
        Chose the lowest position possible (1 or 2) which is more accurate than the highest position (normally 3)
        and 100ms or less time away from the highest. This guarantees in the case of a long FCT-Phase,
        that the more accurate position of 2 or 3 is chosen and position 1 cant tamper the surrounding-query.
        */

        var bestPosition = posArray[posArray.length - 1];

        for(var i = posArray.length - 2; i >= 0; i--) {

            var pos = posArray[i];
            var posTime = new Date(pos.time).getTime();
            var bestPositionTime = new Date(bestPosition.time).getTime();

            if(bestPositionTime - posTime <= 100) {
                bestPosition = findMoreAccurate(bestPosition, pos);
            }
        }

        return bestPosition;
    }
}


/**
 * Returns the best position for the phase "before upload".
 *
 * @param {array} posArray - includes the positions which should be filtered
 * @returns {object} best position
 */
function chooseBeforeUpload(posArray) {

    /*
     Choose the best of the following positions:
     Position 4: DownloadEnd
     Position 5: UploadStart

     Both positions are always close to each other.
     */

    if(posArray.length === 1) {
        return posArray[0];
    }
    else {
        return findMoreAccurate(posArray[0], posArray[1]);
    }
}


/**
 * Returns the best position for the phase "after upload".
 *
 * @param {array} posArray - includes the positions which should be filtered
 * @returns {object} best position
 */
function chooseAfterUpload(posArray) {

    /*
     Choose the best of the following positions:
     Position 6: UploadEnd
     Position 7: RTTStart
     Position 8: RTTEnd

     In the case of a long RTT-Phase, Position 7 and 8 could be far away from each other.
     Position 6 and 7 are always close to each other.
     */

    if(posArray.length === 1) {
        /*
         In the worst case, only position 8 is valid and the RTT-Phase has a long duration. This could tamper the
         upload-surroundings-result.
         */
        return posArray[0];
    }
    else {
        /*
         Chose the highest position possible (7 or 8) which is more accurate than the lowest position (normally 6)
         and 100ms or less time away from the lowest. This guarantees in the case of a long RTT-Phase,
         that the more accurate position of 6 or 7 is chosen and position 8 cant tamper the surrounding-query.
         */

        var bestPosition = posArray[0];

        for(var i = 1; i <= posArray.length - 1; i++) {

            var pos = posArray[i];
            var posTime = new Date(pos.time).getTime();
            var bestPositionTime = new Date(bestPosition.time).getTime();

            if(posTime - bestPositionTime <= 100) {
                bestPosition = findMoreAccurate(bestPosition, pos);
            }
        }

        return bestPosition;
    }
}


/**
 * Returns the position which is more accurate, if accuracies are the same pos1 is returned.
 *
 * @param {object} pos1 - position with horizontalAccuracy
 * @param {object} pos2 - position with horizontalAccuracy
 * @returns {object} more accurate position, if accuracies are the same pos1 is returned
 */
function findMoreAccurate(pos1, pos2) {
    return pos2.horizontalAccuracy < pos1.horizontalAccuracy ? pos2 : pos1;
}




module.exports = {
    "choosePositions": choosePositions
};