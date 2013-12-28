
/*
 *  You need to create aws.json
 *
 *  It will need values for your Amazon
 *  accessKeyId, secretAccessKey, & region.
 */

var MISSED_CALL = 0;
var VOICEMAIL = 2;
var SMS_RECEIVED = 10;
var SMS_SENT = 11;

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
    var id = message.conversationId ? message.conversationId : message.id;
    var name = message.fromName;
    var firstName = name.substr(0, name.indexOf(" "));
    var text = message.messageText ? message.messageText : message.message;
    var startTime = message.startTime;
    var type = message.type;
    
    var displayText;
    
    if(type == MISSED_CALL)
        displayText =  firstName + ", Missed Call.";
    else if(type == VOICEMAIL)
        displayText = firstName + ", Voicemail: " + text;
    else if(type == SMS_RECEIVED)
        displayText = firstName + ": " + text;
    
    var json = {
        'default': 'default',
        'APNS': JSON.stringify({
                               'aps': {
                                   'badge': count,
                                   'alert': displayText,
                                   'content-available': 1
                               },
                               'conversation_id': id
                           }),
        'APNS_SANDBOX': JSON.stringify({
                                       'aps': {
                                           'badge': count,
                                           'alert': displayText,
                                           'content-available': 1
                                       },
                                       'conversation_id': id
                                   }),
        'GCM': JSON.stringify({
                              'data': {
                                  'message': text,
                                  'name': name,
                                  'type': type.toString(),
                                  'date': startTime,
                                  'conversation_id': id,
                                  'count': count.toString()
                              },
                              'collapse_key': id,
                              'delay_while_idle': false,
                              'time_to_live': 86400 // 24 hours
                          })
    };
    
    var params = {
        TopicArn: topicArn,
        MessageStructure: "json",
        Message: JSON.stringify(json)
    };
    
    console.log("Send notification: " + JSON.stringify(json) + "\n");
    
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
        'APNS': JSON.stringify({
                               'aps': {
                                   'badge': count,
                                   'content-available': 1
                               },
                               'conversation_id': id
                           }),
        'APNS_SANDBOX': JSON.stringify({
                                       'aps': {
                                           'badge': count,
                                           'content-available': 1
                                       },
                                       'conversation_id': id
                                   }),
        'GCM': JSON.stringify({
                              'data': {
                                  'conversation_id': id,
                                  'count': count.toString()
                              },
                              'collapse_key': id,
                              'delay_while_idle': false,
                              'time_to_live': 86400 // 24 hours
                          })
    };
    
    var params = {
        TopicArn: topicArn,
        MessageStructure: "json",
        Message: JSON.stringify(json)
    };
    
    sns.publish(params, function(err, data) {
        if(err) {
            console.log("Error sending a message: ", err);
        } else {
            console.log("Sent message");
        }
    });
}

/*
 Just in case the server has an exception.
 */
exports.error = function(error) {
    
    var apns_json = JSON.stringify({
        'aps': {
            'alert': "Error:" + error.message
        }
    });
    
    var gcm_json = JSON.stringify({
        'data': {
            'message': "Error:" + error.message
        },
        'collapse_key': '-1',
        'delay_while_idle': false,
        'time_to_live': 86400 // 24 hours
    });
    
    var json = {
        'default': "Error:" + error.message,
        'APNS': apns_json,
        'APNS_SANDBOX': apns_json,
        'GCM': gcm_json
    };
    
    var params = {
        TopicArn: topicArn,
        MessageStructure: "json",
        Message: JSON.stringify(json)
    };
    
    sns.publish(params, function(err, data) {
        if(err) {
            console.log("Error sending a message: ", err);
        } else {
            console.log("Sent message");
        }
    });
}
