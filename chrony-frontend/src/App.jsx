import React, { useEffect, useState } from "react";
import WeeklyView from "./components/calendar/CalendarView";
import TimeTracker from "./components/time-tracker/TimeTracker";
import Analytics from "./components/analytics/Analytics";
import Sidebar from "./components/common/Sidebar";
import AuthPage from "./components/auth/AuthPage";

function App() {
  const [activeView, setActiveView] = useState("calendar");
  const [user, setUser] = useState(null);

  // Check if user is logged in on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (username) => {
    setUser({ username });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // If user is not logged in, show auth page
  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render the appropriate component based on the active view
  const renderView = () => {
    switch (activeView) {
      case "calendar":
        return <WeeklyView />;
      case "time-tracker":
        return <TimeTracker />;
      case "analytics":
        return <Analytics />;
      default:
        return <WeeklyView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem={activeView} onItemClick={setActiveView} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold text-[#0081A7]">
              {activeView === "calendar" && "Calendar"}
              {activeView === "time-tracker" && "Time Tracker"}
              {activeView === "analytics" && "Analytics"}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Welcome, {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto py-6">{renderView()}</main>

        <footer className="bg-white py-4 px-6 border-t border-gray-100">
          <div className="container mx-auto text-center text-sm text-gray-500">
            Developed by Dor Adiv and Michael Arie
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
