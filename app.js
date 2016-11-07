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


/** bodyParser.urlencoded(options)
 * Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
 * and exposes the resulting object (containing the keys and values) on req.body
 */
app.use(bodyParser.urlencoded({
  extended: true
}));

/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on req.body.
 */
app.use(bodyParser.json());

// view engine setup
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// Routes
var routes = require('./routes');
app.get('/', routes.index);
app.get('/wipe', function(req, res){
  edmsutils.resetData(mongo);
  res.redirect('/');
});
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

