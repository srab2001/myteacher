-- ============================================
-- LOOKER CUSTOM QUERIES FOR MYTEACHER
-- Progress Report Compliance Tracking
-- ============================================

-- ============================================
-- QUERY 1: Goals Missing Weekly Progress Reports
-- Use this as a Custom Query data source in Looker
-- ============================================

SELECT
  s.id AS student_id,
  s."firstName" AS student_first_name,
  s."lastName" AS student_last_name,
  s."firstName" || ' ' || s."lastName" AS student_full_name,
  s.grade AS student_grade,
  s."schoolId" AS school_id,
  sc.name AS school_name,
  d.id AS district_id,
  d."districtName" AS district_name,
  d."stateCode" AS state_code,

  -- Plan Information
  pi.id AS plan_instance_id,
  pi."planType" AS plan_type,
  pi.status AS plan_status,
  pi."startDate" AS plan_start_date,
  pi."endDate" AS plan_end_date,

  -- Goal Information
  g.id AS goal_id,
  g."goalCode" AS goal_code,
  g.area AS goal_area,
  g."annualGoalText" AS goal_text,
  g."draftStatus" AS goal_draft_status,

  -- Teacher Information
  t.id AS teacher_id,
  t."displayName" AS teacher_name,
  t.email AS teacher_email,

  -- Progress Metrics
  COUNT(gp.id) AS total_progress_entries,
  MAX(gp.date) AS last_progress_date,
  MIN(gp.date) AS first_progress_date,

  -- Compliance Calculations
  CASE
    WHEN MAX(gp.date) IS NULL THEN NULL
    ELSE CURRENT_DATE - MAX(gp.date)::date
  END AS days_since_last_progress,

  CASE
    WHEN MAX(gp.date) IS NULL THEN 'NEVER_RECORDED'
    WHEN MAX(gp.date) < CURRENT_DATE - INTERVAL '7 days' THEN 'OVERDUE'
    WHEN MAX(gp.date) < CURRENT_DATE - INTERVAL '5 days' THEN 'DUE_SOON'
    ELSE 'COMPLIANT'
  END AS compliance_status,

  -- Date context
  CURRENT_DATE AS report_date,
  DATE_TRUNC('week', CURRENT_DATE) AS current_week_start

FROM "Student" s
JOIN "PlanInstance" pi ON pi."studentId" = s.id
JOIN "Goal" g ON g."planInstanceId" = pi.id
LEFT JOIN "GoalProgress" gp ON gp."goalId" = g.id
LEFT JOIN "School" sc ON sc.id = s."schoolId"
LEFT JOIN "District" d ON d.id = sc."districtId"
LEFT JOIN "AppUser" t ON t.id = s."teacherId"

WHERE
  pi.status = 'ACTIVE'
  AND g."draftStatus" = 'FINAL'

GROUP BY
  s.id, s."firstName", s."lastName", s.grade, s."schoolId",
  sc.name, d.id, d."districtName", d."stateCode",
  pi.id, pi."planType", pi.status, pi."startDate", pi."endDate",
  g.id, g."goalCode", g.area, g."annualGoalText", g."draftStatus",
  t.id, t."displayName", t.email

ORDER BY
  days_since_last_progress DESC NULLS FIRST,
  student_full_name,
  goal_code;


-- ============================================
-- QUERY 2: Weekly Progress Compliance Summary by Teacher
-- Aggregated view for teacher-level reporting
-- ============================================

SELECT
  t.id AS teacher_id,
  t."displayName" AS teacher_name,
  t.email AS teacher_email,
  sc.name AS school_name,
  d."districtName" AS district_name,

  -- Student counts
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT CASE WHEN pi.status = 'ACTIVE' THEN s.id END) AS students_with_active_plans,

  -- Goal counts
  COUNT(DISTINCT g.id) AS total_active_goals,

  -- Compliance counts
  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress IS NULL THEN g.id
  END) AS goals_never_recorded,

  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress < CURRENT_DATE - INTERVAL '7 days' THEN g.id
  END) AS goals_overdue,

  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress >= CURRENT_DATE - INTERVAL '7 days' THEN g.id
  END) AS goals_compliant,

  -- Compliance percentage
  ROUND(
    100.0 * COUNT(DISTINCT CASE
      WHEN gp_recent.last_progress >= CURRENT_DATE - INTERVAL '7 days' THEN g.id
    END) / NULLIF(COUNT(DISTINCT g.id), 0),
    1
  ) AS compliance_percentage,

  CURRENT_DATE AS report_date

