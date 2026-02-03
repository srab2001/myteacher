'use client';

import styles from './Review.module.css';

interface ComponentFinding {
  found: boolean;
  location?: string;
  quality_score: number;
  issues: string[];
}

interface GoalAnalysis {
  goal_text: string;
  specific: boolean;
  measurable: boolean;
  achievable: boolean;
  relevant: boolean;
  time_bound: boolean;
  issues: string[];
}

interface QuestionItem {
  question: string;
  comar_reference: string;
  priority: string;
}

interface RequestItem {
  request: string;
  comar_reference: string;
  priority: string;
}

interface ReviewFindings {
  components: Record<string, ComponentFinding>;
  goals_analysis: GoalAnalysis[];
  overall_score: number;
  summary: string;
  critical_gaps: string[];
  questions_and_requests?: {
    questions: QuestionItem[];
    requests: RequestItem[];
  };
}

interface ReviewReportProps {
  findings: ReviewFindings;
  reviewType: string;
  fileName?: string;
}

const COMPONENT_NAMES: Record<string, string> = {
  present_levels: 'Present Levels (PLAAFP)',
  annual_goals: 'Measurable Annual Goals',
  special_ed_services: 'Special Education Services',
  supplementary_aids: 'Supplementary Aids and Services',
  lre: 'Least Restrictive Environment (LRE)',
  accommodations: 'Accommodations and Modifications',
  assessment_participation: 'Assessment Participation',
  transition: 'Transition Services',
  service_dates: 'Service Dates',
  progress_monitoring: 'Progress Monitoring',
};

export function ReviewReport({ findings, reviewType, fileName }: ReviewReportProps) {
  const components = findings.components || {};
  const goalsAnalysis = findings.goals_analysis || [];
  const questionsAndRequests = findings.questions_and_requests || { questions: [], requests: [] };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return styles.scoreGood;
    if (score >= 60) return styles.scoreWarning;
    return styles.scorePoor;
  };

  const getQualityColor = (score: number): string => {
    if (score >= 4) return styles.qualityGood;
    if (score >= 3) return styles.qualityWarning;
    return styles.qualityPoor;
  };

  const getPriorityColor = (priority: string): string => {
    if (priority === 'high') return styles.priorityHigh;
    if (priority === 'medium') return styles.priorityMedium;
    return styles.priorityLow;
  };

  return (
    <div className={styles.report}>
      {/* Header */}
      <div className={styles.reportHeader}>
        <div className={styles.reportTitle}>
          <h2>{reviewType === 'iep_review' ? 'IEP Review Report' : 'Evaluation Review Report'}</h2>
          {fileName && <span className={styles.fileName}>{fileName}</span>}
        </div>
        <div className={`${styles.overallScore} ${getScoreColor(findings.overall_score)}`}>
          <span className={styles.scoreNumber}>{findings.overall_score}</span>
          <span className={styles.scoreLabel}>Overall Score</span>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.section}>
        <h3>Summary</h3>
        <p className={styles.summaryText}>{findings.summary}</p>
      </div>

      {/* Critical Gaps */}
      {findings.critical_gaps.length > 0 && (
        <div className={`${styles.section} ${styles.criticalSection}`}>
          <h3>Critical Gaps</h3>
          <ul className={styles.criticalList}>
            {findings.critical_gaps.map((gap, i) => (
              <li key={i} className={styles.criticalItem}>
                <span className={styles.criticalIcon}>⚠️</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Component Analysis */}
      <div className={styles.section}>
        <h3>Required Components</h3>
        <div className={styles.componentGrid}>
          {Object.entries(components).map(([key, comp]) => (
            <div
              key={key}
              className={`${styles.componentCard} ${comp.found ? styles.componentFound : styles.componentMissing}`}
            >
              <div className={styles.componentHeader}>
                <span className={styles.componentStatus}>
                  {comp.found ? '✓' : '✗'}
                </span>
                <span className={styles.componentName}>
                  {COMPONENT_NAMES[key] || key}
                </span>
                <span className={`${styles.qualityBadge} ${getQualityColor(comp.quality_score)}`}>
                  {comp.quality_score}/5
                </span>
              </div>
              {comp.location && (
                <div className={styles.componentLocation}>
                  Location: {comp.location}
                </div>
              )}
              {comp.issues.length > 0 && (
                <ul className={styles.issuesList}>
                  {comp.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Goals Analysis */}
      {goalsAnalysis.length > 0 && (
        <div className={styles.section}>
          <h3>Goals Analysis (SMART Criteria)</h3>
          <div className={styles.goalsGrid}>
            {goalsAnalysis.map((goal, i) => (
              <div key={i} className={styles.goalCard}>
                <div className={styles.goalText}>
                  <strong>Goal {i + 1}:</strong> {goal.goal_text.slice(0, 150)}
                  {goal.goal_text.length > 150 && '...'}
                </div>
                <div className={styles.smartChecklist}>
                  <span className={goal.specific ? styles.smartMet : styles.smartNotMet}>
                    S: {goal.specific ? '✓' : '✗'}
                  </span>
                  <span className={goal.measurable ? styles.smartMet : styles.smartNotMet}>
                    M: {goal.measurable ? '✓' : '✗'}
                  </span>
                  <span className={goal.achievable ? styles.smartMet : styles.smartNotMet}>
                    A: {goal.achievable ? '✓' : '✗'}
                  </span>
                  <span className={goal.relevant ? styles.smartMet : styles.smartNotMet}>
                    R: {goal.relevant ? '✓' : '✗'}
                  </span>
                  <span className={goal.time_bound ? styles.smartMet : styles.smartNotMet}>
                    T: {goal.time_bound ? '✓' : '✗'}
                  </span>
                </div>
                {goal.issues.length > 0 && (
                  <ul className={styles.goalIssues}>
                    {goal.issues.map((issue, j) => (
                      <li key={j}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions for IEP Team */}
      {questionsAndRequests.questions.length > 0 && (
        <div className={styles.section}>
          <h3>Questions for IEP Team</h3>
          <ol className={styles.questionsList}>
            {questionsAndRequests.questions.map((q, i) => (
              <li key={i} className={styles.questionItem}>
                <div className={styles.questionContent}>
                  <span className={q.priority === 'high' ? styles.priorityHigh : ''}>{q.question}</span>
                  <span className={`${styles.comarRef} ${getPriorityColor(q.priority)}`}>
                    {q.comar_reference}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Recommended Changes */}
      {questionsAndRequests.requests.length > 0 && (
        <div className={styles.section}>
          <h3>Recommended Changes</h3>
          <ol className={styles.requestsList}>
            {questionsAndRequests.requests.map((r, i) => (
              <li key={i} className={styles.requestItem}>
                <div className={styles.requestContent}>
                  <span>{r.request}</span>
                  <span className={`${styles.comarRef} ${getPriorityColor(r.priority)}`}>
                    {r.comar_reference}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
