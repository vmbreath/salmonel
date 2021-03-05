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