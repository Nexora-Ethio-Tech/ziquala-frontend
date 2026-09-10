import { uiText } from "../localization";
import { useState, useRef, useEffect } from 'react';
import { formatEthiopianLabel } from '../utils/ethiopianCalendar';
import { Megaphone, Plus, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

// Updated to strictly match your new PostgreSQL schema
interface PublicPost {
  id: string; // uuid
  post_text: string;
  image_url: string;
  media_type: 'image' | 'video';
  created_at: string;
}

export const WebsitePosts = () => {
  const { t } = useTranslation();

  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'image' | 'video'>('image');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/super-admin/public-post');
      setPosts(response.data.data)
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle post deletion
  const deletePublicPost = async (id: string) => {
    if (!window.confirm(t('websitePosts.confirmDelete', 'Are you sure you want to delete this post?'))) return;
    const deletePayload = {
      id: id
    };
    try {
      const response = await api.delete(`/super-admin/public-post`, { data: deletePayload });
      setPosts((prev) => prev.filter((post) => post.id !== id));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <Megaphone size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('websitePosts.title')}</h3>
              <p className="text-xs text-slate-500">{t('websitePosts.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <Plus size={16} />
            <span className="hidden xs:inline">{t('websitePosts.addPost')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            <div className="p-12 col-span-full flex justify-center items-center text-slate-500">
              <Loader2 size={32} className="animate-spin text-purple-500" />
            </div>
          ) : posts?.length === 0 ? (
            <div className="p-12 col-span-full text-center text-slate-500 text-sm">
              <Megaphone size={40} className="mx-auto text-slate-300 mb-4" />
              {t('websitePosts.noPosts')}
            </div>
          ) : (
            posts?.map((post) => {
              const isVideo = post.media_type === 'video';

              return (
                <div key={post.id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                      {uiText(isVideo ? t('websitePosts.videoType', 'Video') : t('websitePosts.imageType', 'Image'))}
                    </span>
                    <button
                      onClick={() => deletePublicPost(post.id)}
                      className="text-rose-500 hover:text-rose-600 text-xs font-bold uppercase"
                    >
                      {t('websitePosts.delete')}
                    </button>
                  </div>
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 overflow-hidden shadow-inner">
                    {!isVideo ? (
                      <img src={post.image_url} alt={uiText("Post media")} className="w-full h-full object-cover" />
                    ) : (
                      <iframe src={post.image_url} title={uiText("Post media content")} className="w-full h-full pointer-events-none" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                    {uiText(post.post_text)}
                  </p>
                  <div className="mt-auto pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      {/* Maps to the created_at DATE column */}
                      {uiText(formatEthiopianLabel(post.created_at || new Date().toISOString()))}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showPostModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-sm">{t('websitePosts.addModalTitle')}</h3>
              <button
                type="button"
                title={uiText("Close add post modal")}
                onClick={() => !isSubmitting && setShowPostModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isSubmitting}
              >
                <X size={20} />
              </button>
            </div>
            <form
              className="p-6 space-y-4 flex-1 overflow-y-auto"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);

                try {
                  const form = e.currentTarget as HTMLFormElement;
                  const formData = new FormData(form);
                  const type = formData.get('media_type') as 'image' | 'video';
                  let mediaUrl = formData.get('mediaUrl') as string;

                  // If image and a local file was selected, read it to a data URL
                  if (type === 'image') {
                    const fileInput = fileInputRef.current;
                    const file = fileInput?.files && fileInput.files[0];
                    if (file) {
                      mediaUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = (err) => reject(err);
                        reader.readAsDataURL(file);
                      });
                    }
                  }

                  // Strictly matches database columns (excluding id and created_at which DB handles)
                  const postPayload = {
                    image_url: mediaUrl,
                    post_text: formData.get('post_text') as string,
                    media_type: type,
                  };

                  try {
                    const response = await api.post('/super-admin/public-post', postPayload);
                    await fetchPosts();
                    setShowPostModal(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                  catch (err) {
                    console.error('Failed to create public post');
                  }

                } catch (error) {
                  console.error('Error creating post:', error);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('websitePosts.mediaType')}</label>
                <select
                  name="media_type"
                  title={uiText("Select media type (image or video)")}
                  required
                  value={selectedType}
                  onChange={(ev) => setSelectedType(ev.target.value as 'image' | 'video')}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                >
                  <option value="image">{t('websitePosts.imageType', 'Image')}</option>
                  <option value="video">{t('websitePosts.videoType', 'Video')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('websitePosts.mediaUrl')}</label>
                {selectedType === 'image' ? (
                  <>
                    <input
                      ref={fileInputRef}
                      name="mediaFile"
                      accept="image/*"
                      type="file"
                      disabled={isSubmitting}
                      title={uiText("Select image file to upload")}
                      className="w-full text-sm disabled:opacity-50"
                    />
                    <div className="text-xs text-slate-400 mt-1">{uiText("Or paste an image URL below")}</div>
                    <input
                      name="mediaUrl"
                      type="url"
                      title={uiText("Enter media URL")}
                      placeholder={uiText("https://example.com/image.jpg (optional)")}
                      disabled={isSubmitting}
                      className="w-full mt-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                    />
                  </>
                ) : (
                  <input
                    name="mediaUrl"
                    required
                    type="url"
                    title={uiText("Enter video URL")}
                    placeholder={uiText("https://example.com/video.mp4")}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">{t('websitePosts.description')}</label>
                <textarea
                  name="post_text"
                  required
                  rows={3}
                  disabled={isSubmitting}
                  placeholder={t('websitePosts.placeholderDesc')}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Megaphone size={18} />}
                  <span>{uiText(isSubmitting ? t('websitePosts.publishing', 'Publishing...') : t('websitePosts.publish'))}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};