from django.db import models
from django.contrib.auth.models import User
import uuid

class HighScore(models.Model):
    player_name = models.CharField(max_length=30, default="Player")
    score = models.IntegerField(default=0)
    best_word = models.CharField(max_length=20, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self):
        return f"{self.player_name} - {self.score} pts ({self.best_word})"

class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    elo_rating = models.IntegerField(default=1200)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    highest_score = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} (ELO: {self.elo_rating})"

class GameRoom(models.Model):
    room_code = models.CharField(max_length=8, unique=True, default=uuid.uuid4)
    player1 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="p1_games")
    player2 = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="p2_games")
    turn = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="current_turns")
    board_state = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room {self.room_code}"