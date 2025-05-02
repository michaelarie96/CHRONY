import React, { useState, useRef, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import EventForm from "./EventForm";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

// for 24 hours time format
const formats = {
  timeGutterFormat: "HH:mm",
  eventTimeRangeFormat: ({ start, end }, culture, local) =>
    `${local.format(start, "HH:mm", culture)} – ${local.format(
      end,
      "HH:mm",
      culture
    )}`,
};

const eventTypes = {
  fixed: { name: "Fixed", color: "#0081A7", bgColor: "#0081A720" },
  flexible: { name: "Flexible", color: "#00AFB9", bgColor: "#00AFB920" },
  fluid: { name: "Fluid", color: "#F07167", bgColor: "#F0716720" },
};

// Set up the localizer for the calendar
const localizer = momentLocalizer(moment);

const WeeklyView = () => {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("week");
  const [scrollPosition, setScrollPosition] = useState(0);
  const calendarRef = useRef(null);
  const [displayEvents, setDisplayEvents] = useState([]);

  // Fetch user events from backend
  const fetchUserEvents = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found in localStorage");
        return;
      }

      // Calculate date range for the current view
      const viewStart = moment(currentDate).startOf(currentView).toISOString();
      const viewEnd = moment(currentDate).endOf(currentView).toISOString();

      const response = await fetch(
        `http://localhost:3000/api/event?userId=${user.userId}&start=${viewStart}&end=${viewEnd}`
      );
      const data = await response.json();

      if (response.ok) {
        const fixedEvents = data.map((ev) => ({
          ...ev,
          id: ev._id || ev.id, // Use _id or id (for recurring instances)
          start: new Date(ev.start),
          end: new Date(ev.end),
          isRecurringInstance: ev.isRecurringInstance || false,
          originalEventId: ev.originalEventId,
        }));

        setEvents(fixedEvents);
      } else {
        console.error("Failed to load events:", data.error);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  // Generate recurring events for the current view
  const generateRecurringInstances = () => {
    if (!events.length) return [];

    let allInstances = [];

    // Start with regular events
    const regularEvents = events.filter((event) => !event.isRecurringInstance);
    allInstances = [...regularEvents];

    // Add recurring instances for each base event with recurrence
    const recurringEvents = events.filter(
      (event) =>
        event.recurrence &&
        event.recurrence.enabled &&
        !event.isRecurringInstance
    );

    recurringEvents.forEach((event) => {
      const instances = generateInstancesForEvent(
        event,
        moment(currentDate).startOf(currentView).toDate(),
        moment(currentDate).endOf(currentView).toDate()
      );
      allInstances = [...allInstances, ...instances];
    });

    return allInstances;
  };

  // Generate instances for a single recurring event
  const generateInstancesForEvent = (event, startDate, endDate) => {
    const instances = [];
    const recurrence = event.recurrence;

    if (!recurrence || !recurrence.enabled) {
      return instances;
    }

    const eventStart = new Date(event.start);
    const duration = new Date(event.end) - eventStart;

    let currentDate = new Date(eventStart);

    while (currentDate <= endDate) {
      // Skip the original event date and any exceptions
      const isException =
        recurrence.exceptions &&
        recurrence.exceptions.some((exception) =>
          moment(exception)
            .startOf("day")
            .isSame(moment(currentDate).startOf("day"))
        );

      if (
        currentDate >= startDate &&
        !isException &&
        currentDate > eventStart
      ) {
        // Create an instance with the same duration
        const instanceStart = new Date(currentDate);
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        instances.push({
          ...event,
          id: `${event.id}_${instanceStart.getTime()}`,
          start: instanceStart,
          end: instanceEnd,
          isRecurringInstance: true,
          originalEventId: event.id,
          title: `${event.title}${
            recurrence.frequency === "daily"
              ? " (Daily)"
              : recurrence.frequency === "weekly"
              ? " (Weekly)"
              : " (Monthly)"
          }`,
        });
      }

      // Move to next occurrence based on frequency
      if (recurrence.frequency === "daily") {
        currentDate.setDate(currentDate.getDate() + recurrence.interval);
      } else if (recurrence.frequency === "weekly") {
        currentDate.setDate(currentDate.getDate() + 7 * recurrence.interval);
      } else if (recurrence.frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
      }
    }

    return instances;
  };

  // Effect to generate display events when events or view changes
  useEffect(() => {
    const generatedEvents = generateRecurringInstances();
    setDisplayEvents(generatedEvents);
  }, [events, currentDate, currentView]);

  // Effect to fetch events when component mounts or date/view changes
  useEffect(() => {
    fetchUserEvents();
  }, [currentDate, currentView]);


  const handleSaveEvent = async (eventData) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const completeEventData = {
        ...eventData,
        user: user.userId,
      };

      let response;
      if (selectedEvent && !selectedEvent.isRecurringInstance) {
        //  Update existing event
        response = await fetch(
          `http://localhost:3000/api/event/${selectedEvent.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(completeEventData),
          }
        );
      } else if (selectedEvent && selectedEvent.isRecurringInstance) {
        // If editing a recurring instance, we need to:
        // 1. Add an exception to the original event
        // 2. Create a new event with the modified data

        // Add exception to original event
        const originalEventId = selectedEvent.originalEventId;
        const instanceDate = moment(selectedEvent.start).format("YYYY-MM-DD");

        await fetch(
          `http://localhost:3000/api/event/${originalEventId}/exception`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ exceptionDate: instanceDate }),
          }
        );

        // Create new event
        response = await fetch("http://localhost:3000/api/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(completeEventData),
        });
      } else {
        //  Create new event
        response = await fetch("http://localhost:3000/api/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(completeEventData),
        });
      }

      const result = await response.json();

      if (response.ok) {
        console.log("Event saved or updated successfully:", result);

        const fixedResult = {
          ...result,
          id: result._id || result.id,
          start: new Date(result.start),
          end: new Date(result.end),
        };

        // Update events state depending on the operation
        if (selectedEvent && !selectedEvent.isRecurringInstance) {
          // Update event
          setEvents(
            events.map((e) => (e.id === fixedResult.id ? fixedResult : e))
          );
        } else {
          // Add new event
          setEvents([...events, fixedResult]);
        }

        // Refresh events to update recurring instances
        fetchUserEvents();
      } else {
        console.error("Failed to save or update event:", result.error);
      }
    } catch (error) {
      console.error("Error saving event:", error);
    }

    setShowForm(false); // Close form after save
  };

  const handleDeleteEvent = async (eventId, deleteAll = false) => {
    try {
      const event = selectedEvent;
      const isRecurringInstance = event.isRecurringInstance;

      // If it's a recurring instance, we need to add an exception to the parent event
      if (isRecurringInstance && !deleteAll) {
        const originalEventId = event.originalEventId;
        const instanceDate = moment(event.start).format("YYYY-MM-DD");

        const response = await fetch(
          `http://localhost:3000/api/event/${originalEventId}/exception`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ exceptionDate: instanceDate }),
          }
        );

        if (response.ok) {
          console.log("Exception added for recurring event instance");
          // Update the local events list with the exception
          const updatedEvents = events.map((e) => {
            if (e.id === originalEventId) {
              if (!e.recurrence.exceptions) {
                e.recurrence.exceptions = [];
              }
              e.recurrence.exceptions.push(new Date(instanceDate));
              return e;
            }
            return e;
          });

          setEvents(updatedEvents);
        } else {
          console.error("Failed to add exception");
        }
      } else {
        // For regular events or when deleting all recurring instances
        const idToDelete = isRecurringInstance
          ? event.originalEventId
          : eventId;
        const response = await fetch(
          `http://localhost:3000/api/event/${idToDelete}${
            deleteAll ? "?deleteAll=true" : ""
          }`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          console.log("Event deleted successfully");
          // Remove deleted event from the local events state
          setEvents((prevEvents) =>
            prevEvents.filter(
              (event) =>
                !(
                  event.id === idToDelete ||
                  event.originalEventId === idToDelete
                )
            )
          );
        } else {
          console.error("Failed to delete event");
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }

    setShowForm(false); // Close the event form after delete
  };

  // Function to find the scrollable container in react-big-calendar
  const getScrollContainer = () => {
    if (!calendarRef.current) return null;

    // Try multiple selectors as the structure might vary
    const container =
      calendarRef.current.querySelector(".rbc-time-content") ||
      calendarRef.current.querySelector(".rbc-time-view") ||
      calendarRef.current.querySelector(".rbc-calendar");

    return container;
  };

  // Function to save current scroll position
  const saveScrollPosition = () => {
    const container = getScrollContainer();
    if (container) {
      setScrollPosition(container.scrollTop);
    }
  };

  // Effect to restore scroll position when form is closed
  useEffect(() => {
    if (!showForm && scrollPosition !== 0) {
      // Use a short timeout to ensure the DOM is updated
      const timer = setTimeout(() => {
        const container = getScrollContainer();
        if (container) {
          container.scrollTop = scrollPosition;
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [showForm, scrollPosition]);

  // Custom event display component
  const EventComponent = ({ event }) => (
    <div
      className="h-full rounded px-2 py-1 overflow-hidden"
      style={{
        backgroundColor: eventTypes[event.type].bgColor,
        borderLeft: `3px solid ${eventTypes[event.type].color}`,
      }}
    >
      <div
        className="text-xs inline-block px-1 py-0.5 rounded mb-1"
        style={{
          backgroundColor: eventTypes[event.type].color,
          color: "white",
        }}
      >
        {eventTypes[event.type].name}
      </div>
      <div className="font-medium text-gray-800 text-sm">{event.title}</div>
      {event.isRecurringInstance && (
        <div className="text-xs text-gray-600">Recurring</div>
      )}
    </div>
  );

  // Handler for clicking on an event
  const handleSelectEvent = (event) => {
    saveScrollPosition();
    setSelectedEvent(event);
    setShowForm(true);
  };

  // Handler for selecting a time slot
  const handleSelectSlot = (slotInfo) => {
    saveScrollPosition();
    setSelectedEvent(null);
    setSelectedSlot(slotInfo);
    setShowForm(true);
  };

  // Handler for navigating between dates
  const handleNavigate = (newDate) => {
    // Reset scroll position when navigating to a different date
    setScrollPosition(0);
    setCurrentDate(newDate);
  };

  // Handler for changing the view (day, week)
  const handleViewChange = (view) => {
    // Reset scroll position when changing view type
    setScrollPosition(0);
    setCurrentView(view);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Schedule</h1>
        <button
          onClick={() => {
            saveScrollPosition();
            setSelectedEvent(null);
            setSelectedSlot({ start: new Date(), end: new Date() });
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-[#00AFB9] to-[#0081A7] hover:bg-gradient-to-l text-white hover:text-gray-800 py-2 px-4 rounded flex items-center transition-all duration-300 hover:shadow-md font-medium"
        >
          <span className="mr-1 text-lg">+</span> Add Event
        </button>
      </div>

      {showForm ? (
        <div className="mb-8">
          <h2 className="text-xl font-medium text-gray-700 mb-4">
            {selectedEvent ? "Edit Event" : "Add New Event"}
          </h2>
          <EventForm
            event={
              selectedEvent ||
              (selectedSlot
                ? { start: selectedSlot.start, end: selectedSlot.end }
                : null)
            }
            onSave={handleSaveEvent}
            onCancel={() => setShowForm(false)}
            onDelete={handleDeleteEvent}
          />
        </div>
      ) : (
        <div
          className="bg-white rounded-lg shadow-sm border border-gray-100 h-[75vh]"
          ref={calendarRef}
        >
          <Calendar
            localizer={localizer}
            events={displayEvents}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={["week", "day"]}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            view={currentView}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: eventTypes[event.type].bgColor,
                borderLeft: `3px solid ${eventTypes[event.type].color}`,
                color: "black",
                border: "0",
                borderRadius: "4px",
              },
            })}
            components={{
              event: EventComponent,
            }}
            formats={formats}
            className="chrony-calendar"
          />
        </div>
      )}
    </div>
  );
};

export default WeeklyView;
