// Define routes
var edmsutils = require('./edmsutils.js');
var mongoconnector = require('./mongodb-startup.js');
var mongo;
mongoconnector(function(m) {
  mongo = m;
});

exports.index = function(req, res) {
  if(req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.render('index', {title : 'Index page of EDMS'});
  }
};

exports.dashboard = function(req, res) {
  if(req.session.user) {
    var options = {};
    if(req.query.q) {
      res.locals.q = req.query.q;
      options = {'$or':[
                        {'username': {$regex: '.*' + req.query.q + '.*', $options:'i'}},
                        {'firstname': {$regex: '.*' + req.query.q + '.*', $options:'i'}},
                        {'lastname': {$regex: '.*' + req.query.q + '.*', $options:'i'}},
                        {'email': {$regex: '.*' + req.query.q + '.*', $options:'i'}}
                        ]
                };
    }
    mongo.collection('edms.users').find(options).toArray(
        function(err, items) {
          if(!err) {
            res.render('dashboard', {title : 'Dashboard page', 'employees':items});
          } else {
            response.status(500).send("Can't fetch employees: " + err);
          }
    });
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
