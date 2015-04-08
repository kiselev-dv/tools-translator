var API_ROOT = 'http://localhost';

var app = angular.module("app", ["xeditable", 'osm']);

app.config(['$httpProvider', function($httpProvider) {
	    $httpProvider.defaults.useXDomain = true;
	    delete $httpProvider.defaults.headers.common['X-Requested-With'];
	}
]);

var tableCtrl = app.controller('tableCtrl', ['$scope', '$http', 'osm', function($scope, $http, osm) {
	
	function updatePage() {
		params = {
			'langs': $scope.langs,
			'type': $scope.type,
			'country': $scope.country,
			'city': $scope.city,
			'name': $scope.name
		};
		
		if($scope.curentPage) {
			params['from'] = ($scope.curentPage.p - 1) * 20;
			params['to'] = $scope.curentPage.p * 20;
		}
		
		$http.get(API_ROOT + '/translator/api/page.json', {
			'params': params
		}).success(function(data){
			$scope.page = data;
			$scope.getSrPages();
			$scope.updateMap(data.rows[0]);
			$scope.saved = true;
		});
	};

	function updateMap(row) {
		var zoom = 13;
		if(row.type == 'admbnd') {
			zoom = 11;
		}
		if(row.type == 'plcpnt') {
			zoom = 14;
		}
		if(row.type == 'hghway') {
			zoom = 17;
		}
		
		$scope.map.setView([row.lat, row.lon], zoom);
	};
	
	$scope.map = L.map('map').setView([51.505, -0.09], 13);
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo($scope.map);
	
	$scope.langs = ['ru', 'sr', 'sr-Latn', 'sr-Cyrl'];
	
	$scope.saveRow = function(row, lang, val) {
		$scope.saved = false;
		row.updated = true;
		
		return true;
	};
	
	updatePage();

	function merge(){
		
		osm.merge($scope.page, function(merged) {
			if(!$scope.merged4Save) {
				$scope.merged4Save = {};
			} 
			
			angular.forEach(merged, function(obj) {
				$scope.merged4Save[obj.osmid] = obj;
			});
			
		});

	}
	
	$scope.$on('merge', merge);
	
	$scope.$on('save', function() {
		
		osm.doSave($scope, $scope.merged4Save, $scope.changesetComment, function(){
			var req = {
					method: 'PUT',
					url: API_ROOT + '/translator/api/page.json',
					headers: {
						'Content-Type': 'application/json'
					},
					data: $scope.page
			};
			
			$http(req).success(function(data){
				angular.forEach($scope.page.rows, function(r){
					r.updated = false;
				});
				
				$scope.merged4Save = null;
				
				$scope.$broadcast('saved');
			});
		});
		
	});
	
	$scope.goPage = function(page) {
		merge();
		$scope.curentPage = page;
		updatePage();
	}
	
	$scope.$on('changesetCreated', function(e, cntxt) {
		$scope.saveState = 'Changeset ' + cntxt.id + ' created.';
		$scope.$digest();
	});
	$scope.$on('changesetUploaded', function(e, cntxt) {
		$scope.saveState = 'Data uploaded.';
		$scope.$digest();
	});
	$scope.$on('changesetClosed', function(e, cntxt) {
		$scope.saveState = 'Changeset ' + cntxt.id + ' saved.';
		$scope.savedChangesetId = cntxt.id;
		$scope.$digest();
	});
	
	$scope.$on('saved', function() {
		console.log('data was saved');
		$scope.clear();
	});

	$scope.authentificate = function() {
		osm.getLogin(function(error, user){
			if(user) {
				$scope.osmLogin = user;
				$scope.$digest();
			}
		});
	};
	
	if(osm.isAuthentificated()) {
		$scope.authentificate();
	}

	$scope.logout = function() {
		osm.logout();
		$scope.osmLogin = null;
		$scope.$digest();
	}
	
	$scope.clear = function(){
		$scope.saved = true;
		$scope.uploaded = null;
		$scope.merged4Save = null;
		$scope.changesetComment = null;
	};
	
	$scope.updatePage = updatePage;
	
	$scope.updateMap = updateMap;
	
	$scope.countChanges = function() {
		if(!$scope.merged4Save) {
			return 0;
		}
		return Object.keys($scope.merged4Save).length;
	};
	
	$scope.getSrPages = function() {
		
		var r = {};
		
		if($scope.page) {
			
			var total = $scope.page.all;
			var pageSize = $scope.page.to - $scope.page.from;
			var page = ($scope.page.from / pageSize) + 1;
			var maxPage = parseInt(total/pageSize);
			if(total % pageSize == 0) {
				maxPage += 1;
			}
			
			for(var i = 1; i <= maxPage && i <= 8; i++){
				r[i] = {
						'p':i,
						'active':page == i
				};
			}
			
			for(var i = page - 3; i <= page + 3; i++){
				if(i > 0 && i <= maxPage) {
					r[i] = {
							'p':i,
							'active':page == i
					};
				}
			}
			
			for(var i = maxPage - 3; i <= maxPage; i++){
				if(i > 0) {
					r[i] = {
							'p':i,
							'active':page == i
					};
				}
			}
		}
		var rarr = [];
		angular.forEach(r, function(v){
			rarr.push(v);
		});
		
		rarr.sort(function (a, b) { return a.p - b.p; });
		
		for(var i = 0; i < rarr.length; i++) {
			var ci = rarr[i].p;
			var ni = rarr[i + 1] == null ? null : rarr[i + 1].p;
			
			if(ni && (ni - ci > 1)) {
				rarr[i].spaceRight = true;
				rarr[i + 1].spaceLeft = true;
			}
		}
		
		$scope.srPages = rarr;
	}
	
}]);
