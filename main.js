#!/bin/env node

var http = require('http');
var url = require('url');

var auth = require('./auth.js');
var inbox = require('./inbox.js');

var ipaddr = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

http.createServer(function(request, response) {
    if(url.parse(request.url).pathname == '/favicon.ico') {
        response.writeHead(204);
        response.end();
        return;
    }

    if(url.parse(request.url).pathname == '/update')
    {              
        var key = url.parse(request.url, true).query['key'];
        var username = auth.decrypt('crypted_username', key);
        var password = auth.decrypt('crypted_password', key);
        
        auth.login(username, password, function(auth, topic_arn) {
            response.write(JSON.stringify({ 'success' : true }));
            response.end();
            inbox.start(auth, topic_arn);
        });
    }
    // else if(url.parse(request.url).pathname == '/count')
        // return inbox count
    else
    {
        response.write(JSON.stringify({ 'success' : false, 'error' : "Invalid path" }));
        response.end();
    }
}).listen(port, ipaddr);
