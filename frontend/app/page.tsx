"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [reels, setReels] = useState([]);
  const [selectedReel, setSelectedReel] = useState<any>(null);
  const [sceneImages, setSceneImages] = useState<any>({});
  const [sceneAudio, setSceneAudio] = useState<any>({});
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const API_BASE = "http://127.0.0.1:8000";

  const fetchReels = async () => {
    const res = await fetch(`${API_BASE}/reels`);
    setReels(await res.json());
  };

  useEffect(() => { fetchReels(); }, []);

  useEffect(() => {
    if (selectedReel) {
      const assets = selectedReel.generated_assets || [];
      const imgs: any = {}; const auds: any = {};
      assets.forEach((a: any) => {
        if (a.image_url) imgs[a.scene_number] = a.image_url;
        if (a.audio_url) auds[a.scene_number] = a.audio_url;
      });
      setSceneImages(imgs); setSceneAudio(auds);

      // Load video if it exists in the database
      if (selectedReel.video_url) {
        setVideoUrl(`${API_BASE}${selectedReel.video_url}`);
      } else {
        setVideoUrl(null);
      }
    }
  }, [selectedReel]);

  const syncToDB = async (imgs: any, auds: any) => {
    // FIX: Safely handle JSON objects from Supabase
    const script = typeof selectedReel.script_data === 'string'
      ? JSON.parse(selectedReel.script_data) : selectedReel.script_data;

    const assets = script.scenes.map((s: any) => ({
      scene_number: s.scene_number,
      image_url: imgs[s.scene_number] || null,
      audio_url: auds[s.scene_number] || null
    }));

    await fetch(`${API_BASE}/update-assets/${selectedReel.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assets)
    });
  };

  const handleAssemble = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setVideoUrl(null); // Clear old video before rendering

    try {
      const script = typeof selectedReel.script_data === 'string' ? JSON.parse(selectedReel.script_data) : selectedReel.script_data;
      const assets = script.scenes.map((s: any) => ({
        scene_number: s.scene_number,
        image_url: sceneImages[s.scene_number],
        audio_url: sceneAudio[s.scene_number]
      }));

      const res = await fetch(`${API_BASE}/assemble-video/${selectedReel.id}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(assets)
      });

      const data = await res.json();

      if (data.video_url) {
        // ADD TIMESTAMP TO BYPASS CACHE
        const freshUrl = `${API_BASE}${data.video_url}?t=${new Date().getTime()}`;
        setVideoUrl(freshUrl);
      }
    } catch (error) {
      console.error("Assembly failed", error);
    } finally {
      setIsRendering(false);
      fetchReels();
    }
  };

  return (
    <main className="p-10 bg-black min-h-screen text-white font-sans">
      <h1 className="text-4xl font-black mb-10 italic text-blue-500 tracking-tighter">AI REEL FACTORY</h1>

      {/* Create Section */}
      <div className="flex gap-4 mb-12 bg-gray-900 p-2 rounded-2xl border border-gray-800">
        <input className="bg-transparent p-4 flex-1 outline-none" placeholder="Enter topic..." value={topic} onChange={e => setTopic(e.target.value)} />
        <button onClick={async () => { setLoading(true); await fetch(`${API_BASE}/generate-reel?topic=${topic}`, {method:"POST"}); fetchReels(); setLoading(false); }} className="bg-blue-600 px-8 rounded-xl font-bold">
          {loading ? "..." : "Create"}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reels.map((r: any) => (
          <div key={r.id} onClick={() => setSelectedReel(r)} className="bg-gray-900 p-6 rounded-3xl border border-gray-800 cursor-pointer hover:border-blue-500 transition">
            <h3 className="font-bold text-xl truncate">{r.topic}</h3>
            <p className="text-xs text-gray-500 mt-2">{r.video_url ? "✅ READY" : "📝 DRAFT"}</p>
          </div>
        ))}
      </div>

      {/* Modal Editor */}
      {selectedReel && (
        <div className="fixed inset-0 bg-black/98 z-50 p-10 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <button onClick={() => setSelectedReel(null)} className="text-5xl font-light mb-10">×</button>

            {/* IMPROVED VIDEO PLAYER SECTION */}
            <div className="mb-10 text-center flex flex-col items-center">
              {videoUrl ? (
                <div className="relative group">
                  <video
                    key={videoUrl} // Force re-render of component when URL changes
                    src={videoUrl}
                    controls
                    className="w-72 rounded-3xl shadow-2xl border-4 border-blue-600"
                  />
                  <a href={videoUrl} download className="mt-4 inline-block bg-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-500 transition">
                    Download MP4
                  </a>
                </div>
              ) : (
                <div className="w-72 h-[480px] bg-gray-900 rounded-3xl border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500">
                  {isRendering ? "Rendering your masterpiece..." : "No video built yet"}
                </div>
              )}
            </div>

            <button
              onClick={handleAssemble}
              disabled={isRendering}
              className="w-full py-6 bg-gradient-to-r from-green-600 to-blue-600 font-black text-2xl rounded-2xl mb-12 disabled:opacity-50 transition transform hover:scale-[1.01]"
            >
              {isRendering ? "STITCHING SCENES..." : "BUILD FINAL VIDEO 🎬"}
            </button>

            {/* Scenes List */}
            <div className="space-y-12">
              {(() => {
                const script = typeof selectedReel.script_data === 'string' ? JSON.parse(selectedReel.script_data) : selectedReel.script_data;
                return script.scenes.map((s: any) => (
                  <div key={s.scene_number} className="bg-gray-900/50 p-8 rounded-3xl border-l-8 border-blue-600">
                    <p className="text-2xl italic mb-8 text-gray-100 leading-relaxed">"{s.narration}"</p>
                    <div className="grid grid-cols-2 gap-6">
                      {sceneImages[s.scene_number] ? <img src={`${API_BASE}${sceneImages[s.scene_number]}`} className="rounded-2xl border border-gray-800 aspect-[9/16] object-cover" /> :
                        <button onClick={async () => {
                          const res = await fetch(`${API_BASE}/generate-image?prompt=${encodeURIComponent(s.image_prompt)}&reel_id=${selectedReel.id}&scene_index=${s.scene_number}`, {method:"POST"});
                          const data = await res.json();
                          const up = {...sceneImages, [s.scene_number]: data.image_url};
                          setSceneImages(up); syncToDB(up, sceneAudio);
                        }} className="bg-purple-600 py-16 rounded-2xl font-bold text-xl">Generate Image</button>}

                      <div className="flex flex-col justify-end">
                        {sceneAudio[s.scene_number] ? <audio src={`${API_BASE}${sceneAudio[s.scene_number]}`} controls className="w-full" /> :
                          <button onClick={async () => {
                            const res = await fetch(`${API_BASE}/generate-audio?text_input=${encodeURIComponent(s.narration)}&reel_id=${selectedReel.id}&scene_index=${s.scene_number}`, {method:"POST"});
                            const data = await res.json();
                            const up = {...sceneAudio, [s.scene_number]: data.audio_url};
                            setSceneAudio(up); syncToDB(sceneImages, up);
                          }} className="bg-blue-600 py-16 rounded-2xl font-bold text-xl">Voiceover</button>}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}