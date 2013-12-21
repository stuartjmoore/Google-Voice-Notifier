# Google Voice Notifier

A node server to constantly check and parse your Google Voice inbox and send you useful notifications to your Android and iOS devices (via Amazon SNS).

It's in super alpha, so you'll have to set up your own server and hardcode in your encrypted username/password/tokens. OpenShift and Amazon SNS should work free of charge.

To start, run "node main.js" and call: 

http://localhost:8080/update?key=[your username/password encryption key]

That will launch an infinite loop checking your inbox every second.

The inbox parsing works well, but error handling and mainstream support are very far off. Feel free to fork and use for your own service.