from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):

    database_url: str
    r2_endpoint_url: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str
    r2_public_url: str = ""  # e.g. https://pub-xxx.r2.dev

    app_name: str = "Video Stream DML"
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive = False
    )

@lru_cache
def get_settings() -> Settings:
    return Settings()
