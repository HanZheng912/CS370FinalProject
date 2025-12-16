Airport Departure Planner

The Airport Departure Planner is a web application designed to help users determine the best time to leave for the airport. Users enter their starting address, select an airport, choose an arrival date and time, and provide additional trip details. The system then calculates and displays a recommended departure time along with a breakdown of contributing factors.

The project uses a React frontend and a Java backend deployed on Apache Tomcat. Address autocomplete functionality is powered by the Google Places API, which is accessed securely through the backend to keep API keys hidden from the frontend.

Project Structure

The project is divided into two main parts: a backend and a frontend. The backend contains Java servlet files, configuration files, and build settings, while the frontend contains the React application, configuration files, and UI components. The backend is packaged and deployed as a WAR file, and the frontend runs as a development server during local testing.

Backend Overview

The backend is built using Java Servlets and runs on Apache Tomcat. Its main responsibility is to handle address autocomplete requests from the frontend.

When the backend receives a search query, it forwards the request to the Google Places Autocomplete API. The response from Google is then processed and transformed into a simplified format that the frontend can easily consume. This prevents unnecessary data from being sent to the client and keeps the application efficient.

CORS handling was added to the backend so that requests from the frontend development server are allowed during local development. This resolved cross-origin request issues caused by the frontend and backend running on different ports.

The backend was tested independently by calling the autocomplete endpoint directly in a browser to verify that valid address suggestions were returned.

Frontend Overview

The frontend is built using React and Vite and functions as a single-page application.

The main user interface includes a trip form where users can enter a starting address, select an airport, choose a desired arrival date and time, and provide transportation and weather information. The address input field includes a live autocomplete dropdown that updates as the user types.

The frontend originally used a static list of mock New York City addresses to simulate autocomplete behavior. This mock data was removed and replaced with real address suggestions fetched from the backend API. The frontend now dynamically displays live suggestions based on user input.

State management is used to control loading states, dropdown visibility, selected values, and validation messages.

Address Autocomplete Flow

When the user types at least three characters into the address input field, the frontend sends the query to the backend autocomplete endpoint. The backend then calls the Google Places API, processes the response, and returns a simplified list of address suggestions.

The frontend displays these suggestions in a dropdown below the input field. Selecting a suggestion fills the address field and closes the dropdown. This flow was tested by entering locations such as “Queens” and confirming that real Google Places results appeared correctly.

How to Run the Project
Backend Setup

To run the backend, Java must be installed and configured on the system. A Google Maps API key must be created and set as an environment variable so it can be accessed by the backend. The backend project is built into a WAR file and deployed to Apache Tomcat. Once Tomcat is started, the backend API endpoint can be accessed locally to confirm that it is running correctly.

Frontend Setup

To run the frontend, Node.js must be installed. After installing the project dependencies, the frontend development server can be started. Once running, the application is accessible in a browser using the local development URL provided by Vite.

Notes

The frontend no longer uses mock address data and instead relies entirely on the backend for autocomplete suggestions. All Google Places API requests are handled server-side to improve security. The system has been tested end-to-end to ensure that typing an address produces real suggestions and that the frontend and backend communicate correctly.
