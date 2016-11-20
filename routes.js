// Define routes
var edmsutils = require('./edmsutils.js');
var db = require('./database.js');
var fs = require('fs');
var jwt = require('jwt-simple');
const jwtsecret = 'LOr4Kspiv2uJRarrU8JsNSRVT4UgGj8KEKA8J14QO3HZbP6klN';

exports.getEmployee = function(req, res) {
  var authenticatedUsername;
  if(req.session.user) {
    // if coming from webpage, then session is expected
    authenticatedUsername = req.session.user.username;
  } else {
    // else, then it's coming from API, so JWT token is expected
    authenticatedUsername = getUsernameFromToken(req.headers);
  }
  if(authenticatedUsername) {
    db.userFind({'username':req.params.username}, function(err, item) {
      if(item) {
        res.send(item);
      } else if (err) {
        res.status(500).send('Error finding employee: ' + err);
      } else {
        res.status(404).send('Employee not found: ' + req.params.username);
      }
    });
  } else {
    res.redirect('/');
  }
};

exports.putEmployee = function(req, res) {
  // this method does not require authentication (per requirements)
  // any user can register itself
  var employee = req.body.employee;
  employee.username = req.params.username;
  db.userFind({username:employee.username}, function(err, item){
    if(item) {
      // PUT is idempotent, so if exists it needs to either replace or return
      res.send(item);
    } else {
      db.userInsert(employee, req.params.username, function(err, item){
        if (err) {
          res.status(500).send(err);
        } else {
          res.send(item);
        }
      });
    }
  });
};

exports.postEmployee = function(req, res) {
  var authenticatedUsername;
  if(req.session.user) {
    // if coming from webpage, then session is expected
    authenticatedUsername = req.session.user.username;
  } else {
    // else, then it's coming from API, so JWT token is expected
    authenticatedUsername = getUsernameFromToken(req.headers);
  }
  if(authenticatedUsername) {
    // Need to query to get which profile the user wants to update, so we 
    // can enforce some rules.
    // Rules are: can't change password of others, and also can't change admin
    // profile (unless you are admin).
    // Not to mention basic rules: no field can be blank, can't change username,
    // emails must be unique.
    var refreshUserInSession = false;
    var usernameToUpdate = req.params.username;
    db.userUpdate(usernameToUpdate, req.body.employee, authenticatedUsername, req.body.oldpassword, function(err, item){
      if(!err) {
        req.flash('info', 'Employee was updated successfully');
        if(req.session.user && (item.username==req.session.user.username)) {
          // If user is editing itself, refresh the fields form session and send user back to profile
          req.session.user = item;
          res.redirect('/profile');
        } else {
          res.format({
            'text/html': function(){
              res.redirect('/dashboard');
            },

            'application/json': function() {
              res.send(item);
            }
          });
        }
      } else {
        res.status(500).send('Could not update employee: ' + err);
      }
    });
  } else {
    res.status(403).send('You must be logged in to do that');
  }
};

exports.deleteEmployee = function(req, res){
  var authenticatedUsername;
  if(req.session.user) {
    // if coming from webpage, then session is expected
    authenticatedUsername = req.session.user.username;
  } else {
    // else, then it's coming from API, so JWT token is expected
    authenticatedUsername = getUsernameFromToken(req.headers);
  }
  if(authenticatedUsername) {
    db.userFind({username:req.params.username}, function(err, item) {
      if(!item) {
        res.status(404).send('Employee not found');
      } else {
        db.userRemove(req.params.username, authenticatedUsername, function(err, result){
          if(err) {
            res.status(500).send('Error deleting user ' + req.params.username + ': ' + err);
          } else {
            res.send({success:true});
          }
        });
      }
    });
  } else {
    res.status(403).send('You must be logged in to do that');
  }
};

exports.apiAuth = function(req, res) {
  //FIXME is this really necessary? all methods could just check for user/pwd from headers and that's it
  var credentials = getUserAndPasswordFromHeaders();
  credentials.password = edmsutils.hashpwd(credentials.password);
  db.userFind({'username':credentials.username, 'password':credentials.password}, function(err, item) {
    if(item) {
      db.auditInsert(item.username, "Authenticate API", function(err, result) {
        var token = jwt.encode({username:item.username}, jwtsecret);
        res.send({success:true, jwt:token});
      });
    } else {
      res.send({success:false, msg:'Authentication failed: match not found'});
    }
  });
}

exports.index = function(req, res) {
  if(req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.render('index', {title : 'Index page of EDMS'});
  }
};

exports.registration = function(req, res) {
  res.render('registration', {title : 'New registration page'});
};

exports.login = function(req, res) {
  res.render('login', {title : 'Login'});
};

exports.dologin = function(req, res) {
  req.body.password = edmsutils.hashpwd(req.body.password);
  db.userFind({'username':req.body.username, 'password':req.body.password}, function(err, item) {
    if(item) {
      req.session.user = item;
      db.auditInsert(item.username, "login", function(err, result) {
        res.redirect('/dashboard');
      });
    } else {
      req.flash('error', 'Match not found');
      res.redirect('/login');
    }
  });
};

