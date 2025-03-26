import React from 'react';
import './App.css';
import WeeklyView from './components/calendar/WeeklyView';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Chrony - Personal Time Management</h1>
      </header>
      <main>
        <WeeklyView />
      </main>
      <footer className="App-footer">
        <p>Developed by Dor Adiv and Michael Arie</p>
      </footer>
    </div>
  );
}

export default App;