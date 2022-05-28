const userChanges = {
    User: {
        signature: {
            pipeline: [{ $match: { 'fullDocument.verified': false }  }], 
            async insert (next) {
                console.log('signature');
                console.log({ next });
                console.log('insert in event emiter', next.documentKey._id);
            },
            async replace () {
                
            },
            async delete (next) {
                console.log('signature');
                console.log({ next });
                console.log('delete in event emiter', next.documentKey._id);
            },
        },
        friendsByWhatsapp: { 
            pipeline: [{ $match: { 'fullDocument.verified': true }  }], 
            async insert (next) {
                console.log('friendsByWhatsapp');
                console.log({ next });
                console.log('friendsByWhatsapp insert in event emiter', next.documentKey._id);
            },
            async replace () {
                
            },
            async delete (next) {
                console.log('friendsByWhatsapp');
                console.log({ next });
                console.log('friendsByWhatsapp delete in event emiter', next.documentKey._id);
            },
        },
        friendsByTelegram: { 
            pipeline: [], 
            async insert (next) {
                console.log('friendsByTelegram');
                console.log({ next });
                console.log('friendsByTelegram insert in event emiter', next.documentKey._id);
            },
            async replace () {
                
            },
            async delete (next) {
                console.log('friendsByTelegram');
                console.log({ next });
                console.log('friendsByTelegram delete in event emiter', next.documentKey._id);
            },
        },
    }
};

module.exports = userChanges;