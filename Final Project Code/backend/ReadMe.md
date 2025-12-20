Airport Departure Planner

The Airport Departure Planner is a web application designed to help users determine the best time to leave for the airport. Users enter their starting address, select an airport, choose an arrival date and time, and provide trip details such as transportation type and weather. The system calculates and displays a recommended departure time along with a clear breakdown of how that time was determined.

The application replaces all mock logic with real backend calculations using live Google APIs. Traffic, distance, weather delays, and transportation buffers are all factored into the final result.

Key Features

Real recommended departure time based on traffic and distance

Weather-based delay calculation using live forecast data

Address autocomplete using Google Places

Support for typed addresses and Place IDs

Clear breakdown showing base travel time, weather delay, and buffer time

Secure backend-only API usage (no API keys exposed to frontend)

APIs Used

The project integrates several Google APIs on the backend:

Google Places API – Address autocomplete and Place ID support

Google Geocoding API – Fallback when a Place ID is not available

Google Routes API – Calculates base travel time with real traffic

Google Weather API – Fetches forecast data and converts it into weather delay minutes

All API calls are handled by the backend to keep keys secure.

Project Structure

The project is split into two main folders:

backend/
Contains Java servlets, API logic, validation, and Google API integrations. The backend is built as a WAR file and deployed to Apache Tomcat.

frontend/
Contains the React application built with Vite. This includes the trip form, results modal, layout, and validation logic.

Backend Overview

The backend is built using Java Servlets and runs on Apache Tomcat.

Its responsibilities include:

Validating all incoming trip data

Calling Google APIs (Places, Geocoding, Routes, Weather)

Calculating base travel time using traffic-aware routing

Applying weather delay minutes

Applying cab pickup buffer time if selected

Computing the final recommended departure time

Returning a clean JSON response to the frontend

The main backend logic lives in TripEstimateServlet.java.
CORS handling is enabled to allow communication with the frontend dev server during local testing.

Frontend Overview

The frontend is built with React and Vite as a single-page application.

Key UI components include:

TripForm.jsx – Handles user input and validation

ResultsPanel.jsx – Displays the recommended departure time and breakdown

Layout.jsx – Provides consistent page layout

App.jsx – Controls overall state and request flow

The frontend sends structured trip data to the backend and displays results returned by the server. All mock data has been removed.

Address Autocomplete Flow

User types at least three characters into the address field

Frontend sends the query to the backend

Backend calls Google Places API

Results are simplified and returned

Frontend displays suggestions in a dropdown

If a Place ID is not available, the backend falls back to geocoding the typed address.

How to Run the Project Locally (If Deployed Version Fails)
Prerequisites

Java JDK installed

Maven installed

Node.js installed

Apache Tomcat installed

Google Maps API key with required APIs enabled

API key set as an environment variable:

GOOGLE_MAPS_API_KEY=your_api_key_here

Backend: Clean Redeploy (Required)

This process ensures Tomcat does not use cached or stale files.

1) Stop Tomcat

Navigate to the Tomcat bin directory and stop the server.

Windows:

shutdown.bat


Mac / Linux:

./shutdown.sh

2) Delete Deployed App and Caches

Remove the deployed backend folder, cached files, and WAR file from Tomcat.

Delete:

webapps/backend

webapps/backend.war

work/Catalina/localhost/backend

(This step is important to avoid old code being reused.)

3) Build the Backend WAR

From the backend project directory:

mvn clean package


This will generate a new WAR file inside the target folder.

4) Copy WAR to Tomcat

Copy the generated WAR file into Tomcat’s webapps directory.

Example:

copy target/backend.war TOMCAT_HOME/webapps/backend.war


Tomcat will automatically deploy it on startup.

5) Start Tomcat

From the Tomcat bin directory:

Windows:

startup.bat


Mac / Linux:

./startup.sh


Once started, the backend should be available locally.

Frontend Setup

From the frontend directory:

Install dependencies:

npm install


Start the development server:

npm run dev


Vite will display a local URL in the terminal. Open it in a browser to access the application.
