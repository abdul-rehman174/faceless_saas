export type Scene = {
  scene_number: number;
  image_prompt: string;
  narration: string;
};

export type ReelScript = {
  title: string;
  scenes: Scene[];
};

export type SceneAsset = {
  scene_number: number;
  image_url: string | null;
  audio_url: string | null;
};

export type Reel = {
  id: string;
  topic: string;
  script_data: ReelScript | string;
  video_url: string | null;
  generated_assets: SceneAsset[];
  created_at: string;
};

export type SceneAssetMap = Record<number, string>;
