import type { Reel, SceneAsset } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listReels: () => jsonFetch<Reel[]>("/reels"),

  createReel: (topic: string) =>
    jsonFetch<Reel>("/generate-reel", {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),

  generateImage: (reelId: string, sceneIndex: number, prompt: string) =>
    jsonFetch<{ image_url: string }>("/generate-image", {
      method: "POST",
      body: JSON.stringify({ reel_id: reelId, scene_index: sceneIndex, prompt }),
    }),

  generateAudio: (reelId: string, sceneIndex: number, text: string) =>
    jsonFetch<{ audio_url: string }>("/generate-audio", {
      method: "POST",
      body: JSON.stringify({ reel_id: reelId, scene_index: sceneIndex, text }),
    }),

  updateAssets: (reelId: string, assets: SceneAsset[]) =>
    jsonFetch<Reel>(`/update-assets/${reelId}`, {
      method: "POST",
      body: JSON.stringify(assets),
    }),

  assembleVideo: (reelId: string, assets: SceneAsset[]) =>
    jsonFetch<{ video_url: string }>(`/assemble-video/${reelId}`, {
      method: "POST",
      body: JSON.stringify(assets),
    }),
};
