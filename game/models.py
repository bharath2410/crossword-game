from django.db import models

class HighScore(models.Model):
    player_name = models.CharField(max_length=30, default="Player")
    score = models.IntegerField(default=0)
    best_word = models.CharField(max_length=20, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self):
        return f"{self.player_name} - {self.score} pts ({self.best_word})"