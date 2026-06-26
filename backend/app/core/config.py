from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SAP Analytics Chatbot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

    # API
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://your-domain.com",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/sap_chatbot"
    REDIS_URL: str = "redis://localhost:6379/0"

    # SAP Configuration
    SAP_BASE_URL: str = ""                    # e.g. https://your-s4-system.com
    SAP_CLIENT: str = "100"
    SAP_ODATA_PATH: str = "/sap/opu/odata/sap"
    SAP_AUTH_TYPE: str = "basic"              # basic | oauth2 | principal
    SAP_USERNAME: Optional[str] = None
    SAP_PASSWORD: Optional[str] = None
    SAP_OAUTH_CLIENT_ID: Optional[str] = None
    SAP_OAUTH_CLIENT_SECRET: Optional[str] = None
    SAP_OAUTH_TOKEN_URL: Optional[str] = None
    SAP_SSL_VERIFY: bool = True
    SAP_REQUEST_TIMEOUT: int = 60
    SAP_MAX_RECORDS: int = 5000

    # AI / LLM
    LLM_PROVIDER: str = "gemini"              # gemini | openai | azure_openai
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-10-21"

    # JWT Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    # Azure AD / Entra ID
    AZURE_AD_TENANT_ID: Optional[str] = None
    AZURE_AD_CLIENT_ID: Optional[str] = None
    AZURE_AD_CLIENT_SECRET: Optional[str] = None

    # Exports
    EXPORT_DIR: str = "/tmp/sap_chatbot_exports"
    MAX_EXPORT_ROWS: int = 50000

    # Audit
    AUDIT_LOG_ENABLED: bool = True
    CONVERSATION_HISTORY_LIMIT: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