exports.logout = function(req, res) {
  req.session.destroy();
  res.redirect('/');
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
      db.userFindAll(selector, {page:req.query.page}, function(err, items){
        if(!err) {
          res.render('dashboard', {
            title : 'Dashboard page',
            'employees' : items,
            'page' : req.query.page ? parseInt(req.query.page) : 1,
            'hidenext' : items.length < db.LIMIT ? true : false,
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

exports.userProfile = function(req, res) {
  if(req.session.user) {
    res.render('profile', {title : 'View profile', 'theuser' : req.session.user});
  } else {
    res.redirect('/');
  }
};

exports.userProfileEdit = function(req, res) {
  if(req.session.user) {
    renderpage = function(theuser){
      res.render('profile', {title : 'Edit profile', 'edit' : true, 'theuser' : theuser});
    };
    // If an username param is defined, load it from database and send to edit
    // If not, no need to hit database, just send the user in session
    // Need a callback because loading from db is async
    if(req.params.username) {
      db.userFind({'username':req.params.username}, function(err, item) {
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

exports.userProfileEditPwd = function(req, res) {
  if(req.session.user) {
    res.render('profile_edit_pwd', {title : 'Change my password'});
  } else {
    res.redirect('/');
  }
};

exports.audit = function(req, res) {
  if(req.session.user && req.session.user.username=='admin') {
    if(req.query.page && req.query.page < 1) {
      res.redirect('/audit');
    } else {
      db.auditFindAll({page:req.query.page}, function(err, items){
        
        if(!err) {
          res.render('audit', {
            title : 'Employee Audit Trails',
            'audits' : items,
            'page' : req.query.page ? parseInt(req.query.page) : 1,
            'hidenext' : items.length < db.LIMIT ? true : false
          });
        } else {
          res.status(500).send("Can't fetch audit records: " + err);
        }
      });
    }
  } else {
    res.redirect('/');
  }
}

exports.auditdownload = function(req, res) {
  if(req.session.user && req.session.user.username=='admin') {
    db.auditFindAll({nolimit:true, getAsCursor:true}, function(err, cursor){
      if(!err) {
        res.setHeader('Content-disposition', 'attachment; filename=audit.csv');
        res.setHeader('Content-type', 'application/json');
        res.status(200);
        var firstLineProcessed = false;
        cursor.stream({transform: function(item){
          var csvline = '';
          if(!firstLineProcessed) {
            csvline = '"username","date (ISO format)","comments"\n';
            firstLineProcessed = true;
          }
          return csvline+='"' + item.username + '","' + new Date(item.timestamp).toISOString() + '","' + item.comments + '"\n';
        }}).pipe(res);
      } else {
        res.status(500).send("Can't fetch audit: " + err);
      }
    });
  } else {
    res.redirect('/');
  }
}

exports.upload = function(req, res) {
  if(req.session.user && req.session.user.username=='admin') {
    res.render('upload', {title : 'Employee record upload'});
  } else {
    res.redirect('/');
  }
};

exports.doUpload = function(req, res) {
  if(req.session.user && req.session.user.username=='admin') {
    if (!req.files || !req.files.input) {
      return res.status(400).send('No files were uploaded.');
    }
    var filename = 'edmsupload-' + require("randomstring").generate() + req.files.input.name;
    var finalize = function() {
      // function to be called at the end. remove temp file and redirect user back to page
      fs.unlink(filename, function(errRemove){
        if(errRemove) {console.log("cant remove uploaded file: " + errRemove)};
        req.flash('info', 'Successfully started processing file in background. Check audit log for results');
        res.redirect('/upload');
      });
    }
    req.files.input.mv(filename, function(err) {
      if (err) {
        res.status(500).send("Could not upload file: " + err);
      } else {
        if(filename.endsWith('.xls') || filename.endsWith('.xlsx')) {
          // upload Excel
          var xlsx = require('xlsx');
          var workbook = xlsx.readFile(filename);
          // converts the first sheet of the file to a employee list (the first 
          // row of the sheet must be the header, containing valid field names: 
          // username,firstname,lastname,email,password
          var jsonSheet = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          jsonSheet.forEach(function(line){
            db.userInsert(line, req.session.user.username, function(err, item){
              if(err) {
                console.log('Could not bulk insert user ' + line.username + ': ' + err);
              }
            });
          });
          finalize();
        } else {
          // upload CSV
          var Converter=require("csvtojson").Converter;
          var csvConverter=new Converter({constructResult:false,trim:true});
          csvConverter.on("record_parsed", function(line) {
            // for each line parsed, insert
            db.userInsert(line, req.session.user.username, function(err, item){
              if(err) {
                console.log('Could not bulk insert user ' + line.username + ': ' + err);
              }
            });
          });
          csvConverter.on("end_parsed", function(results) { 
            // results variable will be empty because I set constructResult:false
            finalize();
          });
          fs.createReadStream(filename).pipe(csvConverter);
        }
      }
    });
  } else {
    res.status(403).send('You\'re not authorized to do that');
  }
}

function getUsernameFromToken(headers) {
  // Check for "authorization" base64 token from headers
  // Some clients will always user:password, even if password is blank, so need to check that.
  // If not found or invalid, return null
  try {
    if(headers && headers.authorization) {
      var p = headers.authorization.split(' ');
      if (p.length === 2) {
        var plaintoken = new Buffer(p[1], 'base64').toString('ascii');
        plaintoken = plaintoken.split(':')[0];
        return jwt.decode(plaintoken, jwtsecret).username;
      } else {
        return null;
      }
      return 
    }
  } catch(err) {
    console.log(err);
  }
  return null;
}

function getUserAndPasswordFromHeaders(headers) {
  // Check for "authorization" base64 user and password from headers
  // If not found or invalid, return null
  try {
    if(headers && headers.authorization) {
      var p = headers.authorization.split(' ');
      if (p.length === 2) {
        var plainUserAndPwd = new Buffer(p[1], 'base64').toString('ascii').split(':');
        return {username:plainUserAndPwd[0], password:plainUserAndPwd[1]};
      } else {
        return null;
      }
      return 
    }
  } catch(err) {
    console.log(err);
  }
  return null;
}