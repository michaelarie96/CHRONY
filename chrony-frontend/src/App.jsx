import React from 'react';
import WeeklyView from './components/calendar/WeeklyView';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-[#0081A7]">Chrony</h1>
          <div className="text-sm text-gray-500">Personal Time Management</div>
        </div>
      </header>
      
      <main className="container mx-auto py-6">
        <WeeklyView />
      </main>
      
      <footer className="bg-white py-4 px-6 border-t border-gray-100">
        <div className="container mx-auto text-center text-sm text-gray-500">
          Developed by Dor Adiv and Michael Arie
        </div>
      </footer>
    </div>
  );
}

export default App;