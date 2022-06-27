import mongoose from "mongoose";
import { getAuthUser } from "../middlewares/auth";
import User from "../schemas/User";
import aggregate from '../utils/aggregate';

interface QueryParams {
    match: any
    options: any
}

class UserService {

    async index ({ match, options }: QueryParams, authorization?: string) {
        const auth = await getAuthUser(authorization)
        try {
            const [users] = await User.aggregate([
                { $match: aggregate.match(match) },
                {
                    $addFields: {
                        self: { $cond: [{ $eq: ["$_id", new mongoose.Types.ObjectId(auth || undefined)] }, true, false] } as any,
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
        } catch (err) { throw new Error('Error for index users ' + (err as Error)?.message) }
    }

    async search ({ match, options }: QueryParams, authorization?: string) {
        const auth = await getAuthUser(authorization)
        try {

            const [user] = await User.aggregate([
                { $match: aggregate.match(match) },
                {
                    $addFields: {
                        self: { $cond: [{ $eq: ["$_id", new mongoose.Types.ObjectId(auth || undefined)] }, true, false] } as any
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
        } catch (err) { throw new Error('Error for search user ' + (err as Error)?.message) }
    }
}

export default new UserService()