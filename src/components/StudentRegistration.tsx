import { uiError, uiText } from "../localization";

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, User, RefreshCw, Upload, Search, CheckCircle, AlertCircle, FileText, Info, Check, X, HeartPulse, Mail, MapPin, Shield, AlertTriangle, Clock, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useTranslation } from 'react-i18next';
import {
  getPendingApplications,
  updateApplicationStatus,
  createPendingApplication,
  createPublicPendingApplication,
  registerUser,
  linkParentStudent,
  toggleRegistration,
  completeEnrollment
} from '../services/schoolAdminService';
import api from '../services/api';
import { API_HOST_URL } from '../config/api';
import { EthiopianDatePicker } from './EthiopianDatePicker';
import { ethiopianToGregorianIso, gregorianToEthiopian, formatEthiopianDateOnly } from '../utils/ethiopianCalendar';
import { branchService } from '../services/branchService';
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
  const [credentialsModal, setCredentialsModal] = useState<{
    studentName: string;
    studentGrade: string;
    studentDigitalId: string;
    studentPin: string;
    parentName: string;
    parentDigitalId: string;
    parentPin: string;
    phone?: string;
  } | null>(null);

  // Approve Payment & Generate Credentials modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [appForApproval, setAppForApproval] = useState<PendingApp | null>(null);
  const [approvalForm, setApprovalForm] = useState({ parentDigitalId: '', reference: '' });
  const [approving, setApproving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  // Fetch live branches from API on mount
  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      try {
        const res = await branchService.getAllBranchesGuest();
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (isMounted && list.length > 0) {
          setBranchesList(list.map((b: any) => ({ id: b.id, name: b.name })));
        }
      } catch (err) {
        console.error('Failed to load branches in registration form:', err);
      }
    };
    loadBranches();
    return () => { isMounted = false; };
  }, []);

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
      setSuccessMessage(uiText("Registration is now {{value0}}.", { value0: uiText(newValue ? 'open' : 'closed') }));
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
      religion: formData.get('religion'),
      fatherName: formData.get('fatherName'),
      fatherOccupation: formData.get('fatherOccupation'),
      fatherPhone: formData.get('fatherPhone'),
      motherName: formData.get('motherName'),
      motherOccupation: formData.get('motherOccupation'),
      motherPhone: formData.get('motherPhone'),
      kebele: formData.get('kebele'),
      ketena: formData.get('ketena'),
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
      const religion = formData.get('religion') as string;
      const fatherName = formData.get('fatherName') as string;
      const fatherOccupation = formData.get('fatherOccupation') as string;
      const fatherPhone = formData.get('fatherPhone') as string;
      const motherName = formData.get('motherName') as string;
      const motherOccupation = formData.get('motherOccupation') as string;
      const motherPhone = formData.get('motherPhone') as string;
      const kebele = formData.get('kebele') as string;
      const ketena = formData.get('ketena') as string;
      const dateRegistered = formData.get('dateRegistered') as string;
      const parentName = fatherName || (formData.get('parentName') as string);
      const phone = fatherPhone || (formData.get('phone') as string);
      const dob = formData.get('dob') as string;
      const gender = formData.get('gender') as string;


      const address = formData.get('address') as string;
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
        religion,
        fatherName,
        fatherOccupation,
        fatherPhone,
        motherName,
        motherOccupation,
        motherPhone,
        kebele,
        ketena,
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
      const formattedFatherPhone = formatPhoneNumber(fatherPhone || phone);
      submitData.append('fatherName', toTitleCase(fatherName || parentName) || '');
      submitData.append('fatherPhone', formattedFatherPhone);
      if (fatherOccupation?.trim()) submitData.append('fatherOccupation', toTitleCase(fatherOccupation.trim()));
      if (motherName?.trim()) submitData.append('motherName', toTitleCase(motherName.trim()));
      if (motherOccupation?.trim()) submitData.append('motherOccupation', toTitleCase(motherOccupation.trim()));
      if (motherPhone?.trim()) submitData.append('motherPhone', formatPhoneNumber(motherPhone));
      if (placeOfBirth?.trim()) submitData.append('placeOfBirth', toTitleCase(placeOfBirth.trim()));
      if (kebele?.trim()) submitData.append('kebele', kebele.trim());
      if (ketena?.trim()) submitData.append('ketena', ketena.trim());
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

      setSuccessMessage(uiText(isAdminView ? 'Student registered successfully!' : 'Your application has been submitted successfully! We will contact you soon.'));
      setValidationErrors({});

      if (formRef.current) {
        formRef.current.reset();
      }
      setEthiopianDob('');
      setRegistrationStep(1);
      setValidationErrors({});
      setActiveApplicationError(null);

      if (isAdminView) {
        const res = await getPendingApplications();
        const applications = Array.isArray(res) ? res : (res || []);
        if (Array.isArray(applications)) {
          const mapped = applications.map(mapApiApplicationToPendingApp);
          setPendingApps(mapped);
        }
      }

      if (onCreated) {
        onCreated();
        return;
      }

      if (!isAdminView) {
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

  const showPhoneNotice = (phone: string, message: string) => {
    const contact = displayValue(phone) === '—' ? 'the parent phone on file' : phone;
    setEmailToast(uiText("📱 Notify {{value0}}: {{value1}}", { value0: contact, value1: message }));
    setTimeout(() => setEmailToast(null), 4000);
  };

  const handleDecline = async (appId: string) => {
    try {
      await updateApplicationStatus(appId, { status: 'declined' });
      const app = pendingApps.find(a => a.id === appId);
      setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' as AppStatus } : a));
      setSuccessMessage(uiText("Application {{value0}} has been declined.", { value0: appId }));
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
      setSuccessMessage(uiText("Applicant moved to Pass After Exam queue."));
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
      setSuccessMessage(uiText("{{value0}} is ready for final enrollment in Grade {{value1}}.", { value0: app?.name, value1: selectedGrade }));
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



  const handleOpenApprovalModal = (app: PendingApp) => {
    setAppForApproval(app);
    setApprovalForm({ parentDigitalId: '', reference: '' });
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!appForApproval) return;
    try {
      setApproving(true);
      setSubmitError(null);

      const res = await completeEnrollment(appForApproval.id, {
        parentDigitalId: approvalForm.parentDigitalId || undefined,
        reference: approvalForm.reference || undefined,
      });

      if (res?.success && res.data) {
        const { student, parent, phone } = res.data;
        setCredentialsModal({
          studentName: student.name,
          studentGrade: student.grade,
          studentDigitalId: student.digitalId,
          studentPin: student.pin,
          parentName: parent.name,
          parentDigitalId: parent.digitalId,
          parentPin: parent.pin || (parent.isExisting ? '(Linked to Existing Parent Account - Credentials Unchanged)' : 'N/A'),
          phone: phone || appForApproval.phone || appForApproval.parentPhone || 'N/A',
        });
        const targetId = appForApproval.id;
        setPendingApps(prev => prev.map(a => a.id === targetId ? { ...a, status: 'payment-confirmed' as AppStatus } : a));
        setSuccessMessage(uiText("{{value0}} enrolled successfully.", { value0: student.name }));
        if (appForApproval) showPhoneNotice(phone || appForApproval.phone, 'Application approved — officially enrolled');

        setShowApprovalModal(false);
        setAppForApproval(null);
        setApprovalForm({ parentDigitalId: '', reference: '' });
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to complete enrollment');
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setApproving(false);
    }
  };

  const handlePaymentResult = async (appId: string, paid: boolean) => {
    try {
      const app = pendingApps.find(a => a.id === appId);
      if (paid && app) {
        handleOpenApprovalModal(app);
      } else if (!paid) {
        await updateApplicationStatus(appId, { status: 'declined' });
        setPendingApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'declined' as AppStatus } : a));
        setSuccessMessage(uiText("{{value0}} application closed.", { value0: app?.name }));
        if (app) showPhoneNotice(app.phone, 'Application closed by school administration');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
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
      {uiText(emailToast && (
        <div className="fixed top-6 right-6 z-[300] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-8 text-sm font-bold max-w-md">
          <Clock size={18} className="text-blue-400 flex-shrink-0" />
          <span>{uiText(emailToast)}</span>
        </div>
      ))}
      {uiText(successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-emerald-500/5">
          <CheckCircle size={20} className="text-emerald-500" />
          <span className="font-bold text-sm">{uiText(successMessage)}</span>
        </div>
      ))}
      {uiText(submitError && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-lg shadow-rose-500/5">
          <AlertCircle size={20} className="text-rose-500" />
          <span className="font-bold text-sm">{uiError(submitError)}</span>
        </div>
      ))}

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
            <div className="flex items-center gap-3 px-4 py-2 text-slate-400" title={uiText("Student promotion will be enabled after the reviewed academic rollover workflow is implemented.")}>
              <button
                type="button"
                disabled
                className="px-4 py-1 text-xs font-black uppercase tracking-widest cursor-not-allowed opacity-60"
              >
                {t('registration.reEnrollment')}{uiText(" unavailable")}</button>
              <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wide">{uiText("Academic rollover is not yet available")}</span>
            </div>
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
                title={uiText(registrationOpen ? 'Click to close registration' : 'Click to open registration')}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none hover:opacity-90 active:scale-[0.99] ${registrationOpen ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/10'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${registrationOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-black uppercase tracking-tight ${registrationOpen ? 'text-emerald-700' : 'text-rose-700'}`}>{uiText("Registration ")}{uiText(registrationOpen ? 'Open' : 'Closed')}
                    </p>
                    <p className={`text-[10px] font-medium ${registrationOpen ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {uiText(registrationOpen ? 'New applications are being accepted.' : 'Public registration form is disabled.')}
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
                  {uiText(tab.label)}
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
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] mt-1">{uiText("Grade ")}{uiText(app.lastGrade)}{uiText(" • ")}{uiText(app.date)}</p>
                            {uiText(app.removalReason && (
                              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-2">{uiText("Returned to School Admin: ")}{uiText(app.removalReason)}</p>
                            ))}
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
                      {uiText(app.status === 'exam-pending' ? 'Pass After Exam' : app.status.replace(/-/g, ' '))}
                    </span>
                  </div>

                  {expandedAppIds[app.id] && (
                    <>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Date of Birth")}</p><p className="font-bold dark:text-slate-200">{uiText(app.dob ? formatEthiopianDateOnly(app.dob) : '—')}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Gender")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.gender))}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Grade Applying")}</p><p className="font-bold dark:text-slate-200">{uiText("Grade ")}{uiText(displayValue(app.lastGrade))}</p></div>
                        </div>

                        {/* Father & Mother Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{uiText("Father's Information")}</p>
                            <p className="font-bold dark:text-slate-200">{uiText("Name: ")}{uiText(displayValue(app.fatherName))}</p>
                            <p className="text-slate-600 dark:text-slate-400">{uiText("Occupation: ")}{uiText(displayValue(app.fatherOccupation))}</p>
                            <p className="text-slate-600 dark:text-slate-400">{uiText("Phone: ")}{uiText(displayValue(app.fatherPhone))}</p>
                          </div>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1">
                            <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">{uiText("Mother's Information")}</p>
                            <p className="font-bold dark:text-slate-200">{uiText("Name: ")}{uiText(displayValue(app.motherName))}</p>
                            <p className="text-slate-600 dark:text-slate-400">{uiText("Occupation: ")}{uiText(displayValue(app.motherOccupation))}</p>
                            <p className="text-slate-600 dark:text-slate-400">{uiText("Phone: ")}{uiText(displayValue(app.motherPhone))}</p>
                          </div>
                        </div>

                        {/* Residence & Personal Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Place of Birth")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.placeOfBirth))}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Religion")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.religion))}</p></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Parent / Guardian")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.parentName))}</p></div>
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Contact Phone")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.phone))}</p></div>
                          <div className="md:col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Address")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.address))}</p></div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div><p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Previous School")}</p><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.previousSchool))}</p></div>
                          <div className="md:col-span-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{uiText("Transcript")}</p>
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
                                  {uiText(app.transcriptFileName)} {uiText(app.transcriptFileSize ? `(${(app.transcriptFileSize / 1024).toFixed(0)} KB)` : '')}
                                </a>
                              </div>
                            ) : (
                              <p className="font-bold dark:text-slate-200">{uiText("—")}</p>
                            )}
                          </div>
                        </div>

                        {uiText((app.bloodGroup || app.allergies || app.chronicConditions || app.medications) && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><HeartPulse size={12} />{uiText(" Medical Information")}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">{uiText("Blood Group")}</span><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.bloodGroup))}</p></div>
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">{uiText("Allergies")}</span><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.allergies))}</p></div>
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">{uiText("Chronic Conditions")}</span><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.chronicConditions))}</p></div>
                              <div><span className="text-[10px] text-slate-500 font-bold uppercase">{uiText("Medications")}</span><p className="font-bold dark:text-slate-200">{uiText(displayValue(app.medications))}</p></div>
                            </div>
                          </div>
                        ))}

                        {uiText(app.notes && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs">
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">{uiText("Notes")}</p>
                            <p className="text-blue-900 dark:text-blue-200 font-medium">{uiText(app.notes)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons per Status */}
                      <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                        {uiText((app.status === 'pending' || app.transcriptFileName) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              app.transcriptFileName && setViewingTranscript(app);
                            }}
                            disabled={!app.transcriptFileName}
                            className="px-5 py-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                          >
                            <FileText size={16} />{uiText(" View Transcript")}</button>
                        ))}
                        {app.status === 'pending' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleDecline(app.id); }} className="px-5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><X size={16} />{uiText(" Decline")}</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePassAfterExam(app.id); }} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"><Clock size={16} />{uiText(" Pass After Exam")}</button>
                            <button onClick={(e) => { e.stopPropagation(); handlePass(app.id); }} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"><Check size={16} />{uiText(" Pass")}</button>
                          </>
                        )}
                        {app.status === 'exam-pending' && (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mr-2"><Clock size={14} />{uiText(" Awaiting Entrance Exam")}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDecline(app.id); }} className="px-5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"><X size={16} />{uiText(" Decline")}</button>
                            <button onClick={(e) => { e.stopPropagation(); handleExamPass(app.id); }} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20 active:scale-95"><Check size={16} />{uiText(" Assign Grade")}</button>
                          </>
                        )}
                        {app.status === 'awaiting-payment' && (
                          <button onClick={(e) => { e.stopPropagation(); handlePaymentResult(app.id, true); }} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"><Check size={16} />{uiText(" Complete Enrollment")}</button>
                        )}
                        {app.status === 'declined' && (
                          <span className="text-xs font-bold text-rose-500">{uiText("Application closed")}</span>
                        )}
                        {app.status === 'payment-confirmed' && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle size={14} />{uiText(" Officially enrolled")}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {filteredPipelineApps.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center space-y-3">
                  <CheckCircle size={48} className="mx-auto text-slate-200" />
                  <p className="text-slate-500 font-medium">{uiText("No applications in this category.")}</p>
                </div>
              )}
            </div>
          </div>
        ) : !registrationOpen ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{uiText("Online applications are currently closed")}</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{uiText("Please contact the school administration or check back later for registration updates.")}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" />{uiText("Admission Form (New Student)")}</h3>
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
              {uiText(activeApplicationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50 p-4 flex gap-3">
                  <AlertTriangle className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">{uiText("Active Application Exists")}</h4>
                    <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">{uiError(activeApplicationError)}</p>
                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-2">{uiText("Once your current application is completed, you will be able to submit a new one. If you need assistance, please contact school administration.")}</p>
                  </div>
                </div>
              ))}
              <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 ${registrationStep !== 1 ? 'hidden' : ''}`}>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">{uiText("1. Student Information / የተማሪዎች መረጃ")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Row 1: Full Name & Place of Birth */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Full Name ")}<span className="text-rose-500">{uiText("*")}</span>{uiText(" / የተማሪዎች ስም")}</label>
                    <input
                      required
                      name="name"
                      type="text"
                      placeholder={uiText("Enter student full name")}
                      onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.name
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    />
                    {uiText(validationErrors.name && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {validationErrors.name}</p>)}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      {t('registration.placeOfBirth', 'Place of Birth')}{uiText(" / የትውልድ ቦታ")}</label>
                    <input
                      name="placeOfBirth"
                      type="text"
                      placeholder={uiText("Place of Birth / የትውልድ ቦታ")}
                      onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Current Address ")}<span className="text-rose-500">{uiText("*")}</span>{uiText(" / አሁን ያለበት አድራሻ")}</label>
                    <input
                      required
                      name="address"
                      type="text"
                      placeholder={uiText("City, Sub-city, Woreda")}
                      onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.address
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    />
                    {uiText(validationErrors.address && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.address)}</p>)}
                  </div>

                  {/* Row 2: Date of Birth & Card Age */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Date of Birth (Ethiopian Calendar) ")}<span className="text-rose-500">{uiText("*")}</span>{uiText(" / የትውልድ ቀን")}</label>
                    <EthiopianDatePicker
                      value={ethiopianDob}
                      onChange={(val) => setEthiopianDob(val)}
                      placeholder={uiText("e.g. 2010-01-01")}
                      className={validationErrors.dob ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500' : ''}
                    />
                    <input type="hidden" name="dob" value={ethiopianDob ? ethiopianToGregorianIso(ethiopianDob) : ''} />
                    {uiText(validationErrors.dob && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.dob)}</p>)}
                  </div>



                  {/* Row 3: Religion (Dropdown) & Gender (Dropdown) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      {t('registration.religion', 'Religion')}{uiText(" / ሐይማኖት")}</label>
                    <select
                      name="religion"
                      title={uiText("Religion")}
                      aria-label={uiText("Religion")}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{uiText("Select Religion / ሐይማኖት ይምረጡ")}</option>
                      <option value="Orthodox">{uiText("Orthodox / ኦርቶዶክስ")}</option>
                      <option value="Muslim">{uiText("Muslim / ሙስሊም")}</option>
                      <option value="Protestant">{uiText("Protestant / ፕሮቴስታንት")}</option>
                      <option value="Catholic">{uiText("Catholic / ካቶሊክ")}</option>
                      <option value="Other">{uiText("Other / ሌላ")}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Gender ")}<span className="text-rose-500">{uiText("*")}</span>{uiText(" / ጾታ")}</label>
                    <select
                      name="gender"
                      title={uiText("Gender")}
                      aria-label={uiText("Gender")}
                      className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.gender
                        ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                        }`}
                    >
                      <option value="">{uiText("Select Gender / ጾታ ይምረጡ")}</option>
                      <option value="Male">{uiText("Male / ወንድ")}</option>
                      <option value="Female">{uiText("Female / ሴት")}</option>
                    </select>
                    {uiText(validationErrors.gender && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.gender)}</p>)}
                  </div>
                </div>
              </div>

              <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 ${registrationStep !== 2 ? 'hidden' : ''}`}>
                {/* Father's Information */}
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-4">
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} />{uiText(" Father's Details / የአባት መረጃ")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Father's Full Name ")}<span className="text-rose-500">{uiText("*")}</span>{uiText(" / የአባት ሙሉ ስም")}</label>
                      <input
                        required
                        name="fatherName"
                        type="text"
                        placeholder={uiText("Father's Full Name")}
                        onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                        className={`w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.fatherName
                          ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                      />
                      {uiText(validationErrors.fatherName && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.fatherName)}</p>)}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{uiText("Father's Occupation / የአባት ስራ")}</label>
                      <input
                        name="fatherOccupation"
                        type="text"
                        placeholder={uiText("e.g. Teacher, Merchant, Engineer")}
                        onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Father's Phone / የአባት ስልክ")}</label>
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        <div className="flex items-center justify-center px-2.5 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 select-none shrink-0">{uiText("+251")}</div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder={uiText("9xxxxxxxx or 7xxxxxxxx")}
                          name="fatherPhone"
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
                          }}
                          className="flex-1 min-w-0 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mother's Information */}
                <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-4">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} />{uiText(" Mother's Details / የእናት መረጃ")}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Mother's Full Name ")}<span className="text-rose-500">{uiText("*")}</span>{uiText(" / የእናት ሙሉ ስም")}</label>
                      <input
                        required
                        name="motherName"
                        type="text"
                        placeholder={uiText("Mother's Full Name")}
                        onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                        className={`w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.motherName
                          ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                          }`}
                      />
                      {uiText(validationErrors.motherName && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.motherName)}</p>)}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{uiText("Mother's Occupation / የእናት ስራ")}</label>
                      <input
                        name="motherOccupation"
                        type="text"
                        placeholder={uiText("e.g. Accountant, Doctor, Housewife")}
                        onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Mother's Phone / የእናት ስልክ")}</label>
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        <div className="flex items-center justify-center px-2.5 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 select-none shrink-0">{uiText("+251")}</div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={9}
                          placeholder={uiText("9xxxxxxxx or 7xxxxxxxx")}
                          name="motherPhone"
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
                          }}
                          className="flex-1 min-w-0 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

















































              </div>

              <div className={`space-y-6 animate-in fade-in slide-in-from-right-4 ${registrationStep !== 3 ? 'hidden' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Previous School ")}<span className="text-slate-400 text-[10px] font-medium">{uiText("(optional)")}</span></label>
                    <input name="previousSchool" type="text" placeholder={uiText("Name of previous school")} onBlur={(e) => { e.target.value = toTitleCase(e.target.value); }} className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm outline-none focus:ring-2 ${validationErrors.previousSchool
                      ? 'border-rose-300 focus:ring-rose-500 dark:border-rose-700'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                      }`} />
                    {uiText(validationErrors.previousSchool && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.previousSchool)}</p>)}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Last Grade Completed ")}<span className="text-rose-500">{uiText("*")}</span></label>
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
                      <option value="">{uiText("Select Last Grade Completed")}</option>
                      <option value="First Time">{uiText("First Time / ትምህርት ያልጀመረ/ች")}</option>
                      <option value="KG 1">{uiText("KG 1")}</option>
                      <option value="KG 2">{uiText("KG 2")}</option>
                      <option value="KG 3">{uiText("KG 3")}</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(g => (
                        <option key={g} value={g}>{uiText("Grade ")}{uiText(g)}</option>
                      ))}
                    </select>
                    {uiText(validationErrors.grade && <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> {uiText(validationErrors.grade)}</p>)}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">{uiText("Last Transcript (Max 2MB)")}</label>
                  <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${fileError ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}>
                    <input
                      type="file"
                      name="transcript"
                      title={uiText("Upload student transcript")}
                      aria-label={uiText("Upload student transcript")}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className={`p-4 rounded-full ${fileError ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
                      {fileName ? <FileText size={32} /> : <Upload size={32} />}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {uiText(fileName || 'Click to upload transcript')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{uiText("Accepted formats: PDF, PNG, JPG (Max 2MB)")}</p>
                    </div>
                  </div>
                  {uiText(fileError && (
                    <p className="text-sm text-rose-600 font-bold text-center flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl py-2 px-4">
                      <AlertTriangle size={14} /> {uiError(fileError)}
                    </p>
                  ))}
                </div>

                {/* Branch Selection Section */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">{uiText("Branch ")}<span className="text-rose-500">{uiText("*")}</span></label>
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
                            <option value="">{uiText("Select Branch")}</option>
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
                        <option value="">{uiText("Select Branch")}</option>
                        {displayBranches.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    );
                  })()}
                  {uiText(validationErrors.branchName && (
                    <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} /> {uiText(validationErrors.branchName)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={registrationStep === 1}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:hidden"
                >{uiText("Previous")}</button>
                {registrationStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg"
                  >{uiText("Next Step")}</button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !!activeApplicationError}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-bold transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uiText(isSubmitting ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{uiText("Submitting…")}</>
                    ) : (
                      'Submit Application'
                    ))}
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
                placeholder={uiText("Search existing student by name or ID...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>

            {uiText(searchQuery && (
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
                          {uiText(student.name[0])}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.name}</p>
                          <p className="text-xs text-slate-500 uppercase font-medium">{uiText("ID: ")}{uiText(student.id)}{uiText(" • Grade: ")}{uiText(student.lastGrade)}</p>
                        </div>
                      </div>
                      <CheckCircle size={20} className={selectedStudent?.id === student.id ? 'text-blue-600' : 'text-slate-200'} />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-sm italic">{uiText("No students found matching your search.")}</div>
                )}
              </div>
            ))}
          </div>

          {uiText(selectedStudent && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw size={20} className="text-blue-600" />{uiText("Promotion")}</h3>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedStudent.id === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{uiText("Fee Status: ")}{uiText(selectedStudent.id === '1' ? 'Paid' : 'Pending')}
                </span>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Info size={16} />
                        <span className="text-xs font-bold uppercase">{uiText("Current Record")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{uiText("Current Grade")}</p>
                          <p className="text-sm font-bold dark:text-white">{uiText(selectedStudent.grade)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">{uiText("Academic Status")}</p>
                          <p className="text-sm font-bold text-emerald-600">{uiText("Cleared")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{uiText("Promote To Grade")}</label>
                      <select title={uiText("Promote To Grade")} aria-label={uiText("Promote To Grade")} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Grade 9">{uiText("Grade 9")}</option>
                        <option value="Grade 10">{uiText("Grade 10")}</option>
                        <option value="Grade 11">{uiText("Grade 11")}</option>
                        <option value="Grade 12">{uiText("Grade 12")}</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle size={20} />
                      <h4 className="font-bold text-sm uppercase">{uiText("Verification Check")}</h4>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">{uiText("Before promoting ")}<strong>{selectedStudent.name}</strong>{uiText(", confirm that the student has completed the current academic requirements.")}</p>
                    {selectedStudent.id !== '1' && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-200 text-xs font-bold text-rose-600 flex items-center gap-2">
                        <AlertCircle size={14} />{uiText("Outstanding Balance Found: 2,500 ETB")}</div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-all"
                  >{uiText("Cancel")}</button>
                  <button
                    type="button"
                    disabled
                    title={uiText("Student promotion requires the reviewed academic rollover workflow.")}
                    className="px-8 py-2.5 rounded-xl font-bold text-sm bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  >{uiText("Promotion Unavailable")}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {uiText(viewingTranscript && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[90vh]">
            {/* Floating Close Button */}
            <button
              onClick={() => setViewingTranscript(null)}
              className="absolute top-4 right-4 z-10 p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
              title={uiText("Close Transcript")}
            >
              <X size={24} />
            </button>

            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 pr-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{uiText("Transcript Verification")}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{uiText("Student: ")}{viewingTranscript.name}</p>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto flex-1">
              <div className="lg:col-span-2 space-y-6 relative">
                {transcriptLoading ? (
                  <div className="w-full h-[420px] flex items-center justify-center">
                    <p className="text-sm text-slate-500">{uiText("Loading transcript...")}</p>
                  </div>
                ) : transcriptError ? (
                  <div className="w-full h-[420px] flex items-center justify-center">
                    <p className="text-sm text-rose-500">{uiError(transcriptError)}</p>
                  </div>
                ) : transcriptUrl ? (
                  <div className="w-full h-[720px] bg-slate-50 dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 overflow-hidden">
                    <iframe title={uiText("transcript-{{value0}}", { value0: viewingTranscript?.id })} src={transcriptUrl} className="w-full h-full" />
                  </div>
                ) : (
                  // Fallback mock viewer when no transcript available
                  <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                    <div className="text-center p-12">
                      <FileText size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-4 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{uiText("Mock Transcript Viewer")}</p>
                      <p className="text-[10px] text-slate-500 mt-2">{uiText("Document ID: ")}{uiText(viewingTranscript.id)}{uiText("_TRANSCRIPT_2025.pdf")}</p>
                    </div>
                    <div className="absolute inset-4 border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col p-8 bg-white dark:bg-slate-950/50 backdrop-blur-sm shadow-inner">
                      <div className="flex justify-between mb-8 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                        <div className="font-black text-xs">{uiText("OFFICIAL ACADEMIC RECORD")}</div>
                        <div className="font-bold text-[10px] text-slate-400">{uiText("PAGE 1 OF 1")}</div>
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-2 gap-4">
                          {transcriptHistory[selectedAcademicYear as keyof typeof transcriptHistory][selectedSemester as keyof (typeof transcriptHistory)[keyof typeof transcriptHistory]].map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                              <span className="text-[10px] font-bold text-slate-600 uppercase">{uiText(item.s)}</span>
                              <span className="text-xs font-black text-blue-600">{uiText(item.g)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                          <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-1">{uiText("Cumulative GPA")}</p>
                          <p className="text-2xl font-black text-emerald-600">{uiText("3.85 / 4.00")}</p>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-between items-end">
                        <div className="space-y-1">
                          <div className="w-24 h-0.5 bg-slate-300"></div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{uiText("Principal's Signature")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{uiText("Verified Academic History")}</p>
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300">{uiText("ZIQUALA ABO SCHOOL")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{uiText("Verification Checklist")}</h4>
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
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{uiText(check)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-3xl">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-2">{uiText("Academic Counselor Note:")}</p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed italic">{uiText("\"Student shows exceptional performance in STEM subjects. Recommended for Advanced Track in Grade ")}{uiText(viewingTranscript.lastGrade)}{uiText(".\"")}</p>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => { handlePass(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />{uiText("Pass — Accept")}</button>

                  <button
                    onClick={() => { handlePassAfterExam(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Clock size={18} />{uiText("Pass After Exam")}</button>

                  <button
                    onClick={() => { handleDecline(viewingTranscript.id); setViewingTranscript(null); }}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 py-4 rounded-2xl font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={18} />{uiText("Decline")}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {/* Generated Credentials Modal (Payment Approved) */}
      {credentialsModal && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #credential-print-sheet,
              #credential-print-sheet * { visibility: visible !important; }
              #credential-print-sheet {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 12mm 15mm !important;
                background: white !important;
                color: #0f172a !important;
              }
            }
          `}</style>

          {/* Printable A4 sheet */}
          <div id="credential-print-sheet" className="hidden print:block fixed inset-0 z-[9999] bg-white text-slate-900">
            <div className="max-w-[180mm] mx-auto pt-[8mm]">
              <h1 className="text-lg font-bold tracking-tight border-b-2 border-slate-800 pb-2 mb-6">{uiText("Login Credentials")}</h1>
              <div className="grid grid-cols-2 gap-x-10 gap-y-5 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{uiText("STUDENT ID")}</p>
                  <p className="text-base font-mono font-bold">{uiText(credentialsModal.studentDigitalId)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{uiText("STUDENT PASSWORD")}</p>
                  <p className="text-base font-mono font-bold">{uiText(credentialsModal.studentPin)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{uiText("PARENT ID")}</p>
                  <p className="text-base font-mono font-bold">{uiText(credentialsModal.parentDigitalId)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{uiText("PARENT PASSWORD")}</p>
                  <p className="text-base font-mono font-bold">{uiText(credentialsModal.parentPin)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* On-screen Modal */}
          <div className="credential-modal-screen fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto print:hidden animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-800 text-white my-auto max-h-[92vh] flex flex-col">
              <h2 className="text-xl font-bold text-emerald-400 mb-4 shrink-0 flex items-center gap-2">
                <Check size={24} className="text-emerald-400" />{uiText("Payment Approved")}</h2>

              <div className="space-y-4 mb-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 overflow-y-auto flex-1 max-h-[55vh] scrollbar-thin">
                {/* STUDENT ID */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{uiText("STUDENT ID")}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs sm:text-sm font-mono font-bold text-white flex-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all">
                      {uiText(credentialsModal.studentDigitalId)}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(credentialsModal.studentDigitalId, 'Student ID')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0"
                    >
                      {uiText(copiedLabel === 'Student ID' ? 'Copied!' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* STUDENT PASSWORD */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{uiText("STUDENT PASSWORD")}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs sm:text-sm font-mono font-bold text-white flex-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all">
                      {uiText(showPassword ? credentialsModal.studentPin : '••••••••')}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
                      aria-label={uiText(showPassword ? 'Hide password' : 'Show password')}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(credentialsModal.studentPin, 'Student Password')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0"
                    >
                      {uiText(copiedLabel === 'Student Password' ? 'Copied!' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* PARENT ID */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{uiText("PARENT ID")}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs sm:text-sm font-mono font-bold text-white flex-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all">
                      {uiText(credentialsModal.parentDigitalId)}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(credentialsModal.parentDigitalId, 'Parent ID')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0"
                    >
                      {uiText(copiedLabel === 'Parent ID' ? 'Copied!' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* PARENT PASSWORD */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{uiText("PARENT PASSWORD")}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs sm:text-sm font-mono font-bold text-white flex-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 break-all">
                      {uiText(showPassword ? credentialsModal.parentPin : '••••••••')}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(credentialsModal.parentPin, 'Parent Password')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0"
                    >
                      {uiText(copiedLabel === 'Parent Password' ? 'Copied!' : 'Copy')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stacked Action Buttons */}
              <div className="flex flex-col gap-2.5 shrink-0 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    copyText(
                      `STUDENT ID: ${credentialsModal.studentDigitalId}\nSTUDENT PASSWORD: ${credentialsModal.studentPin}\nPARENT ID: ${credentialsModal.parentDigitalId}\nPARENT PASSWORD: ${credentialsModal.parentPin}`,
                      'All credentials'
                    );
                  }}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-all text-xs sm:text-sm"
                >
                  {uiText(copiedLabel === 'All credentials' ? '✓ Copied all credentials!' : 'Copy all credentials')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(true);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all text-xs sm:text-sm shadow-lg shadow-blue-600/30 active:scale-[0.99]"
                >{uiText("Print credentials (A4)")}</button>
                <button
                  type="button"
                  onClick={() => {
                    setCredentialsModal(null);
                    setShowPassword(false);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-all text-xs sm:text-sm"
                >{uiText("Close")}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Approval & Generate Credentials Modal */}
      {showApprovalModal && appForApproval && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{uiText("Approve Payment & Generate Credentials")}</h2>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">{uiText("Student: ")}<span className="font-bold text-slate-900 dark:text-white">{appForApproval.name}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">{uiText("Parent ID (optional)")}</label>
                <input
                  type="text"
                  value={approvalForm.parentDigitalId}
                  onChange={(e) =>
                    setApprovalForm({ ...approvalForm, parentDigitalId: e.target.value.trim() })
                  }
                  placeholder={uiText("Enter existing Parent ID if available")}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{uiText("If the student has a sibling already registered, enter the parent's existing digital ID here so the student links to the same account instead of creating a new one.")}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">{uiText("Payment Reference (optional)")}</label>
                <input
                  type="text"
                  value={approvalForm.reference}
                  onChange={(e) =>
                    setApprovalForm({ ...approvalForm, reference: e.target.value })
                  }
                  placeholder={uiText("e.g., Receipt #12345")}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-3.5">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">{uiText("✓ This will generate Student ID, Password, Parent ID, and Password")}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowApprovalModal(false);
                  setAppForApproval(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >{uiText("Cancel")}</button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={approving}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
              >
                {approving ? (
                  <>
                    <Clock size={16} className="animate-spin" />{uiText("Processing...")}</>
                ) : (
                  <>
                    <Check size={16} />{uiText("Approve Payment")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Assignment Modal */}
      {uiText(showGradeModal && selectedAppForGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl sm:rounded-[2.5rem] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight">{uiText("Assign Grade")}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{uiText("Select the grade in which this student will be enrolled.")}</p>
            </div>
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{uiText("Grade")}</label>
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
                    {uiText(grade.startsWith('KG') ? grade : `Grade ${grade}`)}
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
              >{uiText("Cancel")}</button>
              <button
                onClick={handleConfirmGradeAssignment}
                disabled={!selectedGrade}
                className="bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >{uiText("Continue Enrollment")}</button>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
};
