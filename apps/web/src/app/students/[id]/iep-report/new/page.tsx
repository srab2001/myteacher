'use client';

/**
 * IEP Independent Assessment Review Wizard
 *
 * Multi-step wizard for creating a Review of Independent Assessment report
 * Based on Howard County Public School System form (November 2014)
 *
 * This form is used when an Independent Educational Evaluation (IEE) is reviewed
 * by the IEP team to determine its impact on eligibility and IEP content.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, AssessmentType, CreateIEPReportData } from '@/lib/api';
import styles from './page.module.css';

// Assessment type options matching the Howard County form
const ASSESSMENT_TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: 'AUDIOLOGICAL', label: 'Audiological' },
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'OCCUPATIONAL_THERAPY', label: 'Occupational Therapy' },
  { value: 'PHYSICAL_THERAPY', label: 'Physical Therapy' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological' },
  { value: 'SPEECH_LANGUAGE', label: 'Speech-Language' },
  { value: 'OTHER', label: 'Other' },
];

// Wizard steps
const STEPS = [
  { key: 'header', title: 'Student & Assessment Information' },
  { key: 'part1', title: 'Part I: Review by Qualified Personnel' },
  { key: 'part2', title: 'Part II: Review by IEP/504 Team' },
  { key: 'part3', title: 'Part III: Conclusions' },
  { key: 'part4', title: 'Part IV: IEP Teams Only' },
];

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  grade: string;
  schoolName: string;
}

export default function IEPReportWizardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const studentId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateIEPReportData>({
    assessmentType: 'EDUCATIONAL',
  });

  // Load student info
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user && studentId) {
      loadStudent();
    }
  }, [user, authLoading, studentId]);

  const loadStudent = async () => {
    try {
      const { student: loadedStudent } = await api.getStudent(studentId);
      setStudent({
        id: loadedStudent.id,
        firstName: loadedStudent.firstName,
        lastName: loadedStudent.lastName,
        dateOfBirth: loadedStudent.dateOfBirth?.split('T')[0] || '',
        grade: loadedStudent.grade || '',
        schoolName: loadedStudent.schoolName || '',
      });

      // Prefill form data
      setFormData(prev => ({
        ...prev,
        school: loadedStudent.schoolName || '',
        grade: loadedStudent.grade || '',
        dateOfBirth: loadedStudent.dateOfBirth?.split('T')[0] || '',
      }));
    } catch (err) {
      console.error('Failed to load student:', err);
      setError('Failed to load student information');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CreateIEPReportData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.createIEPReport(studentId, formData);
      router.push(`/students/${studentId}?tab=reports`);
    } catch (err) {
      console.error('Failed to save report:', err);
      setError('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Student not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/students/${studentId}`)}>
          ← Back to Student
        </button>
        <h1>Review of Independent Assessment</h1>
        <p className={styles.subtitle}>
          {student.firstName} {student.lastName}
        </p>
      </header>

      {/* Step Indicator */}
      <nav className={styles.stepIndicator}>
        {STEPS.map((step, index) => (
          <button
            key={step.key}
            className={`${styles.step} ${index === currentStep ? styles.active : ''} ${index < currentStep ? styles.completed : ''}`}
            onClick={() => setCurrentStep(index)}
          >
            <span className={styles.stepNumber}>{index + 1}</span>
            <span className={styles.stepTitle}>{step.title}</span>
          </button>
        ))}
      </nav>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Form Content */}
      <main className={styles.main}>
        <div className={styles.formSection}>
          <h2>{STEPS[currentStep].title}</h2>

          {/* Step 0: Header Information */}
          {currentStep === 0 && (
            <div className={styles.fields}>
              <div className={styles.readOnlySection}>
                <h3>Student Information (Pre-filled)</h3>
                <div className={styles.readOnlyFields}>
                  <div className={styles.field}>
                    <label>Student Name</label>
                    <p>{student.firstName} {student.lastName}</p>
                  </div>
                  <div className={styles.field}>
                    <label>Date of Birth</label>
                    <p>{student.dateOfBirth || 'Not specified'}</p>
                  </div>
                  <div className={styles.field}>
                    <label>Grade</label>
                    <p>{student.grade || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="school">School</label>
                <input
                  type="text"
                  id="school"
                  className="form-input"
                  value={formData.school || ''}
                  onChange={(e) => updateField('school', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="assessmentType">Type of Assessment *</label>
                <select
                  id="assessmentType"
                  className="form-select"
                  value={formData.assessmentType}
                  onChange={(e) => updateField('assessmentType', e.target.value as AssessmentType)}
                  required
                >
                  {ASSESSMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {formData.assessmentType === 'OTHER' && (
                <div className={styles.field}>
                  <label htmlFor="assessmentTypeOther">Specify Other Assessment Type</label>
                  <input
                    type="text"
                    id="assessmentTypeOther"
                    className="form-input"
                    value={formData.assessmentTypeOther || ''}
                    onChange={(e) => updateField('assessmentTypeOther', e.target.value)}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="dateOfReport">Date of Independent Assessment Report</label>
                <input
                  type="date"
                  id="dateOfReport"
                  className="form-input"
                  value={formData.dateOfReport || ''}
                  onChange={(e) => updateField('dateOfReport', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="dateOfTeamReview">Date of Team Review</label>
                <input
                  type="date"
                  id="dateOfTeamReview"
                  className="form-input"
                  value={formData.dateOfTeamReview || ''}
                  onChange={(e) => updateField('dateOfTeamReview', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 1: Part I - Review by Qualified Personnel */}
          {currentStep === 1 && (
            <div className={styles.fields}>
              <p className={styles.sectionDescription}>
                This section is to be completed by qualified school personnel who review the independent assessment.
              </p>

              <div className={styles.fieldGroup}>
                <h3>School Reviewer Information</h3>
                <div className={styles.field}>
                  <label htmlFor="schoolReviewerName">Name of School Reviewer</label>
                  <input
                    type="text"
                    id="schoolReviewerName"
                    className="form-input"
                    value={formData.schoolReviewerName || ''}
                    onChange={(e) => updateField('schoolReviewerName', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="schoolReviewerTitle">Title/Position</label>
                  <input
                    type="text"
                    id="schoolReviewerTitle"
                    className="form-input"
                    value={formData.schoolReviewerTitle || ''}
                    onChange={(e) => updateField('schoolReviewerTitle', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="schoolReviewerCredentials">Credentials</label>
                  <input
                    type="text"
                    id="schoolReviewerCredentials"
                    className="form-input"
                    value={formData.schoolReviewerCredentials || ''}
                    onChange={(e) => updateField('schoolReviewerCredentials', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <h3>Examiner Information</h3>
                <div className={styles.field}>
                  <label htmlFor="examinerName">Name of Examiner</label>
                  <input
                    type="text"
                    id="examinerName"
                    className="form-input"
                    value={formData.examinerName || ''}
                    onChange={(e) => updateField('examinerName', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="examinerTitle">Title</label>
                  <input
                    type="text"
                    id="examinerTitle"
                    className="form-input"
                    value={formData.examinerTitle || ''}
                    onChange={(e) => updateField('examinerTitle', e.target.value)}
                  />
                </div>

                <div className={styles.radioGroup}>
                  <label>Is the examiner appropriately licensed?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="examinerLicensed"
                        checked={formData.examinerLicensed === true}
                        onChange={() => updateField('examinerLicensed', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="examinerLicensed"
                        checked={formData.examinerLicensed === false}
                        onChange={() => updateField('examinerLicensed', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <label>Is the examiner professionally qualified to administer the assessment?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="examinerQualified"
                        checked={formData.examinerQualified === true}
                        onChange={() => updateField('examinerQualified', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="examinerQualified"
                        checked={formData.examinerQualified === false}
                        onChange={() => updateField('examinerQualified', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <label>Is the report written, dated, and signed?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="reportWrittenDatedSigned"
                        checked={formData.reportWrittenDatedSigned === true}
                        onChange={() => updateField('reportWrittenDatedSigned', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="reportWrittenDatedSigned"
                        checked={formData.reportWrittenDatedSigned === false}
                        onChange={() => updateField('reportWrittenDatedSigned', false)}
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <h3>Assessment Materials Review</h3>

                <div className={styles.radioGroup}>
                  <label>Are the assessment materials technically sound?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="materialsTechnicallySound"
                        checked={formData.materialsTechnicallySound === true}
                        onChange={() => updateField('materialsTechnicallySound', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="materialsTechnicallySound"
                        checked={formData.materialsTechnicallySound === false}
                        onChange={() => updateField('materialsTechnicallySound', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <label>Were the materials administered in accordance with the instructions provided by the producer?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="materialsFollowedInstructions"
                        checked={formData.materialsFollowedInstructions === true}
                        onChange={() => updateField('materialsFollowedInstructions', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="materialsFollowedInstructions"
                        checked={formData.materialsFollowedInstructions === false}
                        onChange={() => updateField('materialsFollowedInstructions', false)}
                      />
                      No
                    </label>
                  </div>
                  {formData.materialsFollowedInstructions === false && (
                    <textarea
                      className="form-textarea"
                      placeholder="If no, describe..."
                      value={formData.materialsInstructionsNotes || ''}
                      onChange={(e) => updateField('materialsInstructionsNotes', e.target.value)}
                    />
                  )}
                </div>

                <div className={styles.radioGroup}>
                  <label>Were the materials provided and administered in the language and form most likely to yield accurate information?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="materialsLanguageAccurate"
                        checked={formData.materialsLanguageAccurate === true}
                        onChange={() => updateField('materialsLanguageAccurate', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="materialsLanguageAccurate"
                        checked={formData.materialsLanguageAccurate === false}
                        onChange={() => updateField('materialsLanguageAccurate', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <label>Are the materials racially and culturally free of bias?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="materialsBiasFree"
                        checked={formData.materialsBiasFree === true}
                        onChange={() => updateField('materialsBiasFree', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="materialsBiasFree"
                        checked={formData.materialsBiasFree === false}
                        onChange={() => updateField('materialsBiasFree', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <label>Are the assessment materials valid for the purpose for which they were used?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="materialsValidPurpose"
                        checked={formData.materialsValidPurpose === true}
                        onChange={() => updateField('materialsValidPurpose', true)}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="materialsValidPurpose"
                        checked={formData.materialsValidPurpose === false}
                        onChange={() => updateField('materialsValidPurpose', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className={styles.radioGroup}>
                  <label>Do the results accurately reflect the student's aptitude or achievement level or whatever other factors the test purports to measure?</label>
                  <div className={styles.radioOptions}>
                    <label>
                      <input
                        type="radio"
                        name="resultsReflectAptitude"
                        checked={formData.resultsReflectAptitude === true && !formData.resultsReflectAptitudeNA}
                        onChange={() => {
                          updateField('resultsReflectAptitude', true);
                          updateField('resultsReflectAptitudeNA', false);
                        }}
                      />
                      Yes
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="resultsReflectAptitude"
                        checked={formData.resultsReflectAptitude === false && !formData.resultsReflectAptitudeNA}
                        onChange={() => {
                          updateField('resultsReflectAptitude', false);
                          updateField('resultsReflectAptitudeNA', false);
                        }}
                      />
                      No
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="resultsReflectAptitude"
                        checked={formData.resultsReflectAptitudeNA === true}
                        onChange={() => {
                          updateField('resultsReflectAptitudeNA', true);
                          updateField('resultsReflectAptitude', undefined);
                        }}
                      />
                      N/A
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Part II - Review by IEP/504 Team */}
          {currentStep === 2 && (
            <div className={styles.fields}>
              <p className={styles.sectionDescription}>
                This section is to be completed by the IEP or 504 Team when reviewing the independent assessment report.
              </p>

              <div className={styles.radioGroup}>
                <label>Does the report describe the child's performance in each area of suspected disability?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="describesPerformanceAllAreas"
                      checked={formData.describesPerformanceAllAreas === true}
                      onChange={() => updateField('describesPerformanceAllAreas', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="describesPerformanceAllAreas"
                      checked={formData.describesPerformanceAllAreas === false}
                      onChange={() => updateField('describesPerformanceAllAreas', false)}
                    />
                    No
                  </label>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Notes..."
                  value={formData.performanceAreasNotes || ''}
                  onChange={(e) => updateField('performanceAreasNotes', e.target.value)}
                />
              </div>

              <div className={styles.radioGroup}>
                <label>Does the report include the use of a variety of assessment tools and strategies to gather relevant functional, cognitive, developmental, behavioral, and physical information?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="includesVariedAssessmentData"
                      checked={formData.includesVariedAssessmentData === true}
                      onChange={() => updateField('includesVariedAssessmentData', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="includesVariedAssessmentData"
                      checked={formData.includesVariedAssessmentData === false}
                      onChange={() => updateField('includesVariedAssessmentData', false)}
                    />
                    No
                  </label>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Notes..."
                  value={formData.assessmentDataNotes || ''}
                  onChange={(e) => updateField('assessmentDataNotes', e.target.value)}
                />
              </div>

              <div className={styles.radioGroup}>
                <label>Does the report include instructional implications for participation in the general education curriculum or, for a preschool child, participation in appropriate activities?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="includesInstructionalImplications"
                      checked={formData.includesInstructionalImplications === true}
                      onChange={() => updateField('includesInstructionalImplications', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="includesInstructionalImplications"
                      checked={formData.includesInstructionalImplications === false}
                      onChange={() => updateField('includesInstructionalImplications', false)}
                    />
                    No
                  </label>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Notes..."
                  value={formData.instructionalNotes || ''}
                  onChange={(e) => updateField('instructionalNotes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Part III - Conclusions */}
          {currentStep === 3 && (
            <div className={styles.fields}>
              <p className={styles.sectionDescription}>
                Document the team's conclusions about the independent assessment.
              </p>

              <div className={styles.radioGroup}>
                <label>Are the findings consistent with the assessment data?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="findingsMatchData"
                      checked={formData.findingsMatchData === true}
                      onChange={() => updateField('findingsMatchData', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="findingsMatchData"
                      checked={formData.findingsMatchData === false}
                      onChange={() => updateField('findingsMatchData', false)}
                    />
                    No
                  </label>
                </div>
                {formData.findingsMatchData === false && (
                  <textarea
                    className="form-textarea"
                    placeholder="If no, explain..."
                    value={formData.findingsMatchDataNote || ''}
                    onChange={(e) => updateField('findingsMatchDataNote', e.target.value)}
                  />
                )}
              </div>

              <div className={styles.radioGroup}>
                <label>Is the assessment data consistent with existing school data?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="dataMatchExistingSchoolData"
                      checked={formData.dataMatchExistingSchoolData === true}
                      onChange={() => updateField('dataMatchExistingSchoolData', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="dataMatchExistingSchoolData"
                      checked={formData.dataMatchExistingSchoolData === false}
                      onChange={() => updateField('dataMatchExistingSchoolData', false)}
                    />
                    No
                  </label>
                </div>
                {formData.dataMatchExistingSchoolData === false && (
                  <textarea
                    className="form-textarea"
                    placeholder="If no, explain..."
                    value={formData.dataMatchExistingNote || ''}
                    onChange={(e) => updateField('dataMatchExistingNote', e.target.value)}
                  />
                )}
              </div>

              <div className={styles.radioGroup}>
                <label>Are the recommendations supported by the data?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="recommendationsSupported"
                      checked={formData.recommendationsSupported === true}
                      onChange={() => updateField('recommendationsSupported', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="recommendationsSupported"
                      checked={formData.recommendationsSupported === false}
                      onChange={() => updateField('recommendationsSupported', false)}
                    />
                    No
                  </label>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="recommendationsToConsider">Which recommendations will the team consider?</label>
                <textarea
                  id="recommendationsToConsider"
                  className="form-textarea"
                  rows={4}
                  placeholder="List recommendations the team will consider..."
                  value={formData.recommendationsToConsider || ''}
                  onChange={(e) => updateField('recommendationsToConsider', e.target.value)}
                />
              </div>

              <div className={styles.radioGroup}>
                <label>Is additional school assessment waived based on the independent assessment?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="schoolAssessmentWaived"
                      checked={formData.schoolAssessmentWaived === true}
                      onChange={() => updateField('schoolAssessmentWaived', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="schoolAssessmentWaived"
                      checked={formData.schoolAssessmentWaived === false}
                      onChange={() => updateField('schoolAssessmentWaived', false)}
                    />
                    No
                  </label>
                </div>
                {formData.schoolAssessmentWaived === false && (
                  <textarea
                    className="form-textarea"
                    placeholder="If no, what additional assessments are recommended?"
                    value={formData.schoolAssessmentWaivedNote || ''}
                    onChange={(e) => updateField('schoolAssessmentWaivedNote', e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 4: Part IV - IEP Teams Only */}
          {currentStep === 4 && (
            <div className={styles.fields}>
              <p className={styles.sectionDescription}>
                This section is to be completed by IEP teams only. If this is a 504 review, you may skip this section.
              </p>

              <div className={styles.radioGroup}>
                <label>Does the report include relevant information from a variety of assessment tools and strategies that assists in determining the content of the IEP and the child's involvement in and progress in the general curriculum, or for a preschool child, participation in appropriate activities?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="includesDataForIEPContent"
                      checked={formData.includesDataForIEPContent === true}
                      onChange={() => updateField('includesDataForIEPContent', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="includesDataForIEPContent"
                      checked={formData.includesDataForIEPContent === false}
                      onChange={() => updateField('includesDataForIEPContent', false)}
                    />
                    No
                  </label>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Notes..."
                  value={formData.iepContentNotes || ''}
                  onChange={(e) => updateField('iepContentNotes', e.target.value)}
                />
              </div>

              <div className={styles.radioGroup}>
                <label>Is the identified educational disability consistent with COMAR regulations?</label>
                <div className={styles.radioOptions}>
                  <label>
                    <input
                      type="radio"
                      name="disabilityConsistentWithCOMAR"
                      checked={formData.disabilityConsistentWithCOMAR === true}
                      onChange={() => updateField('disabilityConsistentWithCOMAR', true)}
                    />
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="disabilityConsistentWithCOMAR"
                      checked={formData.disabilityConsistentWithCOMAR === false}
                      onChange={() => updateField('disabilityConsistentWithCOMAR', false)}
                    />
                    No
                  </label>
                </div>
                <textarea
                  className="form-textarea"
                  placeholder="Notes..."
                  value={formData.comarDisabilityNotes || ''}
                  onChange={(e) => updateField('comarDisabilityNotes', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="additionalNotes">Additional Notes</label>
                <textarea
                  id="additionalNotes"
                  className="form-textarea"
                  rows={4}
                  placeholder="Any additional notes or comments..."
                  value={formData.additionalNotes || ''}
                  onChange={(e) => updateField('additionalNotes', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation */}
      <footer className={styles.footer}>
        <button
          className="btn btn-outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          ← Back
        </button>

        <span className={styles.stepCount}>
          Step {currentStep + 1} of {STEPS.length}
        </span>

        {currentStep < STEPS.length - 1 ? (
          <button className="btn btn-primary" onClick={handleNext}>
            Next →
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        )}
      </footer>
    </div>
  );
}
