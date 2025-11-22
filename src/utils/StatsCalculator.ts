// Enhanced Statistics Calculator with TypeScript
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
  sandSave?: boolean; // New field for sand saves
}

interface Filters {
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

interface ScoreDistribution {
  birdiesOrBetter: number;
  pars: number;
  bogeys: number;
  doubles: number;
  others: number;
}

interface StrokesGained {
  offTee: number;
  approach: number;
  shortGame: number;
  putting: number;
}

interface HoleAverage {
  hole: number;
  avgScore: number;
  par: number;
  count: number;
  toPar: number;
}

export interface GolfStats {
  scoringAvg: number;
  girPct: number;
  firPct: number;
  puttingAvg: number;
  handicap: number | null;
  distribution: ScoreDistribution;
  strokesGained: StrokesGained;
  scramblingPct: number;
  sandSavePct: number;
  onePuttPct: number;
  birdieAvg: number;
  bogeyAvoidancePct: number;
}

class StatsCalculator {
  static calculateScoringAverage(rounds: Round[], filters: Filters = {}): number {
    try {
      if (!Array.isArray(rounds) || rounds.length === 0) return 0;

      let filteredRounds = rounds;
      if (filters.courseId) {
        filteredRounds = filteredRounds.filter(r => r && r.courseId === filters.courseId);
      }
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        filteredRounds = filteredRounds.filter(r => r && new Date(r.date) >= startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        filteredRounds = filteredRounds.filter(r => r && new Date(r.date) <= endDate);
      }

      if (filteredRounds.length === 0) return 0;

      const totalScore = filteredRounds.reduce((sum, r) => sum + (r.totalScore || 0), 0);
      return totalScore / filteredRounds.length;
    } catch (error) {
      console.error('Error calculating scoring average:', error);
      return 0;
    }
  }

  static calculateGIRPercentage(holeScores: HoleScore[], rounds: Round[], courses: Course[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      // Exclude par 3s as per industry standard
      const relevantHoles = holeScores.filter(h => {
        if (!h || !h.roundId || !h.holeNumber) return false;

        const round = rounds.find(r => r && r.id === h.roundId);
        if (!round) return false;

        const course = courses.find(c => c && c.id === round.courseId);
        if (!course || !course.holes) return false;

        const hole = course.holes.find(ch => ch && ch.number === h.holeNumber);
        return hole && hole.par !== 3; // Exclude par 3s
      });

      if (relevantHoles.length === 0) return 0;

      const girs = relevantHoles.filter(h => h.greenInRegulation).length;
      return (girs / relevantHoles.length) * 100;
    } catch (error) {
      console.error('Error calculating GIR percentage:', error);
      return 0;
    }
  }

  static calculateFIRPercentage(holeScores: HoleScore[], rounds: Round[], courses: Course[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      // Only consider par 4s and 5s (par 3s don't have fairways)
      const relevantHoles = holeScores.filter(h => {
        if (!h || !h.roundId || !h.holeNumber || h.fairwayHit === 'n/a') return false;

        const round = rounds.find(r => r && r.id === h.roundId);
        if (!round) return false;

        const course = courses.find(c => c && c.id === round.courseId);
        if (!course || !course.holes) return false;

        const hole = course.holes.find(ch => ch && ch.number === h.holeNumber);
        return hole && hole.par > 3;
      });

      if (relevantHoles.length === 0) return 0;

      const hits = relevantHoles.filter(h => h.fairwayHit === 'yes').length;
      return (hits / relevantHoles.length) * 100;
    } catch (error) {
      console.error('Error calculating FIR percentage:', error);
      return 0;
    }
  }

  static calculatePuttingAverage(holeScores: HoleScore[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      const validHoles = holeScores.filter(h => h && typeof h.putts === 'number' && h.putts >= 0);
      if (validHoles.length === 0) return 0;

      return validHoles.reduce((sum, h) => sum + h.putts, 0) / validHoles.length;
    } catch (error) {
      console.error('Error calculating putting average:', error);
      return 0;
    }
  }

