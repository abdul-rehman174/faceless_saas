from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(..., alias="DATABASE_URL")
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    hf_token: str = Field(..., alias="HF_TOKEN")

    cors_origins: str = Field("http://localhost:3000,http://127.0.0.1:3000", alias="CORS_ORIGINS")

    static_dir: Path = Field(Path("static"), alias="STATIC_DIR")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    gemini_model: str = "gemini-2.5-flash"
    flux_model_url: str = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    tts_voice: str = "en-US-ChristopherNeural"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def images_dir(self) -> Path:
        return self.static_dir / "images"

    @property
    def audio_dir(self) -> Path:
        return self.static_dir / "audio"

    @property
    def videos_dir(self) -> Path:
        return self.static_dir / "videos"


@lru_cache
def get_settings() -> Settings:
    return Settings()
