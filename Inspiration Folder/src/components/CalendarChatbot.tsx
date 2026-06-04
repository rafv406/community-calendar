import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Inline Markdown Parser to support lists, bold, and links cleanly
function formatMessageContent(content: string, isUser: boolean) {
  const parseInline = (text: string) => {
    const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
    const parts = [];
    let lastIdx = 0;
    let match;
    let keyIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      if (matchStart > lastIdx) {
        parts.push(text.substring(lastIdx, matchStart));
      }

      if (match[0].startsWith('**')) {
        parts.push(<strong key={keyIndex++}>{match[2]}</strong>);
      } else {
        parts.push(
          <a
            key={keyIndex++}
            href={match[4]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: isUser ? '#fff' : 'var(--rafv-royal)', textDecoration: isUser ? 'underline' : 'none' }}
          >
            {match[3]}
          </a>
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    return parts.length > 0 ? parts : text;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '') {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} style={{ margin: '4px 0 8px 0', paddingLeft: '20px' }}>
            {currentList}
          </ul>
        );
        currentList = [];
      }
      continue;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('+ ')) {
      const listText = trimmed.substring(2);
      currentList.push(<li key={i} style={{ marginBottom: '4px' }}>{parseInline(listText)}</li>);
    } else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} style={{ margin: '4px 0 8px 0', paddingLeft: '20px' }}>
            {currentList}
          </ul>
        );
        currentList = [];
      }

      if (trimmed === '---') {
        elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '10px 0' }} />);
      } else {
        elements.push(<p key={i} style={{ margin: '0 0 6px 0' }}>{parseInline(line)}</p>);
      }
    }
  }

  if (currentList.length > 0) {
    elements.push(
      <ul key={`list-${listKey++}`} style={{ margin: '4px 0 8px 0', paddingLeft: '20px' }}>
        {currentList}
      </ul>
    );
  }

  return <>{elements}</>;
}

