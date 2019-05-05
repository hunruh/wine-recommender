from flask import Flask, request, render_template
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import vstack, load_npz
from imblearn.over_sampling import RandomOverSampler
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import numpy as np
import random

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
    if len(disliked_ids) > 0 and disliked_ids[0] is not '':
        disliked_wines = [data.getrow(int(wine_id)) for wine_id in disliked_ids]
    else:
        disliked_wines = []
        random_id = random.randrange(130000)
        while str(random_id) in liked_ids:
            random_id = random.randrange(130000)
        disliked_wines.append(data.getrow(random_id))

    features = vstack(liked_wines + disliked_wines)

    liked_wine_labels = [1 for i in range(len(liked_wines))]
    disliked_wine_labels = [0 for i in range(len(disliked_wines))]
    labels = np.array(liked_wine_labels + disliked_wine_labels)

    # Over sample the missing points
    ros = RandomOverSampler(random_state=0)
    features_resampled, labels_resampled = ros.fit_resample(features, labels)

    # clf = MultinomialNB()
    clf = RandomForestClassifier(n_estimators=100)
    clf.fit(features_resampled, labels_resampled)
    predictions = clf.predict_proba(data)[:,1]
    top_20_wines = np.argsort(predictions)[::-1][:20]

    wine_details = []
    for wine in top_20_wines:
        doc_ref = db.collection(u'wines').document(str(wine))
        try:
            doc = doc_ref.get()
            doc_dict = doc.to_dict()
            doc_dict['score'] = predictions[wine]
            wine_details.append(doc_dict)
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
        if wine is '':
            continue

        doc_ref = db.collection(u'wines').document(str(wine))
        try:
            doc = doc_ref.get()
            disliked_wine_details.append(doc.to_dict())
        except:
            print(u'No such document!')

    return render_template('query.html', results=wine_details, liked_wines=liked_wine_details,\
        disliked_wines=disliked_wine_details)