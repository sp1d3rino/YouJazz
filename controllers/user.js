// Load required packages
var User = require('../models/user');
var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('property.ini');

var nodemailer = require("nodemailer"),
  transport = nodemailer.createTransport('SMTP', {
    debug: true, //this!!!
    service: 'Gmail',
    auth: {
      user: properties.get('mail.gmail.username'),
      pass: properties.get('mail.gmail.password')
    }
  });

// Create endpoint /api/users for POST
exports.postUsers = function(req, res) {
  console.log('called controllers.postUsers');

  //verify if the user already exists
  User.findOne({username: req.body.username}, function(err, user) {
    if (err)
      res.send(err);

    if (user) { res.status(409), res.json({ message: 'user already exists!' }); }

      else{
        var user = new User({
          username: req.body.username.toLowerCase(),
          password: req.body.password,
          avatar: req.body.avatar,
          mail: req.body.mail
        });

        user.save(function(err) {
          if (err)
          res.send(err);

          res.json({ message: 'New todo maker added to the locker room!' });

          //send mail to the new user
          transport.sendMail({
              from: 'youjazzmail@gmail.com', // sender address
              to: user.mail, // list of receivers
              subject: 'Welcome on YouJazz!', // Subject line
              //html: "<b>Hello world ✔</b>", // html body
              html: 'Hi '+user.username+',<br>welcome on YouJazz.ml! Here you can found many jazz grids or build your own grid!'+'<br><br>Your login is:'+user.username+' and password: '+req.body.password+"<br>Do not reply to this email address."+'<br><br>Enjoy the jazz music!' // plaintext body
          }, console.error);

          //send mail to me
          transport.sendMail({
              from: 'youjazzmail@gmail.com', // sender address
              to: 'fabrizio.rastiello@gmail.com', // list of receivers
              subject: 'Welcome on YouJazz!', // Subject line
              //html: "<b>Hello world ✔</b>", // html body
              html: 'Hey '+user.username+', has subscribed to YouJazz' // plaintext body
          }, console.error);



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
  console.log('get User ' +req.params.username.toLowerCase());
  User.find({username: req.params.username.toLowerCase()}, function(err, user) {
    if (err)
      res.send(err);

    res.json(user);
  });
};
