"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReel, setSelectedReel] = useState<any>(null);

  const [sceneImages, setSceneImages] = useState<{[key: number]: string}>({});
  const [imgLoading, setImgLoading] = useState<number | null>(null);

  const fetchReels = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/reels");
      const data = await res.json();
      setReels(data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => { fetchReels(); }, []);

  const generateReel = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/generate-reel?topic=${encodeURIComponent(topic)}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("AI Busy");
      setTopic("");
      await fetchReels();
    } catch (err) {
      alert("AI is busy or server error. Try again!");
    } finally {
      setLoading(false);
    }
  };

  const handleImageGen = async (prompt: string, sceneIndex: number) => {
    setImgLoading(sceneIndex);
    try {
      const res = await fetch(`http://127.0.0.1:8000/generate-image?prompt=${encodeURIComponent(prompt)}`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.image_url) {
        setSceneImages(prev => ({ ...prev, [sceneIndex]: data.image_url }));
      }
    } catch (err) {
      alert("Hugging Face server busy, please try again!");
    } finally {
      setImgLoading(null);
    }
  };

  return (
    <main className="p-10 bg-black min-h-screen text-white font-sans">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent italic">
          AI Reel Factory
        </h1>
        <p className="text-gray-400 mb-10">Create viral scripts and visuals for $0.</p>

        <div className="flex gap-4 mb-16 bg-gray-900 p-2 rounded-2xl border border-gray-800 focus-within:border-blue-500 transition-all">
          <input
            className="bg-transparent p-4 flex-1 outline-none text-lg"
            placeholder="What's your next viral topic?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button
            onClick={generateReel}
            disabled={loading}
            className="bg-blue-600 px-10 py-4 rounded-xl font-bold hover:scale-105 transition disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Magic ✨"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reels.map((reel: any) => (
            <div
              key={reel.id}
              onClick={() => setSelectedReel(reel)}
              className="bg-gray-900 p-8 rounded-3xl border border-gray-800 hover:border-blue-500 transition-all cursor-pointer group shadow-lg"
            >
              <h3 className="text-2xl font-bold capitalize">{reel.topic}</h3>
              <p className="text-gray-500 text-sm mt-4">{new Date(reel.created_at).toDateString()}</p>
              <div className="mt-6 text-blue-500 font-bold group-hover:underline">View Script →</div>
            </div>
          ))}
        </div>

        {selectedReel && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 relative">
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-900 z-10 py-2 border-b border-gray-800">
                <h2 className="text-3xl font-bold capitalize">{selectedReel.topic}</h2>
                <button
                  onClick={() => {setSelectedReel(null); setSceneImages({});}}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-12">
                {(() => {
                  const scriptData = typeof selectedReel.script_data === 'string'
                    ? JSON.parse(selectedReel.script_data)
                    : selectedReel.script_data;

                  return scriptData.scenes.map((scene: any) => (
                    <div key={scene.scene_number} className="border-l-4 border-blue-600 pl-6">
                      <p className="text-blue-500 font-bold mb-2 uppercase tracking-widest text-sm">Scene {scene.scene_number}</p>
                      <p className="text-xl italic text-gray-200 mb-6">"{scene.narration}"</p>

                      {sceneImages[scene.scene_number] ? (
                        <img
                          src={sceneImages[scene.scene_number]}
                          className="w-full rounded-2xl border border-gray-700 shadow-xl"
                          alt="AI"
                        />
                      ) : (
                        <button
                          onClick={() => handleImageGen(scene.image_prompt, scene.scene_number)}
                          disabled={imgLoading === scene.scene_number}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-xl transition disabled:opacity-50"
                        >
                          {imgLoading === scene.scene_number ? "Painting..." : "Generate AI Image 🖼️"}
                        </button>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}