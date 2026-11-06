import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Briefcase, Download, Edit2, Eye, FileText, Loader2, Phone, Save, Upload, User, X } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { uiError, uiText } from '../localization';
import { getStaffProfile, saveStaffProfile, type StaffProfileDetails } from '../services/staffProfileService';
import { userService } from '../services/userService';
import { EthiopianDatePicker } from './EthiopianDatePicker';
import { ethiopianToGregorianIso } from '../utils/ethiopianCalendar';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const formatValue = (value: unknown) => value === '' || value === undefined || value === null ? uiText('Not provided') : String(value);
const roleLabel = (role: string) => role.replace(/[-_]/g, ' ').replace(/^./, value => value.toUpperCase());
const ageFromDob = (dob: string) => {
  if (!dob) return '';
  try {
    const birth = new Date(ethiopianToGregorianIso(dob));
    if (Number.isNaN(birth.getTime())) return '';
    const today = new Date();
    const birthdayPending = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
    const age = today.getFullYear() - birth.getFullYear() - Number(birthdayPending);
    return age >= 0 && age <= 120 ? String(age) : '';
  } catch { return ''; }
};
const initialForm = (staff: any) => {
  const p = staff.staffProfile || staff.staff_profile || {};
  const dob = p.dob ?? p.dateOfBirth ?? p.birthDate ?? staff.dob ?? '';
  return {
    name: staff.name || '', email: staff.email || '', role: staff.role || staff.user_role || 'teacher', status: staff.status || 'Pending',
    phoneNumber: p.phoneNumber ?? p.phone ?? p.contactNumber ?? staff.phoneNumber ?? '', dob,
    age: p.age == null ? ageFromDob(dob) : String(p.age), gender: p.gender || '', title: p.title || '', department: p.department || '',
    educationLevel: p.educationLevel ?? p.educationStatus ?? staff.educationLevel ?? '', specialty: p.specialty ?? p.courseSpecialty ?? staff.specialty ?? '',
    previousSchool: p.previousSchool ?? staff.previousSchool ?? '',
    experienceYears: String(p.experienceYears !== undefined ? p.experienceYears ?? '' : p.experience ?? staff.experienceYears ?? ''),
    emergencyContactName: p.emergencyContactName ?? staff.emergencyContactName ?? '', emergencyContactPhone: p.emergencyContactPhone ?? staff.emergencyContactPhone ?? '',
  };
};
type Form = ReturnType<typeof initialForm>;
type FieldProps = { label: string; value: string; editing?: boolean; onChange?: (value: string) => void; type?: string;
  options?: Array<{ value: string; label: string }>; required?: boolean; maxLength?: number; disabled?: boolean; max?: number; step?: number };
function Field({ label, value, editing, onChange, type = 'text', options, required, maxLength = 150, disabled, max, step }: FieldProps) {
  const id = useId();
  return <div>
    <label htmlFor={editing ? id : undefined} className="block text-xs font-bold text-slate-400">{uiText(label)}</label>
    {editing ? options ? <select id={id} value={value} disabled={disabled} onChange={event => onChange?.(event.target.value)} className={inputClass}>
      {options.map(option => <option key={option.value} value={option.value}>{uiText(option.label)}</option>)}
    </select> : <input id={id} type={type} value={value} required={required} minLength={required && type === 'text' ? 2 : undefined}
      maxLength={maxLength} min={type === 'number' ? 0 : undefined} max={max} step={step}
      pattern={type === 'tel' ? '[+0-9\\s\\(\\)\\-]*' : undefined} autoComplete={label === 'Full Name' ? 'name' : type === 'email' ? 'email' : undefined}
      onChange={event => onChange?.(event.target.value)} className={inputClass} />
      : <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{formatValue(value)}</p>}
  </div>;
}
function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section data-record-section={title}>
    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">{icon}{uiText(title)}</h4>
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 sm:grid-cols-2">{children}</div>
  </section>;
}
type Props = { staff: any; onSaved: (user: any) => void; startEditing?: boolean; title?: string; onClose?: () => void; onRefresh?: () => void };

