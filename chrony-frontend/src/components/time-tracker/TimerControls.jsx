import React, { useState, useEffect } from 'react';
import moment from 'moment';
import CategoryDropdown from './CategoryDropdown';

const TimerControls = ({ activeEntry, onStart, onStop, onEdit, events }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Load user categories from database on component mount
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
          
          // Simply use whatever categories the user has (even if empty)
          setCategories(data.categories);
          
          // Update localStorage cache
          localStorage.setItem('timeTrackerCategories', JSON.stringify(data.categories));
        } else {
          console.error('Failed to load categories from database');
          // Fallback to localStorage if database fails
          const savedCategories = localStorage.getItem('timeTrackerCategories');
          if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
          } else {
            // User has no categories anywhere - start with empty array
            setCategories([]);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to localStorage if database fails
        const savedCategories = localStorage.getItem('timeTrackerCategories');
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        } else {
          setCategories([]);
        }
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Add a new category
  const handleAddCategory = async (categoryName) => {
    const newCategoryObj = {
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName.trim(),
      color: '#00AFB9' // Default color
    };

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const response = await fetch('http://localhost:3000/api/user/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          ...newCategoryObj
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        setCategory(newCategoryObj.id);
        
        // Update localStorage cache
        localStorage.setItem('timeTrackerCategories', JSON.stringify(data.categories));
        
        console.log('Category added successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    }
  };

  // Delete a category
  const handleDeleteCategory = async (categoryId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const response = await fetch(`http://localhost:3000/api/user/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        
        // If the deleted category was selected, clear the selection
        if (category === categoryId) {
          setCategory('');
        }
        
        // Update localStorage cache
        localStorage.setItem('timeTrackerCategories', JSON.stringify(data.categories));
        
        console.log('Category deleted successfully');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };
  
  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    return moment.utc(seconds * 1000).format('HH:mm:ss');
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
    onStart(title, category, selectedEventId || null);
    
    // Clear the form
    setTitle('');
    setCategory('');
    setSelectedEventId('');
  };

  // When an event is selected from the dropdown
  const handleEventSelect = (e) => {
    const eventId = e.target.value;
    setSelectedEventId(eventId);
    
    if (eventId) {
      // If an event is selected, use its title as the title
      const selectedEvent = events.find(event => event._id === eventId || event.id === eventId);
      if (selectedEvent) {
        setTitle(selectedEvent.title);
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
              <h3 className="font-medium text-lg mb-1">{activeEntry.title || "Untitled"}</h3>
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="md:col-span-3">
              <CategoryDropdown
                categories={categories}
                selectedCategory={category}
                onSelectCategory={setCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleAddCategory}
                disabled={categoriesLoading}
              />
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
            disabled={!title}
          >
            Start Timer
          </button>
        </div>
      )}
    </div>
  );
};

export default TimerControls;