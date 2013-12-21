
var https = require('https');
var crypto = require('crypto');

/*
 *  You need to create creds.json
 *
 *  It will need values for crypted_username, crypted_password,
 *  and Amazon SNS's topic_arn.
 */
var creds = require('./creds.json');

var auth = '';
var rnr_se = '';

/*
 *  Not used in the current code, but it will encrypt
 *  your login information for creds.json.
 */
exports.encrypt = function(plaintext, key) {
    var cipher = crypto.createCipher('aes-256-cbc', key);
    var crypted = cipher.update(plaintext,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}

exports.decrypt = function(value, key) {
    var decipher = crypto.createDecipher('aes-256-cbc', key);
    var password = decipher.update(creds[value], 'hex', 'utf8');
    password += decipher.final('utf8');
    return password;
}

exports.login = function(username, password, success) {
    var data = 'service=grandcentral&Email=' + username + '&Passwd=' + password + '&accountType=GOOGLE&source=gcvd';
    var options = {
        method: 'POST',
        host: 'www.google.com',
        port: 443,
        path: '/accounts/ClientLogin',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Authorization': 'GoogleLogin ',
            'Content-Length': data.length,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    
    var request = https.request(options, function(response) {
        if(response.statusCode != 200) {
            console.error("FILE: Auth status error");
            auth = '';
            return;
        }
        
        var data = '';
        response.on('data', function(chunk) { data += chunk; });

        response.on('end',function() {
            var index = data.lastIndexOf('\nAuth=');
            auth = data.substring(index).trim();
            
            if(index == -1 || auth == 'Error=BadAuthentication') {
                console.error("FILE: Bad Authentication");
                auth = '';
                return;
            }
            
            console.log("FILE: Logged in!");
            success(auth, creds.topic_arn);
        })
    });
    
    request.on('error', function(error) {
        console.error("FILE: problem with request: " + error.message);
        auth = '';
        return;
    });
    
    request.write(data);
    request.end();
}
