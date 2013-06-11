// Copyright (c) 2013 Ed Shelley
// A Chrome extension to display information relevant
// to the currently open card on Trello.com
var redmineKey = "";
var redmineReqUrl = "";
var mode = "";
var oauth = chrome.extension.getBackgroundPage().oauth;
var regexToMatchStoryId = /\{(s\d+s)\}/;



document.addEventListener('DOMContentLoaded', function () {
  $('#api-warning').hide();
  $('#loader').hide();
  document.querySelector('#modeTrello').addEventListener('click', modeTrelloClick);
  document.querySelector('#modeRedmine').addEventListener('click', modeRedmineClick);
  document.querySelector('#btnApiSubmit').addEventListener('click', btnApiSubmitClick);
});

getModePrefs(); // determine whether we're in Trello or Redmine mode

function onAuthorized() {
  chrome.tabs.getSelected(null,function(tab) {
    getCurrentCardObject(tab.url);
  });
};

function getModePrefs() {

  mode = 'trello';
  getModePrefs_Complete();

  /**
  chrome.storage.sync.get('storyMode', function(items) {
    if(items != null && items['storyMode'] != null) {

      if(items['storyMode'] === 'trello'){
        $('#modeTrello').addClass('active');
        $('#modeRedmine').removeClass('active');
        mode = 'trello';
      } else if(items['storyMode'] === 'redmine') {
        $('#modeRedmine').addClass('active');
        $('#modeTrello').removeClass('active');
        mode ='redmine';
      }

      // Get User API key from prefs if it's there:
      chrome.storage.sync.get('userApiKey', function(items) {
        if(items != null && items['userApiKey'] != null) {
          redmineKey = items['userApiKey'];
        }
        getModePrefs_Complete();
      });


    } else {
      // First run: set to Trello mode initially:
      modeTrelloClick();
    }
  });
**/

}

function saveKeyToPrefs(key) {
  chrome.storage.sync.set({'userApiKey' : key }, function(){
    var test = "blah";
  });
}

function getModePrefs_Complete() {

  if(mode === 'redmine') {
    var testing = 'ha';
    if(redmineKey.length < 5) {
      // we don't have a valid redmine API key - show the prompt
      $('#api-warning').fadeIn();
      return;
    }
  }
  clearErrorMessages();
  if(mode === 'trello') {
  console.log("Proceeding in Trello mode...");
  } else if (mode === 'redmine') {
    console.log("Proceeding in Redmine mode...");
  }
  oauth.authorize(onAuthorized);
}

function getCurrentCardObject(url) {

  if(!userIsViewingCard(url)){
    outputErrorMessageToPopup("Open a Trello card to view Story or Task information.");
    return;
  }

  $('#loader').show();

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
    return;
  }
}

