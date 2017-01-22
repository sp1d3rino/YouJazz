// Load required packages
var TuneVote = require('../models/tunevote');


// Create endpoint /api/users for POST
exports.postVote = function(req, res) {
  console.log('called controllers.postVote');

  //verify if the user already exists
  TuneVote.findOne({tuneId: req.params.tune_id}, function(err, user) {
    if (err)
      res.send(err);
    else{
        console.log("add new vote for "+ req.params.tune_id);
    } //clese else

  }); //close User.find
};
