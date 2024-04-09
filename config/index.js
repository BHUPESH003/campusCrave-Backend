require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?sslmode=${process.env.DB_SSL_MODE}`,
});

client.connect((err)=>{
  if(err){
    console.log('connection error' , err.stack)
  }
  else{
    console.log('connected')
  }
}); 

module.exports = client;