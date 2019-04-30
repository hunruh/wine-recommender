const db = new PouchDB('http://localhost:5984/wines');

var wineSuggestionEngine = new Bloodhound({
    initialize: false,
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    identify: function(obj) { return obj.name; },
    prefetch: '/static/wines_index.json'
});

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
                        <a href="#" class="card-footer-item has-text-info">
                            <span class="icon">
                                <i class="far fa-thumbs-up" aria-hidden="true"></i>
                            </span>
                        </a>
                        <a href="#" class="card-footer-item has-text-danger">
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

    if (data.length > 12) {
        data = data.slice(0, 12)
    } else {
        hideSuggestions(data.length);
    }

    var requestDocs = [];
    data.forEach(function(doc) {
        requestDocs.push({ 'id' : '' + doc['id'] });
    });
    db.bulkGet({
        docs: requestDocs
    }).then(function (results) {
        var outputIdx = 0;
        var currentColumn;

        results.results.forEach(function(result) {
            const id = result.id;
            const columnNumber = Math.floor(outputIdx / 4);
            const rowNumber = outputIdx % 4;
            const name = result.docs[0].ok.name;
            const description = result.docs[0].ok.description;
            const truncatedLength = Math.min(150, description.length);
            const descriptionTruncated = description.substring(0, truncatedLength) +
                (truncatedLength == 150 ? "..." : "");

            const resultCard = $('.suggestion-results-' + columnNumber + '-' + rowNumber);
            resultCard.find('.card-header-title').text(name);
            resultCard.find('.content').text(descriptionTruncated);
            if (resultCard.hasClass('is-invisible')) {
                resultCard.removeClass('is-invisible');
            }
            if (resultCard.parent().hasClass('is-hidden')) {
                resultCard.parent().removeClass('is-hidden');
            }

            outputIdx += 1;
        });
    }).catch(function (err) {
      console.log(err);
    });
}

$(document).ready(function() {
    initializeSuggestionsHTML();
    hideSuggestions(0);

    $('.wine-search-field').on('input', function(event) {
        event.preventDefault();
        const inputValue = $('.wine-search-field').val(); 

        if (inputValue.length > 2) {
            bloodhoundWorker.postMessage(inputValue)
        } else {
            hideSuggestions(0);
        }
    });
});