var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var validator = require('validator');
var edmsutils = require('./edmsutils.js');
var mongo;
const LIMIT = 5;
exports.LIMIT = LIMIT;

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
require('mongodb').MongoClient.connect(mongo_uri, {
    mongos: {
      ssl: true,
      sslValidate: false
    }
  }, 
  function(err, db) {
    if(err) {
      edmsutils.die("Cant connect to mongodb: " + err);
    }
    mongo = db.db("edms");
    console.log('Mongodb loaded');
    // Attempt to create users collection if doesn't exist
    mongo.createCollection('edms.users', function(err, collection) {
      // Insert bootstrap data if admin user not present
      collection.findOne({'username':'admin'}, function(err, item) {
        if(!item) {
          collection.insert(bootstrapData, {w:1}, function(err, result) {
            if(err) {
              console.log("Error loading bootstrap data: " + err);
            } else {
              console.log("Bootstrap data successfully loaded");
            }
          });
        }
      });
    });
    mongo.createCollection('edms.audits', function(err, collection) {
    });
});

exports.isDbReady = function() {
  return typeof mongo != 'undefined';
}

exports.userFind = function(fields, callback) {
  mongo.collection('edms.users').findOne(fields, function(err, item) {
    if(callback) callback(err, item);
  });
}

exports.userFindAll = function(selector, page, callback) {
  var skip = page ? (page - 1) * LIMIT : 0;
  var options = {'limit':LIMIT, 'skip':skip};
  mongo.collection('edms.users').find(selector, options).toArray(
      function(err, items) {
        if(callback) callback(err, items);
  });
}

exports.userInsert = function(user, callback) {
  for(var key in user) {
    user[key] = user[key].trim();
  }
  user.password = edmsutils.hashpwd(user.password);
  if(!userValidate(user)) {
    if(callback) callback("User not valid", null);
    return;
  }
  mongo.collection('edms.users').findOne({'$or':[{'username':user.username}, {'email':user.email}]}, function(err, item) {
    if(item) {
      var error = "Email already registered";
      if(item.username==user.username) {
        error = "User already registered";
      }
      if(callback) callback(error, null);
    } else {
      mongo.collection('edms.users').insertOne(user, function(err, result) {
        exports.auditInsert(user.username, "Created itself", function(errAudit, resultAudit){
          if(callback) callback(err, result);
        });
      });
    }
  });
}

exports.userUpdate = function(id, newValues, owner, claimedOldPassword, callback) {
  var refreshUserInSession = false;
  mongo.collection('edms.users').findOne({'_id':require('mongodb').ObjectID.createFromHexString(id)}, function(err, userToUpdate) {
    // Validate
    if(!userToUpdate) {
      if(callback) callback("User not found", null);
      return;
    }
    if(userToUpdate.username=='admin' && owner.username!='admin') {
      if(callback) callback("Not allowed to update admin user", null);
      return;
    }
    if(userToUpdate.username!=owner.username && newValues.password) {
      if(callback) callback("Can't change password of another user", null);
      return;
    }
    // Trim all values, check for blank or invalid ones
    for(var key in newValues) {
      newValues[key] = newValues[key].trim();
      if(!validator.isIn(key, ["firstname", "lastname", "email", "password"])) {
        if(callback) callback("Invalid field or field can't be updated: " + key, null);
        return;
      }
      if(validator.isEmpty(newValues[key])) {
        if(callback) callback("Empty field not allowed: " + key, null);
        return;
      }
    }
    if(newValues.username) {
      if(callback) callback("Can't change username", null);
      return;
    }
    if(newValues.password) {
      newValues.password = edmsutils.hashpwd(newValues.password);
      if(userToUpdate.password!=edmsutils.hashpwd(claimedOldPassword)) {
        if(callback) callback("Current password doesn't match. Hint: there are no hints", null);
        return;
      }
    }
    // Subfunction that updates and callsback
    doupdate = function() {
      mongo.collection('edms.users').update(
          {'username' : userToUpdate.username}, 
          {'$set': newValues}, 
          function(err, result) {
            exports.auditInsert(owner.username, "Updated user: " + userToUpdate.username, function(errAudit, resultAudit){
              if(callback) callback(err, result);
            });
          });
    }
    // If user wants to update email, need to check if is not already taken
    if(newValues.email) {
      mongo.collection('edms.users').findOne({'$and':[{'email':newValues.email}, {'username':{'$ne' : userToUpdate.username}}]}, function(err, item) {
        if(item) {
          if(callback) callback('Email ' + newValues.email + ' already taken', null);
        } else {
          doupdate();
        }
      });            
    } else {
      // else just run the update
      doupdate();
    }
  });
}

exports.userRemove = function(username, owner, callback) {
  if(username=="admin") {
    if(callback) callback("Cannot delete admin", null);
    return;
  }
  mongo.collection('edms.users').remove({'username' : username}, {w:1}, function(err, result){
    exports.auditInsert(owner.username, "Deleted user: " + username, function(errAudit, resultAudit){
      if(callback) callback(err, result);
    });
  });
}

exports.auditInsert = function(username, comments, callback) {
  mongo.collection('edms.audits').insertOne({'username' : username, 'timestamp' : new Date().getTime(), 'comments': comments}, function(err, result){
    if(callback) callback(err, result);
  });
}

exports.auditFindAll = function(page, callback) {
  var skip = page ? (page - 1) * LIMIT : 0;
  var options = {'limit':LIMIT, 'skip':skip, 'sort':[['timestamp', 'descending']]};
  mongo.collection('edms.audits').find({}, options).toArray(
    function(err, items) {
      if(callback) callback(err, items);
  });
}

exports.resetData = function(callback) {
  mongo.collection('edms.users', function(err, collection) {
    collection.drop({},function(err, removed){
      console.log("data was wiped");
      if(callback) callback(err, removed);
    });
  });
}

exports.displayUserData = function() {
  mongo.collection('edms.users').find().toArray(function(err, items) {
    if(!err) {
        console.log("users found:=========================");
        items.forEach(function(item) {
            console.log(item);
        });
        console.log("====================================");
    } else {
        console.log("can't get data to display: " + err);
    }
  });
}

function userValidate(user) {
  if(Object.keys(user).length!=5 ||
      validator.isEmpty(user.username) ||
      validator.isEmpty(user.firstname) ||
      validator.isEmpty(user.lastname) ||
      !validator.isEmail(user.email) ||
      validator.isEmpty(user.password) ||
      !validator.isAlphanumeric(user.username)) {
    return false;
  }
  return true;
}
