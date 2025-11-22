import { useMemo } from 'react';
import StatsCalculator, { type GolfStats } from '../utils/StatsCalculator';

// Type definitions (should be shared, but for now duplicated)
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
  sandSave?: boolean;
}

export function useStats(rounds: Round[], holeScores: HoleScore[], courses: Course[]) {
  const stats: GolfStats = useMemo(() => {
    return StatsCalculator.calculateAllStats(rounds, holeScores, courses);
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

  return {
    stats,
    homeCourse,
    homeCourseStats,
    scoreTrendData,
    scoreDistributionData,
    parTypeData,
    gameProfileData,
    strokesGainedData,
    // New metrics
    scramblingPct: stats.scramblingPct,
    sandSavePct: stats.sandSavePct,
    onePuttPct: stats.onePuttPct,
    birdieAvg: stats.birdieAvg,
    bogeyAvoidancePct: stats.bogeyAvoidancePct
  };
}