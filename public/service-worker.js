// Service Worker for Golf Stats Tracker PWA
// Place this file in the /public folder as service-worker.js

const CACHE_NAME = 'golf-stats-v2';
const STATIC_CACHE = 'golf-stats-static-v2';
const COURSE_DATA_CACHE = 'golf-stats-course-data-v2';
const API_CACHE = 'golf-stats-api-v2';

const urlsToCache = [
  '/compu-caddy/app/',
  '/compu-caddy/app/index.html',
  '/compu-caddy/app/manifest.json'
];

// Cache patterns for different types of content
const CACHE_PATTERNS = {
  static: /\.(?:html|css|js|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/,
  courseData: /\/api\/(?:courses|course-details)/,
  api: /\/api\//
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Service Worker: Caching static files');
          return cache.addAll(urlsToCache);
        }),
      caches.open(COURSE_DATA_CACHE),
      caches.open(API_CACHE)
    ]).catch((error) => {
      console.log('Service Worker: Cache failed', error);
    })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== COURSE_DATA_CACHE && cacheName !== API_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Claim all clients immediately
  return self.clients.claim();
});

// Fetch event - sophisticated caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine cache strategy based on request type
  if (CACHE_PATTERNS.static.test(request.url)) {
    // Static assets: Cache-first strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (CACHE_PATTERNS.courseData.test(request.url)) {
    // Course data: Network-first with cache fallback
    event.respondWith(networkFirst(request, COURSE_DATA_CACHE));
  } else if (CACHE_PATTERNS.api.test(request.url)) {
    // General API: Network-first with cache fallback
    event.respondWith(networkFirst(request, API_CACHE));
  } else {
    // Default: Network-first for dynamic content
    event.respondWith(networkFirst(request, API_CACHE));
  }
});

// Cache-first strategy for static assets
function cacheFirst(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) {
      console.log('Service Worker: Serving static from cache', request.url);
      return response;
    }

    return fetch(request).then((response) => {
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    });
  });
}

// Network-first strategy for dynamic content
function networkFirst(request, cacheName) {
  return fetch(request).then((response) => {
    if (response.status === 200) {
      const responseClone = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseClone);
      });
    }
    return response;
  }).catch(() => {
    console.log('Service Worker: Network failed, serving from cache', request.url);
    return caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      // Return offline fallback for course data
      if (CACHE_PATTERNS.courseData.test(request.url)) {
        return caches.match('/offline-course-data.json');
      }
    });
  });
}

// Background sync for data synchronization
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'sync-golf-data') {
    event.waitUntil(syncGolfData());
  } else if (event.tag === 'sync-rounds') {
    event.waitUntil(syncRounds());
  } else if (event.tag === 'sync-courses') {
    event.waitUntil(syncCourses());
  }
});

// Data synchronization functions
async function syncGolfData() {
  try {
    console.log('Service Worker: Syncing golf data');

    // Get pending changes from IndexedDB
    const pendingChanges = await getPendingChanges();

    for (const change of pendingChanges) {
      try {
        await syncChange(change);
        await markChangeAsSynced(change.id);
      } catch (error) {
        console.error('Failed to sync change:', change.id, error);
        // Keep change in queue for retry
      }
    }

    // Refresh cached course data
    await refreshCourseCache();

  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncRounds() {
  try {
    console.log('Service Worker: Syncing rounds');

    // Get unsynced rounds from IndexedDB
    const unsyncedRounds = await getUnsyncedRounds();

    for (const round of unsyncedRounds) {
      try {
        await uploadRound(round);
        await markRoundAsSynced(round.id);
      } catch (error) {
        console.error('Failed to sync round:', round.id, error);
      }
    }
  } catch (error) {
    console.error('Round sync failed:', error);
  }
}

async function syncCourses() {
  try {
    console.log('Service Worker: Syncing courses');

    // Get unsynced course imports
    const unsyncedCourses = await getUnsyncedCourses();

    for (const course of unsyncedCourses) {
      try {
        await uploadCourse(course);
        await markCourseAsSynced(course.id);
      } catch (error) {
        console.error('Failed to sync course:', course.id, error);
      }
    }
  } catch (error) {
    console.error('Course sync failed:', error);
  }
}

// Helper functions for data synchronization
async function getPendingChanges() {
  // This would access IndexedDB to get pending changes
  // For now, return empty array - will be implemented with conflict resolution
  return [];
}

async function syncChange(change) {
  // Implement change synchronization logic
  console.log('Syncing change:', change);
}

async function markChangeAsSynced(id) {
  // Mark change as synced in IndexedDB
  console.log('Marked change as synced:', id);
}

async function refreshCourseCache() {
  try {
    // Refresh course data cache from API
    const response = await fetch('/api/courses');
    if (response.ok) {
      const cache = await caches.open(COURSE_DATA_CACHE);
      await cache.put('/api/courses', response);
    }
  } catch (error) {
    console.error('Failed to refresh course cache:', error);
  }
}

async function getUnsyncedRounds() {
  // Get rounds that haven't been synced yet
  return [];
}

async function uploadRound(round) {
  // Upload round to server
  console.log('Uploading round:', round);
}

async function markRoundAsSynced(id) {
  // Mark round as synced
  console.log('Marked round as synced:', id);
}

async function getUnsyncedCourses() {
  // Get courses that haven't been synced
  return [];
}

async function uploadCourse(course) {
  // Upload course to server
  console.log('Uploading course:', course);
}

async function markCourseAsSynced(id) {
  // Mark course as synced
  console.log('Marked course as synced:', id);
}

// Push notifications (optional future feature)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Golf Stats Tracker';
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});

// Periodic background sync for updating cached data
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync', event.tag);

  if (event.tag === 'update-course-data') {
    event.waitUntil(updateCourseData());
  } else if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupCache());
  }
});

async function updateCourseData() {
  try {
    console.log('Service Worker: Updating course data cache');

    // Fetch latest course data
    const response = await fetch('/api/courses');
    if (response.ok) {
      const courses = await response.json();

      // Cache the course list
      const cache = await caches.open(COURSE_DATA_CACHE);
      await cache.put('/api/courses', new Response(JSON.stringify(courses)));

      // Cache individual course details for frequently accessed courses
      for (const course of courses.slice(0, 10)) { // Cache top 10 courses
        try {
          const detailResponse = await fetch(`/api/course-details/${course.id}`);
          if (detailResponse.ok) {
            await cache.put(`/api/course-details/${course.id}`, detailResponse);
          }
        } catch (error) {
          console.log('Failed to cache course details:', course.id, error);
        }
      }

      console.log('Course data cache updated successfully');
    }
  } catch (error) {
    console.error('Periodic course data update failed:', error);
  }
}

async function cleanupCache() {
  try {
    console.log('Service Worker: Cleaning up old cache entries');

    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, COURSE_DATA_CACHE, API_CACHE];

    // Delete old caches
    for (const cacheName of cacheNames) {
      if (!currentCaches.includes(cacheName)) {
        await caches.delete(cacheName);
      }
    }

    // Clean up old entries in current caches
    for (const cacheName of currentCaches) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const date = response.headers.get('date');
          if (date) {
            const responseDate = new Date(date);
            const now = new Date();
            const daysOld = (now - responseDate) / (1000 * 60 * 60 * 24);

            // Remove entries older than 30 days
            if (daysOld > 30) {
              await cache.delete(request);
            }
          }
        }
      }
    }

    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}