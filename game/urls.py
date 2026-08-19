from django.urls import path
from . import views

urlpatterns = [
    path('', views.game_view, name='game_home'),
    path('api/validate-word/', views.validate_move, name='validate_move'),
]