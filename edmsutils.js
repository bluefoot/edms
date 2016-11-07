var crypto = require('crypto');
const secret = 'dsahf827yhGuIHfduYGSfj2g8G';
var exports = module.exports = {};

exports.die = function(msg) {
    console.log(msg);
    process.exit(1);
}

exports.resetData = function(db) {
    db.collection('edms.users', function(err, collection) {
        collection.drop({},function(err, removed){
            console.log('data was reset');
        });
    });
}


exports.displayUserData = function(db) {
    var collection = db.collection('edms.users');
    collection.find().toArray(function(err, items) {
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

exports.inspectobject = function(obj) {
    const util = require('util');
    console.log(util.inspect(object, {showHidden: false, depth: null}));
}

exports.hashpwd = function(pwd) {
    return crypto.createHmac('sha256', secret).update(pwd).digest('hex');
}