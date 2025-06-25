import React, { useState, useEffect } from 'react';

const UserSettings = ({ onSave }) => {
  // Default settings
  const [activeStartTime, setActiveStartTime] = useState('07:00');
  const [activeEndTime, setActiveEndTime] = useState('22:00');
  const [restDay, setRestDay] = useState('sunday');
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({});

  // Load settings from user data when component mounts
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.settings) {
      const settings = user.settings;
      setActiveStartTime(settings.activeStartTime || '07:00');
      setActiveEndTime(settings.activeEndTime || '22:00');
      setRestDay(settings.restDay || 'sunday');
      
      // Store original settings to track changes
      setOriginalSettings({
        activeStartTime: settings.activeStartTime || '07:00',
        activeEndTime: settings.activeEndTime || '22:00',
        restDay: settings.restDay || 'sunday'
      });
    }
    setHasChanges(false);
  }, []);

  // Track changes
  useEffect(() => {
    const hasChanged = 
      originalSettings.activeStartTime !== activeStartTime ||
      originalSettings.activeEndTime !== activeEndTime ||
      originalSettings.restDay !== restDay;
    setHasChanges(hasChanged);
  }, [activeStartTime, activeEndTime, restDay, originalSettings]);

  const formatTimeDisplay = (time) => {
    const [hours, minutes] = time.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getWorkingDays = () => {
    if (restDay === 'saturday') {
      return 'Sunday to Friday';
    } else {
      return 'Monday to Saturday';
    }
  };

  const handleSave = async () => {
    // Frontend validation
    if (activeStartTime >= activeEndTime) {
      alert('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.userId) {
        alert('User not found. Please log in again.');
        return;
      }

      const response = await fetch('http://localhost:3000/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          activeStartTime,
          activeEndTime,
          restDay
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage with new settings
        const updatedUser = {
          ...user,
          settings: data.settings
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update original settings to track future changes
        setOriginalSettings({
          activeStartTime,
          activeEndTime,
          restDay
        });
        
        setHasChanges(false);
        
        // Notify parent component
        if (onSave) {
          onSave(data.settings);
        }
        
        alert('Settings saved successfully!');
      } else {
        alert(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">User Settings</h2>
        
        {/* Active Hours Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Active Hours</h3>
          <p className="text-sm text-gray-500 mb-4">
            Events will only be scheduled during these hours
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={activeStartTime}
                onChange={(e) => setActiveStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFB9]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={activeEndTime}
                onChange={(e) => setActiveEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFB9]"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <strong>Preview:</strong> {formatTimeDisplay(activeStartTime)} - {formatTimeDisplay(activeEndTime)}
          </div>
        </div>

        {/* Rest Day Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Rest Day</h3>
          <p className="text-sm text-gray-500 mb-4">
            Choose your day off (no events will be scheduled)
          </p>
          
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="restDay"
                value="saturday"
                checked={restDay === 'saturday'}
                onChange={(e) => setRestDay(e.target.value)}
                className="mr-3"
                disabled={loading}
              />
              <div>
                <div className="font-medium">Saturday</div>
                <div className="text-sm text-gray-500">Working days: Sunday - Friday</div>
              </div>
            </label>
            
            <label className="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="restDay"
                value="sunday"
                checked={restDay === 'sunday'}
                onChange={(e) => setRestDay(e.target.value)}
                className="mr-3"
                disabled={loading}
              />
              <div>
                <div className="font-medium">Sunday</div>
                <div className="text-sm text-gray-500">Working days: Monday - Saturday</div>
              </div>
            </label>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h4 className="font-medium text-gray-700 mb-2">Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• Events scheduled: {formatTimeDisplay(activeStartTime)} - {formatTimeDisplay(activeEndTime)}</div>
            <div>• Working days: {getWorkingDays()}</div>
            <div>• Rest day: {restDay === 'saturday' ? 'Saturday' : 'Sunday'}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            className={`px-6 py-2 rounded transition-colors ${
              hasChanges && !loading
                ? 'bg-[#00AFB9] text-white hover:bg-[#0081A7]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!hasChanges || loading}
          >
            {loading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Changing these settings will affect how future events are scheduled. 
            Existing events won't be automatically rescheduled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;