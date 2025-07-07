import React, { useState, useEffect } from "react";
import moment from "moment";
import { useNotification } from "../../hooks/useNotification";

const TimeEntryForm = ({ entry, events, onSave, onCancel, onDelete }) => {
  console.log("Entry received in form:", entry);
  console.log("Events received in form:", events);

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

      if (entry.end) {
        const end = moment(entry.end);
        setEndDate(end.format("YYYY-MM-DD"));
        setEndTime(end.format("HH:mm"));
      } else {
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
  }, [entry]);

  // Load categories
  useEffect(() => {
    const savedCategories = localStorage.getItem("timeTrackerCategories");
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

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

    if (!startDate || !startTime || !endDate || !endTime) {
      showError("Validation Error", "Please fill in all date and time fields");
      return false;
    }

    // Create start and end dates by combining date and time
    const start = moment(`${startDate} ${startTime}`);
    const end = moment(`${endDate} ${endTime}`);

    // Validate start/end time logic
    if (!start.isValid() || !end.isValid()) {
      showError("Invalid Time", "Please check your date and time entries");
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
      // Allow user to continue, just warn them
    }

    // Check for entries in the future (more than 1 hour from now)
    const now = moment();
    if (start.isAfter(now.clone().add(1, "hour"))) {
      showWarning(
        "Future Entry",
        "This entry is scheduled for the future. Is this intentional?",
        { autoClose: false }
      );
      // Allow user to continue, just warn them
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
      // Create start and end dates by combining date and time
      const start = moment(`${startDate} ${startTime}`).toDate();
      const end = moment(`${endDate} ${endTime}`).toDate();

      // Calculate duration in seconds
      const duration = moment(end).diff(moment(start), "seconds");

      const updatedEntry = {
        id: entry?.id || Date.now(),
        title: title.trim(),
        category,
        eventId: eventId || null,
        start,
        end,
        duration,
        isRunning: false,
      };

      // Show progress notification
      const operation = entry ? "Saving changes" : "Creating time entry";
      showInfo("Processing", `${operation}...`);

      await onSave(updatedEntry);

      // Success notification will be shown by parent component
      // or we can show it here if parent doesn't handle it
      const durationText = moment.utc(duration * 1000).format("HH:mm:ss");
      const linkedEvent =
        eventId && events.find((e) => (e._id || e.id) === eventId);

      let successMessage = `Time entry "${title.trim()}" ${
        entry ? "updated" : "created"
      } (${durationText})`;
      if (linkedEvent) {
        successMessage += ` and linked to "${linkedEvent.title}"`;
      }

      showSuccess(entry ? "Entry Updated" : "Entry Created", successMessage, {
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

    try {
      const entryTitle = entry.title || "Untitled entry";

      // Show progress notification
      showInfo("Deleting", `Deleting "${entryTitle}"...`);

      await onDelete(entry.id);

      // Show success notification
      showSuccess(
        "Entry Deleted",
        `"${entryTitle}" has been permanently deleted`
      );

      // Close the delete confirmation
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting time entry:", error);
      showError(
        "Delete Failed",
        "Failed to delete the time entry. Please try again."
      );
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    setCategory(selectedCategory);

    if (selectedCategory) {
      const categoryData = categories.find(
        (cat) => cat.id === selectedCategory
      );
      if (categoryData) {
        showInfo("Category Selected", `Category set to "${categoryData.name}"`);
      }
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
          placeholder="What did you work on?"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time *
          </label>
          <input
            type="time"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date *
          </label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time *
          </label>
          <input
            type="time"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-[#00AFB9] focus:border-transparent"
            value={category}
            onChange={handleCategoryChange}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
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
              {entry ? "Saving..." : "Creating..."}
            </>
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

        {entry && (
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
