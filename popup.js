// Copyright (c) 2012 Ed Shelley
// A Chrome extension to display information relevant
// to the currently open card on Trello.com

var oauth = chrome.extension.getBackgroundPage().oauth;
oauth.authorize(onAuthorized);

chrome.tabs.getSelected(null,function(tab) {
    //var cardId = getIdFromCard(tab.url);
    getStoryIdFromCard(tab.url);
});

function onAuthorized() {
  var url = 'https://trello.com/1/members/my/boards';
  var request = {
    'method': 'GET',
  };
  oauth.sendSignedRequest(url, callback, request);
};

function callback(resp, xhr) {
  var collection = jQuery.parseJSON(resp);
  var boards = [];

  for(var i in collection) {
    //console.log(collection[i]); DEBUG
    if(collection[i].hasOwnProperty('name')) {
      var value = collection[i].name;
      if(value.toLowerCase().indexOf('stories') != -1) {
        //board name contains 'stories'
        boards.push(collection[i]); //add to array
      }
    }
  }
};

function getIdFromCard(url) {
  if(url.indexOf('https://trello.com') == -1){
    return -1;
  }
  var split = url.split("/");
  var cardId = split[split.length - 2];

    if(cardId.length > 10) { // check for a reasonable length ID
      return cardId;
    }
  return -1;
}

function getStoryIdFromCard(url) {
  var storyId = url.match(/\[(\d+\.?\d*)\]/);
  //extract card ID from the url
  cardGuid = getIdFromCard(url);
  var requestUrl = 'https://trello.com/1/cards/' + cardGuid + '?fields=name';
  var request = {
    'method': 'GET',
  };
  //get the card object:
  oauth.sendSignedRequest(requestUrl, callback2, request);
}

function callback2(resp, xhr) {
  var card = jQuery.parseJSON(resp);
  var name = card.name;
}
