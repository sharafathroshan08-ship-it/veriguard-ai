"""Production entrypoint for Render.

Keeps the existing application unchanged while adding CORS support for
Vercel deployments and local development.
"""

import os

from fastapi.middleware.cors import CORSMiddleware

from main import app


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "https://veriguard-nc81mwtt-veriguard-ai.vercel.app",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
