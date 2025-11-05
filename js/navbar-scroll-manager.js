/* ============================================================================
   NAVBAR SCROLL MANAGER - ADD THIS TO YOUR EXISTING JAVASCRIPT
   Features: Detects scroll direction, hides navbar on scroll down, shows on scroll up
   ============================================================================ */

class NavbarScrollManager {
    constructor() {
        this.lastScrollTop = 0;
        this.scrollThreshold = 5; // Minimum pixels to detect scroll
        this.ticking = false;
        this.init();
    }

    init() {
        // Use passive event listener for better scroll performance
        window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
        
        // Initialize navbar visibility state
        this.updateNavbarState();
    }

    handleScroll() {
        // Use requestAnimationFrame for smooth 60fps scroll detection
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.updateNavbarState();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    updateNavbarState() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Only apply hide/show after scrolling past threshold
        if (Math.abs(currentScroll - this.lastScrollTop) < this.scrollThreshold) {
            return;
        }

        if (currentScroll > this.lastScrollTop && currentScroll > 60) {
            // Scrolling DOWN and past navbar - Hide navbar
            document.body.classList.remove('scrolling-up');
            document.body.classList.add('scrolling-down');
        } else {
            // Scrolling UP or at top - Show navbar
            document.body.classList.remove('scrolling-down');
            document.body.classList.add('scrolling-up');
        }

        this.lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize navbar scroll manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the navbar scroll detection
    new NavbarScrollManager();
    
    // Log confirmation
    console.log('✓ Navbar scroll manager initialized');
});

// Also initialize on page load (in case DOMContentLoaded already fired)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        new NavbarScrollManager();
    });
} else {
    new NavbarScrollManager();
}
