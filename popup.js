// Copyright (c) 2012 Ed Shelley
// A Chrome extension to display information relevant
// to the currently open card on Trello.com

var oauth = chrome.extension.getBackgroundPage().oauth;
//var storyId = null;
oauth.authorize(onAuthorized);

function onAuthorized() {
  chrome.tabs.getSelected(null,function(tab) {
    getCurrentCardObject(tab.url);
  });
};

function getCurrentCardObject(url) {
  //var storyId = url.match(/\[(\d+\.?\d*)\]/);
  //extract card ID from the url
  var cardId = getCardIdFromUrl(url);
  var boardGuid = getBoardIdFromUrl(url);
  var requestUrl = 'https://api.trello.com/1/boards/' + boardGuid + '/cards/' + cardId;
  var request = {
    'method': 'GET',
  };
  //get the card object:
  oauth.sendSignedRequest(requestUrl, function(resp, xhr){getCard_Callback(resp, xhr, boardGuid)}, request);
}

function getCard_Callback(resp, xhr, boardGuid) {
  var card = jQuery.parseJSON(resp);
  var name = card.name;
  var regex = name.match(/\[(s\d+s)\]/);
  var storyId = null;

  if(regex[1]!= null){
    storyId = regex[1];//.replace(/s/gi, '');
  }

  // get current board name:
  var currentBoardUrl = 'https://trello.com/1/boards/' + boardGuid;
  var request = {
    'method': 'GET',
  };
  oauth.sendSignedRequest(currentBoardUrl, function(resp, xhr){getCurrentBoard_Callback(resp, xhr, storyId) }, request);
}

function getCurrentBoard_Callback(resp, xhr, storyId){
  var board = jQuery.parseJSON(resp);

  // Now look at user's boards for a match.
  var url = 'https://trello.com/1/members/my/boards';
  var request = {
    'method': 'GET',
  };
  oauth.sendSignedRequest(url, function(resp, xhr) {
    var boards = jQuery.parseJSON(resp);
    findMatchingStoriesBoard(board, boards, storyId);
  }, request);

}

function findMatchingStoriesBoard(currentBoard, potentialBoards, storyId) {
  var trimmed = currentBoard.name.toLowerCase().replace(' tasks', '');
  for(var board in potentialBoards){
    var trimmed2 = potentialBoards[board].name.toLowerCase().replace(' stories', '');
    if(trimmed2.indexOf(trimmed) != -1){
      // FOUND IT!
      var currentBoardUrl = 'https://trello.com/1/boards/' + potentialBoards[board].id + '/cards/open';
      var request = {
        'method': 'GET',
      };
      oauth.sendSignedRequest(currentBoardUrl, function(resp, xhr){
        var cards = jQuery.parseJSON(resp);
        findMatchingStoryCard(cards, storyId);
      }, request);
    }
  }
  return null;
}

function findMatchingStoryCard(cards, storyId){

  for(var card in cards){
    var name = cards[card].name;
    if(name.indexOf(storyId) != -1){
      // this is our story card!!
      console.log("FOUND THE BLOODY CARD: " + cards[card].name);
      var text = document.createTextNode(cards[card].name);
      document.body.appendChild(text);
    }
  }
}

// URL BASED FUNCTIONS__________________
function getCardIdFromUrl(url) {
  if(url.indexOf('https://trello.com') == -1){
    return -1;
  }
  var split = url.split("/");
  var cardId = split[split.length - 1];

    if(cardId.length < 5) { // check for a reasonable length ID
      return cardId;
    }
  return -1;
}

function getBoardIdFromUrl(url) {
  if(url.indexOf('https://trello.com') == -1){
    return -1;
  }
  var split = url.split("/");
  var boardId = split[split.length - 2];
  if(boardId.length > 10) {
    return boardId;
  }
  return -1;
}