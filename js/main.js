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
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
});
