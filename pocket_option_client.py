"""
pocket_option_client.py
========================
TANAK, READ-ONLY omotač oko treće-strane biblioteke `binaryoptionstoolsv2`
(https://github.com/ChipaDevTeam/BinaryOptionsTools-v2, pip paket
`binaryoptionstoolsv2`) — korisnikov zahtev da vidimo da li Opi bot može
nekako da "gleda" PRAVE Pocket Option cene, ne samo Capital.com proxy.

VAŽNO, korisniku mora biti jasno (videti i README.md):
  - Ovo NIJE zvanična Pocket Option biblioteka. Pocket Option nema javni API;
    ova biblioteka oponaša njihov PRIVATNI WebSocket protokol (isti kanal
    koji koristi i sam sajt). To nosi rizik da platforma u nekom trenutku
    promeni protokol (biblioteka prestane da radi) ili ograniči nalog koji
    koristi automatizovan pristup - korisnik je o ovome eksplicitno obavešten
    pre nego što je zatražio da se ovo isproba.
  - Potreban je `ssid` - CEO auth string iz tvog browsera dok si ulogovan na
    Pocket Option (DevTools -> Network -> WS -> poruka koja počinje sa
    `42["auth",...]`), NE obična lozinka/imejl. Ovaj modul taj string NIKAD
    ne upisuje u poruku greške (isti bezbednosni princip kao za sve ostale
    tajne u projektu - videti ai_advisor._redact).
  - Prvobitno (merenje) ovaj modul je koristio ISKLJUČIVO `compare_prices.py`.
    Korisnikov naknadni zahtev ("uradi to pod 1" — ugradi STVARNE cene u
    živog bota) dodao je `fetch_candles_for_interval()` ispod, koju SADA
    `bot.py` opciono koristi (videti `config.PocketOptionPriceConfig` — OFF
    po podrazumevanoj vrednosti, i uvek sa TIHIM fallback-om na Capital.com
    na bilo koji problem — videti bot.py `_fetch_candle_series`).
"""

from __future__ import annotations

import asyncio
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any


class PocketOptionClientError(RuntimeError):
    """Sve greške ovog klijenta - mrežne, auth, neočekivan oblik odgovora -
    NIKAD ne ispisuje `ssid` u poruci (videti `_redact`)."""


@dataclass(frozen=True)
class PocketCandle:
    open: float
    high: float
    low: float
    close: float
    unix_time: int


def _redact(text: str, ssid: str) -> str:
    if not ssid:
        return text
    return text.replace(ssid, "***")


async def _fetch_candles_async(
    *, ssid: str, asset: str, period_seconds: int, count: int, timeout_seconds: float,
) -> list[dict[str, Any]]:
    # Lokalni import - `BinaryOptionsToolsV2` je OPCIONA zavisnost, treba
    # samo ovom alatu za poređenje, ne i glavnom botu (videti requirements.txt).
    try:
        from BinaryOptionsToolsV2 import PocketOptionAsync, PocketOptionError
    except ImportError as exc:
        raise PocketOptionClientError(
            "Paket 'binaryoptionstoolsv2' nije instaliran - pokreni "
            "'pip install binaryoptionstoolsv2' pa probaj ponovo."
        ) from exc

    async def _run() -> list[dict[str, Any]]:
        async with PocketOptionAsync(ssid) as client:
            return await client.get_candles(asset, period_seconds, count)

    try:
        return await asyncio.wait_for(_run(), timeout=timeout_seconds)
    except PocketOptionError as exc:
        raise PocketOptionClientError(
            f"Pocket Option API greška: {_redact(str(exc), ssid)}"
        ) from None
    except asyncio.TimeoutError:
        raise PocketOptionClientError(
            f"Pocket Option konekcija nije odgovorila u {timeout_seconds:.0f}s "
            "(moguće da je SSID istekao - izvuci svež iz browsera)."
        ) from None
    except Exception as exc:  # biblioteka je Rust/PyO3 - može baciti i druge tipove
        raise PocketOptionClientError(
            f"Neočekivana greška ka Pocket Option-u: {_redact(str(exc), ssid)}"
        ) from None


def _tick_price(tick: Any) -> float | None:
    """Cena iz jednog tika (dict sa 'close'/'price'; ili lista/tuple [vreme, cena])."""
    if isinstance(tick, dict):
        for key in ("close", "price", "value"):
            val = tick.get(key)
            if isinstance(val, (int, float)) and val > 0:
                return float(val)
        return None
    if isinstance(tick, (list, tuple)) and len(tick) >= 2 and isinstance(tick[1], (int, float)) and tick[1] > 0:
        return float(tick[1])
    return None


