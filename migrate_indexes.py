"""
Migrazione: aggiunge indici SQLite per ottimizzare le query più frequenti.
Eseguire una sola volta: python migrate_indexes.py
"""
import sqlite3

DB_PATH = "crm.db"

INDEXES = [
    ("ix_aziende_provincia", "aziende", "provincia"),
    ("ix_aziende_regione", "aziende", "regione"),
    ("ix_aziende_tipo", "aziende", "tipo"),
    ("ix_aziende_etichetta", "aziende", "etichetta"),
    ("ix_aziende_fonte_lead", "aziende", "fonte_lead"),
    ("ix_opportunita_stato", "opportunita", "stato"),
    ("ix_opportunita_prossimo_followup", "opportunita", "prossimo_followup"),
]

def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for idx_name, table, column in INDEXES:
        try:
            cur.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column})")
            print(f"[OK] Indice {idx_name} creato/verificato")
        except Exception as e:
            print(f"[SKIP] {idx_name}: {e}")

    conn.commit()
    conn.close()
    print("\nMigrazione completata.")

if __name__ == "__main__":
    main()
