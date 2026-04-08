const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
// В реальному житті цей ID беруть з панелі розробника Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '284257768972-hdh3hevqp0rbv3he45c3ju2tpqf5cpei.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_drumspace_key';
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET || 'super_mega_refresh_secret_key';
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
const User = require('./models/User');
const Booking = require('./models/Booking');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json()); // для роботи з JSON

const cors = require('cors');
app.use(cors()); // Дозволяє фронтенду робити запити до API

// Встановлення зв'язку: Один користувач має багато бронювань
User.hasMany(Booking);
Booking.belongsTo(User);

// Синхронізація з базою даних
sequelize.sync({ alter: true })
  .then(() => {
    console.log("З'єднання встановлено, таблиці створено успішно! ✅");
  })
  .catch(err => console.error("Помилка підключення до БД: ❌", err));

// --- ФУНКЦІЯ ЛОГУВАННЯ ПОМИЛОК ---
const logError = (err, req) => {
    // Створюємо красивий запис із датою, методом та адресою
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${req.method} ${req.url} - Помилка: ${err.message}\n`;

    // Дописуємо цей рядок у файл error.log (створить файл, якщо його немає)
    fs.appendFile(path.join(__dirname, 'error.log'), logMessage, (appendErr) => {
        if (appendErr) console.error("❌ Не вдалося записати лог у файл:", appendErr);
    });
};

// --- MIDDLEWARE ДЛЯ ПЕРЕВІРКИ ТОКЕНА ---
const authenticateToken = (req, res, next) => {
    // Шукаємо токен у заголовках
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Доступ заборонено. Немає токена." });
    }

    try {
        // Розшифровуємо токен
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Зберігаємо дані юзера, щоб використати в маршруті
        next(); // Пропускаємо далі
    } catch (error) {
        return res.status(403).json({ message: "Невірний або прострочений токен." });
    }
};

// Перевірка статусу сервера
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "drumspace-api",
        timestamp: new Date().toISOString()
    });
});

// --- ОБМЕЖЕННЯ СПРОБ ВХОДУ ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 5, // Максимум 5 спроб з одного IP
    message: { error: "Забагато спроб входу. Будь ласка, спробуйте пізніше через 15 хвилин." }
});

// --- МАРШРУТИ АВТОРИЗАЦІЇ ---

// 1. Реєстрація нового користувача
app.post('/register', async (req, res) => {
    try {
        // Додали passwordConfirm
        const { name, email, password, passwordConfirm } = req.body;

        // БЕКЕНД-ВАЛІДАЦІЯ
        if (!name || !email || !password || !passwordConfirm) {
            return res.status(400).json({ message: "Всі поля є обов'язковими" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Пароль має бути не менше 6 символів" });
        }
        // ПЕРЕВІРКА ПІДТВЕРДЖЕННЯ ПАРОЛЯ
        if (password !== passwordConfirm) {
            return res.status(400).json({ message: "Паролі не співпадають!" });
        }

        // Перевірка існуючого email
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Користувач з таким email вже існує" });
        }

        // Хешуємо пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt); // Використовуємо password з деструктуризації

        // Створюємо юзера
        const newUser = await User.create({
            name,     // Використовуємо name з деструктуризації
            email,    // Використовуємо email з деструктуризації
            password: hashedPassword
        });

        // --- ДОДАЄМО ГЕНЕРАЦІЮ ТОКЕНА ДЛЯ ПІДТВЕРДЖЕННЯ EMAIL ---
        // Створюємо токен, який живе 1 день
        const emailToken = jwt.sign(
            { id: newUser.id },
            SECRET_KEY,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            message: "Реєстрація успішна! Будь ласка, підтвердіть свій email.",
            userId: newUser.id,
            // Імітуємо відправку листа (для Postman)
            confirmationLink: `http://localhost:3000/confirm-email/${emailToken}`
        });
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(400).json({ error: "Помилка реєстрації. Можливо такий email вже існує." });
    }
});

