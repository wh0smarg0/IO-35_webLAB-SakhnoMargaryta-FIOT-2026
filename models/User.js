const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Email має бути унікальним!
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false // Тепер пароль обов'язковий
    }
});

module.exports = User;