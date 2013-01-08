// Copyright (c) 2012 Ed Shelley
// A Chrome extension to display information relevant
// to the currently open card on Trello.com

var oauth = chrome.extension.getBackgroundPage().oauth;

chrome.tabs.getSelected(null,function(tab) {
    var cardId = getIdFromCard(tab.url);
    switch(cardId)
    {
      case -1:
        document.body.appendChild(document.createTextNode("This isn't a Trello card."));
        break;
      default:
        document.body.appendChild(document.createTextNode("Card ID = " + cardId));
        break;
    }
});

oauth.authorize(onAuthorized);

function onAuthorized() {
  var url = 'https://trello.com/1/members/my/boards';
  var request = {
    'method': 'GET',
  };
  oauth.sendSignedRequest(url, callback, request);
};

function callback(resp, xhr) {
  
  var stringy = JSON.stringify(resp);
  var collection = jQuery.parseJSON(resp);


  for(var i in collection) {
    console.log(collection[i]);
  }


};

function getIdFromCard(url) {

  var split = url.split("/");
  var cardId = split[split.length - 1];

  if(url.indexOf("trello.com") != -1) { // check if we're on trello.com
    if(cardId.length < 5) {             // check for a reasonable length ID
      return cardId;
    }
  }
  return -1;
}

function getStoryIdFromCard() {
  return 0;
}
