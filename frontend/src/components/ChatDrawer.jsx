import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, MessageSquare, CheckCircle2, Mic, Volume2, VolumeX } from 'lucide-react';
import { sendChatMessage, getChatStatus, getChatHistory } from '../api/chat';
import { submitAppointmentRequest } from '../api/appointments';
import { personalInfo } from '../data/portfolio';

export default function ChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi, I'm Ask Suji. I answer questions grounded in Sujita's public portfolio and can help submit consultation or project requests.",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => sessionStorage.getItem('ask_suji_conversation_id'));
  const [backendState, setBackendState] = useState('checking');
  const [failedMessage, setFailedMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

  // Appointment collection state
  const [appointmentMode, setAppointmentMode] = useState(false);
  const [apptForm, setApptForm] = useState({ name: '', email: '', preferred_time: '', purpose: '' });
  const [apptSubmitted, setApptSubmitted] = useState(false);
  const [apptSubmitting, setApptSubmitting] = useState(false);
  const [apptError, setApptError] = useState('');
  const [apptResult, setApptResult] = useState(null);
  const [apptRequestKey, setApptRequestKey] = useState(() => crypto.randomUUID());

  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'What architectures does Suji build?',
    'Showcase core projects',
    'Book consultation',
    'Backend & AI stack',
  ];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const startVoiceInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError('Voice input is not supported in this browser. You can still type your message.');
      return;
    }
    try {
      setVoiceError('');
      const recognition = new Recognition();
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) setInputText((previous) => previous ? `${previous} ${transcript}` : transcript);
      };
      recognition.onerror = (event) => {
        setVoiceError(`Voice input failed: ${event.error || 'unknown error'}.`);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch (error) {
      setIsListening(false);
      setVoiceError(error.message || 'Could not start voice input.');
    }
  };

  const speakMessage = (text) => {
    if (!('speechSynthesis' in window)) {
      setVoiceError('Voice output is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceError('Voice output could not be played.');
    };
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    scrollToBottom();
    let active = true;
    getChatStatus()
      .then((data) => {
        if (!active) return;
        setBackendState(data.provider_configured ? 'configured' : 'degraded');
      })
      .catch(() => {
        if (active) setBackendState('offline');
      });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !conversationId) return;
    let active = true;
    getChatHistory(conversationId)
      .then((history) => {
        if (active && Array.isArray(history) && history.length) {
          setMessages([
            { id: 'welcome', role: 'assistant', text: "Hi, I'm Ask Suji. I can answer questions grounded in Sujita's public portfolio and help submit consultation or project requests." },
            ...history.map((item, index) => ({
              id: `history-${index}-${item.created_at || ''}`,
              role: item.role,
              text: item.text,
              sources: item.sources || [],
            })),
          ]);
        }
      })
      .catch(() => {
        if (active) {
          sessionStorage.removeItem('ask_suji_conversation_id');
          setConversationId(null);
        }
      });
    return () => { active = false; };
  }, [isOpen, conversationId]);

  const handleSend = async (textToSend = inputText, appendUser = true) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    if (appendUser) setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setFailedMessage('');
    setInputText('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage(text, conversationId);
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        sessionStorage.setItem('ask_suji_conversation_id', data.conversation_id);
      }
      if (data.status === 'degraded') setBackendState('degraded');
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', text: data.reply, sources: data.sources || [], degraded: data.status === 'degraded' },
      ]);
    } catch (error) {
      setFailedMessage(text);
      setBackendState('offline');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: error.message || 'Ask Suji could not reach the backend. Your request was not confirmed.',
          degraded: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    if (prompt === 'Book consultation') {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'user', text: 'Book consultation' },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: "I can queue a consultation request directly into Sujita's intake pipeline. Please fill in your details below:",
        },
      ]);
      setAppointmentMode(true);
      setApptSubmitted(false);
      setApptError('');
      setApptResult(null);
      setApptRequestKey(crypto.randomUUID());
      return;
    }
    handleSend(prompt);
  };

  const handleApptSubmit = async (e) => {
    e.preventDefault();
    setApptSubmitting(true);
    setApptError('');
    try {
      const result = await submitAppointmentRequest({
        name: apptForm.name,
        email: apptForm.email,
        preferred_time: apptForm.preferred_time || null,
        purpose: apptForm.purpose || null,
      }, apptRequestKey);
      setApptResult(result);
      setApptSubmitted(true);
    } catch (err) {
      setApptError(err.message || 'The request could not be saved. Nothing has been submitted.');
    } finally {
      setApptSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[201] h-full w-full sm:w-[420px] bg-bg-secondary/95 border-l border-border-accent flex flex-col shadow-2xl backdrop-blur-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-card/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-tr from-brand-pink to-brand-violet text-white shadow-md">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-text-main text-sm">Ask Suji AI</h3>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-brand-pink/20 text-brand-pink font-semibold">
                  RAG
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${backendState === 'configured' ? 'bg-emerald-400' : backendState === 'checking' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <span className={`font-mono text-[10px] ${backendState === 'configured' ? 'text-emerald-400' : backendState === 'checking' ? 'text-amber-400' : 'text-rose-400'}`} aria-live="polite">
                  {backendState === 'configured' ? 'Backend online · provider key set' : backendState === 'checking' ? 'Checking backend…' : backendState === 'degraded' ? 'AI service degraded' : 'Backend offline'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-bg-card transition-all"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 no-scrollbar bg-bg-primary/60">
          {messages.map((msg) =>
            msg.role === 'assistant' ? (
              <div key={msg.id} className="flex gap-2.5 max-w-[92%]">
                <span className="font-mono text-[10px] text-brand-pink flex-shrink-0 pt-1 font-bold">
                  SUJI:
                </span>
                <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs sm:text-sm text-text-main bg-bg-card/90 border border-border leading-relaxed shadow-sm">
                  {msg.text}
                  <button
                    type="button"
                    onClick={() => speakMessage(msg.text)}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-text-muted hover:text-brand-pink"
                    aria-label="Read this reply aloud"
                  >
                    <Volume2 size={12} /> Read aloud
                  </button>
                  {msg.sources?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/70 space-y-1">
                      <p className="font-mono text-[9px] text-text-muted">GROUNDED SOURCES</p>
                      {msg.sources.map((source, index) => (
                        <p key={`${source.source}-${index}`} className="font-mono text-[10px] text-text-secondary">
                          {source.source} · {Math.round((source.similarity || 0) * 100)}% match
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-end max-w-[85%] ml-auto">
                <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs sm:text-sm text-white bg-gradient-to-r from-brand-pink to-brand-violet leading-relaxed shadow-md">
                  {msg.text}
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-1.5 items-center px-2 py-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-pink/70 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {failedMessage && (
            <div className="flex justify-start px-2">
              <button
                type="button"
                onClick={() => handleSend(failedMessage, false)}
                disabled={isLoading}
                className="text-[11px] font-mono text-brand-pink underline disabled:opacity-50"
              >
                Retry last message
              </button>
            </div>
          )}

          {/* Appointment collection form */}
          {appointmentMode && !apptSubmitted && (
            <form
              onSubmit={handleApptSubmit}
              className="rounded-2xl p-4 space-y-2.5 bg-bg-card border border-border-accent shadow-md"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-mono text-[11px] text-brand-pink font-semibold">
                  CONSULTATION REQUEST
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted border border-border">
                  REQUEST FORM
                </span>
              </div>
              <input
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-main text-xs placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                placeholder="Your name"
                required
                value={apptForm.name}
                onChange={(e) => setApptForm({ ...apptForm, name: e.target.value })}
              />
              <input
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-main text-xs placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                type="email"
                placeholder="Your email"
                required
                value={apptForm.email}
                onChange={(e) => setApptForm({ ...apptForm, email: e.target.value })}
              />
              <input
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-main text-xs placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                placeholder="Preferred time (optional)"
                value={apptForm.preferred_time}
                onChange={(e) => setApptForm({ ...apptForm, preferred_time: e.target.value })}
              />
              <input
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-main text-xs placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                placeholder="Project topic or summary"
                value={apptForm.purpose}
                onChange={(e) => setApptForm({ ...apptForm, purpose: e.target.value })}
              />
              {apptError && <p role="alert" className="text-xs text-rose-400">{apptError}</p>}
              <button
                type="submit"
                disabled={apptSubmitting}
                className="w-full py-2 rounded-xl text-white text-xs font-medium btn-primary justify-center"
              >
                {apptSubmitting ? 'Submitting...' : 'Queue Consultation Request'}
              </button>
            </form>
          )}

          {/* Submitted appointment confirmation */}
          {appointmentMode && apptSubmitted && (
            <div className="rounded-2xl p-4 bg-bg-card border border-emerald-500/30 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-2.5">
                <span className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  REQUEST SAVED · PENDING
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {apptResult?.owner_notification_sent ? 'OWNER NOTIFIED' : 'NOTIFICATION UNCONFIRMED'}
                </span>
              </div>
              <div className="space-y-1 font-mono text-xs text-text-secondary">
                <p>
                  <strong className="text-text-main">Name:</strong> {apptForm.name}
                </p>
                <p>
                  <strong className="text-text-main">Email:</strong> {apptForm.email}
                </p>
                <p>
                  <strong className="text-text-main">Time:</strong> {apptForm.preferred_time || 'Not specified'}
                </p>
                <p><strong className="text-text-main">Request:</strong> #{apptResult?.id}</p>
                <p className="text-text-muted">{apptResult?.message || 'Awaiting owner confirmation.'}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-bg-card border-t border-border">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => handleQuickPrompt(p)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-lg font-mono text-[11px] text-text-secondary bg-bg-secondary border border-border hover:text-white hover:border-brand-pink/50 transition-all duration-150"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Direct WhatsApp Callout in Drawer */}
        <div className="px-4 py-1.5 bg-bg-secondary border-t border-border flex items-center justify-between text-[11px] font-mono">
          <span className="text-text-muted">Need urgent answer?</span>
          <a
            href={personalInfo.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1"
          >
            <MessageSquare size={11} />
            WhatsApp Sujita
          </a>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-bg-card">
          <input
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border text-text-main text-xs sm:text-sm placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
            placeholder="Ask about systems, stack, projects..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={startVoiceInput}
            disabled={isListening || isLoading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border border-border disabled:opacity-40 flex-shrink-0 ${isListening ? 'text-rose-400 border-rose-400' : 'text-text-secondary hover:text-brand-pink'}`}
            aria-label="Start voice input"
            title="Use voice input"
          >
            <Mic size={16} />
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white btn-primary p-0 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        {voiceError && (
          <p role="status" className="px-4 pb-2 text-[10px] text-rose-400" aria-live="polite">{voiceError}</p>
        )}
      </div>
    </>
  );
}
