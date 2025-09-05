(function(window, document) {
    function showModalMessage(message, type) {
        const modal = document.createElement('div');
        modal.className = `fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50`;
        const colorClass = type === 'error' ? 'bg-red-500' : 'bg-green-500';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm transform scale-100 transition-all">
                <p class="text-lg font-semibold text-gray-800 text-center">${message}</p>
                <div class="mt-4 flex justify-end">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-sm font-medium text-white ${colorClass} rounded-md shadow-md hover:opacity-80">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const widgetAPI = {
        getAccessToken: () => {
            const tokenData = JSON.parse(localStorage.getItem('idp_token_data'));
            if (tokenData && tokenData.accessToken && tokenData.expiry > Date.now()) {
                return tokenData.accessToken;
            }
            return null;
        },
        onAuthenticated: (callback) => {
            const existingCallback = Array.isArray(window.IdpAuth ?.listeners) ? window.IdpAuth.listeners.find(l => l === callback) : undefined;
            if (!existingCallback) {
                window.IdpAuth.listeners = window.IdpAuth.listeners || [];
                window.IdpAuth.listeners.push(callback);
            }
        },

        logout: () => {
            localStorage.removeItem('idp_token_data');
            showModalMessage('You have been logged out.', 'info');
            window.location.reload();
        }
    };

    function renderWidget(containerId = "idp-login-widget") {
        const container = document.getElementById(containerId);
        if (!container) return;

        const token = widgetAPI.getAccessToken();
        if (token) {
            container.innerHTML = `
                <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
                    <h1 class="text-3xl font-bold text-gray-800 mb-4">You are logged in!</h1>
                    <p class="text-gray-600 mb-6">Token is valid. You can now access protected resources.</p>
                    <button id="logout-btn" class="w-full flex justify-center py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">Logout</button>
                </div>
            `;
            container.querySelector('#logout-btn').addEventListener('click', () => {
                widgetAPI.logout();
            });
            (window.IdpAuth ?.listeners || []).forEach(cb => cb(newTokens.accessToken));

            return;
        }

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

        const API_BASE_URL = "https://gfgp.ai/api";
        const authForm = container.querySelector('#auth-form');
        const linkedinLoginBtn = container.querySelector('#linkedin-login');
        const statusMessage = container.querySelector('#status-message');
        const submitButton = container.querySelector('#submit-button');
        const toggleAuthModeLink = container.querySelector('#toggle-auth-mode');
        const formTitle = container.querySelector('#form-title');
        const formSubtitle = container.querySelector('#form-subtitle');
        let isLoginMode = true;

        function parseJwt(token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                return JSON.parse(jsonPayload);
            } catch (e) {
                return null;
            }
        }

        async function refreshAccessToken() {
            const tokenData = JSON.parse(localStorage.getItem('idp_token_data'));
            if (!tokenData || !tokenData.refreshToken) {
                console.error('No refresh token found. Logging out...');
                widgetAPI.logout();
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/idp/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: tokenData.refreshToken })
                });

                if (!response.ok) {
                    throw new Error('Failed to refresh token. Session expired.');
                }

                const newTokens = await response.json();
                const decodedToken = parseJwt(newTokens.accessToken);
                const expiry = decodedToken ? decodedToken.exp * 1000 : Date.now() + 5 * 60 * 1000;


                localStorage.setItem('idp_token_data', JSON.stringify({
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken,
                    expiry: expiry
                }));

                console.log('Access token refreshed successfully.');
                (window.IdpAuth?.listeners || []).forEach(cb => cb(newTokens.accessToken));


                setTokenRefreshTimer(expiry);
            } catch (err) {
                console.error('Error during token refresh:', err);
                showModalMessage('Session expired. Please log in again.', 'error');
                widgetAPI.logout();
            }
        }

        let refreshTimer;

        function setTokenRefreshTimer(expiry) {
            clearTimeout(refreshTimer);
            const now = Date.now();
            const timeLeft = expiry - now;
            const refreshTime = timeLeft - (5 * 60 * 1000);
            if (refreshTime > 0) {
                refreshTimer = setTimeout(refreshAccessToken, refreshTime);
                console.log(`Next token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes.`);
            }
        }

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
                if (!response.ok) {
                    const errorText = await response.text();
                    showModalMessage(errorText, 'error');
                    throw new Error(errorText);
                }
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
            statusMessage.classList.add("hidden");
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
                    const decodedToken = parseJwt(data.accessToken);
                    const expiry = decodedToken ? decodedToken.exp * 1000 : Date.now() + 5 * 60 * 1000;
                    localStorage.setItem("idp_token_data", JSON.stringify({
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        expiry: expiry
                    }));
                    showModalMessage("Login successful!", 'success');
                    window.location.reload();
                } else {
                    showModalMessage("Registration successful! Check email for verification.", 'success');
                }
            } catch (err) {
                console.error('Authentication error:', err);
            }
        });

        linkedinLoginBtn.addEventListener('click', () => {
            window.location.href = `${API_BASE_URL}/idp/api/v1/auth/linkedin`;
        });

        const tokenData = JSON.parse(localStorage.getItem('idp_token_data'));
        if (tokenData && tokenData.accessToken) {
            const decodedToken = parseJwt(tokenData.accessToken);
            const expiry = decodedToken ? decodedToken.exp * 1000 : Date.now() + 5 * 60 * 1000;
            setTokenRefreshTimer(expiry);
        }
    }
    window.IdpAuth = { renderWidget, ...widgetAPI };
})(window, document);
