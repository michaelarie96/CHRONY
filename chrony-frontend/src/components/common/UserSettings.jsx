import React, { useState, useEffect } from "react";
import { useNotification } from "../../hooks/useNotification";

const UserSettings = ({ onSave }) => {
  // Default settings
  const [activeStartTime, setActiveStartTime] = useState("07:00");
  const [activeEndTime, setActiveEndTime] = useState("22:00");
  const [restDay, setRestDay] = useState("sunday");
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({});

  // Get notification functions
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  // Load settings from user data when component mounts
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.settings) {
      const settings = user.settings;
      setActiveStartTime(settings.activeStartTime || "07:00");
      setActiveEndTime(settings.activeEndTime || "22:00");
      setRestDay(settings.restDay || "sunday");

      // Store original settings to track changes
      setOriginalSettings({
        activeStartTime: settings.activeStartTime || "07:00",
        activeEndTime: settings.activeEndTime || "22:00",
        restDay: settings.restDay || "sunday",
      });
    }
    setHasChanges(false);
  }, []);

  // Track changes
  useEffect(() => {
    const hasChanged =
      originalSettings.activeStartTime !== activeStartTime ||
      originalSettings.activeEndTime !== activeEndTime ||
      originalSettings.restDay !== restDay;
    setHasChanges(hasChanged);
  }, [activeStartTime, activeEndTime, restDay, originalSettings]);

  const formatTimeDisplay = (time) => {
    const [hours, minutes] = time.split(":");
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getWorkingDays = () => {
    if (restDay === "saturday") {
      return "Sunday to Friday";
    } else {
      return "Monday to Saturday";
    }
  };

  // Enhanced validation with specific error messages
  const validateSettings = () => {
    if (activeStartTime >= activeEndTime) {
      showError(
        "Invalid Time Range",
        `End time (${formatTimeDisplay(
          activeEndTime
        )}) must be after start time (${formatTimeDisplay(activeStartTime)})`
      );
      return false;
    }

    // Check for very short active periods (less than 4 hours)
    const [startHour] = activeStartTime.split(":").map(Number);
    const [endHour] = activeEndTime.split(":").map(Number);
    const activeDuration = endHour - startHour;

    if (activeDuration < 4) {
      showWarning(
        "Short Active Period",
        `Your active period is only ${activeDuration} hours. This may limit scheduling options.`,
        { autoClose: false }
      );
    }

    return true;
  };

  // Generate detailed change summary for success message
  const getChangesSummary = () => {
    const changes = [];

    if (
      originalSettings.activeStartTime !== activeStartTime ||
      originalSettings.activeEndTime !== activeEndTime
    ) {
      const oldRange = `${formatTimeDisplay(
        originalSettings.activeStartTime
      )} - ${formatTimeDisplay(originalSettings.activeEndTime)}`;
      const newRange = `${formatTimeDisplay(
        activeStartTime
      )} - ${formatTimeDisplay(activeEndTime)}`;
      changes.push(`Active hours: ${oldRange} → ${newRange}`);
    }

    if (originalSettings.restDay !== restDay) {
      const oldRestDay =
        originalSettings.restDay === "saturday" ? "Saturday" : "Sunday";
      const newRestDay = restDay === "saturday" ? "Saturday" : "Sunday";
      changes.push(`Rest day: ${oldRestDay} → ${newRestDay}`);
    }

    return changes;
  };

  const handleSave = async () => {
    // Frontend validation with enhanced messages
    if (!validateSettings()) {
      return;
    }

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        showError(
          "Authentication Error",
          "User session expired. Please log in again."
        );
        return;
      }

      const response = await fetch("http://localhost:3000/api/user/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          activeStartTime,
          activeEndTime,
          restDay,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage with new settings
        const updatedUser = {
          ...user,
          settings: data.settings,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update original settings to track future changes
        setOriginalSettings({
          activeStartTime,
          activeEndTime,
          restDay,
        });

        setHasChanges(false);

        // Notify parent component
        if (onSave) {
          onSave(data.settings);
        }

        // Generate detailed success message
        const changesSummary = getChangesSummary();
        const successMessage =
          changesSummary.length > 0
            ? `Settings updated: ${changesSummary.join(", ")}`
            : "Settings saved successfully";

        showSuccess("Settings Saved", successMessage, { duration: 5000 });

        // Show informational message about impact
        showInfo(
          "Schedule Impact",
          "These changes will affect how future events are scheduled. Existing events won't be automatically moved.",
          { duration: 6000 }
        );
      } else {
        // Handle different types of server errors
        if (response.status === 400) {
          showError(
            "Invalid Settings",
            data.message ||
              "The settings you entered are not valid. Please check and try again."
          );
        } else if (response.status === 404) {
          showError(
            "User Not Found",
            "Your user account could not be found. Please log in again."
          );
        } else {
          showError(
            "Server Error",
            data.message ||
              "The server encountered an error while saving your settings."
          );
        }
      }
    } catch (error) {
      console.error("Error saving settings:", error);

      // Distinguish between network errors and other errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        showError(
          "Connection Error",
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      } else {
        showError(
          "Unexpected Error",
          "An unexpected error occurred while saving your settings. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          User Settings
        </h2>

        {/* Active Hours Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">
            Active Hours
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Events will only be scheduled during these hours
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={activeStartTime}
                onChange={(e) => setActiveStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFB9]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={activeEndTime}
                onChange={(e) => setActiveEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFB9]"
                disabled={loading}
              />
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            <strong>Preview:</strong> {formatTimeDisplay(activeStartTime)} -{" "}
            {formatTimeDisplay(activeEndTime)}
          </div>
        </div>

        {/* Rest Day Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Rest Day</h3>
          <p className="text-sm text-gray-500 mb-4">
            Choose your day off (no events will be scheduled)
          </p>

          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="restDay"
                value="saturday"
                checked={restDay === "saturday"}
                onChange={(e) => setRestDay(e.target.value)}
                className="mr-3"
                disabled={loading}
              />
              <div>
                <div className="font-medium">Saturday</div>
                <div className="text-sm text-gray-500">
                  Working days: Sunday - Friday
                </div>
              </div>
            </label>

            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="restDay"
                value="sunday"
                checked={restDay === "sunday"}
                onChange={(e) => setRestDay(e.target.value)}
                className="mr-3"
                disabled={loading}
              />
              <div>
                <div className="font-medium">Sunday</div>
                <div className="text-sm text-gray-500">
                  Working days: Monday - Saturday
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              • Events scheduled: {formatTimeDisplay(activeStartTime)} -{" "}
              {formatTimeDisplay(activeEndTime)}
            </div>
            <div>• Working days: {getWorkingDays()}</div>
            <div>
              • Rest day: {restDay === "saturday" ? "Saturday" : "Sunday"}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded transition-colors ${
              hasChanges && !loading
                ? "bg-[#00AFB9] text-white hover:bg-[#0081A7]"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!hasChanges || loading}
          >
            {loading ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Changing these settings will affect how
            future events are scheduled. Existing events won't be automatically
            rescheduled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
