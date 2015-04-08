package me.osm.tools.translator.rest;

import java.io.FileInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.zip.GZIPInputStream;

import me.osm.tools.translator.ESNodeHodel;

import org.apache.commons.io.IOUtils;
import org.apache.commons.io.LineIterator;
import org.apache.commons.lang3.StringUtils;
import org.elasticsearch.action.admin.indices.delete.DeleteIndexRequest;
import org.elasticsearch.action.admin.indices.exists.indices.IndicesExistsRequest;
import org.elasticsearch.action.bulk.BulkRequestBuilder;
import org.elasticsearch.action.index.IndexRequestBuilder;
import org.elasticsearch.client.Client;
import org.elasticsearch.client.IndicesAdminClient;
import org.json.JSONObject;
import org.restexpress.Request;
import org.restexpress.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ImportREST {
	
	private static final Logger log = LoggerFactory.getLogger(ImportREST.class);
	private static final Set<String> TYPES = new HashSet<String>(Arrays.asList("hghway", "plcpnt", "admbnd"));
	private Client client;
	private BulkRequestBuilder bulkRequest;
	private int counter = 0;  
	
	public void read(Request request, Response response) {
		String path = request.getHeader("source");
		
		boolean drop = "true".equals(request.getHeader("drop"));
		IndicesAdminClient indices = ESNodeHodel.getClient().admin().indices();
		if(drop) {
			if(indices.exists(new IndicesExistsRequest("translator")).actionGet().isExists()) {
				indices.delete(new DeleteIndexRequest("translator")).actionGet();
			}
		}
		
		Thread.currentThread().setName("importer");
		
		try {
			
			client = me.osm.tools.translator.ESNodeHodel.getClient();
			bulkRequest = client.prepareBulk();
			
			LineIterator lineIterator = IOUtils.lineIterator(new GZIPInputStream(new FileInputStream(path)), "utf-8");
			for(String line = lineIterator.nextLine(); lineIterator.hasNext(); line = lineIterator.nextLine()) {
				JSONObject row = new JSONObject(line);
				addToBatch(row);
			}
			
			if(bulkRequest.numberOfActions() > 0) {
				bulkRequest.execute().actionGet();
				log.info("{} rows imported", counter);
			}
			
			LineIterator.closeQuietly(lineIterator);
			log.info("done");
			counter = 0;
		}
		catch (Exception e) {
			e.printStackTrace();
		}
		
	}

	private void addToBatch(JSONObject row) {
		
		String[] split = StringUtils.split(row.getString("feature_id"), '-');
		
		if(split != null && split.length > 1) {
			String type = split[0];
			if(TYPES.contains(type)) {
				String osmid = split[split.length - 1];
				if(StringUtils.startsWith(osmid, "n") || StringUtils.startsWith(osmid, "w") || StringUtils.startsWith(osmid, "r")) {
					addToBatch(row, type, osmid);
				}
			}
		}
	}

	private void addToBatch(JSONObject row, String type, String osmid) {
		JSONObject obj = new JSONObject();
		obj.put("type", type);
		obj.put("osmid", osmid);
		obj.put("names", filterNames(row.optJSONObject("tags")));
		obj.put("tags", row.optJSONObject("tags"));
		
		obj.put("country", row.optString("admin0_name"));
		obj.put("city", row.optString("locality_name"));

		obj.put("centroid", row.optJSONObject("center_point"));
		
		writeToBatch(osmid, obj);
	}

	@SuppressWarnings("unchecked")
	private JSONObject filterNames(JSONObject optJSONObject) {
		if(optJSONObject == null) {
			return null;
		}
		
		JSONObject result = new JSONObject();
		
		for(String s : (Set<String>)optJSONObject.keySet()) {
			if(StringUtils.startsWith(s, "name:") || "name".equals(s)|| "wiki".equals(s)) {
				result.put(s, optJSONObject.getString(s));
			}
		}
		
		return result;
	}

	private void writeToBatch(String osmid, JSONObject obj) {
		
		bulkRequest.add(new IndexRequestBuilder(client).setIndex("translator")
				.setType("location").setId(osmid).setSource(obj.toString()));
		
		counter++;
		
		if(bulkRequest.numberOfActions() > 0 && bulkRequest.numberOfActions() % 1000 == 0) {
			bulkRequest.execute().actionGet();
			bulkRequest = client.prepareBulk();

			log.info("{} rows imported", counter);
		}
	}
	
}
