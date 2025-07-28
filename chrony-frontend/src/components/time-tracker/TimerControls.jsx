import React, { useState, useEffect } from "react";
import moment from "moment";
import CategoryDropdown from "./CategoryDropdown";
import { useNotification } from "../../hooks/useNotification";

const TimerControls = ({ activeEntry, onStart, onStop, onEdit, events }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Get notification functions
  const { showSuccess, showError, showInfo } = useNotification();

  // Load user categories from database on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.userId) {
          console.error("No user found in localStorage");
          return;
        }

        const response = await fetch(
          `http://localhost:3000/api/user/categories/${user.userId}`
        );

        if (response.ok) {
          const data = await response.json();

          // Simply use whatever categories the user has (even if empty)
          setCategories(data.categories);

          // Update localStorage cache
          localStorage.setItem(
            "timeTrackerCategories",
            JSON.stringify(data.categories)
          );
        } else {
          console.error("Failed to load categories from database");
          showError(
            "Categories Error",
            "Failed to load categories from database"
          );
          // Fallback to localStorage if database fails
          const savedCategories = localStorage.getItem("timeTrackerCategories");
          if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
          } else {
            // User has no categories anywhere - start with empty array
            setCategories([]);
          }
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        showError(
          "Network Error",
          "Failed to load categories. Please check your connection."
        );
        // Fallback to localStorage if database fails
        const savedCategories = localStorage.getItem("timeTrackerCategories");
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        } else {
          setCategories([]);
        }
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [showError]);

  // Add a new category with notifications
  const handleAddCategory = async (categoryName) => {
    const newCategoryObj = {
      id: categoryName.toLowerCase().replace(/\s+/g, "-"),
      name: categoryName.trim(),
      color: "#00AFB9", // Default color
    };

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await fetch(
        "http://localhost:3000/api/user/categories",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.userId,
            ...newCategoryObj,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        setCategory(newCategoryObj.id);

        // Update localStorage cache
        localStorage.setItem(
          "timeTrackerCategories",
          JSON.stringify(data.categories)
        );

        // Show success notification
        showSuccess(
          "Category Added",
          `"${categoryName}" has been added to your categories`
        );
        console.log("Category added successfully");
      } else {
        const errorData = await response.json();
        showError(
          "Failed to Add Category",
          errorData.message || "Could not add the category"
        );
      }
    } catch (error) {
      console.error("Error adding category:", error);
      showError(
        "Network Error",
        "Failed to add category. Please check your connection."
      );
    }
  };

  // Delete a category with notifications
  const handleDeleteCategory = async (categoryId) => {
    const categoryToDelete = categories.find((cat) => cat.id === categoryId);
    const categoryName = categoryToDelete ? categoryToDelete.name : categoryId;

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await fetch(
        `http://localhost:3000/api/user/categories/${categoryId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.userId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);

        // If the deleted category was selected, clear the selection
        if (category === categoryId) {
          setCategory("");
        }

        // Update localStorage cache
        localStorage.setItem(
          "timeTrackerCategories",
          JSON.stringify(data.categories)
        );

        // Show success notification
        showSuccess(
          "Category Deleted",
          `"${categoryName}" has been removed from your categories`
        );
        console.log("Category deleted successfully");
      } else {
        const errorData = await response.json();
        showError(
          "Failed to Delete Category",
          errorData.message || "Could not delete the category"
        );
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      showError(
        "Network Error",
        "Failed to delete category. Please check your connection."
      );
    }
  };

  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    return moment.utc(seconds * 1000).format("HH:mm:ss");
  };

  // FIXED: Filter for events within a reasonable time range (past 3 days to next 3 days)
  const relevantEvents = events.filter((event) => {
    const now = moment();
    const eventStart = moment(event.start);
    const eventEnd = moment(event.end);

    // Show events from 3 days ago to 3 days from now
    const threeDaysAgo = now.clone().subtract(3, "days").startOf("day");
    const threeDaysFromNow = now.clone().add(3, "days").endOf("day");

    // Include events that either start or end within our time window
    const startsInRange = eventStart.isBetween(
      threeDaysAgo,
      threeDaysFromNow,
      null,
      "[]"
    );
    const endsInRange = eventEnd.isBetween(
      threeDaysAgo,
      threeDaysFromNow,
      null,
      "[]"
    );
    const spansRange =
      eventStart.isBefore(threeDaysAgo) && eventEnd.isAfter(threeDaysFromNow);

    return startsInRange || endsInRange || spansRange;
  });

  // Sort events by start time (most recent/upcoming first)
  const sortedRelevantEvents = relevantEvents.sort((a, b) => {
    const now = moment();
    const aStart = moment(a.start);
    const bStart = moment(b.start);

    // Events happening now or soon should be first
    const aDistance = Math.abs(aStart.diff(now));
    const bDistance = Math.abs(bStart.diff(now));

    return aDistance - bDistance;
  });

  // Helper function to format event display text
  const formatEventDisplayText = (event) => {
    const eventStart = moment(event.start);
    const now = moment();

    if (eventStart.isSame(now, "day")) {
      // Today - show just time
      return `${event.title} (Today ${eventStart.format("HH:mm")})`;
    } else if (eventStart.isSame(now.clone().add(1, "day"), "day")) {
      // Tomorrow
      return `${event.title} (Tomorrow ${eventStart.format("HH:mm")})`;
    } else if (eventStart.isSame(now.clone().subtract(1, "day"), "day")) {
      // Yesterday
      return `${event.title} (Yesterday ${eventStart.format("HH:mm")})`;
    } else {
      // Other days - show day and time
      return `${event.title} (${eventStart.format("ddd MMM D, HH:mm")})`;
    }
  };

  // Handle starting the timer with notifications
  const handleStart = async () => {
    try {
      // Show immediate feedback
      showInfo("Starting Timer", `Starting timer for "${title}"...`);

      await onStart(title, category, selectedEventId || null);

      // Clear the form
      setTitle("");
      setCategory("");
      setSelectedEventId("");

      // Show success notification
      const linkedEvent =
        selectedEventId &&
        events.find((e) => (e._id || e.id) === selectedEventId);
      const successMessage = linkedEvent
        ? `Timer started for "${title}" (linked to ${linkedEvent.title})`
        : `Timer started for "${title}"`;

      showSuccess("Timer Started", successMessage);
    } catch (error) {
      console.error("Failed to start timer:", error);
      showError("Timer Error", "Failed to start the timer. Please try again.");
    }
  };

  // Handle stopping the timer with notifications
  const handleStop = async () => {
    if (!activeEntry) {
      showError("Timer Error", "No active timer to stop");
      return;
    }

    try {
      const timerTitle = activeEntry.title || "Untitled";
      const duration = formatTime(activeEntry.duration || 0);

      // Show immediate feedback
      showInfo("Stopping Timer", "Stopping and saving your timer...");

      await onStop();

      // Show success notification with duration
      showSuccess(
        "Timer Stopped",
        `"${timerTitle}" completed in ${duration}`,
        { duration: 5000 } // Show for 5 seconds since it's important
      );
    } catch (error) {
      console.error("Failed to stop timer:", error);
      showError("Timer Error", "Failed to stop the timer. Please try again.");
    }
  };

  // FIXED: Handle editing active timer
  const handleEdit = () => {
    if (!activeEntry) {
      showError("Timer Error", "No active timer to edit");
      return;
    }

    try {
      console.log(
        "TimerControls: Triggering edit for active timer:",
        activeEntry
      );
      // Call the onEdit function passed from TimeTracker
      onEdit();

      showInfo("Edit Mode", `Opening editor for "${activeEntry.title}"`);
    } catch (error) {
      console.error("Failed to edit timer:", error);
      showError("Edit Error", "Failed to open timer editor. Please try again.");
    }
  };

  // When an event is selected from the dropdown
  const handleEventSelect = (e) => {
    const eventId = e.target.value;
    setSelectedEventId(eventId);

    if (eventId) {
      // Only auto-fill title if current title is empty
      const selectedEvent = events.find(
        (event) => event._id === eventId || event.id === eventId
      );
      if (selectedEvent && !title.trim()) {
        setTitle(selectedEvent.title);
      }

      // Show helpful info
      showInfo(
        "Event Linked",
        `Timer will be linked to "${selectedEvent.title}"`
      );
    }
  };

  return (
    <div className="timer-controls">
      {activeEntry ? (
        // Active timer display and controls
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-medium text-lg mb-1">
                {activeEntry.title || "Untitled"}
              </h3>
              <div className="flex items-center text-sm text-gray-600">
                {activeEntry.category && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">
                    {categories.find((cat) => cat.id === activeEntry.category)
                      ?.name || activeEntry.category}
                  </span>
                )}
                {activeEntry.eventId && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    From Calendar
                  </span>
                )}
              </div>
            </div>
            <div className="text-3xl font-mono font-semibold mt-2 md:mt-0">
              {formatTime(activeEntry.duration || 0)}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleStop}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex-1"
            >
              Stop
            </button>
            {/* FIXED: Use handleEdit instead of onEdit directly */}
            <button
              onClick={handleEdit}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        // Timer creation form
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            <div className="md:col-span-5">
              <input
                type="text"
                placeholder="What are you working on?"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <CategoryDropdown
                categories={categories}
                selectedCategory={category}
                onSelectCategory={setCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleAddCategory}
                disabled={categoriesLoading}
              />
            </div>

            <div className="md:col-span-4">
              <select
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={selectedEventId}
                onChange={handleEventSelect}
              >
                <option value="">Link to Calendar Event</option>
                {sortedRelevantEvents.length > 0 ? (
                  sortedRelevantEvents.map((event) => (
                    <option
                      key={event._id || event.id}
                      value={event._id || event.id}
                    >
                      {formatEventDisplayText(event)}
                    </option>
                  ))
                ) : (
                  <option disabled>No recent events available</option>
                )}
              </select>
              {sortedRelevantEvents.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Events from the past 3 days to next 3 days will appear here
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleStart}
            className="bg-[#00AFB9] w-full md:w-auto text-white px-6 py-2 rounded hover:bg-[#0081A7] transition-colors"
          >
            Start Timer
          </button>
        </div>
      )}
    </div>
  );
};

export default TimerControls;
