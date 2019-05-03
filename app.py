from flask import Flask, request, render_template
from sklearn.naive_bayes import MultinomialNB
from scipy.sparse import vstack, load_npz
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import numpy as np

app = Flask(__name__, template_folder='templates', static_url_path='/static')
app.config['TEMPLATES_AUTO_RELOAD'] = True

cred = credentials.Certificate('static/google-creds.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

data = load_npz('features.npz')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/query')
def query():
    liked_ids = [wine_id for wine_id in request.args.get('likes').split(',')]
    disliked_ids = [wine_id for wine_id in request.args.get('dislikes').split(',')]

    liked_wines = [data.getrow(int(wine_id)) for wine_id in liked_ids]
    disliked_wines = [data.getrow(int(wine_id)) for wine_id in disliked_ids]
    features = vstack(liked_wines + disliked_wines)

    liked_wine_labels = [1 for i in range(len(liked_wines))]
    disliked_wine_labels = [0 for i in range(len(disliked_wines))]
    labels = np.array(liked_wine_labels + disliked_wine_labels)

    clf = MultinomialNB()
    clf.fit(features, labels)
    predictions = clf.predict_proba(data)[:,1]
    top_20_wines = np.argsort(predictions)[::-1][:20]

    wine_details = []
    for wine in top_20_wines:
        doc_ref = db.collection(u'wines').document(str(wine))
        try:
            doc = doc_ref.get()
            wine_details.append(doc.to_dict())
        except:
            print(u'No such document!')

    liked_wine_details = []
    for wine in liked_ids:
        doc_ref = db.collection(u'wines').document(str(wine))
        try:
            doc = doc_ref.get()
            liked_wine_details.append(doc.to_dict())
        except:
            print(u'No such document!')

    disliked_wine_details = []
    for wine in disliked_ids:
        doc_ref = db.collection(u'wines').document(str(wine))
        try:
            doc = doc_ref.get()
            disliked_wine_details.append(doc.to_dict())
        except:
            print(u'No such document!')

    return render_template('query.html', results=wine_details, liked_wines=liked_wine_details,\
        disliked_wines=disliked_wine_details)