/*eslint-env node*/

//------------------------------------------------------------------------------
// gewtonj-edms (Employee Data Management System)
//------------------------------------------------------------------------------

var express = require('express');
var path = require('path');
var swig = require('swig');
var bodyParser = require('body-parser');
var validator = require('validator');
var edmsutils = require('./edmsutils.js');
var session = require('express-session');
var mongoconnector = require('./mongodb-startup.js');
var mongo;
mongoconnector(function(m){
  mongo = m;
});

// cfenv provides access to your Cloud Foundry environment
var cfenv = require('cfenv');

// create a new express server
var app = express();

// activating parser for http forms, using it as JSON in req.body 
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// session setup. more info at https://expressjs.com/en/resources/middleware/session.html
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'b5RU5boaXQjbQ22iyUUF',
  resave: false,
  saveUninitialized: true
}))

// view engine setup (swig: https://github.com/paularmstrong/swig)
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// Routes
// FIXME move all this logic to routes.js or /routes/something.js
// REST verbs to manipulate employee resource:
// GET    /employee/:username    view employee data
// PUT    /employee              insert employee (aka "new registration")
// DELETE /employee              remove employee
// POST   /employee              update employee (aka "edit profile details")
//
// Other routes:
// GET    /                             view start page
// GET    /login                        view login page
// POST   /login                        login user
// GET    /logout                       logout user, redirect to start page
// GET    /register                     new registration
// GET    /profile                      view my profile details
// GET    /profile/edit                 form to edit logged user's profile details
// GET    /profile/edit/:username       form to edit some username profile details
// GET    /profile/editpwd              form to edit logged user's password
// GET    /dashboard                    view dashboard
var routes = require('./routes');
app.get('/', routes.index);
app.get('/wipe', function(req, res){
  edmsutils.resetData(mongo);
  res.redirect('/');
});
app.get('*', function(req, res, next) {
  if(!mongo) {
    res.status(500).send('Application still loading, try again');
  } else {
    res.locals.user = req.session.user || null;
    next();
  }
});
app.get('/login', routes.login);
app.get('/logout', routes.logout);
app.post('/login', function(req, res) {
  req.body.password = edmsutils.hashpwd(req.body.password);
  mongo.collection('edms.users').findOne({'username':req.body.username, 'password':req.body.password}, function(err, item) {
    if(item) {
      req.session.user = item;
      mongo.collection('edms.audits').insertOne({'username' : item.username, 'timestamp' : new Date().getTime(), 'comments': 'login'}, function(err, result){
        if (err) {
          console.log('WARNING: coult not save audit log: ' + err);
        }
        res.send({'redirect':'/dashboard'});
      });
    } else {
      res.status(400).send('Match not found');
    }
  });
});
app.get('/dashboard', routes.dashboard);
app.get('/register', routes.registration);
app.put('/employee', function(req, res) {
  for(var key in req.body.employee) {
    req.body.employee[key] = req.body.employee[key].trim();
  }
  req.body.employee.password = edmsutils.hashpwd(req.body.employee.password);
  if(validateEmployee(req.body.employee)) {
    mongo.collection('edms.users').findOne({'$or':[{'username':req.body.employee.username}, {'email':req.body.employee.email}]}, function(err, item) {
      if(item) {
        if(item.username==req.body.employee.username) {
          res.status(400).send('Username ' + item.username + ' already registered');
        } else {
          res.status(400).send('Email ' + item.email + ' already registered');
        }
      } else {
        mongo.collection('edms.users').insertOne(req.body.employee, function(err, result){
          if (err) {
            res.status(500).send('Could not create registration: ' + err);
          } else {
            console.log('new employee added: ' + req.body.employee.username + ' <' + req.body.employee.email + '>');
            res.send(result);
          }
        });
      }
    });
  } else {
    res.status(400).send('Invalid fields were sent. Please check out the rules and try again');
  }
});
app.post('/employee', function(req, res) {
  if(req.session.user) {
    // Need to query to get which profile the user wants to update, so we 
    // can enforce some rules.
    // Rules are: can't change password of others, and also can't change admin
    // profile (unless you are admin).
    // Not to mention basic rules: no field can be blank, can't change username,
    // emails must be unique.
    var mongodb = require('mongodb');
    var refreshUserInSession = false;
    mongo.collection('edms.users').findOne({'_id':require('mongodb').ObjectID.createFromHexString(req.body.employee._id)}, function(err, employeeToUpdate) {
      if(employeeToUpdate) {
        if(employeeToUpdate.username=='admin' && req.session.user.username!='admin') {
          res.status(400).send('You can\'t change this user');
          return;
        }
        // if user is editing itself, needs to update object in session after
        refreshUserInSession = employeeToUpdate.username==req.session.user.username;
        // _id and username can't be modified
        delete req.body.employee._id;
        delete req.body.employee.username;
        // In case user is changing password, is expected user sent a oldpassword for verification
        var oldPasswordMatched;
        if(req.body.oldpassword) {
          oldPasswordMatched = edmsutils.hashpwd(req.body.oldpassword)==employeeToUpdate.password;
        }
        var updatefields = {};
        for(var key in req.body.employee) {
          req.body.employee[key] = req.body.employee[key].trim();
          if(key=='password') {
            if(employeeToUpdate.username != req.session.user.username) {
              res.status(400).send('Can\'t change password of another user');
              return;
            }
            if(!oldPasswordMatched) {
              res.status(400).send('Current password don\'t match or not sent, please try again. Hint: there are no hints');
              return;
            }
            req.body.employee.password = edmsutils.hashpwd(req.body.employee.password);
          }
          if(key=='username') {
            res.status(400).send('Can\'t change username');
            return;
          }
          if(!validator.isEmpty(req.body.employee[key])) {
            updatefields[key] = req.body.employee[key];
          }
        }
        if(Object.keys(updatefields).length > 0 && validateEmployee(updatefields, true)) {
          doupdate = function() {
            mongo.collection('edms.users').update(
                {'username' : employeeToUpdate.username}, 
                {'$set': updatefields}, 
                function(err, result) {
                  if(!err) {
                    if(refreshUserInSession) {
                      for(var key in updatefields) {
                        req.session.user[key]=updatefields[key];
                      }
                      res.redirect('/profile');
                    } else {
                      res.redirect('/dashboard');
                    }
                  } else {
                    res.status(500).send('Could not edit profile: ' + err);
                  }
            });
          }
          // if user wants to update email, need to check if is not already taken
          if(updatefields.email) {
            mongo.collection('edms.users').findOne({'$and':[{'email':updatefields.email}, {'username':{'$ne' : employeeToUpdate.username}}]}, function(err, item) {
              if(item) {
                res.status(400).send('Email ' + updatefields.email + ' already taken');
              } else {
                doupdate();
              }
            });            
          } else {
            // else just run the update
            doupdate();
          }
        } else {
          res.status(400).send('Invalid fields were sent. Please check out the rules and try again');
        }
      } else {
        res.status(500).send('Employee not found: ' + err);
      }
    });
  } else {
    res.status(400).send('You must be logged in to do that');
  }
});
app.delete('/employee', function(req, res){
  if(req.body.username=='admin') {
    res.status(400).send('Cannot delete admin');
  } else {
    mongo.collection('edms.users').remove({'username' : req.body.username}, {w:1}, function(err, result){
      if(err) {
        res.status(500).send('Error deleting user ' + req.body.username + ': ' + err);
      } else {
        console.log('employee deleted: ' + req.body.username);
        res.send(result);
      }
    });
  }
});
app.get('/profile/edit/:username?', routes.showprofileedit);
app.get('/profile/editpwd', routes.showprofileeditpwd);
app.get('/profile', routes.profile);
app.get('/audit', routes.audit);

function validateEmployee(employee, checkOnlyExistingFields) {
  if(checkOnlyExistingFields) {
    if((employee.username && (validator.isEmpty(employee.username) || !validator.isAlphanumeric(employee.username))) ||
       (employee.firstname && validator.isEmpty(employee.firstname)) ||
       (employee.lastname && validator.isEmpty(employee.lastname)) ||
       (employee.email && !validator.isEmail(employee.email)) ||
       (employee.password && validator.isEmpty(employee.password))) {
      return false;
    }
  } else {
    if(Object.keys(employee).length!=5 ||
        validator.isEmpty(employee.username) ||
        validator.isEmpty(employee.firstname) ||
        validator.isEmpty(employee.lastname) ||
        !validator.isEmail(employee.email) ||
        validator.isEmpty(employee.password) ||
        !validator.isAlphanumeric(employee.username)) {
      return false;
    }
  }
  return true;
}

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

