import React, { useState, useEffect } from 'react';
import moment from 'moment';

const TimeEntryForm = ({ entry, events, onSave, onCancel, onDelete }) => {
  console.log('Entry received in form:', entry);
  console.log('Events received in form:', events);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState('');
  const [eventId, setEventId] = useState('');
  const [categories, setCategories] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load form data when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '');
      
      if (entry.start) {
        const start = moment(entry.start);
        setStartDate(start.format('YYYY-MM-DD'));
        setStartTime(start.format('HH:mm'));
      } else {
        const now = moment();
        setStartDate(now.format('YYYY-MM-DD'));
        setStartTime(now.format('HH:mm'));
      }
      
      if (entry.end) {
        const end = moment(entry.end);
        setEndDate(end.format('YYYY-MM-DD'));
        setEndTime(end.format('HH:mm'));
      } else {
        const now = moment();
        setEndDate(now.format('YYYY-MM-DD'));
        setEndTime(now.format('HH:mm'));
      }
      
      setCategory(entry.category || '');
      setEventId(entry.eventId?._id || entry.eventId || '');
    } else {
      // Default to current time for new entries
      const now = moment();
      setStartDate(now.format('YYYY-MM-DD'));
      setStartTime(now.format('HH:mm'));
      setEndDate(now.format('YYYY-MM-DD'));
      setEndTime(now.format('HH:mm'));
    }
  }, [entry]);

  // Load categories
  useEffect(() => {
    const savedCategories = localStorage.getItem('timeTrackerCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create start and end dates by combining date and time
    const start = moment(`${startDate} ${startTime}`).toDate();
    const end = moment(`${endDate} ${endTime}`).toDate();
    
    // Calculate duration in seconds
    const duration = moment(end).diff(moment(start), 'seconds');
    
    // Validate inputs
    if (duration < 0) {
      alert('End time must be after start time');
      return;
    }
    
    const updatedEntry = {
      id: entry?.id || Date.now(),
      title,
      category,
      eventId: eventId || null,
      start,
      end,
      duration,
      isRunning: false
    };
    
    onSave(updatedEntry);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <input 
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input 
            type="date"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input 
            type="time"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input 
            type="date"
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input 
            type="time"
            className="w-full border border-gray-300 rounded px-3 py-2"
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
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link to Event
          </label>
          <select 
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">No linked event</option>
            {events.map(event => (
              <option key={event._id || event.id} value={event._id || event.id}>
                {event.title} ({moment(event.start).format('MMM D, HH:mm')})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button 
          type="submit" 
          className="bg-[#00AFB9] text-white px-4 py-2 rounded hover:bg-[#0081A7] transition-colors"
        >
          {entry ? 'Save Changes' : 'Add Entry'}
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        
        {entry && (
          <div className="sm:ml-auto">
            {showDeleteConfirm ? (
              <div className="flex gap-2">
                <span className="text-sm text-red-600 self-center">Confirm delete?</span>
                <button 
                  type="button" 
                  onClick={() => onDelete(entry.id)}
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
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 px-4 py-2 rounded hover:text-red-800 transition-colors"
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