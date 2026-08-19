from django.urls import path
from . import views

urlpatterns = [
    path('', views.game_view, name='game_home'),
    path('api/validate-word/', views.validate_move, name='validate_move'),
    path('api/bot-move/', views.bot_move, name='bot_move'),
    path('api/leaderboard/', views.get_leaderboard, name='get_leaderboard'),
    path('api/submit-score/', views.submit_score, name='submit_score'),
]