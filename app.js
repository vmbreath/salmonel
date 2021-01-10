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
                     id         serial primary key,
                     serovar    TEXT NOT NULL,
                     o_antigen  jsonb NOT NULL,
                     h_antigen1 jsonb NOT NULL,
                     h_antigen2 jsonb NOT NULL
                 );`, (err, res) => {
    if (err) throw err;


    pool.query('SELECT count(*) as count FROM salmonel;', (err, res) => {
        if (err) throw err;

        console.log('SELECT count(*) as count FROM salmonel: ', res.rows)

        if (res.rows[0].count == '0') {
            const sql = `INSERT INTO salmonel (serovar,o_antigen,h_antigen1,h_antigen2) VALUES ($1,$2,$3,$4);`;
            const insertRow = (data, row, index) => {
                console.log('insertRow ', row);
                pool.query(sql, [
                    row[0],
                    JSON.stringify(row[1]),
                    JSON.stringify(row[2]),
                    JSON.stringify(row[3]),
                ], (err, res) => {
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
    const filter = JSON.parse(request.query.filter);
    // console.log(filter,filter.find.OAntigen[0]);
    // find:{
    //     OAntigen:['15!'],
    //         H1Antigen:[],
    //         H2Antigen:[],
    // },
    // exclude:{
    //     OAntigen:[],
    //         H1Antigen:[],
    //         H2Antigen:[],
    // }

    let sql = 'SELECT * FROM salmonel WHERE 1=1 '
    let args= [];
    filter.find.OAntigen.forEach(it=>{
        args.push(it)
        sql+= ` and (o_antigen ? \$${args.length})`
    })
    filter.find.H1Antigen.forEach(it=>{
        args.push(it)
        sql+= ` and (h_antigen1 ? \$${args.length})`
    })
    filter.find.H2Antigen.forEach(it=>{
        args.push(it)
        sql+= ` and (h_antigen2 ? \$${args.length})`
    })
    filter.exclude.OAntigen.forEach(it=>{
        args.push(it)
        sql+= ` and not (o_antigen ? \$${args.length})`
    })
    filter.exclude.H1Antigen.forEach(it=>{
        args.push(it)
        sql+= ` and not (h_antigen1 ? \$${args.length})`
    })
    filter.exclude.H2Antigen.forEach(it=>{
        args.push(it)
        sql+= ` and not (h_antigen2 ? \$${args.length})`
    })
console.log(sql,args)
    const query = {
        text: sql,
        values: [filter.find.H1Antigen[0]],
    }
    pool.query(sql,args,(err, res) => {
        if (err) throw err;
        console.log(JSON.stringify(res.rows))
        response.send(JSON.stringify(res.rows))
    });
})

module.exports = app;
