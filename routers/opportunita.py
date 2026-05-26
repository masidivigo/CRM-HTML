from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import models
import schemas
from database import get_db

router = APIRouter()

STATI = ["freddo", "contattato", "trattativa", "offerta", "cliente", "perso"]


def _row(o: models.Opportunita) -> dict:
    return {
        "id": o.id,
        "id_azienda": o.id_azienda,
        "id_contatto": o.id_contatto,
        "titolo": o.titolo,
        "stato": o.stato,
        "valore_stimato": o.valore_stimato,
        "data_primo_contatto": o.data_primo_contatto.isoformat() if o.data_primo_contatto else None,
        "data_ultimo_contatto": o.data_ultimo_contatto.isoformat() if o.data_ultimo_contatto else None,
        "prossimo_followup": o.prossimo_followup.isoformat() if o.prossimo_followup else None,
        "offerte_collegate": o.offerte_collegate,
        "note": o.note,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "azienda_nome": o.azienda.ragione_sociale if o.azienda else None,
        "contatto_nome": (
            f"{o.contatto.nome} {o.contatto.cognome}" if o.contatto else None
        ),
        "n_attivita": len(o.attivita),
    }


@router.get("")
def list_opportunita(
    stato: Optional[str] = Query(None),
    id_azienda: Optional[int] = Query(None),
    id_contatto: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    q = db.query(models.Opportunita)
    if stato:
        q = q.filter(models.Opportunita.stato == stato)
    if id_azienda:
        q = q.filter(models.Opportunita.id_azienda == id_azienda)
    if id_contatto:
        q = q.filter(models.Opportunita.id_contatto == id_contatto)
    if search:
        q = q.filter(models.Opportunita.titolo.ilike(f"%{search}%"))
    return [_row(o) for o in q.order_by(models.Opportunita.created_at.desc()).offset(skip).limit(limit)]


@router.post("", status_code=201)
def create_opportunita(data: schemas.OpportunitaCreate, db: Session = Depends(get_db)):
    if not db.query(models.Azienda).filter(models.Azienda.id == data.id_azienda).first():
        raise HTTPException(404, "Azienda non trovata")
    obj = models.Opportunita(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.get("/{id}")
def get_opportunita(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Opportunita).filter(models.Opportunita.id == id).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    return _row(obj)


@router.put("/{id}")
def update_opportunita(id: int, data: schemas.OpportunitaUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Opportunita).filter(models.Opportunita.id == id).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.patch("/{id}/stato")
def update_stato(id: int, data: schemas.StatoUpdate, db: Session = Depends(get_db)):
    if data.stato not in STATI:
        raise HTTPException(400, f"Stato non valido. Valori: {STATI}")
    obj = db.query(models.Opportunita).filter(models.Opportunita.id == id).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    obj.stato = data.stato
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.delete("/{id}")
def delete_opportunita(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Opportunita).filter(models.Opportunita.id == id).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    db.delete(obj)
    db.commit()
    return {"ok": True}
