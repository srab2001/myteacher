'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatInterface } from '@/components/qa';
import styles from './QAPage.module.css';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

export default function QAPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | undefined>();
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleNewConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    fetchConversations(); // Refresh the list
  };

  const startNewConversation = () => {
    setSelectedConversation(undefined);
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${showSidebar ? '' : styles.sidebarHidden}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>
          <button
            onClick={startNewConversation}
            className={styles.newConversationBtn}
          >
            + New Conversation
          </button>
        </div>

        <div className={styles.conversationsList}>
          {conversations.length === 0 ? (
            <p className={styles.noConversations}>No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`${styles.conversationItem} ${
                  selectedConversation === conv.id ? styles.conversationItemActive : ''
                }`}
              >
                <div className={styles.conversationTitle}>
                  {conv.title || 'Untitled'}
                </div>
                <div className={styles.conversationMeta}>
                  {new Date(conv.created_at).toLocaleDateString()} ·{' '}
                  {conv.message_count} messages
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Toggle Sidebar Button (mobile) */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className={styles.sidebarToggle}
      >
        {showSidebar ? '←' : '→'}
      </button>

      {/* Main Chat Area */}
      <div className={styles.mainContent}>
        <ChatInterface
          key={selectedConversation || 'new'}
          conversationId={selectedConversation}
          onNewConversation={handleNewConversation}
        />
      </div>
    </div>
  );
}