FROM "AppUser" t
JOIN "Student" s ON s."teacherId" = t.id
JOIN "PlanInstance" pi ON pi."studentId" = s.id AND pi.status = 'ACTIVE'
JOIN "Goal" g ON g."planInstanceId" = pi.id AND g."draftStatus" = 'FINAL'
LEFT JOIN "School" sc ON sc.id = s."schoolId"
LEFT JOIN "District" d ON d.id = sc."districtId"
LEFT JOIN (
  SELECT
    "goalId",
    MAX(date) AS last_progress
  FROM "GoalProgress"
  GROUP BY "goalId"
) gp_recent ON gp_recent."goalId" = g.id

WHERE t.role IN ('TEACHER', 'CASE_MANAGER')

GROUP BY
  t.id, t."displayName", t.email,
  sc.name, d."districtName"

ORDER BY
  compliance_percentage ASC NULLS FIRST,
  teacher_name;


-- ============================================
-- QUERY 3: Weekly Progress Compliance Summary by School
-- Aggregated view for school-level reporting
-- ============================================

SELECT
  sc.id AS school_id,
  sc.name AS school_name,
  d."districtName" AS district_name,
  d."stateCode" AS state_code,

  -- Counts
  COUNT(DISTINCT t.id) AS total_teachers,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT g.id) AS total_active_goals,

  -- Compliance counts
  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress IS NULL THEN g.id
  END) AS goals_never_recorded,

  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress < CURRENT_DATE - INTERVAL '7 days' THEN g.id
  END) AS goals_overdue,

  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress >= CURRENT_DATE - INTERVAL '7 days' THEN g.id
  END) AS goals_compliant,

  -- Compliance percentage
  ROUND(
    100.0 * COUNT(DISTINCT CASE
      WHEN gp_recent.last_progress >= CURRENT_DATE - INTERVAL '7 days' THEN g.id
    END) / NULLIF(COUNT(DISTINCT g.id), 0),
    1
  ) AS compliance_percentage,

  CURRENT_DATE AS report_date

FROM "School" sc
JOIN "District" d ON d.id = sc."districtId"
JOIN "Student" s ON s."schoolId" = sc.id
JOIN "PlanInstance" pi ON pi."studentId" = s.id AND pi.status = 'ACTIVE'
JOIN "Goal" g ON g."planInstanceId" = pi.id AND g."draftStatus" = 'FINAL'
LEFT JOIN "AppUser" t ON t.id = s."teacherId"
LEFT JOIN (
  SELECT
    "goalId",
    MAX(date) AS last_progress
  FROM "GoalProgress"
  GROUP BY "goalId"
) gp_recent ON gp_recent."goalId" = g.id

GROUP BY
  sc.id, sc.name, d."districtName", d."stateCode"

ORDER BY
  compliance_percentage ASC NULLS FIRST,
  school_name;


-- ============================================
-- QUERY 4: Progress Entry Trend (Last 30 Days)
-- For time-series charts
-- ============================================

SELECT
  DATE(gp.date) AS progress_date,
  sc.name AS school_name,
  COUNT(*) AS entries_count,
  COUNT(DISTINCT gp."goalId") AS unique_goals,
  COUNT(DISTINCT g."planInstanceId") AS unique_plans,
  COUNT(DISTINCT pi."studentId") AS unique_students

FROM "GoalProgress" gp
JOIN "Goal" g ON g.id = gp."goalId"
JOIN "PlanInstance" pi ON pi.id = g."planInstanceId"
JOIN "Student" s ON s.id = pi."studentId"
LEFT JOIN "School" sc ON sc.id = s."schoolId"

WHERE gp.date >= CURRENT_DATE - INTERVAL '30 days'

GROUP BY
  DATE(gp.date),
  sc.name

ORDER BY
  progress_date DESC,
  school_name;


