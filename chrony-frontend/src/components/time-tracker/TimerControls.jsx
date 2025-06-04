import React, { useState, useEffect } from 'react';
import moment from 'moment';

const TimerControls = ({ activeEntry, onStart, onStop, onEdit, events }) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  // Load user categories from localStorage on component mount
  useEffect(() => {
    const savedCategories = localStorage.getItem('timeTrackerCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      // Default categories as a starting point
      const defaultCategories = [
        { id: 'work', name: 'Work' },
        { id: 'study', name: 'Study' }
      ];
      setCategories(defaultCategories);
      localStorage.setItem('timeTrackerCategories', JSON.stringify(defaultCategories));
    }
  }, []);

  // Save categories to localStorage when they change
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('timeTrackerCategories', JSON.stringify(categories));
    }
  }, [categories]);

  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    return moment.utc(seconds * 1000).format('HH:mm:ss');
  };

  // Add a new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    const newCategoryObj = {
      id: newCategory.toLowerCase().replace(/\s+/g, '-'),
      name: newCategory.trim()
    };
    
    setCategories([...categories, newCategoryObj]);
    setCategory(newCategoryObj.id);
    setNewCategory('');
    setShowAddCategory(false);
  };
  
  // Filter for ongoing and upcoming events (within 1 hour)
  const relevantEvents = events.filter(event => {
    const now = new Date();
    const eventEnd = new Date(event.end);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Include events that are ongoing or starting within the next hour
    return (
      eventEnd > now && // event hasn't ended yet
      event.start < oneHourFromNow // event starts within the next hour or has already started
    );
  });

  // Handle starting the timer
  const handleStart = () => {
    onStart(description, category, selectedEventId || null);
    
    // Clear the form
    setDescription('');
    setCategory('');
    setSelectedEventId('');
  };

  // When an event is selected from the dropdown
  const handleEventSelect = (e) => {
    const eventId = e.target.value;
    setSelectedEventId(eventId);
    
    if (eventId) {
      // If an event is selected, use its title as the description
      const selectedEvent = events.find(event => event._id === eventId || event.id === eventId);
      if (selectedEvent) {
        setDescription(selectedEvent.title);
      }
    }
  };

  return (
    <div className="timer-controls">
      {activeEntry ? (
        // Active timer display and controls
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-medium text-lg mb-1">{activeEntry.description || "Untitled"}</h3>
              <div className="flex items-center text-sm text-gray-600">
                {activeEntry.category && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">
                    {categories.find(cat => cat.id === activeEntry.category)?.name || activeEntry.category}
                  </span>
                )}
                {activeEntry.eventId && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    From Calendar
                  </span>
                )}
              </div>
            </div>
            <div className="text-3xl font-mono font-semibold mt-2 md:mt-0">
              {formatTime(activeEntry.duration || 0)}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              onClick={onStop}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors flex-1"
            >
              Stop
            </button>
            <button 
              onClick={onEdit}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        // Timer creation form
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            <div className="md:col-span-5">
              <input
                type="text"
                placeholder="What are you working on?"
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="md:col-span-3">
              {showAddCategory ? (
                <div className="flex">
                  <input
                    type="text"
                    placeholder="New category"
                    className="w-full border border-gray-300 rounded-l px-3 py-2"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-[#00AFB9] text-white px-2 rounded-r hover:bg-[#0081A7] transition-colors"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <div className="flex">
                  <select 
                    className="w-full border border-gray-300 rounded-l px-3 py-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="bg-gray-200 text-gray-700 px-2 rounded-r hover:bg-gray-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            
            <div className="md:col-span-4">
              <select 
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={selectedEventId}
                onChange={handleEventSelect}
              >
                <option value="">Link to Calendar Event</option>
                {relevantEvents.length > 0 ? (
                  relevantEvents.map(event => (
                    <option key={event._id || event.id} value={event._id || event.id}>
                      {event.title} ({moment(event.start).format('HH:mm')})
                    </option>
                  ))
                ) : (
                  <option disabled>No upcoming events</option>
                )}
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleStart}
            className="bg-[#00AFB9] w-full md:w-auto text-white px-6 py-2 rounded hover:bg-[#0081A7] transition-colors"
            disabled={!description}
          >
            Start Timer
          </button>
        </div>
      )}
    </div>
  );
};

export default TimerControls;