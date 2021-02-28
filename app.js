const express = require('express');
const path = require('path');
const {Pool} = require('pg');
const cors = require('cors');
const crypto = require('crypto');
const multer  = require('multer');
const upload = multer({ dest: '/' });
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const tableAuth = require('./createTables/createTableAuthorization');
const tableSalmonel = require('./createTables/createTableSalmonel');

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

tableAuth.createTableAuthorization();
tableSalmonel.createTableSalmonel();

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

app.post("/uploadtable", upload.single('table'),async (request, response) => {
    console.log('table', request, request.file)
    // const token = request.headers.token;
    // const user = await validateToken(token)
    // if (!user) {
    //     response.sendStatus(403)
    //     return
    // }

    response.send('file loaded')
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
    pool.query(sql, args, (err, res) => {
        if (err) throw err;
        console.log(JSON.stringify(res.rows))
        response.send(JSON.stringify(res.rows))
    });
})

module.exports = app;
