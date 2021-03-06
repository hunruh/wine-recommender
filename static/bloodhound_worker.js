importScripts('/static/lib/jquery.nodom.js');
importScripts('/static/lib/bloodhound.js');

var wineSuggestionEngine = new Bloodhound({
    initialize: false,
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('n'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    identify: function(obj) { return obj.n; },
});

fetch('/static/wines_index.json')
.then(response => response.json())
.then(jsonResponse => wineSuggestionEngine.add(jsonResponse));

wineSuggestionEngine.initialize()
.done(function() {
    postMessage(['load-complete']);
})
.fail(function() {
    postMessage(['load-complete']);
    console.err('Unable to initialize bloodhound');
});

onmessage = function(e) {
    wineSuggestionEngine.search(e.data, sendSuggestions, sendSuggestions);
}

function sendSuggestions(data) {
    postMessage(['results', data]);
}