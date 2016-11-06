// Define routes
exports.index = function(req, res){
  res.render('index', { title: 'Index page of EDMS' });
};

exports.registration = function(req, res){
  res.render('registration', { title: 'New registration page' });
};

