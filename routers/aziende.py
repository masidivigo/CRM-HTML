from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from typing import Optional, List
from pydantic import BaseModel
import models
import schemas
from database import get_db

router = APIRouter()


def _row(a: models.Azienda) -> dict:
    return {
        "id": a.id,
        "ragione_sociale": a.ragione_sociale,
        "partita_iva": a.partita_iva,
        "indirizzo": a.indirizzo,
        "citta": a.citta,
        "provincia": a.provincia,
        "regione": a.regione,
        "codice_ateco": a.codice_ateco,
        "tipo": a.tipo,
        "email_aziendale": a.email_aziendale,
        "telefono_aziendale": a.telefono_aziendale,
        "website": a.website,
        "note": a.note,
        "attivita_descrizione": a.attivita_descrizione,
        "prodotto_interesse": a.prodotto_interesse,
        "fonte_lead": a.fonte_lead,
        "ordine": bool(a.ordine),
        "commessa_euro": a.commessa_euro,
        "etichetta": a.etichetta,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "n_contatti": len(a.contatti),
        "n_opportunita": len(a.opportunita),
    }


@router.get("")
def list_aziende(
    search: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    regione: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    fonte_lead: Optional[str] = Query(None),
    etichetta: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Azienda)
    if search:
        q = q.filter(models.Azienda.ragione_sociale.ilike(f"%{search}%"))
    if provincia:
        q = q.filter(models.Azienda.provincia == provincia.upper())
    if regione:
        q = q.filter(models.Azienda.regione == regione)
    if tipo:
        q = q.filter(models.Azienda.tipo == tipo)
    if fonte_lead:
        q = q.filter(models.Azienda.fonte_lead == fonte_lead)
    if etichetta:
        q = q.filter(models.Azienda.etichetta == etichetta)
    total = q.count()
    q = q.options(selectinload(models.Azienda.contatti), selectinload(models.Azienda.opportunita))
    data = [_row(a) for a in q.order_by(models.Azienda.ragione_sociale).offset(skip).limit(limit)]
    return {"data": data, "total": total}


@router.post("", status_code=201)
def create_azienda(data: schemas.AziendaCreate, db: Session = Depends(get_db)):
    obj = models.Azienda(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _row(obj)


@router.get("/check-duplicati")
def check_duplicati(nome: str = Query(...), db: Session = Depends(get_db)):
    if len(nome) < 2:
        return []
    results = (
        db.query(models.Azienda)
        .filter(models.Azienda.ragione_sociale.ilike(f"%{nome}%"))
        .order_by(models.Azienda.ragione_sociale)
        .limit(3)
        .all()
    )
    return [{"id": a.id, "ragione_sociale": a.ragione_sociale} for a in results]


@router.get("/{id}")
def get_azienda(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Azienda).filter(models.Azienda.id == id).first()
    if not obj:
        raise HTTPException(404, "Azienda non trovata")
    return _row(obj)


@router.put("/{id}")
def update_azienda(id: int, data: schemas.AziendaUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.Azienda).filter(models.Azienda.id == id).first()
    if not obj:
        raise HTTPException(404, "Azienda non trovata")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return _row(obj)


class _BatchDeleteRequest(BaseModel):
    ids: List[int]


@router.delete("/batch")
def batch_delete_aziende(data: _BatchDeleteRequest = Body(...), db: Session = Depends(get_db)):
    if not data.ids:
        return {"ok": True, "deleted": 0}
    db.query(models.Azienda).filter(models.Azienda.id.in_(data.ids)).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "deleted": len(data.ids)}


@router.delete("/{id}")
def delete_azienda(id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Azienda).filter(models.Azienda.id == id).first()
    if not obj:
        raise HTTPException(404, "Azienda non trovata")
    db.delete(obj)
    db.commit()
    return {"ok": True}
