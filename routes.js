// Define routes
var edmsutils = require('./edmsutils.js');
var mongoconnector = require('./mongodb-startup.js');
var mongo;
mongoconnector(function(m) {
  mongo = m;
});

exports.index = function(req, res) {
  edmsutils.displayUserData(mongo);
  res.render('index', {title : 'Index page of EDMS'});
};

exports.registration = function(req, res) {
  res.render('registration', {title : 'New registration page'});
};

exports.login = function(req, res) {
  res.render('login', {title : 'Loin'});
};
