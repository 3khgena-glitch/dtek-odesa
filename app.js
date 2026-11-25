const groupSelect = document.getElementById('group-select');
const statusCard = document.getElementById('status-card');
const statusText = document.getElementById('status-text');
const timerText = document.getElementById('timer-text');

let scheduleData = {};

// Загрузка сохраненной группы
const savedGroup = localStorage.getItem('dtek_odesa_group');
if (savedGroup) groupSelect.value = savedGroup;

groupSelect.addEventListener('change', (e) => {
    localStorage.setItem('dtek_odesa_group', e.target.value);
    updateStatus();
});

async function loadSchedule() {
    try {
        const response = await fetch('schedule.json');
        scheduleData = await response.json();
        updateStatus();
        setInterval(updateStatus, 60000); // Обновление каждую минуту
    } catch (error) {
        statusText.textContent = "Помилка даних";
        timerText.textContent = "Не вдалося завантажити графік";
    }
}

function updateStatus() {
    if (!scheduleData.groups) return;

    const group = groupSelect.value;
    const now = new Date();
    const currentHour = now.getHours();
    
    // Получаем расписание группы на сегодня (массив из 24 статусов на каждый час)
    const todaySchedule = scheduleData.groups[group];
    const currentStatus = todaySchedule[currentHour];

    // Оформление в зависимости от статуса
    if (currentStatus === "on") {
        statusCard.className = "w-full rounded-xl p-6 text-center mb-6 bg-green-600";
        statusText.textContent = "Світло є 💡";
    } else if (currentStatus === "off") {
        statusCard.className = "w-full rounded-xl p-6 text-center mb-6 bg-red-600";
        statusText.textContent = "Світла немає 🚫";
    } else {
        statusCard.className = "w-full rounded-xl p-6 text-center mb-6 bg-yellow-500";
        statusText.textContent = "Можливе відключення ⚠️";
    }

    // Поиск следующего изменения
    let nextChangeHour = -1;
    for (let i = currentHour + 1; i < 24; i++) {
        if (todaySchedule[i] !== currentStatus) {
            nextChangeHour = i;
            break;
        }
    }

    if (nextChangeHour !== -1) {
        const minsLeft = 60 - now.getMinutes();
        const hoursLeft = nextChangeHour - currentHour - 1;
        timerText.textContent = `До зміни стану: ${hoursLeft} год ${minsLeft} хв (о ${nextChangeHour}:00)`;
    } else {
        timerText.textContent = "До кінця доби змін не передбачається";
    }
}

loadSchedule();
