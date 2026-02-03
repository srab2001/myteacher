import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const tools = [
    {
      title: 'Timeline & Compliance Tracker',
      description: 'Track special education deadlines and events based on Maryland COMAR regulations. Automatically calculates evaluation, IEP meeting, annual review, and triennial deadlines.',
      href: '/cases',
      icon: '📅',
      features: ['Auto-calculated deadlines', 'Maryland timeline rules', 'Event tracking', 'Urgency alerts'],
    },
    {
      title: 'IEP/Evaluation Document Review',
      description: 'AI-powered review of IEP and evaluation documents. Checks for required COMAR components, analyzes goals for SMART criteria, and generates questions for IEP teams.',
      href: '/cases',
      icon: '📝',
      features: ['Component checklist', 'SMART goal analysis', 'Questions generator', 'COMAR citations'],
    },
    {
      title: 'Maryland Rules Q&A',
      description: 'Ask questions about Maryland special education law and get accurate answers with citations. Powered by a knowledge base of COMAR, MSDE bulletins, and more.',
      href: '/qa',
      icon: '💬',
      features: ['Cited answers', 'COMAR regulations', 'MSDE bulletins', 'County policies'],
    },
    {
      title: 'Meeting Preparation Builder',
      description: 'Prepare for IEP meetings with guided forms that generate agendas, parent concern letters, questions, and email templates.',
      href: '/meeting-prep',
      icon: '📋',
      features: ['Meeting agendas', 'Concern letters', 'Question lists', 'Email templates'],
    },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Maryland Special Education Advocate Tools</h1>
        <p className={styles.subtitle}>
          Empowering parents and advocates with tools to navigate Maryland's special education system
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.toolsGrid}>
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href} className={styles.toolCard}>
              <div className={styles.toolIcon}>{tool.icon}</div>
              <h2 className={styles.toolTitle}>{tool.title}</h2>
              <p className={styles.toolDescription}>{tool.description}</p>
              <ul className={styles.featuresList}>
                {tool.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <span className={styles.toolLink}>Get Started →</span>
            </Link>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          Built for Maryland families navigating the special education process.
          All timeline calculations based on Maryland COMAR regulations.
        </p>
      </footer>
    </div>
  );
}
