const freepp = require('freepp-chatapi-nodejs-sdk');
const express = require('express');
const bodyParser = require('body-parser')
const async = require('async');
const rp = require('request-promise');

const MERC_HOST = process.env.MERC_HOST

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

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

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
        let options1 = {
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
                'Authorization': `Basic ${new Buffer(appId + ':' + appKey).toString('base64')}`
            },
            json: true
        };

        rp(options1)
            .then(function (body1) {
                // POST succeeded...
                console.log(body1)

                if (body1.token_type && body1.access_token) {
                    let options2 = {
                        method: 'GET',
                        uri: 'https://pro20.freepp.com/OAuthbot/v1/profile',
                        headers: {
                            'Authorization': `${body1.token_type} ${body1.access_token}`
                        },
                        json: true
                    };
            
                    rp(options2)
                        .then(function (body2) {
                            // POST succeeded...
                            console.log(body2)
                            return res.status(200).send(`Got pid = ${body2.pid}, name = ${body2.name}`);
                        })
                        .catch(function (err) {
                            // POST failed...
                            return res.status(500).end();
                        });
                } else {
                    return res.status(500).end();
                }

            })
            .catch(function (err) {
                // POST failed...
                console.error(err)
                return res.status(500).end();
            });
    }
});

app.get('/login', (req, res) => {
    res.render('pages/login', { pid : "6bb1535b-6fc9-42da-85c9-41f0aca90e34"});
});

app.post('/login', (req, res) => {
    if (!req.body.username) {
        res.render('pages/error');
    }
    if (!req.body.password) {
        res.render('pages/error');
    }
    if (!req.body.pid) {
        res.render('pages/error');
    }

    let options1 = {
        method: 'POST',
        uri: MERC_HOST + '/am-svc/login/gemtek',
        body: {
            acc : req.body.username,
            pwd : req.body.password,
            type : 0
        },
        headers: {
            'Content-Type': 'application/json'
        },
        json: true
    };

    rp(options1)
        .then(function (body1) {
            // POST succeeded...
            if ("000" === body1.responseCode && body1.authToken) {
                let options2 = {
                    method: 'POST',
                    uri: MERC_HOST + '/alt-svc/notifyUpdate',
                    body: {
                        token : body1.authToken,
                        notify : [
                            {
                                type : "FREEPP",
                                token : req.body.pid
                            }
                        ]
                    },
                    json: true
                };
        
                rp(options2)
                    .then(function (body2) {
                        // POST succeeded...
                        console.log(body2)
                        if ("000" === body2.responseCode) {
                            res.render('pages/success');
                            res.end();
                        } else {
                            res.render('pages/error');
                            res.end();
                        }
                    })
                    .catch(function (err) {
                        // POST failed...
                        res.render('pages/error');
                        res.end();
                    });
            } else {
                res.render('pages/error');
                res.end();
            }
            
        })
        .catch(function (err) {
            // POST failed...
            console.error(err)
            res.render('pages/error');
            res.end();
        });
});

app.get('/linking', (req, res) => {
    res.render('pages/error');
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