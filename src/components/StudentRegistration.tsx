
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, User, RefreshCw, Upload, Search, CheckCircle, AlertCircle, FileText, Info, Check, X, HeartPulse, Mail, MapPin, Shield, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import {
  getPendingApplications,
  updateApplicationStatus,
  createPendingApplication,
  createPublicPendingApplication,
  registerUser,
  toggleRegistration
} from '../services/schoolAdminService';
import api from '../services/api';
import { API_HOST_URL } from '../config/api';
import { EthiopianDatePicker } from './EthiopianDatePicker';
import { ethiopianToGregorianIso, gregorianToEthiopian, formatEthiopianDateOnly } from '../utils/ethiopianCalendar';
import { ziqualaBranches } from '../data/ziqualaContent';

type RegistrationTab = 'new' | 'existing';
type PipelineFilter = 'pending' | 'exam-pending' | 'awaiting-enrollment' | 'completed';
type AppStatus = 'pending' | 'declined' | 'approved' | 'awaiting-payment' | 'payment-confirmed' | 'exam-pending';

interface PendingApp {
  id: string;
  name: string;
  dob: string;
  gender: string;
  digitalId: string;
  parentName: string;
  phone: string;
  parentPhone: string;
  email: string;
  address: string;
  previousSchool: string;
  lastGrade: string;
  date: string;
  status: AppStatus;
  bloodGroup: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  notes: string;
  transcriptFileName: string;
  transcriptFileSize: number | null;

  removalReason?: string | null;
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  placeOfBirth?: string;
  cardAge?: string;
  kebele?: string;
  ketena?: string;
  houseNo?: string;
  dateRegistered?: string;
  religion?: string;
}

const displayValue = (value?: string | null) => {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : '—';
};

const mapApiApplicationToPendingApp = (app: any): PendingApp => ({
  id: app.id,
  name: app.name || app.applicant_name || app.student_name || app.full_name || 'Unknown',
  dob: app.dob ? new Date(app.dob).toISOString().split('T')[0] : '',
  gender: app.gender || '',
  digitalId: app.digital_id || '',
  parentName: app.parent_name || app.father_name || 'N/A',
  phone: app.parent_phone || app.applicant_phone || app.father_phone || 'N/A',
  parentPhone: app.parent_phone || app.applicant_phone || app.father_phone || 'N/A',
  email: app.email || app.applicant_email || '',
  address: app.address || '',
  previousSchool: app.previous_school || '',
  lastGrade: app.grade || app.grade_applying || 'N/A',
  date: app.created_at ? formatEthiopianDateOnly(new Date(app.created_at)) : '',
  status: app.status as AppStatus,
  bloodGroup: app.blood_group || '',
  allergies: app.allergies || '',
  chronicConditions: app.chronic_conditions || '',
  medications: app.medications || app.current_medications || '',
  notes: app.notes || '',
  transcriptFileName: app.transcript_file_name || '',
  transcriptFileSize: app.transcript_file_size != null ? Number(app.transcript_file_size) : null,
  removalReason: app.return_reason || app.removal_reason || null,
  fatherName: app.father_name || app.parent_name || '',
  fatherOccupation: app.father_occupation || '',
  fatherPhone: app.father_phone || app.parent_phone || app.applicant_phone || '',
  motherName: app.mother_name || '',
  motherOccupation: app.mother_occupation || '',
  motherPhone: app.mother_phone || '',
  placeOfBirth: app.place_of_birth || '',
  cardAge: app.card_age || '',
  kebele: app.kebele || '',
  ketena: app.ketena || '',
  houseNo: app.house_no || '',
  dateRegistered: app.date_registered || '',
  religion: app.religion || '',
});

interface StudentRegistrationProps {
  isAdminView?: boolean;
  onCreated?: () => void;
}

// Validation helper functions
interface ValidationErrors {
  [key: string]: string;
}

function formatPhoneNumber(phone: string | null | undefined): string {
  // Guard against null/undefined
  const raw = (phone || '').toString();
  if (!raw) return '';

  // Remove all non-digit characters except leading +
  const digitsOnly = raw.replace(/[^\d]/g, '');

  // Handle different formats
  if (digitsOnly.startsWith('251')) {
    return '+' + digitsOnly; // +2519xxxxxxxx or 2519xxxxxxxx
  } else if (digitsOnly.startsWith('09') || digitsOnly.startsWith('07')) {
    return '+251' + digitsOnly.substring(1); // 09xxxxxxxx -> +2519xxxxxxxx
  } else if (digitsOnly.startsWith('9') || digitsOnly.startsWith('7')) {
    return '+251' + digitsOnly; // 9xxxxxxxx -> +2519xxxxxxxx
  }

  // Default: assume it needs +251 prefix
  return '+251' + digitsOnly;
}

function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function validatePhoneNumber(phone: string | null | undefined): { isValid: boolean; error?: string } {
  const raw = (phone || '').toString();
  const cleaned = raw.replace(/[^\d]/g, '');

  if (!raw || !cleaned) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Allow 9 digits after country code (+251) => full digits length 12 (251 + 9)
  // Accept cleaned lengths between 9 (local without leading 0) and 12 (with country code)
  if (cleaned.length < 9 || cleaned.length > 12) {
    return { isValid: false, error: 'Phone number must be 9-12 digits' };
  }

  // Check that the significant local part starts with 9 or 7
  const localPart = cleaned.length > 9 ? cleaned.slice(-9) : cleaned.slice(-9);
  if (!localPart.startsWith('9') && !localPart.startsWith('7')) {
    return { isValid: false, error: 'Phone must start with 9 or 7' };
  }

  return { isValid: true };
}

