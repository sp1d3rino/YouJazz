
'use strict';

angular.module('yeomanApp')
.controller('MainCtrl',['$scope','$rootScope','$http','$q','$cookies','$mdToast','$window','$mdDialog', function functionName($scope,$rootScope,$http,$q,$cookies,$mdToast,$window,$mdDialog) {


  var originatorEv;
  $scope.formData = {};

  $scope.formData.numCol=0;
  $scope.formData.numRow=0;
  $scope.formData.tuneTitle='';
  $scope.formData.tuneAuthorName='';
  $scope.formData.comments='';
  $scope.formData.avatarSvg='';
  $scope.formData.vote=0;

  $scope.selectedTune='';
  $scope.newTuneFlag=false;
  $scope.barClipboard=null;
  $scope.currentGridType=null;

  /** check if user already logged in and load its data*/
  $rootScope.userSignedIn = $cookies.get('youjazz_user');
  $rootScope.basicAuth = $cookies.get('youjazz_basic_auth');
  $rootScope.avatar = $cookies.get('youjazz_user_avatar');

  angular.forEach($rootScope.avatars, function(item){
    if(item.avatarId==$rootScope.avatar){
      $rootScope.avatarSvg = item.svgImage;

    };
  });


  $scope.isPrintButtonDisabled = function() {
    if ($scope.formData._id==undefined
      || $scope.formData.tuneTitle==null || $scope.formData.tuneTitle=='' || $scope.formData.tuneTitle==undefined
      || $scope.userSignedIn==undefined || $scope.userSignedIn==null
      || ( $scope.formData.grille.length==0 && $scope.formData.grille_intro.length==0 && $scope.formData.grille_outro.length==0 )
    )
    return true;
    else return false;
  };

  $scope.isDeleteButtonDisabled = function() {
    if (
      $scope.formData._id===undefined
      || $scope.formData.tuneTitle==null || $scope.formData.tuneTitle=='' || $scope.formData.tuneTitle==undefined
      || $scope.userSignedIn==undefined || $scope.userSignedIn===null
      || ( $scope.formData.grilleAuthorName!==null && $scope.formData.grilleAuthorName!==undefined  && $scope.userSignedIn!==$scope.formData.grilleAuthorName)
    )
    return true;
    else return false;
  };

  $scope.isSaveButtonDisabled = function(event) {
    if (
      //$scope.formData._id==undefined
      ( $scope.newTuneFlag!==true && $scope.userSignedIn!==$scope.formData.grilleAuthorName)
      || $scope.formData.tuneTitle==null || $scope.formData.tuneTitle=='' || $scope.formData.tuneTitle==undefined
      || $scope.userSignedIn==undefined || $scope.userSignedIn===null
      || ( $scope.formData.grilleAuthorName!==null && $scope.formData.grilleAuthorName!==undefined  && $scope.userSignedIn!==$scope.formData.grilleAuthorName)
    )
    return true;
    else return false;

  };

  $scope.isBuildGridButtonDisabled = function() {
    if (
      $scope.formData.tuneTitle==null || $scope.formData.tuneTitle=='' || $scope.formData.tuneTitle==undefined
      || $scope.userSignedIn==undefined || $scope.userSignedIn===null
      || ( $scope.formData.grilleAuthorName!==null && $scope.formData.grilleAuthorName!==undefined  && $scope.userSignedIn!==$scope.formData.grilleAuthorName)
    )
    return true;
    else return false;
  };



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


  $scope.contains =function(a, obj) {
    var r = a.length;
    while (r--) {
      var c = a[r].length;
      while(c--)
      if (a[r][c] === obj) {
        return true;
      }
    }
    return false;
  }


  $scope.isFunctionKey= function(eventKey){
    // to determine which is the current used grid
    var currentGrid=null;
    var prova=$scope.contains($scope.formData.grille,$scope.cellSelected);
    console.log(prova);
    if ($scope.contains($scope.formData.grille,$scope.cellSelected))currentGrid=$scope.formData.grille;
    else if ($scope.contains($scope.formData.grille_intro,$scope.cellSelected))currentGrid=$scope.formData.grille_intro;
    else if ($scope.contains($scope.formData.grille_outro,$scope.cellSelected))currentGrid=$scope.formData.grille_outro;
    var rId = $scope.cellSelected.cellId[0];
    var cId = $scope.cellSelected.cellId[1];

    var keyPressed = eventKey.originalEvent;
    if (keyPressed.key =="Backspace"){
      eventKey.preventDefault();
      var str=$scope.cellSelected.cellValue;
      str = str.substring(0, str.length - 1);
      $scope.cellSelected.cellValue =str;
      return true;
    }
    // ctrl-c
    else   if (keyPressed.key =="c" && keyPressed.ctrlKey ){
      $scope.barClipboard=$scope.cellSelected.cellValue;
      return true;
    }
    // ctrl-v
    else   if (keyPressed.key =="v" && keyPressed.ctrlKey ){
      if($scope.barClipboard != null && $scope.barClipboard.length>0)
      $scope.cellSelected.cellValue =$scope.barClipboard;
      return true;
    }
    // up
    else   if (keyPressed.key =="ArrowUp"  ){
      if (rId>0)
      rId--;
      $scope.cellSelected =currentGrid[rId][cId];
    }
    // down
    else   if (keyPressed.key =="ArrowDown" ){
      if (rId<currentGrid.length)
      rId++;
      $scope.cellSelected =currentGrid[rId][cId];
      return true;
    }
    // right
    else   if (keyPressed.key =="ArrowRight" ){
      if (cId<currentGrid[0].length-1)
      cId++;
      $scope.cellSelected =currentGrid[rId][cId];
      return true;
    }
    // left
    else   if (keyPressed.key =="ArrowLeft" ){
      if (cId>0)
      cId--;
      $scope.cellSelected =currentGrid[rId][cId];
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
    /*    $scope.formData.tuneTitle=null;
    $scope.formData.tuneAuthorName=null;
    $scope.formData.comments=null;
    $scope.formData.numRow=null;
    $scope.formData.numCol=null;*/
    $scope.formData._id=undefined;
    $scope.formData.grilleAuthorName=null;
    $scope.formData.grille=[];
    $scope.formData.grille_intro=[];
    $scope.formData.grille_outro=[];

  }


  $scope.createG = function(gridType) {
    if(gridType=='Intro'){
      $scope.createIntroGrid();
    }else if(gridType=='Chorus'){
      $scope.createGrid();
    }
    else if(gridType=='Outro'){
      $scope.createOutroGrid();
    }

  }

  /* jazz grid */
  $scope.createGrid = function() {
    if($scope.formData.numRow=='0' || $scope.formData.numCol=='0') {$scope.formData.grille=null;return;}

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

  /* jazz grid */
  $scope.createIntroGrid = function() {
    if($scope.formData.numRow=='0' || $scope.formData.numCol=='0') {$scope.formData.grille_intro=null;return;}

    console.log('createGrid Intro' +$scope.formData.numRow +'x'+$scope.formData.numCol);
    var rows=$scope.formData.numRow;
    var cols=$scope.formData.numCol;
    $scope.formData.grille_intro = new Array(rows);
    for (var i = 0; i < rows; i++) {
      $scope.formData.grille_intro[i] = new Array(cols);
    }
    for (var r = 0; r < rows;r++){
      for(var c = 0; c< cols;c++){

        $scope.formData.grille_intro[r][c] = {cellId:r.toString().concat(c.toString()),cellValue:'%'};
      }
    }
  };

  /* jazz grid */
  $scope.createOutroGrid = function() {
    if($scope.formData.numRow=='0' || $scope.formData.numCol=='0') {$scope.formData.grille_outro=null;return;}

    console.log('createGrid Outro ' +$scope.formData.numRow +'x'+$scope.formData.numCol);
    var rows=$scope.formData.numRow;
    var cols=$scope.formData.numCol;
    $scope.formData.grille_outro = new Array(rows);
    for (var i = 0; i < rows; i++) {
      $scope.formData.grille_outro[i] = new Array(cols);
    }
    for (var r = 0; r < rows;r++){
      for(var c = 0; c< cols;c++){

        $scope.formData.grille_outro[r][c] = {cellId:r.toString().concat(c.toString()),cellValue:'%'};
      }
    }
  };




  $scope.selectCell = function(cell) {
    console.log(cell);
    $scope.cellSelected =cell;

  };

  $scope.newTune = function(tTitle) {
    $scope.resetGrid();
    //if (tTitle.length>0) $scope.formData.tuneTitle=tTitle;
    $scope.newTuneFlag=true;
  }


  /***************** REST API calls ********************/


  $scope.voteThisTune = function (tuneId, updown){
    console.log(tuneId);
    $scope.formData.vote=updown;
    $http.defaults.headers.common['Authorization'] = 'Basic ' + $scope.basicAuth;
    $http.post('/api/tunevote', $scope.formData)
    .then(function(response) {
      if (response.status!='200'){
        alert("get Error!");
        throw new Error("Error during call to POST api");
      }else{

        if (response.data.message=="VOTE_DENIED") {
          $scope.showToast1("Already voted");
          return;
        }else{
          $scope.showToast1("This tune has been voted!");
          $scope.formData.votes+= updown;
        }
      }

    });
  }

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
          $scope.searchText = item.tuneTitle;
          //    $scope.selectedItem= undefined;
          //          document.getElementById("tuneTitleId").focus();
          //$scope.formData.tuneTitle.focus();
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


  $http.get('/api/tunes/'+ 'latest')
  .then(function(response) {
    if (response.status!='200'){
      alert("get Error!");
      throw new Error("Error during call to GET api");
    }else{
      if(response.data !=null){
        $scope.formData= response.data;
        $scope.selectedTune =response.data._id;
        $scope.newTuneFlag=false;
      }else $scope.newTuneFlag=true;
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
    $scope.formData.avatarSvg = $rootScope.avatarSvg;
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
        $scope.announceClick('Your tune "'+$scope.formData.tuneTitle+'" has been added!');
        //console.log("tune list "+ JSON.stringify(response.data, null, 4));
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
        //console.log("latest tune "+JSON.stringify(response.data, null, 4));
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
        //console.log(JSON.stringify(response.data, null, 4));
        $scope.newTuneFlag=false;
      }
    });
  };

  // delete a tune

  $scope.deleteTune = function($event) {
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
        $scope.formData.tuneTitle=null;
        $scope.formData.tuneAuthorName=null;

      }
    });
  };


  $scope.printIt = function(){
    var printableGrid = document.getElementById('printableGrid');
    printableGrid.setAttribute("style","table tr td{border: solid 1px;}");
    var myWindow = $window.open('', '', 'width=800, height=600');
    myWindow.document.write('<html><head><title>YouJazz</title><link rel="stylesheet" type="text/css" href="styles/main.css"></head><body>');
    myWindow.document.write(printableGrid.innerHTML);
    myWindow.document.write('</body>');
    myWindow.document.write('</html>');

    myWindow.print();
  };


  $scope.announceClick = function(msg) {
    $mdDialog.show(
      $mdDialog.alert()
      .title('YouJazz')
      .textContent(msg)
      .ok('Ok!')
      .targetEvent(originatorEv)
    );
    originatorEv = null;
  };


  $scope.showDeleteConfirm = function(ev,msg) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
    .title(msg)
    .textContent('This tune will be removed!')
    .ariaLabel('Lucky day')
    .targetEvent(ev)
    .ok('Delete it!')
    .cancel('Nevermind');

    $mdDialog.show(confirm).then(function() {
      $scope.deleteTune();
    }, function() {
      return false;
    });
  };



  $scope.createPrompt1 = function(ev,tuneTitle) {
    // Appending dialog to document.body to cover sidenav in docs app

    var confirm = $mdDialog.prompt()
    .title('Tune name')
    .textContent('What is the name of the new tune?')
    .placeholder('Tune name')
    .ariaLabel('Tune name')
    .initialValue(tuneTitle)
    .targetEvent(ev)
    .ok('Next')
    .cancel('Nevermind');

    $mdDialog.show(confirm).then(function(result) {
      $scope.formData.tuneTitle=result;
      $scope.createPrompt2(ev,tuneTitle);
    }, function() {
      $scope.newTuneFlag=false;
      $scope.formData.tuneTitle='';
    });

  };

  $scope.createPrompt2 = function(ev,tuneTitle) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.prompt()
    .title('Author name')
    .textContent('What is the name of the composer?')
    .placeholder('Author name')
    .ariaLabel('Author name')
    .initialValue('')
    .targetEvent(ev)
    .ok('Next')
    .cancel('Nevermind');

    $mdDialog.show(confirm).then(function(result) {
      $scope.formData.tuneAuthorName=result;
      $scope.newTune(tuneTitle);
    }, function() {
      $scope.newTuneFlag=false;
      $scope.formData.tuneTitle='';
      $scope.formData.tuneAuthorName='';
    });
  };



  $scope.showBuildGridDialog = function($event) {
    var parentEl = angular.element(document.body);
    $mdDialog.show({
      parent: parentEl,
      scope: $scope.$new(),
      targetEvent: $event,
      template:
      '<md-dialog aria-label="List dialog">' +
      '  <md-dialog-content>'+
      '  <h5 class="md-inform" style="padding:10px 10px;">Choose the grid type and size</h5>'+
      '   <div layout="row" style="justify-content: center; padding-top:10px; padding-left:20px;padding-right:20px" layout-sm="column">'+
      '      <md-radio-group layout="row"  ng-model="currentGridType" ng-init="currentGridType=\'Chorus\'">'+
      '          <md-radio-button value="Intro" class="md-primary">Intro</md-radio-button>'+
      '          <md-radio-button value="Chorus" class="md-primary"> Chorus </md-radio-button>'+
      '          <md-radio-button value="Outro" class="md-primary" >Outro</md-radio-button>'+
      '      </md-radio-group>'+
      '   </div>'+
      '  <div layout="row">'+
      '   <md-slider-container layout="row" flex>'+
      '    <input type="number" ng-init="formData.numRow=0"  placeholder="row" min="0" max="10" style="width:60px; border:none; padding-right:10px;" ng-model="formData.numRow" aria-label="volume" aria-controls="volume-slider">'+
      '    <md-slider ng-model="formData.numRow" min="0" max="10" aria-label="volume" id="volume-slider" class="md-accent" style="padding-right:20px;" md-horizontal md-range></md-slider>'+
      '   </md-slider-container>'+
      '  </div>'+
      '  <div layout="row">'+
      '   <md-slider-container layout="row" flex>'+
      '    <input type="number"  ng-init="formData.numCol=0" placeholder="col" min="0" max="10" style="width:60px; border:none; padding-right:10px;" ng-model="formData.numCol" aria-label="volume" aria-controls="volume-slider">'+
      '    <md-slider ng-model="formData.numCol" min="0" max="10" aria-label="volume" id="volume-slider" class="md-accent" style="padding-right:20px;" md-horizontal md-range></md-slider>'+
      '   </md-slider-container>'+
      '  </div>'+
      '  </md-dialog-content>' +
      '  <md-dialog-actions>' +
      '    <md-button ng-click="closeDialog()" class="md-primary">' +
      '      Nervermind' +
      '    </md-button>' +
      '    <md-button ng-click="buildGrid()" class="md-primary">' +
      '      Create!' +
      '    </md-button>' +
      '  </md-dialog-actions>' +
      '</md-dialog>',
      locals: {
        items: $scope.items
      },
      controller: DialogController
    });
    function DialogController($scope, $mdDialog, items) {
      $scope.items = items;
      $scope.closeDialog = function() {
        $mdDialog.hide();
      }
      $scope.buildGrid = function() {

        switch($scope.currentGridType){
          case "Intro":
          $scope.createIntroGrid();
          break;
          case "Outro":
          $scope.createOutroGrid();
          break;
          case "Chorus":
          $scope.createGrid();
          break;
          default:
          $scope.createGrid();

        }

        $mdDialog.hide();

      }

    }

  }


}]);
