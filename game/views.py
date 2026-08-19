import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import HighScore
from .services import validate_entire_turn, find_bot_move

@ensure_csrf_cookie
def game_view(request):
    return render(request, 'game/index.html')

def validate_move(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
        board_state = data.get("board", {})       # {"r,c": "A"}
        newly_placed = data.get("new_tiles", [])   # [{'row': 4, 'col': 2, 'char': 'C', 'is_blank': False}]
        is_first_turn = bool(data.get("is_first_turn", False))

        is_valid, msg, total_pts, words_formed = validate_entire_turn(board_state, newly_placed, is_first_turn)
        if not is_valid:
            return JsonResponse({"valid": False, "message": msg})

        bingo = (len(newly_placed) == 7)
        words_label = ", ".join(words_formed)
        bingo_text = " 💥 50-pt BINGO!" if bingo else ""
        return JsonResponse({
            "valid": True,
            "words": words_formed,
            "points": total_pts,
            "message": f"+{total_pts} pts ({words_label}){bingo_text}!"
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

def bot_move(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        board_state = data.get("board", {})
        bot_rack = data.get("bot_rack", ["C", "A", "T", "E", "R", "S", "T"])
        move = find_bot_move(board_state, bot_rack)
        if move:
            return JsonResponse({"success": True, "move": move})
        return JsonResponse({"success": False, "message": "Bot passes turn."})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)

def get_leaderboard(request):
    scores = HighScore.objects.all()[:10]
    data = [{"player_name": s.player_name, "score": s.score, "best_word": s.best_word, "date": s.created_at.strftime("%b %d")} for s in scores]
    return JsonResponse({"leaderboard": data})

def submit_score(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        data = json.loads(request.body)
        name = data.get("name", "Anonymous").strip()[:20] or "Anonymous"
        score = int(data.get("score", 0))
        best_word = data.get("best_word", "")[:20]
        HighScore.objects.create(player_name=name, score=score, best_word=best_word)
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)