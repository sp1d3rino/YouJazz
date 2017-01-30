// Load required packages
var Comment = require('../models/comment');

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
      res.json(comment);
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
