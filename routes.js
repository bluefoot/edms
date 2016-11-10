// Define routes
var edmsutils = require('./edmsutils.js');
var mongoconnector = require('./mongodb-startup.js');
var mongo;
mongoconnector(function(m) {
  mongo = m;
});
const LIMIT = 5;

exports.index = function(req, res) {
  if(req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.render('index', {title : 'Index page of EDMS'});
  }
};

exports.profile = function(req, res) {
  if(req.session.user) {
    res.render('profile', {title : 'View profile', 'theuser' : req.session.user});
  } else {
    res.redirect('/');
  }
};

exports.showprofileedit = function(req, res) {
  if(req.session.user) {
    renderpage = function(theuser){
      res.render('profile', {title : 'Edit profile', 'edit' : true, 'theuser' : theuser});
    };
    // If an username param is defined, load it from database and send to edit
    // If not, no need to hit database, just send the user in session
    // Need a callback because loading from db is async
    if(req.params.username) {
      mongo.collection('edms.users').findOne({'username':req.params.username}, function(err, item) {
        if(item) {
          renderpage(item);
        } else if (err) {
          res.status(500).send('Error finding user: ' + err);
        } else {
          res.status(400).send('Username not found: ' + req.params.username);
        }
      });
    } else {
      renderpage(req.session.user);
    }
  } else {
    res.redirect('/');
  }
};

exports.showprofileeditpwd = function(req, res) {
  if(req.session.user) {
    res.render('profile_edit_pwd', {title : 'Change my password'});
  } else {
    res.redirect('/');
  }
};

exports.dashboard = function(req, res) {
  if(req.session.user) {
    if(req.query.page && req.query.page < 1) {
      res.redirect('/dashboard');
    } else {
      var selector = {};
      if(req.query.q) {
        selector = {'$or':[
                          {'username': {$regex: '.*' + req.query.q + '.*', $options:'i'}},
                          {'firstname': {$regex: '.*' + req.query.q + '.*', $options:'i'}},
                          {'lastname': {$regex: '.*' + req.query.q + '.*', $options:'i'}},
                          {'email': {$regex: '.*' + req.query.q + '.*', $options:'i'}}
                         ]
                  };
      }
      var skip = req.query.page ? (req.query.page - 1) * LIMIT : 0;
      var options = {'limit':LIMIT, 'skip':skip};
      mongo.collection('edms.users').find(selector, options).toArray(
          function(err, items) {
            if(!err) {
              res.render('dashboard', {
                title : 'Dashboard page',
                'employees' : items,
                'page' : req.query.page ? parseInt(req.query.page) : 1,
                'hidenext' : items.length < LIMIT ? true : false,
                'q' : req.query.q
              });
            } else {
              res.status(500).send("Can't fetch employees: " + err);
            }
      });
    }
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
