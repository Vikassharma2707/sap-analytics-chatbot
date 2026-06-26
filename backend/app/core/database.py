from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings


def _is_serverless() -> bool:
    """Detect Vercel / Lambda environments where persistent connection pools must not be used."""
    import os
    return bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))


# Supabase recommends NullPool for serverless (pgbouncer session mode doesn't support
# prepared statements; transaction mode requires NullPool + no server-side cursors).
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    # NullPool: open a fresh connection per request — required for Supabase Transaction Pooler
    # and safe for serverless. For long-running servers swap to pool_size=10, max_overflow=20.
    **({"poolclass": NullPool} if _is_serverless() else {"pool_size": 10, "max_overflow": 20}),
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
