function login(email, password, callback) {

    // dependencies

    const Promise = require('bluebird@3.5.0');
    const rp = require('request-promise@1.0.2');
    const jwt = require('jsonwebtoken@7.1.9');
    const jwks = require('jwks-rsa@1.1.1');

    const jwksClient = jwks({
        cache: true,
        jwksUri: configuration.domain + '/.well-known/jwks.json'
    });

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

    function getClientCredentialsRequestOptions() {
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

    function getUserProfileRequestOptions(userId, token) {
        return {
            method: 'GET',
            url: configuration.domain + '/api/v2/users/' + userId,
            headers: {
                'content-type': 'application/json',
                Authorization: 'Bearer ' + token
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
            jwksClient.getSigningKey(keyId, function (err, key) {
                if (err) return reject(err);
                return resolve(key.publicKey || key.rsaPublicKey);
            });
        });
    }

    function decodeAndVerifyToken(token) {
        return Promise.resolve(jwt.decode(token, { complete: true }))
            .then(t => validateTokenHeader(t))
            .then(t => getSigningKey(t.header.kid))
            .then(k => jwt.verify(token, k, { algorithms: ['RS256'] }));
    }

    function patchUserId(profile) {
        if (profile && profile.user_id) {
            profile.user_id = profile.user_id.replace(/^auth0\|/i, "");
        }

        return profile;
    }

    // actual execution flow

    rp(getTokenRequestOptions())
        .then(res => decodeAndVerifyToken(res.id_token))
        .then(p => p.sub)
        .then(id => {
            return rp(getClientCredentialsRequestOptions())
                .then(res => {
                    const accessToken = res.access_token;

                    return decodeAndVerifyToken(accessToken)
                        .then(() => accessToken);
                })
                .then(accessToken => rp(getUserProfileRequestOptions(id, accessToken)));
        })
        .then(p => patchUserId(p))
        .then(p => callback(null, p))
        .catch(err => callback(new Error(err)));
}
