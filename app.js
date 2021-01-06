const express = require('express');
const fs = require('fs');
const path = require('path');
const {Pool} = require('pg');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

var app = express();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


pool.query(`CREATE TABLE if not exists salmonel (
                     serovar    TEXT NOT NULL,
                     o_antigen  TEXT NOT NULL,
                     h_antigen1 TEXT NOT NULL,
                     h_antigen2 TEXT NOT NULL
                 );`, (err, res) => {
    if (err) throw err;

    pool.end();

    pool.query('SELECT count(*) as count FROM salmonel;', (err, res) => {
        if (err) throw err;

        if (res.rows[0].count === 0) {
            const sql = `INSERT INTO salmonel (serovar, o_antigen,h_antigen1,h_antigen2) VALUES ($1,$2,$3,$4);`;
            const insertRow = (data, row, index) => {
                console.log('insertRow ', row);
                pool.query(sql, row, (err, res) => {
                    if (err) {
                        return console.log(err.message);
                    }
                    if (data[index + 1] !== undefined) {
                        insertRow(data, data[index + 1], index + 1);
                    } else {
                        pool.end();
                    }
                })
            };

            let rawdata = fs.readFileSync('Data.js');
            let Data = JSON.parse(rawdata);
            insertRow(Data, Data[0], 0);

        }

        pool.end();
    });
});



// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

app.get("/test", (request, response) => {
    pool.query('SELECT * as count FROM salmonel;', (err, res) => {
        if (err) throw err;
        pool.end();
        response.send(JSON.stringify(res.rows))
    });
})


module.exports = app;
