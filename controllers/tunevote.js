// Load required packages
var TuneVote = require('../models/tunevote');
var Tune = require('../models/tune');


// Create endpoint /api/users for POST
exports.postVote = function(req, res) {
  console.log('called controllers.postVote');


  //get exist tunevote
  TuneVote.findOne({tuneId: req.body._id}, function(err, tunevote) {
    if (err)
    res.send(err);
    else{
      //find the user if already exists and remove last vote
      var idUser=null;
      var found=false;
      var denied=false;
      tunevote.votelist.forEach(function(entry){
        if(entry.username==req.user.username){
          //check if last vote is different from the current. Otherwise is not possibile vote twice
          if (entry.vote==req.body.vote)denied=true;
          found=true;
          if (!denied){
            entry.vote=req.body.vote;
            updateTune(req.body._id,req.body.vote);
          }
        }
      });
      if(!found && !denied){
        //add the first vote
        tunevote.votelist.push({username:req.user.username, vote:req.body.vote});
        updateTune(req.body._id,req.body.vote);
      }
      //save the tunevote
      if (!denied){
        tunevote.save(function (err) {
          if (!err)
            res.json({ message: 'Tune updated!' });
        });
      }else {
        res.json({ message: 'VOTE_DENIED' });
      }
    } //close first else

  });

  function updateTune(tuneId,vote){
    Tune.findById(tuneId,function (err,tune){
      console.log("update tune "+tuneId);
      if (err)
        res.send(err);
      else{
        tune.votes+=vote;

        // save the bear
        tune.save(function(err) {
          if (err)
            res.send(err);
        });
      }
    });
  }






};
