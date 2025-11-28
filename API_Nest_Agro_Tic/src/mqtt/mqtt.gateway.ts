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
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class MqttGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('MqttGateway');

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    this.logger.log(`Connection details:`, {
      id: client.id,
      handshake: client.handshake,
      transport: client.conn.transport.name,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.logger.log(`Disconnect reason:`, client.disconnected);
  }

  // Emitir nueva lectura a todos los clientes conectados
  emitNuevaLectura(lectura: any) {
    this.logger.log(`Emitiendo nueva lectura MQTT:`, lectura);
    this.server.emit('lecturaNueva', lectura);
  }

  // Emitir estado de conexión MQTT por zona
  emitEstadoConexion(estado: {
    zonaId: string;
    conectado: boolean;
    mensaje?: string;
  }) {
    this.logger.log(
      `Emitiendo estado MQTT para zona ${estado.zonaId}:`,
      estado,
    );
    this.server.emit('estadoConexion', estado);
  }

  // Método para emitir estado de conexión inicial para una zona
  emitEstadoConexionInicial(
    zonaId: string,
    conectado: boolean,
    mensaje: string = '',
  ) {
    this.emitEstadoConexion({ zonaId, conectado, mensaje });
  }
}
