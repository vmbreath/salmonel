const {Client}=require('pg');
(async()=>{
 const reader=new Client({host:'/var/run/postgresql',user:'salmonel_reader',database:'salmonel'});
 await reader.connect();
 const info=await reader.query("SELECT current_user,current_setting('transaction_read_only') AS readonly");
 if(info.rows[0].current_user!=='salmonel_reader'||info.rows[0].readonly!=='on')throw Error('wrong role');
 await reader.query('SET default_transaction_read_only=off');
 try {await reader.query('UPDATE salmonel SET serovar=serovar WHERE false');throw Error('write permission unexpectedly granted');}
 catch(e){if(e.code!=='42501')throw e;console.log('Reader UPDATE blocked: '+e.code);}
 await reader.end();
 const admin=new Client({host:'/var/run/postgresql',user:'postgres',database:'salmonel'});
 try {await admin.connect();await admin.end();throw Error('postgres escalation allowed');}
 catch(e){if(e.code!=='28000')throw e;console.log('App to postgres escalation blocked: '+e.code);}
})().catch(e=>{console.error(e.message);process.exit(1)});
