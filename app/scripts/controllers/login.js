'use strict';

/**
 * @ngdoc function
 * @name yeomanApp.controller:LoginCtrl
 * @description
 * # LoginCtrl
 * Controller of the yeomanApp
 */
angular.module('yeomanApp')
  .controller('LoginCtrl',['$scope','$http', '$base64',
    function ($scope, $http, $base64) {
      $scope.formData={};
      $scope.formData.username='';
      $scope.formData.password='';

      $scope.loginUser = function() {
			console.log("loginUser function start");
            var auth = $base64.encode('fab:ras');
            $http.defaults.headers.common['Authorization'] = 'Basic ' + auth;
            $http.get('/api/users').then(function (response) {
                  console.log(response.data);
                  //handle data
            });
      }
    }]);
