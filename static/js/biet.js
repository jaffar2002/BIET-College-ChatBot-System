// biet.js - BIET Chatbot with Backend Integration
class BIETChatbot {
    constructor() {
        this.isProcessing = false;
        this.userId = 'user_' + Date.now();
        this.isChatMinimized = false;
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.API_BASE = window.location.origin;
        this.initializeElements();
        this.bindEvents();
        this.setupSmoothScrolling();
        this.setupSpeechRecognition();
    }

    initializeElements() {
        // Core chat elements
        this.chatbotWidget = document.getElementById('chatbotWidget');
        this.chatToggle = document.getElementById('chatToggle');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        
        // Photo upload elements
        this.photoInput = document.getElementById('photoInput');
        this.uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        this.photoPreview = document.getElementById('photoPreview');
        
        // Voice elements
        this.voiceBtn = document.getElementById('voiceBtn');
        
        console.log('BIET Chatbot initialized successfully');
    }

    setupSpeechRecognition() {
        // Check if browser supports speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-IN'; // Indian English
            
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.updateVoiceButton(true);
                this.updateVoiceModalStatus('Listening... Speak now', true);
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Update modal with interim results
                if (interimTranscript) {
                    this.updateVoiceModalStatus(`Heard: "${interimTranscript}"`, true);
                }
                
                // Process final result
                if (finalTranscript) {
                    this.processVoiceInput(finalTranscript);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.handleSpeechError(event.error);
            };
            
            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                if (this.isListening) {
                    // Auto-restart if still listening
                    setTimeout(() => {
                        if (this.isListening && this.recognition) {
                            try {
                                this.recognition.start();
                            } catch (error) {
                                console.error('Error restarting recognition:', error);
                            }
                        }
                    }, 100);
                } else {
                    this.updateVoiceButton(false);
                    this.hideVoiceModal();
                }
            };
        } else {
            console.warn('Speech recognition not supported in this browser');
            this.showNotification('Speech recognition is not supported in your browser. Using simulation mode.', 'warning');
        }
    }

    bindEvents() {
        // Chat toggle events
        this.chatToggle.addEventListener('click', () => this.toggleChat());
        
        // Message sending events
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Photo upload events
        this.uploadPhotoBtn.addEventListener('click', () => this.photoInput.click());
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Voice button event
        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleVoiceInput();
            });
        }

        // Add event listeners to quick question chips
        this.setupQuickQuestions();

        console.log('All events bound successfully');
    }

    setupQuickQuestions() {
        const questionChips = document.querySelectorAll('.chip');
        questionChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const question = e.target.getAttribute('data-question') || e.target.textContent;
                if (question) {
                    this.chatInput.value = question;
                    this.sendMessage();
                }
            });
        });
    }

    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // CHAT WINDOW CONTROLS
    toggleChat() {
        if (this.chatbotWidget.classList.contains('hidden')) {
            this.openChat();
        } else if (this.isChatMinimized) {
            this.expandChat();
        } else {
            this.minimizeChat();
        }
    }

    openChat() {
        this.chatbotWidget.classList.remove('hidden');
        this.chatbotWidget.classList.remove('minimized');
        this.isChatMinimized = false;
        setTimeout(() => {
            this.chatInput.focus();
        }, 300);
        this.hideNotificationDot();
    }

    expandChat() {
        this.chatbotWidget.classList.remove('minimized');
        this.isChatMinimized = false;
        setTimeout(() => {
            this.chatInput.focus();
        }, 300);
    }

    minimizeChat() {
        this.chatbotWidget.classList.add('minimized');
        this.isChatMinimized = true;
    }

    closeChat() {
        this.chatbotWidget.classList.add('hidden');
        this.isChatMinimized = false;
        this.showNotificationDot();
    }

    hideNotificationDot() {
        const dot = document.querySelector('.notification-dot');
        if (dot) dot.style.display = 'none';
    }

    showNotificationDot() {
        const dot = document.querySelector('.notification-dot');
        if (dot) dot.style.display = 'block';
    }

    // TEXT-TO-SPEECH (Speaking)
    speakText(text) {
        if (!this.synthesis) {
            this.showNotification('Text-to-speech not supported in your browser', 'warning');
            return;
        }

        // Stop any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Try to use Indian English voice if available
        const voices = this.synthesis.getVoices();
        const indianVoice = voices.find(voice => 
            voice.lang.includes('en-IN') || voice.name.includes('India')
        );
        
        if (indianVoice) {
            utterance.voice = indianVoice;
        } else {
            // Fallback to any English voice
            const englishVoice = voices.find(voice => voice.lang.includes('en'));
            if (englishVoice) {
                utterance.voice = englishVoice;
            }
        }

        utterance.onstart = () => {
            this.updateSpeakingIndicator(true);
        };

        utterance.onend = () => {
            this.updateSpeakingIndicator(false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.updateSpeakingIndicator(false);
            this.showNotification('Error speaking text', 'error');
        };

        this.synthesis.speak(utterance);
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.updateSpeakingIndicator(false);
        }
    }

    updateSpeakingIndicator(speaking) {
        const speakButtons = document.querySelectorAll('.speak-btn');
        speakButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (speaking) {
                icon.className = 'fas fa-volume-mute';
                btn.innerHTML = '<i class="fas fa-volume-mute"></i> Stop';
                btn.style.background = '#e74c3c';
                btn.onclick = () => this.stopSpeaking();
            } else {
                icon.className = 'fas fa-volume-up';
                btn.innerHTML = '<i class="fas fa-volume-up"></i> Speak';
                btn.style.background = '';
                const text = btn.closest('.message-content').querySelector('.message-text').textContent;
                btn.onclick = () => this.speakText(this.getSpeakableText(text));
            }
        });
    }

    // SPEECH-TO-TEXT (Listening)
    toggleVoiceInput() {
        if (!this.recognition) {
            this.showNotification('Voice input not available. Using simulation mode.', 'info');
            this.simulateVoiceRecognition();
            return;
        }

        if (this.isListening) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    startVoiceInput() {
        try {
            this.isListening = true;
            this.recognition.start();
            this.showVoiceModal();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showNotification('Error starting voice input. Please check microphone permissions.', 'error');
            this.isListening = false;
        }
    }

    stopVoiceInput() {
        this.isListening = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }
        this.updateVoiceButton(false);
        this.hideVoiceModal();
    }

    processVoiceInput(transcript) {
        console.log('Voice input received:', transcript);
        
        const processedText = this.processTranscript(transcript);
        this.showVoiceConfirmation(processedText);
    }

    processTranscript(transcript) {
        // Clean and process the transcript
        let text = transcript.trim();
        
        // Common corrections for BIET-specific terms
        const corrections = {
            'bit': 'BIET',
            'byte': 'BIET',
            'be it': 'BIET',
            'admission': 'admission',
            'computer science': 'computer science',
            'mechanical': 'mechanical',
            'civil': 'civil',
            'electronics': 'electronics',
            'placement': 'placement',
            'fee structure': 'fee structure',
            'hostel': 'hostel',
            'library': 'library',
            'scholarship': 'scholarship'
        };
        
        // Apply corrections
        Object.keys(corrections).forEach(wrong => {
            const regex = new RegExp(wrong, 'gi');
            text = text.replace(regex, corrections[wrong]);
        });
        
        return text;
    }

    handleSpeechError(error) {
        let errorMessage = 'Voice input error: ';
        
        switch (error) {
            case 'no-speech':
                errorMessage += 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage += 'No microphone found. Please check your audio settings.';
                break;
            case 'not-allowed':
                errorMessage += 'Microphone access denied. Please allow microphone permissions.';
                break;
            case 'network':
                errorMessage += 'Network error occurred. Please check your connection.';
                break;
            default:
                errorMessage += 'Please try again.';
        }
        
        this.showNotification(errorMessage, 'error');
        this.stopVoiceInput();
    }

    // VOICE MODAL MANAGEMENT
    showVoiceModal() {
        this.hideVoiceModal();

        const modal = document.createElement('div');
        modal.className = 'voice-modal';
        modal.innerHTML = `
            <div class="voice-modal-content">
                <div class="voice-header">
                    <h3><i class="fas fa-microphone"></i> Voice Input Active</h3>
                    <button class="close-voice" onclick="window.chatbot.stopVoiceInput()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="voice-animation">
                    <div class="sound-wave">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p class="listening-text">Listening... Speak now</p>
                    <p class="instruction-text">Say something like "admission process" or "fee structure"</p>
                    <div class="voice-status" id="voiceStatus">Ready to listen</div>
                </div>
                <div class="voice-actions">
                    <button class="voice-btn simulate" onclick="window.chatbot.simulateVoiceRecognition()">
                        <i class="fas fa-play"></i> Simulate Speech
                    </button>
                    <button class="voice-btn stop" onclick="window.chatbot.stopVoiceInput()">
                        <i class="fas fa-stop"></i> Stop Listening
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    updateVoiceModalStatus(message, isListening = true) {
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.color = isListening ? '#0c3b7a' : '#666';
        }
    }

    updateVoiceButton(listening) {
        if (this.voiceBtn) {
            const icon = this.voiceBtn.querySelector('i');
            if (listening) {
                icon.className = 'fas fa-microphone-slash';
                this.voiceBtn.style.background = '#e74c3c';
                this.voiceBtn.title = 'Stop Listening';
            } else {
                icon.className = 'fas fa-microphone';
                this.voiceBtn.style.background = '';
                this.voiceBtn.title = 'Voice Input';
            }
        }
    }

    hideVoiceModal() {
        const modal = document.querySelector('.voice-modal');
        if (modal) {
            modal.remove();
        }
    }

    showVoiceConfirmation(transcript) {
        this.hideVoiceConfirmation();

        const modal = document.createElement('div');
        modal.className = 'voice-confirmation-modal';
        modal.innerHTML = `
            <div class="voice-confirmation-content">
                <div class="confirmation-header">
                    <h3><i class="fas fa-check-circle"></i> Voice Input Received</h3>
                </div>
                <div class="confirmation-text">
                    <p>I heard: "<strong>${transcript}</strong>"</p>
                </div>
                <div class="confirmation-actions">
                    <button class="confirmation-btn confirm" onclick="window.chatbot.confirmVoiceInput('${this.escapeHtml(transcript)}')">
                        <i class="fas fa-paper-plane"></i> Send Message
                    </button>
                    <button class="confirmation-btn edit" onclick="window.chatbot.editVoiceInput('${this.escapeHtml(transcript)}')">
                        <i class="fas fa-edit"></i> Edit Text
                    </button>
                    <button class="confirmation-btn cancel" onclick="window.chatbot.cancelVoiceInput()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    confirmVoiceInput(transcript) {
        this.hideVoiceConfirmation();
        this.chatInput.value = transcript;
        this.sendMessage();
    }

    editVoiceInput(transcript) {
        this.hideVoiceConfirmation();
        this.chatInput.value = transcript;
        this.chatInput.focus();
        this.showNotification('You can now edit the text before sending', 'info');
    }

    cancelVoiceInput() {
        this.hideVoiceConfirmation();
        this.showNotification('Voice input cancelled', 'info');
    }

    hideVoiceConfirmation() {
        const modal = document.querySelector('.voice-confirmation-modal');
        if (modal) {
            modal.remove();
        }
    }

    // SIMULATION (Fallback when speech recognition is not available)
    simulateVoiceRecognition() {
        this.showNotification('Simulating voice recognition...', 'info');
        
        const sampleQuestions = [
            "What is the admission process for BE programs?",
            "Can you tell me about computer science department?",
            "What is the fee structure for MCA course?",
            "Which companies visit campus for placements?",
            "How is the hostel facility at BIET?",
            "What are the eligibility criteria for M.Tech?",
            "Tell me about the library facilities",
            "What is the placement percentage last year?",
            "How to apply for scholarships?",
            "What is the campus life like at BIET?"
        ];
        
        const randomQuestion = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
        
        this.stopVoiceInput();
        this.simulateVoiceTyping(randomQuestion);
    }

    simulateVoiceTyping(question) {
        this.showNotification('Simulating speech-to-text...', 'info');
        
        this.chatInput.value = '';
        let currentText = '';
        let i = 0;
        
        const typeWriter = () => {
            if (i < question.length) {
                currentText += question.charAt(i);
                this.chatInput.value = currentText;
                i++;
                setTimeout(typeWriter, 30);
            } else {
                this.showNotification('Voice input ready! Press Enter to send.', 'success');
            }
        };
        
        typeWriter();
    }

    // MESSAGE HANDLING
    async sendMessage() {
        if (this.isProcessing) return;

        const message = this.chatInput.value.trim();
        const hasPhoto = this.photoInput.files.length > 0;

        if (!message && !hasPhoto) {
            this.showNotification('Please enter a message or upload a photo', 'warning');
            return;
        }

        this.isProcessing = true;
        this.updateSendButtonState(true);

        try {
            let imageBase64 = '';
            if (hasPhoto) {
                imageBase64 = await this.convertImageToBase64(this.photoInput.files[0]);
                this.addPhotoMessage(imageBase64, 'user');
            }

            if (message) {
                this.addMessage(message, 'user');
            }

            this.chatInput.value = '';
            this.clearPhotoPreview();

            this.showTypingIndicator();

            // Send message to backend API
            const response = await this.sendToBackend(message, imageBase64);
            
            this.hideTypingIndicator();
            this.addMessage(response.reply, 'bot', response.type);

            // Auto-speak the response for important messages
            if (this.shouldSpeakResponse(response.reply)) {
                setTimeout(() => {
                    this.speakText(this.getSpeakableText(response.reply));
                }, 500);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot', 'error');
        } finally {
            this.isProcessing = false;
            this.updateSendButtonState(false);
        }
    }

    async sendToBackend(message, imageData = '') {
    const payload = {
        message: message,
        image: imageData
    };

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Backend response:', data);
        return data;

    } catch (error) {
        console.error('Error communicating with backend:', error);
        
        // Fallback to local responses if backend is unavailable
        return {
            reply: this.getFallbackResponse(message),
            type: 'general'
        };
    }
}

getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based fallback responses
    if (lowerMessage.includes('admission')) {
        return "**Admission Process:**\nFor detailed admission information, please contact the admission office at +91-8192-222245 or visit www.bietdvg.edu";
    } else if (lowerMessage.includes('fee')) {
        return "**Fee Structure:**\nFee details vary by program. Please contact the accounts office for current fee structure.";
    } else if (lowerMessage.includes('placement')) {
        return "**Placements:**\nBIET has excellent placement records with top companies visiting campus. Average package is around 6-7 LPA.";
    } else if (lowerMessage.includes('hostel')) {
        return "**Hostel Facilities:**\nSeparate hostels for boys and girls with modern amenities, WiFi, and mess facilities.";
    } else {
        return "I'm currently experiencing connectivity issues. Please try again shortly or contact the institute directly.";
    }
}
    shouldSpeakResponse(response) {
        // Speak responses that contain important information
        const speakKeywords = [
            'admission', 'fee', 'placement', 'scholarship', 'hostel',
            'library', 'course', 'department', 'eligibility', 'important',
            'deadline', 'application', 'required'
        ];
        
        return speakKeywords.some(keyword => 
            response.toLowerCase().includes(keyword)
        );
    }

    getSpeakableText(text) {
        // Remove markdown and formatting for speech
        return text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\n/g, '. ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    updateSendButtonState(isSending) {
        if (isSending) {
            this.sendButton.disabled = true;
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendButton.disabled = false;
            this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showNotification('Please upload a valid image file', 'error');
            this.clearPhotoInput();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image size should be less than 5MB', 'error');
            this.clearPhotoInput();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.photoPreview.innerHTML = `
                <div class="photo-preview-content">
                    <img src="${e.target.result}" alt="Uploaded photo">
                    <button class="btn-remove-photo" onclick="window.chatbot.clearPhotoPreview()">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
            `;
            this.showNotification('Photo uploaded! Click send to recognize student', 'success');
        };
        reader.readAsDataURL(file);
    }

    clearPhotoPreview() {
        this.photoPreview.innerHTML = '';
        this.photoInput.value = '';
    }

    clearPhotoInput() {
        this.photoInput.value = '';
    }

    addMessage(content, sender, type = 'text') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit'
        });

        if (type === 'student_record') {
            // Handle student record cards
            messageDiv.innerHTML = content;
            messageDiv.classList.add('student-record-message');
        } else {
            const formattedContent = this.formatMessageContent(content);
            
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">${formattedContent}</div>
                    <div class="message-actions">
                        <span class="message-time">${timestamp}</span>
                        ${sender === 'bot' ? 
                            `<button class="speak-btn" onclick="window.chatbot.speakText(window.chatbot.getSpeakableText('${this.escapeHtml(content)}'))">
                                <i class="fas fa-volume-up"></i> Speak
                            </button>` : ''
                        }
                    </div>
                </div>
            `;
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessageContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/\•/g, '•');
    }

    addPhotoMessage(photoData, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <div class="photo-message">
                    <img src="${photoData}" alt="Student photo" class="chat-photo">
                    <p class="photo-caption">
                        <i class="fas fa-camera"></i> Student photo uploaded for recognition
                    </p>
                </div>
                <span class="message-time">${timestamp}</span>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.hideTypingIndicator();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-animation">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span class="typing-text">BIET Assistant is typing...</span>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTo({
            top: this.chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    showHelp() {
        this.addMessage("help", 'user');
        this.sendMessage();
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '💡'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || '💡'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }
}

// Global functions for HTML onclick attributes
function openChat() {
    if (window.chatbot) {
        window.chatbot.openChat();
    }
}

function minimizeChat() {
    if (window.chatbot) {
        window.chatbot.minimizeChat();
    }
}

function closeChat() {
    if (window.chatbot) {
        window.chatbot.closeChat();
    }
}

function toggleVoiceInput() {
    if (window.chatbot) {
        window.chatbot.toggleVoiceInput();
    }
}

function showHelp() {
    if (window.chatbot) {
        window.chatbot.showHelp();
    }
}

function stopSpeaking() {
    if (window.chatbot) {
        window.chatbot.stopSpeaking();
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing BIET Chatbot with Voice Recognition...');
    window.chatbot = new BIETChatbot();
    
    // Make functions globally available
    window.openChat = openChat;
    window.minimizeChat = minimizeChat;
    window.closeChat = closeChat;
    window.toggleVoiceInput = toggleVoiceInput;
    window.showHelp = showHelp;
    window.stopSpeaking = stopSpeaking;

    console.log('BIET Chatbot ready! Voice features:', {
        speechRecognition: !!window.chatbot.recognition,
        speechSynthesis: !!window.chatbot.synthesis
    });
});

// Load voices when they become available
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() {
        console.log('Voices loaded:', window.speechSynthesis.getVoices().length);
    };
}