import json
import logging
import re
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from anthropic import Anthropic

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

SYSTEM_PROMPT = """Sei un assistente che estrae dati aziendali strutturati da pagine web. Analizza il contenuto e restituisci SOLO un JSON con questi campi (null se non trovato): ragione_sociale, indirizzo, citta, provincia, regione, telefono_aziendale, email_aziendale, website, codice_ateco, attivita_descrizione, prodotto_interesse. Non aggiungere testo, solo JSON valido."""


class ScrapeRequest(BaseModel):
    url: str


def clean_html(html: str) -> str:
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<noscript[^>]*>.*?</noscript>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    html = re.sub(r'<[^>]+>', ' ', html)
    html = re.sub(r'&nbsp;', ' ', html)
    html = re.sub(r'&amp;', '&', html)
    html = re.sub(r'&lt;', '<', html)
    html = re.sub(r'&gt;', '>', html)
    html = re.sub(r'&quot;', '"', html)
    html = re.sub(r'&#\d+;', '', html)
    html = re.sub(r'\s+', ' ', html)
    return html.strip()[:15000]


@router.post("/estrai")
async def estrai_dati(req: ScrapeRequest):
    try:
        logger.info(f"=== SCRAPER START === URL: {req.url}")

        url = req.url.strip()
        if not url:
            raise HTTPException(400, "URL mancante")
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        logger.info(f"Fetching URL: {url}")

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                html = response.text
                logger.info(f"HTML fetched: {len(html)} chars")
        except httpx.TimeoutException:
            logger.error("Timeout fetching URL")
            raise HTTPException(504, "Timeout: il sito non risponde")
        except httpx.ConnectError as e:
            logger.error(f"Connection error: {e}")
            raise HTTPException(502, "Impossibile connettersi al sito")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e.response.status_code}")
            raise HTTPException(502, f"Il sito ha risposto con errore: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Fetch error: {traceback.format_exc()}")
            raise HTTPException(502, f"Errore di connessione: {str(e)}")

        text = clean_html(html)
        logger.info(f"Cleaned text: {len(text)} chars")

        if len(text) < 50:
            raise HTTPException(422, "Contenuto insufficiente per l'estrazione")

        logger.info("Calling Anthropic API...")

        try:
            client = Anthropic()
            logger.info("Anthropic client created")

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": f"Estrai i dati aziendali da questo contenuto:\n\n{text}"}
                ]
            )
            logger.info("Anthropic API call successful")

            result_text = message.content[0].text.strip()
            logger.info(f"Raw response: {result_text[:200]}...")

            if result_text.startswith("```"):
                result_text = re.sub(r'^```(?:json)?\s*', '', result_text)
                result_text = re.sub(r'\s*```$', '', result_text)

            data = json.loads(result_text)
            logger.info(f"Parsed data: {data}")

            if "website" not in data or not data["website"]:
                data["website"] = url

            logger.info("=== SCRAPER SUCCESS ===")
            return data

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            raise HTTPException(422, "Impossibile elaborare i dati estratti")
        except Exception as e:
            logger.error(f"Anthropic API error: {traceback.format_exc()}")
            raise HTTPException(500, f"Errore nell'analisi AI: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"=== SCRAPER UNEXPECTED ERROR ===\n{traceback.format_exc()}")
        raise HTTPException(500, f"Errore inatteso: {str(e)}")
