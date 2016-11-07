var mongo = require('mongodb').MongoClient;
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var edmsutils = require('./edmsutils.js');
var mongodb;
var exportcallbacks = [];

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
var adminUser = {'username':'admin', 'password':'9dd967b40d2e9db74629f0d4e8f3b2d8f0b98c03e4d152eb440ccff21374f02a', 'firstname' : 'Gewton', 'lastname' : 'Teixeira', 'email' : 'gewtonj@br.ibm.com'};
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
    mongodb = db.db("edms");
    // If there are any module waiting for the db object, send to them
    while(exportcallbacks.length!=0) {
      var callback = exportcallbacks.pop();
      if( typeof callback == 'function' ){
        callback(mongodb);
      }
    }
    // Attempt to create users collection if doesn't exist
    mongodb.createCollection('edms.users', function(err, collection) {
      // Insert bootstrap data if not already there
      collection.findOne({'username':'admin'}, function(err, item) {
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

// Using a callback for exports since the mongodb object is populated asynchronously
// For more info see http://stackoverflow.com/a/20239667
// Modules wanting to use this one, should do like so:
//   var mongoconnector = require('./mongodb-startup.js');
//   var mongo;
//   mongoconnector(function(m){
//     mongo = m;
//   });
module.exports = function(cb){
  if(typeof mongodb != 'undefined'){
    cb(mongodb);
  } else {
    exportcallbacks.push(cb);
    callback = cb;
  }
}
