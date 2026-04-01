document.addEventListener('DOMContentLoaded', () => {

    // --- 1. МОБІЛЬНЕ МЕНЮ (БУРГЕР) ---
    const burger = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');
    const navItems = document.querySelectorAll('.nav-links a');

    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // --- 2. ПЛАВНИЙ СКРОЛ ---
    // --- 2. ПЛАВНИЙ СКРОЛ (ВИПРАВЛЕНИЙ) ---
    document.querySelectorAll('a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            // ПЕРЕВІРКА: Якщо посилання порожнє або НЕ починається з # (тобто це посилання на іншу сторінку)
            // ми просто виходимо з цієї функції і нічого не зупиняємо
            if (!targetId || !targetId.startsWith('#') || targetId === '#') {
                return;
            }

            // Якщо ж це якір (наприклад #catalog), робимо плавний скрол
            e.preventDefault();
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- 3. АВТОРИЗАЦІЯ (ОНОВЛЕННЯ ІНТЕРФЕЙСУ) ---
    function updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const userId = localStorage.getItem('userId');

        if (userId && loginBtn) {
            loginBtn.innerText = 'МІЙ КАБІНЕТ';
            loginBtn.href = 'cabinet.html';
        }
    }
    updateAuthUI();

    // --- 4. ЛОГІКА МОДАЛЬНИХ ВІКОН ---
    const bookingModal = document.getElementById('booking-modal');
    const loginModal = document.getElementById('login-modal');
    const loginBtnDynamic = document.getElementById('login-btn');
    const bookingButtons = document.querySelectorAll('.card .btn-outline');

    const closeAllModals = () => {
        if (bookingModal) bookingModal.style.display = 'none';
        if (loginModal) loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Відкриття вікна Входу
    // Відкриття вікна Входу
    if (loginBtnDynamic) {
        loginBtnDynamic.addEventListener('click', (e) => {
            const userId = localStorage.getItem('userId');

            // ЯКЩО ЮЗЕР ВЖЕ АВТОРИЗОВАНИЙ (є в пам'яті)
            if (userId) {
                // Ми НЕ викликаємо e.preventDefault(),
                // тому браузер просто перейде за посиланням на cabinet.html
                return;
            }

            // ЯКЩО ЮЗЕРА НЕМАЄ — відкриваємо вікно логіну
            e.preventDefault();
            if (loginModal) {
                loginModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    }

    document.querySelectorAll('.close-modal, .close-stub').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === bookingModal || e.target === loginModal) {
            closeAllModals();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });

    // --- 5. ЛОГІКА БРОНЮВАННЯ (FETCH API) ---
    const bookingForm = document.getElementById('booking-form');
    const modalRoomTitle = document.getElementById('modal-room-title');
    const hiddenRoomName = document.getElementById('hiddenRoomName');
    const guestFields = document.getElementById('guest-fields');
    const userNameInput = document.getElementById('userName');
    const userEmailInput = document.getElementById('userEmail');

    if (bookingButtons.length > 0) {
        bookingButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentUserId = localStorage.getItem('userId');

                // Перевірка: ховаємо чи показуємо поля для гостя
                if (currentUserId) {
                    if(guestFields) guestFields.style.display = 'none';
                    if(userNameInput) userNameInput.removeAttribute('required');
                    if(userEmailInput) userEmailInput.removeAttribute('required');
                } else {
                    if(guestFields) guestFields.style.display = 'block';
                    if(userNameInput) userNameInput.setAttribute('required', 'true');
                    if(userEmailInput) userEmailInput.setAttribute('required', 'true');
                }

                const card = e.target.closest('.card');
                const roomName = card ? card.querySelector('h3').innerText : 'Кімната';

                if (modalRoomTitle) modalRoomTitle.innerText = `Бронювання: ${roomName}`;
                if (hiddenRoomName) hiddenRoomName.value = roomName;

                if (bookingModal) {
                    bookingModal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                }
            });
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUserId = localStorage.getItem('userId');

            const bookingData = {
                roomName: document.getElementById('hiddenRoomName').value,
                date: document.getElementById('bookingDate').value,
                phone: document.getElementById('userPhone').value
            };

            if (currentUserId) {
                bookingData.userId = currentUserId;
            } else {
                bookingData.name = document.getElementById('userName').value;
                bookingData.email = document.getElementById('userEmail').value;
            }

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
                } else {
                    alert('Помилка сервера. Перевірте введені дані.');
                }
            } catch (error) {
                console.error('Помилка:', error);
                alert('Немає зв’язку з сервером.');
            }
        });
    }

    // --- 6. ЛОГІКА АВТОРИЗАЦІЇ ТА РЕЄСТРАЦІЇ ---
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

            if (isLoginMode) {
                authTitle.innerText = 'Вхід у кабінет';
                nameGroup.style.display = 'none';
                document.getElementById('authName').removeAttribute('required');
                authSubmitBtn.innerText = 'Увійти';
                toggleAuthBtn.innerText = 'Зареєструватись';
                toggleAuthBtn.previousSibling.textContent = 'Немає акаунту? ';
            } else {
                authTitle.innerText = 'Реєстрація';
                nameGroup.style.display = 'block';
                document.getElementById('authName').setAttribute('required', 'true');
                authSubmitBtn.innerText = 'Створити акаунт';
                toggleAuthBtn.innerText = 'Увійти';
                toggleAuthBtn.previousSibling.textContent = 'Вже є акаунт? ';
            }
        });
    }

    // ОСЬ ТЕ ЩО ЗНИКЛО: Відправка форми авторизації/реєстрації
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Зупиняємо перезавантаження (той самий "знак питання")

            const url = isLoginMode ? 'http://localhost:3000/login' : 'http://localhost:3000/register';

            const payload = {
                email: document.getElementById('authEmail').value,
                password: document.getElementById('authPassword').value
            };

            if (!isLoginMode) {
                payload.name = document.getElementById('authName').value;
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    if (isLoginMode) {
                        localStorage.setItem('userId', data.user.id);
                        localStorage.setItem('userName', data.user.name);
                        alert(`Вітаємо, ${data.user.name}!`);
                        updateAuthUI();
                        closeAllModals();
                    } else {
                        alert('Реєстрація успішна! Тепер ви можете увійти.');
                        toggleAuthBtn.click();
                    }
                } else {
                    alert(data.error || 'Сталася помилка');
                }
            } catch (error) {
                console.error('Помилка авторизації:', error);
                alert('Немає зв’язку з сервером. Запустіть node server.js');
            }
        });
    }
});