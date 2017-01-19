'use strict';

/**
* @ngdoc function
* @name yeomanApp.controller:SignupCtrl
* @description
* # SignupCtrl
* Controller of the yeomanApp
*/
angular.module('yeomanApp')
.controller('SignupCtrl', ['$rootScope','$scope','$http','$mdToast','$document','$location',function functionName($rootScope,$scope,$http, $mdToast, $document,$location) {

  $scope.error='';
  $scope.password='';
  $scope.password2='';
  $scope.selectedAvatar='';


  $scope.showToast1 = function(msg) {
    $mdToast.show(
      $mdToast.simple()
      .textContent(msg)
      .hideDelay(3000)
    );
  }

  $scope.showToast2 = function() {
    var toast = $mdToast.simple()
    .textContent('Now login and build your tune!')
    .action('Ok!')
    .highlightAction(false);
    $mdToast.show(toast).then(function(response) {
      if ( response == 'ok' ) {
        alert('You clicked \'OK\'.');
      }
    });
  }


  $scope.username = "" ;
  $scope.password = "" ;


  $scope.registerUser = function(){
    if ($scope.password.localeCompare($scope.password2)!=0){
      $scope.showToast1("Passwords don't match!");
      return;
    }


    var encodedString = 'username=' +
    encodeURIComponent($scope.username) +
    '&password=' +
    encodeURIComponent($scope.password)+
    '&avatar=' +
    encodeURIComponent($scope.selectedAvatar);
    $http({
      method:'POST',
      url: 'api/users',
      data: encodedString,
      headers: {'Content-Type' : 'application/x-www-form-urlencoded'}
    }).then (function successCallback(response){
      console.log('response status:' + JSON.stringify(response.status));
      $scope.showToast1('Well done! Now login and build your tune!');
      $location.url('login' );

    },
    function errorCallback(response) {
      console.log('error  response status:' +  JSON.stringify(response.status));
      $scope.showToast1('Sorry, the username already exists. Please, choose another one');

    }
  );
}; // end of registerUser
}]);
