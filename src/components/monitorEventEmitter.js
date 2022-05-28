const mongoose = require('mongoose')

  function bindChanges (changes=[]) {
    if (changes.length > 0) {
        return Object.assign({}, ...changes)
    }
    return {}
  }
  
  async function monitorAllEventEmitter(changes) {
    const modelNames = Object.keys(changes)
    return await Promise.all(modelNames?.map(async modelName => {
        const methods = changes[modelName];
        const methodNames = Object.keys(changes[modelName])
  
        return await Promise.all(methodNames?.map(async methodName => {
            const { timeInMS, pipeline, ...callbacks } = methods[methodName]
  
            return await monitorEventEmitter(modelName, callbacks, timeInMS, pipeline);
        }))
    }))
  }
  
  async function monitorEventEmitter(modelName, callbacks, timeInMS = Infinity, pipeline = []) {
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
  
  function closeChangeStrem (timeInMS = Infinity, changeStream) {
    return new Promise((resolve) => {
      if (timeInMS !== Infinity) {
        setTimeout(() => {
          console.log('Closing the change stream');
          changeStream.close();
          resolve();
        }, timeInMS);
      } else { resolve() }
    })
  }
  

  module.exports = { bindChanges, monitorAllEventEmitter, monitorEventEmitter, closeChangeStrem }