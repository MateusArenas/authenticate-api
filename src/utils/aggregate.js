const mongoose = require('mongoose')

class Aggregate {

    match (match={}) {
        return Object.keys(match).map(key => {
            const value = match[key];
    
            if (Array.isArray(value)) {
                const especial = value;
                return ({ [key]: especial.map(this.match) })
            }
    
            if (mongoose.isValidObjectId(value)) {
                return ({ [key]: mongoose.Types.ObjectId(value) })
            }
    
            return ({ [key]: value })
        }).reduce((acc, item) => ({ ...acc, ...item }), {})
    }
    
}

module.exports = new Aggregate();