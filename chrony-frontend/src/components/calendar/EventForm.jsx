import React, { useState } from 'react';
import moment from 'moment';


const EventForm = ({ event, onSave, onCancel, onDelete }) => {
    const [title, setTitle] = useState(event?.title || '');
    const [start, setStart] = useState(event?.start || new Date());
    const [end, setEnd] = useState(event?.end || new Date());
    const [type, setType] = useState(event?.type || 'fixed');
    const [description, setDescription] = useState(event?.description || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


    const eventTypes = {
        fixed: { name: "Fixed", color: "#0081A7", bgColor: "#0081A720" },
        flexible: { name: "Flexible", color: "#00AFB9", bgColor: "#00AFB920" },
        fluid: { name: "Fluid", color: "#F07167", bgColor: "#F0716720" }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: event?.id || Date.now(),
            title,
            start,
            end,
            type,
            description,
        });
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
                <label className="block mb-1 font-medium">Description</label>
                <textarea
                    className="w-full border px-3 py-2 rounded"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
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
                <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded">Save</button>
                <button type="button" className="bg-gray-300 px-4 py-2 rounded" onClick={onCancel}>Cancel</button>
            </div>

            {event?.id && (
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                    >
                        Delete Event
                    </button>
                    {showDeleteConfirm && (
                        <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded">
                            <p className="text-red-700 font-medium mb-2">Are you sure you want to delete this event?</p>
                            <div className="flex space-x-2">
                                <button
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                    onClick={() => onDelete(event.id)}
                                >
                                    Yes, Delete
                                </button>
                                <button
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