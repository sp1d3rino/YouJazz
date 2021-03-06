'use strict';

/**
 * @ngdoc overview
 * @name yeomanApp
 * @description
 * # yeomanApp
 *
 * Main module of the application.
 */
angular
  .module('yeomanApp', [
    'base64',
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngMaterial',
    'ngCookies',
    'angular-cookie-law',
    'ngYoutubeEmbed'


  ]).config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl',
        controllerAs: 'about'
      })
      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl',
        controllerAs: 'login'
      })
      .when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl',
        controllerAs: 'signup'
      })
      .otherwise({
        redirectTo: '/'
      });



  }).controller('IndexController',['$scope','$rootScope','$cookies','$location',function ($scope,$rootScope, $cookies,$location) {

      $rootScope.avatars = [
        {avatarId:'guitar', svgImage:'images/svg/guitar1.svg'},
        {avatarId:'piano', svgImage:'images/svg/piano.svg'},
        {avatarId:'drum', svgImage:'images/svg/drum.svg'},
        {avatarId:'dbass', svgImage:'images/svg/dbass.svg'},
        {avatarId:'trumpet', svgImage:'images/svg/trumpet.svg'},
        {avatarId:'violin', svgImage:'images/svg/violin.svg'},
        {avatarId:'sax', svgImage:'images/svg/sax.svg'},
        {avatarId:'jguitar', svgImage:'images/svg/jguitar.svg'}
      ];

    $scope.logout = function(){
      $cookies.remove('youjazz_user');
      $cookies.remove('youjazz_basic_auth');
      $cookies.remove('youjazz_user_avatar');

      $rootScope.userSignedIn=null;
      $rootScope.basicAuth=null;
      $rootScope.avatar=null;



    };

  /** check if user already logged in and load its data*/
  $rootScope.userSignedIn = $cookies.get('youjazz_user');
  $rootScope.basicAuth = $cookies.get('youjazz_basic_auth');
  $rootScope.avatar = $cookies.get('youjazz_user_avatar');

  if ($rootScope.userSignedIn ==undefined){
  $location.url('/' );
}



  }]);
