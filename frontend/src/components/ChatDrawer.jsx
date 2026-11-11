import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, MessageSquare, Phone, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { sendChatMessage } from '../api/chat';
import { submitInquiry } from '../api/inquiries';
import { personalInfo } from '../data/portfolio';

export default function ChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi, I'm Ask Suji — Sujita's autonomous AI intake agent. I can answer questions about her engineering architecture, projects (SoulCare, UrmiNexus, SujiPortfolio), services, and tech stack.",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Appointment collection state
  const [appointmentMode, setAppointmentMode] = useState(false);
  const [apptForm, setApptForm] = useState({ name: '', email: '', preferred_time: '', purpose: '' });
  const [apptSubmitted, setApptSubmitted] = useState(false);
  const [apptSubmitting, setApptSubmitting] = useState(false);

  const messagesEndRef = useRef(null);

  const quickPrompts = [
    'What architectures does Suji build?',
    'Showcase core projects',
    'Book consultation',
    'Backend & AI stack',
    'Find global remote jobs',
  ];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, appointmentMode]);

  const handleSend = async (textToSend = inputText) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setInputText('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage(text, conversationId);
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', text: data.reply },
      ]);
    } catch (error) {
      console.error('Ask Suji chat request failed:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: error?.message || 'The AI service could not be reached. Check the backend terminal for the full error.',
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
      return;
    }
    handleSend(prompt);
  };

  const handleApptSubmit = async (e) => {
    e.preventDefault();
    setApptSubmitting(true);
    try {
      await submitInquiry({
        name: apptForm.name,
        email: apptForm.email,
        project_type: 'Consultation Appointment',
        budget: 'Consultation',
        message: `Preferred Time: ${apptForm.preferred_time}. Summary: ${apptForm.purpose || 'General Consultation'}`,
        source: 'chat_appointment',
      });
    } catch (err) {
      console.warn('Backend intake notice:', err);
    } finally {
      setApptSubmitting(false);
      setApptSubmitted(true);
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] text-emerald-400">pgvector ready</span>
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
                  DRAFT
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
                placeholder="Preferred time (e.g. Tue 3pm IST)"
                required
                value={apptForm.preferred_time}
                onChange={(e) => setApptForm({ ...apptForm, preferred_time: e.target.value })}
              />
              <input
                className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-text-main text-xs placeholder-text-muted focus:border-brand-pink focus:outline-none transition-colors"
                placeholder="Project topic or summary"
                value={apptForm.purpose}
                onChange={(e) => setApptForm({ ...apptForm, purpose: e.target.value })}
              />
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
                  CONSULTATION QUEUED
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  DISPATCHED
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
                  <strong className="text-text-main">Time:</strong> {apptForm.preferred_time}
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
            placeholder="Try: job khojo, find Python remote jobs…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white btn-primary p-0 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
