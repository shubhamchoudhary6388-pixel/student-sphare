document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Check
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser || currentUser.role !== 'teacher') {
        alert('Access Denied. Please Login as a Teacher.');
        window.location.href = 'index.html';
        return;
    }

    // Initialize UI
    document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.username}`;
    document.getElementById('settings-username').value = currentUser.username;
    document.getElementById('settings-dashboard-id').value = currentUser.dashboardId;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-display').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Sidebar Navigation
    const navItems = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Active Class
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show Section
            const sectionId = item.getAttribute('data-section') + '-section';
            sections.forEach(sec => sec.classList.add('hidden'));
            document.getElementById(sectionId).classList.remove('hidden');
            document.getElementById(sectionId).classList.add('active');
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });


    // --- STUDENT MANAGEMENT ---
    function loadStudents() {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        // Filter students linked to ME
        const myStudents = users.filter(u => u.role === 'student' && u.linkedTeacherId === currentUser.dashboardId);

        const tbody = document.getElementById('student-list-body');
        tbody.innerHTML = '';

        if (myStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No enrolled students found.</td></tr>';
            return;
        }

        myStudents.forEach(student => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student.username}</td>
                <td>${new Date().toLocaleDateString()}</td> <!-- Mock Join Date -->
                <td><button class="btn danger small" onclick="removeStudent('${student.username}')">Remove</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Expose remove function to window
    window.removeStudent = function (studentName) {
        if (!confirm(`Are you sure you want to REMOVE ${studentName} from your class? This will unlink them, but NOT delete their account.`)) return;

        let users = JSON.parse(localStorage.getItem('users')) || [];

        // Find the student
        const studentIndex = users.findIndex(u => u.username === studentName && u.role === 'student');

        if (studentIndex > -1) {
            users[studentIndex].linkedTeacherId = null; // Unlink, don't delete
            localStorage.setItem('users', JSON.stringify(users));
            alert(`${studentName} has been removed from your class.`);
            loadStudents();
        } else {
            alert('Student not found.');
        }
    };


    // --- FILE MANAGEMENT ---
    function getUploads() {
        return JSON.parse(localStorage.getItem('uploads')) || [];
    }

    function saveUploads(uploads) {
        localStorage.setItem('uploads', JSON.stringify(uploads));
    }

    function loadFiles() {
        const uploads = getUploads();
        // Filter MY files
        const myFiles = uploads.filter(f => f.teacherId === currentUser.dashboardId);
        const grid = document.getElementById('files-grid');
        grid.innerHTML = '';

        if (myFiles.length === 0) {
            grid.innerHTML = '<p class="empty-state">No files uploaded yet.</p>';
            return;
        }

        myFiles.forEach(file => {
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
                <br>
                <div class="card-actions">
                    <button class="btn secondary small" onclick="viewFile('${file.id}')">View</button>
                    <button class="delete-file-btn" onclick="deleteFile('${file.id}')">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

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

    window.deleteFile = function (fileId) {
        if (!confirm('Delete this file?')) return;
        let uploads = getUploads();
        uploads = uploads.filter(f => f.id !== fileId);
        saveUploads(uploads);
        loadFiles();
    };

    // Modal Logic
    const modal = document.getElementById('upload-modal');
    const openBtn = document.getElementById('open-upload-modal');
    const closeBtn = document.querySelector('.close-modal');

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    // Upload Form
    document.getElementById('upload-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('file-name');
        const typeInput = document.getElementById('file-type');
        const fileInput = document.getElementById('file-upload-input');

        if (fileInput.files.length === 0) {
            alert('Please select a file.');
            return;
        }

        const file = fileInput.files[0];
        const selectedType = typeInput.value;
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        // Validate file type matches selection
        let isValidType = false;

        if (selectedType === 'pdf') {
            isValidType = fileName.endsWith('.pdf') || fileType === 'application/pdf';
            if (!isValidType) {
                alert('Please select a PDF file. The selected file is not a PDF.');
                return;
            }
        } else if (selectedType === 'video') {
            isValidType = fileType.startsWith('video/') ||
                fileName.endsWith('.mp4') ||
                fileName.endsWith('.webm') ||
                fileName.endsWith('.mov') ||
                fileName.endsWith('.avi');
            if (!isValidType) {
                alert('Please select a video file (MP4, WebM, MOV, or AVI).');
                return;
            }
        } else if (selectedType === 'image') {
            isValidType = fileType.startsWith('image/') ||
                fileName.endsWith('.jpg') ||
                fileName.endsWith('.jpeg') ||
                fileName.endsWith('.png') ||
                fileName.endsWith('.gif') ||
                fileName.endsWith('.webp');
            if (!isValidType) {
                alert('Please select an image file (JPG, PNG, GIF, or WebP).');
                return;
            }
        }

        // Reader for Data
        const reader = new FileReader();

        reader.onload = function (event) {
            const fileData = event.target.result;
            // 5MB limit for safety in localstorage (increased from 2MB)
            const isTooLarge = fileData.length > 5 * 1024 * 1024;

            // Auto-detect actual file type from the file itself
            let actualType = typeInput.value; // Default to selected type
            const fileType = file.type.toLowerCase();
            const fileName = file.name.toLowerCase();

            // Override with detected type based on actual file content
            if (fileType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.webm') || fileName.endsWith('.mov') || fileName.endsWith('.avi')) {
                actualType = 'video';
            } else if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif') || fileName.endsWith('.webp')) {
                actualType = 'image';
            } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                actualType = 'pdf';
            }

            const newFile = {
                id: Date.now().toString(),
                teacherId: currentUser.dashboardId,
                name: nameInput.value || file.name,
                type: actualType, // Use detected type instead of selected type
                date: new Date().toISOString(),
                data: isTooLarge ? null : fileData,
                isSimulated: isTooLarge
            };

            try {
                const uploads = getUploads();
                uploads.push(newFile);
                saveUploads(uploads);

                document.getElementById('upload-form').reset();
                modal.classList.add('hidden');
                loadFiles();

                if (isTooLarge) {
                    alert('File metadata saved! (Content too large for local storage demo).');
                } else {
                    alert('File uploaded successfully!');
                }
            } catch (err) {
                alert('Storage Limit Check: File too large for browser LocalStorage.');
                console.error(err);
            }
        };

        if (file) {
            reader.readAsDataURL(file);
        }
    });


    // --- SETTINGS (Update Dashboard ID) ---
    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newId = document.getElementById('settings-dashboard-id').value;

        if (!/^\d{12}$/.test(newId)) {
            alert('ID must be 12 digits');
            return;
        }

        if (newId === currentUser.dashboardId) {
            alert('No change detected.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users'));

        // Check uniqueness
        if (users.find(u => u.dashboardId === newId && u.role === 'teacher')) {
            alert('This ID is already taken by another teacher.');
            return;
        }

        // Count linked students before change
        const linkedStudents = users.filter(u => u.role === 'student' && u.linkedTeacherId === currentUser.dashboardId);
        const studentCount = linkedStudents.length;

        // Confirm the change
        if (studentCount > 0) {
            const confirmMsg = `Warning: Changing your Dashboard ID will unlink ${studentCount} student(s) from your account. They will need to re-register with your new ID. Continue?`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }

        // Update ME
        const myIndex = users.findIndex(u => u.username === currentUser.username);
        users[myIndex].dashboardId = newId;

        // UNLINK all students (set their linkedTeacherId to null)
        users.forEach(u => {
            if (u.role === 'student' && u.linkedTeacherId === currentUser.dashboardId) {
                u.linkedTeacherId = null; // Unlink them
            }
        });

        // Save
        localStorage.setItem('users', JSON.stringify(users));

        // Update Session
        currentUser.dashboardId = newId;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        alert(`Dashboard ID Updated to ${newId}. All previously linked students have been unlinked.`);
        location.reload(); // Refresh to update UI and verify persistence
    });

    // Initial Load
    loadStudents();
    loadFiles();

    // --- DELETE ACCOUNT ---
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        const confirmMsg = 'Are you ABSOLUTELY sure you want to delete your account? This action cannot be undone.\n\nType "DELETE" to confirm:';
        const userInput = prompt(confirmMsg);

        if (userInput === 'DELETE') {
            let users = JSON.parse(localStorage.getItem('users')) || [];

            // Remove this user
            users = users.filter(u => u.username !== currentUser.username);

            // Unlink all students who were linked to this teacher
            users.forEach(u => {
                if (u.role === 'student' && u.linkedTeacherId === currentUser.dashboardId) {
                    u.linkedTeacherId = null;
                }
            });

            localStorage.setItem('users', JSON.stringify(users));
            localStorage.removeItem('currentUser');

            alert('Your account has been permanently deleted.');
            window.location.href = 'index.html';
        } else if (userInput !== null) {
            alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
        }
    });
    // --- REAL-TIME SYNC ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'users') {
            loadStudents(); // Refresh student list if users change (e.g. new student joins)
        }
        if (e.key === 'uploads') {
            loadFiles(); // Sync files (in case modified from another tab)
        }
    });
});
