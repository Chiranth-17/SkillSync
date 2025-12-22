import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

# Placeholder for database integration
def fetch_user_data():
    # Replace this with actual database queries
    return pd.DataFrame({
        'user_id': [1, 2, 3],
        'skills': [
            'Python, Machine Learning, Data Analysis',
            'Graphic Design, Photoshop, Illustrator',
            'JavaScript, React, Node.js'
        ],
        'preferences': [
            'Data Science, AI',
            'Design, Creativity',
            'Web Development, Frontend'
        ],
        'ratings': [4.5, 4.0, 4.8]
    })

def recommend(user_id, top_n=2):
    df = fetch_user_data()

    if df.empty:
        raise ValueError("No user data available")

    # Combine skills, preferences, and ratings into a single feature
    df['combined_features'] = df['skills'] + ' ' + df['preferences'] + ' ' + df['ratings'].astype(str)

    # Vectorize combined features
    vectorizer = TfidfVectorizer()
    feature_vectors = vectorizer.fit_transform(df['combined_features'])

    # Compute similarity
    similarity_matrix = cosine_similarity(feature_vectors)

    user_index = df[df['user_id'] == user_id].index[0]
    similarity_scores = list(enumerate(similarity_matrix[user_index]))
    similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
    recommended_users = [df.iloc[i[0]]['user_id'] for i in similarity_scores[1:top_n+1]]
    return recommended_users

# Example usage
if __name__ == "__main__":
    try:
        user_id = 1
        recommendations = recommend(user_id)
        print(f"Recommendations for user {user_id}: {recommendations}")
    except ValueError as e:
        print(e)