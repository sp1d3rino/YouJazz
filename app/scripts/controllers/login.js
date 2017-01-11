'use strict';

/**
* @ngdoc function
* @name yeomanApp.controller:LoginCtrl
* @description
* # LoginCtrl
* Controller of the yeomanApp
*/
angular.module('yeomanApp')
.controller('LoginCtrl',['$scope','$rootScope','$http','$mdToast', '$base64',
function ($scope,$rootScope, $http, $mdToast, $base64) {
  $scope.formData={};
  $scope.formData.username='';
  $scope.formData.password='';


  $scope.showToast1 = function(msg) {
    $mdToast.show(
      $mdToast.simple()
      .textContent(msg)
      .hideDelay(3000)
    );
  }


  $scope.loginUser = function() {
    console.log("loginUser function start");
    var auth = $base64.encode(angular.lowercase($scope.formData.username)+':'+$scope.formData.password);
    $http.defaults.headers.common['Authorization'] = 'Basic ' + auth;
    $http.get('/api/users')
    .then (
      function successCallback(response){
        console.log('response status:' + JSON.stringify(response.status));
        $scope.showToast1('You have signed up successfully!');
        $rootScope.userSignedIn=$scope.formData.username;
      },
      function errorCallback(response) {
        console.log('error  response status:' +  JSON.stringify(response.status));
        $scope.showToast1('Log in failed! Please check username and password.');
        $rootScope.userSignedIn=null;
      }
    );
  }


}]);