function getCard_Callback(resp, xhr, boardGuid) {
  var card = jQuery.parseJSON(resp);
  var name = card.name.toLowerCase();
  var regex = name.match(regexToMatchStoryId); //look for the story ID
  var storyId = null;

  if(regex != null && regex[1]!= null){
    storyId = regex[1];
  } else {
    outputErrorMessageToPopup("Couldn't find a story ID for this card.");
    return;
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

  if(board.name.toLowerCase().indexOf("stories") !== -1) {
    //this is a story board. let's find related tasks.
    if(mode === 'redmine') {
      outputErrorMessageToPopup("This looks like a stories board; Finding tasks in Redmine isn't supported.");
      return;
    } else if(mode === 'trello') {
      // Find the corresponding tasks board
      getAllPotentialTaskBoards(board, storyId);
    }

  } else if(board.name.toLowerCase().indexOf("tasks") !== -1) {
    //this is a task board. We want to determine the related story.
    if(mode === 'trello') {
      findStoryFromTrello(storyId, board);
    } else if(mode === 'redmine') {
      findStoryFromRedmine(storyId, board.id);
    }
  return;
  } else {
    //we don't know what type of board it is.
    outputErrorMessageToPopup("Unable to determine whether this is a User Story or Task board.");
    return;
  }
}

function getAllPotentialTaskBoards(board, storyId) {
  // Now look at user's Trello boards for a match.
  var url = 'https://trello.com/1/members/my/boards';
  var request = {
    'method': 'GET',
  };
  oauth.sendSignedRequest(url, function(resp, xhr) {
    var boards = jQuery.parseJSON(resp);
    findMatchingTasksBoard(board, boards, storyId);
  }, request);
}

function findStoryFromTrello(storyId, board){
  // Now look at user's Trello boards for a match.
  var url = 'https://trello.com/1/members/my/boards';
  var request = {
    'method': 'GET',
  };
  oauth.sendSignedRequest(url, function(resp, xhr) {
    var boards = jQuery.parseJSON(resp);
    findMatchingStoriesBoard(board, boards, storyId);
  }, request);
}

function findStoryFromRedmine(storyId, boardName) {
  var requestUrl = redmineReqUrl + redmineKey;

  $.ajax({
    url: requestUrl,
    context: document.body
  }).done(function(data) {
    console.log("LOOKING FOR: " + storyId);
    for(var index in data.issues){
      var issue = data.issues[index];

      if(issue.project.name.toUpperCase() === "RM-PEOPLEDIRECTORY") { // match project name to board name

        for(var field in issue.custom_fields){
          var customField = issue.custom_fields[field];

          if(customField.name.toLowerCase() === "existing story id" ){ // this is the user story field ID
            console.log(customField.value);
            if(customField.value.toUpperCase().replace(' ', '') === storyId.toUpperCase()) {
              outputRedmineStoryInfoToPopup(issue.subject, "https://redmine.xx.com/redmine/issues/" + issue.id, "", issue.description);
              return;
            }
          }
        }
      }
    }
    outputErrorMessageToPopup("Couldn't find this user story in Redmine.")
  });
}

function findMatchingStoriesBoard(currentBoard, potentialBoards, storyId) {
  var trimmed = currentBoard.name.toLowerCase().replace(' tasks', '');
  for(var board in potentialBoards){
      if(potentialBoards[board].name.toLowerCase().indexOf('stories') != -1) { //name contains 'stories'
      var trimmed2 = potentialBoards[board].name.toLowerCase().replace(' stories', '');
      if(trimmed2.indexOf(trimmed) != -1){ //rest of name is common
        // FOUND IT!
        var currentBoardUrl = 'https://trello.com/1/boards/' + potentialBoards[board].id + '/cards/open';
        var request = {
          'method': 'GET',
        };
        oauth.sendSignedRequest(currentBoardUrl, function(resp, xhr){
          var cards = jQuery.parseJSON(resp);
          findMatchingStoryCard(cards, storyId, currentBoard);
        }, request);
        return null;
      }
    }
  }
  return null;
}

function findMatchingTasksBoard(currentBoard, potentialBoards, storyId) {
  var trimmed = currentBoard.name.toLowerCase().replace(' stories', '');
  for(var board in potentialBoards){
    var trimmed2 = potentialBoards[board].name.toLowerCase().replace(' tasks', '');
    if(trimmed2.indexOf(trimmed) != -1 && potentialBoards[board].name.toLowerCase().indexOf('tasks') != -1){
      // FOUND IT!
      var currentBoardUrl = 'https://trello.com/1/boards/' + potentialBoards[board].id + '/cards/open';
      var request = {
        'method': 'GET',
      };
      oauth.sendSignedRequest(currentBoardUrl, function(resp, xhr){
        var cards = jQuery.parseJSON(resp);
        findMatchingTaskCards(cards, storyId, currentBoard);
      }, request);
      return null;
    }
  }
  return null;
}

function findMatchingTaskCards(cards, storyId, currentBoard){
  var matches = new Array();

  for(var card in cards){
    var name = cards[card].name;
    if(name.indexOf('{' + storyId + '}') != -1 && currentBoard.id !== cards[card].idBoard){
      matches.push(cards[card]);
    }
  }
  if(matches.length > 0) {
    ouputTrelloTasksInfoToPopup(matches);
  } else {
    outputErrorMessageToPopup("Couldn't find any matching tasks.");
    return;
  }
}

function findMatchingStoryCard(cards, storyId, currentBoard){
  for(var card in cards){
    var name = cards[card].name;
    if(name.indexOf(storyId) != -1 && currentBoard.id !== cards[card].idBoard){
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
    outputTrelloStoryInfoToPopup(card, list);
  });
}

// OUTPUT / HTML BASED FUNCTIONS____________

function outputRedmineStoryInfoToPopup(name, url, status, description) {
  $('#loader').hide();
  $('#content').hide();
  //title text
  var title = document.createElement('h4');
  title.innerHTML = 'Parent user story';
  //story name (link)
  var a = document.createElement('a');
  a.title = name;
  a.innerHTML = name;
  a.href = url;
  a.target = "_blank";
  //story description
  var desc = document.createElement('p');
  desc.innerHTML = description;
  desc.className = 'descriptionText';

  $('#content').append("<div id='card-list'></div>");
  $('#card-list').append("<div id='card' class='trello-card'></div>");
  $('#card').append(a);
  $('#card').append(document.createElement('br'));
  $('#card').append(document.createElement('br'));
  $('#card').append(desc);

  $('#content').fadeIn();
}


function outputTrelloStoryInfoToPopup(card, list){

  $('#loader').hide();
  $('#content').hide();

  //title text
  var title = document.createElement('h4');
  title.innerHTML = 'Parent user story';
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
  var listName = document.createElement('span');
  listName.innerHTML = list.name;
  listName.className = 'label label-success';

  $('#content').append("<div id='card-list'></div>");
  $('#card-list').append(title);
  $('#card-list').append("<div id='card' class='trello-card'></div>");
  $('#card').append(a);
  $('#card').append(document.createElement('br'));
  $('#card').append(document.createElement('br'));
  $('#card').append(desc);
  $('#card').append(listName);

  //output this stuff:

  //$('#title').append(title);
  $('#content').fadeIn();
}

function ouputTrelloTasksInfoToPopup(cards)
{
  $('#loader').hide();
  $('#content').hide();

  //title text
  var title = document.createElement('h4');
  title.innerHTML = 'Related Tasks';
  $('#content').append("<div id='card-list'></div>");
  $('#card-list').append(title);

  var a = null;
  for(var x in cards){
    $('#card-list').append("<div id='card"+ x + "'' class='trello-card'></div>");
    var li = document.createElement('li');
    var card = cards[x];
    //card name (link)
    a = document.createElement('a');
    a.title = card.name;
    a.innerHTML = a.title;
    a.href = card.url;
    a.target = "_blank";
    a.class = "trello-card-title";
    $('#card' + x).append(a);
  }
  $('#content').fadeIn();
}

function outputErrorMessageToPopup(message){
  $('#loader').hide();
  clearErrorMessages();
  $('#content').hide();
  $('#content').append('<div id="card-list"<p>' + message + '</p></div>');
  $('#content').fadeIn();
}

function clearErrorMessages() {
  $('#content').empty();
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


// EVENT HANDLERS__________________
function modeTrelloClick() {
  mode = 'trello';
  $('#api-warning').hide();
  chrome.storage.sync.set({'storyMode': 'trello'}, function() {
    console.log('Settings saved as Trello');
    $('#modeTrello').addClass('active');
    $('#modeRedmine').removeClass('active');
    getModePrefs_Complete();
  });
}

function modeRedmineClick() {
  mode = 'redmine';
  chrome.storage.sync.set({'storyMode': 'redmine'}, function() {
    console.log('Settings saved as Redmine');
    $('#modeRedmine').addClass('active');
    $('#modeTrello').removeClass('active');
    getModePrefs_Complete();
  });
}

function btnApiSubmitClick(){
  //save the api key
  if($('#appendedInputButton').val().length > 5) {
    redmineKey = $('#appendedInputButton').val();
    saveKeyToPrefs(redmineKey);
    $('#api-warning').hide();
    getModePrefs_Complete();
  }
}