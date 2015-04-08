package me.osm.tools.translator.model;

import java.util.HashMap;
import java.util.Map;

public class RowBuilder {
	
	private RowBuilder() {};
	private String id;
	private String name;
	private String type;
	private String wiki;
	private double lon;
	private double lat;
	
	private Map<String, String> translations = new HashMap<String, String>();
	
	public static RowBuilder row(String id) {
		RowBuilder rowBuilder = new RowBuilder();
		rowBuilder.id = id;
		return rowBuilder;
	}
	
	public Row build() {
		return new Row(id, type, name, translations, wiki, lon, lat);
	}

	public RowBuilder translation(String lang, String val) {
		translations.put(lang, val);
		return this;
	}

	public RowBuilder name(String name) {
		this.name = name;
		return this;
	}
	
	public RowBuilder type(String type) {
		this.type = type;
		return this;
	}

	public RowBuilder lon(double lon) {
		this.lon = lon;
		return this;
	}

	public RowBuilder lat(double lat) {
		this.lat = lat;
		return this;
	}
}
