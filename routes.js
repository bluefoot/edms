// Define routes
var edmsutils = require('./edmsutils.js');
var mongoconnector = require('./mongodb-startup.js');
var mongo;
mongoconnector(function(m) {
  mongo = m;
});

exports.index = function(req, res) {
  if(req.session.user) {
    res.redirect('/employee/all');
  } else {
    res.render('index', {title : 'Index page of EDMS'});
  }
};

exports.employeeAll = function(req, res) {
  if(req.session.user) {
    edmsutils.displayUserData(mongo);
    res.render('employeeall', {title : 'All employees'});
  } else {
    res.redirect('/');
  }
};

exports.registration = function(req, res) {
  res.render('registration', {title : 'New registration page'});
};

exports.login = function(req, res) {
  res.render('login', {title : 'Login'});
};

exports.logout = function(req, res) {
  req.session.destroy();
  res.redirect('/');
};