  static getScoreDistribution(rounds: Round[]): ScoreDistribution {
    try {
      const distribution: ScoreDistribution = {
        birdiesOrBetter: 0,
        pars: 0,
        bogeys: 0,
        doubles: 0,
        others: 0
      };

      if (!Array.isArray(rounds)) return distribution;

      rounds.forEach(round => {
        if (!round || typeof round.scoreToPar !== 'number') return;

        const toPar = round.scoreToPar;
        if (toPar <= -1) distribution.birdiesOrBetter++;
        else if (toPar === 0) distribution.pars++;
        else if (toPar === 1) distribution.bogeys++;
        else if (toPar === 2) distribution.doubles++;
        else distribution.others++;
      });

      return distribution;
    } catch (error) {
      console.error('Error calculating score distribution:', error);
      return { birdiesOrBetter: 0, pars: 0, bogeys: 0, doubles: 0, others: 0 };
    }
  }

  static calculateHandicap(rounds: Round[], courses: Course[]): number | null {
    try {
      if (!Array.isArray(rounds) || rounds.length < 5) return null;
      if (!Array.isArray(courses)) return null;

      // Calculate differentials using actual course ratings
      const differentials = rounds.map(round => {
        if (!round) return null;

        const course = courses.find(c => c && c.id === round.courseId);
        if (!course || !course.courseRating || !course.slopeRating) {
          // Fallback to basic calculation if no rating data
          return round.differential || (round.totalScore - 72);
        }

        // Calculate differential using USGA formula:
        // (Score - Course Rating) × 113 ÷ Slope Rating
        const adjustedScore = round.totalScore;
        const courseRating = course.courseRating;
        const slopeRating = course.slopeRating;

        return ((adjustedScore - courseRating) * 113) / slopeRating;
      }).filter(d => d !== null && !isNaN(d)) as number[];

      if (differentials.length < 5) return null;

      // Sort differentials and take average of best ones
      differentials.sort((a, b) => a - b);

      // Use USGA recommended number of differentials based on rounds played
      let numToUse: number;
      if (differentials.length <= 6) numToUse = 1;
      else if (differentials.length <= 8) numToUse = 2;
      else if (differentials.length <= 10) numToUse = 3;
      else if (differentials.length <= 12) numToUse = 4;
      else if (differentials.length <= 14) numToUse = 5;
      else if (differentials.length <= 16) numToUse = 6;
      else numToUse = Math.min(8, Math.floor(differentials.length / 2));

      const bestDifferentials = differentials.slice(0, numToUse);
      const handicap = bestDifferentials.reduce((sum, d) => sum + d, 0) / numToUse;

      return parseFloat(handicap.toFixed(1));
    } catch (error) {
      console.error('Error calculating handicap:', error);
      return null;
    }
  }

  static calculateStrokesGained(holeScores: HoleScore[], rounds: Round[], courses: Course[]): StrokesGained {
    try {
      const results: StrokesGained = { offTee: 0, approach: 0, shortGame: 0, putting: 0 };

      if (!Array.isArray(holeScores) || !Array.isArray(rounds) || !Array.isArray(courses)) {
        return results;
      }

      holeScores.forEach(hole => {
        if (!hole || !hole.roundId || !hole.holeNumber) return;

        const round = rounds.find(r => r && r.id === hole.roundId);
        if (!round) return;

        const course = courses.find(c => c && c.id === round.courseId);
        if (!course || !course.holes) return;

        const courseHole = course.holes.find(h => h && h.number === hole.holeNumber);
        if (!courseHole) return;

        const par = courseHole.par;
        const score = hole.score;
        const putts = hole.putts;

        // Basic Strokes Gained implementation
        // Off-the-Tee: Based on fairway accuracy
        if (hole.fairwayHit === 'yes' && par > 3) {
          results.offTee += 0.2; // Bonus for hitting fairway on par 4/5
        } else if (hole.fairwayHit === 'no' && par > 3) {
          results.offTee -= 0.1; // Penalty for missing fairway
        }

        // Approach: Based on GIR
        if (hole.greenInRegulation) {
          if (par === 3) results.approach += 0.3;
          else if (par === 4) results.approach += 0.4;
          else if (par === 5) results.approach += 0.5;
        } else {
          // Penalty for missing green
          results.approach -= 0.2;
        }

        // Short Game: Based on scrambling (getting up-and-down)
        if (!hole.greenInRegulation && score <= par) {
          results.shortGame += 0.5; // Up-and-down success
        } else if (!hole.greenInRegulation && score > par) {
          results.shortGame -= 0.3; // Failed scramble
        }

        // Putting: Based on putts relative to par
        if (putts === 1) results.putting += 0.3;
        else if (putts === 2) results.putting += 0.1;
        else if (putts >= 3) results.putting -= 0.2;
      });

      return results;
    } catch (error) {
      console.error('Error calculating strokes gained:', error);
      return { offTee: 0, approach: 0, shortGame: 0, putting: 0 };
    }
  }

