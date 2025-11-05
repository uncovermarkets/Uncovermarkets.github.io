/* ============================================================================
   UNCOVER MARKETS PWA - MAIN APPLICATION SCRIPT
   Features: Firebase auth, newsletter uploads, photo handling, content loading
   ============================================================================ */

// ============================================================================
// FIREBASE CONFIGURATION (Update with your credentials)
// ============================================================================

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "uncover-markets.firebaseapp.com",
    projectId: "uncover-markets",
    storageBucket: "uncover-markets.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase (will be done after Firebase SDK loads)
let firebase;
let firebaseApp;

// ============================================================================
// AUTHENTICATION MANAGER
// ============================================================================

class AuthManager {
    constructor() {
        this.logoutBtn = document.getElementById('logout-btn');
        this.currentUser = null;
        this.init();
    }

    init() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        }
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const userToken = localStorage.getItem('userToken');
        const userEmail = localStorage.getItem('userEmail');

        if (userToken && userEmail) {
            this.currentUser = {
                email: userEmail,
                token: userToken
            };
            console.log('✓ User authenticated:', userEmail);
            this.showAdminPanel();
        } else {
            console.log('✗ User not authenticated');
            this.hideAdminPanel();
        }
    }

    handleLogout(e) {
        e.preventDefault();

        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userRole');

            if (window.firebase && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    console.log('✓ User logged out');
                    window.location.href = '/';
                }).catch(error => {
                    console.error('Logout error:', error);
                });
            } else {
                window.location.href = '/';
            }
        }
    }

    showAdminPanel() {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.classList.remove('hidden');
        }
    }

    hideAdminPanel() {
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) {
            adminPanel.classList.add('hidden');
        }
    }
}

// ============================================================================
// NEWSLETTER UPLOAD HANDLER
// ============================================================================

class NewsletterUploadHandler {
    constructor() {
        this.form = document.getElementById('newsletter-upload-form');
        this.photoInput = document.getElementById('newsletter-photo');
        this.photoPreview = document.getElementById('photo-preview');
        this.flashMessage = document.getElementById('flash-message');
        this.quillEditor = null;
        this.init();
    }

    init() {
        if (!this.form) return;

        // Initialize Quill Editor
        this.initQuillEditor();

        // Photo preview
        if (this.photoInput) {
            this.photoInput.addEventListener('change', (e) => this.previewPhoto(e));
        }

        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    initQuillEditor() {
        try {
            this.quillEditor = new Quill('#newsletter-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'image'],
                        ['clean']
                    ]
                },
                placeholder: 'Write your newsletter content...'
            });
            console.log('✓ Quill editor initialized');
        } catch (error) {
            console.error('Quill initialization error:', error);
        }
    }

    previewPhoto(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('newsletter-title').value;
        const date = document.getElementById('newsletter-date').value;
        const content = this.quillEditor?.getContents() || {};
        const photo = this.photoInput?.files[0];

        if (!title || !date) {
            this.showFlash('error', 'Please fill in all required fields');
            return;
        }

        try {
            // Upload photo if exists
            let photoUrl = null;
            if (photo) {
                photoUrl = await this.uploadPhoto(photo);
            }

            // Upload newsletter
            const newsletter = {
                title,
                date,
                content: JSON.stringify(content),
                photoUrl,
                createdAt: new Date().toISOString(),
                author: localStorage.getItem('userEmail')
            };

            // Send to backend/Firebase
            const response = await fetch('/api/newsletters/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify(newsletter)
            });

            if (response.ok) {
                this.showFlash('success', 'Newsletter uploaded successfully!');
                this.form.reset();
                this.photoPreview.innerHTML = '';
                this.quillEditor?.setContents([]);
                
                // Reload newsletters
                if (typeof loadNewsletters === 'function') {
                    loadNewsletters();
                }
            } else {
                this.showFlash('error', 'Failed to upload newsletter');
            }
        } catch (error) {
            console.error('Newsletter upload error:', error);
            this.showFlash('error', 'Error uploading newsletter: ' + error.message);
        }
    }

    async uploadPhoto(file) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('email', localStorage.getItem('userEmail'));

        try {
            const response = await fetch('/api/photos/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✓ Photo uploaded:', data.url);
                return data.url;
            } else {
                console.error('Photo upload failed');
                return null;
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            return null;
        }
    }

    showFlash(type, message) {
        this.flashMessage.textContent = message;
        this.flashMessage.className = `flash-message ${type}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.flashMessage.classList.add('hidden');
        }, 5000);
    }
}

// ============================================================================
// CONTENT LOADER
// ============================================================================

class ContentLoader {
    constructor() {
        this.contentCache = {};
        this.init();
    }

    init() {
        this.attachNavListeners();
        this.loadContent('home');
    }

    attachNavListeners() {
        document.querySelectorAll('.nav-item[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('href').substring(1);
                if (section && section !== 'logout') {
                    this.loadContent(section);
                }
            });
        });
    }

    async loadContent(section) {
        if (this.contentCache[section]) {
            this.displayContent(section, this.contentCache[section]);
            return;
        }

        try {
            const response = await fetch(`/api/${section}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.contentCache[section] = data;
            this.displayContent(section, data);
        } catch (error) {
            console.error(`Error loading ${section}:`, error);
            this.displayError(section);
        }
    }

    displayContent(section, data) {
        const contentElement = document.getElementById(`${section}-content`);
        if (!contentElement) return;

        if (data.items && Array.isArray(data.items)) {
            contentElement.innerHTML = data.items.map(item => `
                <article class="content-card fade-in">
                    ${item.image ? `<img src="${item.image}" alt="${item.title}" class="card-image">` : ''}
                    <h3>${item.title || ''}</h3>
                    <p>${item.description || ''}</p>
                    ${item.date ? `<small class="date">${new Date(item.date).toLocaleDateString()}</small>` : ''}
                    ${item.link ? `<a href="${item.link}" class="read-more">Read More →</a>` : ''}
                </article>
            `).join('');
        } else {
            contentElement.innerHTML = '<p>No content available</p>';
        }

        // Scroll to section
        const sectionElement = document.getElementById(section);
        if (sectionElement) {
            setTimeout(() => {
                sectionElement.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }

    displayError(section) {
        const contentElement = document.getElementById(`${section}-content`);
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-message">
                    <p>Failed to load content. Please try again later.</p>
                </div>
            `;
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initAuth() {
    new AuthManager();
}

function initNewsletterUpload() {
    new NewsletterUploadHandler();
}

function initContentLoader() {
    new ContentLoader();
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Uncover Markets PWA Initializing...');

    // Initialize components
    initAuth();
    initNewsletterUpload();
    initContentLoader();

    console.log('✓ All systems initialized');
});
