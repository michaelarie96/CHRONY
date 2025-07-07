import React from 'react';
import moment from 'moment';

const TimeEntryList = ({ entries, activeEntry, onEdit, onDelete, onContinue, getEventForEntry }) => {
  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    const date = moment(entry.start).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});

  // Format seconds into HH:MM:SS
  const formatTime = (seconds) => {
    return moment.utc(seconds * 1000).format('HH:mm:ss');
  };

  // Format date for display (e.g., "Today", "Yesterday", or the date)
  const formatDate = (dateStr) => {
    const date = moment(dateStr);
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');
    
    if (date.isSame(today, 'day')) {
      return 'Today';
    } else if (date.isSame(yesterday, 'day')) {
      return 'Yesterday';
    } else {
      return date.format('dddd, MMMM D, YYYY');
    }
  };

  // Get linked event with enhanced debugging
  const getLinkedEvent = (entry) => {
    console.log('=== Getting linked event for entry ===');
    console.log('Entry:', {
      title: entry.title,
      id: entry.id,
      eventId: entry.eventId,
      eventIdType: typeof entry.eventId,
      eventIdValue: JSON.stringify(entry.eventId)
    });

    // If no eventId, return null
    if (!entry.eventId) {
      console.log('No eventId found');
      return null;
    }

    // Try to get event using the provided function
    let event = null;
    if (getEventForEntry) {
      event = getEventForEntry(entry);
      console.log('Event from getEventForEntry:', event);
      console.log('Event title:', event?.title);
    } else {
      console.log('getEventForEntry function not provided');
    }

    return event;
  };

  // If there are no entries
  if (entries.length === 0 && !activeEntry) {
    return (
      <div className="text-center text-gray-500 py-6">
        <p>No time entries yet. Start tracking your time!</p>
      </div>
    );
  }

  return (
    <div className="time-entry-list">
      {Object.keys(groupedEntries)
        .sort((a, b) => new Date(b) - new Date(a)) // Sort dates in descending order
        .map(date => (
          <div key={date} className="mb-6">
            <h4 className="text-sm uppercase text-gray-500 font-medium mb-2">
              {formatDate(date)}
            </h4>
            
            <div className="space-y-3">
              {groupedEntries[date]
                .sort((a, b) => new Date(b.start) - new Date(a.start)) // Sort entries by start time (newest first)
                .map(entry => {
                  const linkedEvent = getLinkedEvent(entry);
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="bg-white p-3 border border-gray-200 rounded shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{entry.title || "Untitled"}</div>
                          <div className="text-sm text-gray-600 flex flex-wrap gap-2 mt-1">
                            {entry.category && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                {entry.category}
                              </span>
                            )}
                            
                            {/* Show event badge ONLY when we have both eventId AND event title */}
                            {entry.eventId && linkedEvent && linkedEvent.title && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs flex items-center">
                                <span className="mr-1">📅</span>
                                {linkedEvent.title}
                              </span>
                            )}
                            
                            {/* DEBUG: Show when we have eventId but no event title */}
                            {entry.eventId && (!linkedEvent || !linkedEvent.title) && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center">
                                <span className="mr-1">⚠️</span>
                                Event link issue (check console)
                              </span>
                            )}
                            
                            <span className="text-gray-500">
                              {moment(entry.start).format('HH:mm')} - {moment(entry.end).format('HH:mm')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-mono font-medium">
                            {formatTime(entry.duration)}
                          </div>
                          <div className="flex mt-2">
                            <button 
                              onClick={() => onEdit(entry)}
                              className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => onContinue(entry)}
                              className="text-green-600 hover:text-green-800 text-sm mr-3"
                            >
                              Continue
                            </button>
                            <button 
                              onClick={() => onDelete(entry.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
        
        {/* Currently active entry */}
        {activeEntry && (
          <div className="mt-6">
            <h4 className="text-sm uppercase text-gray-500 font-medium mb-2">
              In Progress
            </h4>
            <div 
              className="bg-white p-3 border-l-4 border-[#00AFB9] border-t border-r border-b rounded shadow-sm"
            >
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="font-medium">{activeEntry.title || "Untitled"}</div>
                  <div className="text-sm text-gray-600 flex gap-2 mt-1">
                    {activeEntry.category && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                        {activeEntry.category}
                      </span>
                    )}
                    
                    {/* Show active timer event badge ONLY when we have event title */}
                    {activeEntry.eventId && getEventForEntry && getEventForEntry(activeEntry) && getEventForEntry(activeEntry).title && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs flex items-center">
                        <span className="mr-1">📅</span>
                        {getEventForEntry(activeEntry).title}
                      </span>
                    )}
                    
                    {/* DEBUG: Show when active timer has eventId but no event title */}
                    {activeEntry.eventId && (!getEventForEntry || !getEventForEntry(activeEntry) || !getEventForEntry(activeEntry).title) && (
                      <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center">
                        <span className="mr-1">⚠️</span>
                        Active event link issue
                      </span>
                    )}
                    
                    <span className="text-gray-500">
                      Started at {moment(activeEntry.start).format('HH:mm')}
                    </span>
                  </div>
                </div>
                <div className="font-mono font-medium">
                  {formatTime(activeEntry.duration || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default TimeEntryList;