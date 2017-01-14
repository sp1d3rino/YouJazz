
'use strict';

angular.module('yeomanApp')
.controller('MainCtrl',['$scope','$rootScope','$http','$q','$cookies','$mdToast', function functionName($scope,$rootScope,$http,$q,$cookies,$mdToast) {
  $scope.formData = {};

  $scope.formData.numCol=0;
  $scope.formData.numRow=0;
  $scope.formData.tuneTitle='';
  $scope.formData.tuneAuthorName='';
  $scope.formData.comments='';
  $scope.selectedTune='';
  $scope.newTuneFlag=false;
  $scope.barClipboard=null;
  /** check if user already logged in */
  $rootScope.userSignedIn = $cookies.get('youjazz_user');
  $rootScope.basicAuth = $cookies.get('youjazz_basic_auth');

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


    //When insert a chord or symbols delete % before
    if ($scope.cellSelected.cellValue.indexOf('%') > -1){
      $scope.cellSelected.cellValue='';
    }
    $scope.selected = index;
    $scope.cellSelected.cellValue=$scope.cellSelected.cellValue.concat($scope.chords[index-1].chordName);
  };

  $scope.showToast1 = function(msg) {
    $mdToast.show(
      $mdToast.simple()
      .textContent(msg)
      .hideDelay(3000)
    );
  }



  /* symbols */
  $scope.symbols = [
    {'symbId':1,'symbName':'#','symbKey':'#'},
    {'symbId':2,'symbName':'b','symbKey':'l'},
    {'symbId':3,'symbName':'/','symbKey':'/'},
    {'symbId':4,'symbName':'°','symbKey':'°'},
    {'symbId':5,'symbName':'Ø','symbKey':'.'},
    {'symbId':6,'symbName':'∆','symbKey':'r'},
    {'symbId':7,'symbName':'maj','symbKey':'j'},
    {'symbId':8,'symbName':'m','symbKey':'m'},
    {'symbId':9,'symbName':'-','symbKey':'-'},
    {'symbId':10,'symbName':'+','symbKey':'+'},
    {'symbId':11,'symbName':'5','symbKey':'5'},
    {'symbId':12,'symbName':'6','symbKey':'6'},
    {'symbId':13,'symbName':'7','symbKey':'7'},
    {'symbId':14,'symbName':'9','symbKey':'9'},
    {'symbId':15,'symbName':'11','symbKey':'1'},
    {'symbId':16,'symbName':'13','symbKey':'3'},
    {'symbId':17,'symbName':'%','symbKey':'%'},
    {'symbId':18,'symbName':',','symbKey':','},
    {'symbId':19,'symbName':' ','symbKey':'s'},


  ];

  $scope.isFunctionKey= function(eventKey){
    var keyPressed = eventKey.originalEvent;
    if (keyPressed.key =="Backspace"){
        eventKey.preventDefault();
        var str=$scope.cellSelected.cellValue;
        str = str.substring(0, str.length - 1);
        $scope.cellSelected.cellValue =str;
       return true;
     }
     else   if (keyPressed.key =="c" && keyPressed.ctrlKey ){
       $scope.barClipboard=$scope.cellSelected.cellValue;
       return true;
     }

     else   if (keyPressed.key =="v" && keyPressed.ctrlKey ){
       if($scope.barClipboard != null && $scope.barClipboard.length>0)
        $scope.cellSelected.cellValue =$scope.barClipboard;
        return true;
     }

     return false;
  }




  $scope.cellKeyPressed = function(eventKey){
    var keyPressed = eventKey.originalEvent.key;
    if ($scope.isFunctionKey(eventKey))return;

    //check if key pressed is a chord
    angular.forEach($scope.chords, function(item){
      if(keyPressed.toUpperCase() == item.chordName)
        $scope.select(item.chordId);
    });
    //check if key pressed is a symbol
    angular.forEach($scope.symbols, function(item){
      if(keyPressed.toLowerCase() == item.symbKey)
        $scope.selectSymb(item.symbId);
    });


  }

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
    $scope.selectedTune=null;
    $scope.formData.tuneTitle=null;
    $scope.formData.tuneAuthorName=null;
    $scope.formData.comments=null;
    $scope.formData.numRow=null;
    $scope.formData.numCol=null;
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

  $scope.newTune = function(tTitle) {
    $scope.resetGrid();
    $scope.formData.tuneTitle=tTitle;
    $scope.newTuneFlag=true;
  }


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
      $scope.count = $scope.tunes.length;


      self.isDisabled    = false;

      self.tunes        = $scope.tunes;
      self.querySearch   = $scope.querySearch;
      self.selectedItemChange = $scope.selectedItemChange;
      self.searchTextChange   = $scope.searchTextChange;

      self.newState = $scope.newState;



      $scope.querySearch = function (query) {
        var results = query ? self.tunes.filter( $scope.createFilterFor(query) ) : self.tunes,
        deferred;

        return results;

      }

      $scope.searchTextChange= function(text) {
        //console.log('Text changed to ' + text);
      }

      $scope.selectedItemChange = function(item) {
        console.log("selected item change");
        if (typeof item !== "undefined") {
          console.log("selected item change");
          $scope.loadTune(item._id);
          $scope.searchText = '';
          $scope.selectedItem= undefined;
          document.getElementById("tuneTitleId").focus();
          $scope.formData.tuneTitle.focus();
          return item.tuneTitle;
        }

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

  //now get lastest tune
  $http.get('/api/tunes/'+ 'latest')
  .then(function(response) {
    if (response.status!='200'){
      alert("get Error!");
      throw new Error("Error during call to GET api");
    }else{
      $scope.formData= response.data;
      $scope.selectedTune =response.data._id;
      $scope.newTuneFlag=false;
//      console.log("latest tune "+JSON.stringify(response.data, null, 4));
    }

  });



  $scope.addOrUpdateTune = function(){
    if ($scope.newTuneFlag) $scope.createTune();
    else $scope.updateTune();
  }

  // when submitting the add form, send the text to the node API
  $scope.createTune = function() {
    $scope.formData.votes = 0;

    //post new tune and put tune list in the search box
    $http.defaults.headers.common['Authorization'] = 'Basic ' + $scope.basicAuth;
    $http.post('/api/tunes', $scope.formData)
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to POST api");
      }else{
        $scope.tunes = response.data;
        self.tunes=$scope.tunes;
        $scope.count = $scope.tunes.length;
        console.log("tune list "+ JSON.stringify(response.data, null, 4));
        $scope.showToast1($scope.formData.tuneTitle + " has been added!");
      }

    });

    //now get lastest tune of this user
    $http.get('/api/tunes/'+ 'mylatest')
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to GET api");
      }else{
        $scope.formData= response.data;
        $scope.selectedTune =response.data._id;
        $scope.newTuneFlag=false;
        console.log("latest tune "+JSON.stringify(response.data, null, 4));
      }

    });


  };


  $scope.updateTune = function(){
    console.log("update Tune "+$scope.selectedTune);
    $http.defaults.headers.common['Authorization'] = 'Basic ' + $scope.basicAuth;
    $http.put('/api/tunes/'+ $scope.selectedTune,$scope.formData)
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to POST api");
      }
      else{
        $scope.showToast1($scope.formData.tuneTitle + " updated!");
      }
    });

  }


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
        $scope.selectedTune = tuneId; //for delete and update;
        console.log(JSON.stringify(response.data, null, 4));
        $scope.newTuneFlag=false;
      }
    });
  };

  // delete a tune

  $scope.deleteTune = function() {
    console.log('selected tune id is:' + $scope.selectedTune);
    $http.defaults.headers.common['Authorization'] = 'Basic ' + $scope.basicAuth;
    $http.delete('/api/tunes/'+ $scope.selectedTune)
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to DELETE api");
      }else{


        self.tunes.forEach(function(result, index) {
          if(result['_id'] ===  $scope.selectedTune) {
            //Remove from array
            self.tunes.splice(index, 1);
          }
        });
        $scope.showToast1($scope.formData.tuneTitle +" has been removed!");
        $scope.count = self.tunes.length;
        $scope.resetGrid();

      }
    });
  };




}]);
