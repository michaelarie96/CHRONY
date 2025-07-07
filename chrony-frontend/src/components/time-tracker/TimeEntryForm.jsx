import React, { useState, useEffect } from "react";
import moment from "moment";
import { useNotification } from "../../hooks/useNotification";
import CategoryDropdown from "./CategoryDropdown";

const TimeEntryForm = ({
  entry,
  events,
  isEditingActiveTimer = false,
  onSave,
  onCancel,
  onDelete,
  onFormStateChange, // NEW: Callback to preserve form state
  timeEntries = [],
}) => {
  console.log("Entry received in form:", entry);
  console.log("Events received in form:", events);
  console.log("Is editing active timer:", isEditingActiveTimer);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState("");
  const [eventId, setEventId] = useState("");
  const [categories, setCategories] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get notification functions
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  // NEW: Notify parent of form state changes
  useEffect(() => {
    if (onFormStateChange && isEditingActiveTimer) {
      const formState = {
        title,
        startDate,
        startTime,
        endDate,
        endTime,
        category,
        eventId
      };
      onFormStateChange(formState);
    }
  }, [title, startDate, startTime, endDate, endTime, category, eventId, onFormStateChange, isEditingActiveTimer]);

  // Load form data when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || "");

      if (entry.start) {
        const start = moment(entry.start);
        setStartDate(start.format("YYYY-MM-DD"));
        setStartTime(start.format("HH:mm"));
      } else {
        const now = moment();
        setStartDate(now.format("YYYY-MM-DD"));
        setStartTime(now.format("HH:mm"));
      }

      // Handle end time properly based on whether entry is completed or active
      if (entry.end && !isEditingActiveTimer) {
        // Entry has end time and we're not editing active timer - show actual end time
        const end = moment(entry.end);
        setEndDate(end.format("YYYY-MM-DD"));
        setEndTime(end.format("HH:mm"));
      } else if (entry.end && isEditingActiveTimer) {
        // This shouldn't happen (active timer with end time), but handle gracefully
        const end = moment(entry.end);
        setEndDate(end.format("YYYY-MM-DD"));
        setEndTime(end.format("HH:mm"));
      } else if (!isEditingActiveTimer) {
        // Completed entry without end time, default to current time
        const now = moment();
        setEndDate(now.format("YYYY-MM-DD"));
        setEndTime(now.format("HH:mm"));
      } else {
        // Active timer - set placeholder end time to current time but fields will be disabled
        const now = moment();
        setEndDate(now.format("YYYY-MM-DD"));
        setEndTime(now.format("HH:mm"));
      }

      setCategory(entry.category || "");
      setEventId(entry.eventId?._id || entry.eventId || "");
    } else {
      // Default to current time for new entries
      const now = moment();
      setStartDate(now.format("YYYY-MM-DD"));
      setStartTime(now.format("HH:mm"));
      setEndDate(now.format("YYYY-MM-DD"));
      setEndTime(now.format("HH:mm"));
    }
  }, [entry, isEditingActiveTimer]);

  // Load categories from database
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
          setCategories(data.categories);

          // Update localStorage cache
          localStorage.setItem(
            "timeTrackerCategories",
            JSON.stringify(data.categories)
          );
        } else {
          console.error("Failed to load categories from database");
          // Fallback to localStorage
          const savedCategories = localStorage.getItem("timeTrackerCategories");
          if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
          }
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        // Fallback to localStorage
        const savedCategories = localStorage.getItem("timeTrackerCategories");
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        }
      }
    };

    loadCategories();
  }, []);

  // Add a new category and automatically select it
  const handleAddCategory = async (categoryName) => {
    const newCategoryObj = {
      id: categoryName.toLowerCase().replace(/\s+/g, "-"),
      name: categoryName.trim(),
      color: "#00AFB9",
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

        // Automatically select the newly added category
        setCategory(newCategoryObj.id);

        // Update localStorage cache
        localStorage.setItem(
          "timeTrackerCategories",
          JSON.stringify(data.categories)
        );

        showSuccess(
          "Category Added",
          `"${categoryName}" has been added and selected`
        );
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

  // Delete a category
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

        showSuccess(
          "Category Deleted",
          `"${categoryName}" has been removed from your categories`
        );
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

  // Set start time to last stop time
  const handleSetToLastStopTime = () => {
    if (!timeEntries || timeEntries.length === 0) {
      showWarning(
        "No Previous Entries",
        "No previous time entries found to use as reference"
      );
      return;
    }

    // Find the most recent completed entry (not the current one being edited)
    const currentEntryId = entry?.id;
    const completedEntries = timeEntries
      .filter((e) => e.end && e.id !== currentEntryId) // Only completed entries, not current one
      .sort((a, b) => new Date(b.end) - new Date(a.end)); // Sort by end time, newest first

    if (completedEntries.length === 0) {
      showWarning(
        "No Completed Entries",
        "No completed time entries found to use as reference"
      );
      return;
    }

    const lastEntry = completedEntries[0];
    const lastEndTime = moment(lastEntry.end);

    setStartDate(lastEndTime.format("YYYY-MM-DD"));
    setStartTime(lastEndTime.format("HH:mm"));

    showInfo(
      "Start Time Updated",
      `Start time set to ${lastEndTime.format(
        "dddd, MMM D [at] h:mm A"
      )} (end of "${lastEntry.title}")`
    );
  };

  // Comprehensive form validation
  const validateForm = () => {
    // Check required fields
    if (!title.trim()) {
      showError(
        "Validation Error",
        "Please enter a description for this time entry"
      );
      return false;
    }

    if (!startDate || !startTime) {
      showError("Validation Error", "Please fill in start date and time");
      return false;
    }

    // For active timers, we don't need to validate end time
    if (!isEditingActiveTimer && (!endDate || !endTime)) {
      showError("Validation Error", "Please fill in end date and time");
      return false;
    }

    // Create start date
    const start = moment(`${startDate} ${startTime}`);
    if (!start.isValid()) {
      showError("Invalid Time", "Please check your start date and time");
      return false;
    }

    // For non-active timers, validate end time
    if (!isEditingActiveTimer) {
      const end = moment(`${endDate} ${endTime}`);
      if (!end.isValid()) {
        showError("Invalid Time", "Please check your end date and time");
        return false;
      }

      if (end.isSameOrBefore(start)) {
        showError("Invalid Time Range", "End time must be after start time");
        return false;
      }

      // Check for unreasonably long entries (more than 24 hours)
      const durationHours = end.diff(start, "hours");
      if (durationHours > 24) {
        showWarning(
          "Long Duration",
          `This entry is ${durationHours} hours long. Are you sure this is correct?`,
          { autoClose: false }
        );
      }
    }

    // Check for entries in the future (more than 1 hour from now)
    const now = moment();
    if (start.isAfter(now.clone().add(1, "hour"))) {
      showWarning(
        "Future Entry",
        "This entry is scheduled for the future. Is this intentional?",
        { autoClose: false }
      );
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run validation
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create start date
      const start = moment(`${startDate} ${startTime}`).toDate();

      let end = null;
      let duration = 0;

      if (isEditingActiveTimer) {
        // For active timers, don't set end time and calculate current duration
        end = null;
        duration = entry ? entry.duration : 0; // Keep existing duration
      } else {
        // For completed entries, calculate end time and duration
        end = moment(`${endDate} ${endTime}`).toDate();
        duration = moment(end).diff(moment(start), "seconds");
      }

      const updatedEntry = {
        id: entry?.id || Date.now(),
        title: title.trim(),
        category,
        eventId: eventId || null,
        start,
        end,
        duration,
        isRunning: isEditingActiveTimer, // Active timers are still running
      };

      // Show progress notification
      let operation;
      if (isEditingActiveTimer) {
        operation = "Updating active time entry";
      } else if (entry) {
        operation = "Saving changes";
      } else {
        operation = "Creating time entry";
      }

      showInfo("Processing", `${operation}...`);

      await onSave(updatedEntry);

      // Success notification
      let successMessage;
      if (isEditingActiveTimer) {
        successMessage = `Active time entry updated to "${title.trim()}"`;
      } else {
        const durationText = moment.utc(duration * 1000).format("HH:mm:ss");
        const linkedEvent =
          eventId && events.find((e) => (e._id || e.id) === eventId);

        successMessage = `Time entry "${title.trim()}" ${
          entry ? "updated" : "created"
        }`;
        if (!isEditingActiveTimer) {
          successMessage += ` (${durationText})`;
        }
        if (linkedEvent) {
          successMessage += ` and linked to "${linkedEvent.title}"`;
        }
      }

      const successTitle = isEditingActiveTimer
        ? "Time Entry Updated"
        : entry
        ? "Entry Updated"
        : "Entry Created";

      showSuccess(successTitle, successMessage, {
        duration: 4000,
      });
    } catch (error) {
      console.error("Error saving time entry:", error);
      showError(
        "Save Failed",
        "Failed to save the time entry. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entry?.id) {
      showError("Delete Error", "Cannot delete: Entry ID not found");
      return;
    }

    // Don't allow deleting active timers through this form
    if (isEditingActiveTimer) {
      showError(
        "Cannot Delete Active Timer",
        "Please stop the timer first before deleting it"
      );
      return;
    }

    try {
      const entryTitle = entry.title || "Untitled entry";

      showInfo("Deleting", `Deleting "${entryTitle}"...`);

      await onDelete(entry.id);

      showSuccess(
        "Entry Deleted",
        `"${entryTitle}" has been permanently deleted`
      );

      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting time entry:", error);
      showError(
        "Delete Failed",
        "Failed to delete the time entry. Please try again."
      );
    }
  };

  const handleEventLinking = (e) => {
    const selectedEventId = e.target.value;
    setEventId(selectedEventId);

    if (selectedEventId) {
      const linkedEvent = events.find(
        (event) => (event._id || event.id) === selectedEventId
      );
      if (linkedEvent) {
        showInfo(
          "Event Linked",
          `Time entry will be linked to "${linkedEvent.title}"`,
          { duration: 3000 }
        );
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            isEditingActiveTimer
              ? "What are you working on?"
              : "What did you work on?"
          }
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Start Time *
            </label>
            {isEditingActiveTimer && (
              <button
                type="button"
                onClick={handleSetToLastStopTime}
                className="text-xs text-[#00AFB9] hover:text-[#0081A7] underline"
              >
                Set to last stop time
              </button>
            )}
          </div>
          <input
            type="time"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* End time fields - disabled for active timers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date {!isEditingActiveTimer && "*"}
          </label>
          <input
            type="date"
            className={`w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent ${
              isEditingActiveTimer ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isEditingActiveTimer}
            required={!isEditingActiveTimer}
          />
          {isEditingActiveTimer && (
            <p className="text-xs text-gray-500 mt-1">
              End time will be set when timer stops
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time {!isEditingActiveTimer && "*"}
          </label>
          <input
            type="time"
            className={`w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent ${
              isEditingActiveTimer ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={isEditingActiveTimer}
            required={!isEditingActiveTimer}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <CategoryDropdown
            categories={categories}
            selectedCategory={category}
            onSelectCategory={setCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddCategory={handleAddCategory}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link to Event
          </label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={eventId}
            onChange={handleEventLinking}
          >
            <option value="">No linked event</option>
            {events.map((event) => (
              <option key={event._id || event.id} value={event._id || event.id}>
                {event.title} ({moment(event.start).format("MMM D, HH:mm")})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#00AFB9] text-white px-4 py-2 rounded hover:bg-[#0081A7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              {isEditingActiveTimer
                ? "Updating Entry..."
                : entry
                ? "Saving..."
                : "Creating..."}
            </>
          ) : isEditingActiveTimer ? (
            "Update Entry"
          ) : entry ? (
            "Save Changes"
          ) : (
            "Add Entry"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        {/* Delete button - hidden for active timers */}
        {entry && !isEditingActiveTimer && (
          <div className="sm:ml-auto">
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <span className="text-sm text-red-600 self-center">
                  Confirm delete?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  showWarning(
                    "Delete Confirmation",
                    'Click "Yes" to permanently delete this time entry',
                    { autoClose: false }
                  );
                }}
                disabled={isSubmitting}
                className="text-red-600 px-4 py-2 rounded hover:text-red-800 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
};

export default TimeEntryForm;