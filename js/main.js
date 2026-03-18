document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. БУРГЕР-МЕНЮ ---
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

    // --- 3. МОДАЛЬНЕ ВІКНО БРОНЮВАННЯ ---
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.querySelector('.close-modal');
    const bookingButtons = document.querySelectorAll('.btn-outline'); // Кнопки в картках
    const bookingForm = document.getElementById('booking-form');

    // Відкриття модалки при кліку на "Забронювати"
    bookingButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Забороняємо скрол фону
        });
    });

    // Закриття на хрестик
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // Закриття при кліку поза вікном
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Обробка відправки форми
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Дякуємо! Ваша заявка прийнята. Ми зателефонуємо вам для підтвердження.');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            bookingForm.reset();
        });
    }

    // --- 4. КНОПКА УВІЙТИ (Заглушка) ---
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Функціонал особистого кабінету буде реалізовано у наступній лабораторній роботі (Backend).');
        });
    }
});
