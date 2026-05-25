from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


# ─── Azienda ────────────────────────────────────────────────────────────────

class AziendaCreate(BaseModel):
    ragione_sociale: str
    partita_iva: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    regione: Optional[str] = None
    codice_ateco: Optional[str] = None
    tipo: Optional[str] = None
    email_aziendale: Optional[str] = None
    telefono_aziendale: Optional[str] = None
    website: Optional[str] = None
    note: Optional[str] = None
    attivita_descrizione: Optional[str] = None
    prodotto_interesse: Optional[str] = None
    fonte_lead: Optional[str] = None
    ordine: Optional[bool] = False
    commessa_euro: Optional[float] = None
    etichetta: Optional[str] = None


class AziendaUpdate(BaseModel):
    ragione_sociale: Optional[str] = None
    partita_iva: Optional[str] = None
    indirizzo: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    regione: Optional[str] = None
    codice_ateco: Optional[str] = None
    tipo: Optional[str] = None
    email_aziendale: Optional[str] = None
    telefono_aziendale: Optional[str] = None
    website: Optional[str] = None
    note: Optional[str] = None
    attivita_descrizione: Optional[str] = None
    prodotto_interesse: Optional[str] = None
    fonte_lead: Optional[str] = None
    ordine: Optional[bool] = None
    commessa_euro: Optional[float] = None
    etichetta: Optional[str] = None


# ─── Contatto ────────────────────────────────────────────────────────────────

class ContattoCreate(BaseModel):
    id_azienda: int
    nome: str
    cognome: str
    ruolo: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = None


class ContattoUpdate(BaseModel):
    id_azienda: Optional[int] = None
    nome: Optional[str] = None
    cognome: Optional[str] = None
    ruolo: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = None


# ─── Opportunita ─────────────────────────────────────────────────────────────

class OpportunitaCreate(BaseModel):
    id_azienda: int
    id_contatto: Optional[int] = None
    titolo: str
    stato: Optional[str] = "freddo"
    valore_stimato: Optional[float] = None
    data_primo_contatto: Optional[datetime] = None
    data_ultimo_contatto: Optional[datetime] = None
    prossimo_followup: Optional[date] = None
    offerte_collegate: Optional[str] = None
    note: Optional[str] = None


class OpportunitaUpdate(BaseModel):
    id_azienda: Optional[int] = None
    id_contatto: Optional[int] = None
    titolo: Optional[str] = None
    stato: Optional[str] = None
    valore_stimato: Optional[float] = None
    data_primo_contatto: Optional[datetime] = None
    data_ultimo_contatto: Optional[datetime] = None
    prossimo_followup: Optional[date] = None
    offerte_collegate: Optional[str] = None
    note: Optional[str] = None


class StatoUpdate(BaseModel):
    stato: str


# ─── Attivita ────────────────────────────────────────────────────────────────

class AttivitaCreate(BaseModel):
    id_opportunita: Optional[int] = None
    id_azienda: int
    tipo: str
    data: datetime
    descrizione: Optional[str] = None
    esito: Optional[str] = None


class AttivitaUpdate(BaseModel):
    id_opportunita: Optional[int] = None
    id_azienda: Optional[int] = None
    tipo: Optional[str] = None
    data: Optional[datetime] = None
    descrizione: Optional[str] = None
    esito: Optional[str] = None
