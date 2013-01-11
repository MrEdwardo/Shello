// Copyright (c) 2012 Ed Shelley
// A Chrome extension to display information relevant
// to the currently open card on Trello.com

var oauth = chrome.extension.getBackgroundPage().oauth;
oauth.authorize(onAuthorized);

function onAuthorized() {
  chrome.tabs.getSelected(null,function(tab) {
    getCurrentCardObject(tab.url);
  });
};

function getCurrentCardObject(url) {

  if(!userIsViewingCard(url)){
    outputErrorMessageToPopup("Open a Trello card to view Story information.");
    return;
  }

  //extract card ID from the url
  var cardId = getCardIdFromUrl(url);
  var boardGuid = getBoardIdFromUrl(url);

  if(cardId != -1 && boardGuid != null) {
    var requestUrl = 'https://api.trello.com/1/boards/' + boardGuid + '/cards/' + cardId;
    var request = {
      'method': 'GET',
    };
    //get the card object:
    oauth.sendSignedRequest(requestUrl, function(resp, xhr){getCard_Callback(resp, xhr, boardGuid)}, request);
  } else {
    outputErrorMessageToPopup("Couldn't find any board or card information.");
  }
}

function getCard_Callback(resp, xhr, boardGuid) {
  var card = jQuery.parseJSON(resp);
  var name = card.name.toLowerCase();
  var regex = name.match(/\[(s\d+s)\]/); //look for the story ID
  var storyId = null;

  if(regex != null && regex[1]!= null){
    storyId = regex[1];
  } else {
    outputErrorMessageToPopup("Couldn't find a story ID for this card.")
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
      getListNameForStory(cards[card]);
      return;
    }
  }
  outputErrorMessageToPopup("Couldn't find a matching user story card.");
}

function getListNameForStory(card) {
  var listUrl = 'https://trello.com/1/lists/' + card.idList;
  var request = {
        'method': 'GET',
  };
  oauth.sendSignedRequest(listUrl, function(resp, xhr){
    var list = jQuery.parseJSON(resp);
    outputStoryInfoToPopup(card, list);
  });
}

// OUTPUT / HTML BASED FUNCTIONS____________
function outputStoryInfoToPopup(card, list){

  $('#loader').hide();
  //title text
  var title = document.createElement('h4');
  title.innerHTML = 'Parent story:';
  //card name (link)
  var a = document.createElement('a');
  a.title = card.name;
  a.innerHTML = a.title;
  a.href = card.url;
  a.target = "_blank";
  //card description
  var desc = document.createElement('p');
  desc.innerHTML = card.desc;
  desc.className = 'descriptionText';
  //card's list
  var listName = document.createElement('p');
  listName.innerHTML = "This story is <b>" + list.name + "</b>";

  //output this stuff:
  $('#content').append(title);
  $('#content').append(a);
  $('#content').append(document.createElement('br'));
  $('#content').append(document.createElement('br'));
  $('#content').append(desc);
  $('#content').append(listName);
}

function outputErrorMessageToPopup(message){
  $('#loader').hide();
  $('#content').append(document.createTextNode(message));
}

// URL BASED FUNCTIONS__________________
function getCardIdFromUrl(url) {
  var split = url.split("/");
  var cardId = split[split.length - 1];
    if(cardId.length < 5) { // check for a reasonable length ID
      return cardId;
    }
  return -1;
}

function getBoardIdFromUrl(url) {
  var split = url.split("/");
  var boardId = split[split.length - 2];
  if(boardId.length > 10) {
    return boardId;
  }
  return -1;
}

function userIsViewingCard(url) {
  if(url.indexOf('https://trello.com') == -1){
    return false;
  }
  var split = url.split("/");
  if(split.length < 7){
    return false;
  }
  return true;
}