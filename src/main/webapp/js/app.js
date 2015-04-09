var API_ROOT = 'http://localhost';
var OSM_API_ROOT = 'http://api.openstreetmap.org';

var app = angular.module("app", ['xeditable', 'ngCookies', 'osm', 'mPager', 'mOverpass']);

app.config(['$httpProvider', function($httpProvider) {
	    $httpProvider.defaults.useXDomain = true;
	    delete $httpProvider.defaults.headers.common['X-Requested-With'];
	}
]);

var tableCtrl = app.controller('tableCtrl', ['$scope', '$http', '$cookies', 'osm', 'pager', 'overpass', 
function($scope, $http, $cookies, osm, pager, overpass) {
	
	var ISO639_1 = ['aa', 'ab', 'af', 'ak', 'sq', 'am', 'ar', 'an', 'hy', 'as', 'av', 'ae', 
	                'ay', 'az', 'ba', 'bm', 'eu', 'be', 'bn', 'bh', 'bi', 'bo', 'bs', 'br', 
	                'bg', 'my', 'ca', 'ch', 'ce', 'zh', 'cu', 'cv', 'kw', 'co', 'cr', 
	                'cy', 'cs', 'da', 'de', 'dv', 'nl', 'dz', 'el', 'en', 'eo', 'et',  
	                'ee', 'fo', 'fa', 'fj', 'fi', 'fr', 'fy', 'ff', 'ka', 'gd', 
	                'ga', 'gl', 'gv', 'gn', 'gu', 'ht', 'ha', 'he', 'hz', 'hi', 'ho', 
	                'hr', 'hu', 'ig', 'is', 'io', 'ii', 'iu', 'ie', 'ia', 'id', 'ik', 
	                'it', 'jv', 'ja', 'kl', 'kn', 'ks', 'kr', 'kk', 'km', 'ki', 
	                'rw', 'ky', 'kv', 'kg', 'ko', 'kj', 'ku', 'lo', 'la', 'lv', 'li', 'ln', 
	                'lt', 'lb', 'lu', 'lg', 'mk', 'mh', 'ml', 'mi', 'mr', 'ms', 'mg', 
	                'mt', 'mn', 'na', 'nv', 'nr', 'nd', 'ng', 'ne', 
	                'nn', 'nb', 'no', 'ny', 'oc', 'oj', 'or', 'om', 'os', 'pa', 'pi', 
	                'pl', 'pt', 'ps', 'qu', 'rm', 'ro', 'rn', 'ru', 'sg', 'sa', 'si', 
	                'sk', 'sl', 'se', 'sm', 'sn', 'sd', 'so', 'st', 'es', 'sc', 
	                'sr', 'ss', 'su', 'sw', 'sv', 'ty', 'ta', 'tt', 'te', 'tg', 'tl', 'th', 
	                'ti', 'to', 'tn', 'ts', 'tk', 'tr', 'tw', 'ug', 'uk', 'ur', 'uz', 
	                've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi', 'yo', 'za', 'zu'];
	
	var LCs = ISO639_1.concat(['sr-Latn, sr-Cyrl', 'zh_pinyin', 'ja_rm', 'ko_rm']);
	
	$scope.langOptions = LCs;
	
	function updatePage() {
		params = {
			'langs': $scope.langs,
			'type': $scope.type,
			'addr': $scope.address,
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
			$scope.updatePager();
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
	
	var tablePager = pager.bindPager({
		'exists': function() {
			return !!$scope.page;
		},
		'getTotal': function(){
			return $scope.page.all;
		},
		'getPageSize': function(){
			return $scope.page.to - $scope.page.from;
		},
		'getCurentPage': function(){
			return ($scope.page.from / this.getPageSize()) + 1;
		}		
	});
	
	$scope.updatePager = function() {
		$scope.srPages = tablePager.getPages();
	};
	
	$scope.map = L.map('map').setView([51.505, -0.09], 13);
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo($scope.map);
	
	$scope.langs = [];
	if($cookies.langs) {
		$scope.langs = $cookies.langs.split(','); 
	}
	
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
	
	$scope.addLang = function() {
		var l = $scope.langToAdd;
		if(l && $scope.langs.indexOf(l) < 0) {
			$scope.langs.push(l);
			$cookies.langs = $scope.langs.join();
		}
	};

	$scope.removeLang = function(lang) {
		if(lang) {
			var i = $scope.langs.indexOf(lang);
			if(i >= 0) {
				$scope.langs.splice(i, 1);
				$cookies.langs = $scope.langs.join();
			}
		}
	};
	
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
	
}]);
