function getByEmail(name, callback) {
    var request = require("request");

    var options = {
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

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        var token = body.access_token;

        // TODO: validate token

        var listOptions = {
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

        request(listOptions, function (error, response, body) {
            if (!body || !body.length || body.length === 0) throw new Error("No user found");

            var profile = body[0];
           
            callback(null, profile);
        });
    });
}
