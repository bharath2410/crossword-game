import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from .services import is_valid_word, calculate_word_score

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

        if not word:
            return JsonResponse({"valid": False, "message": "Word cannot be empty."})

        if not is_valid_word(word):
            return JsonResponse({"valid": False, "message": f"'{word}' is not in the dictionary."})

        grid_limit = 10
        if direction == "across" and (col + len(word) > grid_limit):
            return JsonResponse({"valid": False, "message": "Word exceeds board boundary."})
        elif direction == "down" and (row + len(word) > grid_limit):
            return JsonResponse({"valid": False, "message": "Word exceeds board boundary."})

        # In game/views.py:
        points = calculate_word_score(word, start_row=row, start_col=col, direction=direction)
        return JsonResponse({"valid": True, "word": word, "points": points, "message": f"+{points} points!"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)