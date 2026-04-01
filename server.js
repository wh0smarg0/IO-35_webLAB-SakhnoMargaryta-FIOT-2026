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

app.listen(3000, () => {
  console.log("Сервер запущено на http://localhost:3000");
});