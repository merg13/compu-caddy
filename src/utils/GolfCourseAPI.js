// Real Golf Course API service (GolfCourseAPI.com format)
class GolfCourseAPI {
  constructor() {
    // NOTE: API key can be set via VITE_GOLF_API_KEY environment variable or user settings
    this.baseUrl = 'https://api.golfcourseapi.com';
    this.apiKey = import.meta.env.VITE_GOLF_API_KEY || localStorage.getItem('golfApiKey') || '';
    this.useMockData = !this.apiKey; // Use mock data only if no API key is available
  }

  async searchCourses(query) {
    if (this.useMockData || !this.apiKey) {
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
      const response = await fetch(`${this.baseUrl}/v1/search?search_query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Key ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Search API Error Response:', errorText);

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your GolfCourseAPI.com key.');
        } else if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();

      // Transform API response to expected format
      return data.courses.map(course => ({
        id: course.id.toString(),
        name: course.club_name || course.course_name,
        city: course.location?.city || '',
        state: course.location?.state || '',
        country: course.location?.country || '',
        holes: 18, // Default, will be updated when course details are fetched
        par: 72   // Default, will be updated when course details are fetched
      }));
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      console.error('API Error:', error);
      throw error; // Re-throw to let caller handle
    }
  }

  async getCourseDetails(courseId) {
    if (this.useMockData || !this.apiKey) {
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
      const response = await fetch(`${this.baseUrl}/v1/courses/${courseId}`, {
        headers: {
          'Authorization': `Key ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your GolfCourseAPI.com key.');
        } else if (response.status === 404) {
          throw new Error('Course not found. Please try a different course.');
        } else if (response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();

      // Handle different API response structures
      const courseData = data.course || data;

      // Use male tees as primary, fallback to female if not available
      const primaryTees = courseData.tees?.male || courseData.tees?.female || [];

      if (primaryTees.length === 0) {
        // No tee information available - return null instead of creating defaults
        console.warn('No tee information available for course');
        return null;
      }

      // Use the first tee as the primary one
      const primaryTee = primaryTees[0];

      // Transform holes data
      const holes = primaryTee.holes && primaryTee.holes.length > 0
        ? primaryTee.holes.map((hole, index) => ({
            number: index + 1,
            par: hole.par || 4,
            handicap: hole.handicap || index + 1,
            yardages: {
              championship: hole.yardage || Math.floor((primaryTee.total_yards || 6500) / 18),
              regular: hole.yardage || Math.floor((primaryTee.total_yards || 6500) / 18),
              forward: hole.yardage || Math.floor((primaryTee.total_yards || 6500) / 18)
            }
          }))
        : Array.from({ length: 18 }, (_, index) => ({
            number: index + 1,
            par: 4, // Default par
            handicap: index + 1,
            yardages: {
              championship: Math.floor((primaryTee.total_yards || 6500) / 18),
              regular: Math.floor((primaryTee.total_yards || 6500) / 18),
              forward: Math.floor((primaryTee.total_yards || 6500) / 18)
            }
          }));

      // Create tee boxes from available tees
      const teeBoxes = primaryTees.map(tee => ({
        name: tee.tee_name,
        rating: tee.course_rating,
        slope: tee.slope_rating,
        totalYards: tee.total_yards,
        color: this.getTeeColor(tee.tee_name),
        frontRating: tee.front_course_rating,
        backRating: tee.back_course_rating,
        frontSlope: tee.front_slope_rating,
        backSlope: tee.back_slope_rating
      }));

      return {
        id: courseData.id?.toString() || courseId,
        name: courseData.club_name || courseData.course_name,
        location: {
          address: courseData.location?.address,
          city: courseData.location?.city,
          state: courseData.location?.state,
          country: courseData.location?.country,
          latitude: courseData.location?.latitude,
          longitude: courseData.location?.longitude
        },
        holes,
        teeBoxes,
        par: primaryTee.par_total,
        courseRating: primaryTee.course_rating,
        slopeRating: primaryTee.slope_rating,
        bogeyRating: primaryTee.bogey_rating,
        frontNineRating: primaryTee.front_course_rating,
        backNineRating: primaryTee.back_course_rating
      };
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      console.error('API Error:', error);
      throw error; // Re-throw to let caller handle
    }
  }

  // Helper method to map tee names to colors
  getTeeColor(teeName) {
    const colorMap = {
      'Black': 'black',
      'Blue': 'blue',
      'White': 'white',
      'Red': 'red',
      'Gold': 'gold',
      'Green': 'green'
    };
    return colorMap[teeName] || 'blue'; // Default to blue
  }
}

export default GolfCourseAPI;