package me.osm.tools.translator;

import me.osm.tools.translator.rest.ExportREST;
import me.osm.tools.translator.rest.ImportREST;
import me.osm.tools.translator.rest.PageREST;

import org.jboss.netty.handler.codec.http.HttpMethod;
import org.restexpress.Request;
import org.restexpress.Response;
import org.restexpress.RestExpress;
import org.restexpress.pipeline.Postprocessor;

public class Translator {

	private static RestExpress rest;

	public static void main(String[] args) {
		
		rest = new RestExpress()
			.setName("translator")
			.addPostprocessor(new Postprocessor() {
					
					public void process(Request request, Response response) {
						response.addHeader("Access-Control-Allow-Origin", "*");
					}
					
			});

		rest.uri("/translator/api/page.{format}", new PageREST()).method(HttpMethod.GET, HttpMethod.PUT);
		rest.uri("/translator/api/import", new ImportREST()).method(HttpMethod.GET);
		rest.uri("/translator/api/export", new ExportREST()).method(HttpMethod.GET).noSerialization();

		rest.bind(9090);
		
		ESNodeHodel.getClient();
		
		Runtime runtime = Runtime.getRuntime();
		Thread thread = new Thread(new ShutDownListener());
		runtime.addShutdownHook(thread);
	}

	private static class ShutDownListener implements Runnable {

		public void run() {
			rest.shutdown();
			ESNodeHodel.stopNode();
		}

	}
}
