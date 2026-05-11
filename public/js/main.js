// --- 1. ГЛОБАЛЬНІ ФУНКЦІЇ (Винесені за межі DOMContentLoaded для доступу ззовні) ---

/**
 * Відкриває модальне вікно бронювання та налаштовує поля
 */
function openBookingModal(roomName) {
    const bookingModal = document.getElementById('booking-modal');
    const modalRoomTitle = document.getElementById('modal-room-title');
    const hiddenRoomName = document.getElementById('hiddenRoomName');
    const guestFields = document.getElementById('guest-fields');
    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');

    const currentUserId = localStorage.getItem('userId');

    // Перевірка: якщо юзер авторизований — ховаємо поля імені/email, бо вони вже є в базі
    if (currentUserId) {
        if (guestFields) guestFields.style.display = 'none';
        if (userNameInput) userNameInput.removeAttribute('required');
        if (userEmailInput) userEmailInput.removeAttribute('required');
    } else {
        if (guestFields) guestFields.style.display = 'block';
        if (userNameInput) userNameInput.setAttribute('required', 'true');
        if (userEmailInput) userEmailInput.setAttribute('required', 'true');
    }

    if (modalRoomTitle) modalRoomTitle.innerText = `Бронювання: ${roomName}`;
    if (hiddenRoomName) hiddenRoomName.value = roomName;

    if (bookingModal) {
        bookingModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Стоп скрол фону
    }
}

/**
 * Обробник входу через Google (Має бути глобальним для Google API)
 */
async function handleGoogleLogin(response) {
    const googleToken = response.credential;

    try {
        const res = await fetch('http://localhost:3000/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.accessToken);
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name);

            alert(`Вітаємо, ${data.user.name}! Вхід через Google успішний.`);
            location.reload(); // Оновлюємо сторінку для зміни кнопок
        } else {
            alert('Помилка Google авторизації: ' + data.error);
        }
    } catch (error) {
        console.error('Помилка:', error);
        alert('Немає зв’язку з сервером.');
    }
}


// --- 2. ОСНОВНА ЛОГІКА ПІСЛЯ ЗАВАНТАЖЕННЯ СТОРІНКИ ---

