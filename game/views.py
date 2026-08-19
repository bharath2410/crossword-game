import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import HighScore
from .services import validate_game_rules, calculate_word_score, find_bot_move

@ensure_csrf_cookie
def game_view(request):
    return render(request, 'game/index.html')

def validate_move(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
        word = data.get("word", "").strip().upper()
        row = int(data.get("row", 0))
        col = int(data.get("col", 0))
        direction = data.get("direction", "across")
        is_first_turn = bool(data.get("is_first_turn", False))
        connected_to_existing = bool(data.get("connected_to_existing", False))

        is_valid, msg = validate_game_rules(word, row, col, direction, is_first_turn, connected_to_existing)
        if not is_valid:
            return JsonResponse({"valid": False, "message": msg})

        points = calculate_word_score(word, start_row=row, start_col=col, direction=direction)
        return JsonResponse({"valid": True, "word": word, "points": points, "message": f"+{points} pts for '{word}'!"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

def bot_move(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
        board_state = data.get("board", {})  # {"r,c": "A"}
        bot_rack = data.get("bot_rack", ["C", "A", "T", "E", "R", "S", "T"])

        move = find_bot_move(board_state, bot_rack)
        if move:
            return JsonResponse({"success": True, "move": move})
        return JsonResponse({"success": False, "message": "Bot passes turn."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

def get_leaderboard(request):
    scores = HighScore.objects.all()[:10]
    data = [
        {"player_name": s.player_name, "score": s.score, "best_word": s.best_word, "date": s.created_at.strftime("%b %d")}
        for s in scores
    ]
    return JsonResponse({"leaderboard": data})

def submit_score(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
        name = data.get("name", "Anonymous").strip()[:20] or "Anonymous"
        score = int(data.get("score", 0))
        best_word = data.get("best_word", "")[:20]

        entry = HighScore.objects.create(player_name=name, score=score, best_word=best_word)
        return JsonResponse({"success": True, "id": entry.id})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)