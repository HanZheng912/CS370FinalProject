package com.cs370.places;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
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
import java.net.URLEncoder;

import java.nio.charset.StandardCharsets;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@WebServlet("/api/trip/estimate")
public class TripEstimateServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    private static final Gson gson = new Gson();

    // Must be enabled for: Routes + Geocoding + Weather in same Google project
    private static final String API_KEY = System.getenv("GOOGLE_MAPS_API_KEY");

    // Fixed airport coordinates
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

        // ---- Preview mode (TripForm weather auto-update) ----
        boolean previewWeather = getBool(body, "previewWeather", false);
        if (previewWeather) {
            handlePreviewWeather(body, response);
            return;
        }

        // ---- Full estimate mode ----
        handleFullEstimate(body, response);
    }

    // ======================================================
    // PREVIEW WEATHER (NO ROUTES / NO GEOCODING / NO FROM ADDRESS REQUIRED)
    // ======================================================
    private void handlePreviewWeather(JsonObject body, HttpServletResponse response) throws IOException {
        String airport = getString(body, "airport");
        String arrivalDate = getString(body, "arrivalDate"); // "MM-DD-YYYY" or "MM/DD/YYYY"
        String arrivalTime = getString(body, "arrivalTime"); // "HH:MM" (24h) or "h:mm AM"

        if (airport == null || !(airport.equals("JFK") || airport.equals("LGA") || airport.equals("EWR"))) {
            badRequest(response, "airport must be JFK, LGA, or EWR");
            return;
        }
        if (arrivalDate == null || arrivalTime == null) {
            badRequest(response, "arrivalDate and arrivalTime are required");
            return;
        }

        ZoneId zone = ZoneId.of("America/New_York");
        ZonedDateTime desiredArrival;
        try {
            desiredArrival = parseArrival(arrivalDate, arrivalTime, zone);
        } catch (Exception e) {
            badRequest(response, "Invalid arrivalDate/arrivalTime format");
            return;
        }

        long desiredArrivalMillis = desiredArrival.toInstant().toEpochMilli();
        String destLatLng = airportLatLng(airport);

        int weatherExtraMinutes = 0;
        String weatherSummary = "Weather unavailable";

        try {
            WeatherResult wx = weatherAtDestinationTime(desiredArrivalMillis, destLatLng);
            weatherExtraMinutes = wx.extraMinutes;
            weatherSummary = wx.summary;
        } catch (Exception ex) {
            // Don’t fail preview; just return unavailable + 0
            System.out.println("Weather preview failed: " + ex.getMessage());
        }

        JsonObject out = new JsonObject();
        out.addProperty("arrivalDateTime", Instant.ofEpochMilli(desiredArrivalMillis).toString());

        JsonObject breakdown = new JsonObject();
        breakdown.addProperty("weatherExtraMinutes", weatherExtraMinutes);
        breakdown.addProperty("weatherSummary", weatherSummary);
        out.add("breakdown", breakdown);

        response.getWriter().print(gson.toJson(out));
    }

    // ======================================================
    // FULL ESTIMATE (ROUTES + OPTIONAL WEATHER)
    // ======================================================
    private void handleFullEstimate(JsonObject body, HttpServletResponse response) throws IOException {
        String fromAddressText = getString(body, "fromAddressText");
        String selectedPlaceId = getString(body, "selectedPlaceId");
        String airport = getString(body, "airport");
        String arrivalDate = getString(body, "arrivalDate");
        String arrivalTime = getString(body, "arrivalTime");
        String transportMode = getString(body, "transportMode");
        Integer cabBufferMinutes = getInt(body, "cabBufferMinutes");

        // Manual weather fallback ONLY if useWeatherApi == false
        String weatherCondition = getString(body, "weatherCondition");

        // Default TRUE to be bulletproof (prevents your “weatherCondition required” error)
        boolean useWeatherApi = getBool(body, "useWeatherApi", true);

        if (fromAddressText == null || fromAddressText.trim().isEmpty()) {
            fromAddressText = getString(body, "fromAddress");
        }
        if (fromAddressText == null || fromAddressText.trim().isEmpty()) {
            badRequest(response, "fromAddressText is required");
            return;
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

        int cabBufferMinutesUsed = transportMode.equals("cab") ? cabBufferMinutes : 0;

        ZoneId zone = ZoneId.of("America/New_York");
        ZonedDateTime desiredArrival;
        try {
            desiredArrival = parseArrival(arrivalDate, arrivalTime, zone);
        } catch (Exception e) {
            badRequest(response, "Invalid arrivalDate/arrivalTime format");
            return;
        }

        long desiredArrivalMillis = desiredArrival.toInstant().toEpochMilli();
        long nowMillis = System.currentTimeMillis();

        String destLatLng = airportLatLng(airport);

        // Weather minutes always computed for destination (airport coords)
        int weatherExtraMinutes = 0;
        String weatherSummary = "Weather unavailable";

        if (useWeatherApi) {
            try {
                WeatherResult wx = weatherAtDestinationTime(desiredArrivalMillis, destLatLng);
                weatherExtraMinutes = wx.extraMinutes;
                weatherSummary = wx.summary;
            } catch (Exception ex) {
                System.out.println("Weather API failed: " + ex.getMessage());
                weatherExtraMinutes = 0;
                weatherSummary = "Weather unavailable";
            }
        } else {
            // Manual fallback if they really want it
            if (weatherCondition == null || weatherCondition.isBlank()) {
                badRequest(response, "weatherCondition is required when useWeatherApi=false");
                return;
            }
            weatherExtraMinutes = weatherExtraMinutesManual(weatherCondition);
            weatherSummary = weatherCondition;
        }

        long targetArrivalAdjustedMillis = desiredArrivalMillis
                - (long) (cabBufferMinutesUsed + weatherExtraMinutes) * 60_000L;

        // If already too late, leave now
        if (targetArrivalAdjustedMillis <= nowMillis) {
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
            breakdown.addProperty("weatherSummary", weatherSummary);
            breakdown.addProperty("totalMinutes", totalMinutes);
            out.add("breakdown", breakdown);

            response.getWriter().print(gson.toJson(out));
            return;
        }

        // Binary search for best depart time
        try {
            long lo = nowMillis;
            long hi = targetArrivalAdjustedMillis;

            int bestBaseTravelMinutes = -1;
            long bestDepartMillis = lo;

            for (int i = 0; i < 22; i++) {
                long mid = lo + (hi - lo) / 2;

                int durMin = routesDurationMinutes(mid, selectedPlaceId, fromAddressText, destLatLng);
                long arriveMid = mid + durMin * 60_000L;

                if (arriveMid > targetArrivalAdjustedMillis) {
                    hi = mid;
                } else {
                    lo = mid;
                    bestDepartMillis = mid;
                    bestBaseTravelMinutes = durMin;
                }
            }

            if (bestBaseTravelMinutes < 0) {
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
            breakdown.addProperty("weatherSummary", weatherSummary);
            breakdown.addProperty("totalMinutes", totalMinutes);
            out.add("breakdown", breakdown);

            response.getWriter().print(gson.toJson(out));
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().print("{\"error\":\"Estimate failed: " + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // ======================================================
    // HELPERS
    // ======================================================
    private static JsonObject readJsonBody(HttpServletRequest request) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(request.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
        }
        System.out.println("TripEstimateServlet RAW BODY = " + sb.toString());
        return gson.fromJson(sb.toString(), JsonObject.class);
    }

    private static String getString(JsonObject obj, String key) {
        return (obj != null && obj.has(key) && !obj.get(key).isJsonNull())
                ? obj.get(key).getAsString()
                : null;
    }

    private static Integer getInt(JsonObject obj, String key) {
        try {
            return (obj != null && obj.has(key) && !obj.get(key).isJsonNull())
                    ? obj.get(key).getAsInt()
                    : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean getBool(JsonObject obj, String key, boolean def) {
        try {
            return (obj != null && obj.has(key) && !obj.get(key).isJsonNull())
                    ? obj.get(key).getAsBoolean()
                    : def;
        } catch (Exception e) {
            return def;
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

    private static String airportLatLng(String airport) {
        switch (airport) {
            case "JFK": return JFK_LATLNG;
            case "LGA": return LGA_LATLNG;
            case "EWR": return EWR_LATLNG;
            default: return JFK_LATLNG;
        }
    }

    private static int weatherExtraMinutesManual(String weatherCondition) {
        switch (weatherCondition) {
            case "Clear": return 0;
            case "Light rain": return 5;
            case "Heavy rain": return 12;
            case "Snow or ice": return 18;
            case "Severe weather": return 25;
            default: return 0;
        }
    }

    /**
     * arrivalDate: "MM-DD-YYYY" or "MM/DD/YYYY"
     * arrivalTime: "HH:MM" (24h) OR "h:mm AM/PM"
     */
    private static ZonedDateTime parseArrival(String arrivalDate, String arrivalTime, ZoneId zone) {
        String d = arrivalDate.trim().replace('/', '-');
        String t = arrivalTime.trim().toUpperCase();

        LocalDate date;
        try {
            DateTimeFormatter df = DateTimeFormatter.ofPattern("MM-dd-yyyy");
            date = LocalDate.parse(d, df);
        } catch (DateTimeParseException e) {
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

    // ======================================================
    // ROUTES API
    // ======================================================
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

        String[] parts = destLatLng.split(",");
        String lat = parts[0].trim();
        String lng = parts[1].trim();

        String originWaypointJson;
        if (selectedPlaceId != null && !selectedPlaceId.isBlank()) {
            originWaypointJson = "{ \"placeId\": \"" + escapeJson(selectedPlaceId) + "\" }";
        } else {
            double[] originLatLng = geocodeToLatLng(fromAddressText);
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

        address = address.trim();
        if (!address.toLowerCase().contains("ny")) {
            address = address + ", NY";
        }

        String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8);
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
            throw new IOException("Geocoding API HTTP " + code + ": " + resp);
        }

        JsonObject json = gson.fromJson(resp, JsonObject.class);
        String status = (json != null && json.has("status")) ? json.get("status").getAsString() : "UNKNOWN";
        String errorMsg = (json != null && json.has("error_message")) ? json.get("error_message").getAsString() : "";

        if (!"OK".equals(status)) {
            throw new IOException("Geocoding failed. status=" + status
                    + (errorMsg.isEmpty() ? "" : " error=" + errorMsg)
                    + " address=" + address);
        }

        if (!json.has("results") || json.getAsJsonArray("results").size() == 0) {
            throw new IOException("Geocoding returned 0 results for address=" + address);
        }

        JsonObject loc = json.getAsJsonArray("results")
                .get(0).getAsJsonObject()
                .getAsJsonObject("geometry")
                .getAsJsonObject("location");

        return new double[] { loc.get("lat").getAsDouble(), loc.get("lng").getAsDouble() };
    }

    // ======================================================
    // WEATHER API (DESTINATION = AIRPORT COORDS)
    // ======================================================
    private static class WeatherResult {
        int extraMinutes;
        String summary;
        WeatherResult(int extraMinutes, String summary) {
            this.extraMinutes = extraMinutes;
            this.summary = summary;
        }
    }

    private WeatherResult weatherAtDestinationTime(long desiredArrivalMillis, String destLatLng) throws IOException {
        String[] parts = destLatLng.split(",");
        String lat = parts[0].trim();
        String lng = parts[1].trim();

        long now = System.currentTimeMillis();
        long diffMs = desiredArrivalMillis - now;

        int hourOffset = (int) Math.max(0, diffMs / 3_600_000L);
        if (hourOffset > 239) hourOffset = 239;

        int hoursToFetch = Math.min(240, Math.max(1, hourOffset + 1));

        String urlStr =
                "https://weather.googleapis.com/v1/forecast/hours:lookup"
                        + "?location.latitude=" + URLEncoder.encode(lat, StandardCharsets.UTF_8)
                        + "&location.longitude=" + URLEncoder.encode(lng, StandardCharsets.UTF_8)
                        + "&hours=" + hoursToFetch
                        + "&key=" + URLEncoder.encode(API_KEY, StandardCharsets.UTF_8);

        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(7000);
        conn.setReadTimeout(7000);

        int code = conn.getResponseCode();
        String resp = (code >= 200 && code < 300) ? readAll(conn) : readAllError(conn);
        if (code < 200 || code >= 300) {
            throw new IOException("Weather API error " + code + ": " + resp);
        }

        JsonObject json = gson.fromJson(resp, JsonObject.class);
        if (json == null || !json.has("forecastHours")) {
            throw new IOException("Weather API returned no forecastHours");
        }

        JsonArray hours = json.getAsJsonArray("forecastHours");
        if (hours.size() == 0) {
            throw new IOException("Weather API forecastHours is empty");
        }

        int idx = Math.min(hourOffset, hours.size() - 1);
        JsonObject hour = hours.get(idx).getAsJsonObject();

        // Very defensive: try a few shapes
        String precipType = "NONE";
        int precipChance = 0;

        // Shape A: precipitation.probability.type / percent
        JsonObject precip = safeObj(hour, "precipitation");
        if (precip != null) {
            JsonObject prob = safeObj(precip, "probability");
            if (prob != null) {
                precipType = safeStr(prob, "type", precipType);
                precipChance = safeInt(prob, "percent", precipChance);
            }
        }

        // Shape B: precipitationProbability.percent
        JsonObject precipitationProbability = safeObj(hour, "precipitationProbability");
        if (precipitationProbability != null) {
            precipChance = safeInt(precipitationProbability, "percent", precipChance);
        }

        // Shape C: condition / weatherCondition
        String conditionText = safeStr(hour, "condition", null);
        if (conditionText == null) conditionText = safeStr(hour, "weatherCondition", null);

        String summary;
        if (conditionText != null && !conditionText.isBlank()) {
            summary = mapConditionText(conditionText);
        } else {
            summary = mapPrecipToSummary(precipType, precipChance);
        }

        int extra = weatherExtraMinutesManual(summary);
        return new WeatherResult(extra, summary);
    }

    private static JsonObject safeObj(JsonObject parent, String key) {
        try {
            if (parent != null && parent.has(key) && parent.get(key).isJsonObject()) {
                return parent.getAsJsonObject(key);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static String safeStr(JsonObject obj, String key, String def) {
        try {
            if (obj != null && obj.has(key) && !obj.get(key).isJsonNull()) return obj.get(key).getAsString();
        } catch (Exception ignored) {}
        return def;
    }

    private static int safeInt(JsonObject obj, String key, int def) {
        try {
            if (obj != null && obj.has(key) && !obj.get(key).isJsonNull()) return obj.get(key).getAsInt();
        } catch (Exception ignored) {}
        return def;
    }

    private static String mapPrecipToSummary(String precipType, int precipChance) {
        if (precipChance < 20) return "Clear";

        String t = (precipType == null) ? "" : precipType.toUpperCase();

        if (t.contains("SNOW") || t.contains("SLEET") || t.contains("FREEZING") || t.contains("RAIN_AND_SNOW")) {
            return "Snow or ice";
        }
        if (t.contains("HEAVY_RAIN")) return "Heavy rain";
        if (t.contains("LIGHT_RAIN") || t.contains("RAIN")) return "Light rain";

        if (precipChance >= 70) return "Severe weather";
        return "Light rain";
    }

    private static String mapConditionText(String conditionText) {
        String t = conditionText.toLowerCase();
        if (t.contains("snow") || t.contains("ice") || t.contains("sleet") || t.contains("freez")) return "Snow or ice";
        if (t.contains("thunder") || t.contains("storm") || t.contains("severe")) return "Severe weather";
        if (t.contains("heavy") && t.contains("rain")) return "Heavy rain";
        if (t.contains("rain") || t.contains("drizzle")) return "Light rain";
        return "Clear";
    }

    // ======================================================
    // IO
    // ======================================================
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
