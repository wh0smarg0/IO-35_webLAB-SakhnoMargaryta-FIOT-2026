document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. МОБІЛЬНЕ МЕНЮ (БУРГЕР) ---
    const burger = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');
    const navItems = document.querySelectorAll('.nav-links a');

    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        
        // Закриваємо меню при кліку на будь-яке посилання
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // --- 2. ПЛАВНИЙ СКРОЛ ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            if (targetId === '#' || targetId === '') return;

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

    // --- 3. ЛОГІКА МОДАЛЬНИХ ВІКОН (БРОНЮВАННЯ ТА ВХІД) ---
    const bookingModal = document.getElementById('booking-modal');
    const loginModal = document.getElementById('login-modal');

    const loginBtn = document.getElementById('login-btn');
    const bookingButtons = document.querySelectorAll('.btn-outline');

    // Універсальна функція для закриття всіх вікон
    const closeAllModals = () => {
        bookingModal.style.display = 'none';
        loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Відкриття вікна Бронювання
    bookingButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            bookingModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    });

    // Відкриття вікна Входу
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
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

    // --- 4. ЛОГІКА ВЗАЄМОДІЇ З БЕКЕНДОМ ---

    // Функція для створення бронювання в БД
    // Знаходимо форму та елементи
    const bookingForm = document.getElementById('booking-form');
    const modalRoomTitle = document.getElementById('modal-room-title');
    const hiddenRoomName = document.getElementById('hiddenRoomName');

    // Відкриваємо модалку при кліку на "Забронювати" і записуємо назву кімнати
    bookingButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = e.target.closest('.card');
            const roomName = card ? card.querySelector('h3').innerText : 'Кімната';

            // Підставляємо назву кімнати у вікно
            modalRoomTitle.innerText = `Бронювання: ${roomName}`;
            hiddenRoomName.value = roomName; // Зберігаємо для відправки

            bookingModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
    });

    // Відправка форми на сервер
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Зупиняємо стандартне перезавантаження сторінки

        // Збираємо дані з полів
        const bookingData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            roomName: document.getElementById('hiddenRoomName').value,
            date: document.getElementById('bookingDate').value
        };

        try {
            const response = await fetch('http://localhost:3000/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            if (response.ok) {
                alert('Супер! Бронювання успішно створено.');
                bookingForm.reset(); // Очищаємо поля
                closeAllModals();    // Закриваємо вікно
            } else {
                alert('Помилка сервера. Спробуйте ще раз.');
            }
        } catch (error) {
            console.error('Помилка:', error);
            alert('Немає зв’язку з сервером. Запустіть node server.js');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
});