function validateRegistrationStep(step: number, formData: any): ValidationErrors {
  const errors: ValidationErrors = {};

  if (step === 1) {
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Full Name is required';
    }
    if (formData.digital_id && formData.digital_id.trim()) {
      if (!/^\d{16}$/.test(formData.digital_id.trim())) {
        errors.digital_id = 'Fayda Alias Number must be exactly 16 digits';
      }
    }
    if (!formData.dob) {
      errors.dob = 'Date of Birth is required';
    }
    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }
  } else if (step === 2) {
    const fatherNameVal = formData.fatherName || formData.parentName;
    if (!fatherNameVal || !fatherNameVal.trim()) {
      errors.fatherName = "Father's Full Name is required";

    }
    const fatherPhoneVal = formData.fatherPhone || formData.phone;
    if (!fatherPhoneVal || !fatherPhoneVal.trim()) {
      errors.fatherPhone = "Father's Phone is required";

    } else {
      const phoneValidation = validatePhoneNumber(fatherPhoneVal);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error || 'Invalid phone number';
      }
    }
    if (!formData.address || !formData.address.trim()) {
      errors.address = 'Address is required';
    }
  } else if (step === 3) {
    if (!formData.grade || !formData.grade.trim()) {
      errors.grade = 'Last Grade Completed is required';
    }
    if (!formData.branchName || !formData.branchName.trim()) {
      errors.branchName = 'Branch is required';
    }
  }

  return errors;
}

const initialPendingApplications: PendingApp[] = [];