// 2. Вхід (Логін)
// 2. Вхід (Логін)
app.post('/login', loginLimiter, async (req, res) => {
    try {
        // Шукаємо юзера за email
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

        // Перевіряємо, чи збігається пароль
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Невірний пароль" }); // ЦЕЙ РЯДОК БУВ ПРОПУЩЕНИЙ
        }

        // ГЕНЕРАЦІЯ ACCESS ТОКЕНА (короткий, наприклад 15 хвилин)
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: '15m' } // 15 хвилин
        );

        // ГЕНЕРАЦІЯ REFRESH ТОКЕНА (довгий, наприклад 7 днів)
        const refreshToken = jwt.sign(
            { id: user.id, email: user.email }, // Тут ролі зазвичай не потрібні
            REFRESH_SECRET_KEY,
            { expiresIn: '7d' } // 7 днів
        );

        // Відправляємо дані І ДВА ТОКЕНИ на фронтенд
        res.json({
            message: "Вхід успішний",
            accessToken: accessToken,   // Використовуємо для запитів
            refreshToken: refreshToken, // Використовуємо ТІЛЬКИ для оновлення Access токена
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- ЗАХИЩЕНИЙ МАРШРУТ (ПРОФІЛЬ) ---
// Зверни увагу: ми передаємо authenticateToken другим параметром!
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Оскільки middleware пропустив нас сюди, у req.user є ID користувача
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] } // Не віддаємо хеш пароля на фронтенд
        });

        res.json({
            message: "Доступ дозволено",
            user: user
        });
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).json({ message: "Помилка сервера" });
    }
});

// --- КЕРУВАННЯ ПРОФІЛЕМ (CRUD КОРИСТУВАЧА) ---

// 1. Оновлення профілю (Зміна імені або email)
app.put('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

        // Оновлюємо тільки ті поля, які передали
        if (req.body.name) user.name = req.body.name;
        if (req.body.email) user.email = req.body.email;

        await user.save();

        res.json({
            message: "Профіль успішно оновлено",
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: "Помилка оновлення профілю" });
    }
});

// 2. Зміна пароля
app.put('/profile/password', authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: "Введіть старий і новий пароль" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Новий пароль має бути не менше 6 символів" });
        }

        const user = await User.findByPk(req.user.id);

        // Перевіряємо старий пароль
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Невірний поточний пароль" });
        }

        // Хешуємо новий пароль
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: "Пароль успішно змінено!" });
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: "Помилка зміни пароля" });
    }
});

// 3. Видалення акаунту
app.delete('/profile', authenticateToken, async (req, res) => {
    try {
        // Завдяки зв'язкам у Sequelize, якщо видалити юзера,
        // можуть автоматично видалитися і його бронювання (залежить від налаштувань БД)
        const result = await User.destroy({ where: { id: req.user.id } });

        if (result) {
            res.json({ message: "Ваш акаунт успішно видалено" });
        } else {
            res.status(404).json({ error: "Користувача не знайдено" });
        }
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: "Помилка видалення акаунту" });
    }
});

// --- ПУБЛІЧНИЙ РОЗКЛАД (Для перевірки зайнятих годин) ---
app.get('/bookings/schedule', async (req, res) => {
    try {
        // Витягуємо ВСІ бронювання, але ТІЛЬКИ безпечні поля.
        // Ми НЕ беремо phone, guestName, guestEmail чи UserId.
        const schedule = await Booking.findAll({
            attributes: ['roomName', 'content']
        });

        res.json(schedule);
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).json({ error: "Помилка при завантаженні розкладу" });
    }
});

