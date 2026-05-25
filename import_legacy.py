#!/usr/bin/env python3
"""
import_legacy.py — Importa dati dal CSV storico nel database CRM Ecotrentino.

Uso:
    python import_legacy.py <file.csv>

Il CSV deve avere separatore ";" e encoding utf-8-sig.
Colonne attese (nomi esatti, case-insensitive):
    Cliente, Attività, Indirizzo, Città, Sito, Email, Telefono,
    Contatto, Contatto diretto, Settore, Prodotto/Interesse,
    Fonte Lead, Stato, Ultimo contatto, Feedback/Note, Ordine, Commessa €
"""

import csv
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import SessionLocal
import models

# ─── Mappings ────────────────────────────────────────────────────────────────

STATO_MAP = {
    'lead':              'freddo',
    'primo contatto':    'freddo',
    'prima telefonata':  'contattato',
    'in trattativa':     'trattativa',
    'trattativa':        'trattativa',
    'cliente acquisito': 'cliente',
    'cliente':           'cliente',
    'perso':             'perso',
}

TIPO_MAP = {
    'metalli':                 'metalli',
    'acciaio':                 'metalli',
    'alluminio':               'metalli',
    'ferro':                   'metalli',
    'meccanica':               'meccanica',
    'meccanico':               'meccanica',
    'macchine':                'meccanica',
    'lavorazioni meccaniche':  'meccanica',
    'legno':                   'legno',
    'falegnameria':            'legno',
    'chimica':                 'chimica',
    'chimico':                 'chimica',
    'vernici':                 'chimica',
    'verniciatura':            'chimica',
    'navale':                  'navale',
    'nautica':                 'navale',
    'militare':                'militare',
    'difesa':                  'militare',
    'alimentare':              'alimentare',
    'food':                    'alimentare',
    'plastica':                'plastica',
    'gomma':                   'plastica',
    'polimeri':                'plastica',
    'recycling':               'recycling',
    'riciclaggio':             'recycling',
    'riciclo':                 'recycling',
    'biomassa':                'biomassa',
    'pellet':                  'biomassa',
    'essiccazione':            'essiccazione',
    'essiccatura':             'essiccazione',
    'manutenzione':            'manutenzione',
    'impiantista':             'impiantista',
    'impianti':                'impiantista',
    'installatore':            'impiantista',
    'biogas':                  'biogas',
    'biometano':               'biogas',
    'edilizia':                'edilizia',
    'costruzioni':             'edilizia',
    'impiantista industriale': 'impiantista_industriale',
    'impianto industriale':    'impiantista_industriale',
    'engineering':             'engineering',
    'ingegneria':              'engineering',
    'rivenditore':             'rivenditore',
    'distribuzione':           'rivenditore',
    'distributore':            'rivenditore',
}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def clean(val) -> str:
    return (val or '').strip()


def col(row: dict, *names: str) -> str:
    """Cerca il primo nome di colonna trovato nel dict (case-insensitive)."""
    low = {k.lower().strip(): v for k, v in row.items()}
    for name in names:
        v = low.get(name.lower().strip())
        if v is not None:
            return clean(v)
    return ''


def normalize_tipo(raw: str) -> str | None:
    if not raw:
        return None
    key = raw.strip().lower()
    if key in TIPO_MAP:
        return TIPO_MAP[key]
    for k, v in TIPO_MAP.items():
        if k in key or key in k:
            return v
    return 'altro'


def parse_citta_provincia(raw: str):
    """'Como (CO)' → ('Como', 'CO'). Restituisce (citta, provincia)."""
    raw = clean(raw)
    if not raw:
        return None, None
    m = re.search(r'\((\w{2,3})\)\s*$', raw)
    if m:
        prov = m.group(1).upper()
        citta = raw[:m.start()].strip().rstrip(',').strip()
        return citta or None, prov
    return raw or None, None


def parse_indirizzo(raw: str) -> str | None:
    """Rimuove il CAP a 5 cifre dall'indirizzo."""
    raw = clean(raw)
    if not raw:
        return None
    cleaned = re.sub(r'\b\d{5}\b', '', raw).strip().strip(',').strip()
    return cleaned or None


def parse_date(raw: str) -> datetime | None:
    raw = clean(raw)
    if not raw:
        return None
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d.%m.%Y', '%m/%d/%Y'):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def parse_float(raw: str) -> float | None:
    """'1.500,00 €' → 1500.0"""
    raw = re.sub(r'[€$£\s]', '', clean(raw))
    if not raw:
        return None
    if ',' in raw and '.' in raw:
        raw = raw.replace('.', '').replace(',', '.')
    elif ',' in raw:
        raw = raw.replace(',', '.')
    try:
        val = float(raw)
        return val if val != 0 else None
    except ValueError:
        return None


