var mPager = angular.module("mPager", []);

mPager.factory('pager', [function() {
	
	function getPages(adapter, begin, end, middle) {
		
		var r = {};
		
		if(adapter && adapter.exists()) {
			
			var total = parseInt(adapter.getTotal());
			var pageSize = parseInt(adapter.getPageSize());
			var page = parseInt(adapter.getCurentPage());
			var maxPage = parseInt(adapter.getTotal() / adapter.getPageSize()) + 1;
			
			if(total % pageSize == 0) {
				maxPage += 1;
			}
			
			for(var i = 1; i <= maxPage && i <= begin; i++){
				r[i] = {
						'p':i,
						'active':page == i
				};
			}
			
			for(var i = page - middle; i <= page + middle; i++){
				if(i > 0 && i <= maxPage) {
					r[i] = {
							'p':i,
							'active':page == i
					};
				}
			}
			
			for(var i = maxPage - end; i <= maxPage; i++){
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
		
		return rarr;
	}
	
	var service = {
		'bindPager': function(adapter, settings) {
			var s = settings || {}
			return {
				'getPages': function(){
					return getPages(adapter, s.begin || 3, s.end || 3, s.middle || 3);
				}
			}
		}	
	};
	
	return service;
	
}]);