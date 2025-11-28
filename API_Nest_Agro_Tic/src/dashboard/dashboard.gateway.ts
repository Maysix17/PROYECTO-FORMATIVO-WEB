import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('DashboardGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-dashboard')
  handleJoinDashboard(client: Socket, payload: any) {
    client.join('dashboard');
    this.logger.log(`Client ${client.id} joined dashboard room`);
  }

  // Methods to emit updates to dashboard clients
  emitDashboardUpdate(updateType: string, data: any) {
    this.server.to('dashboard').emit('dashboard-update', {
      type: updateType,
      data: data,
      timestamp: new Date().toISOString(),
    });
  }

  emitActivitiesUpdate(data: any) {
    this.emitDashboardUpdate('activities', data);
  }

  emitMovementsUpdate(data: any) {
    this.emitDashboardUpdate('movements', data);
  }

  emitSalesUpdate(data: any) {
    this.emitDashboardUpdate('sales', data);
  }

  emitHarvestsUpdate(data: any) {
    this.emitDashboardUpdate('harvests', data);
  }

  emitFinancesUpdate(data: any) {
    this.emitDashboardUpdate('finances', data);
  }
}
