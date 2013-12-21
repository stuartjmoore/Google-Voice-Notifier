
/*
 *  You need to create aws.json
 *
 *  It will need values for your Amazon
 *  accessKeyId, secretAccessKey, & region.
 */

var aws = require('aws-sdk');
var sns;
var topicArn = '';

exports.init = function(topic_arn) {
    aws.config.loadFromPath('./aws.json');
    sns = new aws.SNS();
    topicArn = topic_arn;
}

/*
   Applies to single SMS messages, missed calls, and voicemails.
 */
exports.post = function(message, count) {
    var text = message.messageText ? message.messageText : message.message;
    var id = message.conversationId ? message.conversationId : message.id;
    
    console.log("Sending: " + id);
    console.log("Send notification: " + text);
    
    var json = {
        'default': 'default',
        'APNS': JSON.stringify({ 'aps': { 'badge': count, 'alert': text } }),
        'APNS_SANDBOX': JSON.stringify({ 'aps': { 'badge': count, 'alert': text } }),
        'GCM': JSON.stringify({ 'data': { 'message': text } })
    };
    
    var params = {
        TopicArn: topicArn,
        MessageStructure: "json",
        Message: JSON.stringify(json)
    };
    
    console.log("json: " + JSON.stringify(json));
    
    sns.publish(params, function(err, data) {
        if(err) {
            console.log("Error sending a message: ", err);
        } else {
            console.log("Sent message");
        }
    });
}

/* 
   Applies to full SMS conversations, missed calls, and voicemails.
 */
exports.remove = function(message, count) {
    var id = message.conversationId ? message.conversationId : message.id;
    
    console.log("Remove notification: " + id);
    
    var json = {
        'default': '',
        'APNS': JSON.stringify({ 'aps': { 'badge': count } }),
        'APNS_SANDBOX': JSON.stringify({ 'aps': { 'badge': count } }),
        'GCM': JSON.stringify({ 'data': {} })
    };
    
    var params = {
        TopicArn: topicArn,
        MessageStructure: "json",
        Message: JSON.stringify(json)
    };
    
    console.log("json: " + JSON.stringify(json));
    
    sns.publish(params, function(err, data) {
        if(err) {
            console.log("Error sending a message: ", err);
        } else {
            console.log("Sent message");
        }
    });
}
