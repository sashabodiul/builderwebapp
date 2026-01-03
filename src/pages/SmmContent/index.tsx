import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Image as ImageIcon, Video, ExternalLink } from 'lucide-react';
import { getFacilities, FacilityOut } from '@/requests/facility';
import { fetchMediaByObjectId, convertS3Url, MediaItem } from '@/requests/media';
import { toastError } from '@/lib/toasts';
import useBackButton from '@/hooks/useBackButton';
import ImageViewer from '@/components/ui/ImageViewer';
import i18n from '@/i18n/config';

const PAGE_LIMIT = 20;

const SmmContent: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.data.user);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [page, setPage] = useState(1);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useBackButton('/');

  useEffect(() => {
    const loadFacilities = async () => {
      setLoadingFacilities(true);
      setError(null);
      try {
        const response = await getFacilities();
        if (response.error) {
          throw new Error(t('smm.errorLoadingFacilities', 'Не удалось загрузить объекты'));
        }
        const data = response.data || [];
        setFacilities(Array.isArray(data) ? data : []);
        // Авто-выбор первого элемента при пустом выборе
        if (!selectedId && Array.isArray(data) && data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (e: any) {
        setError(e?.message ?? t('smm.error', 'Ошибка загрузки'));
        toastError(e?.message ?? t('smm.error', 'Ошибка загрузки'));
      } finally {
        setLoadingFacilities(false);
      }
    };
    loadFacilities();
  }, [page, t]);

  useEffect(() => {
    const loadMedia = async () => {
      if (!selectedId) {
        setMedia([]);
        return;
      }
      setLoadingMedia(true);
      setMediaError(null);
      try {
        const data = await fetchMediaByObjectId(selectedId, 50, 0);
        setMedia(Array.isArray(data?.items) ? data.items : []);
      } catch (e: any) {
        setMediaError(e?.message ?? t('smm.errorLoadingMedia', 'Ошибка загрузки медиа'));
        toastError(e?.message ?? t('smm.errorLoadingMedia', 'Ошибка загрузки медиа'));
      } finally {
        setLoadingMedia(false);
      }
    };
    loadMedia();
  }, [selectedId, t]);

  const selected = useMemo(
    () => facilities.find(f => f.id === selectedId) ?? null,
    [facilities, selectedId]
  );

  // Разделяем медиа на фото и видео
  const photos = useMemo(() => media.filter(m => {
    const contentType = m.content_type?.toLowerCase() || '';
    return contentType.startsWith('image/');
  }), [media]);

  const videos = useMemo(() => media.filter(m => {
    const contentType = m.content_type?.toLowerCase() || '';
    return contentType.startsWith('video/');
  }), [media]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback: открываем в новой вкладке
      window.open(url, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = {
      'ru': 'ru-RU',
      'en': 'en-US',
      'de': 'de-DE',
      'uk': 'uk-UA'
    };
    const locale = localeMap[i18n.language] || 'en-US';
    return date.toLocaleString(locale);
  };

  return (
    <div className="min-h-screen page bg-theme-bg-primary" style={{ paddingTop: '16rem', marginTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Mobile: Full width, Desktop: Sidebar + Content */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-16rem)]">
        {/* Sidebar - Mobile: Full width, Desktop: Fixed width */}
        <div className="w-full md:w-80 bg-theme-bg-card md:border-r border-b md:border-b-0 border-theme-border overflow-y-auto">
          <div className="p-3 md:p-4 border-b border-theme-border sticky top-0 bg-theme-bg-card z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-theme-bg-tertiary rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-theme-text-primary" />
              </button>
              <h1 className="text-lg md:text-xl font-bold text-theme-text-primary">{t('smm.groups', 'Группы')}</h1>
            </div>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg m-4">
              {t('smm.error', 'Ошибка')}: {error}
            </div>
          )}

          {loadingFacilities && (
            <div className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-16 bg-theme-bg-tertiary rounded"></div>
                <div className="h-16 bg-theme-bg-tertiary rounded"></div>
              </div>
            </div>
          )}

          <ul className="p-2 space-y-2">
            {facilities.map(item => (
              <li
                key={item.id}
                className={`p-2 md:p-3 rounded-lg cursor-pointer transition-all ${
                  selectedId === item.id
                    ? 'bg-theme-accent/10 border-2 border-theme-accent'
                    : 'bg-theme-bg-tertiary border-2 border-transparent hover:border-theme-accent/50'
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="font-semibold text-sm md:text-base text-theme-text-primary mb-1 truncate">
                  {item.name || `${t('smm.object', 'Объект')} #${item.id}`}
                </div>
                {item.invite_link && (
                  <div className="text-xs text-theme-text-muted">
                    {t('smm.hasInviteLink', 'Есть ссылка')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-theme-text-primary">
                  {selected?.name ?? t('smm.contentByGroup', 'Контент по группам')}
                </h2>
                {selected?.invite_link && (
                  <a
                    href={selected.invite_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 md:px-4 bg-theme-accent text-white rounded-lg hover:bg-theme-accent/90 transition-colors text-sm md:text-base w-full sm:w-auto justify-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('smm.goToGroup', 'Перейти в группу')}
                  </a>
                )}
              </div>
              {selected && (
                <div className="text-sm text-theme-text-secondary space-y-1">
                  <div><b>{t('smm.objectId', 'ID объекта')}</b>: {selected.id}</div>
                  {selected.latitude && selected.longitude && (
                    <div>
                      <b>{t('smm.coordinates', 'Координаты')}</b>: {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {mediaError && (
              <div className="p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg mb-4">
                {t('smm.error', 'Ошибка')}: {mediaError}
              </div>
            )}

            {loadingMedia && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-accent"></div>
              </div>
            )}

            {!loadingMedia && media.length === 0 && (
              <div className="text-center py-12 text-theme-text-secondary">
                {t('smm.noMediaFound', 'Медиа не найдено')}
              </div>
            )}

            {!loadingMedia && photos.length > 0 && (
              <div className="mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-semibold text-theme-text-primary mb-3 md:mb-4 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                  {t('smm.photos', 'Фотографии')} ({photos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                  {photos.map(m => {
                    const photoUrl = convertS3Url(m.s3_path);
                    return (
                      <div key={m.id} className="relative group bg-theme-bg-card rounded-lg overflow-hidden border border-theme-border">
                        <div
                          className="cursor-pointer aspect-square"
                          onClick={() => setSelectedImage(photoUrl)}
                        >
                          <img
                            src={photoUrl}
                            alt={m.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 active:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100">
                          <button
                            className="p-2 bg-white/90 rounded-full hover:bg-white active:bg-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(photoUrl, m.filename);
                            }}
                            title={t('smm.download', 'Скачать')}
                          >
                            <Download className="h-4 w-4 text-theme-text-primary" />
                          </button>
                        </div>
                        <div className="p-2 text-xs text-theme-text-secondary">
                          <div className="truncate">{m.filename}</div>
                          <div>{formatDate(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loadingMedia && videos.length > 0 && (
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-theme-text-primary mb-3 md:mb-4 flex items-center gap-2">
                  <Video className="h-4 w-4 md:h-5 md:w-5" />
                  {t('smm.videos', 'Видео')} ({videos.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {videos.map(m => {
                    const videoUrl = convertS3Url(m.s3_path);
                    return (
                      <div key={m.id} className="bg-theme-bg-card rounded-lg overflow-hidden border border-theme-border">
                        <div className="relative">
                          <video
                            controls
                            preload="metadata"
                            className="w-full"
                            title={`${m.filename} • ${m.content_type}`}
                          >
                            <source src={videoUrl} type={m.content_type || 'video/mp4'} />
                            <source src={videoUrl} type="video/mp4" />
                            {t('smm.videoNotSupported', 'Ваш браузер не поддерживает видео.')}{' '}
                            <a href={videoUrl} target="_blank" rel="noreferrer">
                              {t('smm.downloadFile', 'Скачайте файл')}
                            </a>
                          </video>
                          <button
                            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                            onClick={() => downloadFile(videoUrl, m.filename)}
                            title={t('smm.download', 'Скачать')}
                          >
                            <Download className="h-4 w-4 text-theme-text-primary" />
                          </button>
                        </div>
                        <div className="p-3 text-sm text-theme-text-secondary">
                          <div className="truncate font-medium">{m.filename}</div>
                          <div className="text-xs mt-1">{formatDate(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
};

export default SmmContent;

