'use strict';

/**
 * @ngdoc function
 * @name yeomanApp.controller:SignupCtrl
 * @description
 * # SignupCtrl
 * Controller of the yeomanApp
 */
angular.module('yeomanApp')
  .controller('SignupCtrl', ['$scope','$http','$mdToast','$document',function functionName($scope,$http, $mdToast, $document) {

    $scope.error='';
    $scope.password='';
    $scope.password2='';

    $scope.avatars = [
      {avatarId:'guitar', svgImage:'img/guitar.svg'},
      {avatarId:'guitar', svgImage:'img/piano.svg'},
      {avatarId:'guitar', svgImage:'img/drum.svg'},
      {avatarId:'guitar', svgImage:'img/dbass.svg'},
      {avatarId:'guitar', svgImage:'img/trumpet.svg'},
      {avatarId:'guitar', svgImage:'img/violin.svg'},
      {avatarId:'guitar', svgImage:'img/sax.svg'},
      {avatarId:'guitar', svgImage:'img/manouche.svg'}
    ];

    $scope.showToast1 = function(msg) {
                      $mdToast.show(
                         $mdToast.simple()
                            .textContent(msg)
                            .hideDelay(3000)
                      );
    }

    $scope.showToast2 = function() {
                      var toast = $mdToast.simple()
                         .textContent('Registration completed. Now you can create and modify your tunes')
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
                encodeURIComponent($scope.password);
        $http({
            method:'POST',
            url: 'api/users',
            data: encodedString,
            headers: {'Content-Type' : 'application/x-www-form-urlencoded'}
        }).then (function successCallback(response){
              console.log('response status:' + JSON.stringify(response.status));
              $scope.showToast1('You have signed up successfully!');

          },
          function errorCallback(response) {
            console.log('error  response status:' +  JSON.stringify(response.status));
            $scope.showToast1('Sorry, the username already exists. Please, choose another one');

          }
        );
    }; // end of registerUser
  }]);
