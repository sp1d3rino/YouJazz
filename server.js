// server.js

    // set up ========================
    var express  = require('express');
    var app      = express();                               // create our app w/ express
    var mongoose = require('mongoose');                     // mongoose for mongodb
    var morgan = require('morgan');             // log requests to the console (express4)
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var methodOverride = require('method-override'); // simulate DELETE and PUT (express4)
    var userController = require('./controllers/user');
    var passport = require('passport');
    var authController = require('./controllers/auth');
    var tuneController = require('./controllers/tune');

    // configuration =================

    mongoose.connect('mongodb://localhost:27017/Todo');     // connect to mongoDB database on modulus.io

    app.use(express.static(__dirname + '/app'));                 // set the static files location /public/img will be /img for users
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());
    app.use('/bower_components',  express.static(__dirname + '/bower_components'));
    app.use(passport.initialize());




    // routes ======================================================================

    // Create our Express router
var router = express.Router();

// Create endpoint handlers for /users
router.route('/users')
  .post(userController.postUsers)
  .get(authController.isAuthenticated, userController.getUsers);

// Create endpoint handlers for /users
router.route('/users/:username')
    .get(authController.isAuthenticated, userController.getUser);


// Create endpoint handlers for /tunes
router.route('/tunes')
  .post(authController.isAuthenticated,tuneController.postTunes)
  .get(tuneController.getTunes);


router.route('/tunes/:tune_id')
  .get(tuneController.getTune)
  .delete(authController.isAuthenticated,tuneController.deleteTune)
  .put(authController.isAuthenticated,tuneController.putTune);



// Register all our routes with /api
app.use('/api', router);


        // application -------------------------------------------------------------
 app.get('*', function(req, res) {
     res.sendfile('./app/index.html'); // load the single view file (angular will handle the page changes on the front-end)
 });


 // listen (start app with node server.js) ======================================
 app.listen(8080);
 console.log("App listening on port 8080");
