import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { AssignMultiplePermissionsDto } from './dto/assign-multiple-permissions.dto';
import { UpdateRoleWithPermissionsDto } from './dto/update-role-with-permissions.dto';
import { AuthenticationGuard } from '../common/guards/authentication.guard';
import { AuthorizationGuard } from '../common/guards/authorization.guard';
import { Permisos } from '../permisos/decorators/permisos.decorator';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /* 

se envia el id del rol al que se le va a asignar el permiso
  http://localhost:3000/roles/2ddc2d7f-8a94-477a-8f24-221c8a230f2e/permisos

  se envia en el body el id del permiso que se le va a asignar al rol
{
  "permisoId": "3518a2d4-c5c2-429c-bfee-bba3aa4e3bd4"
}
  */
  @Permisos({ moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer'] })
  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Permisos({  moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer']})
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Permisos({ moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer'] })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Permisos({ moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer']})
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.remove(id);
  }

  // --- Endpoints para gestionar permisos en un rol ---

  @Permisos({  moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer'] })
  @Post(':id/permisos')
  assignPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPermissionDto: AssignPermissionDto,
  ) {
    return this.rolesService.assignPermission(
      id,
      assignPermissionDto.permisoId,
    );
  }

  @Permisos({ moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer'] })
  @Post(':id/permisos/multiple')
  assignMultiplePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignMultiplePermissionsDto: AssignMultiplePermissionsDto,
  ) {
    return this.rolesService.assignMultiplePermissions(
      id,
      assignMultiplePermissionsDto.permisoIds,
    );
  }

  @Permisos({ moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer']})
  @Patch(':id')
  updateRoleWithPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleWithPermissionsDto: UpdateRoleWithPermissionsDto,
  ) {
    return this.rolesService.updateRoleWithPermissions(
      id,
      updateRoleWithPermissionsDto,
    );
  }

  @Permisos({ moduloNombre: 'Usuarios', recurso: 'panel_de_control', acciones: ['leer'] })
  @Delete(':id/permisos/:permisoId')
  removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permisoId', ParseUUIDPipe) permisoId: string,
  ) {
    return this.rolesService.removePermission(id, permisoId);
  }
}

/*


const data.permisos[]


*/
