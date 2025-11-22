import React, { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';

// Import types from useGolfData
interface Location {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface Hole {
  number: number;
  par: number;
  handicap: number;
  yardages: { [key: string]: number };
}

interface Course {
  id: string;
  apiId?: string;
  name: string;
  location: Location;
  isHomeCourse: boolean;
  imported: boolean;
  importDate?: string;
  holes: Hole[];
  teeBoxes?: any;
  par: number;
  courseRating?: number;
  slopeRating?: number;
  bogeyRating?: number;
  frontNineRating?: number;
  backNineRating?: number;
  lastModified?: number;
}

interface Round {
  id: string;
  courseId: string;
  date: string;
  teeBox: string;
  totalScore: number;
  scoreToPar: number;
  differential: number;
  completed: boolean;
}

interface HoleScore {
  id: string;
  roundId: string;
  holeNumber: number;
  score: number;
  putts: number;
  fairwayHit: string;
  greenInRegulation: boolean;
  penaltyStrokes: number;
}

interface GolfCourseAPI {
  apiKey?: string;
}

interface SettingsProps {
  courses: Course[];
  rounds: Round[];
  holeScores: HoleScore[];
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  clearAllData: () => Promise<void>;
  apiKeyInput: string;
  setApiKeyInput: (key: string) => void;
  saveApiKey: () => void;
  clearApiKey: () => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  api: GolfCourseAPI;
}

function Settings({
  courses,
  rounds,
  holeScores,
  exportData,
  importData,
  clearAllData,
  apiKeyInput,
  setApiKeyInput,
  saveApiKey,
  clearApiKey,
  showNotification,
  api
}: SettingsProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importData(file);
      showNotification('Data imported successfully', 'success');
    } catch (error) {
      showNotification('Error importing data. Please check the file format.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('This will permanently delete all your courses, rounds, and statistics. Are you sure?')) return;

    setIsClearing(true);
    try {
      await clearAllData();
      showNotification('All data cleared successfully', 'success');
    } catch (error) {
      showNotification('Error clearing data', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey();
      showNotification('API key saved successfully', 'success');
    } else {
      showNotification('Please enter a valid API key', 'error');
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    showNotification('API key cleared - switched to mock data mode', 'info');
  };

  return (
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
            <label className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload size={20} />
              {isImporting ? 'Importing...' : 'Import'}
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <div className="font-semibold text-red-700">Clear All Data</div>
              <div className="text-sm text-gray-600">Permanently delete all courses, rounds, and statistics</div>
            </div>
            <button
              onClick={handleClearAllData}
              disabled={isClearing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Trash2 size={20} />
              {isClearing ? 'Clearing...' : 'Clear Data'}
            </button>
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

      <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
        <h4 className="font-semibold text-green-900 mb-2">API Key Configuration</h4>
        <p className="text-sm text-green-800 mb-3">
          Enter your GolfCourseAPI.com API key to access real golf course data. Get your key at{' '}
          <a href="https://golfcourseapi.com" target="_blank" rel="noopener noreferrer" className="underline">
            golfcourseapi.com
          </a>
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Enter your API key..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSaveApiKey}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Save Key
          </button>
          <button
            onClick={handleClearApiKey}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
        <p className="text-xs text-green-700">
          API key is stored locally in your browser. Current status: {api.apiKey ? '✅ Real API enabled' : '⚠️ Using mock data'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">API Configuration</h4>
        <p className="text-sm text-blue-800 mb-2">
          Course data powered by{' '}
          <a href="https://golfcourseapi.com" target="_blank" rel="noopener noreferrer" className="underline">
            GolfCourseAPI.com
          </a>. You can also set REACT_APP_GOLF_API_KEY as an environment variable during build.
        </p>
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> If you previously had mock data loaded, use "Clear All Data" above to start fresh with real courses.
        </p>
      </div>
    </div>
  );
}

export default Settings;