def parse_bool(raw: str) -> bool:
    return clean(raw).lower() in ('sì', 'si', 'yes', '1', 'true', 'vero', 'x')


def split_nome_cognome(raw: str) -> tuple[str, str]:
    raw = clean(raw)
    if not raw:
        return '', ''
    parts = raw.split(None, 1)
    return parts[0], parts[1] if len(parts) > 1 else ''


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    csv_path = sys.argv[1]
    if not Path(csv_path).exists():
        print(f"Errore: file non trovato: {csv_path}")
        sys.exit(1)

    db = SessionLocal()
    imported = skipped = errors = 0
    tipo_unknown: set[str] = set()

    try:
        with open(csv_path, encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f, delimiter=';')
            print(f"Colonne CSV rilevate: {reader.fieldnames}")
            print()

            for row_num, row in enumerate(reader, start=2):
                ragione_sociale = col(row, 'Cliente')
                if not ragione_sociale:
                    skipped += 1
                    continue

                # ── Duplicate check ──────────────────────────────────────────
                existing = (
                    db.query(models.Azienda)
                    .filter(models.Azienda.ragione_sociale == ragione_sociale)
                    .first()
                )
                if existing:
                    print(f"  [SKIP] Riga {row_num}: '{ragione_sociale}' già presente (id={existing.id})")
                    skipped += 1
                    continue

                try:
                    # ── Parse campi azienda ──────────────────────────────────
                    citta_raw = col(row, 'Città', 'Citta')
                    citta, provincia = parse_citta_provincia(citta_raw)

                    tipo_raw = col(row, 'Settore')
                    tipo = normalize_tipo(tipo_raw)
                    if tipo_raw and tipo == 'altro':
                        tipo_unknown.add(tipo_raw)

                    azienda = models.Azienda(
                        ragione_sociale      = ragione_sociale,
                        indirizzo            = parse_indirizzo(col(row, 'Indirizzo')),
                        citta                = citta,
                        provincia            = provincia,
                        tipo                 = tipo,
                        website              = col(row, 'Sito') or None,
                        email_aziendale      = col(row, 'Email') or None,
                        telefono_aziendale   = col(row, 'Telefono') or None,
                        attivita_descrizione = col(row, 'Attività', 'Attivita') or None,
                        prodotto_interesse   = col(row, 'Prodotto/Interesse', 'Prodotto') or None,
                        fonte_lead           = col(row, 'Fonte Lead', 'Fonte') or None,
                        ordine               = parse_bool(col(row, 'Ordine')),
                        commessa_euro        = parse_float(col(row, 'Commessa €', 'Commessa')),
                    )
                    db.add(azienda)
                    db.flush()

                    # ── Crea Contatto ────────────────────────────────────────
                    contatto_raw = col(row, 'Contatto')
                    contatto_tel = col(row, 'Contatto diretto')
                    contatto_obj = None
                    if contatto_raw:
                        nome, cognome = split_nome_cognome(contatto_raw)
                        contatto_obj = models.Contatto(
                            id_azienda = azienda.id,
                            nome       = nome,
                            cognome    = cognome,
                            telefono   = contatto_tel or None,
                        )
                        db.add(contatto_obj)
                        db.flush()

                    # ── Crea Opportunità ─────────────────────────────────────
                    stato_raw = col(row, 'Stato')
                    stato_mapped = STATO_MAP.get(stato_raw.lower())
                    if stato_mapped:
                        opp = models.Opportunita(
                            id_azienda           = azienda.id,
                            id_contatto          = contatto_obj.id if contatto_obj else None,
                            titolo               = ragione_sociale,
                            stato                = stato_mapped,
                            data_ultimo_contatto = parse_date(col(row, 'Ultimo contatto', 'Ultimo Contatto')),
                            note                 = col(row, 'Feedback/Note', 'Note') or None,
                        )
                        db.add(opp)

                    db.commit()
                    imported += 1
                    print(f"  [OK]   Riga {row_num}: '{ragione_sociale}'")

                except Exception as e:
                    db.rollback()
                    errors += 1
                    print(f"  [ERR]  Riga {row_num}: '{ragione_sociale}' — {e}")

    finally:
        db.close()

    print()
    print("═" * 55)
    print(f"  Importate : {imported}")
    print(f"  Saltate   : {skipped}")
    print(f"  Errori    : {errors}")
    print(f"  Totale    : {imported + skipped + errors}")
    if tipo_unknown:
        print(f"\n  Settori non mappati (→ 'altro'):")
        for t in sorted(tipo_unknown):
            print(f"    · {t}")
    print("═" * 55)


if __name__ == '__main__':
    main()
