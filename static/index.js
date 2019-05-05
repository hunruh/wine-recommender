firebase.initializeApp(firebaseConfig);
  
const db = firebase.firestore();

var likedWines = [];
var dislikedWines = [];

const likedWinesSection = $('.wines-like');
const likedWinesEmptyMessage = likedWinesSection.find('.no-wines');
const dislikedWinesSection = $('.wines-dislike');
const dislikedWinesEmptyMessage = dislikedWinesSection.find('.no-wines');

const bloodhoundWorker = new Worker('/static/bloodhound_worker.js');
bloodhoundWorker.onmessage = function(e) {
    if (e.data[0] === 'load-complete') {
        $('.pageloader').removeClass('is-active');
    } else if (e.data[0] === 'results') {
        populateSuggestions(e.data[1]);
    }
}

function hideSuggestions(minIndex) {
    var cardId;
    for (cardId = minIndex; cardId < 12; cardId++) {
        const columnNumber = Math.floor(cardId / 4);
        const rowNumber = cardId % 4;
        const resultCard = $('.suggestion-results-' + columnNumber + '-' + rowNumber);
        if (!resultCard.hasClass('is-invisible')) {
            resultCard.addClass('is-invisible');
            resultCard.find('.card-header-title').text('');
            resultCard.find('.content').text('');
        }

        if (rowNumber == 0) {
            if (!resultCard.parent().hasClass('is-hidden')) {
                resultCard.parent().addClass('is-hidden');
            }
        }
    }
}

function initializeSuggestionsHTML() {
    var outputIdx;
    for (outputIdx = 0; outputIdx < 12; outputIdx++) {
        const columnNumber = Math.floor(outputIdx / 4);
        const rowNumber = outputIdx % 4;

        if (outputIdx % 4 === 0) {
            currentColumn = $(`<div class="columns">`).appendTo('.wine-search-results');
        }
        currentColumn.append(`
            <div class="column is-one-quarter suggestion-results-` + columnNumber + `-` + rowNumber + `">
                <div class="card" data-id="">
                    <header class="card-header">
                        <p class="card-header-title"></p>
                    </header>
                    <div class="card-content">
                        <div class="content has-text-left"></div>
                    </div>
                    <footer class="card-footer">
                        <a href="#" class="card-footer-item has-text-info suggestion-like">
                            <span class="icon">
                                <i class="far fa-thumbs-up" aria-hidden="true"></i>
                            </span>
                        </a>
                        <a href="#" class="card-footer-item has-text-danger suggestion-dislike">
                            <span class="icon">
                                <i class="far fa-thumbs-down" aria-hidden="true"></i>
                            </span>
                        </a>
                    </footer>
                </div>
            </div>`);
    }
}

function populateSuggestions(data) {
    if (data.length === 0) return;

    // Only provide suggestions for wines that have not been selected
    const filteredData = [];
    var dataIdx = 0;
    while (dataIdx < 12) {
        if (dataIdx >= data.length) break;
        if (likedWines.indexOf(data[dataIdx].id) == -1 && dislikedWines.indexOf(data[dataIdx].id) == -1) {
            filteredData.push(data[dataIdx]);
        }

        dataIdx += 1;
    }

    if (filteredData.length <= 12) {
        hideSuggestions(filteredData.length);
    }

    var outputIdx = 0;
    var currentColumn;
    filteredData.forEach(function(item) {
        var docRef = db.collection("wines").doc("" + item['id']);
        docRef.get().then(function(doc) {
            if (doc.exists) {
                const docData = doc.data();
                const id = item['id'];
                const columnNumber = Math.floor(outputIdx / 4);
                const rowNumber = outputIdx % 4;
                const name = docData.name;
                const description = docData.description;
                const truncatedLength = Math.min(150, description.length);
                const descriptionTruncated = description.substring(0, truncatedLength) +
                    (truncatedLength == 150 ? "..." : "");
    
                const resultCard = $('.suggestion-results-' + columnNumber + '-' + rowNumber);
                resultCard.find('.card-header-title').text(name);
                resultCard.find('.content').text(descriptionTruncated);
                resultCard.find('.suggestion-like').data('wine-id', id);
                resultCard.find('.suggestion-dislike').data('wine-id', id);
                if (resultCard.hasClass('is-invisible')) {
                    resultCard.removeClass('is-invisible');
                }
                if (resultCard.parent().hasClass('is-hidden')) {
                    resultCard.parent().removeClass('is-hidden');
                }
    
                outputIdx += 1;
            } else {
                console.log("No such document:", item['id']);
            }
        }).catch(function(error) {
            console.log("Error getting document:", error);
        });
    });
}

