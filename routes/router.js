var router = require('express').Router();
var validate = require('express-jsonschema').validate;
var tagging = require('../business_logic/taggingCommunication');
var velocity = require('../business_logic/velocityCommunication');
var surroundings = require('../business_logic/surroundingsCommunication');
var jsonSchema = require('./jsonSchemas');



//Tagging:
router.get('/tag', function (req, res) {
    res.render('taggingIndex', { title: 'Tagging-Server', version: '5.1' });
});

// This route validates req.body against the taggingSchema
router.post('/tag', validate({body: jsonSchema.TAGGING_SCHEMA}), function (req, res) {
    // At this point req.body has been validated
    tagging.getTags(req, res);
});



//Surroundings:
router.get('/findSurroundings', function (req, res) {
    res.render('surroundingsIndex', { title: 'Umgebungsabfrage', version: '5.1' });
});

router.post('/findSurroundings', validate({body: jsonSchema.TAGGING_SCHEMA}), function (req, res) {
    surroundings.getSurroundings(req, res);
});


//SpeedCalculation:
router.get('/calculateSpeed', function (req, res) {
    res.render('speedIndex', { title: 'Geschwindigkeitsberechnung', version: '5.1' });
});

router.post('/calculateSpeed', validate({body: jsonSchema.VELOCITY_SCHEMA}), function (req, res) {
    velocity.getSpeedCalculation(req, res);
});



module.exports = router;