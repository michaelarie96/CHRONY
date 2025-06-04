import React, { useState, useEffect, useRef, useCallback } from 'react';
import moment from 'moment';
import TimerControls from './TimerControls';
import TimeEntryList from './TimeEntryList';
import TimeEntryForm from './TimeEntryForm';
import './TimeTracker.css';

const TimeTracker = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef(null);

  // Fetch time entries from backend
  const fetchTimeEntries = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found in localStorage");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/timeEntries/user/${user.userId}`
      );
      
      if (response.ok) {
        const entriesData = await response.json();
        console.log('Fetched time entries:', entriesData);
        
        const parsedEntries = entriesData.map(entry => ({
          id: entry._id,
          title: entry.title,
          category: entry.category,
          eventId: entry.event,
          start: new Date(entry.start),
          end: entry.end ? new Date(entry.end) : null,
          duration: entry.duration,
          isRunning: entry.isRunning
        }));
        
        setTimeEntries(parsedEntries);
      } else {
        console.error('Failed to fetch time entries');
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  }, []);

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
        console.log('Found active timer:', activeData);
        
        const activeTimer = {
          id: activeData._id,
          title: activeData.title,
          category: activeData.category,
          eventId: activeData.event,
          start: new Date(activeData.start),
          end: null,
          duration: activeData.duration || 0,
          isRunning: true
        };
        
        setActiveEntry(activeTimer);
        
        timerRef.current = setInterval(() => {
          setActiveEntry(current => {
            if (!current) return null;
            const duration = moment().diff(moment(current.start), 'seconds');
            return { ...current, duration };
          });
        }, 1000);
        
      } else if (response.status === 404) {
        console.log('No active timer found');
      } else {
        console.error('Failed to fetch active entry');
      }
    } catch (error) {
      console.error('Error fetching active entry:', error);
    }
  }, []);

  // Fetch events from backend
  const fetchEvents = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found in localStorage");
        return;
      }

      const startDate = moment().subtract(1, 'week').toISOString();
      const endDate = moment().add(2, 'weeks').toISOString();

      const response = await fetch(
        `http://localhost:3000/api/event?userId=${user.userId}&start=${startDate}&end=${endDate}`
      );
      
      if (response.ok) {
        const eventsData = await response.json();
        const parsedEvents = eventsData.map(event => ({
          ...event,
          id: event._id || event.id,
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
  }, []);

  // Load all data on component mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchTimeEntries(),
        fetchActiveEntry(),
        fetchEvents()
      ]);
    };

    loadData();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchTimeEntries, fetchActiveEntry, fetchEvents]);

  // Start the timer
  const startTimer = async (title = '', category = null, eventId = null) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found");
        return;
      }

      // Stop any current timer first
      if (activeEntry) {
        await stopTimer();
      }

      const timeEntryData = {
        title,
        category,
        event: eventId,
        user: user.userId,
        start: new Date(),
        isRunning: true
      };

      const response = await fetch('http://localhost:3000/api/timeEntries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeEntryData),
      });

      if (response.ok) {
        const createdEntry = await response.json();
        console.log('Timer started:', createdEntry);

        const newActiveEntry = {
          id: createdEntry._id,
          title: createdEntry.title,
          category: createdEntry.category,
          eventId: createdEntry.event,
          start: new Date(createdEntry.start),
          end: null,
          duration: 0,
          isRunning: true
        };

        setActiveEntry(newActiveEntry);

        timerRef.current = setInterval(() => {
          setActiveEntry(current => {
            if (!current) return null;
            const duration = moment().diff(moment(current.start), 'seconds');
            return { ...current, duration };
          });
        }, 1000);
      } else {
        console.error('Failed to start timer');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  // Stop the current timer
  const stopTimer = async () => {
    if (!activeEntry) return;

    try {
      clearInterval(timerRef.current);

      const response = await fetch(
        `http://localhost:3000/api/timeEntries/stop/${activeEntry.id}`,
        {
          method: 'PUT',
        }
      );

      if (response.ok) {
        const stoppedEntry = await response.json();
        console.log('Timer stopped:', stoppedEntry);

        const completedEntry = {
          id: stoppedEntry._id,
          title: stoppedEntry.title,
          category: stoppedEntry.category,
          eventId: stoppedEntry.event,
          start: new Date(stoppedEntry.start),
          end: new Date(stoppedEntry.end),
          duration: stoppedEntry.duration,
          isRunning: false
        };

        setTimeEntries(prev => [completedEntry, ...prev]);
        setActiveEntry(null);
      } else {
        console.error('Failed to stop timer');
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  // Handle editing an entry
  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setShowForm(true);
  };

  // Handle saving an entry (new or edited)
  const handleSaveEntry = async (entryData) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found");
        return;
      }

      const backendData = {
        title: entryData.title,
        start: entryData.start,
        end: entryData.end,
        duration: entryData.duration,
        category: entryData.category,
        event: entryData.eventId,
        user: user.userId,
        isRunning: false
      };

      let response;
      if (selectedEntry) {
        // Update existing entry
        response = await fetch(
          `http://localhost:3000/api/timeEntries/${selectedEntry.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendData),
          }
        );
      } else {
        // Create new entry
        response = await fetch('http://localhost:3000/api/timeEntries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendData),
        });
      }

      if (response.ok) {
        console.log('Entry saved successfully');
        await fetchTimeEntries(); // Refresh the list
      } else {
        console.error('Failed to save entry');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }

    setShowForm(false);
    setSelectedEntry(null);
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (entryId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/timeEntries/${entryId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        console.log('Entry deleted successfully');
        setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
      } else {
        console.error('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }

    if (showForm) {
      setShowForm(false);
      setSelectedEntry(null);
    }
  };

  // Calculate today's total time
  const calculateDailyTotal = () => {
    const today = moment().startOf('day');
    
    const todayEntries = timeEntries.filter(entry => 
      moment(entry.start).isSame(today, 'day')
    );
    
    const totalSeconds = todayEntries.reduce((total, entry) => total + entry.duration, 0);
    
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
        
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Today's total</p>
          <h3 className="text-2xl font-semibold">{formatTime(calculateDailyTotal())}</h3>
        </div>

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

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Time Entries</h3>
        <TimeEntryList 
          entries={timeEntries}
          activeEntry={activeEntry}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
          onContinue={(entry) => startTimer(entry.title, entry.category, entry.eventId)}
          getEventForEntry={getEventForEntry}
        />
      </div>
    </div>
  );
};

export default TimeTracker;