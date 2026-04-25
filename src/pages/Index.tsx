import { useState } from "react";
import Icon from "@/components/ui/icon";

const IMG1 = "https://cdn.poehali.dev/projects/2809e7da-dc49-403f-a2e3-a2a52f64af0c/files/e5edfbb3-2a68-42f5-919d-b64c3b579d65.jpg";
const IMG2 = "https://cdn.poehali.dev/projects/2809e7da-dc49-403f-a2e3-a2a52f64af0c/files/16c2ad5d-cbef-4e9d-933a-ae962e86bb5a.jpg";
const IMG3 = "https://cdn.poehali.dev/projects/2809e7da-dc49-403f-a2e3-a2a52f64af0c/files/6d161257-9068-4c9e-8b8b-920f9796d5e8.jpg";

const VIDEOS = [
  { id: 1, title: "Ночной город: тайны мегаполиса", channel: "DocuWorld", views: "1.2М", time: "23:45", ago: "2 дня назад", thumb: IMG1, duration: "23:45", progress: 0, category: "Документальное" },
  { id: 2, title: "Портрет в тени: техника освещения", channel: "ArtStudio Pro", views: "845K", time: "18:30", ago: "5 дней назад", thumb: IMG2, duration: "18:30", progress: 65, category: "Обучение" },
  { id: 3, title: "Цифровые миры: будущее уже здесь", channel: "TechVision", views: "3.4М", time: "41:12", ago: "1 неделю назад", thumb: IMG3, duration: "41:12", progress: 0, category: "Технологии" },
  { id: 4, title: "Городские огни: ночная съёмка", channel: "DocuWorld", views: "567K", time: "15:22", ago: "3 дня назад", thumb: IMG1, duration: "15:22", progress: 30, category: "Документальное" },
  { id: 5, title: "Как снимать в темноте: мастер-класс", channel: "ArtStudio Pro", views: "2.1М", time: "32:10", ago: "2 недели назад", thumb: IMG2, duration: "32:10", progress: 0, category: "Обучение" },
  { id: 6, title: "Нейросети и визуальный контент", channel: "TechVision", views: "990K", time: "28:55", ago: "4 дня назад", thumb: IMG3, duration: "28:55", progress: 0, category: "Технологии" },
  { id: 7, title: "Архитектура будущего: новый взгляд", channel: "DocuWorld", views: "421K", time: "19:40", ago: "1 месяц назад", thumb: IMG1, duration: "19:40", progress: 0, category: "Документальное" },
  { id: 8, title: "Световые инсталляции мира", channel: "ArtStudio Pro", views: "1.8М", time: "25:08", ago: "3 недели назад", thumb: IMG2, duration: "25:08", progress: 80, category: "Обучение" },
];

const CATEGORIES = ["Все", "Документальное", "Обучение", "Технологии"];

const NAV_ITEMS = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "videos", label: "Видео", icon: "Play" },
  { id: "channel", label: "Канал", icon: "Tv" },
  { id: "subscriptions", label: "Подписки", icon: "Rss" },
  { id: "history", label: "История", icon: "History" },
  { id: "profile", label: "Профиль", icon: "User" },
];

const INIT_PLAYLISTS = [
  { id: 1, name: "Посмотреть позже", count: 4, icon: "Clock" },
  { id: 2, name: "Избранное", count: 12, icon: "Heart" },
  { id: 3, name: "Ночной контент", count: 7, icon: "Moon" },
];

const CHANNELS = [
  { name: "DocuWorld", avatar: "🎬", subs: "890K" },
  { name: "ArtStudio Pro", avatar: "🎨", subs: "1.2М" },
  { name: "TechVision", avatar: "🔬", subs: "2.5М" },
];

type Section = "home" | "videos" | "channel" | "subscriptions" | "history" | "profile" | "search" | "playlists";

