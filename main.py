import threading
import time
import webbrowser

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import engine
import models
from routers import aziende, attivita, contatti, dashboard, import_csv, opportunita

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ecotrentino CRM", version="1.0.0", docs_url="/api/docs", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(aziende.router,    prefix="/api/aziende",    tags=["aziende"])
app.include_router(contatti.router,   prefix="/api/contatti",   tags=["contatti"])
app.include_router(opportunita.router, prefix="/api/opportunita", tags=["opportunita"])
app.include_router(attivita.router,   prefix="/api/attivita",   tags=["attivita"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["dashboard"])
app.include_router(import_csv.router, prefix="/api/import",     tags=["import"])

app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/")
async def root():
    return FileResponse("frontend/index.html")


def _open_browser():
    time.sleep(1.2)
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    threading.Thread(target=_open_browser, daemon=True).start()
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
