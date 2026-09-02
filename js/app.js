
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
// ПОДДЕРЖИВАЕМЫЕ ФОРМАТЫ ИЗОБРАЖЕНИЙ
// ========================================

const imageFormats = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".avif"
];


// ========================================
// ПОЛУЧЕНИЕ ЧИСТОГО ТЕКСТА ИЗ HTML
// ========================================

function getDescriptionText(html) {

    const temp = document.createElement("div");

    temp.innerHTML = html;

    return temp.textContent || temp.innerText || "";
}


// ========================================
// ПРОВЕРКА: ЕСТЬ ЛИ У ПУТИ РАСШИРЕНИЕ
// ========================================

function hasImageExtension(path) {

    return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(path);
}


// ========================================
// ПРОВЕРКА: ЕСТЬ ЛИ ОПИСАНИЕ
// ========================================
//
// Если ключ desc отсутствует
// или описание пустое,
// используется режим:
// КАРТИНКА + НАЗВАНИЕ
// ========================================

function hasDescription(item) {

    return (
        Object.prototype.hasOwnProperty.call(item, "desc") &&
        typeof item.desc === "string" &&
        item.desc.trim() !== ""
    );
}


// ========================================
// ВЫБОР РЕЖИМА КАРТОЧКИ
// ========================================

function updateCardMode(item) {

    if (hasDescription(item)) {

        viewerScreen.classList.remove("simpleImageMode");

    } else {

        viewerScreen.classList.add("simpleImageMode");
    }
}




// ========================================
// ЗАГРУЗКА ИЗОБРАЖЕНИЯ
// ========================================
//
// Можно передавать:
//
// IMG/bug.jpg
//
// или:
//
// IMG/bug
//
// Если расширение не указано,
// приложение самостоятельно перебирает
// доступные форматы.
// ========================================

function loadImage(imageElement, path) {

    // Если расширение уже указано,
    // используем старое поведение.

    if (hasImageExtension(path)) {

        imageElement.src = path;

        return;
    }


    // Начинаем с первого формата.

    let formatIndex = 0;


    function tryNextFormat() {

        // Все форматы закончились.
        // Картинка не найдена.

        if (formatIndex >= imageFormats.length) {

            imageElement.removeAttribute("src");

            imageElement.alt = "Изображение не найдено";

            return;
        }


        const testImage = new Image();

        const currentPath =
            path + imageFormats[formatIndex];


        // Картинка найдена.

        testImage.onload = () => {

            imageElement.src = currentPath;

            imageElement.alt = "";

        };


        // Формат не найден.
        // Пробуем следующий.

        testImage.onerror = () => {

            formatIndex++;

            tryNextFormat();
        };


        testImage.src = currentPath;
    }


    tryNextFormat();
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
// ОПРЕДЕЛЕНИЕ ТИПА КАРТОЧКИ
// ========================================
//
// Если desc существует —
// обычная карточка с описанием.
//
// Если desc отсутствует —
// режим "картинка + название".
// ========================================

function hasDescription(item) {

    return (
        Object.prototype.hasOwnProperty.call(item, "desc") &&
        item.desc !== null &&
        item.desc !== undefined &&
        String(item.desc).trim() !== ""
    );
}


// ========================================
// ПЕРЕКЛЮЧЕНИЕ РЕЖИМА КАРТОЧКИ
// ========================================

function updateCardMode(item) {

    const simpleImageMode =
        !hasDescription(item);


    // Класс ставится на viewerScreen.
    //
    // CSS сможет полностью изменить
    // расположение элементов.

    viewerScreen.classList.toggle(
        "simpleImageMode",
        simpleImageMode
    );


    // Название всегда остаётся видимым.

    nameBox.style.display = "block";


    // В режиме картинки без описания
    // блок описания скрываем.

    if (simpleImageMode) {

        description.style.display = "none";

    } else {

        description.style.display = "";
    }
}


// ========================================
// ПОКАЗ КАРТОЧКИ
// ========================================

// ========================================
// ПОКАЗ КАРТОЧКИ
// ========================================

function showCard() {

    const item =
        currentCatalog.items[currentIndex];


    // ====================================
    // РЕЖИМ КАРТОЧКИ
    // ====================================

    updateCardMode(item);


    // ====================================
    // НАЗВАНИЕ КАТАЛОГА
    // ====================================

    catalogTitle.textContent =
        currentCatalog.title;


    // ====================================
    // НАЗВАНИЕ ОБЪЕКТА
    // ====================================

    nameBox.textContent =
        item.name;


    // ====================================
    // КАРТИНКА
    // ====================================

    loadImage(photo, item.img);


    // ====================================
    // ОПИСАНИЕ
    // ====================================

    if (hasDescription(item)) {

        description.innerHTML =
            item.desc;

    } else {

        description.innerHTML = "";
    }


    // ====================================
    // СЧЁТЧИК
    // ====================================

    counter.textContent =
        `${currentIndex + 1} / ${currentCatalog.items.length}`;
}


// ========================================
// СЛЕДУЮЩАЯ КАРТОЧКА
// ========================================

function nextCard() {

    currentIndex++;

    if (
        currentIndex >=
        currentCatalog.items.length
    ) {

        currentIndex = 0;
    }

    showCard();
}


// ========================================
// ПРЕДЫДУЩАЯ КАРТОЧКА
// ========================================

function prevCard() {

    currentIndex--;

    if (currentIndex < 0) {

        currentIndex =
            currentCatalog.items.length - 1;
    }

    showCard();
}


// ========================================
// ОЗВУЧКА
// ========================================

// ========================================
// ОЗВУЧКА
// ========================================

function speakCurrent() {

    speechSynthesis.cancel();

    const item =
        currentCatalog.items[currentIndex];


    // ====================================
    // Если описания нет —
    // озвучиваем только название.
    // ====================================

    if (!hasDescription(item)) {

        const utter =
            new SpeechSynthesisUtterance(item.name);

        utter.lang = "ru-RU";

        utter.rate = 0.95;

        speechSynthesis.speak(utter);

        return;
    }


    // ====================================
    // Есть описание —
    // озвучиваем название + описание.
    // ====================================

    const cleanDescription =
        getDescriptionText(item.desc);


    const text =
        item.name +
        ". " +
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


    // Вправо

    if (e.key === "ArrowRight")
        nextCard();


    // Влево

    if (e.key === "ArrowLeft")
        prevCard();


    // Escape

    if (e.key === "Escape")
        backToMenu;


    // Пробел — озвучка

    if (e.key === " ") {

        e.preventDefault();

        speakCurrent();
    }
});


// ========================================
// СТАРТ
// ========================================

buildMenu();

