'use client';

import { useState, useRef, useEffect } from 'react';
import { CitationCard } from './CitationCard';
import styles from './QA.module.css';

interface Citation {
  id: number;
  title: string;
  source_type: string;
  url?: string;
  excerpt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
  onNewConversation?: (conversationId: string) => void;
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
  onNewConversation,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [expandedCitation, setExpandedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          conversation_id: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id);
        onNewConversation?.(data.conversation_id);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your question. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'How many days does Maryland give to complete an initial evaluation?',
    'What are the required components of an IEP in Maryland?',
    'What is the timeline for annual IEP reviews?',
    'What transition services are required at age 14?',
  ];

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.welcomeState}>
            <h2>Maryland Special Education Q&A</h2>
            <p>
              Ask questions about Maryland special education law, IEP requirements,
              timelines, and more. All answers include citations from official sources.
            </p>
            <div className={styles.sampleQuestions}>
              <p className={styles.sampleLabel}>Try asking:</p>
              {sampleQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className={styles.sampleQuestion}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div className={styles.messageContent}>
                {message.content}
              </div>

              {message.citations && message.citations.length > 0 && (
                <div className={styles.citationsSection}>
                  <h4 className={styles.citationsTitle}>Sources:</h4>
                  <div className={styles.citationsList}>
                    {message.citations.map((citation) => (
                      <CitationCard
                        key={citation.id}
                        citation={citation}
                        isExpanded={expandedCitation?.id === citation.id}
                        onToggle={() =>
                          setExpandedCitation(
                            expandedCitation?.id === citation.id ? null : citation
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className={`${styles.message} ${styles.assistantMessage}`}>
            <div className={styles.loadingIndicator}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about Maryland special education law..."
          className={styles.input}
          disabled={isLoading}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