export const StudentRegistration = ({ isAdminView = true, onCreated }: StudentRegistrationProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role, user, selectedBranch, branches, registrationOpen, setRegistrationOpen } = useUser();
  const isAcademicAdmin = role === 'super-admin' || role === 'academic-manager' || role === 'school-admin';
  const formRef = useRef<HTMLFormElement>(null);
  // Track if showing the active application error (NOT permanently blocking all submissions)
  const [activeApplicationError, setActiveApplicationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<RegistrationTab>('new');
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>('pending');
  const [registrationStep, setRegistrationStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ethiopianDob, setEthiopianDob] = useState('');
  const [pendingApps, setPendingApps] = useState<PendingApp[]>(initialPendingApplications);
  const [viewingTranscript, setViewingTranscript] = useState<any>(null);
  const [transcriptUrl, setTranscriptUrl] = useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState<boolean>(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2024/2025');
  const [selectedSemester, setSelectedSemester] = useState('Semester 2');
  const [emailToast, setEmailToast] = useState<string | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAppForGrade, setSelectedAppForGrade] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [branchesList, setBranchesList] = useState<{ id: string; name: string }[]>(() =>
    ziqualaBranches.map(({ id, name }) => ({ id, name })),
  );
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [expandedAppIds, setExpandedAppIds] = useState<Record<string, boolean>>({});

  // Sync branches from context when available
  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchesList(branches.map(b => ({ id: b.id, name: b.name })));
    }
  }, [branches]);

  // Toggle registration open/closed — persists to backend
  const handleToggleRegistration = async (newValue: boolean) => {
    try {
      await toggleRegistration(newValue);
      setRegistrationOpen(newValue);
      setSuccessMessage(`Registration is now ${newValue ? 'open' : 'closed'}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to toggle registration:', err);
      setSubmitError(err.response?.data?.message || 'Failed to update registration status.');
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  // Automatically select branch for logged in School Admin / Super Admin
  useEffect(() => {
    if (user) {
      const adminBranchName = (user as any).branchName || selectedBranch?.name;
      const adminBranchId = (user as any).branchId || selectedBranch?.id;

      if (adminBranchName && adminBranchName !== 'My Branch') {
        setSelectedBranchName(adminBranchName);
      } else if (adminBranchId) {
        const found = (branchesList.length > 0 ? branchesList : (branches || [])).find(b => b.id === adminBranchId);
        if (found) {
          setSelectedBranchName(found.name);
        } else if (branchesList.length > 0) {
          setSelectedBranchName(branchesList[0].name);
        }
      } else if (branchesList.length > 0) {
        setSelectedBranchName(branchesList[0].name);
      }
    }
  }, [user, selectedBranch, branches, branchesList]);

  useEffect(() => {
    if (isAdminView) {
      const fetchApps = async () => {
        try {
          const res = await getPendingApplications();
          const applications = Array.isArray(res) ? res : (res || []);
          if (Array.isArray(applications)) {
            const mapped = applications.map(mapApiApplicationToPendingApp);
            setPendingApps(mapped);
          } else {
            console.warn('Unexpected pending applications response:', res);
          }
        } catch (err) {
          console.error('Failed to fetch pending applications:', err);
        }
      };
      fetchApps();
    }
  }, [isAdminView]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchTranscript = async () => {
      if (!viewingTranscript) return;
      setTranscriptLoading(true);
      setTranscriptError(null);
      setTranscriptUrl(null);
      try {
        const response = await api.get(`/school-admin/applications/${viewingTranscript.id}/transcript`, {
          responseType: 'blob'
        });
        const blob = response.data;
        objectUrl = URL.createObjectURL(blob);
        setTranscriptUrl(objectUrl);
      } catch (err: any) {
        console.error('Transcript fetch error', err);
        const status = err.response?.status;
        const serverMessage = err.response?.data?.message || err.response?.data?.error || err.message;
        setTranscriptError(status ? `Failed to load transcript (${status})` : serverMessage || 'Failed to load transcript');
      } finally {
        setTranscriptLoading(false);
      }
    };
    fetchTranscript();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setTranscriptUrl(null);
      setTranscriptLoading(false);
      setTranscriptError(null);
    };
  }, [viewingTranscript]);

  const transcriptHistory = {
    '2024/2025': {
      'Semester 1': [
        { s: 'Mathematics', g: 'B+' },
        { s: 'Physics', g: 'B' },
        { s: 'English', g: 'A-' },
        { s: 'Chemistry', g: 'B+' },
      ],
      'Semester 2': [
        { s: 'Mathematics', g: 'A' },
        { s: 'Physics', g: 'A-' },
        { s: 'English', g: 'B+' },
        { s: 'Chemistry', g: 'A' },
        { s: 'Biology', g: 'A-' },
        { s: 'History', g: 'B+' },
        { s: 'Civics', g: 'A' },
      ]
    },
    '2023/2024': {
      'Semester 1': [
        { s: 'Mathematics', g: 'B' },
        { s: 'English', g: 'B+' },
        { s: 'Biology', g: 'A-' },
      ],
      'Semester 2': [
        { s: 'Mathematics', g: 'B+' },
        { s: 'English', g: 'A-' },
        { s: 'Biology', g: 'A' },
      ]
    }
  } as const;

  const nextStep = () => {
    const form = document.querySelector('form');
    if (!form) return;

    const formData = new FormData(form);
    const currentStepData = {
      name: formData.get('name'),
      placeOfBirth: formData.get('placeOfBirth'),
      cardAge: formData.get('cardAge'),
      religion: formData.get('religion'),
      fatherName: formData.get('fatherName'),
      fatherOccupation: formData.get('fatherOccupation'),
      fatherPhone: formData.get('fatherPhone'),
      motherName: formData.get('motherName'),
      motherOccupation: formData.get('motherOccupation'),
      motherPhone: formData.get('motherPhone'),
      kebele: formData.get('kebele'),
      ketena: formData.get('ketena'),
      houseNo: formData.get('houseNo'),
      dateRegistered: formData.get('dateRegistered'),
      parentName: formData.get('fatherName') || formData.get('parentName'),
      phone: formData.get('fatherPhone') || formData.get('phone'),
      dob: formData.get('dob'),
      gender: formData.get('gender'),


      address: formData.get('address'),
      previousSchool: formData.get('previousSchool'),
      grade: formData.get('grade'),
      branchName: formData.get('branchName')
    };

    const errors = validateRegistrationStep(registrationStep, currentStepData);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setRegistrationStep(prev => Math.min(3, prev + 1));
  };

  const prevStep = () => {
    setValidationErrors({});
    setRegistrationStep(prev => Math.max(1, prev - 1));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFileError('The file must be less than 2 MB');
        setFileName(null);
      } else {
        setFileError(null);
        setFileName(file.name);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (registrationStep < 3) {
      nextStep();
      return;
    }

    if (isSubmitting) return; // Guard against double-submission

    setValidationErrors({});
    setActiveApplicationError(null);

    if (!registrationOpen) {
      setSubmitError('Registration is closed. New applications cannot be submitted at this time.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;
      const placeOfBirth = formData.get('placeOfBirth') as string;
      const cardAge = formData.get('cardAge') as string;
      const religion = formData.get('religion') as string;
      const fatherName = formData.get('fatherName') as string;
      const fatherOccupation = formData.get('fatherOccupation') as string;
      const fatherPhone = formData.get('fatherPhone') as string;
      const motherName = formData.get('motherName') as string;
      const motherOccupation = formData.get('motherOccupation') as string;
      const motherPhone = formData.get('motherPhone') as string;
      const kebele = formData.get('kebele') as string;
      const ketena = formData.get('ketena') as string;
      const houseNo = formData.get('houseNo') as string;
      const dateRegistered = formData.get('dateRegistered') as string;
      const parentName = fatherName || (formData.get('parentName') as string);
      const phone = fatherPhone || (formData.get('phone') as string);
      const dob = formData.get('dob') as string;
      const gender = formData.get('gender') as string;


      const address = formData.get('address') as string;
      const digitalId = (formData.get('digital_id') as string) || (formData.get('digitalId') as string);
      const email = formData.get('email') as string;
      const previousSchool = formData.get('previousSchool') as string;
      const grade = formData.get('grade') as string;
      const bloodGroup = formData.get('bloodGroup') as string;
      const allergies = formData.get('allergies') as string;
      const chronicConditions = formData.get('chronicConditions') as string;
      const medications = formData.get('medications') as string;
      const branchName = formData.get('branchName') as string;

      // Validate all required fields for final submission
      const allFormData = {
        name,
        placeOfBirth,
        cardAge,
        religion,
        fatherName,
        fatherOccupation,
        fatherPhone,
        motherName,
        motherOccupation,
        motherPhone,
        kebele,
        ketena,
        houseNo,
        dateRegistered,
        dob,
        gender,
        parentName,
        phone,
        address,
        previousSchool,
        grade,
        branchName
      };

      const errors = {
        ...validateRegistrationStep(1, allFormData),
        ...validateRegistrationStep(2, allFormData),
        ...validateRegistrationStep(3, allFormData)
      };

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Format phone number
      const formattedPhone = formatPhoneNumber(phone);

      if (fileError) {
        setFileError('Please fix the file upload issue before submitting.');
        return;
      }

      // Create FormData for file upload (only append non-empty values)
      const submitData = new FormData();
      submitData.append('name', toTitleCase(name) || '');
      if (digitalId?.trim()) submitData.append('digitalId', digitalId.trim());
      if (email?.trim()) submitData.append('email', email.trim());
      const formattedFatherPhone = formatPhoneNumber(fatherPhone || phone);
      submitData.append('fatherName', toTitleCase(fatherName || parentName) || '');
      submitData.append('fatherPhone', formattedFatherPhone);
      if (fatherOccupation?.trim()) submitData.append('fatherOccupation', toTitleCase(fatherOccupation.trim()));
      if (motherName?.trim()) submitData.append('motherName', toTitleCase(motherName.trim()));
      if (motherOccupation?.trim()) submitData.append('motherOccupation', toTitleCase(motherOccupation.trim()));
      if (motherPhone?.trim()) submitData.append('motherPhone', formatPhoneNumber(motherPhone));
      if (placeOfBirth?.trim()) submitData.append('placeOfBirth', toTitleCase(placeOfBirth.trim()));
      if (cardAge?.trim()) submitData.append('cardAge', cardAge.trim());
      if (kebele?.trim()) submitData.append('kebele', kebele.trim());
      if (ketena?.trim()) submitData.append('ketena', ketena.trim());
      if (houseNo?.trim()) submitData.append('houseNo', houseNo.trim());
      if (dateRegistered?.trim()) submitData.append('dateRegistered', dateRegistered.trim());
      if (religion?.trim()) submitData.append('religion', toTitleCase(religion.trim()));
      submitData.append('dob', dob || '');
      submitData.append('gender', gender || '');
      submitData.append('parentName', toTitleCase(parentName) || '');
      submitData.append('parentPhone', formattedPhone);
      submitData.append('address', toTitleCase(address) || '');
      // Append previousSchool only when provided
      if (previousSchool?.trim()) submitData.append('previousSchool', previousSchool.trim());
      submitData.append('grade', grade || '');
      if (bloodGroup?.trim()) submitData.append('bloodGroup', bloodGroup.trim());
      if (allergies?.trim()) submitData.append('allergies', allergies.trim());
      if (chronicConditions?.trim()) submitData.append('chronicConditions', chronicConditions.trim());
      if (medications?.trim()) submitData.append('medications', medications.trim());
      submitData.append('branchName', branchName || '');

      // Add file if uploaded
      const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
      const fileList = fileInput?.files;
      // Transcript is required
      if (!fileList || !fileList[0]) {
        setFileError('Transcript is required');
        setRegistrationStep(3);
        return;
      }
      if (fileList?.[0]) {
        const file = fileList[0];
        // Validate file on client side again before sending
        if (file.size > 2 * 1024 * 1024) {
          setFileError('The file must be less than 2 MB');
          return;
        }
        submitData.append('transcript', file);
      }

      // Call API to create pending application
      const response = await (isAdminView ? createPendingApplication(submitData as any) : createPublicPendingApplication(submitData as any));

      if (response?.errors) {
        setValidationErrors(response.errors);
        setFileError(response.message || 'Validation failed');
        setTimeout(() => setSubmitError(null), 5000);
        return;
      }

      setSuccessMessage(isAdminView ? 'Student registered successfully!' : 'Your application has been submitted successfully! We will contact you soon.');
      setValidationErrors({});

      if (isAdminView) {
        const res = await getPendingApplications();
        const applications = Array.isArray(res) ? res : (res || []);
        if (Array.isArray(applications)) {
          const mapped = applications.map(mapApiApplicationToPendingApp);
          setPendingApps(mapped);

          if (onCreated) {
            onCreated();
            return;
          }
        }
      }

      if (onCreated) {
        onCreated();
        return;
      }

      if (!isAdminView) {
        // Reset form for external applicants
        if (formRef.current) {
          formRef.current.reset();
        }
        setEthiopianDob('');
        setRegistrationStep(1);
        setValidationErrors({});
        setActiveApplicationError(null);
        setTimeout(() => {
          setSuccessMessage(null);
          navigate('/');
        }, 3000);
      } else {
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Failed to submit application';
      const errorObj = error.response?.data?.errors || {};
      const errorCode = error.response?.data?.error?.code;

      // Check if error is due to active application (not permanent block)
      if (errorMessage.includes('active application')) {
        setActiveApplicationError(errorMessage);
        setSubmitError(null);
        return;
      }

      setValidationErrors(errorObj);

      // Auto-jump to the step containing the error so the user can actually see it
      if (errorObj) {
        if (errorObj.name || errorObj.digital_id || errorObj.dob || errorObj.gender) {
          setRegistrationStep(1);
        } else if (errorObj.parentName || errorObj.parentPhone || errorObj.phone || errorObj.address) {
          setRegistrationStep(2);
        } else if (errorObj.previousSchool || errorObj.grade || errorObj.branchName) {
          setRegistrationStep(3);
        }
      }

      if (errorCode === 'FILE_SIZE_EXCEEDED' || errorCode === 'LIMIT_FILE_COUNT' || errorCode === 'UPLOAD_ERROR') {
        setFileError(errorMessage);
        setTimeout(() => setFileError(null), 5000);
      } else {
        setSubmitError(errorMessage);
        setTimeout(() => setSubmitError(null), 5000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromote = () => {
    setSuccessMessage(`${selectedStudent.name} has been promoted!`);
    setSelectedStudent(null);
    setSearchQuery('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showPhoneNotice = (phone: string, message: string) => {
    const contact = displayValue(phone) === '—' ? 'the parent phone on file' : phone;
    setEmailToast(`📱 Notify ${contact}: ${message}`);
    setTimeout(() => setEmailToast(null), 4000);
  };

  const handleDecline = async (appId: string) => {
    try {
      await updateApplicationStatus(appId, { status: 'declined' });
      const app = pendingApps.find(a => a.id === appId);
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' as AppStatus } : a));
      setSuccessMessage(`Application ${appId} has been declined.`);
      if (app) showPhoneNotice(app.phone, 'Application not accepted — contact family by phone');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.error?.message || err.message);
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const handlePassAfterExam = async (appId: string) => {
    try {
      await updateApplicationStatus(appId, { status: 'exam-pending' });
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'exam-pending' as AppStatus } : a));
      setSuccessMessage('Applicant moved to Pass After Exam queue.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.error?.message || err.message);
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const handleExamPass = (appId: string) => {
    const app = pendingApps.find(a => a.id === appId);
    setSelectedAppForGrade(appId);
    setSelectedGrade(app?.lastGrade || gradeOptions[0]);
    setShowGradeModal(true);
  };

  const gradeOptions = ['KG 1', 'KG 2', 'KG 3', ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];

  const handlePass = (appId: string) => {
    const app = pendingApps.find(a => a.id === appId);
    setSelectedAppForGrade(appId);
    setSelectedGrade(app?.lastGrade || gradeOptions[0]);
    setShowGradeModal(true);
  };

  const handleConfirmGradeAssignment = async () => {
    if (!selectedAppForGrade || !selectedGrade) {
      setSubmitError('Please select a grade');
      setTimeout(() => setSubmitError(null), 5000);
      return;
    }

    try {
      await updateApplicationStatus(selectedAppForGrade, {
        status: 'awaiting-payment',
        gradeApplying: selectedGrade
      });

      const app = pendingApps.find(a => a.id === selectedAppForGrade);
      setPendingApps(prev => prev.map(a => a.id === selectedAppForGrade ? { ...a, status: 'awaiting-payment' as AppStatus, lastGrade: selectedGrade } : a));
      setSuccessMessage(`${app?.name} is ready for final enrollment in Grade ${selectedGrade}.`);
      if (app) showPhoneNotice(app.phone, `Grade ${selectedGrade} assigned — final enrollment is ready`);

      setShowGradeModal(false);
      setSelectedAppForGrade(null);
      setSelectedGrade(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.error?.message || err.message);
      setTimeout(() => setSubmitError(null), 5000);
    }
  };



  const handlePaymentResult = async (appId: string, paid: boolean) => {
    try {
      const app = pendingApps.find(a => a.id === appId);
      if (paid) {
        if (app) {
          const validEmail = (app.email && app.email.includes('@'))
            ? app.email
            : `student.${app.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}@ziquala.edu.et`;

          // Proactively register user
          await registerUser({
            name: app.name,
            email: validEmail,
            role: 'student',
            grade: app.lastGrade,
          });
        }
        await updateApplicationStatus(appId, { status: 'payment-confirmed' });
        setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'payment-confirmed' as AppStatus } : a));
        setSuccessMessage(`${app?.name} enrolled successfully.`);
        if (app) showPhoneNotice(app.phone, 'Application approved — officially enrolled');
      } else {
        await updateApplicationStatus(appId, { status: 'declined' });
        setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' as AppStatus } : a));
        setSuccessMessage(`${app?.name} application closed.`);
        if (app) showPhoneNotice(app.phone, 'Application closed by school administration');
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.error?.message || err.message);
      setTimeout(() => setSubmitError(null), 5000);
    }
  };

  const filteredPipelineApps = pendingApps.filter(app => {
    if (pipelineFilter === 'pending') return app.status === 'pending';
    if (pipelineFilter === 'exam-pending') return app.status === 'exam-pending';
    if (pipelineFilter === 'awaiting-enrollment') return app.status === 'awaiting-payment';
    if (pipelineFilter === 'completed') return ['declined', 'registered', 'payment-confirmed'].includes(app.status);
    return false;
  });

  const pipelineCounts = {
    pending: pendingApps.filter(a => a.status === 'pending').length,
    'exam-pending': pendingApps.filter(a => a.status === 'exam-pending').length,
    'awaiting-enrollment': pendingApps.filter(a => a.status === 'awaiting-payment').length,
    completed: pendingApps.filter(a => ['declined', 'registered', 'payment-confirmed'].includes(a.status)).length,
  };

  return (
    <div className="space-y-6">
      {emailToast && (
        <div className="fixed top-6 right-6 z-[300] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 text-sm font-bold max-w-md">
          <Clock size={18} className="text-blue-400 flex-shrink-0" />
          <span>{emailToast}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-emerald-500/5">
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}
      {submitError && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-rose-500/5">
          <AlertCircle size={20} className="text-rose-500" />
          <span className="font-bold text-sm">{submitError}</span>
        </div>
      )}

      {isAdminView && (
        <div className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'new'
              ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-none'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            {t('registration.newAdmissions')}
          </button>
          {isAcademicAdmin && (
            <button
              onClick={() => setActiveTab('existing')}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'existing'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-none'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {t('registration.reEnrollment')}
            </button>
          )}
        </div>
      )}

      {activeTab === 'new' ? (
        isAdminView ? (
          <div className="space-y-5">
            {/* Registration Window Toggle */}
            {isAcademicAdmin && (
              <div
                onClick={() => handleToggleRegistration(!registrationOpen)}
                title={registrationOpen ? 'Click to close registration' : 'Click to open registration'}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none hover:opacity-90 active:scale-[0.99] ${registrationOpen ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/10'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${registrationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${registrationOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Registration {registrationOpen ? 'Open' : 'Closed'}
                    </p>
                    <p className={`text-[10px] font-medium ${registrationOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {registrationOpen ? 'New applications are being accepted.' : 'Public registration form is disabled.'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${registrationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${registrationOpen ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
            )}



            {/* Pipeline Filter Tabs */}
            <div className="flex flex-wrap gap-3">
              {([
                { key: 'pending' as PipelineFilter, label: 'Pending', color: 'blue' },
                { key: 'exam-pending' as PipelineFilter, label: 'Pass After Exam', color: 'amber' },
                { key: 'awaiting-enrollment' as PipelineFilter, label: 'Awaiting Enrollment', color: 'purple' },
                { key: 'completed' as PipelineFilter, label: 'Completed', color: 'slate' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPipelineFilter(tab.key)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${pipelineFilter === tab.key
                    ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-500/20`
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${pipelineFilter === tab.key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                    {pipelineCounts[tab.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Application Cards */}
            <div className="grid grid-cols-1 gap-6">
              {filteredPipelineApps.map(app => (
                <div key={app.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 space-y-6 group">
                  <div 
                    onClick={() => {
                      setExpandedAppIds(prev => ({
                        ...prev,
                        [app.id]: !prev[app.id]
                      }));
                    }}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                        <UserPlus size={32} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 hover:text-blue-600 transition-colors">
                          {app.name}
                          {expandedAppIds[app.id] ? (
                            <ChevronUp size={18} className="text-blue-600 animate-bounce" />
                          ) : (
                            <ChevronDown size={18} className="text-slate-400" />
                          )}
                        </h4>
                        {expandedAppIds[app.id] && (
                          <>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Grade {app.lastGrade} • {app.date} • {app.email}</p>
                            {app.removalReason && (
                              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-2">Returned to School Admin: {app.removalReason}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${app.status === 'pending' ? 'bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' :
                      app.status === 'exam-pending' ? 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' :
                      app.status === 'awaiting-payment' ? 'bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' :
                        app.status === 'declined' ? 'bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50' :
                          'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                      }`}>
                      {app.status === 'exam-pending' ? 'Pass After Exam' : app.status.replace(/-/g, ' ')}
                    </span>
                  </div>

                  {expandedAppIds[app.id] && (
                    <>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p><p className="font-bold dark:text-slate-200">{app.dob ? formatEthiopianDateOnly(app.dob) : '—'}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p><p className="font-bold dark:text-slate-200">{displayValue(app.gender)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Grade Applying</p><p className="font-bold dark:text-slate-200">Grade {displayValue(app.lastGrade)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Fayda ID</p><p className="font-bold dark:text-slate-200 font-mono text-[11px]">{displayValue(app.digitalId)}</p></div>
                        </div>

                        {/* Father & Mother Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Father's Information</p>
                            <p className="font-bold dark:text-slate-200">Name: {displayValue(app.fatherName)}</p>
                            <p className="text-slate-600 dark:text-slate-400">Occupation: {displayValue(app.fatherOccupation)}</p>
                            <p className="text-slate-600 dark:text-slate-400">Phone: {displayValue(app.fatherPhone)}</p>
                          </div>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                            <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Mother's Information</p>
                            <p className="font-bold dark:text-slate-200">Name: {displayValue(app.motherName)}</p>
                            <p className="text-slate-600 dark:text-slate-400">Occupation: {displayValue(app.motherOccupation)}</p>
                            <p className="text-slate-600 dark:text-slate-400">Phone: {displayValue(app.motherPhone)}</p>
                          </div>
                        </div>

                        {/* Residence & Personal Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Place of Birth</p><p className="font-bold dark:text-slate-200">{displayValue(app.placeOfBirth)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Card Age</p><p className="font-bold dark:text-slate-200">{displayValue(app.cardAge)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Religion</p><p className="font-bold dark:text-slate-200">{displayValue(app.religion)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Kebele / Ketena / House</p><p className="font-bold dark:text-slate-200">{[app.kebele, app.ketena, app.houseNo].filter(Boolean).join(' / ') || '—'}</p></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Parent / Guardian</p><p className="font-bold dark:text-slate-200">{displayValue(app.parentName)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</p><p className="font-bold dark:text-slate-200">{displayValue(app.phone)}</p></div>
                          <div className="md:col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Address</p><p className="font-bold dark:text-slate-200">{displayValue(app.address)}</p></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Previous School</p><p className="font-bold dark:text-slate-200">{displayValue(app.previousSchool)}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-bold dark:text-slate-200 break-all">{displayValue(app.email)}</p></div>
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Transcript</p>
                            {app.transcriptFileName ? (
                              <div className="flex items-center gap-2 mt-1">
                                <a
                                  href={`${API_HOST_URL || ''}/api/school-admin/applications/${app.id}/transcript`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:underline"
                                >
                                  <FileText size={14} />
                                  {app.transcriptFileName} {app.transcriptFileSize ? `(${(app.transcriptFileSize / 1024).toFixed(0)} KB)` : ''}
                                </a>
                              </div>
                            ) : (
                              <p className="font-bold dark:text-slate-200">—</p>
                            )}
                          </div>
                        </div>

                        {(app.bloodGroup || app.allergies || app.chronicConditions || app.medications) && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><HeartPulse size={12} /> Medical Information</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">Blood Group</span><p className="font-bold dark:text-slate-200">{displayValue(app.bloodGroup)}</p></div>
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">Allergies</span><p className="font-bold dark:text-slate-200">{displayValue(app.allergies)}</p></div>
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">Chronic Conditions</span><p className="font-bold dark:text-slate-200">{displayValue(app.chronicConditions)}</p></div>
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">Medications</span><p className="font-bold dark:text-slate-200">{displayValue(app.medications)}</p></div>
                            </div>
                          </div>
                        )}

                        {app.notes && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs">
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Notes</p>
                            <p className="text-blue-900 dark:text-blue-200 font-medium">{app.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons per Status */}
                      <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                        {(app.status === 'pending' || app.transcriptFileName) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              app.transcriptFileName && setViewingTranscript(app);
                            }}
                            disabled={!app.transcriptFileName}
                            className="px-5 py-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                          >
                            <FileText size={16} /> View Transcript
                          </button>
                        )}
                        {app.status === 'pending' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleDecline(app.id); }} className="px-5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><X size={16} /> Decline</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePassAfterExam(app.id); }} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"><Clock size={16} /> Pass After Exam</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePass(app.id); }} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"><Check size={16} /> Pass</button>
                          </>
                        )}
                        {app.status === 'exam-pending' && (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mr-2"><Clock size={14} /> Awaiting Entrance Exam</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDecline(app.id); }} className="px-5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><X size={16} /> Decline</button>
                            <button onClick={(e) => { e.stopPropagation(); handleExamPass(app.id); }} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20 active:scale-95"><Check size={16} /> Assign Grade</button>
                          </>
                        )}
                        {app.status === 'awaiting-payment' && (
                          <button onClick={(e) => { e.stopPropagation(); handlePaymentResult(app.id, true); }} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"><Check size={16} /> Complete Enrollment</button>
                        )}
                        {app.status === 'declined' && (
                          <span className="text-xs font-bold text-rose-500">Application closed</span>
                        )}
                        {app.status === 'payment-confirmed' && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle size={14} /> Officially enrolled</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {filteredPipelineApps.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center space-y-3">
                  <CheckCircle size={48} className="mx-auto text-slate-200" />
                  <p className="text-slate-500 font-medium">No applications in this category.</p>
                </div>
              )}
            </div>
          </div>
        ) : !registrationOpen ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Online applications are currently closed</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">Please contact the school administration or check back later for registration updates.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" />
                  Admission Form (New Student)
                </h3>
                <div className="flex items-center gap-1 md:gap-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all ${registrationStep === step ? 'bg-blue-600 text-white' :
                        registrationStep > step ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                        {registrationStep > step ? <Check size={14} className="w-3 h-3 md:w-4 md:h-4" /> : step}
                      </div>
                      {step < 3 && <div className={`w-4 md:w-8 h-0.5 ${registrationStep > step ? 'bg-emerald-200' : 'bg-slate-100'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <form ref={formRef} onSubmit={handleRegister} className="p-4 sm:p-6 space-y-6">
              {activeApplicationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50 p-4 flex gap-3">
                  <AlertTriangle className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">Active Application Exists</h4>
                    <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">{activeApplicationError}</p>
                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-2">Once your current application is completed, you will be able to submit a new one. If you need assistance, please contact school administration.</p>
                  </div>
                </div>
              )}
              <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 ${registrationStep !== 1 ? 'hidden' : ''}`}>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
                  1. Student Information / የተማሪዎች መረጃ
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Row 1: Full Name & Place of Birth */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Full Name <span className="text-rose-500">*</span> / የተማሪዎች ስም
                    </label>
                    <input
                      required
                      name="name"
                      type="text"
                      placeholder="Enter student full name"
                      onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.name
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    />
                    {validationErrors.name && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      {t('registration.placeOfBirth', 'Place of Birth')} / የትውልድ ቦታ
                    </label>
                    <input
                      name="placeOfBirth"
                      type="text"
                      placeholder="Place of Birth / የትውልድ ቦታ"
                      onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Current Address <span className="text-rose-500">*</span> / አሁን ያለበት አድራሻ
                    </label>
                    <input
                      required
                      name="address"
                      type="text"
                      placeholder="City, Sub-city, Woreda"
                      onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.address
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    />
                    {validationErrors.address && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.address}</p>}
                  </div>

                  {/* Row 2: Date of Birth & Card Age */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Date of Birth (Ethiopian Calendar) <span className="text-rose-500">*</span> / የትውልድ ቀን
                    </label>
                    <EthiopianDatePicker
                      value={ethiopianDob}
                      onChange={(val) => setEthiopianDob(val)}
                      placeholder="e.g. 2010-01-01"
                      className={validationErrors.dob ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500' : ''}
                    />
                    <input type="hidden" name="dob" value={ethiopianDob ? ethiopianToGregorianIso(ethiopianDob) : ''} />
                    {validationErrors.dob && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.dob}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Fayda ID / Digital ID / የፋይዳ ቁጥር <span className="text-slate-400 text-[10px] font-medium">(optional)</span>
                    </label>
                    <input
                      name="digital_id"
                      type="text"
                      maxLength={16}
                      placeholder="16-digit Fayda Number"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Email Address / ኢሜይል <span className="text-slate-400 text-[10px] font-medium">(optional)</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="applicant@example.com"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      {t('registration.cardAge', 'Card Age')} / የካርድ ዕድሜ
                    </label>
                    <input
                      name="cardAge"
                      type="text"
                      placeholder="Card Age / የካርድ ዕድሜ"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Row 3: Religion (Dropdown) & Gender (Dropdown) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      {t('registration.religion', 'Religion')} / ሐይማኖት
                    </label>
                    <select
                      name="religion"
                      title="Religion"
                      aria-label="Religion"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Religion / ሐይማኖት ይምረጡ</option>
                      <option value="Orthodox">Orthodox / ኦርቶዶክስ</option>
                      <option value="Muslim">Muslim / ሙስሊም</option>
                      <option value="Protestant">Protestant / ፕሮቴስታንት</option>
                      <option value="Catholic">Catholic / ካቶሊክ</option>
                      <option value="Other">Other / ሌላ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      Gender <span className="text-rose-500">*</span> / ጾታ
                    </label>
                    <select
                      name="gender"
                      title="Gender"
                      aria-label="Gender"
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.gender
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    >
                      <option value="">Select Gender / ጾታ ይምረጡ</option>
                      <option value="Male">Male / ወንድ</option>
                      <option value="Female">Female / ሴት</option>
                    </select>
                    {validationErrors.gender && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.gender}</p>}
                  </div>
                </div>
              </div>

              <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 ${registrationStep !== 2 ? 'hidden' : ''}`}>
                {/* Father's Information */}
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-4">
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} /> Father's Details / የአባት መረጃ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        Father's Full Name <span className="text-rose-500">*</span> / የአባት ሙሉ ስም
                      </label>
                      <input
                        required
                        name="fatherName"
                        type="text"
                        placeholder="Father's Full Name"
                        onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                        className={`w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.fatherName
                          ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                      />
                      {validationErrors.fatherName && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.fatherName}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Father's Occupation / የአባት ስራ
                      </label>
                      <input
                        name="fatherOccupation"
                        type="text"
                        placeholder="e.g. Teacher, Merchant, Engineer"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        Father's Phone / የአባት ስልክ
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center px-3 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 select-none whitespace-nowrap">
                          +251
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="9xxxxxxxx"
                          name="fatherPhone"
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
                          }}
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mother's Information */}
                <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-4">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} /> Mother's Details / የእናት መረጃ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        Mother's Full Name <span className="text-rose-500">*</span> / የእናት ሙሉ ስም
                      </label>
                      <input
                        required
                        name="motherName"
                        type="text"
                        placeholder="Mother's Full Name"
                        onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                        className={`w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.motherName
                          ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                      />
                      {validationErrors.motherName && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.motherName}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
                        Mother's Occupation / የእናት ስራ
                      </label>
                      <input
                        name="motherOccupation"
                        type="text"
                        placeholder="e.g. Accountant, Doctor, Housewife"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        Mother's Phone / የእናት ስልክ
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center px-3 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 select-none whitespace-nowrap">
                          +251
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="9xxxxxxxx"
                          name="motherPhone"
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
                          }}
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

















































              </div>

              <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 ${registrationStep !== 3 ? 'hidden' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Previous School <span className="text-slate-400 text-[10px] font-medium">(optional)</span></label>
                    <input name="previousSchool" type="text" placeholder="Name of previous school" className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.previousSchool
                      ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                      }`} />
                    {validationErrors.previousSchool && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.previousSchool}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Last Grade Completed <span className="text-rose-500">*</span></label>
                    <select
                      name="grade"
                      required
                      onChange={(e) => {
                        if (e.target.value.trim()) {
                          setValidationErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.grade;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.grade
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    >
                      <option value="">Select Last Grade Completed</option>
                      <option value="First Time">First Time / ትምህርት ያልጀመረ/ች</option>
                      <option value="KG 1">KG 1</option>
                      <option value="KG 2">KG 2</option>
                      <option value="KG 3">KG 3</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                    {validationErrors.grade && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.grade}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Last Transcript (Max 2MB)</label>
                  <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${fileError ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}>
                    <input
                      type="file"
                      name="transcript"
                      title="Upload student transcript"
                      aria-label="Upload student transcript"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className={`p-4 rounded-full ${fileError ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                      {fileName ? <FileText size={32} /> : <Upload size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {fileName || 'Click to upload transcript'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Accepted formats: PDF, PNG, JPG (Max 2MB)</p>
                    </div>
                  </div>
                  {fileError && (
                    <p className="text-sm text-rose-600 font-bold text-center flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl py-2 px-4">
                      <AlertTriangle size={14} /> {fileError}
                    </p>
                  )}
                </div>

                {/* Branch Selection Section */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Branch <span className="text-rose-500">*</span></label>
                  {(() => {
                    const displayBranches = [...branchesList];
                    if (selectedBranchName && !displayBranches.some(b => b.name === selectedBranchName)) {
                      displayBranches.unshift({ id: 'selected-branch-id', name: selectedBranchName });
                    }
                    if (user && (user.role === 'school-admin' || user.role === 'super-admin')) {
                      return (
                        <div className="relative">
                          <select
                            value={selectedBranchName}
                            onChange={(e) => setSelectedBranchName(e.target.value)}
                            disabled={user.role === 'school-admin'}
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-500 font-semibold cursor-not-allowed"
                          >
                            <option value="">Select Branch</option>
                            {displayBranches.map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                          </select>
                          <input type="hidden" name="branchName" value={selectedBranchName} />
                        </div>
                      );
                    }
                    return (
                      <select
                        name="branchName"
                        required
                        value={selectedBranchName}
                        onChange={(e) => {
                          setSelectedBranchName(e.target.value);
                          if (e.target.value) {
                            setValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.branchName;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.branchName
                          ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                      >
                        <option value="">Select Branch</option>
                        {displayBranches.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    );
                  })()}
                  {validationErrors.branchName && (
                    <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> {validationErrors.branchName}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={registrationStep === 1}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:hidden"
                >
                  Previous
                </button>
                {registrationStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !!activeApplicationError}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search existing student by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>

            {searchQuery && (
              <div className="mt-4 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {pendingApps.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                  pendingApps.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedStudent?.id === student.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-blue-600' : ''
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 font-bold">
                          {student.name[0]}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                          <p className="text-xs text-slate-500 uppercase font-medium">ID: {student.id} • Grade: {student.lastGrade}</p>
                        </div>
                      </div>
                      <CheckCircle size={20} className={selectedStudent?.id === student.id ? 'text-blue-600' : 'text-slate-200'} />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm italic">
                    No students found matching your search.
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw size={20} className="text-blue-600" />
                  Promotion
                </h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedStudent.id === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                  Fee Status: {selectedStudent.id === '1' ? 'Paid' : 'Pending'}
                </span>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Info size={16} />
                        <span className="text-xs font-bold uppercase">Current Record</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Current Grade</p>
                          <p className="text-sm font-bold dark:text-white">{selectedStudent.grade}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">Academic Status</p>
                          <p className="text-sm font-bold text-emerald-600">Cleared</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Promote To Grade</label>
                      <select title="Promote To Grade" aria-label="Promote To Grade" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Grade 9</option>
                        <option>Grade 10</option>
                        <option>Grade 11</option>
                        <option>Grade 12</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle size={20} />
                      <h4 className="font-bold text-sm uppercase">Verification Check</h4>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Before promoting <strong>{selectedStudent.name}</strong>, confirm that the student has completed the current academic requirements.
                    </p>
                    {selectedStudent.id !== '1' && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 text-xs font-bold text-rose-600 flex items-center gap-2">
                        <AlertCircle size={14} />
                        Outstanding Balance Found: 2,500 ETB
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromote}
                    disabled={selectedStudent.id !== '1'}
                    className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${selectedStudent.id === '1'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                  >
                    Confirm Promotion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {viewingTranscript && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[90vh]">
            {/* Floating Close Button */}
            <button
              onClick={() => setViewingTranscript(null)}
              className="absolute top-4 right-4 z-10 p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
              title="Close Transcript"
            >
              <X size={24} />
            </button>

            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 pr-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Transcript Verification</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Student: {viewingTranscript.name}</p>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto flex-1">
              <div className="lg:col-span-2 space-y-6 relative">
                {transcriptLoading ? (
                  <div className="w-full h-[420px] flex items-center justify-center">
                    <p className="text-sm text-slate-500">Loading transcript...</p>
                  </div>
                ) : transcriptError ? (
                  <div className="w-full h-[420px] flex items-center justify-center">
                    <p className="text-sm text-rose-500">{transcriptError}</p>
                  </div>
                ) : transcriptUrl ? (
                  <div className="w-full h-[720px] bg-slate-50 dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 overflow-hidden">
                    <iframe title={`transcript-${viewingTranscript?.id}`} src={transcriptUrl} className="w-full h-full" />
                  </div>
                ) : (
                  // Fallback mock viewer when no transcript available
                  <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                    <div className="text-center p-12">
                      <FileText size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mock Transcript Viewer</p>
                      <p className="text-[10px] text-slate-500 mt-2">Document ID: {viewingTranscript.id}_TRANSCRIPT_2025.pdf</p>
                    </div>
                    <div className="absolute inset-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col p-8 bg-white dark:bg-slate-950/50 backdrop-blur-sm shadow-inner">
                      <div className="flex justify-between mb-8 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                        <div className="font-black text-xs">OFFICIAL ACADEMIC RECORD</div>
                        <div className="font-bold text-[10px] text-slate-400">PAGE 1 OF 1</div>
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          {transcriptHistory[selectedAcademicYear as keyof typeof transcriptHistory][selectedSemester as keyof (typeof transcriptHistory)[keyof typeof transcriptHistory]].map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                              <span className="text-[10px] font-bold text-slate-600 uppercase">{item.s}</span>
                              <span className="text-xs font-black text-blue-600">{item.g}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                          <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">Cumulative GPA</p>
                          <p className="text-2xl font-black text-emerald-600">3.85 / 4.00</p>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-between items-end">
                        <div className="space-y-1">
                          <div className="w-24 h-0.5 bg-slate-300"></div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Principal's Signature</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verified Academic History</p>
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">ZIQUALA ABO SCHOOL</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Verification Checklist</h4>
                  <div className="space-y-3">
                    {[
                      'Document Authenticity Check',
                      'Grade Requirements Met',
                      'Behavioral Clearance Verified',
                      'Registration Fee Confirmed'
                    ].map((check, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                          <Check size={12} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{check}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-3xl">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-2">Academic Counselor Note:</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed italic">
                    "Student shows exceptional performance in STEM subjects. Recommended for Advanced Track in Grade {viewingTranscript.lastGrade}."
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => { handlePass(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Pass — Accept
                  </button>

                  <button
                    onClick={() => { handlePassAfterExam(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Clock size={18} />
                    Pass After Exam
                  </button>

                  <button
                    onClick={() => { handleDecline(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 py-4 rounded-2xl font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Grade Assignment Modal */}
      {showGradeModal && selectedAppForGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">Assign Grade</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                Select the grade in which this student will be enrolled.
              </p>
            </div>
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Grade</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {gradeOptions.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(grade)}
                    className={`py-3 sm:py-4 px-3 rounded-xl sm:rounded-2xl border-2 text-xs sm:text-sm font-black transition-all ${selectedGrade === grade
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 shadow-md shadow-blue-500/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                      }`}
                  >
                    {grade.startsWith('KG') ? grade : `Grade ${grade}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setShowGradeModal(false);
                  setSelectedAppForGrade(null);
                  setSelectedGrade(null);
                }}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGradeAssignment}
                disabled={!selectedGrade}
                className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                Continue Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
