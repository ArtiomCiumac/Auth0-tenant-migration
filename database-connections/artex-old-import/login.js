function login(email, password, callback) {
    var request = require('request');
    var jwt = require('jsonwebtoken@7.1.9');
    var jwks = require('jwks-rsa@1.1.1');

    var options = {
        method: 'POST',
        url: configuration.domain + '/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
            grant_type: 'password',
            username: email,
            password: password,
            scope: 'openid profile email address phone',
            client_id: configuration.client_id,
            client_secret: configuration.client_secret
        },
        json: true
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        var token = null;
        try {
            token = jwt.decode(body.id_token, { complete: true });
        } catch (verificationError) {
            callback(verificationError);
            return;
        }

        if (!token || !token.header ||
            token.header.typ !== 'JWT' || token.header.alg !== 'RS256') {
            throw new Error('Security error - invalid token');
        }

        var jwksClient = jwks({
            jwksUri: configuration.domain + '/.well-known/jwks.json'
        });

        jwksClient.getSigningKey(token.header.kid, function (err, key) {
            var signingKey = key.publicKey || key.rsaPublicKey;

            try {
                jwt.verify(body.id_token, signingKey, { algorithms: ['RS256'] });
            } catch (verificationError) {
                throw new Error(verificationError);
            }

            var payload = token.payload;

            callback(null, {
                id: payload.sub,
                email: payload.email,
                nickname: payload.nickname
            });
        });
    });
}