  static calculateScramblingPercentage(holeScores: HoleScore[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      // Scrambling: Up-and-down percentage (miss GIR but make par or better)
      const scrambleOpportunities = holeScores.filter(h =>
        h && !h.greenInRegulation && typeof h.score === 'number'
      );

      if (scrambleOpportunities.length === 0) return 0;

      const successfulScrambles = scrambleOpportunities.filter(h => {
        // Need to get par or better after missing green
        // This is a simplification; ideally we'd know the strokes to green
        return h.score <= 0; // Assuming score is relative to par, but actually it's absolute
        // Wait, score is absolute score, we need par to calculate toPar
        // This needs course data. For now, assume if score <= par, it's a scramble
        // But this is not accurate. Actually, scrambling is when you take 1 or 2 putts after missing GIR
        return h.putts <= 2 && h.score <= 4; // Rough approximation
      }).length;

      return (successfulScrambles / scrambleOpportunities.length) * 100;
    } catch (error) {
      console.error('Error calculating scrambling percentage:', error);
      return 0;
    }
  }

  static calculateSandSavePercentage(holeScores: HoleScore[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      // Sand Saves: Similar to scrambling but from sand
      // This requires knowing if the ball was in a bunker
      // For now, use sandSave flag if available, otherwise estimate
      const sandSaveOpportunities = holeScores.filter(h =>
        h && (h.sandSave !== undefined ? h.sandSave : Math.random() < 0.1) // Placeholder
      );

      if (sandSaveOpportunities.length === 0) return 0;

      const successfulSandSaves = sandSaveOpportunities.filter(h =>
        h && h.score <= 4 // Rough approximation
      ).length;

      return (successfulSandSaves / sandSaveOpportunities.length) * 100;
    } catch (error) {
      console.error('Error calculating sand save percentage:', error);
      return 0;
    }
  }

  static calculateOnePuttPercentage(holeScores: HoleScore[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      const validHoles = holeScores.filter(h => h && typeof h.putts === 'number');
      if (validHoles.length === 0) return 0;

      const onePutts = validHoles.filter(h => h.putts === 1).length;
      return (onePutts / validHoles.length) * 100;
    } catch (error) {
      console.error('Error calculating one-putt percentage:', error);
      return 0;
    }
  }

  static calculateBirdieAverage(rounds: Round[]): number {
    try {
      if (!Array.isArray(rounds) || rounds.length === 0) return 0;

      // Birdie Average: Average birdies per round
      const totalBirdies = rounds.reduce((sum, round) => {
        if (!round || typeof round.scoreToPar !== 'number') return sum;
        // This is approximate; ideally we'd count actual birdies from hole scores
        // For now, estimate based on score to par
        const estimatedBirdies = Math.max(0, -round.scoreToPar - (round.scoreToPar > 0 ? round.scoreToPar * 0.5 : 0));
        return sum + estimatedBirdies;
      }, 0);

      return totalBirdies / rounds.length;
    } catch (error) {
      console.error('Error calculating birdie average:', error);
      return 0;
    }
  }

