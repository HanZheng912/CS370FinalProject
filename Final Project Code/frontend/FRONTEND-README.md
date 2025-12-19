# Airport Departure Planner – Frontend

## Overview

This folder contains the **frontend implementation** of the Airport Departure Planner web application.

The frontend is responsible for the complete user interface, user interaction flow, client-side validation, and result presentation.

At the time of delivery, backend API calls are mocked to allow independent frontend development. The frontend is designed so real backend endpoints can be integrated without UI changes.

---

## Technology Stack

- **React (Vite)**
- **JavaScript (ES6+)**
- **Tailwind CSS**
- **HTML5 / CSS3**

---

## Folder Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.jsx         # Page layout, background, hero section
│   │   ├── TripForm.jsx       # Main user input form
│   │   └── ResultsPanel.jsx   # Results modal and breakdown
│   ├── api/
│   │   ├── places.js          # address autocomplete API
│   │   └── estimate.js        # travel time calculation API
│   ├── assets/
│   │   ├── plane-bg.jpeg      # Background image asset
│   │   └── react.svg           # React logo (default)
│   ├── utils/
│   │   └── validation.js      # Client-side form validation
│   ├── App.jsx                 # Application state and flow control
│   ├── App.css                 # App-specific styles
│   ├── index.css               # Global styles and Tailwind imports
│   └── main.jsx                # React entry point
├── public/
│   └── vite.svg                # Vite logo
├── index.html                   # HTML entry point
├── package.json                 # Dependencies and scripts
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.js               # Vite build configuration
├── postcss.config.js            # PostCSS configuration
├── eslint.config.js             # ESLint configuration
└── ReadMe.md                    # This file
```

---

## Features Implemented

- Fully functional Trip Details form
- Address autocomplete UI (mocked backend)
- Airport selection (JFK, LGA, EWR)
- Arrival date and time selection
- Transportation type (self-drive or cab/rideshare)
- User-defined cab pickup buffer
- Weather condition selection
- Client-side validation with inline error messages
- Loading and error states
- Results displayed in a modal with a clear breakdown
- Responsive, professional SaaS-style UI

---

## How to Run the Frontend Locally

### Requirements
- Node.js (v18+ recommended)
- npm

### Installation

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The application will be available at:  
[http://localhost:5173](http://localhost:5173)

---

## Responsibility

This frontend module was implemented as part of the team project to handle:
- UI/UX design
- Client-side logic
- Validation
- Result visualization
- Integration-ready API structure

Backend services are implemented separately.

The frontend was fully created and worked on by: Tahmid Hussan
