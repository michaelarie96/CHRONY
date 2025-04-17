import React, { useState } from 'react';
import WeeklyView from './components/calendar/WeeklyView';
import Sidebar from './components/common/Sidebar';
import TestPing from './components/TestPing.jsx';

function App() {
  const [activeView, setActiveView] = useState('calendar');
  
  // Render the appropriate component based on the active view
  const renderView = () => {
    switch(activeView) {
      case 'calendar':
        return <WeeklyView />;
      case 'time-tracker':
        return <div className="p-4"><h2 className="text-xl font-semibold">Time Tracker</h2><p>Time tracker functionality coming soon</p></div>;
      case 'analytics':
        return <div className="p-4"><h2 className="text-xl font-semibold">Analytics</h2><p>Analytics functionality coming soon</p></div>;
      default:
        return <WeeklyView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeItem={activeView} onItemClick={setActiveView} />
      
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold text-[#0081A7]">
              {activeView === 'calendar' && 'Calendar'}
              {activeView === 'time-tracker' && 'Time Tracker'}
              {activeView === 'analytics' && 'Analytics'}
            </h1>
            <div className="text-sm text-gray-500">Personal Time Management</div>
          </div>
        </header>
        
        <main className="flex-1 container mx-auto py-6">
          <TestPing /> {/* ✅ Rendered directly for now */}
          {renderView()}
        </main>
        
        <footer className="bg-white py-4 px-6 border-t border-gray-100">
          <div className="container mx-auto text-center text-sm text-gray-500">
            Developed by Dor Adiv and Michael Arie
          </div>
        </footer>
      </div>
    </div>
  );
}


export default App;