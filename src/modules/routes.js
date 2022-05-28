const path = require('path')
const { Router } = require('express')

const routes = Router()

const folder = "../routers";
require("fs").readdirSync(path.join(__dirname, folder)).forEach((file) => {
    const controller = require(path.join(__dirname, folder, file));

    Object.keys(controller).forEach(type => { 
        const method = type.toLowerCase();

        function deepCombine (controller, complexPath) {
            Object.keys(controller).forEach(path => {
                if (typeof controller[path] === 'object') {
                    deepCombine(controller[path], complexPath+path)
                } else {
                    routes[method](complexPath+path, controller[path])
                }
            })
        }

        deepCombine(controller[type], '')
    })
});

module.exports = routes