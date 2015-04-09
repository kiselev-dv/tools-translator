var osm = angular.module("osm", []);

osm.factory('osm', ['$http', function($http) {
	
	var parseXml;

	if (typeof window.DOMParser != "undefined") {
	    parseXml = function(xmlStr) {
	        return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
	    };
	} else if (typeof window.ActiveXObject != "undefined" &&
	       new window.ActiveXObject("Microsoft.XMLDOM")) {
	    parseXml = function(xmlStr) {
	        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
	        xmlDoc.async = "false";
	        xmlDoc.loadXML(xmlStr);
	        return xmlDoc;
	    };
	} else {
	    throw new Error("No XML parser found");
	}
	
	var auth = osmAuth({
	    oauth_consumer_key: 'VIikYcSgchLNVAQtXortzzPM4sqtQMUAOjuSxpew',
	    oauth_secret: 'EoeFK8zQDpgfrXNl2RXv8chEKHCEbAQlSYoftM5L',
	    auto: true
	});
	
	var service = {
		'merge': function(page, doneCallback) {
			
			scope = {};
			
			scope['mergedCallback'] = function(merged, mergedScope){
				if(doneCallback) {
					doneCallback(merged);
				}
			};
			
			scope['merged'] = [];
			this.loadData(page, scope);
		}
		
		,'loadData': function(page, scope) {
			var byType = {
				'nodes': [],	
				'ways': [],	
				'relations': []	
			};
			
			scope['id2Obj'] = {};
			angular.forEach(page.rows, function(obj) {
				if(obj.updated) {
					var t = obj.id.substring(0, 1);
					if(t == 'n') {
						scope['id2Obj'][obj.id] = obj;
						byType['nodes'].push(obj.id.substring(1));
					}
					if(t == 'w') {
						scope['id2Obj'][obj.id] = obj;
						byType['ways'].push(obj.id.substring(1));
					}
					if(t == 'r') {
						scope['id2Obj'][obj.id] = obj;
						byType['relations'].push(obj.id.substring(1));
					}
				}
			});
			
			scope['idsByType'] = byType;
			scope['page'] = page;
			scope['waiters'] = [];
			scope['loaded'] = {};
			
			if(byType.nodes.length > 0) {
				scope['waiters'].push('nodes');
				this.sendTypeFetch('nodes', byType.nodes,
						function(data){service.apiCallback.apply(service, [data, 'nodes', scope]);});
			}

			if(byType.ways.length > 0) {
				scope['waiters'].push('ways');
				this.sendTypeFetch('ways', byType.ways,
						function(data){service.apiCallback.apply(service, [data, 'ways', scope]);});
			}
			
			if(byType.relations.length > 0) {
				scope['waiters'].push('relations');
				this.sendTypeFetch('relations', byType.relations,
						function(data){service.apiCallback.apply(service, [data, 'relations', scope]);});
			}
			
		}
		
		,'sendTypeFetch': function(type, ids, callback) {
			var params = {};
			params[type] = ids.join(',');
			
			$http.get(OSM_API_ROOT + '/api/0.6/' + type, {
				'params': params
			}).success(callback);
		}
		
		,'apiCallback': function(data, type, scope) {
			var doc = parseXml(data);
			var root = doc.documentElement;
			
			for(var i=0; i < root.childNodes.length; i++) {
				var objNode = root.childNodes[i];
				if('node' == objNode.nodeName) {
					scope['loaded']['n' + objNode.attributes['id'].nodeValue] = objNode;
				}
				if('way' == objNode.nodeName) {
					scope['loaded']['w' + objNode.attributes['id'].nodeValue] = objNode;
				}
				if('relation' == objNode.nodeName) {
					scope['loaded']['r' + objNode.attributes['id'].nodeValue] = objNode;
				}
			}
			
			var indx = scope['waiters'].indexOf(type);
			if(indx >= 0) {
				scope['waiters'].splice(indx, 1);
			}
			
			if(scope['waiters'].length == 0) {
				this.osmLoaded(scope);
			}
		}
		
		,'osmLoaded': function(scope) {
			angular.forEach(scope['loaded'], function(obj, key) {
				var myVersion = scope['id2Obj'][key];
				var merged = service.mergeNode(obj, myVersion, scope);
			});
			
			scope['mergedCallback'](scope['merged'], scope);
		}
		
		,'mergeNode': function(xmlNode, myVersion, scope) {
			var merged = {};
			
			merged.typeName = xmlNode.nodeName;
			merged.attrs = {};
			merged.tags = {};
			for(var i = 0; i < xmlNode.attributes.length; i++) {
				merged.attrs[xmlNode.attributes[i].nodeName] = xmlNode.attributes[i].nodeValue;
			}
			
			for(var i = 0; i < xmlNode.childNodes.length; i++) {
				var childNode = xmlNode.childNodes[i];
				
				if(childNode.nodeName == 'tag') {
					merged.tags[childNode.attributes['k'].nodeValue] = childNode.attributes['v'].nodeValue;
				}
				
				if(childNode.nodeName == 'nd') {
					if(merged['nodes'] == null) {
						merged['nodes'] = [];
					}
					
					merged['nodes'].push(childNode.attributes['ref'].nodeValue);
				}
				
				if(childNode.nodeName == 'member') {
					if(merged['members'] == null) {
						merged['members'] = [];
					}
					
					var member = {};
					member['type'] = childNode.attributes['type'].nodeValue;
					member['ref'] = childNode.attributes['ref'].nodeValue;
					member['role'] = childNode.attributes['role'].nodeValue;
					
					merged['members'].push(member);
				}
			}
			
			angular.forEach(myVersion.translations, function(name, lang) {
				if(name) {
					merged.tags['name:' + lang] = name;
				}
			});
			
			merged.osmid = myVersion.id;
			
			scope['merged'].push(merged);
		}
		
		,'encode4JOSM': function(merged) {
			var xml = '\n';
			//xml += '<?xml version="1.0" encoding="UTF-8"?>\n'; 
			xml += '<osm version="0.6" upload="true" generator="translator.osm.xml">\n';
			angular.forEach(merged, function(obj){
				xml += '	<' + obj.typeName + ' action="modify" ';
				
				angular.forEach(obj.attrs, function(attrV, attrN){
					xml += attrN + '="' + attrV + '" ';
				});
				xml += '>\n';
				angular.forEach(obj.tags, function(tagV, tagN){
					xml += '		<tag k="' + tagN + '" v="' + tagV + '"/>\n';
				});
				
				if(obj.typeName == 'way') {
					angular.forEach(obj.nodes, function(node){
						xml += '		<nd ref="' + node + '"/>\n';
					});
				}
				if(obj.typeName == 'relation') {
					angular.forEach(obj.members, function(mem){
						xml += '		<member type="' + mem.type + '" ref="' + mem.ref + '" role="' + mem.role + '" />\n';
					});
				}
				xml += '	</' + obj.typeName + '>\n';
			});
			xml += '</osm>';
			
			return xml;
		}
		
		,'encode4API': function(merged, changeset) {
			var xml = '\n';
			//xml += '<?xml version="1.0" encoding="UTF-8"?>\n'; 
			xml += '<osmChange version="0.6" generator="names.osm.me">\n';
			xml += '	<modify>\n';
			angular.forEach(merged, function(obj){
				xml += '	<' + obj.typeName + ' ';
				
				angular.forEach(obj.attrs, function(attrV, attrN) {
					if (attrN == 'id' || attrN == 'lon' || attrN == 'lat' || attrN == 'version') {
						xml += attrN + '="' + attrV + '" ';
					}
				});
				
				xml += 'changeset="' + changeset + '" ';
				xml += '>\n';
				
				angular.forEach(obj.tags, function(tagV, tagN){
					xml += '			<tag k="' + tagN + '" v="' + tagV + '"/>\n';
				});
				
				if(obj.typeName == 'way') {
					angular.forEach(obj.nodes, function(node){
						xml += '			<nd ref="' + node + '"/>\n';
					});
				}
				if(obj.typeName == 'relation') {
					angular.forEach(obj.members, function(mem){
						xml += '			<member type="' + mem.type + '" ref="' + mem.ref + '" role="' + mem.role + '" />\n';
					});
				}
				xml += '	</' + obj.typeName + '>\n';
			});
			xml += '	</modify>\n';
			xml += '</osmChange>';
			
			return xml;
		}
		
		,'upload2API': function(apiXML, changeset, callback) {
			
			auth.xhr({
				'method': 'POST',
				'path': '/api/0.6/changeset/' + changeset + '/upload',
				'content': apiXML,
				'options': {header: {'Content-Type': 'text/xml'}}
			}, 
			callback);
		}
		
		,'createChangeset': function(comment, callback) {
			
			var xml = '';
			xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
			xml += '<osm>\n';
			xml += '  <changeset>\n';
			xml += '    <tag k="created_by" v="names.osm.me"/>\n';
			xml += '    <tag k="comment" v="' + comment + '"/>\n';
			xml += '  </changeset>\n';
			xml += '</osm>';
			
			auth.xhr({
				'method': 'PUT',
				'path': '/api/0.6/changeset/create',
				'content': xml,
				'options': {header: {'Content-Type': 'text/xml'}}
			}, callback);
		}
		
		,'closeChangeset': function(changeset, callback) {
			auth.xhr({
				'method': 'PUT',
				'path': '/api/0.6/changeset/' + changeset + '/close'
			}, callback);
		}
		
		,'getLogin': function(callback){
			auth.xhr({
				'method': 'GET',
				'path': '/api/0.6/user/details'
			}, function(err, data) {
				if(data) {
					var root = data.documentElement;
					
					for(var i = 0; i < root.childNodes.length; i++) {
						if(root.childNodes[i].nodeName == 'user') {
							var username = root.childNodes[i].attributes['display_name'].nodeValue;
							callback(err, username);
							return;
						}
					}
				}
			});
		}
		
		,'logout': function() {
			auth.logout();
		}
		
		,'isAuthentificated': function() {
			return auth.authenticated();
		}
		
		,'doSave': function($scope, objects, comment, callback) {
			
			service.createChangeset(comment, function(error, changesetid){
				
				if(!changesetid) {
					$scope.$broadcast('error', {
						'stage': 'create-changeset',
						'api': 'osm',
						'error': error
					});
					return;
				}
				
				$scope.$broadcast('changesetCreated', {
					'id': changesetid
				});
				
				var xml = service.encode4API(objects, changesetid);
				service.upload2API(xml, changesetid, function(err, details) {
					
					$scope.$broadcast('changesetUploaded', {
						'id': changesetid
					});
					
					service.closeChangeset(changesetid, function(err, details){
						$scope.$broadcast('changesetClosed', {
							'id': changesetid
						});
						
						callback();
					});
					
				});
			});
		}
		
	};
	
	return service;
}]); 