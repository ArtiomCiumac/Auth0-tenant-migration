function getByEmail(name, callback) {
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
            body:
            {
                client_id: configuration.client_id,
                client_secret: configuration.client_secret,
                audience: configuration.domain + '/api/v2/',
                grant_type: 'client_credentials'
            },
            json: true
        };
    }

    function getUsersRequestOptions(token) {
        return {
            method: 'GET',
            url: configuration.domain + '/api/v2/users',
            headers: {
                'content-type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            qs: {
                q: 'email:"' + name + '"',
                page: 0,
                per_page: 1
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

    // actual execution flow

    rp(getTokenRequestOptions())
        .then(res => {
            const accessToken = res.access_token;

            return Promise.resolve(jwt.decode(accessToken, { complete: true }))
                .then(t => validateTokenHeader(t))
                .then(t => getSigningKey(t.header.kid))
                .then(k => jwt.verify(accessToken, k, { algorithms: ['RS256'] }))
                .then(() => accessToken);
        })
        .then(accessToken => rp(getUsersRequestOptions(accessToken)))
        .then(res => {
            if (!res || !res.length || res.length === 0) throw new Error("No user found");

            var profile = res[0];

            callback(null, profile);
        })
        .catch(err => callback(new Error(err)));
}
