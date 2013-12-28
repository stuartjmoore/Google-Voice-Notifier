
var https = require('https');
var notification = require('./notification.js');

var URL_UNREAD = 'unread/';
var URL_INBOX = 'messages/?page=';
var SMS_RECEIVED = 10;
var SMS_SENT = 11;

/*
 *  The farthest down we need to read.
 *
 *  Applies to the entire inbox and has dates
 *  for each unread SMS conversation.
 */
var lastStartTime = { 'inbox': NaN, 'SMS': {} };

/*
 *  A list of conversations marked as unread since
 *  the last time we read the inbox.
 *
 *  Only full conversations, not each SMS message.
 */
var lastUnread = [];

/*
 *  The numbers of unread conversations since last update.
 */
var lastCounts = { 'inbox': 0, 'sms': 0, 'missed': 0, 'voicemail': 0 };

exports.start = function(auth, topic_arn) {
    notification.init(topic_arn);
    fetch(auth, URL_UNREAD);
}

function fetch(auth, checkURL, pageNum) {
    console.log("FILE: " + new Date() + " fetch: " + checkURL + pageNum);
    
    var options = {
        host: 'www.google.com',
        port: 443,
        path: '/voice/b/0/request/' + checkURL + pageNum,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Authorization': 'GoogleLogin ' + auth,
        }
    };
            
    var request = https.request(options, function(response) {
        if(response.statusCode != 200) {
            console.error("FILE: Unread status error");
            return;
        }

        var data = '';
        response.on('data', function(chunk) { data += chunk; });

        response.on('end', function() {
            try {
                var jsonData = JSON.parse(data);
                var currCounts = jsonData['unreadCounts'];
                    
                var isInbox = checkURL.slice(0, URL_INBOX.length) == URL_INBOX;
                var pagingNeeded = false;
                      
                if(isInbox)
                    pagingNeeded = parseInbox(jsonData);
                    
                var delay = 1000;
                var page = pageNum;
                var url = URL_UNREAD;
                      
                if(!isInbox && (currCounts['inbox'] != lastCounts['inbox'] || currCounts['sms'] != 0)) {
                    delay = 0;
                    page = 1;
                    url = URL_INBOX;
                } else if(isInbox && pagingNeeded) {
                    delay = 0;
                    page += 1;
                    url = URL_INBOX;
                } else if(isInbox && currCounts['sms'] != 0) {
                    /*
                     *  We need to update via the inbox because
                     *  URL_UNREAD doesn't give us counts _inside_
                     *  of SMS conversations.
                     */
                    delay = 1000;
                    page = 1;
                    url = URL_INBOX;
                } else {
                    delay = 1000;
                    page = '';
                    url = URL_UNREAD;
                }
                
                lastCounts['sms'] = currCounts['sms'];
                lastCounts['missed'] = currCounts['missed'];
                lastCounts['voicemail'] = currCounts['voicemail'];
                lastCounts['inbox'] = currCounts['inbox'];
                
                setTimeout(fetch, delay, auth, url, page);
            } catch(exception) {
                console.error("FILE: Parsing error:", exception);
                return;
            }
        })
    });
    
    request.on('error', function(error) {
        console.error("FILE: problem with request: " + error.message);
        return;
    });
    
    request.end();
}

function parseInbox(inbox) {
    console.log("FILE: parse inbox");
    
    var messageList = inbox.messageList;
    var newUnread = [];
    var pagingNeeded = false;
    
    for(var i = 0; i < messageList.length; i++) {
        var message = messageList[i];
        var startTime = parseInt(message.startTime);
        
        if(lastStartTime.inbox >= startTime)
            break;
        
        if(!message.isRead && (message.type == SMS_RECEIVED || message.type == SMS_SENT)) {
            for(var j = (message.children.length-1); j >= 0; j--) {
                var sms = message.children[j];
                
                if(lastStartTime.SMS[message.id] >= parseInt(sms.startTime))
                    break;
                
                if(sms.type == SMS_RECEIVED && !sms.isRead) {
                    if(newUnread.indexOf(message.id) == -1 && lastUnread.indexOf(message.id) == -1)
                        newUnread.push(message.id);
                    
                    var phoneNumber = sms.phoneNumber;
                    var name = inbox['contacts']['contactPhoneMap'][phoneNumber]['name'];
                    sms.fromName = name;
                    
                    lastStartTime.SMS[message.id] = startTime;
                    notification.post(sms, inbox['unreadCounts']['inbox']);
                } else
                    break;
            }
        } else if(!message.isRead && lastUnread.indexOf(message.id) == -1) {
            if(newUnread.indexOf(message.id) == -1 && lastUnread.indexOf(message.id) == -1)
                newUnread.push(message.id);
            
            notification.post(message.children[0], inbox['unreadCounts']['inbox']);
        }
        
        if(inbox.resultsPerPage == (i+1) && (!lastStartTime.inbox || lastStartTime.inbox < startTime)) {
            pagingNeeded = true;
        }
    }
    
    if(messageList.length > 0 && !pagingNeeded)
        lastStartTime.inbox = parseInt(messageList[0].startTime);
    
    var messageMap = inbox.messageMap;
    var tempUnread = [];
    
    for(var k = 0; k < lastUnread.length; k++) {
        var unreadId = lastUnread[k];
        var message = messageMap[unreadId];
        
        // TODO: Detect if pagingNeeded.
        // If not every lastUnread key matches in messageMap, pagingNeed.
        
        if(message && message.isRead) {
            notification.remove(message, inbox['unreadCounts']['inbox']);
            if(message.type == SMS_RECEIVED || message.type == SMS_SENT)
                delete lastStartTime.SMS[message.id];
        } else if(message) {
            tempUnread.push(unreadId);
        }
    }
    
    lastUnread = newUnread.concat(tempUnread);
    
    return pagingNeeded;
}
