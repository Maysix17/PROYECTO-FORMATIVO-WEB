import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Notifications WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      this.logger.log(`New connection attempt from client: ${client.id}`);

      // Try to get token from cookies first (HttpOnly cookies)
      const cookies = client.handshake.headers.cookie;
      let token: string | null = null;

      if (cookies) {
        const cookiePairs = cookies.split(';');
        for (const cookie of cookiePairs) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'access_token') {
            token = decodeURIComponent(value); // Decode URL-encoded cookie value
            break;
          }
        }
      }

      // Fallback to auth/query params
      token =
        token || client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn(`No token provided for client: ${client.id}`);
        client.disconnect();
        return;
      }

      this.logger.log(`Verifying JWT token for client: ${client.id}`);
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.user = payload;
      client.join(payload.sub); // Join room based on user ID
      this.logger.log(
        `Client connected successfully: ${client.id}, User ID: ${payload.sub}`,
      );
    } catch (error) {
      this.logger.error(
        `Connection failed for client ${client.id}: ${error.message}`,
        error.stack,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Method to emit notification to a specific user
  emitNotificationToUser(userId: string, notification: any) {
    this.logger.log(
      `Emitting notification to user ${userId}: ${JSON.stringify(notification)}`,
    );
    this.server.to(userId).emit('newNotification', notification);
  }

  // Method to emit notification to all users (for broadcast)
  emitNotificationToAll(notification: any) {
    this.logger.log(
      `Broadcasting notification to all users: ${JSON.stringify(notification)}`,
    );
    this.server.emit('newNotification', notification);
  }

  @SubscribeMessage('subscribeToNotifications')
  handleSubscribeToNotifications(client: Socket, @MessageBody() data: any) {
    this.logger.log(`Client ${client.id} subscribed to notifications`);
  }
}
