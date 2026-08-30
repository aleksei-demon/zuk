// ========================================
// СОСТОЯНИЕ
// ========================================

let currentCatalogKey = null;
let currentCatalog = null;
let currentIndex = 0;

// ========================================
// ЭЛЕМЕНТЫ
// ========================================

const menuScreen = document.getElementById("menuScreen");
const viewerScreen = document.getElementById("viewerScreen");

const catalogGrid = document.getElementById("catalogGrid");

const catalogTitle = document.getElementById("catalogTitle");

const nameBox = document.getElementById("nameBox");
const photo = document.getElementById("photo");
const description = document.getElementById("description");

const counter = document.getElementById("counter");

// ========================================
// ПОЛУЧЕНИЕ ЧИСТОГО ТЕКСТА ИЗ HTML
// ========================================

function getDescriptionText(html) {

    const temp = document.createElement("div");

    temp.innerHTML = html;

    return temp.textContent || temp.innerText || "";
}

// ========================================
// СОЗДАНИЕ МЕНЮ
// ========================================

function buildMenu() {

    catalogGrid.innerHTML = "";

    for (const key in window.CATALOGS) {

        const catalog = window.CATALOGS[key];

        const button = document.createElement("button");

        button.className = "catalogBtn";
        button.textContent = catalog.title;

        button.onclick = () => {
            openCatalog(key);
        };

        catalogGrid.appendChild(button);
    }
}

// ========================================
// ОТКРЫТЬ КАТАЛОГ
// ========================================

function openCatalog(key) {

    currentCatalogKey = key;
    currentCatalog = window.CATALOGS[key];

    currentIndex = 0;

    menuScreen.style.display = "none";
    viewerScreen.style.display = "block";

    showCard();
}

// ========================================
// НАЗАД В МЕНЮ
// ========================================

function backToMenu() {

    speechSynthesis.cancel();

    viewerScreen.style.display = "none";
    menuScreen.style.display = "flex";
}

// ========================================
// ПОКАЗ КАРТОЧКИ
// ========================================

function showCard() {

    const item = currentCatalog.items[currentIndex];

    catalogTitle.textContent = currentCatalog.title;

    nameBox.textContent = item.name;

    photo.src = item.img;

    // Разрешаем HTML внутри описания.
    // Благодаря этому работают ссылки, <br> и другие элементы.
    description.innerHTML = item.desc;

    counter.textContent =
        `${currentIndex + 1} / ${currentCatalog.items.length}`;
}

// ========================================
// СЛЕДУЮЩАЯ
// ========================================

function nextCard() {

    currentIndex++;

    if (currentIndex >= currentCatalog.items.length) {
        currentIndex = 0;
    }

    showCard();
}

// ========================================
// ПРЕДЫДУЩАЯ
// ========================================

function prevCard() {

    currentIndex--;

    if (currentIndex < 0) {
        currentIndex = currentCatalog.items.length - 1;
    }

    showCard();
}

// ========================================
// ОЗВУЧКА
// ========================================

function speakCurrent() {

    speechSynthesis.cancel();

    const item = currentCatalog.items[currentIndex];

    // Убираем HTML-теги из описания перед озвучкой
    const cleanDescription =
        getDescriptionText(item.desc);

    const text =
        item.name + ". " +
        cleanDescription;

    const utter =
        new SpeechSynthesisUtterance(text);

    utter.lang = "ru-RU";
    utter.rate = 0.95;

    speechSynthesis.speak(utter);
}

// ========================================
// КНОПКИ
// ========================================

document
    .getElementById("backBtn")
    .onclick = backToMenu;

document
    .getElementById("nextBtn")
    .onclick = nextCard;

document
    .getElementById("prevBtn")
    .onclick = prevCard;

document
    .getElementById("speakBtn")
    .onclick = speakCurrent;

// ========================================
// КЛАВИАТУРА
// ========================================

document.addEventListener("keydown", e => {

    if (viewerScreen.style.display === "none")
        return;

    if (e.key === "ArrowRight")
        nextCard();

    if (e.key === "ArrowLeft")
        prevCard();

    if (e.key === "Escape")
        backToMenu();

    if (e.key === " ") {

        e.preventDefault();

        speakCurrent();
    }
});

// ========================================
// СТАРТ
// ========================================

buildMenu();