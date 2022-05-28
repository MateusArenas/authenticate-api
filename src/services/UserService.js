const mongoose = require("mongoose");
const AuthAsync = require("../middlewares/auth");
const User = require("../schemas/User");
const aggregate = require('../utils/aggregate')

class UserService {

    async index ({ match, options }, authorization) {
        const auth = await AuthAsync.getAuthUser(authorization)
        try {
            const [users] = await User.aggregate([
                { $match: aggregate.match(match) },
                {
                    $addFields: {
                        self: { $cond: [{ $eq: ["$_id", new mongoose.Types.ObjectId(auth)] }, true, false] },
                    }
                },
                {   
                    $facet: {
                        results: [],
                        total: [{ $count: 'count' }]
                    }
                },
                { 
                    $project: { 
                        results: '$results', 
                        total: { $arrayElemAt: ['$total.count', 0] } 
                    } 
                },  
            ])
        
            const results = await User.populate(users?.results, [
                { path: 'conversations', model: 'Conversation'  },
            ])

            return ({ ...users, results  })
        } catch (err) { throw new Error('Error for index users ' + err?.message) }
    }

    async search ({ match, options }, authorization) {
        const auth = await AuthAsync.getAuthUser(authorization)
        try {

            const [user] = await User.aggregate([
                { $match: aggregate.match(match) },
                {
                    $addFields: {
                        self: { $cond: [{ $eq: ["$_id", new mongoose.Types.ObjectId(auth)] }, true, false] },
                    }
                },
                {   
                    $facet: {
                        results: [],
                        total: [{ $count: 'count' }]
                    }
                },
                { 
                    $project: { 
                        results: '$results', 
                        total: { $arrayElemAt: ['$total.count', 0] } 
                    } 
                },  
                { $unwind: "$results" }, { $unwind: "$total" },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [ "$results", { total: "$total.count" } ]
                        }
                    }
                },
            ])

            const result = await User.populate(user, [
                { path: 'conversations', model: 'Conversation'  },
            ])

            return result
        } catch (err) { throw new Error('Error for search user ' + err?.message) }
    }
}

module.exports = new UserService()