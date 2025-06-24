# Chrony - Personal Time Management System

## Overview
Chrony is a web-based time management solution that combines schedule planning with real-time activity tracking, enabling users to optimize their time usage through data-driven insights. The system helps users plan their schedule, track their time usage in real-time, and analyze discrepancies between planned and actual time spent on activities.

## Key Features
- **Integrated Planning and Tracking**: Seamless connection between scheduled events and time tracking
- **Three Event Types**: 
  - Fixed (unchangeable time and date)
  - Flexible (fixed day with adjustable time)
  - Fluid (can be scheduled anywhere within the week)
- **Calendar Views**: Weekly and daily visualizations with drag-and-drop functionality
- **Real-time Time Tracking**: Start/stop timer controls for activity monitoring
- **Analytics Dashboard**: Visual representations of time usage patterns and comparisons

## Technology Stack
- **Frontend**: React, Tailwind CSS, React Big Calendar
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT-based authentication system

## Project Structure
```
chrony/
├── chrony-frontend/        # React frontend application
│   ├── public/             # Static assets
│   ├── src/                # Source files
│   │   ├── components/     # React components
│   │   │   ├── auth/       # Authentication components
│   │   │   ├── calendar/   # Calendar view components
│   │   │   ├── common/     # Shared components
│   │   │   └── time-tracker/ # Time tracking components
│   │   ├── assets/         # Images and other assets
│   │   └── App.jsx         # Main application component
├── chrony-backend/         # Node.js backend application
│   ├── api/                # API routes
│   ├── models/             # MongoDB models
│   └── index.js            # Entry point
└── README.md               # This file
```

## Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Frontend Setup
```bash
cd chrony-frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd chrony-backend
npm install
# Create a .env file with your MongoDB connection string:
# mongoURI=your_mongodb_connection_string
npm start
```

## Usage

### User Management
- Register/login to access personal calendar and time tracking
- User preferences and settings storage
- Profile management

### Calendar Management
- View and manage events in weekly or daily views
- Create events with three different flexibility levels
- Drag-and-drop rescheduling
- Color-coded event visualization

### Time Tracking
- Start/stop timer for activities
- Link tracked time to scheduled events
- Manual entry for unplanned activities
- View tracked time in list or timeline format

### Analytics
- View time distribution by category
- Compare planned vs. actual time usage
- Analyze productivity patterns
- Export data in standard formats

## Research Background
The system is based on extensive research into time management practices and optimization algorithms:

- Uses Forward Checking with Backtracking for efficient schedule management
- Implements Dynamic Time Warping (DTW) for comparing planned vs. actual time patterns
- Designed with insights from usability studies on digital calendar interfaces

## Development Status
See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current development status and roadmap.

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution workflow.

## License
This project is created as a final project for a Computer Science degree and is intended as a proof of concept.

## Team
- Dor Adiv
- Michael Arie
