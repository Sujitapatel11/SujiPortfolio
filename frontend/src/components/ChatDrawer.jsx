import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { sendChatMessage } from '../api/chat';

export default function ChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm Ask Suji, Sujita's AI Intake Assistant. Ask me anything about Sujita's engineering background, projects (SoulCare & AIEC), services, or pricing!"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "What services does Sujita offer?",
    "Tell me about the SoulCare project",
    "What tech stack does Sujita use?",
    "How can I hire Sujita for a project?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend = inputText) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMsgId = Date.now().toString();
    const userMsg = { id: userMsgId, role: 'user', text };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Backend expects payload with `conversation_id`
      const data = await sendChatMessage(text, conversationId);

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sorry, I ran into an issue connecting to the AI backend. Please try again or submit your inquiry via the Contact form below."
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-drawer-overlay">
      <div className="chat-drawer-content">
        {/* Header */}
        <div className="chat-drawer-header">
          <div className="flex items-center gap-2">
            <div className="bot-avatar">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="drawer-title">Ask Suji</h3>
              <p className="drawer-subtitle">AI Qualification & Intake Assistant</p>
            </div>
          </div>
          <button className="btn-close-drawer" onClick={onClose} aria-label="Close chat">
            <X size={20} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="chat-messages-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.role}`}>
              <div className="avatar-icon">
                {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
              </div>
              <div className={`chat-bubble ${msg.role}`}>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-bubble-wrapper assistant">
              <div className="avatar-icon">
                <Bot size={14} />
              </div>
              <div className="chat-bubble assistant loading">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="quick-prompts-container">
          <p className="quick-prompts-title">Suggested questions:</p>
          <div className="quick-prompts-list">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                className="quick-prompt-btn"
                onClick={() => handleSend(p)}
                disabled={isLoading}
              >
                <Sparkles size={12} />
                <span>{p}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Input */}
        <div className="chat-drawer-footer">
          <textarea
            className="chat-input"
            rows={1}
            placeholder="Type a message or ask a question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className="btn-send-chat"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
