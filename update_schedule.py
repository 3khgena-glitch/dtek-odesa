import json
import os
import urllib.request
from datetime import datetime

OUTPUT_FILE = "schedule.json"

# Перевіряємо кілька живих ком'юніті-репозиторіїв із даними по Україні
REPOS = [
    ("Baskerville42", "outage-data-ua"),
    ("chaichuk", "UA-power-outages-monitor"),
    ("Svitlobot-official", "timetables"),
]


def fetch_json(url: str):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))


def find_odesa_files() -> list[str]:
    found = []
    for owner, repo in REPOS:
        for branch in ("main", "master"):
            api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
            try:
                tree = fetch_json(api_url)
                for item in tree.get("tree", []):
                    path = item.get("path", "")
                    low = path.lower()
                    if path.endswith(".json") and ("odesa" in low or "odessa" in low or "oem" in low):
                        found.append(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}")
                if found:
                    break
            except Exception:
                continue
    return found


def map_status(val) -> str:
    s = str(val).lower()
    if s in ("yes", "on", "1", "true"):
        return "on"
    if s in ("no", "off", "0", "false"):
        return "off"
    return "maybe"


def extract_groups(raw) -> dict[str, list[str]]:
    if not isinstance(raw, dict):
        raise ValueError("JSON не є словником")

    # Формат 1: стандартний ДТЕК (fact -> data -> timestamp -> GPVx.x)
    fact = raw.get("fact", raw)
    data = fact.get("data") if isinstance(fact, dict) else None

    if isinstance(data, dict) and data:
        today_ts = str(fact.get("today", ""))
        day_data = data.get(today_ts) or next(iter(data.values()))
        if isinstance(day_data, dict):
            groups = {}
            for raw_key, hours_dict in day_data.items():
                if not isinstance(hours_dict, dict):
                    continue
                clean_key = raw_key.replace("GPV", "").strip()
                hours_list = [map_status(hours_dict.get(str(h), "maybe")) for h in range(1, 25)]
                groups[clean_key] = hours_list
                if clean_key.endswith(".1"):
                    short_key = clean_key.split(".")[0]
                    groups.setdefault(short_key, hours_list)
            if groups:
                return groups

    # Формат 2: плоский словник груп {"1.1": [...], "1.2": [...]} або {"groups": {...}}
    source_groups = raw.get("groups", raw)
    if isinstance(source_groups, dict):
        groups = {}
        for k, v in source_groups.items():
            clean_key = str(k).replace("GPV", "").strip()
            if isinstance(v, list) and len(v) >= 24:
                hours_list = [map_status(x) for x in v[:24]]
                groups[clean_key] = hours_list
                if clean_key.endswith(".1"):
                    groups.setdefault(clean_key.split(".")[0], hours_list)
        if groups:
            return groups

    raise ValueError(f"Невідома структура даних. Ключі: {list(raw.keys())[:10]}")


def main():
    urls = find_odesa_files()
    print(f"Знайдено кандидатів: {len(urls)}")

    last_err = None
    for url in urls:
        try:
            raw = fetch_json(url)
            groups = extract_groups(raw)
            result = {
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "source": url,
                "groups": groups,
            }
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"УСПІХ! Завантажено з: {url}")
            print(f"Доступні групи: {list(groups.keys())}")
            return
        except Exception as e:
            last_err = e
            print(f"Пропуск {url}: {e}")

    if os.path.exists(OUTPUT_FILE):
        print(f"Не вдалося оновити ({last_err}), залишаємо старий {OUTPUT_FILE}.")
        return

    raise RuntimeError(f"Жодне джерело не спрацювало: {last_err}")


if __name__ == "__main__":
    main()
