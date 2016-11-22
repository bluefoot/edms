/*eslint-env node */

//TODO: remove default interface use custom css
//TODO: optimize database.js with things like createandfind, auto create if not found, update and find, etc
//TODO: see if mongoimport is less ugly than using csv-parse and xlsx modules
//TODO: automatically check if user has session or if auth headers were sent, 
//      instead of checking on every method. BUT still must have a way for any
//      route to not require authentication

//------------------------------------------------------------------------------
// gewtonj-edms (Employee Data Management System by gewtonj@br.ibm.com)
//------------------------------------------------------------------------------

var express = require('express');
var path = require('path');
var swig = require('swig');
var bodyParser = require('body-parser');
var validator = require('validator');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var flash = require('express-flash');
var fileUpload = require('express-fileupload');
var routes = require('./routes');
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
}));

//flash config. kinda like JSF/spring MVC https://github.com/RGBboy/express-flash
app.use(cookieParser('b5RU5boaXQjbQ22iyUUF'));
app.use(flash());

// view engine setup (swig: https://github.com/paularmstrong/swig)
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// file upload middleware setup
app.use(fileUpload());

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

app.use(routes);

//get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
