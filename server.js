const express = require('express')
const app = express()
const mongoose = require('mongoose')
require('dotenv').config()

// db connection
mongoose.connect(process.env.DB_URL, {family: 4})
const db = mongoose.connection
db.on('error', (error) => console.log(error))
db.once('connected', () => console.log('Connected to DB'))

app.use(express.json()) //middleware to accept and transmit json

app.listen(5001, () => console.log('Server started'))