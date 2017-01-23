// Load required packages
var TuneVote = require('../models/tunevote');


// Create endpoint /api/users for POST
exports.postVote = function(req, res) {
  console.log('called controllers.postVote');


  //get exist tunevote
  TuneVote.findOne({tuneId: req.body._id}, function(err, tunevote) {
    if (err)
    res.send(err);
    else{
      console.log("add new vote for "+ req.params.tune_id);
      console.log("tunevote id "+tunevote.tuneId);

      //find the user if already exists and remove last vote
      var idUser=null;
      var found=false;
      tunevote.votelist.forEach(function(entry){
        if(entry.username==req.user.username){
          entry.vote =req.body.vote;
          found=true;
        }
      });
      if(!found){
        //add the new vote
        tunevote.votelist.push({username:req.user.username, vote:req.body.vote});
      }
      //save the tunevote
      tunevote.save(function (err) {
        if (!err) console.log('Success!');
      });
    } //clese else

  });
};
