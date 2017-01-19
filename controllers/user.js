// Load required packages
var User = require('../models/user');

// Create endpoint /api/users for POST
exports.postUsers = function(req, res) {
  console.log('called controllers.postUsers');

  //verify if the user already exists
  User.findOne({username: req.body.username}, function(err, user) {
    if (err)
      res.send(err);

    console.log('username chosen: '+user);
    if (user) { res.status(409), res.json({ message: 'user already exists!' }); }

      else{
        var user = new User({
          username: req.body.username,
          password: req.body.password,
          avatar: req.body.avatar
        });

        user.save(function(err) {
          if (err)
          res.send(err);

          res.json({ message: 'New todo maker added to the locker room!' });
        });

    } //clese else

  }); //close User.find
};



// Create endpoint /api/users for GET
exports.getUsers = function(req, res) {
  User.find(function(err, users) {
    if (err)
      res.send(err);

    res.json(users);
  });
};


// Create endpoint /api/users for GET
exports.getUser = function(req, res) {
  console.log('get User ' +req.params.username);
  User.find({username: req.params.username}, function(err, user) {
    if (err)
      res.send(err);

    res.json(user);
  });
};
