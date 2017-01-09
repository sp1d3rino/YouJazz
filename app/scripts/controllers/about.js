'use strict';

/**
 * @ngdoc function
 * @name yeomanApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the yeomanApp
 */
angular.module('yeomanApp')
  .controller('AboutCtrl', ['$scope','$http', function functionName($scope,$http) {
    $scope.formData = {};
    $scope.selectedId={};

    // when landing on the page, get all todos and show them
    $http.get('/api/todos')
        .then(function(response) {
          if (response.status!='200'){
            alert("get Error!");
            throw new Error("Error during call to GET api");
          }
          else{
            $scope.todos = response.data;
            console.log(response.status);
          }

        });


    // when submitting the add form, send the text to the node API
    $scope.createTodo = function() {
        $http.post('/api/todos', $scope.formData)
            .then(function(response) {
              if (response.status!='200'){
                alert("get Error!");
                throw new Error("Error during call to POST api");
              }else{
                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.todos = response.data;
                console.log(JSON.stringify(response.data, null, 4));
              }
            });
    };


    // update
    $scope.updateTodo = function(id) {
      console.log("update start!!");
        $http.put('/api/todos/'+ id, $scope.formData)
            .then(function(response) {
              if (response.status!='200'){
                alert("get Error!");
                throw new Error("Error during call to PUT api");
              }else{

                $scope.formData = {}; // clear the form so our user is ready to enter another
                $scope.todos = response.data;
                console.log(JSON.stringify(response.data, null, 4));
              }
            });
    };


    // delete a todo after checking it
    $scope.deleteTodo = function(id) {
      console.log("delete start!!");
        $http.delete('/api/todos/' + id)
            .then(function(response) {
              if (response.status!='200'){
                alert("get Error!");
                throw new Error("Error during call to DELETE api");
              }else{
                $scope.todos = response.data;
                console.log(response.data);
              }
            });
    };













  }]);
