import jwt from 'jsonwebtoken';

import util from 'util';

type CallbackReturn = ((user: string) => any) | ((user: string) => Promise<any>)

export async function getAuthUser (authorization?: string): Promise<string | null> {
    let auth: string | null = null;
  
    if(!authorization) return null;
  
    const parts = authorization.split(' ');
  
    if(parts.length !== 2) return null;
  
    const [scheme, token] = parts
  
    if(!/^Bearer$/i.test(scheme)) return null;
  
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if(err) return null;
      if (typeof decoded !== 'string') {
        auth = decoded?.id 
      }
      return auth
    })
  
    return auth
  }


export async function authVerify (authorization?: string, callback?: CallbackReturn): Promise<any> {
    let user: string | null = null
    
    if(!authorization) { throw new Error('No token provider') }
  
    const parts = authorization.split(' ')
  
    if(parts.length !== 2) { throw new Error('Token error') }
  
    const [scheme, token] = parts
  
    if(!/^Bearer$/i.test(scheme)) { throw new Error('Token malformatted') }
  
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if(err) { throw new Error('Token invalid') }
      if (typeof decoded !== 'string') {
        user = decoded?.id 
      }
      return false
    })


    if (!user) { throw new Error('Not have id in user is null.') }

    if (callback) {
      if (util.types.isAsyncFunction(callback)) {
        return await callback(user)
      }
    
      return callback(user)

    } else  { throw new Error('Obragtory pass callback function') }
  
}
