const express = require('express')
const _ = require('lodash')
const app = express()
const http = require('http').Server(app)

app.use(express.static(__dirname + '/public'))

var port = process.env.PORT || 8080
http.listen(port)

