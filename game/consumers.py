import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .services import validate_entire_turn

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'game_{self.room_code}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'play_move':
            # Broadcast move to both players in the room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_move',
                    'sender': data.get('player'),
                    'tiles': data.get('tiles'),
                    'words': data.get('words'),
                    'points': data.get('points'),
                    'total_score': data.get('total_score')
                }
            )
        elif action == 'chat_message':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'broadcast_chat',
                    'sender': data.get('player'),
                    'message': data.get('message')
                }
            )

    async def broadcast_move(self, event):
        await self.send(text_data=json.dumps(event))

    async def broadcast_chat(self, event):
        await self.send(text_data=json.dumps(event))