from email import message
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from chat.models import CustomUser
from django.db.models import F

class ChatConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        username = self.scope['user'].username
        user = await self.get_current_user(username)
        await self.update_user_incr(user)
        print(user.username, "connected!", user.online)

        #create groupname
        self.group_name = user.username
        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # ilk kez online olunduğunda diğer online arkadaşlara bildir
        if user.online == 1:
            friends = await self.get_users(user)
            for friend in friends:
                # kullanıcının arkadaşına online durumunu bildir
                await self.channel_layer.group_send(
                    friend.username,
                    {
                        'type':'status_message',
                        'username': user.username,
                        'status': "online"
                    }
                )
                # kullanıcıya onlıne arkadaşının bilgisini ver
                await self.channel_layer.group_send(
                    user.username,
                    {
                        'type':'status_message',
                        'username': friend.username,
                        'status': "online"
                    }
                )

        await self.accept()

        # kullanıcıya bütün arkadaşlarının bilgisini ver
        friends = await self.get_all_friends(user)
        await self.channel_layer.group_send(
            user.username,
            {
                'type':'all_friends_message',
                'friends': friends,
            }
        )


    async def disconnect(self, code):
        """
        Called when a WebSocket connection is closed.
        """
        username = self.scope['user'].username
        user = await self.get_current_user(username)
        await self.update_user_decr(user)
        print(user.username, "disconnected!", user.online)

        if user.online == 0:
            friends = await self.get_users(user)
            for friend in friends:
                await self.channel_layer.group_send(
                    friend.username,
                    {
                        'type':'status_message',
                        'username': user.username,
                        'status': "offline"
                    }
                )

    async def receive(self, text_data=None, bytes_data=None):
        username = self.scope['user'].username
        user = await self.get_current_user(username)

        text_data_json = json.loads(text_data)
        callTo = text_data_json['callTo']
        roomid = text_data_json['roomid']
        
        await self.channel_layer.group_send(
            callTo,
            {
                'type':'chat_message',
                'roomid':roomid,
                'caller':user.username
            }
        )

    # event ile gönderilen mesajı al yolla   
    async def status_message(self, event):
        username = event['username']
        status = event['status']

        # gruba gönderiyorsun
        await self.send(text_data=json.dumps({
            'type':'user_status_change',
            'username':username,
            'status':status
        }))

     # event ile gönderilen mesajı al yolla   
    async def all_friends_message(self, event):
        friends = event['friends']

        # gruba gönderiyorsun
        await self.send(text_data=json.dumps({
            'type':'user_friends_info',
            'friends':friends
        }))


    # event ile gönderilen mesajı al    
    async def chat_message(self, event):
        roomid = event['roomid']
        caller = event['caller']

        # gruba gönderiyorsun
        await self.send(text_data=json.dumps({
            'type':'chat',
            'roomid':roomid,
            'caller':caller
        }))

    async def close(self, code=None):
        return await super().close(code)

    @database_sync_to_async
    def update_user_incr(self, user):
        user.online =  user.online + 1
        user.save()

    @database_sync_to_async
    def update_user_decr(self, user):
        user.online =  user.online - 1
        user.save()

    @sync_to_async
    def get_users(self,user):
        return list(
            user.friends.filter(online__gt = 0)
        )

    @sync_to_async
    def get_all_friends(self,user):
        return list(
            user.friends.values("id","username")
        )

    @sync_to_async
    def get_current_user(self,username):
        return CustomUser.objects.get(username=username)


 #       self.send(text_data=json.dumps({
 #           'type':'chat',
 #           'message':message
 #       }))

  