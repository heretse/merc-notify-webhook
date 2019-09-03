const freepp = require('freepp-chatapi-nodejs-sdk');
const express = require('express');
const async = require('async');

const config = {
    accessToken: 'QQUnatOESm2XgCTPNKIscTcHBA8P9VLX83bXDPYE',
    appKey: 'KKVkmyFIEITmrauQMKGDTJhplmhBAImujuwZGXqQ',
};

// create FreePP SDK client
const client = freepp.Client(config);
freepp.middleware(config);

const app = express();

app.get('/', (req, res) => {
    res.status(200).send(`Now = ${(new Date()).getTime()}`)
});

app.post('/webhook', freepp.middleware(config), (req, res) => {
    console.log('Got message', req.body, req.headers);
    async.map(req.body.events, (event, cb) => {
        handleEvent(event, cb);
    }, (err, result) => {
        if (err) {
            return res.status(500).end();
        }
        res.end();
    })
});

// simple reply text function
const replyText = (token, texts, cb) => {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
        token,
        texts.map((text) => ({ type: 'Text', value: text })),
        cb
    );
};

function handleEvent(event, cb) {
    if (event.type !== 'Message' || event.message.type !== 'Text') {
        return cb(null);
    }
    return replyText(event.replyToken, event.message.value, cb);
}

console.log(`Listening on ${process.env.PORT}`);
app.listen(process.env.PORT || 3000);