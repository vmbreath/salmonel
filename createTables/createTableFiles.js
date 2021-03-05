const {Pool} = require('pg');
const crypto = require('crypto');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
exports.createTableFiles = (pool) => {
    pool.query(`CREATE TABLE if not exists files (
                id serial primary key,
                name varchar ( 256 ),
                date timestamp,
                compress_type varchar( 64 ),
                data bytea
    );`, (err, res) => {
        if (err) throw err;
    })
}