// SEE: http://developer.chrome.com/extensions/tut_oauth.html
var appKey = 'f29cb82a057935a1d481e3ea69e6ff74';
var appSecret = 'efe366361c4d944f012c7bd4946326d4bb868fba7acdde8e0129842d61b4586a';

var oauth = ChromeExOAuth.initBackgroundPage({
  'request_url': 'https://trello.com/1/OAuthGetRequestToken',
  'authorize_url': 'https://trello.com/1/OAuthAuthorizeToken',
  'access_url': 'https://trello.com/1/OAuthGetAccessToken',
  'consumer_key': appKey,
  'consumer_secret': appSecret,
  //'scope': '',//<scope of data access, not used by all OAuth providers>,
  'app_name': 'Shello'
});


oauth.authorize(function() {
  // ... Ready to fetch private data ...
  var test = 'blah';
});

function callback(resp, xhr) {
  // ... Process text response ...
};

function onAuthorized() {
  var url = 'https://docs.google.com/feeds/default/private/full';
  var request = {
    'method': 'GET',
    'parameters': {'alt': 'json'}
  };

  // Send: GET https://docs.google.com/feeds/default/private/full?alt=json
  oauth.sendSignedRequest(url, callback, request);
};

oauth.authorize(onAuthorized);