// Load required packages
var Tune = require('../models/tune');

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
  tune.numCol= req.body.numCol;
  tune.grille = req.body.grille;
  tune.comments = req.body.comments;
  tune.votes = req.body.votes;


  // Save the tune and check for errors
  tune.save(function(err) {
    if (err)
    res.send(err);


    //retrive all tunes
    Tune.find(function(err, tunes) {
      if (err)
      res.send(err)
      res.json(tunes);
    });
  });
};

// Create endpoint /api/tunes for GET
exports.getTunes = function(req, res) {
  console.log('get all Tunes');
  //retrive all tunes
  //Tune.find(function(err, tunes) {
  var query = Tune.find({}).select('tuneTitle , grilleAuthorName');
  query.exec(function (err, tunes) {
    if (err)
    res.send(err);
    res.json(tunes);
  });
};


// Create endpoint /api/beers/:beer_id for GET
exports.getTune = function(req, res) {
  console.log('get Tune' +req.params.tune_id);
  // Use the Beer model to find a specific beer
  if (req.params.tune_id=='latest'){
    Tune.findOne({}, {}, { sort: { 'timestamp' : -1 } }, function(err, tune) {
      if (err)
      res.send(err);

      res.json(tune);
    });
  }else {
    Tune.find({_id: req.params.tune_id}, function(err, tune) {
      if (err)
      res.send(err);

      res.json(tune);

    });
  }
};