export default function Index() {
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<typeof VIDEOS[0] | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlists, setPlaylists] = useState(INIT_PLAYLISTS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [likedVideos, setLikedVideos] = useState<number[]>([]);
  const [savedToPlaylist, setSavedToPlaylist] = useState<number[]>([]);

  const filteredVideos = VIDEOS.filter(v => {
    const matchCat = activeCategory === "Все" || v.category === activeCategory;
    const matchSearch = searchQuery === "" || v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const historyVideos = VIDEOS.filter(v => v.progress > 0);
  const watchLater = VIDEOS.filter(v => savedToPlaylist.includes(v.id));

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    setPlaylists(prev => [...prev, { id: Date.now(), name: newPlaylistName, count: 0, icon: "ListVideo" }]);
    setNewPlaylistName("");
    setShowPlaylistModal(false);
  };

  const toggleLike = (id: number) => {
    setLikedVideos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSave = (id: number) => {
    setSavedToPlaylist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderVideos = (videos: typeof VIDEOS) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video, i) => (
        <div
          key={video.id}
          className={`video-card rounded-xl overflow-hidden cursor-pointer animate-fade-in stagger-${Math.min(i + 1, 6)} group`}
          style={{ background: 'hsl(var(--vid-surface))' }}
          onClick={() => setPlayingVideo(video)}
        >
          <div className="relative aspect-video overflow-hidden">
            <img src={video.thumb} alt={video.title} className="w-full h-full object-cover" />
            <div className="video-thumb-overlay absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--vid-accent))' }}>
                <Icon name="Play" size={20} className="text-white ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.8)', color: 'hsl(var(--vid-text))' }}>
              {video.duration}
            </div>
            {video.progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 progress-bar rounded-none">
                <div className="progress-fill" style={{ width: `${video.progress}%` }} />
              </div>
            )}
            <button
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={(e) => { e.stopPropagation(); toggleSave(video.id); }}
            >
              <Icon name={savedToPlaylist.includes(video.id) ? "BookmarkCheck" : "Bookmark"} size={13} style={{ color: savedToPlaylist.includes(video.id) ? 'hsl(var(--vid-accent))' : 'white' }} />
            </button>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2" style={{ color: 'hsl(var(--vid-text))' }}>
              {video.title}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'hsl(var(--vid-muted))' }}>{video.channel}</span>
              <span className="text-xs" style={{ color: 'hsl(var(--vid-muted))' }}>{video.views}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--vid-muted))' }}>{video.ago}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--vid-bg))', color: 'hsl(var(--vid-text))' }}>
      {/* TOP NAV */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 border-b" style={{ background: 'hsl(var(--vid-surface))', borderColor: 'hsl(var(--vid-border))' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed(p => !p)}
            className="p-1.5 rounded-lg nav-item"
            style={{ color: 'hsl(var(--vid-muted))' }}
          >
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveSection("home")}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--vid-accent))' }}>
              <Icon name="Play" size={14} className="text-white ml-0.5" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide" style={{ color: 'hsl(var(--vid-text))' }}>
              STREAM<span style={{ color: 'hsl(var(--vid-accent))' }}>HUB</span>
            </span>
          </div>
        </div>

        <div className={`flex-1 max-w-md mx-4 transition-all duration-300 ${searchOpen ? 'flex' : 'hidden sm:flex'}`}>
          <div className="w-full flex items-center rounded-full px-4 h-9 gap-2" style={{ background: 'hsl(var(--vid-surface-2))', border: '1px solid hsl(var(--vid-border))' }}>
            <Icon name="Search" size={16} style={{ color: 'hsl(var(--vid-muted))' }} />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setActiveSection("search"); else setActiveSection("home"); }}
              placeholder="Поиск видео..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'hsl(var(--vid-text))' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setActiveSection("home"); }}>
                <Icon name="X" size={14} style={{ color: 'hsl(var(--vid-muted))' }} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="sm:hidden p-1.5 nav-item rounded-lg" style={{ color: 'hsl(var(--vid-muted))' }} onClick={() => setSearchOpen(p => !p)}>
            <Icon name="Search" size={20} />
          </button>
          <button className="p-1.5 nav-item rounded-lg relative" style={{ color: 'hsl(var(--vid-muted))' }}>
            <Icon name="Bell" size={20} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: 'hsl(var(--vid-accent))' }} />
          </button>
          <button
            onClick={() => setActiveSection("profile")}
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}
          >
            А
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside
          className="flex-shrink-0 flex flex-col border-r transition-all duration-300 overflow-y-auto"
          style={{
            width: sidebarCollapsed ? '60px' : '220px',
            background: 'hsl(var(--vid-surface))',
            borderColor: 'hsl(var(--vid-border))',
            minHeight: 'calc(100vh - 56px)'
          }}
        >
          <nav className="flex-1 p-2 space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as Section)}
                className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${activeSection === item.id ? 'active' : ''}`}
                style={{ color: activeSection === item.id ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-muted))' }}
              >
                <Icon name={item.icon as "Home"} size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}

            {!sidebarCollapsed && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--vid-muted))' }}>
                    Плейлисты
                  </div>
                </div>
                {playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => setActiveSection("playlists")}
                    className="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left"
                    style={{ color: 'hsl(var(--vid-muted))' }}
                  >
                    <Icon name={pl.icon as "Clock"} size={16} />
                    <span className="flex-1 truncate">{pl.name}</span>
                    <span className="text-xs" style={{ color: 'hsl(var(--vid-border))' }}>{pl.count}</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowPlaylistModal(true)}
                  className="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left mt-1"
                  style={{ color: 'hsl(var(--vid-accent))' }}
                >
                  <Icon name="Plus" size={16} />
                  <span>Новый плейлист</span>
                </button>
              </>
            )}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">

            {/* HOME */}
            {activeSection === "home" && (
              <div className="animate-fade-in">
                <div
                  className="relative rounded-2xl overflow-hidden mb-8 cursor-pointer"
                  style={{ height: '260px' }}
                  onClick={() => setPlayingVideo(VIDEOS[2])}
                >
                  <img src={IMG3} alt="Featured" className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)' }} />
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 max-w-xs">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full mb-3 inline-block" style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}>
                      🔥 В тренде
                    </span>
                    <h2 className="font-display text-2xl font-bold leading-tight mb-2" style={{ color: 'white' }}>
                      Цифровые миры: будущее уже здесь
                    </h2>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>TechVision · 3.4М просмотров</p>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-transform hover:scale-105" style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}>
                      <Icon name="Play" size={16} />
                      Смотреть
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mb-5 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
                      style={{
                        borderColor: activeCategory === cat ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-border))',
                        color: activeCategory === cat ? 'white' : 'hsl(var(--vid-muted))',
                        background: activeCategory === cat ? 'hsl(var(--vid-accent))' : 'transparent'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--vid-text))' }}>
                    Рекомендации
                  </h2>
                  <span className="text-xs" style={{ color: 'hsl(var(--vid-muted))' }}>{filteredVideos.length} видео</span>
                </div>
                {renderVideos(filteredVideos)}
              </div>
            )}

            {/* VIDEOS */}
            {activeSection === "videos" && (
              <div className="animate-fade-in">
                <h1 className="font-display text-2xl font-bold uppercase tracking-wide mb-6" style={{ color: 'hsl(var(--vid-text))' }}>Все видео</h1>
                <div className="flex gap-2 mb-5 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
                      style={{ borderColor: activeCategory === cat ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-border))', color: activeCategory === cat ? 'white' : 'hsl(var(--vid-muted))', background: activeCategory === cat ? 'hsl(var(--vid-accent))' : 'transparent' }}>
                      {cat}
                    </button>
                  ))}
                </div>
                {renderVideos(filteredVideos)}
              </div>
            )}

            {/* CHANNEL */}
            {activeSection === "channel" && (
              <div className="animate-fade-in">
                <div className="relative rounded-2xl overflow-hidden mb-6 h-36">
                  <img src={IMG3} className="w-full h-full object-cover" alt="channel-bg" />
                  <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
                </div>
                <div className="flex items-end gap-4 mb-8 -mt-10 relative z-10 px-4">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl border-4 flex-shrink-0" style={{ background: 'hsl(var(--vid-surface-2))', borderColor: 'hsl(var(--vid-bg))' }}>
                    🎬
                  </div>
                  <div className="pb-2">
                    <h1 className="font-display text-2xl font-bold" style={{ color: 'hsl(var(--vid-text))' }}>Мой канал</h1>
                    <p className="text-sm" style={{ color: 'hsl(var(--vid-muted))' }}>0 подписчиков · 0 видео</p>
                  </div>
                  <button className="ml-auto mb-2 px-5 py-2 rounded-full text-sm font-semibold" style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}>
                    Загрузить видео
                  </button>
                </div>
                <div className="rounded-xl p-8 text-center" style={{ background: 'hsl(var(--vid-surface))', border: '1px dashed hsl(var(--vid-border))' }}>
                  <Icon name="Video" size={40} className="mx-auto mb-3" style={{ color: 'hsl(var(--vid-muted))' }} />
                  <p className="font-medium" style={{ color: 'hsl(var(--vid-text))' }}>Ваш канал пока пуст</p>
                  <p className="text-sm mt-1" style={{ color: 'hsl(var(--vid-muted))' }}>Загрузите первое видео чтобы начать</p>
                </div>
              </div>
            )}

            {/* SUBSCRIPTIONS */}
            {activeSection === "subscriptions" && (
              <div className="animate-fade-in">
                <h1 className="font-display text-2xl font-bold uppercase tracking-wide mb-6" style={{ color: 'hsl(var(--vid-text))' }}>Подписки</h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {CHANNELS.map(ch => (
                    <div key={ch.name} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'hsl(var(--vid-surface))' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'hsl(var(--vid-surface-2))' }}>
                        {ch.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'hsl(var(--vid-text))' }}>{ch.name}</div>
                        <div className="text-xs" style={{ color: 'hsl(var(--vid-muted))' }}>{ch.subs} подписчиков</div>
                      </div>
                      <button className="text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0" style={{ background: 'hsl(var(--vid-surface-2))', color: 'hsl(var(--vid-accent))', border: '1px solid hsl(var(--vid-accent))' }}>
                        ✓
                      </button>
                    </div>
                  ))}
                </div>
                <h2 className="font-display text-lg font-semibold uppercase tracking-wide mb-4" style={{ color: 'hsl(var(--vid-text))' }}>Свежие видео</h2>
                {renderVideos(VIDEOS.slice(0, 4))}
              </div>
            )}

            {/* HISTORY */}
            {activeSection === "history" && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-2xl font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--vid-text))' }}>История просмотров</h1>
                  <button className="text-sm" style={{ color: 'hsl(var(--vid-muted))' }}>Очистить</button>
                </div>
                {historyVideos.length > 0 ? (
                  <div className="space-y-3">
                    {historyVideos.map((video, i) => (
                      <div
                        key={video.id}
                        className={`flex gap-4 p-3 rounded-xl cursor-pointer animate-fade-in stagger-${i + 1} transition-colors`}
                        style={{ background: 'hsl(var(--vid-surface))' }}
                        onClick={() => setPlayingVideo(video)}
                      >
                        <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                          <img src={video.thumb} className="w-full h-full object-cover" alt={video.title} />
                          <div className="absolute bottom-1 right-1 text-xs px-1 rounded" style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}>{video.duration}</div>
                          <div className="absolute bottom-0 left-0 right-0 progress-bar rounded-none">
                            <div className="progress-fill" style={{ width: `${video.progress}%` }} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--vid-text))' }}>{video.title}</h3>
                          <p className="text-sm" style={{ color: 'hsl(var(--vid-muted))' }}>{video.channel}</p>
                          <p className="text-xs mt-1" style={{ color: 'hsl(var(--vid-muted))' }}>Просмотрено {video.progress}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl p-10 text-center" style={{ background: 'hsl(var(--vid-surface))' }}>
                    <Icon name="History" size={40} className="mx-auto mb-3" style={{ color: 'hsl(var(--vid-muted))' }} />
                    <p style={{ color: 'hsl(var(--vid-muted))' }}>История просмотров пуста</p>
                  </div>
                )}
              </div>
            )}

            {/* SEARCH */}
            {activeSection === "search" && (
              <div className="animate-fade-in">
                <h1 className="font-display text-xl font-bold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--vid-text))' }}>
                  Результаты поиска
                </h1>
                <p className="text-sm mb-6" style={{ color: 'hsl(var(--vid-muted))' }}>
                  По запросу «{searchQuery}»: {filteredVideos.length} видео
                </p>
                {filteredVideos.length > 0 ? renderVideos(filteredVideos) : (
                  <div className="text-center py-16">
                    <Icon name="SearchX" size={48} className="mx-auto mb-4" style={{ color: 'hsl(var(--vid-muted))' }} />
                    <p style={{ color: 'hsl(var(--vid-muted))' }}>Ничего не найдено</p>
                  </div>
                )}
              </div>
            )}

            {/* PLAYLISTS */}
            {activeSection === "playlists" && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-2xl font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--vid-text))' }}>Мои плейлисты</h1>
                  <button
                    onClick={() => setShowPlaylistModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                    style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}
                  >
                    <Icon name="Plus" size={16} />
                    Создать
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {playlists.map((pl, i) => (
                    <div key={pl.id} className={`p-5 rounded-xl cursor-pointer animate-fade-in stagger-${i + 1} hover:scale-[1.02] transition-transform`} style={{ background: 'hsl(var(--vid-surface))', border: '1px solid hsl(var(--vid-border))' }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'hsl(var(--vid-surface-2))' }}>
                        <Icon name={pl.icon as "Clock"} size={22} style={{ color: 'hsl(var(--vid-accent))' }} />
                      </div>
                      <h3 className="font-semibold" style={{ color: 'hsl(var(--vid-text))' }}>{pl.name}</h3>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--vid-muted))' }}>{pl.count} видео</p>
                    </div>
                  ))}
                </div>
                {watchLater.length > 0 && (
                  <>
                    <h2 className="font-display text-lg font-semibold uppercase tracking-wide mb-4" style={{ color: 'hsl(var(--vid-text))' }}>Сохранённые видео</h2>
                    {renderVideos(watchLater)}
                  </>
                )}
                {watchLater.length === 0 && (
                  <div className="rounded-xl p-8 text-center" style={{ background: 'hsl(var(--vid-surface))', border: '1px dashed hsl(var(--vid-border))' }}>
                    <Icon name="Bookmark" size={36} className="mx-auto mb-3" style={{ color: 'hsl(var(--vid-muted))' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--vid-muted))' }}>Сохраните видео, нажав иконку закладки</p>
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            {activeSection === "profile" && (
              <div className="animate-fade-in max-w-lg">
                <h1 className="font-display text-2xl font-bold uppercase tracking-wide mb-6" style={{ color: 'hsl(var(--vid-text))' }}>Профиль</h1>
                <div className="rounded-2xl p-6 mb-4" style={{ background: 'hsl(var(--vid-surface))' }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}>
                      А
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg" style={{ color: 'hsl(var(--vid-text))' }}>Алексей</h2>
                      <p className="text-sm" style={{ color: 'hsl(var(--vid-muted))' }}>alexey@example.com</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[["Подписки", "3"], ["Плейлисты", playlists.length.toString()], ["Понравилось", likedVideos.length.toString()]].map(([label, val]) => (
                      <div key={label} className="rounded-xl py-3" style={{ background: 'hsl(var(--vid-surface-2))' }}>
                        <div className="font-display text-xl font-bold" style={{ color: 'hsl(var(--vid-accent))' }}>{val}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--vid-muted))' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(var(--vid-surface))' }}>
                  {[["User", "Редактировать профиль"], ["Bell", "Уведомления"], ["Shield", "Конфиденциальность"], ["LogOut", "Выйти"]].map(([icon, label]) => (
                    <button key={label} className="w-full flex items-center gap-3 px-5 py-4 text-sm nav-item border-b last:border-b-0 text-left" style={{ borderColor: 'hsl(var(--vid-border))', color: 'hsl(var(--vid-text))' }}>
                      <Icon name={icon as "User"} size={18} style={{ color: 'hsl(var(--vid-muted))' }} />
                      {label}
                      <Icon name="ChevronRight" size={16} className="ml-auto" style={{ color: 'hsl(var(--vid-border))' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* VIDEO PLAYER MODAL */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setPlayingVideo(null); }}
        >
          <div className="w-full max-w-4xl rounded-2xl overflow-hidden animate-scale-in" style={{ background: 'hsl(var(--vid-surface))' }}>
            <div className="relative aspect-video">
              <img src={playingVideo.thumb} alt={playingVideo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-glow cursor-pointer" style={{ background: 'hsl(var(--vid-accent))' }}>
                  <Icon name="Play" size={36} className="text-white ml-1" />
                </div>
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
              >
                <Icon name="X" size={16} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                <div className="flex items-center gap-2 mb-2">
                  <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                    <Icon name="Play" size={16} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                    <Icon name="Volume2" size={16} />
                  </button>
                  <div className="flex-1 progress-bar cursor-pointer">
                    <div className="progress-fill" style={{ width: `${playingVideo.progress || 15}%` }} />
                  </div>
                  <span className="text-xs text-white">{playingVideo.duration}</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                    <Icon name="Maximize2" size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl font-bold mb-2" style={{ color: 'hsl(var(--vid-text))' }}>{playingVideo.title}</h2>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-sm" style={{ color: 'hsl(var(--vid-text))' }}>{playingVideo.channel}</span>
                  <span className="text-sm ml-3" style={{ color: 'hsl(var(--vid-muted))' }}>{playingVideo.views} просмотров · {playingVideo.ago}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLike(playingVideo.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: likedVideos.includes(playingVideo.id) ? 'hsl(var(--vid-accent) / 0.15)' : 'hsl(var(--vid-surface-2))',
                      color: likedVideos.includes(playingVideo.id) ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-muted))',
                      border: `1px solid ${likedVideos.includes(playingVideo.id) ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-border))'}`
                    }}
                  >
                    <Icon name="ThumbsUp" size={15} />
                    Нравится
                  </button>
                  <button
                    onClick={() => toggleSave(playingVideo.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: savedToPlaylist.includes(playingVideo.id) ? 'hsl(var(--vid-accent) / 0.15)' : 'hsl(var(--vid-surface-2))',
                      color: savedToPlaylist.includes(playingVideo.id) ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-muted))',
                      border: `1px solid ${savedToPlaylist.includes(playingVideo.id) ? 'hsl(var(--vid-accent))' : 'hsl(var(--vid-border))'}`
                    }}
                  >
                    <Icon name="Bookmark" size={15} />
                    Сохранить
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: 'hsl(var(--vid-surface-2))', color: 'hsl(var(--vid-muted))', border: '1px solid hsl(var(--vid-border))' }}>
                    <Icon name="Share2" size={15} />
                    Поделиться
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showPlaylistModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPlaylistModal(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 animate-scale-in" style={{ background: 'hsl(var(--vid-surface))' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide" style={{ color: 'hsl(var(--vid-text))' }}>Новый плейлист</h2>
              <button onClick={() => setShowPlaylistModal(false)} style={{ color: 'hsl(var(--vid-muted))' }}>
                <Icon name="X" size={20} />
              </button>
            </div>
            <input
              autoFocus
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createPlaylist()}
              placeholder="Название плейлиста..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ background: 'hsl(var(--vid-surface-2))', border: '1px solid hsl(var(--vid-border))', color: 'hsl(var(--vid-text))' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPlaylistModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'hsl(var(--vid-surface-2))', color: 'hsl(var(--vid-muted))' }}
              >
                Отмена
              </button>
              <button
                onClick={createPlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: 'hsl(var(--vid-accent))', color: 'white' }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
