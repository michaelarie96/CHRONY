import React, { useState, useEffect, useRef, useCallback } from "react";
import moment from "moment";
import TimerControls from "./TimerControls";
import TimeEntryList from "./TimeEntryList";
import TimeEntryForm from "./TimeEntryForm";
import { useNotification } from "../../hooks/useNotification";
import "./TimeTracker.css";

const TimeTracker = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isEditingActiveTimer, setIsEditingActiveTimer] = useState(false);

  // NEW: Store form state to preserve user changes when timer stops
  const [preservedFormState, setPreservedFormState] = useState(null);

  const timerRef = useRef(null);

  // Get notification functions
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  // Fetch time entries from backend
  const fetchTimeEntries = useCallback(
    async (showLoadingNotification = false) => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.userId) {
          console.error("No user found in localStorage");
          showError(
            "Authentication Error",
            "Please log in again to access your time entries"
          );
          return;
        }

        if (showLoadingNotification) {
          showInfo("Loading", "Refreshing your time entries...");
        }

        const response = await fetch(
          `http://localhost:3000/api/timeEntries/user/${user.userId}`
        );

        if (response.ok) {
          const entriesData = await response.json();
          console.log("Fetched time entries from API:", entriesData);

          const parsedEntries = entriesData.map((entry) => ({
            id: entry._id,
            title: entry.title,
            category: entry.category,
            eventId: entry.event, // FIXED: Keep the original MongoDB ObjectId
            start: new Date(entry.start),
            end: entry.end ? new Date(entry.end) : null,
            duration: entry.duration,
            isRunning: entry.isRunning,
          }));

          console.log(
            "Parsed time entries for frontend:",
            parsedEntries.map((e) => ({
              id: e.id,
              title: e.title,
              eventId: e.eventId,
              eventIdType: typeof e.eventId,
            }))
          );

          setTimeEntries(parsedEntries);

          if (initialLoad && parsedEntries.length === 0) {
            showInfo(
              "Welcome to Time Tracking",
              "Start your first timer to begin tracking your time!",
              { duration: 6000 }
            );
          } else if (showLoadingNotification) {
            showSuccess(
              "Updated",
              `Loaded ${parsedEntries.length} time entries`
            );
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error("Error fetching time entries:", error);
        showError(
          "Loading Error",
          "Failed to load your time entries. Please check your connection and try again."
        );
      }
    },
    [showError, showInfo, showSuccess, initialLoad]
  );

  // Fetch active time entry from backend
  const fetchActiveEntry = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/timeEntries/active/${user.userId}`
      );

      if (response.ok) {
        const activeData = await response.json();
        console.log("Found active timer:", activeData);

        const activeTimer = {
          id: activeData._id,
          title: activeData.title,
          category: activeData.category,
          eventId: activeData.event, // FIXED: Keep the original MongoDB ObjectId
          start: new Date(activeData.start),
          end: null,
          duration: activeData.duration || 0,
          isRunning: true,
        };

        setActiveEntry(activeTimer);

        // Show notification about resumed timer
        const startedAgo = moment().diff(moment(activeTimer.start), "minutes");
        if (startedAgo > 0) {
          showInfo(
            "Timer Resumed",
            `Found running timer for "${activeTimer.title}" (started ${startedAgo} minutes ago)`,
            { duration: 5000 }
          );
        }

        timerRef.current = setInterval(() => {
          setActiveEntry((current) => {
            if (!current) return null;
            const duration = moment().diff(moment(current.start), "seconds");
            return { ...current, duration };
          });
        }, 1000);
      } else if (response.status === 404) {
        console.log("No active timer found");
      } else {
        console.error("Failed to fetch active entry");
        showWarning(
          "Timer Check Failed",
          "Could not check for active timers. You can still start new timers."
        );
      }
    } catch (error) {
      console.error("Error fetching active entry:", error);
      showWarning(
        "Timer Check Failed",
        "Could not check for active timers. You can still start new timers."
      );
    }
  }, [showInfo, showWarning]);

  // Fetch events from backend
  const fetchEvents = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found in localStorage");
        return;
      }

      const startDate = moment().subtract(1, "week").toISOString();
      const endDate = moment().add(2, "weeks").toISOString();

      const response = await fetch(
        `http://localhost:3000/api/event?userId=${user.userId}&start=${startDate}&end=${endDate}`
      );

      if (response.ok) {
        const eventsData = await response.json();
        const parsedEvents = eventsData.map((event) => ({
          ...event,
          id: event._id || event.id,
          _id: event._id, // FIXED: Keep both _id and id for proper matching
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        console.log(
          "Loaded events for time tracking:",
          parsedEvents.map((e) => ({
            id: e.id,
            _id: e._id,
            title: e.title,
          }))
        );

        setEvents(parsedEvents);
        console.log(
          `📅 Loaded ${parsedEvents.length} calendar events for time tracking`
        );
      } else {
        console.error("Failed to fetch events");
        showWarning(
          "Calendar Sync Warning",
          "Could not load calendar events. Timer linking will be limited."
        );
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      showWarning(
        "Calendar Sync Warning",
        "Could not load calendar events. Timer linking will be limited."
      );
    }
  }, [showWarning]);

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        await Promise.all([
          fetchTimeEntries(false), // Don't show loading notification on initial load
          fetchActiveEntry(),
          fetchEvents(),
        ]);

        if (initialLoad) {
          showSuccess(
            "Time Tracker Ready",
            "Your time tracking data has been loaded successfully"
          );
          setInitialLoad(false);
        }
      } catch (error) {
        console.error("Error loading time tracker data:", error);
        showError(
          "Loading Failed",
          "Failed to load time tracking data. Please refresh the page to try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    fetchTimeEntries,
    fetchActiveEntry,
    fetchEvents,
    showSuccess,
    showError,
    initialLoad,
  ]);

  // Start the timer with enhanced error handling
  const startTimer = async (title = "", category = null, eventId = null) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        showError("Authentication Error", "Please log in to start a timer");
        return;
      }

      // Stop any current timer first
      if (activeEntry) {
        showInfo(
          "Switching Timers",
          "Stopping current timer and starting new one..."
        );
        await stopTimer();
      }

      const timeEntryData = {
        title,
        category,
        event: eventId,
        user: user.userId,
        start: new Date(),
        isRunning: true,
      };

      const response = await fetch("http://localhost:3000/api/timeEntries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timeEntryData),
      });

      if (response.ok) {
        const createdEntry = await response.json();
        console.log("Timer started:", createdEntry);

        const newActiveEntry = {
          id: createdEntry._id,
          title: createdEntry.title,
          category: createdEntry.category,
          eventId: createdEntry.event, // FIXED: Use original MongoDB ObjectId
          start: new Date(createdEntry.start),
          end: null,
          duration: 0,
          isRunning: true,
        };

        setActiveEntry(newActiveEntry);

        timerRef.current = setInterval(() => {
          setActiveEntry((current) => {
            if (!current) return null;
            const duration = moment().diff(moment(current.start), "seconds");
            return { ...current, duration };
          });
        }, 1000);

        // Success notification will be handled by TimerControls
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start timer");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
      showError(
        "Timer Start Failed",
        error.message || "Could not start the timer. Please try again."
      );
    }
  };

  // ENHANCED: Stop timer with form state preservation
  const stopTimer = async () => {
    if (!activeEntry) {
      showWarning("No Active Timer", "There is no timer currently running");
      return;
    }

    try {
      clearInterval(timerRef.current);

      const response = await fetch(
        `http://localhost:3000/api/timeEntries/stop/${activeEntry.id}`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        const stoppedEntry = await response.json();
        console.log("Timer stopped:", stoppedEntry);

        const completedEntry = {
          id: stoppedEntry._id,
          title: stoppedEntry.title,
          category: stoppedEntry.category,
          eventId: stoppedEntry.event, // FIXED: Use original MongoDB ObjectId
          start: new Date(stoppedEntry.start),
          end: new Date(stoppedEntry.end),
          duration: stoppedEntry.duration,
          isRunning: false,
        };

        setTimeEntries((prev) => [completedEntry, ...prev]);
        setActiveEntry(null);

        // FIXED: Preserve form state when timer stops during editing
        if (
          isEditingActiveTimer &&
          selectedEntry &&
          selectedEntry.id === activeEntry.id
        ) {
          console.log(
            "Timer stopped while editing - preserving form state and updating entry"
          );
          console.log("Preserved form state:", preservedFormState);

          // Create the updated entry with preserved form changes
          const updatedEntry = {
            ...completedEntry,
          };

          // Apply preserved form state if it exists
          if (preservedFormState) {
            // Convert preserved dates back to Date objects if they were changed
            if (preservedFormState.startDate && preservedFormState.startTime) {
              const preservedStartDate = moment(
                `${preservedFormState.startDate} ${preservedFormState.startTime}`
              );
              if (preservedStartDate.isValid()) {
                updatedEntry.start = preservedStartDate.toDate();
                console.log("Preserved start time:", updatedEntry.start);
              }
            }

            // Preserve other form fields
            if (preservedFormState.title)
              updatedEntry.title = preservedFormState.title;
            if (preservedFormState.category)
              updatedEntry.category = preservedFormState.category;
            if (preservedFormState.eventId)
              updatedEntry.eventId = preservedFormState.eventId;
          }

          setSelectedEntry(updatedEntry);
          setIsEditingActiveTimer(false); // No longer editing active timer

          showInfo(
            "Timer Stopped",
            "Timer stopped. Your unsaved changes have been preserved. You can now edit all fields.",
            { duration: 5000 }
          );
        }

        // Success notification will be handled by TimerControls
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to stop timer");
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      showError(
        "Timer Stop Failed",
        error.message || "Could not stop the timer. Please try again."
      );
    }
  };

  // Handle editing active timer - properly set it as selected entry
  const handleEditActiveTimer = () => {
    if (!activeEntry) {
      showWarning(
        "No Active Timer",
        "There is no timer currently running to edit"
      );
      return;
    }

    console.log("Editing active timer:", activeEntry);
    setSelectedEntry(activeEntry); // Set the active timer as selected entry
    setIsEditingActiveTimer(true); // Mark that we're editing active timer
    setPreservedFormState(null); // Clear any previous preserved state
    setShowForm(true);
    showInfo(
      "Edit Active Timer",
      `Editing running timer "${activeEntry.title}"`
    );
  };

  // Handle editing an entry from the list
  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setIsEditingActiveTimer(false); // This is not editing active timer
    setPreservedFormState(null); // Clear any preserved state
    setShowForm(true);
    showInfo("Edit Mode", `Editing "${entry.title || "Untitled"}" time entry`);
  };

  // NEW: Handle form state changes (called by TimeEntryForm)
  const handleFormStateChange = (formState) => {
    if (isEditingActiveTimer) {
      setPreservedFormState(formState);
    }
  };

  // ENHANCED: Handle saving an entry with active timer logic
  const handleSaveEntry = async (entryData) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        showError("Authentication Error", "Please log in to save time entries");
        return;
      }

      // Check if we're editing an active timer
      if (isEditingActiveTimer && activeEntry) {
        console.log("Updating active timer with new data:", entryData);

        // For active timers, we can update title, category, eventId, and start time
        // But we don't set end time (still running)
        const updateData = {
          title: entryData.title,
          category: entryData.category,
          event: entryData.eventId,
          user: user.userId,
          start: entryData.start,
          isRunning: true,
        };

        const response = await fetch(
          `http://localhost:3000/api/timeEntries/${activeEntry.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          }
        );

        if (response.ok) {
          const updatedEntry = await response.json();
          console.log("Active timer updated:", updatedEntry);

          // Update the active entry with new data
          const updatedActiveEntry = {
            id: updatedEntry._id,
            title: updatedEntry.title,
            category: updatedEntry.category,
            eventId: updatedEntry.event, // FIXED: Use original MongoDB ObjectId
            start: new Date(updatedEntry.start),
            end: null, // Still running
            duration: moment().diff(moment(updatedEntry.start), "seconds"),
            isRunning: true,
          };

          setActiveEntry(updatedActiveEntry);

          showSuccess(
            "Timer Updated",
            `Active timer updated to "${entryData.title}"`
          );
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update active timer");
        }
      } else {
        // Regular entry handling (not active timer)
        const backendData = {
          title: entryData.title,
          start: entryData.start,
          end: entryData.end,
          duration: entryData.duration,
          category: entryData.category,
          event: entryData.eventId,
          user: user.userId,
          isRunning: false,
        };

        let response;
        let savedEntry;

        if (selectedEntry && !isEditingActiveTimer) {
          // Update existing completed entry
          response = await fetch(
            `http://localhost:3000/api/timeEntries/${selectedEntry.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(backendData),
            }
          );
        } else {
          // Create new entry
          response = await fetch("http://localhost:3000/api/timeEntries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(backendData),
          });
        }

        if (response.ok) {
          savedEntry = await response.json();
          console.log("Entry saved successfully:", savedEntry);

          // FIXED: Immediately update local state with new eventId
          if (selectedEntry && !isEditingActiveTimer) {
            // Update existing entry in local state
            setTimeEntries((prev) =>
              prev.map((entry) =>
                entry.id === selectedEntry.id
                  ? {
                      ...entry,
                      title: savedEntry.title,
                      category: savedEntry.category,
                      eventId: savedEntry.event, // Update with new eventId
                      start: new Date(savedEntry.start),
                      end: new Date(savedEntry.end),
                      duration: savedEntry.duration,
                    }
                  : entry
              )
            );
          } else {
            // Add new entry to local state
            const newTimeEntry = {
              id: savedEntry._id,
              title: savedEntry.title,
              category: savedEntry.category,
              eventId: savedEntry.event,
              start: new Date(savedEntry.start),
              end: new Date(savedEntry.end),
              duration: savedEntry.duration,
              isRunning: false,
            };
            setTimeEntries((prev) => [newTimeEntry, ...prev]);
          }

          const operation =
            selectedEntry && !isEditingActiveTimer ? "updated" : "created";
          showSuccess(
            "Saved",
            `Time entry ${operation} and synced successfully`
          );
        } else {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to ${selectedEntry ? "update" : "create"} entry`
          );
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      showError(
        "Save Failed",
        error.message || "Could not save the time entry. Please try again."
      );
    }

    // Close form and reset state
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditingActiveTimer(false);
    setPreservedFormState(null); // Clear preserved state after successful save
  };

  // Handle deleting an entry with enhanced notifications
  const handleDeleteEntry = async (entryId) => {
    try {
      const entryToDelete =
        timeEntries.find((entry) => entry.id === entryId) || selectedEntry;
      const entryTitle = entryToDelete?.title || "time entry";

      const response = await fetch(
        `http://localhost:3000/api/timeEntries/${entryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        console.log("Entry deleted successfully");
        setTimeEntries((prev) => prev.filter((entry) => entry.id !== entryId));

        showSuccess(
          "Deleted",
          `"${entryTitle}" removed and synced successfully`
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      showError(
        "Delete Failed",
        error.message || "Could not delete the time entry. Please try again."
      );
    }

    if (showForm) {
      setShowForm(false);
      setSelectedEntry(null);
      setIsEditingActiveTimer(false);
      setPreservedFormState(null);
    }
  };

  // Calculate today's total time
  const calculateDailyTotal = () => {
    const today = moment().startOf("day");

    const todayEntries = timeEntries.filter((entry) =>
      moment(entry.start).isSame(today, "day")
    );

    const totalSeconds = todayEntries.reduce(
      (total, entry) => total + entry.duration,
      0
    );

    if (activeEntry && moment(activeEntry.start).isSame(today, "day")) {
      return totalSeconds + activeEntry.duration;
    }

    return totalSeconds;
  };

  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    return moment.utc(seconds * 1000).format("HH:mm:ss");
  };

  // FIXED: Get the event associated with an entry (if any)
  const getEventForEntry = (entry) => {
    console.log("=== FIXED TimeTracker getEventForEntry Debug ===");
    console.log("Entry received:", {
      id: entry?.id,
      title: entry?.title,
      eventId: entry?.eventId,
      eventIdType: typeof entry?.eventId,
    });

    // If no eventId, return null
    if (!entry?.eventId) {
      console.log("❌ No eventId found in entry");
      return null;
    }

    // FIXED: Extract the actual ID from the eventId (which might be an object or string)
    let actualEventId;

    if (typeof entry.eventId === "object" && entry.eventId !== null) {
      // If eventId is an object, extract the _id field
      actualEventId = entry.eventId._id?.toString();
      console.log("🔧 Extracted ID from object:", actualEventId);
    } else {
      // If eventId is already a string, use it directly
      actualEventId = entry.eventId?.toString();
      console.log("🔧 Using direct string ID:", actualEventId);
    }

    if (!actualEventId) {
      console.log("❌ Could not extract valid ID from eventId");
      return null;
    }

    console.log("🔍 Looking for event with ID:", actualEventId);
    console.log(
      "📋 Available events:",
      events.map((e) => ({
        id: e.id,
        _id: e._id,
        title: e.title,
      }))
    );

    // Find the event by matching the extracted ID
    const foundEvent = events.find((event) => {
      const eventMongoId = event._id?.toString();
      const eventRegularId = event.id?.toString();

      const matchesMongoId = eventMongoId === actualEventId;
      const matchesRegularId = eventRegularId === actualEventId;

      return matchesMongoId || matchesRegularId;
    });

    console.log(
      "✅ Found event:",
      foundEvent
        ? {
            id: foundEvent.id,
            _id: foundEvent._id,
            title: foundEvent.title,
          }
        : "❌ No event found"
    );

    return foundEvent || null;
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    showInfo("Refreshing", "Updating your time tracking data...");
    await fetchTimeEntries(true);
  };

  // Handle form cancel with proper state reset
  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditingActiveTimer(false);
    setPreservedFormState(null); // Clear any preserved state
    showInfo("Cancelled", "Changes have been discarded");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-[#00AFB9] border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading your time tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-tracker container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Time Tracker</h2>
          <button
            onClick={handleRefresh}
            className="text-[#00AFB9] hover:text-[#0081A7] transition-colors text-sm flex items-center"
            title="Refresh data"
          >
            <span className="mr-1">🔄</span> Refresh
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Today's total</p>
          <h3 className="text-2xl font-semibold">
            {formatTime(calculateDailyTotal())}
          </h3>
        </div>

        <TimerControls
          activeEntry={activeEntry}
          onStart={startTimer}
          onStop={stopTimer}
          onEdit={handleEditActiveTimer}
          events={events}
        />
      </div>

      {showForm ? (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">
            {isEditingActiveTimer
              ? "Edit Active Time Entry"
              : selectedEntry
              ? "Edit Time Entry"
              : "Add Time Entry"}
          </h3>
          {/* ENHANCED: Pass form state change handler */}
          <TimeEntryForm
            entry={selectedEntry}
            events={events}
            timeEntries={timeEntries}
            isEditingActiveTimer={isEditingActiveTimer}
            onSave={handleSaveEntry}
            onCancel={handleCancelForm}
            onDelete={handleDeleteEntry}
            onFormStateChange={handleFormStateChange}
          />
        </div>
      ) : (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setSelectedEntry(null);
              setIsEditingActiveTimer(false);
              setPreservedFormState(null);
              setShowForm(true);
              showInfo("Add Entry", "Creating a new manual time entry");
            }}
            className="bg-[#00AFB9] text-white px-4 py-2 rounded-md hover:bg-[#0081A7] transition-colors flex items-center"
          >
            <span className="mr-2">+</span> Add Time Entry
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Time Entries</h3>
        <TimeEntryList
          entries={timeEntries}
          activeEntry={activeEntry}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
          onContinue={(entry) => {
            showInfo(
              "Continue Timer",
              `Starting new timer based on "${entry.title}"`
            );
            startTimer(entry.title, entry.category, entry.eventId);
          }}
          getEventForEntry={getEventForEntry}
        />
      </div>
    </div>
  );
};

export default TimeTracker;
