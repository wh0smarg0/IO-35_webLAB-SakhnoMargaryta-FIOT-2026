const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
    roomName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false // Телефон обов'язковий для всіх
    },
    guestName: {
        type: DataTypes.STRING,
        allowNull: true // Тільки для неавторизованих
    },
    guestEmail: {
        type: DataTypes.STRING,
        allowNull: true // Тільки для неавторизованих
    }
});

module.exports = Booking;