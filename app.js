const express = require('express');
const fs = require('fs');
const path = require('path');
const {Pool} = require('pg');
const cors = require('cors');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const tableAuth = require('./createTableAuthorization')


const whitelist = ['http://localhost:3000', 'https://salmonel-heroku.herokuapp.com/']
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

const app = express();
app.use(cors());
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// language=SQL format=false
pool.query(`CREATE TABLE if not exists salmonel (
                id serial primary key,
                allgroups TEXT NOT NULL,
                serovar TEXT NOT NULL,
                o_antigen jsonb NOT NULL,
                h_antigen1 jsonb NOT NULL,
                h_antigen2 jsonb NOT NULL
            );`, (err, res) => {
    if (err) throw err;

    pool.query('SELECT count(*) as count FROM salmonel;', (err, res) => {
        if (err) throw err;

        console.log('SELECT count(*) as count FROM salmonel: ', res.rows)

        if (res.rows[0].count == '0') {
            const sql = `INSERT INTO salmonel (allgroups, serovar, o_antigen, h_antigen1, h_antigen2)
                         VALUES ($1, $2, $3, $4, $5);`;
            const insertRow = (data, row, index) => {
                console.log('insertRow  ', row);
                pool.query(sql, [
                    row[0],
                    row[1],
                    JSON.stringify(row[2]),
                    JSON.stringify(row[3]),
                    JSON.stringify(row[4]),
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

tableAuth.createTableAuthorization(fs,pool);

// pool.query(`CREATE TABLE if not exists user_account (
//                 id serial primary key,
//                 name varchar ( 256 ),
//                 login varchar ( 256 ),
//                 password char( 64 ),
//                 salt char ( 64 )
//     );`, (err, res) => {
//     if (err) throw err;
//
//     pool.query('SELECT count(*) as count FROM user_account;', (err, res) => {
//         if (err) throw err;
//
//         console.log('SELECT count(*) as count FROM user_account: ', res.rows)
//
//         if (res.rows[0].count == '0') {
//             const sql = `INSERT INTO user_account (name, login, password, salt)
//                          VALUES ($1, $2, $3, $4);`;
//             const salt = crypto.createHash('sha256').update(new Date().getTime() + '').digest('hex');
//             pool.query(sql, [
//                 'Admin',
//                 'admin',
//                 crypto.createHash('sha256').update('qwerty').update(salt).digest('hex'),
//                 salt,
//             ], (err, res) => {
//                 if (err) {
//                     return console.log(err.message);
//                 }
//             })
//         }
//     })
// })


// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

app.options('*', cors(corsOptions));

app.get("/test", (request, response) => {
    pool.query('SELECT * FROM salmonel;', (err, res) => {
        if (err) throw err;
        response.send(JSON.stringify(res.rows))
    });
})

const createToken = (user) => {
    const data = user.login;
    const sign = crypto.createHash('sha256').update(data).update(user.password).digest('hex');
    return `${data}|${sign}`;
};
const validateToken = async (token) => {
    if (!token) return null;
    let parts = token.split('|');
    const data = parts[0];
    const sign = parts[1];
    const res = await pool.query('select * from user_account WHERE login = $1', [data]);

    console.log(JSON.stringify(res.rows))
    if (res.rows.length === 0) {
        return null
    }

    const user = res.rows[0];
    if (sign !== crypto.createHash('sha256').update(data).update(user.password).digest('hex')) {
        return null
    }

    return user
};

app.post("/login", (request, response) => {
    const userName = request.body.userName;
    const password = request.body.password;
    pool.query('select * from user_account WHERE login = $1', [userName], (err, res) => {
        if (err) throw err;
        console.log(JSON.stringify(res.rows))
        if (res.rows.length === 0) {
            response.sendStatus(404)
            return
        }

        const user = res.rows[0];

        if (user.password !== crypto.createHash('sha256').update(password).update(user.salt).digest('hex')) {
            response.sendStatus(403)
            return
        }

        response.send(JSON.stringify({token: createToken(user)}))
    });
})

app.post("/verifier", async (request, response) => {
    console.log('admin', request.headers.token)
    const token = request.headers.token;
    const user = await validateToken(token)
    if (!user) {
        response.sendStatus(403)
        return
    }

    response.send(JSON.stringify({data: 'ololo'}))
})

app.get("/filter", (request, response) => {
    const filter = JSON.parse(request.query.filter);
    let sql = 'SELECT * FROM salmonel WHERE 1=1 '
    let args = [];
    const doSqlAndArgs = (antigen, it) => {
        args.push(it)
        sql += ` and ((${antigen} ? \$${args.length})`
        args.push('%,' + it + ',%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%(' + it + ',%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%,' + it + ')%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%(' + it + ')%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%{' + it + ',%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%,' + it + '}%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%{' + it + '}%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%[' + it + ',%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%,' + it + ']%')
        sql += ` or (${antigen}::text like \$${args.length})`
        args.push('%[' + it + ']%')
        sql += ` or (${antigen}::text like \$${args.length}))`
    }
    filter.find.OAntigen.forEach(it => {
        doSqlAndArgs('o_antigen', it);
    })
    filter.find.H1Antigen.forEach(it => {
        doSqlAndArgs('h_antigen1', it);
    })
    filter.find.H2Antigen.forEach(it => {
        doSqlAndArgs('h_antigen2', it);
    })
    filter.exclude.OAntigen.forEach(it => {
        args.push(it)
        sql += ` and not (o_antigen ? \$${args.length})`
    })
    filter.exclude.H1Antigen.forEach(it => {
        args.push(it)
        sql += ` and not (h_antigen1 ? \$${args.length})`
    })
    filter.exclude.H2Antigen.forEach(it => {
        args.push(it)
        sql += ` and not (h_antigen2 ? \$${args.length})`
    })
    console.log(sql, args, 'kkk')
    pool.query(sql, args, (err, res) => {
        if (err) throw err;
        console.log(JSON.stringify(res.rows))
        response.send(JSON.stringify(res.rows))
    });
})

module.exports = app;