-- ============================================
-- QUERY 5: Students Requiring Immediate Attention
-- High-priority list for administrators
-- ============================================

SELECT
  s.id AS student_id,
  s."firstName" || ' ' || s."lastName" AS student_name,
  s.grade,
  sc.name AS school_name,
  t."displayName" AS teacher_name,
  t.email AS teacher_email,
  pi."planType" AS plan_type,

  -- Count of overdue goals
  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress IS NULL
      OR gp_recent.last_progress < CURRENT_DATE - INTERVAL '7 days'
    THEN g.id
  END) AS overdue_goals_count,

  -- Total goals
  COUNT(DISTINCT g.id) AS total_goals,

  -- Oldest progress date
  MIN(gp_recent.last_progress) AS oldest_progress_date,

  -- Days since any progress
  CASE
    WHEN MIN(gp_recent.last_progress) IS NULL THEN 999
    ELSE CURRENT_DATE - MIN(gp_recent.last_progress)::date
  END AS max_days_without_progress,

  -- Priority score (higher = more urgent)
  CASE
    WHEN MIN(gp_recent.last_progress) IS NULL THEN 100
    ELSE CURRENT_DATE - MIN(gp_recent.last_progress)::date
  END + COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress IS NULL
      OR gp_recent.last_progress < CURRENT_DATE - INTERVAL '7 days'
    THEN g.id
  END) * 5 AS priority_score

FROM "Student" s
JOIN "PlanInstance" pi ON pi."studentId" = s.id AND pi.status = 'ACTIVE'
JOIN "Goal" g ON g."planInstanceId" = pi.id AND g."draftStatus" = 'FINAL'
LEFT JOIN "School" sc ON sc.id = s."schoolId"
LEFT JOIN "AppUser" t ON t.id = s."teacherId"
LEFT JOIN (
  SELECT
    "goalId",
    MAX(date) AS last_progress
  FROM "GoalProgress"
  GROUP BY "goalId"
) gp_recent ON gp_recent."goalId" = g.id

GROUP BY
  s.id, s."firstName", s."lastName", s.grade,
  sc.name, t."displayName", t.email, pi."planType"

HAVING
  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress IS NULL
      OR gp_recent.last_progress < CURRENT_DATE - INTERVAL '7 days'
    THEN g.id
  END) > 0

ORDER BY
  priority_score DESC,
  student_name

LIMIT 50;


-- ============================================
-- QUERY 6: Goal Area Compliance Breakdown
-- Compliance by goal area (Reading, Math, etc.)
-- ============================================

SELECT
  g.area AS goal_area,
  sc.name AS school_name,

  COUNT(DISTINCT g.id) AS total_goals,

  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress >= CURRENT_DATE - INTERVAL '7 days' THEN g.id
  END) AS compliant_goals,

  COUNT(DISTINCT CASE
    WHEN gp_recent.last_progress < CURRENT_DATE - INTERVAL '7 days'
      OR gp_recent.last_progress IS NULL THEN g.id
  END) AS non_compliant_goals,

  ROUND(
    100.0 * COUNT(DISTINCT CASE
      WHEN gp_recent.last_progress >= CURRENT_DATE - INTERVAL '7 days' THEN g.id
    END) / NULLIF(COUNT(DISTINCT g.id), 0),
    1
  ) AS compliance_percentage,

  -- Average days between progress entries
  ROUND(AVG(
    CASE
      WHEN gp_recent.last_progress IS NOT NULL
      THEN CURRENT_DATE - gp_recent.last_progress::date
    END
  ), 1) AS avg_days_since_progress

FROM "Goal" g
JOIN "PlanInstance" pi ON pi.id = g."planInstanceId" AND pi.status = 'ACTIVE'
JOIN "Student" s ON s.id = pi."studentId"
LEFT JOIN "School" sc ON sc.id = s."schoolId"
LEFT JOIN (
  SELECT
    "goalId",
    MAX(date) AS last_progress
  FROM "GoalProgress"
  GROUP BY "goalId"
) gp_recent ON gp_recent."goalId" = g.id

WHERE g."draftStatus" = 'FINAL'

GROUP BY
  g.area,
  sc.name

ORDER BY
  compliance_percentage ASC NULLS FIRST,
  goal_area;
