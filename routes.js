// Define routes
var edmsutils = require('./edmsutils.js');
var db = require('./database.js');
var fs = require('fs');

exports.userGet = function(req, res) {
  if(req.session.user) {
    if(req.params.username) {
      db.userFind({'username':req.params.username}, function(err, item) {
        if(item) {
          res.send(item);
        } else if (err) {
          res.status(500).send('Error finding user: ' + err);
        } else {
          res.status(400).send('Username not found: ' + req.params.username);
        }
      });
    } else {
      res.status(500).send("Need username");
    }
  } else {
    res.redirect('/');
  }
};

exports.userInsert = function(req, res) {
  db.userInsert(req.body.employee, req.session.user, function(err, item){
    if (err) {
      res.status(500).send('Could not create registration: ' + err);
    } else {
      res.send(item);
    }
  });
};

exports.userUpdate = function(req, res) {
  if(req.session.user) {
    // Need to query to get which profile the user wants to update, so we 
    // can enforce some rules.
    // Rules are: can't change password of others, and also can't change admin
    // profile (unless you are admin).
    // Not to mention basic rules: no field can be blank, can't change username,
    // emails must be unique.
    var refreshUserInSession = false;
    var id = req.body.employee._id;
    delete req.body.employee._id;
    db.userUpdate(id, req.body.employee, req.session.user, req.body.oldpassword, function(err, result){
      if(!err) {
        req.flash('info', 'User was updated successfully');
        if(result.username==req.session.user.username) {
          req.serssion.user = result;
          res.redirect('/profile');
        } else {
          res.redirect('/dashboard');
        }
      } else {
        res.status(500).send('Could not update profile: ' + err);
      }
    });
  } else {
    res.status(400).send('You must be logged in to do that');
  }
};

exports.userDelete = function(req, res){
  if(req.session.user) {
    db.userRemove(req.body.username, req.session.user, function(err, result){
      if(err) {
        res.status(500).send('Error deleting user ' + req.body.username + ': ' + err);
      } else {
        res.send(result);
      }
    });
  } else {
    res.status(400).send('You must be logged in to do that');
  }
};

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
      db.userFindAll(selector, req.query.page, function(err, items){
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
      db.auditFindAll(req.query.page, function(err, items){
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
    // don't even let normal users know about it
    res.status(404).send("Page not found");
  }
};

exports.upload = function(req, res) {
  if(req.session.user) {
    res.render('upload', {title : 'Employee record upload'});
  } else {
    res.redirect('/');
  }
};

exports.doUpload = function(req, res) {
  if(req.session.user) {
    if (!req.files || !req.files.input) {
      res.status(400).send('No files were uploaded.');
      return;
    }
    var csv = req.files.input;
    var filename = 'edmsupload-' + require("randomstring").generate() + '.csv';
    csv.mv(filename, function(err) {
      if (err) {
        res.status(500).send("Could not upload file: " + err);
      } else {
        var Converter=require("csvtojson").Converter;
        var csvConverter=new Converter({constructResult:false,trim:true});
        var linesFound = 0;
        csvConverter.on("record_parsed", function(line) {
          linesFound++;
          db.userInsert(line, req.session.user, function(err, item){
            if(err) {
              console.log('Could not insert user ' + line.username + ': ' + err);
            }
          });
        });
        csvConverter.on("end_parsed", function(results) { //results will be empty because I set constructResult:false
          fs.unlink(filename, function(errRemove){
            if(err) {console.log("cant remove uploaded file: " + errRemove)};
            req.flash('info', 'Successfully started processing ' + linesFound + ' records in background');
            res.redirect('/upload');
          });
        });
        fs.createReadStream(filename).pipe(csvConverter);
      }
    });
  } else {
    res.status(400).send('You must be logged in to do that');
  }
};
