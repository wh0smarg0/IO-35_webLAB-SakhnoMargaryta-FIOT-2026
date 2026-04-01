const express = require('express');
const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./models/User');
const Booking = require('./models/Booking');

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

// --- МАРШРУТИ АВТОРИЗАЦІЇ ---

// 1. Реєстрація нового користувача
app.post('/register', async (req, res) => {
    try {
        // Хешуємо пароль перед збереженням
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        });

        res.status(201).json({ message: "Реєстрація успішна!", userId: newUser.id });
    } catch (err) {
        res.status(400).json({ error: "Помилка реєстрації. Можливо такий email вже існує." });
    }
});

// 2. Вхід (Логін)
app.post('/login', async (req, res) => {
    try {
        // Шукаємо юзера за email
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user) return res.status(404).json({ error: "Користувача не знайдено" });

        // Перевіряємо, чи збігається пароль
        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Невірний пароль" });

        // Відправляємо дані юзера (без пароля!) на фронтенд
        res.json({
            message: "Вхід успішний",
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Отримати бронювання КОНКРЕТНОГО користувача
app.get('/users/:id/bookings', async (req, res) => {
    try {
        const userBookings = await Booking.findAll({
            where: { UserId: req.params.id }
        });
        res.json(userBookings);
    } catch (err) {
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
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => {
  console.log("Сервер запущено на http://localhost:3000");
});