document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // --- CONFIGURATION ---
    // Teacher ID determines the unique room name. 
    // If Student: Use linkedTeacherId. If Teacher: Use dashboardId.
    const teacherId = currentUser.role === 'teacher' ? currentUser.dashboardId : currentUser.linkedTeacherId;

    // Unique Room Name: StudentSphere_Class_{TeacherID}
    const ROOM_NAME = `StudentSphere_Class_${teacherId}`;

    // Container for the Jitsi Iframe
    const container = document.getElementById('jitsi-container');

    // Navigation Back Link
    const backLink = document.getElementById('back-link');
    if (backLink) backLink.href = currentUser.role === 'teacher' ? 'teacher.html' : 'student.html';


    // --- UI INITIALIZATION ---
    // Create a "Start/Join" Button overlay so we don't autoplay audio (browser policy)
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = '#1a1a1a';
    overlay.style.zIndex = '10';
    overlay.style.color = 'white';

    const title = document.createElement('h2');
    title.textContent = currentUser.role === 'teacher' ? 'Ready to Start Class?' : 'Join Live Class';
    title.style.marginBottom = '20px';

    const btn = document.createElement('button');
    btn.className = 'btn primary';
    // Use styling from existing css if possible, otherwise inline backup
    btn.style.padding = '15px 30px';
    btn.style.fontSize = '1.2rem';
    btn.style.cursor = 'pointer';
    btn.style.background = 'var(--primary-color, #4a90e2)';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.color = 'white';
    btn.textContent = currentUser.role === 'teacher' ? 'Start Live Class' : 'Enter Classroom';

    overlay.appendChild(title);
    overlay.appendChild(btn);
    container.appendChild(overlay);

    // --- JITSI INTEGRATION ---
    let api = null;

    btn.addEventListener('click', () => {
        // Remove overlay
        overlay.remove();

        // 1. SIGNAL START OF CLASS (For Student Notifications)
        if (currentUser.role === 'teacher') {
            localStorage.setItem(`live_session_${teacherId}`, JSON.stringify({
                status: 'live',
                startTime: Date.now()
            }));
        }

        // Initialize Jitsi Meet
        const domain = 'meet.jit.si';
        const options = {
            roomName: ROOM_NAME,
            width: '100%',
            height: '100%',
            parentNode: container,
            userInfo: {
                displayName: currentUser.username,
                email: currentUser.email || undefined // Optional
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false // Skip the "Ready to join?" pre-page
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'tileview', 'download', 'help', 'mute-everyone'
                ],
            }
        };

        api = new JitsiMeetExternalAPI(domain, options);

        // Handle Events
        api.addEventListeners({
            videoConferenceLeft: function () {
                // 2. SIGNAL END OF CLASS
                if (currentUser.role === 'teacher') {
                    localStorage.removeItem(`live_session_${teacherId}`);
                }

                // When user hangs up, redirect back to dashboard
                alert('You have left the class.');
                window.location.href = backLink.href;
            }
        });
    });

    // Optional: Chat integration
    const oldSidebar = document.getElementById('live-chat-sidebar');
    if (oldSidebar) oldSidebar.style.display = 'none';
});
