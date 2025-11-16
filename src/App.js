import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, ComposedChart } from 'recharts';
import { Search, MapPin, Plus, Home, TrendingUp, Calendar, Award, Target, Menu, X, Download, Upload, Settings, Activity, ChevronLeft, ChevronRight, Save, Edit2, Trash2 } from 'lucide-react';

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed'));
  });
}

// IndexedDB wrapper for offline storage
class GolfDB {
  constructor() {
    this.dbName = 'GolfStatsDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('courses')) {
          const courseStore = db.createObjectStore('courses', { keyPath: 'id' });
          courseStore.createIndex('name', 'name', { unique: false });
          courseStore.createIndex('isHomeCourse', 'isHomeCourse', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('rounds')) {
          const roundStore = db.createObjectStore('rounds', { keyPath: 'id' });
          roundStore.createIndex('courseId', 'courseId', { unique: false });
          roundStore.createIndex('date', 'date', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('holeScores')) {
          const holeStore = db.createObjectStore('holeScores', { keyPath: 'id' });
          holeStore.createIndex('roundId', 'roundId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return store.add(data);
  }

  async put(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return store.put(data);
  }

  async get(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return store.delete(key);
  }
}

// Real Golf Course API service (GolfAPI.io format)
class GolfCourseAPI {
  constructor() {
    // NOTE: Users need to get their own API key from golfapi.io or similar service
    this.baseUrl = 'https://api.golfapi.io/v1';
    this.apiKey = 'YOUR_API_KEY_HERE'; // Users must replace this
    this.useMockData = true; // Set to false when real API key is available
  }

  async searchCourses(query) {
    if (this.useMockData) {
      // Enhanced mock data for demonstration
      const mockCourses = [
        { id: 'pb1', name: 'Pebble Beach Golf Links', city: 'Pebble Beach', state: 'CA', country: 'USA', holes: 18, par: 72 },
        { id: 'aug1', name: 'Augusta National Golf Club', city: 'Augusta', state: 'GA', country: 'USA', holes: 18, par: 72 },
        { id: 'st1', name: 'St Andrews Old Course', city: 'St Andrews', state: 'Scotland', country: 'UK', holes: 18, par: 72 },
        { id: 'pin1', name: 'Pinehurst No. 2', city: 'Pinehurst', state: 'NC', country: 'USA', holes: 18, par: 72 },
        { id: 'tor1', name: 'Torrey Pines Golf Course', city: 'La Jolla', state: 'CA', country: 'USA', holes: 18, par: 72 },
        { id: 'beth1', name: 'Bethpage Black', city: 'Farmingdale', state: 'NY', country: 'USA', holes: 18, par: 71 },
        { id: 'oak1', name: 'Oakmont Country Club', city: 'Oakmont', state: 'PA', country: 'USA', holes: 18, par: 70 }
      ];
      
      return mockCourses.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.city.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/courses?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  }

  async getCourseDetails(courseId) {
    if (this.useMockData) {
      // Enhanced mock detailed course data
      const mockHoles = Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5,
        handicap: ((i * 7) % 18) + 1,
        yardages: {
          championship: i % 3 === 0 ? 180 + i * 5 : i % 3 === 1 ? 380 + i * 10 : 520 + i * 8,
          regular: i % 3 === 0 ? 160 + i * 5 : i % 3 === 1 ? 350 + i * 10 : 480 + i * 8,
          forward: i % 3 === 0 ? 140 + i * 5 : i % 3 === 1 ? 320 + i * 10 : 440 + i * 8
        }
      }));

      return {
        id: courseId,
        holes: mockHoles,
        teeBoxes: [
          { name: 'Championship', rating: 75.5, slope: 145, totalYards: 6828, color: 'black' },
          { name: 'Regular', rating: 72.0, slope: 130, totalYards: 6200, color: 'blue' },
          { name: 'Forward', rating: 69.0, slope: 118, totalYards: 5500, color: 'red' }
        ],
        par: mockHoles.reduce((sum, h) => sum + h.par, 0)
      };
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  }
}

// Enhanced Statistics Calculator
class StatsCalculator {
  static calculateScoringAverage(rounds, filters = {}) {
    let filteredRounds = rounds;
    if (filters.courseId) {
      filteredRounds = filteredRounds.filter(r => r.courseId === filters.courseId);
    }
    if (filters.startDate) {
      filteredRounds = filteredRounds.filter(r => new Date(r.date) >= new Date(filters.startDate));
    }
    if (!filteredRounds.length) return 0;
    return filteredRounds.reduce((sum, r) => sum + r.totalScore, 0) / filteredRounds.length;
  }

  static calculateGIRPercentage(holeScores) {
    if (!holeScores.length) return 0;
    const girs = holeScores.filter(h => h.greenInRegulation).length;
    return (girs / holeScores.length) * 100;
  }

  static calculateFIRPercentage(holeScores) {
    const relevantHoles = holeScores.filter(h => h.fairwayHit !== 'n/a');
    if (!relevantHoles.length) return 0;
    const hits = relevantHoles.filter(h => h.fairwayHit === 'yes').length;
    return (hits / relevantHoles.length) * 100;
  }

  static calculatePuttingAverage(holeScores) {
    if (!holeScores.length) return 0;
    return holeScores.reduce((sum, h) => sum + (h.putts || 0), 0) / holeScores.length;
  }

  static getScoreDistribution(rounds) {
    const distribution = { birdiesOrBetter: 0, pars: 0, bogeys: 0, doubles: 0, others: 0 };
    
    rounds.forEach(round => {
      const toPar = round.scoreToPar;
      if (toPar <= -1) distribution.birdiesOrBetter++;
      else if (toPar === 0) distribution.pars++;
      else if (toPar === 1) distribution.bogeys++;
      else if (toPar === 2) distribution.doubles++;
      else distribution.others++;
    });
    
    return distribution;
  }

  static calculateHandicap(rounds) {
    if (rounds.length < 20) return null;
    
    const last20 = rounds.slice(-20);
    const differentials = last20.map(r => r.differential || (r.totalScore - 72));
    differentials.sort((a, b) => a - b);
    const best8 = differentials.slice(0, 8);
    return (best8.reduce((sum, d) => sum + d, 0) / 8).toFixed(1);
  }

  static calculateStrokesGained(holeScores, rounds, courses) {
    // Simplified strokes gained calculation
    const results = { offTee: 0, approach: 0, shortGame: 0, putting: 0 };
    
    holeScores.forEach(hole => {
      const round = rounds.find(r => r.id === hole.roundId);
      if (!round) return;
      
      const course = courses.find(c => c.id === round.courseId);
      if (!course) return;
      
      const courseHole = course.holes?.find(h => h.number === hole.holeNumber);
      if (!courseHole) return;
      
      // Simplified calculations
      if (hole.fairwayHit === 'yes') results.offTee += 0.3;
      if (hole.greenInRegulation) results.approach += 0.5;
      if (hole.putts && hole.putts <= 2) results.putting += 0.2;
    });
    
    return results;
  }

  static getHoleAverages(holeScores, rounds, courses, courseId) {
    const holeData = Array.from({ length: 18 }, (_, i) => ({
      hole: i + 1,
      avgScore: 0,
      par: 4,
      count: 0
    }));

    holeScores.forEach(hole => {
      const round = rounds.find(r => r.id === hole.roundId);
      if (!round || round.courseId !== courseId) return;
      
      const idx = hole.holeNumber - 1;
      holeData[idx].avgScore += hole.score;
      holeData[idx].count++;
    });

    const course = courses.find(c => c.id === courseId);
    holeData.forEach((data, idx) => {
      if (data.count > 0) {
        data.avgScore = data.avgScore / data.count;
      }
      if (course?.holes?.[idx]) {
        data.par = course.holes[idx].par;
      }
      data.toPar = data.avgScore - data.par;
    });

    return holeData;
  }
}

// Scorecard Component for Round Entry
function Scorecard({ course, onSave, onCancel, existingRound }) {
  const [currentHole, setCurrentHole] = useState(1);
  const [roundData, setRoundData] = useState({
    date: new Date().toISOString().split('T')[0],
    teeBox: course.teeBoxes?.[0]?.name || 'Regular',
    weather: '',
    playingPartners: ''
  });
  const [holeScores, setHoleScores] = useState(
    existingRound?.holeScores || Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      score: null,
      putts: null,
      fairwayHit: 'n/a',
      greenInRegulation: false,
      penaltyStrokes: 0
    }))
  );

  const currentHoleData = holeScores[currentHole - 1];
  const courseHole = course.holes?.[currentHole - 1];

  const updateHoleScore = (field, value) => {
    const updated = [...holeScores];
    updated[currentHole - 1] = { ...updated[currentHole - 1], [field]: value };
    setHoleScores(updated);
  };

  const handleSave = () => {
    const totalScore = holeScores.reduce((sum, h) => sum + (h.score || 0), 0);
    const par = course.holes?.reduce((sum, h) => sum + h.par, 0) || 72;
    
    onSave({
      ...roundData,
      totalScore,
      scoreToPar: totalScore - par,
      differential: totalScore - par,
      holeScores
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{course.name}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      {/* Round Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={roundData.date}
            onChange={(e) => setRoundData({ ...roundData, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tee Box</label>
          <select
            value={roundData.teeBox}
            onChange={(e) => setRoundData({ ...roundData, teeBox: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {course.teeBoxes?.map(tee => (
              <option key={tee.name} value={tee.name}>{tee.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hole Navigation */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
            disabled={currentHole === 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <div className="text-2xl font-bold">Hole {currentHole}</div>
            <div className="text-sm text-gray-600">
              Par {courseHole?.par || 4} • {courseHole?.yardages?.regular || 0} yards
            </div>
          </div>

          <button
            onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
            disabled={currentHole === 18}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Score Input */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Score</label>
            <input
              type="number"
              value={currentHoleData.score || ''}
              onChange={(e) => updateHoleScore('score', parseInt(e.target.value) || null)}
              className="w-full px-4 py-3 text-2xl font-bold border rounded-lg text-center"
              min="1"
              max="15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Putts</label>
            <input
              type="number"
              value={currentHoleData.putts || ''}
              onChange={(e) => updateHoleScore('putts', parseInt(e.target.value) || null)}
              className="w-full px-4 py-3 text-2xl font-bold border rounded-lg text-center"
              min="0"
              max="10"
            />
          </div>
        </div>

        {/* Stats */}
        {courseHole?.par !== 3 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Fairway</label>
            <div className="flex gap-2">
              {['yes', 'no', 'n/a'].map(opt => (
                <button
                  key={opt}
                  onClick={() => updateHoleScore('fairwayHit', opt)}
                  className={`flex-1 py-2 rounded-lg ${
                    currentHoleData.fairwayHit === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium">Green in Regulation</label>
          <button
            onClick={() => updateHoleScore('greenInRegulation', !currentHoleData.greenInRegulation)}
            className={`px-4 py-2 rounded-lg ${
              currentHoleData.greenInRegulation
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {currentHoleData.greenInRegulation ? 'Yes' : 'No'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Penalty Strokes</label>
          <input
            type="number"
            value={currentHoleData.penaltyStrokes}
            onChange={(e) => updateHoleScore('penaltyStrokes', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border rounded-lg"
            min="0"
            max="10"
          />
        </div>
      </div>

      {/* Hole Grid */}
      <div className="grid grid-cols-9 gap-2 mb-6">
        {holeScores.map((hole, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentHole(idx + 1)}
            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm ${
              currentHole === idx + 1
                ? 'bg-blue-600 text-white'
                : hole.score
                ? 'bg-green-100 hover:bg-green-200'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <div className="font-bold">{idx + 1}</div>
            {hole.score && <div className="text-xs">{hole.score}</div>}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600">Total Score</div>
            <div className="text-2xl font-bold">
              {holeScores.reduce((sum, h) => sum + (h.score || 0), 0) || '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">To Par</div>
            <div className="text-2xl font-bold">
              {holeScores.reduce((sum, h) => sum + (h.score || 0), 0)
                ? (holeScores.reduce((sum, h) => sum + (h.score || 0), 0) - (course.par || 72)) >= 0
                  ? '+' + (holeScores.reduce((sum, h) => sum + (h.score || 0), 0) - (course.par || 72))
                  : (holeScores.reduce((sum, h) => sum + (h.score || 0), 0) - (course.par || 72))
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Putts</div>
            <div className="text-2xl font-bold">
              {holeScores.reduce((sum, h) => sum + (h.putts || 0), 0) || '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          Save Round
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Main App Component
export default function GolfStatsApp() {
  const [db, setDb] = useState(null);
  const [courses, setCourses] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [holeScores, setHoleScores] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showScorecard, setShowScorecard] = useState(false);

  const api = useMemo(() => new GolfCourseAPI(), []);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      const database = new GolfDB();
      await database.init();
      setDb(database);
      
      const loadedCourses = await database.getAll('courses');
      const loadedRounds = await database.getAll('rounds');
      const loadedHoles = await database.getAll('holeScores');
      
      setCourses(loadedCourses);
      setRounds(loadedRounds);
      setHoleScores(loadedHoles);

      if (loadedRounds.length === 0) {
        await addSampleData(database);
        const newCourses = await database.getAll('courses');
        const newRounds = await database.getAll('rounds');
        const newHoles = await database.getAll('holeScores');
        setCourses(newCourses);
        setRounds(newRounds);
        setHoleScores(newHoles);
      }
    };
    
    initDB();
  }, []);

  const addSampleData = async (database) => {
    const sampleCourse = {
      id: 'sample-course-1',
      name: 'Sample Golf Club',
      location: { city: 'Sample City', state: 'CA', country: 'USA' },
      isHomeCourse: true,
      imported: false,
      holes: Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        par: i % 3 === 0 ? 3 : i % 3 === 1 ? 4 : 5,
        handicap: ((i * 7) % 18) + 1,
        yardages: { championship: i % 3 === 0 ? 180 : i % 3 === 1 ? 380 : 520 }
      })),
      par: 72
    };
    
    await database.put('courses', sampleCourse);

    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i * 7);
      
      const totalScore = 72 + Math.floor(Math.random() * 20) - 5;
      const roundId = `round-${Date.now()}-${i}`;
      
      const round = {
        id: roundId,
        courseId: 'sample-course-1',
        date: date.toISOString(),
        teeBox: 'Regular',
        totalScore,
        scoreToPar: totalScore - 72,
        differential: totalScore - 72,
        completed: true
      };
      
      await database.put('rounds', round);

      for (let h = 1; h <= 18; h++) {
        const par = h % 3 === 0 ? 3 : h % 3 === 1 ? 4 : 5;
        const score = par + Math.floor(Math.random() * 3) - 1;
        
        const holeScore = {
          id: `hole-${roundId}-${h}`,
          roundId,
          holeNumber: h,
          score,
          putts: Math.floor(Math.random() * 3) + 1,
          fairwayHit: par === 3 ? 'n/a' : Math.random() > 0.5 ? 'yes' : 'no',
          greenInRegulation: Math.random() > 0.4,
          penaltyStrokes: Math.random() > 0.9 ? 1 : 0
        };
        
        await database.put('holeScores', holeScore);
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await api.searchCourses(searchQuery);
      setSearchResults(results);
    } catch (error) {
      showNotification('Error searching courses', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportCourse = async (apiCourse) => {
    try {
      const details = await api.getCourseDetails(apiCourse.id);
      
      const course = {
        id: `course-${Date.now()}`,
        apiId: apiCourse.id,
        name: apiCourse.name,
        location: {
          city: apiCourse.city,
          state: apiCourse.state,
          country: apiCourse.country
        },
        isHomeCourse: courses.length === 0,
        imported: true,
        importDate: new Date().toISOString(),
        holes: details.holes,
        teeBoxes: details.teeBoxes,
        par: details.par
      };
      
      await db.put('courses', course);
      setCourses([...courses, course]);
      setSearchResults([]);
      setSearchQuery('');
      showNotification(`${course.name} imported successfully!`, 'success');
      setCurrentView('courses');
    } catch (error) {
      showNotification('Error importing course', 'error');
    }
  };

  const setHomeCourse = async (courseId) => {
    const updatedCourses = courses.map(c => ({
      ...c,
      isHomeCourse: c.id === courseId
    }));
    
    for (const course of updatedCourses) {
      await db.put('courses', course);
    }
    
    setCourses(updatedCourses);
    showNotification('Home course updated', 'success');
  };

  const startNewRound = (course) => {
    setSelectedCourse(course);
    setShowScorecard(true);
  };

  const saveRound = async (roundData) => {
    try {
      const roundId = `round-${Date.now()}`;
      const round = {
        id: roundId,
        courseId: selectedCourse.id,
        ...roundData,
        completed: true
      };
      
      await db.put('rounds', round);
      
      for (const hole of roundData.holeScores) {
        const holeScore = {
          id: `hole-${roundId}-${hole.holeNumber}`,
          roundId,
          ...hole
        };
        await db.put('holeScores', holeScore);
      }
      
      const newRounds = await db.getAll('rounds');
      const newHoles = await db.getAll('holeScores');
      setRounds(newRounds);
      setHoleScores(newHoles);
      
      setShowScorecard(false);
      setSelectedCourse(null);
      showNotification('Round saved successfully!', 'success');
      setCurrentView('dashboard');
    } catch (error) {
      showNotification('Error saving round', 'error');
    }
  };

  const deleteRound = async (roundId) => {
    if (!confirm('Delete this round?')) return;
    
    try {
      await db.delete('rounds', roundId);
      const roundHoles = holeScores.filter(h => h.roundId === roundId);
      for (const hole of roundHoles) {
        await db.delete('holeScores', hole.id);
      }
      
      setRounds(rounds.filter(r => r.id !== roundId));
      setHoleScores(holeScores.filter(h => h.roundId !== roundId));
      showNotification('Round deleted', 'success');
    } catch (error) {
      showNotification('Error deleting round', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const exportData = () => {
    const data = {
      courses,
      rounds,
      holeScores,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf-stats-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully', 'success');
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      for (const course of data.courses) {
        await db.put('courses', course);
      }
      for (const round of data.rounds) {
        await db.put('rounds', round);
      }
      for (const hole of data.holeScores) {
        await db.put('holeScores', hole);
      }
      
      setCourses(data.courses);
      setRounds(data.rounds);
      setHoleScores(data.holeScores);
      
      showNotification('Data imported successfully', 'success');
    } catch (error) {
      showNotification('Error importing data', 'error');
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const scoringAvg = StatsCalculator.calculateScoringAverage(rounds);
    const girPct = StatsCalculator.calculateGIRPercentage(holeScores);
    const firPct = StatsCalculator.calculateFIRPercentage(holeScores);
    const puttingAvg = StatsCalculator.calculatePuttingAverage(holeScores);
    const handicap = StatsCalculator.calculateHandicap(rounds);
    const distribution = StatsCalculator.getScoreDistribution(rounds);
    const strokesGained = StatsCalculator.calculateStrokesGained(holeScores, rounds, courses);
    
    return { scoringAvg, girPct, firPct, puttingAvg, handicap, distribution, strokesGained };
  }, [rounds, holeScores, courses]);

  // Home course stats
  const homeCourse = courses.find(c => c.isHomeCourse);
  const homeCourseStats = useMemo(() => {
    if (!homeCourse) return null;
    
    const homeRounds = rounds.filter(r => r.courseId === homeCourse.id);
    const homeHoles = holeScores.filter(h => {
      const round = rounds.find(r => r.id === h.roundId);
      return round && round.courseId === homeCourse.id;
    });
    
    const holeAverages = StatsCalculator.getHoleAverages(holeScores, rounds, courses, homeCourse.id);
    const avgScore = StatsCalculator.calculateScoringAverage(homeRounds);
    const bestScore = homeRounds.length > 0 ? Math.min(...homeRounds.map(r => r.totalScore)) : null;
    
    return { homeRounds, homeHoles, holeAverages, avgScore, bestScore };
  }, [homeCourse, rounds, holeScores, courses]);

  // Prepare chart data
  const scoreTrendData = useMemo(() => {
    return rounds
      .slice(-15)
      .map((r, i) => ({
        round: i + 1,
        score: r.totalScore,
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
  }, [rounds]);

  const scoreDistributionData = useMemo(() => {
    return [
      { name: 'Birdies+', value: stats.distribution.birdiesOrBetter, fill: '#10b981' },
      { name: 'Pars', value: stats.distribution.pars, fill: '#3b82f6' },
      { name: 'Bogeys', value: stats.distribution.bogeys, fill: '#f59e0b' },
      { name: 'Doubles', value: stats.distribution.doubles, fill: '#ef4444' },
      { name: 'Others', value: stats.distribution.others, fill: '#6b7280' }
    ];
  }, [stats.distribution]);

  const parTypeData = useMemo(() => {
    const par3Holes = holeScores.filter(h => {
      const round = rounds.find(r => r.id === h.roundId);
      if (!round) return false;
      const course = courses.find(c => c.id === round.courseId);
      if (!course) return false;
      const hole = course.holes?.find(ch => ch.number === h.holeNumber);
      return hole && hole.par === 3;
    });
    
    const par4Holes = holeScores.filter(h => {
      const round = rounds.find(r => r.id === h.roundId);
      if (!round) return false;
      const course = courses.find(c => c.id === round.courseId);
      if (!course) return false;
      const hole = course.holes?.find(ch => ch.number === h.holeNumber);
      return hole && hole.par === 4;
    });
    
    const par5Holes = holeScores.filter(h => {
      const round = rounds.find(r => r.id === h.roundId);
      if (!round) return false;
      const course = courses.find(c => c.id === round.courseId);
      if (!course) return false;
      const hole = course.holes?.find(ch => ch.number === h.holeNumber);
      return hole && hole.par === 5;
    });

    return [
      { 
        parType: 'Par 3', 
        avgScore: par3Holes.length ? parseFloat((par3Holes.reduce((s, h) => s + h.score, 0) / par3Holes.length).toFixed(2)) : 0,
        par: 3
      },
      { 
        parType: 'Par 4', 
        avgScore: par4Holes.length ? parseFloat((par4Holes.reduce((s, h) => s + h.score, 0) / par4Holes.length).toFixed(2)) : 0,
        par: 4
      },
      { 
        parType: 'Par 5', 
        avgScore: par5Holes.length ? parseFloat((par5Holes.reduce((s, h) => s + h.score, 0) / par5Holes.length).toFixed(2)) : 0,
        par: 5
      }
    ];
  }, [holeScores, rounds, courses]);

  const gameProfileData = useMemo(() => {
    return [
      { category: 'Driving', value: stats.firPct },
      { category: 'Approach', value: stats.girPct },
      { category: 'Short Game', value: Math.min(100, (stats.strokesGained.shortGame + 5) * 10) },
      { category: 'Putting', value: Math.max(0, 100 - (stats.puttingAvg - 1.5) * 20) },
      { category: 'Scoring', value: Math.max(0, 100 - (stats.scoringAvg - 70) * 2) }
    ];
  }, [stats]);

  const strokesGainedData = useMemo(() => {
    return [
      { category: 'Off Tee', value: stats.strokesGained.offTee, fill: '#3b82f6' },
      { category: 'Approach', value: stats.strokesGained.approach, fill: '#10b981' },
      { category: 'Short Game', value: stats.strokesGained.shortGame, fill: '#f59e0b' },
      { category: 'Putting', value: stats.strokesGained.putting, fill: '#8b5cf6' }
    ];
  }, [stats.strokesGained]);

  // Render functions for different views
  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        {courses.length > 0 && (
          <button
            onClick={() => setCurrentView('newRound')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={20} />
            New Round
          </button>
        )}
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Scoring Avg</div>
          <div className="text-3xl font-bold text-blue-600">{stats.scoringAvg.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Handicap</div>
          <div className="text-3xl font-bold text-green-600">{stats.handicap || 'N/A'}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">GIR %</div>
          <div className="text-3xl font-bold text-purple-600">{stats.girPct.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">FIR %</div>
          <div className="text-3xl font-bold text-orange-600">{stats.firPct.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Rounds</div>
          <div className="text-3xl font-bold text-indigo-600">{rounds.length}</div>
        </div>
      </div>

      {/* Score Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Score Trend (Last 15 Rounds)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={scoreTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[65, 95]} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="score" fill="#3b82f64d" stroke="#3b82f6" />
            <Line type="monotone" dataKey="score" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={scoreDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {scoreDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Par Type Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance by Par Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={parTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="parType" />
              <YAxis domain={[0, 7]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgScore" fill="#8b5cf6" />
              <Bar dataKey="par" fill="#d1d5db" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Game Profile and Strokes Gained */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Game Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={gameProfileData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Strokes Gained (Simplified)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={strokesGainedData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderNewRound = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Start New Round</h2>
      
      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{course.name}</h3>
                <p className="text-sm text-gray-600">
                  {course.location.city}, {course.location.state}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {course.holes?.length || 18} holes · Par {course.par || 72}
                </p>
              </div>
              {course.isHomeCourse && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                  <Home size={14} />
                  Home
                </span>
              )}
            </div>
            
            <button
              onClick={() => startNewRound(course)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Round
            </button>
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No courses available</p>
          <button
            onClick={() => setCurrentView('search')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add a Course
          </button>
        </div>
      )}
    </div>
  );

  const renderCourseSearch = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Add Course</h2>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a golf course..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Search size={20} />
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Search for golf courses by name or location. Using mock data for demonstration.
        </p>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">Search Results</h3>
            {searchResults.map((course) => (
              <div key={course.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                <div>
                  <div className="font-semibold">{course.name}</div>
                  <div className="text-sm text-gray-600">
                    {course.city}, {course.state}, {course.country}
                  </div>
                  <div className="text-xs text-gray-500">
                    {course.holes} holes · Par {course.par}
                  </div>
                </div>
                <button
                  onClick={() => handleImportCourse(course)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
        <button
          onClick={() => setCurrentView('search')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Add Course
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{course.name}</h3>
                <p className="text-sm text-gray-600">
                  {course.location.city}, {course.location.state}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {course.holes?.length || 18} holes · Par {course.par || 72}
                </p>
              </div>
              {course.isHomeCourse && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                  <Home size={14} />
                  Home
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              Rounds played: {rounds.filter(r => r.courseId === course.id).length}
            </div>

            {!course.isHomeCourse && (
              <button
                onClick={() => setHomeCourse(course.id)}
                className="w-full px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
              >
                Set as Home Course
              </button>
            )}
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MapPin size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No courses added yet</p>
          <button
            onClick={() => setCurrentView('search')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Course
          </button>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Advanced Analytics</h2>

      {/* Detailed Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">FIR Percentage</div>
          <div className="text-2xl font-bold text-blue-600">{stats.firPct.toFixed(1)}%</div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${stats.firPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Avg Putts/Round</div>
          <div className="text-2xl font-bold text-purple-600">{(stats.puttingAvg * 18).toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.puttingAvg.toFixed(2)} per hole
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">Best Round</div>
          <div className="text-2xl font-bold text-green-600">
            {rounds.length > 0 ? Math.min(...rounds.map(r => r.totalScore)) : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Worst: {rounds.length > 0 ? Math.max(...rounds.map(r => r.totalScore)) : 'N/A'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-2">3-Putt Rate</div>
          <div className="text-2xl font-bold text-red-600">
            {((holeScores.filter(h => h.putts >= 3).length / Math.max(holeScores.length, 1)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Hole-by-Hole Analysis */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Hole-by-Hole Performance (All Courses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Array.from({ length: 18 }, (_, i) => {
            const holeNum = i + 1;
            const holesData = holeScores.filter(h => h.holeNumber === holeNum);
            const avgScore = holesData.length > 0 
              ? holesData.reduce((sum, h) => sum + h.score, 0) / holesData.length 
              : 0;
            return { hole: holeNum, avgScore: parseFloat(avgScore.toFixed(2)) };
          })}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hole" />
            <YAxis domain={[0, 6]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Rounds */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Rounds</h3>
        <div className="space-y-2">
          {rounds.slice(-10).reverse().map((round) => {
            const course = courses.find(c => c.id === round.courseId);
            return (
              <div key={round.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{course?.name || 'Unknown Course'}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(round.date).toLocaleDateString()} · {round.teeBox}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-xl font-bold ${
                    round.scoreToPar <= 0 ? 'text-green-600' : 
                    round.scoreToPar <= 5 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {round.totalScore}
                  </div>
                  <div className="text-sm text-gray-600">
                    {round.scoreToPar >= 0 ? '+' : ''}{round.scoreToPar}
                  </div>
                  <button
                    onClick={() => deleteRound(round.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderHomeCourse = () => {
    if (!homeCourse || !homeCourseStats) {
      return (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Home size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No home course set</p>
          <button
            onClick={() => setCurrentView('courses')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Set Home Course
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{homeCourse.name}</h2>
          <p className="text-gray-600">
            {homeCourse.location.city}, {homeCourse.location.state} · Par {homeCourse.par}
          </p>
        </div>

        {/* Home Course Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Rounds Played</div>
            <div className="text-3xl font-bold text-blue-600">{homeCourseStats.homeRounds.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Course Average</div>
            <div className="text-3xl font-bold text-green-600">{homeCourseStats.avgScore.toFixed(1)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Best Score</div>
            <div className="text-3xl font-bold text-purple-600">{homeCourseStats.bestScore || 'N/A'}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Course Record</div>
            <div className="text-3xl font-bold text-orange-600">
              {homeCourseStats.bestScore ? (homeCourseStats.bestScore - homeCourse.par >= 0 ? '+' : '') + (homeCourseStats.bestScore - homeCourse.par) : 'N/A'}
            </div>
          </div>
        </div>

        {/* Hole Performance Map */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Hole-by-Hole Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={homeCourseStats.holeAverages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hole" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="par" fill="#d1d5db" name="Par" />
              <Bar dataKey="avgScore" fill="#3b82f6" name="Your Avg" />
              <Line type="monotone" dataKey="toPar" stroke="#ef4444" strokeWidth={2} name="To Par" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Problem Holes */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Most Challenging Holes</h3>
            <div className="space-y-2">
              {homeCourseStats.holeAverages
                .filter(h => h.count > 0)
                .sort((a, b) => b.toPar - a.toPar)
                .slice(0, 5)
                .map((hole) => (
                  <div key={hole.hole} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="font-semibold">Hole {hole.hole}</span>
                      <span className="text-sm text-gray-600 ml-2">Par {hole.par}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        {hole.toPar >= 0 ? '+' : ''}{hole.toPar.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Avg: {hole.avgScore.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-green-600">Best Scoring Holes</h3>
            <div className="space-y-2">
              {homeCourseStats.holeAverages
                .filter(h => h.count > 0)
                .sort((a, b) => a.toPar - b.toPar)
                .slice(0, 5)
                .map((hole) => (
                  <div key={hole.hole} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-semibold">Hole {hole.hole}</span>
                      <span className="text-sm text-gray-600 ml-2">Par {hole.par}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {hole.toPar >= 0 ? '+' : ''}{hole.toPar.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">Avg: {hole.avgScore.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Score Progression */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Score Progression at Home Course</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={homeCourseStats.homeRounds.map((r, i) => ({
              round: i + 1,
              score: r.totalScore,
              date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings & Data</h2>

      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="text-lg font-semibold">Data Management</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-semibold">Export All Data</div>
              <div className="text-sm text-gray-600">Download all courses, rounds, and statistics</div>
            </div>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download size={20} />
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-semibold">Import Data</div>
              <div className="text-sm text-gray-600">Restore from a previous backup</div>
            </div>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer">
              <Upload size={20} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">App Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Total Courses</span>
            <span className="font-bold">{courses.length}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Total Rounds</span>
            <span className="font-bold">{rounds.length}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Total Holes Played</span>
            <span className="font-bold">{holeScores.length}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">App Version</span>
            <span className="font-bold">1.0.0</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">About Golf Stats Tracker</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>A progressive web app for tracking and analyzing your golf game.</p>
          <p className="font-semibold mt-4">Features:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Import courses from API or add manually</li>
            <li>Detailed hole-by-hole scoring</li>
            <li>Comprehensive statistics and analytics</li>
            <li>Home course performance tracking</li>
            <li>Strokes gained analysis</li>
            <li>Works completely offline</li>
            <li>Export and backup your data</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            All data is stored locally on your device using IndexedDB. No server required.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">API Configuration</h4>
        <p className="text-sm text-blue-800">
          Currently using mock data for demonstration. To use real course data, get an API key from 
          <a href="https://golfapi.io" target="_blank" rel="noopener noreferrer" className="underline ml-1">
            GolfAPI.io
          </a> or 
          <a href="https://golfcourseapi.com" target="_blank" rel="noopener noreferrer" className="underline ml-1">
            GolfCourseAPI.com
          </a> and update the API configuration in the code.
        </p>
      </div>
    </div>
  );

  if (!db) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Golf Stats Tracker...</p>
        </div>
      </div>
    );
  }

  if (showScorecard && selectedCourse) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Scorecard
            course={selectedCourse}
            onSave={saveRound}
            onCancel={() => {
              setShowScorecard(false);
              setSelectedCourse(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-600' : 
          notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        } text-white animate-pulse`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-blue-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-800">Golf Stats Tracker</h1>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <TrendingUp size={20} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('newRound')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'newRound' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Plus size={20} />
                New Round
              </button>
              <button
                onClick={() => setCurrentView('courses')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'courses' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <MapPin size={20} />
                Courses
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'analytics' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Award size={20} />
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('homeCourse')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'homeCourse' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Home size={20} />
                Home Course
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Settings size={20} />
                Settings
              </button>
            </nav>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 space-y-2">
              <button
                onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <TrendingUp size={20} />
                Dashboard
              </button>
              <button
                onClick={() => { setCurrentView('newRound'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'newRound' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Plus size={20} />
                New Round
              </button>
              <button
                onClick={() => { setCurrentView('courses'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'courses' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <MapPin size={20} />
                Courses
              </button>
              <button
                onClick={() => { setCurrentView('analytics'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'analytics' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Award size={20} />
                Analytics
              </button>
              <button
                onClick={() => { setCurrentView('homeCourse'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'homeCourse' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Home size={20} />
                Home Course
              </button>
              <button
                onClick={() => { setCurrentView('settings'); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
              >
                <Settings size={20} />
                Settings
              </button>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'newRound' && renderNewRound()}
        {currentView === 'search' && renderCourseSearch()}
        {currentView === 'courses' && renderCourses()}
        {currentView === 'analytics' && renderAnalytics()}
        {currentView === 'homeCourse' && renderHomeCourse()}
        {currentView === 'settings' && renderSettings()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Golf Stats Tracker - Progressive Web App</p>
          <p className="text-xs mt-2">
            📱 Install this app: Tap share button and "Add to Home Screen"
          </p>
          <p className="text-xs mt-1">💾 Data stored locally • 🔒 Works offline • 🌐 No internet required</p>
        </div>
      </footer>
    </div>
  );
}