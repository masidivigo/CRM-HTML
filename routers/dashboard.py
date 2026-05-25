from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
import models
from database import get_db

router = APIRouter()

STATI = ["freddo", "contattato", "trattativa", "offerta", "cliente", "perso"]


@router.get("/kpi")
def get_kpi(db: Session = Depends(get_db)):
    total_aziende = db.query(models.Azienda).count()

    clienti_attivi = db.query(models.Opportunita).filter(
        models.Opportunita.stato == "cliente"
    ).count()

    opp_in_corso = db.query(models.Opportunita).filter(
        models.Opportunita.stato.notin_(["cliente", "perso"])
    ).count()

    valore_pipeline = (
        db.query(func.sum(models.Opportunita.valore_stimato))
        .filter(models.Opportunita.stato.notin_(["perso"]))
        .scalar()
    ) or 0.0

    opp_per_stato = {}
    for stato in STATI:
        opp_per_stato[stato] = db.query(models.Opportunita).filter(
            models.Opportunita.stato == stato
        ).count()

    # Recent activities with joined data
    attivita_recenti = []
    for a in (
        db.query(models.Attivita)
        .order_by(models.Attivita.data.desc())
        .limit(12)
        .all()
    ):
        attivita_recenti.append({
            "id": a.id,
            "tipo": a.tipo,
            "data": a.data.isoformat() if a.data else None,
            "descrizione": a.descrizione,
            "esito": a.esito,
            "azienda_nome": a.azienda.ragione_sociale if a.azienda else None,
            "opportunita_titolo": a.opportunita.titolo if a.opportunita else None,
        })

    # Province e regioni presenti nel DB (per i filtri)
    province = [
        r[0] for r in db.query(models.Azienda.provincia).distinct().filter(
            models.Azienda.provincia.isnot(None),
            models.Azienda.provincia != ""
        ).order_by(models.Azienda.provincia).all()
    ]
    regioni = [
        r[0] for r in db.query(models.Azienda.regione).distinct().filter(
            models.Azienda.regione.isnot(None),
            models.Azienda.regione != ""
        ).order_by(models.Azienda.regione).all()
    ]

    return {
        "total_aziende": total_aziende,
        "clienti_attivi": clienti_attivi,
        "opp_in_corso": opp_in_corso,
        "valore_pipeline": valore_pipeline,
        "opp_per_stato": opp_per_stato,
        "attivita_recenti": attivita_recenti,
        "province": province,
        "regioni": regioni,
    }


@router.get("/search")
def global_search(q: str, db: Session = Depends(get_db)):
    if len(q) < 2:
        return {"aziende": [], "contatti": [], "opportunita": []}

    aziende = db.query(models.Azienda).filter(
        models.Azienda.ragione_sociale.ilike(f"%{q}%")
    ).limit(8).all()

    contatti = db.query(models.Contatto).filter(
        models.Contatto.cognome.ilike(f"%{q}%")
    ).limit(5).all()

    opportunita = db.query(models.Opportunita).filter(
        models.Opportunita.titolo.ilike(f"%{q}%")
    ).limit(5).all()

    return {
        "aziende": [{"id": a.id, "label": a.ragione_sociale, "tipo": a.tipo} for a in aziende],
        "contatti": [{"id": c.id, "label": f"{c.nome} {c.cognome}", "azienda": c.azienda.ragione_sociale if c.azienda else ""} for c in contatti],
        "opportunita": [{"id": o.id, "label": o.titolo, "stato": o.stato} for o in opportunita],
    }
