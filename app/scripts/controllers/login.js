'use strict';

/**
* @ngdoc function
* @name yeomanApp.controller:LoginCtrl
* @description
* # LoginCtrl
* Controller of the yeomanApp
*/
angular.module('yeomanApp')
.controller('LoginCtrl',['$scope','$rootScope','$http','$mdToast', '$base64','$cookies','$location',function ($scope,$rootScope, $http, $mdToast, $base64,$cookies,$location) {
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
    $rootScope.basicAuth =auth;
    $http.get('/api/users/'+ $scope.formData.username)
    .then (
      function successCallback(response){
        console.log('response status:' + JSON.stringify(response.status));
        var res = response.data[0];
        $rootScope.userSignedIn=$scope.formData.username;
        $rootScope.avatar=res.avatar;
        var login_today = new Date();
        var login_expired = new Date(login_today);
        login_expired.setDate(login_today.getDate() + 10); //Set expired date in 10 days
        $cookies.put('youjazz_user', $rootScope.userSignedIn, {expires : login_expired });
        $cookies.put('youjazz_basic_auth',  $rootScope.basicAuth, {expires : login_expired });

        $cookies.put('youjazz_user_avatar',res.avatar, {expires : login_expired });

        $location.url('/' );
      },
      function errorCallback(response) {
        console.log('error  response status:' +  JSON.stringify(response.status));
        $scope.showToast1('Log in failed! Please check username and password.');
        $rootScope.userSignedIn=null;
      }
    );
  }



}]);
