import React, { useState } from "react";

const SetupPage = ({ user, onSetupComplete }) => {
  const [activeStartTime, setActiveStartTime] = useState("07:00");
  const [activeEndTime, setActiveEndTime] = useState("22:00");
  const [restDay, setRestDay] = useState("sunday");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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

  const calculateActiveHours = () => {
    const [startHour, startMin] = activeStartTime.split(":").map(Number);
    const [endHour, endMin] = activeEndTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;

    return Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate time selection
      if (activeStartTime >= activeEndTime) {
        alert("End time must be after start time");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);

    try {
      if (!user || !user.userId) {
        alert("User not found. Please log in again.");
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
        // Update localStorage with settings
        const updatedUser = {
          ...user,
          settings: data.settings,
          setupCompleted: true, // Mark setup as completed
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Notify parent that setup is complete
        onSetupComplete(updatedUser);
      } else {
        alert(data.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-[#00AFB9] to-[#0081A7] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-white">⏰</span>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome to Chrony!
        </h2>
        <p className="text-gray-600">
          Let's set up your schedule preferences to get started
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">
          What are active hours?
        </h3>
        <p className="text-sm text-blue-700">
          These are the hours when you're available for scheduled activities.
          Chrony will only schedule events during these times.
        </p>
      </div>

      <div className="text-left">
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          Set Your Active Hours
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={activeStartTime}
              onChange={(e) => setActiveStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFB9]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={activeEndTime}
              onChange={(e) => setActiveEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFB9]"
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-600">
            <strong>Preview:</strong> {formatTimeDisplay(activeStartTime)} -{" "}
            {formatTimeDisplay(activeEndTime)}
            <span className="ml-2 text-gray-500">
              ({calculateActiveHours()} hours per day)
            </span>
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-[#F07167] to-[#FED9B7] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-white">🏖️</span>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Choose Your Rest Day
        </h2>
        <p className="text-gray-600">
          Select the day when you want to avoid scheduling events
        </p>
      </div>

      <div className="text-left">
        <div className="space-y-3">
          <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="restDay"
              value="saturday"
              checked={restDay === "saturday"}
              onChange={(e) => setRestDay(e.target.value)}
              className="mr-4 text-[#00AFB9]"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-800">Saturday</div>
              <div className="text-sm text-gray-500">
                Working days: Sunday - Friday
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Popular in Middle East, Some Asian countries
              </div>
            </div>
          </label>

          <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="restDay"
              value="sunday"
              checked={restDay === "sunday"}
              onChange={(e) => setRestDay(e.target.value)}
              className="mr-4 text-[#00AFB9]"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-800">Sunday</div>
              <div className="text-sm text-gray-500">
                Working days: Monday - Saturday
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Popular in Western countries
              </div>
            </div>
          </label>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mt-4">
          <p className="text-sm text-gray-600">
            <strong>Your schedule:</strong> {getWorkingDays()}
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-[#FDFCDC] to-[#FED9B7] rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">All Set!</h2>
        <p className="text-gray-600">
          Review your settings before we get started
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="font-medium text-gray-700 mb-4">
          Your Schedule Settings
        </h3>

        <div className="space-y-3 text-left">
          <div className="flex justify-between">
            <span className="text-gray-600">Active Hours:</span>
            <span className="font-medium">
              {formatTimeDisplay(activeStartTime)} -{" "}
              {formatTimeDisplay(activeEndTime)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Daily Available Time:</span>
            <span className="font-medium">{calculateActiveHours()} hours</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Working Days:</span>
            <span className="font-medium">{getWorkingDays()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Rest Day:</span>
            <span className="font-medium">
              {restDay === "saturday" ? "Saturday" : "Sunday"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">What's Next?</h4>
        <p className="text-sm text-blue-700">
          You can start creating events and tracking time. Chrony will
          intelligently schedule your flexible and fluid events within your
          active hours!
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCDC] to-[#FED9B7] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full ${
                  step <= currentStep ? "bg-[#00AFB9]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentStep === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            disabled={currentStep === 1}
          >
            Back
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-[#00AFB9] text-white rounded-lg hover:bg-[#0081A7] transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="px-6 py-2 bg-[#00AFB9] text-white rounded-lg hover:bg-[#0081A7] transition-colors disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
