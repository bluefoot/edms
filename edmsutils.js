var crypto = require('crypto');
const secret = 'dsahf827yhGuIHfduYGSfj2g8G';
var exports = module.exports = {};
var validator = require('validator');

exports.die = function(msg) {
    console.log(msg);
    process.exit(1);
}

exports.inspectobject = function(obj) {
    const util = require('util');
    console.log(util.inspect(object, {showHidden: false, depth: null}));
}

exports.hashpwd = function(pwd) {
  if(validator.isEmpty(pwd)) {
    return "";
  } else {
    return crypto.createHmac('sha256', secret).update(pwd).digest('hex');
  }
}