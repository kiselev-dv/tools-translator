var API_ROOT = 'http://localhost';

var app = angular.module("app", ["xeditable", 'osm']);

app.config(['$httpProvider', function($httpProvider) {
	    $httpProvider.defaults.useXDomain = true;
	    delete $httpProvider.defaults.headers.common['X-Requested-With'];
	}
]);

var tableCtrl = app.controller('tableCtrl', ['$scope', '$http', 'osm', function($scope, $http, osm) {
	
	this.updatePage = function() {
		$http.get(API_ROOT + '/translator/api/page.json', {
			'params': {
				'langs': $scope.langs,
				'type': $scope.type,
				'country': $scope.country,
				'city': $scope.city,
				'name': $scope.name
			}
		}).success(function(data){
			$scope.page = data;
			$scope.getSrPages();
			$scope.updateMap(data.rows[0]);
			$scope.saved = true;
		});
	};

	this.updateMap = function(row) {
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
	
	$scope.overlay = false;
	
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
	
	this.updatePage();

	$scope.$on('merge', function(){
		
		//$scope.overlay = true;
		osm.merge($scope.page, function(merged) {
			if(!$scope.merged4Save) {
				$scope.merged4Save = {};
			} 
			
			angular.forEach(merged, function(obj) {
				$scope.merged4Save[obj.osmid] = obj;
			});
			
		});

	});
	
	$scope.$on('save', function() {
		osm.createChangeset($scope.changesetComment, function(changesetid){
			var xml = osm.encode4API($scope.merged4Save, changesetid);
			osm.upload2API(xml, changesetid, function(err, details) {
				
				osm.closeChangeset(changesetid);
				
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
	});
	
	$scope.$on('saved', function() {
		console.log('data was saved');
	});
	
	$scope.clear = function(){
		$scope.saved = true;
		$scope.uploaded = null;
		$scope.overlay = false;
		$scope.osmChangeXML = null;
	};
	
	$scope.updatePage = this.updatePage;
	
	$scope.updateMap = this.updateMap;
	
	$scope.authentificate = osm.authentificate;
	
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
			var page = $scope.page.from / pageSize;
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
			
			for(var i = page - 1; i <= page + 1; i++){
				if(i > 0 && i <= maxPage) {
					r[i] = {
							'p':i,
							'active':page == i
					};
				}
			}
			
			for(var i = maxPage - 2; i <= maxPage; i++){
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
		
		$scope.srPages = rarr;
	}
	
}]);
