from flask import Flask, request, jsonify
from matchmaking_model import recommend

app = Flask(__name__)

@app.route('/recommend', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id', type=int)
    if user_id is None:
        return jsonify({"error": "User ID is required"}), 400

    try:
        recommendations = recommend(user_id)
        return jsonify({"user_id": user_id, "recommendations": recommendations})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)