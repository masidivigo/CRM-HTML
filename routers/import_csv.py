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
    "provincia", "regione", "codice_ateco", "tipo", "note"
]


def _detect(content: bytes) -> tuple[str, str]:
    """Return (decoded_text, delimiter) trying encodings then delimiter candidates."""
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
    text, delim = _detect(content)

    reader = csv.DictReader(io.StringIO(text), delimiter=delim)

    rows = []
    for i, row in enumerate(reader):
        if i >= 6:
            break
        rows.append({k.strip(): v.strip() for k, v in row.items()})

    columns = list(rows[0].keys()) if rows else []
    return {
        "columns": columns,
        "preview": rows,
        "db_fields": DB_FIELDS,
    }


@router.post("/execute")
async def execute_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),  # JSON: {"ragione_sociale": "Nome Azienda", ...}
    db: Session = Depends(get_db),
):
    content = await file.read()
    text, delim = _detect(content)

    try:
        mapping_dict: dict = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(400, "Mapping JSON non valido")

    if "ragione_sociale" not in mapping_dict:
        raise HTTPException(400, "Il campo 'ragione_sociale' è obbligatorio nel mapping")

    reader = csv.DictReader(io.StringIO(text), delimiter=delim)
    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, 1):
        row = {k.strip(): (v.strip() if v else "") for k, v in row.items()}
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

            # Skip duplicates by ragione_sociale
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
