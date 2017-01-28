'use strict';

/**
* @ngdoc function
* @name yeomanApp.controller:SignupCtrl
* @description
* # SignupCtrl
* Controller of the yeomanApp
*/
angular.module('yeomanApp')
.controller('SignupCtrl', ['$rootScope','$scope','$http','$mdToast','$document','$location','$base64','$cookies',function functionName($rootScope,$scope,$http, $mdToast, $document,$location,$base64,$cookies) {

  $scope.error='';
  $scope.password='';
  $scope.password2='';
  $scope.selectedAvatar='';
  $scope.mail='';


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
    encodeURIComponent($scope.selectedAvatar)+
    '&mail=' +
    encodeURIComponent($scope.mail);
    $http({
      method:'POST',
      url: 'api/users',
      data: encodedString,
      headers: {'Content-Type' : 'application/x-www-form-urlencoded'}
    }).then (function successCallback(response){
      console.log('response status:' + JSON.stringify(response.status));
      //$scope.showToast1('Well done! Now login and build your tune!');
      $scope.loginUser();

    },
    function errorCallback(response) {
      console.log('error  response status:' +  JSON.stringify(response.status));
      $scope.showToast1('Sorry, the username already exists. Please, choose another one');

    }
  );

}; // end of registerUser


$scope.loginUser = function() {
  console.log("loginUser function start");
  var auth = $base64.encode(angular.lowercase($scope.username)+':'+$scope.password);
  $http.defaults.headers.common['Authorization'] = 'Basic ' + auth;
  $rootScope.basicAuth =auth;
  $http.get('/api/users/'+ $scope.username)
  .then (
    function successCallback(response){
      console.log('response status:' + JSON.stringify(response.status));
      var res = response.data[0];
      $rootScope.userSignedIn=$scope.username;
      $rootScope.avatar=res.avatar;
      var login_today = new Date();
      var login_expired = new Date(login_today);
      login_expired.setDate(login_today.getDate() + 1); //Set expired date to tomorrow
      $cookies.put('youjazz_user', $rootScope.userSignedIn, {expires : login_expired });
      $cookies.put('youjazz_basic_auth',  $rootScope.basicAuth, {expires : login_expired });

      $cookies.put('youjazz_user_avatar',res.avatar, {expires : login_expired });

      $location.url('/' );
    },
    function errorCallback(response) {
      console.log('error  response status:' +  JSON.stringify(response.status));
      $scope.showToast1('Error! Something went wrong... Retry registration again');
      $rootScope.userSignedIn=null;
    }
  );
}


}]);