export function CalendarChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! 👋 I am the official RAFV Assistant. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rippling, setRippling] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const workerApiUrl = import.meta.env.VITE_WORKER_API_URL || 'https://community-calendar-worker.rafvvids.workers.dev';

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileSitekey = import.meta.env.VITE_TURNSTILE_SITEKEY || '';
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSitekey || !isOpen) return;

    if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      (window as any).onloadTurnstileCallback = () => {
        renderTurnstile();
      };
    } else if ((window as any).turnstile) {
      renderTurnstile();
    }

    function renderTurnstile() {
      if (turnstileContainerRef.current && (window as any).turnstile) {
        if (widgetIdRef.current) {
          try {
            (window as any).turnstile.remove(widgetIdRef.current);
          } catch (e) {}
        }
        widgetIdRef.current = (window as any).turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSitekey,
          callback: (token: string) => {
            setTurnstileToken(token);
          },
          'expired-callback': () => {
            setTurnstileToken(null);
          },
          'error-callback': () => {
            setTurnstileToken(null);
          },
          theme: 'light',
          size: 'invisible'
        });
      }
    }

    return () => {
      delete (window as any).onloadTurnstileCallback;
    };
  }, [isOpen, turnstileSitekey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleReset = () => {
    // Animate messages out
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! 👋 I am the official RAFV Assistant. How can I help you today?',
      },
    ]);
  };

  const toggleChat = () => {
    setRippling(true);
    setTimeout(() => setRippling(false), 500);

    if (isOpen) {
      setIsClosing(true);
      setIsOpen(false);
      setTimeout(() => setIsClosing(false), 300);
    } else {
      setIsOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch(`${workerApiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.id !== 'welcome'), userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          turnstileToken: turnstileToken || undefined
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate response');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader available');

      let assistantText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: assistantText } : m
          )
        );
      }
    } catch (err) {
      console.error('Error fetching chat stream:', err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      if (turnstileSitekey && widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current);
          setTurnstileToken(null);
        } catch (e) {}
      }
    }
  };

  return (
    <>
      <style>{`
        :root {
            --rafv-navy: #003399;
            --rafv-royal: #2C6EFA;
            --rafv-gradient: linear-gradient(135deg, #003399 0%, #2C6EFA 100%);
            
            --glass-bg: rgba(255, 255, 255, 0.75);
            --glass-shine: rgba(255, 255, 255, 0.9);
            --glass-border: 1px solid rgba(255, 255, 255, 0.6);
            --glass-blur: blur(40px);
            --glass-shadow: 
                0 40px 100px rgba(0, 51, 153, 0.2),
                0 10px 30px rgba(0, 0, 0, 0.05);
                
            --font-family: 'Inter', sans-serif;

            /* Spring animation durations */
            --spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
            --spring-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
            --spring-snappy: cubic-bezier(0.2, 0, 0, 1);
        }

        #rafv-widget {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 999999;
            font-family: var(--font-family);
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            pointer-events: none !important;
        }

        /* --- CHAT WINDOW --- */
        #rafv-window {
            width: 380px;
            height: 650px;
            background: linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.65) 100%);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: var(--glass-border);
            box-shadow: 
                var(--glass-shadow),
                inset 0 1px 0 rgba(255,255,255,0.8); 
            border-radius: 28px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin-bottom: 25px;
            
            opacity: 0;
            transform: translateY(20px) scale(0.92);
            transform-origin: bottom right;
            pointer-events: none;

            /* Apple-style spring transition */
            transition: 
                opacity 0.45s var(--spring-smooth),
                transform 0.5s var(--spring-bounce);
        }

        #rafv-window.active {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto !important;
        }

        /* Closing animation */
        #rafv-window.closing {
            opacity: 0;
            transform: translateY(16px) scale(0.94);
            transition:
                opacity 0.3s var(--spring-smooth),
                transform 0.3s var(--spring-snappy);
            pointer-events: none;
        }

        /* --- HEADER --- */
        .rafv-header {
            padding: 24px;
            background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0));
            border-bottom: 1px solid rgba(255,255,255,0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }

        .rafv-header-left { display: flex; align-items: center; gap: 14px; }

        /* Logo — subtle pulse on open */
        .rafv-logo {
            width: 44px; height: 44px; 
            border-radius: 50%; 
            object-fit: cover; 
            background: #fff; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            border: 2px solid rgba(255,255,255,0.8);
            transition: transform 0.4s var(--spring-bounce);
        }
        #rafv-window.active .rafv-logo {
            animation: logoPop 0.5s var(--spring-bounce) 0.1s both;
        }
        @keyframes logoPop {
            0% { transform: scale(0.7); }
            100% { transform: scale(1); }
        }

        .rafv-header-text { display: flex; flex-direction: column; }
        .rafv-title { font-size: 17px; font-weight: 700; color: var(--rafv-navy); margin: 0; letter-spacing: -0.02em; }
        .rafv-subtitle { font-size: 13px; color: #666; margin: 2px 0 0 0; font-weight: 500; }

        .rafv-header-actions { display: flex; gap: 8px; }

        /* Icon buttons — Apple press feel */
        .rafv-icon-btn {
            background: rgba(255,255,255,0.3); 
            border: 1px solid rgba(255,255,255,0.5);
            cursor: pointer; padding: 8px; border-radius: 10px; color: #888; 
            transition: 
                background 0.2s ease,
                color 0.2s ease,
                transform 0.15s var(--spring-bounce),
                box-shadow 0.2s ease;
            display: flex; align-items: center; justify-content: center;
            will-change: transform;
            outline: none;
        }
        .rafv-icon-btn:hover { 
            background: rgba(255,255,255,0.85); 
            color: var(--rafv-navy); 
            transform: scale(1.08);
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .rafv-icon-btn:active { 
            transform: scale(0.92);
            background: rgba(255,255,255,0.95);
            transition: transform 0.08s ease;
        }

        /* Reset icon spin */
        #rafv-reset-btn svg {
            transition: transform 0.5s var(--spring-bounce);
        }
        #rafv-reset-btn:hover svg { transform: rotate(200deg); }
        #rafv-reset-btn:active svg { transform: rotate(160deg); }

        /* --- MESSAGES --- */
        #rafv-messages {
            flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; scroll-behavior: smooth;
        }
        #rafv-messages::-webkit-scrollbar { width: 5px; }
        #rafv-messages::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

        .message {
            max-width: 85%;
            padding: 14px 18px;
            font-size: 15px;
            line-height: 1.55;
            border-radius: 20px;
            word-wrap: break-word;
            animation: messageSlideIn 0.4s var(--spring-bounce) both;
        }

        @keyframes messageSlideIn {
            0% { opacity: 0; transform: translateY(12px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .message.bot {
            align-self: flex-start; 
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            color: #1a1a1a; 
            border-bottom-left-radius: 4px; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
            animation: messageBotIn 0.45s var(--spring-bounce) both;
        }
        @keyframes messageBotIn {
            0% { opacity: 0; transform: translateX(-10px) scale(0.96); }
            100% { opacity: 1; transform: translateX(0) scale(1); }
        }

        .message.user {
            align-self: flex-end; 
            background: var(--rafv-gradient);
            color: white; 
            box-shadow: 0 8px 20px rgba(44, 110, 250, 0.25); 
            border-bottom-right-radius: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            animation: messageUserIn 0.4s var(--spring-bounce) both;
        }
        @keyframes messageUserIn {
            0% { opacity: 0; transform: translateX(10px) scale(0.96); }
            100% { opacity: 1; transform: translateX(0) scale(1); }
        }

        /* MARKDOWN styling in messages */
        .message p { margin: 0 0 8px 0; } .message p:last-child { margin-bottom: 0; }
        .message h1, .message h2, .message h3 { font-weight: 700; margin: 10px 0 5px 0; line-height: 1.2; font-size: 1.1em; color: var(--rafv-navy); }
        .message ul, .message ol { margin: 5px 0 10px 0; padding-left: 20px; }
        .message strong { font-weight: 700; color: inherit; }
        .message a { color: var(--rafv-royal); text-decoration: none; font-weight: 600; }
        .message.user a { color: #fff; text-decoration: underline; }

        /* --- INPUT AREA --- */
        .rafv-input-container { 
            padding: 20px; 
            background: rgba(255,255,255,0.6); 
            border-top: 1px solid rgba(255,255,255,0.4); 
            flex-shrink: 0;
        }
        .rafv-input-wrapper {
            position: relative; width: 100%; 
            background: rgba(255,255,255,0.9);
            border-radius: 35px; 
            border: 1px solid rgba(200,210,255,0.4);
            display: flex; align-items: center; 
            transition: 
                background 0.25s ease,
                border-color 0.25s ease,
                box-shadow 0.25s ease,
                transform 0.2s var(--spring-bounce);
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            will-change: transform;
        }
        .rafv-input-wrapper.focused { 
            background: #fff;
            box-shadow: 0 4px 24px rgba(44, 110, 250, 0.12), 0 0 0 3px rgba(44, 110, 250, 0.08);
            border-color: rgba(44, 110, 250, 0.3);
            transform: scale(1.01);
        }
        
        #rafv-input { 
            width: 100%; padding: 16px 55px 16px 24px; border: none; background: transparent; outline: none; font-family: var(--font-family); font-size: 16px; color: #333; 
        }
        
        #rafv-send {
            position: absolute; right: 6px; top: 50%; transform: translateY(-50%); 
            width: 40px; height: 40px; border-radius: 50%; border: none; 
            background: #e8e8e8; color: #fff; cursor: default; 
            display: flex; align-items: center; justify-content: center; 
            transition: 
                background 0.25s ease,
                box-shadow 0.25s ease,
                transform 0.25s var(--spring-bounce),
                opacity 0.25s ease;
            opacity: 0.5; pointer-events: none;
            will-change: transform;
            outline: none;
        }
        #rafv-send.active {
            background: var(--rafv-navy); cursor: pointer; opacity: 1; pointer-events: all;
            box-shadow: 0 4px 14px rgba(0, 51, 153, 0.28);
            transform: translateY(-50%) scale(1);
        }
        #rafv-send.active:hover { 
            background: var(--rafv-royal); 
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 6px 18px rgba(44, 110, 250, 0.35);
        }
        #rafv-send.active:active { 
            transform: translateY(-50%) scale(0.9);
            transition: transform 0.08s ease;
        }

        /* --- LAUNCH BUTTON (Web3 + Apple Spring) --- */
        #rafv-orb-container {
            width: 78px; height: 78px;
            border-radius: 50%;
            background: var(--rafv-gradient); 
            box-shadow: 
                0 12px 30px rgba(0, 51, 153, 0.35), 
                inset 0 3px 2px rgba(255,255,255,0.25), 
                inset 0 -3px 2px rgba(0,0,0,0.1);
            animation: liquidGlow 4s infinite cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.4s var(--spring-bounce), box-shadow 0.3s ease;
            z-index: 1001;
            will-change: transform;
            position: relative;
            pointer-events: auto !important;
            /* Prevent flicker */
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
        }

        /* Hover — lift with spring */
        #rafv-orb-container:hover {
            transform: translateY(-6px) scale(1.06);
            box-shadow: 
                0 22px 55px rgba(44, 110, 250, 0.55),
                0 8px 20px rgba(0, 51, 153, 0.2),
                inset 0 3px 2px rgba(255,255,255,0.4);
            animation-play-state: paused; 
        }

        /* Press — squish down */
        #rafv-orb-container:active {
            transform: translateY(2px) scale(0.93) !important;
            box-shadow: 
                0 4px 14px rgba(0, 51, 153, 0.3),
                inset 0 3px 2px rgba(255,255,255,0.2);
            transition: transform 0.1s ease, box-shadow 0.1s ease;
            animation-play-state: paused;
        }

        /* Icon transitions */
        #rafv-orb-container svg { 
            width: 42px; height: 42px; 
            color: white; 
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2)); 
            transition: transform 0.4s var(--spring-bounce), opacity 0.2s ease;
            position: absolute;
        }

        /* Icon swap animation */
        #icon-open, #icon-close {
            transition: transform 0.4s var(--spring-bounce), opacity 0.25s ease;
        }
        #icon-open.hidden {
            opacity: 0;
            transform: scale(0.5) rotate(-20deg);
        }
        #icon-close.hidden {
            opacity: 0;
            transform: scale(0.5) rotate(20deg);
        }
        #icon-open:not(.hidden), #icon-close:not(.hidden) {
            opacity: 1;
            transform: scale(1) rotate(0deg);
        }

        /* Ripple effect on orb click */
        #rafv-orb-container::after {
            content: '';
            position: absolute;
            width: 78px; height: 78px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transform: scale(0);
            opacity: 0;
            pointer-events: none;
        }
        #rafv-orb-container.rippling::after {
            animation: orbRipple 0.5s ease-out forwards;
        }
        @keyframes orbRipple {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.6); opacity: 0; }
        }

        /* --- LIQUID GLOW ANIMATION --- */
        @keyframes liquidGlow {
            0% {
                box-shadow: 
                    0 12px 30px rgba(0, 51, 153, 0.35), 
                    inset 0 3px 2px rgba(255,255,255,0.25);
            }
            50% {
                box-shadow: 
                    0 15px 55px rgba(44, 110, 250, 0.6), 
                    inset 0 3px 2px rgba(255,255,255,0.25);
            }
            100% {
                box-shadow: 
                    0 12px 30px rgba(0, 51, 153, 0.35), 
                    inset 0 3px 2px rgba(255,255,255,0.25);
            }
        }

        /* --- MOBILE --- */
        @media (max-width: 480px) {
            #rafv-widget { 
                bottom: 0; right: 0; left: 0; top: 0; 
                align-items: flex-end; 
                justify-content: flex-end;
                pointer-events: none; 
                z-index: 99999999; 
            }
            #rafv-orb-container { pointer-events: auto; margin-right: 20px; margin-bottom: 20px; }
            #rafv-window {
                position: fixed; bottom: 0; left: 0; right: 0; 
                width: 100% !important; height: 100dvh !important; 
                border-radius: 0; margin-bottom: 0; 
                transform: translateY(60px) scale(0.98);
                pointer-events: auto;
            }
            #rafv-window.active { transform: translateY(0) scale(1); }
            #rafv-widget.mobile-open #rafv-orb-container { display: none; }
            .rafv-input-container { padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
            .rafv-header { padding-top: calc(15px + env(safe-area-inset-top)); }
        }

        .typing { display: flex; gap: 4px; padding: 10px; }
        .dot { width: 6px; height: 6px; background: #999; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
        .dot:nth-child(1) { animation-delay: -0.32s; } .dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>

      <div id="rafv-widget" className={isOpen ? 'mobile-open' : ''}>
        <div id="rafv-window" className={`${isOpen ? 'active' : ''} ${isClosing ? 'closing' : ''}`}>
          {/* Header */}
          <div className="rafv-header">
            <div className="rafv-header-left">
              <img 
                src="https://growthzonecmsprodeastus.azureedge.net/sites/202/2025/12/Browser-Icon-RAFV-01.jpg" 
                className="rafv-logo" 
                alt="RAFV" 
              />
              <div className="rafv-header-text">
                <h3 className="rafv-title">RAFV Assistant</h3>
                <p className="rafv-subtitle">Member Support AI</p>
              </div>
            </div>
            
            <div className="rafv-header-actions">
              <button id="rafv-reset-btn" className="rafv-icon-btn" title="Start New Chat" onClick={handleReset}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
              <button className="rafv-icon-btn" title="Close Chat" onClick={toggleChat}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Messages */}
          <div id="rafv-messages">
             {messages.map((msg) => {
               if (msg.role === 'assistant' && msg.content.trim() === '') {
                 return null;
               }
               const isUser = msg.role === 'user';
               return (
                 <div key={msg.id} className={`message ${isUser ? 'user' : 'bot'}`}>
                   {formatMessageContent(msg.content, isUser)}
                 </div>
              );
            })}
            
            {isLoading && (messages[messages.length - 1]?.content ?? '').trim() === '' && (
              <div className="message bot" id="typing">
                <div className="typing">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="rafv-input-container">
            {turnstileSitekey && (
              <div 
                ref={turnstileContainerRef} 
                style={{ display: 'none' }} 
              />
            )}
            <form onSubmit={handleSubmit} style={{ margin: 0 }}>
              <div className={`rafv-input-wrapper ${focused ? 'focused' : ''}`}>
                <input 
                  type="text" 
                  id="rafv-input" 
                  placeholder="Type your question..." 
                  value={input}
                  onChange={handleInputChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
                <button 
                  type="submit" 
                  id="rafv-send" 
                  className={input.trim().length > 0 ? 'active' : ''}
                  disabled={isLoading || !input.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* THE LAUNCH BUTTON */}
        <div id="rafv-orb-container" className={rippling ? 'rippling' : ''} onClick={toggleChat}>
          <svg id="icon-open" className={isOpen ? 'hidden' : ''} viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <svg id="icon-close" className={!isOpen ? 'hidden' : ''} viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </div>
      </div>
    </>
  );
}
