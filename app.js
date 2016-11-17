/*eslint-env node
 * WHAT IS LEFT:
 * - replace JWT with normal user/password
 * - fix identation
 * - default error page (http://stackoverflow.com/questions/6528876/how-to-redirect-404-errors-to-a-page-in-expressjs
      - this will help respond depending on the "accept" header)
 * - test
 * */
//

//------------------------------------------------------------------------------
// gewtonj-edms (Employee Data Management System by gewtonj@br.ibm.com)
//------------------------------------------------------------------------------

var express = require('express');
var path = require('path');
var swig = require('swig');
var bodyParser = require('body-parser');
var validator = require('validator');
var edmsutils = require('./edmsutils.js');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var flash = require('express-flash');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var parse = require('csv-parse');
var async = require('async');
var routes = require('./routes');
var db = require('./database.js');
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

// Routes
// REST verbs to manipulate employee resource: ================================
// GET    /api/employee/:username       get employee
// PUT    /api/employee/:username       put employee (employee data should be added in the request body)
// POST   /api/employee/:username       post employee (employee data should be added in the request body)
// DELETE /api/employee/:username       delete employee
// POST   /api/authenticate             since it requires authentication, this 
//                                      method returns a JWT token to be used 
//                                      while calling other api methods
//
// Web interface routes: ======================================================
// GET    /                             view start page
// GET    /register                     new registration
// GET    /login                        view login page
// POST   /login                        login user
// GET    /logout                       logout user, redirect to start page
// GET    /dashboard                    view dashboard
// GET    /profile                      view my profile details
// GET    /profile/edit                 form to edit logged user's profile details
// GET    /profile/edit/:username       form to edit some username profile details
// GET    /profile/editpwd              form to edit logged user's password
// GET    /audit                        view audit page
// GET    /upload                       view page to upload CSV
// POST   /upload                       submit CSV
app.all('*', function(req, res, next) {
  // Check if mongodb finished connecting and loading bootstrap data
  if(!db.isDbReady()) {
    res.status(500).send('Application still loading, try again');
  } else {
    // Set session user (if available) to a global variable to be used by views
    res.locals.user = req.session.user || null;
    // Continue in the chain
    next();
  }
});
app.get('/api/employee/:username', routes.getEmployee);
app.put('/api/employee/:username', routes.putEmployee);
app.post('/api/employee/:username', routes.postEmployee);
app.delete('/api/employee/:username', routes.deleteEmployee);
app.post('/api/authenticate', routes.apiAuth);

app.get('/', routes.index);
app.get('/register', routes.registration);
app.get('/login', routes.login);
app.post('/login', routes.dologin);
app.get('/logout', routes.logout);
app.get('/dashboard', routes.dashboard);
app.get('/profile', routes.userProfile);
app.get('/profile/edit/:username?', routes.userProfileEdit);
app.get('/profile/editpwd', routes.userProfileEditPwd);
app.get('/audit', routes.audit);
app.get('/upload', routes.upload);
app.post('/upload', routes.doUpload);

//get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
