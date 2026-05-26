import csv
import io
import json
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
import models
from database import get_db

router = APIRouter()

DB_FIELDS = [
    "ragione_sociale", "partita_iva", "indirizzo", "citta",
    "provincia", "regione", "codice_ateco", "tipo", "note",
    "email_aziendale", "telefono_aziendale", "website",
    "attivita_descrizione", "prodotto_interesse", "fonte_lead",
]


def _read_xlsx(content: bytes) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return []
    headers = [
        str(h).strip() if h is not None else f"col_{i}"
        for i, h in enumerate(rows[0])
    ]
    result = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue
        d = {h: (str(v).strip() if v is not None else "") for h, v in zip(headers, row)}
        result.append(d)
    return result


def _detect(content: bytes) -> tuple[str, str]:
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = content.decode(enc)
        except UnicodeDecodeError:
            continue
        first_line = text.splitlines()[0] if text.splitlines() else ""
        best_delim = ";"
        best_count = 1
        for delim in (";", ",", "\t", "|"):
            count = len(first_line.split(delim))
            if count > best_count:
                best_count = count
                best_delim = delim
        return text, best_delim
    raise HTTPException(400, "Impossibile decodificare il file CSV")


@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".xlsx"):
        all_rows = _read_xlsx(content)
        rows = all_rows[:6]
        columns = list(rows[0].keys()) if rows else []
    else:
        text, delim = _detect(content)
        reader = csv.DictReader(io.StringIO(text), delimiter=delim)
        rows = []
        for i, row in enumerate(reader):
            if i >= 6:
                break
            rows.append({k.strip(): v.strip() for k, v in row.items()})
        columns = list(rows[0].keys()) if rows else []

    return {"columns": columns, "preview": rows, "db_fields": DB_FIELDS}


@router.post("/execute")
async def execute_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    db: Session = Depends(get_db),
):
    content = await file.read()
    filename = (file.filename or "").lower()

    try:
        mapping_dict: dict = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(400, "Mapping JSON non valido")

    if "ragione_sociale" not in mapping_dict:
        raise HTTPException(400, "Il campo 'ragione_sociale' è obbligatorio nel mapping")

    if filename.endswith(".xlsx"):
        all_rows = _read_xlsx(content)
    else:
        text, delim = _detect(content)
        all_rows = [
            {k.strip(): (v.strip() if v else "") for k, v in row.items()}
            for row in csv.DictReader(io.StringIO(text), delimiter=delim)
        ]

    if not all_rows:
        raise HTTPException(400, "Il file è vuoto o privo di righe dati.")

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(all_rows, 1):
        try:
            data = {}
            for db_field, csv_col in mapping_dict.items():
                if db_field not in DB_FIELDS:
                    continue
                data[db_field] = row.get(csv_col, "") or None

            rs = data.get("ragione_sociale")
            if not rs:
                skipped += 1
                continue

            exists = db.query(models.Azienda).filter(
                models.Azienda.ragione_sociale == rs
            ).first()
            if exists:
                skipped += 1
                continue

            obj = models.Azienda(**data)
            db.add(obj)
            imported += 1

            if imported % 100 == 0:
                db.flush()

        except Exception as e:
            errors.append(f"Riga {i}: {e}")

    db.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors[:20]}
