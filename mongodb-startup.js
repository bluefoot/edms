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
var bootstrapData = [
       {'username':'admin', 'password':'9dd967b40d2e9db74629f0d4e8f3b2d8f0b98c03e4d152eb440ccff21374f02a', 'firstname' : 'Gewton', 'lastname' : 'Teixeira', 'email' : 'gewtonj@br.ibm.com'}, //password
       {'username':'gewton', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Gewton', 'lastname' : 'Teixeira', 'email' : 'gewtonj@gmail.com'}, //changeme
       {'username':'jon', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Jon', 'lastname' : 'Snow', 'email' : 'jsnow@somemail.com'},
       {'username':'stantheman', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Stannis', 'lastname' : 'Baratheon', 'email' : 'stan@somemail.com'},
       {'username':'dovahkiin', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Dragon', 'lastname' : 'Born', 'email' : 'dovhakiin@somemail.com'},
       {'username':'polt', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Choi', 'lastname' : 'Seong Hun', 'email' : 'polt@somemail.com'},
       {'username':'byun', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Hyun', 'lastname' : 'Woo', 'email' : 'byun@somemail.com'},
       {'username':'maru', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Cho', 'lastname' : 'Seong Ju', 'email' : 'maru@somemail.com'},
       {'username':'artosis', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Dan', 'lastname' : 'Stemkoski', 'email' : 'artosis@somemail.com'},
       {'username':'tasteless', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Nick', 'lastname' : 'Plott', 'email' : 'tasteless@somemail.com'},
       {'username':'flash', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Lee', 'lastname' : 'Young Ho', 'email' : 'flash@somemail.com'},
       {'username':'zest', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Joo', 'lastname' : 'Sung Wook', 'email' : 'zest@somemail.com'},
       {'username':'ty', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Jun', 'lastname' : 'Tae Yang', 'email' : 'ty@somemail.com'},
       {'username':'hero', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Kim', 'lastname' : 'Joon Ho', 'email' : 'hero@somemail.com'},
       {'username':'innovation', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Lee', 'lastname' : 'Shin Hyung', 'email' : 'innovation@somemail.com'},
       {'username':'apollo', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Shaun', 'lastname' : 'Clark', 'email' : 'aspollo@somemail.com'},
       {'username':'dragon', 'password':'0d07735398607502506eab639a1a637a7cfe9de3c34d865b5d3acb915cd13353', 'firstname' : 'Jeon', 'lastname' : 'Yong Soo', 'email' : 'ladydragon@somemail.com'}
       ];
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
    console.log('Mongodb loaded');
    // Attempt to create users collection if doesn't exist
    mongodb.createCollection('edms.users', function(err, collection) {
      // Insert bootstrap data if admin user not present
      // FIXME make sure to not insert repeated users
      collection.findOne({'username':'admin'}, function(err, item) {
        if(!item) {
          collection.insert(bootstrapData, {w:1}, function(err, result) {
            if(err) {
              console.log("Error inserting bootstrap data: " + err);
            } else {
              console.log("Bootstrap data successfully inserted");
            }
          });
        }
      });
    });
    mongodb.createCollection('edms.audits', function(err, collection) {
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
