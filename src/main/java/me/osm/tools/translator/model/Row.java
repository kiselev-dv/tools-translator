package me.osm.tools.translator.model;

import java.util.Map;

public class Row {

	private Map<String, String> translations;
	private String id;
	private String name;
	private String type;
	private String wiki;
	
	private double lon;
	private double lat;
	
	private boolean updated;

	public Row(String id, String type, String name, Map<String, String> langs, String wiki, double lon, double lat) {
		this.id = id;
		
		this.name = name;
		this.type = type;
		this.wiki = wiki;
		
		this.translations = langs;
		
		this.lon = lon;
		this.lat = lat;
		
		this.updated = false;
	}
	
	public Row() {
		
	}

	public Map<String, String> getTranslations() {
		return translations;
	}

	public String getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public boolean isUpdated() {
		return this.updated;
	}

}