// 3. Отримати бронювання КОНКРЕТНОГО користувача
app.get('/users/:id/bookings', authenticateToken, async (req, res) => {
    try {
        // --- ГОЛОВНА ПЕРЕВІРКА БЕЗПЕКИ ---
        // Якщо ID з токена НЕ збігається з ID в URL (і цей юзер не адмін) — блокуємо!
        if (req.user.id !== parseInt(req.params.id) && req.user.role !== 'admin') {
            return res.status(403).json({
                error: "Доступ заборонено! Ви можете переглядати лише власні записи."
            });
        }

        const userBookings = await Booking.findAll({
            where: { UserId: req.params.id }
        });
        res.json(userBookings);
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Видалення бронювання (CRUD: Delete)
app.delete('/bookings/:id', async (req, res) => {
    try {
        const result = await Booking.destroy({ where: { id: req.params.id } });
        if (result) {
            res.json({ message: "Бронювання скасовано" });
        } else {
            res.status(404).json({ error: "Запис не знайдено" });
        }
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Редагування бронювання (CRUD: Update)
app.put('/bookings/:id', async (req, res) => {
    try {
        // 1. Шукаємо запис за ID
        const booking = await Booking.findByPk(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: "Бронювання не знайдено" });
        }

        // 2. Якщо передана нова дата, оновлюємо поле content
        if (req.body.date) {
            booking.content = `Дата репетиції: ${req.body.date}`;
        }

        // 3. Зберігаємо зміни в базу
        await booking.save();
        res.json({ message: "Час репетиції успішно змінено", booking });
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Створення нового бронювання (для всіх)
app.post('/bookings', async (req, res) => {
    try {
        // Базові дані, які є завжди
        const bookingData = {
            roomName: req.body.roomName,
            content: `Дата репетиції: ${req.body.date}`,
            phone: req.body.phone
        };

        // Перевіряємо, чи є ID користувача (чи він авторизований)
        if (req.body.userId) {
            bookingData.UserId = req.body.userId; // Прив'язуємо до акаунту
        } else {
            // Якщо це гість (неавторизований)
            bookingData.guestName = req.body.name;
            bookingData.guestEmail = req.body.email;
        }

        const newBooking = await Booking.create(bookingData);
        res.status(201).json(newBooking);
    } catch (err) {
        logError(err, req);
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// 4. Вихід з акаунту (Logout)
app.post('/logout', authenticateToken, (req, res) => {
    try {
        // У stateless JWT архітектурі сервер просто підтверджує запит.
        // Основна дія (видалення токена) має відбутися на стороні клієнта (фронтенду).
        // Для повної інвалідації токена до закінчення його терміну дії
        // необхідна реалізація Blacklist у Redis або базі даних.

        res.json({
            message: "Ви успішно вийшли з системи.",
            instruction: "Frontend має видалити JWT-токен із localStorage або Cookies."
        });
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: "Помилка при виході з системи" });
    }
});

// 5. Оновлення Access токена (Refresh Token)
app.post('/refresh', (req, res) => {
    try {
        // Очікуємо, що клієнт пришле refresh токен у тілі запиту
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh токен не надано" });
        }

        // Перевіряємо валідність refresh токена
        jwt.verify(refreshToken, REFRESH_SECRET_KEY, (err, user) => {
            if (err) {
                return res.status(403).json({ error: "Недійсний або прострочений Refresh токен" });
            }

            // Якщо токен живий, генеруємо новий короткий Access токен
            const newAccessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                SECRET_KEY,
                { expiresIn: '15m' }
            );

            // Видаємо нову перепустку
            res.json({ accessToken: newAccessToken });
        });
    } catch (error) {
        logError(error, req);
        res.status(500).json({ error: "Помилка при оновленні токена" });
    }
});

// --- ВІДНОВЛЕННЯ ПАРОЛЯ ---

// 1. Запит на відновлення пароля (Генерація токена)
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Введіть email" });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: "Користувача з таким email не знайдено" });

        // Генеруємо спеціальний токен для відновлення пароля (живе лише 15 хвилин)
        // Додаємо пароль юзера до секрету. Це гарантує, що токен стане недійсним ОДРАЗУ після зміни пароля.
        const secret = SECRET_KEY + user.password;
        const payload = { email: user.email, id: user.id };
        const resetToken = jwt.sign(payload, secret, { expiresIn: '15m' });

        // В реальному житті тут був би код відправки email (наприклад, через nodemailer).
        // Для лабораторної ми просто повернемо токен у відповіді, щоб ти могла його скопіювати.
        res.json({
            message: "Посилання для відновлення пароля 'відправлено' на пошту.",
            resetToken: resetToken, // <--- Копіювати звідси!
            instruction: "Зробіть POST запит на /reset-password з цим токеном та новим паролем."
        });

    } catch (error) {
        logError(error, req);
        res.status(500).json({ error: "Помилка при створенні запиту на відновлення." });
    }
});

// 2. Скидання пароля (Використання токена)
app.post('/reset-password', async (req, res) => {
    try {
        const { id, token, newPassword } = req.body;

        if (!id || !token || !newPassword) {
            return res.status(400).json({ error: "Необхідно передати id, token та newPassword." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Пароль має бути не менше 6 символів" });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

        // Відтворюємо той самий секретний ключ, яким підписували
        const secret = SECRET_KEY + user.password;

        try {
            // Перевіряємо токен
            jwt.verify(token, secret);

            // Якщо токен валідний — хешуємо і зберігаємо новий пароль
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();

            res.json({ message: "Пароль успішно змінено! Тепер ви можете увійти з новим паролем." });
        } catch (verifyError) {
            return res.status(403).json({ error: "Недійсний або прострочений токен відновлення." });
        }

    } catch (error) {
        logError(error, req);
        res.status(500).json({ error: "Помилка при скиданні пароля." });
    }
});

// --- ПІДТВЕРДЖЕННЯ EMAIL ---
app.get('/confirm-email/:token', async (req, res) => {
    try {
        // Беремо токен прямо з URL (параметр :token)
        const { token } = req.params;

        // Розшифровуємо токен
        const decoded = jwt.verify(token, SECRET_KEY);

        // Шукаємо юзера за ID, який був схований у токені
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(404).json({ error: "Користувача не знайдено" });
        }

        if (user.isEmailConfirmed) {
            return res.status(400).json({ message: "Email вже був підтверджений раніше." });
        }

        // Змінюємо статус і зберігаємо
        user.isEmailConfirmed = true;
        await user.save();

        // Оскільки це GET запит (перехід по посиланню), ми можемо відправити красивий HTML
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1 style="color: #4CAF50;">✅ Ваш Email успішно підтверджено!</h1>
                <p>Тепер ви можете повернутися у додаток DrumSpace та увійти у свій акаунт.</p>
            </div>
        `);
    } catch (error) {
        logError(error, req);
        res.status(400).send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1 style="color: #f44336;">❌ Помилка підтвердження</h1>
                <p>Посилання недійсне або його термін дії закінчився.</p>
            </div>
        `);
    }
});

// --- ВХІД ЧЕРЕЗ GOOGLE (OAuth) ---
app.post('/auth/google', async (req, res) => {
    try {
        // Фронтенд має прислати нам токен, який він отримав від Google
        const { token } = req.body;

        if (!token) return res.status(400).json({ error: "Google токен не надано" });

        // 1. Перевіряємо, чи цей токен справжній (запитуємо у серверів Google)
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        // 2. Дістаємо дані профілю з розшифрованого токена
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        // 3. Шукаємо користувача в нашій базі DrumSpace
        let user = await User.findOne({ where: { email } });

        // 4. Якщо користувача немає — реєструємо його автоматично!
        if (!user) {
            // Оскільки він заходить через Google, пароль йому не потрібен,
            // але в базі поле обов'язкове. Генеруємо складний випадковий пароль:
            const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = await User.create({
                name: name,
                email: email,
                password: hashedPassword,
                isEmailConfirmed: true // Пошта від Google 100% справжня, одразу підтверджуємо!
            });
        }

        // 5. Видаємо НАШІ стандартні токени (Access та Refresh)
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id, email: user.email },
            REFRESH_SECRET_KEY,
            { expiresIn: '7d' }
        );

        res.json({
            message: "Вхід через Google успішний!",
            accessToken,
            refreshToken,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        logError(error, req);
        res.status(401).json({ error: "Помилка авторизації через Google. Токен недійсний." });
    }
});

app.listen(3000, () => {
  console.log("Сервер запущено на http://localhost:3000");
});