const freepp = require('freepp-chatapi-nodejs-sdk');
const express = require('express');
const async = require('async');
const rp = require('request-promise');

const appId = '72c55427-eb97-44a0-9d9c-124467230e5d';
const appKey = 'KKVkmyFIEITmrauQMKGDTJhplmhBAImujuwZGXqQ';

const agentId = 'dc78cf54-c57d-42c4-97b3-716e992079fa';
const domainId = 'c21f969b-5f03-433d-95e0-4f8f136e7682';

const config = {
    accessToken: 'QQUnatOESm2XgCTPNKIscTcHBA8P9VLX83bXDPYE',
    appKey: appKey,
};

// create FreePP SDK client
const client = freepp.Client(config);
freepp.middleware(config);

const app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    // res.status(200).send(`Now = ${(new Date()).getTime()}`);
    res.render('pages/index');
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

app.get('/callback', (req, res) => {
    if (req.query.errorCode) {
        res.status(500).json(`Got error code = ${req.query.errorCode}, message = ${req.query.errorMsg}`);
    } else {
        let options = {
            method: 'POST',
            uri: 'https://pro20.freepp.com/provider/token',
            body: {
                domain_id: domainId,
                client_id: agentId,
                agent_id: appId,
                grant_type: "authorization_code",
	            redirect_uri: "https://merc-notify-webhook.herokuapp.com/callback",
	            code: req.query.code
            },
            headers: {
                'Content-Type': 'application/json',
                'Authentication': `Basic ${new Buffer(appId + ':' + appKey).toString('base64')}`
            },
            json: true
        };

        rp(options)
            .then(function (body) {
                // POST succeeded...
                console.log(body)
                res.status(200).json(`Got code = ${req.query.code}`);
            })
            .catch(function (err) {
                // POST failed...
                console.error(err)
                return res.status(500).end();
            });
    }
});

app.post('/callback', (req, res) => {
    if (req.body.token_type && req.body.access_token) {
        let options = {
            method: 'GET',
            uri: 'https://pro20.freepp.com/OAuthbot/v1/profile',
            headers: {
                'Authentication': `${req.body.token_type} ${req.body.access_token}`
            },
            json: true
        };

        rp(options)
            .then(function (body) {
                // POST succeeded...
                console.log(`Got pid = ${body.pid}, name = ${body.name}`)
                return res.status(200).end();
            })
            .catch(function (err) {
                // POST failed...
                return res.status(500).end();
            });
    } else {
        return res.status(500).end();
    }
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
    if (event.message.value.indexOf('http://') >= 0) {
        return cb(null);
    }
    if (event.message.value.indexOf('https://') >= 0) {
        return cb(null);
    }
    return replyText(event.replyToken, event.message.value, cb);
}

console.log(`Listening on ${process.env.PORT || 3000}`);
app.listen(process.env.PORT || 3000);