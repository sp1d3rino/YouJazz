// Load required packages
var Todo = require('../models/todo');

// Create endpoint /api/beers for POSTS
exports.postTodos = function(req, res) {
  // Create a new instance of the Beer model
  var todo = new Todo();

  // Set the beer properties that came from the POST data
  todo.text = req.body.text;
  todo.title = req.body.title;
  todo.userId = req.user._id;

  // Save the beer and check for errors
  todo.save(function(err) {
    if (err)
      res.send(err);

    Todo.find(function(err, todos) {
        if (err)
            res.send(err)
          res.json(todos);
    });
  });
};

// Create endpoint /api/beers for GET
exports.getTodos = function(req, res) {
  // Use the Beer model to find all beer
  Todo.find(function(err, todos) {
    if (err)
      res.send(err);

    res.json(todos);
  });
};

// Create endpoint /api/beers/:beer_id for GET
exports.getTodo = function(req, res) {
  // Use the Beer model to find a specific beer
  Todo.find({userId: req.user._id, _id: req.params.todo_id}, function(err, todo) {
    if (err)
      res.send(err);

    res.json(todo);
  });
};

// Create endpoint /api/beers/:beer_id for PUT
exports.putTodo = function(req, res) {
  Todo.update({ userId: req.user._id, _id: req.params.todo_id }, { title: req.body.title,text:req.body.text  }, function(err, num, raw) {
      if (err)
        res.send(err);

        // get and return all the todos after you create another
      Todo.find(function(err, todos) {
              console.log("Calling find in update");
              if (err)
                  res.send(err)
                res.json(todos);
      });
    });
};

// Create endpoint /api/beers/:beer_id for DELETE
exports.deleteTodo = function(req, res) {
  // Use the Beer model to find a specific beer and remove it

  Todo.remove({ userId: req.user._id, _id: req.params.todo_id }, function(err) {
      if (err)
        res.send(err);

      Todo.find(function(err, todos) {
                  console.log("Calling find in delete");
                  if (err)
                      res.send(err)
                    res.json(todos);
      });
    });
};
