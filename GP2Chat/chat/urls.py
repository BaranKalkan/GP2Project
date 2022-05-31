from django.urls import path
from . import views

urlpatterns = [
    path('',views.lobby),
    path('send_friend_request/',
        views.send_friends_request, name='send friend request'),
    path('accept_friend_request/<int:requestID>/',
        views.accept_friends_request, name='accept friend request'),
    path('get_friend_requests/',
        views.get_friends_requests, name='get friend requests'),
    path('get_friends/',
        views.get_friends, name='get friends'),
    path('register/', 
        views.register, name="register"),
]
