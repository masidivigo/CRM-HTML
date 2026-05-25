from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db

router = APIRouter()


def _row(c: models.Contatto) -> dict:
    return {
        "id": c.id,
        "id_azienda": c.id_azienda,
        "nome": c.nome,
        "cognome": c.cognome,
        "nome_completo": f"{c.nome} {c.cognome}",
        "ruolo": c.ruolo,
        "telefono": c.telefono,
        "email": c.email,
        "note": c.note,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "azienda_nome": c.azienda.ragione_sociale if c.azienda else None,
    }


@router.get("/")
def list_contatti(
    id_azienda: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(models.Contatto)
    if id_azienda:
        q = q.filter(models.Contatto.id_azienda == id_azienda)
    if search:
        q = q.filter(
            or_(
                models.Contatto.nome.ilike(f"%{search}%"),
                models.Contatto.cognome.ilike(f"%{search}%"),
                models.Contatto.email.ilike(f"%{search}%"),
            )
        )
    return [_row(c) for c in q.order_by(models.Contatto.cognome).offset(skip).limit(limit)]


@router.post("/", status_code=201)
def create_contatto(data: schemas.ContattoCreate, db: Session = Depends(get_db)):
    if not db.query(models.Azienda).filter(models.Azienda.id == data.id_azienda).first():
        raise HTTPException(404, "Azienda non trovata")
    obj = models.Contatto(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.get("/{id}")
def get_contatto(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Contatto).filter(models.Contatto.id == id).first()
    if not obj:
        raise HTTPException(404, "Contatto non trovato")
    return _row(obj)


@router.put("/{id}")
def update_contatto(id: int, data: schemas.ContattoUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Contatto).filter(models.Contatto.id == id).first()
    if not obj:
        raise HTTPException(404, "Contatto non trovato")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.delete("/{id}")
def delete_contatto(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Contatto).filter(models.Contatto.id == id).first()
    if not obj:
        raise HTTPException(404, "Contatto non trovato")
    db.delete(obj)
    db.commit()
    return {"ok": True}
