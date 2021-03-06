// Load required packages
var Tune = require('../models/tune');
var TuneVote = require('../models/tunevote');


// Create endpoint /api/beers for POSTS
exports.postTunes = function(req, res) {
  // Create a new instance of the Beer model
  var tune = new Tune();

  tune.userId = req.user._id;
  tune.grilleAuthorName = req.user.username;
  tune.tuneTitle = req.body.tuneTitle;
  tune.tuneAuthorName= req.body.tuneAuthorName;
  tune.numRow= req.body.numRow;
  tune.timestamp=new Date();
  tune.grille = req.body.grille;
  tune.grille_intro = req.body.grille_intro;
  tune.grille_outro = req.body.grille_outro;
  tune.comments = req.body.comments;
  tune.votes = req.body.votes;
  tune.avatarSvg = req.body.avatarSvg;

  // Save the tune and check for errors
  tune.save(function(err) {
    if (err){
      res.send(err);
    }else{

      //retrive all tunes
      var query = Tune.find({}).select('tuneTitle grilleAuthorName avatarSvg');
      query.exec(function (err, tunes) {
        if (err)
        res.send(err);
        res.json(tunes);
        // create also a tunevote element
        var tunevote = new  TuneVote();

        tunevote.tuneId = tune._id;
        tunevote.votelist=[];

        tunevote.save(function(err){
          if (err)
          res.send(err);
        });
      });
    }
  });




};

// Create endpoint /api/tunes for GET
exports.getTunes = function(req, res) {
  console.log('get all Tunes');
  //retrive all tunes
  //Tune.find(function(err, tunes) {
  var query = Tune.find({}).select('tuneTitle grilleAuthorName avatarSvg votes').sort({tuneTitle:1});
  query.exec(function (err, tunes) {
    if (err)
    res.send(err);
    res.json(tunes);
  });
};


// Create endpoint /api/tunes/:tune_id for GET
exports.getTune = function(req, res) {
  console.log('get Tune ' +req.params.tune_id);
  // Use the Beer model to find a specific beer
  if (req.params.tune_id=='mylatest'){

    //        console.log("mylatest : "+req.user.username);
    Tune.findOne({}, {}, { sort: { 'timestamp' : -1 } }, function(err, tune) {
      if (err)
      res.send(err);

      console.log('get Tune Title ' +tune.tuneTitle);
      res.json(tune);
    });

  }else
  if (req.params.tune_id=='latest'){
    Tune.findOne({}, {}, { sort: { 'timestamp' : -1 } }, function(err, tune) {
      if (err)
      res.send(err);

      res.json(tune);
    });
  }else {
    Tune.findOne({_id: req.params.tune_id}, function(err, tune) {
      if (err)
      res.send(err);

      res.json(tune);

    });
  }
};



// Create endpoint /api/tunes/:tune_id for DELETE
exports.deleteTune = function(req, res) {
  // Use the Beer model to find a specific beer and remove it

  Tune.remove({ userId: req.user._id, _id: req.params.tune_id }, function(err) {
    if (err)
    res.send(err);
    else {
      //delete also TuneVote
      TuneVote.remove({ tuneId: req.params.tune_id}, function(err) {
        if (err)
        res.send(err);
      });

      //after delete, responds with all remaining tunes
      var query = Tune.find({}).select('tuneTitle grilleAuthorName avatarSvg');
      query.exec(function (err, tunes) {
        if (err)
        res.send(err);
        res.json(tunes);

      });
    }// else close
  }); //Tune remove close
};


// Create endpoint /api/tunes/:tune_id for PUT
exports.putTune= function(req, res) {
  console.log("putTune enter");
  Tune.findById(req.params.tune_id,function (err,tune){
    if (err)
    res.send(err);
    else{
      tune.tuneTitle = req.body.tuneTitle;
      tune.tuneAuthorName=req.body.tuneAuthorName;
      tune.comments=req.body.comments;
      tune.timestamp=new Date();
      tune.grille=req.body.grille;
      tune.grille_intro=req.body.grille_intro;
      tune.grille_outro=req.body.grille_outro;
      // save the bear
      tune.save(function(err) {
        if (err)
        res.send(err);

        res.json({ message: 'Tune updated!' });
      });
    }
  });
};
