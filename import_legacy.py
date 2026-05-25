#!/usr/bin/env python3
"""
import_legacy.py — Importa/aggiorna dati dal CSV storico nel CRM Ecotrentino.

Uso:
    python import_legacy.py <file.csv>

Il CSV deve avere separatore ";" e encoding utf-8-sig.
Comportamento:
    - Se l'azienda (per ragione sociale) NON esiste → crea azienda + contatto + opportunità
    - Se l'azienda ESISTE già             → aggiorna i campi vuoti/mancanti + crea contatto se assente
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
    """Cerca il primo nome colonna trovato nel dict (case-insensitive)."""
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
    """'Bregnano (CO)' → ('Bregnano', 'CO'). Restituisce (citta, provincia)."""
    raw = clean(raw)
    if not raw:
        return None, None
    m = re.search(r'\((\w{2,3})\)\s*$', raw)
    if m:
        prov = m.group(1).upper()
        citta = raw[:m.start()].strip().rstrip(',').strip()
        return citta or None, prov
    return raw or None, None


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


def parse_contatto(raw: str) -> tuple[str, str, str | None]:
    """
    'Marco Rossi - Acquisti' → (nome='Marco', cognome='Rossi', ruolo='Acquisti')
    'Marco Rossi'            → (nome='Marco', cognome='Rossi', ruolo=None)
    """
    raw = clean(raw)
    if not raw:
        return '', '', None
    parts = raw.split(' - ', 1)
    nome_cognome = parts[0].strip()
    ruolo = parts[1].strip() if len(parts) > 1 else None
    name_parts = nome_cognome.split(None, 1)
    nome = name_parts[0] if name_parts else ''
    cognome = name_parts[1] if len(name_parts) > 1 else ''
    return nome, cognome, ruolo


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
    created = updated = skipped = ct_created = ct_updated = errors = 0
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

                try:
                    # ── Parse campi comuni ────────────────────────────────────
                    citta_raw = col(row, 'Città', 'Citta')
                    citta, provincia = parse_citta_provincia(citta_raw)

                    tipo_raw = col(row, 'Settore')
                    tipo = normalize_tipo(tipo_raw)
                    if tipo_raw and tipo == 'altro':
                        tipo_unknown.add(tipo_raw)

                    # Indirizzo salvato integralmente (incluso CAP se presente)
                    indirizzo = col(row, 'Indirizzo') or None
                    website = col(row, 'Sito') or None
                    email_az = col(row, 'Email') or None
                    telefono_az = col(row, 'Telefono') or None
                    attivita_desc = col(row, 'Attività', 'Attivita') or None
                    prodotto = col(row, 'Prodotto/Interesse', 'Prodotto') or None
                    fonte = col(row, 'Fonte Lead', 'Fonte') or None
                    ordine = parse_bool(col(row, 'Ordine'))
                    commessa = parse_float(col(row, 'Commessa €', 'Commessa'))

                    # ── Upsert azienda ────────────────────────────────────────
                    existing = (
                        db.query(models.Azienda)
                        .filter(models.Azienda.ragione_sociale == ragione_sociale)
                        .first()
                    )

                    if existing:
                        # Aggiorna solo i campi attualmente vuoti
                        changed = False
                        def _upd(attr, val):
                            nonlocal changed
                            if val and not getattr(existing, attr):
                                setattr(existing, attr, val)
                                changed = True

                        _upd('indirizzo',            indirizzo)
                        _upd('citta',                citta)
                        _upd('provincia',            provincia)
                        _upd('website',              website)
                        _upd('email_aziendale',      email_az)
                        _upd('telefono_aziendale',   telefono_az)
                        _upd('attivita_descrizione', attivita_desc)
                        _upd('prodotto_interesse',   prodotto)
                        _upd('fonte_lead',           fonte)
                        _upd('tipo',                 tipo)
                        if ordine and not existing.ordine:
                            existing.ordine = True; changed = True
                        if commessa and not existing.commessa_euro:
                            existing.commessa_euro = commessa; changed = True

                        # Fix citta/provincia se provincia contiene la città intera
                        if existing.provincia and len(existing.provincia) > 3:
                            _, prov_fix = parse_citta_provincia(existing.provincia)
                            if prov_fix:
                                existing.provincia = prov_fix
                                changed = True
                        if citta and existing.citta and len(existing.citta) > len(citta) + 5:
                            existing.citta = citta
                            changed = True

                        azienda = existing
                        updated += 1
                        status = 'UPD' if changed else 'NOP'
                    else:
                        azienda = models.Azienda(
                            ragione_sociale      = ragione_sociale,
                            indirizzo            = indirizzo,
                            citta                = citta,
                            provincia            = provincia,
                            tipo                 = tipo,
                            website              = website,
                            email_aziendale      = email_az,
                            telefono_aziendale   = telefono_az,
                            attivita_descrizione = attivita_desc,
                            prodotto_interesse   = prodotto,
                            fonte_lead           = fonte,
                            ordine               = ordine,
                            commessa_euro        = commessa,
                        )
                        db.add(azienda)
                        db.flush()
                        created += 1
                        status = 'NEW'

                    # ── Upsert contatto ───────────────────────────────────────
                    contatto_raw = col(row, 'Contatto')
                    contatto_tel = col(row, 'Contatto diretto') or None
                    contatto_obj = None

                    if contatto_raw:
                        nome, cognome, ruolo = parse_contatto(contatto_raw)
                        if nome:
                            existing_ct = (
                                db.query(models.Contatto)
                                .filter(
                                    models.Contatto.id_azienda == azienda.id,
                                    models.Contatto.nome == nome,
                                    models.Contatto.cognome == cognome,
                                )
                                .first()
                            )
                            if existing_ct:
                                if contatto_tel and not existing_ct.telefono:
                                    existing_ct.telefono = contatto_tel
                                if ruolo and not existing_ct.ruolo:
                                    existing_ct.ruolo = ruolo
                                contatto_obj = existing_ct
                                ct_updated += 1
                            else:
                                contatto_obj = models.Contatto(
                                    id_azienda = azienda.id,
                                    nome       = nome,
                                    cognome    = cognome,
                                    ruolo      = ruolo,
                                    telefono   = contatto_tel,
                                )
                                db.add(contatto_obj)
                                db.flush()
                                ct_created += 1

                    # ── Crea opportunità solo per nuove aziende ───────────────
                    if status == 'NEW':
                        stato_raw = col(row, 'Stato')
                        stato_mapped = STATO_MAP.get(stato_raw.lower())
                        if stato_mapped:
                            opp = models.Opportunita(
                                id_azienda           = azienda.id,
                                id_contatto          = contatto_obj.id if contatto_obj else None,
                                titolo               = ragione_sociale,
                                stato                = stato_mapped,
                                data_ultimo_contatto = parse_date(col(row, 'Ultimo contatto', 'Ultimo Contatto')),
                                prossimo_followup    = parse_date(col(row, 'Prossimo follow-up', 'Prossimo followup')),
                                offerte_collegate    = col(row, 'Offerte collegate') or None,
                                note                 = col(row, 'Feedback / Note', 'Feedback/Note', 'Note') or None,
                            )
                            db.add(opp)

                    db.commit()
                    print(f"  [{status}]  Riga {row_num}: '{ragione_sociale}'")

                except Exception as e:
                    db.rollback()
                    errors += 1
                    print(f"  [ERR]  Riga {row_num}: '{ragione_sociale}' — {e}")

    finally:
        db.close()

    print()
    print("=" * 55)
    print(f"  Nuove aziende  : {created}")
    print(f"  Aggiornate     : {updated}")
    print(f"  Saltate vuote  : {skipped}")
    print(f"  Errori         : {errors}")
    print(f"  Contatti creati: {ct_created}")
    print(f"  Contatti aggto : {ct_updated}")
    print(f"  Totale righe   : {created + updated + skipped + errors}")
    if tipo_unknown:
        print(f"\n  Settori non mappati (-> 'altro'):")
        for t in sorted(tipo_unknown):
            print(f"    - {t}")
    print("=" * 55)


if __name__ == '__main__':
    main()