async def _first_tick_price(client: Any, asset: str, timeout_seconds: float) -> float:
    stream = await client.subscribe_symbol(asset)

    async def _wait() -> float:
        async for tick in stream:
            price = _tick_price(tick)
            if price is not None:
                return price
        raise PocketOptionClientError("Pocket Option stream se završio bez cene.")

    return await asyncio.wait_for(_wait(), timeout=timeout_seconds)


async def _fetch_last_price_async(*, ssid: str, asset: str, timeout_seconds: float) -> float:
    try:
        from BinaryOptionsToolsV2 import PocketOptionAsync, PocketOptionError
    except ImportError as exc:
        raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc

    async def _run() -> float:
        async with PocketOptionAsync(ssid) as client:
            return await _first_tick_price(client, asset, timeout_seconds)

    try:
        return await asyncio.wait_for(_run(), timeout=timeout_seconds + 15)
    except PocketOptionClientError:
        raise
    except PocketOptionError as exc:
        raise PocketOptionClientError(f"Pocket Option API greška: {_redact(str(exc), ssid)}") from None
    except asyncio.TimeoutError:
        raise PocketOptionClientError("Pocket Option nije poslao cenu na vreme.") from None
    except Exception as exc:  # noqa: BLE001
        raise PocketOptionClientError(
            f"Neočekivana greška ka Pocket Option-u: {_redact(str(exc) or type(exc).__name__, ssid)}"
        ) from None


async def _closed_deals_from_client(client: Any, limit: int) -> list[dict[str, Any]]:
    """Poslednjih `limit` zatvorenih trejdova sa naloga (detalji kao rečnici)."""
    import json as _json
    ids = await client.closed_deals()
    if isinstance(ids, str):
        try:
            ids = _json.loads(ids)
        except ValueError:
            ids = []
    out: list[dict[str, Any]] = []
    for item in list(ids or [])[-limit:]:
        if isinstance(item, dict):
            out.append(item)
            continue
        try:
            detail = await client.get_closed_deal(str(item))
        except Exception:  # noqa: BLE001 — jedan loš zapis ne ruši ostale
            continue
        if isinstance(detail, str):
            try:
                detail = _json.loads(detail)
            except ValueError:
                continue
        if isinstance(detail, dict):
            out.append(detail)
    return out


async def _fetch_closed_deals_async(*, ssid: str, limit: int, timeout_seconds: float) -> list[dict[str, Any]]:
    try:
        from BinaryOptionsToolsV2 import PocketOptionAsync, PocketOptionError
    except ImportError as exc:
        raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc

    async def _run() -> list[dict[str, Any]]:
        async with PocketOptionAsync(ssid) as client:
            await asyncio.sleep(2.0)  # nova veza: sačekaj da stigne istorija trejdova
            return await _closed_deals_from_client(client, limit)

    try:
        return await asyncio.wait_for(_run(), timeout=timeout_seconds)
    except PocketOptionError as exc:
        raise PocketOptionClientError(f"Pocket Option API greška: {_redact(str(exc), ssid)}") from None
    except asyncio.TimeoutError:
        raise PocketOptionClientError("Pocket Option nije vratio trejdove na vreme.") from None
    except Exception as exc:  # noqa: BLE001
        raise PocketOptionClientError(
            f"Neočekivana greška ka Pocket Option-u: {_redact(str(exc) or type(exc).__name__, ssid)}"
        ) from None


async def _stream_prices_async(
    *, ssid: str, asset: str, on_price: Any, should_stop: Any, tick_timeout: float, max_seconds: float,
) -> None:
    try:
        from BinaryOptionsToolsV2 import PocketOptionAsync, PocketOptionError
    except ImportError as exc:
        raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc

    async def _run() -> None:
        async with PocketOptionAsync(ssid) as client:
            stream = await client.subscribe_symbol(asset)
            it = stream.__aiter__()
            while not should_stop():
                try:
                    tick = await asyncio.wait_for(it.__anext__(), tick_timeout)
                except StopAsyncIteration:
                    return
                price = _tick_price(tick)
                if price is not None:
                    on_price(price)

    try:
        await asyncio.wait_for(_run(), max_seconds)
    except PocketOptionClientError:
        raise
    except PocketOptionError as exc:
        raise PocketOptionClientError(f"Pocket Option API greška: {_redact(str(exc), ssid)}") from None
    except asyncio.TimeoutError:
        raise PocketOptionClientError("Pocket Option stream je zastao (nema novih cena).") from None
    except Exception as exc:  # noqa: BLE001
        raise PocketOptionClientError(
            f"Neočekivana greška ka Pocket Option-u: {_redact(str(exc) or type(exc).__name__, ssid)}"
        ) from None


