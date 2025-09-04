(function(window, document) {
    function renderWidget(containerId = "idp-login-widget") {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
      <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 id="form-title" class="text-3xl font-bold text-center text-gray-800 mb-6">Welcome</h1>
        <p id="form-subtitle" class="text-center text-gray-500 mb-8">Sign in or create an account</p>
        <form id="auth-form" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <input type="email" id="email" name="email" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" id="password" name="password" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
          </div>
          <button type="submit" id="submit-button" class="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            style="background: #0073b1;">Login</button>
        </form>
        <div class="text-center mt-4">
          <a href="#" id="toggle-auth-mode" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Don't have an account? Sign Up
          </a>
        </div>
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>
        <div class="mt-6">
          <button id="linkedin-login" class="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50">
            Log in with LinkedIn
          </button>
        </div>
        <div id="status-message" class="mt-4 text-center text-sm font-medium hidden"></div>
      </div>
    `;

        // === your JS logic here ===
        const API_BASE_URL = "https://gfgp.ai/api";
        const authForm = container.querySelector('#auth-form');
        const linkedinLoginBtn = container.querySelector('#linkedin-login');
        const statusMessage = container.querySelector('#status-message');
        const submitButton = container.querySelector('#submit-button');
        const toggleAuthModeLink = container.querySelector('#toggle-auth-mode');
        const formTitle = container.querySelector('#form-title');
        const formSubtitle = container.querySelector('#form-subtitle');
        let isLoginMode = true;

        function showStatus(message, isError = false) {
            statusMessage.textContent = message;
            statusMessage.classList.remove("hidden");
            statusMessage.style.color = isError ? 'red' : 'green';
        }

        async function authenticate(path, body) {
            try {
                const response = await fetch(`${API_BASE_URL}${path}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!response.ok) throw new Error(await response.text());
                return await response.json();
            } catch (err) {
                showStatus(err.message, true);
                throw err;
            }
        }

        toggleAuthModeLink.addEventListener('click', e => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authForm.reset();
            formTitle.textContent = isLoginMode ? 'Welcome' : 'Create an Account';
            formSubtitle.textContent = isLoginMode ? 'Sign in or create an account' : 'Join';
            submitButton.textContent = isLoginMode ? 'Login' : 'Sign Up';
            toggleAuthModeLink.innerHTML = isLoginMode ?
                "Don't have an account? Sign Up" :
                "Already have an account? Login";
        });

        authForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            const path = isLoginMode ? '/idp/api/v1/auth/login' : '/idp/api/v1/auth/register';
            showStatus(isLoginMode ? 'Logging in...' : 'Registering...');
            try {
                const data = await authenticate(path, { email, password });
                if (isLoginMode) {
                    localStorage.setItem("idp_access_token", data.accessToken);
                    localStorage.setItem("idp_refresh_token", data.refreshToken);
                    showStatus("Login successful!");
                } else {
                    showStatus("Registration successful! Check email for verification.");
                }
            } catch {}
        });

        linkedinLoginBtn.addEventListener('click', () => {
            window.location.href = `${API_BASE_URL}/idp/api/v1/auth/linkedin`;
        });
    }

    window.IdpAuth = { renderWidget };
})(window, document);