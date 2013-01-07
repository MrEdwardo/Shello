// Copyright (c) 2012 Ed Shelley
// A Chrome extension to display information relevant
// to the currently open card on Trello.com

var oAuthServiceName = "Ed's Trello Extension";
var consumerSecret = "efe366361c4d944f012c7bd4946326d4bb868fba7acdde8e0129842d61b4586a";
var consumerKey = "f29cb82a057935a1d481e3ea69e6ff74";

chrome.extension.getBackgroundPage();


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
