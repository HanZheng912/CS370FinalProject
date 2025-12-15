package com.cs370.places;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

//@WebServlet("/api/places/suggest")
public class PlaceSuggestionServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final String API_KEY = System.getenv("GOOGLE_MAPS_API_KEY");

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        String q = request.getParameter("q");
        if (q == null || q.trim().length() < 3) {
            response.getWriter().print("{\"suggestions\":[]}");
            return;
        }

        if (API_KEY == null || API_KEY.isBlank()) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().print("{\"error\":\"Missing GOOGLE_MAPS_API_KEY\"}");
            return;
        }

       String input = q.trim();

// NEW Places API endpoint
String googleUrl = "https://places.googleapis.com/v1/places:autocomplete";

HttpURLConnection conn = (HttpURLConnection) new URL(googleUrl).openConnection();
conn.setRequestMethod("POST");
conn.setConnectTimeout(5000);
conn.setReadTimeout(5000);
conn.setDoOutput(true);

// Required header for new Places API
conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
conn.setRequestProperty("X-Goog-Api-Key", API_KEY);

// Ask only for what you need (field mask)
conn.setRequestProperty("X-Goog-FieldMask", "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text");

String payload =
    "{"
  + "\"input\":" + toJsonString(input) + ","
  + "\"includedPrimaryTypes\":[\"street_address\",\"premise\",\"subpremise\"],"
  + "\"includedRegionCodes\":[\"US\"],"
  + "\"languageCode\":\"en\""
  + "}";

try (var os = conn.getOutputStream()) {
    os.write(payload.getBytes(StandardCharsets.UTF_8));
}

int status = conn.getResponseCode();
InputStream is = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();

String body;
try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = br.readLine()) != null) sb.append(line);
    body = sb.toString();
} finally {
    conn.disconnect();
}

// TEMP: return raw to verify it works
String transformed = GooglePlacesTransformer.toSuggestionsJson(body);
response.setStatus(HttpServletResponse.SC_OK);
response.getWriter().print(transformed);

return;

    }
    private static String toJsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
