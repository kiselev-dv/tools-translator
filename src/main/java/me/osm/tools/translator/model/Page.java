package me.osm.tools.translator.model;

import java.util.List;

public class Page {

	private List<String> langs;
	private int from;
	private int to;
	private long all;
	private List<Row> rows;

	public Page(List<String> langs, int from, int to, long all, List<Row> rows) {
		this.langs = langs;
		this.from = from;
		this.to = to;
		this.all = all;
		this.rows = rows;
	}
	
	public Page() {
		
	}

	public List<Row> getRows() {
		return this.rows;
	}

}
