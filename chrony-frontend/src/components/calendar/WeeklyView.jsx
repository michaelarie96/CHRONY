import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import EventForm from './EventForm';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';

// for 24 hours time format
const formats = {
  timeGutterFormat: 'HH:mm',        // time gutter on the side
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


// Sample initial events - these would come from an API
const initialEvents = [
  {
    id: 1,
    title: 'Introduction to CS Lecture',
    start: new Date(2025, 3, 21, 10, 0),  // April 21, 2025, 10:00 AM
    end: new Date(2025, 3, 21, 12, 0),    // April 21, 2025, 12:00 PM
    type: 'fixed'
  },
  {
    id: 2,
    title: 'Workout Session',
    start: new Date(2025, 3, 22, 16, 0),  // April 22, 2025, 4:00 PM
    end: new Date(2025, 3, 22, 17, 30),   // April 22, 2025, 5:30 PM
    type: 'flexible'
  },
  {
    id: 3,
    title: 'Reading Assignment',
    start: new Date(2025, 3, 23, 14, 0),  // April 23, 2025, 2:00 PM
    end: new Date(2025, 3, 23, 16, 0),    // April 23, 2025, 4:00 PM
    type: 'fluid'
  }
];

const WeeklyView = () => {
  const [events, setEvents] = useState(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter(e => e.id !== eventId));
    setShowForm(false);
  };


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
    setSelectedEvent(event);
    setShowForm(true);
  };

  // Handler for selecting a time slot
  const handleSelectSlot = (slotInfo) => {
    setSelectedEvent(null);
    setSelectedSlot(slotInfo);
    setShowForm(true);
  };

  // Save the event (new or edited)
  const handleSaveEvent = (eventData) => {
    if (selectedEvent) {
      // Update existing event
      setEvents(events.map(e => e.id === eventData.id ? eventData : e));
    } else {
      // Add new event
      setEvents([...events, eventData]);
    }
    setShowForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Weekly Schedule</h1>
        <button
          onClick={() => {
            setSelectedEvent(null);
            setSelectedSlot({ start: new Date(), end: new Date() });
            setShowForm(true);
          }}
          className="bg-[#00AFB9] hover:bg-[#0081A7] text-white py-2 px-4 rounded flex items-center transition duration-200"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-[75vh]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView="week"
            views={['week', 'day']}
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