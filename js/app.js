/**
 * POST-APOCALYPTIC CARD ENGINE
 * File: js/app.js
 * Version: 1.0
 */

(function () {
    'use strict';

    // ============================================================
    // 1. STATE MANAGEMENT
    // ============================================================
    var currentCatalogKey = null;
    var currentCatalog = null;
    var currentIndex = 0;
    var imageLoadToken = 0;
    var speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    // Supported image formats for auto-repair / extension resolution
    var SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'];

    // ============================================================
    // 2. DOM ELEMENTS CACHE
    // ============================================================
    var DOM = {};

    function cacheDOMElements() {
        DOM.menuScreen = document.getElementById('menuScreen');
        DOM.catalogGrid = document.getElementById('catalogGrid');
        DOM.viewerScreen = document.getElementById('viewerScreen');

        DOM.prevBtn = document.getElementById('prevBtn');
        DOM.nextBtn = document.getElementById('nextBtn');
        DOM.backBtn = document.getElementById('backBtn');

        DOM.catalogTitle = document.getElementById('catalogTitle');
        DOM.nameBox = document.getElementById('nameBox');
        DOM.photo = document.getElementById('photo');
        DOM.description = document.getElementById('description');

        DOM.speakBtn = document.getElementById('speakBtn');
        DOM.counter = document.getElementById('counter');
    }

    // ============================================================
    // 3. UTILITY & VALIDATION FUNCTIONS
    // ============================================================

    function isValidCatalog(catalog) {
        return Boolean(
            catalog &&
            typeof catalog === 'object' &&
            Array.isArray(catalog.items)
        );
    }

    function getCatalogTitle(key, catalog) {
        if (catalog && typeof catalog.title === 'string' && catalog.title.trim().length > 0) {
            // Удаляем BOM (\uFEFF) и невидимые служебные символы из начала и конца строки
            return catalog.title.replace(/^[\uFEFF\u200B]+|[\uFEFF\u200B]+$/g, '').trim();
        }
        return key;
    }

    function isNonEmptyString(val) {
        return typeof val === 'string' && val.trim().length > 0;
    }

    function hasName(item) {
        return Boolean(item && isNonEmptyString(item.name));
    }

    function hasDescription(item) {
        return Boolean(item && isNonEmptyString(item.desc));
    }

    function hasImage(item) {
        return Boolean(item && isNonEmptyString(item.img));
    }

    function hasLink(item) {
        return Boolean(item && isNonEmptyString(item.a));
    }

    // Strip HTML markup for speech output
    function stripHTML(htmlString) {
        if (!htmlString) return '';
        var tmp = document.createElement('div');
        tmp.innerHTML = htmlString;
        return tmp.textContent || tmp.innerText || '';
    }

    // ============================================================
    // 4. MENU BUILDER & CATALOG NAVIGATION
    // ============================================================

    function buildMenu() {
        if (!DOM.catalogGrid) return;
        DOM.catalogGrid.innerHTML = '';

        var catalogs = window.CATALOGS;
        if (!catalogs || typeof catalogs !== 'object') {
            return;
        }

        Object.keys(catalogs).forEach(function (key) {
            var cat = catalogs[key];
            if (!isValidCatalog(cat)) {
                return; // Omit malformed catalogs
            }

            var btn = document.createElement('button');
            btn.className = 'catalogBtn';
            btn.textContent = getCatalogTitle(key, cat);
            btn.addEventListener('click', function () {
                openCatalog(key);
            });

            DOM.catalogGrid.appendChild(btn);
        });
    }

    function openCatalog(key) {
        var catalogs = window.CATALOGS;
        if (!catalogs || !catalogs[key] || !isValidCatalog(catalogs[key])) {
            return;
        }

        stopSpeech();
        currentCatalogKey = key;
        currentCatalog = catalogs[key];
        currentIndex = 0;

        if (DOM.menuScreen) DOM.menuScreen.style.display = 'none';
        if (DOM.viewerScreen) DOM.viewerScreen.style.display = 'block';

        showCard();
    }

    function backToMenu() {
        stopSpeech();
        currentCatalogKey = null;
        currentCatalog = null;
        currentIndex = 0;

        clearCardLink();

        if (DOM.viewerScreen) DOM.viewerScreen.style.display = 'none';
        if (DOM.menuScreen) DOM.menuScreen.style.display = 'block';
    }

    // ============================================================
    // 5. IMAGE RESOLUTION & AUTO-REPAIR (OPTIMIZED)
    // ============================================================

    function getImageCandidates(originalPath) {
        if (!originalPath || typeof originalPath !== 'string') return [];

        var path = originalPath.trim();
        var lastSlashIdx = path.lastIndexOf('/');
        var dir = lastSlashIdx !== -1 ? path.substring(0, lastSlashIdx + 1) : '';
        var fileName = lastSlashIdx !== -1 ? path.substring(lastSlashIdx + 1) : path;

        var dotIdx = fileName.lastIndexOf('.');
        var baseName = fileName;
        var originalExt = '';

        if (dotIdx > 0) {
            baseName = fileName.substring(0, dotIdx);
            originalExt = fileName.substring(dotIdx + 1).toLowerCase();
        }

        var basePath = dir + baseName;

        // Быстрый фоллбэк: проверяем только 1 самое вероятное соседнее расширение
        if (originalExt === 'jpg' || originalExt === 'jpeg') {
            return [basePath + '.png'];
        } else if (originalExt === 'png') {
            return [basePath + '.jpg'];
        }

        return [basePath + '.jpg'];
    }

    // Фоновый поиск рабочего файла, если основной путь из ТЗ не загрузился
    function fallbackResolveImage(originalPath, token) {
        if (!DOM.photo) return;

        var candidates = getImageCandidates(originalPath);
        var candidateIndex = 0;

        function tryNextCandidate() {
            if (token !== imageLoadToken) return;

            if (candidateIndex >= candidates.length) {
                // Файл окончательно отсутствует: прячем <img> и пишем понятный аларм в консоль
                DOM.photo.onerror = null;
                DOM.photo.removeAttribute('src');
                DOM.photo.style.display = 'none';

                console.warn('[MISSING IMAGE]', originalPath);
                return;
            }

            var candidateUrl = candidates[candidateIndex++];
            var testImg = new Image();

            testImg.onload = function () {
                if (token !== imageLoadToken) return;
                DOM.photo.onerror = null;
                DOM.photo.src = candidateUrl;
                DOM.photo.style.display = 'block';
            };

            testImg.onerror = function () {
                if (token !== imageLoadToken) return;
                tryNextCandidate();
            };

            testImg.src = candidateUrl;
        }

        tryNextCandidate();
    }

    function resolveAndSetImage(originalPath, token) {
        if (!DOM.photo) return;

        // Снимаем старый onerror, чтобы не сработали предыдущие каскады
        DOM.photo.onerror = null;

        // Оптимистично ставим путь прямо из данных
        DOM.photo.src = originalPath;
        DOM.photo.style.display = 'block';

        // Если файл не существует / расширение ошибочно — сработает onerror и запустит автопочинку
        DOM.photo.onerror = function () {
            if (token !== imageLoadToken) return;
            DOM.photo.onerror = null; // Предотвращаем зацикливание
            fallbackResolveImage(originalPath, token);
        };
    }

    // ============================================================
    // 6. LINK MANAGEMENT ("a" field)
    // ============================================================

    function clearCardLink() {
        var existingLink = document.getElementById('generatedCardLink');
        if (existingLink && existingLink.parentNode) {
            existingLink.parentNode.removeChild(existingLink);
        }
    }

    function renderCardLink(url) {
        clearCardLink();
        if (!isNonEmptyString(url)) return;

        var linkBtn = document.createElement('a');
        linkBtn.id = 'generatedCardLink';
        linkBtn.href = url.trim();
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.className = 'action-btn link-btn';
        linkBtn.textContent = 'Открыть ссылку 🔗';
        linkBtn.style.display = 'inline-block';
        linkBtn.style.marginTop = '10px';

        // Append link inside description container or after controls
        if (DOM.description && DOM.description.parentNode) {
            DOM.description.parentNode.insertBefore(linkBtn, DOM.description.nextSibling);
        } else if (DOM.viewerScreen) {
            DOM.viewerScreen.appendChild(linkBtn);
        }
    }


    // ============================================================
    // 7. CARD RENDERING ENGINE (LAYOUT STABILITY FIX)
    // ============================================================

    function showCard() {
        if (!currentCatalog || !Array.isArray(currentCatalog.items)) return;

        stopSpeech();
        imageLoadToken++;

        var total = currentCatalog.items.length;

        // Empty catalog handling
        if (total === 0) {
            if (DOM.catalogTitle) DOM.catalogTitle.textContent = getCatalogTitle(currentCatalogKey, currentCatalog);
            if (DOM.nameBox) {
                DOM.nameBox.textContent = 'Каталог пуст';
                DOM.nameBox.style.display = 'block';
            }
            if (DOM.photo) DOM.photo.style.display = 'none';
            if (DOM.description) DOM.description.style.display = 'none';
            if (DOM.counter) DOM.counter.textContent = '0 / 0';
            clearCardLink();
            updateSpeechState(null);
            return;
        }

        // Normalize index
        if (currentIndex < 0) currentIndex = total - 1;
        if (currentIndex >= total) currentIndex = 0;

        var item = currentCatalog.items[currentIndex];
        if (!item || typeof item !== 'object') {
            item = {};
        }

        var itemHasName = hasName(item);
        var itemHasImg = hasImage(item);
        var itemHasDesc = hasDescription(item);
        var itemHasLink = hasLink(item);

        // Update Title & Counter
        if (DOM.catalogTitle) {
            DOM.catalogTitle.textContent = getCatalogTitle(currentCatalogKey, currentCatalog);
        }
        if (DOM.counter) {
            DOM.counter.textContent = (currentIndex + 1) + ' / ' + total;
        }

        // 1. Render Name
        if (DOM.nameBox) {
            if (itemHasName) {
                DOM.nameBox.textContent = item.name.trim();
                DOM.nameBox.style.display = '';
            } else {
                DOM.nameBox.textContent = '';
                DOM.nameBox.style.display = 'none';
            }
        }

        // 2. Render Image (Жестко держим верстку, если в объекте заявлена картинка)
        if (DOM.photo) {
            if (itemHasImg) {
                // НЕ ПРЯЧЕМ блок! Показываем сразу, забивая место под картинку
                DOM.photo.style.display = 'block';
                resolveAndSetImage(item.img, imageLoadToken);
            } else {
                // Прячем ТОЛЬКО если картинка вообще не предусмотрена в объекте ТЗ
                DOM.photo.onerror = null;
                DOM.photo.removeAttribute('src');
                DOM.photo.style.display = 'none';
            }
        }

        // 3. Render Description
        if (DOM.description) {
            if (itemHasDesc) {
                DOM.description.innerHTML = item.desc;
                DOM.description.style.display = '';
            } else {
                DOM.description.innerHTML = '';
                DOM.description.style.display = 'none';
            }
        }

        // 4. Render Link
        if (itemHasLink) {
            renderCardLink(item.a);
        } else {
            clearCardLink();
        }

        // Layout Mode Adjustments
        if (DOM.viewerScreen) {
            if (itemHasImg && !itemHasDesc) {
                DOM.viewerScreen.classList.add('simpleImageMode');
            } else {
                DOM.viewerScreen.classList.remove('simpleImageMode');
            }
        }

        updateSpeechState(item);
        // Запускаем предзагрузку соседних и остальных картинок
        preloadNearbyImages(20);
    }


    // ============================================================
    // 8. PRELOADER ENGINE (SMART CACHING)
    // ============================================================

    // Хранилище загруженных объектов Image в памяти, чтобы браузер не выгружал их
    var imageCache = {};

    function preloadSingleImage(src) {
        if (!src || typeof src !== 'string' || imageCache[src]) return;

        var img = new Image();
        img.src = src;
        // Сохраняем ссылку в памяти
        imageCache[src] = img;
    }

    function preloadNearbyImages(range) {
        if (!currentCatalog || !Array.isArray(currentCatalog.items)) return;

        var items = currentCatalog.items;
        var total = items.length;
        var radius = range || 10; // По умолчанию +-10 карточек

        // 1. Приоритетный предзагруз ближайших N элементов в обе стороны
        for (var i = 1; i <= radius; i++) {
            var nextIdx = (currentIndex + i) % total;
            var prevIdx = (currentIndex - i + total) % total;

            if (items[nextIdx] && items[nextIdx].img) {
                preloadSingleImage(items[nextIdx].img);
            }
            if (items[prevIdx] && items[prevIdx].img) {
                preloadSingleImage(items[prevIdx].img);
            }
        }

        // 2. Фоновая докачка вообще ВСЕХ остальных картинок каталога
        setTimeout(function () {
            items.forEach(function (item) {
                if (item && item.img) {
                    preloadSingleImage(item.img);
                }
            });
        }, 300);
    }



    // ============================================================
    // 8. NAVIGATION
    // ============================================================

    function nextCard() {
        if (!currentCatalog || !Array.isArray(currentCatalog.items) || currentCatalog.items.length === 0) return;
        currentIndex = (currentIndex + 1) % currentCatalog.items.length;
        showCard();
    }

    function prevCard() {
        if (!currentCatalog || !Array.isArray(currentCatalog.items) || currentCatalog.items.length === 0) return;
        currentIndex = (currentIndex - 1 + currentCatalog.items.length) % currentCatalog.items.length;
        showCard();
    }

    // ============================================================
    // 9. SPEECH SYNTHESIS
    // ============================================================

    function canSpeakCard(item) {
        return speechSupported && (hasName(item) || hasDescription(item));
    }

    function updateSpeechState(item) {
        if (!DOM.speakBtn) return;
        if (canSpeakCard(item)) {
            DOM.speakBtn.disabled = false;
        } else {
            DOM.speakBtn.disabled = true;
        }
    }

    function stopSpeech() {
        if (speechSupported) {
            window.speechSynthesis.cancel();
        }
    }

    function speakCurrent() {
        if (!speechSupported || !currentCatalog || !Array.isArray(currentCatalog.items)) return;

        // Если прямо сейчас идет озвучивание — останавливаем его (поведение Toggle / Пауза-Стоп)
        if (window.speechSynthesis.speaking) {
            stopSpeech();
            return;
        }

        var item = currentCatalog.items[currentIndex];
        if (!canSpeakCard(item)) return;

        stopSpeech(); // Сбрасываем возможные зависшие очереди

        var textParts = [];
        if (hasName(item)) {
            textParts.push(item.name.trim());
        }
        if (hasDescription(item)) {
            textParts.push(stripHTML(item.desc));
        }

        var fullText = textParts.join('. ');
        if (!fullText) return;

        var utterance = new SpeechSynthesisUtterance(fullText);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.95;

        window.speechSynthesis.speak(utterance);
    }

    // ============================================================
    // 10. KEYBOARD & EVENT LISTENERS
    // ============================================================

    function setupEventListeners() {
        if (DOM.prevBtn) DOM.prevBtn.addEventListener('click', prevCard);
        if (DOM.nextBtn) DOM.nextBtn.addEventListener('click', nextCard);
        if (DOM.backBtn) DOM.backBtn.addEventListener('click', backToMenu);
        if (DOM.speakBtn) DOM.speakBtn.addEventListener('click', speakCurrent);

        document.addEventListener('keydown', function (e) {
            // Handle shortcuts only when viewer screen is active
            if (!DOM.viewerScreen || DOM.viewerScreen.style.display === 'none') {
                return;
            }

            switch (e.key) {
                case 'ArrowRight':
                    nextCard();
                    break;
                case 'ArrowLeft':
                    prevCard();
                    break;
                case ' ':
                    e.preventDefault(); // Prevent page scrolling
                    if (DOM.speakBtn && !DOM.speakBtn.disabled) {
                        speakCurrent();
                    }
                    break;
                case 'Escape':
                    backToMenu();
                    break;
            }
        });
    }

    // ============================================================
    // 11. INITIALIZATION
    // ============================================================

    function initApp() {
        cacheDOMElements();
        setupEventListeners();
        buildMenu();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();