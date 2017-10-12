function login(email, password, callback) {

    // dependencies

    const Promise = require('bluebird@3.5.0');
    const rp = require('request-promise@1.0.2');
    const jwt = require('jsonwebtoken@7.1.9');
    const jwks = require('jwks-rsa@1.1.1');

    // helpers

    function getTokenRequestOptions() {
        return {
            method: 'POST',
            url: configuration.domain + '/oauth/token',
            headers: { 'content-type': 'application/json' },
            body: {
                grant_type: 'password',
                username: email,
                password: password,
                scope: 'openid',
                client_id: configuration.client_id,
                client_secret: configuration.client_secret
            },
            json: true
        };
    }

    function validateTokenHeader(token) {
        if (!token || !token.header ||
            token.header.typ !== 'JWT' || token.header.alg !== 'RS256') {
            throw new Error('Security error - invalid token');
        }

        return token;
    }

    function getSigningKey(keyId) {
        return new Promise((resolve, reject) => {
            const jwksClient = jwks({
                jwksUri: configuration.domain + '/.well-known/jwks.json'
            });

            jwksClient.getSigningKey(keyId, function (err, key) {
                if (err) return reject(err);
                return resolve(key.publicKey || key.rsaPublicKey);
            });
        })
    }

    function fixUserId(userId) {
        return userId.replace(/^auth0\|/i, "");
    }

    // actual execution flow

    rp(getTokenRequestOptions())
        .then(res => {
            const idToken = res.id_token;

            return Promise.resolve(jwt.decode(idToken, { complete: true }))
                .then(t => validateTokenHeader(t))
                .then(t => getSigningKey(t.header.kid))
                .then(k => jwt.verify(idToken, k, { algorithms: ['RS256'] }));
        })
        .then(p => callback(null, {
            id: fixUserId(p.sub),
            email: p.email,
            nickname: p.nickname
        }))
        .catch(err => callback(new Error(err)));
}