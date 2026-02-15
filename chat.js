document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) window.location.href = 'index.html';

    // State
    let activeContactId = null;
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // DOM
    const contactList = document.getElementById('contact-list');
    const messagesContainer = document.getElementById('messages-container');
    const chatTitle = document.getElementById('chat-title');
    const chatFooter = document.getElementById('chat-footer');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('chat-file-input');
    const backBtn = document.getElementById('back-btn');

    // Navigation
    backBtn.addEventListener('click', () => {
        if (currentUser.role === 'teacher') window.location.href = 'teacher.html';
        else window.location.href = 'student.html';
    });

    // --- 1. Load Contacts ---
    function loadContacts() {
        contactList.innerHTML = '';
        let contacts = [];

        if (currentUser.role === 'teacher') {
            // Teacher sees linked STUDENTS
            contacts = users.filter(u => u.role === 'student' && u.linkedTeacherId === currentUser.dashboardId);
        } else {
            // Student sees their TEACHER
            contacts = users.filter(u => u.role === 'teacher' && u.dashboardId === currentUser.linkedTeacherId);
        }

        if (contacts.length === 0) {
            contactList.innerHTML = '<p class="empty-state">No contacts found.</p>';
            return;
        }

        contacts.forEach(user => {
            const div = document.createElement('div');
            // Use Username as ID for simplicity or dashboardId if avail
            // Students don't have dashboardId, so we use username as unique ID for simulation
            // In real app, all users have unique IDs.
            // We'll use 'username' as the unique key here since Phase 1 enforced unique usernames.
            const contactId = user.username;

            div.className = `contact-item ${activeContactId === contactId ? 'active' : ''}`;
            div.innerHTML = `
                <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
                <div class="info">
                    <h4>${user.username}</h4>
                    <small>${user.role}</small>
                </div>
            `;
            div.onclick = () => selectContact(user);
            contactList.appendChild(div);
        });
    }

    // --- 2. Select Contact ---
    function selectContact(user) {
        activeContactId = user.username;
        chatTitle.textContent = user.username;
        chatFooter.classList.remove('hidden');
        loadContacts(); // Refresh active class
        renderMessages();
    }

    // --- 3. Messaging Logic ---
    function getMessages() {
        return JSON.parse(localStorage.getItem('messages')) || [];
    }

    function renderMessages() {
        if (!activeContactId) return;

        const allMessages = getMessages();
        // Filter conversation: (Me -> Them) OR (Them -> Me)
        const conversation = allMessages.filter(m =>
            (m.sender === currentUser.username && m.receiver === activeContactId) ||
            (m.sender === activeContactId && m.receiver === currentUser.username)
        );

        messagesContainer.innerHTML = '';
        conversation.sort((a, b) => new Date(a.date) - new Date(b.date));

        conversation.forEach(msg => {
            const isMe = msg.sender === currentUser.username;
            const bubble = document.createElement('div');
            bubble.className = `message ${isMe ? 'sent' : 'received'}`;

            let content = `<p>${msg.text}</p>`;
            if (msg.media) {
                if (msg.mediaType.startsWith('image')) {
                    content += `<img src="${msg.media}" class="msg-media">`;
                } else if (msg.mediaType.startsWith('video')) {
                    content += `<video src="${msg.media}" controls class="msg-media"></video>`;
                } else if (msg.mediaType === 'application/pdf' || msg.mediaType === 'pdf') {
                    content += `<div class="pdf-preview"><i class="fas fa-file-pdf" style="font-size: 2rem; color: #dc3545;"></i><br><a href="${msg.media}" target="_blank" style="color: var(--primary-color);">View PDF</a></div>`;
                }
            }

            bubble.innerHTML = `
                <div class="bubble-content">
                    ${content}
                    <span class="timestamp">${new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;
            messagesContainer.appendChild(bubble);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendMessage(text, media = null, mediaType = null) {
        if (!activeContactId) return;

        const newMessage = {
            id: Date.now(),
            sender: currentUser.username,
            receiver: activeContactId,
            text: text,
            media: media,
            mediaType: mediaType,
            date: new Date().toISOString()
        };

        const msgs = getMessages();
        msgs.push(newMessage);
        localStorage.setItem('messages', JSON.stringify(msgs));

        renderMessages();
    }

    // --- 4. Inputs ---
    sendBtn.addEventListener('click', () => {
        const text = messageInput.value.trim();
        if (text) {
            sendMessage(text);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    // File Attachment
    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length === 0) return;
        const file = fileInput.files[0];

        const reader = new FileReader();
        reader.onload = (e) => {
            const mediaData = e.target.result;
            // Increased size limit to 5MB to support PDFs
            if (mediaData.length > 5 * 1024 * 1024) {
                alert('File too large (max 5MB). Please choose a smaller file.');
                return;
            }
            sendMessage('', mediaData, file.type);
        };
        reader.readAsDataURL(file);
        fileInput.value = ''; // Reset
    });

    // --- 5. Polling (Simulate Real-time) ---
    setInterval(() => {
        if (activeContactId) {
            // Only re-render if count changed to avoid flickering/scroll jumps?
            // For simplicity, just re-render. Ideally check count.
            renderMessages();
        }
    }, 2000);

    loadContacts();
});
