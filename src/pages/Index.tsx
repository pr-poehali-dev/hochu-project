import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { api, uploadToS3, timeAgo, formatDuration } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────
interface User { id: number; username: string; email: string; display_name: string; avatar_url?: string; description?: string; donate_qr_url?: string; theme: string; }
interface Video { id: number; title: string; description?: string; video_url: string; thumbnail_url?: string; duration: number; views_count: number; created_at: string; author: { id: number; username: string; display_name: string; avatar_url?: string; description?: string; donate_qr_url?: string; }; likes: number; dislikes: number; }
interface Comment { id: number; text: string; created_at: string; author: { id: number; username: string; display_name: string; avatar_url?: string; }; }
type Section = "home" | "upload" | "settings" | "profile_edit" | "channel";

// ─── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 32 }: { url?: string; name?: string; size?: number }) {
  const letter = (name || "?")[0].toUpperCase();
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "hsl(var(--vid-accent))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {letter}
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }: { onAuth: (u: User, sid: string) => void }) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ login: "", username: "", email: "", password: "", display_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const res = tab === "login"
        ? await api.auth.login({ login: form.login, password: form.password })
        : await api.auth.register({ username: form.username, email: form.email, password: form.password, display_name: form.display_name || form.username });
      if (res.error) { setError(res.error); return; }
      localStorage.setItem("yuvist_session", res.session_id);
      onAuth(res.user, res.session_id);
    } catch { setError("Ошибка сети"); }
    finally { setLoading(false); }
  };

  const inp = (placeholder: string, key: keyof typeof form, type = "text") => (
    <input type={type} placeholder={placeholder} value={form[key]}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      onKeyDown={e => e.key === "Enter" && submit()}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none"
      style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(var(--vid-bg))" }}>
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--vid-accent))" }}>
            <Icon name="Play" size={32} className="text-white ml-1" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[0.2em]" style={{ color: "hsl(var(--vid-text))" }}>ЮВИСТ</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--vid-muted))" }}>Видеоплатформа</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "hsl(var(--vid-surface))" }}>
          <div className="flex rounded-xl overflow-hidden mb-5" style={{ background: "hsl(var(--vid-surface-2))" }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={{ background: tab === t ? "hsl(var(--vid-accent))" : "transparent", color: tab === t ? "white" : "hsl(var(--vid-muted))" }}>
                {t === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {tab === "login" ? <>{inp("Логин или email", "login")}{inp("Пароль", "password", "password")}</>
              : <>{inp("Логин (уникальный)", "username")}{inp("Email", "email", "email")}{inp("Имя для отображения", "display_name")}{inp("Пароль (мин. 6 символов)", "password", "password")}</>}
          </div>
          {error && <p className="text-sm mt-3 text-center" style={{ color: "hsl(14 100% 57%)" }}>{error}</p>}
          <button onClick={submit} disabled={loading}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm disabled:opacity-60 transition-opacity"
            style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
            {loading ? "Загрузка..." : tab === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────
function VideoPlayer({ video, user, onClose }: { video: Video; user: User | null; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("auto");
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [likes, setLikes] = useState(Number(video.likes) || 0);
  const [dislikes, setDislikes] = useState(Number(video.dislikes) || 0);
  const [myReaction, setMyReaction] = useState<boolean | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [viewCounted, setViewCounted] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  useEffect(() => {
    api.videos.likes(video.id).then(r => { if (!r.error) { setLikes(Number(r.likes)||0); setDislikes(Number(r.dislikes)||0); setMyReaction(r.my_reaction); } });
    api.videos.comments(video.id).then(r => { if (!r.error) setComments(r.comments || []); });
  }, [video.id]);

  const handleTimeUpdate = () => {
    const v = videoRef.current; if (!v) return;
    setCurrentTime(v.currentTime);
    if (!viewCounted && user && v.currentTime > 10) { setViewCounted(true); api.videos.view(video.id); }
  };

  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (playing) { v.pause(); } else { v.play(); } };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current; if (!v || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * duration;
  };
  const changeSpeed = (s: number) => { if (videoRef.current) videoRef.current.playbackRate = s; setSpeed(s); setShowSpeedMenu(false); };

  const handleLike = async (isLike: boolean) => {
    if (!user) return;
    const r = await api.videos.like(video.id, isLike);
    if (!r.error) { setLikes(Number(r.likes)||0); setDislikes(Number(r.dislikes)||0); setMyReaction(r.my_reaction); }
  };

  const submitComment = async () => {
    if (!user || !commentText.trim()) return;
    const r = await api.videos.comment(video.id, commentText);
    if (!r.error) { setComments(p => [...p, r.comment]); setCommentText(""); }
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl animate-scale-in" style={{ background: "hsl(var(--vid-surface))" }}>
        {/* Video */}
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          <video ref={videoRef} src={video.video_url} className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            style={{ objectFit: "contain" }} />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-glow" style={{ background: "hsl(var(--vid-accent))" }}>
                <Icon name="Play" size={36} className="text-white ml-1" />
              </div>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", color: "white" }}>
            <Icon name="X" size={16} />
          </button>
          {/* Controls bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
            <div className="progress-bar cursor-pointer mb-2" onClick={seek}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={togglePlay} style={{ color: "white" }}><Icon name={playing ? "Pause" : "Play"} size={18} /></button>
              <span className="text-xs text-white">{formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}</span>
              <button onClick={() => { setMuted(m => !m); if (videoRef.current) videoRef.current.muted = !muted; }} style={{ color: "white" }}>
                <Icon name={muted ? "VolumeX" : "Volume2"} size={16} />
              </button>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={e => { const v = Number(e.target.value); setVolume(v); if (videoRef.current) videoRef.current.volume = v; }}
                className="w-16 h-1" style={{ accentColor: "hsl(var(--vid-accent))" }} />
              <div className="ml-auto flex items-center gap-1">
                <div className="relative">
                  <button onClick={() => { setShowSpeedMenu(s => !s); setShowQualityMenu(false); }} className="px-2 py-1 rounded text-xs font-medium" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>{speed}x</button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-8 right-0 rounded-xl overflow-hidden z-10 w-20 shadow-xl" style={{ background: "hsl(var(--vid-surface))" }}>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                        <button key={s} onClick={() => changeSpeed(s)} className="w-full px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: speed === s ? "hsl(var(--vid-accent))" : "hsl(var(--vid-text))" }}>{s}x</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button onClick={() => { setShowQualityMenu(s => !s); setShowSpeedMenu(false); }} className="px-2 py-1 rounded text-xs font-medium" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>{quality}</button>
                  {showQualityMenu && (
                    <div className="absolute bottom-8 right-0 rounded-xl overflow-hidden z-10 w-20 shadow-xl" style={{ background: "hsl(var(--vid-surface))" }}>
                      {["auto", "1080p", "720p", "480p", "360p"].map(q => (
                        <button key={q} onClick={() => { setQuality(q); setShowQualityMenu(false); }} className="w-full px-3 py-2 text-xs text-left hover:opacity-80" style={{ color: quality === q ? "hsl(var(--vid-accent))" : "hsl(var(--vid-text))" }}>{q}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => videoRef.current?.requestFullscreen()} style={{ color: "white" }}><Icon name="Maximize2" size={16} /></button>
              </div>
            </div>
          </div>
        </div>
        {/* Info */}
        <div className="p-5">
          <h2 className="font-display text-xl font-bold mb-3" style={{ color: "hsl(var(--vid-text))" }}>{video.title}</h2>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <Avatar url={video.author.avatar_url} name={video.author.display_name} size={36} />
            <div>
              <div className="font-semibold text-sm" style={{ color: "hsl(var(--vid-text))" }}>{video.author.display_name || video.author.username}</div>
              <div className="text-xs" style={{ color: "hsl(var(--vid-muted))" }}>{video.views_count} просмотров · {timeAgo(video.created_at)}</div>
            </div>
            <div className="ml-auto flex gap-2 flex-wrap">
              <button onClick={() => handleLike(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: myReaction === true ? "hsl(var(--vid-accent)/0.15)" : "hsl(var(--vid-surface-2))", color: myReaction === true ? "hsl(var(--vid-accent))" : "hsl(var(--vid-muted))", border: `1px solid ${myReaction === true ? "hsl(var(--vid-accent))" : "hsl(var(--vid-border))"}` }}>
                <Icon name="ThumbsUp" size={14} />{likes}
              </button>
              <button onClick={() => handleLike(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: myReaction === false ? "hsl(14 100% 57% / 0.15)" : "hsl(var(--vid-surface-2))", color: myReaction === false ? "hsl(14 100% 57%)" : "hsl(var(--vid-muted))", border: `1px solid ${myReaction === false ? "hsl(14 100% 57%)" : "hsl(var(--vid-border))"}` }}>
                <Icon name="ThumbsDown" size={14} />{dislikes}
              </button>
              {video.author.donate_qr_url && (
                <button onClick={() => setShowDonate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
                  <Icon name="Heart" size={14} />Спонсировать
                </button>
              )}
            </div>
          </div>
          {video.description && (
            <div className="text-sm rounded-xl p-3 mb-4" style={{ background: "hsl(var(--vid-surface-2))", color: "hsl(var(--vid-muted))" }}>{video.description}</div>
          )}
          {/* Comments */}
          <div className="border-t pt-4" style={{ borderColor: "hsl(var(--vid-border))" }}>
            <h3 className="font-semibold mb-3" style={{ color: "hsl(var(--vid-text))" }}>Комментарии ({comments.length})</h3>
            {user && (
              <div className="flex gap-3 mb-4">
                <Avatar url={user.avatar_url} name={user.display_name} size={32} />
                <div className="flex-1 flex gap-2">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitComment()}
                    placeholder="Написать комментарий..."
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />
                  <button onClick={submitComment} disabled={!commentText.trim()} className="px-4 py-2 rounded-xl disabled:opacity-40"
                    style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
                    <Icon name="Send" size={16} />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar url={c.author.avatar_url} name={c.author.display_name} size={28} />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: "hsl(var(--vid-text))" }}>{c.author.display_name || c.author.username}</span>
                      <span className="text-xs" style={{ color: "hsl(var(--vid-muted))" }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm" style={{ color: "hsl(var(--vid-text))" }}>{c.text}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-center py-4" style={{ color: "hsl(var(--vid-muted))" }}>Комментариев пока нет</p>}
            </div>
          </div>
        </div>
      </div>
      {/* Donate modal */}
      {showDonate && video.author.donate_qr_url && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop" onClick={() => setShowDonate(false)}>
          <div className="rounded-2xl p-6 text-center animate-scale-in" style={{ background: "hsl(var(--vid-surface))" }} onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-4" style={{ color: "hsl(var(--vid-text))" }}>Поддержать автора</h3>
            <img src={video.author.donate_qr_url} alt="QR донат" className="w-48 h-48 mx-auto rounded-xl object-contain" />
            <p className="text-sm mt-3" style={{ color: "hsl(var(--vid-muted))" }}>Отсканируйте QR-код</p>
            <button onClick={() => setShowDonate(false)} className="mt-4 px-5 py-2 rounded-full text-sm" style={{ background: "hsl(var(--vid-surface-2))", color: "hsl(var(--vid-muted))" }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ video, onClick, idx }: { video: Video; onClick: () => void; idx: number }) {
  return (
    <div className={`video-card rounded-xl overflow-hidden cursor-pointer animate-fade-in stagger-${Math.min(idx + 1, 6)} group`}
      style={{ background: "hsl(var(--vid-surface))" }} onClick={onClick}>
      <div className="relative aspect-video overflow-hidden" style={{ background: "hsl(var(--vid-surface-2))" }}>
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Icon name="Video" size={32} style={{ color: "hsl(var(--vid-muted))" }} /></div>
        }
        <div className="video-thumb-overlay absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--vid-accent))" }}>
            <Icon name="Play" size={20} className="text-white ml-0.5" />
          </div>
        </div>
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.8)", color: "white" }}>
            {formatDuration(video.duration)}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex gap-2">
          <Avatar url={video.author.avatar_url} name={video.author.display_name} size={30} />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2" style={{ color: "hsl(var(--vid-text))" }}>{video.title}</h3>
            <div className="text-xs mt-0.5" style={{ color: "hsl(var(--vid-muted))" }}>{video.author.display_name || video.author.username}</div>
            <div className="text-xs" style={{ color: "hsl(var(--vid-muted))" }}>{video.views_count} просм. · {timeAgo(video.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function UploadPage({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const submit = async () => {
    if (!title.trim() || !videoFile) { setError("Укажите название и выберите видео"); return; }
    setLoading(true); setError(""); setProgress(0);
    try {
      // Получаем длительность видео
      setStage("Анализ видео...");
      const vidEl = document.createElement("video");
      vidEl.src = URL.createObjectURL(videoFile);
      const dur = await new Promise<number>(res => {
        vidEl.onloadedmetadata = () => res(Math.floor(vidEl.duration));
        vidEl.onerror = () => res(0);
        setTimeout(() => res(0), 5000);
      });

      // Загружаем видео напрямую в S3
      setStage("Загрузка видео...");
      const videoUrl = await uploadToS3(videoFile, "video", (pct) => setProgress(Math.round(pct * 0.85)));

      // Загружаем обложку если есть
      let thumbnailUrl: string | undefined;
      if (thumbFile) {
        setStage("Загрузка обложки...");
        thumbnailUrl = await uploadToS3(thumbFile, "thumbnail", () => {});
      }

      setProgress(90);
      setStage("Сохранение...");

      // Сохраняем в БД
      const r = await api.videos.save({ title, description, video_url: videoUrl, thumbnail_url: thumbnailUrl, duration: dur });
      if (r.error) { setError(r.error); return; }
      setProgress(100);
      setStage("Готово!");
      setTimeout(() => onUploaded(), 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide mb-6" style={{ color: "hsl(var(--vid-text))" }}>Загрузить видео</h1>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "hsl(var(--vid-surface))" }}>
        <label className="flex flex-col items-center justify-center w-full h-36 rounded-xl cursor-pointer"
          style={{ border: `2px dashed ${videoFile ? "hsl(var(--vid-accent))" : "hsl(var(--vid-border))"}`, background: videoFile ? "hsl(var(--vid-accent)/0.08)" : "transparent" }}>
          <Icon name="Upload" size={30} style={{ color: videoFile ? "hsl(var(--vid-accent))" : "hsl(var(--vid-muted))" }} />
          <span className="text-sm mt-2 font-medium" style={{ color: videoFile ? "hsl(var(--vid-accent))" : "hsl(var(--vid-muted))" }}>
            {videoFile ? videoFile.name : "Нажмите для выбора видео (MP4, WebM, MOV)"}
          </span>
          <span className="text-xs mt-1" style={{ color: "hsl(var(--vid-muted))" }}>
            {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} МБ` : "Без ограничений по размеру"}
          </span>
          <input type="file" accept="video/*" className="hidden" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
        </label>

        <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl cursor-pointer" style={{ border: "1px dashed hsl(var(--vid-border))" }}>
          <Icon name="Image" size={18} style={{ color: "hsl(var(--vid-muted))" }} />
          <span className="text-sm" style={{ color: "hsl(var(--vid-muted))" }}>{thumbFile ? thumbFile.name : "Обложка (JPG, PNG) — необязательно"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={e => setThumbFile(e.target.files?.[0] || null)} />
        </label>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название видео *"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />

        {loading && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "hsl(var(--vid-muted))" }}>{stage}</span>
              <span className="text-xs font-semibold" style={{ color: "hsl(var(--vid-accent))" }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {error && <p className="text-sm" style={{ color: "hsl(14 100% 57%)" }}>{error}</p>}
        <button onClick={submit} disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
          {loading ? `${stage || "Загружаем..."}` : "Опубликовать"}
        </button>
      </div>
    </div>
  );
}

// ─── Settings ──────────────────────────────────────────────────────────────────
function SettingsPage({ user, onUpdate, onLogout, onDeleteAccount }: { user: User; onUpdate: (u: User) => void; onLogout: () => void; onDeleteAccount: () => void }) {
  const [donateUrl, setDonateUrl] = useState(user.donate_qr_url || "");
  const [saved, setSaved] = useState(false);
  const [showDel, setShowDel] = useState(false);

  const save = async () => {
    const r = await api.profile.update({ donate_qr_url: donateUrl });
    if (!r.error) { onUpdate(r.user); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };
  const changeTheme = async (theme: string) => {
    const r = await api.profile.update({ theme });
    if (!r.error) onUpdate(r.user);
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide mb-6" style={{ color: "hsl(var(--vid-text))" }}>Настройки</h1>

      <div className="rounded-2xl p-5 mb-4" style={{ background: "hsl(var(--vid-surface))" }}>
        <h2 className="font-semibold mb-3" style={{ color: "hsl(var(--vid-text))" }}>Тема</h2>
        <div className="flex gap-3">
          {[{ val: "dark", label: "Тёмная", icon: "Moon" }, { val: "light", label: "Светлая", icon: "Sun" }].map(t => (
            <button key={t.val} onClick={() => changeTheme(t.val)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
              style={{ background: user.theme === t.val ? "hsl(var(--vid-accent))" : "hsl(var(--vid-surface-2))", color: user.theme === t.val ? "white" : "hsl(var(--vid-muted))" }}>
              <Icon name={t.icon as "Moon"} size={16} />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-4" style={{ background: "hsl(var(--vid-surface))" }}>
        <h2 className="font-semibold mb-1" style={{ color: "hsl(var(--vid-text))" }}>QR-код для доната</h2>
        <p className="text-xs mb-3" style={{ color: "hsl(var(--vid-muted))" }}>Ссылка на изображение QR — появится кнопка «Спонсировать» под видео</p>
        <input value={donateUrl} onChange={e => setDonateUrl(e.target.value)} placeholder="https://..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-3"
          style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />
        <button onClick={save} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
          {saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(var(--vid-surface))" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "hsl(var(--vid-border))" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--vid-muted))" }}>Аккаунт</p>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-5 py-4 text-sm nav-item border-b text-left" style={{ borderColor: "hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }}>
          <Icon name="LogOut" size={18} style={{ color: "hsl(var(--vid-muted))" }} />Выйти из аккаунта
          <Icon name="ChevronRight" size={16} className="ml-auto" style={{ color: "hsl(var(--vid-muted))" }} />
        </button>
        <button onClick={() => setShowDel(true)} className="w-full flex items-center gap-3 px-5 py-4 text-sm nav-item text-left" style={{ color: "hsl(14 100% 57%)" }}>
          <Icon name="Trash2" size={18} />Удалить аккаунт
          <Icon name="ChevronRight" size={16} className="ml-auto opacity-50" />
        </button>
      </div>

      {showDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setShowDel(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-scale-in" style={{ background: "hsl(var(--vid-surface))" }} onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2" style={{ color: "hsl(var(--vid-text))" }}>Удалить аккаунт?</h2>
            <p className="text-sm mb-5" style={{ color: "hsl(var(--vid-muted))" }}>Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDel(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "hsl(var(--vid-surface-2))", color: "hsl(var(--vid-muted))" }}>Отмена</button>
              <button onClick={onDeleteAccount} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "hsl(14 100% 57%)", color: "white" }}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profile Edit ──────────────────────────────────────────────────────────────
function ProfileEdit({ user, onUpdate }: { user: User; onUpdate: (u: User) => void }) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [description, setDescription] = useState(user.description || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || "");
  const [loading, setLoading] = useState(false); const [saved, setSaved] = useState(false); const [error, setError] = useState("");

  const handleAvatar = (file: File) => { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); };

  const save = async () => {
    setLoading(true); setError("");
    const data: Record<string, string> = { display_name: displayName, description };
    if (avatarFile) data.avatar_data = await fileToBase64(avatarFile);
    const r = await api.profile.update(data);
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    onUpdate(r.user); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide mb-6" style={{ color: "hsl(var(--vid-text))" }}>Редактировать профиль</h1>
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "hsl(var(--vid-surface))" }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar url={avatarPreview} name={displayName} size={72} />
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer" style={{ background: "hsl(var(--vid-accent))" }}>
              <Icon name="Camera" size={13} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
            </label>
          </div>
          <div>
            <p className="font-semibold" style={{ color: "hsl(var(--vid-text))" }}>@{user.username}</p>
            <p className="text-xs" style={{ color: "hsl(var(--vid-muted))" }}>{user.email}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "hsl(var(--vid-muted))" }}>Отображаемое имя</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ваше имя"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "hsl(var(--vid-muted))" }}>Описание канала</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Расскажите о себе..." rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))", color: "hsl(var(--vid-text))" }} />
        </div>
        {error && <p className="text-sm" style={{ color: "hsl(14 100% 57%)" }}>{error}</p>}
        <button onClick={save} disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
          style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
          {loading ? "Сохраняем..." : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

// ─── Channel Page ──────────────────────────────────────────────────────────────
function ChannelPage({ user, videos, onPlayVideo, onUpload }: { user: User; videos: Video[]; onPlayVideo: (v: Video) => void; onUpload: () => void }) {
  const myVideos = videos.filter(v => v.author.id === user.id);
  return (
    <div className="animate-fade-in">
      <div className="relative rounded-2xl overflow-hidden mb-6 h-32" style={{ background: "hsl(var(--vid-surface-2))" }}>
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <Icon name="Play" size={120} style={{ color: "hsl(var(--vid-accent))" }} />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4 mb-8 -mt-10 relative z-10 px-4">
        <Avatar url={user.avatar_url} name={user.display_name} size={76} />
        <div className="pb-2 flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold" style={{ color: "hsl(var(--vid-text))" }}>{user.display_name || user.username}</h1>
          <p className="text-sm" style={{ color: "hsl(var(--vid-muted))" }}>@{user.username} · {myVideos.length} видео</p>
          {user.description && <p className="text-xs mt-1 max-w-md" style={{ color: "hsl(var(--vid-muted))" }}>{user.description}</p>}
        </div>
        <button onClick={onUpload} className="mb-2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
          <Icon name="Upload" size={15} />Загрузить видео
        </button>
      </div>
      {myVideos.length > 0
        ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {myVideos.map((v, i) => <VideoCard key={v.id} video={v} onClick={() => onPlayVideo(v)} idx={i} />)}
        </div>
        : <div className="rounded-xl p-10 text-center" style={{ background: "hsl(var(--vid-surface))", border: "1px dashed hsl(var(--vid-border))" }}>
          <Icon name="Video" size={40} className="mx-auto mb-3" style={{ color: "hsl(var(--vid-muted))" }} />
          <p style={{ color: "hsl(var(--vid-muted))" }}>Видео пока нет. Загрузите первое!</p>
          <button onClick={onUpload} className="mt-3 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "hsl(var(--vid-accent))", color: "white" }}>Загрузить</button>
        </div>
      }
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [section, setSection] = useState<Section>("home");
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // Apply theme to CSS vars
  useEffect(() => {
    const t = user?.theme || "dark";
    const vars = t === "light"
      ? { "--vid-bg": "210 20% 96%", "--vid-surface": "0 0% 100%", "--vid-surface-2": "210 15% 93%", "--vid-border": "210 15% 85%", "--vid-text": "220 20% 12%", "--vid-muted": "215 15% 45%" }
      : { "--vid-bg": "220 13% 8%", "--vid-surface": "220 13% 11%", "--vid-surface-2": "220 13% 14%", "--vid-border": "220 13% 18%", "--vid-text": "210 20% 92%", "--vid-muted": "215 15% 55%" };
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [user?.theme]);

  useEffect(() => {
    const sid = localStorage.getItem("yuvist_session");
    if (sid) {
      api.auth.me().then(r => { if (r.user) setUser(r.user); }).finally(() => setAuthChecked(true));
    } else { setAuthChecked(true); }
  }, []);

  const loadVideos = useCallback(() => {
    setLoadingVideos(true);
    api.videos.list().then(r => { setVideos(r.videos || []); }).finally(() => setLoadingVideos(false));
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const handleAuth = (u: User, sid: string) => {
    localStorage.setItem("yuvist_session", sid);
    setUser(u);
    setSection("home");
    loadVideos();
  };
  const handleLogout = async () => { await api.auth.logout(); localStorage.removeItem("yuvist_session"); setUser(null); setSection("home"); };
  const handleDeleteAccount = async () => { await api.auth.deleteAccount(); localStorage.removeItem("yuvist_session"); setUser(null); setSection("home"); };

  const filteredVideos = videos.filter(v =>
    !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()) || (v.author.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--vid-bg))" }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--vid-accent))", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  const NAV = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "channel", label: "Мой канал", icon: "Tv" },
    { id: "upload", label: "Загрузить", icon: "Upload" },
    { id: "profile_edit", label: "Профиль", icon: "User" },
    { id: "settings", label: "Настройки", icon: "Settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--vid-bg))", color: "hsl(var(--vid-text))" }}>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b" style={{ background: "hsl(var(--vid-surface))", borderColor: "hsl(var(--vid-border))" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarCollapsed(p => !p)} className="p-1.5 rounded-lg nav-item" style={{ color: "hsl(var(--vid-muted))" }}>
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setSection("home")}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--vid-accent))" }}>
              <Icon name="Play" size={14} className="text-white ml-0.5" />
            </div>
            <span className="font-display font-bold text-xl tracking-[0.15em] ml-2" style={{ color: "hsl(var(--vid-text))" }}>
              Ю<span style={{ color: "hsl(var(--vid-accent))" }}>ВИСТ</span>
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden sm:flex">
          <div className="w-full flex items-center rounded-full px-4 h-9 gap-2" style={{ background: "hsl(var(--vid-surface-2))", border: "1px solid hsl(var(--vid-border))" }}>
            <Icon name="Search" size={16} style={{ color: "hsl(var(--vid-muted))" }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск видео..."
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: "hsl(var(--vid-text))" }} />
            {searchQuery && <button onClick={() => setSearchQuery("")}><Icon name="X" size={14} style={{ color: "hsl(var(--vid-muted))" }} /></button>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setSection("upload")} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ background: "hsl(var(--vid-accent))", color: "white" }}>
            <Icon name="Upload" size={14} />Загрузить
          </button>
          <button onClick={() => setSection("profile_edit")}>
            <Avatar url={user.avatar_url} name={user.display_name} size={32} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex-shrink-0 border-r overflow-y-auto transition-all duration-300"
          style={{ width: sidebarCollapsed ? "60px" : "200px", background: "hsl(var(--vid-surface))", borderColor: "hsl(var(--vid-border))" }}>
          <nav className="p-2 space-y-0.5">
            {NAV.map(item => (
              <button key={item.id} onClick={() => setSection(item.id as Section)}
                className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${section === item.id ? "active" : ""}`}
                style={{ color: section === item.id ? "hsl(var(--vid-accent))" : "hsl(var(--vid-muted))" }}>
                <Icon name={item.icon as "Home"} size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
            <div className="pt-2 border-t" style={{ borderColor: "hsl(var(--vid-border))" }}>
              <button onClick={handleLogout} className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left" style={{ color: "hsl(var(--vid-muted))" }}>
                <Icon name="LogOut" size={18} />
                {!sidebarCollapsed && <span>Выйти</span>}
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            {section === "home" && (
              <div className="animate-fade-in">
                {searchQuery
                  ? <h2 className="font-display text-lg font-semibold uppercase tracking-wide mb-4" style={{ color: "hsl(var(--vid-text))" }}>Поиск: «{searchQuery}» — {filteredVideos.length} видео</h2>
                  : <h2 className="font-display text-lg font-semibold uppercase tracking-wide mb-4" style={{ color: "hsl(var(--vid-text))" }}>Все видео</h2>
                }
                {loadingVideos
                  ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--vid-surface))" }}>
                        <div className="aspect-video" style={{ background: "hsl(var(--vid-surface-2))" }} />
                        <div className="p-3 space-y-2">
                          <div className="h-4 rounded" style={{ background: "hsl(var(--vid-surface-2))", width: "80%" }} />
                          <div className="h-3 rounded" style={{ background: "hsl(var(--vid-surface-2))", width: "50%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  : filteredVideos.length > 0
                    ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredVideos.map((v, i) => <VideoCard key={v.id} video={v} onClick={() => setPlayingVideo(v)} idx={i} />)}
                    </div>
                    : <div className="text-center py-20">
                      <Icon name="Video" size={56} className="mx-auto mb-4" style={{ color: "hsl(var(--vid-muted))" }} />
                      <p className="font-semibold text-lg" style={{ color: "hsl(var(--vid-text))" }}>{searchQuery ? "Ничего не найдено" : "Пока нет видео"}</p>
                      <p className="text-sm mt-2" style={{ color: "hsl(var(--vid-muted))" }}>{searchQuery ? "Попробуйте другой запрос" : "Станьте первым автором!"}</p>
                      {!searchQuery && <button onClick={() => setSection("upload")} className="mt-4 px-5 py-2.5 rounded-full text-sm font-semibold" style={{ background: "hsl(var(--vid-accent))", color: "white" }}>Загрузить видео</button>}
                    </div>
                }
              </div>
            )}
            {section === "upload" && <UploadPage onUploaded={() => { loadVideos(); setSection("channel"); }} />}
            {section === "settings" && <SettingsPage user={user} onUpdate={setUser} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />}
            {section === "profile_edit" && <ProfileEdit user={user} onUpdate={setUser} />}
            {section === "channel" && <ChannelPage user={user} videos={videos} onPlayVideo={setPlayingVideo} onUpload={() => setSection("upload")} />}
          </div>
        </main>
      </div>

      {playingVideo && <VideoPlayer video={playingVideo} user={user} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
}