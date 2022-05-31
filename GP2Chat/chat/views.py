import json
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from chat.models import CustomUser, Friend_Request
from django.contrib.auth.decorators import login_required

def register(request):
    return render(request,"registration/register.html")

# Create your views here.
@login_required
def lobby(request):
    return render(request,"chat/lobby.html")

@login_required
def send_friends_request(request):
    from_user = request.user
    usernameToSendRequest = request.POST.get('username', -1)
   
    if usernameToSendRequest == request.user.username:
        return HttpResponse("You can't add yourself as a friend :(")
    if usernameToSendRequest == -1:
        return HttpResponse('Enter a username')

    try:
        to_user = CustomUser.objects.get(username = usernameToSendRequest)
    except CustomUser.DoesNotExist:
        return HttpResponse('User doesnt exist')

    
    friend_request, created = Friend_Request.objects.get_or_create(
        from_user = from_user, to_user=to_user
    )
    if created:
        return HttpResponse('Friend request sent')
    else:
        return HttpResponse('Friend request already sent')
   

@login_required
def accept_friends_request(request, requestID):
    friend_request = Friend_Request.objects.get(id=requestID)

    if friend_request.to_user == request.user:
        friend_request.to_user.friends.add(friend_request.from_user)
        friend_request.from_user.friends.add(friend_request.to_user)
        friend_request.delete()
        return JsonResponse({"success": True, "message":"friend request accepted!"})
    else:
        return JsonResponse({"success": False, "message":"friend request NOT accepted!"})


@login_required
def get_friends_requests(request):
    received_requests = Friend_Request.objects.filter(to_user = request.user)

    friend_requests = []
    for a in received_requests:
        user = {"username":a.from_user.username, "request_id":str(a.id)}
        friend_requests.append(user)

    return JsonResponse(
        json.dumps(friend_requests),safe=False
    )
    
@login_required
def get_friends(request):
    received_requests = request.user.friends.all()

    friend_requests = []
    for a in received_requests:
        user = {"username":a.username, "user_id":str(a.id)}
        friend_requests.append(user)

    return JsonResponse(
        json.dumps(friend_requests),safe=False
    )
    