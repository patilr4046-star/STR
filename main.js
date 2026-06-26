import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// --- Smooth Scrolling with Lenis ---
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.5,
  infinite: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Keep ScrollTrigger in sync with Lenis
lenis.on('scroll', ScrollTrigger.update);

// --- Asset Preloader & Canvas Configuration ---
const frameCount = 219;
const images = [];
const tigerWalkFrames = { frame: 0 };
let introTriggered = false;

const loaderBar = document.getElementById('loader-progress-bar');
const loaderStatus = document.getElementById('loader-status');
const loaderOverlay = document.getElementById('loader');
const introContainer = document.getElementById('intro-container');
const introVideo = document.getElementById('intro-video');
const skipIntroBtn = document.getElementById('skip-intro-btn');
const mainApp = document.getElementById('main-app');
const canvas = document.getElementById('tiger-canvas');
const ctx = canvas.getContext('2d');

// Preload assets
function startPreloading() {
  let loadedCount = 0;
  const totalAssets = frameCount + 1; // 219 frames + 1 video

  function assetLoaded() {
    loadedCount++;
    const progress = Math.floor((loadedCount / totalAssets) * 100);
    
    // Update loader UI
    loaderBar.style.width = `${progress}%`;
    loaderStatus.textContent = `Entering the Reserve... ${progress}%`;
    
    if (loadedCount === totalAssets) {
      setTimeout(onPreloadComplete, 500);
    }
  }

  // Preload intro video
  let videoLoadTriggered = false;
  
  const checkVideoStatus = () => {
    if (!videoLoadTriggered) {
      videoLoadTriggered = true;
      assetLoaded();
    }
  };

  // Video event listeners
  introVideo.addEventListener('canplaythrough', checkVideoStatus, { once: true });
  introVideo.addEventListener('loadeddata', checkVideoStatus, { once: true });
  
  // Mobile device network fallback: trigger after 2 seconds regardless of load event
  setTimeout(checkVideoStatus, 2000);
  introVideo.load();

  // Preload Tiger Walk Frames
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    const frameNum = String(i).padStart(3, '0');
    // Match the exact naming in workspace: ezgif-frame-001.jpg
    img.src = `/Tiger walk-jpg/ezgif-frame-${frameNum}.jpg`;
    img.onload = assetLoaded;
    img.onerror = () => {
      console.warn(`Failed to load frame: ${frameNum}`);
      assetLoaded(); // count as loaded to avoid blocking site
    };
    images.push(img);
  }
}

// When preload is complete, transition into the Intro video
function onPreloadComplete() {
  // Fade out loader screen
  gsap.to(loaderOverlay, {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => {
      loaderOverlay.style.display = 'none';
      startIntroExperience();
    }
  });
}

// --- Intro Experience ---
function startIntroExperience() {
  introContainer.classList.add('active-state');
  
  // Play video
  introVideo.play().catch(error => {
    console.log("Autoplay blocked, showing play controls or starting transition:", error);
    // On some restricted mobile browsers, autoplay fails. We proceed directly in this case
    setTimeout(transitionToIntroTitles, 500);
  });
  
  transitionToIntroTitles();
}

function transitionToIntroTitles() {
  // Watch for video end or click skip
  introVideo.addEventListener('ended', transitionToLandingPage);
  skipIntroBtn.addEventListener('click', transitionToLandingPage);
}

// Seamless Transition into Scrollytelling Landing Page
function transitionToLandingPage() {
  if (introTriggered) return;
  introTriggered = true;

  // Cinematic GSAP transition out
  const transitionTimeline = gsap.timeline({
    onComplete: () => {
      introContainer.style.display = 'none';
      introVideo.pause();
    }
  });

  // Zoom and fade the video container
  transitionTimeline.to(introContainer, {
    opacity: 0,
    scale: 1.1,
    filter: 'blur(10px)',
    duration: 1.2,
    ease: 'power2.inOut'
  });

  // Show main app and scroll to top immediately
  mainApp.classList.remove('hidden-state');
  window.scrollTo(0, 0);
  lenis.scrollTo(0, { immediate: true });

  transitionTimeline.fromTo(mainApp, {
    opacity: 0,
    y: 30
  }, {
    opacity: 1,
    y: 0,
    duration: 1.4,
    ease: 'power3.out'
  }, '-=0.8');

  // Hero typography entry animation
  transitionTimeline.from('.reveal-text', {
    y: 50,
    opacity: 0,
    stagger: 0.12,
    duration: 1.2,
    ease: 'power4.out'
  }, '-=0.9');

  // Trigger setup of scrolling layers and resize
  setTimeout(() => {
    resizeCanvas();
    setupScrollTriggerAnimations();
  }, 100);
}

// --- Canvas Drawing Logic ---
function resizeCanvas() {
  if (!canvas) return;
  
  // Set drawing width/height to match container layout width
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  
  // Redraw the current active frame
  drawTigerFrame(tigerWalkFrames.frame);
}

