var mongo = require('mongodb').MongoClient;
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var edmsutils = require('./edmsutils.js');

// Find out connection URI from environment or cfenv
var mongo_uri;
var vcap = appEnv.VCAP_SERVICES || process.env.VCAP_SERVICES;
if (vcap) {
    var env = JSON.parse(vcap);
    if (env['compose-for-mongodb'] && env['compose-for-mongodb'][0]) {
        mongo_uri = env['compose-for-mongodb'][0]['credentials']["uri"];
    } else {
        edmsutils.die("Mongodb connection info not found in VCAP_SERVICES env variable");
    }
} else {
    edmsutils.die("Cannot get VCAP_SERVICES env variable");
}

// Connect to mongodb and create bootstrap data
var adminUser = {'username':'admin', 'password':'admin'};
mongo.connect(mongo_uri, {
        mongos: {
            ssl: true,
            sslValidate: false
        }
    }, 
    function(err, db) {
        if(err) {
            edmsutils.die("Cant connect to mongodb: " + err);
        }
        // Attempt to create users collection if doesn't exist
        db.createCollection('edms.users', function(err, collection) {
            // Insert bootstrap data if not already there
            collection.findOne(adminUser, function(err, item) {
                if(!item) {
                    collection.insert(adminUser, {w:1}, function(err, result) {
                        if(err) {
                            console.log("Error inserting bootstrap data: " + err);
                        } else {
                            console.log("Bootstrap data successfully inserted");
                        }
                    });
                }
            });
        });
});

module.exports = mongo;
