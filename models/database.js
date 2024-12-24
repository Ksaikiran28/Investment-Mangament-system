const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost', // Ensure 'localhost' is correct (or use the database server address)
    user: 'saikiran',      // Ensure this is your MySQL username
    password: 'saikiran', // Replace with your MySQL password
    database: 'investorDB', // Database name
    port: '3306'       // Default MySQL port
});

connection.connect((err) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("DataBase Connected!");
});

module.exports = connection;
