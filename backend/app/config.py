from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    openrouter_fallback_models: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # Supabase (leave empty for local mode: no login, in-memory usage)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # CORS / app
    frontend_url: str = "http://localhost:3000"
    extension_id: str = ""  # restrict CORS to your published extension when set
    rate_limit_per_minute: int = 30

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key and "your-project" not in self.supabase_url)

    @property
    def frontend_urls(self) -> list[str]:
        """FRONTEND_URL may list several origins, comma-separated (e.g. prod + preview)."""
        return [o.strip().rstrip("/") for o in self.frontend_url.split(",") if o.strip()]

    @property
    def models(self) -> list[str]:
        fallbacks = [m.strip() for m in self.openrouter_fallback_models.split(",") if m.strip()]
        return [self.openrouter_model] + [m for m in fallbacks if m != self.openrouter_model]


@lru_cache
def get_settings() -> Settings:
    return Settings()
