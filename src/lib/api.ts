const URLS = {
  auth: "https://functions.poehali.dev/3e4c805f-f972-47af-9906-29934fedf27e",
  videos: "https://functions.poehali.dev/f7711d37-93d1-464e-8d04-da71ea04a6cc",
  profile: "https://functions.poehali.dev/3aaf7c60-44e7-4cd4-8a64-01ee8f26456f",
};

function getSession() {
  return localStorage.getItem("yuvist_session") || "";
}

async function req(base: string, path: string, method = "GET", body?: object) {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", "X-Session-Id": getSession() },
  };
  if (body) opts.body = JSON.stringify(body);
  const url = `${base}${path}`;
  const res = await fetch(url, opts);
  return res.json();
}

export const api = {
  auth: {
    register: (data: object) => req(URLS.auth, "/register", "POST", data),
    login: (data: object) => req(URLS.auth, "/login", "POST", data),
    me: () => req(URLS.auth, "/me", "GET"),
    logout: () => req(URLS.auth, "/logout", "POST"),
    deleteAccount: () => req(URLS.auth, "/delete", "POST"),
  },
  videos: {
    list: (userId?: number) => req(URLS.videos, `/list${userId ? `?user_id=${userId}` : ""}`, "GET"),
    get: (id: number) => req(URLS.videos, `/get?id=${id}`, "GET"),
    upload: (data: object) => req(URLS.videos, "/upload", "POST", data),
    view: (videoId: number) => req(URLS.videos, "/view", "POST", { video_id: videoId }),
    like: (videoId: number, isLike: boolean) => req(URLS.videos, "/like", "POST", { video_id: videoId, is_like: isLike }),
    likes: (videoId: number) => req(URLS.videos, `/likes?video_id=${videoId}`, "GET"),
    comments: (videoId: number) => req(URLS.videos, `/comments?video_id=${videoId}`, "GET"),
    comment: (videoId: number, text: string) => req(URLS.videos, "/comment", "POST", { video_id: videoId, text }),
    deleteVideo: (videoId: number) => req(URLS.videos, "/delete", "POST", { video_id: videoId }),
  },
  profile: {
    user: (username: string) => req(URLS.profile, `/user?username=${username}`, "GET"),
    update: (data: object) => req(URLS.profile, "/update", "POST", data),
  },
};

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} дн. назад`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} мес. назад`;
  return `${Math.floor(months / 12)} г. назад`;
}
