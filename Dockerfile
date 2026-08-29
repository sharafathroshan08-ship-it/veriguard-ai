# Single-service Render deployment for the complete VeriGuard AI stack.
# Builds the existing Vite frontend, installs the existing FastAPI backend,
# and serves both from one Render web service.

FROM node:22-alpine AS frontend-builder

WORKDIR /build

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/

# Same-origin API in the unified deployment.
ENV VITE_API_URL=/
RUN cd frontend && npm run build


FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        tesseract-ocr \
        libglib2.0-0 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend-builder /build/frontend/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/start.sh /start.sh

RUN chmod +x /start.sh \
    && rm -f /etc/nginx/sites-enabled/default

EXPOSE 10000

CMD ["/start.sh"]