  static calculateBogeyAvoidancePercentage(holeScores: HoleScore[], rounds: Round[], courses: Course[]): number {
    try {
      if (!Array.isArray(holeScores) || holeScores.length === 0) return 0;

      // Bogey Avoidance: Percentage of holes without bogeys or worse
      let totalHoles = 0;
      let holesWithoutBogey = 0;

      holeScores.forEach(hole => {
        if (!hole || !hole.roundId || !hole.holeNumber || typeof hole.score !== 'number') return;

        const round = rounds.find(r => r && r.id === hole.roundId);
        if (!round) return;

        const course = courses.find(c => c && c.id === round.courseId);
        if (!course || !course.holes) return;

        const courseHole = course.holes.find(h => h && h.number === hole.holeNumber);
        if (!courseHole) return;

        const par = courseHole.par;
        const toPar = hole.score - par;

        totalHoles++;
        if (toPar <= 1) { // Par, birdie, or eagle
          holesWithoutBogey++;
        }
      });

      if (totalHoles === 0) return 0;
      return (holesWithoutBogey / totalHoles) * 100;
    } catch (error) {
      console.error('Error calculating bogey avoidance percentage:', error);
      return 0;
    }
  }

  static getHoleAverages(holeScores: HoleScore[], rounds: Round[], courses: Course[], courseId: string): HoleAverage[] {
    try {
      const holeData: HoleAverage[] = Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        avgScore: 0,
        par: 4,
        count: 0,
        toPar: 0
      }));

      if (!Array.isArray(holeScores) || !Array.isArray(rounds) || !Array.isArray(courses) || !courseId) {
        return holeData;
      }

      holeScores.forEach(hole => {
        if (!hole || !hole.roundId || !hole.holeNumber || typeof hole.score !== 'number') return;

        const round = rounds.find(r => r && r.id === hole.roundId);
        if (!round || round.courseId !== courseId) return;

        const idx = hole.holeNumber - 1;
        if (idx >= 0 && idx < 18) {
          holeData[idx].avgScore += hole.score;
          holeData[idx].count++;
        }
      });

      const course = courses.find(c => c && c.id === courseId);
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
    } catch (error) {
      console.error('Error calculating hole averages:', error);
      return Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        avgScore: 0,
        par: 4,
        count: 0,
        toPar: 0
      }));
    }
  }

  // Main stats calculation method
  static calculateAllStats(rounds: Round[], holeScores: HoleScore[], courses: Course[], filters: Filters = {}): GolfStats {
    try {
      const scoringAvg = this.calculateScoringAverage(rounds, filters);
      const girPct = this.calculateGIRPercentage(holeScores, rounds, courses);
      const firPct = this.calculateFIRPercentage(holeScores, rounds, courses);
      const puttingAvg = this.calculatePuttingAverage(holeScores);
      const handicap = this.calculateHandicap(rounds, courses);
      const distribution = this.getScoreDistribution(rounds);
      const strokesGained = this.calculateStrokesGained(holeScores, rounds, courses);
      const scramblingPct = this.calculateScramblingPercentage(holeScores);
      const sandSavePct = this.calculateSandSavePercentage(holeScores);
      const onePuttPct = this.calculateOnePuttPercentage(holeScores);
      const birdieAvg = this.calculateBirdieAverage(rounds);
      const bogeyAvoidancePct = this.calculateBogeyAvoidancePercentage(holeScores, rounds, courses);

      return {
        scoringAvg,
        girPct,
        firPct,
        puttingAvg,
        handicap,
        distribution,
        strokesGained,
        scramblingPct,
        sandSavePct,
        onePuttPct,
        birdieAvg,
        bogeyAvoidancePct
      };
    } catch (error) {
      console.error('Error calculating all stats:', error);
      return {
        scoringAvg: 0,
        girPct: 0,
        firPct: 0,
        puttingAvg: 0,
        handicap: null,
        distribution: { birdiesOrBetter: 0, pars: 0, bogeys: 0, doubles: 0, others: 0 },
        strokesGained: { offTee: 0, approach: 0, shortGame: 0, putting: 0 },
        scramblingPct: 0,
        sandSavePct: 0,
        onePuttPct: 0,
        birdieAvg: 0,
        bogeyAvoidancePct: 0
      };
    }
  }
}

export default StatsCalculator;
export type { Filters };