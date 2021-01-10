const express = require('express');
const fs = require('fs');
const path = require('path');
const {Pool} = require('pg');
var cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

var app = express();
app.use(cors());
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


    pool.query('SELECT count(*) as count FROM salmonel;', (err, res) => {
        if (err) throw err;

        console.log('SELECT count(*) as count FROM salmonel: ', res.rows)

        if (res.rows[0].count == '0') {
            const sql = `INSERT INTO salmonel (serovar, o_antigen,h_antigen1,h_antigen2) VALUES ($1,$2,$3,$4);`;
            const insertRow = (data, row, index) => {
                console.log('insertRow ', row);
                pool.query(sql, row, (err, res) => {
                    if (err) {
                        return console.log(err.message);
                    }
                    if (data[index + 1] !== undefined) {
                        insertRow(data, data[index + 1], index + 1);
                    }
                })
            };
            let rawdata = fs.readFileSync('Data.js');
            let Data = JSON.parse(rawdata);
            insertRow(Data, Data[0], 0);

        }
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
    pool.query('SELECT * FROM salmonel;', (err, res) => {
        if (err) throw err;
        response.send(JSON.stringify(res.rows))
    });
})

app.get("/salmonel", (request, response) => {
    const serovar = `%${request.query.filter}%`;
    console.log(serovar);
    pool.query(`select * from salmonel WHERE serovar LIKE $1 limit 10;`,[serovar],(err, res) => {
        if (err) throw err;
        console.log(JSON.stringify(res.rows))
        response.send(JSON.stringify(res.rows))
    });
})
app.get("/filter", (request, response) => {
    const o_antigen = JSON.parse(request.query.filter);
    console.log(o_antigen,o_antigen.find.OAntigen[0]);
    pool.query(`select * from salmonel WHERE o_antigen LIKE o_antigen;`,['15!'],(err, res) => {
        if (err) throw err;
        console.log(JSON.stringify(res.rows))
        response.send(JSON.stringify(res.rows))
    });
})

module.exports = app;
