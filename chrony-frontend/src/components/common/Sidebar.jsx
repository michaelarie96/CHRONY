import React from 'react';
import { useState } from 'react';

const Sidebar = ({ activeItem, onItemClick }) => {
  const menuItems = [
    { id: 'calendar', icon: '📅', label: 'Calendar' },
    { id: 'time-tracker', icon: '⏱️', label: 'Time Tracker' },
    { id: 'analytics', icon: '📊', label: 'Analytics' }
  ];

  return (
    <div className="w-60 min-h-screen bg-[#f9f9f9] border-r border-gray-200">
      <div className="py-4 px-5 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0081A7]">Chrony</h1>
        <button className="text-gray-400 hover:text-gray-600">&times;</button>
      </div>
      
      <nav className="mt-4">
        <ul>
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onItemClick(item.id)}
                className={`w-full text-left py-3 px-5 flex items-center transition-colors ${
                  activeItem === item.id 
                    ? 'bg-[#0081A7] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

// Example usage component
const AppWithSidebar = () => {
  const [activeItem, setActiveItem] = useState('calendar');
  
  return (
    <div className="flex">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
    </div>
  );
};

export default AppWithSidebar;