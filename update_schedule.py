import json
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = "https://www.dtek-oem.com.ua/ua/shutdowns"

def map_status(val):
    if val == "yes":
        return "on"
    if val == "no":
        return "off"
    # first, second, maybe, mfirst, msecond — позначаємо як можливе/часткове
    return "maybe"

def fetch_dtek():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="uk-UA"
        )
        page = context.new_page()
        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(5000)

        # Забираємо об'єкт DisconSchedule.fact прямо зі сторінки
        fact = page.evaluate("() => window.DisconSchedule ? window.DisconSchedule.fact : null")
        browser.close()

        if not fact or "data" not in fact:
            raise RuntimeError("Не вдалося отримати DisconSchedule.fact (можливе блокування Cloudflare або зміни на сайті)")

        today_ts = str(fact.get("today", ""))
        day_data = fact["data"].get(today_ts)

        if not day_data:
            # Якщо ключ today не збігся, беремо перший доступний день
            first_key = next(iter(fact["data"]))
            day_data = fact["data"][first_key]

        groups = {}
        for raw_key, hours_dict in day_data.items():
            # Очищаємо назву групи (наприклад "GPV1.1" -> "1.1")
            clean_key = raw_key.replace("GPV", "").strip()
            hours_list = [map_status(hours_dict.get(str(h), "maybe")) for h in range(1, 25)]
            groups[clean_key] = hours_list

            # Дублюємо підгрупу X.1 як основну X, щоб не зламалися старі налаштування віджета (1-6)
            if clean_key.endswith(".1"):
                short_key = clean_key.split(".")[0]
                if short_key not in groups:
                    groups[short_key] = hours_list

        result = {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "groups": groups
        }

        with open("schedule.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"Успішно оновлено. Знайдено груп: {list(groups.keys())}")

if __name__ == "__main__":
    fetch_dtek()
