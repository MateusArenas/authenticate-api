import mongoose from 'mongoose';

class Aggregate {

    match (match:any={}): any {
        return Object.keys(match).map(key => {
            const value = match[key];
    
            if (Array.isArray(value)) {
                const especial = value;
                return ({ [key]: especial.map(this.match) })
            }
    
            if (mongoose.isValidObjectId(value)) {
                return ({ [key]: new mongoose.Types.ObjectId(value) })
            }
    
            return ({ [key]: value })
        }).reduce((acc, item) => ({ ...acc, ...item }), {})
    }
    
}

export default new Aggregate();