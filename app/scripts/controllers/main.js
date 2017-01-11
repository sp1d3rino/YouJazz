
'use strict';

angular.module('yeomanApp')
.controller('MainCtrl',['$scope','$rootScope','$http','$q', function functionName($scope,$rootScope,$http,$q) {
  $scope.formData = {};

  $scope.formData.numCol=0;
  $scope.formData.numRow=0;
  $scope.formData.tuneTitle='';
  $scope.formData.tuneAuthorName='';
  $scope.formData.comments='';
  $scope.selectedTune='';
  $scope.user;

  /* chords */
  $scope.chords = [
    {'chordId':1,
    'chordName':'C'},
    {'chordId':2,
    'chordName':'D'},
    {'chordId':3,
    'chordName':'E'},
    {'chordId':4,
    'chordName':'F'},
    {'chordId':5,
    'chordName':'G'},
    {'chordId':6,
    'chordName':'A'},
    {'chordId':7,
    'chordName':'B'}
  ];

  $scope.selected = 0;
  $scope.symbSelected = 0;
  $scope.cellSelected =null;

  $scope.select= function(index) {
    console.log(index);
    //When insert a chord or symbols delete % before
    if ($scope.cellSelected.cellValue.indexOf('%') > -1){
      $scope.cellSelected.cellValue='';
    }
    $scope.selected = index;
    $scope.cellSelected.cellValue=$scope.cellSelected.cellValue.concat($scope.chords[index-1].chordName);
  };



  /* symbols */
  $scope.symbols = [
    {'symbId':1,'symbName':'#'},
    {'symbId':2,'symbName':'b'},
    {'symbId':3,'symbName':'/'},
    {'symbId':4,'symbName':'°'},
    {'symbId':5,'symbName':'Ø'},
    {'symbId':6,'symbName':'∆'},
    {'symbId':7,'symbName':'maj'},
    {'symbId':8,'symbName':'-'},
    {'symbId':9,'symbName':'+'},
    {'symbId':10,'symbName':'5'},
    {'symbId':11,'symbName':'6'},
    {'symbId':12,'symbName':'7'},
    {'symbId':13,'symbName':'9'},
    {'symbId':14,'symbName':'11'},
    {'symbId':15,'symbName':'13'},
    {'symbId':16,'symbName':'%'}

  ];



  $scope.selectSymb = function(index) {
    console.log(index);
    //When insert a chord or symbols delete % before
    if ($scope.cellSelected.cellValue.indexOf('%') > -1){
      $scope.cellSelected.cellValue='';
    }
    // when the symbol is % reset the cell
    if($scope.symbols[index-1].symbName.indexOf('%') > -1){
      $scope.cellSelected.cellValue='';
    }
    $scope.symbSelected = index;
    $scope.cellSelected.cellValue=$scope.cellSelected.cellValue.concat($scope.symbols[index-1].symbName);

  };

  $scope.finalChord={chordName:''};

  $scope.resetChord= function() {
    $scope.finalChord.chordName='';
  };
  $scope.isEmptyChord = function(){

    return (!$scope.finalChord || 0 === $scope.finalChord.length);
  };

  $scope.resetGrid = function(){
    window.alert("user"+$rootScope.userSignedIn+"user");

    console.log('resetGrid ');
    $scope.selectedTune='';
    $scope.formData.tuneTitle='';
    $scope.formData.tuneAuthorName='';
    $scope.formData.comments='';
    $scope.formData.grilleAuthorName=null;
    $scope.formData.grille=[];

  }
  /* jazz grid */
  $scope.createGrid = function() {
    console.log('createGrid ' +$scope.formData.numRow +'x'+$scope.formData.numCol);
    var rows=$scope.formData.numRow;
    var cols=$scope.formData.numCol;
    $scope.formData.grille = new Array(rows);
    for (var i = 0; i < rows; i++) {
      $scope.formData.grille[i] = new Array(cols);
    }
    for (var r = 0; r < rows;r++){
      for(var c = 0; c< cols;c++){

        $scope.formData.grille[r][c] = {cellId:r.toString().concat(c.toString()),cellValue:'%'};
      }
    }
  };

  $scope.selectCell = function(cell) {
    console.log(cell);
    $scope.cellSelected =cell;

  };




  /***************** REST API calls ********************/

  /* Load all tunes when the page opens */
  // when landing on the page, get all todos and show them
var self = this;
    $http.get('/api/tunes')
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to GET api");
      }
      else{
        console.log(response.status);
        //return response.data;
        $scope.tunes = response.data;


        self.simulateQuery = false;
        self.isDisabled    = false;

        self.tunes        = $scope.tunes;
        self.querySearch   = $scope.querySearch;
        self.selectedItemChange = $scope.selectedItemChange;
        self.searchTextChange   = $scope.searchTextChange;

        self.newState = $scope.newState;

        $scope.newState = function(state) {
          alert("Sorry! You'll need to create a Constitution for " + state + " first!");
        }

        // ******************************
        // Internal methods
        // ******************************

        /**
        * Search for states... use $timeout to simulate
        * remote dataservice call.
        */
        $scope.querySearch = function (query) {
          var results = query ? self.tunes.filter( $scope.createFilterFor(query) ) : self.tunes,
          deferred;
          if (self.simulateQuery) {
            deferred = $q.defer();
            //$timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
            return deferred.promise;
          } else {
            return results;
          }
        }

        $scope.searchTextChange= function(text) {
          //console.log('Text changed to ' + text);
        }

        $scope.selectedItemChange = function(item) {
          $scope.loadTune(item._id);
          return item.tuneTitle;
        }



        /**
        * Create filter function for a query string
        */
        $scope.createFilterFor = function(query) {
          var lowercaseQuery = angular.lowercase(query);
        //  console.log('lowercaseQuery '+lowercaseQuery);
          return function filterFn(tune) {
            return (angular.lowercase(tune.tuneTitle).indexOf(lowercaseQuery) === 0);
          };

        }


      }

    });






  // when submitting the add form, send the text to the node API
  $scope.createTune = function() {
    $scope.formData.votes = 0;
    //$scope.formData.grille=[{cellId:'00',cellValue:'sdd'},{cellId:'01',cellValue:'aaa'}];
    console.log('print grid '+ JSON.stringify($scope.formData.grille));

    if ($rootScope.isSignedin==false){
      window.alert ("Error authentication!!");
      return false;
    }

    $http.post('/api/tunes', $scope.formData)
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to POST api");
      }else{
        $scope.tuneData = {}; // clear the form so our user is ready to enter another
        $scope.tunes = response.data;
        console.log(JSON.stringify(response.data, null, 4));
      }
    });
  };


  //load a specific loadTune
  $scope.loadTune = function(tuneId) {
    console.log('selected tune id is:' + tuneId);
    $http.get('/api/tunes/'+ tuneId)
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to GET api");
      }else{
        $scope.formData= response.data[0];
        console.log(JSON.stringify(response.data, null, 4));
      }
    });
  };




/****************** start *************/







}]);
