
// public/core.js
var scotchTodo = angular.module('gruntApp',[]);



function mainController($scope, $http) {
    $scope.formData = {};
    $scope.selectedId={};

    // when landing on the page, get all todos and show them
    $http.get('/api/todos')
        .success(function(data) {
            $scope.todos = data;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });

    // when submitting the add form, send the text to the node API
    $scope.createTodo = function() {
        $http.post('/api/todos', $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.todos = data;
                console.log(JSON.stringify(data, null, 4));
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };


    // update
    $scope.updateTodo = function(id) {
      console.log("update start!!");
        $http.put('/api/todos/'+ id, $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.todos = data;
                console.log(JSON.stringify(data, null, 4));
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };


    // delete a todo after checking it
    $scope.deleteTodo = function(id) {
      console.log("delete start!!");
        $http.delete('/api/todos/' + id)
            .success(function(data) {
                $scope.todos = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

}
