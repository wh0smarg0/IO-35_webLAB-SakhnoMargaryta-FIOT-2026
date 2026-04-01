const express = require('express');
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

app.post('/bookings', async (req, res) => {
    try {
        // 1. Шукаємо користувача за email, або створюємо нового
        const [user, created] = await User.findOrCreate({
            where: { email: req.body.email },
            defaults: { name: req.body.name }
        });

        // 2. Створюємо бронювання і прив'язуємо до цього користувача
        const newBooking = await Booking.create({
            roomName: req.body.roomName,
            content: `Дата репетиції: ${req.body.date}`, // Записуємо дату в контент
            UserId: user.id // Ось він, наш динамічний ID!
        });

        res.status(201).json(newBooking);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

app.listen(3000, () => {
  console.log("Сервер запущено на http://localhost:3000");
});