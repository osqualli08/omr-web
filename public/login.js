document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.querySelector('.login-btn');

    // Toggle password visibility
    window.togglePassword = function() {
        const passwordField = document.getElementById('password');
        const eyeIcon = document.getElementById('eye-icon');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            `;
        } else {
            passwordField.type = 'password';
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    };

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';
        
        // Show loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const remember = document.getElementById('remember').checked;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful
                if (remember) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userEmail', data.user.email);
                    localStorage.setItem('userName', data.user.name);
                } else {
                    sessionStorage.setItem('isLoggedIn', 'true');
                    sessionStorage.setItem('userEmail', data.user.email);
                    sessionStorage.setItem('userName', data.user.name);
                }
                
                // Redirect to main page
                window.location.href = 'index.html';
            } else {
                // Login failed
                errorMessage.textContent = data.error || 'Email ou mot de passe incorrect';
                errorMessage.classList.add('show');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Une erreur est survenue. Veuillez réessayer.';
            errorMessage.classList.add('show');
        } finally {
            // Remove loading state
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });

    // Real-time validation
    emailInput.addEventListener('input', function() {
        if (errorMessage.classList.contains('show')) {
            errorMessage.classList.remove('show');
        }
    });

    passwordInput.addEventListener('input', function() {
        if (errorMessage.classList.contains('show')) {
            errorMessage.classList.remove('show');
        }
    });
});
