from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
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


@router.get("/province")
def get_province(regione: Optional[str] = Query(None), db: Session = Depends(get_db)):
    az_q = db.query(models.Azienda).filter(
        models.Azienda.provincia.isnot(None),
        models.Azienda.provincia != "",
    )
    if regione:
        az_q = az_q.filter(models.Azienda.regione == regione)

    aziende = az_q.all()
    az_id_set = {a.id for a in aziende}

    prov_map: dict = defaultdict(lambda: {"regione": "", "az_ids": set()})
    for a in aziende:
        prov = (a.provincia or "").strip().upper()
        if not prov:
            continue
        prov_map[prov]["az_ids"].add(a.id)
        if a.regione and not prov_map[prov]["regione"]:
            prov_map[prov]["regione"] = a.regione

    opps = (
        db.query(models.Opportunita)
        .filter(models.Opportunita.id_azienda.in_(az_id_set))
        .all()
    )
    opps_by_az: dict = defaultdict(list)
    for o in opps:
        opps_by_az[o.id_azienda].append(o)

    result = []
    for prov, data in prov_map.items():
        az_ids = data["az_ids"]
        opp_list = [o for aid in az_ids for o in opps_by_az.get(aid, [])]
        n_clienti = sum(1 for o in opp_list if o.stato == "cliente")
        n_opp_attive = sum(1 for o in opp_list if o.stato not in ("cliente", "perso"))
        valore = sum(o.valore_stimato or 0 for o in opp_list if o.stato != "perso")
        result.append({
            "provincia": prov,
            "regione": data["regione"],
            "n_aziende": len(az_ids),
            "n_clienti": n_clienti,
            "n_opp_attive": n_opp_attive,
            "valore_pipeline": round(valore, 2),
        })

    result.sort(key=lambda x: x["n_aziende"], reverse=True)
    return result


@router.get("/search")
def global_search(q: str, db: Session = Depends(get_db)):
    if len(q) < 2:
        return {"aziende": [], "contatti": [], "opportunita": []}

    aziende = db.query(models.Azienda).filter(
        models.Azienda.ragione_sociale.ilike(f"%{q}%")
    ).limit(8).all()

    contatti = db.query(models.Contatto).filter(
        or_(
            models.Contatto.nome.ilike(f"%{q}%"),
            models.Contatto.cognome.ilike(f"%{q}%"),
            models.Contatto.email.ilike(f"%{q}%"),
        )
    ).limit(5).all()

    opportunita = db.query(models.Opportunita).filter(
        models.Opportunita.titolo.ilike(f"%{q}%")
    ).limit(5).all()

    return {
        "aziende": [{"id": a.id, "label": a.ragione_sociale, "tipo": a.tipo} for a in aziende],
        "contatti": [{"id": c.id, "label": f"{c.nome} {c.cognome}", "azienda": c.azienda.ragione_sociale if c.azienda else ""} for c in contatti],
        "opportunita": [{"id": o.id, "label": o.titolo, "stato": o.stato} for o in opportunita],
    }


@router.get("/followup-scaduti")
def get_followup_scaduti(db: Session = Depends(get_db)):
    oggi = date.today()
    opps = (
        db.query(models.Opportunita)
        .filter(
            models.Opportunita.prossimo_followup.isnot(None),
            models.Opportunita.prossimo_followup <= oggi,
            models.Opportunita.stato.notin_(["cliente", "perso"]),
        )
        .order_by(models.Opportunita.prossimo_followup)
        .all()
    )
    return [
        {
            "id": o.id,
            "id_azienda": o.id_azienda,
            "titolo": o.titolo,
            "stato": o.stato,
            "prossimo_followup": o.prossimo_followup.isoformat(),
            "azienda_nome": o.azienda.ragione_sociale if o.azienda else None,
        }
        for o in opps
    ]
