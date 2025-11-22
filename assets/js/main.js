// Compu-Caddy Landing Page JavaScript
// Interactive functionality for the download landing page

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initNavigation();
    initScrollEffects();
    initInstallPrompt();
    initAnimations();
});

// Navigation functionality
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    });
    
    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const navbarHeight = navbar.offsetHeight;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Scroll to section function (called from HTML onclick)
function scrollToSection(sectionId) {
    const targetElement = document.getElementById(sectionId);
    const navbar = document.querySelector('.navbar');
    
    if (targetElement) {
        const navbarHeight = navbar.offsetHeight;
        const targetPosition = targetElement.offsetTop - navbarHeight - 20;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

// Scroll effects for animations
function initScrollEffects() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .download-card, .screenshot-card, .metric-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// PWA Install Prompt Detection
function initInstallPrompt() {
    let deferredPrompt;
    let installBanner = null;
    
    // Check if browser supports PWA install
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA install prompt available');
        
        // Show custom install banner
        showInstallBanner();
    });
    
    // Check if app was already installed
    window.addEventListener('appinstalled', (evt) => {
        console.log('PWA was installed');
        hideInstallBanner();
    });
    
    // Check if dismissed before
    if (localStorage.getItem('compu-caddy-install-dismissed')) {
        // Don't show banner if dismissed
        return;
    }
    
    // Show install banner with a delay
    setTimeout(() => {
        if (!window.matchMedia('(display-mode: standalone)').matches && 
            !window.navigator.standalone && 
            deferredPrompt) {
            showInstallBanner();
        }
    }, 3000);
}

function showInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 400px;
            margin: 0 auto;
            animation: slideUp 0.5s ease;
        ">
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 14px;">📱 Install Compu-Caddy</div>
                <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">Get offline access & app-like experience</div>
            </div>
            <div style="display: flex; gap: 8px; margin-left: 16px;">
                <button onclick="installPWA()" style="
                    background: white;
                    color: #10b981;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 12px;
                ">Install</button>
                <button onclick="dismissInstallBanner()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                ">Later</button>
            </div>
        </div>
        <style>
            @keyframes slideUp {
                from { transform: translateY(100px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        </style>
    `;
    
    document.body.appendChild(banner);
    installBanner = banner;
}

function hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.remove();
    }
}

function installPWA() {
    if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        
        window.deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                // Track installation event
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'pwa_install', {
                        event_category: 'engagement',
                        event_label: 'compu-caddy'
                    });
                }
            } else {
                console.log('User dismissed the install prompt');
            }
            
            window.deferredPrompt = null;
            hideInstallBanner();
        });
    } else {
        // Fallback - open the app
        openApp();
    }
}

function dismissInstallBanner() {
    localStorage.setItem('compu-caddy-install-dismissed', 'true');
    hideInstallBanner();
}

// Open the main application
function openApp() {
    console.log('openApp called from landing page, current path:', window.location.pathname);
    // Track app launch event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'app_launch', {
            event_category: 'engagement',
            event_label: 'landing_page'
        });
    }

    // Check if we should redirect to the actual app
    const currentPath = window.location.pathname;
    if (currentPath.includes('landing-site') || currentPath === '/' || currentPath === '') {
        // We're on the landing page, open the app in a new tab
        console.log('Opening app at https://merg13.github.io/compu-caddy/app/');
        window.open('https://merg13.github.io/compu-caddy/app/', '_blank');
    } else {
        // We're already on the app
        console.log('Redirecting to /');
        window.location.href = '/';
    }
}

// Animation initialization
function initAnimations() {
    // Animate phone mockup on hover
    const phoneMockup = document.querySelector('.phone-mockup');
    if (phoneMockup) {
        phoneMockup.addEventListener('mouseenter', function() {
            this.style.transform = 'perspective(1000px) rotateY(-10deg) rotateX(2deg) scale(1.05)';
        });
        
        phoneMockup.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateY(-15deg) rotateX(5deg) scale(1)';
        });
    }
    
    // Animate feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add floating animation to phone mockup
    if (phoneMockup) {
        phoneMockup.style.animation = 'floatPhone 6s ease-in-out infinite';
    }
}

// Add floating phone animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatPhone {
        0%, 100% { transform: perspective(1000px) rotateY(-15deg) rotateX(5deg) translateY(0px); }
        50% { transform: perspective(1000px) rotateY(-15deg) rotateX(5deg) translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Platform detection for download instructions
function detectPlatform() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    if (/iPad|iPhone|iPod/.test(userAgent)) {
        return 'ios';
    } else if (/Android/.test(userAgent)) {
        return 'android';
    } else if (/Mac|Macintosh/.test(platform)) {
        return 'mac';
    } else if (/Win/.test(platform)) {
        return 'windows';
    } else if (/Linux/.test(platform)) {
        return 'linux';
    } else {
        return 'desktop';
    }
}

// Show platform-specific download instructions
function showPlatformInstructions() {
    const platform = detectPlatform();
    console.log('Detected platform:', platform);
    
    // Could be used to highlight the relevant download card
    // This is just for analytics/tracking purposes
    if (typeof gtag !== 'undefined') {
        gtag('event', 'platform_detection', {
            event_category: 'technical',
            event_label: platform
        });
    }
}

// Initialize platform detection
showPlatformInstructions();

// Add click tracking for CTA buttons
document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-primary')) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'cta_click', {
                event_category: 'engagement',
                event_label: 'primary_button'
            });
        }
    }
    
    if (e.target.closest('.btn-secondary')) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'cta_click', {
                event_category: 'engagement',
                event_label: 'secondary_button'
            });
        }
    }
});

// Add error handling for missing elements
function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (e) {
        console.warn(`Element not found: ${selector}`);
        return null;
    }
}

// Export functions for global access
window.scrollToSection = scrollToSection;
window.openApp = openApp;
window.installPWA = installPWA;
window.dismissInstallBanner = dismissInstallBanner;
