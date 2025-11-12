import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { t } from '../../i18n/i18n.js';

export class SttView extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
        }

        /* Inherit font styles from parent */

        .transcription-container {
            overflow-y: auto;
            padding: 12px 12px 16px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-height: 150px;
            max-height: 600px;
            position: relative;
            z-index: 1;
            flex: 1;
        }

        /* Visibility handled by parent component */

        .transcription-container::-webkit-scrollbar {
            width: 8px;
        }
        .transcription-container::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }
        .transcription-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
        }
        .transcription-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .stt-message {
            padding: 8px 12px;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
            word-break: break-word;
            line-height: 1.5;
            font-size: 13px;
            margin-bottom: 4px;
            box-sizing: border-box;
            position: relative;
        }
        
        .stt-message .ask-button {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 4px;
            width: 20px;
            height: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .stt-message:hover .ask-button {
            opacity: 1;
        }
        
        .stt-message .ask-button:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .stt-message .ask-button svg {
            width: 12px;
            height: 12px;
            fill: white;
        }
        
        .stt-message.selected {
            background: rgba(0, 122, 255, 0.5) !important;
        }

        .stt-message.them {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            align-self: flex-start;
            border-bottom-left-radius: 4px;
            margin-right: auto;
        }

        .stt-message.me {
            background: rgba(0, 122, 255, 0.8);
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
            margin-left: auto;
        }

        .empty-state {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            font-style: italic;
        }
        
        .connection-status {
            padding: 8px 12px;
            border-radius: 12px;
            margin: 8px 0;
            text-align: center;
            font-size: 12px;
        }
        
        .connection-status.connecting {
            background: rgba(255, 255, 0, 0.2);
            color: rgba(255, 255, 0, 0.9);
        }
        
        .connection-status.error {
            background: rgba(255, 0, 0, 0.2);
            color: rgba(255, 0, 0, 0.9);
        }
        
        .connection-status.connected {
            background: rgba(0, 255, 0, 0.2);
            color: rgba(0, 255, 0, 0.9);
        }
        
        .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    static properties = {
        sttMessages: { type: Array },
        isVisible: { type: Boolean },
        connectionState: { type: String }, // 'connecting', 'connected', 'error'
        connectionError: { type: String },
    };

    constructor() {
        super();
        this.sttMessages = [];
        this.isVisible = true;
        this.connectionState = 'connecting'; // По умолчанию показываем состояние подключения
        this.connectionError = '';
        this.messageIdCounter = 0;
        this._shouldScrollAfterUpdate = false;
        this.selectedMessages = new Set();
        this.isCtrlPressed = false;
        this.connectionStateChangeHandler = null;

        this.handleSttUpdate = this.handleSttUpdate.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMessageClick = this.handleMessageClick.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        if (window.api) {
            console.log('[SttView] Setting up connection state change handler');
            window.api.sttView.onSttUpdate(this.handleSttUpdate);
            // Добавляем обработчики событий для состояния подключения
            this.connectionStateChangeHandler = (event, data) => {
                console.log('[SttView] Received connection state change:', data);
                const { state, error } = data;
                console.log(`[SttView] Updating connectionState from ${this.connectionState} to ${state}`);
                this.connectionState = state;
                this.connectionError = error || '';
                this.requestUpdate();
            };
            window.api.sttView.onSttConnectionStateChange(this.connectionStateChangeHandler);

            // Request current connection state
            this.requestCurrentConnectionState();
        }
        
        // Add keyboard event listeners
        this.addEventListener('keydown', this.handleKeyDown);
        this.addEventListener('keyup', this.handleKeyUp);
    }

    async requestCurrentConnectionState() {
        try {
            console.log('[SttView] Requesting current connection state');
            const state = await window.api.sttView.getCurrentSttConnectionState();
            console.log('[SttView] Received current connection state:', state);
            if (state && state.state) {
                // Only update if we haven't received a state change event yet
                // or if the received state is more recent (this is a simplification,
                // a more robust solution would involve timestamps or sequence numbers)
                // For now, we'll just update if the current state is still 'connecting' (default)
                // or if the new state is 'error' (to ensure errors are shown)
                console.log(`[SttView] Current local connectionState: ${this.connectionState}`);
                if (this.connectionState === 'connecting' || state.state === 'error') {
                    console.log(`[SttView] Updating connectionState from ${this.connectionState} to ${state.state} (initial load)`);
                    this.connectionState = state.state;
                    this.connectionError = state.error || '';
                    this.requestUpdate();
                } else {
                    console.log('[SttView] Not updating state on initial load, as a state change event has likely already been received');
                }
            } else {
                console.log('[SttView] Invalid state received from getCurrentSttConnectionState');
            }
        } catch (error) {
            console.error('[SttView] Error requesting current connection state:', error);
        }
    }

    disconnectedCallback() {
        // Remove keyboard event listeners
        this.removeEventListener('keydown', this.handleKeyDown);
        this.removeEventListener('keyup', this.handleKeyUp);
        
        super.disconnectedCallback();
        if (window.api) {
            window.api.sttView.removeOnSttUpdate(this.handleSttUpdate);
            // Удаляем обработчики событий для состояния подключения
            if (this.connectionStateChangeHandler) {
                window.api.sttView.removeOnSttConnectionStateChange(this.connectionStateChangeHandler);
            }
        }
    }

    // Handle session reset from parent
    resetTranscript() {
        this.sttMessages = [];
        this.requestUpdate();
    }

    handleSttUpdate(event, { speaker, text, isFinal, isPartial }) {
        if (text === undefined) return;

        const container = this.shadowRoot.querySelector('.transcription-container');
        this._shouldScrollAfterUpdate = container ? container.scrollTop + container.clientHeight >= container.scrollHeight - 10 : false;

        const findLastPartialIdx = spk => {
            for (let i = this.sttMessages.length - 1; i >= 0; i--) {
                const m = this.sttMessages[i];
                if (m.speaker === spk && m.isPartial) return i;
            }
            return -1;
        };

        const newMessages = [...this.sttMessages];
        const targetIdx = findLastPartialIdx(speaker);

        if (isPartial) {
            if (targetIdx !== -1) {
                newMessages[targetIdx] = {
                    ...newMessages[targetIdx],
                    text,
                    isPartial: true,
                    isFinal: false,
                };
            } else {
                newMessages.push({
                    id: this.messageIdCounter++,
                    speaker,
                    text,
                    isPartial: true,
                    isFinal: false,
                });
            }
        } else if (isFinal) {
            if (targetIdx !== -1) {
                newMessages[targetIdx] = {
                    ...newMessages[targetIdx],
                    text,
                    isPartial: false,
                    isFinal: true,
                };
            } else {
                newMessages.push({
                    id: this.messageIdCounter++,
                    speaker,
                    text,
                    isPartial: false,
                    isFinal: true,
                });
            }
        }

        this.sttMessages = newMessages;
        
        // Notify parent component about message updates
        this.dispatchEvent(new CustomEvent('stt-messages-updated', {
            detail: { messages: this.sttMessages },
            bubbles: true
        }));
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.transcription-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    getSpeakerClass(speaker) {
        return speaker.toLowerCase() === 'me' ? 'me' : 'them';
    }

    getTranscriptText() {
        return this.sttMessages.map(msg => `${msg.speaker}: ${msg.text}`).join('\n');
    }
    
    async sendQuestionToAskService(question) {
        if (!window.api) return;
        
        try {
            const result = await window.api.sttView.sendQuestionToAskService(question);
            console.log('[SttView] Question sent to AskService:', result);
        } catch (error) {
            console.error('[SttView] Error sending question to AskService:', error);
        }
    }
    
    handleAskButtonClick(question) {
        this.sendQuestionToAskService(question);
    }
    
    handleKeyDown(event) {
        if (event.key === 'Control' || event.key === 'Meta') {
            this.isCtrlPressed = true;
        }
        
        // Check for Ctrl + } (or Cmd + } on Mac)
        if ((event.ctrlKey || event.metaKey) && event.key === '}') {
            this.sendSelectedMessagesToAskService();
        }
    }
    
    handleKeyUp(event) {
        if (event.key === 'Control' || event.key === 'Meta') {
            this.isCtrlPressed = false;
        }
    }
    
    handleMessageClick(messageId, event) {
        if (event.ctrlKey || event.metaKey) {
            if (this.selectedMessages.has(messageId)) {
                this.selectedMessages.delete(messageId);
            } else {
                this.selectedMessages.add(messageId);
            }
            this.requestUpdate();
        }
    }
    
    getSelectedMessagesText() {
        // Sort selected messages by their order in sttMessages
        const selectedMessagesArray = Array.from(this.selectedMessages);
        const sortedMessages = selectedMessagesArray
            .map(id => this.sttMessages.find(msg => msg.id === id))
            .filter(msg => msg !== undefined)
            .sort((a, b) => this.sttMessages.indexOf(a) - this.sttMessages.indexOf(b));
        
        return sortedMessages.map(msg => `${msg.speaker}: ${msg.text}`).join('\n');
    }
    
    async sendSelectedMessagesToAskService() {
        if (!window.api || this.selectedMessages.size === 0) return;
        
        const selectedText = this.getSelectedMessagesText();
        
        try {
            // Reuse existing method for sending to AskService
            const result = await window.api.sttView.sendQuestionToAskService(selectedText);
            console.log('[SttView] Selected messages sent to AskService:', result);
            
            // Clear selection after sending
            this.selectedMessages.clear();
            this.requestUpdate();
        } catch (error) {
            console.error('[SttView] Error sending selected messages to AskService:', error);
        }
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('sttMessages')) {
            if (this._shouldScrollAfterUpdate) {
                this.scrollToBottom();
                this._shouldScrollAfterUpdate = false;
            }
        }
    }
    
    renderConnectionStatus() {
        switch (this.connectionState) {
            case 'connecting':
                return html`<div class="connection-status connecting"><span class="spinner"></span>${t('sttConnecting')}</div>`;
            case 'connected':
                return html`<div class="connection-status connected">${t('sttConnected')}</div>`;
            case 'error':
                return html`<div class="connection-status error">${t('sttConnectionError')}: ${this.connectionError}</div>`;
            default:
                return '';
        }
    }

    render() {
        if (!this.isVisible) {
            return html`<div style="display: none;"></div>`;
        }

        return html`
            <div class="transcription-container">
                ${this.renderConnectionStatus()}
                ${this.sttMessages.length === 0
                    ? html`<div class="empty-state">${t('waitingForSpeech')}</div>`
                    : this.sttMessages.map(msg => html`
                        <div class="stt-message ${this.getSpeakerClass(msg.speaker)} ${this.selectedMessages.has(msg.id) ? 'selected' : ''}"
                             @click=${(e) => this.handleMessageClick(msg.id, e)}>
                            ${msg.text}
                            <button class="ask-button" @click=${(e) => {
                                e.stopPropagation();
                                this.handleAskButtonClick(msg.text);
                            }}>
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.1 5.1L15.1 6.1L12.5 3.5L11 5L17 11H15C15 12.1 15.4 13.2 16.1 14L13.5 16.6C12.4 15.8 11.2 15.4 10 15.4C7.8 15.4 6 17.2 6 19.4C6 21.6 7.8 23.4 10 23.4C12.2 23.4 14 21.6 14 19.4C14 18.2 13.6 17 12.8 15.9L15.4 13.3C16.2 14 17.3 14.4 18.5 14.4V12.5L21 9Z"/>
                                </svg>
                            </button>
                        </div>
                    `)
                }
            </div>
        `;
    }
}

customElements.define('stt-view', SttView);