def stream_prices(
    *, ssid: str, asset: str, on_price: Any, should_stop: Any, tick_timeout: float = 12.0,
    max_seconds: float = 900.0,
) -> None:
    """Drži JEDNU živu vezu i za svaki tik poziva `on_price(cena)` dok `should_stop()` ne vrati True.
    Blokira pozivaoca (pozivati iz svoje niti). Greška/prekid veze = PocketOptionClientError.

    Raises:
        PocketOptionClientError: na BILO KOJI problem."""
    if not ssid:
        raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
    if not asset:
        raise PocketOptionClientError("asset ne sme biti prazan.")
    asyncio.run(_stream_prices_async(
        ssid=ssid, asset=asset, on_price=on_price, should_stop=should_stop, tick_timeout=tick_timeout, max_seconds=max_seconds,
    ))


# ----------------------------------------------------------------------
# STALNA konekcija (brzina). Bez ovoga svaki poziv otvara novu vezu ka
# Pocket Option-u i čeka da se učita lista asset-a (nekoliko sekundi) — zato je
# bot "kočio". Sa stalnom vezom prvi poziv se plati jednom, ostali su brzi.
# Uključuje se SAMO iz run_opi_trading_bot.py (PERSISTENT_MODE=True); na bilo
# koju grešku veza se odbacuje i pravi nova (jedan ponovni pokušaj).
# ----------------------------------------------------------------------
PERSISTENT_MODE = False


class _PersistentPocket:
    def __init__(self, ssid: str) -> None:
        self._ssid = ssid
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._loop.run_forever, daemon=True, name="pocket-loop")
        self._thread.start()
        self._client: Any = None
        self._lock: asyncio.Lock | None = None

    async def _ensure(self, timeout: float) -> Any:
        if self._client is None:
            from BinaryOptionsToolsV2 import PocketOptionAsync
            client = PocketOptionAsync(self._ssid)
            await asyncio.wait_for(client.wait_for_assets(timeout=timeout), timeout + 5)
            self._client = client
        return self._client

    async def _drop(self) -> None:
        client, self._client = self._client, None
        if client is not None:
            try:
                await asyncio.wait_for(client.shutdown(), 5)
            except Exception:  # noqa: BLE001 — best-effort
                pass

    async def _get(self, asset: str, period: int, count: int, timeout: float) -> list[dict[str, Any]]:
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            for attempt in (1, 2):
                try:
                    client = await self._ensure(timeout)
                    return await asyncio.wait_for(client.get_candles(asset, period, count), timeout)
                except Exception:  # noqa: BLE001 — odbaci vezu, probaj sa svežom
                    await self._drop()
                    if attempt == 2:
                        raise
        return []

    def get_candles(self, asset: str, period: int, count: int, timeout: float) -> list[dict[str, Any]]:
        fut = asyncio.run_coroutine_threadsafe(self._get(asset, period, count, timeout), self._loop)
        return fut.result(timeout * 2 + 15)

    async def _assets(self, timeout: float) -> list[Any]:
        """Lista asset-a (sa isplatama) sa STALNE veze — server je stalno osvežava (updateAssets)."""
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            for attempt in (1, 2):
                try:
                    client = await self._ensure(timeout)
                    return await asyncio.wait_for(client.active_assets(), timeout)
                except Exception:  # noqa: BLE001
                    await self._drop()
                    if attempt == 2:
                        raise
        return []

    def get_assets(self, timeout: float) -> list[Any]:
        fut = asyncio.run_coroutine_threadsafe(self._assets(timeout), self._loop)
        return fut.result(timeout * 2 + 15)

    async def _price(self, asset: str, timeout: float) -> float:
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            for attempt in (1, 2):
                try:
                    client = await self._ensure(timeout)
                    return await _first_tick_price(client, asset, timeout)
                except Exception:  # noqa: BLE001 — odbaci vezu, probaj sa svežom
                    await self._drop()
                    if attempt == 2:
                        raise
        raise PocketOptionClientError("nema cene")

    async def _deals(self, limit: int, timeout: float) -> list[dict[str, Any]]:
        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            for attempt in (1, 2):
                try:
                    client = await self._ensure(timeout)
                    return await asyncio.wait_for(_closed_deals_from_client(client, limit), timeout)
                except Exception:  # noqa: BLE001
                    await self._drop()
                    if attempt == 2:
                        raise
        return []

    def get_closed_deals(self, limit: int, timeout: float) -> list[dict[str, Any]]:
        fut = asyncio.run_coroutine_threadsafe(self._deals(limit, timeout), self._loop)
        return fut.result(timeout * 2 + 15)

    def get_last_price(self, asset: str, timeout: float) -> float:
        fut = asyncio.run_coroutine_threadsafe(self._price(asset, timeout), self._loop)
        return fut.result(timeout * 2 + 15)


