from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, Boolean, func
from sqlalchemy.orm import relationship
from database import Base


class Azienda(Base):
    __tablename__ = "aziende"

    id = Column(Integer, primary_key=True, index=True)
    ragione_sociale = Column(String(255), nullable=False, index=True)
    partita_iva = Column(String(11))
    indirizzo = Column(String(255))
    citta = Column(String(100))
    provincia = Column(String(2), index=True)
    regione = Column(String(50), index=True)
    codice_ateco = Column(String(20))
    tipo = Column(String(50), index=True)
    email_aziendale = Column(String(255))
    telefono_aziendale = Column(String(20))
    website = Column(Text)
    note = Column(Text)
    attivita_descrizione = Column(String(255))
    prodotto_interesse = Column(String(255))
    fonte_lead = Column(String(50), index=True)
    ordine = Column(Boolean, default=False)
    commessa_euro = Column(Float)
    etichetta = Column(String(20), index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    contatti = relationship("Contatto", back_populates="azienda", cascade="all, delete-orphan")
    opportunita = relationship("Opportunita", back_populates="azienda", cascade="all, delete-orphan")
    attivita = relationship("Attivita", back_populates="azienda", cascade="all, delete-orphan")


class Contatto(Base):
    __tablename__ = "contatti"

    id = Column(Integer, primary_key=True, index=True)
    id_azienda = Column(Integer, ForeignKey("aziende.id"), nullable=False)
    nome = Column(String(100), nullable=True)
    cognome = Column(String(100), nullable=True)
    ruolo = Column(String(100))
    telefono = Column(String(20))
    email = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    azienda = relationship("Azienda", back_populates="contatti")
    opportunita = relationship("Opportunita", back_populates="contatto")


class Opportunita(Base):
    __tablename__ = "opportunita"

    id = Column(Integer, primary_key=True, index=True)
    id_azienda = Column(Integer, ForeignKey("aziende.id"), nullable=False)
    id_contatto = Column(Integer, ForeignKey("contatti.id"), nullable=True)
    titolo = Column(String(255), nullable=False)
    stato = Column(String(50), default="freddo", index=True)
    valore_stimato = Column(Float)
    data_primo_contatto = Column(DateTime)
    data_ultimo_contatto = Column(DateTime)
    prossimo_followup = Column(Date, index=True)
    offerte_collegate = Column(String(255))
    note = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    azienda = relationship("Azienda", back_populates="opportunita")
    contatto = relationship("Contatto", back_populates="opportunita")
    attivita = relationship("Attivita", back_populates="opportunita", cascade="all, delete-orphan")


class Attivita(Base):
    __tablename__ = "attivita"

    id = Column(Integer, primary_key=True, index=True)
    id_opportunita = Column(Integer, ForeignKey("opportunita.id"), nullable=True)
    id_azienda = Column(Integer, ForeignKey("aziende.id"), nullable=False)
    tipo = Column(String(50))  # chiamata/email/visita/offerta
    data = Column(DateTime, nullable=False)
    descrizione = Column(Text)
    esito = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    opportunita = relationship("Opportunita", back_populates="attivita")
    azienda = relationship("Azienda", back_populates="attivita")
