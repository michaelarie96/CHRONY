import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Analytics = () => {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week'); // week, month, all
  const [categories, setCategories] = useState([]);

  // Fetch time entries from backend
  const fetchTimeEntries = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        console.error("No user found in localStorage");
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/timeEntries/user/${user.userId}`
      );
      
      if (response.ok) {
        const entriesData = await response.json();
        setTimeEntries(entriesData);
      } else {
        console.error('Failed to fetch time entries');
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  }, []);

  // Fetch events from backend (for future planned vs actual feature)
  const fetchEvents = useCallback(async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.userId) {
        return; // Just return, don't log error since this is optional for now
      }

      const response = await fetch(
        `http://localhost:3000/api/event?userId=${user.userId}`
      );
      
      if (response.ok) {
        // Events will be used in future for planned vs actual comparison
        await response.json();
      }
    } catch {
      // Silently handle error for now - events are optional
      console.log('Events fetch skipped for now');
    }
  }, []);

  // Load categories from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem('timeTrackerCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Load all data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTimeEntries(), fetchEvents()]);
      setLoading(false);
    };

    loadData();
  }, [fetchTimeEntries, fetchEvents]);

  // Prepare data for charts
  const getPieChartData = () => {
    const timeByCategory = getTimeByCategory();
    const colors = ['#0081A7', '#00AFB9', '#F07167', '#FED9B7', '#FDFCDC'];
    
    return Object.entries(timeByCategory).map(([category, seconds], index) => {
      const categoryData = categories.find(cat => cat.id === category);
      const displayName = categoryData ? categoryData.name : category;
      
      return {
        name: displayName,
        value: seconds,
        hours: Math.round(seconds / 3600 * 10) / 10, // Round to 1 decimal
        fill: colors[index % colors.length]
      };
    });
  };

  // Prepare daily activity data for bar chart
  const getDailyActivityData = () => {
    const filteredEntries = getFilteredTimeEntries();
    const dailyData = {};

    // Group entries by day
    filteredEntries.forEach(entry => {
      const day = moment(entry.start).format('MMM DD');
      dailyData[day] = (dailyData[day] || 0) + entry.duration;
    });

    // Convert to array format for recharts
    return Object.entries(dailyData).map(([day, seconds]) => ({
      day,
      hours: Math.round(seconds / 3600 * 10) / 10
    }));
  };

  // Filter data based on selected date range
  const getFilteredTimeEntries = () => {
    const now = moment();
    let startDate;

    switch (dateRange) {
      case 'week':
        startDate = now.clone().startOf('week');
        break;
      case 'month':
        startDate = now.clone().startOf('month');
        break;
      case 'all':
        return timeEntries;
      default:
        startDate = now.clone().startOf('week');
    }

    return timeEntries.filter(entry => 
      moment(entry.start).isAfter(startDate)
    );
  };

  // Calculate total time tracked
  const getTotalTrackedTime = () => {
    const filteredEntries = getFilteredTimeEntries();
    return filteredEntries.reduce((total, entry) => total + entry.duration, 0);
  };

  // Calculate time by category
  const getTimeByCategory = () => {
    const filteredEntries = getFilteredTimeEntries();
    const categoryTime = {};

    filteredEntries.forEach(entry => {
      const categoryName = entry.category || 'Uncategorized';
      categoryTime[categoryName] = (categoryTime[categoryName] || 0) + entry.duration;
    });

    return categoryTime;
  };

  // Format seconds to hours and minutes
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Calculate average daily time
  const getAverageDailyTime = () => {
    const filteredEntries = getFilteredTimeEntries();
    if (filteredEntries.length === 0) return 0;

    const days = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 1;
    const totalSeconds = filteredEntries.reduce((total, entry) => total + entry.duration, 0);
    return totalSeconds / days;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalTime = getTotalTrackedTime();
  const timeByCategory = getTimeByCategory();
  const averageDailyTime = getAverageDailyTime();
  const pieChartData = getPieChartData();
  const dailyActivityData = getDailyActivityData();

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">{data.hours} hours</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header with date range selector */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Analytics</h2>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-[#00AFB9] to-[#0081A7] rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium opacity-90">Total Time Tracked</h3>
            <p className="text-2xl font-bold">{formatDuration(totalTime)}</p>
          </div>
          
          <div className="bg-gradient-to-r from-[#F07167] to-[#FED9B7] rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium opacity-90">Average Daily</h3>
            <p className="text-2xl font-bold">{formatDuration(averageDailyTime)}</p>
          </div>
          
          <div className="bg-gradient-to-r from-[#FDFCDC] to-[#FED9B7] rounded-lg p-4 text-gray-800">
            <h3 className="text-sm font-medium opacity-90">Total Entries</h3>
            <p className="text-2xl font-bold">{getFilteredTimeEntries().length}</p>
          </div>
        </div>
      </div>

      {/* Time by Category - Enhanced with Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Time Distribution</h3>
          
          {pieChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <p>No data to display</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
          
          {Object.keys(timeByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(timeByCategory)
                .sort(([,a], [,b]) => b - a) // Sort by time spent (descending)
                .map(([category, seconds]) => {
                  const percentage = totalTime > 0 ? (seconds / totalTime) * 100 : 0;
                  const categoryData = categories.find(cat => cat.id === category);
                  const displayName = categoryData ? categoryData.name : category;
                  
                  return (
                    <div key={category} className="flex items-center">
                      <div className="w-24 text-sm font-medium text-gray-700">
                        {displayName}
                      </div>
                      <div className="flex-1 mx-3">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#00AFB9] to-[#0081A7] h-2 rounded-full"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-20 text-sm text-gray-600 text-right">
                        {formatDuration(seconds)}
                      </div>
                      <div className="w-12 text-sm text-gray-500 text-right">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              <p>No time entries found for the selected period.</p>
              <p className="text-sm mt-2">Start tracking your time to see analytics!</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Activity</h3>
        
        {dailyActivityData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value} hours`, 'Time Tracked']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="hours" fill="#00AFB9" name="Hours Tracked" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            <p>No daily activity data available</p>
            <p className="text-sm mt-2">Track time over multiple days to see trends!</p>
          </div>
        )}
      </div>

      {/* Coming Soon sections */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Planned vs Actual (Coming Soon)</h3>
        <div className="text-gray-500 text-center py-8">
          <p>📈 Compare scheduled events with tracked time</p>
          <p className="text-sm mt-2">This will show how well you stick to your planned schedule!</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;