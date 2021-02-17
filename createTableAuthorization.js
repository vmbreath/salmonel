exports.createTableAuthorization = (fs,pool,crypto) => {
    // language=SQL format=false
    pool.query(`CREATE TABLE if not exists user_account (
                id serial primary key,
                name varchar ( 256 ),
                login varchar ( 256 ),
                password char( 64 ),
                salt char ( 64 )
    );`, (err, res) => {
        if (err) throw err;

        pool.query('SELECT count(*) as count FROM user_account;', (err, res) => {
            if (err) throw err;

            console.log('SELECT count(*) as count FROM user_account: ', res.rows)

            if (res.rows[0].count == '0') {
                const sql = `INSERT INTO user_account (name, login, password, salt)
                         VALUES ($1, $2, $3, $4);`;
                const salt = crypto.createHash('sha256').update(new Date().getTime() + '').digest('hex');
                pool.query(sql, [
                    'Admin',
                    'admin',
                    crypto.createHash('sha256').update('qwerty').update(salt).digest('hex'),
                    salt,
                ], (err, res) => {
                    if (err) {
                        return console.log(err.message);
                    }
                })
            }
        })
    })
}