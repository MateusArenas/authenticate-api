import path from 'path';
import { Router } from 'express';

const routes = Router()

type methodType = 'get' | 'post' | 'put' | 'delete'

const folders = ["../routers", "../hooks"];
folders.forEach(folder => {
    require("fs").readdirSync(path.join(__dirname, folder)).forEach((file: string) => {
        const controller = require(path.join(__dirname, folder, file));
    
        Object.keys(controller).forEach(type => { 
            const method = type.toLowerCase() as methodType;
    
            function deepCombine (controller: any, complexPath: string) {
                Object.keys(controller).forEach(path => {
                    if (typeof controller[path] === 'object') {
                        deepCombine(controller[path], complexPath+path)
                    } else {
                        console.log(complexPath+path);
                        if (Array.isArray(controller[path])) { // this passe args, midllewares
                            routes[method](complexPath+path, ...controller[path])
                        } else {
                            routes[method](complexPath+path, controller[path])
                        }
                    }
                })
            }
    
            if (['get', 'post', 'put', 'delete'].includes(method)) {
                deepCombine(controller[type], '')
            }
        })
    }) 
});

export default routes