document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Determine the dashboard ID (teacher's own ID or student's linked teacher ID)
    const dashboardId = currentUser.role === 'teacher'
        ? currentUser.dashboardId
        : currentUser.linkedTeacherId;

    if (!dashboardId) {
        if (currentUser.role === 'teacher') {
            alert('Error: Your account is missing a Dashboard ID. Please go to Settings and set up your Dashboard Number first.');
        } else {
            alert('You are not linked to any class. Please contact your teacher.');
        }
        window.location.href = currentUser.role === 'teacher' ? 'teacher.html' : 'student.html';
        return;
    }

    // Storage key for this class chat
    const chatKey = `class_chat_${dashboardId}`;

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = currentUser.role === 'teacher' ? 'teacher.html' : 'student.html';
    });

    // Get all users in this class
    function getClassMembers() {
        const allUsers = JSON.parse(localStorage.getItem('users')) || [];
        const members = allUsers.filter(u => {
            if (u.role === 'teacher' && u.dashboardId === dashboardId) return true;
            if (u.role === 'student' && u.linkedTeacherId === dashboardId) return true;
            return false;
        });
        return members;
    }

    // Update member count
    const members = getClassMembers();
    document.getElementById('member-count').textContent = `${members.length} member${members.length !== 1 ? 's' : ''}`;

    // Get chat messages
    function getMessages() {
        return JSON.parse(localStorage.getItem(chatKey)) || [];
    }

    // Save messages
    function saveMessages(messages) {
        localStorage.setItem(chatKey, JSON.stringify(messages));
    }

    // Render messages
    function renderMessages() {
        const messages = getMessages();
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-chat-state">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const isMe = msg.username === currentUser.username;
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isMe ? 'sent' : 'received'}`;

            const roleLabel = msg.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student';

            let content = `<p>${msg.text || ''}</p>`;

            // Support for media attachments
            if (msg.media) {
                if (msg.mediaType && msg.mediaType.startsWith('image')) {
                    content += `<img src="${msg.media}" class="msg-media">`;
                } else if (msg.mediaType && msg.mediaType.startsWith('video')) {
                    content += `<video src="${msg.media}" controls class="msg-media"></video>`;
                } else if (msg.mediaType === 'application/pdf' || msg.mediaType === 'pdf') {
                    content += `<div class="pdf-preview"><i class="fas fa-file-pdf" style="font-size: 2rem; color: #dc3545;"></i><br><a href="${msg.media}" target="_blank" style="color: var(--primary-color);">View PDF</a></div>`;
                }
            }

            messageDiv.innerHTML = `
                <div class="bubble-content">
                    <small style="font-size: 0.75rem; opacity: 0.8; display: block; margin-bottom: 4px;">
                        ${msg.username} ${!isMe ? `(${roleLabel})` : ''}
                    </small>
                    ${content}
                    <span class="timestamp">${formatTime(msg.timestamp)}</span>
                </div>
            `;
            container.appendChild(messageDiv);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Format timestamp
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Send message
    function sendMessage(text = '', media = null, mediaType = null) {
        const input = document.getElementById('message-input');
        const messageText = text || input.value.trim();

        if (!messageText && !media) return;

        const messages = getMessages();
        messages.push({
            username: currentUser.username,
            role: currentUser.role,
            text: messageText,
            media: media,
            mediaType: mediaType,
            timestamp: new Date().toISOString()
        });

        saveMessages(messages);
        input.value = '';
        renderMessages();
    }

    // Event listeners
    document.getElementById('send-btn').addEventListener('click', () => sendMessage());
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // File Attachment Support
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('chat-file-input');

    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length === 0) return;
        const file = fileInput.files[0];

        const reader = new FileReader();
        reader.onload = (e) => {
            const mediaData = e.target.result;
            // 5MB size limit
            if (mediaData.length > 5 * 1024 * 1024) {
                alert('File too large (max 5MB). Please choose a smaller file.');
                return;
            }
            sendMessage('', mediaData, file.type);
        };
        reader.readAsDataURL(file);
        fileInput.value = ''; // Reset
    });

    // Initial render
    renderMessages();

    // Auto-refresh every 3 seconds
    setInterval(renderMessages, 3000);
});