document.addEventListener('DOMContentLoaded', () => {

    let bookedSchedule = [];

    // --- А. ФУНКЦІЇ РОБОТИ З ДАНИМИ ---

    /**
     * Рендерить картки кімнат із бекенду
     */
    async function renderRooms() {
        const container = document.getElementById('rooms-container');
        if (!container) return;

        try {
            const response = await fetch('/api/rooms');
            const rooms = await response.json();

            container.innerHTML = rooms.map(room => {
                const gearHtml = room.gear
                    ? room.gear.split(',').map(item => `<li>${item.trim()}</li>`).join('')
                    : '<li>Обладнання уточнюйте</li>';

                return `
                    <article class="card">
                        <img src="${room.image}" alt="${room.name}" class="card-img">
                        <div class="card-content">
                            <div class="card-header">
                                <h3>${room.name}</h3>
                                <span class="badge">${room.badge || 'PRO'}</span>
                            </div>
                            <p class="location">${room.location || 'Київ'}</p>
                            <ul class="gear-list">
                                ${gearHtml}
                            </ul>
                            <div class="card-footer">
                                <p class="price">${room.price} грн<span>/год</span></p>
                                <button class="btn btn-outline" onclick="openBookingModal(\`{room.name}\`)">Забронювати</button>
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (e) {
            console.error('Помилка завантаження баз:', e);
            container.innerHTML = '<p style="color: white; text-align: center;">Не вдалося завантажити список кімнат.</p>';
        }
    }

    /**
     * Отримує список уже зайнятих годин
     */
    async function fetchSchedule() {
        try {
            const res = await fetch('http://localhost:3000/bookings/schedule');
            if (res.ok) {
                bookedSchedule = await res.json();
            }
        } catch (e) {
            console.error('Не вдалося завантажити розклад', e);
        }
    }

    /**
     * Оновлює вигляд кнопки входу
     */
    function updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const userId = localStorage.getItem('userId');

        if (userId && loginBtn) {
            loginBtn.innerText = 'МІЙ КАБІНЕТ';
            loginBtn.href = 'cabinet.html';
        }
    }


    // --- Б. МОДАЛЬНІ ВІКНА ТА НАВІГАЦІЯ ---

    const bookingModal = document.getElementById('booking-modal');
    const loginModal = document.getElementById('login-modal');
    const loginBtn = document.getElementById('login-btn');

    const closeAllModals = () => {
        if (bookingModal) bookingModal.style.display = 'none';
        if (loginModal) loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Бургер меню
    const burger = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');
    if (burger && navLinks) {
        burger.addEventListener('click', () => navLinks.classList.toggle('active'));
    }

    // Клік на кнопку логіну
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            if (localStorage.getItem('userId')) return; // Йдемо в кабінет
            e.preventDefault();
            if (loginModal) {
                loginModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Закриття модалок
    document.querySelectorAll('.close-modal, .close-stub').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target === bookingModal || e.target === loginModal) closeAllModals();
    });

    // Плавний скрол
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#' || !targetId.startsWith('#')) return;
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (navLinks) navLinks.classList.remove('active');
            }
        });
    });


    // --- В. ОБРОБКА ФОРМ ---

    // Форма бронювання
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const roomName = document.getElementById('hiddenRoomName').value;
            const selectedDate = document.getElementById('bookingDate').value;

            // Перевірка на зайнятий час
            const isTimeTaken = bookedSchedule.find(b =>
                b.roomName === roomName && b.content.includes(selectedDate)
            );

            if (isTimeTaken) {
                alert(`❌ Вибачте, кімната "${roomName}" вже зайнята на цей час.`);
                return;
            }

            const bookingData = {
                roomName,
                date: selectedDate,
                phone: document.getElementById('userPhone').value,
                userId: localStorage.getItem('userId') || null,
                name: document.getElementById('userName')?.value,
                email: document.getElementById('userEmail')?.value
            };

            try {
                const response = await fetch('http://localhost:3000/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    alert('Супер! Бронювання успішно створено.');
                    bookingForm.reset();
                    closeAllModals();
                    fetchSchedule();
                }
            } catch (err) { alert('Помилка зв’язку з сервером.'); }
        });
    }

    // Логіка перемикання Вхід / Реєстрація
    const authForm = document.getElementById('auth-form');
    const toggleAuthBtn = document.getElementById('toggle-auth');
    const authTitle = document.getElementById('auth-title');
    const nameGroup = document.getElementById('name-group');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    let isLoginMode = true;

    if (toggleAuthBtn) {
        toggleAuthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authTitle.innerText = isLoginMode ? 'Вхід у кабінет' : 'Реєстрація';
            nameGroup.style.display = isLoginMode ? 'none' : 'block';
            authSubmitBtn.innerText = isLoginMode ? 'Увійти' : 'Створити акаунт';
            toggleAuthBtn.innerText = isLoginMode ? 'Зареєструватись' : 'Увійти';
        });
    }

    // Відправка форми авторизації
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = isLoginMode ? 'http://localhost:3000/login' : 'http://localhost:3000/register';
            const payload = {
                email: document.getElementById('authEmail').value,
                password: document.getElementById('authPassword').value
            };

            if (!isLoginMode) {
                payload.name = document.getElementById('authName').value;
                payload.passwordConfirm = payload.password;
            }

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok) {
                    if (isLoginMode) {
                        localStorage.setItem('token', data.accessToken || data.token);
                        localStorage.setItem('userId', data.user.id);
                        localStorage.setItem('userName', data.user.name);
                        alert(`Вітаємо, ${data.user.name}!`);
                        updateAuthUI();
                        closeAllModals();
                    } else {
                        alert('Реєстрація успішна! Перевірте пошту (якщо налаштовано) або увійдіть.');
                        isLoginMode = true;
                        toggleAuthBtn.click();
                    }
                } else { alert(data.error || 'Помилка'); }
            } catch (e) { alert('Сервер не відповідає.'); }
        });
    }


    // --- Г. ІНІЦІАЛІЗАЦІЯ GOOGLE КНОПКИ ---
    if (window.google) {
        google.accounts.id.initialize({
            client_id: "284257768972-hdh3hevqp0rbv3he45c3ju2tpqf5cpei.apps.googleusercontent.com",
            callback: handleGoogleLogin
        });
        const btnContainer = document.getElementById("google-button-container");
        if (btnContainer) {
            google.accounts.id.renderButton(btnContainer, { theme: "outline", size: "large", width: "100%" });
        }
    }


    // --- СТАРТОВІ ВИКЛИКИ ---
    renderRooms();
    fetchSchedule();
    updateAuthUI();
});