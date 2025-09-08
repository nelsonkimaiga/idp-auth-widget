(function() {
    const container = document.createElement("div");
    container.id = "idp-auth-widget";
    document.body.appendChild(container);

    if (!document.getElementById("tailwind-cdn")) {
        const tw = document.createElement("script");
        tw.src = "https://cdn.tailwindcss.com";
        tw.id = "tailwind-cdn";
        document.head.appendChild(tw);
    }

    container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen p-4">
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

            <button type="submit" id="submit-button" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                style="background: #0073b1;">
                Login
            </button>
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

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.classList.remove("hidden");
        statusMessage.style.color = isError ? 'red' : 'green';
    }

    function toggleAuthMode() {
        isLoginMode = !isLoginMode;
        authForm.reset();

        if (isLoginMode) {
            formTitle.textContent = 'Welcome';
            formSubtitle.textContent = 'Sign in or create an account';
            submitButton.textContent = 'Login';
            toggleAuthModeLink.innerHTML = "Don't have an account? Sign Up";
        } else {
            formTitle.textContent = 'Create an Account';
            formSubtitle.textContent = 'Join';
            submitButton.textContent = 'Sign Up';
            toggleAuthModeLink.innerHTML = "Already have an account? Login";
        }
    }

    async function authenticate(path, body) {
        try {
            const response = await fetch(`${API_BASE_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            let data;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) throw new Error(data.message || 'Operation failed');
            return data;
        } catch (error) {
            showStatus(`Error: ${error.message}`, true);
            throw error;
        }
    }

    toggleAuthModeLink.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    authForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        const path = isLoginMode ? '/idp/auth/login' : '/idp/auth/register';
        const body = { email, password };

        showStatus(isLoginMode ? 'Logging in...' : 'Registering...');

        try {
            const data = await authenticate(path, body);
            if (isLoginMode) {
                showStatus('Login successful!');
                localStorage.setItem("access_token", data.accessToken);
                localStorage.setItem("refresh_token", data.refreshToken);
                setTimeout(() => {
                    authForm.reset();
                    statusMessage.classList.add("hidden");
                }, 1000);
            } else {
                showStatus(data.message);
                toggleAuthMode();
            }
        } catch (err) {
            console.error('Auth Error:', err);
        }
    });

    linkedinLoginBtn.addEventListener('click', () => {
        showStatus('Redirecting to LinkedIn...');
        window.location.href = `${API_BASE_URL}/idp/auth/linkedin`;
    });
})();