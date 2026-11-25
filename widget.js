const DATA_URL = "https://raw.githubusercontent.com/3khgena-glitch/dtek-odesa/main/schedule.json";
const PWA_URL = "https://3khgena-glitch.github.io/dtek-odesa/";

// Парсимо параметр виду "Дім:3; Робота:1; Мама:5" (до 5 адрес)
const rawParam = args.widgetParameter ? args.widgetParameter.trim() : "Дім:3";
const items = rawParam
  .split(";")
  .map(part => part.trim())
  .filter(Boolean)
  .slice(0, 5)
  .map(part => {
    const [name, group] = part.split(":").map(s => s.trim());
    if (!group) return { name: `Група ${name}`, group: name };
    return { name, group };
  });

function getStatusInfo(todaySchedule, now) {
  const currentHour = now.getHours();
  const currentStatus = todaySchedule[currentHour];

  let label = "Можливо";
  let shortIcon = "🟡";
  let bgColor = "#D97706";

  if (currentStatus === "on") {
    label = "Світло є";
    shortIcon = "🟢";
    bgColor = "#16A34A";
  } else if (currentStatus === "off") {
    label = "Немає";
    shortIcon = "🔴";
    bgColor = "#DC2626";
  }

  let nextChangeHour = -1;
  for (let i = currentHour + 1; i < 24; i++) {
    if (todaySchedule[i] !== currentStatus) {
      nextChangeHour = i;
      break;
    }
  }

  let timerText = "до кінця доби";
  if (nextChangeHour !== -1) {
    const totalMinsLeft = (nextChangeHour - currentHour) * 60 - now.getMinutes();
    const hoursLeft = Math.floor(totalMinsLeft / 60);
    const minsLeft = totalMinsLeft % 60;

    let leftStr = "";
    if (hoursLeft > 0 && minsLeft > 0) leftStr = `${hoursLeft}г ${minsLeft}хв`;
    else if (hoursLeft > 0) leftStr = `${hoursLeft}г`;
    else leftStr = `${minsLeft}хв`;

    timerText = `до ${nextChangeHour}:00 (${leftStr})`;
  }

  return { label, shortIcon, bgColor, timerText };
}

// Динамічні розміри залежно від кількості адрес
function getLayoutConfig(count) {
  if (count === 2) {
    return { titleSize: 16, timeSize: 13, nameSize: 18, timerSize: 15, padV: 14, headerGap: 14 };
  }
  if (count === 3) {
    return { titleSize: 15, timeSize: 12, nameSize: 16, timerSize: 13, padV: 12, headerGap: 10 };
  }
  if (count === 4) {
    return { titleSize: 14, timeSize: 11, nameSize: 13.5, timerSize: 12, padV: 10, headerGap: 8 };
  }
  // 5 адрес
  return { titleSize: 13, timeSize: 11, nameSize: 12, timerSize: 11, padV: 9, headerGap: 6 };
}

async function createWidget() {
  const widget = new ListWidget();
  widget.url = PWA_URL;

  try {
    const req = new Request(DATA_URL);
    const data = await req.loadJSON();
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (items.length === 1) {
      widget.setPadding(14, 14, 14, 14);
      const item = items[0];
      const sched = data.groups[item.group];
      if (!sched) throw new Error(`Група ${item.group} не знайдена`);

      const info = getStatusInfo(sched, now);
      widget.backgroundColor = new Color(info.bgColor);

      const header = widget.addText(`${item.name} • Гр. ${item.group}`);
      header.font = Font.semiboldSystemFont(13);
      header.textColor = new Color("#FFFFFF", 0.85);
      header.lineLimit = 1;

      widget.addSpacer(8);

      const statusEl = widget.addText(info.label);
      statusEl.font = Font.boldSystemFont(22);
      statusEl.textColor = Color.white();

      widget.addSpacer(6);

      const timerEl = widget.addText(info.timerText);
      timerEl.font = Font.mediumSystemFont(13);
      timerEl.textColor = new Color("#FFFFFF", 0.9);

      widget.addSpacer();

      const updated = widget.addText(`Оновлено: ${timeStr}`);
      updated.font = Font.systemFont(10);
      updated.textColor = new Color("#FFFFFF", 0.65);

    } else {
      const cfg = getLayoutConfig(items.length);
      widget.setPadding(cfg.padV, 14, cfg.padV, 14);
      widget.backgroundColor = new Color("#111827");

      const headerStack = widget.addStack();
      headerStack.layoutHorizontally();
      headerStack.centerAlignContent();
      const title = headerStack.addText("Світло • Одеса");
      title.font = Font.boldSystemFont(cfg.titleSize);
      title.textColor = Color.white();
      headerStack.addSpacer();
      const upd = headerStack.addText(timeStr);
      upd.font = Font.systemFont(cfg.timeSize);
      upd.textColor = new Color("#9CA3AF");

      widget.addSpacer(cfg.headerGap);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const sched = data.groups[item.group];

        const row = widget.addStack();
        row.layoutHorizontally();
        row.centerAlignContent();

        if (!sched) {
          const errTxt = row.addText(`⚪ ${item.name} — помилка гр. ${item.group}`);
          errTxt.font = Font.systemFont(cfg.nameSize);
          errTxt.textColor = new Color("#9CA3AF");
        } else {
          const info = getStatusInfo(sched, now);

          const left = row.addText(`${info.shortIcon} ${item.name} (г.${item.group})`);
          left.font = Font.semiboldSystemFont(cfg.nameSize);
          left.textColor = Color.white();
          left.lineLimit = 1;
          left.minimumScaleFactor = 0.8;

          row.addSpacer(6);
          row.addSpacer();

          const right = row.addText(info.timerText);
          right.font = Font.mediumSystemFont(cfg.timerSize);
          right.textColor = new Color("#D1D5DB");
          right.lineLimit = 1;
          right.minimumScaleFactor = 0.8;
        }

        // Рівномірно розподіляємо рядки по висоті віджета
        if (i < items.length - 1) {
          widget.addSpacer();
        }
      }
    }

  } catch (e) {
    widget.setPadding(14, 14, 14, 14);
    widget.backgroundColor = new Color("#1F2937");
    const errTitle = widget.addText("Помилка");
    errTitle.font = Font.boldSystemFont(15);
    errTitle.textColor = Color.white();
    widget.addSpacer(4);
    const errDesc = widget.addText(e.message || "Немає зв'язку");
    errDesc.font = Font.systemFont(12);
    errDesc.textColor = new Color("#9CA3AF");
  }

  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return widget;
}

const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  if (items.length > 1) {
    await widget.presentMedium();
  } else {
    await widget.presentSmall();
  }
}
Script.complete();
