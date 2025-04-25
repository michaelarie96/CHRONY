import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import TimerControls from './TimerControls';
import TimeEntryList from './TimeEntryList';
import TimeEntryForm from './TimeEntryForm';
import './TimeTracker.css';

const TimeTracker = () => {
  // State for time entries (all past and current time tracking records)
  const [timeEntries, setTimeEntries] = useState([]);
  
  // State for the currently running timer
  const [activeEntry, setActiveEntry] = useState(null);
  
  // State for the form when adding/editing entries
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  // State for handling events from the calendar
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timer interval reference
  const timerRef = useRef(null);

  // Fetch events from the API and load saved time entries
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (response.ok) {
          const eventsData = await response.json();
          // Parse date strings into Date objects
          const parsedEvents = eventsData.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
          }));
          setEvents(parsedEvents);
        } else {
          console.error('Failed to fetch events');
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch time entries from API (would be implemented in future)
    // For now, we'll use localStorage just for the prototype
    const loadTimeEntries = () => {
      const savedEntries = localStorage.getItem('timeEntries');
      if (savedEntries) {
        const parsedEntries = JSON.parse(savedEntries).map(entry => ({
          ...entry,
          start: entry.start ? new Date(entry.start) : null,
          end: entry.end ? new Date(entry.end) : null
        }));
        setTimeEntries(parsedEntries);
      }
    };

    // Load active timer if it exists
    const loadActiveTimer = () => {
      const activeTimerData = localStorage.getItem('activeTimer');
      if (activeTimerData) {
        const parsedTimer = JSON.parse(activeTimerData);
        parsedTimer.start = new Date(parsedTimer.start);
        setActiveEntry(parsedTimer);
        startTimer(parsedTimer.description, parsedTimer.category, parsedTimer.eventId);
      }
    };

    fetchEvents();
    loadTimeEntries();
    loadActiveTimer();

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Save time entries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('timeEntries', JSON.stringify(timeEntries));
  }, [timeEntries]);

  // Save active timer to localStorage whenever it changes
  useEffect(() => {
    if (activeEntry) {
      localStorage.setItem('activeTimer', JSON.stringify(activeEntry));
    } else {
      localStorage.removeItem('activeTimer');
    }
  }, [activeEntry]);

  // Start the timer
  const startTimer = (description = '', category = null, eventId = null) => {
    // Stop any current timer first
    if (activeEntry) {
      stopTimer();
    }

    // Create a new timer
    const newEntry = {
      id: Date.now(),
      description: description,
      category: category,
      eventId: eventId, // Connection to calendar event
      start: new Date(),
      end: null,
      duration: 0,
      isRunning: true
    };

    setActiveEntry(newEntry);
    
    // Update the timer every second
    timerRef.current = setInterval(() => {
      setActiveEntry(current => {
        if (!current) return null;
        
        const duration = moment().diff(moment(current.start), 'seconds');
        return { ...current, duration };
      });
    }, 1000);
  };

  // Stop the current timer
  const stopTimer = () => {
    if (!activeEntry) return;

    clearInterval(timerRef.current);
    
    const endTime = new Date();
    const duration = moment(endTime).diff(moment(activeEntry.start), 'seconds');
    
    const completedEntry = {
      ...activeEntry,
      end: endTime,
      duration,
      isRunning: false
    };

    // Add the completed entry to the list
    setTimeEntries([completedEntry, ...timeEntries]);
    
    // Clear the active timer
    setActiveEntry(null);

    // In future, we would also send this entry to our API
    // saveTimeEntryToAPI(completedEntry);
  };

  // Handle editing an entry
  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setShowForm(true);
  };

  // Handle saving an entry (new or edited)
  const handleSaveEntry = (entryData) => {
    if (selectedEntry) {
      // Update existing entry
      setTimeEntries(timeEntries.map(entry => 
        entry.id === selectedEntry.id ? entryData : entry
      ));
    } else {
      // Add new manual entry
      setTimeEntries([entryData, ...timeEntries]);
    }
    setShowForm(false);
    setSelectedEntry(null);

    // In future, we would also update this in our API
    // saveTimeEntryToAPI(entryData);
  };

  // Handle deleting an entry
  const handleDeleteEntry = (entryId) => {
    setTimeEntries(timeEntries.filter(entry => entry.id !== entryId));
    
    if (showForm) {
      setShowForm(false);
      setSelectedEntry(null);
    }

    // In future, we would also delete this from our API
    // deleteTimeEntryFromAPI(entryId);
  };

  // Calculate today's total time
  const calculateDailyTotal = () => {
    const today = moment().startOf('day');
    
    const todayEntries = timeEntries.filter(entry => 
      moment(entry.start).isSame(today, 'day')
    );
    
    const totalSeconds = todayEntries.reduce((total, entry) => total + entry.duration, 0);
    
    // Add active timer if it's running today
    if (activeEntry && moment(activeEntry.start).isSame(today, 'day')) {
      return totalSeconds + activeEntry.duration;
    }
    
    return totalSeconds;
  };

  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    return moment.utc(seconds * 1000).format('HH:mm:ss');
  };

  // Get the event associated with an entry (if any)
  const getEventForEntry = (entry) => {
    if (!entry?.eventId) return null;
    return events.find(event => event._id === entry.eventId || event.id === entry.eventId);
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="time-tracker container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Time Tracker</h2>
        
        {/* Daily total time counter */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Today's total</p>
          <h3 className="text-2xl font-semibold">{formatTime(calculateDailyTotal())}</h3>
        </div>

        {/* Timer controls */}
        <TimerControls 
          activeEntry={activeEntry} 
          onStart={startTimer} 
          onStop={stopTimer} 
          onEdit={() => setShowForm(true)}
          events={events}
        />
      </div>
      
      {showForm ? (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">
            {selectedEntry ? 'Edit Time Entry' : 'Add Time Entry'}
          </h3>
          <TimeEntryForm
            entry={selectedEntry}
            events={events}
            onSave={handleSaveEntry}
            onCancel={() => {
              setShowForm(false);
              setSelectedEntry(null);
            }}
            onDelete={handleDeleteEntry}
          />
        </div>
      ) : (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              setSelectedEntry(null);
              setShowForm(true);
            }}
            className="bg-[#00AFB9] text-white px-4 py-2 rounded-md hover:bg-[#0081A7] transition-colors flex items-center"
          >
            <span className="mr-2">+</span> Add Time Entry
          </button>
        </div>
      )}

      {/* Time entries list */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Time Entries</h3>
        <TimeEntryList 
          entries={timeEntries}
          activeEntry={activeEntry}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
          onContinue={(entry) => startTimer(entry.description, entry.category, entry.eventId)}
          getEventForEntry={getEventForEntry}
        />
      </div>
    </div>
  );
};

export default TimeTracker;