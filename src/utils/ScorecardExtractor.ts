import { createWorker, Worker, PSM } from 'tesseract.js';

// Interfaces
interface CourseMetadata {
  courseName: string;
  location?: string;
  parRatings: number[];
  holeDetails: {
    holeNumber: number;
    par: number;
    distance?: number;
    handicap?: number;
  }[];
  totalPar: number;
  confidence: number; // 0-1
}

interface DetectionResult {
  hasScores: boolean;
  confidence: number; // 0-1
  detectedScoreRegions?: {
    holeNumber: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  }[];
}

interface ExtractedScoreData {
  holeNumber: number;
  score: number | null;
  putts?: number | null;
  confidence: number; // 0-1
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface Course {
  id: string;
  name: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  holes: {
    number: number;
    par: number;
    handicap: number;
    yardages: { [key: string]: number };
  }[];
  par: number;
  confidence: number;
}

interface Round {
  courseId: string;
  date: string;
  teeBox: string;
  holeScores: {
    holeNumber: number;
    score: number;
    putts?: number;
    fairwayHit?: string;
    greenInRegulation?: boolean;
    penaltyStrokes?: number;
  }[];
  confidence: number;
}

class ScorecardExtractor {
  private worker: Worker | null = null;

  // Initialize Tesseract worker
  private async initWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = await createWorker('eng');
    }
    return this.worker;
  }

  // Basic image preprocessing
  private async preprocessImage(imageBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Convert to grayscale
        ctx.filter = 'grayscale(100%) contrast(150%) brightness(120%)';
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to preprocess image'));
          }
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageBlob);
    });
  }

  // Extract course metadata from front/back photos
  async extractCourseMetadata(frontPhoto: Blob, backPhoto?: Blob): Promise<CourseMetadata> {
    try {
      const worker = await this.initWorker();

      // Process front photo
      const processedFront = await this.preprocessImage(frontPhoto);
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',
        tessedit_pageseg_mode: PSM.AUTO
      });

      const { data: frontData } = await worker.recognize(processedFront);
      const frontText = frontData.text;
      const frontConfidence = frontData.confidence / 100;

      let backText = '';
      let backConfidence = 0;

      // Process back photo if provided
      if (backPhoto) {
        const processedBack = await this.preprocessImage(backPhoto);
        const { data: backData } = await worker.recognize(processedBack);
        backText = backData.text;
        backConfidence = backData.confidence / 100;
      }

      // Combine texts
      const combinedText = frontText + '\n' + backText;
      const overallConfidence = Math.min(frontConfidence, backConfidence || 1);

      // Parse course metadata
      const metadata = this.parseCourseMetadata(combinedText);
      metadata.confidence = Math.min(metadata.confidence, overallConfidence);

      return metadata;
    } catch (error) {
      throw new Error(`Failed to extract course metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Detect if scorecard has scores filled in
  async detectScoresFilled(scorecardPhoto: Blob): Promise<DetectionResult> {
    try {
      const worker = await this.initWorker();

      const processedImage = await this.preprocessImage(scorecardPhoto);
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: PSM.SPARSE_TEXT
      });

      const { data } = await worker.recognize(processedImage);
      const text = data.text;
      const confidence = data.confidence / 100;

      const hasScores = this.detectScorePatterns(text);
      const regions = this.extractScoreRegions((data as any).words);

      return {
        hasScores,
        confidence,
        detectedScoreRegions: regions
      };
    } catch (error) {
      throw new Error(`Failed to detect scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract round data from scorecard photo
  async extractRoundData(scorecardPhoto: Blob, courseMetadata: CourseMetadata): Promise<ExtractedScoreData[]> {
    try {
      const worker = await this.initWorker();

      const processedImage = await this.preprocessImage(scorecardPhoto);
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK
      });

      const { data } = await worker.recognize(processedImage);
      const text = data.text;
      const ocrConfidence = data.confidence / 100;

      const scores = this.parseScorecardText(text, (data as any).words);
      const adjustedScores = scores.map(score => ({
        ...score,
        confidence: Math.min(score.confidence, ocrConfidence)
      }));

      return adjustedScores;
    } catch (error) {
      throw new Error(`Failed to extract round data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Parse course metadata from OCR text
  private parseCourseMetadata(text: string): CourseMetadata {
    const lines = text.split('\n').filter(line => line.trim());
    let courseName = '';
    let location = '';
    const parRatings: number[] = [];
    const holeDetails: CourseMetadata['holeDetails'] = [];
    let totalPar = 0;
    let confidence = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract course name
      const nameMatch = trimmed.match(/^(?:course|club)[\s:]*([^\d]+?)(?:\s*\d|\s*$)/i);
      if (nameMatch && !courseName) {
        courseName = nameMatch[1].trim();
        confidence += 0.3;
      }

      // Extract location
      const locationMatch = trimmed.match(/(?:location|city|state)[\s:]*(.+)/i);
      if (locationMatch && !location) {
        location = locationMatch[1].trim();
        confidence += 0.1;
      }

      // Extract par information
      const parMatch = trimmed.match(/par[\s:]*(\d+)/i);
      if (parMatch) {
        const par = parseInt(parMatch[1]);
        if (par >= 3 && par <= 5) {
          parRatings.push(par);
          confidence += 0.2;
        }
      }

      // Extract hole details (hole number, par, distance, handicap)
      const holeMatch = trimmed.match(/hole[\s:]*(\d+)[\s,]*par[\s:]*(\d+)(?:\s*,?\s*distance[\s:]*(\d+))?(?:\s*,?\s*handicap[\s:]*(\d+))?/i);
      if (holeMatch) {
        const holeNumber = parseInt(holeMatch[1]);
        const par = parseInt(holeMatch[2]);
        const distance = holeMatch[3] ? parseInt(holeMatch[3]) : undefined;
        const handicap = holeMatch[4] ? parseInt(holeMatch[4]) : undefined;

        if (holeNumber >= 1 && holeNumber <= 18 && par >= 3 && par <= 5) {
          holeDetails.push({
            holeNumber,
            par,
            distance,
            handicap
          });
          confidence += 0.4;
        }
      }
    }

    // Calculate total par
    totalPar = parRatings.reduce((sum, par) => sum + par, 0);

    // Ensure we have at least some basic information
    if (!courseName) {
      courseName = 'Unknown Course';
      confidence -= 0.3;
    }

    if (holeDetails.length === 0 && parRatings.length > 0) {
      // Create hole details from par ratings
      holeDetails.push(...parRatings.map((par, index) => ({
        holeNumber: index + 1,
        par
      })));
    }

    confidence = Math.max(0, Math.min(1, confidence));

    return {
      courseName,
      location,
      parRatings,
      holeDetails,
      totalPar,
      confidence
    };
  }

  // Detect score patterns in text
  private detectScorePatterns(text: string): boolean {
    const lines = text.split('\n');
    let scoreIndicators = 0;

    for (const line of lines) {
      const numbers = line.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        // Check if numbers look like hole numbers and scores
        const nums = numbers.map(n => parseInt(n));
        if (nums.some(n => n >= 1 && n <= 18) && nums.some(n => n >= 1 && n <= 10)) {
          scoreIndicators++;
        }
      }
    }

    return scoreIndicators >= 3; // Threshold for considering scores present
  }

  // Extract score regions from OCR words
  private extractScoreRegions(words: any[]): DetectionResult['detectedScoreRegions'] {
    const regions: DetectionResult['detectedScoreRegions'] = [];

    for (const word of words) {
      if (word.text.match(/^\d+$/) && parseInt(word.text) >= 1 && parseInt(word.text) <= 18) {
        // Potential hole number
        regions.push({
          holeNumber: parseInt(word.text),
          boundingBox: word.bbox
        });
      }
    }

    return regions;
  }

  // Parse scorecard text for scores
  private parseScorecardText(text: string, words: any[]): ExtractedScoreData[] {
    const lines = text.split('\n').filter(line => line.trim());
    const scores: ExtractedScoreData[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for patterns like "1 4" (hole score) or "Hole 1: 4"
      const scoreMatch = trimmed.match(/(?:hole\s*)?(\d+)\s*:?\s*(\d+)/i);
      if (scoreMatch) {
        const holeNumber = parseInt(scoreMatch[1]);
        const score = parseInt(scoreMatch[2]);

        if (holeNumber >= 1 && holeNumber <= 18 && score >= 1 && score <= 15) {
          // Find bounding box from words
          const boundingBox = this.findBoundingBoxForHole(words, holeNumber);

          scores.push({
            holeNumber,
            score,
            confidence: 0.8 // Base confidence, adjusted by OCR confidence later
          });
        }
      }
    }

    return scores;
  }

  // Find bounding box for a specific hole number
  private findBoundingBoxForHole(words: any[], holeNumber: number): { x: number; y: number; width: number; height: number } | undefined {
    const word = words.find(w => w.text === holeNumber.toString());
    return word ? word.bbox : undefined;
  }

  // Convert CourseMetadata to Course object
  convertToCourse(metadata: CourseMetadata): Course {
    const holes = metadata.holeDetails.map(detail => ({
      number: detail.holeNumber,
      par: detail.par,
      handicap: detail.handicap || 1, // Default handicap
      yardages: detail.distance ? { regular: detail.distance } : ({} as {[key: string]: number})
    }));

    return {
      id: `course-${Date.now()}`,
      name: metadata.courseName,
      location: {
        address: metadata.location,
        city: metadata.location?.split(',')[0]?.trim(),
        state: metadata.location?.split(',')[1]?.trim()
      },
      holes,
      par: metadata.totalPar,
      confidence: metadata.confidence
    };
  }

  // Convert ExtractedScoreData to Round object
  convertToRound(extractedScores: ExtractedScoreData[], courseId: string): Round {
    const holeScores = extractedScores
      .filter(score => score.score !== null)
      .map(score => ({
        holeNumber: score.holeNumber,
        score: score.score!,
        putts: score.putts || undefined,
        fairwayHit: undefined,
        greenInRegulation: undefined,
        penaltyStrokes: 0
      }));

    const averageConfidence = extractedScores.reduce((sum, s) => sum + s.confidence, 0) / extractedScores.length;

    return {
      courseId,
      date: new Date().toISOString().split('T')[0],
      teeBox: 'Regular',
      holeScores,
      confidence: averageConfidence
    };
  }

  // Cleanup worker
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export default ScorecardExtractor;
export type { CourseMetadata, DetectionResult, ExtractedScoreData, Course, Round };