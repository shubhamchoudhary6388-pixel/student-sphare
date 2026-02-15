document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Check
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser || currentUser.role !== 'student') {
        alert('Access Denied. Please Login as a Student.');
        window.location.href = 'index.html';
        return;
    }

    // 2. Load Teacher Info (to display "Linked to Mr. Smith")
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const teacher = users.find(u => u.dashboardId === currentUser.linkedTeacherId && u.role === 'teacher');
    const teacherName = teacher ? teacher.username : 'Unknown Teacher';

    document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.username}`;
    document.getElementById('teacher-info').textContent = `Class of: ${teacherName}`;

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // --- CONTENT DISPLAY ---
    function getUploads() {
        return JSON.parse(localStorage.getItem('uploads')) || [];
    }

    function renderFiles(files) {
        const grid = document.getElementById('files-grid');
        grid.innerHTML = '';

        if (files.length === 0) {
            grid.innerHTML = '<p class="empty-state">No content available.</p>';
            return;
        }

        files.forEach(file => {
            let iconClass = 'fa-file';
            if (file.type === 'video') iconClass = 'fa-video';
            if (file.type === 'image') iconClass = 'fa-image';
            if (file.type === 'pdf') iconClass = 'fa-file-pdf';

            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = `
                <i class="fas ${iconClass} icon"></i>
                <h4>${file.name}</h4>
                <small>${file.type.toUpperCase()}</small>
                <div class="card-actions">
                    <button class="btn secondary small" onclick="viewFile('${file.id}')">View</button>
                    <!-- No Delete Button for Students -->
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function loadFiles() {
        const allUploads = getUploads();
        // Filter files from MY linked teacher
        const myClassFiles = allUploads.filter(f => f.teacherId === currentUser.linkedTeacherId);
        renderFiles(myClassFiles);
        return myClassFiles; // Return for search
    }

    // Initial Load & Store reference for search
    let currentFiles = loadFiles();

    // --- SEARCH / FILTER ---
    const searchInput = document.getElementById('file-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = currentFiles.filter(file =>
            file.name.toLowerCase().includes(query)
        );
        renderFiles(filtered);
    });

    // --- VIEW FILE ---
    window.viewFile = function (fileId) {
        const uploads = getUploads();
        const file = uploads.find(f => f.id === fileId);

        if (!file || !file.data) {
            alert('Simulator: Content unavailable (too large or old).');
            return;
        }

        const viewer = document.getElementById('viewer-modal');
        const body = document.getElementById('viewer-body');
        body.innerHTML = '';

        if (file.type === 'image' || file.type.startsWith('image')) {
            body.innerHTML = `<img src="${file.data}">`;
        } else if (file.type === 'video' || file.type.startsWith('video')) {
            body.innerHTML = `<video src="${file.data}" controls autoplay></video>`;
        } else if (file.type === 'pdf') {
            body.innerHTML = `<iframe src="${file.data}"></iframe>`;
        } else {
            body.innerHTML = `<p style="color:white;">Preview not available. <a href="${file.data}" download="${file.name}" style="color:skyblue;">Download</a></p>`;
        }

        viewer.classList.remove('hidden');
    };

    // --- NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-links li[data-section]');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const sectionId = item.getAttribute('data-section') + '-section';
            sections.forEach(sec => sec.classList.add('hidden'));
            document.getElementById(sectionId).classList.remove('hidden');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // --- SETTINGS ---
    document.getElementById('student-username').value = currentUser.username;
    document.getElementById('student-teacher').value = teacherName;

    // Show re-link section if student is not linked to any teacher
    if (!currentUser.linkedTeacherId) {
        document.getElementById('relink-section').style.display = 'block';
        document.getElementById('student-teacher').value = 'Not linked to any teacher';
    }

    // Re-link form handler
    document.getElementById('relink-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const dashboardId = document.getElementById('relink-dashboard-id').value.trim();

        if (!/^\d{12}$/.test(dashboardId)) {
            alert('Dashboard Number must be exactly 12 digits.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const teacher = users.find(u => u.dashboardId === dashboardId && u.role === 'teacher');

        if (!teacher) {
            alert('No teacher found with this Dashboard Number. Please verify the number.');
            return;
        }

        // Update current user's linkedTeacherId
        const userIndex = users.findIndex(u => u.username === currentUser.username);
        users[userIndex].linkedTeacherId = dashboardId;
        localStorage.setItem('users', JSON.stringify(users));

        // Update session
        currentUser.linkedTeacherId = dashboardId;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        alert(`Successfully linked to teacher: ${teacher.username}!`);
        location.reload();
    });

    // --- DELETE ACCOUNT ---
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        const confirmMsg = 'Are you ABSOLUTELY sure you want to delete your account? This action cannot be undone.\n\nType "DELETE" to confirm:';
        const userInput = prompt(confirmMsg);

        if (userInput === 'DELETE') {
            let users = JSON.parse(localStorage.getItem('users')) || [];

            // Check if user exists in DB
            const exists = users.some(u => u.username === currentUser.username);
            if (!exists) {
                alert('Account not found in database (already deleted?); Logging out.');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
                return;
            }

            // Remove this user
            users = users.filter(u => u.username !== currentUser.username);

            localStorage.setItem('users', JSON.stringify(users));
            localStorage.removeItem('currentUser');

            alert('Your account has been permanently deleted.');
            window.location.href = 'index.html';
        } else if (userInput !== null) {
            alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
        }
    });
    // --- LIVE CLASS NOTIFICATIONS ---
    // Check if my linked teacher is live
    if (currentUser.linkedTeacherId) {
        setInterval(() => {
            const session = JSON.parse(localStorage.getItem(`live_session_${currentUser.linkedTeacherId}`));
            const existingNotif = document.getElementById('live-notification');

            if (session && session.status === 'live') {
                if (!existingNotif) {
                    showLiveNotification();
                }
            } else {
                if (existingNotif) {
                    existingNotif.remove();
                }
            }
        }, 3000); // Poll every 3 seconds
    }

    function showLiveNotification() {
        // Create simple banner
        const notif = document.createElement('div');
        notif.id = 'live-notification';
        notif.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="height: 10px; width: 10px; background: red; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite;"></span>
                    <span><strong>Live Class Started!</strong> Your teacher is live now.</span>
                </div>
                <button onclick="window.location.href='live.html'" style="background: white; color: var(--primary-color); border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left:10px;">Join Now</button>
            </div>
        `;

        // Styles
        notif.style.position = 'fixed';
        notif.style.top = '20px';
        notif.style.right = '20px';
        notif.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
        notif.style.color = 'white';
        notif.style.padding = '15px';
        notif.style.borderRadius = '10px';
        notif.style.boxShadow = '0 10px 15px rgba(0,0,0,0.3)';
        notif.style.zIndex = '9999';
        notif.style.animation = 'slideIn 0.5s ease-out';
        notif.style.maxWidth = '300px';

        document.body.appendChild(notif);

        // Add keyframes for pulse if not exists
        if (!document.getElementById('pulse-anim')) {
            const style = document.createElement('style');
            style.id = 'pulse-anim';
            style.innerHTML = `
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // --- REAL-TIME SYNC ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'uploads') {
            loadFiles(); // Refresh file list if uploads change
        }
        if (e.key === 'users') {
            // Check if I was unlinked or teacher changed name
            const updatedUsers = JSON.parse(e.newValue || '[]');
            const me = updatedUsers.find(u => u.username === currentUser.username);

            if (me && me.linkedTeacherId !== currentUser.linkedTeacherId) {
                alert('Your teacher connection has changed. Reloading...');
                localStorage.setItem('currentUser', JSON.stringify(me));
                location.reload();
            }
        }
    });
});
