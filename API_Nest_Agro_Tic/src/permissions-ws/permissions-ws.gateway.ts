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
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PermisosService } from '../permisos/permisos.service';

@WebSocketGateway({
  namespace: '/permissions',
  cors: {
    origin: true, // Allow all origins for development
    credentials: true,
  },
})
export class PermissionsWsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('PermissionsWsGateway');

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permisosService: PermisosService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Permissions WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      this.logger.log(`New connection attempt from client: ${client.id}`);
      const token = client.handshake.auth.token || client.handshake.query.token;
      this.logger.log(`Token present: ${!!token}`);

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
      this.logger.log(
        `Client connected successfully: ${client.id}, User ID: ${payload.sub}, User: ${JSON.stringify(payload)}`,
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

  @OnEvent('permission.changed')
  async handlePermissionChange(payload: any) {
    this.logger.log(
      `Permission change event received: ${JSON.stringify(payload)}`,
    );

    // Check if WebSocket server is available (might not be during seeder execution)
    if (!this.server) {
      this.logger.warn('WebSocket server not available, skipping permission change emission');
      return;
    }

    // Get all cached permissions for real-time sync
    const allPermissions = await this.permisosService.getCachedPermissions();
    this.logger.log(
      `Retrieved ${allPermissions.length} cached permissions for emission`,
    );
    this.server.emit('permissionChanged', {
      changed: payload,
      allPermissions: allPermissions,
    });
    this.logger.log('Emitted permission change event to all connected clients');
  }

  @SubscribeMessage('subscribeToPermissions')
  handleSubscribeToPermissions(client: Socket, @MessageBody() data: any) {
    // Optional: handle subscription logic
    this.logger.log(`Client ${client.id} subscribed to permissions`);
  }
}
