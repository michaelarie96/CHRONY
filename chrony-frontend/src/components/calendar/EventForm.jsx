import React, { useState } from 'react';
import moment from 'moment';


const EventForm = ({ event, onSave, onCancel, onDelete }) => {
    const [title, setTitle] = useState(event?.title || '');
    const [start, setStart] = useState(event?.start || new Date());
    const [end, setEnd] = useState(event?.end || new Date());
    const [type, setType] = useState(event?.type || 'fixed');
    const [description, setDescription] = useState(event?.description || '');
    
    // State for expandable sections
    const [showDescription, setShowDescription] = useState(!!event?.description);
    const [showRecurrence, setShowRecurrence] = useState(!!event?.recurrence?.enabled);
    
    const [recurrence, setRecurrence] = useState(event?.recurrence || { 
        enabled: false, 
        frequency: 'weekly', 
        interval: 1,
        exceptions: []
    });
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteRecurringOption, setDeleteRecurringOption] = useState('single');

    const eventTypes = {
        fixed: { name: "Fixed", color: "#0081A7", bgColor: "#0081A720" },
        flexible: { name: "Flexible", color: "#00AFB9", bgColor: "#00AFB920" },
        fluid: { name: "Fluid", color: "#F07167", bgColor: "#F0716720" }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const eventData = {
            id: event?.id || Date.now(),
            title,
            start,
            end,
            type,
            description,
            recurrence: showRecurrence ? recurrence : { enabled: false }
        };
        
        onSave(eventData);
    };

    const handleRecurrenceChange = (field, value) => {
        setRecurrence({
            ...recurrence,
            [field]: value
        });
    };

    const handleDeleteClick = () => {
        // If this is a recurring event instance
        if (event?.recurrence?.enabled) {
            setShowDeleteConfirm(true);
        } else {
            // Regular event deletion
            onDelete(event.id);
        }
    };

    const confirmDelete = () => {
        onDelete(event.id, deleteRecurringOption === 'all');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <div className="mb-4">
                <label className="block mb-1 font-medium">Title</label>
                <input
                    className="w-full border px-3 py-2 rounded"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">Start</label>
                <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded"
                    value={moment(start).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) => setStart(new Date(e.target.value))}
                />
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">End</label>
                <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded"
                    value={moment(end).format('YYYY-MM-DDTHH:mm')}
                    onChange={(e) => setEnd(new Date(e.target.value))}
                />
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="font-medium">Description</label>
                    <button 
                        type="button" 
                        className="text-[#00AFB9] hover:text-[#0081A7] transition-colors" 
                        onClick={() => setShowDescription(!showDescription)}
                    >
                        {showDescription ? '−' : '+'}
                    </button>
                </div>
                {showDescription && (
                    <textarea
                        className="w-full border px-3 py-2 rounded"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description..."
                    />
                )}
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="font-medium">Recurrence</label>
                    <button 
                        type="button" 
                        className="text-[#00AFB9] hover:text-[#0081A7] transition-colors" 
                        onClick={() => setShowRecurrence(!showRecurrence)}
                    >
                        {showRecurrence ? '−' : '+'}
                    </button>
                </div>
                {showRecurrence && (
                    <div className="bg-gray-50 p-3 rounded border">
                        <div className="mb-2">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={recurrence.enabled}
                                    onChange={(e) => handleRecurrenceChange('enabled', e.target.checked)}
                                    className="mr-2"
                                />
                                <span>Repeat this event</span>
                            </label>
                        </div>
                        
                        {recurrence.enabled && (
                            <div className="ml-5 mt-2 space-y-2">
                                <div>
                                    <label className="block mb-1 text-sm">Frequency</label>
                                    <select
                                        className="w-full border px-3 py-1 rounded text-sm"
                                        value={recurrence.frequency}
                                        onChange={(e) => handleRecurrenceChange('frequency', e.target.value)}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm">Repeat every</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            className="w-16 border px-2 py-1 rounded text-sm mr-2"
                                            value={recurrence.interval}
                                            onChange={(e) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                                        />
                                        <span className="text-sm">
                                            {recurrence.frequency === 'daily' && 'day(s)'}
                                            {recurrence.frequency === 'weekly' && 'week(s)'}
                                            {recurrence.frequency === 'monthly' && 'month(s)'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Display exceptions if any exist */}
                                {recurrence.exceptions && recurrence.exceptions.length > 0 && (
                                    <div>
                                        <label className="block mb-1 text-sm">Exceptions</label>
                                        <div className="text-xs text-gray-600">
                                            {recurrence.exceptions.map((exception, index) => (
                                                <div key={index} className="flex items-center mb-1">
                                                    <span>{moment(exception).format('MMM D, YYYY')}</span>
                                                    <button 
                                                        type="button"
                                                        className="ml-2 text-red-500 hover:text-red-700"
                                                        onClick={() => {
                                                            const newExceptions = [...recurrence.exceptions];
                                                            newExceptions.splice(index, 1);
                                                            handleRecurrenceChange('exceptions', newExceptions);
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">Event Type</label>
                <div className="flex gap-3">
                    {Object.entries(eventTypes).map(([key, { name, color }]) => (
                        <label
                            key={key}
                            className={`flex items-center p-2 border rounded cursor-pointer ${type === key ? 'bg-opacity-20' : ''}`}
                            style={{
                                borderColor: color,
                                backgroundColor: type === key ? `${color}20` : 'transparent'
                            }}
                        >
                            <input
                                type="radio"
                                name="eventType"
                                value={key}
                                checked={type === key}
                                onChange={() => setType(key)}
                                className="mr-2"
                            />
                            <span style={{ color }} className={type === key ? 'font-semibold' : ''}>
                                {name}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex space-x-2">
                <button type="submit" className="bg-[#00AFB9] text-white px-4 py-2 rounded hover:bg-[#0081A7] transition-colors">Save</button>
                <button type="button" className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded transition-colors" onClick={onCancel}>Cancel</button>
            </div>

            {event?.id && (
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                    >
                        Delete Event
                    </button>
                    
                    {showDeleteConfirm && (
                        <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded">
                            <p className="text-red-700 font-medium mb-2">
                                This is a recurring event. What would you like to delete?
                            </p>
                            <div className="space-y-2 mb-3">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="deleteOption"
                                        value="single"
                                        checked={deleteRecurringOption === 'single'}
                                        onChange={() => setDeleteRecurringOption('single')}
                                        className="mr-2"
                                    />
                                    <span>This instance only</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="deleteOption"
                                        value="all"
                                        checked={deleteRecurringOption === 'all'}
                                        onChange={() => setDeleteRecurringOption('all')}
                                        className="mr-2"
                                    />
                                    <span>All instances</span>
                                </label>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                    onClick={confirmDelete}
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </form>
    );
};

export default EventForm;