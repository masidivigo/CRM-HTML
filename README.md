# Ecotrentino CRM

CRM B2B locale per Ecotrentino S.r.l. — gestione prospect, pipeline commerciale e attività per aziende nel settore della filtrazione industriale.

---

## Descrizione

**Ecotrentino CRM** è un'applicazione desktop/locale sviluppata su misura per il team commerciale di **Ecotrentino S.r.l.**, azienda specializzata nella filtrazione industriale. Permette di gestire l'intero ciclo di vendita B2B: dalla raccolta dei prospect fino alla chiusura delle trattative, passando per la pianificazione delle attività e il monitoraggio della pipeline.

### A chi è destinato

- Agenti e commerciali interni di Ecotrentino S.r.l.
- Responsabili commerciali che necessitano di una visione aggregata della pipeline
- Personale amministrativo che gestisce l'import di liste aziende da Excel/CSV

---

## Sezioni principali

### Cruscotto
Panoramica in tempo reale con KPI commerciali: numero di aziende prospect, valore totale della pipeline, attività in scadenza e grafici sull'andamento delle trattative per fase e per settore. Costruito con **Chart.js** per visualizzazioni interattive.

### Aziende
Anagrafica completa delle aziende prospect e clienti. Ogni scheda include ragione sociale, settore, dimensione, indirizzo, sito web, note e lo storico delle interazioni. Filtri rapidi per settore, area geografica e stato commerciale.

### Contatti
Rubrica dei referenti aziendali collegati alle rispettive aziende. Gestione di nome, ruolo, email, telefono e preferenze di contatto. Possibilità di aggiungere note specifiche per ogni contatto.

### Pipeline Kanban
Vista drag-and-drop delle trattative commerciali organizzate per fase: **Prospect → Contattato → Proposta → Negoziazione → Chiuso Vinto / Chiuso Perso**. Ogni card mostra azienda, valore stimato e prossima attività pianificata.

### Attività
Calendario e lista delle attività commerciali: chiamate, email, visite, follow-up. Ogni attività è associata a un'azienda e/o a un contatto, con data di scadenza e stato (da fare, completata, annullata).

### Import CSV
Modulo dedicato all'importazione massiva di aziende e contatti da file **Excel (.xlsx) o CSV**. Supporta il mapping delle colonne, la preview dei dati prima dell'import e la gestione dei duplicati.

---

## Requisiti di sistema

