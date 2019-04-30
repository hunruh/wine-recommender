importScripts('/static/jquery.nodom.js');
importScripts('/static/bloodhound.js');

var wineSuggestionEngine = new Bloodhound({
    initialize: false,
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    identify: function(obj) { return obj.name; },
    prefetch: '/static/wines_index.json'
});

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