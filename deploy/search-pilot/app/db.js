module.exports = new (require('pg').Pool)({host:'/var/run/postgresql',user:'salmonel_reader',database:'salmonel',max:3,statement_timeout:3000,query_timeout:4000});
