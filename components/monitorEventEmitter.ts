import { ChangeStream, ChangeStreamDeleteDocument, ChangeStreamDocument, ChangeStreamInsertDocument, ChangeStreamReplaceDocument } from 'mongodb'
import mongoose from 'mongoose'

  export function bindChanges (changes=[]) : any {
    if (changes.length > 0) {
        return Object.assign({}, ...changes)
    }
    return {}
  }
  
  export async function monitorAllEventEmitter(changes: { [x: string]: {} }) {
    const modelNames = Object.keys(changes)
    return await Promise.all(modelNames?.map(async modelName => {
        const methods = changes[modelName] as any;
        const methodNames = Object.keys(changes[modelName])
  
        return await Promise.all(methodNames?.map(async methodName => {
            const { timeInMS, pipeline, ...callbacks } = methods[methodName]
  
            return await monitorEventEmitter(modelName, callbacks, timeInMS, pipeline);
        }))
    }))
  }
  
  export async function monitorEventEmitter(modelName: string, callbacks: { insert: (arg0: ChangeStreamInsertDocument<any>) => any; replace: (arg0: ChangeStreamReplaceDocument<any>) => any; delete: (arg0: ChangeStreamDeleteDocument<any>) => any }, timeInMS = Infinity, pipeline = []) {
    const changeStream = mongoose.model(modelName).watch(pipeline, { fullDocument: 'updateLookup' });
  
    changeStream.on('change', (next) => {
      switch (next.operationType) {
        case 'insert': //create
          callbacks?.insert && callbacks?.insert(next)
          break;
        case 'replace': //update
          callbacks?.replace && callbacks?.replace(next)
          break;
        case 'delete': //remove
          callbacks?.delete && callbacks?.delete(next)
          break;
        default:
          break;
      }
    });
    
    await closeChangeStrem(timeInMS, changeStream);
  }
  
  export function closeChangeStrem (timeInMS = Infinity, changeStream: ChangeStream<any, ChangeStreamDocument<any>>) {
    return new Promise<void>((resolve) => {
      if (timeInMS !== Infinity) {
        setTimeout(() => {
          console.log('Closing the change stream');
          changeStream.close();
          resolve();
        }, timeInMS);
      } else { resolve() }
    })
  }
  