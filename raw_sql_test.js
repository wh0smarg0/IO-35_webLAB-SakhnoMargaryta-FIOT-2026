require('dotenv').config();
const mysql = require('mysql2/promise');

async function runRawQueries() {
    try {
        console.log("⏳ Підключення до бази даних...");

        // 1. Підключення до бази без ORM (Виконання Пункту 4)
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("✅ Успішно підключено через чистий пакет mysql2!\n");

        // 2. Виконання сирого SQL-запиту SELECT (Виконання Пункту 5)
        console.log("⏳ Виконання SQL-запиту: SELECT id, name, email FROM Users...");

        // Робимо звичайний запит, щоб витягнути користувачів
        const [rows, fields] = await connection.execute('SELECT id, name, email FROM Users');

        // Виводимо результат у вигляді красивої таблички в терміналі
        console.log("\n📋 Результат (Список користувачів):");
        console.table(rows);

        // 3. Коректно закриваємо з'єднання
        await connection.end();
        console.log("\n🔌 З'єднання закрито.");

    } catch (error) {
        console.error("❌ Помилка підключення або виконання запиту:", error.message);
    }
}

// Запускаємо нашу функцію
runRawQueries();