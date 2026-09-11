import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarDays, Image, Loader2, Megaphone, Pencil, Plus, Shirt, Sparkles, Trash2, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { uiText } from '../localization';
import {
  websiteContentService,
  type WebsiteContentItem,
  type WebsiteContentPayload,
  type WebsiteContentStatus,
  type WebsiteContentType,
} from '../services/websiteContentService';

const contentTabs: Array<{ type: WebsiteContentType; label: string; hint: string; icon: typeof Megaphone }> = [
  { type: 'team', label: 'School Team', hint: 'People shown under the public School navigation.', icon: Users },
  { type: 'community', label: 'Activities & Events', hint: 'Extracurricular activities and community-facing events.', icon: CalendarDays },
  { type: 'uniform', label: 'Uniform Stories', hint: 'Student-led explanations of uniform identity and uniqueness.', icon: Shirt },
];

const emptyPayload = (type: WebsiteContentType): WebsiteContentPayload => ({
  content_type: type,
  title: '',
  subtitle: '',
  body: '',
  image_url: '',
  media_url: '',
  cta_label: '',
  cta_url: '',
  category: type === 'team' ? 'Office & management' : '',
  display_order: 0,
  status: 'draft',
  featured: false,
  event_date: null,
});

const normalizePayload = (payload: WebsiteContentPayload): WebsiteContentPayload => ({
  ...payload,
  title: payload.title.trim(),
  subtitle: payload.subtitle.trim(),
  body: payload.body.trim(),
  image_url: payload.image_url.trim(),
  media_url: payload.media_url.trim(),
  cta_label: payload.cta_label.trim(),
  cta_url: payload.cta_url.trim(),
  category: payload.category.trim(),
  display_order: Number(payload.display_order) || 0,
  event_date: payload.event_date || null,
});

