/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var path = require('path');
var swig = require('swig');
var bodyParser = require('body-parser');
var validator = require('validator');
var edmsutils = require('./edmsutils.js');
var session = require('express-session')
var mongoconnector = require('./mongodb-startup.js');
var mongo;
mongoconnector(function(m){
  mongo = m;
});

// cfenv provides access to your Cloud Foundry environment
// for more info, see: n
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
var routes = require('./routes');
app.get('/', routes.index);
app.get('/wipe', function(req, res){
  edmsutils.resetData(mongo);
  res.redirect('/');
});
app.get('*', function(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
});
app.get('/login', routes.login);
app.get('/logout', routes.logout);
app.post('/login', function(req, res) {
  req.body.password = edmsutils.hashpwd(req.body.password);
  mongo.collection('edms.users').findOne({'username':req.body.username, 'password':req.body.password}, function(err, item) {
    if(item) {
      req.session.user = item;
      res.send({'redirect':'/employee/all'});
    } else {
      res.status(400).send('Match not found');
    }
  });
});
app.get('/employee/all', routes.employeeAll);
app.get('/employee/add', routes.registration);
app.put('/employee', function(req, res) {
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
    response.status(400).send('Invalid data received. Please check if all fields were filled up right.');
  }
});

function validateEmployee(employee) {
  if(Object.keys(employee).length!=5 ||
      validator.isEmpty(employee.username) ||
      validator.isEmpty(employee.firstname) ||
      validator.isEmpty(employee.lastname) ||
      !validator.isEmail(employee.email) ||
      validator.isEmpty(employee.password)) {
    return false;
  }
  return true;
}

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