_PERSISTENT: dict[str, _PersistentPocket] = {}
_PERSISTENT_LOCK = threading.Lock()


def _persistent_get_candles(
    *, ssid: str, asset: str, period_seconds: int, count: int, timeout_seconds: float,
) -> list[dict[str, Any]]:
    try:
        import BinaryOptionsToolsV2  # noqa: F401
    except ImportError as exc:
        raise PocketOptionClientError(
            "Paket 'binaryoptionstoolsv2' nije instaliran - pokreni "
            "'pip install binaryoptionstoolsv2' pa probaj ponovo."
        ) from exc
    with _PERSISTENT_LOCK:
        session = _PERSISTENT.get(ssid)
        if session is None:
            session = _PERSISTENT[ssid] = _PersistentPocket(ssid)
    try:
        return session.get_candles(asset, period_seconds, count, timeout_seconds)
    except Exception as exc:  # noqa: BLE001
        raise PocketOptionClientError(
            f"Pocket Option greška (stalna veza): {_redact(str(exc) or type(exc).__name__, ssid)}"
        ) from None


def fetch_candles(
    *, ssid: str, asset: str, period_seconds: int, count: int, timeout_seconds: float = 20.0,
) -> list[PocketCandle]:
    """Sinhrona (lako pozivljiva iz običnog skripta) obvertka oko async
    biblioteke. `asset` mora biti u Pocket Option formatu (npr. 'EURUSD_otc').
    `period_seconds`: 1/5/15/30/60/300 (videti PocketOptionAsync.get_candles
    docstring u biblioteci). `count`: broj sveća unazad.

    Raises:
        PocketOptionClientError: na BILO KOJI problem (prazan ssid, biblioteka
            nije instalirana, mrežna/auth greška, timeout, neočekivan odgovor).
    """
    if not ssid:
        raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
    if not asset:
        raise PocketOptionClientError("asset ne sme biti prazan.")
    if count <= 0:
        raise PocketOptionClientError(f"count mora biti > 0, dobijeno: {count}")

    if PERSISTENT_MODE:
        raw = _persistent_get_candles(
            ssid=ssid, asset=asset, period_seconds=period_seconds, count=count,
            timeout_seconds=timeout_seconds,
        )
    else:
        raw = asyncio.run(
            _fetch_candles_async(
                ssid=ssid, asset=asset, period_seconds=period_seconds, count=count,
                timeout_seconds=timeout_seconds,
            )
        )
    candles: list[PocketCandle] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            candles.append(PocketCandle(
                open=float(item["open"]), high=float(item["high"]),
                low=float(item["low"]), close=float(item["close"]),
                unix_time=int(item["time"]),
            ))
        except (KeyError, TypeError, ValueError):
            continue
    candles.sort(key=lambda c: c.unix_time)
    return candles


def fetch_last_price(*, ssid: str, asset: str, timeout_seconds: float = 15.0) -> float:
    """Trenutna (poslednja) cena sa Pocket Option-a: prvi tik sa žive pretplate.
    Služi za beleženje cene u trenutku ulaska/isteka, nezavisno od istorije sveća.

    Raises:
        PocketOptionClientError: na BILO KOJI problem."""
    if not ssid:
        raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
    if not asset:
        raise PocketOptionClientError("asset ne sme biti prazan.")
    if PERSISTENT_MODE:
        try:
            import BinaryOptionsToolsV2  # noqa: F401
        except ImportError as exc:
            raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc
        with _PERSISTENT_LOCK:
            session = _PERSISTENT.get(ssid)
            if session is None:
                session = _PERSISTENT[ssid] = _PersistentPocket(ssid)
        try:
            return session.get_last_price(asset, timeout_seconds)
        except Exception as exc:  # noqa: BLE001
            raise PocketOptionClientError(
                f"Pocket Option greška (stalna veza): {_redact(str(exc) or type(exc).__name__, ssid)}"
            ) from None
    return asyncio.run(_fetch_last_price_async(ssid=ssid, asset=asset, timeout_seconds=timeout_seconds))


