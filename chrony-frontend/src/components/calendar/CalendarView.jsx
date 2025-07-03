import React, { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import EventForm from "./EventForm";
import { useNotification } from "../../hooks/useNotification";
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
  const [showMovedEventsModal, setShowMovedEventsModal] = useState(false);
  const [movedEventsData, setMovedEventsData] = useState([]);
  const calendarRef = useRef(null);
  
  // Get notification functions
  const { showSuccess, showError, showMovedEventsNotification } = useNotification();

  // Show moved events details modal
  const handleShowMovedEventsDetails = () => {
    setShowMovedEventsModal(true);
  };

  // Format moved events for display
  const formatMovedEventDetails = (movedEvents) => {
    return movedEvents.map(event => {
      const eventType = eventTypes[event.type] || eventTypes.fixed;
      return {
        title: event.title,
        type: event.type,
        typeColor: eventType.color,
        typeName: eventType.name,
        newTime: `${moment(event.start).format('dddd, MMM D')} at ${moment(event.start).format('h:mm A')} - ${moment(event.end).format('h:mm A')}`
      };
    });
  };

  // Function to fetch user events from backend
  const fetchUserEvents = useCallback(async () => {
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
        const processedEvents = data.map((ev) => ({
          ...ev,
          id: ev._id || ev.id,
          start: new Date(ev.start),
          end: new Date(ev.end),
        }));

        setEvents(processedEvents);
      } else {
        console.error("Failed to load events:", data.error);
        showError("Error", "Failed to load events");
      }
    } catch (error) {
      console.error("Error loading events:", error);
      showError("Network Error", "Failed to load events. Please check your connection.");
    }
  }, [currentDate, currentView, showError]);

  // Effect to fetch events when component mounts or date/view changes
  useEffect(() => {
    fetchUserEvents();
  }, [fetchUserEvents]);

  const handleSaveEvent = async (eventData) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const completeEventData = {
        ...eventData,
        user: user.userId,
      };

      let response;
      if (selectedEvent) {
        // Update existing event
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
      } else {
        // Create new event
        response = await fetch("http://localhost:3000/api/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(completeEventData),
        });
      }

      if (!response.ok) {
        // Handle different types of errors
        const errorData = await response.json();
        
        if (response.status === 409) {
          // Scheduling conflict
          showError("Scheduling Conflict", errorData.error || "Cannot schedule event due to conflicts");
        } else if (response.status === 400) {
          // Validation or constraint error
          showError("Invalid Event", errorData.error || "Event cannot be scheduled with current settings");
        } else {
          // General error
          showError("Error", errorData.error || "Failed to save event");
        }
        return;
      }

      const result = await response.json();
      console.log("Event API response:", result);

      // Handle the new API response format
      if (result.success) {
        // Process the created/updated events
        const processedEvents = (result.events || []).map(event => ({
          ...event,
          id: event._id || event.id,
          start: new Date(event.start),
          end: new Date(event.end),
        }));

        // Update the events state
        if (selectedEvent) {
          // Update existing event
          setEvents(prevEvents => 
            prevEvents.map(e => 
              e.id === selectedEvent.id ? processedEvents[0] : e
            )
          );
        } else {
          // Add new events
          setEvents(prevEvents => [...prevEvents, ...processedEvents]);
        }

        // Handle moved events notification
        if (result.movedEvents && result.movedEvents.length > 0) {
          console.log("Events were moved:", result.movedEvents);
          
          // Store moved events data for modal
          setMovedEventsData(result.movedEvents);
          
          // Show moved events notification
          showMovedEventsNotification(
            result.movedEvents,
            result.message,
            handleShowMovedEventsDetails
          );
        } else {
          // Show simple success notification
          const eventAction = selectedEvent ? "updated" : "created";
          showSuccess("Success", `Event ${eventAction} successfully`);
        }

        // Refresh events to ensure consistency
        await fetchUserEvents();
      } else {
        showError("Error", result.error || "Failed to save event");
      }
    } catch (error) {
      console.error("Error saving event:", error);
      showError("Network Error", "Failed to save event. Please check your connection and try again.");
    }

    setShowForm(false);
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/event/${eventId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        console.log("Event deleted successfully");
        // Remove deleted event from the local events state
        setEvents(events.filter(event => event.id !== eventId));
        
        // Show success notification
        showSuccess("Success", "Event deleted successfully");
      } else {
        console.error("Failed to delete event");
        showError("Error", "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      showError("Network Error", "Failed to delete event. Please check your connection.");
    }

    setShowForm(false);
  };

  // Function to find the scrollable container in react-big-calendar
  const getScrollContainer = () => {
    if (!calendarRef.current) return null;

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
    setScrollPosition(0);
    setCurrentDate(newDate);
  };

  // Handler for changing the view (day, week)
  const handleViewChange = (view) => {
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
            events={events}
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
      
      {/* Moved Events Modal */}
      {showMovedEventsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Events Automatically Moved
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              The following events were rescheduled to make room for your new event:
            </p>
            
            <div className="space-y-3 mb-6">
              {formatMovedEventDetails(movedEventsData).map((event, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 rounded">
                  <div className="flex-shrink-0 mr-3">
                    <span 
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: event.typeColor }}
                    ></span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{event.title}</div>
                    <div className="text-sm text-gray-600">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-2">
                        {event.typeName}
                      </span>
                      {event.newTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowMovedEventsModal(false)}
                className="px-4 py-2 bg-[#00AFB9] text-white rounded hover:bg-[#0081A7] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyView;