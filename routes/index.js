var router = require('express').Router();
var jsonSchema = require('./jsonSchemas');



/*CORS-HEADER*/
router.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});




router.get('/', function(req, res) {
    res.redirect('/api');
});

router.get('/api', function(req, res) {

    const apiData = {
        title: 'API',
        version: '5.1'
    };

    if(req.xhr || req.get('Content-Type') === 'application/json') {
        res.status(200).json(apiData);
        return;
    }

    res.render('api', apiData);
});

router.get('/schemas', function(req, res) {
    res.status(200).json({
        taggingSchema: jsonSchema.TAGGING_SCHEMA,
        speedCalculationSchema: jsonSchema.VELOCITY_SCHEMA,
        surroundingsSchema: jsonSchema.TAGGING_SCHEMA
    });
});




//split up route handling
router.use('/api', require('./router'));
router.use('/api/v5', require('./router'));
router.use('/api/v5.1', require('./router'));


router.use(jsonSchema.handleJsonSchemaValidationError);


module.exports = router;