def fetch_closed_deals(*, ssid: str, limit: int = 30, timeout_seconds: float = 20.0) -> list[dict[str, Any]]:
    """Poslednji zatvoreni trejdovi sa Pocket Option naloga kome pripada SSID (sirovi rečnici).

    Raises:
        PocketOptionClientError: na BILO KOJI problem."""
    if not ssid:
        raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
    if PERSISTENT_MODE:
        try:
            import BinaryOptionsToolsV2  # noqa: F401
        except ImportError as exc:
            raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc
        with _PERSISTENT_LOCK:
            session = _PERSISTENT.get(ssid)
            if session is None:
                session = _PERSISTENT[ssid] = _PersistentPocket(ssid)
        try:
            return session.get_closed_deals(limit, timeout_seconds)
        except Exception as exc:  # noqa: BLE001
            raise PocketOptionClientError(
                f"Pocket Option greška (stalna veza): {_redact(str(exc) or type(exc).__name__, ssid)}"
            ) from None
    return asyncio.run(_fetch_closed_deals_async(ssid=ssid, limit=limit, timeout_seconds=timeout_seconds))


def aggregate_candles(candles: list[PocketCandle], *, group_size: int) -> list[PocketCandle]:
    """ČISTA (bez mreže) funkcija — sastavlja manje sveće u veće (npr. 12 x
    300s -> 1 x H1 sveća), jer Pocket Option-ova `get_candles()` NE podržava
    proizvoljan `period_seconds` (videti modul docstring: samo
    1/5/15/30/60/300). `candles` MORA biti sortiran rastuće po `unix_time`
    (isto što `fetch_candles` uvek vrati).

    Grupisanje ide OD NAJNOVIJE sveće UNAZAD — ako `len(candles)` nije tačan
    umnožak `group_size`, NAJSTARIJI, NEPOTPUN ostatak se odbacuje (želimo
    tačne, kompletne sveće, ne prividno "duže" sveće sastavljene od manje
    sirovih tačaka nego što treba).

    Svaka sastavljena sveća: `open`=open prve sirove sveće u grupi,
    `close`=close poslednje, `high`/`low`=max/min od svih u grupi,
    `unix_time`=unix_time PRVE sirove sveće u grupi (konvencija "vreme
    otvaranja sveće", ista kao Capital.com-ove sveće koje bot inače koristi).

    `group_size=1` vraća `candles` nepromenjen (kopija liste).
    """
    if group_size <= 0:
        raise PocketOptionClientError(f"group_size mora biti > 0, dobijeno: {group_size}")
    if group_size == 1:
        return list(candles)

    usable_count = (len(candles) // group_size) * group_size
    if usable_count == 0:
        return []
    trimmed = candles[len(candles) - usable_count:]  # odbaci najstariji nepotpun ostatak

    aggregated: list[PocketCandle] = []
    for start in range(0, usable_count, group_size):
        chunk = trimmed[start:start + group_size]
        aggregated.append(PocketCandle(
            open=chunk[0].open,
            close=chunk[-1].close,
            high=max(c.high for c in chunk),
            low=min(c.low for c in chunk),
            unix_time=chunk[0].unix_time,
        ))
    return aggregated


def fetch_candles_for_interval(
    *, ssid: str, pair: str, period_seconds: int, group_size: int, candle_count: int,
    timeout_seconds: float = 20.0, otc: bool = True,
) -> list[PocketCandle]:
    """Zgodna obvertka za `bot.py`/`backtest_pocket_option.py` — gradi asset
    ime (`otc=True` -> `'EURUSD_otc'`, `otc=False` -> OBIČAN par `'EURUSD'`), povlači DOVOLJNO sirovih sveća da se posle
    sastavljanja (`aggregate_candles`) dobije (do) `candle_count` finalnih
    sveća tačnog trajanja, pa ih sastavi ako treba.

    Vraća najviše `candle_count` najnovijih (sastavljenih) sveća — manje ako
    Pocket Option vrati manje sirovih sveća nego što je traženo (pozivalac,
    npr. `bot.py`, treba da sam proveri da li je rezultat dovoljno dug za
    analizu, isto kao što već proverava za Capital.com sveće).

    Raises:
        PocketOptionClientError: isto kao `fetch_candles` (prazan ssid/pair,
            biblioteka nije instalirana, mrežna/auth greška, timeout).
    """
    if not pair:
        raise PocketOptionClientError("pair ne sme biti prazan.")
    asset = f"{pair.upper()}_otc" if otc else pair.upper()
    raw_count = candle_count * group_size
    raw_candles = fetch_candles(
        ssid=ssid, asset=asset, period_seconds=period_seconds, count=raw_count,
        timeout_seconds=timeout_seconds,
    )
    aggregated = aggregate_candles(raw_candles, group_size=group_size)
    if len(aggregated) > candle_count:
        aggregated = aggregated[len(aggregated) - candle_count:]
    return aggregated


# ----------------------------------------------------------------------
# OTC katalog (koji parovi postoje kao OTC na Pocket Option-u + isplata)
# ----------------------------------------------------------------------
logger = logging.getLogger("opi_trading_bot.pocket")


def _parse_assets(assets: list[Any], *, otc: bool) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for a in assets or []:
        if not isinstance(a, dict):
            continue
        symbol = a.get("symbol")
        if not isinstance(symbol, str) or symbol.lower().endswith("_otc") != otc:
            continue
        payout = a.get("payout")
        pair = (symbol[:-4] if otc else symbol).upper()
        asset_type = a.get("asset_type")
        # valutni par = tip "currency", a ako tip nedostaje — simbol od 6 slova (EURUSD)
        is_currency = (asset_type == "currency") if isinstance(asset_type, str) and asset_type else (
            len(pair) == 6 and pair.isalpha()
        )
        candles = a.get("allowed_candles")
        allowed = sorted({int(c) for c in candles if isinstance(c, (int, float)) and c > 0}) \
            if isinstance(candles, (list, tuple)) else []
        result[pair] = {
            "payout": payout if isinstance(payout, (int, float)) else None,
            "is_active": bool(a.get("is_active", True)),
            "is_currency": is_currency,
            "allowed_candles": allowed,
        }
    return result


def parse_otc_assets(assets: list[Any]) -> dict[str, dict[str, Any]]:
    """ČISTA funkcija: lista asset-a iz `active_assets()` -> {'EURUSD': {payout,
    is_active, is_currency, allowed_candles}} samo za OTC simbole ('EURUSD_otc').
    Ključ je par velikim slovima."""
    return _parse_assets(assets, otc=True)


def parse_regular_assets(assets: list[Any]) -> dict[str, dict[str, Any]]:
    """Isto, ali za OBIČNE (ne-OTC) simbole ('EURUSD') — šta Pocket stvarno nudi."""
    return _parse_assets(assets, otc=False)


async def _fetch_assets_async(ssid: str, timeout_seconds: float) -> list[Any]:
    try:
        from BinaryOptionsToolsV2 import PocketOptionAsync
    except ImportError as exc:
        raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc

    async def _run() -> list[Any]:
        async with PocketOptionAsync(ssid) as client:
            await client.wait_for_assets(timeout=30.0)
            return await client.active_assets()

    try:
        return await asyncio.wait_for(_run(), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise PocketOptionClientError("Pocket Option nije vratio listu asset-a na vreme.") from None
    except Exception as exc:  # noqa: BLE001 — Rust/PyO3
        raise PocketOptionClientError(
            f"Greška pri čitanju asset-a: {_redact(str(exc), ssid)}"
        ) from None


def fetch_active_assets(*, ssid: str, timeout_seconds: float = 25.0) -> list[Any]:
    """Sirova lista asset-a sa isplatama. U stalnom režimu čita sa postojeće veze (uvek sveže,
    bez nove veze); inače otvara novu vezu."""
    if not ssid:
        raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
    if PERSISTENT_MODE:
        try:
            import BinaryOptionsToolsV2  # noqa: F401
        except ImportError as exc:
            raise PocketOptionClientError("Paket 'binaryoptionstoolsv2' nije instaliran.") from exc
        with _PERSISTENT_LOCK:
            session = _PERSISTENT.get(ssid)
            if session is None:
                session = _PERSISTENT[ssid] = _PersistentPocket(ssid)
        try:
            return session.get_assets(timeout_seconds)
        except Exception as exc:  # noqa: BLE001
            raise PocketOptionClientError(
                f"Pocket Option greška (stalna veza): {_redact(str(exc) or type(exc).__name__, ssid)}"
            ) from None
    return asyncio.run(_fetch_assets_async(ssid, timeout_seconds))


def fetch_otc_assets(*, ssid: str, timeout_seconds: float = 60.0) -> dict[str, dict[str, Any]]:
    if not ssid:
        raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
    return parse_otc_assets(asyncio.run(_fetch_assets_async(ssid, timeout_seconds)))


class OtcCatalog:
    """Keširan spisak OTC parova (TTL). `get()` NIKAD ne baca: na grešku vraća
    stari keš (ili None ako ga nema) i ne pokušava ponovo narednih `retry_after`
    sekundi, da pad Pocket-a ne uspori svaki klik u botu."""

    def __init__(self, ssid: str, *, ttl_seconds: float = 600.0, retry_after: float = 60.0,
                 fetcher=None, block_seconds: float = 8.0) -> None:
        self._ssid = ssid
        self._block_seconds = block_seconds
        self._worker: threading.Thread | None = None
        self._ttl = ttl_seconds
        self._retry_after = retry_after
        self._fetcher = fetcher or self._default_fetch
        self._regular: dict[str, dict[str, Any]] | None = None
        self._regular_pending: dict[str, dict[str, Any]] | None = None
        self._data: dict[str, dict[str, Any]] | None = None
        self._fetched_at = 0.0
        self._last_attempt = 0.0
        self._lock = threading.Lock()

    def _default_fetch(self) -> dict[str, dict[str, Any]]:
        """Jedno čitanje kataloga daje i OTC i obične parove."""
        if not self._ssid:
            raise PocketOptionClientError("POCKET_OPTION_SSID nije postavljen u .env.")
        raw = fetch_active_assets(ssid=self._ssid, timeout_seconds=25.0)
        self._regular_pending = parse_regular_assets(raw)
        return parse_otc_assets(raw)

    def get_regular(self, force: bool = False) -> dict[str, dict[str, Any]] | None:
        """Obični (ne-OTC) parovi koje Pocket nudi, ili None ako katalog nije dostupan.
        `force=True` zaobilazi keš i traži sveže isplate."""
        self.get(force=force)
        return self._regular

    def age_seconds(self) -> float | None:
        """Koliko su stari podaci o isplatama (poslednje USPEŠNO čitanje); None = nikad pročitano."""
        if self._data is None:
            return None
        return max(0.0, time.monotonic() - self._fetched_at)

    def get(self, force: bool = False) -> dict[str, dict[str, Any]] | None:
        """Nikad ne blokira pozivaoca duže od `block_seconds` (Telegram petlja ne sme da čeka Pocket):
        čitanje ide u pozadinsku nit; ako ne stigne na vreme, vraća se stari keš (ili None), a rezultat
        se upiše kad nit završi. Dok jedna nit čita, nova se ne pokreće."""
        with self._lock:
            now = time.monotonic()
            # Na stalnoj vezi je čitanje lokalno i jeftino, pa se isplate osvežavaju često.
            ttl = min(self._ttl, 20.0) if PERSISTENT_MODE else self._ttl
            fresh = self._data is not None and now - self._fetched_at < ttl
            if not force and (fresh or (self._last_attempt and now - self._last_attempt < self._retry_after)):
                return self._data
            worker = self._worker
            if worker is None or not worker.is_alive():
                self._last_attempt = now
                worker = threading.Thread(target=self._work, daemon=True, name="pocket-catalog")
                self._worker = worker
                worker.start()
        worker.join(self._block_seconds)
        with self._lock:
            return self._data

    def _work(self) -> None:
        try:
            data = self._fetcher()
        except Exception:  # noqa: BLE001 — katalog je pomoćni
            logger.warning("OPI_BOT_OTC_CATALOG_FAILED", exc_info=True)
            return
        with self._lock:
            now = time.monotonic()
            if self._regular_pending:
                self._regular = self._regular_pending
                self._regular_pending = None
                self._data = data or self._data or {}
                self._fetched_at = now
            elif data:
                self._data = data
                self._fetched_at = now
