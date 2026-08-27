const bcrypt = require('bcrypt');

exports.createTableAuthorization = (pool) => {
    pool.query(`CREATE TABLE if not exists user_account (
                id serial primary key,
                name varchar(256),
                login varchar(256),
                password varchar(255)
    );`, (err, res) => {
        if (err) {
            console.error('Error creating user_account table:', err);
            return;
        }

        pool.query('SELECT count(*) as count FROM user_account;', async (err, res) => {
            if (err) {
                console.error('Error counting user_account:', err);
                return;
            }

            if (res.rows[0].count == '0') {
                const sql = `INSERT INTO user_account (name, login, password) VALUES ($1, $2, $3);`;
                
                try {
                    // Hash default password 'qwerty' with a cost factor of 10
                    const hashedPassword = await bcrypt.hash('qwerty', 10);
                    
                    pool.query(sql, ['Admin', 'admin', hashedPassword], (err, res) => {
                        if (err) {
                            console.error('Error inserting default admin:', err.message);
                        } else {
                            console.log('Default admin user created.');
                        }
                    });
                } catch (hashErr) {
                    console.error('Error hashing default password:', hashErr);
                }
            }
        });
    });
};