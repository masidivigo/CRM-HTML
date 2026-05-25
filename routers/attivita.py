from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db

router = APIRouter()


def _row(a: models.Attivita) -> dict:
    return {
        "id": a.id,
        "id_opportunita": a.id_opportunita,
        "id_azienda": a.id_azienda,
        "tipo": a.tipo,
        "data": a.data.isoformat() if a.data else None,
        "descrizione": a.descrizione,
        "esito": a.esito,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "azienda_nome": a.azienda.ragione_sociale if a.azienda else None,
        "opportunita_titolo": a.opportunita.titolo if a.opportunita else None,
    }


@router.get("/")
def list_attivita(
    id_azienda: Optional[int] = Query(None),
    id_opportunita: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(models.Attivita)
    if id_azienda:
        q = q.filter(models.Attivita.id_azienda == id_azienda)
    if id_opportunita:
        q = q.filter(models.Attivita.id_opportunita == id_opportunita)
    if tipo:
        q = q.filter(models.Attivita.tipo == tipo)
    return [_row(a) for a in q.order_by(models.Attivita.data.desc()).offset(skip).limit(limit)]


@router.post("/", status_code=201)
def create_attivita(data: schemas.AttivitaCreate, db: Session = Depends(get_db)):
    if not db.query(models.Azienda).filter(models.Azienda.id == data.id_azienda).first():
        raise HTTPException(404, "Azienda non trovata")
    obj = models.Attivita(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.get("/{id}")
def get_attivita(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Attivita).filter(models.Attivita.id == id).first()
    if not obj:
        raise HTTPException(404, "Attività non trovata")
    return _row(obj)


@router.put("/{id}")
def update_attivita(id: int, data: schemas.AttivitaUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Attivita).filter(models.Attivita.id == id).first()
    if not obj:
        raise HTTPException(404, "Attività non trovata")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.delete("/{id}")
def delete_attivita(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Attivita).filter(models.Attivita.id == id).first()
    if not obj:
        raise HTTPException(404, "Attività non trovata")
    db.delete(obj)
    db.commit()
    return {"ok": True}