function drawTigerFrame(index) {
  const frameIndex = Math.floor(index);
  const img = images[frameIndex];
  
  if (!img) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const imgWidth = img.width;
  const imgHeight = img.height;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth, drawHeight, x, y;

  // Modern cover/contain logic: Contain the tiger inside the screen
  if (canvasRatio > imgRatio) {
    // Height is the limiting factor
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
    x = (canvasWidth - drawWidth) / 2;
    y = 0;
  } else {
    // Width is the limiting factor
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    x = 0;
    y = (canvasHeight - drawHeight) / 2;
  }

  // Draw tiger frame
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}

// --- GSAP and ScrollTrigger Configuration ---
function setupScrollTriggerAnimations() {
  
  // 1. Header scroll visual transformation
  ScrollTrigger.create({
    start: 'top -50px',
    onEnter: () => document.querySelector('.main-header').classList.add('scrolled'),
    onLeaveBack: () => document.querySelector('.main-header').classList.remove('scrolled'),
  });

  // 2. Parallax overlay on Hero Section
  gsap.to('.hero-bg-overlay', {
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    },
    background: 'radial-gradient(circle, rgba(0, 0, 0, 0.6) 0%, rgba(3, 8, 5, 1) 100%)'
  });

  // 3. Tiger walking canvas scrub triggers (looping the sequence 3 times for a longer walk)
  const loops = 3;
  gsap.to(tigerWalkFrames, {
    frame: (frameCount * loops) - 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#scrolly-section',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.1, // very fast, tight sync to scroll speed
      onUpdate: () => {
        const activeFrame = Math.floor(tigerWalkFrames.frame) % frameCount;
        drawTigerFrame(activeFrame);
      }
    }
  });

  // 4. Highlight active scrolly story cards
  const cards = document.querySelectorAll('.story-card');
  cards.forEach((card, index) => {
    ScrollTrigger.create({
      trigger: card,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => card.classList.add('active-card'),
      onEnterBack: () => card.classList.add('active-card'),
      onLeave: () => card.classList.remove('active-card'),
      onLeaveBack: () => card.classList.remove('active-card'),
    });
  });

  // 5. Fade-in animations for section entries (About, Biodiversity, Conservation)
  
  // About section fades
  gsap.from('.reveal-left', {
    scrollTrigger: {
      trigger: '#about',
      start: 'top 80%',
      end: 'top 40%',
      scrub: 1
    },
    x: -80,
    opacity: 0,
  });

  gsap.from('.reveal-right', {
    scrollTrigger: {
      trigger: '#about',
      start: 'top 80%',
      end: 'top 40%',
      scrub: 1
    },
    x: 80,
    opacity: 0,
  });

  // Biodiversity cards staggered reveal
  gsap.from('.bio-card', {
    scrollTrigger: {
      trigger: '#biodiversity',
      start: 'top 75%'
    },
    y: 50,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    ease: 'power3.out'
  });

  // Conservation list items reveal
  gsap.from('.pillar-item', {
    scrollTrigger: {
      trigger: '.pillar-list',
      start: 'top 80%'
    },
    y: 30,
    opacity: 0,
    stagger: 0.15,
    duration: 0.8,
    ease: 'power2.out'
  });

  // 6. Mobile Performance optimization: reduce animation complexity on smaller screens
  if (window.innerWidth <= 768) {
    // Disable parallax offsets to keep frame rate smooth
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.scrub === true) {
        trigger.scrub = false; // Disable scrubs on mobile to reduce reflow lag
      }
    });
  }
}

// --- Menu Interaction & Mobile Drawer Logic ---
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

function toggleMobileMenu() {
  const isActive = menuToggleBtn.classList.toggle('active');
  mobileMenu.classList.toggle('active', isActive);
  
  // Prevent scrolling when drawer is active
  if (isActive) {
    lenis.stop();
  } else {
    lenis.start();
  }
}

menuToggleBtn.addEventListener('click', toggleMobileMenu);

mobileNavLinks.forEach(link => {
  link.addEventListener('click', () => {
    // Close menu drawer
    menuToggleBtn.classList.remove('active');
    mobileMenu.classList.remove('active');
    lenis.start();
    
    // Smooth scroll to target section
    const targetId = link.getAttribute('href');
    if (targetId && targetId.startsWith('#')) {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        lenis.scrollTo(targetElement);
      }
    }
  });
});

// Smooth anchor scrolling on desktop
document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (targetId && targetId.startsWith('#')) {
      e.preventDefault();
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        lenis.scrollTo(targetElement);
      }
    }
  });
});

// --- Safari Booking Form Handling ---
const inquiryForm = document.getElementById('safari-inquiry-form');
const formMessage = document.getElementById('form-message');

if (inquiryForm) {
  inquiryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-inquiry-btn');
    submitBtn.textContent = 'Checking Availability...';
    submitBtn.disabled = true;
    
    // Simulate API request delay
    setTimeout(() => {
      submitBtn.textContent = 'Check Availability';
      submitBtn.disabled = false;
      
      formMessage.textContent = 'Thank you! We have logged your inquiry. Our team will contact you shortly.';
      formMessage.className = 'form-message success';
      
      inquiryForm.reset();
      
      // Clear message after 5 seconds
      setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = 'form-message';
      }, 5000);
    }, 1500);
  });
}

// --- Window Events ---
window.addEventListener('resize', () => {
  resizeCanvas();
});

// Initialize loader sequence
window.addEventListener('DOMContentLoaded', () => {
  startPreloading();
});
