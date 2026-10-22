import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-nao-usar-em-producao")
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "24"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
# Percentual do orçamento a partir do qual um alerta é emitido
ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "0.8"))
