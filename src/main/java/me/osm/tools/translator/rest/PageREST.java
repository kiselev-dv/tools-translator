package me.osm.tools.translator.rest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import me.osm.tools.translator.ESNodeHodel;
import me.osm.tools.translator.model.Page;
import me.osm.tools.translator.model.PageBuilder;
import me.osm.tools.translator.model.Row;
import me.osm.tools.translator.model.RowBuilder;

import org.apache.commons.lang3.StringUtils;
import org.elasticsearch.action.bulk.BulkRequestBuilder;
import org.elasticsearch.action.search.SearchRequestBuilder;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.action.update.UpdateRequestBuilder;
import org.elasticsearch.client.Client;
import org.elasticsearch.index.query.BoolQueryBuilder;
import org.elasticsearch.index.query.FilterBuilders;
import org.elasticsearch.index.query.QueryBuilder;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.SearchHit;
import org.json.JSONArray;
import org.json.JSONObject;
import org.restexpress.Request;
import org.restexpress.Response;
import org.slf4j.LoggerFactory;

public class PageREST {
	
	public Page read(Request request, Response response) {
		try {
			
			int from = request.getHeader("from") == null ? 0 : Integer.parseInt(request.getHeader("from"));
			int to = request.getHeader("to") == null ? 20 : Integer.parseInt(request.getHeader("to"));
			
			String type = StringUtils.stripToNull(request.getHeader("type"));
			String country = StringUtils.stripToNull(request.getHeader("country"));
			String city = StringUtils.stripToNull(request.getHeader("city"));
			String name = StringUtils.stripToNull(request.getHeader("name"));
			
			List<String> langs = request.getHeaders("langs");
			
			Client client = ESNodeHodel.getClient();
			
			QueryBuilder query = QueryBuilders.matchAllQuery();
			
			if(country != null || city != null || name != null) {
				BoolQueryBuilder bq = QueryBuilders.boolQuery();
				
				if(country != null) {
					bq.should(QueryBuilders.matchQuery("country", country));
				}

				if(city != null) {
					bq.should(QueryBuilders.matchQuery("city", city));
				}

				if(name != null) {
					bq.should(QueryBuilders.matchQuery("names.name", name));
					for(String lang : langs) {
						bq.should(QueryBuilders.matchQuery("names.name:" + lang, name));
					}
				}
				
				query = bq;
			}
			
			if(type != null) {
				query = QueryBuilders.filteredQuery(query, FilterBuilders.termFilter("type", type));
			}
			
			SearchRequestBuilder search = client.prepareSearch("translator").setQuery(query);
			search.setSize(to - from);
			search.setFrom(from);
			
			SearchResponse searchResults = search.execute().actionGet();
			
			PageBuilder pageBuilder = PageBuilder.page().form(from).to(to).all(searchResults.getHits().totalHits());
			for(String lang : langs) {
				pageBuilder.addLang(lang);
			}
			
			for(SearchHit hit : searchResults.getHits().getHits()) {
				JSONObject hitJSON = new JSONObject(hit.getSource());
				
				RowBuilder row = RowBuilder.row(hitJSON.getString("osmid"));
				
				row.lon(hitJSON.getJSONObject("centroid").getDouble("lon"))
					.lat(hitJSON.getJSONObject("centroid").getDouble("lat"));
			
				JSONObject tags = hitJSON.getJSONObject("tags");
				row.name(tags.getString("name"));
				row.type(hitJSON.getString("type"));
				for(String lang : langs) {
					String langName = tags.optString("name:" + lang);
					row.translation(lang, langName);
				}
				
				pageBuilder.addRow(row);
			}
			
			return pageBuilder.build();
			
		}
		catch (Exception e) {
			e.printStackTrace();
			response.setException(e);
			response.setResponseCode(500);
			return null;
		}
	}
	
	public Object update(Request request, Response response) {
		Page page = request.getBodyAs(Page.class);
		
		Client client = ESNodeHodel.getClient();
		BulkRequestBuilder bulk = client.prepareBulk();
		
		Map<String, Object> result = new HashMap<String, Object>();
		result.put("result", "uploaded");
		
		for(Row row : page.getRows()) {
			if(row.isUpdated()) {
				
				JSONObject updateDoc = getUpdateDoc(row);
				bulk.add(new UpdateRequestBuilder(client, "translator", "location", row.getId())
					.setDoc(updateDoc.toString()));
				
				LoggerFactory.getLogger(getClass()).info("Update {} ({})", row.getId(), row.getName());
			}
		}
		
		if(bulk.numberOfActions() > 0) {
			bulk.execute().actionGet();
		}
		
		return result;
	}

	private JSONObject getUpdateDoc(Row row) {
		JSONObject results = new JSONObject();
		JSONObject names = new JSONObject();
		results.put("names", names);
		results.put("updated", true);
		
		for(Entry<String, String> entry : row.getTranslations().entrySet()) {
			names.put("name:" + entry.getKey(), entry.getValue()); 
		}
		
		return results;
	}
}
