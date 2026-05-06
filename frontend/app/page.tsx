"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE, api } from "./api";
import type { Reel, ReelScript, SceneAssetMap } from "./types";

function parseScript(reel: Reel): ReelScript {
  return typeof reel.script_data === "string"
    ? (JSON.parse(reel.script_data) as ReelScript)
    : reel.script_data;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [reels, setReels] = useState<Reel[]>([]);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [sceneImages, setSceneImages] = useState<SceneAssetMap>({});
  const [sceneAudio, setSceneAudio] = useState<SceneAssetMap>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<number, boolean>>({});
  const [pendingAudio, setPendingAudio] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchReels = async () => {
    try {
      setReels(await api.listReels());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    if (!selectedReel) return;
    const imgs: SceneAssetMap = {};
    const auds: SceneAssetMap = {};
    (selectedReel.generated_assets || []).forEach((a) => {
      if (a.image_url) imgs[a.scene_number] = a.image_url;
      if (a.audio_url) auds[a.scene_number] = a.audio_url;
    });
    setSceneImages(imgs);
    setSceneAudio(auds);
    setVideoUrl(selectedReel.video_url ? `${API_BASE}${selectedReel.video_url}` : null);
  }, [selectedReel]);

  const script = useMemo(
    () => (selectedReel ? parseScript(selectedReel) : null),
    [selectedReel]
  );

  const syncToDB = async (imgs: SceneAssetMap, auds: SceneAssetMap) => {
    if (!selectedReel || !script) return;
    const assets = script.scenes.map((s) => ({
      scene_number: s.scene_number,
      image_url: imgs[s.scene_number] ?? null,
      audio_url: auds[s.scene_number] ?? null,
    }));
    try {
      await api.updateAssets(selectedReel.id, assets);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!topic.trim() || loadingCreate) return;
    setLoadingCreate(true);
    setError(null);
    try {
      await api.createReel(topic.trim());
      setTopic("");
      await fetchReels();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleGenerateImage = async (sceneNumber: number, prompt: string) => {
    if (!selectedReel || pendingImages[sceneNumber]) return;
    setPendingImages((p) => ({ ...p, [sceneNumber]: true }));
    setError(null);
    try {
      const { image_url } = await api.generateImage(selectedReel.id, sceneNumber, prompt);
      const next = { ...sceneImages, [sceneNumber]: image_url };
      setSceneImages(next);
      await syncToDB(next, sceneAudio);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingImages((p) => ({ ...p, [sceneNumber]: false }));
    }
  };

  const handleGenerateAudio = async (sceneNumber: number, narration: string) => {
    if (!selectedReel || pendingAudio[sceneNumber]) return;
    setPendingAudio((p) => ({ ...p, [sceneNumber]: true }));
    setError(null);
    try {
      const { audio_url } = await api.generateAudio(selectedReel.id, sceneNumber, narration);
      const next = { ...sceneAudio, [sceneNumber]: audio_url };
      setSceneAudio(next);
      await syncToDB(sceneImages, next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingAudio((p) => ({ ...p, [sceneNumber]: false }));
    }
  };

  const handleAssemble = async () => {
    if (!selectedReel || !script || isRendering) return;
    setIsRendering(true);
    setVideoUrl(null);
    setError(null);
    try {
      const assets = script.scenes.map((s) => ({
        scene_number: s.scene_number,
        image_url: sceneImages[s.scene_number] ?? null,
        audio_url: sceneAudio[s.scene_number] ?? null,
      }));
      const missing = assets.find((a) => !a.image_url || !a.audio_url);
      if (missing) {
        throw new Error(`Scene ${missing.scene_number} is missing an image or audio.`);
      }
      const { video_url } = await api.assembleVideo(selectedReel.id, assets);
      setVideoUrl(`${API_BASE}${video_url}?t=${Date.now()}`);
      await fetchReels();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <main className="px-6 py-8 bg-black min-h-screen text-white font-sans max-w-6xl mx-auto">
      <h1 className="text-2xl font-black mb-6 italic text-blue-500 tracking-tighter">
        AI REEL FACTORY
      </h1>

      <div className="flex gap-2 mb-4 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
        <input
          className="bg-transparent px-3 py-2 flex-1 outline-none text-sm"
          placeholder="Enter topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={loadingCreate}
        />
        <button
          onClick={handleCreate}
          disabled={loadingCreate || !topic.trim()}
          className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition"
        >
          {loadingCreate ? "Creating..." : "Create"}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/40 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reels.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelectedReel(r)}
            className="bg-gray-900 p-4 rounded-xl border border-gray-800 cursor-pointer hover:border-blue-500 transition"
          >
            <h3 className="font-semibold text-sm truncate">{r.topic}</h3>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1.5">
              {r.video_url ? "Ready" : "Draft"}
            </p>
          </div>
        ))}
      </div>

      {selectedReel && script && (
        <div className="fixed inset-0 bg-black/95 z-50 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold truncate">{selectedReel.topic}</h2>
              <button
                onClick={() => setSelectedReel(null)}
                className="text-2xl font-light text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center">
              {videoUrl ? (
                <>
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    className="w-56 rounded-xl shadow-xl border border-blue-600"
                  />
                  <a
                    href={videoUrl}
                    download
                    className="mt-3 inline-block bg-blue-600 hover:bg-blue-500 px-5 py-1.5 rounded-full text-sm font-semibold transition"
                  >
                    Download MP4
                  </a>
                </>
              ) : (
                <div className="w-56 aspect-[9/16] bg-gray-900 rounded-xl border border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-center px-4 text-xs">
                  {isRendering ? "Rendering..." : "No video built yet"}
                </div>
              )}
            </div>

            <button
              onClick={handleAssemble}
              disabled={isRendering}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:opacity-90 font-bold text-sm rounded-xl mb-6 disabled:opacity-50 transition"
            >
              {isRendering ? "STITCHING SCENES..." : "BUILD FINAL VIDEO"}
            </button>

            <div className="space-y-4">
              {script.scenes.map((s) => {
                const imgUrl = sceneImages[s.scene_number];
                const audUrl = sceneAudio[s.scene_number];
                const imgLoading = pendingImages[s.scene_number];
                const audLoading = pendingAudio[s.scene_number];
                return (
                  <div
                    key={s.scene_number}
                    className="bg-gray-900/50 p-4 rounded-xl border-l-2 border-blue-600"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mt-0.5">
                        Scene {s.scene_number}
                      </span>
                    </div>
                    <p className="text-sm italic mb-3 text-gray-200 leading-relaxed">
                      &ldquo;{s.narration}&rdquo;
                    </p>
                    <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
                      {imgUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${API_BASE}${imgUrl}`}
                          alt={s.image_prompt}
                          className="rounded-lg border border-gray-800 w-24 aspect-[9/16] object-cover"
                        />
                      ) : (
                        <button
                          onClick={() => handleGenerateImage(s.scene_number, s.image_prompt)}
                          disabled={imgLoading}
                          className="bg-purple-600 hover:bg-purple-500 w-24 aspect-[9/16] rounded-lg font-semibold text-xs disabled:opacity-50 transition"
                        >
                          {imgLoading ? "..." : "Image"}
                        </button>
                      )}

                      <div className="flex flex-col justify-center min-h-full">
                        {audUrl ? (
                          <audio
                            src={`${API_BASE}${audUrl}`}
                            controls
                            className="w-full h-9"
                          />
                        ) : (
                          <button
                            onClick={() => handleGenerateAudio(s.scene_number, s.narration)}
                            disabled={audLoading}
                            className="bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-semibold text-xs disabled:opacity-50 transition"
                          >
                            {audLoading ? "Generating..." : "Voiceover"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