export const WebsitePosts = () => {
  const [items, setItems] = useState<WebsiteContentItem[]>([]);
  const [activeType, setActiveType] = useState<WebsiteContentType>('team');
  const [draft, setDraft] = useState<WebsiteContentPayload>(() => emptyPayload('team'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeTab = contentTabs.find((tab) => tab.type === activeType) || contentTabs[0];
  const visibleItems = useMemo(() => items.filter((item) => item.content_type === activeType), [items, activeType]);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError('');
      setItems(await websiteContentService.getAll());
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load website content.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = (type = activeType) => {
    setEditingId(null);
    setDraft(emptyPayload(type));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const switchType = (type: WebsiteContentType) => {
    setActiveType(type);
    resetForm(type);
  };

  const readSelectedImage = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return draft.image_url;
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const editItem = (item: WebsiteContentItem) => {
    setEditingId(item.id);
    setActiveType(item.content_type);
    setDraft({
      content_type: item.content_type,
      title: item.title,
      subtitle: item.subtitle,
      body: item.body,
      image_url: item.image_url,
      media_url: item.media_url,
      cta_label: item.cta_label,
      cta_url: item.cta_url,
      category: item.category,
      display_order: item.display_order,
      status: item.status,
      featured: item.featured,
      event_date: item.event_date,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const payload = normalizePayload({ ...draft, image_url: await readSelectedImage() });
      if (!payload.title) throw new Error('Title is required.');

      if (editingId) {
        await websiteContentService.update(editingId, payload);
      } else {
        await websiteContentService.create(payload);
      }

      await loadItems();
      resetForm(payload.content_type);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save website content.');
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (item: WebsiteContentItem, status: WebsiteContentStatus) => {
    try {
      setError('');
      await websiteContentService.updateStatus(item.id, status);
      await loadItems();
    } catch (statusError: any) {
      setError(statusError?.message || 'Failed to update content status.');
    }
  };

  const removeItem = async (item: WebsiteContentItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      setError('');
      await websiteContentService.remove(item.id);
      await loadItems();
      if (editingId === item.id) resetForm();
    } catch (removeError: any) {
      setError(removeError?.message || 'Failed to delete website content.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">{uiText('Public website')}</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{uiText('Website Content Studio')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{uiText('Super Admin controls for school team, community activities, events, and uniform stories.')}</p>
        </div>
        <button type="button" onClick={() => resetForm()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800">
          <Plus size={18} />{uiText('New item')}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {contentTabs.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => switchType(tab.type)}
            className={`rounded-2xl border p-4 text-left transition ${activeType === tab.type
              ? 'border-emerald-700 bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
            }`}
          >
            <tab.icon size={22} />
            <div className="mt-4 font-black">{uiText(tab.label)}</div>
            <p className={`mt-1 text-xs leading-5 ${activeType === tab.type ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>{uiText(tab.hint)}</p>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {uiText(error)}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
        <form onSubmit={saveItem} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-900 dark:text-white">{uiText(editingId ? 'Edit content' : `Add ${activeTab.label}`)}</h2>
              <p className="mt-1 text-xs text-slate-500">{uiText(activeTab.hint)}</p>
            </div>
            {editingId && (
              <button type="button" onClick={() => resetForm()} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label={uiText('Cancel editing')}>
                <X size={18} />
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText(activeType === 'team' ? 'Name' : 'Title')}</span>
              <input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText(activeType === 'team' ? 'Role' : 'Subtitle')}</span>
              <input value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Category')}</span>
              <input value={draft.category} placeholder={activeType === 'team' ? 'Office & management' : activeType === 'community' ? 'Sports, Club, Ceremony...' : 'Student voice'} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Description')}</span>
              <textarea rows={4} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Image file')}</span>
              <input ref={fileInputRef} type="file" accept="image/*" className="w-full text-sm text-slate-500" />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Image URL')}</span>
              <input value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} placeholder={uiText('Paste image URL or upload a file above')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>

            {activeType === 'community' && (
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Event date')}</span>
                <input type="date" value={draft.event_date || ''} onChange={(event) => setDraft({ ...draft, event_date: event.target.value || null })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Order')}</span>
                <input type="number" value={draft.display_order} onChange={(event) => setDraft({ ...draft, display_order: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{uiText('Status')}</span>
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as WebsiteContentStatus })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900">
                  <option value="draft">{uiText('Draft')}</option>
                  <option value="published">{uiText('Published')}</option>
                  <option value="archived">{uiText('Archived')}</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold dark:border-slate-800">
              <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500" />
              {uiText('Feature this item')}
            </label>

            <button disabled={isSaving} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {uiText(editingId ? 'Save changes' : 'Create content')}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex min-h-[24rem] items-center justify-center text-slate-500">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center dark:border-slate-800">
              <Image size={42} className="text-slate-300" />
              <p className="mt-4 font-black text-slate-700 dark:text-slate-200">{uiText('No content added yet')}</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500">{uiText('Create the first item here. Published items will appear on the public website.')}</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleItems.map((item, index) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative aspect-[16/10] bg-slate-200 dark:bg-slate-800">
                    {item.image_url ? (
                      <img src={item.image_url} alt={uiText(item.title)} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400"><Image size={36} /></div>
                    )}
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${item.status === 'published' ? 'bg-emerald-600 text-white' : item.status === 'archived' ? 'bg-slate-700 text-white' : 'bg-amber-400 text-slate-950'}`}>
                      {uiText(item.status)}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">{uiText(item.category || activeTab.label)}</p>
                        <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-white">{uiText(item.title)}</h3>
                        {item.subtitle && <p className="mt-1 text-sm font-bold text-slate-500">{uiText(item.subtitle)}</p>}
                      </div>
                      {item.featured && <Sparkles size={18} className="shrink-0 text-amber-500" />}
                    </div>
                    {item.body && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{uiText(item.body)}</p>}
                    {item.event_date && <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">{uiText(item.event_date)}</p>}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => editItem(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                        <Pencil size={14} />{uiText('Edit')}
                      </button>
                      <button type="button" onClick={() => changeStatus(item, item.status === 'published' ? 'draft' : 'published')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-800">
                        {uiText(item.status === 'published' ? 'Unpublish' : 'Publish')}
                      </button>
                      <button type="button" onClick={() => removeItem(item)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300">
                        <Trash2 size={14} />{uiText('Delete')}
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
