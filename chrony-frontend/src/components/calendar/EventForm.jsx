import React, { useState } from 'react';
import moment from 'moment';

const EventForm = ({ event, onSave, onCancel, onDelete }) => {
    const [title, setTitle] = useState(event?.title || '');
    const [type, setType] = useState(event?.type || 'fixed');
    const [description, setDescription] = useState(event?.description || '');
    
    // Fixed event fields
    const [fixedDate, setFixedDate] = useState(
        event?.start ? moment(event.start).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
    );
    const [fixedStartTime, setFixedStartTime] = useState(
        event?.start ? moment(event.start).format('HH:mm') : '09:00'
    );
    const [fixedEndTime, setFixedEndTime] = useState(
        event?.end ? moment(event.end).format('HH:mm') : '10:00'
    );
    
    // Flexible event fields
    const [flexibleDate, setFlexibleDate] = useState(
        event?.start ? moment(event.start).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
    );
    const [flexibleDuration, setFlexibleDuration] = useState(
        event?.duration ? Math.floor(event.duration / 60) : 60 // duration in minutes
    );
    
    // Fluid event fields
    const [fluidDuration, setFluidDuration] = useState(
        event?.duration ? Math.floor(event.duration / 60) : 30 // duration in minutes
    );
    const [fluidWeek, setFluidWeek] = useState(
        event?.targetWeek || 'current' // current, plus1weeks, plus2weeks, etc.
    );
    
    // Recurrence state
    const [recurrenceEnabled, setRecurrenceEnabled] = useState(event?.recurrence?.enabled || false);
    const [frequency, setFrequency] = useState(event?.recurrence?.frequency || 'weekly');
    const [interval, setInterval] = useState(event?.recurrence?.interval || 1);
    const [count, setCount] = useState(event?.recurrence?.count || 10);
    
    // State for additional sections
    const [showDescription, setShowDescription] = useState(!!event?.description);
    const [showRecurrence, setShowRecurrence] = useState(!!event?.recurrence?.enabled);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const eventTypes = {
        fixed: { name: "Fixed", color: "#0081A7", bgColor: "#0081A720", description: "Exact date and time" },
        flexible: { name: "Flexible", color: "#00AFB9", bgColor: "#00AFB920", description: "Specific day, flexible time" },
        fluid: { name: "Fluid", color: "#F07167", bgColor: "#F0716720", description: "Anywhere this week" }
    };

    // Generate week options for fluid events
    const generateWeekOptions = () => {
        const options = [];
        const today = moment();
        
        for (let i = 0; i < 4; i++) { // Show 4 weeks: current + 3 future weeks
            const weekStart = today.clone().add(i, 'weeks').startOf('week'); // Sunday
            const weekEnd = weekStart.clone().endOf('week'); // Saturday
            
            let label;
            if (i === 0) {
                label = `This week (${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')})`;
            } else if (i === 1) {
                label = `Next week (${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')})`;
            } else {
                label = `In ${i} weeks (${weekStart.format('MMM D')} - ${weekEnd.format('MMM D')})`;
            }
            
            options.push({
                value: i === 0 ? 'current' : `plus${i}weeks`,
                label: label,
                weekStart: weekStart.toDate(),
                weekEnd: weekEnd.toDate()
            });
        }
        
        return options;
    };

    const weekOptions = generateWeekOptions();

    // Calculate start and end dates based on event type
    const calculateEventTimes = () => {
        const now = moment();
        
        switch (type) {
            case 'fixed': {
                const start = moment(`${fixedDate} ${fixedStartTime}`);
                const end = moment(`${fixedDate} ${fixedEndTime}`);
                const duration = end.diff(start, 'seconds');
                return { start: start.toDate(), end: end.toDate(), duration };
            }
                
            case 'flexible': {
                // For flexible events, we set a placeholder time that the algorithm will adjust
                const flexStart = moment(`${flexibleDate} 09:00`);
                const flexEnd = moment(flexStart).add(flexibleDuration, 'minutes');
                return { 
                    start: flexStart.toDate(), 
                    end: flexEnd.toDate(),
                    duration: flexibleDuration * 60 // store duration in seconds
                };
            }
                
            case 'fluid': {
                // For fluid events, calculate the target week start based on selection
                let targetWeekStart;
                
                if (fluidWeek === 'current') {
                    targetWeekStart = now.clone().startOf('week');
                } else {
                    // Extract number from 'plus1weeks', 'plus2weeks', etc.
                    const weeksToAdd = parseInt(fluidWeek.replace('plus', '').replace('weeks', ''));
                    targetWeekStart = now.clone().add(weeksToAdd, 'weeks').startOf('week');
                }
                
                // Use Monday 9 AM of the target week as placeholder
                const fluidStart = targetWeekStart.clone().add(1, 'day').add(9, 'hours'); // Monday 9 AM
                const fluidEnd = moment(fluidStart).add(fluidDuration, 'minutes');
                
                return { 
                    start: fluidStart.toDate(), 
                    end: fluidEnd.toDate(),
                    duration: fluidDuration * 60, // store duration in seconds
                    targetWeek: fluidWeek, // Include the target week info
                    targetWeekStart: targetWeekStart.toDate() // Include actual week start date
                };
            }
                
            default: {
                return { start: now.toDate(), end: now.clone().add(1, 'hour').toDate() };
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!title.trim()) {
            alert('Please enter a title');
            return;
        }
        
        if (type === 'fixed') {
            const start = moment(`${fixedDate} ${fixedStartTime}`);
            const end = moment(`${fixedDate} ${fixedEndTime}`);
            
            if (end.isSameOrBefore(start)) {
                alert('End time must be after start time');
                return;
            }
        }
        
        if ((type === 'flexible' && flexibleDuration <= 0) || (type === 'fluid' && fluidDuration <= 0)) {
            alert('Duration must be greater than 0');
            return;
        }
        
        const { start, end, duration, targetWeek, targetWeekStart } = calculateEventTimes();
        
        const eventData = {
            id: event?.id || Date.now(),
            title: title.trim(),
            start,
            end,
            type,
            description: description.trim(),
            duration, // Include duration for flexible and fluid events
            recurrence: recurrenceEnabled ? {
                enabled: true,
                frequency,
                interval,
                count
            } : { enabled: false }
        };

        // Add fluid-specific fields if it's a fluid event
        if (type === 'fluid') {
            eventData.targetWeek = targetWeek;
            eventData.targetWeekStart = targetWeekStart;
        }
        
        onSave(eventData);
    };

    const confirmDelete = () => {
        onDelete(event.id);
    };

    // Render type-specific form fields
    const renderTypeSpecificFields = () => {
        switch (type) {
            case 'fixed':
                return (
                    <>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Date</label>
                            <input
                                type="date"
                                className="w-full border px-3 py-2 rounded"
                                value={fixedDate}
                                onChange={(e) => setFixedDate(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block mb-1 font-medium">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full border px-3 py-2 rounded"
                                    value={fixedStartTime}
                                    onChange={(e) => setFixedStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium">End Time</label>
                                <input
                                    type="time"
                                    className="w-full border px-3 py-2 rounded"
                                    value={fixedEndTime}
                                    onChange={(e) => setFixedEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </>
                );
                
            case 'flexible':
                return (
                    <>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Date</label>
                            <input
                                type="date"
                                className="w-full border px-3 py-2 rounded"
                                value={flexibleDate}
                                onChange={(e) => setFlexibleDate(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Duration (minutes)</label>
                            <input
                                type="number"
                                min="15"
                                max="480"
                                step="15"
                                className="w-full border px-3 py-2 rounded"
                                value={flexibleDuration}
                                onChange={(e) => setFlexibleDuration(parseInt(e.target.value))}
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                The system will find the best time on this day
                            </p>
                        </div>
                    </>
                );
                
            case 'fluid':
                return (
                    <>
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Duration (minutes)</label>
                            <input
                                type="number"
                                min="15"
                                max="480"
                                step="15"
                                className="w-full border px-3 py-2 rounded"
                                value={fluidDuration}
                                onChange={(e) => setFluidDuration(parseInt(e.target.value))}
                                required
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="block mb-1 font-medium">Target Week</label>
                            <select
                                className="w-full border px-3 py-2 rounded"
                                value={fluidWeek}
                                onChange={(e) => setFluidWeek(e.target.value)}
                                required
                            >
                                {weekOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                The system will find the best time during the selected week
                            </p>
                        </div>
                    </>
                );
                
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <div className="mb-4">
                <label className="block mb-1 font-medium">Title</label>
                <input
                    className="w-full border px-3 py-2 rounded"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What do you want to do?"
                    required
                />
            </div>

            {/* Event Type Selection */}
            <div className="mb-6">
                <label className="block mb-2 font-medium">Event Type</label>
                <div className="space-y-2">
                    {Object.entries(eventTypes).map(([key, { name, color, description }]) => (
                        <label
                            key={key}
                            className={`flex items-start p-3 border rounded cursor-pointer transition-all ${
                                type === key ? 'bg-opacity-20 border-2' : 'border-1'
                            }`}
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
                                className="mr-3 mt-1"
                            />
                            <div>
                                <div 
                                    style={{ color }} 
                                    className={`font-medium ${type === key ? 'font-semibold' : ''}`}
                                >
                                    {name}
                                </div>
                                <div className="text-sm text-gray-600">{description}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Type-specific fields */}
            {renderTypeSpecificFields()}

            {/* Description section */}
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

            {/* Recurrence section */}
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
                                    checked={recurrenceEnabled}
                                    onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                                    className="mr-2"
                                />
                                <span>Repeat this event</span>
                            </label>
                        </div>
                        
                        {recurrenceEnabled && (
                            <div className="ml-5 mt-2 space-y-2">
                                <div>
                                    <label className="block mb-1 text-sm">Frequency</label>
                                    <select
                                        className="w-full border px-3 py-1 rounded text-sm"
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
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
                                            value={interval}
                                            onChange={(e) => setInterval(parseInt(e.target.value))}
                                        />
                                        <span className="text-sm">
                                            {frequency === 'daily' && 'day(s)'}
                                            {frequency === 'weekly' && 'week(s)'}
                                            {frequency === 'monthly' && 'month(s)'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm">Number of occurrences</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        className="w-20 border px-2 py-1 rounded text-sm"
                                        value={count}
                                        onChange={(e) => setCount(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2">
                <button 
                    type="submit" 
                    className="bg-[#00AFB9] text-white px-4 py-2 rounded hover:bg-[#0081A7] transition-colors"
                >
                    Save
                </button>
                <button 
                    type="button" 
                    className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded transition-colors" 
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>

            {/* Delete section */}
            {event?.id && (
                <div className="mt-4">
                    {showDeleteConfirm ? (
                        <div className="bg-red-50 border border-red-200 p-4 rounded">
                            <p className="text-red-700 font-medium mb-3">
                                Are you sure you want to delete this event?
                            </p>
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
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                        >
                            Delete Event
                        </button>
                    )}
                </div>
            )}
        </form>
    );
};

export default EventForm;