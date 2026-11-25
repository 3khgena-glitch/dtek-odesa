// Группу можно указать в параметрах виджета (Parameter) на рабочем столе.
// Если не указана — по умолчанию берется группа "1".
const GROUP = args.widgetParameter ? args.widgetParameter.trim() : "1";
const DATA_URL = "https://raw.githubusercontent.com/3khgena-glitch/dtek-odesa/main/schedule.json";
const PWA_URL = "https://3khgena-glitch.github.io/dtek-odesa/";

async function createWidget() {
  const widget = new ListWidget();
  widget.url = PWA_URL;
  widget.setPadding(14, 14, 14, 14);

  try {
    const req = new Request(DATA_URL);
    const data = await req.loadJSON();
    const todaySchedule = data.groups[GROUP];

    if (!todaySchedule) {
      throw new Error(`Група ${GROUP} не знайдена`);
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentStatus = todaySchedule[currentHour];

    // Настройка цветов и текста
    let statusTitle = "Можливе відкл.";
    let bgColor = "#D97706"; // желтый/оранжевый

    if (currentStatus === "on") {
      statusTitle = "Світло є";
      bgColor = "#16A34A"; // зеленый
    } else if (currentStatus === "off") {
      statusTitle = "Світла немає";
      bgColor = "#DC2626"; // красный
    }

    widget.backgroundColor = new Color(bgColor);

    // Поиск следующего изменения
    let nextChangeHour = -1;
    for (let i = currentHour + 1; i < 24; i++) {
      if (todaySchedule[i] !== currentStatus) {
        nextChangeHour = i;
        break;
      }
    }

    let timerText = "До кінця доби без змін";
    if (nextChangeHour !== -1) {
      const minsLeft = 60 - now.getMinutes();
      const hoursLeft = nextChangeHour - currentHour - 1;
      timerText = `Ще ${hoursLeft}г ${minsLeft}хв (до ${nextChangeHour}:00)`;
    }

    // Отрисовка
    const header = widget.addText(`Одеса • Група ${GROUP}`);
    header.font = Font.semiboldSystemFont(12);
    header.textColor = new Color("#FFFFFF", 0.85);

    widget.addSpacer(8);

    const statusEl = widget.addText(statusTitle);
    statusEl.font = Font.boldSystemFont(20);
    statusEl.textColor = Color.white();
    statusEl.minimumScaleFactor = 0.7;

    widget.addSpacer(6);

    const timerEl = widget.addText(timerText);
    timerEl.font = Font.mediumSystemFont(12);
    timerEl.textColor = new Color("#FFFFFF", 0.9);

    widget.addSpacer();

    const updated = widget.addText(`Оновлено: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    updated.font = Font.systemFont(10);
    updated.textColor = new Color("#FFFFFF", 0.65);

  } catch (e) {
    widget.backgroundColor = new Color("#1F2937");
    const errTitle = widget.addText("Помилка");
    errTitle.font = Font.boldSystemFont(16);
    errTitle.textColor = Color.white();
    widget.addSpacer(4);
    const errDesc = widget.addText(e.message || "Немає зв'язку");
    errDesc.font = Font.systemFont(12);
    errDesc.textColor = new Color("#9CA3AF");
  }

  // Просим iOS обновить виджет через 15 минут
  const nextRefresh = new Date(Date.now() + 15 * 60 * 1000);
  widget.refreshAfterDate = nextRefresh;

  return widget;
}

const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentSmall();
}
Script.complete();
