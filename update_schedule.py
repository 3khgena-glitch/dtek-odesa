import json
import urllib.request
from datetime import datetime

MIRROR_URL = "https://raw.githubusercontent.com/Baskerville42/outage-data-ua/main/data/odesa-region.json"
OUTPUT_FILE = "schedule.json"


def map_status(val: str) -> str:
    if val == "yes":
        return "on"
    if val == "no":
        return "off"
    return "maybe"


def fetch_schedule() -> None:
    req = urllib.request.Request(
        MIRROR_URL,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    fact = raw.get("fact", raw)
    data = fact.get("data")
    if not isinstance(data, dict) or not data:
        raise RuntimeError(f"Неочікувана структура JSON. Ключі: {list(raw.keys())}")

    today_ts = str(fact.get("today", ""))
    day_data = data.get(today_ts) or next(iter(data.values()))

    groups: dict[str, list[str]] = {}
    for raw_key, hours_dict in day_data.items():
        if not isinstance(hours_dict, dict):
            continue
        clean_key = raw_key.replace("GPV", "").strip()
        hours_list = [map_status(hours_dict.get(str(h), "maybe")) for h in range(1, 25)]
        groups[clean_key] = hours_list

        # Дублюємо підгрупу X.1 як основну X (1–6) для сумісності
        if clean_key.endswith(".1"):
            short_key = clean_key.split(".")[0]
            if short_key not in groups:
                groups[short_key] = hours_list

    if not groups:
        raise RuntimeError("Не вдалося сформувати жодної групи з даних розкладу")

    result = {
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "groups": groups,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Оновлено {OUTPUT_FILE}. Групи: {list(groups.keys())}")


if __name__ == "__main__":
    fetch_schedule()
