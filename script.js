document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const teacherFields = document.getElementById('teacher-fields');
    const studentFields = document.getElementById('student-fields');

    // --- TAB SWITCHING ---
    tabLogin.addEventListener('click', () => {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.style.color = 'var(--primary-color)';
        tabLogin.style.borderBottom = '2px solid var(--primary-color)';
        tabRegister.style.color = 'var(--text-secondary)';
        tabRegister.style.borderBottom = 'none';
    });

    tabRegister.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegister.style.color = 'var(--primary-color)';
        tabRegister.style.borderBottom = '2px solid var(--primary-color)';
        tabLogin.style.color = 'var(--text-secondary)';
        tabLogin.style.borderBottom = 'none';
    });

    // --- ROLE TOGGLE ---
    roleInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.value === 'teacher') {
                teacherFields.classList.remove('hidden');
                studentFields.classList.add('hidden');
            } else {
                teacherFields.classList.add('hidden');
                studentFields.classList.remove('hidden');
            }
        });
    });

    // --- REGISTER ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('reg-username').value.trim();
        const userId = document.getElementById('reg-userid').value.trim();
        const role = document.querySelector('input[name="role"]:checked').value;
        const dashboardId = document.getElementById('reg-dashboard').value.trim();
        const connectId = document.getElementById('reg-connect').value.trim();

        if (!username || !userId) {
            alert('Please fill in all required fields.');
            return;
        }

        let users = JSON.parse(localStorage.getItem('users')) || [];

        // Check if username already exists
        if (users.some(u => u.username === username)) {
            alert('Username already taken. Please choose another.');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            username: username,
            userId: userId,
            role: role
        };

        if (role === 'teacher') {
            if (!/^\d{12}$/.test(dashboardId)) {
                alert('Dashboard ID must be exactly 12 digits.');
                return;
            }
            // Check if dashboard ID is unique
            if (users.some(u => u.dashboardId === dashboardId)) {
                alert('This Dashboard ID is already in use.');
                return;
            }
            newUser.dashboardId = dashboardId;
        } else {
            // Student
            if (connectId) {
                if (!/^\d{12}$/.test(connectId)) {
                    alert('Teacher Dashboard ID must be exactly 12 digits.');
                    return;
                }
                // Verify teacher exists (optional but good UX)
                const teacherExists = users.some(u => u.role === 'teacher' && u.dashboardId === connectId);
                if (!teacherExists) {
                    if (!confirm('Warning: No teacher found with this Dashboard ID. Register anyway?')) {
                        return;
                    }
                }
                newUser.linkedTeacherId = connectId;
            } else {
                alert('You must connect to a teacher to register.');
                return;
            }
        }

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        alert('Registration successful! Please login.');
        tabLogin.click();
        registerForm.reset();
    });

    // --- LOGIN ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('login-username').value.trim();
        const userId = document.getElementById('login-userid').value.trim();

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.userId === userId);

        if (user) {
            // Set Session
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Redirect
            if (user.role === 'teacher') {
                window.location.href = 'teacher.html';
            } else {
                window.location.href = 'student.html';
            }
        } else {
            alert('Invalid credentials. Please try again.');
        }
    });

    // --- CHECK SESSION ---
    // If already logged in, redirect
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        if (currentUser.role === 'teacher') {
            window.location.href = 'teacher.html';
        } else {
            window.location.href = 'student.html';
        }
    }
});
