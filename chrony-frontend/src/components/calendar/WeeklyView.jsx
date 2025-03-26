import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styled from 'styled-components';

// Set up the localizer for the calendar
const localizer = momentLocalizer(moment);

// Styled components for the calendar
const CalendarContainer = styled.div`
  height: 80vh;
  width: 100vw;
  max-width: 100%;
  padding: 20px;
  
  /* Customize calendar for dark theme */
  .rbc-calendar {
    width: 100%;
    height: 100%;
    background-color: #2a2a2a;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .rbc-header {
    background-color: #333;
    color: white;
    padding: 10px 5px;
    font-weight: bold;
  }
  
  .rbc-time-view, .rbc-month-view {
    border: 1px solid #444;
  }
  
  .rbc-time-content {
    border-top: 1px solid #444;
  }
  
  .rbc-timeslot-group {
    border-bottom: 1px solid #444;
  }
  
  .rbc-day-slot .rbc-time-slot {
    border-top: 1px solid #393939;
  }
  
  .rbc-time-slot {
    min-height: 30px;
  }
  
  .rbc-today {
    background-color: rgba(66, 135, 245, 0.1);
  }
  
  .rbc-current-time-indicator {
    background-color: #f44336;
    height: 2px;
  }
  
  .rbc-btn-group button {
    color: #fff;
    background-color: #333;
    border-color: #444;
  }
  
  .rbc-btn-group button.rbc-active {
    background-color: #4287f5;
    border-color: #4287f5;
  }
  
  .rbc-time-gutter .rbc-timeslot-group {
    min-width: 100px;
  }
  
  .rbc-event {
    border-radius: 4px;
  }
`;

const EventTypeTag = styled.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-right: 5px;
  color: white;
  background-color: ${props => {
    switch(props.eventType) {
      case 'fixed':
        return '#3174ad';
      case 'flexible':
        return '#59a85f';
      case 'fluid':
        return '#e08826';
      default:
        return '#999';
    }
  }};
`;

// Event types with their properties
const eventTypes = {
  fixed: { name: "Fixed", color: "#3174ad" },
  flexible: { name: "Flexible", color: "#59a85f" },
  fluid: { name: "Fluid", color: "#e08826" }
};

// Sample initial events - in a real app these would come from an API
const initialEvents = [
  {
    id: 1,
    title: 'Introduction to CS Lecture',
    start: new Date(2025, 2, 24, 10, 0), // March 24, 2025, 10:00 AM
    end: new Date(2025, 2, 24, 12, 0),   // March 24, 2025, 12:00 PM
    type: 'fixed'
  },
  {
    id: 2,
    title: 'Workout Session',
    start: new Date(2025, 2, 25, 16, 0), // March 25, 2025, 4:00 PM
    end: new Date(2025, 2, 25, 17, 30),  // March 25, 2025, 5:30 PM
    type: 'flexible'
  },
  {
    id: 3,
    title: 'Reading Assignment',
    start: new Date(2025, 2, 26, 14, 0), // March 26, 2025, 2:00 PM
    end: new Date(2025, 2, 26, 16, 0),   // March 26, 2025, 4:00 PM
    type: 'fluid'
  }
];

// Simple form for adding/editing events
const EventForm = ({ event, onSave, onCancel }) => {
  const [title, setTitle] = useState(event ? event.title : '');
  const [start, setStart] = useState(event ? event.start : new Date());
  const [end, setEnd] = useState(event ? event.end : new Date());
  const [type, setType] = useState(event ? event.type : 'fixed');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: event ? event.id : Date.now(),
      title,
      start,
      end,
      type
    });
  };

  const formStyle = {
    padding: '25px', 
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    border: '1px solid #444'
  };
  
  const inputStyle = {
    width: '100%', 
    padding: '10px',
    backgroundColor: '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: 'white',
    fontSize: '14px'
  };
  
  const labelStyle = {
    display: 'block', 
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#ddd',
    textAlign: 'left'
  };
  
  const buttonStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="title" style={labelStyle}>Title:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
          required
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="start" style={labelStyle}>Start Time:</label>
        <input
          type="datetime-local"
          id="start"
          value={moment(start).format('YYYY-MM-DDTHH:mm')}
          onChange={(e) => setStart(new Date(e.target.value))}
          style={inputStyle}
          required
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="end" style={labelStyle}>End Time:</label>
        <input
          type="datetime-local"
          id="end"
          value={moment(end).format('YYYY-MM-DDTHH:mm')}
          onChange={(e) => setEnd(new Date(e.target.value))}
          style={inputStyle}
          required
        />
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={labelStyle}>Event Type:</label>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
          {Object.entries(eventTypes).map(([key, { name, color }]) => (
            <label key={key} style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              padding: '8px 12px', 
              borderRadius: '4px',
              backgroundColor: type === key ? `${color}40` : 'transparent',
              border: `1px solid ${color}`,
              cursor: 'pointer'
            }}>
              <input
                type="radio"
                name="eventType"
                value={key}
                checked={type === key}
                onChange={() => setType(key)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ color: color, fontWeight: type === key ? 'bold' : 'normal' }}>{name}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button 
          type="submit" 
          style={{ 
            ...buttonStyle, 
            backgroundColor: '#4287f5', 
            color: 'white', 
            flex: '1', 
            marginRight: '10px' 
          }}
        >
          Save
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          style={{ 
            ...buttonStyle, 
            backgroundColor: '#444', 
            color: '#ddd',
            flex: '1'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const WeeklyView = () => {
  const [events, setEvents] = useState(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Custom event display component
  const EventComponent = ({ event }) => (
    <div style={{ height: '100%', backgroundColor: eventTypes[event.type].color, color: 'white', padding: '2px 5px' }}>
      <EventTypeTag eventType={event.type}>{eventTypes[event.type].name}</EventTypeTag>
      <strong>{event.title}</strong>
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
    <CalendarContainer>
      <h1>Weekly Schedule</h1>
      
      <button 
        onClick={() => {
          setSelectedEvent(null);
          setSelectedSlot({ start: new Date(), end: new Date() });
          setShowForm(true);
        }}
        style={{ 
          marginBottom: '15px', 
          padding: '10px 20px', 
          backgroundColor: '#4287f5', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      >
        + Add Event
      </button>
      
      {showForm ? (
        <div style={{ marginBottom: '20px' }}>
          <h2>{selectedEvent ? 'Edit Event' : 'Add New Event'}</h2>
          <EventForm 
            event={selectedEvent || (selectedSlot ? { start: selectedSlot.start, end: selectedSlot.end } : null)} 
            onSave={handleSaveEvent} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      ) : (
        <div style={{ height: '100%', width: '100%' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%', width: '100%' }}
            defaultView="week"
            views={['week', 'day']}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: eventTypes[event.type].color
              }
            })}
            components={{
              event: EventComponent
            }}
          />
        </div>
      )}
    </CalendarContainer>
  );
};

export default WeeklyView;