const jwt = require('jsonwebtoken')
const authConfig = require('../config/auth.json')

const util = require('util')

class AuthAsync {
    async getAuthUser (authorization) {
        let auth = null;
      
        if(!authorization) return null;
      
        const parts = authorization.split(' ');
      
        if(parts.length !== 2) return null;
      
        const [scheme, token] = parts
      
        if(!/^Bearer$/i.test(scheme)) return null;
      
        jwt.verify(token, authConfig.secret, (err, decoded) => {
          if(err) return null;
          auth = decoded?.id 
          return auth
        })
      
        return auth
      }

    async authVerify (authorization, callback) {
        let user = null
        
        if(!authorization) { throw new Error('No token provider') }
      
        const parts = authorization.split(' ')
      
        if(parts.length !== 2) { throw new Error('Token error') }
      
        const [scheme, token] = parts
      
        if(!/^Bearer$/i.test(scheme)) { throw new Error('Token malformatted') }
      
        jwt.verify(token, authConfig.secret, (err, decoded) => {
          if(err) { throw new Error('Token invalid') }
          user = decoded?.id 
          return false
        })
      
        if (util.types.isAsyncFunction(callback)) {
          return await callback(user)
        }
      
        return callback(user)
    }
}

module.exports = new AuthAsync();