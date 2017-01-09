
'use strict';

angular.module('yeomanApp')
.controller('MainCtrl',['$scope','$http', function functionName($scope,$http) {
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
    {'symbId':5,'symbName':'∆'},
    {'symbId':6,'symbName':'-'},
    {'symbId':7,'symbName':'%'},
    {'symbId':8,'symbName':'6'},
    {'symbId':9,'symbName':'7'},
    {'symbId':10,'symbName':'9'},
    {'symbId':11,'symbName':'11'},
    {'symbId':12,'symbName':'13'},
    {'symbId':13,'symbName':'+'},
    {'symbId':14,'symbName':'maj'}
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
    console.log('resetGrid ');
    $scope.selectedTune='';
    $scope.formData.tuneTitle='';
    $scope.formData.tuneAuthorName='';
    $scope.formData.comments='';
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

/* Load all tunes and current username when the page opens */
// when landing on the page, get all todos and show them
  $http.get('/api/tunes')
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to GET api");
      }
      else{
        $scope.tunes = response.data;
        console.log(response.status);
      }

    });
/*    $http.get('/api/users/'+ $scope.formData.grilleAuthorName)
        .then(function(response) {
          if (response.status!='200'){
            alert("get Error!");
            throw new Error("Error during call to GET users/currentUsername api");
          }else{
            $scope.user= response.data;
            console.log(JSON.stringify(response.data, null, 4));
          }
        });
*/


  // when submitting the add form, send the text to the node API
  $scope.createTune = function() {
    $scope.formData.votes = 0;
    //$scope.formData.grille=[{cellId:'00',cellValue:'sdd'},{cellId:'01',cellValue:'aaa'}];
    console.log('print grid '+ JSON.stringify($scope.formData.grille));

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
  $scope.loadTune = function() {
    console.log('selected tune id is:' + $scope.selectedTune );
    $http.get('/api/tunes/'+ $scope.selectedTune)
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

}]);
