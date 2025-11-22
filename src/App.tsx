import React, { useState, lazy, Suspense, useCallback } from 'react';
import { Activity, Menu, X, TrendingUp, Plus, MapPin, Award, Home, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { PWAInstallBanner, OfflineIndicator, usePWAInstall } from './PWAComponents';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const NewRound = lazy(() => import('./components/NewRound'));
const CourseSearch = lazy(() => import('./components/CourseSearch'));
const Courses = lazy(() => import('./components/Courses'));
const Analytics = lazy(() => import('./components/Analytics'));
const HomeCourse = lazy(() => import('./components/HomeCourse'));
const Settings = lazy(() => import('./components/Settings'));
const Scorecard = lazy(() => import('./components/Scorecard'));
const ScorecardImport = lazy(() => import('./components/ScorecardImport'));
import ErrorBoundary from './components/ErrorBoundary';

// Import hooks
import { useGolfData } from './hooks/useGolfData';
import { useStats } from './hooks/useStats';

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Attempting to register service worker at ./service-worker.js');
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('Service Worker registered successfully'))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}

// Main App Component
export default function GolfStatsApp() {
  console.log('GolfStatsApp component rendered');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Back navigation gesture state
  const [backSwipeStart, setBackSwipeStart] = useState<number | null>(null);

  // Back navigation handlers
  const handleBackTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX < 50) { // Near left edge
      setBackSwipeStart(touch.clientX);
    }
  };

  const handleBackTouchMove = (e: React.TouchEvent) => {
    if (backSwipeStart !== null) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - backSwipeStart;
      if (deltaX > 100) { // Swipe right enough
        setCurrentView('dashboard');
        setBackSwipeStart(null);
      }
    }
  };

  const handleBackTouchEnd = () => {
    setBackSwipeStart(null);
  };
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [showScorecard, setShowScorecard] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>(localStorage.getItem('golfApiKey') || '');

  // PWA Install functionality
  const { installApp, isInstallable } = usePWAInstall();

  // Use custom hooks
  const {
    db,
    courses,
    rounds,
    holeScores,
    api,
    isLoading,
    error,
    handleImportCourse,
    setHomeCourse,
    saveRound,
    deleteRound,
    exportData,
    importData,
    clearAllData
  } = useGolfData();

  const {
    stats,
    homeCourse,
    homeCourseStats,
    scoreTrendData,
    scoreDistributionData,
    parTypeData,
    gameProfileData,
    strokesGainedData,
    scramblingPct,
    sandSavePct,
    onePuttPct,
    birdieAvg,
    bogeyAvoidancePct
  } = useStats(rounds, holeScores, courses);

  const startNewRound = useCallback((course: any) => {
    setSelectedCourse(course);
    setShowScorecard(true);
  }, []);

  const showNotification = useCallback((message: string, type: string = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('golfApiKey', apiKeyInput.trim());
      showNotification('API key saved successfully', 'success');
      // Force re-initialization of API
      window.location.reload();
    } else {
      showNotification('Please enter a valid API key', 'error');
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('golfApiKey');
    setApiKeyInput('');
    showNotification('API key cleared - switched to mock data mode', 'info');
    // Force re-initialization of API
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Golf Stats Tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (showScorecard && selectedCourse) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-4xl mx-auto">
            <Scorecard
              course={selectedCourse}
              onSave={saveRound}
              onCancel={() => {
                setShowScorecard(false);
                setSelectedCourse(null);
              }}
              existingRound={undefined}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Bottom tab navigation items
  const tabItems = [
    { key: 'dashboard', label: 'Home', icon: Home, view: 'dashboard' },
    { key: 'scorecard', label: 'Scorecard', icon: Plus, view: 'newRound' },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, view: 'analytics' },
    { key: 'courses', label: 'Courses', icon: MapPin, view: 'courses' },
    { key: 'settings', label: 'Settings', icon: SettingsIcon, view: 'settings' },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 pb-16 md:pb-0"> {/* Add padding bottom for mobile tab bar */}
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-600' :
            notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          } text-white animate-pulse`}
          role="alert"
          aria-live="assertive"
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-blue-600" size={32} />
              <h1 className="text-2xl font-bold text-gray-800">CompuCaddy</h1>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              aria-label={drawerOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-2" role="navigation" aria-label="Main navigation">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="Go to Dashboard"
                aria-current={currentView === 'dashboard' ? 'page' : undefined}
              >
                <TrendingUp size={20} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('newRound')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'newRound' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="Start a new round"
                aria-current={currentView === 'newRound' ? 'page' : undefined}
              >
                <Plus size={20} />
                New Round
              </button>
              <button
                onClick={() => setCurrentView('courses')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'courses' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="View courses"
                aria-current={currentView === 'courses' ? 'page' : undefined}
              >
                <MapPin size={20} />
                Courses
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'analytics' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="View analytics"
                aria-current={currentView === 'analytics' ? 'page' : undefined}
              >
                <Award size={20} />
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('homeCourse')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'homeCourse' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="View home course"
                aria-current={currentView === 'homeCourse' ? 'page' : undefined}
              >
                <Home size={20} />
                Home Course
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  currentView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="Open settings"
                aria-current={currentView === 'settings' ? 'page' : undefined}
              >
                <SettingsIcon size={20} />
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Slide-out Drawer for Mobile */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 md:hidden transform transition-transform duration-300 ease-in-out"
            role="navigation"
            aria-label="Mobile drawer navigation"
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close drawer"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="py-4 space-y-2">
              {tabItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCurrentView(item.view);
                      setDrawerOpen(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 ${
                      isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                    }`}
                    aria-label={`Go to ${item.label}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setCurrentView('homeCourse');
                  setDrawerOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 ${
                  currentView === 'homeCourse' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                }`}
                aria-label="Go to Home Course"
                aria-current={currentView === 'homeCourse' ? 'page' : undefined}
              >
                <Home size={20} />
                Home Course
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Main Content */}
      <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <main
          className="max-w-7xl mx-auto px-4 py-6"
          onTouchStart={handleBackTouchStart}
          onTouchMove={handleBackTouchMove}
          onTouchEnd={handleBackTouchEnd}
        >
          {currentView === 'dashboard' && (
            <Dashboard
              courses={courses}
              stats={stats}
              scoreTrendData={scoreTrendData}
              scoreDistributionData={scoreDistributionData}
              parTypeData={parTypeData}
              gameProfileData={gameProfileData}
              strokesGainedData={strokesGainedData}
              setCurrentView={setCurrentView}
            />
          )}
          {currentView === 'newRound' && (
            <NewRound
              courses={courses}
              startNewRound={startNewRound}
              setCurrentView={setCurrentView}
            />
          )}
          {currentView === 'search' && (
            <CourseSearch
              api={api}
              handleImportCourse={handleImportCourse}
              setSearchResults={setSearchResults}
              searchResults={searchResults}
              setSearchQuery={setSearchQuery}
              searchQuery={searchQuery}
              setCurrentView={setCurrentView}
              showNotification={showNotification}
            />
          )}
          {currentView === 'courses' && (
            <Courses
              courses={courses}
              rounds={rounds}
              setHomeCourse={setHomeCourse}
              setCurrentView={setCurrentView}
              showNotification={showNotification}
            />
          )}
          {currentView === 'analytics' && (
            <Analytics
              stats={stats}
              holeScores={holeScores}
              rounds={rounds}
              courses={courses}
              deleteRound={deleteRound}
              showNotification={showNotification}
            />
          )}
          {currentView === 'homeCourse' && (
            <HomeCourse
              homeCourse={homeCourse}
              homeCourseStats={homeCourseStats}
              setCurrentView={setCurrentView}
            />
          )}
          {currentView === 'settings' && (
            <Settings
              courses={courses}
              rounds={rounds}
              holeScores={holeScores}
              exportData={exportData}
              importData={importData}
              clearAllData={clearAllData}
              apiKeyInput={apiKeyInput}
              setApiKeyInput={setApiKeyInput}
              saveApiKey={saveApiKey}
              clearApiKey={clearApiKey}
              showNotification={showNotification}
              api={api}
            />
          )}
          {currentView === 'scorecard-import' && db && (
            <ScorecardImport
              db={db}
              onSave={(course: any, round?: any) => saveRound(round, course)}
              onCancel={() => setCurrentView('courses')}
              onStartNewRound={startNewRound}
            />
          )}
        </main>
      </Suspense>

      {/* Bottom Tab Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40" role="navigation" aria-label="Mobile bottom navigation">
        <div className="flex justify-around">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentView(item.view)}
                className={`flex flex-col items-center py-2 px-3 flex-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
                aria-label={`Go to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 md:mt-0">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>Golf Stats Tracker - Progressive Web App</p>
          <p className="text-xs mt-2">
            📱 Install this app: Tap share button and "Add to Home Screen"
          </p>
          <p className="text-xs mt-1">💾 Data stored locally • 🔒 Works offline • 🌐 No internet required</p>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}