import { useState, useEffect } from 'react';
import GolfDB from '../utils/GolfDB';
import GolfCourseAPI from '../utils/GolfCourseAPI';

// Type definitions
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
  imported: boolean;
  importDate?: string;
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

export function useGolfData() {
  const [db, setDb] = useState<GolfDB | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [holeScores, setHoleScores] = useState<HoleScore[]>([]);
  const [api] = useState(() => new GolfCourseAPI());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [pendingConflicts, setPendingConflicts] = useState<any[]>([]);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const database = new GolfDB();
        await database.init();
        setDb(database);

        const loadedCourses = await database.getAll('courses') as Course[];
        const loadedRounds = await database.getAll('rounds') as Round[];
        const loadedHoles = await database.getAll('holeScores') as HoleScore[];

        setCourses(loadedCourses);
        setRounds(loadedRounds);
        setHoleScores(loadedHoles);

        // Only load sample data for fresh installs when using mock data
        // Real API users should import their own courses
        const apiInstance = new GolfCourseAPI();
        if (loadedCourses.length === 0 && loadedRounds.length === 0 && apiInstance.useMockData) {
          await addSampleData(database);
          const newCourses = await database.getAll('courses') as Course[];
          const newRounds = await database.getAll('rounds') as Round[];
          const newHoles = await database.getAll('holeScores') as HoleScore[];
          setCourses(newCourses);
          setRounds(newRounds);
          setHoleScores(newHoles);
        }
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      if (db) {
        performSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  // Load pending conflicts
  useEffect(() => {
    if (db) {
      loadPendingConflicts();
    }
  }, [db]);

  const addSampleData = async (database: GolfDB) => {
    const sampleCourse: Course = {
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

      const round: Round = {
        id: roundId,
        courseId: 'sample-course-1',
        date: date.toISOString(),
        teeBox: 'Regular',
        totalScore,
        scoreToPar: totalScore - 72,
        differential: totalScore - 72,
        completed: true,
        imported: false
      };

      await database.put('rounds', round);

      for (let h = 1; h <= 18; h++) {
        const par = h % 3 === 0 ? 3 : h % 3 === 1 ? 4 : 5;
        const score = par + Math.floor(Math.random() * 3) - 1;

        const holeScore: HoleScore = {
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

  const handleImportCourse = async (apiCourse: any): Promise<Course> => {
    try {
      const details = await api.getCourseDetails(apiCourse.id);

      if (!details) {
        throw new Error('This course has incomplete data and cannot be imported. Try a different course.');
      }

      const course: Course = {
        id: `course-${Date.now()}`,
        apiId: details.id,
        name: details.name || apiCourse.name,
        location: {
          address: details.location?.address,
          city: details.location?.city || apiCourse.city,
          state: details.location?.state || apiCourse.state,
          country: details.location?.country || apiCourse.country,
          latitude: details.location?.latitude,
          longitude: details.location?.longitude
        },
        isHomeCourse: courses.length === 0,
        imported: true,
        importDate: new Date().toISOString(),
        holes: details.holes,
        teeBoxes: details.teeBoxes,
        par: details.par,
        courseRating: details.courseRating,
        slopeRating: details.slopeRating,
        bogeyRating: details.bogeyRating,
        frontNineRating: details.frontNineRating,
        backNineRating: details.backNineRating,
        lastModified: Date.now()
      };

      await db!.put('courses', course);

      // Add to sync queue if offline
      if (!isOnline) {
        await addToSyncQueue('courses', 'put', course);
      }

      setCourses([...courses, course]);
      return course;
    } catch (error) {
      throw error;
    }
  };

  const importCourseFromScorecard = async (course: Course) => {
    try {
      const courseId = course.id || `course-${Date.now()}`;
      const importedCourse: Course = {
        ...course,
        id: courseId,
        imported: true,
        importDate: new Date().toISOString(),
        isHomeCourse: courses.length === 0
      };

      await db!.put('courses', importedCourse);

      // Add to sync queue if offline
      if (!isOnline) {
        await addToSyncQueue('courses', 'put', importedCourse);
      }

      setCourses([...courses, importedCourse]);
      return importedCourse;
    } catch (error) {
      throw error;
    }
  };

  const setHomeCourse = async (courseId: string) => {
    const updatedCourses = courses.map(c => ({
      ...c,
      isHomeCourse: c.id === courseId
    }));

    for (const course of updatedCourses) {
      await db!.put('courses', course);
    }

    setCourses(updatedCourses);
  };

  const saveRoundFromScorecard = async (round: Round, courseId: string) => {
    try {
      const roundId = round.id || `round-${Date.now()}`;
      const importedRound: Round = {
        ...round,
        id: roundId,
        courseId,
        imported: true,
        importDate: new Date().toISOString(),
        completed: true
      };

      await db!.put('rounds', importedRound);

      // Add to sync queue if offline
      if (!isOnline) {
        await addToSyncQueue('rounds', 'put', importedRound);
      }

      const newRounds = await db!.getAll('rounds') as Round[];
      setRounds(newRounds);
      return importedRound;
    } catch (error) {
      throw error;
    }
  };

  const saveRound = async (roundData: any, selectedCourse: Course) => {
    try {
      const roundId = `round-${Date.now()}`;
      const round: Round = {
        id: roundId,
        courseId: selectedCourse.id,
        ...roundData,
        completed: true,
        imported: false,
        lastModified: Date.now()
      };

      await db!.put('rounds', round);

      for (const hole of roundData.holeScores) {
        const holeScore: HoleScore = {
          id: `hole-${roundId}-${hole.holeNumber}`,
          roundId,
          ...hole
        };
        await db!.put('holeScores', holeScore);
      }

      // Add to sync queue if offline
      if (!isOnline) {
        await addToSyncQueue('rounds', 'put', round);
        for (const hole of roundData.holeScores) {
          const holeScore: HoleScore = {
            id: `hole-${roundId}-${hole.holeNumber}`,
            roundId,
            ...hole
          };
          await addToSyncQueue('holeScores', 'put', holeScore);
        }
      }

      const newRounds = await db!.getAll('rounds') as Round[];
      const newHoles = await db!.getAll('holeScores') as HoleScore[];
      setRounds(newRounds);
      setHoleScores(newHoles);
    } catch (error) {
      throw error;
    }
  };

  const deleteRound = async (roundId: string) => {
    try {
      await db!.delete('rounds', roundId);
      const roundHoles = holeScores.filter(h => h.roundId === roundId);
      for (const hole of roundHoles) {
        await db!.delete('holeScores', hole.id);
      }

      setRounds(rounds.filter(r => r.id !== roundId));
      setHoleScores(holeScores.filter(h => h.roundId !== roundId));
    } catch (error) {
      throw error;
    }
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
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format. Expected a JSON object.');
      }

      if (!Array.isArray(data.courses)) {
        throw new Error('Invalid courses data. Expected an array.');
      }

      if (!Array.isArray(data.rounds)) {
        throw new Error('Invalid rounds data. Expected an array.');
      }

      if (!Array.isArray(data.holeScores)) {
        throw new Error('Invalid hole scores data. Expected an array.');
      }

      // Basic validation for each course
      for (const course of data.courses) {
        if (!course.id || !course.name) {
          throw new Error('Invalid course data. Each course must have an id and name.');
        }
      }

      // Basic validation for each round
      for (const round of data.rounds) {
        if (!round.id || !round.courseId || typeof round.totalScore !== 'number') {
          throw new Error('Invalid round data. Each round must have id, courseId, and totalScore.');
        }
      }

      // Basic validation for each hole score
      for (const hole of data.holeScores) {
        if (!hole.id || !hole.roundId || typeof hole.score !== 'number') {
          throw new Error('Invalid hole score data. Each hole must have id, roundId, and score.');
        }
      }

      for (const course of data.courses) {
        await db!.put('courses', course);
      }
      for (const round of data.rounds) {
        await db!.put('rounds', round);
      }
      for (const hole of data.holeScores) {
        await db!.put('holeScores', hole);
      }

      setCourses(data.courses);
      setRounds(data.rounds);
      setHoleScores(data.holeScores);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format. Please check your backup file.');
      }
      throw error;
    }
  };

  const clearAllData = async () => {
    try {
      // Clear all data from IndexedDB
      const allCourses = await db!.getAll('courses');
      const allRounds = await db!.getAll('rounds');
      const allHoles = await db!.getAll('holeScores');

      for (const course of allCourses) {
        await db!.delete('courses', course.id);
      }
      for (const round of allRounds) {
        await db!.delete('rounds', round.id);
      }
      for (const hole of allHoles) {
        await db!.delete('holeScores', hole.id);
      }

      setCourses([]);
      setRounds([]);
      setHoleScores([]);
    } catch (error) {
      throw error;
    }
  };

  // Offline sync functions
  const performSync = async () => {
    if (!db || !isOnline) return;

    try {
      setSyncStatus('syncing');

      // Get sync queue
      const syncQueue = await db.getSyncQueue();

      for (const item of syncQueue) {
        try {
          await processSyncItem(item);
          await db.markSyncItemComplete(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
          await db.retrySyncItem(item.id);
        }
      }

      // Check for conflicts
      await checkForConflicts();

      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  const processSyncItem = async (item: any) => {
    // Process different types of sync operations
    switch (item.operation) {
      case 'add':
        // Sync add operation
        break;
      case 'put':
        // Sync put operation
        break;
      case 'delete':
        // Sync delete operation
        break;
    }
  };

  const checkForConflicts = async () => {
    if (!db) return;

    try {
      // Fetch remote data and check for conflicts
      // This would typically involve API calls to get server data
      const conflicts = await db.getPendingConflicts();
      setPendingConflicts(conflicts);
    } catch (error) {
      console.error('Failed to check conflicts:', error);
    }
  };

  const loadPendingConflicts = async () => {
    if (!db) return;

    try {
      const conflicts = await db.getPendingConflicts();
      setPendingConflicts(conflicts);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const resolveConflict = async (conflictId: string, resolution: any) => {
    if (!db) return;

    try {
      await db.resolveStoredConflict(conflictId, resolution);
      await loadPendingConflicts();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const addToSyncQueue = async (storeName: string, operation: string, data: any) => {
    if (!db) return;

    try {
      await db.addToSyncQueue(storeName, operation, data);

      // If offline, register background sync
      if (!isOnline) {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if ('sync' in (registration as any)) {
            await (registration as any).sync.register('sync-golf-data');
          }
        }
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  };

  return {
    db,
    courses,
    rounds,
    holeScores,
    api,
    isLoading,
    error,
    isOnline,
    syncStatus,
    pendingConflicts,
    handleImportCourse,
    importCourseFromScorecard,
    setHomeCourse,
    saveRound,
    saveRoundFromScorecard,
    deleteRound,
    exportData,
    importData,
    clearAllData,
    performSync,
    resolveConflict,
    addToSyncQueue
  };
}