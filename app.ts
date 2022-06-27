import 'dotenv/config'
import express, { Express, NextFunction, Request, Response } from 'express';
import http, { Server } from 'http';
require('express-async-errors')
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';
import routes from './modules/routes';
import { monitorAllEventEmitter } from './components/monitorEventEmitter';
import changes from './modules/changes';


class App {
    express: Express;
    server: Server;
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
        this.express.use(express.json());
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(morgan('dev'))
        this.express.use(cors());
    }

    handleErrorMiddlewares () {
        this.express.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            const error = { message: err.message }
            if (err instanceof Error) { return res.status(400).json(error) } 
            return res.status(500).json(error)
        })
    }
    handleDatabase() {
        mongoose.connect(process.env.MONGODB_URI as string, {
            authSource: 'admin',
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        })
        mongoose.connection.on('error', () => console.error('connection error:'))
        mongoose.connection.once('open', () => console.log('database connected'))
    }

    handleRoutes() {
        this.express.get('/', (req, res) => {
            res.send('HELLO WORLD')
        })
        this.express.use(routes);
    }

    handleDatabaseChanges () {
        // console.log({ changes });
        // monitorAllEventEmitter(changes)
    }
}

export default new App();