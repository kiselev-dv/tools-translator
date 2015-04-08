package me.osm.tools.translator.rest;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.Calendar;
import java.util.Set;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import me.osm.tools.translator.ESNodeHodel;

import org.apache.commons.lang3.StringUtils;
import org.elasticsearch.action.search.SearchRequestBuilder;
import org.elasticsearch.action.search.SearchResponse;
import org.elasticsearch.client.Client;
import org.elasticsearch.index.query.FilterBuilders;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.search.SearchHit;
import org.elasticsearch.search.sort.SortOrder;
import org.json.JSONObject;
import org.restexpress.Request;
import org.restexpress.Response;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

public class ExportREST {

	@SuppressWarnings("unchecked")
	public void read(Request request, Response response) throws Exception {
		Client client = ESNodeHodel.getClient();
		SearchRequestBuilder search = client.prepareSearch("translator").setTypes("location");
		search.setQuery(QueryBuilders.filteredQuery(
				QueryBuilders.matchAllQuery(), FilterBuilders.termFilter("updated", true)));
		
		search.addSort("osmid", SortOrder.ASC);
		
		SearchResponse result = search.execute().actionGet();
		

		DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder docBuilder = docFactory.newDocumentBuilder();
		
		Document doc = docBuilder.newDocument();
		
		Element rootElement = doc.createElement("osmChange");
		doc.appendChild(rootElement);
		rootElement.setAttribute("version", "0.1");
		rootElement.setAttribute("generator", "translator.osm.me");
		
		Element modify = doc.createElement("modify");
		rootElement.appendChild(modify);
		
		for(SearchHit hit : result.getHits().getHits()) {
			JSONObject hitJSON = new JSONObject(hit.getSource());
			JSONObject tags = hitJSON.getJSONObject("tags");
			JSONObject names = hitJSON.getJSONObject("names");
			for(String key : (Set<String>)names.keySet()) {
				tags.put(key, names.optString(key));
			}
			
			String osmID = hitJSON.getString("osmid");
			Element osmElemement = null;
			if(osmID.charAt(0) == 'n') {
				osmElemement = doc.createElement("node");
			}
			if(osmID.charAt(0) == 'w') {
				osmElemement = doc.createElement("way");
			}
			if(osmID.charAt(0) == 'r') {
				osmElemement = doc.createElement("relation");
			}
			
			osmElemement.setAttribute("id", osmID.substring(1));
			
			String timestamp = currentTimestampString();
			osmElemement.setAttribute("timestamp", timestamp);
			
			modify.appendChild(osmElemement);
			
			for(String key : (Set<String>)tags.keySet()) {
				String value = StringUtils.stripToNull(tags.optString(key));
				if(value != null) {
					Element tag = doc.createElement("tag");
					tag.setAttribute("k", key);
					tag.setAttribute("v", value);
					
					osmElemement.appendChild(tag);
				}
				
			}
		}

		response.setContentType("text/xml; charset=utf8");
		
		TransformerFactory transformerFactory = TransformerFactory.newInstance();
		Transformer transformer = transformerFactory.newTransformer();
		DOMSource source = new DOMSource(doc);
		ByteArrayOutputStream baStream = new ByteArrayOutputStream();
		StreamResult outStrem = new StreamResult(baStream);
		
		transformer.transform(source, outStrem);
		
		response.setBody(new String(baStream.toByteArray(), "utf-8"));
	}

	private String currentTimestampString() {
		// 1) create a java calendar instance
		Calendar calendar = Calendar.getInstance();
		 
		// 2) get a java.util.Date from the calendar instance.
		//	  this date will represent the current instant, or "now".
		java.util.Date now = calendar.getTime();
		 
		// 3) a java current time (now) instance
		java.sql.Timestamp currentTimestamp = new java.sql.Timestamp(now.getTime());
		String timestamp = currentTimestamp.toString();
		return timestamp;
	}
}
