// Load required packages
var Comment = require('../models/comment');
var Tune = require('../models/tune');
var User = require('../models/user');
var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('../property.ini');


var nodemailer = require("nodemailer"),
  transport = nodemailer.createTransport('SMTP', {
    debug: true, //this!!!
    service: 'Gmail',
    auth: {


        user: properties.get('mail.gmail.username'),
        pass: properties.get('mail.gmail.password')
    }
  });


exports.postComment = function(req, res) {
  // Create a new instance of the Beer model
  var comment = new Comment();

  comment.commentText = req.body.text;
  comment.username = req.user.username;
  comment.timestamp = new Date();
  comment.tuneId= req.body.tuneId;


  // Save the comment and check for errors
  comment.save(function(err) {
    if (err){
      res.send(err);
    }
    else {
      //      res.json(comment);
      var query = Tune.findOne({_id:req.body.tuneId});

      query.exec(function (err, tune) {
        if (err)
          res.send(err);
        else {
            console.log("il req.body.tuneId "+req.body.tuneId+" è di "+tune.grilleAuthorName);
          var query = User.findOne({username:tune.grilleAuthorName});
          query.exec(function (err, user) {
            if (err)
              res.send(err);
            else {
              if (req.body.text.length>50)
               var msg = req.body.text.substr(1, 50)+"...";
               else msg=req.body.text;
              transport.sendMail({
                  from: 'youjazzmail@gmail.com', // sender address
                  to: user.mail, // list of receivers
                  subject: 'YouJazz message', // Subject line
                  //html: "<b>Hello world ✔</b>", // html body
                  html: 'Hi '+user.username+',<br>Someone has dropped a message about your tune'+'<br><br>Message:<br>'+msg+'<br><br>Come back on www.fabapp.eu/youjazz' // plaintext body
              }, console.error);
                res.json(comment);

            }
          });


        }
      });


    }

  });
};


// Create endpoint /api/tunes for GET
exports.getComments = function(req, res) {


  console.log('get all Comments for tuneId '+req.params.tune_id);
  //retrive all tunes
  var query = Comment.find({tuneId: req.params.tune_id}).select('username timestamp commentText timestamp').sort({timestamp:-1});
  query.exec(function (err, comments) {
    if (err){
      res.send(err);

    }
    else {
      res.json(comments);
    }
  });
};
