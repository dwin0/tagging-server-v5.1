const TAGGING_SCHEMA = {
    type: 'object',
    properties: {
        positions: {
            type: 'array',
            minItems: 8,
            maxItems: 8,
            required: true,
            items: {
                type: 'object',
                required: true,
                properties: {
                    longitude: {
                        type: 'number',
                        required: true
                    },
                    latitude: {
                        type: 'number',
                        required: true
                    },
                    horizontalAccuracy: {
                        type: 'number',
                        required: true
                    },
                    time: {
                        type: 'string',
                        required: true
                    }
                }
            }
        }
    }
};

const VELOCITY_SCHEMA = {
    type: 'object',
    properties: {
        positions: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            required: true,
            items: {
                type: 'object',
                required: true,
                properties: {
                    longitude: {
                        type: 'number',
                        required: true
                    },
                    latitude: {
                        type: 'number',
                        required: true
                    },
                    time: {
                        type: 'string',
                        required: true
                    }
                }
            }
        }
    }
};



function handleJsonSchemaValidationError(err, req, res, next) {

    if (err.name === 'JsonSchemaValidation') {

        console.error(err.message);

        var responseData = {
            statusText: 'Bad Request',
            jsonSchemaValidation: true,
            validations: err.validations
        };

        res.status(400).json(responseData);

    } else {
        // pass error to next error middleware handler
        next(err);
    }
}

module.exports = {
    "TAGGING_SCHEMA": TAGGING_SCHEMA,
    "VELOCITY_SCHEMA": VELOCITY_SCHEMA,
    "handleJsonSchemaValidationError": handleJsonSchemaValidationError
};