package com.cs370.places;

import java.util.regex.*;
import java.util.*;

public class GooglePlacesTransformer {

    public static String toSuggestionsJson(String googleJson) {
        List<String> items = new ArrayList<>();

        Pattern p = Pattern.compile(
            "\"placeId\"\\s*:\\s*\"([^\"]+)\".*?\"text\"\\s*:\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\"",
            Pattern.DOTALL
        );

        Matcher m = p.matcher(googleJson);

        while (m.find()) {
            String placeId = escape(m.group(1));
            String label = escape(m.group(2));
            items.add("{\"id\":\"" + placeId + "\",\"label\":\"" + label + "\"}");
        }

        return "{\"suggestions\":[" + String.join(",", items) + "]}";
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
