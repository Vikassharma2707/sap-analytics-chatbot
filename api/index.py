"""
Vercel serverless entry point — wraps the FastAPI app with Mangum (ASGI→Lambda adapter).
Vercel's Python runtime treats api/index.py as the handler for all /api/* routes.
"""

import sys
import os

# Make the backend/app package importable from this api/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from mangum import Mangum
from app.main import app

# Mangum adapts ASGI (FastAPI) to the AWS Lambda / Vercel serverless handler interface
handler = Mangum(app, lifespan="off")
