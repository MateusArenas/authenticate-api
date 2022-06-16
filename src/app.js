const express = require('express');
const http = require('http');
require('express-async-errors')
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const morgan = require('morgan');
const routes = require('./modules/routes')
const { monitorAllEventEmitter } = require('./components/monitorEventEmitter');
const changes = require('./modules/changes');

class App {
    constructor() {
        this.express = express();
        this.server = http.createServer(this.express);
        this.handleMiddlewares();
        this.handleDatabase();
        this.handleRoutes();
        this.handleErrorMiddlewares();
        this.handleDatabaseChanges()
    }
 
    handleMiddlewares() {
        // Use JSON parser for parsing payloads as JSON on all non-webhook routes.
        // this.express.use((req, res, next) => {
        //     if (req.originalUrl === '/webhook') {
        //         next();
        //     } else {
        //         bodyParser.json()(req, res, next);
        //     }
        // });
        this.express.use(express.json());
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(morgan('dev'))
        this.express.use(cors());
    }

    handleErrorMiddlewares () {
        this.express.use((err, req, res, next) => {
            const error = { message: err.message }
            if (err instanceof Error) { return res.status(400).json(error) } 
            return res.status(500).json(error)
        })
    }
    handleDatabase() {
        mongoose.connect('mongodb://localhost:27017/auth-db?retryWrites=true&w=majority', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // ignoreUndefined: true,  
            authSource: 'admin',
        })
        mongoose.connection.on('error', () => console.error('connection error:'))
        mongoose.connection.once('open', () => console.log('database connected'))
    }

    handleRoutes() {
        this.express.get('/', (req, res) => {
            res.send('oi alan gay')
        })
        this.express.use(routes);
    }

    handleDatabaseChanges () {
        // console.log({ changes });
        // monitorAllEventEmitter(changes)
    }
}

module.exports = new App();