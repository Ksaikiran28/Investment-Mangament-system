const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Session setup
app.use(
    session({
        secret: 'your_secret_key', // Replace with a strong secret key
        resave: false,
        saveUninitialized: true,
    })
);

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'saikiran', // Your MySQL username
    password: 'saikiran', // Your MySQL password
    database: 'investorDB', // Your database name
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

// Routes

// Login page
app.get('/login', (req, res) => {
    res.render('loginpage', { errorMessage: null });
});

// Login handler
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT id FROM investors WHERE name = ? AND password = ?';

    connection.query(query, [username, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.render('loginpage', { errorMessage: 'Error occurred. Please try again.' });
        }

        if (results.length > 0) {
            req.session.userId = results[0].id;
            res.redirect('/dashboard');
        } else {
            res.render('loginpage', { errorMessage: 'Invalid username or password.' });
        }
    });
});

// Signup page
app.get('/signup', (req, res) => {
    res.render('signup', { errorMessage: null });
});

// Signup handler
app.post('/signup', (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('signup', { errorMessage: 'Passwords do not match!' });
    }

    const checkEmailQuery = 'SELECT * FROM investors WHERE email = ?';
    connection.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.render('signup', { errorMessage: 'Error occurred. Please try again.' });
        }

        if (results.length > 0) {
            return res.render('signup', { errorMessage: 'This email is already registered.' });
        }

        const insertQuery = 'INSERT INTO investors (name, email, password) VALUES (?, ?, ?)';
        connection.query(insertQuery, [name, email, password], (err) => {
            if (err) {
                console.error(err);
                return res.render('signup', { errorMessage: 'Error occurred while signing up. Please try again.' });
            }
            res.redirect('/login');
        });
    });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;

    const totalQuery = 'SELECT SUM(shares * price_per_share) AS totalInvestment FROM investments WHERE user_id = ?';
    const investmentsQuery = 'SELECT company_name, shares, price_per_share, (shares * price_per_share) AS amount FROM investments WHERE user_id = ?';

    connection.query(totalQuery, [userId], (err, totalResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching total investment');
        }

        let totalInvestment = parseFloat(totalResults[0].totalInvestment) || 0;

        connection.query(investmentsQuery, [userId], (err, investments) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error fetching investment data');
            }

            const sectorCounts = {};

            investments.forEach((investment) => {
                const sector = investment.company_name.split(' ')[0];
                const totalAmount = investment.amount;
                sectorCounts[sector] = (sectorCounts[sector] || 0) + totalAmount;
            });

            const sectors = Object.keys(sectorCounts);
            const amounts = Object.values(sectorCounts);

            res.render('dashboard', {
                investments,
                totalInvestment: totalInvestment.toFixed(2), // Format totalInvestment to 2 decimal places
                sectors,
                amounts,
            });
        });
    });
});

// Add investment handler
app.post('/add-investor', (req, res) => {
    const { company_name, amount, shares, purchase_price, sector } = req.body;

    if (!company_name || !amount || !shares || !purchase_price || !sector) {
        return res.status(400).send('All fields are required.');
    }

    const userId = req.session.userId;
    const pricePerShare = purchase_price;
    const totalAmount = shares * purchase_price;

    const query = `
        INSERT INTO investments 
        (company_name, amount, shares, purchase_price, price_per_share, sector, total_amount, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    connection.query(
        query,
        [company_name, amount, shares, purchase_price, pricePerShare, sector, totalAmount, userId],
        (err) => {
            if (err) {
                console.error('Error saving investment data:', err.message);
                return res.status(500).send('Error saving investment data');
            }
            res.redirect('/dashboard');
        }
    );
});

// Stored data route
app.get('/stored-data', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;

    const query = `
        SELECT company_name, shares, price_per_share, (shares * price_per_share) AS amount, sector
        FROM investments
        WHERE user_id = ?
    `;

    const totalQuery = `
        SELECT SUM(shares * price_per_share) AS totalInvestment
        FROM investments
        WHERE user_id = ?
    `;

    connection.query(query, [userId], (err, investments) => {
        if (err) {
            console.error('Error fetching investments:', err);
            return res.status(500).send('Error fetching stored data');
        }

        connection.query(totalQuery, [userId], (err, totalResults) => {
            if (err) {
                console.error('Error fetching total investment:', err);
                return res.status(500).send('Error fetching total investment');
            }

            let totalInvestment = totalResults[0]?.totalInvestment || 0;
            if (isNaN(totalInvestment)) {
                totalInvestment = 0;
            }

            totalInvestment = parseFloat(totalInvestment).toFixed(2);

            // Aggregate investments by sector
            const sectorCounts = {};

            investments.forEach((investment) => {
                const sector = investment.sector;
                const totalAmount = investment.amount;
                sectorCounts[sector] = (sectorCounts[sector] || 0) + totalAmount;
            });

            const sectors = Object.keys(sectorCounts);
            const amounts = Object.values(sectorCounts);

            // Pass aggregated sector data and investments to the view
            res.render('storeddata', {
                investments,
                totalInvestment,
                sectors,
                amounts,  // Pass sector investment amounts
            });
        });
    });
});

// Pie chart route
app.get('/sector-pie-chart', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const userId = req.session.userId;

    // Query to get sector-wise data
    const query = `
        SELECT sector, SUM(shares * price_per_share) AS totalAmount
        FROM investments
        WHERE user_id = ?
        GROUP BY sector
    `;

    connection.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching sector data:', err);
            return res.status(500).send('Error fetching data');
        }

        if (results.length === 0) {
            return res.status(404).send('No investment data found for this user.');
        }

        // Prepare data for pie chart
        const sectorNames = results.map(row => row.sector);
        const amounts = results.map(row => parseFloat(row.totalAmount));

        // Render pie chart page
        res.render('piechart', { sectorNames, amounts });
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/login');
    });
});

// Server
const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
