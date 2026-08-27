const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const pool = require('./db');
const tableAuth = require('./createTables/createTableAuthorization');
const tableSalmonel = require('./createTables/createTableSalmonel');
const tableFiles = require('./createTables/createTableFiles');

const searchRouter = require('./routes/search');
const authRouter = require('./routes/auth');
const filesRouter = require('./routes/files');

const app = express();

const whitelist = ['http://localhost:3000', 'https://salmonel.onrender.com'];
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB tables
tableAuth.createTableAuthorization(pool);
tableFiles.createTableFiles(pool);
tableSalmonel.createTableSalmonel(pool);

// Register routes
app.use('/', searchRouter);
app.use('/', authRouter);
app.use('/', filesRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