function addSelectedWine(likedWine, id, title, content) {
    var section, backgroundColor;
    if (likedWine) {
        section = likedWinesSection;
        likedWines.push(Number(id));
        backgroundColor = 'has-background-info';
    } else {
        section = dislikedWinesSection;
        dislikedWines.push(Number(id));
        backgroundColor = 'has-background-danger';
    }

    section.append(`
        <div class="column selection-` + id + `">
            <div class="card">
                <header class="card-header ` + backgroundColor + `">
                    <p class="card-header-title has-text-white-bis">` + title + `</p>
                    <a href="#" class="card-header-icon has-text-white-bis suggestion-remove" data-wine-id="` + id + `">
                        <span class="icon">
                            <i class="far fa-trash-alt" aria-hidden="true"></i>
                        </span>
                    </a>
                </header>
                <div class="card-content">
                    <div class="content has-text-left">` + content + `</div>
                </div>
            </div>
        </div>`);

    $('.suggestion-remove').on('click', function(event) {
        const wineId = $(this).data('wine-id');
        $('.selection-' + wineId).remove();

        const likedIndex = likedWines.indexOf(wineId);
        const dislikedIndex = dislikedWines.indexOf(wineId);
        if (likedIndex > -1) {
            likedWines.splice(likedIndex, 1);
            if (likedWines.length == 0 && likedWinesEmptyMessage.hasClass('is-hidden')) {
                likedWinesEmptyMessage.removeClass('is-hidden');
            }
        } else {
            dislikedWines.splice(dislikedIndex, 1);
            if (dislikedWines.length == 0 && dislikedWinesEmptyMessage.hasClass('is-hidden')) {
                dislikedWinesEmptyMessage.removeClass('is-hidden');
            }
        }
    });

    const inputValue = $('.wine-search-field').val(); 
    bloodhoundWorker.postMessage(inputValue);
}

$(document).ready(function() {
    initializeSuggestionsHTML();
    hideSuggestions(0);

    $('.wine-search-field').on('input', function(event) {
        event.preventDefault();
        const inputValue = $('.wine-search-field').val(); 

        if (inputValue.length > 2) {
            bloodhoundWorker.postMessage(inputValue);
        } else {
            hideSuggestions(0);
        }
    });

    $('.suggestion-like').on('click', function(event) {
        const clickedButton = $(this);
        const wineId = clickedButton.data('wine-id');
        if (!likedWinesEmptyMessage.hasClass('is-hidden')) {
            likedWinesEmptyMessage.addClass('is-hidden');
        }

        console.log(wineId);

        var docRef = db.collection("wines").doc("" + wineId);
        docRef.get().then(function(doc) {
            if (doc.exists) {
                const docData = doc.data();
                addSelectedWine(true, wineId, docData.name, docData.description);
            } else {
                console.log("No such document!");
            }
        }).catch(function(error) {
            console.log("Error getting document:", error);
        });
    });

    $('.suggestion-dislike').on('click', function(event) {
        const clickedButton = $(this);
        const wineId = clickedButton.data('wine-id');
        if (!dislikedWinesEmptyMessage.hasClass('is-hidden')) {
            dislikedWinesEmptyMessage.addClass('is-hidden');
        }

        var docRef = db.collection("wines").doc("" + wineId);
        docRef.get().then(function(doc) {
            if (doc.exists) {
                const docData = doc.data();
                addSelectedWine(false, wineId, docData.name, docData.description);
            } else {
                console.log("No such document!");
            }
        }).catch(function(error) {
            console.log("Error getting document:", error);
        });
    });

    $('.recommendations-submit').on('click', function(event) {
        if (likedWines.length == 0) {
            const message = "You must include at least one wine you like";
            const invalidSubmitElement = $('.invalid-submit');
            invalidSubmitElement.text(message);
            if(invalidSubmitElement.hasClass('is-hidden')) {
                $('.invalid-submit').removeClass('is-hidden');
            }
        } else {
            $('.pageloader').addClass('is-active');
            $('.pageloader').children('.title').text('Calculating suggestions...');
            const parameters = 'likes=' + likedWines.toString() + '&dislikes=' + dislikedWines.toString();
            window.location.href = window.location.origin + '/query?' + parameters;
        }
    })
});