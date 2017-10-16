function getByEmail(name, callback) {
    // dependencies

    const rp = require('request-promise@1.0.2');

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

    // actual execution flow

    rp(getTokenRequestOptions())
        .then(res => rp(getUsersRequestOptions(res.access_token)))
        .then(res => {
            if (!res || !res.length ||
                res.length === 0 || res[0].email !== name) {
                throw new Error("No user found");
            }

            var profile = res[0];

            callback(null, profile);
        })
        .catch(err => callback(new Error(err)));
}
