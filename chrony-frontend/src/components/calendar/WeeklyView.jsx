import React, { useState, useRef, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import EventForm from './EventForm';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';

// for 24 hours time format
const formats = {
  timeGutterFormat: 'HH:mm',
  eventTimeRangeFormat: ({ start, end }, culture, local) =>
    `${local.format(start, 'HH:mm', culture)} – ${local.format(end, 'HH:mm', culture)}`
};

const eventTypes = {
  fixed: { name: "Fixed", color: "#0081A7", bgColor: "#0081A720" },
  flexible: { name: "Flexible", color: "#00AFB9", bgColor: "#00AFB920" },
  fluid: { name: "Fluid", color: "#F07167", bgColor: "#F0716720" }
};

// Set up the localizer for the calendar
const localizer = momentLocalizer(moment);


const WeeklyView = () => {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('week');
  const [scrollPosition, setScrollPosition] = useState(0);
  const calendarRef = useRef(null);

  // Fetch user events from backend
const fetchUserEvents = async (setEvents) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.userId) {
      console.error('No user found in localStorage');
      return;
    }

    const response = await fetch(`http://localhost:3000/api/event?userId=${user.userId}`);
    const data = await response.json();

    if (response.ok) {
      const fixedEvents = data.map(ev => ({
        ...ev,
        id: ev._id,                   // fix _id to id for react-big-calendar
        start: new Date(ev.start),
        end: new Date(ev.end)
      }));

      setEvents(fixedEvents);
    } else {
      console.error('Failed to load events:', data.error);
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
};

const handleDeleteEvent = async (eventId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/event/${eventId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      console.log('Event deleted successfully');

      // Remove deleted event from the local events state
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    } else {
      console.error('Failed to delete event');
    }
  } catch (error) {
    console.error('Error deleting event:', error);
  }

  setShowForm(false); // Close the event form after delete
};
  // Function to find the scrollable container in react-big-calendar
  const getScrollContainer = () => {
    if (!calendarRef.current) return null;

    // Try multiple selectors as the structure might vary
    const container =
      calendarRef.current.querySelector('.rbc-time-content') ||
      calendarRef.current.querySelector('.rbc-time-view') ||
      calendarRef.current.querySelector('.rbc-calendar');

    return container;
  };


  const handleSaveEvent = async (eventData) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
  
      const completeEventData = {
        ...eventData,
        user: user.userId
      };
  
      let response;
      if (selectedEvent) {
        //  Update existing event
        response = await fetch(`http://localhost:3000/api/event/${selectedEvent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(completeEventData)
        });
      } else {
        //  Create new event
        response = await fetch('http://localhost:3000/api/event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(completeEventData)
        });
      }
  
      const result = await response.json();
  
      if (response.ok) {
        console.log('Event saved or updated successfully:', result);
  
        const fixedResult = {
          ...result,
          id: result._id,
          start: new Date(result.start),
          end: new Date(result.end)
        };
  
        if (selectedEvent) {
          //  Update event in UI
          setEvents(events.map(e => (e.id === fixedResult.id ? fixedResult : e)));
        } else {
          // Add new event to UI
          setEvents([...events, fixedResult]);
        }
      } else {
        console.error('Failed to save or update event:', result.error);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  
    setShowForm(false); // Close form after save
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
      fetchUserEvents(setEvents);
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

  useEffect(() => {
    fetchUserEvents(setEvents);  // Fetch all user's events when the page first loads
  }, []);

  // Custom event display component
  const EventComponent = ({ event }) => (
    <div
      className="h-full rounded px-2 py-1 overflow-hidden"
      style={{ backgroundColor: eventTypes[event.type].bgColor, borderLeft: `3px solid ${eventTypes[event.type].color}` }}
    >
      <div className="text-xs inline-block px-1 py-0.5 rounded mb-1" style={{ backgroundColor: eventTypes[event.type].color, color: 'white' }}>
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

  // Save the event (new or edited)
  

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
          <h2 className="text-xl font-medium text-gray-700 mb-4">{selectedEvent ? 'Edit Event' : 'Add New Event'}</h2>
          <EventForm
            event={selectedEvent || (selectedSlot ? { start: selectedSlot.start, end: selectedSlot.end } : null)}
            onSave={handleSaveEvent}
            onCancel={() => setShowForm(false)}
            onDelete={handleDeleteEvent}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-[75vh]" ref={calendarRef}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={['week', 'day']}
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
                color: 'black',
                border: '0',
                borderRadius: '4px'
              }
            })}
            components={{
              event: EventComponent
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