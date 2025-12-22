import pandas as pd
from sklearn.ensemble import IsolationForest

# Placeholder for user activity data
def fetch_user_activity():
    """
    Fetch user activity data for fraud detection.
    Replace this with actual database queries.
    """
    return pd.DataFrame({
        'user_id': [1, 2, 3, 4, 5],
        'login_count': [50, 3, 200, 1, 100],
        'messages_sent': [100, 2, 500, 0, 300],
        'skills_uploaded': [10, 1, 20, 0, 15],
    })

def detect_fraud():
    """
    Detect suspicious user activity using Isolation Forest.
    """
    data = fetch_user_activity()
    if data.empty:
        raise ValueError("No user activity data available")

    # Use relevant features for fraud detection
    features = data[['login_count', 'messages_sent', 'skills_uploaded']]

    # Train Isolation Forest model
    model = IsolationForest(contamination=0.1, random_state=42)
    data['fraud_score'] = model.fit_predict(features)

    # Flag suspicious users
    suspicious_users = data[data['fraud_score'] == -1]
    return suspicious_users[['user_id', 'fraud_score']]

# Example usage
if __name__ == "__main__":
    try:
        flagged_users = detect_fraud()
        if flagged_users.empty:
            print("No suspicious activity detected.")
        else:
            print("Suspicious users detected:")
            print(flagged_users)
    except ValueError as e:
        print(e)