// One structured record: values become inputs inside the same cards during editing.
export function StaffProfileEditor({ staff, onSaved, startEditing = false, title = 'Registration Details', onClose, onRefresh }: Props) {
  const { role } = useUser();
  const [record, setRecord] = useState(staff);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [details, setDetails] = useState<StaffProfileDetails | null>(null);
  const [form, setForm] = useState<Form>(() => initialForm(staff));
  const [documentAction, setDocumentAction] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dobId = useId();
  const userId = staff.userId || staff.user_id || staff.id;
  const canEdit = ['school-admin', 'super-admin', 'academic-manager'].includes(role || '');
  useEffect(() => { setRecord(staff); }, [staff]);
  useEffect(() => { if (startEditing && canEdit) setEditing(true); }, [startEditing, canEdit]);
  useEffect(() => {
    if (!editing || !canEdit) return;
    let cancelled = false;
    setLoading(true); setDetails(null); setError('');
    getStaffProfile(userId).then(data => {
      if (cancelled) return;
      setDetails(data);
      setRecord((current: any) => ({ ...current, ...data.user, id: staff.id, staffProfile: { ...current.staffProfile, ...data.user.staff_profile } }));
      setForm(initialForm(data.user));
    }).catch(err => { if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load staff profile'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [editing, canEdit, userId]);

  const displayed = initialForm(record);
  const update = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value, ...(key === 'dob' ? { age: ageFromDob(value) } : {}) }));
  const field = (key: keyof Form, label: string, props: Partial<FieldProps> = {}) => <Field key={key} label={label}
    value={editing ? form[key] : key === 'role' ? roleLabel(displayed[key]) : displayed[key]} editing={editing} onChange={value => update(key, value)} {...props} />;
  const choices = (values: string[]) => values.map(value => ({ value, label: value }));
  const cancel = () => { setEditing(false); setForm(initialForm(record)); setError(''); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || saving || !details) return;
    if (form.name.trim().length < 2) { setError('Full name must contain at least two characters'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const user = await saveStaffProfile(userId, {
        name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role, status: form.status,
        staffProfile: { gender: form.gender, phoneNumber: form.phoneNumber.trim(), title: form.title.trim(), department: form.department.trim(), dob: form.dob,
          age: form.age === '' ? null : Number(form.age), educationLevel: form.educationLevel.trim(), specialty: form.specialty.trim(),
          previousSchool: form.previousSchool.trim(), experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
          emergencyContactName: form.emergencyContactName.trim(), emergencyContactPhone: form.emergencyContactPhone.trim() },
      });
      setRecord((current: any) => ({ ...current, ...user, id: current.id, staffProfile: { ...current.staffProfile, ...user.staff_profile } }));
      onSaved(user); setEditing(false); setSuccess('Staff profile updated successfully');
    } catch (err: any) {
      const failure = err.response?.data?.error;
      setError(failure?.details?.join('; ') || failure?.message || 'Failed to save changes');
    } finally { setSaving(false); }
  };
  const documentName = record.document_file_name || record.documentFileName;
  const documentRequest = async (action: 'view' | 'download') => {
    setDocumentAction(action); setError('');
    try {
      const response = await userService.getUserDocument(userId);
      const url = URL.createObjectURL(new Blob([response.data], { type: String(response.headers['content-type'] || 'application/pdf') }));
      if (action === 'view') window.open(url, '_blank', 'noopener,noreferrer');
      else { const link = document.createElement('a'); link.href = url; link.download = documentName || 'document.pdf'; link.click(); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setError('Failed to open document'); }
    finally { setDocumentAction(''); }
  };
  const uploadDocument = async (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('File size exceeds the 2MB limit.'); return; }
    setDocumentAction('upload'); setError('');
    try {
      await userService.replaceUserDocument(userId, file);
      setRecord((current: any) => ({ ...current, document_file_name: file.name, documentFileName: file.name }));
      setSuccess('Document replaced successfully!');
      void Promise.resolve(onRefresh?.()).catch(() => {});
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Failed to replace document'); }
    finally { setDocumentAction(''); if (fileRef.current) fileRef.current.value = ''; }
  };
  const registeredAt = record.createdAt || record.created_at || record.staffProfile?.registeredAt || record.staff_profile?.registeredAt;
  const availableRoles = Array.from(new Set([form.role, 'teacher', 'vice-principal', 'librarian', 'storekeeper', ...(role === 'super-admin' ? ['academic-manager', 'school-admin'] : [])]));

  return <form onSubmit={save} data-staff-record className="text-slate-900 dark:text-slate-100">
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white/95 p-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div><h3 className="text-lg font-extrabold">{uiText(title)}</h3><p className="text-xs font-medium text-slate-500">{uiText('Complete information submitted during system registration')}</p></div>
      <div className="flex items-center gap-2">
        {canEdit && !editing && <button type="button" onClick={() => { setForm(initialForm(record)); setSuccess(''); setEditing(true); }} className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"><Edit2 size={14} />{uiText('Edit Record')}</button>}
        {onClose && <button type="button" disabled={saving} onClick={onClose} aria-label={uiText('Close')} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>}
      </div>
    </header>
    <div className="space-y-6 p-6">
      <div data-staff-banner className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-indigo-950/40">
        <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">{record.name?.charAt(0).toUpperCase() || 'U'}</div>
          <div><h4 className="font-bold">{record.name}</h4><div className="mt-1 flex gap-2"><span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{uiText(roleLabel(displayed.role))}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${['Active', 'Approved'].includes(record.status) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'}`}>{uiText(record.status || 'Pending')}</span></div></div></div>
        <div className="text-right"><span className="block text-xs font-bold uppercase text-slate-400">{uiText('Digital ID')}</span><span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">{record.digitalId || record.digital_id || 'N/A'}</span></div>
      </div>
      {editing && <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300"><Edit2 size={14} className="shrink-0" /><span>{uiText('You are currently editing the staff profile details. Update the information below and click Save Changes.')}</span></div>}
      {loading && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" />{uiText('Loading profile...')}</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{uiError(error)}</p>}
      {success && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{uiText(success)}</p>}
      <fieldset disabled={saving || loading} className="space-y-6 disabled:opacity-60">
        <Section title="Account & System Information" icon={<User size={14} className="text-blue-500" />}>
          {field('name', 'Full Name', { required: true })}{field('email', 'Email Address', { type: 'email', required: true })}
          {field('role', 'Role', { options: availableRoles.map(value => ({ value, label: roleLabel(value) })), disabled: ['school-admin', 'academic-manager'].includes(details?.user.role || '') && role !== 'super-admin' })}
          <Field label="Digital ID" value={record.digitalId || record.digital_id || 'N/A'} />
          <Field label="Registration Date" value={registeredAt ? new Date(registeredAt).toLocaleString() : ''} />
          {field('status', 'Account Status', { options: choices(Array.from(new Set([form.status, 'Active', 'Inactive', 'Pending', 'Revoked', 'Suspended']))), disabled: details?.user.role === 'school-admin' && role !== 'super-admin' })}
        </Section>
        <Section title="Personal & Professional Profile" icon={<Briefcase size={14} className="text-indigo-500" />}>
          {field('phoneNumber', 'Phone Number', { type: 'tel', maxLength: 25 })}
          <div><label htmlFor={dobId} className="block text-xs font-bold text-slate-400">{uiText('Date of Birth')}</label>
            {editing ? <EthiopianDatePicker id={dobId} value={form.dob} onChange={value => update('dob', value)} className={inputClass} /> : <p className="mt-1 text-sm font-semibold">{formatValue(displayed.dob)}</p>}</div>
          {field('age', 'Age', { type: 'number', max: 120, step: 1 })}
          {field('gender', 'Gender', { options: choices(['', 'Male', 'Female', 'Other']).map(option => option.value ? option : { value: '', label: 'Not provided' }) })}
          {field('educationLevel', 'Education Status')}{field('specialty', 'Specialty / Course')}
          {field('previousSchool', 'Previous School', { maxLength: 200 })}{field('experienceYears', 'Years of Experience', { type: 'number', max: 100, step: 0.5 })}
          {field('title', 'Job Title')}{field('department', 'Department')}
        </Section>
        <Section title="Emergency Contact" icon={<Phone size={14} className="text-emerald-500" />}>
          {field('emergencyContactName', 'Emergency Contact Name')}{field('emergencyContactPhone', 'Emergency Contact Phone', { type: 'tel', maxLength: 25 })}
        </Section>
      </fieldset>
      <Section title="Attached Document" icon={<FileText size={14} className="text-amber-500" />}>
        <p className="break-words text-sm font-semibold">{documentName || uiText('No document uploaded')}</p>
        <div className="flex flex-wrap gap-2">
          {documentName && <><button type="button" disabled={!!documentAction} onClick={() => documentRequest('view')} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Eye size={15} />{uiText('View')}</button><button type="button" disabled={!!documentAction} onClick={() => documentRequest('download')} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Download size={15} />{uiText('Download Document')}</button></>}
          {canEdit && <button type="button" disabled={!!documentAction || saving} onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white"><Upload size={15} />{uiText(documentAction === 'upload' ? 'Uploading...' : documentName ? 'Reupload / Edit Document' : 'Upload Document')}</button>}
          <input type="file" ref={fileRef} accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={event => uploadDocument(event.target.files?.[0])} />
        </div>
      </Section>
      {editing && <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button type="button" disabled={saving} onClick={cancel} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><X size={15} />{uiText('Cancel')}</button>
        <button type="submit" disabled={saving || loading || !details} className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{uiText(saving ? 'Saving Changes...' : 'Save Changes')}</button>
      </div>}
    </div>
  </form>;
}
