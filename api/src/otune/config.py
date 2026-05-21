from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    otune_env: str = "dev"
    otune_mode: str = "dev"            # dev | prod
    otune_database_url: str = "postgresql+psycopg://otune:otune@localhost:5432/otune"
    otune_frontend_url: str = "http://localhost:3000"
    otune_api_url: str = "http://localhost:8000"
    otune_data_dir: str = "./data"

    anthropic_api_key: str = ""
    otune_claude_model: str = "claude-sonnet-4-5"

    openai_api_key: str = ""
    otune_openai_model: str = "gpt-4o"

    tavily_api_key: str = ""

    huggingface_token: str = ""

    stripe_api_key: str = ""
    stripe_webhook_secret: str = ""

    # dev-mode training knobs
    otune_dev_base_model: str = "Qwen/Qwen2.5-0.5B-Instruct"
    otune_dev_dataset_rows: int = 100
    otune_dev_train_epochs: int = 2
    otune_dev_lr: float = 2.0e-4
    otune_dev_lora_r: int = 8

    # prod-only (unused in dev)
    runpod_api_key: str = ""
    runpod_gpu_type_70b: str = "NVIDIA H100 80GB HBM3"
    runpod_gpu_type_8b: str = "NVIDIA A100 80GB"
    otune_s3_bucket: str = "otune-artifacts"
    otune_s3_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    @property
    def is_dev(self) -> bool:
        return self.otune_mode == "dev"


@lru_cache
def settings() -> Settings:
    return Settings()
