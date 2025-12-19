package com.cs370.places;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;

import java.net.HttpURLConnection;
import java.net.URL;

import java.nio.charset.StandardCharsets;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

//@WebServlet("/api/trip/estimate")
public class TripEstimateServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private static final Gson gson = new Gson();

    // Keep it server-side only
    private static final String API_KEY = System.getenv("GOOGLE_MAPS_API_KEY");

    // Fixed airport coordinates (good enough for now)
    // You can replace these with Place IDs later if you want.
    private static final String JFK_LATLNG = "40.6413111,-73.7781391";
    private static final String LGA_LATLNG = "40.7769271,-73.8739659";
    private static final String EWR_LATLNG = "40.6895314,-74.1744624";

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        if (API_KEY == null || API_KEY.isBlank()) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().print("{\"error\":\"Missing GOOGLE_MAPS_API_KEY env var on server\"}");
            return;
        }

        JsonObject body;
        try {
            body = readJsonBody(request);
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().print("{\"error\":\"Invalid JSON body\"}");
            return;
        }

        String fromAddressText = getString(body, "fromAddressText");
        String selectedPlaceId = getString(body, "selectedPlaceId");
        String airport = getString(body, "airport");
        String arrivalDate = getString(body, "arrivalDate");
        String arrivalTime = getString(body, "arrivalTime");
        String transportMode = getString(body, "transportMode");
        Integer cabBufferMinutes = getInt(body, "cabBufferMinutes");
        String weatherCondition = getString(body, "weatherCondition");

        // Basic validation
        if (fromAddressText == null || fromAddressText.trim().isEmpty()) {
    // BULLETPROOF: fallback if frontend sends "fromAddress"
    fromAddressText = getString(body, "fromAddress");
}
        if (airport == null || !(airport.equals("JFK") || airport.equals("LGA") || airport.equals("EWR"))) {
            badRequest(response, "airport must be JFK, LGA, or EWR");
            return;
        }
        if (arrivalDate == null || arrivalTime == null) {
            badRequest(response, "arrivalDate and arrivalTime are required");
            return;
        }
        if (transportMode == null || !(transportMode.equals("self") || transportMode.equals("cab"))) {
            badRequest(response, "transportMode must be self or cab");
            return;
        }
        if (cabBufferMinutes == null || cabBufferMinutes < 0) {
            badRequest(response, "cabBufferMinutes must be >= 0");
            return;
        }
        if (weatherCondition == null) {
            badRequest(response, "weatherCondition is required");
            return;
        }

        int cabBufferMinutesUsed = transportMode.equals("cab") ? cabBufferMinutes : 0;
        int weatherExtraMinutes = weatherExtraMinutes(weatherCondition);

        // Parse desired arrival (assume America/New_York since you’re doing NYC airports)
        ZoneId zone = ZoneId.of("America/New_York");
        ZonedDateTime desiredArrival;
        try {
            desiredArrival = parseArrival(arrivalDate, arrivalTime, zone);
        } catch (Exception e) {
            badRequest(response, "Invalid arrivalDate/arrivalTime format");
            return;
        }

        long desiredArrivalMillis = desiredArrival.toInstant().toEpochMilli();
        long targetArrivalAdjustedMillis = desiredArrivalMillis
                - (long)(cabBufferMinutesUsed + weatherExtraMinutes) * 60_000L;

        long nowMillis = System.currentTimeMillis();

        if (targetArrivalAdjustedMillis <= nowMillis) {
    // We must leave now, but still compute the real travel time from NOW.
    String destLatLng = airportLatLng(airport);

    int nowBaseTravelMinutes;
    try {
        nowBaseTravelMinutes = routesDurationMinutes(nowMillis, selectedPlaceId, fromAddressText, destLatLng);
    } catch (Exception ex) {
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        response.getWriter().print("{\"error\":\"Estimate failed (leave-now): " + escapeJson(ex.getMessage()) + "\"}");
        return;
    }

    int totalMinutes = nowBaseTravelMinutes + cabBufferMinutesUsed + weatherExtraMinutes;

    JsonObject out = new JsonObject();
    out.addProperty("recommendedLeaveDateTime", Instant.ofEpochMilli(nowMillis).toString());
    out.addProperty("arrivalDateTime", Instant.ofEpochMilli(desiredArrivalMillis).toString());

    JsonObject breakdown = new JsonObject();
    breakdown.addProperty("baseTravelMinutes", nowBaseTravelMinutes);
    breakdown.addProperty("cabBufferMinutes", cabBufferMinutesUsed);
    breakdown.addProperty("weatherExtraMinutes", weatherExtraMinutes);
    breakdown.addProperty("totalMinutes", totalMinutes);
    out.add("breakdown", breakdown);

    response.getWriter().print(gson.toJson(out));
    return;
}


        String destLatLng = airportLatLng(airport);

        try {
            // Binary search: depart in [now, targetArrivalAdjusted]
            long lo = nowMillis;
            long hi = targetArrivalAdjustedMillis;

            int bestBaseTravelMinutes = -1;
            long bestDepartMillis = lo;

            for (int i = 0; i < 22; i++) { // ~4 million resolution over hours range
                long mid = lo + (hi - lo) / 2;

                int durMin = routesDurationMinutes(mid, selectedPlaceId, fromAddressText, destLatLng);

                long arriveMid = mid + durMin * 60_000L;

                // We want arriveMid <= targetArrivalAdjusted, but as close as possible
                if (arriveMid > targetArrivalAdjustedMillis) {
                    hi = mid;
                } else {
                    lo = mid;
                    bestDepartMillis = mid;
                    bestBaseTravelMinutes = durMin;
                }
            }

            if (bestBaseTravelMinutes < 0) {
                // fallback once more at "now"
                bestDepartMillis = nowMillis;
                bestBaseTravelMinutes = routesDurationMinutes(nowMillis, selectedPlaceId, fromAddressText, destLatLng);
            }

            int totalMinutes = bestBaseTravelMinutes + cabBufferMinutesUsed + weatherExtraMinutes;

            JsonObject out = new JsonObject();
            out.addProperty("recommendedLeaveDateTime", Instant.ofEpochMilli(bestDepartMillis).toString());
            out.addProperty("arrivalDateTime", Instant.ofEpochMilli(desiredArrivalMillis).toString());

            JsonObject breakdown = new JsonObject();
            breakdown.addProperty("baseTravelMinutes", bestBaseTravelMinutes);
            breakdown.addProperty("cabBufferMinutes", cabBufferMinutesUsed);
            breakdown.addProperty("weatherExtraMinutes", weatherExtraMinutes);
            breakdown.addProperty("totalMinutes", totalMinutes);
            out.add("breakdown", breakdown);

            response.getWriter().print(gson.toJson(out));
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().print("{\"error\":\"Estimate failed: " + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // -------- helpers --------

    private static JsonObject readJsonBody(HttpServletRequest request) throws IOException {
    StringBuilder sb = new StringBuilder();
    try (BufferedReader br = new BufferedReader(
            new InputStreamReader(request.getInputStream(), StandardCharsets.UTF_8))) {
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
    }

    System.out.println("TripEstimateServlet RAW BODY = " + sb.toString()); // ✅ ADD THIS

    return gson.fromJson(sb.toString(), JsonObject.class);
}


    private static String getString(JsonObject obj, String key) {
        return (obj != null && obj.has(key) && !obj.get(key).isJsonNull()) ? obj.get(key).getAsString() : null;
    }

    private static Integer getInt(JsonObject obj, String key) {
        try {
            return (obj != null && obj.has(key) && !obj.get(key).isJsonNull()) ? obj.get(key).getAsInt() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static void badRequest(HttpServletResponse response, String msg) throws IOException {
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        response.getWriter().print("{\"error\":\"" + escapeJson(msg) + "\"}");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static int weatherExtraMinutes(String weatherCondition) {
        switch (weatherCondition) {
            case "Clear": return 0;
            case "Light rain": return 5;
            case "Heavy rain": return 12;
            case "Snow or ice": return 18;
            case "Severe weather": return 25;
            default: return 0;
        }
    }

    private static String airportLatLng(String airport) {
        switch (airport) {
            case "JFK": return JFK_LATLNG;
            case "LGA": return LGA_LATLNG;
            case "EWR": return EWR_LATLNG;
            default: return JFK_LATLNG;
        }
    }

    /**
     * Parses arrivalDate + arrivalTime.
     * Supports:
     * - arrivalDate: "MM-DD-YYYY" or "MM/DD/YYYY"
     * - arrivalTime: "HH:MM" (24h) or "hh:mm AM/PM"
     */
    private static ZonedDateTime parseArrival(String arrivalDate, String arrivalTime, ZoneId zone) {
        String d = arrivalDate.trim().replace('/', '-');
        String t = arrivalTime.trim().toUpperCase();

        LocalDate date;
        try {
            DateTimeFormatter df = DateTimeFormatter.ofPattern("MM-dd-yyyy");
            date = LocalDate.parse(d, df);
        } catch (DateTimeParseException e) {
            // If your UI is "06/17/2025", still becomes 06-17-2025 above; this is just a second try
            DateTimeFormatter df2 = DateTimeFormatter.ofPattern("M-d-yyyy");
            date = LocalDate.parse(d, df2);
        }

        LocalTime time;
        if (t.contains("AM") || t.contains("PM")) {
            DateTimeFormatter tf = DateTimeFormatter.ofPattern("h:mm a");
            time = LocalTime.parse(t, tf);
        } else {
            DateTimeFormatter tf = DateTimeFormatter.ofPattern("H:mm");
            time = LocalTime.parse(t, tf);
        }

        return ZonedDateTime.of(date, time, zone);
    }

    /**
     * Calls Google Routes API with a given departure time and returns duration in whole minutes.
     *
     * If selectedPlaceId is present, we use it for origin (best).
     * Otherwise we send the text address.
     */
    private int routesDurationMinutes(long departMillis, String selectedPlaceId, String fromAddressText, String destLatLng)
        throws IOException {

    String urlStr = "https://routes.googleapis.com/directions/v2:computeRoutes";
    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();

    conn.setRequestMethod("POST");
    conn.setConnectTimeout(7000);
    conn.setReadTimeout(7000);
    conn.setDoOutput(true);

    conn.setRequestProperty("Content-Type", "application/json");
    conn.setRequestProperty("X-Goog-Api-Key", API_KEY);
    conn.setRequestProperty("X-Goog-FieldMask", "routes.duration");

    String departureTimeRfc3339 = Instant.ofEpochMilli(departMillis).toString();

    // Destination lat/lng
    String[] parts = destLatLng.split(",");
    String lat = parts[0].trim();
    String lng = parts[1].trim();

    // Build origin waypoint
    // Build origin waypoint
String originWaypointJson;

if (selectedPlaceId != null && !selectedPlaceId.isBlank()) {
    // Best case: use Place ID directly
    originWaypointJson = "{ \"placeId\": \"" + escapeJson(selectedPlaceId) + "\" }";
} else {
    // Fallback: geocode address -> latLng
    double[] originLatLng = geocodeToLatLng(fromAddressText); // [lat, lng]

    originWaypointJson =
        "{ \"location\": { \"latLng\": { \"latitude\": " + originLatLng[0] + ", \"longitude\": " + originLatLng[1] + " } } }";
}


    String destinationWaypointJson =
        "{ \"location\": { \"latLng\": { \"latitude\": " + lat + ", \"longitude\": " + lng + " } } }";

    String payload =
        "{"
            + "\"origin\": " + originWaypointJson + ","
            + "\"destination\": " + destinationWaypointJson + ","
            + "\"travelMode\":\"DRIVE\","
            + "\"routingPreference\":\"TRAFFIC_AWARE\","
            + "\"departureTime\":\"" + departureTimeRfc3339 + "\""
        + "}";

    try (OutputStream os = conn.getOutputStream()) {
        os.write(payload.getBytes(StandardCharsets.UTF_8));
    }

    int code = conn.getResponseCode();
    String resp;
    if (code >= 200 && code < 300) resp = readAll(conn);
    else throw new IOException("Routes API error " + code + ": " + readAllError(conn));

    JsonObject json = gson.fromJson(resp, JsonObject.class);
    if (json == null || !json.has("routes") || json.getAsJsonArray("routes").size() == 0) {
        throw new IOException("Routes API returned no routes");
    }

    String durStr = json.getAsJsonArray("routes")
        .get(0).getAsJsonObject()
        .get("duration").getAsString(); // e.g. "2700s"

    long seconds = Long.parseLong(durStr.replace("s", "").trim());
    long minutes = (seconds + 59) / 60;
    return (int) minutes;
}

private double[] geocodeToLatLng(String address) throws IOException {
    if (address == null || address.trim().isEmpty()) {
        throw new IOException("Cannot geocode empty address");
    }
    if (!address.toLowerCase().contains("ny")) {
  address = address + ", NY";
}


    String encoded = java.net.URLEncoder.encode(address, StandardCharsets.UTF_8);
   String urlStr =
  "https://maps.googleapis.com/maps/api/geocode/json?address=" + encoded +
  "&components=country:US" +
  "&region=us" +
  "&key=" + API_KEY;


    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
    conn.setRequestMethod("GET");
    conn.setConnectTimeout(7000);
    conn.setReadTimeout(7000);

    int code = conn.getResponseCode();
    String resp = (code >= 200 && code < 300) ? readAll(conn) : readAllError(conn);
    if (code < 200 || code >= 300) {
        throw new IOException("Geocoding API error " + code + ": " + resp);
    }

    JsonObject json = gson.fromJson(resp, JsonObject.class);
    if (json == null || !json.has("results") || json.getAsJsonArray("results").size() == 0) {
        throw new IOException("Geocoding returned no results for address");
    }

    JsonObject loc = json.getAsJsonArray("results")
        .get(0).getAsJsonObject()
        .getAsJsonObject("geometry")
        .getAsJsonObject("location");

    return new double[] { loc.get("lat").getAsDouble(), loc.get("lng").getAsDouble() };
}


    private static String readAll(HttpURLConnection conn) throws IOException {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }

    private static String readAllError(HttpURLConnection conn) throws IOException {
        if (conn.getErrorStream() == null) return "";
        try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }
}
