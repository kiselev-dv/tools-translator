package me.osm.tools.translator.model;

import java.util.ArrayList;
import java.util.List;

public class PageBuilder {
	
	private List<String> langs = new ArrayList<String>();
	private List<RowBuilder> rows = new ArrayList<RowBuilder>();
	private int from = 0;
	private int to;
	private long all;
	
	private PageBuilder() {};
	
	public static PageBuilder page() {
		return new PageBuilder();
	}
	
	public Page build() {
		List<Row> rows = new ArrayList<Row>();
		for(RowBuilder rb : this.rows) {
			rows.add(rb.build()); 
		}
		return new Page(langs, from, to, all, rows);
	}
	
	public PageBuilder form(int from) {
		this.from = from;
		return this;
	}

	public PageBuilder all(long all) {
		this.all = all;
		return this;
	}

	public PageBuilder to(int to) {
		this.to = to;
		return this;
	}
	
	public PageBuilder addLang(String lang) {
		this.langs.add(lang);
		return this;
	}

	public PageBuilder addRow(RowBuilder row) {
		this.rows.add(row);
		return this;
	}
	
}