| Requisito | Dettaglio |
|-----------|-----------|
| Sistema operativo | Windows 10 / Windows 11 |
| Python | 3.8 o superiore |
| Browser | Chrome, Edge o Firefox (per l'interfaccia web locale) |
| RAM | Minimo 4 GB |
| Spazio disco | ~200 MB (escluso ambiente virtuale) |

> **Nota:** l'applicazione gira interamente in locale. Non richiede connessione a internet né server esterni.

---

## Installazione passo per passo

### 1. Clona il repository

```bash
git clone https://github.com/masidivigo/CRM-HTML.git
cd CRM-HTML
```

### 2. Avvia l'applicazione

Fai doppio clic su **`start.bat`** nella cartella principale.

Lo script si occupa automaticamente di:
- Creare l'ambiente virtuale Python (`venv/`)
- Installare tutte le dipendenze da `requirements.txt`
- Inizializzare il database SQLite (`crm.db`) al primo avvio
- Avviare il server FastAPI sulla porta `8000`
- Aprire il browser all'indirizzo `http://localhost:8000`

### 3. Avvii successivi

Basta fare doppio clic su **`start.bat`** ogni volta. Il database e l'ambiente virtuale già esistenti vengono riutilizzati.

---

## Struttura del progetto

```
ecotrentino-crm/
│
├── start.bat               # Script di avvio (doppio clic per lanciare)
├── main.py                 # Entry point FastAPI — routes e configurazione server
├── models.py               # Modelli SQLAlchemy (Azienda, Contatto, Trattativa, Attività)
├── database.py             # Configurazione connessione SQLite e sessioni DB
├── requirements.txt        # Dipendenze Python
├── crm.db                  # Database SQLite locale (generato al primo avvio)
│
├── routers/                # Moduli API per sezione
│   ├── aziende.py          # CRUD aziende
│   ├── contatti.py         # CRUD contatti
│   ├── trattative.py       # CRUD pipeline / trattative
│   ├── attivita.py         # CRUD attività
│   └── import_csv.py       # Logica import da Excel/CSV
│
├── static/                 # Asset frontend
│   ├── css/
│   │   └── style.css       # Stili custom (Tailwind CSS via CDN)
│   ├── js/
│   │   ├── dashboard.js    # Grafici Chart.js per il cruscotto
│   │   ├── kanban.js       # Logica drag-and-drop pipeline
│   │   └── import.js       # Preview e mapping colonne CSV
│   └── img/
│       └── logo.png        # Logo Ecotrentino
│
└── templates/              # Template HTML (Jinja2)
    ├── base.html           # Layout principale con navbar
    ├── dashboard.html      # Cruscotto con KPI
    ├── aziende.html        # Lista e scheda aziende
    ├── contatti.html       # Lista e scheda contatti
    ├── pipeline.html       # Vista Kanban
    ├── attivita.html       # Lista attività
    └── import.html         # Modulo import CSV
```

---

## Primo avvio — cosa aspettarsi

1. **Doppio clic su `start.bat`** — si apre una finestra del terminale con i log del server.
2. Dopo pochi secondi il browser si apre su `http://localhost:8000`.
3. Il **Cruscotto** sarà vuoto: pipeline a zero, nessuna azienda, nessun contatto — è normale.
4. Puoi iniziare aggiungendo manualmente la prima azienda dalla sezione **Aziende → Nuova azienda**, oppure importare subito una lista dalla sezione **Import CSV**.
5. Il database `crm.db` viene creato automaticamente nella cartella principale.

> Per chiudere l'applicazione, chiudi la finestra del terminale con il server.

---

## Import dati da Excel / CSV

### Formati supportati
- `.csv` (separatore virgola o punto e virgola, encoding UTF-8)
- `.xlsx` (Excel 2007 o superiore)

### Procedura

1. Vai alla sezione **Import CSV** nel menu laterale.
2. Clicca **Seleziona file** e scegli il tuo file Excel o CSV.
3. Viene mostrata una **preview** delle prime righe con il mapping automatico delle colonne.
4. Verifica o correggi il mapping (es. associa la colonna "Denominazione" al campo "Ragione Sociale").
5. Seleziona come gestire i **duplicati**: ignora / aggiorna / segnala.
6. Clicca **Importa** — a fine processo viene mostrato un riepilogo (importati, aggiornati, errori).

### Colonne riconosciute automaticamente

| Campo CRM | Alias riconosciuti nel file |
|-----------|----------------------------|
| Ragione Sociale | `ragione sociale`, `azienda`, `denominazione`, `company` |
| Settore | `settore`, `categoria`, `industry` |
| Città | `città`, `citta`, `city`, `comune` |
| Email | `email`, `e-mail`, `posta elettronica` |
| Telefono | `telefono`, `tel`, `phone` |
| Sito Web | `sito`, `website`, `url` |

---

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) (Python) |
| Database | [SQLite](https://www.sqlite.org/) via [SQLAlchemy](https://www.sqlalchemy.org/) |
| Template engine | [Jinja2](https://jinja.palletsprojects.com/) |
| CSS framework | [Tailwind CSS](https://tailwindcss.com/) (CDN) |
| Grafici | [Chart.js](https://www.chartjs.org/) |
| Import Excel | [openpyxl](https://openpyxl.readthedocs.io/) / [pandas](https://pandas.pydata.org/) |
| Server | Uvicorn (ASGI) |

---

## Licenza

**Uso privato — Proprietario Ecotrentino S.r.l.**

Questo software è sviluppato ad uso esclusivo interno di **Ecotrentino S.r.l.** Tutti i diritti sono riservati. È vietata la riproduzione, distribuzione o cessione a terzi senza autorizzazione scritta.

---

## Contatti progetto

**Ecotrentino S.r.l.**
Progetto CRM interno — sviluppo e manutenzione

Per segnalazioni, richieste di funzionalità o supporto tecnico, contattare il referente IT interno o aprire una issue nel repository GitHub privato.

---
---

# Ecotrentino CRM — English

B2B local CRM for Ecotrentino S.r.l. — prospect management, sales pipeline and activity tracking for companies in the industrial filtration sector.

---

## Description

**Ecotrentino CRM** is a local desktop application built specifically for the sales team of **Ecotrentino S.r.l.**, a company specializing in industrial filtration. It covers the full B2B sales cycle: from prospect collection to deal closure, including activity planning and pipeline monitoring.

### Who it's for

- Internal sales agents and account managers at Ecotrentino S.r.l.
- Sales managers who need an aggregated view of the pipeline
- Administrative staff who manage bulk imports of company lists from Excel/CSV

---

## Main Sections

### Dashboard
Real-time overview with commercial KPIs: number of prospect companies, total pipeline value, upcoming activities and charts showing deal trends by stage and sector. Built with **Chart.js** for interactive visualizations.

### Companies
Complete company registry for prospects and customers. Each card includes company name, sector, size, address, website, notes and interaction history. Quick filters by sector, geographic area and commercial status.

### Contacts
Directory of company contacts linked to their respective companies. Manage name, role, email, phone and contact preferences. Add notes specific to each contact.

### Kanban Pipeline
Drag-and-drop view of commercial deals organized by stage: **Prospect → Contacted → Proposal → Negotiation → Won / Lost**. Each card shows the company, estimated value and next planned activity.

### Activities
Calendar and list of commercial activities: calls, emails, visits, follow-ups. Each activity is linked to a company and/or contact, with a due date and status (to do, completed, cancelled).

### CSV Import
Module for bulk importing companies and contacts from **Excel (.xlsx) or CSV** files. Supports column mapping, data preview before import and duplicate handling.

---

## System Requirements

| Requirement | Detail |
|-------------|--------|
| Operating System | Windows 10 / Windows 11 |
| Python | 3.8 or higher |
| Browser | Chrome, Edge or Firefox (for the local web interface) |
| RAM | Minimum 4 GB |
| Disk Space | ~200 MB (excluding virtual environment) |

> **Note:** the application runs entirely locally. No internet connection or external servers required.

---

## Step-by-step Installation

### 1. Clone the repository

```bash
git clone https://github.com/masidivigo/CRM-HTML.git
cd CRM-HTML
```

### 2. Launch the application

Double-click **`start.bat`** in the project root folder.

The script automatically handles:
- Creating the Python virtual environment (`venv/`)
- Installing all dependencies from `requirements.txt`
- Initializing the SQLite database (`crm.db`) on first run
- Starting the FastAPI server on port `8000`
- Opening the browser at `http://localhost:8000`

### 3. Subsequent launches

Just double-click **`start.bat`** each time. The existing database and virtual environment are reused.

---

## Project Structure

```
ecotrentino-crm/
│
├── start.bat               # Launch script (double-click to start)
├── main.py                 # FastAPI entry point — routes and server config
├── models.py               # SQLAlchemy models (Company, Contact, Deal, Activity)
├── database.py             # SQLite connection and session configuration
├── requirements.txt        # Python dependencies
├── crm.db                  # Local SQLite database (generated on first run)
│
├── routers/                # API modules by section
│   ├── aziende.py          # Companies CRUD
│   ├── contatti.py         # Contacts CRUD
│   ├── trattative.py       # Pipeline / deals CRUD
│   ├── attivita.py         # Activities CRUD
│   └── import_csv.py       # Excel/CSV import logic
│
├── static/                 # Frontend assets
│   ├── css/
│   │   └── style.css       # Custom styles (Tailwind CSS via CDN)
│   ├── js/
│   │   ├── dashboard.js    # Chart.js graphs for dashboard
│   │   ├── kanban.js       # Drag-and-drop pipeline logic
│   │   └── import.js       # CSV column mapping and preview
│   └── img/
│       └── logo.png        # Ecotrentino logo
│
└── templates/              # HTML templates (Jinja2)
    ├── base.html           # Main layout with navbar
    ├── dashboard.html      # KPI dashboard
    ├── aziende.html        # Company list and detail
    ├── contatti.html       # Contact list and detail
    ├── pipeline.html       # Kanban view
    ├── attivita.html       # Activity list
    └── import.html         # CSV import module
```

---

## First Launch — What to Expect

1. **Double-click `start.bat`** — a terminal window opens with server logs.
2. After a few seconds the browser opens at `http://localhost:8000`.
3. The **Dashboard** will be empty: zero pipeline, no companies, no contacts — this is normal.
4. You can start by manually adding the first company under **Companies → New Company**, or immediately import a list from the **CSV Import** section.
5. The `crm.db` database is automatically created in the root folder.

> To close the application, close the terminal window running the server.

---

## Importing Data from Excel / CSV

### Supported formats
- `.csv` (comma or semicolon separator, UTF-8 encoding)
- `.xlsx` (Excel 2007 or later)

### Procedure

1. Go to the **CSV Import** section in the sidebar menu.
2. Click **Select file** and choose your Excel or CSV file.
3. A **preview** of the first rows is shown with automatic column mapping.
4. Verify or correct the mapping (e.g. map the "Denominazione" column to the "Company Name" field).
5. Choose how to handle **duplicates**: skip / update / flag.
6. Click **Import** — at the end a summary is shown (imported, updated, errors).

### Automatically recognized columns

| CRM Field | Recognized aliases |
|-----------|-------------------|
| Company Name | `ragione sociale`, `azienda`, `denominazione`, `company` |
| Sector | `settore`, `categoria`, `industry` |
| City | `città`, `citta`, `city`, `comune` |
| Email | `email`, `e-mail`, `posta elettronica` |
| Phone | `telefono`, `tel`, `phone` |
| Website | `sito`, `website`, `url` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) (Python) |
| Database | [SQLite](https://www.sqlite.org/) via [SQLAlchemy](https://www.sqlalchemy.org/) |
| Template engine | [Jinja2](https://jinja.palletsprojects.com/) |
| CSS framework | [Tailwind CSS](https://tailwindcss.com/) (CDN) |
| Charts | [Chart.js](https://www.chartjs.org/) |
| Excel import | [openpyxl](https://openpyxl.readthedocs.io/) / [pandas](https://pandas.pydata.org/) |
| Server | Uvicorn (ASGI) |

---

## License

**Private use — Proprietary to Ecotrentino S.r.l.**

This software is developed for the exclusive internal use of **Ecotrentino S.r.l.** All rights reserved. Reproduction, distribution or transfer to third parties is prohibited without written authorization.

---

## Project Contact

**Ecotrentino S.r.l.**
Internal CRM project — development and maintenance

For bug reports, feature requests or technical support, contact the internal IT contact or open an issue in the private GitHub repository.
